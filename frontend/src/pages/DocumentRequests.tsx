import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Send,
  CheckCircle,
  MoreHorizontal,
  Clock,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Filter,
  X,
  Mail,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { format, formatDistanceToNow, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface DocumentRequest {
  id: string;
  documentName: string;
  description: string | null;
  internalNotes: string | null;
  dueDate: string;
  status: 'PENDING' | 'SENT' | 'REMINDED' | 'RECEIVED' | 'CANCELLED';
  notificationChannel: 'EMAIL' | 'WHATSAPP' | 'BOTH' | null;
  autoRemind: boolean;
  autoFollowup: boolean;
  reminderCount: number;
  lastReminderAt: string | null;
  receivedAt: string | null;
  clientNotes: string | null;
  createdAt: string;
  client: Client;
  requestedBy: { id: string; name: string } | null;
  receivedDocument: { id: string; name: string; fileUrl: string } | null;
}

interface DocumentRequestFormData {
  clientId: string;
  documentName: string;
  description: string;
  internalNotes: string;
  dueDate: string;
  notificationChannel: 'EMAIL' | 'WHATSAPP' | 'BOTH' | '';
  autoRemind: boolean;
  autoFollowup: boolean;
}

interface Stats {
  total: number;
  pending: number;
  overdue: number;
  received: number;
  cancelled: number;
}

const statusLabels: Record<string, string> = {
  PENDING: 'Pendente',
  SENT: 'Enviado',
  REMINDED: 'Lembrado',
  RECEIVED: 'Recebido',
  CANCELLED: 'Cancelado',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  REMINDED: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  RECEIVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const channelIcons: Record<string, React.ReactNode> = {
  EMAIL: <Mail size={14} />,
  WHATSAPP: <MessageCircle size={14} />,
  BOTH: (
    <span className="flex gap-1">
      <Mail size={14} />
      <MessageCircle size={14} />
    </span>
  ),
};

const DocumentRequests: React.FC = () => {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<DocumentRequest | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState<DocumentRequestFormData>({
    clientId: '',
    documentName: '',
    description: '',
    internalNotes: '',
    dueDate: '',
    notificationChannel: '',
    autoRemind: true,
    autoFollowup: true,
  });

  useEffect(() => {
    loadData();
  }, [filterStatus, filterClientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterClientId) params.clientId = filterClientId;

      const [requestsRes, statsRes, clientsRes] = await Promise.all([
        api.get('/document-requests', { params }),
        api.get('/document-requests/stats'),
        api.get('/clients', { params: { limit: 1000 } }),
      ]);

      setRequests(requestsRes.data);
      setStats(statsRes.data);
      setClients(clientsRes.data.data || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.documentName.trim() || !formData.dueDate) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    try {
      const payload = {
        ...formData,
        notificationChannel: formData.notificationChannel || null,
      };

      if (editingRequest) {
        await api.put(`/document-requests/${editingRequest.id}`, payload);
        toast.success('Solicitação atualizada!');
      } else {
        await api.post('/document-requests', payload);
        toast.success('Solicitação criada!');
      }

      setShowModal(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error saving request:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar solicitação');
    }
  };

  const handleEdit = (request: DocumentRequest) => {
    setEditingRequest(request);
    setFormData({
      clientId: request.client.id,
      documentName: request.documentName,
      description: request.description || '',
      internalNotes: request.internalNotes || '',
      dueDate: format(parseISO(request.dueDate), 'yyyy-MM-dd'),
      notificationChannel: request.notificationChannel || '',
      autoRemind: request.autoRemind,
      autoFollowup: request.autoFollowup,
    });
    setShowModal(true);
    setActionMenuOpen(null);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta solicitação?')) return;

    try {
      await api.delete(`/document-requests/${id}`);
      toast.success('Solicitação cancelada!');
      loadData();
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast.error(error.response?.data?.error || 'Erro ao cancelar solicitação');
    }
    setActionMenuOpen(null);
  };

  const handleSendReminder = async (id: string) => {
    try {
      await api.post(`/document-requests/${id}/reminder`);
      toast.success('Lembrete enviado!');
      loadData();
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast.error(error.response?.data?.error || 'Erro ao enviar lembrete');
    }
    setActionMenuOpen(null);
  };

  const handleMarkAsReceived = async (id: string) => {
    try {
      await api.post(`/document-requests/${id}/received`, {});
      toast.success('Marcado como recebido!');
      loadData();
    } catch (error: any) {
      console.error('Error marking as received:', error);
      toast.error(error.response?.data?.error || 'Erro ao marcar como recebido');
    }
    setActionMenuOpen(null);
  };

  const resetForm = () => {
    setEditingRequest(null);
    setFormData({
      clientId: '',
      documentName: '',
      description: '',
      internalNotes: '',
      dueDate: '',
      notificationChannel: '',
      autoRemind: true,
      autoFollowup: true,
    });
  };

  const openNewModal = () => {
    resetForm();
    setShowModal(true);
  };

  const isOverdue = (dueDate: string, status: string) => {
    return isPast(parseISO(dueDate)) && !['RECEIVED', 'CANCELLED'].includes(status);
  };

  const filteredRequests = requests.filter((request) =>
    request.documentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary-600" />
              Solicitações de Documentos
            </h1>
            <p className="text-gray-600 dark:text-slate-400 mt-1">
              Solicite documentos aos clientes com prazo e envie lembretes automáticos
            </p>
          </div>
          <button
            onClick={openNewModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Nova Solicitação
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Total</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-yellow-200 dark:border-yellow-800">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Pendentes</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-red-200 dark:border-red-800">
              <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Vencidos</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600">{stats.received}</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Recebidos</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-500">{stats.cancelled}</div>
              <div className="text-sm text-gray-500 dark:text-slate-400">Cancelados</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Buscar por documento ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
                showFilters
                  ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-900/20 dark:border-primary-700 dark:text-primary-400'
                  : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <Filter size={20} />
              Filtros
            </button>
            <button
              onClick={loadData}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
            >
              <RefreshCw size={20} />
              Atualizar
            </button>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Todos</option>
                  <option value="PENDING">Pendente</option>
                  <option value="SENT">Enviado</option>
                  <option value="REMINDED">Lembrado</option>
                  <option value="RECEIVED">Recebido</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Cliente
                </label>
                <select
                  value={filterClientId}
                  onChange={(e) => setFilterClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Todos</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilterStatus('');
                    setFilterClientId('');
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-slate-400">Carregando...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-slate-400">
                {searchTerm || filterStatus || filterClientId
                  ? 'Nenhuma solicitação encontrada com os filtros aplicados'
                  : 'Nenhuma solicitação cadastrada'}
              </p>
              <button
                onClick={openNewModal}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                Criar primeira solicitação
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Prazo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Canal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Lembretes
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredRequests.map((request, index) => (
                    <tr
                      key={request.id}
                      className={`${
                        index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50 dark:bg-slate-800/50'
                      } hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {request.documentName}
                        </div>
                        {request.description && (
                          <div className="text-sm text-gray-500 dark:text-slate-400 truncate max-w-xs">
                            {request.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <span className="text-gray-900 dark:text-white">{request.client.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isOverdue(request.dueDate, request.status) ? (
                            <AlertTriangle size={16} className="text-red-500" />
                          ) : (
                            <Calendar size={16} className="text-gray-400" />
                          )}
                          <div>
                            <div
                              className={`text-sm ${
                                isOverdue(request.dueDate, request.status)
                                  ? 'text-red-600 font-medium'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {format(parseISO(request.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">
                              {formatDistanceToNow(parseISO(request.dueDate), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            statusColors[request.status]
                          }`}
                        >
                          {statusLabels[request.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {request.notificationChannel ? (
                          <span className="text-gray-600 dark:text-slate-400 flex items-center gap-1">
                            {channelIcons[request.notificationChannel]}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-600 dark:text-slate-400">
                          {request.reminderCount > 0 ? (
                            <span className="flex items-center gap-1">
                              <Clock size={14} />
                              {request.reminderCount}x
                            </span>
                          ) : (
                            '-'
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative">
                          <button
                            onClick={() =>
                              setActionMenuOpen(actionMenuOpen === request.id ? null : request.id)
                            }
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded"
                          >
                            <MoreHorizontal size={20} />
                          </button>

                          {actionMenuOpen === request.id && (
                            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-10">
                              {!['RECEIVED', 'CANCELLED'].includes(request.status) && (
                                <>
                                  <button
                                    onClick={() => handleEdit(request)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <Edit2 size={16} />
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleSendReminder(request.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <Send size={16} />
                                    Enviar Lembrete
                                  </button>
                                  <button
                                    onClick={() => handleMarkAsReceived(request.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <CheckCircle size={16} />
                                    Marcar Recebido
                                  </button>
                                  <hr className="my-1 border-gray-200 dark:border-slate-700" />
                                  <button
                                    onClick={() => handleCancel(request.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                  >
                                    <Trash2 size={16} />
                                    Cancelar
                                  </button>
                                </>
                              )}
                              {request.status === 'RECEIVED' && request.receivedDocument && (
                                <a
                                  href={request.receivedDocument.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                  <FileText size={16} />
                                  Ver Documento
                                </a>
                              )}
                              {request.status === 'CANCELLED' && (
                                <span className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400 block">
                                  Solicitação cancelada
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-slate-800 px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingRequest ? 'Editar Solicitação' : 'Nova Solicitação'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Cliente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Cliente *
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                    disabled={!!editingRequest}
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} {client.email ? `(${client.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Nome do Documento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Documento Solicitado *
                  </label>
                  <input
                    type="text"
                    value={formData.documentName}
                    onChange={(e) => setFormData({ ...formData, documentName: e.target.value })}
                    placeholder="Ex: Comprovante de Residência, RG, CTPS..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* Prazo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Prazo *
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detalhes sobre o documento solicitado..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Notas Internas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Notas Internas (opcional)
                  </label>
                  <textarea
                    value={formData.internalNotes}
                    onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                    placeholder="Observações internas (não visíveis ao cliente)..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {/* Canal de Notificação */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Canal de Notificação
                  </label>
                  <select
                    value={formData.notificationChannel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notificationChannel: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Não notificar</option>
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="BOTH">Email e WhatsApp</option>
                  </select>
                </div>

                {/* Automação */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoRemind}
                      onChange={(e) => setFormData({ ...formData, autoRemind: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-slate-300">
                      Lembrete automático
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.autoFollowup}
                      onChange={(e) => setFormData({ ...formData, autoFollowup: e.target.checked })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-slate-300">
                      Cobrança automática
                    </span>
                  </label>
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    {editingRequest ? 'Salvar' : 'Criar Solicitação'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default DocumentRequests;
