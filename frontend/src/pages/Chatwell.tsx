import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { MessageCircle, AlertCircle, Loader2, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

interface ChatwellConfig {
  enabled: boolean;
  url: string | null;
  embedUrl: string | null;
  hasCredentials: boolean;
}

const Chatwell: React.FC = () => {
  const [config, setConfig] = useState<ChatwellConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Recolher sidebar ao montar o componente
  useEffect(() => {
    // Recolher sidebar automaticamente para melhor experiência
    localStorage.setItem('sidebarCollapsed', 'true');
    // Força re-render do Layout disparando evento customizado
    window.dispatchEvent(new CustomEvent('sidebarCollapse', { detail: { collapsed: true } }));
  }, []);

  // Carregar configuração do Chatwell
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await api.get('/companies/own/chatwell');
        setConfig(response.data);

        if (!response.data.enabled) {
          setError('O Chatwell não está habilitado para sua empresa. Entre em contato com o administrador.');
        } else if (!response.data.embedUrl && !response.data.url) {
          setError('O Chatwell não está configurado corretamente. Entre em contato com o administrador.');
        }
      } catch (err: any) {
        const message = err.response?.data?.error || 'Erro ao carregar configuração do Chatwell';
        setError(message);
        if (err.response?.status !== 403) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Abrir em nova aba
  const openInNewTab = useCallback(() => {
    if (config?.embedUrl || config?.url) {
      window.open(config.embedUrl || config.url!, '_blank');
    }
  }, [config]);

  // Tela de loading
  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] bg-neutral-50">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mb-4" />
          <p className="text-neutral-600">Carregando Chatwell...</p>
        </div>
      </Layout>
    );
  }

  // Tela de erro
  if (error || !config?.enabled) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] bg-neutral-50 px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mb-2">Chatwell Indisponível</h2>
            <p className="text-neutral-600 mb-6">{error || 'O acesso ao Chatwell não está disponível no momento.'}</p>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-neutral-100 text-neutral-700 border border-neutral-200 hover:bg-neutral-200 font-medium rounded-lg transition-all duration-200"
            >
              Voltar
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // URL para o iframe - usar URL base sem token (usuário faz login manualmente uma vez)
  const iframeUrl = config.url;

  // Tela cheia (sem Layout)
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-neutral-100 flex flex-col">
        {/* Header minimalista */}
        <div className="bg-white border-b border-neutral-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-neutral-900">Chatwell</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openInNewTab}
              className="inline-flex items-center justify-center p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink size={18} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center justify-center p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
              title="Sair da tela cheia"
            >
              <Minimize2 size={18} />
            </button>
          </div>
        </div>

        {/* Iframe do Chatwell */}
        <div className="flex-1 relative">
          {iframeUrl ? (
            <iframe
              src={iframeUrl}
              className="absolute inset-0 w-full h-full border-0"
              title="Chatwell"
              allow="camera; microphone; clipboard-write; clipboard-read"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-neutral-500">URL do Chatwell não configurada</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Tela normal com Layout (sidebar recolhido)
  return (
    <Layout>
      <div className="h-[calc(100vh-120px)] bg-neutral-100 flex flex-col -m-6">
        {/* Header minimalista */}
        <div className="bg-white border-b border-neutral-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-600" />
            <span className="font-medium text-neutral-900">Chatwell</span>
            <span className="text-xs text-neutral-500 ml-2">
              (Faça login uma vez - a sessão será mantida)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openInNewTab}
              className="inline-flex items-center justify-center p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
              title="Abrir em nova aba"
            >
              <ExternalLink size={18} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center justify-center p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
              title="Tela cheia"
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </div>

        {/* Iframe do Chatwell */}
        <div className="flex-1 relative">
          {iframeUrl ? (
            <iframe
              src={iframeUrl}
              className="absolute inset-0 w-full h-full border-0"
              title="Chatwell"
              allow="camera; microphone; clipboard-write; clipboard-read"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-neutral-500">URL do Chatwell não configurada</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Chatwell;
