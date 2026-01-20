import React, { useState, useEffect } from 'react';
import { Plus, Send, Trash2, Eye, Mail, Users, CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import DOMPurify from 'dompurify';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import ActionsDropdown from '../components/ui/ActionsDropdown';
import { formatDateTime } from '../utils/dateFormatter';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: 'draft' | 'sending' | 'completed' | 'failed' | 'cancelled';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  sentAt?: string;
  user?: { name: string };
}

interface Client {
  id: string;
  name: string;
  email?: string;
  tag?: string;
  clientTags?: { tag: { id: string; name: string } }[];
}

interface Lead {
  id: string;
  name: string;
  email?: string;
  leadTags?: { tag: { id: string; name: string } }[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  preview?: string;
}

const Campaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    useClients: true,
  });

  const [recipientType, setRecipientType] = useState<'clients' | 'leads'>('clients');
  const [recipientFilter, setRecipientFilter] = useState<'all' | 'tag'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / limit);

  const statusLabels = {
    draft: 'Rascunho',
    sending: 'Enviando',
    completed: 'Concluída',
    failed: 'Falhou',
    cancelled: 'Cancelada',
  };

  const statusColors = {
    draft: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200',
    sending: 'bg-info-100 dark:bg-info-700/30 text-info-700 dark:text-info-400',
    completed: 'bg-success-100 dark:bg-success-700/30 text-success-800 dark:text-success-400',
    failed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
    cancelled: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
  };

  useEffect(() => {
    loadClients();
    loadLeads();
    loadTemplates();
    loadTags();
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [page, limit]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/campaigns', { params: { page, limit } });
      setCampaigns(response.data.data);
      setTotal(response.data.total || 0);
    } catch (error) {
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await api.get('/clients', { params: { limit: 1000 } });
      setClients(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadLeads = async () => {
    try {
      const response = await api.get('/leads', { params: { limit: 1000 } });
      setLeads(response.data.data);
    } catch (error) {
      console.error('Erro ao carregar leads:', error);
    }
  };

  const loadTags = async () => {
    try {
      const response = await api.get('/tags');
      setTags(response.data);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await api.get('/campaigns/templates');
      setTemplates(response.data);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
    }
  };

  // Helper to check if entity has a specific tag
  const hasTag = (entity: Client | Lead, tagId: string): boolean => {
    if ('clientTags' in entity && entity.clientTags) {
      return entity.clientTags.some(ct => ct.tag.id === tagId);
    }
    if ('leadTags' in entity && entity.leadTags) {
      return entity.leadTags.some(lt => lt.tag.id === tagId);
    }
    return false;
  };

  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId) {
      setSelectedTemplate('');
      return;
    }

    try {
      const response = await api.get(`/campaigns/templates/${templateId}`);
      const template = response.data;
      setSelectedTemplate(templateId);
      setFormData({
        ...formData,
        name: template.name,
        subject: template.subject,
        body: template.body,
      });
      toast.success('Template carregado!');
    } catch (error) {
      toast.error('Erro ao carregar template');
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.subject || !formData.body) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    // Validar filtro de tag
    if (recipientFilter === 'tag' && !selectedTag) {
      toast.error('Selecione uma tag para filtrar os destinatários');
      return;
    }

    // Preparar destinatários com filtro baseado no tipo selecionado
    let recipients: { email: string; name: string }[] = [];

    if (recipientType === 'clients') {
      let filteredClients = clients.filter((c) => c.email);
      if (recipientFilter === 'tag') {
        filteredClients = filteredClients.filter((c) => hasTag(c, selectedTag));
      }
      recipients = filteredClients.map((c) => ({ email: c.email!, name: c.name }));
    } else {
      let filteredLeads = leads.filter((l) => l.email);
      if (recipientFilter === 'tag') {
        filteredLeads = filteredLeads.filter((l) => hasTag(l, selectedTag));
      }
      recipients = filteredLeads.map((l) => ({ email: l.email!, name: l.name }));
    }

    if (recipients.length === 0) {
      const entityName = recipientType === 'clients' ? 'clientes' : 'leads';
      const tagName = tags.find(t => t.id === selectedTag)?.name;
      const message = recipientFilter === 'tag'
        ? `Nenhum ${entityName.slice(0, -1)} encontrado com a tag "${tagName}" e email cadastrado.`
        : `Nenhum destinatário encontrado. Adicione ${entityName} com email.`;
      toast.error(message);
      return;
    }

    if (recipients.length > 500) {
      toast.error('Máximo de 500 destinatários por campanha');
      return;
    }

    try {
      await api.post('/campaigns', {
        ...formData,
        recipients,
      });
      toast.success('Campanha criada com sucesso!');
      setShowModal(false);
      resetForm();
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar campanha');
    }
  };

  const handleSend = async (id: string) => {
    if (!window.confirm('Confirma o envio desta campanha? Essa ação não pode ser desfeita.')) {
      return;
    }

    try {
      await api.post(`/campaigns/${id}/send`);
      toast.success('Campanha iniciada! Os emails serão enviados em breve.');
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar campanha');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirma a exclusão desta campanha?')) {
      return;
    }

    try {
      await api.delete(`/campaigns/${id}`);
      toast.success('Campanha excluída!');
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir campanha');
    }
  };

  const handleView = async (campaign: Campaign) => {
    try {
      const response = await api.get(`/campaigns/${campaign.id}`);
      setSelectedCampaign(response.data);
      setShowViewModal(true);
    } catch (error) {
      toast.error('Erro ao carregar detalhes da campanha');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      body: '',
      useClients: true,
    });
    setSelectedTemplate('');
    setRecipientType('clients');
    setRecipientFilter('all');
    setSelectedTag('');
  };

  // Calculate recipient counts based on current selection
  const getRecipientCount = (): number => {
    const source = recipientType === 'clients' ? clients : leads;
    let filtered = source.filter((e: any) => e.email);
    if (recipientFilter === 'tag' && selectedTag) {
      filtered = filtered.filter((e: any) => hasTag(e, selectedTag));
    }
    return filtered.length;
  };

  // Alias para compatibilidade
  const formatDate = formatDateTime;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100">
              Campanhas de Email
            </h1>
            <p className="text-neutral-600 dark:text-slate-400 mt-1">
              Envie emails em massa para seus clientes
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-success-100 text-success-700 border border-success-200 hover:bg-success-200 font-medium rounded-lg transition-all duration-200"
          >
            <Plus size={20} />
            Nova Campanha
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 dark:text-slate-400 text-sm">Total de Campanhas</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100">{campaigns.length}</p>
              </div>
              <Mail className="text-success-600" size={32} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 dark:text-slate-400 text-sm">Concluídas</p>
                <p className="text-2xl font-bold text-success-600">
                  {campaigns.filter((c) => c.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="text-success-600" size={32} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 dark:text-slate-400 text-sm">Em Envio</p>
                <p className="text-2xl font-bold text-info-600">
                  {campaigns.filter((c) => c.status === 'sending').length}
                </p>
              </div>
              <Clock className="text-info-600" size={32} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 dark:text-slate-400 text-sm">Clientes com Email</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100">
                  {clients.filter((c) => c.email).length}
                </p>
              </div>
              <Users className="text-success-600" size={32} />
            </div>
          </div>
        </div>

        {/* Lista de Campanhas */}
        {loading ? (
          <div className="text-center py-8 text-neutral-600 dark:text-slate-400">Carregando...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-8 text-center">
            <Mail size={48} className="mx-auto text-neutral-500 dark:text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              Nenhuma campanha criada
            </h3>
            <p className="text-neutral-600 dark:text-slate-400 mb-4">
              Crie sua primeira campanha de email para começar
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-success-100 text-success-700 border border-success-200 hover:bg-success-200 font-medium rounded-lg transition-all duration-200"
            >
              <Plus size={20} />
              Nova Campanha
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 overflow-hidden">
            {/* Mobile Card View */}
            <div className="mobile-card-view">
              <MobileCardList
                items={campaigns.map((campaign): MobileCardItem => ({
                  id: campaign.id,
                  title: campaign.name,
                  subtitle: campaign.subject,
                  badge: {
                    text: statusLabels[campaign.status],
                    color: campaign.status === 'completed' ? 'green' :
                           campaign.status === 'sending' ? 'blue' :
                           campaign.status === 'failed' ? 'red' :
                           campaign.status === 'cancelled' ? 'yellow' : 'gray',
                  },
                  fields: [
                    { label: 'Destinatários', value: String(campaign.totalRecipients) },
                    { label: 'Enviados', value: `${campaign.sentCount} / ${campaign.totalRecipients}${campaign.failedCount > 0 ? ` (${campaign.failedCount} falhas)` : ''}` },
                    { label: 'Data', value: formatDate(campaign.createdAt) },
                  ],
                  onView: () => handleView(campaign),
                  onDelete: campaign.status !== 'sending' ? () => handleDelete(campaign.id) : undefined,
                }))}
                emptyMessage="Nenhuma campanha encontrada"
              />
            </div>

            {/* Desktop Table View */}
            <div className="desktop-table-view">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-slate-700">
                <thead className="bg-neutral-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                      Assunto
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                      Destinatários
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                      Enviados
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                      Data
                    </th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-slate-800 dark:even:bg-slate-700 hover:bg-neutral-100 dark:hover:bg-slate-600 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900 dark:text-slate-100">
                        {campaign.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-slate-400">
                        {campaign.subject}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            statusColors[campaign.status]
                          }`}
                        >
                          {statusLabels[campaign.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-slate-400">
                        {campaign.totalRecipients}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-slate-400">
                        {campaign.sentCount} / {campaign.totalRecipients}
                        {campaign.failedCount > 0 && (
                          <span className="text-red-600 ml-2">({campaign.failedCount} falhas)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-slate-400">
                        {formatDate(campaign.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex justify-end">
                          <ActionsDropdown
                            actions={[
                              {
                                label: 'Visualizar',
                                icon: <Eye size={16} />,
                                onClick: () => handleView(campaign),
                                variant: 'info',
                              },
                              {
                                label: 'Enviar',
                                icon: <Send size={16} />,
                                onClick: () => handleSend(campaign.id),
                                variant: 'success',
                                hidden: campaign.status !== 'draft',
                              },
                              {
                                label: 'Excluir',
                                icon: <Trash2 size={16} />,
                                onClick: () => handleDelete(campaign.id),
                                variant: 'danger',
                                hidden: campaign.status === 'sending',
                              },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && campaigns.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 px-4 py-3">
            <div className="text-sm text-neutral-600 dark:text-slate-400">
              Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} campanhas
            </div>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span className="text-sm text-neutral-600 dark:text-slate-400">por página</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 rounded-md hover:bg-neutral-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-neutral-600 dark:text-slate-400 px-2">
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center justify-center p-2 min-h-[44px] min-w-[44px] bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 text-neutral-700 dark:text-slate-300 rounded-md hover:bg-neutral-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Modal Nova Campanha */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-4">
                  Nova Campanha de Email
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Template Selector */}
                  <div className="bg-success-50 dark:bg-success-700/20 border border-success-200 dark:border-success-600 rounded-lg p-4">
                    <label className="block text-sm font-medium text-primary-800 dark:text-primary-300 mb-2">
                      📝 Usar Template Pronto (Opcional)
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-success-300 dark:border-success-600 text-neutral-900 dark:text-slate-100 rounded-md min-h-[44px]"
                    >
                      <option value="">Selecione um template ou crie do zero</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-success-700 dark:text-success-400 mt-2">
                      💡 Os templates incluem variáveis que serão substituídas automaticamente: {'{nome_cliente}'}, {'{nome_empresa}'}, {'{data}'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Nome da Campanha *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Promoção Black Friday"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-md min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Assunto do Email *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Ex: Desconto de 50% para você!"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-md min-h-[44px]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Corpo do Email (HTML) *
                    </label>
                    <textarea
                      required
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      rows={10}
                      placeholder="<h1>Olá!</h1><p>Sua mensagem aqui...</p>"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-neutral-900 dark:text-slate-100 rounded-md font-mono text-sm min-h-[44px]"
                    />
                    <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                      Você pode usar HTML para formatar o email
                    </p>
                  </div>

                  {/* Filtro de Destinatários */}
                  <div className="bg-info-50 dark:bg-info-700/20 border border-info-200 dark:border-info-600 rounded-lg p-4">
                    <label className="block text-sm font-medium text-info-700 dark:text-info-400 mb-2">
                      📧 Selecionar Destinatários
                    </label>

                    {/* Tipo de destinatário: Clientes ou Leads */}
                    <div className="flex gap-4 mb-4 p-3 bg-white dark:bg-slate-700 rounded-md border border-info-200 dark:border-info-600">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recipientType"
                          checked={recipientType === 'clients'}
                          onChange={() => { setRecipientType('clients'); setSelectedTag(''); }}
                          className="text-info-600"
                        />
                        <span className="text-sm font-medium text-info-700 dark:text-info-400">
                          Clientes ({clients.filter(c => c.email).length})
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recipientType"
                          checked={recipientType === 'leads'}
                          onChange={() => { setRecipientType('leads'); setSelectedTag(''); }}
                          className="text-info-600"
                        />
                        <span className="text-sm font-medium text-info-700 dark:text-info-400">
                          Leads ({leads.filter(l => l.email).length})
                        </span>
                      </label>
                    </div>

                    <div className="space-y-3">
                      {/* Opção: Todos */}
                      <div className="flex items-start">
                        <input
                          type="radio"
                          id="filter-all"
                          name="recipientFilter"
                          checked={recipientFilter === 'all'}
                          onChange={() => { setRecipientFilter('all'); setSelectedTag(''); }}
                          className="mt-0.5 mr-2"
                        />
                        <label htmlFor="filter-all" className="flex-1 cursor-pointer">
                          <span className="text-sm font-medium text-info-700 dark:text-info-400">
                            Todos os {recipientType === 'clients' ? 'clientes' : 'leads'} com email
                          </span>
                          <p className="text-xs text-info-700 dark:text-info-400 mt-0.5">
                            {recipientType === 'clients'
                              ? clients.filter((c) => c.email).length
                              : leads.filter((l) => l.email).length} destinatários
                          </p>
                        </label>
                      </div>

                      {/* Opção: Filtrar por tag */}
                      <div className="flex items-start">
                        <input
                          type="radio"
                          id="filter-tag"
                          name="recipientFilter"
                          checked={recipientFilter === 'tag'}
                          onChange={() => setRecipientFilter('tag')}
                          className="mt-0.5 mr-2"
                        />
                        <label htmlFor="filter-tag" className="flex-1 cursor-pointer">
                          <span className="text-sm font-medium text-info-700 dark:text-info-400">
                            Apenas {recipientType === 'clients' ? 'clientes' : 'leads'} com tag específica
                          </span>
                          {recipientFilter === 'tag' && (
                            <select
                              value={selectedTag}
                              onChange={(e) => setSelectedTag(e.target.value)}
                              className="w-full mt-2 px-3 py-2 bg-white dark:bg-slate-700 border border-info-300 dark:border-info-600 text-neutral-900 dark:text-slate-100 rounded-md text-sm min-h-[44px]"
                            >
                              <option value="">Selecione uma tag</option>
                              {tags.map((tag) => {
                                const source = recipientType === 'clients' ? clients : leads;
                                const count = source.filter((e: any) => e.email && hasTag(e, tag.id)).length;
                                return (
                                  <option key={tag.id} value={tag.id}>
                                    {tag.name} ({count} {count === 1 ? (recipientType === 'clients' ? 'cliente' : 'lead') : (recipientType === 'clients' ? 'clientes' : 'leads')})
                                  </option>
                                );
                              })}
                            </select>
                          )}
                          {recipientFilter === 'tag' && selectedTag && (
                            <p className="text-xs text-info-700 dark:text-info-400 mt-1">
                              {getRecipientCount()} destinatários
                            </p>
                          )}
                        </label>
                      </div>
                    </div>

                    <p className="text-xs text-info-700 dark:text-info-400 mt-3 pt-3 border-t border-info-200 dark:border-info-600">
                      💡 Limite: 500 destinatários por campanha
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-slate-600">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-600 text-neutral-700 dark:text-slate-300 font-medium rounded-lg transition-all duration-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 dark:bg-primary-700/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-600 hover:bg-primary-200 dark:hover:bg-primary-700/50 font-medium rounded-lg transition-all duration-200"
                    >
                      Criar Campanha
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Visualizar */}
        {showViewModal && selectedCampaign && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">
                      {selectedCampaign.name}
                    </h2>
                    <p className="text-neutral-600 dark:text-slate-400 mt-1">
                      {selectedCampaign.subject}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-neutral-500 dark:text-slate-400 hover:text-neutral-600 dark:text-slate-400"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-slate-400">Status</p>
                      <span
                        className={`inline-block px-3 py-1 text-sm font-medium rounded-full mt-1 ${
                          statusColors[selectedCampaign.status]
                        }`}
                      >
                        {statusLabels[selectedCampaign.status]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-slate-400">Total Destinatários</p>
                      <p className="text-lg font-semibold text-neutral-900 dark:text-slate-100">
                        {selectedCampaign.totalRecipients}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-slate-400">Enviados</p>
                      <p className="text-lg font-semibold text-success-600">
                        {selectedCampaign.sentCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-slate-400">Falhas</p>
                      <p className="text-lg font-semibold text-red-600">
                        {selectedCampaign.failedCount}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-slate-600 pt-4">
                    <p className="text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                      Prévia do Email:
                    </p>
                    <div
                      className="bg-neutral-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded p-4"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(selectedCampaign.body, {
                          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'a', 'img', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'div', 'span', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'hr'],
                          ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style', 'class', 'target', 'width', 'height']
                        })
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-neutral-50 dark:hover:bg-slate-600 text-neutral-700 dark:text-slate-300 font-medium rounded-lg transition-all duration-200"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Campaigns;
