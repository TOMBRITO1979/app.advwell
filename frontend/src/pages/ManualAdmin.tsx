import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import {
  Book,
  Plus,
  Pencil,
  Trash2,
  Folder,
  FileText,
  HelpCircle,
  Save,
  X,
  Eye,
  EyeOff,
  Loader2,
  Video,
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

interface ManualCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  order: number;
  active: boolean;
  _count: {
    articles: number;
    faqs: number;
  };
}

interface ManualArticle {
  id: string;
  categoryId: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  order: number;
  active: boolean;
  viewCount: number;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface ManualFAQ {
  id: string;
  categoryId: string | null;
  question: string;
  answer: string;
  order: number;
  active: boolean;
  helpful: number;
  notHelpful: number;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

type Tab = 'categories' | 'articles' | 'faqs';
type ModalType = 'category' | 'article' | 'faq' | null;

const iconOptions = [
  'Rocket', 'Scale', 'Users', 'Calendar', 'DollarSign', 'Bell', 'Settings',
  'Folder', 'Book', 'FileText', 'HelpCircle', 'Home', 'Search', 'Mail',
  'Phone', 'MessageSquare', 'Shield', 'Lock', 'Key', 'Database',
];

export default function ManualAdmin() {
  const [activeTab, setActiveTab] = useState<Tab>('categories');
  const [categories, setCategories] = useState<ManualCategory[]>([]);
  const [articles, setArticles] = useState<ManualArticle[]>([]);
  const [faqs, setFaqs] = useState<ManualFAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalType, setModalType] = useState<ModalType>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<any>({});

  // Filter
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (activeTab === 'articles') {
      loadArticles();
    } else if (activeTab === 'faqs') {
      loadFaqs();
    }
  }, [activeTab, filterCategoryId]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/manual/admin/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const loadArticles = async () => {
    try {
      setLoading(true);
      const params = filterCategoryId ? { categoryId: filterCategoryId } : {};
      const response = await api.get('/manual/admin/articles', { params });
      setArticles(response.data);
    } catch (error) {
      console.error('Erro ao carregar artigos:', error);
      toast.error('Erro ao carregar artigos');
    } finally {
      setLoading(false);
    }
  };

