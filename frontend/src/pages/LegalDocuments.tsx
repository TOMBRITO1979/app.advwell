import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  Download,
  Sparkles,
  X,
  User,
  Calendar,
  PenTool,
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  cpf?: string;
  personType?: string;
}

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
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);

  // Autocomplete states
  const [clientSearchText, setClientSearchText] = useState('');
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  const clientInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    loadDocuments();
    loadClients();
    loadUsers();
  }, [search]);

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

  const loadDocuments = async () => {
    try {
      const params: any = { limit: 1000 };
      if (search) params.search = search;

      const response = await api.get('/legal-documents', { params });
      setDocuments(response.data.data);
    } catch (error) {
      toast.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await api.get('/clients', { params: { limit: 1000 } });
      setClients(response.data.data || response.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.data || response.data);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
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
    setClientSearchText('');
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
    setClientSearchText(doc.client?.name || '');
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

    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }

    try {
      const payload = {
        title: formData.title,
        content: formData.content,
        documentDate: formData.documentDate,
        clientId: formData.clientId || null,
        signerId: formData.signerId || null,
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

  const handleClientSelect = (client: Client) => {
    setFormData({ ...formData, clientId: client.id });
    setClientSearchText(client.name);
    setShowClientSuggestions(false);
  };

  const handleInsertQualification = async () => {
    if (!formData.clientId) {
      toast.error('Selecione um cliente primeiro');
      return;
    }

    try {
      const response = await api.get(`/legal-documents/client/${formData.clientId}/qualification`);
      const qualification = response.data.qualification;

      let newContent = formData.content;
      let replaced = false;

      // Lista de padrões para substituir (primeiro encontrado será substituído)
      const patterns = [
        // Padrão NOTIFICANTE/OUTORGANTE/CONTRATANTE com qualificação completa
        /(\[NOME COMPLETO\])[^\[]*(\[NACIONALIDADE\])[^\[]*(\[ESTADO CIVIL\])[^\[]*(\[PROFISSÃO\])[^\[]*(inscrito\(a\) no CPF sob o nº \[CPF\])[^\[]*(RG nº \[RG\][^\[]*)?(residente e domiciliado\(a\) em \[ENDEREÇO COMPLETO\])/gi,
        // Padrão mais simples: [NOME COMPLETO] seguido de qualificação
        /\[NOME COMPLETO\][^\.]*\[ENDEREÇO COMPLETO\]/gi,
        // Apenas [QUALIFICAÇÃO COMPLETA] ou [QUALIFICAÇÃO]
        /\[QUALIFICA[ÇC][ÃA]O\s*(COMPLETA)?\]/gi,
        // [PARTE] ou [CLIENTE]
        /\[PARTE\]|\[CLIENTE\]/gi,
      ];

      for (const pattern of patterns) {
        if (pattern.test(newContent)) {
          // Resetar o lastIndex do regex
          pattern.lastIndex = 0;
          // Substituir apenas a primeira ocorrência
          newContent = newContent.replace(pattern, qualification);
          replaced = true;
          break;
        }
      }

      if (replaced) {
        setFormData({ ...formData, content: newContent });
        toast.success('Qualificação inserida no documento!');
      } else {
        // Se não encontrou padrão, copia para área de transferência
        await navigator.clipboard.writeText(qualification);
        toast.success('Nenhum placeholder encontrado. Qualificação copiada - cole (Ctrl+V) onde desejar.');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao buscar qualificação');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-3 sm:mb-4">
            Documentos Jurídicos
          </h1>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={handleNew}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 font-medium text-sm transition-all duration-200 min-h-[44px]"
            >
              <Plus size={20} />
              <span>Novo Documento</span>
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por título, conteúdo ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
            />
          </div>
        </div>

        {/* Lista de Documentos */}
        <div className="bg-white rounded-lg shadow">
          {loading ? (
            <p className="text-center py-8 text-neutral-600">Carregando...</p>
          ) : documents.length === 0 ? (
            <p className="text-center py-8 text-neutral-600">
              {search ? 'Nenhum documento encontrado' : 'Nenhum documento cadastrado'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Parte (Cliente)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Assinante
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-primary-600" />
                          <span className="font-medium text-neutral-900">{doc.title}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {doc.client ? (
                          <div>
                            <p className="font-medium">{doc.client.name}</p>
                            {doc.client.cpf && (
                              <p className="text-xs text-neutral-500">{doc.client.cpf}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {formatDate(doc.documentDate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        {doc.signer?.name || <span className="text-neutral-400">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDownloadPDF(doc)}
                            className="inline-flex items-center justify-center p-2 min-h-[40px] min-w-[40px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-all duration-200"
                            title="Gerar PDF"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => handleReviewWithAI(doc)}
                            className="inline-flex items-center justify-center p-2 min-h-[40px] min-w-[40px] text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-md transition-all duration-200"
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
          )}
        </div>
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-neutral-900">
                {editMode ? 'Editar Documento' : 'Novo Documento'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                {/* Título */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    <FileText size={16} className="inline mr-1" />
                    Título do Documento *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Recibo de Honorários, Procuração, Contrato de Prestação de Serviços..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    required
                  />
                </div>

                {/* Cliente (Parte) */}
                <div className="relative">
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    <User size={16} className="inline mr-1" />
                    Parte (Cliente)
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        ref={clientInputRef}
                        type="text"
                        value={clientSearchText}
                        onChange={(e) => {
                          setClientSearchText(e.target.value);
                          setShowClientSuggestions(true);
                          if (!e.target.value) {
                            setFormData({ ...formData, clientId: '' });
                          }
                        }}
                        onFocus={() => setShowClientSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowClientSuggestions(false), 200)}
                        placeholder="Buscar cliente..."
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                      {showClientSuggestions && filteredClients.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredClients.map((client) => (
                            <div
                              key={client.id}
                              onClick={() => handleClientSelect(client)}
                              className="px-4 py-2 hover:bg-neutral-100 cursor-pointer"
                            >
                              <p className="font-medium text-neutral-900">{client.name}</p>
                              {client.cpf && (
                                <p className="text-xs text-neutral-500">{client.cpf}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleInsertQualification}
                      disabled={!formData.clientId}
                      className="px-3 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] whitespace-nowrap"
                      title="Inserir qualificação completa do cliente"
                    >
                      + Qualificação
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Substitui automaticamente [NOME COMPLETO]...[ENDEREÇO COMPLETO] pela qualificação do cliente
                  </p>
                </div>

                {/* Conteúdo */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Texto do Documento *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Digite o conteúdo do documento..."
                    rows={12}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* Data e Assinante */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      <Calendar size={16} className="inline mr-1" />
                      Data do Documento
                    </label>
                    <input
                      type="date"
                      value={formData.documentDate}
                      onChange={(e) => setFormData({ ...formData, documentDate: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">
                      <PenTool size={16} className="inline mr-1" />
                      Profissional Assinante
                    </label>
                    <select
                      value={formData.signerId}
                      onChange={(e) => setFormData({ ...formData, signerId: e.target.value })}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
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
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-200 transition-colors min-h-[44px]"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles size={24} className="text-purple-600" />
                <h2 className="text-xl font-bold text-neutral-900">Revisão com IA</h2>
              </div>
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewResult(null);
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {selectedDocument && (
                <p className="text-sm text-neutral-600 mb-4">
                  Documento: <span className="font-medium">{selectedDocument.title}</span>
                </p>
              )}

              {reviewLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                  <p className="text-neutral-600">Analisando documento com IA...</p>
                  <p className="text-sm text-neutral-500 mt-2">Isso pode levar alguns segundos</p>
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
                            <span className="text-neutral-500 mx-2">→</span>
                            <span className="text-green-600 font-medium">"{erro.correcao}"</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-semibold text-green-800">Nenhum erro encontrado!</h3>
                      <p className="text-sm text-green-600 mt-1">O documento está correto.</p>
                    </div>
                  )}

                  {/* Sugestões */}
                  {reviewResult.review?.sugestoes && reviewResult.review.sugestoes.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 mb-3">Sugestões de Melhoria</h3>
                      <ul className="space-y-1">
                        {reviewResult.review.sugestoes.map((sugestao: string, index: number) => (
                          <li key={index} className="text-sm text-blue-700">• {sugestao}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Texto corrigido (se houver erros) */}
                  {reviewResult.review?.erros && reviewResult.review.erros.length > 0 && reviewResult.review?.textoCorrigido && (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                      <h3 className="font-semibold text-neutral-800 mb-3">Texto Corrigido</h3>
                      <pre className="whitespace-pre-wrap text-sm text-neutral-700 font-sans max-h-60 overflow-y-auto">
                        {reviewResult.review.textoCorrigido}
                      </pre>
                    </div>
                  )}

                  {/* Fallback: se a IA retornou texto não parseado */}
                  {reviewResult.review?.reviewText && (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
                      <h3 className="font-semibold text-neutral-800 mb-3">Análise da IA</h3>
                      <pre className="whitespace-pre-wrap text-sm text-neutral-700 font-sans">
                        {reviewResult.review.reviewText}
                      </pre>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Botões de ação */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-neutral-200">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setReviewResult(null);
                  }}
                  className="px-4 py-2 border border-neutral-300 text-neutral-700 rounded-md hover:bg-neutral-50 transition-colors min-h-[44px]"
                >
                  Fechar
                </button>
                {reviewResult?.review?.erros && reviewResult.review.erros.length > 0 && (
                  <button
                    onClick={handleApplyCorrections}
                    disabled={applyingCorrection}
                    className="px-4 py-2 bg-green-100 text-green-700 border border-green-200 rounded-md hover:bg-green-200 transition-colors min-h-[44px] disabled:opacity-50"
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
