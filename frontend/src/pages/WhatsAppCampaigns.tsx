import React, { useState, useEffect } from 'react';
import {
  Plus, Send, Trash2, MessageCircle, CheckCircle, Clock,
  XCircle, Phone, Download, BarChart3, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import { formatDateTime } from '../utils/dateFormatter';

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
}

interface WhatsAppCampaign {
  id: string;
  name: string;
  status: 'draft' | 'sending' | 'completed' | 'failed' | 'cancelled';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  readCount: number;
  createdAt: string;
  sentAt?: string;
  template?: WhatsAppTemplate;
  user?: { name: string };
  _count?: { recipients: number };
}

interface CampaignStats {
  id: string;
  name: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  readCount: number;
  pendingCount: number;
  deliveryRate: string;
  readRate: string;
  failureRate: string;
}

interface Client {
  id: string;
  name: string;
  phone?: string;
  clientTags?: { tag: { id: string; name: string } }[];
}

interface Lead {
  id: string;
  name: string;
  phone?: string;
  leadTags?: { tag: { id: string; name: string } }[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ImportedRecipient {
  clientId: string;
  name: string;
  phone: string;
  variables: Record<string, string>;
}

interface TemplateVariable {
  index: number;
  example?: string;
}

const WhatsAppCampaigns: React.FC = () => {
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<WhatsAppCampaign | null>(null);
  const [campaignStats, setCampaignStats] = useState<CampaignStats | null>(null);
  const [hasWhatsAppConfig, setHasWhatsAppConfig] = useState(false);
  const [checkingConfig, setCheckingConfig] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    templateId: '',
  });
  const [templateVars, setTemplateVars] = useState<Record<string, string>>({});
  const [selectedTemplateInfo, setSelectedTemplateInfo] = useState<{
    variables: TemplateVariable[];
    bodyText: string;
  } | null>(null);

