import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  MoreHorizontal,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

interface CostCenter {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  type: 'EXPENSE' | 'INCOME' | 'BOTH';
  color: string | null;
  active: boolean;
  _count?: {
    financialTransactions: number;
    accountsPayable: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface CostCenterFormData {
  name: string;
  code: string;
  description: string;
  type: 'EXPENSE' | 'INCOME' | 'BOTH';
  color: string;
  active: boolean;
}

const typeLabels: Record<string, string> = {
  EXPENSE: 'Despesas',
  INCOME: 'Receitas',
  BOTH: 'Ambos',
};

const typeColors: Record<string, string> = {
  EXPENSE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  INCOME: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  BOTH: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const defaultColors = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#ef4444', '#f97316',
  '#f59e0b', '#eab308', '#84cc16', '#22c55e',
  '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1',
];

const CostCenters: React.FC = () => {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const [formData, setFormData] = useState<CostCenterFormData>({
    name: '',
    code: '',
    description: '',
    type: 'BOTH',
    color: '#6366f1',
    active: true,
  });

  useEffect(() => {
    loadCostCenters();
  }, [filterType, filterActive]);

  const loadCostCenters = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterType) params.type = filterType;
      if (filterActive) params.active = filterActive;

      const response = await api.get('/cost-centers', { params });
      setCostCenters(response.data);
    } catch (error: any) {
      console.error('Error loading cost centers:', error);
      toast.error('Erro ao carregar centros de custo');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editingCostCenter) {
        await api.put(`/cost-centers/${editingCostCenter.id}`, formData);
        toast.success('Centro de custo atualizado!');
      } else {
        await api.post('/cost-centers', formData);
        toast.success('Centro de custo criado!');
      }

      setShowModal(false);
      resetForm();
      loadCostCenters();
    } catch (error: any) {
      console.error('Error saving cost center:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar centro de custo');
    }
  };

  const handleEdit = (costCenter: CostCenter) => {
    setEditingCostCenter(costCenter);
    setFormData({
      name: costCenter.name,
      code: costCenter.code || '',
      description: costCenter.description || '',
      type: costCenter.type,
      color: costCenter.color || '#6366f1',
      active: costCenter.active,
    });
    setShowModal(true);
    setActionMenuOpen(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este centro de custo?')) return;

    try {
      await api.delete(`/cost-centers/${id}`);
      toast.success('Centro de custo excluído!');
      loadCostCenters();
    } catch (error: any) {
      console.error('Error deleting cost center:', error);
      toast.error(error.response?.data?.error || 'Erro ao excluir centro de custo');
    }
    setActionMenuOpen(null);
  };

  const handleToggleActive = async (costCenter: CostCenter) => {
    try {
      await api.put(`/cost-centers/${costCenter.id}`, { active: !costCenter.active });
      toast.success(costCenter.active ? 'Centro de custo desativado!' : 'Centro de custo ativado!');
      loadCostCenters();
    } catch (error: any) {
      console.error('Error toggling cost center:', error);
      toast.error('Erro ao atualizar centro de custo');
    }
    setActionMenuOpen(null);
  };

  const resetForm = () => {
    setEditingCostCenter(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      type: 'BOTH',
      color: '#6366f1',
      active: true,
    });
  };

  const filteredCostCenters = costCenters.filter((cc) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (!cc.name.toLowerCase().includes(search) &&
          !cc.code?.toLowerCase().includes(search) &&
          !cc.description?.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <Tag className="w-7 h-7" />
              Centros de Custo
            </h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Categorize suas despesas e receitas para melhor controle financeiro
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Centro de Custo
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nome, código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todos os tipos</option>
            <option value="EXPENSE">Despesas</option>
            <option value="INCOME">Receitas</option>
            <option value="BOTH">Ambos</option>
          </select>
          <select
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>

        {/* Cost Centers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCostCenters.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Tag className="w-12 h-12 mx-auto text-gray-400 dark:text-slate-500 mb-4" />
              <p className="text-gray-500 dark:text-slate-400">Nenhum centro de custo encontrado</p>
              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="mt-4 text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                Criar primeiro centro de custo
              </button>
            </div>
          ) : (
            filteredCostCenters.map((cc) => (
              <div
                key={cc.id}
                className={`bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm transition-shadow hover:shadow-md ${
                  cc.active
                    ? 'border-gray-200 dark:border-slate-700'
                    : 'border-gray-200 dark:border-slate-700 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: cc.color || '#6366f1' }}
                    >
                      <Tag className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-slate-100">{cc.name}</h3>
                      {cc.code && (
                        <p className="text-sm text-gray-500 dark:text-slate-400">{cc.code}</p>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setActionMenuOpen(actionMenuOpen === cc.id ? null : cc.id)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    {actionMenuOpen === cc.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 z-10">
                        <button
                          onClick={() => handleEdit(cc)}
                          className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300"
                        >
                          <Edit2 className="w-4 h-4" /> Editar
                        </button>
                        <button
                          onClick={() => handleToggleActive(cc)}
                          className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300"
                        >
                          {cc.active ? (
                            <>
                              <XCircle className="w-4 h-4" /> Desativar
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" /> Ativar
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(cc.id)}
                          className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {cc.description && (
                  <p className="text-sm text-gray-600 dark:text-slate-400 mb-3 line-clamp-2">
                    {cc.description}
                  </p>
                )}

                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[cc.type]}`}>
                    {typeLabels[cc.type]}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    {(cc._count?.financialTransactions || 0) + (cc._count?.accountsPayable || 0)} transações
                  </span>
                </div>

                {!cc.active && (
                  <div className="mt-3 px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs text-gray-500 dark:text-slate-400 text-center">
                    Inativo
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">
                {editingCostCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Ex: Administrativo"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Ex: ADM"
                    maxLength={10}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Descrição do centro de custo"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Tipo
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="BOTH">Despesas e Receitas</option>
                    <option value="EXPENSE">Apenas Despesas</option>
                    <option value="INCOME">Apenas Receitas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Cor
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-8 h-8 rounded-lg transition-transform ${
                          formData.color === color ? 'ring-2 ring-offset-2 ring-primary-500 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer"
                      title="Escolher outra cor"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 dark:border-slate-600 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="active" className="text-sm text-gray-700 dark:text-slate-300">
                    Centro de custo ativo
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                  >
                    {editingCostCenter ? 'Salvar Alterações' : 'Criar Centro de Custo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="py-2 px-4 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600 rounded-lg font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close action menu */}
      {actionMenuOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActionMenuOpen(null)}
        />
      )}
    </Layout>
  );
};

export default CostCenters;
