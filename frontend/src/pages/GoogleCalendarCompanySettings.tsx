import React, { useState, useEffect } from 'react';
import { Calendar, Save, RefreshCw, ExternalLink, Key, Copy, Check } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

interface GoogleCalendarConfig {
  configured: boolean;
  clientId?: string;
  redirectUri?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const GoogleCalendarCompanySettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    isActive: true,
  });

  const [redirectUri, setRedirectUri] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/google-calendar-config');
      const config: GoogleCalendarConfig = response.data;

      if (config.configured) {
        setFormData({
          clientId: config.clientId || '',
          clientSecret: '', // Nunca retorna o secret
          redirectUri: config.redirectUri || '',
          isActive: config.isActive !== false,
        });
        setRedirectUri(config.redirectUri || '');
        setHasConfig(true);
      } else {
        // Buscar redirect URI padrao
        setRedirectUri(`${window.location.origin.replace('app.', 'api.')}/api/google-calendar/callback`);
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Erro ao carregar configuracao:', error);
      }
      // Default redirect URI
      setRedirectUri(`${window.location.origin.replace('app.', 'api.')}/api/google-calendar/callback`);
    }
  };

  const handleTest = async () => {
    if (!formData.clientId) {
      toast.error('Client ID e obrigatorio');
      return;
    }

    setTesting(true);
    try {
      const response = await api.post('/google-calendar-config/test');
      toast.success(response.data.message || 'Configuracao valida!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha ao testar configuracao');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientSecret && !hasConfig) {
      toast.error('Client Secret e obrigatorio');
      return;
    }

    setLoading(true);
    try {
      await api.post('/google-calendar-config', formData);
      toast.success('Configuracao salva com sucesso!');
      setHasConfig(true);
      setFormData({ ...formData, clientSecret: '' }); // Limpar secret do formulario
      loadConfig(); // Recarregar para atualizar o redirectUri
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar configuracao');
    } finally {
      setLoading(false);
    }
  };

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    toast.success('URI copiada!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100 dark:text-white">
              Configuracao Google Calendar
            </h1>
            <p className="text-neutral-600 dark:text-slate-400 dark:text-neutral-400 mt-1">
              Configure as credenciais OAuth para integracao com Google Calendar
            </p>
          </div>
          <Calendar size={32} className="text-blue-600" />
        </div>

        {/* Passo a Passo */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
            <Key size={18} />
            Como obter as credenciais
          </h3>
          <ol className="text-sm text-blue-600 dark:text-blue-400 space-y-2 list-decimal list-inside">
            <li>
              Acesse o{' '}
              <a
                href="https://console.cloud.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-blue-800 dark:hover:text-blue-200 inline-flex items-center gap-1"
              >
                Google Cloud Console
                <ExternalLink size={12} />
              </a>
            </li>
            <li>Crie um novo projeto ou selecione um existente</li>
            <li>Habilite a <strong>Google Calendar API</strong></li>
            <li>Va em <strong>Credenciais</strong> e crie um <strong>ID do cliente OAuth 2.0</strong></li>
            <li>Tipo de aplicativo: <strong>Aplicativo da Web</strong></li>
            <li>Adicione o <strong>URI de redirecionamento autorizado</strong> abaixo</li>
            <li>Copie o <strong>Client ID</strong> e <strong>Client Secret</strong> gerados</li>
          </ol>
        </div>

        {/* URI de Redirecionamento */}
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
          <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 dark:text-neutral-300 mb-2">
            URI de Redirecionamento (copie para o Google Console)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={redirectUri}
              className="flex-1 px-4 py-2 bg-neutral-100 dark:bg-gray-700 border border-neutral-300 dark:border-slate-600 dark:border-gray-600 rounded-md text-neutral-700 dark:text-slate-300 dark:text-neutral-300"
            />
            <button
              type="button"
              onClick={copyRedirectUri}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-gray-700 hover:bg-neutral-200 dark:hover:bg-gray-600 text-neutral-700 dark:text-slate-300 dark:text-neutral-300 rounded-md transition-colors"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white dark:bg-slate-800 dark:bg-gray-800 rounded-lg shadow dark:shadow-slate-700/20 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client ID */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 dark:text-neutral-300 mb-2">
                Client ID *
              </label>
              <input
                type="text"
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                placeholder="xxxxxxxxxxxxx.apps.googleusercontent.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white min-h-[44px]"
              />
            </div>

            {/* Client Secret */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 dark:text-neutral-300 mb-2">
                Client Secret {hasConfig ? '' : '*'}
              </label>
              <input
                type="password"
                required={!hasConfig}
                value={formData.clientSecret}
                onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                placeholder={hasConfig ? 'Deixe em branco para manter o atual' : 'GOCSPX-xxxxxxxxxxxxx'}
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white min-h-[44px]"
              />
            </div>

            {/* Redirect URI personalizado */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 dark:text-neutral-300 mb-2">
                URI de Redirecionamento (opcional)
              </label>
              <input
                type="text"
                value={formData.redirectUri}
                onChange={(e) => setFormData({ ...formData, redirectUri: e.target.value })}
                placeholder="Deixe em branco para usar o padrao"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white min-h-[44px]"
              />
              <p className="text-xs text-neutral-500 dark:text-slate-400 dark:text-neutral-400 mt-1">
                Use apenas se precisar de um URI diferente do padrao
              </p>
            </div>

            {/* Ativo */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-neutral-700 dark:text-slate-300 dark:text-neutral-300">
                Integracao ativa
              </label>
            </div>

            {/* Botoes */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing || !hasConfig}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={20} className={testing ? 'animate-spin' : ''} />
                {testing ? 'Testando...' : 'Testar Configuracao'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-blue-600 text-white hover:bg-blue-700 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>

        {/* Informacoes */}
        <div className="bg-neutral-50 dark:bg-slate-700 dark:bg-gray-750 rounded-lg p-4">
          <h3 className="font-semibold text-neutral-900 dark:text-slate-100 dark:text-white mb-3">
            Informacoes importantes
          </h3>
          <ul className="text-sm text-neutral-600 dark:text-slate-400 dark:text-neutral-400 space-y-2">
            <li>
              <strong>Scopes necessarios:</strong> Apenas <code className="bg-neutral-200 dark:bg-gray-700 px-1 rounded">calendar.events</code> (criar/editar eventos)
            </li>
            <li>
              <strong>Tela de consentimento:</strong> Configure como "Externo" para permitir qualquer conta Google
            </li>
            <li>
              <strong>Status de publicacao:</strong> Mantenha em "Em teste" ate estar pronto para producao
            </li>
            <li>
              <strong>Seguranca:</strong> O Client Secret e criptografado com AES-256 no banco de dados
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default GoogleCalendarCompanySettings;
