import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Building2, MapPin, Save, Key, Copy, RefreshCw, Eye, EyeOff, ExternalLink, Shield, Trash2, AlertTriangle, Send, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CompanySettings {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logo?: string;
  dpoName?: string;
  dpoEmail?: string;
}

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    logo: '',
    dpoName: '',
    dpoEmail: '',
  });

  // API Key states
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);

  // Delete company states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Telegram states
  const [telegramConfig, setTelegramConfig] = useState<{
    configured: boolean;
    botUsername?: string;
    isActive?: boolean;
  }>({ configured: false });
  const [telegramToken, setTelegramToken] = useState('');
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestChatId, setTelegramTestChatId] = useState('');

  const { logout } = useAuth();

  useEffect(() => {
    loadSettings();
    loadApiKey();
    loadTelegramConfig();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/companies/own');
      setSettings(response.data);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const loadApiKey = async () => {
    try {
      const response = await api.get('/companies/own/api-key');
      setApiKey(response.data.apiKey);
    } catch (error) {
      console.error('Erro ao carregar API Key:', error);
    }
  };

  const loadTelegramConfig = async () => {
    try {
      const response = await api.get('/telegram/config');
      setTelegramConfig(response.data);
    } catch (error) {
      console.error('Erro ao carregar config Telegram:', error);
    }
  };

  const handleSaveTelegram = async () => {
    if (!telegramToken.trim()) {
      toast.error('Informe o token do bot');
      return;
    }

    setSavingTelegram(true);
    try {
      const response = await api.post('/telegram/config', {
        botToken: telegramToken,
        isActive: true,
      });
      setTelegramConfig(response.data);
      setTelegramToken('');
      toast.success('Bot Telegram configurado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao configurar Telegram');
    } finally {
      setSavingTelegram(false);
    }
  };

  const handleToggleTelegram = async () => {
    try {
      const response = await api.put('/telegram/toggle', {
        isActive: !telegramConfig.isActive,
      });
      setTelegramConfig(prev => ({ ...prev, isActive: response.data.isActive }));
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao alterar status');
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramTestChatId.trim()) {
      toast.error('Informe o Chat ID para testar');
      return;
    }

    setTestingTelegram(true);
    try {
      await api.post('/telegram/test', { chatId: telegramTestChatId });
      toast.success('Mensagem de teste enviada! Verifique seu Telegram.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar teste');
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    if (!window.confirm('Tem certeza que deseja regenerar a API Key? Todas as integrações existentes (WhatsApp, N8N, etc) precisarão ser atualizadas com a nova chave.')) {
      return;
    }

    setRegeneratingKey(true);
    try {
      const response = await api.post('/companies/own/api-key/regenerate');
      setApiKey(response.data.apiKey);
      setShowApiKey(true);
      toast.success('API Key regenerada com sucesso!');
    } catch (error) {
      toast.error('Erro ao regenerar API Key');
    } finally {
      setRegeneratingKey(false);
    }
  };

  const handleCopyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success('API Key copiada!');
    }
  };

  const handleDeleteCompany = async () => {
    if (confirmName.trim().toLowerCase() !== settings.name.trim().toLowerCase()) {
      toast.error('O nome da empresa não confere');
      return;
    }

    setDeleting(true);
    try {
      const response = await api.delete('/companies/own', {
        data: { confirmName: confirmName.trim() }
      });

      toast.success(response.data.message || 'Empresa excluída com sucesso');

      // Faz logout após excluir a empresa
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir empresa');
      setDeleting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await api.put('/companies/own', {
        name: settings.name,
        email: settings.email,
        phone: settings.phone,
        address: settings.address,
        city: settings.city,
        state: settings.state,
        zipCode: settings.zipCode,
        logo: settings.logo,
        dpoName: settings.dpoName,
        dpoEmail: settings.dpoEmail,
      });

      setSettings(response.data);
      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-neutral-500 dark:text-slate-400">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
              <Building2 size={28} className="text-primary-600" />
              Configurações da Empresa
            </h1>
            <p className="text-neutral-600 dark:text-slate-400 mt-2">
              Configure os dados da sua empresa. Essas informações serão incluídas nos relatórios em PDF.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-md p-6">
            {/* Informações Básicas */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-neutral-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <Building2 size={20} className="text-primary-600" />
                Informações Básicas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={settings.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={settings.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Telefone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={settings.phone || ''}
                    onChange={handleChange}
                    placeholder="(00) 0000-0000"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    URL do Logo
                  </label>
                  <input
                    type="text"
                    name="logo"
                    value={settings.logo || ''}
                    onChange={handleChange}
                    placeholder="https://exemplo.com/logo.png"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-neutral-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-primary-600" />
                Endereço
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={settings.address || ''}
                    onChange={handleChange}
                    placeholder="Rua, Avenida, número"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={settings.city || ''}
                    onChange={handleChange}
                    placeholder="Ex: São Paulo"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={settings.state || ''}
                    onChange={handleChange}
                    placeholder="Ex: SP"
                    maxLength={2}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 uppercase min-h-[44px]"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    CEP
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={settings.zipCode || ''}
                    onChange={handleChange}
                    placeholder="00000-000"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>
              </div>
            </div>

            {/* Configuração DPO/LGPD */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-neutral-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <Shield size={20} className="text-primary-600" />
                Encarregado de Dados (DPO) - LGPD
              </h2>
              <p className="text-sm text-neutral-600 dark:text-slate-400 mb-4">
                Conforme a LGPD (Lei 13.709/2018), é recomendado que empresas indiquem um Encarregado de Proteção de Dados (DPO).
                Estas informações serão exibidas na Política de Privacidade.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Nome do Encarregado (DPO)
                  </label>
                  <input
                    type="text"
                    name="dpoName"
                    value={settings.dpoName || ''}
                    onChange={handleChange}
                    placeholder="Nome completo do responsável"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Email do Encarregado (DPO)
                  </label>
                  <input
                    type="email"
                    name="dpoEmail"
                    value={settings.dpoEmail || ''}
                    onChange={handleChange}
                    placeholder="dpo@seuescritorio.com.br"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                  />
                </div>
              </div>
              <div className="mt-3 bg-info-50 dark:bg-info-700/20 border border-info-200 dark:border-info-700 rounded-lg p-3">
                <p className="text-sm text-info-700 dark:text-info-200">
                  <strong>O que é o DPO?</strong> O Encarregado de Dados (DPO) é a pessoa responsável por garantir a conformidade
                  com a LGPD na sua empresa. Ele é o ponto de contato entre a empresa, os titulares dos dados e a ANPD.
                </p>
              </div>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>

          {/* Informações Adicionais */}
          <div className="mt-6 bg-success-50 dark:bg-success-700/20 border border-primary-200 dark:border-primary-700 rounded-lg p-4">
            <h3 className="font-semibold text-primary-800 dark:text-primary-200 mb-2">Informação</h3>
            <p className="text-sm text-success-800 dark:text-success-200">
              Os dados configurados aqui serão automaticamente incluídos no cabeçalho dos relatórios
              financeiros em PDF, dando um aspecto mais profissional aos seus documentos.
            </p>
          </div>

          {/* API Key Section */}
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-md p-6">
            <h2 className="text-lg font-semibold text-neutral-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Key size={20} className="text-orange-600" />
              API Key para Integrações
            </h2>
            <p className="text-sm text-neutral-600 dark:text-slate-400 mb-4">
              Use esta chave para integrar com WhatsApp, N8N, Chatwoot ou outros sistemas externos.
              A IA do WhatsApp usará esta chave para consultar processos e agenda dos seus clientes.
            </p>

            <div className="space-y-4">
              {/* API Key Display */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Sua API Key
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      readOnly
                      value={apiKey || 'Nenhuma API Key gerada'}
                      className="w-full px-3 py-2 pr-10 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md bg-neutral-50 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 font-mono text-sm min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:text-slate-300"
                      title={showApiKey ? 'Ocultar' : 'Mostrar'}
                    >
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyApiKey}
                    disabled={!apiKey}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-info-100 text-info-700 border border-info-200 hover:bg-info-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Copiar API Key"
                  >
                    <Copy size={18} />
                    Copiar
                  </button>
                </div>
              </div>

              {/* Regenerate Button */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleRegenerateApiKey}
                  disabled={regeneratingKey}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} className={regeneratingKey ? 'animate-spin' : ''} />
                  {regeneratingKey ? 'Gerando...' : apiKey ? 'Regenerar API Key' : 'Gerar API Key'}
                </button>
                {apiKey && (
                  <span className="text-sm text-neutral-500 dark:text-slate-400">
                    Regenerar invalidará a chave atual
                  </span>
                )}
              </div>

              {/* Usage Instructions */}
              <div className="mt-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 overflow-hidden">
                <h4 className="font-medium text-orange-900 dark:text-orange-200 mb-2">Como usar:</h4>
                <ul className="text-sm text-orange-800 dark:text-orange-300 space-y-1 overflow-hidden">
                  <li className="overflow-hidden"><strong>Header:</strong> <code className="bg-orange-100 dark:bg-orange-800/30 text-orange-900 dark:text-orange-200 px-1 rounded break-all">X-API-Key: sua-api-key</code></li>
                  <li className="overflow-hidden"><strong>Base URL:</strong> <code className="bg-orange-100 dark:bg-orange-800/30 text-orange-900 dark:text-orange-200 px-1 rounded break-all">https://api.advwell.pro/api/integration</code></li>
                </ul>
                <div className="mt-3 text-sm text-orange-800 dark:text-orange-300 overflow-hidden">
                  <strong>Endpoints disponíveis:</strong>
                  <ul className="mt-1 ml-4 list-disc overflow-hidden">
                    <li><code className="break-all">POST /validate-client</code> - Valida CPF + Data Nascimento</li>
                    <li><code className="break-all">GET /client/:id/cases</code> - Lista processos (inclui <strong>informarCliente</strong>)</li>
                    <li><code className="break-all">GET /client/:id/case/:caseId/movements</code> - Movimentações do processo</li>
                    <li><code className="break-all">GET /client/:id/schedule</code> - Lista audiências e prazos</li>
                  </ul>
                  <p className="mt-2 text-xs italic overflow-hidden">
                    O campo <code className="bg-orange-100 dark:bg-orange-800/30 text-orange-900 dark:text-orange-200 px-1 rounded break-all">informarCliente</code> contém a "Informação para o Cliente" de cada processo.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Telegram Bot Configuration */}
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-md p-6">
            <h2 className="text-lg font-semibold text-neutral-700 dark:text-slate-300 mb-4 flex items-center gap-2">
              <Send size={20} className="text-blue-500" />
              Integração Telegram
              {telegramConfig.configured && (
                <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                  telegramConfig.isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-neutral-100 text-neutral-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                  {telegramConfig.isActive ? 'Ativo' : 'Inativo'}
                </span>
              )}
            </h2>
            <p className="text-sm text-neutral-600 dark:text-slate-400 mb-4">
              Configure um bot do Telegram para enviar notificações automáticas de eventos e tarefas para usuários e clientes.
            </p>

            {telegramConfig.configured ? (
              <div className="space-y-4">
                {/* Status atual */}
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg overflow-hidden">
                  <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
                  <div className="min-w-0 overflow-hidden">
                    <p className="font-medium text-green-800 dark:text-green-200">Bot configurado!</p>
                    <p className="text-sm text-green-700 dark:text-green-300 truncate">
                      Username: <code className="bg-green-100 dark:bg-green-800/30 px-1 rounded break-all">{telegramConfig.botUsername}</code>
                    </p>
                  </div>
                </div>

                {/* Toggle ativo/inativo */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-700 dark:text-slate-300">Notificações ativas</span>
                  <button
                    onClick={handleToggleTelegram}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      telegramConfig.isActive ? 'bg-green-500' : 'bg-neutral-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        telegramConfig.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Testar envio */}
                <div className="border-t dark:border-slate-700 pt-4">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Testar envio de mensagem
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={telegramTestChatId}
                      onChange={(e) => setTelegramTestChatId(e.target.value)}
                      placeholder="Informe seu Chat ID"
                      className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md min-h-[44px]"
                    />
                    <button
                      onClick={handleTestTelegram}
                      disabled={testingTelegram || !telegramConfig.isActive}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 font-medium rounded-lg disabled:opacity-50 flex-shrink-0"
                    >
                      <Send size={18} />
                      {testingTelegram ? 'Enviando...' : 'Testar'}
                    </button>
                  </div>
                </div>

                {/* Reconfigurar */}
                <div className="border-t dark:border-slate-700 pt-4">
                  <p className="text-sm text-neutral-500 dark:text-slate-400 mb-2">
                    Para trocar o bot, informe um novo token:
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      placeholder="Novo token do bot"
                      className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md min-h-[44px]"
                    />
                    <button
                      onClick={handleSaveTelegram}
                      disabled={savingTelegram}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200 font-medium rounded-lg disabled:opacity-50 flex-shrink-0"
                    >
                      <RefreshCw size={18} className={savingTelegram ? 'animate-spin' : ''} />
                      {savingTelegram ? 'Salvando...' : 'Atualizar'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Não configurado */}
                <div className="flex items-center gap-3 p-4 bg-neutral-50 dark:bg-slate-700 border border-neutral-200 dark:border-slate-600 rounded-lg">
                  <XCircle className="text-neutral-400" size={24} />
                  <div>
                    <p className="font-medium text-neutral-700 dark:text-slate-300">Bot não configurado</p>
                    <p className="text-sm text-neutral-500 dark:text-slate-400">
                      Configure um bot para enviar notificações
                    </p>
                  </div>
                </div>

                {/* Formulário de configuração */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                    Token do Bot *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={telegramToken}
                      onChange={(e) => setTelegramToken(e.target.value)}
                      placeholder="Cole o token do BotFather aqui"
                      className="flex-1 min-w-0 px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md min-h-[44px]"
                    />
                    <button
                      onClick={handleSaveTelegram}
                      disabled={savingTelegram}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-blue-600 text-white hover:bg-blue-700 font-medium rounded-lg disabled:opacity-50 flex-shrink-0"
                    >
                      <Save size={18} />
                      {savingTelegram ? 'Salvando...' : 'Configurar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Instruções */}
            <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 overflow-hidden">
              <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Como criar um bot:</h4>
              <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal ml-4">
                <li>Abra o Telegram e procure por <strong>@BotFather</strong></li>
                <li>Envie o comando <code className="bg-blue-100 dark:bg-blue-800/30 px-1 rounded">/newbot</code></li>
                <li>Siga as instruções para criar seu bot</li>
                <li>Copie o <strong>token</strong> fornecido e cole acima</li>
              </ol>
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700 overflow-hidden">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Como obter o Chat ID:</h4>
                <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal ml-4 overflow-hidden">
                  <li>O usuário/cliente deve iniciar uma conversa com o bot</li>
                  <li>Enviar qualquer mensagem (ex: /start)</li>
                  <li className="overflow-hidden">Acessar: <code className="bg-blue-100 dark:bg-blue-800/30 px-1 rounded text-xs break-all">https://api.telegram.org/bot[TOKEN]/getUpdates</code></li>
                  <li>O Chat ID aparecerá no campo <code className="bg-blue-100 dark:bg-blue-800/30 px-1 rounded break-all">"chat":{"{"}"id":123456789{"}"}</code></li>
                </ol>
              </div>
            </div>
          </div>

          {/* Embed URLs for Chatwell */}
          {apiKey && (
            <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-md p-6">
              <h2 className="text-lg font-semibold text-neutral-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                <ExternalLink size={20} className="text-purple-600" />
                URLs de Embed para Chatwell
              </h2>
              <p className="text-sm text-neutral-600 dark:text-slate-400 mb-4">
                Use estas URLs para incorporar o AdvWell no painel de aplicativos do Chatwell.
                O login será automático - não será necessário digitar senha.
              </p>

              <div className="space-y-3 overflow-hidden">
                {[
                  { page: 'dashboard', label: 'Dashboard' },
                  { page: 'clients', label: 'Clientes' },
                  { page: 'cases', label: 'Processos' },
                  { page: 'hearings', label: 'Audiências' },
                  { page: 'schedule', label: 'Agenda' },
                  { page: 'todos', label: 'Tarefas' },
                  { page: 'financial', label: 'Financeiro' },
                ].map(({ page, label }) => {
                  const embedUrl = `https://app.advwell.pro/embed/${apiKey}/${page}`;
                  return (
                    <div key={page} className="flex items-center gap-2 min-w-0">
                      <span className="w-24 flex-shrink-0 text-sm font-medium text-neutral-600 dark:text-slate-400">{label}:</span>
                      <input
                        type="text"
                        readOnly
                        value={embedUrl}
                        className="flex-1 min-w-0 px-3 py-1.5 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md bg-neutral-50 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 font-mono text-xs truncate"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(embedUrl);
                          toast.success(`URL de ${label} copiada!`);
                        }}
                        className="flex-shrink-0 p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                        title="Copiar URL"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 dark:text-purple-200 mb-2">Como configurar no Chatwell:</h4>
                <ol className="text-sm text-purple-800 dark:text-purple-300 space-y-1 list-decimal ml-4">
                  <li>Acesse <strong>Configurações &gt; Integrações &gt; Painel de Aplicativos</strong></li>
                  <li>Clique em <strong>Adicionar novo aplicativo</strong></li>
                  <li>Cole uma das URLs acima no campo de URL</li>
                  <li>Dê um nome (ex: "AdvWell - Dashboard")</li>
                  <li>Salve e teste!</li>
                </ol>
                <p className="mt-3 text-xs text-purple-700 dark:text-purple-300 italic">
                  A sidebar será automaticamente ocultada quando acessado via embed.
                </p>
              </div>
            </div>
          )}

          {/* Zona de Perigo - Excluir Empresa */}
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20-md p-6 border-2 border-red-200">
            <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-600" />
              Zona de Perigo
            </h2>
            <p className="text-sm text-neutral-600 dark:text-slate-400 mb-4">
              Ao excluir sua empresa, todos os dados serão permanentemente removidos, incluindo usuários, clientes, processos, documentos e transações financeiras.
              <strong className="text-red-600"> Esta ação é irreversível.</strong>
            </p>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 font-medium rounded-lg transition-all duration-200"
            >
              <Trash2 size={18} />
              Excluir Minha Empresa
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto my-4">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
              <AlertTriangle className="text-red-600" size={24} />
            </div>

            <h3 className="text-lg font-semibold text-neutral-900 dark:text-slate-100 text-center mb-2">
              Excluir Empresa?
            </h3>

            <p className="text-sm text-neutral-600 dark:text-slate-400 text-center mb-4">
              Você está prestes a excluir permanentemente a empresa <strong>{settings.name}</strong> e todos os seus dados.
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">Esta ação é IRREVERSÍVEL!</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Todos os usuários, clientes, processos, documentos, transações e demais dados serão permanentemente excluídos.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                Para confirmar, digite o nome da empresa: <strong>{settings.name}</strong>
              </label>
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder="Digite o nome da empresa"
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setConfirmName('');
                }}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-neutral-50 dark:hover:bg-slate-700 dark:bg-slate-700 text-neutral-700 dark:text-slate-300 font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteCompany}
                disabled={deleting || confirmName.trim().toLowerCase() !== settings.name.trim().toLowerCase()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-red-600 text-white hover:bg-red-700 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={18} />
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Settings;
