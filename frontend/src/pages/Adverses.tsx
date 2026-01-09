import { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';

interface Adverse {
  id: string;
  personType?: 'FISICA' | 'JURIDICA';
  name: string;
  cpf?: string;
  stateRegistration?: string;
  rg?: string;
  pis?: string;
  ctps?: string;
  ctpsSerie?: string;
  motherName?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  instagram?: string;
  facebook?: string;
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
  createdAt: string;
  updatedAt: string;
}

interface AdverseFormData {
  personType: 'FISICA' | 'JURIDICA';
  name: string;
  cpf: string;
  stateRegistration: string;
  rg: string;
  pis: string;
  ctps: string;
  ctpsSerie: string;
  motherName: string;
  email: string;
  phone: string;
  phone2: string;
  instagram: string;
  facebook: string;
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
}

// Formatar CPF/CNPJ para exibição
const formatCPF = (cpf?: string) => {
  if (!cpf) return '-';
  return cpf;
};

// Formatar data para exibição
const formatDateDisplay = (dateStr?: string) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
};

export default function Adverses() {
  const [adverses, setAdverses] = useState<Adverse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAdverse, setSelectedAdverse] = useState<Adverse | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Paginação
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / limit);

  const [formData, setFormData] = useState<AdverseFormData>({
    personType: 'FISICA',
    name: '',
    cpf: '',
    stateRegistration: '',
    rg: '',
    pis: '',
    ctps: '',
    ctpsSerie: '',
    motherName: '',
    email: '',
    phone: '',
    phone2: '',
    instagram: '',
    facebook: '',
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
  });

  useEffect(() => {
    loadAdverses();
  }, [search, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const loadAdverses = async () => {
    try {
      const params: any = { search, page, limit };
      const response = await api.get('/adverses', { params });
      setAdverses(response.data.data);
      setTotal(response.data.total || 0);
    } catch (error) {
      toast.error('Erro ao carregar adversos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      personType: 'FISICA',
      name: '',
      cpf: '',
      stateRegistration: '',
      rg: '',
      pis: '',
      ctps: '',
      ctpsSerie: '',
      motherName: '',
      email: '',
      phone: '',
      phone2: '',
      instagram: '',
      facebook: '',
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
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode && selectedAdverse) {
        await api.put(`/adverses/${selectedAdverse.id}`, formData);
        toast.success('Adverso atualizado com sucesso!');
      } else {
        await api.post('/adverses', formData);
        toast.success('Adverso criado com sucesso!');
      }
      setShowModal(false);
      setEditMode(false);
      setSelectedAdverse(null);
      resetForm();
      loadAdverses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar adverso');
    }
  };

  const handleEdit = (adverse: Adverse) => {
    setSelectedAdverse(adverse);
    setFormData({
      personType: adverse.personType || 'FISICA',
      name: adverse.name || '',
      cpf: adverse.cpf || '',
      stateRegistration: adverse.stateRegistration || '',
      rg: adverse.rg || '',
      pis: adverse.pis || '',
      ctps: adverse.ctps || '',
      ctpsSerie: adverse.ctpsSerie || '',
      motherName: adverse.motherName || '',
      email: adverse.email || '',
      phone: adverse.phone || '',
      phone2: adverse.phone2 || '',
      instagram: adverse.instagram || '',
      facebook: adverse.facebook || '',
      address: adverse.address || '',
      city: adverse.city || '',
      state: adverse.state || '',
      zipCode: adverse.zipCode || '',
      profession: adverse.profession || '',
      nationality: adverse.nationality || '',
      maritalStatus: adverse.maritalStatus || '',
      birthDate: adverse.birthDate ? adverse.birthDate.split('T')[0] : '',
      representativeName: adverse.representativeName || '',
      representativeCpf: adverse.representativeCpf || '',
      notes: adverse.notes || '',
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (adverse: Adverse) => {
    if (!window.confirm(`Tem certeza que deseja excluir o adverso "${adverse.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/adverses/${adverse.id}`);
      toast.success('Adverso excluído com sucesso!');
      loadAdverses();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir adverso');
    }
  };

  const handleViewDetails = (adverse: Adverse) => {
    setSelectedAdverse(adverse);
    setShowDetailsModal(true);
  };

  // Mobile card items
  const mobileCardItems: MobileCardItem[] = adverses.map((adverse) => ({
    id: adverse.id,
    title: adverse.name,
    subtitle: adverse.personType === 'JURIDICA' ? 'Pessoa Jurídica' : 'Pessoa Física',
    badge: adverse.personType === 'JURIDICA'
      ? { text: 'PJ', color: 'purple' as const }
      : { text: 'PF', color: 'blue' as const },
    fields: [
      { label: 'CPF/CNPJ', value: adverse.cpf || '-' },
      { label: 'Email', value: adverse.email || '-' },
      { label: 'Telefone', value: adverse.phone || '-' },
    ],
    onView: () => handleViewDetails(adverse),
    onEdit: () => handleEdit(adverse),
    onDelete: () => handleDelete(adverse),
  }));

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 flex items-center gap-2">
              <Users className="text-primary-600" />
              Adversos
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Gerencie os adversos (partes contrárias) dos seus processos
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setEditMode(false);
              setSelectedAdverse(null);
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px]"
          >
            <Plus size={20} />
            <span>Novo Adverso</span>
          </button>
        </div>

        {/* Busca */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, CPF/CNPJ ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin mx-auto text-primary-600" size={32} />
              <p className="text-neutral-500 mt-2">Carregando...</p>
            </div>
          ) : adverses.length === 0 ? (
            <div className="p-8 text-center">
              <Users size={48} className="mx-auto text-neutral-300 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">Nenhum adverso encontrado</h3>
              <p className="text-neutral-500 mb-4">
                {search ? 'Tente ajustar sua busca' : 'Cadastre o primeiro adverso'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile */}
              <div className="md:hidden">
                <MobileCardList items={mobileCardItems} />
              </div>

              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        CPF/CNPJ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {adverses.map((adverse) => (
                      <tr key={adverse.id} className="hover:bg-neutral-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-neutral-900">{adverse.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            adverse.personType === 'JURIDICA'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {adverse.personType === 'JURIDICA' ? 'PJ' : 'PF'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                          {formatCPF(adverse.cpf)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-neutral-900">{adverse.email || '-'}</div>
                          <div className="text-sm text-neutral-500">{adverse.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(adverse)}
                              className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleEdit(adverse)}
                              className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(adverse)}
                              className="p-2 text-neutral-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
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

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-neutral-500">
                    Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} adversos
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
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
                            className={`px-3 py-1 text-sm rounded-lg ${
                              page === pageNum
                                ? 'bg-primary-600 text-white'
                                : 'text-neutral-600 hover:bg-neutral-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Próximo
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
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
                {editMode ? 'Editar Adverso' : 'Novo Adverso'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedAdverse(null);
                  resetForm();
                }}
                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="space-y-6">
                {/* Dados Pessoais/Empresa */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">
                    {formData.personType === 'JURIDICA' ? 'Dados da Empresa' : 'Dados Pessoais'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

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
                          <label className="block text-sm font-medium text-neutral-700 mb-1">PIS</label>
                          <input
                            type="text"
                            value={formData.pis}
                            onChange={(e) => setFormData({ ...formData, pis: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">CTPS</label>
                          <input
                            type="text"
                            value={formData.ctps}
                            onChange={(e) => setFormData({ ...formData, ctps: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">CTPS Série</label>
                          <input
                            type="text"
                            value={formData.ctpsSerie}
                            onChange={(e) => setFormData({ ...formData, ctpsSerie: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Nome da Mãe</label>
                          <input
                            type="text"
                            value={formData.motherName}
                            onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Data de Nascimento</label>
                          <input
                            type="date"
                            value={formData.birthDate}
                            onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Estado Civil</label>
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
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Profissão</label>
                          <input
                            type="text"
                            value={formData.profession}
                            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Nacionalidade</label>
                          <input
                            type="text"
                            value={formData.nationality}
                            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>
                      </>
                    )}

                    {formData.personType === 'JURIDICA' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Inscrição Estadual</label>
                          <input
                            type="text"
                            value={formData.stateRegistration}
                            onChange={(e) => setFormData({ ...formData, stateRegistration: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Nome do Representante</label>
                          <input
                            type="text"
                            value={formData.representativeName}
                            onChange={(e) => setFormData({ ...formData, representativeName: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">CPF do Representante</label>
                          <input
                            type="text"
                            value={formData.representativeCpf}
                            onChange={(e) => setFormData({ ...formData, representativeCpf: e.target.value })}
                            className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

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
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Telefone 1</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Telefone 2</label>
                      <input
                        type="text"
                        value={formData.phone2}
                        onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Instagram</label>
                      <input
                        type="text"
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                        placeholder="@usuario"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Facebook</label>
                      <input
                        type="text"
                        value={formData.facebook}
                        onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
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
                      <label className="block text-sm font-medium text-neutral-700 mb-1">Endereço</label>
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
                    placeholder="Informações adicionais sobre o adverso..."
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
                    setSelectedAdverse(null);
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
      {showDetailsModal && selectedAdverse && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-3xl">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900">Detalhes do Adverso</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedAdverse(null);
                }}
                className="p-2 text-neutral-400 hover:text-neutral-600 rounded-lg hover:bg-neutral-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body space-y-4 sm:space-y-6">
              {/* Dados Pessoais */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                  {selectedAdverse.personType === 'JURIDICA' ? 'Dados da Empresa' : 'Dados Pessoais'}
                </h3>
                <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Tipo de Pessoa</p>
                    <p className="text-sm text-neutral-900 mt-1">
                      {selectedAdverse.personType === 'JURIDICA' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">
                      {selectedAdverse.personType === 'JURIDICA' ? 'Razão Social' : 'Nome Completo'}
                    </p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">
                      {selectedAdverse.personType === 'JURIDICA' ? 'CNPJ' : 'CPF'}
                    </p>
                    <p className="text-sm text-neutral-900 mt-1">{formatCPF(selectedAdverse.cpf)}</p>
                  </div>

                  {selectedAdverse.personType === 'FISICA' && (
                    <>
                      <div>
                        <p className="text-sm font-medium text-neutral-500">RG</p>
                        <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.rg || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500">PIS</p>
                        <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.pis || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500">CTPS</p>
                        <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.ctps || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500">CTPS Série</p>
                        <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.ctpsSerie || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500">Nome da Mãe</p>
                        <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.motherName || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500">Data de Nascimento</p>
                        <p className="text-sm text-neutral-900 mt-1">{formatDateDisplay(selectedAdverse.birthDate)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500">Estado Civil</p>
                        <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.maritalStatus || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-neutral-500">Profissão</p>
                        <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.profession || '-'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Contato */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Contato</h3>
                <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Email</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Telefone 1</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Telefone 2</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.phone2 || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Instagram</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.instagram || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Facebook</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.facebook || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Endereço</h3>
                <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-neutral-500">Endereço</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Cidade</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Estado</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.state || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">CEP</p>
                    <p className="text-sm text-neutral-900 mt-1">{selectedAdverse.zipCode || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedAdverse.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-3">Observações</h3>
                  <div className="bg-neutral-50 rounded-lg p-4">
                    <p className="text-sm text-neutral-900 whitespace-pre-wrap">{selectedAdverse.notes}</p>
                  </div>
                </div>
              )}

              {/* Datas */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">Informações do Sistema</h3>
                <div className="bg-neutral-50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Data de Cadastro</p>
                    <p className="text-sm text-neutral-900 mt-1">{formatDateDisplay(selectedAdverse.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Última Atualização</p>
                    <p className="text-sm text-neutral-900 mt-1">{formatDateDisplay(selectedAdverse.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
