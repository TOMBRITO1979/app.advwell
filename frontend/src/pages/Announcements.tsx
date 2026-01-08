import { useEffect, useState } from 'react';
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  X,
  Calendar,
  Users,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';

interface Client {
  id: string;
  name: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  active: boolean;
  publishedAt: string;
  expiresAt: string | null;
  clientId: string | null;
  client: Client | null;
  creator: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

const priorityOptions = [
  { value: 'LOW', label: 'Baixa', color: 'bg-gray-100 text-gray-700', icon: CheckCircle },
  { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-700', icon: Info },
  { value: 'HIGH', label: 'Alta', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  { value: 'URGENT', label: 'Urgente', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
];

const getPriorityConfig = (priority: string) => {
  return priorityOptions.find(p => p.value === priority) || priorityOptions[1];
};

export default function Announcements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    active: true,
    expiresAt: '',
    clientId: '',
  });

  useEffect(() => {
    loadAnnouncements();
    loadClients();
  }, [page, limit]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const loadClients = async () => {
    try {
      const response = await api.get('/clients?limit=1000');
      setClients(response.data.data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadAnnouncements = async () => {
    try {
      const response = await api.get('/announcements', {
        params: { page, limit }
      });
      setAnnouncements(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Erro ao carregar avisos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        expiresAt: formData.expiresAt || null,
        clientId: formData.clientId || null,
      };

      if (editingAnnouncement) {
        await api.put(`/announcements/${editingAnnouncement.id}`, data);
        toast.success('Aviso atualizado com sucesso');
      } else {
        await api.post('/announcements', data);
        toast.success('Aviso criado com sucesso');
      }
      closeModal();
      loadAnnouncements();
    } catch (error) {
      toast.error('Erro ao salvar aviso');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/announcements/${id}/toggle`);
      toast.success('Status alterado');
      loadAnnouncements();
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este aviso?')) return;
    try {
      await api.delete(`/announcements/${id}`);
      toast.success('Aviso excluído');
      loadAnnouncements();
    } catch (error) {
      toast.error('Erro ao excluir aviso');
    }
  };

  const openModal = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority,
        active: announcement.active,
        expiresAt: announcement.expiresAt ? announcement.expiresAt.split('T')[0] : '',
        clientId: announcement.clientId || '',
      });
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        content: '',
        priority: 'NORMAL',
        active: true,
        expiresAt: '',
        clientId: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAnnouncement(null);
  };

  const filteredAnnouncements = announcements.filter(a => {
    if (filter === 'active') return a.active;
    if (filter === 'inactive') return !a.active;
    return true;
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Avisos do Portal</h1>
            <p className="text-gray-500">Gerencie os avisos exibidos para seus clientes no portal</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={20} />
            Novo Aviso
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'active', label: 'Ativos' },
            { value: 'inactive', label: 'Inativos' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setFilter(item.value as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === item.value
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Megaphone className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum aviso</h3>
            <p className="text-gray-500 mb-4">
              Crie avisos para informar seus clientes sobre novidades e atualizações.
            </p>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Plus size={20} />
              Criar Primeiro Aviso
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map((announcement) => {
              const priority = getPriorityConfig(announcement.priority);
              const PriorityIcon = priority.icon;
              return (
                <div
                  key={announcement.id}
                  className={`bg-white rounded-xl shadow-sm border p-6 ${
                    !announcement.active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${priority.color}`}>
                          <PriorityIcon size={14} />
                          {priority.label}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          announcement.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {announcement.active ? 'Ativo' : 'Inativo'}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          announcement.client
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-cyan-100 text-cyan-700'
                        }`}>
                          {announcement.client ? (
                            <>
                              <User size={14} />
                              {announcement.client.name}
                            </>
                          ) : (
                            <>
                              <Users size={14} />
                              Todos
                            </>
                          )}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {announcement.title}
                      </h3>
                      <div
                        className="text-gray-600 text-sm line-clamp-2 mb-3"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(announcement.content.substring(0, 200))
                        }}
                      />
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {format(new Date(announcement.publishedAt), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {announcement.expiresAt && (
                          <span>
                            Expira: {format(new Date(announcement.expiresAt), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                        <span>por {announcement.creator.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(announcement.id)}
                        className={`p-2 rounded-lg hover:bg-gray-100 ${
                          announcement.active ? 'text-green-600' : 'text-gray-400'
                        }`}
                        title={announcement.active ? 'Desativar' : 'Ativar'}
                      >
                        {announcement.active ? <Eye size={20} /> : <EyeOff size={20} />}
                      </button>
                      <button
                        onClick={() => openModal(announcement)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        title="Editar"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                        title="Excluir"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl shadow-sm border border-gray-100 px-6 py-4">
            <p className="text-sm text-gray-600">
              Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} avisos
            </p>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span className="text-sm text-gray-600">por página</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 py-2 text-sm font-medium">
                Página {page} de {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                disabled={page >= Math.ceil(total / limit)}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-xl font-semibold">
                  {editingAnnouncement ? 'Editar Aviso' : 'Novo Aviso'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Título do aviso"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conteúdo *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Conteúdo do aviso..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prioridade
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      {priorityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data de Expiração (opcional)
                    </label>
                    <input
                      type="date"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Destinatário
                  </label>
                  <select
                    value={formData.clientId}
                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Todos os clientes</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Selecione um cliente específico ou deixe em branco para todos
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="active" className="text-sm text-gray-700">
                    Publicar imediatamente (aviso ativo)
                  </label>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    {editingAnnouncement ? 'Salvar Alterações' : 'Criar Aviso'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