  const loadFaqs = async () => {
    try {
      setLoading(true);
      const params = filterCategoryId ? { categoryId: filterCategoryId } : {};
      const response = await api.get('/manual/admin/faqs', { params });
      setFaqs(response.data);
    } catch (error) {
      console.error('Erro ao carregar FAQs:', error);
      toast.error('Erro ao carregar FAQs');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: ModalType, item?: any) => {
    setModalType(type);
    if (item) {
      setEditingId(item.id);
      setFormData({ ...item });
    } else {
      setEditingId(null);
      if (type === 'category') {
        setFormData({ name: '', slug: '', description: '', icon: 'Folder', order: 0, active: true });
      } else if (type === 'article') {
        setFormData({ categoryId: filterCategoryId || '', title: '', slug: '', summary: '', content: '', videoUrl: '', thumbnailUrl: '', order: 0, active: true });
      } else if (type === 'faq') {
        setFormData({ categoryId: filterCategoryId || null, question: '', answer: '', order: 0, active: true });
      }
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditingId(null);
    setFormData({});
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);

      if (modalType === 'category') {
        if (!formData.name || !formData.slug) {
          toast.error('Nome e slug são obrigatórios');
          return;
        }
        if (editingId) {
          await api.put(`/manual/admin/categories/${editingId}`, formData);
          toast.success('Categoria atualizada');
        } else {
          await api.post('/manual/admin/categories', formData);
          toast.success('Categoria criada');
        }
        loadCategories();
      } else if (modalType === 'article') {
        if (!formData.categoryId || !formData.title || !formData.slug || !formData.content) {
          toast.error('Categoria, título, slug e conteúdo são obrigatórios');
          return;
        }
        if (editingId) {
          await api.put(`/manual/admin/articles/${editingId}`, formData);
          toast.success('Artigo atualizado');
        } else {
          await api.post('/manual/admin/articles', formData);
          toast.success('Artigo criado');
        }
        loadArticles();
      } else if (modalType === 'faq') {
        if (!formData.question || !formData.answer) {
          toast.error('Pergunta e resposta são obrigatórias');
          return;
        }
        if (editingId) {
          await api.put(`/manual/admin/faqs/${editingId}`, formData);
          toast.success('FAQ atualizada');
        } else {
          await api.post('/manual/admin/faqs', formData);
          toast.success('FAQ criada');
        }
        loadFaqs();
      }

      closeModal();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (type: 'category' | 'article' | 'faq', id: string) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;

    try {
      if (type === 'category') {
        await api.delete(`/manual/admin/categories/${id}`);
        toast.success('Categoria excluída');
        loadCategories();
      } else if (type === 'article') {
        await api.delete(`/manual/admin/articles/${id}`);
        toast.success('Artigo excluído');
        loadArticles();
      } else if (type === 'faq') {
        await api.delete(`/manual/admin/faqs/${id}`);
        toast.success('FAQ excluída');
        loadFaqs();
      }
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast.error(error.response?.data?.error || 'Erro ao excluir');
    }
  };

  const toggleActive = async (type: 'category' | 'article' | 'faq', id: string, active: boolean) => {
    try {
      if (type === 'category') {
        await api.put(`/manual/admin/categories/${id}`, { active });
        loadCategories();
      } else if (type === 'article') {
        await api.put(`/manual/admin/articles/${id}`, { active });
        loadArticles();
      } else if (type === 'faq') {
        await api.put(`/manual/admin/faqs/${id}`, { active });
        loadFaqs();
      }
      toast.success(active ? 'Ativado' : 'Desativado');
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const renderCategoriesTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Categorias ({categories.length})
        </h3>
        <button
          onClick={() => openModal('category')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 dark:bg-neutral-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Ordem</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Artigos</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">FAQs</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {categories.map((category) => (
              <tr key={category.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {category.order}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-neutral-400" />
                    <span className="font-medium text-neutral-900 dark:text-white">{category.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {category.slug}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {category._count.articles}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {category._count.faqs}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive('category', category.id, !category.active)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      category.active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                    }`}
                  >
                    {category.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {category.active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal('category', category)}
                      className="p-1 text-neutral-400 hover:text-primary-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete('category', category.id)}
                      className="p-1 text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderArticlesTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Artigos ({articles.length})
        </h3>
        <div className="flex items-center gap-4">
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          >
            <option value="">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <button
            onClick={() => openModal('article')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Novo Artigo
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 dark:bg-neutral-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Ordem</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Título</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Categoria</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Vídeo</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Views</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {articles.map((article) => (
              <tr key={article.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {article.order}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <span className="font-medium text-neutral-900 dark:text-white">{article.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {article.category.name}
                </td>
                <td className="px-4 py-3">
                  {article.videoUrl && (
                    <Video className="w-4 h-4 text-primary-600" />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {article.viewCount}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive('article', article.id, !article.active)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      article.active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                    }`}
                  >
                    {article.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {article.active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal('article', article)}
                      className="p-1 text-neutral-400 hover:text-primary-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete('article', article.id)}
                      className="p-1 text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFaqsTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          FAQs ({faqs.length})
        </h3>
        <div className="flex items-center gap-4">
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          >
            <option value="">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <button
            onClick={() => openModal('faq')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Nova FAQ
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 dark:bg-neutral-700/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Ordem</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Pergunta</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Categoria</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Útil</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {faqs.map((faq) => (
              <tr key={faq.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {faq.order}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-neutral-400" />
                    <span className="font-medium text-neutral-900 dark:text-white line-clamp-1">{faq.question}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                  {faq.category?.name || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">
                  <span className="text-green-600">{faq.helpful}</span> / <span className="text-red-600">{faq.notHelpful}</span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive('faq', faq.id, !faq.active)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                      faq.active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400'
                    }`}
                  >
                    {faq.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {faq.active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal('faq', faq)}
                      className="p-1 text-neutral-400 hover:text-primary-600"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete('faq', faq.id)}
                      className="p-1 text-neutral-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderModal = () => {
    if (!modalType) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-neutral-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {editingId ? 'Editar' : 'Criar'} {modalType === 'category' ? 'Categoria' : modalType === 'article' ? 'Artigo' : 'FAQ'}
            </h3>
            <button onClick={closeModal} className="text-neutral-400 hover:text-neutral-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {modalType === 'category' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        name: e.target.value,
                        slug: editingId ? formData.slug : generateSlug(e.target.value),
                      });
                    }}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Ícone
                  </label>
                  <select
                    value={formData.icon || 'Folder'}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  >
                    {iconOptions.map((icon) => (
                      <option key={icon} value={icon}>{icon}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Ordem
                  </label>
                  <input
                    type="number"
                    value={formData.order || 0}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active !== false}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="active" className="text-sm text-neutral-700 dark:text-neutral-300">
                    Ativo
                  </label>
                </div>
              </>
            )}

            {modalType === 'article' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Título *
                  </label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        title: e.target.value,
                        slug: editingId ? formData.slug : generateSlug(e.target.value),
                      });
                    }}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Resumo
                  </label>
                  <textarea
                    value={formData.summary || ''}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Conteúdo * (HTML)
                  </label>
                  <textarea
                    value={formData.content || ''}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    URL do Vídeo (YouTube/Vimeo)
                  </label>
                  <input
                    type="text"
                    value={formData.videoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    URL da Thumbnail
                  </label>
                  <input
                    type="text"
                    value={formData.thumbnailUrl || ''}
                    onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Ordem
                    </label>
                    <input
                      type="number"
                      value={formData.order || 0}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="active-article"
                        checked={formData.active !== false}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="active-article" className="text-sm text-neutral-700 dark:text-neutral-300">
                        Ativo
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {modalType === 'faq' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Categoria (opcional)
                  </label>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value || null })}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  >
                    <option value="">Sem categoria (FAQ geral)</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Pergunta *
                  </label>
                  <input
                    type="text"
                    value={formData.question || ''}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Resposta * (HTML)
                  </label>
                  <textarea
                    value={formData.answer || ''}
                    onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                    rows={6}
                    className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Ordem
                    </label>
                    <input
                      type="number"
                      value={formData.order || 0}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="active-faq"
                        checked={formData.active !== false}
                        onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="active-faq" className="text-sm text-neutral-700 dark:text-neutral-300">
                        Ativo
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <Layout>
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Book className="w-7 h-7" />
          Gerenciar Manual
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mt-1">
          Gerencie categorias, artigos e FAQs do manual do usuário
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => { setActiveTab('categories'); setFilterCategoryId(''); }}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 -mb-px ${
            activeTab === 'categories'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Folder className="w-4 h-4" />
          Categorias
        </button>
        <button
          onClick={() => setActiveTab('articles')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 -mb-px ${
            activeTab === 'articles'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Artigos
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          className={`flex items-center gap-2 px-4 py-2 border-b-2 -mb-px ${
            activeTab === 'faqs'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          FAQs
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : activeTab === 'categories' ? (
        renderCategoriesTab()
      ) : activeTab === 'articles' ? (
        renderArticlesTab()
      ) : (
        renderFaqsTab()
      )}

      {/* Modal */}
      {renderModal()}
    </div>
    </Layout>
  );
}
