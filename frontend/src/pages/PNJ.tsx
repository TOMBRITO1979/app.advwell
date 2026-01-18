import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ExportButton } from '../components/ui';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  FileText,
  Users,
  Clock,
  Loader2,
  User,
  Upload,
  Download,
  Link,
  File,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import ActionsDropdown from '../components/ui/ActionsDropdown';
import { formatDate } from '../utils/dateFormatter';

type PNJStatus = 'ACTIVE' | 'ARCHIVED' | 'CLOSED';
type PNJPartType = 'AUTHOR' | 'DEFENDANT' | 'INTERESTED' | 'THIRD_PARTY' | 'OTHER';

interface PNJPart {
  id: string;
  name: string;
  document?: string;
  type: PNJPartType;
  notes?: string;
  createdAt: string;
}

interface PNJMovement {
  id: string;
  date: string;
  description: string;
  notes?: string;
  createdAt: string;
  creator?: {
    id: string;
    name: string;
  };
}

type StorageType = 'upload' | 'link';
type ExternalType = 'google_drive' | 'google_docs' | 'minio' | 'other';

interface PNJDocument {
  id: string;
  name: string;
  description?: string;
  storageType: StorageType;
  fileUrl?: string;
  fileKey?: string;
  fileSize?: number;
  fileType?: string;
  externalUrl?: string;
  externalType?: ExternalType;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  };
}

interface PNJ {
  id: string;
  number: string;
  protocol?: string;
  title: string;
  description?: string;
  status: PNJStatus;
  openDate: string;
  closeDate?: string;
  clientId?: string;
  client?: {
    id: string;
    name: string;
    cpf?: string;
    email?: string;
    phone?: string;
  };
  adverseId?: string;
  adverse?: {
    id: string;
    name: string;
    cpf?: string;
  };
  creator?: {
    id: string;
    name: string;
  };
  parts?: PNJPart[];
  movements?: PNJMovement[];
  documents?: PNJDocument[];
  _count?: {
    parts: number;
    movements: number;
    documents: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: string;
  name: string;
  cpf?: string;
}

interface Adverse {
  id: string;
  name: string;
  cpf?: string;
}

interface PNJFormData {
  number: string;
  protocol: string;
  title: string;
  description: string;
  status: PNJStatus;
  clientId: string;
  adverseId: string;
  openDate: string;
}

interface PartFormData {
  name: string;
  document: string;
  type: PNJPartType;
  notes: string;
}

interface MovementFormData {
  date: string;
  description: string;
  notes: string;
}

const statusColors: Record<PNJStatus, { bg: string; text: string; label: string }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', label: 'Ativo' },
  ARCHIVED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Arquivado' },
  CLOSED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Encerrado' },
};

const partTypeLabels: Record<PNJPartType, string> = {
  AUTHOR: 'Demandante',
  DEFENDANT: 'Demandado',
  INTERESTED: 'Interessado',
  THIRD_PARTY: 'Terceiro',
  OTHER: 'Outro',
};

