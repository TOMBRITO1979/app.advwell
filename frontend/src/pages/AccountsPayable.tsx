import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, Repeat, FileText, Download } from 'lucide-react';
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

  // Statement generation state
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [statementFilters, setStatementFilters] = useState({
    startDate: '',
    endDate: '',
    category: '',
  });
  const [statementData, setStatementData] = useState<{
    accounts: AccountPayable[];
    total: number;
    count: number;
  } | null>(null);
  const [generatingStatement, setGeneratingStatement] = useState(false);

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
    PAID: 'bg-success-100 text-success-800',
    OVERDUE: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-neutral-100 text-neutral-800',
  };

  useEffect(() => {
    fetchAccounts();
  }, [filterStatus]);

  useEffect(() => {
    if (showStatementModal) {
      fetchCategories();
    }
  }, [showStatementModal]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/accounts-payable/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const handleGenerateStatement = async () => {
    if (!statementFilters.startDate || !statementFilters.endDate) {
      toast.error('Selecione o período');
      return;
    }

    try {
      setGeneratingStatement(true);
      const params: any = {
        startDate: statementFilters.startDate,
        endDate: statementFilters.endDate,
      };
      if (statementFilters.category) {
        params.category = statementFilters.category;
      }

      const response = await api.get('/accounts-payable/statement', { params });
      setStatementData(response.data);
      toast.success('Extrato gerado!');
    } catch (error) {
      toast.error('Erro ao gerar extrato');
      console.error(error);
    } finally {
      setGeneratingStatement(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      const params: any = {
        startDate: statementFilters.startDate,
        endDate: statementFilters.endDate,
      };
      if (statementFilters.category) {
        params.category = statementFilters.category;
      }

      const response = await api.get('/accounts-payable/statement/pdf', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `extrato_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF baixado!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
      console.error(error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params: any = {
        startDate: statementFilters.startDate,
        endDate: statementFilters.endDate,
      };
      if (statementFilters.category) {
        params.category = statementFilters.category;
      }

      const response = await api.get('/accounts-payable/statement/csv', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `extrato_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV baixado!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
      console.error(error);
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-neutral-900">
            Contas a Pagar
          </h1>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowStatementModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-info-100 text-info-700 border border-info-200 hover:bg-info-200 font-medium rounded-lg transition-all duration-200"
            >
              <FileText size={20} />
              Gerar Extrato
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-success-100 text-success-700 border border-success-200 hover:bg-success-200 font-medium rounded-lg transition-all duration-200"
            >
              <Plus size={20} />
              Nova Conta
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md min-h-[44px]"
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
          <div className="text-center py-8 text-neutral-600">
            Carregando...
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200" style={{ minWidth: '700px' }}>
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Fornecedor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Descrição
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Vencimento
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-sm text-neutral-900">
                      {account.supplier}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      <div className="flex items-center gap-2">
                        {account.description}
                        {(account as any).isRecurring && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800" title="Conta recorrente">
                            <Repeat size={16} className="mr-1" />
                            Recorrente
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                      {formatCurrency(account.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
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
                            className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-success-600 hover:text-success-700 hover:bg-success-50 rounded-md transition-all duration-200"
                            title="Marcar como pago"
                          >
                            <Check size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(account)}
                          className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
                          className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-error-600 hover:text-error-700 hover:bg-error-50 rounded-md transition-all duration-200"
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

        {/* Statement Modal */}
        {showStatementModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl my-8">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
                    <FileText size={28} className="text-primary-600" />
                    Gerar Extrato de Pagamentos
                  </h2>
                  <button
                    onClick={() => {
                      setShowStatementModal(false);
                      setStatementData(null);
                      setStatementFilters({ startDate: '', endDate: '', category: '' });
                    }}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    ✕
                  </button>
                </div>

                {/* Filters */}
                <div className="bg-neutral-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Data Início *
                      </label>
                      <input
                        type="date"
                        value={statementFilters.startDate}
                        onChange={(e) => setStatementFilters({ ...statementFilters, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[44px]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Data Fim *
                      </label>
                      <input
                        type="date"
                        value={statementFilters.endDate}
                        onChange={(e) => setStatementFilters({ ...statementFilters, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[44px]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Categoria
                      </label>
                      <select
                        value={statementFilters.category}
                        onChange={(e) => setStatementFilters({ ...statementFilters, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[44px]"
                      >
                        <option value="">Todas as Categorias</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={handleGenerateStatement}
                      disabled={generatingStatement}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingStatement ? 'Gerando...' : 'Visualizar Extrato'}
                    </button>
                  </div>
                </div>

                {/* Statement Results */}
                {statementData && (
                  <div className="space-y-6">
                    {/* Total Box */}
                    <div className="bg-success-50 border border-primary-200 rounded-lg p-4">
                      <div className="text-center">
                        <p className="text-sm text-neutral-600 mb-1">Total Pago no Período</p>
                        <p className="text-3xl font-bold text-primary-600">
                          {formatCurrency(statementData.total)}
                        </p>
                        <p className="text-sm text-neutral-500 mt-1">
                          {statementData.count} pagamento{statementData.count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    {/* Export Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleExportPDF}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 font-medium rounded-lg transition-all duration-200"
                      >
                        <Download size={20} />
                        Exportar PDF
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200"
                      >
                        <Download size={20} />
                        Exportar CSV
                      </button>
                    </div>

                    {/* Payments Table */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-neutral-200">
                        <thead className="bg-neutral-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                              Fornecedor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                              Descrição
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                              Categoria
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                              Valor
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                              Data Pagamento
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-neutral-200">
                          {statementData.accounts.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                                Nenhum pagamento encontrado no período selecionado
                              </td>
                            </tr>
                          ) : (
                            statementData.accounts.map((account) => (
                              <tr key={account.id} className="hover:bg-neutral-50">
                                <td className="px-4 py-3 text-sm text-neutral-900">
                                  {account.supplier}
                                </td>
                                <td className="px-4 py-3 text-sm text-neutral-600">
                                  {account.description}
                                </td>
                                <td className="px-4 py-3 text-sm text-neutral-600">
                                  {account.category || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                                  {formatCurrency(account.amount)}
                                </td>
                                <td className="px-4 py-3 text-sm text-neutral-600">
                                  {formatDate(account.paidDate || account.dueDate)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!statementData && (
                  <div className="text-center py-8 text-neutral-500">
                    Selecione o período e clique em "Visualizar Extrato" para gerar o relatório
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setShowStatementModal(false);
                      setStatementData(null);
                      setStatementFilters({ startDate: '', endDate: '', category: '' });
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg transition-all duration-200"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-neutral-900 mb-4">
                  {editingAccount ? 'Editar Conta' : 'Nova Conta'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Fornecedor *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Descrição *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Valor *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Vencimento *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Categoria
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[44px]"
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
                        className="w-4 h-4 text-success-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <label htmlFor="isRecurring" className="ml-2 text-sm font-medium text-neutral-700">
                        Conta Recorrente (criar automaticamente ao pagar)
                      </label>
                    </div>

                    {formData.isRecurring && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Período de Recorrência *
                        </label>
                        <select
                          required={formData.isRecurring}
                          value={formData.recurrencePeriod}
                          onChange={(e) => setFormData({ ...formData, recurrencePeriod: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md min-h-[44px]"
                        >
                          <option value="">Selecione o período</option>
                          <option value="DAYS_15">A cada 15 dias</option>
                          <option value="DAYS_30">A cada 30 dias (mensal)</option>
                          <option value="MONTHS_6">A cada 6 meses (semestral)</option>
                          <option value="YEAR_1">A cada 1 ano (anual)</option>
                        </select>
                        <p className="mt-1 text-xs text-neutral-500">
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
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg transition-all duration-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-success-600 hover:bg-success-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
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
