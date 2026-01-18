import { useEffect, useState, useRef } from 'react';
import {
  Scale,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  Download,
} from 'lucide-react';
import Layout from '../components/Layout';
import { ActionsDropdown } from '../components/ui';
import api from '../services/api';
import toast from 'react-hot-toast';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';

interface Lawyer {
  id: string;
  name: string;
  cpf?: string;
  oab?: string;
  oabState?: string;
  lawyerType?: 'SOCIO' | 'ASSOCIADO' | 'ESTAGIARIO' | 'EXTERNO';
  affiliation?: 'ESCRITORIO' | 'ADVERSO';
  team?: string;
  email?: string;
  phone?: string;
  phone2?: string;
  instagram?: string;
  facebook?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface LawyerFormData {
  name: string;
  cpf: string;
  oab: string;
  oabState: string;
  lawyerType: 'SOCIO' | 'ASSOCIADO' | 'ESTAGIARIO' | 'EXTERNO';
  affiliation: 'ESCRITORIO' | 'ADVERSO';
  team: string;
  email: string;
  phone: string;
  phone2: string;
  instagram: string;
  facebook: string;
  customField1: string;
  customField2: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
}

const lawyerTypeLabels: Record<string, string> = {
  SOCIO: 'Sócio',
  ASSOCIADO: 'Associado',
  ESTAGIARIO: 'Estagiário',
  EXTERNO: 'Externo',
};

const lawyerTypeBadgeColors: Record<string, string> = {
  SOCIO: 'bg-purple-100 text-purple-800',
  ASSOCIADO: 'bg-blue-100 text-blue-800',
  ESTAGIARIO: 'bg-green-100 text-green-800',
  EXTERNO: 'bg-orange-100 text-orange-800',
};

const affiliationLabels: Record<string, string> = {
  ESCRITORIO: 'Escritório',
  ADVERSO: 'Adverso',
};

const affiliationBadgeColors: Record<string, string> = {
  ESCRITORIO: 'bg-emerald-100 text-emerald-800',
  ADVERSO: 'bg-red-100 text-red-800',
};

// Formatar OAB para exibição
const formatOAB = (oab?: string, oabState?: string) => {
  if (!oab) return '-';
  return oabState ? `${oab}/${oabState}` : oab;
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

export default function Lawyers() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Filtros
  const [filterLawyerType, setFilterLawyerType] = useState('');
  const [filterAffiliation, setFilterAffiliation] = useState('');
  const [filterTeam, setFilterTeam] = useState('');

  // Filtrar advogados com base nos filtros selecionados
  const filteredLawyers = lawyers.filter((lawyer) => {
    const matchesType = !filterLawyerType || lawyer.lawyerType === filterLawyerType;
    const matchesAffiliation = !filterAffiliation || lawyer.affiliation === filterAffiliation;
    const matchesTeam = !filterTeam || lawyer.team?.toLowerCase().includes(filterTeam.toLowerCase());
    return matchesType && matchesAffiliation && matchesTeam;
  });

  // Paginação
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / limit);

