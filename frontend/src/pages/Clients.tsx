import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, Eye, X } from 'lucide-react';
import { ExportButton } from '../components/ui';

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

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setShowDetailsModal(true);
  };

  const handleNewClient = () => {
    resetForm();
    setEditMode(false);
    setSelectedClient(null);
    setShowModal(true);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

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
              className="inline-flex items-center justify-center gap-2 px-2 sm:px-4 py-2 rounded-lg bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 font-medium text-sm transition-all duration-200 min-h-[44px]"
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
            <div className="overflow-x-auto">
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
                <tbody className="divide-y divide-gray-200 bg-white">
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
                            className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-info-600 hover:text-info-700 hover:bg-info-50 rounded-md transition-all duration-200"
                            title="Ver detalhes"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(client)}
                            className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-md transition-all duration-200"
                            title="Editar"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(client)}
                            className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-error-600 hover:text-error-700 hover:bg-error-50 rounded-md transition-all duration-200"
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
          )}
        </div>
      </div>

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center min-h-[44px]">
              <h2 className="text-xl font-bold text-neutral-900">
                {editMode ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedClient(null);
                  resetForm();
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
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
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px]"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-neutral-200 px-6 py-4 flex justify-between items-center min-h-[44px]">
              <h2 className="text-xl font-bold text-neutral-900">Detalhes do Cliente</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedClient(null);
                }}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
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
                        <p className="text-sm text-neutral-900 mt-1">{formatDate(selectedClient.birthDate)}</p>
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
                      <p className="text-sm text-neutral-900 mt-1">{formatDate(selectedClient.birthDate)}</p>
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
                    <p className="text-sm text-neutral-900 mt-1">{formatDate(selectedClient.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Última Atualização</p>
                    <p className="text-sm text-neutral-900 mt-1">{formatDate(selectedClient.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-6 py-4 flex justify-end gap-3 min-h-[44px]">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  handleEdit(selectedClient);
                }}
                className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px]"
              >
                <Edit size={20} />
                <span className="hidden sm:inline">Editar Cliente</span>
                <span className="sm:hidden">Editar</span>
              </button>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedClient(null);
                }}
                className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultados da Importação */}
      {showImportModal && importResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
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
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary-600">{importResults.total}</p>
                  <p className="text-sm text-neutral-600">Total de linhas</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold text-primary-600">{importResults.success}</p>
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
