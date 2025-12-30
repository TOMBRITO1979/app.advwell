import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateFormatter';

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

interface Document {
  id: string;
  name: string;
  description?: string;
  storageType: 'upload' | 'link';
  fileUrl?: string;
  fileSize?: number;
  fileType?: string;
  externalUrl?: string;
  externalType?: 'google_drive' | 'google_docs' | 'minio' | 'other';
  createdAt: string;
  client?: Client;
  case?: Case;
  user?: {
    id: string;
    name: string;
  };
}

const Documents: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  // Search states
  const [searchType, setSearchType] = useState<'client' | 'case'>('client');
  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);

  // Selected entity for viewing documents
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  // Form states for adding document
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    storageType: 'link' as 'upload' | 'link',
    externalUrl: '',
    externalType: 'google_drive' as 'google_drive' | 'google_docs' | 'minio' | 'other',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Load clients and cases
  useEffect(() => {
    loadClients();
    loadCases();
  }, []);

  const loadClients = async () => {
    try {
      const response = await api.get('/clients', {
        params: { limit: 1000 },
      });
      setClients(response.data.data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar clientes');
    }
  };

  const loadCases = async () => {
    try {
      const response = await api.get('/cases', {
        params: { limit: 1000 },
      });
      setCases(response.data.data || []);
    } catch (error: any) {
      toast.error('Erro ao carregar processos');
    }
  };

  // Filter suggestions based on search
  useEffect(() => {
    if (searchText) {
      if (searchType === 'client') {
        const filtered = clients.filter(
          (c) =>
            c.name.toLowerCase().includes(searchText.toLowerCase()) ||
            (c.cpf && c.cpf.includes(searchText))
        );
        setFilteredClients(filtered);
      } else {
        const filtered = cases.filter(
          (c) =>
            c.processNumber.includes(searchText) ||
            c.subject.toLowerCase().includes(searchText.toLowerCase())
        );
        setFilteredCases(filtered);
      }
    } else {
      setFilteredClients(clients);
      setFilteredCases(cases);
    }
  }, [searchText, clients, cases, searchType]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setSelectedCase(null);
    setSearchText(client.name);
    setShowSuggestions(false);
  };

  const handleSelectCase = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setSelectedClient(null);
    setSearchText(caseItem.processNumber);
    setShowSuggestions(false);
  };

  const handleSearch = async () => {
    if (!selectedClient && !selectedCase) {
      toast.error('Selecione um cliente ou processo');
      return;
    }

    setLoading(true);
    try {
      const params: any = {};
      if (selectedClient) params.clientId = selectedClient.id;
      if (selectedCase) params.caseId = selectedCase.id;

      const response = await api.get('/documents/search', { params });
      setDocuments(response.data || []);
      setShowViewModal(true);
    } catch (error: any) {
      toast.error('Erro ao buscar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDocument = () => {
    if (!selectedClient && !selectedCase) {
      toast.error('Selecione um cliente ou processo primeiro');
      return;
    }
    setShowAddModal(true);
  };

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Nome do documento é obrigatório');
      return;
    }

    if (formData.storageType === 'upload' && !selectedFile) {
      toast.error('Selecione um arquivo para upload');
      return;
    }

    if (formData.storageType === 'link' && !formData.externalUrl) {
      toast.error('URL externa é obrigatória');
      return;
    }

    setLoading(true);

    try {
      if (formData.storageType === 'upload' && selectedFile) {
        // Upload de arquivo para S3
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        uploadFormData.append('name', formData.name);
        uploadFormData.append('description', formData.description);

        if (selectedClient?.id) {
          uploadFormData.append('clientId', selectedClient.id);
        }
        if (selectedCase?.id) {
          uploadFormData.append('caseId', selectedCase.id);
        }

        await api.post('/documents/upload', uploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        toast.success('Arquivo enviado com sucesso!');
      } else {
        // Link externo
        const payload = {
          ...formData,
          clientId: selectedClient?.id,
          caseId: selectedCase?.id,
        };

        await api.post('/documents', payload);
        toast.success('Documento adicionado com sucesso!');
      }

      setShowAddModal(false);
      resetForm();

      // Reload documents if viewing
      if (showViewModal) {
        handleSearch();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao adicionar documento');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('Deseja realmente excluir este documento?')) {
      return;
    }

    try {
      await api.delete(`/documents/${documentId}`);
      toast.success('Documento excluído com sucesso!');
      handleSearch(); // Reload list
    } catch (error: any) {
      toast.error('Erro ao excluir documento');
    }
  };

  const handleOpenDocument = (document: Document) => {
    const url = document.storageType === 'upload' ? document.fileUrl : document.externalUrl;
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDownloadDocument = async (document: Document) => {
    try {
      // Get PDF from backend
      const response = await api.get(`/documents/${document.id}/download`, {
        responseType: 'blob',
      });

      // Check if response is JSON (external link)
      const contentType = response.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
        // It's an external link, parse and open
        try {
          const text = await response.data.text();
          const data = JSON.parse(text);
          if (data.downloadUrl && typeof data.downloadUrl === 'string') {
            // Validate URL to prevent open redirect attacks
            const parsedUrl = new URL(data.downloadUrl);
            if (['http:', 'https:'].includes(parsedUrl.protocol)) {
              window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
              toast.success('Abrindo link externo...');
              return;
            }
          }
        } catch (parseError) {
          console.error('Erro ao processar resposta:', parseError);
          toast.error('Erro ao processar documento');
          return;
        }
      }

      // It's a PDF blob, create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);

      // Define filename (remove extension and add .pdf)
      const pdfFileName = document.name.replace(/\.[^/.]+$/, '') + '.pdf';

      // Create temporary anchor and trigger download
      const link = window.document.createElement('a');
      link.href = url;
      link.download = pdfFileName;
      window.document.body.appendChild(link);
      link.click();

      // Cleanup
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Download do PDF iniciado!');
    } catch (error) {
      console.error('Erro ao fazer download:', error);
      toast.error('Erro ao fazer download do arquivo');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      storageType: 'link',
      externalUrl: '',
      externalType: 'google_drive',
    });
    setSelectedFile(null);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getStorageTypeLabel = (type: string) => {
    return type === 'upload' ? 'Upload' : 'Link Externo';
  };

  const getExternalTypeLabel = (type?: string) => {
    const labels: Record<string, string> = {
      google_drive: 'Google Drive',
      google_docs: 'Google Docs',
      minio: 'Minio',
      other: 'Outro',
    };
    return type ? labels[type] : '-';
  };

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-800">Documentos</h1>
          <p className="text-neutral-600">Gerencie documentos de clientes e processos</p>
        </div>

      {/* Search Section */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Search Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Buscar por
            </label>
            <select
              value={searchType}
              onChange={(e) => {
                setSearchType(e.target.value as 'client' | 'case');
                setSearchText('');
                setSelectedClient(null);
                setSelectedCase(null);
              }}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
            >
              <option value="client">Cliente</option>
              <option value="case">Processo</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative sm:col-span-1 lg:col-span-1">
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              {searchType === 'client' ? 'Nome do Cliente ou CPF' : 'Número do Processo'}
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              placeholder={
                searchType === 'client'
                  ? 'Digite o nome ou CPF'
                  : 'Digite o número do processo'
              }
              className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
            />

            {/* Autocomplete Dropdown */}
            {showSuggestions && searchText && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-neutral-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {searchType === 'client' ? (
                  filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <div
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className="px-4 py-2 hover:bg-neutral-100 cursor-pointer min-h-[44px]"
                      >
                        <div className="font-medium">{client.name}</div>
                        {client.cpf && (
                          <div className="text-sm text-neutral-600">{client.cpf}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-neutral-500">Nenhum cliente encontrado</div>
                  )
                ) : filteredCases.length > 0 ? (
                  filteredCases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      onClick={() => handleSelectCase(caseItem)}
                      className="px-4 py-2 hover:bg-neutral-100 cursor-pointer min-h-[44px]"
                    >
                      <div className="font-medium">{caseItem.processNumber}</div>
                      <div className="text-sm text-neutral-600">{caseItem.subject}</div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-2 text-neutral-500">Nenhum processo encontrado</div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons - Mobile: Stack, Tablet+: Side by side */}
          <div className="sm:col-span-2 lg:col-span-2 flex flex-col sm:flex-row items-stretch gap-2 sm:items-end">
            <button
              onClick={handleSearch}
              disabled={loading || (!selectedClient && !selectedCase)}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-info-600 hover:bg-info-700 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap"
            >
              {loading ? 'Buscando...' : 'Visualizar Documentos'}
            </button>
            <button
              onClick={handleAddDocument}
              disabled={!selectedClient && !selectedCase}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-success-100 text-success-700 border border-success-200 hover:bg-success-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base whitespace-nowrap"
            >
              + Adicionar Documento
            </button>
          </div>
        </div>

        {/* Selected Entity Display */}
        {(selectedClient || selectedCase) && (
          <div className="mt-4 p-3 bg-success-50 border border-primary-200 rounded-md">
            <span className="font-medium text-primary-800">Selecionado: </span>
            <span className="text-primary-700">
              {selectedClient
                ? `${selectedClient.name} ${selectedClient.cpf ? `(${selectedClient.cpf})` : ''}`
                : `Processo ${selectedCase?.processNumber}`}
            </span>
          </div>
        )}
      </div>

      {/* View Documents Modal */}
      {showViewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-800">
                Documentos -{' '}
                {selectedClient
                  ? selectedClient.name
                  : `Processo ${selectedCase?.processNumber}`}
              </h2>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  Nenhum documento encontrado
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="border border-neutral-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-neutral-800">{doc.name}</h3>
                          {doc.description && (
                            <p className="text-sm text-neutral-600 mt-1">{doc.description}</p>
                          )}
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            doc.storageType === 'upload'
                              ? 'bg-success-100 text-success-800'
                              : 'bg-success-100 text-success-800'
                          }`}
                        >
                          {getStorageTypeLabel(doc.storageType)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <span className="text-neutral-500">Tipo: </span>
                          <span className="text-neutral-700">
                            {doc.storageType === 'link'
                              ? getExternalTypeLabel(doc.externalType)
                              : doc.fileType || 'Arquivo'}
                          </span>
                        </div>
                        {doc.fileSize && (
                          <div>
                            <span className="text-neutral-500">Tamanho: </span>
                            <span className="text-neutral-700">{formatFileSize(doc.fileSize)}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-neutral-500">Adicionado em: </span>
                          <span className="text-neutral-700">
                            {formatDate(doc.createdAt)}
                          </span>
                        </div>
                        {doc.user && (
                          <div>
                            <span className="text-neutral-500">Por: </span>
                            <span className="text-neutral-700">{doc.user.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => handleOpenDocument(doc)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 md:px-3 md:py-1.5 bg-info-600 hover:bg-info-700 text-white font-medium rounded-md text-xs shadow-sm transition-all duration-200"
                          title="Visualizar"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-3.5 md:w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          <span className="hidden md:inline">Visualizar</span>
                        </button>
                        <button
                          onClick={() => handleDownloadDocument(doc)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 md:px-3 md:py-1.5 bg-info-100 text-info-700 border border-info-200 hover:bg-info-200 font-medium rounded-md text-xs transition-all duration-200"
                          title="Download"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-3.5 md:w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span className="hidden md:inline">Download</span>
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 md:px-3 md:py-1.5 bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 font-medium rounded-md text-xs transition-all duration-200"
                          title="Excluir"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-3.5 md:w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span className="hidden md:inline">Excluir</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-neutral-200">
              <button
                onClick={() => setShowViewModal(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg transition-all duration-200"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Document Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-neutral-200">
              <h2 className="text-xl font-bold text-neutral-800">Adicionar Documento</h2>
            </div>

            <form onSubmit={handleSaveDocument} className="p-6 overflow-y-auto flex-1">
              <div className="space-y-4">
                {/* Selected Entity */}
                <div className="p-3 bg-success-50 border border-primary-200 rounded-md">
                  <span className="font-medium text-primary-800">
                    {selectedClient ? 'Cliente: ' : 'Processo: '}
                  </span>
                  <span className="text-primary-700">
                    {selectedClient
                      ? selectedClient.name
                      : selectedCase?.processNumber}
                  </span>
                </div>

                {/* Document Name */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Nome do Documento *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                {/* Storage Type */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Tipo de Armazenamento *
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="upload"
                        checked={formData.storageType === 'upload'}
                        onChange={(e) =>
                          setFormData({ ...formData, storageType: e.target.value as 'upload' })
                        }
                        className="mr-2"
                      />
                      Carregar Arquivo
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="link"
                        checked={formData.storageType === 'link'}
                        onChange={(e) =>
                          setFormData({ ...formData, storageType: e.target.value as 'link' })
                        }
                        className="mr-2"
                      />
                      Link Externo
                    </label>
                  </div>
                </div>

                {/* Link External Fields */}
                {formData.storageType === 'link' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        URL do Documento *
                      </label>
                      <input
                        type="url"
                        value={formData.externalUrl}
                        onChange={(e) =>
                          setFormData({ ...formData, externalUrl: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        placeholder="https://..."
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Tipo de Link
                      </label>
                      <select
                        value={formData.externalType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            externalType: e.target.value as any,
                          })
                        }
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="google_drive">Google Drive</option>
                        <option value="google_docs">Google Docs</option>
                        <option value="minio">Minio</option>
                        <option value="other">Outro</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Upload Fields */}
                {formData.storageType === 'upload' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Selecionar Arquivo *
                    </label>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelectedFile(file);
                          // Auto-fill name if empty
                          if (!formData.name) {
                            setFormData({ ...formData, name: file.name });
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.zip,.rar"
                    />
                    {selectedFile && (
                      <p className="mt-2 text-sm text-neutral-600">
                        Arquivo selecionado: <span className="font-medium">{selectedFile.name}</span>
                        {' '}({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </p>
                    )}
                    <p className="mt-2 text-xs text-neutral-500">
                      Tamanho máximo: 50MB. Formatos aceitos: PDF, Word, Excel, PowerPoint, imagens, arquivos compactados.
                    </p>
                  </div>
                )}
              </div>
            </form>

            <div className="p-6 border-t border-neutral-200 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDocument}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Enviando...' : 'Salvar Documento'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </Layout>
  );
};

export default Documents;
