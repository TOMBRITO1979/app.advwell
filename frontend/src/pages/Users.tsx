import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, X, Shield, Eye, Edit as EditIcon, Trash, EyeOff } from 'lucide-react';
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
  createdAt: string;
  permissions: Permission[];
}

const AVAILABLE_RESOURCES = [
  // Principal
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'schedule', label: 'Agenda' },
  { value: 'clients', label: 'Clientes' },
  { value: 'cases', label: 'Processos' },
  { value: 'pnj', label: 'PNJ' },
  { value: 'deadlines', label: 'Prazos' },
  { value: 'hearings', label: 'Audiências' },
  { value: 'updates', label: 'Atualizações' },
  { value: 'legal-documents', label: 'Documentos' },
  { value: 'documents', label: 'Uploads' },
  { value: 'todos', label: 'Tarefas' },
  { value: 'leads', label: 'Leads' },
  { value: 'tags', label: 'Tags' },
  // Marketing
  { value: 'campaigns', label: 'Campanhas Email' },
  { value: 'whatsapp-campaigns', label: 'Campanhas WhatsApp' },
  { value: 'announcements', label: 'Avisos' },
  // Financeiro
  { value: 'financial', label: 'Financeiro' },
  { value: 'accounts-payable', label: 'Contas a Pagar' },
  { value: 'client-subscriptions', label: 'Planos de Clientes' },
  // Integrações
  { value: 'google-calendar', label: 'Google Calendar' },
  // Administração
  { value: 'users', label: 'Usuários' },
  // Configurações
  { value: 'stripe-config', label: 'Config. Stripe' },
  { value: 'smtp-settings', label: 'Config. SMTP' },
  { value: 'whatsapp-settings', label: 'Config. WhatsApp' },
  { value: 'backup-settings', label: 'Config. Backup' },
  { value: 'ai-config', label: 'Config. IA' },
  { value: 'google-calendar-config', label: 'Config. Google Cal.' },
  { value: 'settings', label: 'Configurações' },
  // Segurança e Compliance
  { value: 'lgpd-requests', label: 'Solicitações LGPD' },
  { value: 'audit-logs', label: 'Logs de Auditoria' },
  { value: 'subscription', label: 'Assinatura' },
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
  });

  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    loadUsers();
  }, [search]);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users', {
        params: { search, limit: 100 },
      });
      setUsers(response.data.data);
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
    });
    setPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        hideSidebar: formData.hideSidebar,
        permissions,
      });
      toast.success('Usuário criado com sucesso!');
      setShowModal(false);
      resetForm();
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar usuário');
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await api.put(`/users/${selectedUser.id}`, {
        name: formData.name,
        email: formData.email,
        active: selectedUser.active,
        hideSidebar: formData.hideSidebar,
        permissions,
      });
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
    });
    setPermissions(user.permissions || []);
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
          <h1 className="text-2xl font-bold text-neutral-900">Usuários</h1>
          <button
            onClick={handleNewUser}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-success-100 text-success-700 border border-success-200 hover:bg-success-200 font-medium rounded-lg transition-all duration-200"
          >
            <Plus size={20} />
            <span>Novo Usuário</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-4">
            <Search size={20} className="text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
            />
          </div>

          {loading ? (
            <p className="text-center py-4">Carregando...</p>
          ) : users.length === 0 ? (
            <p className="text-center py-4 text-neutral-600">Nenhum usuário encontrado</p>
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
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">
                        Usuário
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">
                        Permissões
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {users.map((user) => (
                      <tr key={user.id} className="odd:bg-white even:bg-neutral-50 hover:bg-success-100 transition-colors">
                        <td className="px-4 py-3 text-sm">
                          <div>
                            <p className="font-medium text-neutral-900">{user.name}</p>
                            {user.role === 'ADMIN' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 mt-1">
                                <Shield size={16} className="mr-1" />
                                Administrador
                              </span>
                            )}
                            <p className="text-xs text-neutral-400">Criado em {formatDate(user.createdAt)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {user.email}
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          <span className="text-xs bg-neutral-100 px-2 py-1 rounded">
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
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Editar"
                              disabled={user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'}
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(user)}
                              className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-error-600 hover:text-error-700 hover:bg-error-50 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Desativar"
                              disabled={user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'}
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
      </div>

      {/* Modal Criar/Editar Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center min-h-[44px]">
              <h2 className="text-xl font-bold text-neutral-900">
                {editMode ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedUser(null);
                  resetForm();
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={editMode ? handleUpdateSubmit : handleSubmit} className="p-6 space-y-6">
              {/* Dados do Usuário */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Dados do Usuário</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Nome <span className="text-error-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Email <span className="text-error-500">*</span></label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                    />
                  </div>

                  {!editMode && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Senha <span className="text-error-500">*</span></label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Configurações de Interface */}
              <div className="border-t border-neutral-200 pt-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Configurações de Interface</h3>
                <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-md">
                  <input
                    type="checkbox"
                    id="hideSidebar"
                    checked={formData.hideSidebar}
                    onChange={(e) => setFormData({ ...formData, hideSidebar: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                  />
                  <label htmlFor="hideSidebar" className="flex items-center gap-2 text-sm text-neutral-700">
                    <EyeOff size={16} />
                    <span>Esconder sidebar para este usuário</span>
                  </label>
                </div>
                <p className="text-xs text-neutral-500 mt-2">
                  Quando ativado, a barra lateral de navegação não será exibida para este usuário.
                </p>
              </div>

              {/* Permissões */}
              <div className="border-t border-neutral-200 pt-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-neutral-900">Permissões</h3>
                  <button
                    type="button"
                    onClick={handleAddPermission}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-800 text-sm font-medium"
                  >
                    <Plus size={16} />
                    <span>Adicionar Permissão</span>
                  </button>
                </div>

                {permissions.length === 0 ? (
                  <p className="text-sm text-neutral-500 text-center py-4 bg-neutral-50 rounded-md">
                    Nenhuma permissão configurada. Clique em "Adicionar Permissão" para conceder acesso.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {permissions.map((permission, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-md">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-neutral-700 mb-1">Recurso</label>
                            <select
                              value={permission.resource}
                              onChange={(e) => handlePermissionChange(index, 'resource', e.target.value)}
                              className="block w-full px-2 py-1 text-sm border border-neutral-300 rounded-md min-h-[44px]"
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
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                            />
                            <label htmlFor={`view-${index}`} className="text-sm text-neutral-700 flex items-center">
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
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                            />
                            <label htmlFor={`edit-${index}`} className="text-sm text-neutral-700 flex items-center">
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
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                            />
                            <label htmlFor={`delete-${index}`} className="text-sm text-neutral-700 flex items-center">
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

              <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedUser(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors min-h-[44px]"
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
