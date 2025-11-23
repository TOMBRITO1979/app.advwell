import React, { useState, useEffect } from 'react';
import { Plus, Send, Trash2, Eye, Mail, Users, CheckCircle, Clock } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

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
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
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

  const [recipientFilter, setRecipientFilter] = useState<'all' | 'tag'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  const statusLabels = {
    draft: 'Rascunho',
    sending: 'Enviando',
    completed: 'Concluída',
    failed: 'Falhou',
    cancelled: 'Cancelada',
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sending: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    cancelled: 'bg-yellow-100 text-yellow-800',
  };

  useEffect(() => {
    loadCampaigns();
    loadClients();
    loadTemplates();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/campaigns');
      setCampaigns(response.data.data);
    } catch (error) {
      toast.error('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await api.get('/clients', { params: { limit: 1000 } });
      const clientsData = response.data.data;
      setClients(clientsData);

      // Extrair tags únicas dos clientes
      const tags = clientsData
        .map((c: Client) => c.tag)
        .filter((tag: string | undefined) => tag && tag.trim())
        .filter((tag: string, index: number, self: string[]) => self.indexOf(tag) === index)
        .sort();
      setAvailableTags(tags);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
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

    // Preparar destinatários com filtro
    let filteredClients = clients.filter((c) => c.email);

    // Aplicar filtro de tag se selecionado
    if (recipientFilter === 'tag') {
      filteredClients = filteredClients.filter((c) => c.tag === selectedTag);
    }

    const recipients = filteredClients.map((c) => ({ email: c.email!, name: c.name }));

    if (recipients.length === 0) {
      const message = recipientFilter === 'tag'
        ? `Nenhum cliente encontrado com a tag "${selectedTag}" e email cadastrado.`
        : 'Nenhum destinatário encontrado. Adicione clientes com email.';
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
    setRecipientFilter('all');
    setSelectedTag('');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Campanhas de Email
            </h1>
            <p className="text-gray-600 mt-1">
              Envie emails em massa para seus clientes
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-neutral-900 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            Nova Campanha
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total de Campanhas</p>
                <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
              </div>
              <Mail className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Concluídas</p>
                <p className="text-2xl font-bold text-green-600">
                  {campaigns.filter((c) => c.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="text-green-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Em Envio</p>
                <p className="text-2xl font-bold text-blue-600">
                  {campaigns.filter((c) => c.status === 'sending').length}
                </p>
              </div>
              <Clock className="text-blue-600" size={32} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Clientes com Email</p>
                <p className="text-2xl font-bold text-gray-900">
                  {clients.filter((c) => c.email).length}
                </p>
              </div>
              <Users className="text-green-600" size={32} />
            </div>
          </div>
        </div>

        {/* Lista de Campanhas */}
        {loading ? (
          <div className="text-center py-8 text-gray-600">Carregando...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Mail size={48} className="mx-auto text-neutral-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma campanha criada
            </h3>
            <p className="text-gray-600 mb-4">
              Crie sua primeira campanha de email para começar
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-neutral-900 px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={20} />
              Nova Campanha
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Assunto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Destinatários
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Enviados
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {campaign.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
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
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {campaign.totalRecipients}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {campaign.sentCount} / {campaign.totalRecipients}
                      {campaign.failedCount > 0 && (
                        <span className="text-red-600 ml-2">({campaign.failedCount} falhas)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatDate(campaign.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleView(campaign)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Visualizar"
                        >
                          <Eye size={18} />
                        </button>
                        {campaign.status === 'draft' && (
                          <button
                            onClick={() => handleSend(campaign.id)}
                            className="text-green-600 hover:text-green-800"
                            title="Enviar"
                          >
                            <Send size={18} />
                          </button>
                        )}
                        {campaign.status !== 'sending' && (
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            className="text-red-600 hover:text-red-800"
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

        {/* Modal Nova Campanha */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Nova Campanha de Email
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Template Selector */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-green-900 mb-2">
                      📝 Usar Template Pronto (Opcional)
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => handleTemplateSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-md"
                    >
                      <option value="">Selecione um template ou crie do zero</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-green-700 mt-2">
                      💡 Os templates incluem variáveis que serão substituídas automaticamente: {'{nome_cliente}'}, {'{nome_empresa}'}, {'{data}'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Campanha *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Promoção Black Friday"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assunto do Email *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      placeholder="Ex: Desconto de 50% para você!"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Corpo do Email (HTML) *
                    </label>
                    <textarea
                      required
                      value={formData.body}
                      onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                      rows={10}
                      placeholder="<h1>Olá!</h1><p>Sua mensagem aqui...</p>"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Você pode usar HTML para formatar o email
                    </p>
                  </div>

                  {/* Filtro de Destinatários */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-blue-900 mb-2">
                      📧 Selecionar Destinatários
                    </label>

                    <div className="space-y-3">
                      {/* Opção: Todos os clientes */}
                      <div className="flex items-start">
                        <input
                          type="radio"
                          id="filter-all"
                          name="recipientFilter"
                          checked={recipientFilter === 'all'}
                          onChange={() => setRecipientFilter('all')}
                          className="mt-0.5 mr-2"
                        />
                        <label htmlFor="filter-all" className="flex-1 cursor-pointer">
                          <span className="text-sm font-medium text-blue-900">
                            Todos os clientes com email
                          </span>
                          <p className="text-xs text-blue-700 mt-0.5">
                            {clients.filter((c) => c.email).length} destinatários
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
                          <span className="text-sm font-medium text-blue-900">
                            Apenas clientes com tag específica
                          </span>
                          {recipientFilter === 'tag' && (
                            <select
                              value={selectedTag}
                              onChange={(e) => setSelectedTag(e.target.value)}
                              className="w-full mt-2 px-3 py-2 border border-blue-300 rounded-md text-sm"
                            >
                              <option value="">Selecione uma tag</option>
                              {availableTags.map((tag) => {
                                const count = clients.filter((c) => c.tag === tag && c.email).length;
                                return (
                                  <option key={tag} value={tag}>
                                    {tag} ({count} {count === 1 ? 'cliente' : 'clientes'})
                                  </option>
                                );
                              })}
                            </select>
                          )}
                          {recipientFilter === 'tag' && selectedTag && (
                            <p className="text-xs text-blue-700 mt-1">
                              {clients.filter((c) => c.tag === selectedTag && c.email).length} destinatários
                            </p>
                          )}
                        </label>
                      </div>
                    </div>

                    <p className="text-xs text-blue-700 mt-3 pt-3 border-t border-blue-200">
                      💡 Limite: 500 destinatários por campanha
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        resetForm();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-neutral-900 rounded-md"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedCampaign.name}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {selectedCampaign.subject}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="text-neutral-500 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span
                        className={`inline-block px-3 py-1 text-sm font-medium rounded-full mt-1 ${
                          statusColors[selectedCampaign.status]
                        }`}
                      >
                        {statusLabels[selectedCampaign.status]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Destinatários</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedCampaign.totalRecipients}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Enviados</p>
                      <p className="text-lg font-semibold text-green-600">
                        {selectedCampaign.sentCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Falhas</p>
                      <p className="text-lg font-semibold text-red-600">
                        {selectedCampaign.failedCount}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Prévia do Email:
                    </p>
                    <div
                      className="border border-gray-300 rounded p-4 bg-gray-50"
                      dangerouslySetInnerHTML={{ __html: selectedCampaign.body }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
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
