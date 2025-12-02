import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, RefreshCw, X, Calendar, User, FileText, Clock, Edit, Edit2, Trash2, Eye, Sparkles } from 'lucide-react';
import { ExportButton } from '../components/ui';
import CaseTimeline from '../components/CaseTimeline';

interface Case {
  id: string;
  processNumber: string;
  court: string;
  subject: string;
  status: string;
  deadline?: string;
  deadlineResponsibleId?: string;
  deadlineResponsible?: {
    id: string;
    name: string;
    email: string;
  };
  value?: number;
  notes?: string;
  ultimoAndamento?: string;
  informarCliente?: string;
  linkProcesso?: string;
  client: {
    id: string;
    name: string;
    cpf?: string;
  };
  lastSyncedAt?: string;
  createdAt: string;
}

interface CaseMovement {
  id: string;
  movementCode: number;
  movementName: string;
  movementDate: string;
  description?: string;
}

interface CaseDetail extends Case {
  movements?: CaseMovement[];
  documents?: any[];
  parts?: CasePart[];
}

interface CasePart {
  id?: string;
  type: 'AUTOR' | 'REU' | 'REPRESENTANTE_LEGAL';
  name: string;
  cpfCnpj?: string;
  phone?: string;
  address?: string;
  email?: string;
  civilStatus?: string;
  profession?: string;
  rg?: string;
  birthDate?: string;
}