const PNJPage: React.FC = () => {
  const [pnjs, setPnjs] = useState<PNJ[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [adverses, setAdverses] = useState<Adverse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPNJ, setSelectedPNJ] = useState<PNJ | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tab state for details modal
  const [activeTab, setActiveTab] = useState<'data' | 'parts' | 'movements' | 'documents'>('data');

  // Part form state
  const [showPartModal, setShowPartModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState<PNJPart | null>(null);
  const [editPartMode, setEditPartMode] = useState(false);
  const [partFormData, setPartFormData] = useState<PartFormData>({
    name: '',
    document: '',
    type: 'AUTHOR',
    notes: '',
  });

  // Movement form state
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<PNJMovement | null>(null);
  const [editMovementMode, setEditMovementMode] = useState(false);
  const [movementFormData, setMovementFormData] = useState<MovementFormData>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
  });

  const [formData, setFormData] = useState<PNJFormData>({
    number: '',
    protocol: '',
    title: '',
    description: '',
    status: 'ACTIVE',
    clientId: '',
    adverseId: '',
    openDate: new Date().toISOString().split('T')[0],
  });

  // Client search/autocomplete state
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  // Adverse search/autocomplete state
  const [adverseSearch, setAdverseSearch] = useState('');
  const [showAdverseDropdown, setShowAdverseDropdown] = useState(false);
  const [filteredAdverses, setFilteredAdverses] = useState<Adverse[]>([]);

  // Inline movement form state (at bottom of details modal)
  const [inlineMovementDate, setInlineMovementDate] = useState(new Date().toISOString().split('T')[0]);
  const [inlineMovementDescription, setInlineMovementDescription] = useState('');
  const [savingInlineMovement, setSavingInlineMovement] = useState(false);

  // Document upload state
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentMode, setDocumentMode] = useState<'upload' | 'link'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [documentDescription, setDocumentDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [externalType, setExternalType] = useState<ExternalType>('other');
  const [uploadingDocument, setUploadingDocument] = useState(false);

  // CSV import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    loadPNJs();
    loadClients();
    loadAdverses();
  }, [search, statusFilter, page, limit]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  // Filter clients based on search text
  useEffect(() => {
    if (clientSearch.trim()) {
      const filtered = clients.filter((client) =>
        client.name.toLowerCase().includes(clientSearch.toLowerCase())
      );
      setFilteredClients(filtered);
      setShowClientDropdown(true);
    } else {
      setFilteredClients([]);
      setShowClientDropdown(false);
    }
  }, [clientSearch, clients]);

  // Filter adverses based on search text
  useEffect(() => {
    if (adverseSearch.trim()) {
      const filtered = adverses.filter((adverse) =>
        adverse.name.toLowerCase().includes(adverseSearch.toLowerCase())
      );
      setFilteredAdverses(filtered);
      setShowAdverseDropdown(true);
    } else {
      setFilteredAdverses([]);
      setShowAdverseDropdown(false);
    }
  }, [adverseSearch, adverses]);

  const loadPNJs = async () => {
    try {
      const response = await api.get('/pnj', {
        params: { search, status: statusFilter, page, limit },
      });
      setPnjs(response.data.data);
      setTotal(response.data.total || 0);
    } catch (error) {
      toast.error('Erro ao carregar PNJs');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await api.get('/clients', { params: { limit: 1000 } });
      setClients(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadAdverses = async () => {
    try {
      const response = await api.get('/adverses', { params: { limit: 1000 } });
      setAdverses(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar adversos:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      number: '',
      protocol: '',
      title: '',
      description: '',
      status: 'ACTIVE',
      clientId: '',
      adverseId: '',
      openDate: new Date().toISOString().split('T')[0],
    });
    setClientSearch('');
    setAdverseSearch('');
  };

  const resetPartForm = () => {
    setPartFormData({
      name: '',
      document: '',
      type: 'AUTHOR',
      notes: '',
    });
  };

  const resetMovementForm = () => {
    setMovementFormData({
      date: new Date().toISOString().split('T')[0],
      description: '',
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editMode && selectedPNJ) {
        await api.put(`/pnj/${selectedPNJ.id}`, formData);
        toast.success('PNJ atualizado com sucesso!');
      } else {
        await api.post('/pnj', formData);
        toast.success('PNJ criado com sucesso!');
      }
      setShowModal(false);
      setEditMode(false);
      setSelectedPNJ(null);
      resetForm();
      loadPNJs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar PNJ');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (pnj: PNJ) => {
    setSelectedPNJ(pnj);
    setFormData({
      number: pnj.number || '',
      protocol: pnj.protocol || '',
      title: pnj.title || '',
      description: pnj.description || '',
      status: pnj.status,
      clientId: pnj.clientId || '',
      adverseId: pnj.adverseId || '',
      openDate: pnj.openDate ? pnj.openDate.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    // Set client search text for autocomplete
    setClientSearch(pnj.client?.name || '');
    // Set adverse search text for autocomplete
    setAdverseSearch(pnj.adverse?.name || '');
    setEditMode(true);
    setShowModal(true);
  };

  const handleSelectClient = (client: Client) => {
    setFormData({ ...formData, clientId: client.id });
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const handleClearClient = () => {
    setFormData({ ...formData, clientId: '' });
    setClientSearch('');
  };

  const handleSelectAdverse = (adverse: Adverse) => {
    setFormData({ ...formData, adverseId: adverse.id });
    setAdverseSearch(adverse.name);
    setShowAdverseDropdown(false);
  };

  const handleClearAdverse = () => {
    setFormData({ ...formData, adverseId: '' });
    setAdverseSearch('');
  };

  const handleDelete = async (pnj: PNJ) => {
    if (!window.confirm(`Tem certeza que deseja excluir o PNJ "${pnj.number}"?`)) {
      return;
    }

    try {
      await api.delete(`/pnj/${pnj.id}`);
      toast.success('PNJ excluido com sucesso!');
      loadPNJs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir PNJ');
    }
  };

  const handleViewDetails = async (pnj: PNJ) => {
    try {
      const response = await api.get(`/pnj/${pnj.id}`);
      setSelectedPNJ(response.data);
      setActiveTab('data');
      setShowDetailsModal(true);
    } catch (error) {
      toast.error('Erro ao carregar detalhes do PNJ');
    }
  };

  const handleNewPNJ = () => {
    resetForm();
    setEditMode(false);
    setSelectedPNJ(null);
    setShowModal(true);
  };

  // ============================================================================
  // PARTES
  // ============================================================================

  const handleAddPart = () => {
    resetPartForm();
    setEditPartMode(false);
    setSelectedPart(null);
    setShowPartModal(true);
  };

  const handleEditPart = (part: PNJPart) => {
    setSelectedPart(part);
    setPartFormData({
      name: part.name || '',
      document: part.document || '',
      type: part.type,
      notes: part.notes || '',
    });
    setEditPartMode(true);
    setShowPartModal(true);
  };

  const handlePartSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPNJ) return;

    setSaving(true);
    try {
      if (editPartMode && selectedPart) {
        await api.put(`/pnj/${selectedPNJ.id}/parts/${selectedPart.id}`, partFormData);
        toast.success('Parte atualizada com sucesso!');
      } else {
        await api.post(`/pnj/${selectedPNJ.id}/parts`, partFormData);
        toast.success('Parte adicionada com sucesso!');
      }
      setShowPartModal(false);
      resetPartForm();
      // Reload PNJ details
      const response = await api.get(`/pnj/${selectedPNJ.id}`);
      setSelectedPNJ(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar parte');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePart = async (part: PNJPart) => {
    if (!selectedPNJ) return;
    if (!window.confirm(`Tem certeza que deseja excluir a parte "${part.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/pnj/${selectedPNJ.id}/parts/${part.id}`);
      toast.success('Parte excluida com sucesso!');
      // Reload PNJ details
      const response = await api.get(`/pnj/${selectedPNJ.id}`);
      setSelectedPNJ(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir parte');
    }
  };

  // ============================================================================
  // ANDAMENTOS
  // ============================================================================

  const handleAddMovement = () => {
    resetMovementForm();
    setEditMovementMode(false);
    setSelectedMovement(null);
    setShowMovementModal(true);
  };

  const handleEditMovement = (movement: PNJMovement) => {
    setSelectedMovement(movement);
    setMovementFormData({
      date: movement.date ? movement.date.split('T')[0] : new Date().toISOString().split('T')[0],
      description: movement.description || '',
      notes: movement.notes || '',
    });
    setEditMovementMode(true);
    setShowMovementModal(true);
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPNJ) return;

    setSaving(true);
    try {
      if (editMovementMode && selectedMovement) {
        await api.put(`/pnj/${selectedPNJ.id}/movements/${selectedMovement.id}`, movementFormData);
        toast.success('Andamento atualizado com sucesso!');
      } else {
        await api.post(`/pnj/${selectedPNJ.id}/movements`, movementFormData);
        toast.success('Andamento adicionado com sucesso!');
      }
      setShowMovementModal(false);
      resetMovementForm();
      // Reload PNJ details
      const response = await api.get(`/pnj/${selectedPNJ.id}`);
      setSelectedPNJ(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar andamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMovement = async (movement: PNJMovement) => {
    if (!selectedPNJ) return;
    if (!window.confirm('Tem certeza que deseja excluir este andamento?')) {
      return;
    }

    try {
      await api.delete(`/pnj/${selectedPNJ.id}/movements/${movement.id}`);
      toast.success('Andamento excluido com sucesso!');
      // Reload PNJ details
      const response = await api.get(`/pnj/${selectedPNJ.id}`);
      setSelectedPNJ(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir andamento');
    }
  };

  // Inline movement form submission (at bottom of modal)
  const handleAddInlineMovement = async () => {
    if (!selectedPNJ) return;
    if (!inlineMovementDescription.trim()) {
      toast.error('Descricao do andamento e obrigatoria');
      return;
    }

    setSavingInlineMovement(true);
    try {
      await api.post(`/pnj/${selectedPNJ.id}/movements`, {
        date: inlineMovementDate,
        description: inlineMovementDescription,
      });
      toast.success('Andamento adicionado com sucesso!');
      // Reset form
      setInlineMovementDate(new Date().toISOString().split('T')[0]);
      setInlineMovementDescription('');
      // Reload PNJ details
      const response = await api.get(`/pnj/${selectedPNJ.id}`);
      setSelectedPNJ(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao adicionar andamento');
    } finally {
      setSavingInlineMovement(false);
    }
  };

  // ============================================================================
  // DOCUMENTOS
  // ============================================================================

  const resetDocumentForm = () => {
    setDocumentMode('upload');
    setSelectedFile(null);
    setDocumentName('');
    setDocumentDescription('');
    setExternalUrl('');
    setExternalType('other');
  };

  const handleAddDocument = () => {
    resetDocumentForm();
    setShowDocumentModal(true);
  };

  const handleDocumentSubmit = async () => {
    if (!selectedPNJ) return;

    if (documentMode === 'upload') {
      if (!selectedFile) {
        toast.error('Selecione um arquivo');
        return;
      }

      setUploadingDocument(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('name', documentName || selectedFile.name);
        if (documentDescription) formData.append('description', documentDescription);

        await api.post(`/pnj/${selectedPNJ.id}/documents/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success('Documento enviado com sucesso!');
        setShowDocumentModal(false);
        resetDocumentForm();
        // Reload PNJ details
        const response = await api.get(`/pnj/${selectedPNJ.id}`);
        setSelectedPNJ(response.data);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Erro ao enviar documento');
      } finally {
        setUploadingDocument(false);
      }
    } else {
      if (!documentName.trim()) {
        toast.error('Nome e obrigatorio');
        return;
      }
      if (!externalUrl.trim()) {
        toast.error('URL e obrigatoria');
        return;
      }

      setUploadingDocument(true);
      try {
        await api.post(`/pnj/${selectedPNJ.id}/documents/link`, {
          name: documentName,
          description: documentDescription,
          externalUrl,
          externalType,
        });
        toast.success('Link adicionado com sucesso!');
        setShowDocumentModal(false);
        resetDocumentForm();
        // Reload PNJ details
        const response = await api.get(`/pnj/${selectedPNJ.id}`);
        setSelectedPNJ(response.data);
      } catch (error: any) {
        toast.error(error.response?.data?.error || 'Erro ao adicionar link');
      } finally {
        setUploadingDocument(false);
      }
    }
  };

  const handleDeleteDocument = async (doc: PNJDocument) => {
    if (!selectedPNJ) return;
    if (!window.confirm(`Tem certeza que deseja excluir "${doc.name}"?`)) return;

    try {
      await api.delete(`/pnj/${selectedPNJ.id}/documents/${doc.id}`);
      toast.success('Documento removido com sucesso!');
      // Reload PNJ details
      const response = await api.get(`/pnj/${selectedPNJ.id}`);
      setSelectedPNJ(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao remover documento');
    }
  };

  const handleDownloadDocument = (doc: PNJDocument) => {
    if (doc.storageType === 'upload' && doc.fileUrl) {
      window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    } else if (doc.storageType === 'link' && doc.externalUrl) {
      window.open(doc.externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDateDisplay = (dateString?: string) => formatDate(dateString) || '-';

  // ============================================================================
  // CSV EXPORT/IMPORT
  // ============================================================================

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await api.get('/pnj/export/csv', {
        params: { search, status: statusFilter },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `pnj_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Exportacao concluida!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao exportar CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) {
      toast.error('Selecione um arquivo CSV');
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const response = await api.post('/pnj/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const { imported, skipped, total, errors } = response.data;
      toast.success(`Importacao concluida: ${imported} de ${total} registros importados${skipped > 0 ? `, ${skipped} ignorados` : ''}`);
      if (errors && errors.length > 0) {
        console.warn('Erros na importacao:', errors);
      }
      setShowImportModal(false);
      setImportFile(null);
      loadPNJs();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao importar CSV');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-3 sm:mb-4">
            PNJ - Processos Nao Judiciais
          </h1>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={handleNewPNJ}
              className="inline-flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium text-sm transition-all duration-200 min-h-[44px]"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Novo PNJ</span>
              <span className="sm:hidden">Novo</span>
            </button>
            <ExportButton
              type="csv"
              onClick={handleExportCSV}
              loading={exporting}
              disabled={exporting || pnjs.length === 0}
            />
            <ExportButton
              type="import"
              onClick={() => setShowImportModal(true)}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <Search size={20} className="text-neutral-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por numero, protocolo, titulo, cliente, CPF ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ACTIVE">Ativo</option>
              <option value="ARCHIVED">Arquivado</option>
              <option value="CLOSED">Encerrado</option>
            </select>
          </div>

          {loading ? (
            <p className="text-center py-8 text-neutral-600 dark:text-slate-400">Carregando...</p>
          ) : pnjs.length === 0 ? (
            <p className="text-center py-8 text-neutral-600 dark:text-slate-400">
              {search || statusFilter !== 'ALL'
                ? 'Nenhum PNJ encontrado para sua busca'
                : 'Nenhum PNJ cadastrado'}
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                <MobileCardList
                  items={pnjs.map((pnj): MobileCardItem => ({
                    id: pnj.id,
                    title: pnj.number,
                    subtitle: pnj.title,
                    badge: {
                      text: statusColors[pnj.status].label,
                      color: pnj.status === 'ACTIVE' ? 'green' :
                             pnj.status === 'ARCHIVED' ? 'yellow' : 'gray',
                    },
                    fields: [
                      { label: 'Protocolo', value: pnj.protocol || '-' },
                      { label: 'Cliente', value: pnj.client?.name || '-' },
                      { label: 'CPF/Tel', value: pnj.client ? [pnj.client.cpf, pnj.client.phone].filter(Boolean).join(' | ') || '-' : '-' },
                      { label: 'Data', value: formatDateDisplay(pnj.openDate) },
                    ],
                    onView: () => handleViewDetails(pnj),
                    onEdit: () => handleEdit(pnj),
                    onDelete: () => handleDelete(pnj),
                  }))}
                  emptyMessage={search ? 'Nenhum PNJ encontrado' : 'Nenhum PNJ cadastrado'}
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Número
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Protocolo
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Titulo
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {pnjs.map((pnj) => (
                      <tr key={pnj.id} className="odd:bg-white dark:bg-slate-800 even:bg-neutral-50 dark:bg-slate-700 hover:bg-success-100 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-slate-100">{pnj.number}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">{pnj.protocol || '-'}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400 max-w-[200px] truncate">{pnj.title}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                          {pnj.client ? (
                            <div>
                              <div className="font-medium">{pnj.client.name}</div>
                              {(pnj.client.cpf || pnj.client.phone) && (
                                <div className="text-xs text-neutral-400 dark:text-slate-500">
                                  {pnj.client.cpf && <span>{pnj.client.cpf}</span>}
                                  {pnj.client.cpf && pnj.client.phone && <span> | </span>}
                                  {pnj.client.phone && <span>{pnj.client.phone}</span>}
                                </div>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[pnj.status].bg} ${statusColors[pnj.status].text}`}
                          >
                            {statusColors[pnj.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                          {formatDateDisplay(pnj.openDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex items-center justify-center">
                            <ActionsDropdown
                              actions={[
                                {
                                  label: 'Ver detalhes',
                                  icon: <Eye size={16} />,
                                  onClick: () => handleViewDetails(pnj),
                                  variant: 'info',
                                },
                                {
                                  label: 'Editar',
                                  icon: <Edit size={16} />,
                                  onClick: () => handleEdit(pnj),
                                  variant: 'primary',
                                },
                                {
                                  label: 'Excluir',
                                  icon: <Trash2 size={16} />,
                                  onClick: () => handleDelete(pnj),
                                  variant: 'danger',
                                },
                              ]}
                            />
                          </div>
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
                    Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total} PNJs
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

      {/* Modal Criar/Editar PNJ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-slate-100">
                {editMode ? 'Editar PNJ' : 'Novo PNJ'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedPNJ(null);
                  resetForm();
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Numero <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.number}
                      onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Protocolo
                    </label>
                    <input
                      type="text"
                      value={formData.protocol}
                      onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Titulo <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Descricao
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Cliente
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Digite para buscar..."
                        value={clientSearch}
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          if (!e.target.value) {
                            setFormData({ ...formData, clientId: '' });
                          }
                        }}
                        onFocus={() => {
                          if (clientSearch.trim()) setShowClientDropdown(true);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] pr-8"
                      />
                      {formData.clientId && (
                        <button
                          type="button"
                          onClick={handleClearClient}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {/* Client dropdown */}
                    {showClientDropdown && filteredClients.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => handleSelectClient(client)}
                            className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-slate-600 text-sm text-neutral-700 dark:text-slate-300"
                          >
                            {client.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Adverso
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Digite para buscar..."
                        value={adverseSearch}
                        onChange={(e) => {
                          setAdverseSearch(e.target.value);
                          if (!e.target.value) {
                            setFormData({ ...formData, adverseId: '' });
                          }
                        }}
                        onFocus={() => {
                          if (adverseSearch.trim()) setShowAdverseDropdown(true);
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] pr-8"
                      />
                      {formData.adverseId && (
                        <button
                          type="button"
                          onClick={handleClearAdverse}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                    {/* Adverse dropdown */}
                    {showAdverseDropdown && filteredAdverses.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredAdverses.map((adverse) => (
                          <button
                            key={adverse.id}
                            type="button"
                            onClick={() => handleSelectAdverse(adverse)}
                            className="w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-slate-600 text-sm text-neutral-700 dark:text-slate-300"
                          >
                            {adverse.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as PNJStatus })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    >
                      <option value="ACTIVE">Ativo</option>
                      <option value="ARCHIVED">Arquivado</option>
                      <option value="CLOSED">Encerrado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Data de Abertura
                    </label>
                    <input
                      type="date"
                      value={formData.openDate}
                      onChange={(e) => setFormData({ ...formData, openDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedPNJ(null);
                    resetForm();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px] disabled:opacity-50"
                >
                  {saving ? <Loader2 size={20} className="animate-spin" /> : null}
                  {editMode ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes PNJ */}
      {showDetailsModal && selectedPNJ && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-3xl">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-slate-100">
                PNJ: {selectedPNJ.number}
              </h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPNJ(null);
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-neutral-200 dark:border-slate-700">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('data')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'data'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-slate-300'
                  }`}
                >
                  <FileText size={16} className="inline mr-2" />
                  Dados
                </button>
                <button
                  onClick={() => setActiveTab('parts')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'parts'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-slate-300'
                  }`}
                >
                  <Users size={16} className="inline mr-2" />
                  Partes ({selectedPNJ.parts?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('movements')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'movements'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-slate-300'
                  }`}
                >
                  <Clock size={16} className="inline mr-2" />
                  Andamentos ({selectedPNJ.movements?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('documents')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'documents'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-slate-300'
                  }`}
                >
                  <File size={16} className="inline mr-2" />
                  Documentos ({selectedPNJ.documents?.length || 0})
                </button>
              </div>
            </div>

            <div className="modal-body">
              {/* Tab: Dados */}
              {activeTab === 'data' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedPNJ.status].bg} ${statusColors[selectedPNJ.status].text}`}
                    >
                      {statusColors[selectedPNJ.status].label}
                    </span>
                  </div>

                  <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Numero</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedPNJ.number}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Protocolo</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedPNJ.protocol || '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Titulo</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedPNJ.title}</p>
                    </div>
                    {selectedPNJ.description && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Descricao</p>
                        <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1 whitespace-pre-wrap">{selectedPNJ.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Cliente</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedPNJ.client?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Adverso</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedPNJ.adverse?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Data de Abertura</p>
                      <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{formatDateDisplay(selectedPNJ.openDate)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Partes */}
              {activeTab === 'parts' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddPart}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm transition-all duration-200"
                    >
                      <Plus size={18} />
                      Adicionar Parte
                    </button>
                  </div>

                  {selectedPNJ.parts && selectedPNJ.parts.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPNJ.parts.map((part) => (
                        <div key={part.id} className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <User size={16} className="text-neutral-400 dark:text-slate-500" />
                              <p className="font-medium text-neutral-900 dark:text-slate-100">{part.name}</p>
                              <span className="text-xs px-2 py-0.5 bg-neutral-200 text-neutral-700 dark:text-slate-300 rounded">
                                {partTypeLabels[part.type]}
                              </span>
                            </div>
                            {part.document && (
                              <p className="text-sm text-neutral-600 dark:text-slate-400 mt-1">Doc: {part.document}</p>
                            )}
                            {part.notes && (
                              <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">{part.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPart(part)}
                              className="p-1.5 text-primary-600 hover:bg-primary-50 rounded"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeletePart(part)}
                              className="p-1.5 text-error-600 hover:bg-error-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-neutral-500 dark:text-slate-400">Nenhuma parte cadastrada</p>
                  )}
                </div>
              )}

              {/* Tab: Andamentos */}
              {activeTab === 'movements' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddMovement}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm transition-all duration-200"
                    >
                      <Plus size={18} />
                      Adicionar Andamento
                    </button>
                  </div>

                  {selectedPNJ.movements && selectedPNJ.movements.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPNJ.movements.map((movement) => (
                        <div key={movement.id} className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-slate-400">
                                <Clock size={14} />
                                {formatDateDisplay(movement.date)}
                                {movement.creator && (
                                  <span>- por {movement.creator.name}</span>
                                )}
                              </div>
                              <p className="mt-2 text-neutral-900 dark:text-slate-100 whitespace-pre-wrap">{movement.description}</p>
                              {movement.notes && (
                                <p className="mt-2 text-sm text-neutral-500 dark:text-slate-400 italic">{movement.notes}</p>
                              )}
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleEditMovement(movement)}
                                className="p-1.5 text-primary-600 hover:bg-primary-50 rounded"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteMovement(movement)}
                                className="p-1.5 text-error-600 hover:bg-error-50 rounded"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-neutral-500 dark:text-slate-400">Nenhum andamento cadastrado</p>
                  )}
                </div>
              )}

              {/* Tab: Documentos */}
              {activeTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddDocument}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm transition-all duration-200"
                    >
                      <Plus size={18} />
                      Adicionar Documento
                    </button>
                  </div>

                  {selectedPNJ.documents && selectedPNJ.documents.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPNJ.documents.map((doc) => (
                        <div key={doc.id} className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                {doc.storageType === 'upload' ? (
                                  <File size={18} className="text-primary-600" />
                                ) : (
                                  <Link size={18} className="text-blue-600" />
                                )}
                                <span className="font-medium text-neutral-900 dark:text-slate-100">{doc.name}</span>
                              </div>
                              {doc.description && (
                                <p className="mt-1 text-sm text-neutral-600 dark:text-slate-400">{doc.description}</p>
                              )}
                              <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500 dark:text-slate-400">
                                {doc.storageType === 'upload' && (
                                  <>
                                    <span>{doc.fileType}</span>
                                    <span>{formatFileSize(doc.fileSize)}</span>
                                  </>
                                )}
                                {doc.storageType === 'link' && doc.externalType && (
                                  <span className="capitalize">{doc.externalType.replace('_', ' ')}</span>
                                )}
                                <span>{formatDateDisplay(doc.createdAt)}</span>
                                {doc.user && <span>por {doc.user.name}</span>}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleDownloadDocument(doc)}
                                className="p-1.5 text-primary-600 hover:bg-primary-50 rounded"
                                title={doc.storageType === 'upload' ? 'Baixar' : 'Abrir link'}
                              >
                                {doc.storageType === 'upload' ? <Download size={16} /> : <ExternalLink size={16} />}
                              </button>
                              <button
                                onClick={() => handleDeleteDocument(doc)}
                                className="p-1.5 text-error-600 hover:bg-error-50 rounded"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-neutral-500 dark:text-slate-400">Nenhum documento cadastrado</p>
                  )}
                </div>
              )}
            </div>

            {/* Inline Movement Form - Always visible at bottom */}
            <div className="border-t border-neutral-200 dark:border-slate-700 px-4 sm:px-6 py-4 bg-neutral-50 dark:bg-slate-700">
              <h3 className="text-sm font-semibold text-neutral-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Plus size={16} />
                Adicionar Movimento
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="sm:w-36">
                  <input
                    type="date"
                    value={inlineMovementDate}
                    onChange={(e) => setInlineMovementDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm min-h-[40px]"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Descricao do andamento..."
                    value={inlineMovementDescription}
                    onChange={(e) => setInlineMovementDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !savingInlineMovement) {
                        e.preventDefault();
                        handleAddInlineMovement();
                      }
                    }}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm min-h-[40px]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddInlineMovement}
                  disabled={savingInlineMovement || !inlineMovementDescription.trim()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg font-medium text-sm transition-all duration-200 min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingInlineMovement ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Adicionar
                </button>
              </div>

              {/* Recent movements list (newest first) */}
              {selectedPNJ.movements && selectedPNJ.movements.length > 0 && (
                <div className="mt-4 space-y-2 max-h-48 overflow-y-auto">
                  {selectedPNJ.movements.map((movement) => (
                    <div key={movement.id} className="flex items-start gap-3 p-2 bg-white dark:bg-slate-800 rounded border border-neutral-200 dark:border-slate-700 text-sm">
                      <span className="text-neutral-500 dark:text-slate-400 whitespace-nowrap flex items-center gap-1">
                        <Clock size={12} />
                        {formatDateDisplay(movement.date)}
                      </span>
                      <span className="flex-1 text-neutral-700 dark:text-slate-300">{movement.description}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditMovement(movement)}
                          className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteMovement(movement)}
                          className="p-1 text-error-600 hover:bg-error-50 rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedPNJ(null);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEdit(selectedPNJ);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px]"
              >
                <Edit size={18} />
                Editar PNJ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionar/Editar Parte */}
      {showPartModal && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-slate-100">
                {editPartMode ? 'Editar Parte' : 'Adicionar Parte'}
              </h2>
              <button
                onClick={() => {
                  setShowPartModal(false);
                  resetPartForm();
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handlePartSubmit} className="modal-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Nome <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={partFormData.name}
                    onChange={(e) => setPartFormData({ ...partFormData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Documento (CPF/CNPJ)
                  </label>
                  <input
                    type="text"
                    value={partFormData.document}
                    onChange={(e) => setPartFormData({ ...partFormData, document: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Tipo <span className="text-error-500">*</span>
                  </label>
                  <select
                    value={partFormData.type}
                    onChange={(e) => setPartFormData({ ...partFormData, type: e.target.value as PNJPartType })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  >
                    <option value="AUTHOR">Demandante</option>
                    <option value="DEFENDANT">Demandado</option>
                    <option value="INTERESTED">Interessado</option>
                    <option value="THIRD_PARTY">Terceiro</option>
                    <option value="OTHER">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Observacoes
                  </label>
                  <textarea
                    value={partFormData.notes}
                    onChange={(e) => setPartFormData({ ...partFormData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowPartModal(false);
                    resetPartForm();
                  }}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm min-h-[44px] disabled:opacity-50"
                >
                  {saving ? <Loader2 size={20} className="animate-spin" /> : null}
                  {editPartMode ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adicionar/Editar Andamento */}
      {showMovementModal && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-slate-100">
                {editMovementMode ? 'Editar Andamento' : 'Adicionar Andamento'}
              </h2>
              <button
                onClick={() => {
                  setShowMovementModal(false);
                  resetMovementForm();
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleMovementSubmit} className="modal-body">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={movementFormData.date}
                    onChange={(e) => setMovementFormData({ ...movementFormData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Descricao <span className="text-error-500">*</span>
                  </label>
                  <textarea
                    required
                    value={movementFormData.description}
                    onChange={(e) => setMovementFormData({ ...movementFormData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Observacoes
                  </label>
                  <textarea
                    value={movementFormData.notes}
                    onChange={(e) => setMovementFormData({ ...movementFormData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowMovementModal(false);
                    resetMovementForm();
                  }}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm min-h-[44px] disabled:opacity-50"
                >
                  {saving ? <Loader2 size={20} className="animate-spin" /> : null}
                  {editMovementMode ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adicionar Documento */}
      {showDocumentModal && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-slate-100">
                Adicionar Documento
              </h2>
              <button
                onClick={() => {
                  setShowDocumentModal(false);
                  resetDocumentForm();
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {/* Tabs: Upload ou Link */}
              <div className="flex border-b border-neutral-200 dark:border-slate-700 mb-4">
                <button
                  type="button"
                  onClick={() => setDocumentMode('upload')}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                    documentMode === 'upload'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-slate-300'
                  }`}
                >
                  <Upload size={16} className="inline mr-2" />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentMode('link')}
                  className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                    documentMode === 'link'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:text-slate-300'
                  }`}
                >
                  <Link size={16} className="inline mr-2" />
                  Link Externo
                </button>
              </div>

              <div className="space-y-4">
                {documentMode === 'upload' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Arquivo <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setSelectedFile(file);
                            if (!documentName) setDocumentName(file.name);
                          }
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                      />
                      {selectedFile && (
                        <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400">
                          {selectedFile.name} ({formatFileSize(selectedFile.size)})
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Nome do documento
                      </label>
                      <input
                        type="text"
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        placeholder="Nome do arquivo se diferente"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Nome <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        placeholder="Nome do documento"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        URL <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Tipo de link
                      </label>
                      <select
                        value={externalType}
                        onChange={(e) => setExternalType(e.target.value as ExternalType)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="google_drive">Google Drive</option>
                        <option value="google_docs">Google Docs</option>
                        <option value="minio">MinIO/S3</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Descricao
                  </label>
                  <textarea
                    value={documentDescription}
                    onChange={(e) => setDocumentDescription(e.target.value)}
                    rows={2}
                    placeholder="Descricao opcional"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowDocumentModal(false);
                    resetDocumentForm();
                  }}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDocumentSubmit}
                  disabled={uploadingDocument}
                  className="px-4 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm min-h-[44px] disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {uploadingDocument ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  {documentMode === 'upload' ? 'Enviar' : 'Adicionar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Importar CSV */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-md">
            <div className="modal-header">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-slate-100">
                Importar PNJs via CSV
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="space-y-4">
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 text-sm text-neutral-600 dark:text-slate-400">
                  <p className="font-medium text-neutral-700 dark:text-slate-300 mb-2">Formato do arquivo CSV:</p>
                  <p>Colunas aceitas:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><strong>Numero*</strong> - Numero do PNJ (obrigatorio)</li>
                    <li><strong>Titulo*</strong> - Titulo (obrigatorio)</li>
                    <li><strong>Protocolo</strong> - Protocolo</li>
                    <li><strong>Descricao</strong> - Descricao</li>
                    <li><strong>Status</strong> - Ativo, Arquivado ou Encerrado</li>
                    <li><strong>Data Abertura</strong> - DD/MM/AAAA ou AAAA-MM-DD</li>
                    <li><strong>Cliente</strong> - Nome do cliente</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Arquivo CSV <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  />
                  {importFile && (
                    <p className="mt-1 text-xs text-neutral-500 dark:text-slate-400">
                      Arquivo selecionado: {importFile.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportFile(null);
                  }}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleImportCSV}
                  disabled={importing || !importFile}
                  className="px-4 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm min-h-[44px] disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  Importar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PNJPage;
