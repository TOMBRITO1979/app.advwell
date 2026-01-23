import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, X, Filter, List, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { ExportButton, ActionsDropdown } from '../components/ui';
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
  type?: 'CASE' | 'PNJ';
}

interface CostCenter {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
}

interface Transaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  status: 'PAID' | 'PENDING' | 'CANCELLED' | 'PARTIAL';
  description: string;
  amount: number;
  date: string;
  client: Client;
  case?: Case;
  costCenter?: CostCenter;
  createdAt: string;
  isInstallment?: boolean;
  installmentCount?: number;
  installmentInterval?: number;
}

interface FormData {
  clientId: string;
  caseId: string;
  costCenterId: string;
  type: 'INCOME' | 'EXPENSE';
  status: 'PAID' | 'PENDING' | 'CANCELLED' | 'PARTIAL';
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
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterClientId, setFilterClientId] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterCaseNumber, setFilterCaseNumber] = useState<string>('');
  const [filterCaseId, setFilterCaseId] = useState<string>('');
  const [filterValueMin, setFilterValueMin] = useState<string>('');
  const [filterValueMax, setFilterValueMax] = useState<string>('');
  const [filterDescription, setFilterDescription] = useState<string>('');
  const [filterCostCenterId, setFilterCostCenterId] = useState<string>('');
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
    costCenterId: '',
    type: 'INCOME',
    status: 'PENDING',
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

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    loadTransactions();
    loadClients();
    loadCases();
    loadCostCenters();
  }, [search, filterType, filterClientId, filterStartDate, filterEndDate, filterStatus, filterCaseNumber, filterCaseId, filterValueMin, filterValueMax, filterDescription, filterCostCenterId, page, limit]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterType, filterClientId, filterStartDate, filterEndDate, filterStatus, filterCaseNumber, filterCaseId, filterValueMin, filterValueMax, filterDescription, filterCostCenterId]);

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
      const params: any = { page, limit };
      if (search) params.search = search;
      if (filterType) params.type = filterType;
      if (filterClientId) params.clientId = filterClientId;
      if (filterStartDate) params.startDate = filterStartDate;
      if (filterEndDate) params.endDate = filterEndDate;
      if (filterStatus) params.status = filterStatus;
      if (filterCaseNumber) params.caseNumber = filterCaseNumber;
      if (filterCaseId) params.caseId = filterCaseId;
      if (filterValueMin) params.valueMin = filterValueMin;
      if (filterValueMax) params.valueMax = filterValueMax;
      if (filterDescription) params.description = filterDescription;
      if (filterCostCenterId) params.costCenterId = filterCostCenterId;

      const response = await api.get('/financial', { params });
      setTransactions(response.data.data);
      setTotal(response.data.total);
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
      // Carregar processos judiciais (Cases) e PNJs em paralelo
      const [casesResponse, pnjsResponse] = await Promise.all([
        api.get('/cases', { params: { limit: 1000 } }),
        api.get('/pnj', { params: { limit: 1000 } })
      ]);

      // Mapear casos judiciais
      const casesData = (casesResponse.data.data || []).map((c: any) => ({
        id: c.id,
        processNumber: c.processNumber,
        subject: c.subject || 'Sem assunto',
        type: 'CASE' as const
      }));

      // Mapear PNJs para o mesmo formato
      const pnjsData = (pnjsResponse.data.data || []).map((p: any) => ({
        id: p.id,
        processNumber: p.number,
        subject: p.title || 'Sem título',
        type: 'PNJ' as const
      }));

      // Combinar e ordenar por número
      const combined = [...casesData, ...pnjsData].sort((a, b) =>
        (a.processNumber || '').localeCompare(b.processNumber || '')
      );

      setCases(combined);
    } catch (error) {
      console.error('Erro ao carregar processos');
    }
  };

  const loadCostCenters = async () => {
    try {
      const response = await api.get('/cost-centers', { params: { active: 'true' } });
      setCostCenters(response.data);
    } catch (error) {
      console.error('Erro ao carregar centros de custo');
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      caseId: '',
      costCenterId: '',
      type: 'INCOME',
      status: 'PENDING',
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
        costCenterId: formData.costCenterId || undefined,
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
      costCenterId: transaction.costCenter?.id || '',
      type: transaction.type,
      status: transaction.status || 'PENDING',
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
    setFilterStatus('');
    setFilterCaseNumber('');
    setFilterCaseId('');
    setFilterValueMin('');
    setFilterValueMax('');
    setFilterDescription('');
    setFilterCostCenterId('');
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

      // Usa arraybuffer para poder verificar se é JSON ou CSV
      const response = await api.get('/financial/export/csv', {
        params,
        responseType: 'arraybuffer'
      });

      // Verifica se a resposta é JSON (export enfileirado) ou CSV (download direto)
      const contentType = response.headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        // Resposta JSON - export foi enfileirado
        const decoder = new TextDecoder('utf-8');
        const jsonText = decoder.decode(response.data);
        const data = JSON.parse(jsonText);

        if (data.queued) {
          toast.success(data.message || 'Exportação enfileirada! Você receberá o arquivo por email.');
          return;
        }
      }

      // Resposta CSV - download direto
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
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
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-3 sm:mb-4">Financeiro</h1>

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
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-slate-400">Total Receitas</p>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-2">
                  {formatCurrency(summary.totalIncome)}
                </p>
              </div>
              <div className="p-3 bg-success-100 dark:bg-success-900/30 rounded-full">
                <TrendingUp className="text-primary-600 dark:text-primary-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-slate-400">Total Despesas</p>
                <p className="text-2xl font-bold text-error-600 dark:text-error-400 mt-2">
                  {formatCurrency(summary.totalExpense)}
                </p>
              </div>
              <div className="p-3 bg-error-100 dark:bg-error-900/30 rounded-full">
                <TrendingDown className="text-error-600 dark:text-error-400" size={24} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-600 dark:text-slate-400">Saldo</p>
                <p className={`text-2xl font-bold mt-2 ${summary.balance >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-error-600 dark:text-error-400'}`}>
                  {formatCurrency(summary.balance)}
                </p>
              </div>
              <div className={`p-3 rounded-full ${summary.balance >= 0 ? 'bg-success-100 dark:bg-success-900/30' : 'bg-error-100 dark:bg-error-900/30'}`}>
                <DollarSign className={summary.balance >= 0 ? 'text-primary-600 dark:text-primary-400' : 'text-error-600 dark:text-error-400'} size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex items-center gap-2">
              <Search size={20} className="text-neutral-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por descrição ou cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md hover:bg-neutral-50 dark:hover:bg-slate-700 transition-colors min-h-[44px] text-neutral-700 dark:text-slate-300"
            >
              <Filter size={20} />
              <span>Filtros</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-slate-700 space-y-4">
              {/* Linha 1: Descrição e Valores */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Descrição</label>
                  <input
                    type="text"
                    placeholder="Filtrar por descrição..."
                    value={filterDescription}
                    onChange={(e) => setFilterDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Valor Mínimo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="R$ 0,00"
                    value={filterValueMin}
                    onChange={(e) => setFilterValueMin(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Valor Máximo</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="R$ 999.999,99"
                    value={filterValueMax}
                    onChange={(e) => setFilterValueMax(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Linha 2: Filtros de data, tipo e status */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Data Final</label>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Tipo</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                  >
                    <option value="">Todos</option>
                    <option value="INCOME">Receitas</option>
                    <option value="EXPENSE">Despesas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                  >
                    <option value="">Todos</option>
                    <option value="PAID">Pago</option>
                    <option value="PENDING">Pendente</option>
                    <option value="CANCELLED">Cancelado</option>
                    <option value="PARTIAL">Parcialmente Pago</option>
                  </select>
                </div>
              </div>

              {/* Linha 3: Cliente e Centro de Custo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Cliente</label>
                  <select
                    value={filterClientId}
                    onChange={(e) => setFilterClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                  >
                    <option value="">Todos os clientes</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.cpf && `(${client.cpf})`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Centro de Custo</label>
                  <select
                    value={filterCostCenterId}
                    onChange={(e) => setFilterCostCenterId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                  >
                    <option value="">Todos os centros de custo</option>
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.name} {cc.code && `(${cc.code})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Linha 4: Processo (dropdown e busca por número) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Processo (selecionar)</label>
                  <select
                    value={filterCaseId}
                    onChange={(e) => {
                      setFilterCaseId(e.target.value);
                      if (e.target.value) setFilterCaseNumber(''); // Limpa busca por número se selecionar
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                  >
                    <option value="">Todos os processos</option>
                    {cases.map((caseItem) => (
                      <option key={caseItem.id} value={caseItem.id}>
                        {caseItem.processNumber} - {caseItem.subject?.substring(0, 30)}{caseItem.subject?.length > 30 ? '...' : ''} {caseItem.type === 'PNJ' ? '(PNJ)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Nº Processo (busca parcial)</label>
                  <input
                    type="text"
                    placeholder="Digite parte do número..."
                    value={filterCaseNumber}
                    onChange={(e) => {
                      setFilterCaseNumber(e.target.value);
                      if (e.target.value) setFilterCaseId(''); // Limpa seleção se digitar número
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Linha 4: Botões de atalho e limpar */}
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
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20">
          {loading ? (
            <p className="text-center py-8 text-neutral-600 dark:text-slate-400">Carregando...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center py-8 text-neutral-600 dark:text-slate-400">
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
                  <thead className="bg-neutral-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Centro de Custo
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Processo
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-slate-800 dark:even:bg-slate-700/50 hover:bg-success-100 dark:hover:bg-slate-600 transition-colors">
                        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-slate-100">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {transaction.type === 'INCOME' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-400">
                              <TrendingUp size={16} className="mr-1" />
                              Receita
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-error-100 dark:bg-error-900/30 text-error-800 dark:text-error-400">
                              <TrendingDown size={16} className="mr-1" />
                              Despesa
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-900 dark:text-slate-100">
                          <div>
                            <p className="font-medium">{transaction.client.name}</p>
                            {transaction.client.cpf && (
                              <p className="text-xs text-neutral-500 dark:text-slate-400">{transaction.client.cpf}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-300">
                          {transaction.description}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {transaction.costCenter ? (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: transaction.costCenter.color ? `${transaction.costCenter.color}20` : '#e5e7eb',
                                color: transaction.costCenter.color || '#374151',
                              }}
                            >
                              {transaction.costCenter.name}
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-300">
                          {transaction.case ? (
                            <span className="text-xs">{transaction.case.processNumber}</span>
                          ) : (
                            <span className="text-xs text-neutral-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className={`font-semibold ${transaction.type === 'INCOME' ? 'text-primary-600' : 'text-error-600'}`}>
                            {transaction.type === 'INCOME' ? '+' : '-'} {formatCurrency(transaction.amount)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <ActionsDropdown
                            actions={[
                              { label: 'Ver Parcelas', icon: <List size={16} />, onClick: () => handleViewInstallments(transaction), variant: 'info', hidden: !transaction.isInstallment },
                              { label: transaction.type === 'INCOME' ? 'Gerar Recibo' : 'Gerar Comprovante', icon: <FileText size={16} />, onClick: () => handleGenerateReceipt(transaction), variant: 'warning' },
                              { label: 'Editar', icon: <Edit size={16} />, onClick: () => handleEdit(transaction), variant: 'primary' },
                              { label: 'Excluir', icon: <Trash2 size={16} />, onClick: () => handleDelete(transaction), variant: 'danger' },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {!loading && transactions.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-slate-400">
              <span>Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} transações</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="ml-2 px-2 py-1 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="p-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md hover:bg-neutral-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-neutral-700 dark:text-slate-300"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800'
                          : 'border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="p-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md hover:bg-neutral-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-neutral-700 dark:text-slate-300"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center min-h-[44px]">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-slate-100">
                {editMode ? 'Editar Transação' : 'Nova Transação'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedTransaction(null);
                  resetForm();
                }}
                className="text-neutral-400 hover:text-neutral-600 dark:text-slate-500 dark:hover:text-slate-300"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Tipo de Transação */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Tipo de Transação *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'INCOME' })}
                      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 transition-colors ${
                        formData.type === 'INCOME'
                          ? 'border-primary-500 bg-success-50 dark:bg-success-900/30 text-primary-700 dark:text-primary-400'
                          : 'border-neutral-300 dark:border-slate-600 hover:border-neutral-400 dark:hover:border-slate-500 text-neutral-700 dark:text-slate-300'
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
                          ? 'border-error-500 bg-error-50 dark:bg-error-900/30 text-error-700 dark:text-error-400'
                          : 'border-neutral-300 dark:border-slate-600 hover:border-neutral-400 dark:hover:border-slate-500 text-neutral-700 dark:text-slate-300'
                      }`}
                    >
                      <TrendingDown size={20} />
                      <span className="font-medium">Despesa</span>
                    </button>
                  </div>
                </div>

                {/* Cliente - Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
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
                      if (e.target.value.trim()) {
                        setShowClientSuggestions(true);
                      } else {
                        setShowClientSuggestions(false);
                      }
                      setFormData({ ...formData, clientId: '' });
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500"
                  />
                  {showClientSuggestions && filteredClients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredClients.map((client) => (
                        <div
                          key={client.id}
                          onClick={() => handleClientSelect(client)}
                          className="px-4 py-2 hover:bg-neutral-100 dark:hover:bg-slate-600 cursor-pointer min-h-[44px]"
                        >
                          <p className="font-medium text-sm text-neutral-900 dark:text-slate-100">{client.name}</p>
                          {client.cpf && <p className="text-xs text-neutral-500 dark:text-slate-400">{client.cpf}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Processo (Opcional) - Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Processo (Opcional)
                  </label>
                  <input
                    ref={caseInputRef}
                    type="text"
                    placeholder="Digite o número do processo..."
                    value={caseSearchText}
                    onChange={(e) => {
                      setCaseSearchText(e.target.value);
                      if (e.target.value.trim()) {
                        setShowCaseSuggestions(true);
                      } else {
                        setShowCaseSuggestions(false);
                      }
                      setFormData({ ...formData, caseId: '' });
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500"
                  />
                  {showCaseSuggestions && filteredCases.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {filteredCases.map((caseItem) => (
                        <div
                          key={caseItem.id}
                          onClick={() => handleCaseSelect(caseItem)}
                          className="px-4 py-2 hover:bg-neutral-100 dark:hover:bg-slate-600 cursor-pointer min-h-[44px]"
                        >
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-neutral-900 dark:text-slate-100">{caseItem.processNumber}</p>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              caseItem.type === 'PNJ'
                                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            }`}>
                              {caseItem.type === 'PNJ' ? 'PNJ' : 'Judicial'}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-slate-400">{caseItem.subject}</p>
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
                      className="absolute right-3 top-9 text-neutral-400 hover:text-neutral-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>

                {/* Centro de Custo */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Centro de Custo
                  </label>
                  <select
                    value={formData.costCenterId}
                    onChange={(e) => setFormData({ ...formData, costCenterId: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                  >
                    <option value="">Selecione um centro de custo</option>
                    {costCenters
                      .filter((cc) => {
                        if (formData.type === 'INCOME') return cc.color !== null; // All centers (type filtering in future)
                        if (formData.type === 'EXPENSE') return cc.color !== null;
                        return true;
                      })
                      .map((cc) => (
                        <option key={cc.id} value={cc.id}>
                          {cc.name} {cc.code && `(${cc.code})`}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Descrição <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Honorários advocatícios, Custas processuais..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Valor */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
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
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500"
                    />
                  </div>

                  {/* Data */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Data <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Status <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'PAID' | 'PENDING' | 'CANCELLED' | 'PARTIAL' })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100"
                  >
                    <option value="PENDING">Pendente</option>
                    <option value="PAID">Pago</option>
                    <option value="PARTIAL">Parcialmente Pago</option>
                    <option value="CANCELLED">Cancelado</option>
                  </select>
                </div>

                {/* Parcelamento */}
                <div className="border-t border-neutral-200 dark:border-slate-700 pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id="isInstallment"
                      checked={formData.isInstallment}
                      onChange={(e) => setFormData({ ...formData, isInstallment: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-neutral-300 dark:border-slate-600 rounded focus:ring-primary-500 bg-white dark:bg-slate-700"
                    />
                    <label htmlFor="isInstallment" className="text-sm font-medium text-neutral-700 dark:text-slate-300">
                      Parcelar esta transação
                    </label>
                  </div>

                  {formData.isInstallment && (
                    <div className="grid grid-cols-2 gap-4 pl-6">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                          Número de Parcelas <span className="text-error-500">*</span>
                        </label>
                        <input
                          type="number"
                          required={formData.isInstallment}
                          min="2"
                          placeholder="Ex: 12"
                          value={formData.installmentCount}
                          onChange={(e) => setFormData({ ...formData, installmentCount: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500"
                        />
                        <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">Mínimo: 2 parcelas</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                          Intervalo (dias)
                        </label>
                        <input
                          type="number"
                          min="1"
                          placeholder="Ex: 30"
                          value={formData.installmentInterval}
                          onChange={(e) => setFormData({ ...formData, installmentInterval: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-700 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500"
                        />
                        <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">Padrão: 30 dias (mensal)</p>
                      </div>

                      {formData.amount && formData.installmentCount && (
                        <div className="col-span-2 p-3 bg-info-50 dark:bg-info-900/30 rounded-md border border-info-200 dark:border-info-800">
                          <p className="text-sm text-info-700 dark:text-info-400">
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