  const [recipients, setRecipients] = useState<ImportedRecipient[]>([]);
  const [importFilter, setImportFilter] = useState({ tagId: '', limit: 500 });
  const [recipientFilter, setRecipientFilter] = useState<'all' | 'tag'>('all');
  const [importing, setImporting] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [recipientType, setRecipientType] = useState<'clients' | 'leads'>('clients');

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [total, setTotal] = useState(0);

  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    sending: 'Enviando',
    completed: 'Concluída',
    failed: 'Falhou',
    cancelled: 'Cancelada',
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-neutral-100 text-neutral-800',
    sending: 'bg-info-100 text-info-700',
    completed: 'bg-success-100 text-success-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-yellow-100 text-yellow-800',
  };

  useEffect(() => {
    checkConfig();
    loadTemplates();
    loadTags();
    loadClients();
    loadLeads();
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [page, limit]);

  const checkConfig = async () => {
    setCheckingConfig(true);
    try {
      await api.get('/whatsapp-config');
      setHasWhatsAppConfig(true);
    } catch {
      setHasWhatsAppConfig(false);
    } finally {
      setCheckingConfig(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/whatsapp-campaigns', {
        params: { page, limit }
      });
      setCampaigns(response.data.data);
      setTotal(response.data.total || 0);
    } catch (error) {
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await api.get('/whatsapp-config/templates');
      setTemplates(response.data.filter((t: WhatsAppTemplate) => t.status === 'APPROVED'));
    } catch {
      // Silently fail - config might not exist
    }
  };

  const loadTags = async () => {
    try {
      const response = await api.get('/tags');
      setTags(response.data || []);
    } catch {
      // Silently fail
    }
  };

  const loadClients = async () => {
    try {
      const response = await api.get('/clients', { params: { limit: 1000 } });
      setClients(response.data.data || []);
    } catch {
      // Silently fail
    }
  };

  const loadLeads = async () => {
    try {
      const response = await api.get('/leads', { params: { limit: 1000 } });
      setLeads(response.data.data || []);
    } catch {
      // Silently fail
    }
  };

  const hasTag = (entity: Client | Lead, tagId: string): boolean => {
    if ('clientTags' in entity && entity.clientTags) {
      return entity.clientTags.some(ct => ct.tag.id === tagId);
    }
    if ('leadTags' in entity && entity.leadTags) {
      return entity.leadTags.some(lt => lt.tag.id === tagId);
    }
    return false;
  };

  // Parse template to find variables like {{1}}, {{2}}, etc.
  const parseTemplateVariables = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      setSelectedTemplateInfo(null);
      setTemplateVars({});
      return;
    }

    // Find body component
    const components = (template as any).components || [];
    const bodyComponent = components.find((c: any) => c.type === 'BODY');
    const bodyText = bodyComponent?.text || '';

    // Find all {{n}} variables
    const matches = bodyText.match(/\{\{(\d+)\}\}/g) || [];
    const variables: TemplateVariable[] = matches.map((match: string) => {
      const index = parseInt(match.replace(/\{\{|\}\}/g, ''));
      // Get example if available
      const examples = bodyComponent?.example?.body_text?.[0] || [];
      return {
        index,
        example: examples[index - 1] || undefined,
      };
    });

    // Remove duplicates
    const uniqueVars = variables.filter((v, i, arr) =>
      arr.findIndex(x => x.index === v.index) === i
    ).sort((a, b) => a.index - b.index);

    setSelectedTemplateInfo({
      variables: uniqueVars,
      bodyText,
    });

    // Initialize template vars (var 1 will be filled from client name)
    const initialVars: Record<string, string> = {};
    uniqueVars.forEach(v => {
      if (v.index > 1) {
        initialVars[`var${v.index}`] = v.example || '';
      }
    });
    setTemplateVars(initialVars);
  };

  const handleImportRecipients = async () => {
    setImporting(true);
    try {
      // Filter recipients based on recipientType and tag
      const sourceList = recipientType === 'clients' ? clients : leads;
      let filtered = sourceList.filter((entity) => entity.phone && entity.phone.trim());

      // Apply tag filter if selected
      if (recipientFilter === 'tag' && importFilter.tagId) {
        filtered = filtered.filter((entity) => hasTag(entity, importFilter.tagId));
      }

      // Apply limit
      filtered = filtered.slice(0, importFilter.limit);

      // Build variables for each recipient
      const importedRecipients: ImportedRecipient[] = filtered.map((entity) => {
        const vars: Record<string, string> = { '1': entity.name }; // Variable 1 is always the name
        // Add other template variables
        Object.keys(templateVars).forEach(key => {
          const varIndex = key.replace('var', '');
          vars[varIndex] = templateVars[key];
        });
        return {
          clientId: entity.id,
          name: entity.name,
          phone: entity.phone!,
          variables: vars,
        };
      });

      setRecipients(importedRecipients);
      setShowImportModal(false);
      const entityLabel = recipientType === 'clients' ? 'clientes' : 'leads';
      toast.success(`${importedRecipients.length} ${entityLabel} importados!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao importar destinatários');
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.templateId) {
      toast.error('Preencha o nome e selecione um template');
      return;
    }

    if (recipients.length === 0) {
      toast.error('Importe clientes para a campanha');
      return;
    }

    try {
      await api.post('/whatsapp-campaigns', {
        name: formData.name,
        templateId: formData.templateId,
        recipients: recipients.map(r => ({
          phone: r.phone,
          name: r.name,
          variables: r.variables,
        })),
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
    if (!window.confirm('Confirma o envio desta campanha? As mensagens serão enviadas via WhatsApp.')) {
      return;
    }

    try {
      await api.post(`/whatsapp-campaigns/${id}/send`);
      toast.success('Campanha iniciada! As mensagens serão enviadas em breve.');
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar campanha');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Confirma o cancelamento? Mensagens pendentes não serão enviadas.')) {
      return;
    }

    try {
      await api.post(`/whatsapp-campaigns/${id}/cancel`);
      toast.success('Campanha cancelada!');
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao cancelar campanha');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Confirma a exclusão desta campanha?')) {
      return;
    }

    try {
      await api.delete(`/whatsapp-campaigns/${id}`);
      toast.success('Campanha excluída!');
      loadCampaigns();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir campanha');
    }
  };

  const handleView = async (campaign: WhatsAppCampaign) => {
    try {
      const [detailsRes, statsRes] = await Promise.all([
        api.get(`/whatsapp-campaigns/${campaign.id}`),
        api.get(`/whatsapp-campaigns/${campaign.id}/stats`),
      ]);
      setSelectedCampaign(detailsRes.data);
      setCampaignStats(statsRes.data);
      setShowViewModal(true);
    } catch (error) {
      toast.error('Erro ao carregar detalhes');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', templateId: '' });
    setRecipients([]);
    setImportFilter({ tagId: '', limit: 500 });
    setRecipientFilter('all');
    setTemplateVars({});
    setSelectedTemplateInfo(null);
    setRecipientType('clients');
  };

  const getRecipientCount = (): number => {
    const sourceList = recipientType === 'clients' ? clients : leads;
    let filtered = sourceList.filter((entity) => entity.phone && entity.phone.trim());
    if (recipientFilter === 'tag' && importFilter.tagId) {
      filtered = filtered.filter((entity) => hasTag(entity, importFilter.tagId));
    }
    return Math.min(filtered.length, importFilter.limit);
  };

  const getTagCount = (tagId: string): number => {
    const sourceList = recipientType === 'clients' ? clients : leads;
    return sourceList.filter((entity) => entity.phone && entity.phone.trim() && hasTag(entity, tagId)).length;
  };

  const formatDate = formatDateTime;

  // Stats calculation
  const totalCampaigns = campaigns.length;
  const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
  const sendingCampaigns = campaigns.filter(c => c.status === 'sending').length;
  const totalSent = campaigns.reduce((acc, c) => acc + c.sentCount, 0);

  if (checkingConfig) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="animate-spin text-green-600" size={32} />
        </div>
      </Layout>
    );
  }

  if (!hasWhatsAppConfig) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100">Campanhas WhatsApp</h1>
            <p className="text-neutral-600 dark:text-slate-400 mt-1">Envie mensagens em massa via WhatsApp</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertTriangle size={48} className="mx-auto text-yellow-600 mb-4" />
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              WhatsApp não configurado
            </h3>
            <p className="text-yellow-700 mb-4">
              Configure a integração com WhatsApp Business API para criar campanhas.
            </p>
            <a
              href="/whatsapp-settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 font-medium rounded-lg transition-all"
            >
              <MessageCircle size={20} />
              Configurar WhatsApp
            </a>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100">Campanhas WhatsApp</h1>
            <p className="text-neutral-600 dark:text-slate-400 mt-1">Envie mensagens em massa via WhatsApp</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 font-medium rounded-lg transition-all"
          >
            <Plus size={20} />
            Nova Campanha
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 dark:text-slate-400 text-sm">Total</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100">{totalCampaigns}</p>
              </div>
              <MessageCircle className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 dark:text-slate-400 text-sm">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">{completedCampaigns}</p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 dark:text-slate-400 text-sm">Em Envio</p>
                <p className="text-2xl font-bold text-info-600">{sendingCampaigns}</p>
              </div>
              <Clock className="text-info-600" size={32} />
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-neutral-600 dark:text-slate-400 text-sm">Msgs Enviadas</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100">{totalSent}</p>
              </div>
              <Send className="text-green-600" size={32} />
            </div>
          </div>
        </div>

        {/* Templates Info */}
        {templates.length === 0 && (
          <div className="bg-info-50 border border-info-200 rounded-lg p-4">
            <p className="text-info-700">
              <strong>Atenção:</strong> Nenhum template aprovado encontrado.
              <a href="/whatsapp-settings" className="underline ml-1">
                Sincronize os templates
              </a> da Meta para criar campanhas.
            </p>
          </div>
        )}

        {/* Lista de Campanhas */}
        {loading ? (
          <div className="text-center py-8 text-neutral-600 dark:text-slate-400">Carregando...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-8 text-center">
            <MessageCircle size={48} className="mx-auto text-neutral-400 mb-4" />
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 mb-2">
              Nenhuma campanha criada
            </h3>
            <p className="text-neutral-600 dark:text-slate-400 mb-4">
              Crie sua primeira campanha de WhatsApp
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 font-medium rounded-lg transition-all"
            >
              <Plus size={20} />
              Nova Campanha
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 overflow-hidden">
            {/* Mobile View */}
            <div className="mobile-card-view">
              <MobileCardList
                items={campaigns.map((campaign): MobileCardItem => ({
                  id: campaign.id,
                  title: campaign.name,
                  subtitle: campaign.template?.name || 'Template',
                  badge: {
                    text: statusLabels[campaign.status],
                    color: campaign.status === 'completed' ? 'green' :
                           campaign.status === 'sending' ? 'blue' :
                           campaign.status === 'failed' ? 'red' :
                           campaign.status === 'cancelled' ? 'yellow' : 'gray',
                  },
                  fields: [
                    { label: 'Destinatários', value: String(campaign.totalRecipients) },
                    { label: 'Enviados', value: `${campaign.sentCount} / ${campaign.totalRecipients}` },
                    { label: 'Entregues', value: String(campaign.deliveredCount) },
                    { label: 'Lidos', value: String(campaign.readCount) },
                  ],
                  onView: () => handleView(campaign),
                  onDelete: campaign.status !== 'sending' ? () => handleDelete(campaign.id) : undefined,
                }))}
                emptyMessage="Nenhuma campanha encontrada"
              />
            </div>

            {/* Desktop Table */}
            <div className="desktop-table-view">
              <table className="min-w-full divide-y divide-neutral-200 dark:divide-slate-700">
                <thead className="bg-neutral-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Nome</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Template</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Enviados</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Entregues</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Lidos</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Data</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-neutral-900 dark:text-slate-100 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-neutral-200 dark:divide-slate-700">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="odd:bg-white dark:bg-slate-800 even:bg-neutral-50 dark:bg-slate-700 hover:bg-success-100 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-neutral-900 dark:text-slate-100">
                        {campaign.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-slate-400">
                        <code className="text-xs bg-neutral-100 px-2 py-1 rounded">
                          {campaign.template?.name || '-'}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[campaign.status]}`}>
                          {statusLabels[campaign.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-slate-400">
                        {campaign.sentCount} / {campaign.totalRecipients}
                        {campaign.failedCount > 0 && (
                          <span className="text-red-600 ml-1">({campaign.failedCount} falhas)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-green-600 font-medium">
                        {campaign.deliveredCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-blue-600 font-medium">
                        {campaign.readCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-slate-400">
                        {formatDate(campaign.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleView(campaign)}
                            className="p-2 text-info-600 hover:bg-info-50 rounded-md"
                            title="Ver detalhes"
                          >
                            <BarChart3 size={18} />
                          </button>
                          {campaign.status === 'draft' && (
                            <button
                              onClick={() => handleSend(campaign.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-md"
                              title="Enviar"
                            >
                              <Send size={18} />
                            </button>
                          )}
                          {campaign.status === 'sending' && (
                            <button
                              onClick={() => handleCancel(campaign.id)}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-md"
                              title="Cancelar"
                            >
                              <XCircle size={18} />
                            </button>
                          )}
                          {campaign.status !== 'sending' && (
                            <button
                              onClick={() => handleDelete(campaign.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md"
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
          </div>
        )}

        {/* Pagination */}
        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 px-4 py-3">
            <span className="text-sm text-neutral-600 dark:text-slate-400">
              Mostrando {((page - 1) * limit) + 1} a {Math.min(page * limit, total)} de {total} campanhas
            </span>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                className="p-2 rounded-md border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm text-neutral-700 dark:text-slate-300 px-3">
                Página {page} de {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                disabled={page >= Math.ceil(total / limit)}
                className="p-2 rounded-md border border-neutral-300 dark:border-slate-600 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Modal Nova Campanha */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-slate-100 mb-4">
                  Nova Campanha WhatsApp
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Nome da Campanha *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Promoção Janeiro"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md min-h-[44px]"
                    />
                  </div>

                  {/* Template */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Template da Meta *
                    </label>
                    <select
                      required
                      value={formData.templateId}
                      onChange={(e) => {
                        setFormData({ ...formData, templateId: e.target.value });
                        parseTemplateVariables(e.target.value);
                        setRecipients([]); // Clear recipients when template changes
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md min-h-[44px]"
                    >
                      <option value="">Selecione um template aprovado</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.category})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">
                      Apenas templates aprovados pela Meta aparecem aqui
                    </p>
                  </div>

                  {/* Template Variables */}
                  {selectedTemplateInfo && selectedTemplateInfo.variables.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <label className="block text-sm font-medium text-blue-700 mb-2">
                        Variáveis do Template
                      </label>
                      <p className="text-xs text-blue-600 mb-3">
                        Modelo: <code className="bg-blue-100 px-1 rounded">{selectedTemplateInfo.bodyText}</code>
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs text-blue-600">
                          <strong>{'{{1}}'}</strong> = Nome do cliente (preenchido automaticamente)
                        </p>
                        {selectedTemplateInfo.variables.filter(v => v.index > 1).map((v) => (
                          <div key={v.index} className="flex items-center gap-2">
                            <label className="text-sm text-blue-700 w-16">
                              {`{{${v.index}}}`}
                            </label>
                            <input
                              type="text"
                              value={templateVars[`var${v.index}`] || ''}
                              onChange={(e) => setTemplateVars({
                                ...templateVars,
                                [`var${v.index}`]: e.target.value
                              })}
                              placeholder={v.example || `Valor para variável ${v.index}`}
                              className="flex-1 px-3 py-1.5 border border-blue-300 rounded text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Destinatários */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-sm font-medium text-green-700">
                        <Phone size={16} className="inline mr-2" />
                        Destinatários ({recipients.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowImportModal(true)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-md"
                      >
                        <Download size={16} />
                        Importar Clientes
                      </button>
                    </div>

                    {recipients.length === 0 ? (
                      <p className="text-sm text-green-600">
                        Nenhum destinatário selecionado. Clique em "Importar Clientes".
                      </p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-green-700">
                              <th className="text-left py-1">Nome</th>
                              <th className="text-left py-1">Telefone</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recipients.slice(0, 10).map((r, i) => (
                              <tr key={i} className="text-green-600">
                                <td className="py-1">{r.name}</td>
                                <td className="py-1">{r.phone}</td>
                              </tr>
                            ))}
                            {recipients.length > 10 && (
                              <tr>
                                <td colSpan={2} className="text-green-500 py-1">
                                  ... e mais {recipients.length - 10} destinatários
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="bg-neutral-50 dark:bg-slate-700 border border-neutral-200 dark:border-slate-700 rounded-lg p-3 text-sm text-neutral-600 dark:text-slate-400">
                    <p><strong>Limite:</strong> 500 destinatários por campanha</p>
                    <p><strong>Rate limit:</strong> ~5 mensagens por segundo</p>
                  </div>

                  {/* Botões */}
                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => { setShowModal(false); resetForm(); }}
                      className="px-4 py-2 min-h-[44px] border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 font-medium rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={recipients.length === 0}
                      className="px-4 py-2 min-h-[44px] bg-green-100 text-green-700 border border-green-200 hover:bg-green-200 font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Criar Campanha
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal Importar Destinatários */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
              <div className="p-6">
                <h3 className="text-xl font-bold text-neutral-900 dark:text-slate-100 mb-4">
                  Importar Destinatários
                </h3>

                <div className="space-y-4">
                  {/* Tipo de destinatário */}
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                      Tipo de Destinatário
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recipientType"
                          value="clients"
                          checked={recipientType === 'clients'}
                          onChange={() => {
                            setRecipientType('clients');
                            setImportFilter({ ...importFilter, tagId: '' });
                          }}
                          className="text-green-600"
                        />
                        <span className="text-sm text-neutral-700 dark:text-slate-300">Clientes ({clients.filter(c => c.phone).length})</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recipientType"
                          value="leads"
                          checked={recipientType === 'leads'}
                          onChange={() => {
                            setRecipientType('leads');
                            setImportFilter({ ...importFilter, tagId: '' });
                          }}
                          className="text-green-600"
                        />
                        <span className="text-sm text-neutral-700 dark:text-slate-300">Leads ({leads.filter(l => l.phone).length})</span>
                      </label>
                    </div>
                  </div>

                  {/* Filtrar */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300">
                      Filtrar Destinatários
                    </label>

                    {/* Opção: Todos */}
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="filter-all"
                        name="recipientFilterWhatsApp"
                        checked={recipientFilter === 'all'}
                        onChange={() => { setRecipientFilter('all'); setImportFilter({ ...importFilter, tagId: '' }); }}
                        className="mt-0.5 mr-2"
                      />
                      <label htmlFor="filter-all" className="flex-1 cursor-pointer">
                        <span className="text-sm font-medium text-green-700">
                          Todos os {recipientType === 'clients' ? 'clientes' : 'leads'} com telefone
                        </span>
                        <p className="text-xs text-green-600 mt-0.5">
                          {recipientType === 'clients'
                            ? clients.filter((c) => c.phone).length
                            : leads.filter((l) => l.phone).length} destinatários disponíveis
                        </p>
                      </label>
                    </div>

                    {/* Opção: Filtrar por tag */}
                    <div className="flex items-start">
                      <input
                        type="radio"
                        id="filter-tag"
                        name="recipientFilterWhatsApp"
                        checked={recipientFilter === 'tag'}
                        onChange={() => setRecipientFilter('tag')}
                        className="mt-0.5 mr-2"
                      />
                      <label htmlFor="filter-tag" className="flex-1 cursor-pointer">
                        <span className="text-sm font-medium text-green-700">
                          Apenas {recipientType === 'clients' ? 'clientes' : 'leads'} com tag específica
                        </span>
                        {recipientFilter === 'tag' && (
                          <select
                            value={importFilter.tagId}
                            onChange={(e) => setImportFilter({ ...importFilter, tagId: e.target.value })}
                            className="w-full mt-2 px-3 py-2 border border-green-300 rounded-md text-sm min-h-[44px]"
                          >
                            <option value="">Selecione uma tag</option>
                            {tags.map((tag) => {
                              const count = getTagCount(tag.id);
                              return (
                                <option key={tag.id} value={tag.id}>
                                  {tag.name} ({count} {recipientType === 'clients' ? 'clientes' : 'leads'})
                                </option>
                              );
                            })}
                          </select>
                        )}
                        {recipientFilter === 'tag' && importFilter.tagId && (
                          <p className="text-xs text-green-600 mt-1">
                            {getRecipientCount()} destinatários serão importados
                          </p>
                        )}
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-1">
                      Limite
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={importFilter.limit}
                      onChange={(e) => setImportFilter({ ...importFilter, limit: parseInt(e.target.value) || 500 })}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md min-h-[44px]"
                    />
                    <p className="text-xs text-neutral-500 dark:text-slate-400 mt-1">Máximo 500</p>
                  </div>

                  {/* Preview count */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-700">
                      <strong>{getRecipientCount()}</strong> {recipientType === 'clients' ? 'clientes' : 'leads'} com telefone serão importados
                      {recipientFilter === 'tag' && importFilter.tagId && (
                        <span className="block text-xs mt-1">
                          (filtrado pela tag selecionada)
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="px-4 py-2 border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 font-medium rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleImportRecipients}
                      disabled={importing || getRecipientCount() === 0}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 font-medium rounded-lg disabled:opacity-50"
                    >
                      {importing && <RefreshCw size={16} className="animate-spin" />}
                      {importing ? 'Importando...' : 'Importar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Visualizar */}
        {showViewModal && selectedCampaign && campaignStats && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-neutral-900 dark:text-slate-100">
                      {selectedCampaign.name}
                    </h2>
                    <p className="text-neutral-600 dark:text-slate-400 mt-1">
                      Template: <code className="bg-neutral-100 px-2 py-1 rounded text-sm">
                        {selectedCampaign.template?.name}
                      </code>
                    </p>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-neutral-500 dark:text-slate-400 hover:text-neutral-600 dark:text-slate-400 text-xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                    <p className="text-sm text-neutral-600 dark:text-slate-400">Total</p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-slate-100">{campaignStats.totalRecipients}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-green-600">Enviados</p>
                    <p className="text-2xl font-bold text-green-700">{campaignStats.sentCount}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-blue-600">Entregues</p>
                    <p className="text-2xl font-bold text-blue-700">{campaignStats.deliveredCount}</p>
                    <p className="text-xs text-blue-500">{campaignStats.deliveryRate}%</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-sm text-purple-600">Lidos</p>
                    <p className="text-2xl font-bold text-purple-700">{campaignStats.readCount}</p>
                    <p className="text-xs text-purple-500">{campaignStats.readRate}%</p>
                  </div>
                </div>

                {/* Status e Falhas */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-slate-400 mb-1">Status</p>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusColors[campaignStats.status]}`}>
                      {statusLabels[campaignStats.status]}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-600 dark:text-slate-400 mb-1">Falhas</p>
                    <p className="text-lg font-semibold text-red-600">
                      {campaignStats.failedCount}
                      <span className="text-sm font-normal ml-1">({campaignStats.failureRate}%)</span>
                    </p>
                  </div>
                </div>

                {/* Pendentes */}
                {campaignStats.pendingCount > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                    <p className="text-yellow-700">
                      <Clock size={16} className="inline mr-2" />
                      {campaignStats.pendingCount} mensagens pendentes de envio
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="px-4 py-2 border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 font-medium rounded-lg"
                  >
                    Fechar
                  </button>
                  <button
                    onClick={() => { handleView(selectedCampaign); }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-info-100 text-info-700 hover:bg-info-200 font-medium rounded-lg"
                  >
                    <RefreshCw size={16} />
                    Atualizar
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

export default WhatsAppCampaigns;
