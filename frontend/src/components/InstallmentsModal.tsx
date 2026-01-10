import React, { useEffect, useState } from 'react';
import { X, Download, Calendar, Check, Plus } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateFormatter';

interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED';
  notes?: string;
}

interface InstallmentsModalProps {
  transactionId: string;
  transactionDescription: string;
  transactionAmount: number;
  transactionType: 'INCOME' | 'EXPENSE';
  onClose: () => void;
}

const InstallmentsModal: React.FC<InstallmentsModalProps> = ({
  transactionId,
  transactionDescription,
  transactionAmount,
  transactionType,
  onClose
}) => {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstallment, setSelectedInstallment] = useState<Installment | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    paidDate: '',
    paidAmount: '',
    status: 'PENDING' as 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED',
    notes: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    amount: '',
    dueDate: '',
  });

  useEffect(() => {
    loadInstallments();
  }, [transactionId]);

  const loadInstallments = async () => {
    try {
      const response = await api.get(`/financial/${transactionId}/installments`);
      setInstallments(response.data);
    } catch (error) {
      toast.error('Erro ao carregar parcelas');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (installment: Installment) => {
    setSelectedInstallment(installment);
    setEditForm({
      paidDate: installment.paidDate ? new Date(installment.paidDate).toISOString().split('T')[0] : '',
      paidAmount: installment.paidAmount?.toString() || '',
      status: installment.status,
      notes: installment.notes || '',
    });
    setShowEditModal(true);
  };

  const handleMarkAsPaid = (installment: Installment) => {
    setSelectedInstallment(installment);
    setEditForm({
      paidDate: new Date().toISOString().split('T')[0],
      paidAmount: installment.amount.toString(),
      status: 'PAID',
      notes: '',
    });
    handleSaveEdit();
  };

  const handleSaveEdit = async () => {
    if (!selectedInstallment) return;

    try {
      const payload: any = {
        status: editForm.status,
        notes: editForm.notes || undefined,
      };

      if (editForm.paidDate) {
        payload.paidDate = editForm.paidDate;
      }

      if (editForm.paidAmount) {
        payload.paidAmount = parseFloat(editForm.paidAmount);
      }

      await api.put(`/financial/installments/${selectedInstallment.id}`, payload);
      toast.success('Parcela atualizada com sucesso!');
      setShowEditModal(false);
      setSelectedInstallment(null);
      loadInstallments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar parcela');
    }
  };

  const handleAddInstallment = async () => {
    if (!addForm.amount || !addForm.dueDate) {
      toast.error('Preencha o valor e a data de vencimento');
      return;
    }

    try {
      await api.post(`/financial/${transactionId}/installments`, {
        amount: parseFloat(addForm.amount),
        dueDate: addForm.dueDate,
      });
      toast.success('Parcela adicionada com sucesso!');
      setShowAddModal(false);
      setAddForm({ amount: '', dueDate: '' });
      loadInstallments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao adicionar parcela');
    }
  };

  const handleDownloadReceipt = async (installmentId: string, installmentNumber: number) => {
    try {
      const response = await api.get(`/financial/installments/${installmentId}/receipt`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recibo_parcela_${installmentNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Calcular resumo financeiro
  const totalPaid = installments.reduce((sum, inst) => sum + (inst.paidAmount || 0), 0);
  const saldoDevedor = transactionAmount - totalPaid;
  const paidCount = installments.filter(i => i.paidAmount && i.paidAmount >= i.amount).length;

  const getStatusBadge = (status: string) => {
    const badges = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-success-100 text-success-800',
      PARTIAL: 'bg-blue-100 text-blue-800',
      OVERDUE: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-neutral-100 text-neutral-800',
    };
    const labels = {
      PENDING: 'Pendente',
      PAID: 'Pago',
      PARTIAL: 'Parcial',
      OVERDUE: 'Atrasado',
      CANCELLED: 'Cancelado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <p>Carregando parcelas...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-neutral-800">
                Parcelas {transactionType === 'INCOME' ? '(Receita)' : '(Despesa)'}
              </h2>
              <p className="text-sm text-neutral-600 mt-1">{transactionDescription}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-primary-100 text-primary-700 border border-primary-200 rounded-md hover:bg-primary-200 transition-colors text-sm font-medium"
              >
                <Plus size={18} />
                Adicionar Parcela
              </button>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Resumo Financeiro */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-neutral-50 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-neutral-500 uppercase font-medium">Valor Total</p>
              <p className="text-lg font-bold text-neutral-800">{formatCurrency(transactionAmount)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-500 uppercase font-medium">Total Pago</p>
              <p className="text-lg font-bold text-success-600">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-500 uppercase font-medium">Saldo Devedor</p>
              <p className={`text-lg font-bold ${saldoDevedor > 0 ? 'text-red-600' : 'text-success-600'}`}>
                {formatCurrency(saldoDevedor)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-neutral-500 uppercase font-medium">Parcelas Pagas</p>
              <p className="text-lg font-bold text-neutral-800">{paidCount}/{installments.length}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Parcela
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Pago em
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {installments.map((installment) => (
                  <tr key={installment.id} className="odd:bg-white even:bg-neutral-50 hover:bg-success-100 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-neutral-900">
                      {installment.installmentNumber}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {formatDate(installment.dueDate)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-neutral-900">
                      {formatCurrency(installment.amount)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(installment.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-neutral-600">
                      {installment.paidDate ? (
                        <div>
                          <div>{formatDate(installment.paidDate)}</div>
                          {installment.paidAmount && (
                            <div className="text-xs text-success-600">
                              {formatCurrency(installment.paidAmount)}
                            </div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {installment.status !== 'PAID' && (
                          <button
                            onClick={() => handleMarkAsPaid(installment)}
                            className="text-success-600 hover:text-success-800 p-1 rounded hover:bg-success-50 transition-colors"
                            title="Marcar como pago"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(installment)}
                          className="text-primary-600 hover:text-primary-800 p-1 rounded hover:bg-primary-50 transition-colors"
                          title="Editar parcela"
                        >
                          <Calendar size={18} />
                        </button>
                        <button
                          onClick={() => handleDownloadReceipt(installment.id, installment.installmentNumber)}
                          className="text-neutral-600 hover:text-neutral-800 p-1 rounded hover:bg-neutral-100 transition-colors"
                          title="Baixar recibo"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {installments.length === 0 && (
            <p className="text-center text-neutral-500 py-8">Nenhuma parcela encontrada</p>
          )}
        </div>
      </div>

      {/* Modal de Edição */}
      {showEditModal && selectedInstallment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-neutral-800">
                Editar Parcela {selectedInstallment.installmentNumber}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="PENDING">Pendente</option>
                  <option value="PAID">Pago</option>
                  <option value="PARTIAL">Parcialmente Pago</option>
                  <option value="OVERDUE">Atrasado</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Data de Pagamento</label>
                <input
                  type="date"
                  value={editForm.paidDate}
                  onChange={(e) => setEditForm({ ...editForm, paidDate: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Valor Pago</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.paidAmount}
                  onChange={(e) => setEditForm({ ...editForm, paidAmount: e.target.value })}
                  placeholder="Digite o valor pago"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Observações</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Adicione observações sobre o pagamento..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Parcela */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-neutral-800">
                Adicionar Nova Parcela
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Valor da Parcela <span className="text-error-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={addForm.amount}
                  onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })}
                  placeholder="Digite o valor"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Data de Vencimento <span className="text-error-500">*</span>
                </label>
                <input
                  type="date"
                  value={addForm.dueDate}
                  onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="p-3 bg-info-50 rounded-md border border-info-200">
                <p className="text-sm text-info-700">
                  A nova parcela será adicionada ao plano de pagamento. O saldo devedor será ajustado automaticamente.
                </p>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddInstallment}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallmentsModal;
