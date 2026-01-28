import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import {
  Book,
  Search,
  ChevronRight,
  ChevronDown,
  Play,
  FileText,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Rocket,
  Scale,
  Users,
  Calendar,
  DollarSign,
  Bell,
  Settings,
  Folder,
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

// Mapeamento de nomes de ícones para componentes
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket,
  Scale,
  Users,
  Calendar,
  DollarSign,
  Bell,
  Settings,
  Folder,
  Book,
  FileText,
  HelpCircle,
};

interface ManualCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  order: number;
  articles: ManualArticle[];
  faqs: ManualFAQ[];
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
  content?: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  category?: {
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
  helpful: number;
  notHelpful: number;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

type ViewMode = 'categories' | 'category' | 'article' | 'faqs' | 'search';

export default function Manual() {
  const [categories, setCategories] = useState<ManualCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ManualCategory | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ManualArticle | null>(null);
  const [faqs, setFaqs] = useState<ManualFAQ[]>([]);
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ articles: ManualArticle[]; faqs: ManualFAQ[] }>({ articles: [], faqs: [] });
  const [searching, setSearching] = useState(false);
  const [ratedFaqs, setRatedFaqs] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/manual/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      toast.error('Erro ao carregar o manual');
    } finally {
      setLoading(false);
    }
  };

  const loadCategory = async (slug: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/manual/categories/${slug}`);
      setSelectedCategory(response.data);
      setViewMode('category');
    } catch (error) {
      console.error('Erro ao carregar categoria:', error);
      toast.error('Erro ao carregar categoria');
    } finally {
      setLoading(false);
    }
  };

  const loadArticle = async (categorySlug: string, articleSlug: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/manual/categories/${categorySlug}/articles/${articleSlug}`);
      setSelectedArticle(response.data);
      setViewMode('article');
    } catch (error) {
      console.error('Erro ao carregar artigo:', error);
      toast.error('Erro ao carregar artigo');
    } finally {
      setLoading(false);
    }
  };

  const loadAllFaqs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/manual/faqs');
      setFaqs(response.data);
      setViewMode('faqs');
    } catch (error) {
      console.error('Erro ao carregar FAQs:', error);
      toast.error('Erro ao carregar FAQs');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      toast.error('Digite pelo menos 2 caracteres para buscar');
      return;
    }

    try {
      setSearching(true);
      const response = await api.get('/manual/search', { params: { q: searchQuery } });
      setSearchResults(response.data);
      setViewMode('search');
    } catch (error) {
      console.error('Erro ao buscar:', error);
      toast.error('Erro ao buscar no manual');
    } finally {
      setSearching(false);
    }
  };

  const rateFaq = async (faqId: string, helpful: boolean) => {
    if (ratedFaqs.has(faqId)) {
      toast.error('Você já avaliou esta resposta');
      return;
    }

    try {
      await api.post(`/manual/faqs/${faqId}/rate`, { helpful });
      setRatedFaqs(prev => new Set([...prev, faqId]));
      toast.success('Obrigado pelo feedback!');
    } catch (error) {
      console.error('Erro ao avaliar FAQ:', error);
    }
  };

  const toggleFaq = (faqId: string) => {
    setExpandedFaqs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(faqId)) {
        newSet.delete(faqId);
      } else {
        newSet.add(faqId);
      }
      return newSet;
    });
  };

  const goBack = () => {
    if (viewMode === 'article') {
      if (selectedArticle?.category) {
        loadCategory(selectedArticle.category.slug);
      } else {
        setViewMode('categories');
        setSelectedArticle(null);
      }
    } else if (viewMode === 'category') {
      setViewMode('categories');
      setSelectedCategory(null);
    } else if (viewMode === 'faqs' || viewMode === 'search') {
      setViewMode('categories');
    }
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return Folder;
    return iconMap[iconName] || Folder;
  };

  const renderCategoryCard = (category: ManualCategory) => {
    const Icon = getIcon(category.icon);
    return (
      <div
        key={category.id}
        className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => loadCategory(category.slug)}
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">
              {category.name}
            </h3>
            {category.description && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                {category.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
              {category._count.articles > 0 && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {category._count.articles} artigo{category._count.articles !== 1 ? 's' : ''}
                </span>
              )}
              {category._count.faqs > 0 && (
                <span className="flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" />
                  {category._count.faqs} FAQ{category._count.faqs !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-neutral-400" />
        </div>
      </div>
    );
  };

  const renderArticleCard = (article: ManualArticle, categorySlug?: string) => (
    <div
      key={article.id}
      className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => loadArticle(categorySlug || article.category?.slug || '', article.slug)}
    >
      <div className="flex items-start gap-4">
        {article.thumbnailUrl ? (
          <img
            src={article.thumbnailUrl}
            alt={article.title}
            className="w-24 h-16 object-cover rounded"
          />
        ) : article.videoUrl ? (
          <div className="w-24 h-16 bg-neutral-100 dark:bg-neutral-700 rounded flex items-center justify-center">
            <Play className="w-8 h-8 text-neutral-400" />
          </div>
        ) : (
          <div className="w-24 h-16 bg-neutral-100 dark:bg-neutral-700 rounded flex items-center justify-center">
            <FileText className="w-8 h-8 text-neutral-400" />
          </div>
        )}
        <div className="flex-1">
          <h4 className="font-medium text-neutral-900 dark:text-white mb-1">
            {article.title}
          </h4>
          {article.summary && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-2">
              {article.summary}
            </p>
          )}
          {article.videoUrl && (
            <span className="inline-flex items-center gap-1 mt-2 text-xs text-primary-600 dark:text-primary-400">
              <Play className="w-3 h-3" />
              Vídeo disponível
            </span>
          )}
        </div>
        <ChevronRight className="w-5 h-5 text-neutral-400" />
      </div>
    </div>
  );

  const renderFaqItem = (faq: ManualFAQ) => {
    const isExpanded = expandedFaqs.has(faq.id);
    const hasRated = ratedFaqs.has(faq.id);

    return (
      <div
        key={faq.id}
        className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden"
      >
        <button
          className="w-full px-4 py-3 flex items-center justify-between text-left"
          onClick={() => toggleFaq(faq.id)}
        >
          <span className="font-medium text-neutral-900 dark:text-white">
            {faq.question}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-neutral-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-5 h-5 text-neutral-400 flex-shrink-0" />
          )}
        </button>
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-neutral-100 dark:border-neutral-700">
            <div
              className="text-neutral-600 dark:text-neutral-400 py-3 prose dark:prose-invert max-w-none prose-sm"
              dangerouslySetInnerHTML={{ __html: faq.answer }}
            />
            {!hasRated && (
              <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-700">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">
                  Esta resposta foi útil?
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); rateFaq(faq.id, true); }}
                  className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/30 rounded text-neutral-400 hover:text-green-600"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); rateFaq(faq.id, false); }}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-neutral-400 hover:text-red-600"
                >
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderArticleContent = () => {
    if (!selectedArticle) return null;

    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <article className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
          {selectedArticle.category && (
            <div className="text-sm text-primary-600 dark:text-primary-400 mb-2">
              {selectedArticle.category.name}
            </div>
          )}
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-4">
            {selectedArticle.title}
          </h1>

          {selectedArticle.videoUrl && (
            <div className="mb-6">
              <div className="aspect-video bg-neutral-900 rounded-lg overflow-hidden">
                {selectedArticle.videoUrl.includes('youtube.com') || selectedArticle.videoUrl.includes('youtu.be') ? (
                  <iframe
                    src={selectedArticle.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    className="w-full h-full"
                    allowFullScreen
                    title={selectedArticle.title}
                  />
                ) : selectedArticle.videoUrl.includes('vimeo.com') ? (
                  <iframe
                    src={selectedArticle.videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/')}
                    className="w-full h-full"
                    allowFullScreen
                    title={selectedArticle.title}
                  />
                ) : (
                  <a
                    href={selectedArticle.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center h-full text-white hover:text-primary-400"
                  >
                    <ExternalLink className="w-8 h-8 mr-2" />
                    Abrir vídeo em nova aba
                  </a>
                )}
              </div>
            </div>
          )}

          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: selectedArticle.content || '' }}
          />
        </article>
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <Book className="w-7 h-7" />
            Manual do Usuário
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-1">
            Aprenda a usar todas as funcionalidades do AdvWell
          </p>
        </div>

        {/* Search */}
        <div className="flex w-full md:w-auto gap-2">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar no manual..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 pr-4 py-2 w-full md:w-64 min-h-[44px] border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 min-h-[44px] bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex-shrink-0"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
          </button>
        </div>
      </div>

      {/* Quick Links */}
      {viewMode === 'categories' && (
        <div className="flex items-center gap-4">
          <button
            onClick={loadAllFaqs}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
          >
            <HelpCircle className="w-4 h-4" />
            Ver todas as FAQs
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      ) : viewMode === 'categories' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(renderCategoryCard)}
        </div>
      ) : viewMode === 'category' && selectedCategory ? (
        <div className="space-y-6">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar às categorias
          </button>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              {(() => { const Icon = getIcon(selectedCategory.icon); return <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />; })()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                {selectedCategory.name}
              </h2>
              {selectedCategory.description && (
                <p className="text-neutral-600 dark:text-neutral-400">
                  {selectedCategory.description}
                </p>
              )}
            </div>
          </div>

          {selectedCategory.articles.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Artigos e Tutoriais
              </h3>
              <div className="space-y-3">
                {selectedCategory.articles.map(article => renderArticleCard(article, selectedCategory.slug))}
              </div>
            </div>
          )}

          {selectedCategory.faqs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <HelpCircle className="w-5 h-5" />
                Perguntas Frequentes
              </h3>
              <div className="space-y-3">
                {selectedCategory.faqs.map(renderFaqItem)}
              </div>
            </div>
          )}
        </div>
      ) : viewMode === 'article' ? (
        renderArticleContent()
      ) : viewMode === 'faqs' ? (
        <div className="space-y-6">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar às categorias
          </button>

          <h2 className="text-xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <HelpCircle className="w-6 h-6" />
            Perguntas Frequentes
          </h2>

          <div className="space-y-3">
            {faqs.map(renderFaqItem)}
          </div>
        </div>
      ) : viewMode === 'search' ? (
        <div className="space-y-6">
          <button
            onClick={goBack}
            className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar às categorias
          </button>

          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            Resultados para "{searchQuery}"
          </h2>

          {searchResults.articles.length === 0 && searchResults.faqs.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
              Nenhum resultado encontrado
            </div>
          ) : (
            <>
              {searchResults.articles.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Artigos ({searchResults.articles.length})
                  </h3>
                  <div className="space-y-3">
                    {searchResults.articles.map(article => renderArticleCard(article))}
                  </div>
                </div>
              )}

              {searchResults.faqs.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    FAQs ({searchResults.faqs.length})
                  </h3>
                  <div className="space-y-3">
                    {searchResults.faqs.map(renderFaqItem)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
    </Layout>
  );
}
