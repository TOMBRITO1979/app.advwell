import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, X, Shield, Eye, Edit as EditIcon, Trash, EyeOff, ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react';
import { ActionsDropdown } from '../components/ui';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import { formatDate } from '../utils/dateFormatter';

interface Permission {
  id?: string;
  resource: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  hideSidebar: boolean;
  telegramChatId?: string;
  createdAt: string;
  permissions: Permission[];
  company?: {
    name: string;
  };
}

const AVAILABLE_RESOURCES = [
  // Principal
  { value: 'dashboard', label: 'Dashboard' },
  // Agenda
  { value: 'schedule', label: 'Agendamentos' },
  { value: 'todos', label: 'Tarefas' },
  { value: 'kanban', label: 'Kanban' },
  { value: 'hearings', label: 'Audiências' },
  { value: 'google-calendar', label: 'Google Calendar' },
  // Pessoas
  { value: 'clients', label: 'Clientes' },
  { value: 'adverses', label: 'Adversos' },
  { value: 'lawyers', label: 'Advogados' },
  { value: 'users', label: 'Usuários' },
  // Processos
  { value: 'cases', label: 'Processos Judiciais' },
  { value: 'pnj', label: 'PNJ' },
  { value: 'deadlines', label: 'Prazos' },
  { value: 'monitoring', label: 'Monitoramento' },
  { value: 'updates', label: 'Atualizações' },
  // Marketing
  { value: 'tags', label: 'Tags' },
  { value: 'leads', label: 'Leads' },
  { value: 'lead-analytics', label: 'Analytics Leads' },
  { value: 'campaigns', label: 'Campanhas Email' },
  { value: 'whatsapp-campaigns', label: 'Campanhas WhatsApp' },
  // Financeiro
  { value: 'financial', label: 'Fluxo de Caixa' },
  { value: 'accounts-payable', label: 'Contas a Pagar' },
  { value: 'cost-centers', label: 'Centros de Custo' },
  { value: 'client-subscriptions', label: 'Planos de Clientes' },
  { value: 'subscription', label: 'Assinatura' },
  // Documentos
  { value: 'legal-documents', label: 'Documentos Jurídicos' },
  { value: 'documents', label: 'Uploads' },
  { value: 'reports', label: 'Relatórios' },
  // Portal e Comunicação
  { value: 'announcements', label: 'Portal do Cliente' },
  { value: 'chatwell', label: 'Chatwell' },
  // Configurações (Admin)
  { value: 'settings', label: 'Configurações' },
  { value: 'stripe-config', label: 'Config. Stripe' },
  { value: 'smtp-settings', label: 'Config. SMTP' },
  { value: 'whatsapp-settings', label: 'Config. WhatsApp' },
  { value: 'backup-settings', label: 'Config. Backup' },
  { value: 'ai-config', label: 'Config. IA' },
  { value: 'google-calendar-config', label: 'Config. Google Cal.' },
  // Segurança e Compliance
  { value: 'lgpd-requests', label: 'Solicitações LGPD' },
  { value: 'audit-logs', label: 'Logs de Auditoria' },
  // Ajuda
  { value: 'manual', label: 'Manual' },
];

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    hideSidebar: false,
    telegramChatId: '',
  });

  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    loadUsers();
  }, [search, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users', {
        params: { search, page, limit },
      });
      setUsers(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      hideSidebar: false,
      telegramChatId: '',
    });
    setPermissions([]);
    setMakeAdmin(false);
    setShowPassword(false);
  };

  // Função para conceder todas as permissões
  const handleGrantAllPermissions = () => {
    const allPermissions: Permission[] = AVAILABLE_RESOURCES.map(resource => ({
      resource: resource.value,
      canView: true,
      canEdit: true,
      canDelete: true,
    }));
    setPermissions(allPermissions);
    toast.success('Todas as permissões concedidas!');
  };

  // Função para remover todas as permissões
  const handleRemoveAllPermissions = () => {
    setPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Montar payload - não enviar permissions quando é ADMIN para preservar permissões existentes
      const payload: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        hideSidebar: formData.hideSidebar,
        telegramChatId: formData.telegramChatId || null,
        role: makeAdmin ? 'ADMIN' : 'USER',
      };
      // Só enviar permissions se não for ADMIN
      if (!makeAdmin) {
        payload.permissions = permissions;
      }
      await api.post('/users', payload);
      toast.success('Usuário criado com sucesso!');
      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData?.details && Array.isArray(errorData.details)) {
        // Mostrar erros de validação detalhados
        const messages = errorData.details.map((d: any) => d.msg).join('\n');
        toast.error(messages, { duration: 6000 });
      } else {
        toast.error(errorData?.error || 'Erro ao criar usuário');
      }
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      // Montar payload - não enviar permissions quando é ADMIN para preservar permissões existentes
      const payload: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        active: selectedUser.active,
        hideSidebar: formData.hideSidebar,
        telegramChatId: formData.telegramChatId || null,
        role: makeAdmin ? 'ADMIN' : 'USER',
      };
      // Só enviar permissions se não for ADMIN
      if (!makeAdmin) {
        payload.permissions = permissions;
      }
      await api.put(`/users/${selectedUser.id}`, payload);
      toast.success('Usuário atualizado com sucesso!');
      setShowModal(false);
      setEditMode(false);
      setSelectedUser(null);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar usuário');
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      hideSidebar: user.hideSidebar || false,
      telegramChatId: user.telegramChatId || '',
    });
    setPermissions(user.permissions || []);
    setMakeAdmin(user.role === 'ADMIN');
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`Tem certeza que deseja desativar o usuário "${user.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/users/${user.id}`);
      toast.success('Usuário desativado com sucesso!');
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao desativar usuário');
    }
  };

  const handleNewUser = () => {
    resetForm();
    setEditMode(false);
    setSelectedUser(null);
    setShowModal(true);
  };

  const handleAddPermission = () => {
    setPermissions([
      ...permissions,
      {
        resource: 'clients',
        canView: false,
        canEdit: false,
        canDelete: false,
      },
    ]);
  };

  const handleRemovePermission = (index: number) => {
    setPermissions(permissions.filter((_, i) => i !== index));
  };

  const handlePermissionChange = (index: number, field: keyof Permission, value: any) => {
    const newPermissions = [...permissions];
    newPermissions[index] = { ...newPermissions[index], [field]: value };
    setPermissions(newPermissions);
  };

  const getPermissionSummary = (userPermissions: Permission[]) => {
    if (!userPermissions || userPermissions.length === 0) {
      return 'Sem permissões';
    }
    return `${userPermissions.length} recurso(s)`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">Usuários</h1>
          <button
            onClick={handleNewUser}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-success-100 text-success-700 border border-success-200 hover:bg-success-200 font-medium rounded-lg transition-all duration-200"
          >
            <Plus size={20} />
            <span>Novo Usuário</span>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Search size={20} className="text-neutral-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
            />
          </div>

          {loading ? (
            <p className="text-center py-4">Carregando...</p>
          ) : users.length === 0 ? (
            <p className="text-center py-4 text-neutral-600 dark:text-slate-400">Nenhum usuário encontrado</p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                <MobileCardList
                  items={users.map((user): MobileCardItem => ({
                    id: user.id,
                    title: user.name,
                    subtitle: user.email,
                    badge: {
                      text: user.active ? 'Ativo' : 'Inativo',
                      color: user.active ? 'green' : 'red',
                    },
                    fields: [
                      { label: 'Empresa', value: user.company?.name || '-' },
                      { label: 'Perfil', value: user.role === 'ADMIN' ? 'Administrador' : user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Usuário' },
                      { label: 'Permissões', value: getPermissionSummary(user.permissions) },
                      { label: 'Criado em', value: formatDate(user.createdAt) || '-' },
                    ],
                    onEdit: user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' ? () => handleEdit(user) : undefined,
                    onDelete: user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN' ? () => handleDelete(user) : undefined,
                  }))}
                  emptyMessage="Nenhum usuário encontrado"
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Usuário
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Empresa
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Permissões
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {users.map((user) => (
                      <tr key={user.id} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-slate-800 dark:even:bg-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors">
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <p className="font-medium text-neutral-900 dark:text-slate-100">{user.name}</p>
                            {user.role === 'ADMIN' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 mt-1">
                                <Shield size={16} className="mr-1" />
                                Administrador
                              </span>
                            )}
                            <p className="text-xs text-neutral-400 dark:text-slate-500">Criado em {formatDate(user.createdAt)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                          {user.company?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600 dark:text-slate-400">
                          <span className="text-xs bg-neutral-100 px-2 py-1 rounded dark:bg-slate-600">
                            {getPermissionSummary(user.permissions)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.active
                                ? 'bg-success-100 text-success-800'
                                : 'bg-error-100 text-error-800'
                            }`}
                          >
                            {user.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <ActionsDropdown
                            actions={[
                              { label: 'Editar', icon: <Edit size={16} />, onClick: () => handleEdit(user), variant: 'primary', disabled: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' },
                              { label: 'Desativar', icon: <Trash2 size={16} />, onClick: () => handleDelete(user), variant: 'danger', disabled: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination */}
          {!loading && users.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t border-neutral-200 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-slate-400">
                <span>Exibindo {users.length} de {total} usuários</span>
                <span className="text-neutral-400 dark:text-slate-500">|</span>
                <span>Por página:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md text-sm min-h-[36px]"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                  className="inline-flex items-center justify-center p-2 min-h-[36px] min-w-[36px] bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md text-neutral-600 dark:text-slate-400 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
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
                        className={`inline-flex items-center justify-center min-h-[36px] min-w-[36px] px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-primary-100 text-primary-700 border border-primary-200'
                            : 'border border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                  className="inline-flex items-center justify-center p-2 min-h-[36px] min-w-[36px] bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md text-neutral-600 dark:text-slate-400 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar/Editar Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-neutral-200 dark:border-slate-700 px-6 py-4 flex justify-between items-center min-h-[44px]">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-slate-100">
                {editMode ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedUser(null);
                  resetForm();
                }}
                className="text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={editMode ? handleUpdateSubmit : handleSubmit} className="p-6 space-y-6">
              {/* Dados do Usuário */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Dados do Usuário</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300">Nome <span className="text-error-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300">Email <span className="text-error-500">*</span></label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md min-h-[44px]"
                    />
                  </div>

                  {!editMode && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300">Senha <span className="text-error-500">*</span></label>
                      <div className="relative mt-1">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={12}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="block w-full px-3 py-2 pr-10 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md min-h-[44px]"
                          placeholder="Mínimo 12 caracteres"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 dark:text-slate-500 dark:hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                        Mínimo 12 caracteres, com maiúscula, minúscula, número e símbolo (!@#$%...)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Configurações de Interface */}
              <div className="border-t border-neutral-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Configurações de Interface</h3>
                <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-slate-700 rounded-md">
                  <input
                    type="checkbox"
                    id="hideSidebar"
                    checked={formData.hideSidebar}
                    onChange={(e) => setFormData({ ...formData, hideSidebar: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-slate-600 rounded"
                  />
                  <label htmlFor="hideSidebar" className="flex items-center gap-2 text-sm text-neutral-700 dark:text-slate-300">
                    <EyeOff size={16} />
                    <span>Esconder sidebar para este usuário</span>
                  </label>
                </div>
                <p className="text-xs text-neutral-500 dark:text-slate-400 mt-2">
                  Quando ativado, a barra lateral de navegação não será exibida para este usuário.
                </p>
              </div>

              {/* Telegram */}
              <div>
                <label htmlFor="telegramChatId" className="block text-sm font-medium text-neutral-700 dark:text-slate-300">
                  Telegram Chat ID (opcional)
                </label>
                <input
                  type="text"
                  id="telegramChatId"
                  value={formData.telegramChatId}
                  onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                  placeholder="Ex: 123456789"
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md min-h-[44px]"
                />
                <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                  Receberá notificações de eventos/tarefas via Telegram
                </p>
              </div>

              {/* Tornar Administrador */}
              <div className="border-t border-neutral-200 dark:border-slate-700 pt-6">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Nível de Acesso</h3>
                <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                  <input
                    type="checkbox"
                    id="makeAdmin"
                    checked={makeAdmin}
                    onChange={(e) => setMakeAdmin(e.target.checked)}
                    className="h-5 w-5 text-amber-600 focus:ring-amber-500 border-amber-300 dark:border-amber-600 rounded"
                  />
                  <label htmlFor="makeAdmin" className="flex-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                      <Shield size={18} />
                      Tornar Administrador
                    </span>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Administradores têm acesso total a todos os recursos da empresa. Não é necessário configurar permissões individuais.
                    </p>
                  </label>
                </div>
              </div>

              {/* Permissões - só mostra se não for admin */}
              {!makeAdmin && (
              <div className="border-t border-neutral-200 dark:border-slate-700 pt-6">
                <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100">Permissões</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGrantAllPermissions}
                      className="flex items-center gap-1 text-green-600 hover:text-green-800 text-sm font-medium px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded"
                    >
                      <CheckSquare size={16} />
                      <span>Conceder Todas</span>
                    </button>
                    {permissions.length > 0 && (
                      <button
                        type="button"
                        onClick={handleRemoveAllPermissions}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 bg-red-50 dark:bg-red-900/20 rounded"
                      >
                        <X size={16} />
                        <span>Remover Todas</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddPermission}
                      className="flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm font-medium px-2 py-1 bg-primary-50 dark:bg-primary-900/20 rounded"
                    >
                      <Plus size={16} />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>

                {permissions.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-slate-400 text-center py-4 bg-neutral-50 dark:bg-slate-700 rounded-md">
                    Nenhuma permissão configurada. Clique em "Conceder Todas" ou "Adicionar" para conceder acesso.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {permissions.map((permission, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-neutral-50 dark:bg-slate-700 rounded-md">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 dark:text-slate-300 mb-1">Recurso</label>
                            <select
                              value={permission.resource}
                              onChange={(e) => handlePermissionChange(index, 'resource', e.target.value)}
                              className="block w-full px-2 py-1 text-sm bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md min-h-[44px]"
                            >
                              {AVAILABLE_RESOURCES.map((res) => (
                                <option key={res.value} value={res.value}>
                                  {res.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`view-${index}`}
                              checked={permission.canView}
                              onChange={(e) => handlePermissionChange(index, 'canView', e.target.checked)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-slate-600 rounded"
                            />
                            <label htmlFor={`view-${index}`} className="text-sm text-neutral-700 dark:text-slate-300 flex items-center">
                              <Eye size={14} className="mr-1" />
                              Visualizar
                            </label>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`edit-${index}`}
                              checked={permission.canEdit}
                              onChange={(e) => handlePermissionChange(index, 'canEdit', e.target.checked)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-slate-600 rounded"
                            />
                            <label htmlFor={`edit-${index}`} className="text-sm text-neutral-700 dark:text-slate-300 flex items-center">
                              <EditIcon size={14} className="mr-1" />
                              Editar
                            </label>
                          </div>

                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`delete-${index}`}
                              checked={permission.canDelete}
                              onChange={(e) => handlePermissionChange(index, 'canDelete', e.target.checked)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 dark:border-slate-600 rounded"
                            />
                            <label htmlFor={`delete-${index}`} className="text-sm text-neutral-700 dark:text-slate-300 flex items-center">
                              <Trash size={14} className="mr-1" />
                              Excluir
                            </label>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePermission(index)}
                          className="text-error-600 hover:text-error-800 mt-5"
                          title="Remover permissão"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedUser(null);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 transition-colors min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-100 text-primary-700 border border-primary-200 rounded-md hover:bg-primary-200 transition-colors min-h-[44px]"
                >
                  {editMode ? 'Atualizar' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Users;
