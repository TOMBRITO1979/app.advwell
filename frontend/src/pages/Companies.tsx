import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, X, Building2, Users, FileText, ToggleLeft, ToggleRight, Trash2, UserCog, Crown, Clock, DollarSign } from 'lucide-react';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import { formatDate, formatDateTime } from '../utils/dateFormatter';

interface Company {
  id: string;
  name: string;
  subdomain?: string;
  cnpj?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  active: boolean;
  createdAt: string;
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | null;
  subscriptionPlan: 'BRONZE' | 'PRATA' | 'OURO' | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  casesLimit: number | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
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

interface LastPaymentData {
  companyId: string;
  companyName: string;
  hasPayments: boolean;
  lastPayment: {
    lastPaymentDate: string | null;
    lastPaymentAmount: number | null;
    lastPaymentCurrency: string | null;
    lastPaymentStatus: string | null;
  } | null;
}

const Companies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [usersData, setUsersData] = useState<UsersData | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [lastPaymentData, setLastPaymentData] = useState<LastPaymentData | null>(null);
  const [loadingLastPayment, setLoadingLastPayment] = useState(false);
  const [subscriptionForm, setSubscriptionForm] = useState({
    subscriptionStatus: '' as 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | '',
    subscriptionPlan: '' as 'BRONZE' | 'PRATA' | 'OURO' | '',
    casesLimit: 1000,
  });

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
    subdomain: '',
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
      subdomain: '',
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
      subdomain: company.subdomain || '',
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
      SUPER_ADMIN: 'bg-primary-100 text-primary-800',
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

  // Wrapper que retorna '-' para datas vazias
  const formatDateTimeDisplay = (dateString: string | null) => formatDateTime(dateString) || '-';

