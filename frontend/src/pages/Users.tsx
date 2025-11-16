import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, X, Shield, Eye, Edit as EditIcon, Trash } from 'lucide-react';

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
  createdAt: string;
  permissions: Permission[];
}

const AVAILABLE_RESOURCES = [
  { value: 'clients', label: 'Clientes' },
  { value: 'cases', label: 'Processos' },
  { value: 'updates', label: 'Atualizações' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'documents', label: 'Documentos' },
  { value: 'users', label: 'Usuários' },
  { value: 'settings', label: 'Configurações' },
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
    });
    setPermissions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', {
        ...formData,
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
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
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <button
            onClick={handleNewUser}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
          >
            <Plus size={20} />
            <span>Novo Usuário</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Search size={20} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {loading ? (
            <p className="text-center py-4">Carregando...</p>
          ) : users.length === 0 ? (
            <p className="text-center py-4 text-gray-600">Nenhum usuário encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Usuário
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Permissões
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          {user.role === 'ADMIN' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 mt-1">
                              <Shield size={12} className="mr-1" />
                              Administrador
                            </span>
                          )}
                          <p className="text-xs text-gray-400">Criado em {formatDate(user.createdAt)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {getPermissionSummary(user.permissions)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {user.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="Editar"
                            disabled={user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'}
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            className="text-red-600 hover:text-red-800 transition-colors"
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
          )}
        </div>
      </div>

      {/* Modal Criar/Editar Usuário */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editMode ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedUser(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={editMode ? handleUpdateSubmit : handleSubmit} className="p-6 space-y-6">
              {/* Dados do Usuário */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Dados do Usuário</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nome *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  {!editMode && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Senha *</label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Permissões */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Permissões</h3>
                  <button
                    type="button"
                    onClick={handleAddPermission}
                    className="flex items-center space-x-1 text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    <Plus size={16} />
                    <span>Adicionar Permissão</span>
                  </button>
                </div>

                {permissions.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-md">
                    Nenhuma permissão configurada. Clique em "Adicionar Permissão" para conceder acesso.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {permissions.map((permission, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Recurso</label>
                            <select
                              value={permission.resource}
                              onChange={(e) => handlePermissionChange(index, 'resource', e.target.value)}
                              className="block w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                            >
                              {AVAILABLE_RESOURCES.map((res) => (
                                <option key={res.value} value={res.value}>
                                  {res.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`view-${index}`}
                              checked={permission.canView}
                              onChange={(e) => handlePermissionChange(index, 'canView', e.target.checked)}
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`view-${index}`} className="text-sm text-gray-700 flex items-center">
                              <Eye size={14} className="mr-1" />
                              Visualizar
                            </label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`edit-${index}`}
                              checked={permission.canEdit}
                              onChange={(e) => handlePermissionChange(index, 'canEdit', e.target.checked)}
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`edit-${index}`} className="text-sm text-gray-700 flex items-center">
                              <EditIcon size={14} className="mr-1" />
                              Editar
                            </label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`delete-${index}`}
                              checked={permission.canDelete}
                              onChange={(e) => handlePermissionChange(index, 'canDelete', e.target.checked)}
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <label htmlFor={`delete-${index}`} className="text-sm text-gray-700 flex items-center">
                              <Trash size={14} className="mr-1" />
                              Excluir
                            </label>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemovePermission(index)}
                          className="text-red-600 hover:text-red-800 mt-5"
                          title="Remover permissão"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedUser(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
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
