import { useEffect, useState, useRef } from 'react';
import { FileText, Download, Upload, Eye, Check, Clock, FileSignature, ExternalLink, Loader2, X } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import SignatureCanvas from '../components/SignatureCanvas';
import { portalApi, PortalDocument } from '../services/portalApi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const statusConfig = {
  PENDING: { label: 'Pendente', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: Clock },
  VIEWED: { label: 'Visualizado', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: Eye },
  DOWNLOADED: { label: 'Baixado', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: Download },
  SIGNED: { label: 'Assinado', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: Check },
  UPLOADED: { label: 'Enviado', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', icon: Upload },
};

export default function PortalDocuments() {
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<PortalDocument | null>(null);
  const [signing, setSigning] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const data = await portalApi.getDocuments();
      setDocuments(data);
    } catch {
      toast.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (doc: PortalDocument) => {
    try {
      const response = await portalApi.downloadDocument(doc.id);
      window.open(response.downloadUrl, '_blank');
      loadDocuments(); // Refresh to update status
    } catch {
      toast.error('Erro ao baixar documento');
    }
  };

  const handleSign = async (signatureImage: string) => {
    if (!selectedDocument) return;

    setSigning(true);
    try {
      await portalApi.signDocument(selectedDocument.id, signatureImage);
      toast.success('Documento assinado com sucesso!');
      setShowSignatureModal(false);
      setSelectedDocument(null);
      loadDocuments();
    } catch {
      toast.error('Erro ao assinar documento');
    } finally {
      setSigning(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadName.trim()) {
      toast.error('Nome do documento é obrigatório');
      return;
    }
    if (!fileInputRef.current?.files?.[0]) {
      toast.error('Selecione um arquivo');
      return;
    }

    setUploading(true);
    try {
      await portalApi.uploadDocument(
        fileInputRef.current.files[0],
        uploadName,
        uploadDescription || undefined
      );
      toast.success('Documento enviado com sucesso!');
      setShowUploadModal(false);
      setUploadName('');
      setUploadDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDocuments();
    } catch {
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  const filteredDocuments = filter === 'ALL'
    ? documents
    : filter === 'PENDING_SIGNATURE'
    ? documents.filter(d => d.requiresSignature && !d.signedAt)
    : documents.filter(d => d.status === filter);

  const pendingSignatures = documents.filter(d => d.requiresSignature && !d.signedAt).length;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meus Documentos</h1>
            <p className="text-gray-500 dark:text-slate-400">
              {documents.length} documento(s)
              {pendingSignatures > 0 && (
                <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                  ({pendingSignatures} aguardando assinatura)
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
          >
            <Upload size={18} />
            Enviar Documento
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {[
            { value: 'ALL', label: 'Todos', mobileLabel: 'Todos' },
            { value: 'PENDING_SIGNATURE', label: 'Aguardando Assinatura', mobileLabel: 'Aguardando' },
            { value: 'SIGNED', label: 'Assinados', mobileLabel: 'Assinados' },
            { value: 'UPLOADED', label: 'Enviados por mim', mobileLabel: 'Enviados' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                filter === item.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              <span className="hidden sm:inline">{item.label}</span>
              <span className="sm:hidden">{item.mobileLabel}</span>
              {item.value === 'PENDING_SIGNATURE' && pendingSignatures > 0 && (
                <span className="ml-2 bg-yellow-500 text-white px-2 py-0.5 rounded-full text-xs">
                  {pendingSignatures}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Documents List */}
        {filteredDocuments.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-8 text-center">
            <FileText className="mx-auto text-gray-400 dark:text-slate-500 mb-4" size={48} />
            <p className="text-gray-500 dark:text-slate-400">Nenhum documento encontrado</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((doc) => {
              const status = statusConfig[doc.status];
              const StatusIcon = status.icon;
              const needsSignature = doc.requiresSignature && !doc.signedAt;

              return (
                <div
                  key={doc.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl border dark:border-slate-700 p-4 ${
                    needsSignature ? 'border-yellow-300 dark:border-yellow-700 bg-yellow-50/30 dark:bg-yellow-900/10' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        doc.uploadedByClient ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-green-100 dark:bg-green-900/30'
                      }`}>
                        {needsSignature ? (
                          <FileSignature className="text-yellow-600 dark:text-yellow-400" size={24} />
                        ) : (
                          <FileText className={doc.uploadedByClient ? 'text-purple-600 dark:text-purple-400' : 'text-green-600 dark:text-green-400'} size={24} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate">{doc.name}</h3>
                        {doc.description && (
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{doc.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500 dark:text-slate-400">{formatFileSize(doc.fileSize)}</span>
                          <span className="text-xs text-gray-400 dark:text-slate-500">•</span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {format(new Date(doc.sharedAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                          {!doc.uploadedByClient && (
                            <>
                              <span className="text-xs text-gray-400 dark:text-slate-500">•</span>
                              <span className="text-xs text-gray-500 dark:text-slate-400">
                                Enviado por {doc.sharedBy.name}
                              </span>
                            </>
                          )}
                        </div>
                        {doc.signedAt && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Assinado em {format(new Date(doc.signedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1 ${status.color}`}>
                        <StatusIcon size={14} />
                        {status.label}
                      </span>

                      {needsSignature && (
                        <button
                          onClick={() => {
                            setSelectedDocument(doc);
                            setShowSignatureModal(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-sm font-medium hover:bg-yellow-600 transition-colors"
                        >
                          <FileSignature size={16} />
                          Assinar
                        </button>
                      )}

                      {doc.allowDownload && (
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-2 text-gray-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Baixar"
                        >
                          <Download size={20} />
                        </button>
                      )}

                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Abrir"
                      >
                        <ExternalLink size={20} />
                      </a>

                      {doc.signatureUrl && (
                        <a
                          href={doc.signatureUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-500 dark:text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                          title="Ver assinatura"
                        >
                          <FileSignature size={20} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Signature Modal */}
      {showSignatureModal && selectedDocument && (
        <SignatureCanvas
          onSave={handleSign}
          onCancel={() => {
            setShowSignatureModal(false);
            setSelectedDocument(null);
          }}
          loading={signing}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Enviar Documento</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadName('');
                  setUploadDescription('');
                }}
                className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Nome do Documento *
                </label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Ex: Comprovante de Residência"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Descrição do documento..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Arquivo *
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-green-50 dark:file:bg-green-900/30 file:text-green-700 dark:file:text-green-300 hover:file:bg-green-100 dark:hover:file:bg-green-900/50"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Formatos aceitos: PDF, DOC, DOCX, PNG, JPG (máx. 25MB)
                </p>
              </div>
            </div>

            <div className="p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-700 flex gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadName('');
                  setUploadDescription('');
                }}
                className="flex-1 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Upload size={18} />
                )}
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