  // Export/Import states
  const [exporting, setExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<LawyerFormData>({
    name: '',
    cpf: '',
    oab: '',
    oabState: '',
    lawyerType: 'ASSOCIADO',
    affiliation: 'ESCRITORIO',
    team: '',
    email: '',
    phone: '',
    phone2: '',
    instagram: '',
    facebook: '',
    customField1: '',
    customField2: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
  });

  useEffect(() => {
    loadLawyers();
  }, [search, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const loadLawyers = async () => {
    try {
      const params: any = { search, page, limit };
      const response = await api.get('/lawyers', { params });
      setLawyers(response.data.data);
      setTotal(response.data.total || 0);
    } catch (error) {
      toast.error('Erro ao carregar advogados');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      cpf: '',
      oab: '',
      oabState: '',
      lawyerType: 'ASSOCIADO',
      affiliation: 'ESCRITORIO',
      team: '',
      email: '',
      phone: '',
      phone2: '',
      instagram: '',
      facebook: '',
      customField1: '',
      customField2: '',
      address: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editMode && selectedLawyer) {
        await api.put(`/lawyers/${selectedLawyer.id}`, formData);
        toast.success('Advogado atualizado com sucesso!');
      } else {
        await api.post('/lawyers', formData);
        toast.success('Advogado criado com sucesso!');
      }
      setShowModal(false);
      setEditMode(false);
      setSelectedLawyer(null);
      resetForm();
      loadLawyers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar advogado');
    }
  };

  const handleEdit = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setFormData({
      name: lawyer.name || '',
      cpf: lawyer.cpf || '',
      oab: lawyer.oab || '',
      oabState: lawyer.oabState || '',
      lawyerType: lawyer.lawyerType || 'ASSOCIADO',
      affiliation: lawyer.affiliation || 'ESCRITORIO',
      team: lawyer.team || '',
      email: lawyer.email || '',
      phone: lawyer.phone || '',
      phone2: lawyer.phone2 || '',
      instagram: lawyer.instagram || '',
      facebook: lawyer.facebook || '',
      customField1: (lawyer as any).customField1 || '',
      customField2: (lawyer as any).customField2 || '',
      address: lawyer.address || '',
      neighborhood: (lawyer as any).neighborhood || '',
      city: lawyer.city || '',
      state: lawyer.state || '',
      zipCode: lawyer.zipCode || '',
      notes: lawyer.notes || '',
    });
    setEditMode(true);
    setShowModal(true);
  };

  const handleDelete = async (lawyer: Lawyer) => {
    if (!window.confirm(`Tem certeza que deseja excluir o advogado "${lawyer.name}"?`)) {
      return;
    }

    try {
      await api.delete(`/lawyers/${lawyer.id}`);
      toast.success('Advogado excluído com sucesso!');
      loadLawyers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir advogado');
    }
  };

  const handleViewDetails = (lawyer: Lawyer) => {
    setSelectedLawyer(lawyer);
    setShowDetailsModal(true);
  };

  const handleExport = async () => {
    try {
      setExporting(true);

      const params: Record<string, string> = {};
      if (search) params.search = search;

      const response = await api.get('/lawyers/export/csv', {
        params,
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `advogados_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Advogados exportados com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar advogados');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Selecione um arquivo CSV');
      return;
    }

    try {
      setImporting(true);
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await api.post('/lawyers/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(response.data.message || 'Importação iniciada!');

      setShowImportModal(false);
      setImportFile(null);
      loadLawyers();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao importar CSV');
    } finally {
      setImporting(false);
    }
  };

  // Mobile card items
  const mobileCardItems: MobileCardItem[] = filteredLawyers.map((lawyer) => ({
    id: lawyer.id,
    title: lawyer.name,
    subtitle: formatOAB(lawyer.oab, lawyer.oabState),
    badge: lawyer.lawyerType
      ? {
          text: lawyerTypeLabels[lawyer.lawyerType] || lawyer.lawyerType,
          color: lawyer.lawyerType === 'SOCIO' ? 'purple' as const :
                 lawyer.lawyerType === 'ASSOCIADO' ? 'blue' as const :
                 lawyer.lawyerType === 'ESTAGIARIO' ? 'green' as const : 'yellow' as const
        }
      : undefined,
    fields: [
      { label: 'Vínculo', value: lawyer.affiliation ? affiliationLabels[lawyer.affiliation] : '-' },
      { label: 'Equipe', value: lawyer.team || '-' },
      { label: 'Email', value: lawyer.email || '-' },
      { label: 'Telefone', value: lawyer.phone || '-' },
    ],
    onView: () => handleViewDetails(lawyer),
    onEdit: () => handleEdit(lawyer),
    onDelete: () => handleDelete(lawyer),
  }));

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-slate-100 flex items-center gap-2">
              <Scale className="text-primary-600" />
              Advogados
            </h1>
            <p className="text-sm text-neutral-500 dark:text-slate-400 mt-1">
              Gerencie os advogados do seu escritório
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-neutral-700 dark:text-slate-300 border border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 font-medium rounded-lg transition-all duration-200 min-h-[44px] text-sm"
            >
              <Upload size={18} />
              <span className="hidden sm:inline">Importar</span>
            </button>

            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-neutral-700 dark:text-slate-300 border border-neutral-200 dark:border-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 font-medium rounded-lg transition-all duration-200 min-h-[44px] text-sm disabled:opacity-50"
            >
              <Download size={18} />
              <span className="hidden sm:inline">{exporting ? 'Exportando...' : 'Exportar'}</span>
            </button>

            <button
              onClick={() => {
                resetForm();
                setEditMode(false);
                setSelectedLawyer(null);
                setShowModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 rounded-lg font-medium text-sm transition-all duration-200 min-h-[44px]"
            >
              <Plus size={20} />
              <span>Novo Advogado</span>
            </button>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="flex flex-col gap-4">
          {/* Linha 1: Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 dark:text-slate-500" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, OAB ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
            />
          </div>

          {/* Linha 2: Filtros */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterLawyerType}
              onChange={(e) => setFilterLawyerType(e.target.value)}
              className="flex-1 min-w-[150px] px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-800 text-sm"
            >
              <option value="">Todos os Tipos</option>
              <option value="SOCIO">Sócio</option>
              <option value="ASSOCIADO">Associado</option>
              <option value="ESTAGIARIO">Estagiário</option>
              <option value="EXTERNO">Externo</option>
            </select>

            <select
              value={filterAffiliation}
              onChange={(e) => setFilterAffiliation(e.target.value)}
              className="flex-1 min-w-[150px] px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] bg-white dark:bg-slate-800 text-sm"
            >
              <option value="">Todos os Vínculos</option>
              <option value="ESCRITORIO">Escritório</option>
              <option value="ADVERSO">Adverso</option>
            </select>

            <input
              type="text"
              placeholder="Equipe/Área"
              value={filterTeam}
              onChange={(e) => setFilterTeam(e.target.value)}
              className="flex-1 min-w-[150px] px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px] text-sm"
            />

            {/* Botão limpar filtros */}
            {(filterLawyerType || filterAffiliation || filterTeam) && (
              <button
                onClick={() => {
                  setFilterLawyerType('');
                  setFilterAffiliation('');
                  setFilterTeam('');
                }}
                className="px-3 py-2 text-sm text-neutral-600 dark:text-slate-400 hover:text-neutral-800 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-neutral-200 dark:border-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="animate-spin mx-auto text-primary-600" size={32} />
              <p className="text-neutral-500 dark:text-slate-400 mt-2">Carregando...</p>
            </div>
          ) : filteredLawyers.length === 0 ? (
            <div className="p-8 text-center">
              <Scale size={48} className="mx-auto text-neutral-300 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-slate-100 mb-2">Nenhum advogado encontrado</h3>
              <p className="text-neutral-500 dark:text-slate-400 mb-4">
                {search || filterLawyerType || filterAffiliation || filterTeam
                  ? 'Tente ajustar sua busca ou filtros'
                  : 'Cadastre o primeiro advogado'}
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
                  <thead className="bg-neutral-50 dark:bg-slate-700 border-b border-neutral-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                        OAB
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                        Vínculo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                        Equipe
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                        Contato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-slate-400 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-slate-700">
                    {filteredLawyers.map((lawyer) => (
                      <tr key={lawyer.id} className="hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-neutral-900 dark:text-slate-100">{lawyer.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-slate-400">
                          {formatOAB(lawyer.oab, lawyer.oabState)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {lawyer.lawyerType && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lawyerTypeBadgeColors[lawyer.lawyerType]}`}>
                              {lawyerTypeLabels[lawyer.lawyerType]}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {lawyer.affiliation && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${affiliationBadgeColors[lawyer.affiliation]}`}>
                              {affiliationLabels[lawyer.affiliation]}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-slate-400">
                          {lawyer.team || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-neutral-900 dark:text-slate-100">{lawyer.email || '-'}</div>
                          <div className="text-sm text-neutral-500 dark:text-slate-400">{lawyer.phone || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <ActionsDropdown
                            actions={[
                              { label: 'Ver Detalhes', icon: <Eye size={16} />, onClick: () => handleViewDetails(lawyer), variant: 'info' },
                              { label: 'Editar', icon: <Edit size={16} />, onClick: () => handleEdit(lawyer), variant: 'primary' },
                              { label: 'Excluir', icon: <Trash2 size={16} />, onClick: () => handleDelete(lawyer), variant: 'danger' },
                            ]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-neutral-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-neutral-500 dark:text-slate-400">
                    Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} advogados
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                                : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-100'
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
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-xl w-full max-w-lg">
            <div className="p-6 border-b border-neutral-200 dark:border-slate-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-neutral-800 dark:text-slate-200">Importar Advogados de CSV</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-info-50 border border-info-200 rounded-lg p-4">
                <h4 className="font-medium text-info-800 mb-2">Formato do CSV:</h4>
                <p className="text-sm text-info-700 mb-2">O arquivo deve conter as seguintes colunas:</p>
                <code className="text-xs bg-info-100 px-2 py-1 rounded block overflow-x-auto">
                  Nome;CPF;OAB;UF OAB;Tipo;Vínculo;Equipe;Email;Telefone
                </code>
                <p className="text-xs text-info-600 mt-2">
                  Dica: Exporte primeiro para ver o formato completo
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">Arquivo CSV</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {importFile && (
                  <p className="mt-2 text-sm text-neutral-600 dark:text-slate-400">
                    Arquivo selecionado: {importFile.name}
                  </p>
                )}
              </div>
            </div>
            <div className="p-6 border-t border-neutral-200 dark:border-slate-700 flex gap-3">
              <button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-600 text-white hover:bg-primary-700 disabled:bg-neutral-300 font-medium rounded-lg transition-all duration-200"
              >
                <Upload size={18} />
                {importing ? 'Importando...' : 'Importar'}
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                }}
                disabled={importing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 font-medium rounded-lg transition-all duration-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-slate-100">
                {editMode ? 'Editar Advogado' : 'Novo Advogado'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditMode(false);
                  setSelectedLawyer(null);
                  resetForm();
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="space-y-6">
                {/* Dados Profissionais */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Dados Profissionais</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                        Nome Completo <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">CPF</label>
                      <input
                        type="text"
                        value={formData.cpf}
                        onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Número OAB</label>
                      <input
                        type="text"
                        value={formData.oab}
                        onChange={(e) => setFormData({ ...formData, oab: e.target.value })}
                        placeholder="123456"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Estado OAB</label>
                      <select
                        value={formData.oabState}
                        onChange={(e) => setFormData({ ...formData, oabState: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
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
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Tipo</label>
                      <select
                        value={formData.lawyerType}
                        onChange={(e) => setFormData({ ...formData, lawyerType: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="SOCIO">Sócio</option>
                        <option value="ASSOCIADO">Associado</option>
                        <option value="ESTAGIARIO">Estagiário</option>
                        <option value="EXTERNO">Externo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Vínculo</label>
                      <select
                        value={formData.affiliation}
                        onChange={(e) => setFormData({ ...formData, affiliation: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      >
                        <option value="ESCRITORIO">Escritório</option>
                        <option value="ADVERSO">Adverso</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Equipe/Área</label>
                      <input
                        type="text"
                        value={formData.team}
                        onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                        placeholder="Ex: Trabalhista, Cível, Tributário"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Contato</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Telefone 1</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Telefone 2</label>
                      <input
                        type="text"
                        value={formData.phone2}
                        onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Instagram</label>
                      <input
                        type="text"
                        value={formData.instagram}
                        onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                        placeholder="@usuario"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Facebook</label>
                      <input
                        type="text"
                        value={formData.facebook}
                        onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Outros</label>
                      <input
                        type="text"
                        value={formData.customField1}
                        onChange={(e) => setFormData({ ...formData, customField1: e.target.value })}
                        placeholder="Informações adicionais"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Outros 2</label>
                      <input
                        type="text"
                        value={formData.customField2}
                        onChange={(e) => setFormData({ ...formData, customField2: e.target.value })}
                        placeholder="Informações adicionais"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Endereço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Endereço</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Rua, número, complemento"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={formData.neighborhood}
                        onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                        placeholder="Nome do bairro"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">Estado</label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
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
                      <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">CEP</label>
                      <input
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        placeholder="00000-000"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-4">Observações</h3>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    placeholder="Informações adicionais sobre o advogado..."
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-neutral-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditMode(false);
                    setSelectedLawyer(null);
                    resetForm();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 rounded-lg font-medium text-sm shadow-sm hover:shadow-md transition-all duration-200 min-h-[44px]"
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
      {showDetailsModal && selectedLawyer && (
        <div className="modal-overlay">
          <div className="modal-container sm:max-w-3xl">
            <div className="modal-header">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-slate-100">Detalhes do Advogado</h2>
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedLawyer(null);
                }}
                className="p-2 text-neutral-400 dark:text-slate-500 hover:text-neutral-600 dark:text-slate-400 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body space-y-4 sm:space-y-6">
              {/* Dados Profissionais */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Dados Profissionais</h3>
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Nome Completo</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLawyer.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">CPF</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLawyer.cpf || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">OAB</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{formatOAB(selectedLawyer.oab, selectedLawyer.oabState)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Tipo</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">
                      {selectedLawyer.lawyerType ? lawyerTypeLabels[selectedLawyer.lawyerType] : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Vínculo</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">
                      {selectedLawyer.affiliation ? affiliationLabels[selectedLawyer.affiliation] : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Equipe/Área</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLawyer.team || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Contato</h3>
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Email</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLawyer.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Telefone 1</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLawyer.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Telefone 2</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLawyer.phone2 || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Instagram</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLawyer.instagram || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Facebook</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLawyer.facebook || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Endereço */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Endereço</h3>
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Endereço</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLawyer.address || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Cidade</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLawyer.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Estado</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLawyer.state || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">CEP</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{selectedLawyer.zipCode || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Observações */}
              {selectedLawyer.notes && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Observações</h3>
                  <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
                    <p className="text-sm text-neutral-900 dark:text-slate-100 whitespace-pre-wrap">{selectedLawyer.notes}</p>
                  </div>
                </div>
              )}

              {/* Datas */}
              <div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-3">Informações do Sistema</h3>
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Data de Cadastro</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{formatDateDisplay(selectedLawyer.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 dark:text-slate-400">Última Atualização</p>
                    <p className="text-sm text-neutral-900 dark:text-slate-100 mt-1">{formatDateDisplay(selectedLawyer.updatedAt)}</p>
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
