import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, X, Building2, Users, FileText, ToggleLeft, ToggleRight, Trash2, UserCog } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  cnpj?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  active: boolean;
  createdAt: string;
  _count: {
    users: number;
    clients: number;
    cases: number;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  active: boolean;
  createdAt: string;
}

interface UsersData {
  users: User[];
  breakdown: {
    total: number;
    admin: number;
    user: number;
    superAdmin: number;
  };
}

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [usersData, setUsersData] = useState<UsersData | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [formData, setFormData] = useState({
    companyName: '',
    cnpj: '',
    companyEmail: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    active: true,
  });

  useEffect(() => {
    loadCompanies();
  }, [search]);

  const loadCompanies = async () => {
    try {
      const response = await api.get('/companies', {
        params: { search, limit: 100 },
      });
      setCompanies(response.data.data);
    } catch (error) {
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      companyName: '',
      cnpj: '',
      companyEmail: '',
      adminName: '',
      adminEmail: '',
      adminPassword: '',
    });
    setEditFormData({
      name: '',
      cnpj: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      active: true,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/companies', formData);
      toast.success('Empresa criada com sucesso!');
      setShowModal(false);
      resetForm();
      loadCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar empresa');
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    try {
      await api.put(`/companies/${selectedCompany.id}`, editFormData);
      toast.success('Empresa atualizada com sucesso!');
      setShowModal(false);
      setEditMode(false);
      setSelectedCompany(null);
      resetForm();
      loadCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar empresa');
    }
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setEditFormData({
      name: company.name,
      cnpj: company.cnpj || '',
      email: company.email,
      phone: company.phone || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      zipCode: company.zipCode || '',
      active: company.active,
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleToggleActive = async (company: Company) => {
    try {
      await api.put(`/companies/${company.id}`, {
        ...company,
        active: !company.active,
      });
      toast.success(`Empresa ${!company.active ? 'ativada' : 'desativada'} com sucesso!`);
      loadCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao alterar status da empresa');
    }
  };

  const handleDeleteClick = (company: Company) => {
    setSelectedCompany(company);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCompany) return;

    try {
      const response = await api.delete(`/companies/${selectedCompany.id}`);

      const deletedCount = response.data.deletedItems;
      const message = `Empresa deletada! ${deletedCount.users} usuários, ${deletedCount.clients} clientes e ${deletedCount.cases} processos foram removidos.`;

      toast.success(message);
      setShowDeleteModal(false);
      setSelectedCompany(null);
      loadCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao deletar empresa');
    }
  };

  const handleNewCompany = () => {
    resetForm();
    setEditMode(false);
    setSelectedCompany(null);
    setShowModal(true);
  };

  const handleViewUsers = async (company: Company) => {
    setSelectedCompany(company);
    setShowUsersModal(true);
    setLoadingUsers(true);
    try {
      const response = await api.get(`/companies/${company.id}/users`);
      setUsersData(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao carregar usuários');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleUserActive = async (userId: string) => {
    if (!selectedCompany) return;

    try {
      await api.put(`/companies/${selectedCompany.id}/users/${userId}/toggle-active`);
      toast.success('Status do usuário atualizado!');
      // Recarregar lista de usuários
      const response = await api.get(`/companies/${selectedCompany.id}/users`);
      setUsersData(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao alterar status do usuário');
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      ADMIN: 'bg-primary-100 text-primary-800',
      USER: 'bg-neutral-100 text-neutral-800',
      SUPER_ADMIN: 'bg-purple-100 text-purple-800',
    };
    const labels = {
      ADMIN: 'Admin',
      USER: 'Usuário',
      SUPER_ADMIN: 'Super Admin',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badges[role as keyof typeof badges]}`}>
        {labels[role as keyof typeof labels]}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-neutral-900">Empresas</h1>
          <button
            onClick={handleNewCompany}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 min-h-[44px]"
          >
            <Plus size={20} />
            <span>Nova Empresa</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-4">
            <Search size={20} className="text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar empresas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
            />
          </div>

          {loading ? (
            <p className="text-center py-4">Carregando...</p>
          ) : companies.length === 0 ? (
            <p className="text-center py-4 text-neutral-600">Nenhuma empresa encontrada</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Empresa
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Contato
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Estatísticas
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-neutral-900">{company.name}</p>
                          {company.cnpj && <p className="text-xs text-neutral-500">CNPJ: {company.cnpj}</p>}
                          <p className="text-xs text-neutral-400">Criada em {formatDate(company.createdAt)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        <div>
                          <p>{company.email}</p>
                          {company.phone && <p className="text-xs text-neutral-500">{company.phone}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-neutral-600">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1" title="Usuários">
                            <Users size={14} className="text-neutral-400" />
                            <span>{company._count.users}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Clientes">
                            <Building2 size={14} className="text-neutral-400" />
                            <span>{company._count.clients}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Processos">
                            <FileText size={14} className="text-neutral-400" />
                            <span>{company._count.cases}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            company.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-error-100 text-error-800'
                          }`}
                        >
                          {company.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewUsers(company)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Ver Usuários"
                          >
                            <UserCog size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(company)}
                            className={`${company.active ? 'text-error-600 hover:text-error-800' : 'text-primary-600 hover:text-primary-800'} transition-colors`}
                            title={company.active ? 'Desativar' : 'Ativar'}
                          >
                            {company.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => handleEdit(company)}
                            className="text-primary-600 hover:text-primary-800 transition-colors"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(company)}
                            className="text-error-600 hover:text-error-800 transition-colors"
                            title="Deletar"
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

      {/* Modal Criar/Editar Empresa */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center min-h-[44px]">
              <h2 className="text-xl font-bold text-neutral-900">
                {editMode ? 'Editar Empresa' : 'Nova Empresa'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedCompany(null);
                  resetForm();
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={editMode ? handleUpdateSubmit : handleSubmit} className="p-6 space-y-4">
              {!editMode ? (
                <>
                  {/* Formulário de Criação */}
                  <div className="border-b border-neutral-200 pb-4">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-3">Dados da Empresa</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700">Nome da Empresa *</label>
                        <input
                          type="text"
                          required
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700">CNPJ</label>
                        <input
                          type="text"
                          value={formData.cnpj}
                          onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-sm font-medium text-neutral-700">Email da Empresa *</label>
                      <input
                        type="email"
                        required
                        value={formData.companyEmail}
                        onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-3">Administrador da Empresa</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700">Nome do Admin *</label>
                        <input
                          type="text"
                          required
                          value={formData.adminName}
                          onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700">Email do Admin *</label>
                        <input
                          type="email"
                          required
                          value={formData.adminEmail}
                          onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700">Senha do Admin *</label>
                        <input
                          type="password"
                          required
                          value={formData.adminPassword}
                          onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                          className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Formulário de Edição */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Nome da Empresa *</label>
                      <input
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">CNPJ</label>
                      <input
                        type="text"
                        value={editFormData.cnpj}
                        onChange={(e) => setEditFormData({ ...editFormData, cnpj: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Email *</label>
                      <input
                        type="email"
                        required
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Telefone</label>
                      <input
                        type="text"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700">Endereço</label>
                    <input
                      type="text"
                      value={editFormData.address}
                      onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                      className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Cidade</label>
                      <input
                        type="text"
                        value={editFormData.city}
                        onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">Estado</label>
                      <input
                        type="text"
                        value={editFormData.state}
                        onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700">CEP</label>
                      <input
                        type="text"
                        value={editFormData.zipCode}
                        onChange={(e) => setEditFormData({ ...editFormData, zipCode: e.target.value })}
                        className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={editFormData.active}
                      onChange={(e) => setEditFormData({ ...editFormData, active: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                    />
                    <label htmlFor="active" className="text-sm font-medium text-neutral-700">
                      Empresa Ativa
                    </label>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedCompany(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors min-h-[44px]"
                >
                  {editMode ? 'Atualizar' : 'Criar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-error-100 rounded-full mb-4">
              <Trash2 className="text-error-600" size={24} />
            </div>

            <h3 className="text-lg font-semibold text-neutral-900 text-center mb-2">
              Deletar Empresa?
            </h3>

            <p className="text-sm text-neutral-600 text-center mb-4">
              Você está prestes a deletar a empresa <strong>{selectedCompany.name}</strong>.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
              <p className="text-sm text-yellow-800 font-medium mb-2">⚠️ Atenção: Esta ação é IRREVERSÍVEL!</p>
              <p className="text-xs text-yellow-700">
                Serão deletados permanentemente:
              </p>
              <ul className="text-xs text-yellow-700 mt-2 space-y-1">
                <li>• {selectedCompany._count.users} usuário(s)</li>
                <li>• {selectedCompany._count.clients} cliente(s)</li>
                <li>• {selectedCompany._count.cases} processo(s)</li>
                <li>• Todos os dados relacionados (documentos, transações, etc.)</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedCompany(null);
                }}
                className="flex-1 px-4 py-2 border border-neutral-300 rounded-md text-neutral-700 hover:bg-neutral-50 transition-colors min-h-[44px]"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-error-600 text-neutral-900 rounded-md hover:bg-error-700 transition-colors min-h-[44px]"
              >
                Sim, Deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Usuários */}
      {showUsersModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Usuários da Empresa</h2>
                <p className="text-sm text-neutral-600 mt-1">{selectedCompany.name}</p>
                {usersData && (
                  <div className="flex gap-4 mt-2">
                    <span className="text-xs text-neutral-600">
                      <strong>{usersData.breakdown.admin}</strong> Admin(s)
                    </span>
                    <span className="text-xs text-neutral-600">
                      <strong>{usersData.breakdown.user}</strong> Usuário(s)
                    </span>
                    {usersData.breakdown.superAdmin > 0 && (
                      <span className="text-xs text-neutral-600">
                        <strong>{usersData.breakdown.superAdmin}</strong> Super Admin(s)
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowUsersModal(false);
                  setSelectedCompany(null);
                  setUsersData(null);
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              {loadingUsers ? (
                <p className="text-center py-8 text-neutral-600">Carregando usuários...</p>
              ) : usersData && usersData.users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-neutral-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                          Nome
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                          Função
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {usersData.users.map((user) => (
                        <tr key={user.id} className="hover:bg-neutral-50">
                          <td className="px-4 py-3 text-sm font-medium text-neutral-900">
                            {user.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-600">
                            {user.email}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {getRoleBadge(user.role)}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                user.active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-error-100 text-error-800'
                              }`}
                            >
                              {user.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {user.role !== 'SUPER_ADMIN' && (
                              <button
                                onClick={() => handleToggleUserActive(user.id)}
                                className={`${user.active ? 'text-error-600 hover:text-error-800' : 'text-green-600 hover:text-green-800'} transition-colors`}
                                title={user.active ? 'Desativar usuário' : 'Ativar usuário'}
                              >
                                {user.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                              </button>
                            )}
                            {user.role === 'SUPER_ADMIN' && (
                              <span className="text-xs text-neutral-400 italic">Protegido</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-8 text-neutral-600">Nenhum usuário encontrado</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Companies;
