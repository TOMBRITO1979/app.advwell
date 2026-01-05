import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, X, Filter, List, FileText } from 'lucide-react';
import { ExportButton } from '../components/ui';
import InstallmentsModal from '../components/InstallmentsModal';
import { formatDate } from '../utils/dateFormatter';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';

interface Client {
  id: string;
  name: string;
  cpf?: string;
}

interface Case {
  id: string;
  processNumber: string;
  subject: string;
}

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: number;
  date: string;
  client: Client;
  case?: Case;
  createdAt: string;
  isInstallment?: boolean;
  installmentCount?: number;
  installmentInterval?: number;
}

interface FormData {
  clientId: string;
  caseId: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: string;
  date: string;
  isInstallment: boolean;
  installmentCount: string;
  installmentInterval: string;
}

interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
}

const Financial: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterClientId, setFilterClientId] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [summary, setSummary] = useState<Summary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });

  // Autocomplete states
  const [clientSearchText, setClientSearchText] = useState('');
  const [caseSearchText, setCaseSearchText] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [showCaseSuggestions, setShowCaseSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);

  const clientInputRef = useRef<HTMLInputElement>(null);
  const caseInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    clientId: '',
    caseId: '',
    type: 'INCOME',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    isInstallment: false,
    installmentCount: '2',
    installmentInterval: '30',
  });

  // State for installments modal
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
  const [selectedTransactionForInstallments, setSelectedTransactionForInstallments] = useState<Transaction | null>(null);

  useEffect(() => {
    loadTransactions();
    loadClients();
    loadCases();
  }, [search, filterType, filterClientId, filterStartDate, filterEndDate]);

  // Filter clients based on search text
  useEffect(() => {
    if (clientSearchText) {
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(clientSearchText.toLowerCase()) ||
        (client.cpf && client.cpf.includes(clientSearchText))
      );
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [clientSearchText, clients]);

  // Filter cases based on search text
  useEffect(() => {
    if (caseSearchText) {
      const filtered = cases.filter(caseItem =>
        caseItem.processNumber.toLowerCase().includes(caseSearchText.toLowerCase()) ||
        caseItem.subject.toLowerCase().includes(caseSearchText.toLowerCase())
      );
      setFilteredCases(filtered);
    } else {
      setFilteredCases(cases);
    }
  }, [caseSearchText, cases]);

  const loadTransactions = async () => {
    try {
      const params: any = { limit: 1000 };
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (filterClientId) params.clientId = filterClientId;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const response = await api.get('/financial', { params });
      setTransactions(response.data.data);
      setSummary(response.data.summary);
    } catch (error) {
      toast.error('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await api.get('/clients', { params: { limit: 1000 } });
      setClients(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar clientes');
    }
  };

  const loadCases = async () => {
    try {
      const response = await api.get('/cases', { params: { limit: 1000 } });
      setCases(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar processos');
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      caseId: '',
      type: 'INCOME',
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      isInstallment: false,
      installmentCount: '2',
      installmentInterval: '30',
    });
    setClientSearchText('');
    setCaseSearchText('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        ...formData,
        amount: parseFloat(formData.amount),
        caseId: formData.caseId || undefined,
      };

      // Include installment data if enabled
      if (formData.isInstallment) {
        payload.installmentCount = parseInt(formData.installmentCount);
        payload.installmentInterval = parseInt(formData.installmentInterval);
      }

      if (editMode && selectedTransaction) {
        await api.put(`/financial/${selectedTransaction.id}`, payload);
        toast.success('Transação atualizada com sucesso!');
      } else {
        await api.post('/financial', payload);
        toast.success('Transação criada com sucesso!');
      }

      setShowModal(false);
      setEditMode(false);
      setSelectedTransaction(null);
      resetForm();
      loadTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar transação');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setFormData({
      clientId: transaction.client.id,
      caseId: transaction.case?.id || '',
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount.toString(),
      date: transaction.date.split('T')[0],
      isInstallment: transaction.isInstallment || false,
      installmentCount: transaction.installmentCount?.toString() || '2',
      installmentInterval: transaction.installmentInterval?.toString() || '30',
    });
    setClientSearchText(transaction.client.name);
    setCaseSearchText(transaction.case ? transaction.case.processNumber : '');
    setEditMode(true);
    setShowModal(true);
  };

  const handleViewInstallments = (transaction: Transaction) => {
    setSelectedTransactionForInstallments(transaction);
    setShowInstallmentsModal(true);
  };

  const handleGenerateReceipt = async (transaction: Transaction) => {
    try {
      const response = await api.get(`/financial/${transaction.id}/receipt`, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const receiptType = transaction.type === 'INCOME' ? 'recibo' : 'comprovante';
      link.setAttribute('download', `${receiptType}_${transaction.id.substring(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(`${transaction.type === 'INCOME' ? 'Recibo' : 'Comprovante'} gerado com sucesso!`);
    } catch (error) {
      toast.error('Erro ao gerar recibo');
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    if (!window.confirm(`Tem certeza que deseja excluir esta transação?`)) {
      return;
    }

    try {
      await api.delete(`/financial/${transaction.id}`);
      toast.success('Transação excluída com sucesso!');
      loadTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir transação');
    }
  };

  const handleNew = () => {
    resetForm();
    setEditMode(false);
    setSelectedTransaction(null);
    setShowModal(true);
  };

  const clearFilters = () => {
    setSearch('');
    setFilterType('');
    setFilterClientId('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const handleClientSelect = (client: Client) => {
    setFormData({ ...formData, clientId: client.id });
    setClientSearchText(client.name);
    setShowClientSuggestions(false);
  };

  const handleCaseSelect = (caseItem: Case) => {
    setFormData({ ...formData, caseId: caseItem.id });
    setCaseSearchText(caseItem.processNumber);
    setShowCaseSuggestions(false);
  };

  const handleExportPDF = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (filterClientId) params.clientId = filterClientId;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const response = await api.get('/financial/export/pdf', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleExportCSV = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (filterClientId) params.clientId = filterClientId;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;

      const response = await api.get('/financial/export/csv', {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('CSV gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar CSV');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/financial/import/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { total, success, errors } = response.data;

      if (errors.length > 0) {
        let message = `${success} de ${total} transações importadas com sucesso.\n\n`;
        message += 'Erros encontrados:\n';
        errors.slice(0, 5).forEach((err: any) => {
          message += `Linha ${err.line}: ${err.error}\n`;
        });
        if (errors.length > 5) {
          message += `... e mais ${errors.length - 5} erros.`;
        }
        toast.error(message, { duration: 8000 });
      } else {
        toast.success(`${success} transações importadas com sucesso!`);
      }

      loadTransactions();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao importar CSV');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };


  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-3 sm:mb-4">Financeiro</h1>

          {/* Action Buttons - Mobile: 2 rows, Desktop: Single row */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Linha 1 no mobile: 3 botões de exportação */}
            <div className="grid grid-cols-3 gap-2 sm:contents">
              <ExportButton
                type="import"
                onClick={handleImportClick}
              />
              <ExportButton
                type="pdf"
                onClick={handleExportPDF}
              />
              <ExportButton
                type="csv"
                onClick={handleExportCSV}
              />
            </div>
            {/* Linha 2 no mobile: Botão Nova Transação em largura total */}
            <button
              onClick={handleNew}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium text-sm transition-all duration-200 min-h-[44px]"
            >
              <Plus size={20} />
              <span>Nova Transação</span>
            </button>
          </div>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Receitas</p>
                <p className="text-2xl font-bold text-primary-600 mt-2">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </div>
              <div className="p-3 bg-success-100 rounded-full">
                <TrendingUp className="text-primary-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Total Despesas</p>
                <p className="text-2xl font-bold text-error-600 mt-2">
                  {formatCurrency(summary.totalExpense)}
                </p>
              </div>
              <div className="p-3 bg-error-100 rounded-full">
                <TrendingDown className="text-error-600" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600">Saldo</p>
                <p className={`text-2xl font-bold mt-2 ${summary.balance >= 0 ? 'text-primary-600' : 'text-error-600'}`}>
                  {formatCurrency(summary.balance)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${summary.balance >= 0 ? 'bg-success-100' : 'bg-error-100'}`}>
                <DollarSign className={summary.balance >= 0 ? 'text-primary-600' : 'text-error-600'} size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex items-center gap-2">
              <Search size={20} className="text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar por descrição ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors min-h-[44px]"
            >
              <Filter size={20} />
              <span>Filtros</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-neutral-200 space-y-4">
              {/* Linha 1: Filtros de data */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Data Final</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <option value="">Todos</option>
                    <option value="INCOME">Receitas</option>
                    <option value="EXPENSE">Despesas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Cliente</label>
                  <select
                    value={filterClientId}
                    onChange={(e) => setFilterClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <option value="">Todos</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.cpf && `(${client.cpf})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linha 2: Botões de atalho e limpar */}
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                      setFilterStartDate(firstDay.toISOString().split('T')[0]);
                      setFilterEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1.5 text-sm border border-primary-300 rounded-md text-primary-700 hover:bg-primary-50 transition-colors"
                  >
                    Este Mês
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
                      setFilterStartDate(firstDay.toISOString().split('T')[0]);
                      setFilterEndDate(lastDay.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1.5 text-sm border border-primary-300 rounded-md text-primary-700 hover:bg-primary-50 transition-colors"
                  >
                    Mês Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const firstDay = new Date(today.getFullYear(), 0, 1);
                      setFilterStartDate(firstDay.toISOString().split('T')[0]);
                      setFilterEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1.5 text-sm border border-primary-300 rounded-md text-primary-700 hover:bg-primary-50 transition-colors"
                  >
                    Este Ano
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const last30 = new Date(today);
                      last30.setDate(today.getDate() - 30);
                      setFilterStartDate(last30.toISOString().split('T')[0]);
                      setFilterEndDate(today.toISOString().split('T')[0]);
                    }}
                    className="px-3 py-1.5 text-sm border border-primary-300 rounded-md text-primary-700 hover:bg-primary-50 transition-colors"
                  >
                    Últimos 30 Dias
                  </button>
                </div>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors min-h-[44px]"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tabela de Transações */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <p className="text-center py-8 text-neutral-600">Carregando...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center py-8 text-neutral-600">
              {search || filterType || filterClientId || filterStartDate || filterEndDate
                ? 'Nenhuma transação encontrada para os filtros aplicados'
                : 'Nenhuma transação cadastrada'}
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                <MobileCardList
                  items={transactions.map((transaction): MobileCardItem => ({
                    id: transaction.id,
                    title: transaction.description,
                    subtitle: transaction.client.name,
                    badge: {
                      text: transaction.type === 'INCOME' ? 'Receita' : 'Despesa',
                      color: transaction.type === 'INCOME' ? 'green' : 'red',
                    },
                    fields: [
                      { label: 'Data', value: formatDate(transaction.date) || '-' },
                      { label: 'Valor', value: `${transaction.type === 'INCOME' ? '+' : '-'} ${formatCurrency(transaction.amount)}` },
                      { label: 'Processo', value: transaction.case?.processNumber || '-' },
                    ],
                    onEdit: () => handleEdit(transaction),
                    onDelete: () => handleDelete(transaction),
                  }))}
                  emptyMessage={search || filterType || filterClientId || filterStartDate || filterEndDate
                    ? 'Nenhuma transacao encontrada para os filtros aplicados'
                    : 'Nenhuma transacao cadastrada'}
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                        Processo
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="odd:bg-white even:bg-neutral-50 hover:bg-success-100 transition-colors">
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {transaction.type === 'INCOME' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-800">
                              <TrendingUp size={16} className="mr-1" />
                              Receita
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-100 text-error-800">
                              <TrendingDown size={16} className="mr-1" />
                              Despesa
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900">
                          <div>
                            <p className="font-medium">{transaction.client.name}</p>
                            {transaction.client.cpf && (
                              <p className="text-xs text-neutral-500">{transaction.client.cpf}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {transaction.description}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {transaction.case ? (
                            <span className="text-xs">{transaction.case.processNumber}</span>
                          ) : (
                            <span className="text-xs text-neutral-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={`font-semibold ${transaction.type === 'INCOME' ? 'text-primary-600' : 'text-error-600'}`}>
                            {transaction.type === 'INCOME' ? '+' : '-'} {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            {transaction.isInstallment && (
                              <button
                                onClick={() => handleViewInstallments(transaction)}
                                className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-info-600 hover:text-info-700 hover:bg-info-50 rounded-md transition-all duration-200"
                                title="Ver Parcelas"
                              >
                                <List size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => handleGenerateReceipt(transaction)}
                              className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-md transition-all duration-200"
                              title={transaction.type === 'INCOME' ? 'Gerar Recibo' : 'Gerar Comprovante'}
                            >
                              <FileText size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(transaction)}
                              className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(transaction)}
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
            </>
          )}
        </div>
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center min-h-[44px]">
              <h2 className="text-xl font-bold text-neutral-900">
                {editMode ? 'Editar Transação' : 'Nova Transação'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedTransaction(null);
                  resetForm();
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Tipo de Transação */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Tipo de Transação *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 transition-colors ${
                        formData.type === 'INCOME'
                          ? 'border-primary-500 bg-success-50 text-primary-700'
                          : 'border-neutral-300 hover:border-neutral-400'
                      }`}
                    >
                      <TrendingUp size={20} />
                      <span className="font-medium">Receita</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'EXPENSE' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 transition-colors ${
                        formData.type === 'EXPENSE'
                          ? 'border-error-500 bg-error-50 text-error-700'
                          : 'border-neutral-300 hover:border-neutral-400'
                      }`}
                    >
                      <TrendingDown size={20} />
                      <span className="font-medium">Despesa</span>
                    </button>
                  </div>
                </div>

                {/* Cliente - Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Cliente <span className="text-error-500">*</span>
                  </label>
                  <input
                    ref={clientInputRef}
                    type="text"
                    required
                    placeholder="Digite o nome ou CPF do cliente..."
                    value={clientSearchText}
                    onChange={(e) => {
                      setClientSearchText(e.target.value);
                      setShowClientSuggestions(true);
                      setFormData({ ...formData, clientId: '' });
                    }}
                    onFocus={() => setShowClientSuggestions(true)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                  {showClientSuggestions && filteredClients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => handleClientSelect(client)}
                          className="px-4 py-2 hover:bg-neutral-100 cursor-pointer min-h-[44px]"
                        >
                          <p className="font-medium text-sm">{client.name}</p>
                          {client.cpf && <p className="text-xs text-neutral-500">{client.cpf}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Processo (Opcional) - Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Processo (Opcional)
                  </label>
                  <input
                    ref={caseInputRef}
                    type="text"
                    placeholder="Digite o número do processo..."
                    value={caseSearchText}
                    onChange={(e) => {
                      setCaseSearchText(e.target.value);
                      setShowCaseSuggestions(true);
                      setFormData({ ...formData, caseId: '' });
                    }}
                    onFocus={() => setShowCaseSuggestions(true)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                  {showCaseSuggestions && filteredCases.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredCases.map((caseItem) => (
                        <div
                          key={caseItem.id}
                          onClick={() => handleCaseSelect(caseItem)}
                          className="px-4 py-2 hover:bg-neutral-100 cursor-pointer min-h-[44px]"
                        >
                          <p className="font-medium text-sm">{caseItem.processNumber}</p>
                          <p className="text-xs text-neutral-500">{caseItem.subject}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {caseSearchText && formData.caseId && (
                    <button
                      type="button"
                      onClick={() => {
                        setCaseSearchText('');
                        setFormData({ ...formData, caseId: '' });
                      }}
                      className="absolute right-3 top-9 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Descrição <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Honorários advocatícios, Custas processuais..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Valor */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Valor <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>

                  {/* Data */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Data <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>
                </div>

                {/* Parcelamento */}
                <div className="border-t border-neutral-200 pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id="isInstallment"
                      checked={formData.isInstallment}
                      onChange={(e) => setFormData({ ...formData, isInstallment: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="isInstallment" className="text-sm font-medium text-neutral-700">
                      Parcelar esta transação
                    </label>
                  </div>

                  {formData.isInstallment && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Número de Parcelas <span className="text-error-500">*</span>
                        </label>
                        <input
                          type="number"
                          required={formData.isInstallment}
                          min="2"
                          placeholder="Ex: 12"
                          value={formData.installmentCount}
                          onChange={(e) => setFormData({ ...formData, installmentCount: e.target.value })}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                        <p className="text-xs text-neutral-500 mt-1">Mínimo: 2 parcelas</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Intervalo (dias)
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Ex: 30"
                          value={formData.installmentInterval}
                          onChange={(e) => setFormData({ ...formData, installmentInterval: e.target.value })}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                        <p className="text-xs text-neutral-500 mt-1">Padrão: 30 dias (mensal)</p>
                      </div>

                      {formData.amount && formData.installmentCount && (
                        <div className="col-span-2 p-3 bg-info-50 rounded-md border border-info-200">
                          <p className="text-sm text-info-700">
                            <span className="font-semibold">Valor por parcela:</span>{' '}
                            {formatCurrency(parseFloat(formData.amount) / parseInt(formData.installmentCount) || 0)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedTransaction(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-100 text-primary-700 border border-primary-200 rounded-md hover:bg-primary-200 transition-colors min-h-[44px]"
                >
                  {editMode ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Parcelas */}
      {showInstallmentsModal && selectedTransactionForInstallments && (
        <InstallmentsModal
          transactionId={selectedTransactionForInstallments.id}
          transactionDescription={selectedTransactionForInstallments.description}
          transactionAmount={selectedTransactionForInstallments.amount}
          transactionType={selectedTransactionForInstallments.type}
          onClose={() => {
            setShowInstallmentsModal(false);
            setSelectedTransactionForInstallments(null);
            loadTransactions();
          }}
        />
      )}
    </Layout>
  );
};

export default Financial;
