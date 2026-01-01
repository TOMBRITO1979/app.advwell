import React, { useState, useEffect } from 'react';
import { MessageCircle, Save, RefreshCw, CheckCircle, XCircle, Phone, Building2, Key, Shield, Download } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

interface WhatsAppConfig {
  id?: string;
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  webhookVerifyToken: string;
  isActive?: boolean;
}

interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  status: string;
  createdAt: string;
}

interface PhoneInfo {
  verifiedName?: string;
  displayPhoneNumber?: string;
  qualityRating?: string;
}

const WhatsAppSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [phoneInfo, setPhoneInfo] = useState<PhoneInfo | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [formData, setFormData] = useState<WhatsAppConfig>({
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    webhookVerifyToken: '',
  });

  useEffect(() => {
    loadConfig();
    loadTemplates();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/whatsapp-config');
      const config = response.data;
      setFormData({
        phoneNumberId: config.phoneNumberId,
        businessAccountId: config.businessAccountId,
        accessToken: '', // Nunca retorna o token
        webhookVerifyToken: '',
      });
      setHasConfig(true);
      setIsActive(config.isActive);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Erro ao carregar configuração:', error);
      }
    }
  };

  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await api.get('/whatsapp-config/templates');
      setTemplates(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Erro ao carregar templates:', error);
      }
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleTest = async () => {
    if (!formData.phoneNumberId || !formData.businessAccountId) {
      toast.error('Preencha o Phone Number ID e Business Account ID');
      return;
    }

    if (!formData.accessToken && !hasConfig) {
      toast.error('Access Token é obrigatório para o primeiro teste');
      return;
    }

    setTesting(true);
    setPhoneInfo(null);
    try {
      const testData = formData.accessToken ? formData : undefined;
      const response = await api.post('/whatsapp-config/test', testData);
      setPhoneInfo(response.data.phoneInfo);
      toast.success('Conexão WhatsApp testada com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao testar conexão');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.accessToken && !hasConfig) {
      toast.error('Access Token é obrigatório');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = formData.accessToken
        ? formData
        : { ...formData, accessToken: 'unchanged' };

      await api.post('/whatsapp-config', dataToSend);
      toast.success('Configuração WhatsApp salva com sucesso!');
      setHasConfig(true);
      setIsActive(true);
      setFormData({ ...formData, accessToken: '' });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    try {
      const response = await api.patch('/whatsapp-config/toggle');
      setIsActive(response.data.config.isActive);
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao alterar status');
    }
  };

  const handleSyncTemplates = async () => {
    setSyncing(true);
    try {
      const response = await api.post('/whatsapp-config/templates/sync');
      setTemplates(response.data.templates);
      toast.success(`${response.data.templates.length} templates sincronizados!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao sincronizar templates');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MARKETING':
        return 'bg-purple-100 text-purple-800';
      case 'UTILITY':
        return 'bg-blue-100 text-blue-800';
      case 'AUTHENTICATION':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">
              Configuração WhatsApp
            </h1>
            <p className="text-neutral-600 mt-1">
              Configure a integração com WhatsApp Business API para campanhas e lembretes
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasConfig && (
              <button
                onClick={handleToggle}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  isActive
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {isActive ? <CheckCircle size={20} /> : <XCircle size={20} />}
                {isActive ? 'Ativo' : 'Inativo'}
              </button>
            )}
            <MessageCircle size={32} className="text-green-600" />
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-700 mb-2">
            Como obter as credenciais
          </h3>
          <ol className="text-sm text-green-600 space-y-1 list-decimal list-inside">
            <li>Acesse <a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline">developers.facebook.com</a></li>
            <li>Crie ou selecione seu aplicativo</li>
            <li>Adicione o produto "WhatsApp"</li>
            <li>Em API Setup, copie o <strong>Phone Number ID</strong> e <strong>WhatsApp Business Account ID</strong></li>
            <li>Gere um <strong>Access Token permanente</strong> em System Users</li>
          </ol>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* IDs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  <Phone size={16} className="inline mr-2" />
                  Phone Number ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.phoneNumberId}
                  onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                  placeholder="123456789012345"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 min-h-[44px]"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  ID do número de telefone no Meta Business
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  <Building2 size={16} className="inline mr-2" />
                  Business Account ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.businessAccountId}
                  onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                  placeholder="987654321098765"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 min-h-[44px]"
                />
                <p className="text-xs text-neutral-500 mt-1">
                  ID da conta WhatsApp Business (WABA)
                </p>
              </div>
            </div>

            {/* Token */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                <Key size={16} className="inline mr-2" />
                Access Token {hasConfig ? '' : '*'}
              </label>
              <textarea
                required={!hasConfig}
                value={formData.accessToken}
                onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                placeholder={hasConfig ? 'Deixe em branco para manter o atual' : 'Token de acesso permanente da Meta'}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 font-mono text-sm"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Token criptografado com AES-256. Nunca é exposto após salvo.
              </p>
            </div>

            {/* Webhook Token */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                <Shield size={16} className="inline mr-2" />
                Webhook Verify Token (opcional)
              </label>
              <input
                type="text"
                value={formData.webhookVerifyToken}
                onChange={(e) => setFormData({ ...formData, webhookVerifyToken: e.target.value })}
                placeholder="Token para verificação do webhook"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 min-h-[44px]"
              />
              <p className="text-xs text-neutral-500 mt-1">
                Use este token ao configurar o webhook no Meta Business
              </p>
            </div>

            {/* Informações do Telefone */}
            {phoneInfo && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-700 mb-2">Informações do Número</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-green-600">Nome Verificado:</span>
                    <div className="font-medium text-green-900">{phoneInfo.verifiedName || '-'}</div>
                  </div>
                  <div>
                    <span className="text-green-600">Número:</span>
                    <div className="font-medium text-green-900">{phoneInfo.displayPhoneNumber || '-'}</div>
                  </div>
                  <div>
                    <span className="text-green-600">Qualidade:</span>
                    <div className="font-medium text-green-900">{phoneInfo.qualityRating || '-'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Botões */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-info-100 text-info-700 border border-info-200 hover:bg-info-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={20} className={testing ? 'animate-spin' : ''} />
                {testing ? 'Testando...' : 'Testar Conexão'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {loading ? 'Salvando...' : 'Salvar Configuração'}
              </button>
            </div>
          </form>
        </div>

        {/* Webhook Info */}
        {hasConfig && (
          <div className="bg-neutral-50 rounded-lg p-4">
            <h3 className="font-semibold text-neutral-900 mb-3">
              Configuração do Webhook
            </h3>
            <div className="text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-neutral-600">URL do Webhook:</span>
                <code className="bg-white px-2 py-1 rounded border text-xs">
                  https://api.advwell.pro/api/whatsapp-webhook
                </code>
              </div>
              <div className="text-neutral-600">
                <strong>Campos para assinar:</strong> messages, message_status_updates
              </div>
            </div>
          </div>
        )}

        {/* Templates */}
        {hasConfig && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-neutral-900">
                Templates de Mensagem
              </h2>
              <button
                onClick={handleSyncTemplates}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 font-medium rounded-lg transition-all disabled:opacity-50"
              >
                <Download size={18} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Sincronizando...' : 'Sincronizar da Meta'}
              </button>
            </div>

            {loadingTemplates ? (
              <div className="text-center py-8 text-neutral-500">
                Carregando templates...
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                Nenhum template encontrado. Clique em "Sincronizar da Meta" para importar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Nome</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Categoria</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Idioma</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-neutral-700">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {templates.map((template) => (
                      <tr key={template.id} className="hover:bg-neutral-50">
                        <td className="px-4 py-3">
                          <code className="text-sm bg-neutral-100 px-2 py-1 rounded">
                            {template.name}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
                            {template.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-neutral-600">
                          {template.language}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(template.status)}`}>
                            {template.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Dicas */}
        <div className="bg-neutral-50 rounded-lg p-4">
          <h3 className="font-semibold text-neutral-900 mb-3">
            Dicas Importantes
          </h3>
          <ul className="text-sm text-neutral-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-500">•</span>
              <span>Templates precisam ser aprovados pela Meta antes do uso (24-48h)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">•</span>
              <span>Use templates da categoria UTILITY para lembretes de consulta</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">•</span>
              <span>Templates MARKETING precisam de opt-in do cliente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">•</span>
              <span>O webhook atualiza automaticamente o status das mensagens (entregue, lida)</span>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default WhatsAppSettings;
