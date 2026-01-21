import { useEffect, useState, useRef } from 'react';
import { FileText, Upload, Clock, CheckCircle, AlertTriangle, Loader2, X } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { portalApi, PortalDocumentRequest } from '../services/portalApi';
import { format, formatDistanceToNow, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

const statusConfig = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: Clock },
  SENT: { label: 'Aguardando', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', icon: Clock },
  REMINDED: { label: 'Lembrado', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300', icon: AlertTriangle },
  RECEIVED: { label: 'Enviado', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: CheckCircle },
  CANCELLED: { label: 'Cancelado', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300', icon: X },
};

export default function PortalDocumentRequests() {
  const [requests, setRequests] = useState<PortalDocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PortalDocumentRequest | null>(null);
  const [clientNotes, setClientNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await portalApi.getDocumentRequests();
      setRequests(data);
    } catch {
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRequest) return;
    if (!fileInputRef.current?.files?.[0]) {
      toast.error('Selecione um arquivo');
      return;
    }

    setUploading(true);
    try {
      await portalApi.submitDocumentRequest(
        selectedRequest.id,
        fileInputRef.current.files[0],
        clientNotes || undefined
      );
      toast.success('Documento enviado com sucesso!');
      setShowUploadModal(false);
      setSelectedRequest(null);
      setClientNotes('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadRequests();
    } catch {
      toast.error('Erro ao enviar documento');
    } finally {
      setUploading(false);
    }
  };

  const openUploadModal = (request: PortalDocumentRequest) => {
    setSelectedRequest(request);
    setClientNotes('');
    setShowUploadModal(true);
  };

  const isOverdue = (dueDate: string, status: string) => {
    return isPast(parseISO(dueDate)) && status !== 'RECEIVED';
  };

  const pendingRequests = requests.filter(r => r.status !== 'RECEIVED');
  const completedRequests = requests.filter(r => r.status === 'RECEIVED');

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-primary-600" />
            Documentos Solicitados
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mt-1">
            Documentos que o escritório solicitou que você envie
          </p>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Pendentes ({pendingRequests.length})
            </h2>
            <div className="grid gap-4">
              {pendingRequests.map((request) => {
                const status = statusConfig[request.status] || statusConfig.PENDING;
                const StatusIcon = status.icon;
                const overdue = isOverdue(request.dueDate, request.status);

                return (
                  <div
                    key={request.id}
                    className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border p-4 ${
                      overdue
                        ? 'border-red-300 dark:border-red-700'
                        : 'border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {request.documentName}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
                            <StatusIcon className="w-3 h-3 inline mr-1" />
                            {status.label}
                          </span>
                        </div>
                        {request.description && (
                          <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">
                            {request.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-sm">
                          {overdue ? (
                            <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" />
                              Vencido em {format(parseISO(request.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-slate-400">
                              Prazo: {format(parseISO(request.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                              <span className="ml-1 text-xs">
                                ({formatDistanceToNow(parseISO(request.dueDate), { addSuffix: true, locale: ptBR })})
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => openUploadModal(request)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 whitespace-nowrap"
                      >
                        <Upload className="w-4 h-4" />
                        Enviar Documento
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Requests */}
        {completedRequests.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Enviados ({completedRequests.length})
            </h2>
            <div className="grid gap-4">
              {completedRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-green-200 dark:border-green-800 p-4"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {request.documentName}
                    </h3>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      Enviado
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    Enviado em {format(parseISO(request.receivedAt!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {requests.length === 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-slate-400">
              Nenhum documento solicitado no momento
            </p>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Enviar Documento
                </h2>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">Documento solicitado:</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedRequest.documentName}
                  </p>
                  {selectedRequest.description && (
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                      {selectedRequest.description}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Arquivo *
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    Formatos aceitos: PDF, DOC, DOCX, JPG, PNG
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Observações (opcional)
                  </label>
                  <textarea
                    value={clientNotes}
                    onChange={(e) => setClientNotes(e.target.value)}
                    rows={2}
                    placeholder="Alguma observação sobre o documento..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                    disabled={uploading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={uploading}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Enviar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
