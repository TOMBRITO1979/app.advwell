import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, Repeat } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

interface AccountPayable {
  id: string;
  supplier: string;
  description: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  category?: string;
  notes?: string;
  isRecurring?: boolean;
  recurrencePeriod?: string;
  parentId?: string;
  user?: { id: string; name: string };
}

interface FormData {
  supplier: string;
  description: string;
  amount: string;
  dueDate: string;
  category: string;
  notes: string;
  isRecurring: boolean;
  recurrencePeriod: string;
}

const AccountsPayable: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountPayable[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<AccountPayable | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [formData, setFormData] = useState<FormData>({
    supplier: '',
    description: '',
    amount: '',
    dueDate: '',
    category: '',
    notes: '',
    isRecurring: false,
    recurrencePeriod: '',
  });

  const statusLabels = {
    PENDING: 'Pendente',
    PAID: 'Pago',
    OVERDUE: 'Atrasado',
    CANCELLED: 'Cancelado',
  };

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };

  useEffect(() => {
    fetchAccounts();
  }, [filterStatus]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus) params.status = filterStatus;

      const response = await api.get('/accounts-payable', { params });
      setAccounts(response.data.data);
    } catch (error) {
      toast.error('Erro ao carregar contas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await api.put(`/accounts-payable/${editingAccount.id}`, formData);
        toast.success('Conta atualizada!');
      } else {
        await api.post('/accounts-payable', formData);
        toast.success('Conta criada!');
      }
      setShowModal(false);
      fetchAccounts();
      resetForm();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar');
    }
  };

  const handleEdit = (account: AccountPayable) => {
    setEditingAccount(account);
    setFormData({
      supplier: account.supplier,
      description: account.description,
      amount: account.amount.toString(),
      dueDate: account.dueDate.split('T')[0],
      category: account.category || '',
      notes: account.notes || '',
      isRecurring: account.isRecurring || false,
      recurrencePeriod: account.recurrencePeriod || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirma exclusão?')) return;
    try {
      await api.delete(`/accounts-payable/${id}`);
      toast.success('Conta excluída!');
      fetchAccounts();
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handleMarkAsPaid = async (id: string) => {
    try {
      await api.post(`/accounts-payable/${id}/pay`, {
        paidDate: new Date().toISOString(),
      });
      toast.success('Marcado como pago!');
      fetchAccounts();
    } catch (error) {
      toast.error('Erro ao marcar como pago');
    }
  };

  const resetForm = () => {
    setFormData({
      supplier: '',
      description: '',
      amount: '',
      dueDate: '',
      category: '',
      notes: '',
      isRecurring: false,
      recurrencePeriod: '',
    });
    setEditingAccount(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Contas a Pagar
          </h1>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="bg-green-600 hover:bg-green-700 text-neutral-900 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Nova Conta
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Todos</option>
                <option value="PENDING">Pendente</option>
                <option value="PAID">Pago</option>
                <option value="OVERDUE">Atrasado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-8 text-gray-600">
            Carregando...
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fornecedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {account.supplier}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        {account.description}
                        {(account as any).isRecurring && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800" title="Conta recorrente">
                            <Repeat size={12} className="mr-1" />
                            Recorrente
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatCurrency(account.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatDate(account.dueDate)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[account.status]}`}>
                        {statusLabels[account.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {account.status === 'PENDING' && (
                          <button
                            onClick={() => handleMarkAsPaid(account.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Marcar como pago"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(account)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {editingAccount ? 'Editar Conta' : 'Nova Conta'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fornecedor *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vencimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Ex: Aluguel, Salários..."
                    />
                  </div>

                  {/* Recorrência */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        id="isRecurring"
                        checked={formData.isRecurring}
                        onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked, recurrencePeriod: e.target.checked ? 'DAYS_30' : '' })}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <label htmlFor="isRecurring" className="ml-2 text-sm font-medium text-gray-700">
                        Conta Recorrente (criar automaticamente ao pagar)
                      </label>
                    </div>

                    {formData.isRecurring && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Período de Recorrência *
                        </label>
                        <select
                          required={formData.isRecurring}
                          value={formData.recurrencePeriod}
                          onChange={(e) => setFormData({ ...formData, recurrencePeriod: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">Selecione o período</option>
                          <option value="DAYS_15">A cada 15 dias</option>
                          <option value="DAYS_30">A cada 30 dias (mensal)</option>
                          <option value="MONTHS_6">A cada 6 meses (semestral)</option>
                          <option value="YEAR_1">A cada 1 ano (anual)</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                          Ao marcar como paga, uma nova conta será criada automaticamente para o próximo período
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-neutral-900 rounded-md"
                    >
                      {editingAccount ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AccountsPayable;
