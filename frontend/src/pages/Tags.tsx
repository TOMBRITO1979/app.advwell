import { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, Users, UserCheck } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';

interface TagItem {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  _count?: {
    clients: number;
    leads: number;
  };
}

interface TagFormData {
  name: string;
  color: string;
}

const TAG_COLORS = [
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Verde', value: '#22C55E' },
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Amarelo', value: '#EAB308' },
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Laranja', value: '#F97316' },
  { name: 'Ciano', value: '#06B6D4' },
  { name: 'Cinza', value: '#6B7280' },
  { name: 'Indigo', value: '#6366F1' },
];

const initialFormData: TagFormData = {
  name: '',
  color: '#3B82F6',
};

export default function Tags() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [formData, setFormData] = useState<TagFormData>(initialFormData);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const response = await api.get('/tags');
      setTags(response.data);
    } catch (error) {
      toast.error('Erro ao carregar tags');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tag?: TagItem) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({
        name: tag.name,
        color: tag.color,
      });
    } else {
      setEditingTag(null);
      setFormData(initialFormData);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingTag(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Nome da tag é obrigatório');
      return;
    }

    setSaving(true);
    try {
      if (editingTag) {
        await api.put(`/tags/${editingTag.id}`, formData);
        toast.success('Tag atualizada com sucesso');
      } else {
        await api.post('/tags', formData);
        toast.success('Tag criada com sucesso');
      }
      handleCloseModal();
      loadTags();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar tag');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/tags/${id}`);
      toast.success('Tag excluída com sucesso');
      setDeleteConfirm(null);
      loadTags();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir tag');
    }
  };

  // Calculate text color based on background luminance
  const getTextColor = (hexColor: string) => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
                <Tag size={28} className="text-primary-600" />
                Gerenciar Tags
              </h1>
              <p className="text-neutral-600 mt-2">
                Crie e gerencie tags para categorizar seus clientes e leads
              </p>
            </div>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus size={20} />
              Nova Tag
            </button>
          </div>

          {/* Info Box */}
          <div className="mb-6 bg-info-50 border border-info-200 rounded-lg p-4">
            <p className="text-info-800 text-sm">
              As tags permitem categorizar clientes e leads de forma padronizada.
              Cada tag pode ter uma cor personalizada para facilitar a identificação visual.
            </p>
          </div>

          {/* Tags Table */}
          {tags.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <Tag size={48} className="mx-auto text-neutral-300 mb-4" />
              <h3 className="text-lg font-medium text-neutral-700 mb-2">
                Nenhuma tag cadastrada
              </h3>
              <p className="text-neutral-500 mb-4">
                Crie sua primeira tag para começar a categorizar clientes e leads
              </p>
              <button
                onClick={() => handleOpenModal()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Plus size={20} />
                Criar Tag
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <table className="w-full">
                <thead className="bg-neutral-50 border-b border-neutral-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      Tag
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      Cor
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      Clientes
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      Leads
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {tags.map((tag, index) => (
                    <tr key={tag.id} className={index % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                          style={{
                            backgroundColor: tag.color,
                            color: getTextColor(tag.color),
                          }}
                        >
                          {tag.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded border border-neutral-300"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm text-neutral-600">{tag.color}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-neutral-600">
                          <Users size={16} />
                          <span>{tag._count?.clients || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-neutral-600">
                          <UserCheck size={16} />
                          <span>{tag._count?.leads || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(tag)}
                            className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          {deleteConfirm === tag.id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDelete(tag.id)}
                                className="px-2 py-1 text-xs bg-error-600 text-white rounded hover:bg-error-700"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 text-xs bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(tag.id)}
                              className="p-2 text-neutral-600 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal Create/Edit */}
          {showModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                <div className="p-6 border-b border-neutral-200">
                  <h2 className="text-xl font-semibold text-neutral-800">
                    {editingTag ? 'Editar Tag' : 'Nova Tag'}
                  </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6">
                  {/* Name */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Nome da Tag *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: VIP, Trabalhista, Urgente..."
                      className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                      maxLength={50}
                      required
                    />
                  </div>

                  {/* Color */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Cor
                    </label>
                    <div className="grid grid-cols-5 gap-2 mb-3">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, color: color.value })}
                          className={`w-10 h-10 rounded-lg border-2 transition-all ${
                            formData.color === color.value
                              ? 'border-neutral-800 scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        className="w-10 h-10 rounded border border-neutral-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                        placeholder="#3B82F6"
                        pattern="^#[0-9A-Fa-f]{6}$"
                        className="flex-1 px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Preview
                    </label>
                    <div className="p-4 bg-neutral-50 rounded-lg">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: formData.color,
                          color: getTextColor(formData.color),
                        }}
                      >
                        {formData.name || 'Nome da Tag'}
                      </span>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Salvando...' : editingTag ? 'Atualizar' : 'Criar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