  const getSubscriptionBadge = (status: string | null) => {
    const badges: Record<string, string> = {
      TRIAL: 'bg-blue-100 text-blue-800',
      ACTIVE: 'bg-green-100 text-green-800',
      EXPIRED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      TRIAL: 'Trial',
      ACTIVE: 'Ativa',
      EXPIRED: 'Expirada',
      CANCELLED: 'Cancelada',
    };
    if (!status) {
      return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">-</span>;
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPlanBadge = (plan: string | null) => {
    const badges: Record<string, string> = {
      BRONZE: 'bg-amber-100 text-amber-800',
      PRATA: 'bg-gray-200 text-gray-800',
      OURO: 'bg-yellow-100 text-yellow-800',
    };
    if (!plan) return <span className="text-xs text-gray-400">-</span>;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[plan] || 'bg-gray-100'}`}>
        {plan}
      </span>
    );
  };

  const handleEditSubscription = async (company: Company) => {
    setSelectedCompany(company);
    setSubscriptionForm({
      subscriptionStatus: company.subscriptionStatus || '',
      subscriptionPlan: company.subscriptionPlan || '',
      casesLimit: company.casesLimit || 1000,
    });
    setLastPaymentData(null);
    setShowSubscriptionModal(true);

    // Buscar último pagamento do Stripe
    if (company.stripeCustomerId) {
      setLoadingLastPayment(true);
      try {
        const response = await api.get(`/companies/${company.id}/last-payment`);
        setLastPaymentData(response.data);
      } catch (error) {
        console.error('Error fetching last payment:', error);
      } finally {
        setLoadingLastPayment(false);
      }
    }
  };

  const handleUpdateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCompany) return;

    try {
      await api.put(`/companies/${selectedCompany.id}/subscription`, {
        subscriptionStatus: subscriptionForm.subscriptionStatus || null,
        subscriptionPlan: subscriptionForm.subscriptionPlan || null,
        casesLimit: subscriptionForm.casesLimit,
      });
      toast.success('Assinatura atualizada com sucesso!');
      setShowSubscriptionModal(false);
      setSelectedCompany(null);
      loadCompanies();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao atualizar assinatura');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-neutral-900">Empresas</h1>
          <button
            onClick={handleNewCompany}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-success-100 text-success-700 border border-success-200 hover:bg-success-200 font-medium rounded-lg transition-all duration-200"
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
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                <MobileCardList
                  items={companies.map((company): MobileCardItem => ({
                    id: company.id,
                    title: company.name,
                    subtitle: company.cnpj ? `CNPJ: ${company.cnpj}` : company.email,
                    badge: {
                      text: company.active ? 'Ativa' : 'Inativa',
                      color: company.active ? 'green' : 'red',
                    },
                    fields: [
                      { label: 'Assinatura', value: company.subscriptionStatus || '-' },
                      { label: 'Plano', value: company.subscriptionPlan || '-' },
                      { label: 'Usuarios', value: String(company._count.users) },
                      { label: 'Clientes', value: String(company._count.clients) },
                      { label: 'Processos', value: String(company._count.cases) },
                      { label: 'Criada em', value: formatDate(company.createdAt) || '-' },
                    ],
                    onEdit: () => handleEdit(company),
                    onDelete: () => handleDeleteClick(company),
                  }))}
                  emptyMessage="Nenhuma empresa encontrada"
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">
                      Empresa
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">
                      Assinatura
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">
                      Estatísticas
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
                  {companies.map((company) => (
                    <tr key={company.id} className="odd:bg-white even:bg-neutral-50 hover:bg-success-100 transition-colors">
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="font-medium text-neutral-900">{company.name}</p>
                          {company.cnpj && <p className="text-xs text-neutral-500">CNPJ: {company.cnpj}</p>}
                          <p className="text-xs text-neutral-400">Criada em {formatDate(company.createdAt)}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getSubscriptionBadge(company.subscriptionStatus)}
                            {getPlanBadge(company.subscriptionPlan)}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {company.subscriptionStatus === 'TRIAL' && company.trialEndsAt && (
                              <span className="flex items-center gap-1">
                                <Clock size={12} />
                                Trial até: {formatDateTimeDisplay(company.trialEndsAt)}
                              </span>
                            )}
                            {company.casesLimit && (
                              <span>Limite: {company._count.cases}/{company.casesLimit} processos</span>
                            )}
                          </div>
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
                              ? 'bg-success-100 text-success-800'
                              : 'bg-error-100 text-error-800'
                          }`}
                        >
                          {company.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditSubscription(company)}
                            className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 rounded-md transition-all duration-200"
                            title="Gerenciar Assinatura"
                          >
                            <Crown size={18} />
                          </button>
                          <button
                            onClick={() => handleViewUsers(company)}
                            className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-info-600 hover:text-info-700 hover:bg-info-50 rounded-md transition-all duration-200"
                            title="Ver Usuários"
                          >
                            <UserCog size={18} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(company)}
                            className={`inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] ${company.active ? 'text-error-600 hover:text-error-700 hover:bg-error-50' : 'text-success-600 hover:text-success-700 hover:bg-success-50'} rounded-md transition-all duration-200`}
                            title={company.active ? 'Desativar' : 'Ativar'}
                          >
                            {company.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                          <button
                            onClick={() => handleEdit(company)}
                            className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(company)}
                            className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-error-600 hover:text-error-700 hover:bg-error-50 rounded-md transition-all duration-200"
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
            </>
          )}
        </div>
      </div>

      {/* Modal Criar/Editar Empresa */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
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
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
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

                  {/* Portal do Cliente - Subdomain */}
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <label className="block text-sm font-medium text-green-800 mb-1">Portal do Cliente</label>
                    <p className="text-xs text-green-600 mb-2">URL personalizada para o portal de clientes deste escritório</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-700">https://</span>
                      <input
                        type="text"
                        value={editFormData.subdomain}
                        onChange={(e) => setEditFormData({ ...editFormData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                        placeholder="nome-do-escritorio"
                        className="flex-1 px-3 py-2 border border-green-300 rounded-md min-h-[44px] focus:ring-green-500 focus:border-green-500"
                        maxLength={30}
                      />
                      <span className="text-sm text-green-700">.advwell.pro</span>
                    </div>
                    {editFormData.subdomain && (
                      <p className="mt-2 text-sm text-green-700">
                        URL: <a href={`https://${editFormData.subdomain}.advwell.pro`} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                          https://{editFormData.subdomain}.advwell.pro
                        </a>
                      </p>
                    )}
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
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto my-4">
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
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg transition-all duration-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 font-medium rounded-lg transition-all duration-200"
              >
                Sim, Deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Usuários */}
      {showUsersModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
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
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
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
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">
                          Nome
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">
                          Função
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-neutral-900 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-neutral-900 uppercase">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {usersData.users.map((user) => (
                        <tr key={user.id} className="odd:bg-white even:bg-neutral-50 hover:bg-success-100 transition-colors">
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
                                  ? 'bg-success-100 text-success-800'
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
                                className={`inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] ${user.active ? 'text-error-600 hover:text-error-700 hover:bg-error-50' : 'text-success-600 hover:text-success-700 hover:bg-success-50'} rounded-md transition-all duration-200`}
                                title={user.active ? 'Desativar usuário' : 'Ativar usuário'}
                              >
                                {user.active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
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

      {/* Modal de Gerenciamento de Assinatura */}
      {showSubscriptionModal && selectedCompany && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto my-4">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">Gerenciar Assinatura</h2>
                <p className="text-sm text-neutral-600 mt-1">{selectedCompany.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowSubscriptionModal(false);
                  setSelectedCompany(null);
                  setLastPaymentData(null);
                }}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleUpdateSubscription} className="p-6 space-y-4">
              {/* Info atual */}
              <div className="bg-neutral-50 p-4 rounded-lg space-y-2 text-sm">
                <p><strong>Status atual:</strong> {selectedCompany.subscriptionStatus || 'Nenhum'}</p>
                <p><strong>Plano atual:</strong> {selectedCompany.subscriptionPlan || 'Nenhum'}</p>
                <p><strong>Processos:</strong> {selectedCompany._count.cases} / {selectedCompany.casesLimit || 'ilimitado'}</p>
                {selectedCompany.trialEndsAt && (
                  <p><strong>Trial expira:</strong> {formatDateTimeDisplay(selectedCompany.trialEndsAt)}</p>
                )}
                {selectedCompany.stripeSubscriptionId && (
                  <p className="text-green-600"><strong>✓ Stripe ativo</strong></p>
                )}
              </div>

              {/* Último Pagamento */}
              {selectedCompany.stripeCustomerId && (
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={18} className="text-green-600" />
                    <span className="font-semibold text-green-800">Último Pagamento</span>
                  </div>
                  {loadingLastPayment ? (
                    <p className="text-sm text-green-600">Carregando...</p>
                  ) : lastPaymentData?.hasPayments && lastPaymentData.lastPayment ? (
                    <div className="text-sm text-green-700 space-y-1">
                      <p>
                        <strong>Data:</strong>{' '}
                        {lastPaymentData.lastPayment.lastPaymentDate
                          ? formatDateTimeDisplay(lastPaymentData.lastPayment.lastPaymentDate)
                          : '-'}
                      </p>
                      <p>
                        <strong>Valor:</strong>{' '}
                        {lastPaymentData.lastPayment.lastPaymentAmount !== null
                          ? `${lastPaymentData.lastPayment.lastPaymentCurrency} ${lastPaymentData.lastPayment.lastPaymentAmount.toFixed(2)}`
                          : '-'}
                      </p>
                      <p>
                        <strong>Status:</strong>{' '}
                        <span className="px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs">
                          {lastPaymentData.lastPayment.lastPaymentStatus === 'paid' ? 'Pago' : lastPaymentData.lastPayment.lastPaymentStatus}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-green-600">Nenhum pagamento encontrado</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-neutral-700">Status da Assinatura</label>
                <select
                  value={subscriptionForm.subscriptionStatus}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, subscriptionStatus: e.target.value as any })}
                  className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                >
                  <option value="">Selecione...</option>
                  <option value="TRIAL">Trial (Período de Teste)</option>
                  <option value="ACTIVE">Ativa</option>
                  <option value="EXPIRED">Expirada</option>
                  <option value="CANCELLED">Cancelada</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Plano</label>
                <select
                  value={subscriptionForm.subscriptionPlan}
                  onChange={(e) => {
                    const plan = e.target.value as 'BRONZE' | 'PRATA' | 'OURO' | '';
                    const limits: Record<string, number> = { BRONZE: 1000, PRATA: 2500, OURO: 5000 };
                    setSubscriptionForm({
                      ...subscriptionForm,
                      subscriptionPlan: plan,
                      casesLimit: limits[plan] || subscriptionForm.casesLimit,
                    });
                  }}
                  className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                >
                  <option value="">Sem plano</option>
                  <option value="BRONZE">Bronze ($99/mês - 1.000 processos)</option>
                  <option value="PRATA">Prata ($159/mês - 2.500 processos)</option>
                  <option value="OURO">Ouro ($219/mês - 5.000 processos)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Limite de Processos</label>
                <input
                  type="number"
                  min="0"
                  value={subscriptionForm.casesLimit}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, casesLimit: parseInt(e.target.value) || 0 })}
                  className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-md min-h-[44px]"
                />
                <p className="text-xs text-neutral-500 mt-1">Deixe 0 para ilimitado</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowSubscriptionModal(false);
                    setSelectedCompany(null);
                    setLastPaymentData(null);
                  }}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-700 font-medium rounded-lg transition-all duration-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-200 font-medium rounded-lg transition-all duration-200"
                >
                  <Crown size={18} />
                  Salvar Assinatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Companies;
