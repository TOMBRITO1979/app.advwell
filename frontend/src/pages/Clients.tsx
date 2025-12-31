import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, Eye, X, FileText, Loader2, UserPlus, UserX, Mail } from 'lucide-react';
import { ExportButton } from '../components/ui';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import { formatDate } from '../utils/dateFormatter';

interface Case {
  id: string;
  processNumber: string;
  subject?: string;
  court?: string;
  status: string;
  value?: number;
  deadline?: string;
  createdAt: string;
}

interface Client {
  id: string;
  personType?: 'FISICA' | 'JURIDICA';
  name: string;
  cpf?: string;
  stateRegistration?: string;
  rg?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  profession?: string;
  nationality?: string;
  maritalStatus?: string;
  birthDate?: string;
  representativeName?: string;
  representativeCpf?: string;
  notes?: string;
  tag?: string;
  createdAt: string;
  updatedAt: string;
  cases?: Case[];
}

interface ClientFormData {
  personType: 'FISICA' | 'JURIDICA';
  name: string;
  cpf: string;
  stateRegistration: string;
  rg: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  profession: string;
  nationality: string;
  maritalStatus: string;
  birthDate: string;
  representativeName: string;
  representativeCpf: string;
  notes: string;
  tag: string;
}

const Clients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [creatingPortalAccess, setCreatingPortalAccess] = useState(false);
  const [portalUser, setPortalUser] = useState<{ id: string; email: string; tempPassword?: string } | null>(null);
  const [portalPassword, setPortalPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ClientFormData>({
    personType: 'FISICA',
    name: '',
    cpf: '',
    stateRegistration: '',
    rg: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    profession: '',
    nationality: '',
    maritalStatus: '',
    birthDate: '',
    representativeName: '',
    representativeCpf: '',
    notes: '',
    tag: '',
  });

  useEffect(() => {
    loadClients();
  }, [search]);

  const loadClients = async () => {
    try {
      const response = await api.get('/clients', {
        params: { search, limit: 100 },
      });
      setClients(response.data.data);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/clients/export/csv', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('CSV exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar CSV');
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/clients/import/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setImportResults(response.data.results);
      setShowImportModal(true);
      loadClients();

      if (response.data.results.success > 0) {
        toast.success(`${response.data.results.success} cliente(s) importado(s) com sucesso!`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao importar CSV');
    }

    // Limpar o input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetForm = () => {
    setFormData({
      personType: 'FISICA',
      name: '',
      cpf: '',
      stateRegistration: '',
      rg: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      profession: '',
      nationality: '',
      maritalStatus: '',
      birthDate: '',
      representativeName: '',
      representativeCpf: '',
      notes: '',
      tag: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode && selectedClient) {
        await api.put(`/clients/${selectedClient.id}`, formData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await api.post('/clients', formData);
        toast.success('Cliente criado com sucesso!');
      }
      setShowModal(false);
      setEditMode(false);
      setSelectedClient(null);
      resetForm();
      loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar cliente');
    }
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      personType: client.personType || 'FISICA',
      name: client.name || '',
      cpf: client.cpf || '',
      stateRegistration: client.stateRegistration || '',
      rg: client.rg || '',
      email: client.email || '',
      phone: client.phone || '',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      zipCode: client.zipCode || '',
      profession: client.profession || '',
      nationality: client.nationality || '',
      maritalStatus: client.maritalStatus || '',
      birthDate: client.birthDate ? client.birthDate.split('T')[0] : '',
      representativeName: client.representativeName || '',
      representativeCpf: client.representativeCpf || '',
      notes: client.notes || '',
      tag: client.tag || '',
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`Tem certeza que deseja excluir o cliente "${client.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/clients/${client.id}`);
      toast.success('Cliente excluído com sucesso!');
      loadClients();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir cliente');
    }
  };

  const handleViewDetails = async (client: Client) => {
    setShowDetailsModal(true);
    setLoadingDetails(true);
    setPortalUser(null);
    try {
      // Buscar cliente por ID para obter os processos vinculados
      const response = await api.get(`/clients/${client.id}`);
      setSelectedClient(response.data);

      // Buscar informações do usuário do portal
      try {
        const portalResponse = await api.get(`/users/portal-users?clientId=${client.id}`);
        if (portalResponse.data && portalResponse.data.length > 0) {
          setPortalUser(portalResponse.data[0]);
        }
      } catch {
        // Cliente não tem acesso ao portal
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do cliente:', error);
      // Fallback: usar dados da lista (sem processos)
      setSelectedClient(client);
      toast.error('Erro ao carregar processos do cliente');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCreatePortalAccess = async () => {
    if (!selectedClient) return;
    if (!selectedClient.email) {
      toast.error('Cliente precisa ter um email cadastrado');
      return;
    }

    setCreatingPortalAccess(true);
    try {
      const response = await api.post('/users/portal-user', {
        clientId: selectedClient.id,
        name: selectedClient.name,
        email: selectedClient.email,
        password: portalPassword || undefined, // Envia senha manual ou deixa o backend gerar
      });
      setPortalUser({
        id: response.data.id,
        email: response.data.email,
        tempPassword: portalPassword || response.data.tempPassword // Mostra a senha que foi definida
      });
      setPortalPassword(''); // Limpa o campo
      if (portalPassword) {
        toast.success('Acesso criado com a senha definida!', { duration: 5000 });
      } else if (response.data.tempPassword) {
        toast.success('Acesso criado! Veja a senha temporária abaixo.', { duration: 5000 });
      } else {
        toast.success('Acesso ao portal criado!');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Erro ao criar acesso ao portal';
      toast.error(message);
    } finally {
      setCreatingPortalAccess(false);
    }
  };

  const handleRemovePortalAccess = async () => {
    if (!portalUser) return;
    if (!confirm('Tem certeza que deseja remover o acesso ao portal deste cliente?')) return;

    try {
      await api.delete(`/users/portal-user/${portalUser.id}`);
      setPortalUser(null);
      toast.success('Acesso ao portal removido');
    } catch (error) {
      toast.error('Erro ao remover acesso ao portal');
    }
  };

  const handleNewClient = () => {
    resetForm();
    setEditMode(false);
    setSelectedClient(null);
    setShowModal(true);
  };

  // Wrapper que retorna '-' para datas vazias
  const formatDateDisplay = (dateString?: string) => formatDate(dateString) || '-';

  const formatCPF = (cpf?: string) => {
    if (!cpf) return '-';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-3 sm:mb-4">Clientes</h1>

          {/* Action Buttons - Mobile: Grid 3 columns, Desktop: Flex row */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <ExportButton
              type="import"
              onClick={handleImportClick}
            />
            <ExportButton
              type="csv"
              onClick={handleExportCSV}
            />
            <button
              onClick={handleNewClient}
              className="inline-flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium text-sm transition-all duration-200 min-h-[44px]"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Novo Cliente</span>
              <span className="sm:hidden">Novo</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 mb-4">
            <Search size={20} className="text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
            />
          </div>

          {loading ? (
            <p className="text-center py-8 text-neutral-600">Carregando...</p>
          ) : clients.length === 0 ? (
            <p className="text-center py-8 text-neutral-600">
              {search ? 'Nenhum cliente encontrado para sua busca' : 'Nenhum cliente cadastrado'}
            </p>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="mobile-card-view">
                <MobileCardList
                  items={clients.map((client): MobileCardItem => ({
                    id: client.id,
                    title: client.name,
                    subtitle: formatCPF(client.cpf),
                    badge: client.tag ? { text: client.tag, color: 'blue' } : undefined,
                    fields: [
                      { label: 'Telefone', value: client.phone || '-' },
                      { label: 'Email', value: client.email || '-' },
                    ],
                    onView: () => handleViewDetails(client),
                    onEdit: () => handleEdit(client),
                    onDelete: () => handleDelete(client),
                  }))}
                  emptyMessage={search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
                />
              </div>

              {/* Desktop Table View */}
              <div className="desktop-table-view overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        CPF
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Telefone
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        TAG
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white">
                    {clients.map((client) => (
                      <tr key={client.id} className="hover:bg-neutral-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-neutral-900">{client.name}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">{formatCPF(client.cpf)}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">{client.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">{client.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-neutral-600">{client.tag || '-'}</td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewDetails(client)}
                              className="action-btn action-btn-info"
                              title="Ver detalhes"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(client)}
                              className="action-btn action-btn-primary"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(client)}
                              className="action-btn action-btn-danger"
                              title="Excluir"
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

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                {editMode ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedClient(null);
                  resetForm();
                }}
                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="space-y-6">
                {/* Dados da Empresa / Dados Pessoais */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                    {formData.personType === 'JURIDICA' ? 'Dados da Empresa' : 'Dados Pessoais'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tipo de Pessoa */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Tipo de Pessoa <span className="text-error-500">*</span>
                      </label>
                      <select
                        required
                        value={formData.personType}
                        onChange={(e) => setFormData({ ...formData, personType: e.target.value as 'FISICA' | 'JURIDICA' })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="FISICA">Pessoa Física</option>
                        <option value="JURIDICA">Pessoa Jurídica</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        {formData.personType === 'FISICA' ? 'Nome Completo' : 'Razão Social'} <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        {formData.personType === 'FISICA' ? 'CPF' : 'CNPJ'}
                      </label>
                      <input
                        type="text"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        placeholder={formData.personType === 'FISICA' ? '000.000.000-00' : '00.000.000/0000-00'}
                        maxLength={formData.personType === 'FISICA' ? 14 : 18}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    {/* Inscrição Estadual - apenas para Pessoa Jurídica */}
                    {formData.personType === 'JURIDICA' && (
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Inscrição Estadual
                        </label>
                        <input
                          type="text"
                          value={formData.stateRegistration}
                          onChange={(e) => setFormData({ ...formData, stateRegistration: e.target.value })}
                          placeholder="123.456.789.012"
                          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>
                    )}

                    {/* Campos para Pessoa Física */}
                    {formData.personType === 'FISICA' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">RG</label>
                          <input
                            type="text"
                            value={formData.rg}
                            onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Data de Nascimento
                          </label>
                          <input
                            type="date"
                            value={formData.birthDate}
                            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Estado Civil
                          </label>
                          <select
                            value={formData.maritalStatus}
                            onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          >
                            <option value="">Selecione...</option>
                            <option value="Solteiro(a)">Solteiro(a)</option>
                            <option value="Casado(a)">Casado(a)</option>
                            <option value="Divorciado(a)">Divorciado(a)</option>
                            <option value="Viúvo(a)">Viúvo(a)</option>
                            <option value="União Estável">União Estável</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Profissão
                          </label>
                          <input
                            type="text"
                            value={formData.profession}
                            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Nacionalidade
                          </label>
                          <input
                            type="text"
                            value={formData.nationality}
                            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                            placeholder="Ex: Brasileiro(a)"
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Dados do Representante Legal - apenas para Pessoa Jurídica */}
                {formData.personType === 'JURIDICA' && (
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-4">Dados do Representante Legal</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Nome do Representante Legal
                        </label>
                        <input
                          type="text"
                          value={formData.representativeName}
                          onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                          placeholder="Nome completo do representante"
                          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          CPF do Representante Legal
                        </label>
                        <input
                          type="text"
                          value={formData.representativeCpf}
                          onChange={(e) => setFormData({ ...formData, representativeCpf: e.target.value })}
                          placeholder="000.000.000-00"
                          maxLength={14}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">RG do Representante</label>
                        <input
                          type="text"
                          value={formData.rg}
                          onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Data de Nascimento do Representante
                        </label>
                        <input
                          type="date"
                          value={formData.birthDate}
                          onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Estado Civil do Representante
                        </label>
                        <select
                          value={formData.maritalStatus}
                          onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        >
                          <option value="">Selecione...</option>
                          <option value="Solteiro(a)">Solteiro(a)</option>
                          <option value="Casado(a)">Casado(a)</option>
                          <option value="Divorciado(a)">Divorciado(a)</option>
                          <option value="Viúvo(a)">Viúvo(a)</option>
                          <option value="União Estável">União Estável</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Profissão do Representante
                        </label>
                        <input
                          type="text"
                          value={formData.profession}
                          onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          Nacionalidade do Representante
                        </label>
                        <input
                          type="text"
                          value={formData.nationality}
                          onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                          placeholder="Ex: Brasileiro(a)"
                          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Contato */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">Contato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Celular
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 mb-1">
                        Endereço
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Rua, número, complemento"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Estado</label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="">Selecione...</option>
                        <option value="AC">AC</option>
                        <option value="AL">AL</option>
                        <option value="AP">AP</option>
                        <option value="AM">AM</option>
                        <option value="BA">BA</option>
                        <option value="CE">CE</option>
                        <option value="DF">DF</option>
                        <option value="ES">ES</option>
                        <option value="GO">GO</option>
                        <option value="MA">MA</option>
                        <option value="MT">MT</option>
                        <option value="MS">MS</option>
                        <option value="MG">MG</option>
                        <option value="PA">PA</option>
                        <option value="PB">PB</option>
                        <option value="PR">PR</option>
                        <option value="PE">PE</option>
                        <option value="PI">PI</option>
                        <option value="RJ">RJ</option>
                        <option value="RN">RN</option>
                        <option value="RS">RS</option>
                        <option value="RO">RO</option>
                        <option value="RR">RR</option>
                        <option value="SC">SC</option>
                        <option value="SP">SP</option>
                        <option value="SE">SE</option>
                        <option value="TO">TO</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">CEP</label>
                      <input
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        placeholder="00000-000"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">Observações</h3>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="Informações adicionais sobre o cliente..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                {/* Tag */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Tag/Categoria
                  </label>
                  <input
                    type="text"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    placeholder="Ex: VIP, Bronze, Prata, Ouro..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedClient(null);
                    resetForm();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px]"
                >
                  {editMode ? 'Atualizar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes */}
      {showDetailsModal && selectedClient && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-3xl">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Detalhes do Cliente</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedClient(null);
                }}
                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body space-y-4 sm:space-y-6">
              {/* Dados da Empresa / Dados Pessoais */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                  {selectedClient.personType === 'JURIDICA' ? 'Dados da Empresa' : 'Dados Pessoais'}
                </h3>
                <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Tipo de Pessoa</p>
                    <p className="text-sm text-neutral-900 mt-1">
                      {selectedClient.personType === 'JURIDICA' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">
                      {selectedClient.personType === 'JURIDICA' ? 'Razão Social' : 'Nome Completo'}
                    </p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedClient.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">
                      {selectedClient.personType === 'JURIDICA' ? 'CNPJ' : 'CPF'}
                    </p>
                    <p className="text-sm text-neutral-900 mt-1">{formatCPF(selectedClient.cpf)}</p>
                  </div>

                  {selectedClient.personType === 'JURIDICA' && selectedClient.stateRegistration && (
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Inscrição Estadual</p>
                      <p className="text-sm text-neutral-900 mt-1">{selectedClient.stateRegistration}</p>
                    </div>
                  )}

                  {selectedClient.personType === 'FISICA' && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-neutral-500">RG</p>
                        <p className="text-sm text-neutral-900 mt-1">{selectedClient.rg || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500">Data de Nascimento</p>
                        <p className="text-sm text-neutral-900 mt-1">{formatDateDisplay(selectedClient.birthDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500">Estado Civil</p>
                        <p className="text-sm text-neutral-900 mt-1">{selectedClient.maritalStatus || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500">Profissão</p>
                        <p className="text-sm text-neutral-900 mt-1">{selectedClient.profession || '-'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Dados do Representante Legal - apenas para Pessoa Jurídica */}
              {selectedClient.personType === 'JURIDICA' && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">Dados do Representante Legal</h3>
                  <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Nome do Representante</p>
                      <p className="text-sm text-neutral-900 mt-1">{selectedClient.representativeName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">CPF do Representante</p>
                      <p className="text-sm text-neutral-900 mt-1">{formatCPF(selectedClient.representativeCpf)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">RG do Representante</p>
                      <p className="text-sm text-neutral-900 mt-1">{selectedClient.rg || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Data de Nascimento</p>
                      <p className="text-sm text-neutral-900 mt-1">{formatDateDisplay(selectedClient.birthDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Estado Civil</p>
                      <p className="text-sm text-neutral-900 mt-1">{selectedClient.maritalStatus || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-500">Profissão</p>
                      <p className="text-sm text-neutral-900 mt-1">{selectedClient.profession || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contato */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Contato</h3>
                <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Email</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedClient.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Celular</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedClient.phone || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Endereço</h3>
                <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-neutral-500">Endereço</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedClient.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Cidade</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedClient.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Estado</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedClient.state || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">CEP</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedClient.zipCode || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedClient.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">Observações</h3>
                  <div className="bg-neutral-50 rounded-lg p-4">
                    <p className="text-sm text-neutral-900 whitespace-pre-wrap">{selectedClient.notes}</p>
                  </div>
                </div>
              )}

              {/* Datas */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Informações do Sistema</h3>
                <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Data de Cadastro</p>
                    <p className="text-sm text-neutral-900 mt-1">{formatDateDisplay(selectedClient.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Última Atualização</p>
                    <p className="text-sm text-neutral-900 mt-1">{formatDateDisplay(selectedClient.updatedAt)}</p>
                  </div>
                </div>
              </div>

              {/* Processos Vinculados */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <FileText size={20} className="text-primary-600" />
                  Processos Vinculados
                </h3>
                {loadingDetails ? (
                  <div className="bg-neutral-50 rounded-lg p-6 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-primary-600" />
                    <span className="ml-2 text-neutral-600">Carregando processos...</span>
                  </div>
                ) : selectedClient.cases && selectedClient.cases.length > 0 ? (
                  <div className="bg-neutral-50 rounded-lg divide-y divide-neutral-200">
                    {selectedClient.cases.map((caso) => (
                      <div key={caso.id} className="p-4 hover:bg-neutral-100 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-neutral-900">{caso.processNumber}</p>
                            {caso.subject && (
                              <p className="text-sm text-neutral-600 mt-1">{caso.subject}</p>
                            )}
                            <div className="flex flex-wrap gap-2 mt-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                caso.status === 'ACTIVE' ? 'bg-success-100 text-success-800' :
                                caso.status === 'PENDENTE' ? 'bg-warning-100 text-warning-800' :
                                caso.status === 'FINISHED' ? 'bg-info-100 text-info-800' :
                                'bg-neutral-100 text-neutral-800'
                              }`}>
                                {caso.status === 'ACTIVE' ? 'Ativo' :
                                 caso.status === 'PENDENTE' ? 'Pendente' :
                                 caso.status === 'FINISHED' ? 'Finalizado' :
                                 caso.status === 'ARCHIVED' ? 'Arquivado' : caso.status}
                              </span>
                              {caso.court && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
                                  {caso.court}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-neutral-50 rounded-lg p-6 text-center">
                    <FileText size={32} className="mx-auto text-neutral-400 mb-2" />
                    <p className="text-neutral-500">Nenhum processo vinculado a este cliente</p>
                  </div>
                )}
              </div>

              {/* Acesso ao Portal do Cliente */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Acesso ao Portal</h3>
                <div className="bg-neutral-50 rounded-lg p-4">
                  {portalUser ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
                            <Mail className="text-success-600" size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-900">Acesso ativo</p>
                            <p className="text-sm text-neutral-500">{portalUser.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={handleRemovePortalAccess}
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                        >
                          <UserX size={18} />
                          Remover acesso
                        </button>
                      </div>
                      {portalUser.tempPassword && (
                        <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                          <p className="text-sm font-medium text-warning-800 mb-1">Senha Temporária (anote agora!):</p>
                          <div className="flex items-center gap-2">
                            <code className="bg-white px-3 py-1.5 rounded border text-lg font-mono font-bold text-neutral-900 select-all">
                              {portalUser.tempPassword}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(portalUser.tempPassword!);
                                toast.success('Senha copiada!');
                              }}
                              className="px-3 py-1.5 text-sm bg-warning-100 hover:bg-warning-200 text-warning-800 rounded transition-colors"
                            >
                              Copiar
                            </button>
                          </div>
                          <p className="text-xs text-warning-600 mt-2">
                            Esta senha só aparece uma vez. Envie para o cliente ou peça que ele redefina pelo email.
                          </p>
                        </div>
                      )}
                      <p className="text-xs text-neutral-400">
                        URL do portal: https://cliente.advwell.pro
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-neutral-600">
                          {selectedClient.email
                            ? 'Este cliente ainda não tem acesso ao portal.'
                            : 'Cadastre um email para criar acesso ao portal.'}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">
                          URL do portal: https://cliente.advwell.pro
                        </p>
                      </div>
                      {selectedClient.email && (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={portalPassword}
                              onChange={(e) => setPortalPassword(e.target.value)}
                              placeholder="Senha (deixe vazio para gerar automaticamente)"
                              className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            />
                            <p className="text-xs text-neutral-400 mt-1">
                              Min. 12 caracteres, com maiúscula, minúscula, número e especial
                            </p>
                          </div>
                          <button
                            onClick={handleCreatePortalAccess}
                            disabled={creatingPortalAccess}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium text-sm hover:bg-primary-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {creatingPortalAccess ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <UserPlus size={18} />
                            )}
                            Criar acesso
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedClient(null);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEdit(selectedClient);
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-info-100 text-info-700 border border-info-200 hover:bg-info-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px]"
              >
                <Edit size={20} />
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultados da Importação */}
      {showImportModal && importResults && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-neutral-900">Resultados da Importação</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-neutral-500 hover:text-neutral-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-primary-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary-600">{importResults.total}</p>
                  <p className="text-sm text-neutral-600">Total de linhas</p>
                </div>
                <div className="bg-success-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-success-600">{importResults.success}</p>
                  <p className="text-sm text-neutral-600">Importados</p>
                </div>
                <div className="bg-error-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-error-600">{importResults.errors.length}</p>
                  <p className="text-sm text-neutral-600">Erros</p>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-neutral-900 mb-2">Erros encontrados:</h3>
                  <div className="bg-error-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {importResults.errors.map((error: any, index: number) => (
                      <div key={index} className="mb-2 pb-2 border-b border-error-200 last:border-0">
                        <p className="text-sm font-medium text-error-800">
                          Linha {error.line}: {error.name}
                        </p>
                        <p className="text-sm text-error-600">{error.error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowImportModal(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Clients;
