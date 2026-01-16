import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateFormatter';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  Download,
  Sparkles,
  X,
  Calendar,
  PenTool,
  Users,
  Scale,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import RichTextEditor from '../components/RichTextEditor';

interface Client {
  id: string;
  name: string;
  cpf?: string;
  personType?: string;
}

// Interface para partes de processos (CasePart)
interface CasePart {
  id: string;
  type: 'AUTOR' | 'REU' | 'REPRESENTANTE_LEGAL';
  name: string;
  cpfCnpj?: string;
  phone?: string;
  address?: string;
  email?: string; // Agora é Nacionalidade
  civilStatus?: string;
  profession?: string;
  rg?: string;
  birthDate?: string;
}

interface CaseWithParts {
  id: string;
  processNumber: string;
  subject: string;
  client?: { id: string; name: string };
  parts?: CasePart[];
}

const CASE_PART_TYPE_LABELS: Record<string, string> = {
  AUTOR: 'Demandante',
  REU: 'Demandado',
  REPRESENTANTE_LEGAL: 'Representante Legal',
};

interface UserType {
  id: string;
  name: string;
  email?: string;
}

interface LegalDocument {
  id: string;
  title: string;
  content: string;
  documentDate: string;
  client?: Client;
  signer?: UserType;
  creator?: UserType;
  createdAt: string;
}

interface FormData {
  title: string;
  content: string;
  documentDate: string;
  clientId: string;
  signerId: string;
}