const Cases: React.FC = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'info' | 'timeline'>('info');
  const [showAndamentoModal, setShowAndamentoModal] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Autocomplete states
  const [clientSearchText, setClientSearchText] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const clientInputRef = useRef<HTMLInputElement>(null);

  // Parts management
  const [parts, setParts] = useState<CasePart[]>([]);
  const [showAddPartForm, setShowAddPartForm] = useState(false);
  const [partFormData, setPartFormData] = useState<CasePart>({
    type: 'AUTOR',
    name: '',
    cpfCnpj: '',
    phone: '',
    address: '',
    email: '',
    civilStatus: '',
    profession: '',
    rg: '',
    birthDate: '',
  });

  // Edit part modal states (for details modal)
  const [showEditPartModal, setShowEditPartModal] = useState(false);
  const [editingPart, setEditingPart] = useState<CasePart | null>(null);

  // Track which part index is being edited in the form
  const [editingPartIndex, setEditingPartIndex] = useState<number | null>(null);

  // Import CSV states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    clientId: '',
    processNumber: '',
    court: '',
    subject: '',
    value: '',
    notes: '',
    status: 'ACTIVE',
    deadline: '',
    deadlineResponsibleId: '',
    informarCliente: '',
    linkProcesso: '',
  });

  useEffect(() => {
    loadCases();
    loadClients();
    loadUsers();
  }, [search, statusFilter]);

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

  const loadCases = async () => {
    try {
      const response = await api.get('/cases', {
        params: { search, status: statusFilter, limit: 50 },
      });
      setCases(response.data.data);
    } catch (error) {
      toast.error('Erro ao carregar processos');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/cases/export/csv', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `processos_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/cases/import/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResults(response.data.results);
      setShowImportModal(true);
      loadCases();

      if (response.data.results.success > 0) {
        toast.success(`${response.data.results.success} processo(s) importado(s) com sucesso!`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao importar CSV');
    }

    // Limpar o input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const loadUsers = async () => {
    try {
      const response = await api.get('/users', { params: { limit: 1000 } });
      setUsers(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar usuários');
    }
  };

  const resetForm = () => {
    setFormData({
      clientId: '',
      processNumber: '',
      court: '',
      subject: '',
      value: '',
      notes: '',
      status: 'ACTIVE',
      deadline: '',
      deadlineResponsibleId: '',
      informarCliente: '',
      linkProcesso: '',
    });
    setClientSearchText('');
    setParts([]);
    setPartFormData({
      type: 'AUTOR',
      name: '',
      cpfCnpj: '',
      phone: '',
      address: '',
      email: '',
      civilStatus: '',
      profession: '',
      rg: '',
    });
    setShowAddPartForm(false);
  };

  const handleClientSelect = (client: any) => {
    setFormData({ ...formData, clientId: client.id });
    setClientSearchText(client.name);
    setShowClientSuggestions(false);
  };

  const handleAddPart = () => {
    if (!partFormData.name || !partFormData.type) {
      toast.error('Nome e tipo são obrigatórios');
      return;
    }

    if (editingPartIndex !== null) {
      // Update existing part
      const updatedParts = [...parts];
      updatedParts[editingPartIndex] = { ...partFormData };
      setParts(updatedParts);
      toast.success('Parte atualizada!');
    } else {
      // Add new part
      setParts([...parts, { ...partFormData }]);
      toast.success('Parte adicionada!');
    }

    // Reset form
    setPartFormData({
      type: 'AUTOR',
      name: '',
      cpfCnpj: '',
      phone: '',
      address: '',
      email: '',
      civilStatus: '',
      profession: '',
      rg: '',
      birthDate: '',
    });
    setShowAddPartForm(false);
    setEditingPartIndex(null);
  };

  const handleRemovePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const handleEditPartInForm = (index: number) => {
    const partToEdit = parts[index];
    setPartFormData({ ...partToEdit });
    setEditingPartIndex(index);
    setShowAddPartForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        value: formData.value ? parseFloat(formData.value) : undefined,
      };

      let caseId: string;

      if (editMode && selectedCase) {
        await api.put(`/cases/${selectedCase.id}`, payload);
        caseId = selectedCase.id;
        toast.success('Processo atualizado com sucesso!');
      } else {
        const response = await api.post('/cases', payload);
        caseId = response.data.id;
        toast.success('Processo criado com sucesso!');
      }

      // Create or update parts if any were added
      if (parts.length > 0) {
        for (const part of parts) {
          try {
            if (part.id) {
              // Update existing part
              await api.put(`/cases/${caseId}/parts/${part.id}`, part);
            } else {
              // Create new part
              await api.post(`/cases/${caseId}/parts`, part);
            }
          } catch (error) {
            console.error('Erro ao salvar parte:', error);
          }
        }
      }

      setShowModal(false);
      setEditMode(false);
      setSelectedCase(null);
      resetForm();
      loadCases();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar processo');
    }
  };

  const handleSync = async (caseId: string) => {
    try {
      toast.loading('Sincronizando...', { id: 'sync' });
      await api.post(`/cases/${caseId}/sync`);
      toast.success('Processo sincronizado com sucesso!', { id: 'sync' });
      loadCases();
      // Se o modal de detalhes está aberto, recarrega os detalhes
      if (showDetailsModal && selectedCase?.id === caseId) {
        loadCaseDetails(caseId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao sincronizar', { id: 'sync' });
    }
  };

  const handleGenerateSummary = async (caseId: string) => {
    setGeneratingSummary(true);
    try {
      toast.loading('Gerando resumo com IA...', { id: 'ai-summary' });
      const response = await api.post(`/cases/${caseId}/generate-summary`);
      toast.success('Resumo gerado com sucesso!', { id: 'ai-summary' });

      // Atualiza o caso selecionado com o novo resumo
      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase({
          ...selectedCase,
          informarCliente: response.data.case.informarCliente,
        });
      }

      // Recarrega a lista de casos
      loadCases();

      // Se o modal de detalhes está aberto, recarrega os detalhes
      if (showDetailsModal && selectedCase?.id === caseId) {
        loadCaseDetails(caseId);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao gerar resumo', { id: 'ai-summary' });
    } finally {
      setGeneratingSummary(false);
    }
  };

  const loadCaseDetails = async (caseId: string) => {
    try {
      setLoadingDetails(true);
      const response = await api.get(`/cases/${caseId}`);
      setSelectedCase(response.data);
      setShowDetailsModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao carregar detalhes do processo');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCaseClick = (caseId: string) => {
    loadCaseDetails(caseId);
  };

  const handleEditPart = (part: CasePart) => {
    setEditingPart({ ...part });
    setShowEditPartModal(true);
  };

  const handleSaveEditedPart = async () => {
    if (!editingPart || !selectedCase) return;

    try {
      toast.loading('Salvando alterações...', { id: 'save-part' });

      await api.put(`/cases/${selectedCase.id}/parts/${editingPart.id}`, editingPart);

      // Reload case details
      await loadCaseDetails(selectedCase.id);

      toast.success('Parte atualizada com sucesso!', { id: 'save-part' });
      setShowEditPartModal(false);
      setEditingPart(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar parte', { id: 'save-part' });
    }
  };

  const handleEdit = async (caseItem: Case) => {
    try {
      // Load complete case details including parts
      const response = await api.get(`/cases/${caseItem.id}`);
      const caseDetail: CaseDetail = response.data;

      setSelectedCase(caseDetail);
      setFormData({
        clientId: caseDetail.client.id,
        processNumber: caseDetail.processNumber,
        court: caseDetail.court || '',
        subject: caseDetail.subject || '',
        value: caseDetail.value ? caseDetail.value.toString() : '',
        notes: caseDetail.notes || '',
        status: caseDetail.status || 'ACTIVE',
        deadline: caseDetail.deadline ? caseDetail.deadline.split('T')[0] : '',
        deadlineResponsibleId: caseDetail.deadlineResponsibleId || '',
        informarCliente: caseDetail.informarCliente || '',
        linkProcesso: caseDetail.linkProcesso || '',
      });
      setClientSearchText(caseDetail.client.name);

      // Load parts if editing
      if (caseDetail.parts && caseDetail.parts.length > 0) {
        setParts(caseDetail.parts);
      } else {
        setParts([]);
      }

      setEditMode(true);
      setShowModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao carregar processo');
    }
  };

  const handleDelete = async (caseItem: Case) => {
    if (!window.confirm(`Tem certeza que deseja excluir o processo "${caseItem.processNumber}"?`)) {
      return;
    }

    try {
      await api.delete(`/cases/${caseItem.id}`);
      toast.success('Processo excluído com sucesso!');
      loadCases();
      if (showDetailsModal && selectedCase?.id === caseItem.id) {
        setShowDetailsModal(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir processo');
    }
  };

  const handleViewAndamento = async (caseItem: Case) => {
    try {
      const response = await api.get(`/cases/${caseItem.id}`);
      setSelectedCase(response.data);
      setShowAndamentoModal(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao carregar informações');
    }
  };

  const handleNewCase = () => {
    resetForm();
    setEditMode(false);
    setSelectedCase(null);
    setShowModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const generateTribunalLink = (court: string, processNumber: string): { url: string; tribunalName: string } | null => {
    if (!processNumber) return null;

    // Extrair código do tribunal do número CNJ (formato: NNNNNNN-DD.AAAA.J.TR.OOOO)
    // Remover pontos, traços e espaços
    const cleanNumber = processNumber.replace(/[.\-\s]/g, '');

    // O código do tribunal está nas posições 13-14 (considerando NNNNNNNDDAAAAJTROOOO)
    // Exemplo: 01127725820248190001 -> posições 13-14 = "19" (TJRJ)
    let tribunalCode = '';
    if (cleanNumber.length >= 15) {
      tribunalCode = cleanNumber.substring(13, 15);
    }

    // Formatar número do processo com pontos e traços (NNNNNNN-DD.AAAA.J.TR.OOOO)
    let formattedNumber = processNumber;
    if (cleanNumber.length === 20) {
      formattedNumber = `${cleanNumber.substring(0, 7)}-${cleanNumber.substring(7, 9)}.${cleanNumber.substring(9, 13)}.${cleanNumber.substring(13, 14)}.${cleanNumber.substring(14, 16)}.${cleanNumber.substring(16, 20)}`;
    }

    // Mapeamento de códigos CNJ para tribunais e URLs
    const tribunalMap: { [key: string]: { name: string; url: string; directUrl?: (num: string) => string } } = {
      '19': {
        name: 'TJRJ',
        url: 'https://tjrj.pje.jus.br/pje/ConsultaPublica/listView.seam',
      },
      '26': {
        name: 'TJSP',
        url: 'https://esaj.tjsp.jus.br/cpopg/open.do',
        directUrl: (num) => `https://esaj.tjsp.jus.br/cpopg/show.do?processo.numero=${encodeURIComponent(num)}`,
      },
      '13': {
        name: 'TJMG',
        url: 'https://pje-consulta-publica.tjmg.jus.br/',
      },
      '24': {
        name: 'TJSC',
        url: 'https://esaj.tjsc.jus.br/esaj/portal.do?servico=190100',
      },
      '15': {
        name: 'TJPB',
        url: 'https://pje.tjpb.jus.br/pje/ConsultaPublica/listView.seam',
      },
      '06': {
        name: 'TJCE',
        url: 'https://esaj.tjce.jus.br/cpopg/open.do',
      },
    };

    const tribunal = tribunalMap[tribunalCode];
    if (!tribunal) {
      // Se não encontrar pelo código CNJ, tentar pelo nome do tribunal
      const courtUpper = (court || '').toUpperCase();
      for (const [, info] of Object.entries(tribunalMap)) {
        if (courtUpper.includes(info.name)) {
          return {
            url: info.directUrl ? info.directUrl(formattedNumber) : info.url,
            tribunalName: info.name,
          };
        }
      }
      return null;
    }

    // Usar URL direta se disponível, senão usar URL de consulta
    return {
      url: tribunal.directUrl ? tribunal.directUrl(formattedNumber) : tribunal.url,
      tribunalName: tribunal.name,
    };
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-3 sm:mb-4">Processos</h1>

          {/* Action Buttons - Mobile: Grid 3 columns, Desktop: Flex row */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <ExportButton
              type="import"
              onClick={handleImportClick}
            />
            <ExportButton
              type="csv"
              onClick={handleExportCSV}
            />
            <button
              onClick={handleNewCase}
              className="inline-flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg bg-success-100 text-success-700 border border-success-200 hover:bg-success-200 font-medium text-sm transition-all duration-200 min-h-[44px]"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Novo Processo</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-4">
            <div className="flex items-center gap-2 flex-1 w-full">
              <Search size={20} className="text-neutral-400" />
              <input
                type="text"
                placeholder="Buscar processos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
            >
              <option value="">Todos os Status</option>
              <option value="PENDENTE">🟡 Pendente</option>
              <option value="ACTIVE">🟢 Ativo</option>
              <option value="ARCHIVED">⚫ Arquivado</option>
              <option value="FINISHED">🔵 Finalizado</option>
            </select>
          </div>

          {loading ? (
            <p className="text-center py-4">Carregando...</p>
          ) : cases.length === 0 ? (
            <p className="text-center py-4 text-neutral-600">Nenhum processo encontrado</p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                {cases.map((caseItem) => {
                  const statusColors: { [key: string]: 'green' | 'yellow' | 'gray' | 'blue' } = {
                    PENDENTE: 'yellow',
                    ACTIVE: 'green',
                    ARCHIVED: 'gray',
                    FINISHED: 'blue',
                  };
                  const statusLabels: { [key: string]: string } = {
                    PENDENTE: 'Pendente',
                    ACTIVE: 'Ativo',
                    ARCHIVED: 'Arquivado',
                    FINISHED: 'Finalizado',
                  };
                  return (
                    <div key={caseItem.id} className="mobile-card">
                      <div className="mobile-card-header">
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => handleCaseClick(caseItem.id)}
                            className="mobile-card-title text-primary-600 hover:underline text-left"
                          >
                            {caseItem.processNumber}
                          </button>
                          <p className="mobile-card-subtitle truncate">{caseItem.client.name}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${
                          statusColors[caseItem.status] === 'green' ? 'bg-success-100 text-success-800' :
                          statusColors[caseItem.status] === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                          statusColors[caseItem.status] === 'blue' ? 'bg-info-100 text-info-700' :
                          'bg-neutral-100 text-neutral-800'
                        }`}>
                          {statusLabels[caseItem.status] || caseItem.status}
                        </span>
                      </div>
                      <div className="space-y-0">
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">Assunto</span>
                          <span className="mobile-card-value truncate max-w-[60%]">{caseItem.subject || '-'}</span>
                        </div>
                        <div className="mobile-card-row">
                          <span className="mobile-card-label">Prazo</span>
                          <span className="mobile-card-value">
                            {caseItem.deadline ? new Date(caseItem.deadline).toLocaleDateString('pt-BR') : '-'}
                          </span>
                        </div>
                      </div>
                      <div className="mobile-card-actions">
                        <button
                          onClick={() => handleSync(caseItem.id)}
                          className="flex-1 action-btn bg-purple-100 text-purple-700 rounded-lg"
                          title="Sincronizar"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          onClick={() => handleCaseClick(caseItem.id)}
                          className="flex-1 action-btn action-btn-info bg-info-50 rounded-lg"
                          title="Ver"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleEdit(caseItem)}
                          className="flex-1 action-btn action-btn-primary bg-primary-50 rounded-lg"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(caseItem)}
                          className="flex-1 action-btn action-btn-danger bg-error-50 rounded-lg"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        Número
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        Assunto
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        Prazo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {cases.map((caseItem) => {
                      const statusColors = {
                        PENDENTE: 'bg-yellow-100 text-yellow-800',
                        ACTIVE: 'bg-success-100 text-success-800',
                        ARCHIVED: 'bg-neutral-100 text-neutral-800',
                        FINISHED: 'bg-info-100 text-info-700',
                      };
                      const statusLabels = {
                        PENDENTE: 'Pendente',
                        ACTIVE: 'Ativo',
                        ARCHIVED: 'Arquivado',
                        FINISHED: 'Finalizado',
                      };
                      return (
                        <tr key={caseItem.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3 text-sm">
                            <button
                              onClick={() => handleCaseClick(caseItem.id)}
                              className="text-primary-600 hover:text-primary-800 hover:underline font-medium"
                              title="Ver detalhes do processo"
                            >
                              {caseItem.processNumber}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600">
                            {caseItem.client.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600">{caseItem.subject}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[caseItem.status as keyof typeof statusColors] || 'bg-neutral-100 text-neutral-800'}`}>
                              {statusLabels[caseItem.status as keyof typeof statusLabels] || caseItem.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600">
                            {caseItem.deadline ? new Date(caseItem.deadline).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleSync(caseItem.id)}
                                className="action-btn text-purple-700 hover:text-purple-800 hover:bg-purple-100"
                                title="Sincronizar com DataJud"
                              >
                                <RefreshCw size={18} />
                              </button>
                              <button
                                onClick={() => handleViewAndamento(caseItem)}
                                className="action-btn action-btn-info"
                                title="Visualizar Andamento para Cliente"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                onClick={() => handleEdit(caseItem)}
                                className="action-btn action-btn-primary"
                                title="Editar"
                              >
                                <Edit size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(caseItem)}
                                className="action-btn action-btn-danger"
                                title="Excluir"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Criar/Editar Processo */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-2xl">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                {editMode ? 'Editar Processo' : 'Novo Processo'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedCase(null);
                  resetForm();
                }}
                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
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

              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Número do Processo <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 00008323520184013202"
                  value={formData.processNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, processNumber: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                  disabled={editMode}
                />
                <p className="text-xs text-neutral-500 mt-1">
                  {editMode ? 'O número do processo não pode ser alterado' : 'O sistema irá buscar automaticamente os dados no DataJud'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Tribunal <span className="text-error-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.court}
                    onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Assunto <span className="text-error-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="ACTIVE">Ativo</option>
                    <option value="ARCHIVED">Arquivado</option>
                    <option value="FINISHED">Finalizado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Prazo</label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Responsável pelo Prazo</label>
                  <select
                    value={formData.deadlineResponsibleId}
                    onChange={(e) => setFormData({ ...formData, deadlineResponsibleId: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <option value="">Nenhum</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Observações</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={4}
                  placeholder="Observações adicionais sobre o processo..."
                  className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Link do Processo</label>
                <input
                  type="url"
                  value={formData.linkProcesso}
                  onChange={(e) => setFormData({ ...formData, linkProcesso: e.target.value })}
                  placeholder="https://www.tjrj.jus.br/..."
                  className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                />
                <p className="mt-1 text-xs text-neutral-500">URL do processo no site do tribunal</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Informar Andamento ao Cliente</label>
                <textarea
                  value={formData.informarCliente}
                  onChange={(e) => setFormData({ ...formData, informarCliente: e.target.value })}
                  rows={3}
                  placeholder="Digite aqui o texto explicativo do andamento que será informado ao cliente..."
                  className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                />
                <p className="mt-1 text-xs text-neutral-500">Este texto será exibido ao visualizar o andamento para o cliente</p>
              </div>

              {selectedCase && selectedCase.ultimoAndamento && (
                <div className="bg-success-50 border border-primary-200 rounded-md p-3">
                  <label className="block text-sm font-medium text-primary-800">Último Andamento (via API)</label>
                  <p className="mt-1 text-sm text-primary-700">{selectedCase.ultimoAndamento}</p>
                  <p className="mt-1 text-xs text-primary-600">Atualizado automaticamente ao sincronizar com DataJud</p>
                </div>
              )}

              {/* Adicionar Partes */}
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-md font-semibold text-neutral-900">Partes do Processo</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddPartForm(!showAddPartForm);
                      setEditingPartIndex(null);
                    }}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    <Plus size={16} />
                    <span>Adicionar Parte</span>
                  </button>
                </div>

                {/* Lista de Partes Adicionadas */}
                {parts.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {parts.map((part, index) => (
                      <div key={index} className="flex items-start justify-between p-3 bg-neutral-50 rounded-md">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              part.type === 'AUTOR' ? 'bg-success-100 text-primary-700' :
                              part.type === 'REU' ? 'bg-error-100 text-error-700' :
                              'bg-success-100 text-primary-700'
                            }`}>
                              {part.type === 'AUTOR' ? 'Autor' : part.type === 'REU' ? 'Réu' : 'Representante Legal'}
                            </span>
                            <span className="font-medium text-sm">{part.name}</span>
                          </div>
                          <div className="text-xs text-neutral-600 mt-1">
                            {part.cpfCnpj && <span>CPF/CNPJ: {part.cpfCnpj}</span>}
                            {part.phone && <span className="ml-2">Tel: {part.phone}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditPartInForm(index)}
                            className="text-info-600 hover:text-info-800"
                            title="Editar parte"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePart(index)}
                            className="text-error-600 hover:text-error-800"
                            title="Remover parte"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulário Adicionar Parte */}
                {showAddPartForm && (
                  <div className="border border-neutral-200 rounded-md p-4 bg-neutral-50 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo *</label>
                      <select
                        value={partFormData.type}
                        onChange={(e) => setPartFormData({ ...partFormData, type: e.target.value as any })}
                        className="block w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="AUTOR">Autor</option>
                        <option value="REU">Réu</option>
                        <option value="REPRESENTANTE_LEGAL">Representante Legal</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Nome *</label>
                        <input
                          type="text"
                          value={partFormData.name}
                          onChange={(e) => setPartFormData({ ...partFormData, name: e.target.value })}
                          className="block w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">CPF/CNPJ</label>
                        <input
                          type="text"
                          value={partFormData.cpfCnpj}
                          onChange={(e) => setPartFormData({ ...partFormData, cpfCnpj: e.target.value })}
                          className="block w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Telefone</label>
                        <input
                          type="text"
                          value={partFormData.phone}
                          onChange={(e) => setPartFormData({ ...partFormData, phone: e.target.value })}
                          className="block w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Endereço</label>
                        <input
                          type="text"
                          value={partFormData.address}
                          onChange={(e) => setPartFormData({ ...partFormData, address: e.target.value })}
                          className="block w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>
                    </div>

                    {/* Campos específicos para AUTOR */}
                    {partFormData.type === 'AUTOR' && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                            <input
                              type="email"
                              value={partFormData.email}
                              onChange={(e) => setPartFormData({ ...partFormData, email: e.target.value })}
                              className="block w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Estado Civil</label>
                            <input
                              type="text"
                              value={partFormData.civilStatus}
                              onChange={(e) => setPartFormData({ ...partFormData, civilStatus: e.target.value })}
                              className="block w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Profissão</label>
                            <input
                              type="text"
                              value={partFormData.profession}
                              onChange={(e) => setPartFormData({ ...partFormData, profession: e.target.value })}
                              className="block w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">RG</label>
                            <input
                              type="text"
                              value={partFormData.rg}
                              onChange={(e) => setPartFormData({ ...partFormData, rg: e.target.value })}
                              className="block w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddPartForm(false);
                          setEditingPartIndex(null);
                          setPartFormData({
                            type: 'AUTOR',
                            name: '',
                            cpfCnpj: '',
                            phone: '',
                            address: '',
                            email: '',
                            civilStatus: '',
                            profession: '',
                            rg: '',
                            birthDate: '',
                          });
                        }}
                        className="px-3 py-1.5 text-sm border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 min-h-[44px]"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddPart}
                        className="px-3 py-1.5 text-sm bg-primary-100 text-primary-700 border border-primary-200 rounded-md hover:bg-primary-200 min-h-[44px]"
                      >
                        {editingPartIndex !== null ? 'Atualizar' : 'Adicionar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedCase(null);
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
        </div>
      )}

      {/* Modal Detalhes do Processo */}
      {showDetailsModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {loadingDetails ? (
              <div className="p-8 text-center">
                <p className="text-neutral-600">Carregando detalhes...</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center min-h-[44px]">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900">
                      {selectedCase.processNumber}
                    </h2>
                    <p className="text-sm text-neutral-500 mt-1">
                      {selectedCase.court} • Criado em {formatDate(selectedCase.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={24} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-neutral-200">
                  <div className="flex px-6">
                    <button
                      onClick={() => setDetailsTab('info')}
                      className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                        detailsTab === 'info'
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      Informações
                    </button>
                    <button
                      onClick={() => setDetailsTab('timeline')}
                      className={`py-3 px-4 border-b-2 font-medium text-sm transition-colors ${
                        detailsTab === 'timeline'
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      Linha do Tempo
                    </button>
                  </div>
                </div>

                {/* Tab: Informações */}
                {detailsTab === 'info' && (
                <>
                <div className="p-6 space-y-6">
                  {/* Informações Principais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center text-neutral-500 text-sm mb-1">
                          <User size={16} className="mr-2" />
                          <span>Cliente</span>
                        </div>
                        <p className="text-neutral-900 font-medium">{selectedCase.client.name}</p>
                        {selectedCase.client.cpf && (
                          <p className="text-sm text-neutral-500">CPF: {selectedCase.client.cpf}</p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center text-neutral-500 text-sm mb-1">
                          <FileText size={16} className="mr-2" />
                          <span>Assunto</span>
                        </div>
                        <p className="text-neutral-900">{selectedCase.subject}</p>
                      </div>

                      {selectedCase.value && (
                        <div>
                          <div className="flex items-center text-neutral-500 text-sm mb-1">
                            <span className="mr-2">💰</span>
                            <span>Valor da Causa</span>
                          </div>
                          <p className="text-neutral-900 font-semibold">
                            {formatCurrency(selectedCase.value)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center text-neutral-500 text-sm mb-1">
                          <span className="mr-2">⚖️</span>
                          <span>Status</span>
                        </div>
                        {(() => {
                          const statusColors = {
                            PENDENTE: 'bg-yellow-100 text-yellow-800',
                            ACTIVE: 'bg-success-100 text-success-800',
                            ARCHIVED: 'bg-neutral-100 text-neutral-800',
                            FINISHED: 'bg-info-100 text-info-700',
                          };

                          const statusLabels = {
                            PENDENTE: 'Pendente',
                            ACTIVE: 'Ativo',
                            ARCHIVED: 'Arquivado',
                            FINISHED: 'Finalizado',
                          };

                          return (
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedCase.status as keyof typeof statusColors] || 'bg-neutral-100 text-neutral-800'}`}>
                              {statusLabels[selectedCase.status as keyof typeof statusLabels] || selectedCase.status}
                            </span>
                          );
                        })()}
                      </div>

                      {selectedCase.deadline && (
                        <div>
                          <div className="flex items-center text-neutral-500 text-sm mb-1">
                            <Calendar size={16} className="mr-2" />
                            <span>Prazo</span>
                          </div>
                          <p className="text-neutral-900 font-medium">{new Date(selectedCase.deadline).toLocaleDateString('pt-BR')}</p>
                        </div>
                      )}

                      {selectedCase.lastSyncedAt && (
                        <div>
                          <div className="flex items-center text-neutral-500 text-sm mb-1">
                            <Clock size={16} className="mr-2" />
                            <span>Última Sincronização</span>
                          </div>
                          <p className="text-neutral-900">{formatDate(selectedCase.lastSyncedAt)}</p>
                        </div>
                      )}

                      <div className="flex gap-3 flex-wrap">
                        <button
                          onClick={() => handleSync(selectedCase.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-200 transition-colors min-h-[44px]"
                        >
                          <RefreshCw size={16} />
                          <span>Sincronizar Agora</span>
                        </button>

                        <button
                          onClick={() => handleGenerateSummary(selectedCase.id)}
                          disabled={generatingSummary}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-200 disabled:bg-neutral-100 disabled:text-neutral-400 disabled:border-neutral-200 disabled:cursor-not-allowed transition-colors min-h-[44px]"
                          title="Gerar resumo com Inteligência Artificial"
                        >
                          {generatingSummary ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                              <span>Gerando...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} />
                              <span>Gerar Resumo IA</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {selectedCase.notes && (
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500 mb-2">Observações</h3>
                      <p className="text-neutral-900 bg-neutral-50 p-3 rounded-md">{selectedCase.notes}</p>
                    </div>
                  )}

                  {/* Link do Processo no Tribunal */}
                  {(() => {
                    // Prioridade 1: Usar linkProcesso se existir (mais confiável)
                    if (selectedCase.linkProcesso) {
                      return (
                        <div className="bg-success-50 border-2 border-success-300 rounded-lg p-4">
                          <h3 className="text-sm font-semibold text-primary-800 mb-2 flex items-center">
                            <span className="mr-2">🔗</span>
                            Consultar Processo no Tribunal
                          </h3>
                          <div className="bg-white border border-success-300 rounded p-3 mb-3">
                            <p className="text-sm text-neutral-700 mb-1">
                              <strong>Número do Processo:</strong>
                            </p>
                            <p className="text-lg font-mono font-semibold text-primary-800 select-all">
                              {selectedCase.processNumber}
                            </p>
                            <p className="text-xs text-neutral-500 mt-1">
                              Clique no número acima para copiar
                            </p>
                          </div>
                          <a
                            href={selectedCase.linkProcesso}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-success-100 text-success-700 border border-success-200 rounded-md hover:bg-success-200 transition-colors font-medium"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                              <polyline points="15 3 21 3 21 9"></polyline>
                              <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            Abrir Processo no {selectedCase.court}
                          </a>
                          <p className="text-xs text-success-700 mt-2">
                            ✅ Link direto para o processo no site do tribunal
                          </p>
                        </div>
                      );
                    }

                    // Prioridade 2: Tentar gerar automaticamente pelo código CNJ
                    const tribunalInfo = generateTribunalLink(selectedCase.court, selectedCase.processNumber);
                    return tribunalInfo ? (
                      <div className="bg-info-50 border-2 border-info-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-info-700 mb-2 flex items-center">
                          <span className="mr-2">🔗</span>
                          Consultar no Site do Tribunal ({tribunalInfo.tribunalName})
                        </h3>
                        <div className="bg-white border border-info-300 rounded p-3 mb-3">
                          <p className="text-sm text-neutral-700 mb-1">
                            <strong>Número do Processo:</strong>
                          </p>
                          <p className="text-lg font-mono font-semibold text-info-700 select-all">
                            {selectedCase.processNumber}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1">
                            Clique no número acima para copiar
                          </p>
                        </div>
                        <a
                          href={tribunalInfo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-info-100 text-info-700 border border-info-200 rounded-md hover:bg-info-200 transition-colors font-medium"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                          Consultar Processo no {tribunalInfo.tribunalName}
                        </a>
                        <p className="text-xs text-info-700 mt-2">
                          {tribunalInfo.url.includes('show.do')
                            ? '⚠️ Link gerado automaticamente. Para melhor confiabilidade, adicione o link oficial no campo "Link do Processo" ao editar.'
                            : 'Abre a página de consulta processual oficial. Cole o número do processo acima para buscar.'}
                        </p>
                      </div>
                    ) : null;
                  })()}

                  {/* Informar Andamento ao Cliente */}
                  {selectedCase.informarCliente && (
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500 mb-2">Informação para o Cliente</h3>
                      <div className="bg-success-50 border border-primary-200 rounded-md p-4">
                        <p className="text-primary-800 whitespace-pre-wrap">{selectedCase.informarCliente}</p>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1">Texto explicativo do andamento para informar ao cliente</p>
                    </div>
                  )}

                  {/* Partes Envolvidas */}
                  {selectedCase.parts && selectedCase.parts.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                        Partes Envolvidas
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-neutral-200 border border-neutral-200 rounded-lg">
                          <thead className="bg-neutral-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Tipo
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Nome
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                CPF/CNPJ
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                RG
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Nascimento
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                                Ações
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-neutral-200">
                            {selectedCase.parts.map((part) => {
                              const typeLabels = {
                                AUTOR: 'Autor',
                                REU: 'Réu',
                                REPRESENTANTE_LEGAL: 'Rep. Legal',
                              };

                              const typeBadgeColors = {
                                AUTOR: 'bg-success-100 text-success-800',
                                REU: 'bg-error-100 text-error-800',
                                REPRESENTANTE_LEGAL: 'bg-success-100 text-success-800',
                              };

                              return (
                                <tr key={part.id} className="hover:bg-neutral-50">
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${typeBadgeColors[part.type]}`}>
                                      {typeLabels[part.type]}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-neutral-900">
                                    {part.name}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-neutral-600">
                                    {part.cpfCnpj || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-neutral-600">
                                    {part.rg || '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-neutral-600">
                                    {part.birthDate ? new Date(part.birthDate).toLocaleDateString('pt-BR') : '-'}
                                  </td>
                                  <td className="px-4 py-3 text-sm">
                                    <button
                                      onClick={() => handleEditPart(part)}
                                      className="text-primary-600 hover:text-primary-800 font-medium"
                                    >
                                      Editar
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Timeline de Movimentações */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-neutral-900">
                        Andamento do Processo
                      </h3>
                      {selectedCase.movements && selectedCase.movements.length > 0 && (
                        <span className="text-sm text-neutral-500">
                          {selectedCase.movements.length} movimentação(ões)
                        </span>
                      )}
                    </div>

                    {!selectedCase.movements || selectedCase.movements.length === 0 ? (
                      <div className="text-center py-8 bg-neutral-50 rounded-lg">
                        <FileText size={48} className="mx-auto text-neutral-300 mb-3" />
                        <p className="text-neutral-600">Nenhuma movimentação registrada</p>
                        <p className="text-sm text-neutral-500 mt-1">
                          Clique em "Sincronizar Agora" para buscar atualizações
                        </p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Linha vertical da timeline */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neutral-200"></div>

                        {/* Movimentações */}
                        <div className="space-y-6">
                          {selectedCase.movements.map((movement, index) => {
                            // Parsear descrição para extrair complementos
                            const complementos = movement.description
                              ? movement.description.split('; ').filter(c => c.trim())
                              : [];

                            return (
                              <div key={movement.id} className="relative pl-12">
                                {/* Ponto na timeline */}
                                <div className="absolute left-2 top-1 w-4 h-4 bg-primary-600 rounded-full border-4 border-white"></div>

                                {/* Conteúdo da movimentação */}
                                <div className="bg-neutral-50 rounded-lg p-4 hover:bg-neutral-100 transition-colors">
                                  <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-semibold text-neutral-900 text-base">
                                      Tipo do Movimento: {movement.movementName}
                                    </h4>
                                    {index === 0 && (
                                      <span className="inline-block text-xs bg-success-100 text-primary-700 px-2 py-1 rounded-full whitespace-nowrap ml-2">
                                        Mais recente
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center text-sm text-neutral-600 mb-3">
                                    <Calendar size={14} className="mr-1" />
                                    <span className="font-medium">Data:</span>
                                    <span className="ml-1">{formatDate(movement.movementDate)}</span>
                                  </div>

                                  {/* Complementos tabelados */}
                                  {complementos.length > 0 && (
                                    <div className="space-y-1 mt-2">
                                      {complementos.map((comp, idx) => {
                                        const [campo, valor] = comp.split(':').map(s => s.trim());
                                        if (!campo || !valor) return null;

                                        return (
                                          <div key={idx} className="text-sm">
                                            <span className="font-medium text-neutral-700">{campo}:</span>
                                            <span className="ml-1 text-neutral-600">{valor}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-neutral-50 border-t border-neutral-200 px-6 py-4 flex justify-between min-h-[44px]">
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        handleEdit(selectedCase as Case);
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-info-100 text-info-700 border border-info-200 hover:bg-info-200 font-medium rounded-lg transition-all duration-200"
                    >
                      <Edit size={20} />
                      <span>Editar Processo</span>
                    </button>
                    <button
                      onClick={() => handleDelete(selectedCase as Case)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 font-medium rounded-lg transition-all duration-200"
                    >
                      <Trash2 size={20} />
                      <span>Excluir Processo</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 text-neutral-700 bg-white hover:bg-neutral-50 font-medium rounded-lg transition-all duration-200"
                  >
                    Fechar
                  </button>
                </div>
                </>
                )}

                {/* Tab: Linha do Tempo */}
                {detailsTab === 'timeline' && (
                  <CaseTimeline caseId={selectedCase.id} />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição de Parte */}
      {showEditPartModal && editingPart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center min-h-[44px]">
              <h2 className="text-2xl font-bold text-neutral-900">Editar Parte</h2>
              <button
                onClick={() => {
                  setShowEditPartModal(false);
                  setEditingPart(null);
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Tipo
                </label>
                <select
                  value={editingPart.type}
                  onChange={(e) => setEditingPart({ ...editingPart, type: e.target.value as 'AUTOR' | 'REU' | 'REPRESENTANTE_LEGAL' })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                >
                  <option value="AUTOR">Autor</option>
                  <option value="REU">Réu</option>
                  <option value="REPRESENTANTE_LEGAL">Representante Legal</option>
                </select>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  value={editingPart.name}
                  onChange={(e) => setEditingPart({ ...editingPart, name: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  required
                />
              </div>

              {/* CPF/CNPJ */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  CPF/CNPJ
                </label>
                <input
                  type="text"
                  value={editingPart.cpfCnpj || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, cpfCnpj: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                />
              </div>

              {/* RG */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  RG
                </label>
                <input
                  type="text"
                  value={editingPart.rg || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, rg: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                />
              </div>

              {/* Data de Nascimento */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={editingPart.birthDate ? editingPart.birthDate.split('T')[0] : ''}
                  onChange={(e) => setEditingPart({ ...editingPart, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                />
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Telefone
                </label>
                <input
                  type="text"
                  value={editingPart.phone || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                />
              </div>

              {/* Email (apenas para AUTOR) */}
              {editingPart.type === 'AUTOR' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={editingPart.email || ''}
                      onChange={(e) => setEditingPart({ ...editingPart, email: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Estado Civil
                    </label>
                    <input
                      type="text"
                      value={editingPart.civilStatus || ''}
                      onChange={(e) => setEditingPart({ ...editingPart, civilStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      Profissão
                    </label>
                    <input
                      type="text"
                      value={editingPart.profession || ''}
                      onChange={(e) => setEditingPart({ ...editingPart, profession: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>
                </>
              )}

              {/* Endereço */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Endereço
                </label>
                <textarea
                  value={editingPart.address || ''}
                  onChange={(e) => setEditingPart({ ...editingPart, address: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  rows={2}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-neutral-50 border-t border-neutral-200 px-6 py-4 flex justify-end gap-3 min-h-[44px]">
              <button
                onClick={() => {
                  setShowEditPartModal(false);
                  setEditingPart(null);
                }}
                className="px-6 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditedPart}
                className="px-6 py-2 bg-primary-100 text-primary-700 border border-primary-200 rounded-md hover:bg-primary-200 transition-colors min-h-[44px]"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultados da Importação */}
      {showImportModal && importResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-neutral-900">Resultados da Importação</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-success-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary-600">{importResults.total}</p>
                  <p className="text-sm text-neutral-600">Total de linhas</p>
                </div>
                <div className="bg-success-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary-600">{importResults.success}</p>
                  <p className="text-sm text-neutral-600">Importados</p>
                </div>
                <div className="bg-error-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-error-600">{importResults.errors.length}</p>
                  <p className="text-sm text-neutral-600">Erros</p>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-2">Erros encontrados:</h3>
                  <div className="bg-error-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {importResults.errors.map((error: any, index: number) => (
                      <div key={index} className="mb-2 pb-2 border-b border-error-200 last:border-0">
                        <p className="text-sm font-medium text-error-800">
                          Linha {error.line}: {error.processNumber}
                        </p>
                        <p className="text-sm text-error-600">{error.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowImportModal(false)}
                className="w-full px-4 py-2 bg-neutral-100 text-neutral-700 border border-neutral-200 rounded-md hover:bg-neutral-200 min-h-[44px]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização do Andamento para Cliente */}
      {showAndamentoModal && selectedCase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4 pb-4 border-b">
                <h2 className="text-2xl font-bold text-neutral-900">Andamento para Cliente</h2>
                <button
                  onClick={() => setShowAndamentoModal(false)}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-neutral-700 mb-1">Processo</h3>
                  <p className="text-lg font-semibold text-neutral-900">{selectedCase.processNumber}</p>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-neutral-700 mb-1">Cliente</h3>
                  <p className="text-neutral-900">{selectedCase.client.name}</p>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                  <h3 className="text-sm font-medium text-neutral-700 mb-1">Assunto</h3>
                  <p className="text-neutral-900">{selectedCase.subject}</p>
                </div>

                {selectedCase.ultimoAndamento && (
                  <div className="bg-success-50 border border-primary-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-primary-800 mb-1">Último Andamento (DataJud)</h3>
                    <p className="text-primary-700">{selectedCase.ultimoAndamento}</p>
                  </div>
                )}

                {selectedCase.informarCliente ? (
                  <div className="bg-success-50 border border-primary-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-primary-800 mb-2">Informação para o Cliente</h3>
                    <div className="text-success-800 whitespace-pre-wrap">{selectedCase.informarCliente}</div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-yellow-800 text-center">
                      Nenhuma informação de andamento registrada para este cliente.
                    </p>
                  </div>
                )}

                {selectedCase.linkProcesso && (
                  <div className="bg-neutral-50 border border-neutral-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-neutral-700 mb-1">Link do Processo</h3>
                    <a
                      href={selectedCase.linkProcesso}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-800 hover:underline break-all"
                    >
                      {selectedCase.linkProcesso}
                    </a>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowAndamentoModal(false)}
                  className="px-4 py-2 bg-neutral-500 text-neutral-900 rounded hover:bg-neutral-600 transition-colors min-h-[44px]"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Cases;
