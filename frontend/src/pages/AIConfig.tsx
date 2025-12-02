import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Bot, Save, TestTube, AlertCircle, CheckCircle } from 'lucide-react';

interface AIConfig {
  id?: string;
  provider: string;
  model: string;
  enabled: boolean;
  autoSummarize: boolean;
}

interface ModelOption {
  value: string;
  label: string;
}

interface AvailableModels {
  openai: ModelOption[];
  gemini: ModelOption[];
  anthropic: ModelOption[];
  groq: ModelOption[];
}

const AIConfigPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [availableModels, setAvailableModels] = useState<AvailableModels | null>(null);

  const [config, setConfig] = useState<AIConfig>({
    provider: 'openai',
    model: 'gpt-4o-mini',
    enabled: true,
    autoSummarize: true,
  });

  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadConfig();
    loadAvailableModels();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/ai-config');
      if (response.data) {
        setConfig(response.data);
        setHasConfig(true);
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Erro ao carregar configuração de IA');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableModels = async () => {
    try {
      const response = await api.get('/ai-config/models');
      setAvailableModels(response.data);
    } catch (error) {
      toast.error('Erro ao carregar modelos disponíveis');
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value;
    setConfig(prev => ({
      ...prev,
      provider,
      model: getDefaultModel(provider),
    }));
  };

  const getDefaultModel = (provider: string): string => {
    if (!availableModels) return '';
    const providerModels = availableModels[provider as keyof AvailableModels];
    return providerModels?.[0]?.value || '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleTestConnection = async () => {
    if (!apiKey && !hasConfig) {
      toast.error('Informe a API Key para testar a conexão');
      return;
    }

    setTesting(true);
    try {
      const endpoint = hasConfig ? '/ai-config/test' : '/ai-config/test-provider';
      const data = hasConfig
        ? {}
        : { provider: config.provider, apiKey, model: config.model };

      const response = await api.post(endpoint, data);
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao testar conexão');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasConfig && !apiKey) {
      toast.error('Informe a API Key');
      return;
    }

    setSaving(true);
    try {
      const data = {
        provider: config.provider,
        model: config.model,
        enabled: config.enabled,
        autoSummarize: config.autoSummarize,
        ...(apiKey && { apiKey }),
      };

      const response = await api.post('/ai-config', data);
      setConfig(response.data.config);
      setHasConfig(true);
      setApiKey('');
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar configuração');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja remover a configuração de IA?')) {
      return;
    }

    try {
      await api.delete('/ai-config');
      setConfig({
        provider: 'openai',
        model: 'gpt-4o-mini',
        enabled: true,
        autoSummarize: true,
      });
      setHasConfig(false);
      setApiKey('');
      toast.success('Configuração removida com sucesso');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao remover configuração');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-neutral-500">Carregando...</div>
        </div>
      </Layout>
    );
  }

  const currentModels = availableModels?.[config.provider as keyof AvailableModels] || [];

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
              <Bot className="h-7 w-7 text-primary-600" />
              Configuração de Inteligência Artificial
            </h1>
            <p className="text-neutral-600 mt-2">
              Configure a IA para gerar resumos automáticos dos andamentos processuais em linguagem simples.
            </p>
          </div>

          {/* Info Box */}
          <div className="mb-6 bg-info-50 border border-info-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-info-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-info-800">
                <p className="font-semibold mb-2">Como funciona:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>A IA analisa os andamentos processuais e gera resumos em linguagem simples</li>
                  <li>Você pode escolher entre OpenAI, Google Gemini, Anthropic Claude ou Groq</li>
                  <li>Os resumos são salvos no campo "Informar Cliente" automaticamente</li>
                  <li>Sua API Key é criptografada e armazenada com segurança</li>
                </ul>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            {/* Provider Selection */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-neutral-700 mb-4 flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Provedor de IA
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Provedor *
                  </label>
                  <select
                    name="provider"
                    value={config.provider}
                    onChange={handleProviderChange}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    required
                  >
                    <option value="openai">OpenAI (GPT-4, GPT-4o)</option>
                    <option value="gemini">Google Gemini (Gratuito)</option>
                    <option value="anthropic">Anthropic Claude</option>
                    <option value="groq">Groq (Muito rápido)</option>
                  </select>
                  <p className="text-xs text-neutral-500 mt-1">
                    Escolha o provedor de IA que você deseja usar
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Modelo *
                  </label>
                  <select
                    name="model"
                    value={config.model}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                    required
                  >
                    {currentModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 mt-1">
                    Modelos recomendados têm melhor custo-benefício
                  </p>
                </div>
              </div>
            </div>

            {/* API Key */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                API Key {!hasConfig && '*'}
              </label>

              {/* Status da API Key Salva */}
              {hasConfig && !apiKey && (
                <div className="mb-2 flex items-center gap-2 bg-success-50 border border-primary-200 rounded-md px-3 py-2 min-h-[44px]">
                  <CheckCircle className="h-4 w-4 text-primary-600" />
                  <span className="text-sm text-success-800 font-medium">
                    API Key salva e criptografada com segurança
                  </span>
                </div>
              )}

              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasConfig ? 'Digite aqui SOMENTE para alterar a API Key' : 'Cole sua API Key aqui'}
                  required={!hasConfig}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {hasConfig ? (
                  '🔒 Deixe em branco para manter a API Key atual. Digite apenas se quiser alterar.'
                ) : (
                  <>
                    {config.provider === 'openai' && 'Obtenha em: https://platform.openai.com/api-keys'}
                    {config.provider === 'gemini' && 'Obtenha em: https://aistudio.google.com/app/apikey (Grátis!)'}
                    {config.provider === 'anthropic' && 'Obtenha em: https://console.anthropic.com/settings/keys'}
                    {config.provider === 'groq' && 'Obtenha em: https://console.groq.com/keys'}
                  </>
                )}
              </p>
            </div>

            {/* Toggles */}
            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-neutral-700">
                    IA Ativada
                  </label>
                  <p className="text-xs text-neutral-500">
                    Ative ou desative o uso da IA temporariamente
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="enabled"
                  checked={config.enabled}
                  onChange={handleChange}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-neutral-700">
                    Resumo Automático
                  </label>
                  <p className="text-xs text-neutral-500">
                    Gera resumo automaticamente ao sincronizar processos
                  </p>
                </div>
                <input
                  type="checkbox"
                  name="autoSummarize"
                  checked={config.autoSummarize}
                  onChange={handleChange}
                  className="h-5 w-5 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-info-100 text-info-700 border border-info-200 hover:bg-info-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-info-600 border-t-transparent rounded-full"></div>
                    Testando...
                  </>
                ) : (
                  <>
                    <TestTube size={20} />
                    Testar Conexão
                  </>
                )}
              </button>

              <button
                type="submit"
                disabled={saving || testing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Salvar Configuração
                  </>
                )}
              </button>

              {hasConfig && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving || testing}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remover Configuração
                </button>
              )}
            </div>
          </form>

          {/* Success indicator */}
          {hasConfig && (
            <div className="mt-6 bg-success-50 border border-primary-200 rounded-lg p-4">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0" />
                <div className="text-sm text-success-800">
                  <p className="font-semibold">IA configurada com sucesso!</p>
                  <p className="mt-1">
                    Provedor: <span className="font-mono">{config.provider}</span> |
                    Modelo: <span className="font-mono">{config.model}</span> |
                    Status: <span className="font-semibold">{config.enabled ? 'Ativa' : 'Inativa'}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AIConfigPage;