const LegalDocuments: React.FC = () => {
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    documentDate: new Date().toISOString().split('T')[0],
    clientId: '',
    signerId: '',
  });

  // Estado para revisão de IA
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewResult, setReviewResult] = useState<any>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [applyingCorrection, setApplyingCorrection] = useState(false);
  const [generatingDocument, setGeneratingDocument] = useState(false);
  const [reviewingDocument, setReviewingDocument] = useState(false);

  // Estado para processos e partes
  const [cases, setCases] = useState<CaseWithParts[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [caseParts, setCaseParts] = useState<CasePart[]>([]);
  const [selectedPartIds, setSelectedPartIds] = useState<string[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [caseSearchText, setCaseSearchText] = useState<string>('');

  // Toggle para incluir assinatura do sistema no PDF
  const [includeSignature, setIncludeSignature] = useState(true);

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  // Tokens usados pela última operação de IA
  const [lastTokenUsage, setLastTokenUsage] = useState<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null>(null);

  useEffect(() => {
    loadDocuments();
    loadUsers();
    loadCases();
  }, [search, page, limit]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const loadDocuments = async () => {
    try {
      const params: any = { page, limit };
      if (search) params.search = search;

      const response = await api.get('/legal-documents', { params });
      setDocuments(response.data.data);
      setTotal(response.data.pagination?.total || 0);
    } catch (error) {
      toast.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users', { params: { companyOnly: 'true' } });
      setUsers(response.data.data || response.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadCases = async () => {
    try {
      const response = await api.get('/cases', { params: { limit: 1000 } });
      setCases(response.data.data || response.data);
    } catch (error) {
      console.error('Erro ao carregar processos:', error);
    }
  };

  const loadCaseParts = async (caseId: string) => {
    if (!caseId) {
      setCaseParts([]);
      setSelectedPartIds([]);
      return;
    }

    setLoadingParts(true);
    try {
      const response = await api.get(`/cases/${caseId}/parts`);
      const parts = response.data || [];
      setCaseParts(parts);
      // Não selecionar automaticamente - usuário escolhe quais partes quer
      setSelectedPartIds([]);
    } catch (error) {
      console.error('Erro ao carregar partes do processo:', error);
      setCaseParts([]);
      setSelectedPartIds([]);
    } finally {
      setLoadingParts(false);
    }
  };

  // Filtrar processos pela busca
  const filteredCases = cases.filter(caseItem => {
    if (!caseSearchText.trim()) return true;
    const searchLower = caseSearchText.toLowerCase();

    // Buscar por número do processo
    if (caseItem.processNumber?.toLowerCase().includes(searchLower)) return true;

    // Buscar por nome do cliente
    if (caseItem.client?.name?.toLowerCase().includes(searchLower)) return true;

    // Buscar por assunto
    if (caseItem.subject?.toLowerCase().includes(searchLower)) return true;

    return false;
  });

  // Gerar qualificação formatada das partes selecionadas
  const generatePartiesQualification = (): string => {
    const selectedParts = caseParts.filter(p => selectedPartIds.includes(p.id));
    if (selectedParts.length === 0) return '';

    return selectedParts.map(part => {
      const lines: string[] = [];

      // Nome em maiúsculas
      lines.push(part.name.toUpperCase());

      // Nacionalidade (campo email), estado civil, profissão
      const qualifications: string[] = [];
      if (part.email) qualifications.push(part.email.toLowerCase()); // Nacionalidade
      if (part.civilStatus) qualifications.push(part.civilStatus.toLowerCase());
      if (part.profession) qualifications.push(part.profession.toLowerCase());

      if (qualifications.length > 0) {
        lines.push(qualifications.join(', '));
      }

      // CPF, RG e Identidade/Inscrição (campo phone)
      const docs: string[] = [];
      if (part.cpfCnpj) docs.push(`inscrito(a) no CPF sob o nº ${part.cpfCnpj}`);
      if (part.rg) docs.push(`RG nº ${part.rg}`);
      // Campo phone: Identidade (Rep. Legal), Inscrição (Réu) ou Telefone (Autor)
      if (part.phone) {
        if (part.type === 'REPRESENTANTE_LEGAL') {
          docs.push(`portador(a) da identidade nº ${part.phone}`);
        } else if (part.type === 'REU') {
          docs.push(`inscrição ${part.phone}`);
        }
        // Para AUTOR, phone é telefone - não incluir na qualificação
      }
      if (docs.length > 0) {
        lines.push(docs.join(', '));
      }

      // Endereço
      if (part.address) {
        lines.push(`residente e domiciliado(a) em ${part.address}`);
      }

      return lines.join(', ');
    }).join(';\n\n');
  };

  const handleInsertPartiesQualification = () => {
    if (selectedPartIds.length === 0) {
      toast.error('Selecione pelo menos uma parte');
      return;
    }

    const qualification = generatePartiesQualification();

    // Tentar substituir placeholder ou adicionar ao final
    let newContent = formData.content;
    const patterns = [
      /\[QUALIFICA[ÇC][ÃA]O\s*(COMPLETA)?\s*(DAS?\s*PARTES?)?\]/gi,
      /\[PARTES?\]/gi,
      /\[AUTOR(ES)?\]/gi,
    ];

    let replaced = false;
    for (const pattern of patterns) {
      if (pattern.test(newContent)) {
        pattern.lastIndex = 0;
        newContent = newContent.replace(pattern, qualification);
        replaced = true;
        break;
      }
    }

    if (replaced) {
      setFormData({ ...formData, content: newContent });
      toast.success('Qualificação das partes inserida no documento!');
    } else {
      // Copiar para área de transferência se não encontrou placeholder
      navigator.clipboard.writeText(qualification);
      toast.success('Qualificação copiada para área de transferência!');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      documentDate: new Date().toISOString().split('T')[0],
      clientId: '',
      signerId: '',
    });
    setSelectedCaseId('');
    setCaseParts([]);
    setSelectedPartIds([]);
    setCaseSearchText('');
    setIncludeSignature(true); // Reset toggle para o padrão
    setLastTokenUsage(null); // Limpar tokens
  };

  const handleNew = () => {
    resetForm();
    setEditMode(false);
    setSelectedDocument(null);
    setShowModal(true);
  };

  const handleEdit = (doc: LegalDocument) => {
    setSelectedDocument(doc);
    setFormData({
      title: doc.title,
      content: doc.content,
      documentDate: doc.documentDate.split('T')[0],
      clientId: doc.client?.id || '',
      signerId: doc.signer?.id || '',
    });
    setSelectedCaseId('');
    setCaseParts([]);
    setSelectedPartIds([]);
    setIncludeSignature(!!doc.signer); // Liga se tem assinante, desliga se não tem
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (doc: LegalDocument) => {
    if (!window.confirm(`Tem certeza que deseja excluir o documento "${doc.title}"?`)) {
      return;
    }

    try {
      await api.delete(`/legal-documents/${doc.id}`);
      toast.success('Documento excluído com sucesso!');
      loadDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir documento');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      const payload = {
        title: formData.title,
        content: formData.content,
        documentDate: includeSignature ? formData.documentDate : null,
        clientId: formData.clientId || null,
        signerId: includeSignature ? (formData.signerId || null) : null,
      };

      if (editMode && selectedDocument) {
        await api.put(`/legal-documents/${selectedDocument.id}`, payload);
        toast.success('Documento atualizado com sucesso!');
      } else {
        await api.post('/legal-documents', payload);
        toast.success('Documento criado com sucesso!');
      }

      setShowModal(false);
      resetForm();
      loadDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar documento');
    }
  };

  const handleDownloadPDF = async (doc: LegalDocument) => {
    try {
      const response = await api.get(`/legal-documents/${doc.id}/pdf`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${doc.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleReviewWithAI = async (doc: LegalDocument) => {
    setSelectedDocument(doc);
    setReviewLoading(true);
    setShowReviewModal(true);
    setReviewResult(null);

    try {
      const response = await api.post(`/legal-documents/${doc.id}/review`);
      setReviewResult(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao revisar documento com IA');
      setShowReviewModal(false);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleApplyCorrections = async () => {
    if (!selectedDocument || !reviewResult?.review?.textoCorrigido) {
      toast.error('Nenhuma correção disponível');
      return;
    }

    setApplyingCorrection(true);
    try {
      await api.put(`/legal-documents/${selectedDocument.id}`, {
        content: reviewResult.review.textoCorrigido,
      });
      toast.success('Correções aplicadas com sucesso!');
      setShowReviewModal(false);
      setReviewResult(null);
      loadDocuments();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao aplicar correções');
    } finally {
      setApplyingCorrection(false);
    }
  };

  // Gerar documento com IA (no modal, sem salvar)
  const handleGenerateWithAI = async () => {
    if (!formData.title.trim()) {
      toast.error('Informe o título do documento');
      return;
    }

    setGeneratingDocument(true);
    setLastTokenUsage(null);
    try {
      const response = await api.post('/legal-documents/ai/generate', {
        title: formData.title,
        content: formData.content || '',
        mode: 'generate',
      });

      if (response.data?.review?.textoCorrigido) {
        setFormData(prev => ({
          ...prev,
          content: response.data.review.textoCorrigido,
        }));

        // Salvar uso de tokens
        if (response.data?.tokenUsage) {
          setLastTokenUsage(response.data.tokenUsage);
        }

        toast.success('Documento gerado com sucesso!');
      } else {
        toast.error('Não foi possível gerar o documento');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao gerar documento com IA');
    } finally {
      setGeneratingDocument(false);
    }
  };

  // Revisar documento com IA (no modal, sem salvar)
  const handleReviewInModal = async () => {
    if (!formData.title.trim()) {
      toast.error('Informe o título do documento');
      return;
    }

    if (!formData.content || formData.content.trim().length < 50) {
      toast.error('O documento precisa ter pelo menos 50 caracteres para revisão');
      return;
    }

    setReviewingDocument(true);
    setLastTokenUsage(null);
    try {
      const response = await api.post('/legal-documents/ai/generate', {
        title: formData.title,
        content: formData.content,
        mode: 'review',
      });

      if (response.data?.review?.textoCorrigido) {
        setFormData(prev => ({
          ...prev,
          content: response.data.review.textoCorrigido,
        }));

        // Salvar uso de tokens
        if (response.data?.tokenUsage) {
          setLastTokenUsage(response.data.tokenUsage);
        }

        const erros = response.data.review.erros || [];
        if (erros.length > 0) {
          toast.success(`Documento revisado! ${erros.length} correção(ões) aplicada(s).`);
        } else {
          toast.success('Documento revisado! Nenhum erro encontrado.');
        }
      } else {
        toast.error('Não foi possível revisar o documento');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao revisar documento com IA');
    } finally {
      setReviewingDocument(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-3 sm:mb-4">
            Documentos Jurídicos
          </h1>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleNew}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-success-100 text-success-700 border border-success-200 hover:bg-success-200 font-medium text-sm transition-all duration-200 min-h-[44px]"
            >
              <Plus size={20} />
              <span>Novo Documento</span>
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-neutral-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por título, conteúdo ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
            />
          </div>
        </div>

        {/* Lista de Documentos */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <p className="text-center py-8 text-neutral-600 dark:text-slate-400">Carregando...</p>
          ) : documents.length === 0 ? (
            <p className="text-center py-8 text-neutral-600 dark:text-slate-400">
              {search ? 'Nenhum documento encontrado' : 'Nenhum documento cadastrado'}
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                <MobileCardList
                  items={documents.map((doc): MobileCardItem => ({
                    id: doc.id,
                    title: doc.title,
                    subtitle: doc.client?.name || '-',
                    fields: [
                      { label: 'Data', value: formatDate(doc.documentDate) || '-' },
                      { label: 'Assinante', value: doc.signer?.name || '-' },
                    ],
                    onEdit: () => handleEdit(doc),
                    onDelete: () => handleDelete(doc),
                  }))}
                  emptyMessage={search ? 'Nenhum documento encontrado' : 'Nenhum documento cadastrado'}
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Título
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Parte (Cliente)
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Assinante
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="odd:bg-white dark:odd:bg-slate-800 even:bg-neutral-50 dark:bg-slate-700 dark:even:bg-slate-700/50 hover:bg-success-100 dark:hover:bg-success-900/30 transition-colors">
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <FileText size={18} className="text-primary-600" />
                            <span className="font-medium text-neutral-900 dark:text-slate-100">{doc.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                          {doc.client ? (
                            <div>
                              <p className="font-medium">{doc.client.name}</p>
                              {doc.client.cpf && (
                                <p className="text-xs text-neutral-500 dark:text-slate-400">{doc.client.cpf}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-neutral-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                          {formatDate(doc.documentDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                          {doc.signer?.name || <span className="text-neutral-400 dark:text-slate-500">-</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleDownloadPDF(doc)}
                              className="inline-flex items-center justify-center p-2 min-h-[40px] min-w-[40px] text-info-600 hover:text-info-700 hover:bg-info-50 rounded-md transition-all duration-200"
                              title="Gerar PDF"
                            >
                              <Download size={18} />
                            </button>
                            <button
                              onClick={() => handleReviewWithAI(doc)}
                              className="inline-flex items-center justify-center p-2 min-h-[40px] min-w-[40px] text-purple-700 hover:text-purple-800 hover:bg-purple-100 rounded-md transition-all duration-200"
                              title="Revisar com IA"
                            >
                              <Sparkles size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(doc)}
                              className="inline-flex items-center justify-center p-2 min-h-[40px] min-w-[40px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(doc)}
                              className="inline-flex items-center justify-center p-2 min-h-[40px] min-w-[40px] text-error-600 hover:text-error-700 hover:bg-error-50 rounded-md transition-all duration-200"
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

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-lg shadow px-4 py-3">
            <span className="text-sm text-neutral-600 dark:text-slate-400">
              Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} documentos
            </span>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span className="text-sm text-neutral-600 dark:text-slate-400">por página</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center justify-center p-2 min-h-[40px] min-w-[40px] border border-neutral-300 dark:border-slate-600 rounded-md hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-neutral-700 dark:text-slate-300 px-3">
                Página {page} de {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                disabled={page >= Math.ceil(total / limit)}
                className="inline-flex items-center justify-center p-2 min-h-[40px] min-w-[40px] border border-neutral-300 dark:border-slate-600 rounded-md hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-slate-100">
                {editMode ? 'Editar Documento' : 'Novo Documento'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    <FileText size={16} className="inline mr-1" />
                    Título do Documento *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Recibo de Honorários, Procuração, Contrato de Prestação de Serviços..."
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    required
                  />
                </div>

                {/* Seleção de Processo e Partes */}
                <div className="border border-neutral-200 dark:border-slate-700 rounded-lg p-4 bg-neutral-50 dark:bg-slate-700">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-3">
                    <Scale size={16} className="inline mr-1" />
                    Partes do Processo
                  </label>

                  {/* Busca e Seletor de Processo */}
                  <div className="mb-3 relative">
                    <label className="block text-xs font-medium text-neutral-600 dark:text-slate-400 mb-1">
                      Buscar Processo
                    </label>
                    <input
                      type="text"
                      value={caseSearchText}
                      onChange={(e) => setCaseSearchText(e.target.value)}
                      placeholder="Digite nº processo, nome do cliente ou assunto..."
                      className="w-full px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                    {/* Suggestions dropdown - only shows when typing */}
                    {caseSearchText.trim() && filteredCases.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-300 dark:border-slate-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredCases.slice(0, 10).map((caseItem) => (
                          <button
                            key={caseItem.id}
                            type="button"
                            onClick={() => {
                              setSelectedCaseId(caseItem.id);
                              setCaseSearchText(`${caseItem.processNumber} - ${caseItem.subject?.substring(0, 30)}`);
                              loadCaseParts(caseItem.id);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-neutral-100 text-sm text-neutral-700 dark:text-slate-300 border-b border-neutral-100 last:border-b-0"
                          >
                            <div className="font-medium">{caseItem.processNumber}</div>
                            <div className="text-xs text-neutral-500 dark:text-slate-400">
                              {caseItem.subject?.substring(0, 50)}
                              {caseItem.client?.name && ` - ${caseItem.client.name}`}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedCaseId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCaseId('');
                          setCaseSearchText('');
                          setCaseParts([]);
                          setSelectedPartIds([]);
                        }}
                        className="absolute right-2 top-7 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Lista de Partes com Checkbox */}
                  {loadingParts ? (
                    <p className="text-sm text-neutral-500 dark:text-slate-400">Carregando partes...</p>
                  ) : caseParts.length > 0 ? (
                    <div className="space-y-2 mb-3">
                      <label className="block text-xs font-medium text-neutral-600 dark:text-slate-400 mb-1">
                        Selecione as partes para incluir a qualificação
                      </label>
                      {caseParts.map((part) => (
                        <label
                          key={part.id}
                          className="flex items-start gap-3 p-2 border border-neutral-200 dark:border-slate-700 rounded-md bg-white cursor-pointer hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPartIds.includes(part.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPartIds([...selectedPartIds, part.id]);
                              } else {
                                setSelectedPartIds(selectedPartIds.filter(id => id !== part.id));
                              }
                            }}
                            className="mt-1 h-4 w-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-neutral-900 dark:text-slate-100">{part.name}</span>
                              <span className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full">
                                {CASE_PART_TYPE_LABELS[part.type] || part.type}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                              {[
                                part.email && `${part.email}`, // Nacionalidade
                                part.civilStatus,
                                part.profession,
                                part.cpfCnpj && `CPF: ${part.cpfCnpj}`,
                              ].filter(Boolean).join(' | ')}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  ) : selectedCaseId ? (
                    <p className="text-sm text-neutral-500 dark:text-slate-400 mb-3">
                      Nenhuma parte cadastrada neste processo.
                    </p>
                  ) : (
                    <p className="text-sm text-neutral-500 dark:text-slate-400 mb-3">
                      Selecione um processo para ver as partes disponíveis.
                    </p>
                  )}

                  {/* Botão de inserir qualificação */}
                  <button
                    type="button"
                    onClick={handleInsertPartiesQualification}
                    disabled={selectedPartIds.length === 0}
                    className="w-full px-3 py-2 bg-success-100 hover:bg-success-200 text-success-700 border border-success-200 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    <Users size={16} className="inline mr-1" />
                    Inserir Qualificação das Partes Selecionadas ({selectedPartIds.length})
                  </button>
                  <p className="text-xs text-neutral-500 dark:text-slate-400 mt-2">
                    Substitui [QUALIFICAÇÃO] ou [PARTES] no documento, ou copia para área de transferência.
                  </p>
                </div>

                {/* Conteúdo */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                    Texto do Documento
                  </label>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(value) => setFormData({ ...formData, content: value })}
                    placeholder="Deixe vazio para a IA criar o documento com base no título, ou digite o conteúdo para revisão..."
                    minHeight="300px"
                  />
                </div>

                {/* Toggle para Data e Assinante */}
                <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-slate-700 rounded-lg border border-neutral-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <PenTool size={18} className="text-neutral-600 dark:text-slate-400" />
                    <div>
                      <span className="text-sm font-medium text-neutral-700 dark:text-slate-300">Assinatura do Sistema</span>
                      <p className="text-xs text-neutral-500 dark:text-slate-400">
                        {includeSignature
                          ? 'Data e assinante serão adicionados ao PDF'
                          : 'Desativado (use quando a IA já gerou as linhas de assinatura)'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIncludeSignature(!includeSignature)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      includeSignature ? 'bg-primary-600' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        includeSignature ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Data e Assinante - só mostra se o toggle estiver ativo */}
                {includeSignature && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        <Calendar size={16} className="inline mr-1" />
                        Data do Documento
                      </label>
                      <input
                        type="date"
                        value={formData.documentDate}
                        onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        <PenTool size={16} className="inline mr-1" />
                        Profissional Assinante
                      </label>
                      <select
                        value={formData.signerId}
                        onChange={(e) => setFormData({ ...formData, signerId: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="">Selecione o assinante...</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

              </div>

              {/* Botões de IA */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleGenerateWithAI}
                  disabled={generatingDocument || reviewingDocument || !formData.title.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-200 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles size={18} />
                  {generatingDocument ? 'Gerando...' : 'Gerar Documento'}
                </button>
                <button
                  type="button"
                  onClick={handleReviewInModal}
                  disabled={generatingDocument || reviewingDocument || !formData.content || formData.content.trim().length < 50}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-200 transition-colors min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PenTool size={18} />
                  {reviewingDocument ? 'Revisando...' : 'Revisar Documento'}
                </button>

                {/* Indicador de tokens usados */}
                {lastTokenUsage && (
                  <div className="ml-auto flex items-center gap-2 text-xs text-neutral-500 dark:text-slate-400 bg-neutral-100 px-3 py-1.5 rounded-full">
                    <Sparkles size={12} className="text-purple-500" />
                    <span>
                      <strong>{lastTokenUsage.totalTokens.toLocaleString()}</strong> tokens
                      <span className="hidden sm:inline text-neutral-400 dark:text-slate-500 ml-1">
                        ({lastTokenUsage.promptTokens.toLocaleString()} + {lastTokenUsage.completionTokens.toLocaleString()})
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-neutral-300 dark:border-slate-600 rounded-md text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-100 text-primary-700 border border-primary-200 rounded-md hover:bg-primary-200 transition-colors min-h-[44px]"
                >
                  {editMode ? 'Salvar Alterações' : 'Criar Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Revisão com IA */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles size={24} className="text-primary-600" />
                <h2 className="text-xl font-bold text-neutral-900 dark:text-slate-100">Revisão com IA</h2>
              </div>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewResult(null);
                }}
                className="text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {selectedDocument && (
                <p className="text-sm text-neutral-600 dark:text-slate-400 mb-4">
                  Documento: <span className="font-medium">{selectedDocument.title}</span>
                </p>
              )}

              {reviewLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                  <p className="text-neutral-600 dark:text-slate-400">Analisando documento com IA...</p>
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mt-2">Isso pode levar alguns segundos</p>
                </div>
              ) : reviewResult ? (
                <div className="space-y-4">
                  {/* Erros encontrados */}
                  {reviewResult.review?.erros && reviewResult.review.erros.length > 0 ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h3 className="font-semibold text-red-800 mb-3">Erros Encontrados ({reviewResult.review.erros.length})</h3>
                      <ul className="space-y-2">
                        {reviewResult.review.erros.map((erro: any, index: number) => (
                          <li key={index} className="text-sm">
                            <span className="font-medium text-red-700">[{erro.tipo}]</span>
                            <span className="text-red-600 line-through ml-2">"{erro.original}"</span>
                            <span className="text-neutral-500 dark:text-slate-400 mx-2">→</span>
                            <span className="text-success-600 font-medium">"{erro.correcao}"</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                      <h3 className="font-semibold text-success-800">Nenhum erro encontrado!</h3>
                      <p className="text-sm text-success-600 mt-1">O documento está correto.</p>
                    </div>
                  )}

                  {/* Sugestões */}
                  {reviewResult.review?.sugestoes && reviewResult.review.sugestoes.length > 0 && (
                    <div className="bg-info-50 border border-info-200 rounded-lg p-4">
                      <h3 className="font-semibold text-info-700 mb-3">Sugestões de Melhoria</h3>
                      <ul className="space-y-1">
                        {reviewResult.review.sugestoes.map((sugestao: string, index: number) => (
                          <li key={index} className="text-sm text-info-700">• {sugestao}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Texto corrigido (se houver erros) */}
                  {reviewResult.review?.erros && reviewResult.review.erros.length > 0 && reviewResult.review?.textoCorrigido && (
                    <div className="bg-neutral-50 dark:bg-slate-700 border border-neutral-200 dark:border-slate-700 rounded-lg p-4">
                      <h3 className="font-semibold text-neutral-800 dark:text-slate-200 mb-3">Texto Corrigido</h3>
                      <pre className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-slate-300 font-sans max-h-60 overflow-y-auto">
                        {reviewResult.review.textoCorrigido}
                      </pre>
                    </div>
                  )}

                  {/* Fallback: se a IA retornou texto não parseado */}
                  {reviewResult.review?.reviewText && (
                    <div className="bg-neutral-50 dark:bg-slate-700 border border-neutral-200 dark:border-slate-700 rounded-lg p-4">
                      <h3 className="font-semibold text-neutral-800 dark:text-slate-200 mb-3">Análise da IA</h3>
                      <pre className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-slate-300 font-sans">
                        {reviewResult.review.reviewText}
                      </pre>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Botões de ação */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewResult(null);
                  }}
                  className="px-4 py-2 border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 rounded-md hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors min-h-[44px]"
                >
                  Fechar
                </button>
                {reviewResult?.review?.erros && reviewResult.review.erros.length > 0 && (
                  <button
                    onClick={handleApplyCorrections}
                    disabled={applyingCorrection}
                    className="px-4 py-2 bg-success-100 text-success-700 border border-success-200 rounded-md hover:bg-success-200 transition-colors min-h-[44px] disabled:opacity-50"
                  >
                    {applyingCorrection ? 'Aplicando...' : 'Aplicar Correções'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LegalDocuments;
