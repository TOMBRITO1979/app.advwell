import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, Eye, X, FileText, Loader2, UserPlus, UserX, Mail, Filter, Calendar, Upload, Download, FileSignature, Check, Clock, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { ExportButton, ActionsDropdown } from '../components/ui';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import { formatDate } from '../utils/dateFormatter';
import TagSelector from '../components/TagSelector';
import TagBadge from '../components/TagBadge';

interface Case {
  id: string;
  processNumber: string;
  subject?: string;
  court?: string;
  status: string;
  value?: number;
  deadline?: string;
  createdAt: string;
}

interface ClientTag {
  id: string;
  tag: {
    id: string;
    name: string;
    color: string;
  };
}

interface Client {
  id: string;
  personType?: 'FISICA' | 'JURIDICA';
  clientCondition?: 'DEMANDANTE' | 'DEMANDADO';
  name: string;
  cpf?: string;
  stateRegistration?: string;
  rg?: string;
  pis?: string;
  ctps?: string;
  ctpsSerie?: string;
  motherName?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  instagram?: string;
  facebook?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  profession?: string;
  nationality?: string;
  maritalStatus?: string;
  birthDate?: string;
  representativeName?: string;
  representativeCpf?: string;
  notes?: string;
  tag?: string;
  clientTags?: ClientTag[];
  createdAt: string;
  updatedAt: string;
  cases?: Case[];
}

interface ClientFormData {
  personType: 'FISICA' | 'JURIDICA';
  clientCondition: 'DEMANDANTE' | 'DEMANDADO' | '';
  name: string;
  cpf: string;
  stateRegistration: string;
  rg: string;
  pis: string;
  ctps: string;
  ctpsSerie: string;
  motherName: string;
  email: string;
  phone: string;
  phone2: string;
  instagram: string;
  facebook: string;
  customField1: string;
  customField2: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  profession: string;
  nationality: string;
  maritalStatus: string;
  birthDate: string;
  representativeName: string;
  representativeCpf: string;
  notes: string;
  tag: string;
  tagIds: string[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface SharedDocument {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  fileType: string;
  sharedAt: string;
  requiresSignature: boolean;
  allowDownload: boolean;
  status: 'PENDING' | 'VIEWED' | 'DOWNLOADED' | 'SIGNED' | 'UPLOADED';
  signedAt?: string;
  signatureUrl?: string;
  uploadedByClient: boolean;
  uploadedAt?: string;
  sharedBy: {
    id: string;
    name: string;
    email: string;
  };
}

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [creatingPortalAccess, setCreatingPortalAccess] = useState(false);
  const [portalUser, setPortalUser] = useState<{ id: string; email: string; tempPassword?: string } | null>(null);
  const [portalPassword, setPortalPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const totalPages = Math.ceil(total / limit);

  // Documentos compartilhados
  const [sharedDocuments, setSharedDocuments] = useState<SharedDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [requiresSignature, setRequiresSignature] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const [documentSource, setDocumentSource] = useState<'upload' | 'existing'>('upload');
  const [availableDocuments, setAvailableDocuments] = useState<{ id: string; name: string; fileType?: string }[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');
  const [loadingAvailableDocuments, setLoadingAvailableDocuments] = useState(false);

  const [formData, setFormData] = useState<ClientFormData>({
    personType: 'FISICA',
    clientCondition: '',
    name: '',
    cpf: '',
    stateRegistration: '',
    rg: '',
    pis: '',
    ctps: '',
    ctpsSerie: '',
    motherName: '',
    email: '',
    phone: '',
    phone2: '',
    instagram: '',
    facebook: '',
    customField1: '',
    customField2: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    profession: '',
    nationality: '',
    maritalStatus: '',
    birthDate: '',
    representativeName: '',
    representativeCpf: '',
    notes: '',
    tag: '',
    tagIds: [],
  });

  useEffect(() => {
    loadClients();
  }, [search, tagFilter, dateFrom, dateTo, page, limit]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, tagFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const response = await api.get('/tags');
      setTags(response.data);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  };

  const loadClients = async () => {
    try {
      const params: any = { search, page, limit };
      if (tagFilter) params.tagId = tagFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await api.get('/clients', { params });
      setClients(response.data.data);
      setTotal(response.data.total || 0);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const params: any = { search };
      if (tagFilter) params.tagId = tagFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      // Usa arraybuffer para poder verificar se é JSON ou CSV
      const response = await api.get('/clients/export/csv', {
        params,
        responseType: 'arraybuffer',
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
      link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const params: any = { search };
      if (tagFilter) params.tagId = tagFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const response = await api.get('/clients/export/pdf', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const clearFilters = () => {
    setTagFilter('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
  };

  const hasActiveFilters = tagFilter || dateFrom || dateTo;

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
      const response = await api.post('/clients/import/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Nova resposta assíncrona com jobId
      if (response.data.jobId) {
        toast.success(`Importação iniciada: ${response.data.totalRows} registros. Aguarde...`);

        // Poll para verificar status
        const pollStatus = async () => {
          try {
            const statusResponse = await api.get(`/clients/import/status/${response.data.jobId}`);
            const status = statusResponse.data;

            if (status.status === 'completed') {
              setImportResults({
                total: status.totalRows,
                success: status.successCount,
                errors: status.errors || []
              });
              setShowImportModal(true);
              loadClients();

              if (status.successCount > 0) {
                toast.success(`${status.successCount} cliente(s) importado(s) com sucesso!`);
              }
              if (status.errorCount > 0) {
                toast.error(`${status.errorCount} erro(s) na importação`);
              }
            } else if (status.status === 'failed') {
              toast.error('Falha na importação');
              setImportResults({
                total: status.totalRows,
                success: 0,
                errors: status.errors || []
              });
              setShowImportModal(true);
            } else {
              // Ainda processando, continua polling
              setTimeout(pollStatus, 2000);
            }
          } catch (err) {
            toast.error('Erro ao verificar status da importação');
          }
        };

        // Inicia polling após 2 segundos
        setTimeout(pollStatus, 2000);
      } else if (response.data.results) {
        // Resposta antiga síncrona (backward compatibility)
        setImportResults(response.data.results);
        setShowImportModal(true);
        loadClients();

        if (response.data.results.success > 0) {
          toast.success(`${response.data.results.success} cliente(s) importado(s) com sucesso!`);
        }
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Erro ao importar CSV');
    }

    // Limpar o input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setFormData({
      personType: 'FISICA',
      clientCondition: '',
      name: '',
      cpf: '',
      stateRegistration: '',
      rg: '',
      pis: '',
      ctps: '',
      ctpsSerie: '',
      motherName: '',
      email: '',
      phone: '',
      phone2: '',
      instagram: '',
      facebook: '',
      customField1: '',
      customField2: '',
      address: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      profession: '',
      nationality: '',
      maritalStatus: '',
      birthDate: '',
      representativeName: '',
      representativeCpf: '',
      notes: '',
      tag: '',
      tagIds: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode && selectedClient) {
        await api.put(`/clients/${selectedClient.id}`, formData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await api.post('/clients', formData);
        toast.success('Cliente criado com sucesso!');
      }
      setShowModal(false);
      setEditMode(false);
      setSelectedClient(null);
      resetForm();
      loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar cliente');
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      personType: client.personType || 'FISICA',
      clientCondition: client.clientCondition || '',
      name: client.name || '',
      cpf: client.cpf || '',
      stateRegistration: client.stateRegistration || '',
      rg: client.rg || '',
      pis: client.pis || '',
      ctps: client.ctps || '',
      ctpsSerie: client.ctpsSerie || '',
      motherName: client.motherName || '',
      email: client.email || '',
      phone: client.phone || '',
      phone2: client.phone2 || '',
      instagram: client.instagram || '',
      facebook: client.facebook || '',
      customField1: (client as any).customField1 || '',
      customField2: (client as any).customField2 || '',
      address: client.address || '',
      neighborhood: (client as any).neighborhood || '',
      city: client.city || '',
      state: client.state || '',
      zipCode: client.zipCode || '',
      profession: client.profession || '',
      nationality: client.nationality || '',
      maritalStatus: client.maritalStatus || '',
      birthDate: client.birthDate ? client.birthDate.split('T')[0] : '',
      representativeName: client.representativeName || '',
      representativeCpf: client.representativeCpf || '',
      notes: client.notes || '',
      tag: client.tag || '',
      tagIds: client.clientTags?.map((ct) => ct.tag.id) || [],
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente "${client.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/clients/${client.id}`);
      toast.success('Cliente excluído com sucesso!');
      loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir cliente');
    }
  };

  const handleViewDetails = async (client: Client) => {
    setShowDetailsModal(true);
    setLoadingDetails(true);
    setPortalUser(null);
    setSharedDocuments([]);
    try {
      // Buscar cliente por ID para obter os processos vinculados
      const response = await api.get(`/clients/${client.id}`);
      setSelectedClient(response.data);

      // Buscar informações do usuário do portal
      try {
        const portalResponse = await api.get(`/users/portal-users?clientId=${client.id}`);
        if (portalResponse.data && portalResponse.data.length > 0) {
          setPortalUser(portalResponse.data[0]);
        }
      } catch {
        // Cliente não tem acesso ao portal
      }

      // Buscar documentos compartilhados
      loadSharedDocuments(client.id);
    } catch (error) {
      console.error('Erro ao buscar detalhes do cliente:', error);
      // Fallback: usar dados da lista (sem processos)
      setSelectedClient(client);
      toast.error('Erro ao carregar processos do cliente');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreatePortalAccess = async () => {
    if (!selectedClient) return;
    if (!selectedClient.email) {
      toast.error('Cliente precisa ter um email cadastrado');
      return;
    }

    setCreatingPortalAccess(true);
    try {
      const response = await api.post('/users/portal-user', {
        clientId: selectedClient.id,
        name: selectedClient.name,
        email: selectedClient.email,
        password: portalPassword || undefined, // Envia senha manual ou deixa o backend gerar
      });
      setPortalUser({
        id: response.data.id,
        email: response.data.email,
        tempPassword: portalPassword || response.data.tempPassword // Mostra a senha que foi definida
      });
      setPortalPassword(''); // Limpa o campo
      if (portalPassword) {
        toast.success('Acesso criado com a senha definida!', { duration: 5000 });
      } else if (response.data.tempPassword) {
        toast.success('Acesso criado! Veja a senha temporária abaixo.', { duration: 5000 });
      } else {
        toast.success('Acesso ao portal criado!');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao criar acesso ao portal';
      toast.error(message);
    } finally {
      setCreatingPortalAccess(false);
    }
  };

  const handleRemovePortalAccess = async () => {
    if (!portalUser) return;
    if (!confirm('Tem certeza que deseja remover o acesso ao portal deste cliente?')) return;

    try {
      await api.delete(`/users/portal-user/${portalUser.id}`);
      setPortalUser(null);
      toast.success('Acesso ao portal removido');
    } catch (error) {
      toast.error('Erro ao remover acesso ao portal');
    }
  };

  // === Funções de Documentos Compartilhados ===
  const loadSharedDocuments = async (clientId: string) => {
    setLoadingDocuments(true);
    try {
      const response = await api.get(`/clients/${clientId}/shared-documents`);
      setSharedDocuments(response.data);
    } catch {
      setSharedDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const loadAvailableDocuments = async () => {
    setLoadingAvailableDocuments(true);
    try {
      const response = await api.get('/legal-documents');
      // A API retorna { data: [...] }, então acessamos response.data.data
      const documents = response.data.data || response.data || [];
      // Mapear para o formato esperado (title -> name)
      const mappedDocs = documents.map((doc: { id: string; title: string }) => ({
        id: doc.id,
        name: doc.title,
      }));
      setAvailableDocuments(mappedDocs);
    } catch {
      setAvailableDocuments([]);
    } finally {
      setLoadingAvailableDocuments(false);
    }
  };

  const handleShareDocument = async () => {
    if (!selectedClient) return;

    if (documentSource === 'upload') {
      if (!documentName.trim()) {
        toast.error('Nome do documento é obrigatório');
        return;
      }
      if (!docFileInputRef.current?.files?.[0]) {
        toast.error('Selecione um arquivo');
        return;
      }

      setUploadingDocument(true);
      try {
        const formData = new FormData();
        formData.append('file', docFileInputRef.current.files[0]);
        formData.append('name', documentName);
        formData.append('description', documentDescription);
        formData.append('requiresSignature', String(requiresSignature));

        await api.post(`/clients/${selectedClient.id}/shared-documents`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        toast.success('Documento compartilhado com sucesso!');
        resetDocumentModal();
        loadSharedDocuments(selectedClient.id);
      } catch {
        toast.error('Erro ao compartilhar documento');
      } finally {
        setUploadingDocument(false);
      }
    } else {
      // Compartilhar documento jurídico (gera PDF)
      if (!selectedDocumentId) {
        toast.error('Selecione um documento');
        return;
      }

      setUploadingDocument(true);
      try {
        await api.post(`/clients/${selectedClient.id}/shared-documents/from-legal`, {
          legalDocumentId: selectedDocumentId,
          name: documentName || undefined,
          description: documentDescription || undefined,
          requiresSignature,
        });

        toast.success('Documento compartilhado com sucesso!');
        resetDocumentModal();
        loadSharedDocuments(selectedClient.id);
      } catch {
        toast.error('Erro ao compartilhar documento');
      } finally {
        setUploadingDocument(false);
      }
    }
  };

  const resetDocumentModal = () => {
    setShowDocumentModal(false);
    setDocumentName('');
    setDocumentDescription('');
    setRequiresSignature(false);
    setDocumentSource('upload');
    setSelectedDocumentId('');
    if (docFileInputRef.current) docFileInputRef.current.value = '';
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      await api.delete(`/shared-documents/${docId}`);
      toast.success('Documento excluído');
      if (selectedClient) {
        loadSharedDocuments(selectedClient.id);
      }
    } catch {
      toast.error('Erro ao excluir documento');
    }
  };

  const handleDownloadFromClient = async (doc: SharedDocument) => {
    try {
      // Chama endpoint para marcar como baixado e obter URL assinada
      const response = await api.put(`/shared-documents/${doc.id}/download-from-client`);
      const { downloadUrl } = response.data;

      // Abre o documento em nova aba
      window.open(downloadUrl || doc.fileUrl, '_blank');

      // Recarrega a lista de documentos para atualizar o status
      if (selectedClient) {
        loadSharedDocuments(selectedClient.id);
      }

      // Disparar evento para atualizar badge no sidebar
      window.dispatchEvent(new Event('refreshUnreadCount'));
    } catch {
      // Se falhar, abre o documento normalmente
      window.open(doc.fileUrl, '_blank');
    }
  };

  const getStatusBadge = (doc: SharedDocument) => {
    if (doc.uploadedByClient) {
      if (doc.status === 'DOWNLOADED') {
        return <span className="px-2 py-1 text-xs rounded-full bg-success-100 text-success-700 flex items-center gap-1"><Check size={12} /> Baixado</span>;
      }
      return <span className="px-2 py-1 text-xs rounded-full bg-warning-100 text-warning-700 flex items-center gap-1"><Clock size={12} /> Novo do cliente</span>;
    }
    switch (doc.status) {
      case 'SIGNED':
        return <span className="px-2 py-1 text-xs rounded-full bg-success-100 text-success-700 flex items-center gap-1"><Check size={12} /> Assinado</span>;
      case 'DOWNLOADED':
        return <span className="px-2 py-1 text-xs rounded-full bg-primary-100 text-primary-700 flex items-center gap-1"><Download size={12} /> Baixado</span>;
      case 'VIEWED':
        return <span className="px-2 py-1 text-xs rounded-full bg-warning-100 text-warning-700 flex items-center gap-1"><Eye size={12} /> Visualizado</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded-full bg-neutral-100 text-neutral-700 dark:text-slate-300 flex items-center gap-1"><Clock size={12} /> Pendente</span>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleNewClient = () => {
    resetForm();
    setEditMode(false);
    setSelectedClient(null);
    setShowModal(true);
  };

  // Wrapper que retorna '-' para datas vazias
  const formatDateDisplay = (dateString?: string) => formatDate(dateString) || '-';

  const formatCPF = (cpf?: string) => {
    if (!cpf) return '-';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-3 sm:mb-4">Clientes</h1>

          {/* Action Buttons - Mobile: Grid 3 columns, Desktop: Flex row */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <ExportButton
              type="import"
              onClick={handleImportClick}
            />
            <ExportButton
              type="csv"
              onClick={handleExportCSV}
              loading={exportingCSV}
            />
            <ExportButton
              type="pdf"
              onClick={handleExportPDF}
              loading={exportingPDF}
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px] ${
                hasActiveFilters
                  ? 'bg-warning-100 text-warning-700 border border-warning-200 hover:bg-warning-200'
                  : 'bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200'
              }`}
            >
              <Filter size={20} />
              <span className="hidden sm:inline">Filtros</span>
              {hasActiveFilters && <span className="bg-warning-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">!</span>}
            </button>
            <button
              onClick={handleNewClient}
              className="inline-flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium text-sm transition-all duration-200 min-h-[44px]"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Novo Cliente</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Search size={20} className="text-neutral-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
            />
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 mb-4 border border-neutral-200 dark:border-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Data Início
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    <Calendar size={14} className="inline mr-1" />
                    Data Fim
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Tag
                  </label>
                  <select
                    value={tagFilter}
                    onChange={(e) => setTagFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <option value="">Todas as Tags</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="w-full px-4 py-2 text-sm font-medium text-neutral-600 dark:text-slate-400 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 min-h-[44px]"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-slate-700">
                  <p className="text-sm text-neutral-600 dark:text-slate-400">
                    <strong>Filtros ativos:</strong>{' '}
                    {tagFilter && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-xs mr-2">Tag: {tags.find(t => t.id === tagFilter)?.name}</span>}
                    {dateFrom && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs mr-2">De: {dateFrom}</span>}
                    {dateTo && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs mr-2">Até: {dateTo}</span>}
                  </p>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <p className="text-center py-8 text-neutral-600 dark:text-slate-400">Carregando...</p>
          ) : clients.length === 0 ? (
            <p className="text-center py-8 text-neutral-600 dark:text-slate-400">
              {search ? 'Nenhum cliente encontrado para sua busca' : 'Nenhum cliente cadastrado'}
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                <MobileCardList
                  items={clients.map((client): MobileCardItem => ({
                    id: client.id,
                    title: client.name,
                    subtitle: formatCPF(client.cpf),
                    extraContent: client.clientTags && client.clientTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {client.clientTags.map((ct) => (
                          <TagBadge key={ct.id} name={ct.tag.name} color={ct.tag.color} size="sm" />
                        ))}
                      </div>
                    ) : undefined,
                    fields: [
                      { label: 'Telefone', value: client.phone || '-' },
                      { label: 'Email', value: client.email || '-' },
                    ],
                    onView: () => handleViewDetails(client),
                    onEdit: () => handleEdit(client),
                    onDelete: () => handleDelete(client),
                  }))}
                  emptyMessage={search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        CPF
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Telefone
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        TAG
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {clients.map((client) => (
                      <tr key={client.id} className="odd:bg-white dark:bg-slate-800 even:bg-neutral-50 dark:bg-slate-700 hover:bg-success-100 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-slate-100">{client.name}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">{formatCPF(client.cpf)}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">{client.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">{client.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                          {client.clientTags && client.clientTags.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {client.clientTags.map((ct) => (
                                <TagBadge key={ct.id} name={ct.tag.name} color={ct.tag.color} size="sm" />
                              ))}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <ActionsDropdown
                            actions={[
                              { label: 'Ver Detalhes', icon: <Eye size={16} />, onClick: () => handleViewDetails(client), variant: 'info' },
                              { label: 'Editar', icon: <Edit size={16} />, onClick: () => handleEdit(client), variant: 'primary' },
                              { label: 'Excluir', icon: <Trash2 size={16} />, onClick: () => handleDelete(client), variant: 'danger' },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 px-4">
                  <div className="text-sm text-neutral-600 dark:text-slate-400">
                    Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total} clientes
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-2 py-1 text-sm bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={25}>25 por página</option>
                      <option value={50}>50 por página</option>
                      <option value={100}>100 por página</option>
                      <option value={200}>200 por página</option>
                    </select>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
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
                            className={`px-3 py-1 text-sm rounded-lg ${
                              page === pageNum
                                ? 'bg-primary-600 text-white'
                                : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-slate-100">
                {editMode ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedClient(null);
                  resetForm();
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="space-y-6">
                {/* Dados da Empresa / Dados Pessoais */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">
                    {formData.personType === 'JURIDICA' ? 'Dados da Empresa' : 'Dados Pessoais'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tipo de Pessoa */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Tipo de Pessoa <span className="text-error-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.personType}
                        onChange={(e) => setFormData({ ...formData, personType: e.target.value as 'FISICA' | 'JURIDICA' })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="FISICA">Pessoa Física</option>
                        <option value="JURIDICA">Pessoa Jurídica</option>
                      </select>
                    </div>

                    {/* Condição do Cliente */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Condição do Cliente
                      </label>
                      <select
                        value={formData.clientCondition}
                        onChange={(e) => setFormData({ ...formData, clientCondition: e.target.value as 'DEMANDANTE' | 'DEMANDADO' | '' })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="">Selecione...</option>
                        <option value="DEMANDANTE">Demandante</option>
                        <option value="DEMANDADO">Demandado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        {formData.personType === 'FISICA' ? 'Nome Completo' : 'Razão Social'} <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        {formData.personType === 'FISICA' ? 'CPF' : 'CNPJ'}
                      </label>
                      <input
                        type="text"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        placeholder={formData.personType === 'FISICA' ? '000.000.000-00' : '00.000.000/0000-00'}
                        maxLength={formData.personType === 'FISICA' ? 14 : 18}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    {/* Inscrição Estadual - apenas para Pessoa Jurídica */}
                    {formData.personType === 'JURIDICA' && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                          Inscrição Estadual
                        </label>
                        <input
                          type="text"
                          value={formData.stateRegistration}
                          onChange={(e) => setFormData({ ...formData, stateRegistration: e.target.value })}
                          placeholder="123.456.789.012"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>
                    )}

                    {/* Campos para Pessoa Física */}
                    {formData.personType === 'FISICA' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">RG</label>
                          <input
                            type="text"
                            value={formData.rg}
                            onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Número do PIS</label>
                          <input
                            type="text"
                            value={formData.pis}
                            onChange={(e) => setFormData({ ...formData, pis: e.target.value })}
                            placeholder="000.00000.00-0"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">CTPS</label>
                          <input
                            type="text"
                            value={formData.ctps}
                            onChange={(e) => setFormData({ ...formData, ctps: e.target.value })}
                            placeholder="Número da CTPS"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">CTPS Série</label>
                          <input
                            type="text"
                            value={formData.ctpsSerie}
                            onChange={(e) => setFormData({ ...formData, ctpsSerie: e.target.value })}
                            placeholder="Série da CTPS"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Nome da Mãe</label>
                          <input
                            type="text"
                            value={formData.motherName}
                            onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                            placeholder="Nome completo da mãe"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                            Data de Nascimento
                          </label>
                          <input
                            type="date"
                            value={formData.birthDate}
                            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                            Estado Civil
                          </label>
                          <select
                            value={formData.maritalStatus}
                            onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          >
                            <option value="">Selecione...</option>
                            <option value="Solteiro(a)">Solteiro(a)</option>
                            <option value="Casado(a)">Casado(a)</option>
                            <option value="Divorciado(a)">Divorciado(a)</option>
                            <option value="Viúvo(a)">Viúvo(a)</option>
                            <option value="União Estável">União Estável</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                            Profissão
                          </label>
                          <input
                            type="text"
                            value={formData.profession}
                            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                            Nacionalidade
                          </label>
                          <input
                            type="text"
                            value={formData.nationality}
                            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                            placeholder="Ex: Brasileiro(a)"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                            Outros
                          </label>
                          <input
                            type="text"
                            value={formData.customField1}
                            onChange={(e) => setFormData({ ...formData, customField1: e.target.value })}
                            placeholder="Informações adicionais"
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Dados do Representante Legal - apenas para Pessoa Jurídica */}
                {formData.personType === 'JURIDICA' && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Dados do Representante Legal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                          Nome do Representante Legal
                        </label>
                        <input
                          type="text"
                          value={formData.representativeName}
                          onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                          placeholder="Nome completo do representante"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                          CPF do Representante Legal
                        </label>
                        <input
                          type="text"
                          value={formData.representativeCpf}
                          onChange={(e) => setFormData({ ...formData, representativeCpf: e.target.value })}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">RG do Representante</label>
                        <input
                          type="text"
                          value={formData.rg}
                          onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                          Data de Nascimento do Representante
                        </label>
                        <input
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                          Estado Civil do Representante
                        </label>
                        <select
                          value={formData.maritalStatus}
                          onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        >
                          <option value="">Selecione...</option>
                          <option value="Solteiro(a)">Solteiro(a)</option>
                          <option value="Casado(a)">Casado(a)</option>
                          <option value="Divorciado(a)">Divorciado(a)</option>
                          <option value="Viúvo(a)">Viúvo(a)</option>
                          <option value="União Estável">União Estável</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                          Profissão do Representante
                        </label>
                        <input
                          type="text"
                          value={formData.profession}
                          onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                          Nacionalidade do Representante
                        </label>
                        <input
                          type="text"
                          value={formData.nationality}
                          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                          placeholder="Ex: Brasileiro(a)"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Contato */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Contato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Telefone 1
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Telefone 2
                      </label>
                      <input
                        type="text"
                        value={formData.phone2}
                        onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Instagram
                      </label>
                      <input
                        type="text"
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                        placeholder="@usuario"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Facebook
                      </label>
                      <input
                        type="text"
                        value={formData.facebook}
                        onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                        placeholder="URL ou nome de usuário"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Outros 2
                      </label>
                      <input
                        type="text"
                        value={formData.customField2}
                        onChange={(e) => setFormData({ ...formData, customField2: e.target.value })}
                        placeholder="Informações adicionais"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Endereço
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Rua, número, complemento"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        placeholder="Nome do bairro"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Estado</label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="">Selecione...</option>
                        <option value="AC">AC</option>
                        <option value="AL">AL</option>
                        <option value="AP">AP</option>
                        <option value="AM">AM</option>
                        <option value="BA">BA</option>
                        <option value="CE">CE</option>
                        <option value="DF">DF</option>
                        <option value="ES">ES</option>
                        <option value="GO">GO</option>
                        <option value="MA">MA</option>
                        <option value="MT">MT</option>
                        <option value="MS">MS</option>
                        <option value="MG">MG</option>
                        <option value="PA">PA</option>
                        <option value="PB">PB</option>
                        <option value="PR">PR</option>
                        <option value="PE">PE</option>
                        <option value="PI">PI</option>
                        <option value="RJ">RJ</option>
                        <option value="RN">RN</option>
                        <option value="RS">RS</option>
                        <option value="RO">RO</option>
                        <option value="RR">RR</option>
                        <option value="SC">SC</option>
                        <option value="SP">SP</option>
                        <option value="SE">SE</option>
                        <option value="TO">TO</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">CEP</label>
                      <input
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        placeholder="00000-000"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Observações</h3>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="Informações adicionais sobre o cliente..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Tags
                  </label>
                  <TagSelector
                    selectedTagIds={formData.tagIds}
                    onChange={(tagIds) => setFormData({ ...formData, tagIds })}
                    placeholder="Selecionar tags..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedClient(null);
                    resetForm();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px]"
                >
                  {editMode ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {showDetailsModal && selectedClient && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-3xl">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-slate-100">Detalhes do Cliente</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedClient(null);
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body space-y-4 sm:space-y-6">
              {/* Dados da Empresa / Dados Pessoais */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">
                  {selectedClient.personType === 'JURIDICA' ? 'Dados da Empresa' : 'Dados Pessoais'}
                </h3>
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Tipo de Pessoa</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">
                      {selectedClient.personType === 'JURIDICA' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Condição</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">
                      {selectedClient.clientCondition === 'DEMANDANTE' ? 'Demandante' :
                       selectedClient.clientCondition === 'DEMANDADO' ? 'Demandado' : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">
                      {selectedClient.personType === 'JURIDICA' ? 'Razão Social' : 'Nome Completo'}
                    </p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">
                      {selectedClient.personType === 'JURIDICA' ? 'CNPJ' : 'CPF'}
                    </p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{formatCPF(selectedClient.cpf)}</p>
                  </div>

                  {selectedClient.personType === 'JURIDICA' && selectedClient.stateRegistration && (
                    <div>
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Inscrição Estadual</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.stateRegistration}</p>
                    </div>
                  )}

                  {selectedClient.personType === 'FISICA' && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">RG</p>
                        <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.rg || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">PIS</p>
                        <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.pis || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">CTPS</p>
                        <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.ctps || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">CTPS Série</p>
                        <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.ctpsSerie || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Nome da Mãe</p>
                        <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.motherName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Data de Nascimento</p>
                        <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{formatDateDisplay(selectedClient.birthDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Estado Civil</p>
                        <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.maritalStatus || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Profissão</p>
                        <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.profession || '-'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Dados do Representante Legal - apenas para Pessoa Jurídica */}
              {selectedClient.personType === 'JURIDICA' && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Dados do Representante Legal</h3>
                  <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Nome do Representante</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.representativeName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">CPF do Representante</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{formatCPF(selectedClient.representativeCpf)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">RG do Representante</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.rg || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Data de Nascimento</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{formatDateDisplay(selectedClient.birthDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Estado Civil</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.maritalStatus || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Profissão</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.profession || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contato */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Contato</h3>
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Email</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Telefone 1</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Telefone 2</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.phone2 || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Instagram</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.instagram || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Facebook</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.facebook || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Endereço</h3>
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Endereço</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Cidade</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Estado</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.state || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">CEP</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedClient.zipCode || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedClient.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Observações</h3>
                  <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                    <p className="text-sm text-neutral-900 dark:text-slate-100 whitespace-pre-wrap">{selectedClient.notes}</p>
                  </div>
                </div>
              )}

              {/* Datas */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Informações do Sistema</h3>
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Data de Cadastro</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{formatDateDisplay(selectedClient.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Última Atualização</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{formatDateDisplay(selectedClient.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Processos Vinculados */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <FileText size={20} className="text-primary-600" />
                  Processos Vinculados
                </h3>
                {loadingDetails ? (
                  <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-primary-600" />
                    <span className="ml-2 text-neutral-600 dark:text-slate-400">Carregando processos...</span>
                  </div>
                ) : selectedClient.cases && selectedClient.cases.length > 0 ? (
                  <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg divide-y divide-neutral-200 dark:divide-slate-700">
                    {selectedClient.cases.map((caso) => (
                      <div key={caso.id} className="p-4 hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-neutral-900 dark:text-slate-100">{caso.processNumber}</p>
                            {caso.subject && (
                              <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">{caso.subject}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                caso.status === 'ACTIVE' ? 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-400' :
                                caso.status === 'PENDENTE' ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-400' :
                                caso.status === 'FINISHED' ? 'bg-info-100 dark:bg-info-900/30 text-info-800 dark:text-info-400' :
                                'bg-neutral-100 dark:bg-slate-600 text-neutral-800 dark:text-slate-300'
                              }`}>
                                {caso.status === 'ACTIVE' ? 'Ativo' :
                                 caso.status === 'PENDENTE' ? 'Pendente' :
                                 caso.status === 'FINISHED' ? 'Finalizado' :
                                 caso.status === 'ARCHIVED' ? 'Arquivado' : caso.status}
                              </span>
                              {caso.court && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 dark:bg-slate-600 text-neutral-700 dark:text-slate-300">
                                  {caso.court}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-6 text-center">
                    <FileText size={32} className="mx-auto text-neutral-400 dark:text-slate-500 mb-2" />
                    <p className="text-neutral-500 dark:text-slate-400">Nenhum processo vinculado a este cliente</p>
                  </div>
                )}
              </div>

              {/* Acesso ao Portal do Cliente */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Acesso ao Portal</h3>
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                  {portalUser ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center">
                            <Mail className="text-success-600" size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-slate-100">Acesso ativo</p>
                            <p className="text-sm text-neutral-500 dark:text-slate-400">{portalUser.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleRemovePortalAccess}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-error-600 dark:text-error-400 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors"
                        >
                          <UserX size={18} />
                          Remover acesso
                        </button>
                      </div>
                      {portalUser.tempPassword && (
                        <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg p-3">
                          <p className="text-sm font-medium text-warning-800 dark:text-warning-300 mb-1">Senha Temporária (anote agora!):</p>
                          <div className="flex items-center gap-2">
                            <code className="bg-white dark:bg-slate-800 px-3 py-1.5 rounded border text-lg font-mono font-bold text-neutral-900 dark:text-slate-100 select-all">
                              {portalUser.tempPassword}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(portalUser.tempPassword!);
                                toast.success('Senha copiada!');
                              }}
                              className="px-3 py-1.5 text-sm bg-warning-100 dark:bg-warning-900/30 hover:bg-warning-200 dark:hover:bg-warning-800/40 text-warning-800 dark:text-warning-300 rounded transition-colors"
                            >
                              Copiar
                            </button>
                          </div>
                          <p className="text-xs text-warning-600 dark:text-warning-400 mt-2">
                            Esta senha só aparece uma vez. Envie para o cliente ou peça que ele redefina pelo email.
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-neutral-400 dark:text-slate-500">
                        URL do portal: https://cliente.advwell.pro
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-neutral-600 dark:text-slate-400">
                          {selectedClient.email
                            ? 'Este cliente ainda não tem acesso ao portal.'
                            : 'Cadastre um email para criar acesso ao portal.'}
                        </p>
                        <p className="text-xs text-neutral-400 dark:text-slate-500 mt-1">
                          URL do portal: https://cliente.advwell.pro
                        </p>
                      </div>
                      {selectedClient.email && (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={portalPassword}
                              onChange={(e) => setPortalPassword(e.target.value)}
                              placeholder="Senha (deixe vazio para gerar automaticamente)"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            <p className="text-xs text-neutral-400 dark:text-slate-500 mt-1">
                              Min. 12 caracteres, com maiúscula, minúscula, número e especial
                            </p>
                          </div>
                          <button
                            onClick={handleCreatePortalAccess}
                            disabled={creatingPortalAccess}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {creatingPortalAccess ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <UserPlus size={18} />
                            )}
                            Criar acesso
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Documentos Compartilhados */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">Documentos Compartilhados</h3>
                  <button
                    onClick={() => {
                      setShowDocumentModal(true);
                      loadAvailableDocuments();
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                  >
                    <Upload size={16} />
                    Compartilhar
                  </button>
                </div>
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                  {loadingDocuments ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={24} className="animate-spin text-primary-500" />
                    </div>
                  ) : sharedDocuments.length > 0 ? (
                    <div className="space-y-3">
                      {sharedDocuments.map((doc) => (
                        <div key={doc.id} className="bg-white dark:bg-slate-800 rounded-lg border border-neutral-200 dark:border-slate-700 p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                {doc.requiresSignature ? (
                                  <FileSignature className="text-primary-600" size={20} />
                                ) : (
                                  <FileText className="text-primary-600" size={20} />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-neutral-900 dark:text-slate-100 truncate">{doc.name}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="text-xs text-neutral-500 dark:text-slate-400">
                                    {formatFileSize(doc.fileSize)}
                                  </span>
                                  <span className="text-xs text-neutral-400 dark:text-slate-500">•</span>
                                  <span className="text-xs text-neutral-500 dark:text-slate-400">
                                    {formatDate(doc.sharedAt)}
                                  </span>
                                  {doc.requiresSignature && (
                                    <>
                                      <span className="text-xs text-neutral-400 dark:text-slate-500">•</span>
                                      <span className="text-xs text-warning-600">Requer assinatura</span>
                                    </>
                                  )}
                                </div>
                                {doc.signedAt && (
                                  <p className="text-xs text-success-600 mt-1">
                                    Assinado em {formatDate(doc.signedAt)}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:flex-shrink-0">
                              {getStatusBadge(doc)}
                              {doc.uploadedByClient ? (
                                <button
                                  onClick={() => handleDownloadFromClient(doc)}
                                  className="p-2 text-neutral-500 dark:text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                  title="Baixar documento do cliente"
                                >
                                  <ExternalLink size={18} />
                                </button>
                              ) : (
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-neutral-500 dark:text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                  title="Abrir documento"
                                >
                                  <ExternalLink size={18} />
                                </a>
                              )}
                              {doc.signatureUrl && (
                                <a
                                  href={doc.signatureUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-neutral-500 dark:text-slate-400 hover:text-success-600 hover:bg-success-50 rounded-lg transition-colors"
                                  title="Ver assinatura"
                                >
                                  <FileSignature size={18} />
                                </a>
                              )}
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-2 text-neutral-500 dark:text-slate-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-neutral-500 dark:text-slate-400 text-center py-4">
                      Nenhum documento compartilhado com este cliente
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedClient(null);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEdit(selectedClient);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-info-100 text-info-700 border border-info-200 hover:bg-info-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px]"
              >
                <Edit size={20} />
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultados da Importação */}
      {showImportModal && importResults && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-slate-100">Resultados da Importação</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:text-slate-300"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-primary-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary-600">{importResults.total}</p>
                  <p className="text-sm text-neutral-600 dark:text-slate-400">Total de linhas</p>
                </div>
                <div className="bg-success-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-success-600">{importResults.success}</p>
                  <p className="text-sm text-neutral-600 dark:text-slate-400">Importados</p>
                </div>
                <div className="bg-error-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-error-600">{importResults.errors.length}</p>
                  <p className="text-sm text-neutral-600 dark:text-slate-400">Erros</p>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-slate-100 mb-2">Erros encontrados:</h3>
                  <div className="bg-error-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {importResults.errors.map((error: any, index: number) => (
                      <div key={index} className="mb-2 pb-2 border-b border-error-200 last:border-0">
                        <p className="text-sm font-medium text-error-800">
                          Linha {error.line}: {error.name}
                        </p>
                        <p className="text-sm text-error-600">{error.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowImportModal(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compartilhar Documento */}
      {showDocumentModal && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-lg">
            <div className="modal-header">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-slate-100">Compartilhar Documento</h2>
              <button
                onClick={resetDocumentModal}
                className="text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:text-slate-300"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body space-y-4">
              {/* Seleção de origem do documento */}
              <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-slate-700 rounded-lg">
                <button
                  onClick={() => setDocumentSource('upload')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    documentSource === 'upload'
                      ? 'bg-white dark:bg-slate-600 text-primary-700 dark:text-primary-400 shadow-sm'
                      : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload size={16} className="inline mr-2" />
                  Novo Upload
                </button>
                <button
                  onClick={() => setDocumentSource('existing')}
                  className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                    documentSource === 'existing'
                      ? 'bg-white dark:bg-slate-600 text-primary-700 dark:text-primary-400 shadow-sm'
                      : 'text-neutral-600 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText size={16} className="inline mr-2" />
                  Docs Jurídicos
                </button>
              </div>

              {documentSource === 'existing' ? (
                /* Seleção de documento jurídico */
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Selecione um documento jurídico *
                  </label>
                  {loadingAvailableDocuments ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 size={20} className="animate-spin text-primary-600" />
                      <span className="ml-2 text-sm text-neutral-500 dark:text-slate-400">Carregando...</span>
                    </div>
                  ) : availableDocuments.length === 0 ? (
                    <div className="text-sm text-neutral-500 dark:text-slate-400 py-4 text-center bg-neutral-50 dark:bg-slate-700 rounded-lg">
                      Nenhum documento disponível na aba Documentos Jurídicos.
                    </div>
                  ) : (
                    <select
                      value={selectedDocumentId}
                      onChange={(e) => {
                        setSelectedDocumentId(e.target.value);
                        const doc = availableDocuments.find(d => d.id === e.target.value);
                        if (doc && !documentName) {
                          setDocumentName(doc.name);
                        }
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Selecione...</option>
                      {availableDocuments.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                /* Upload de novo arquivo */
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Arquivo *
                  </label>
                  <input
                    type="file"
                    ref={docFileInputRef}
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 dark:file:bg-slate-600 dark:file:text-slate-200 hover:file:bg-primary-100 dark:hover:file:bg-slate-500"
                  />
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                    Formatos aceitos: PDF, DOC, DOCX, PNG, JPG (máx. 25MB)
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                  Nome do Documento {documentSource === 'upload' ? '*' : '(opcional)'}
                </label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Ex: Contrato de Honorários"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  placeholder="Descrição do documento..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requiresSignature"
                  checked={requiresSignature}
                  onChange={(e) => setRequiresSignature(e.target.checked)}
                  className="w-4 h-4 text-primary-600 border-neutral-300 dark:border-slate-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="requiresSignature" className="text-sm text-neutral-700 dark:text-slate-300">
                  Requer assinatura do cliente
                </label>
              </div>

              {requiresSignature && (
                <div className="bg-info-50 dark:bg-info-900/20 border border-info-200 dark:border-info-800 rounded-lg p-3">
                  <p className="text-sm text-info-700 dark:text-info-400">
                    O cliente poderá assinar o documento pelo portal usando o dedo (celular) ou mouse (computador).
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={resetDocumentModal}
                className="flex-1 sm:flex-none px-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm hover:bg-neutral-50 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleShareDocument}
                disabled={uploadingDocument}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {uploadingDocument ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Clients;
