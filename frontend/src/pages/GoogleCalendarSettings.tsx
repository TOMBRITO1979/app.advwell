import { useState, useEffect } from 'react';
import { Calendar, Link2, Unlink, RefreshCw, AlertCircle, CheckCircle2, Settings } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface GoogleCalendarStatus {
  connected: boolean;
  email?: string;
  syncEnabled?: boolean;
  enabled?: boolean;
}

export default function GoogleCalendarSettings() {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [configured, setConfigured] = useState(false);

  // Verificar mensagens na URL (callback do OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      toast.success('Google Calendar conectado com sucesso!');
      // Limpar URL
      window.history.replaceState({}, '', '/google-calendar');
    } else if (params.get('error')) {
      const error = params.get('error');
      let message = 'Erro ao conectar Google Calendar';
      if (error === 'access_denied') {
        message = 'Acesso negado. Permita o acesso para continuar.';
      } else if (error === 'callback_failed') {
        message = 'Falha no callback. Tente novamente.';
      }
      toast.error(message);
      window.history.replaceState({}, '', '/google-calendar');
    }
  }, []);

  // Carregar status inicial
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const [configuredRes, statusRes] = await Promise.all([
        api.get('/google-calendar/configured'),
        api.get('/google-calendar/status'),
      ]);
      setConfigured(configuredRes.data.configured);
      setStatus(statusRes.data);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
      toast.error('Erro ao carregar status do Google Calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const response = await api.get('/google-calendar/auth-url');
      // Abrir URL de autorização em nova janela
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Erro ao iniciar conexão:', error);
      toast.error('Erro ao iniciar conexão com Google Calendar');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar sua conta do Google Calendar?')) {
      return;
    }

    try {
      setDisconnecting(true);
      await api.post('/google-calendar/disconnect');
      toast.success('Google Calendar desconectado');
      setStatus({ connected: false });
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      toast.error('Erro ao desconectar Google Calendar');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleToggleSync = async () => {
    if (!status) return;

    try {
      const newSyncEnabled = !status.syncEnabled;
      const response = await api.put('/google-calendar/settings', {
        syncEnabled: newSyncEnabled,
      });
      setStatus(response.data);
      toast.success(newSyncEnabled ? 'Sincronização ativada' : 'Sincronização desativada');
    } catch (error) {
      console.error('Erro ao alterar sincronização:', error);
      toast.error('Erro ao alterar configuração');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Google Calendar</h1>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                Google Calendar nao configurado
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                Para habilitar a integracao com o Google Calendar, o administrador da empresa
                precisa configurar as credenciais do Google Cloud Console.
              </p>
              <p className="text-yellow-700 dark:text-yellow-300 mt-3">
                <a
                  href="/google-calendar-config"
                  className="inline-flex items-center gap-1 text-yellow-800 dark:text-yellow-200 underline hover:text-yellow-900 dark:hover:text-yellow-100"
                >
                  <Settings className="w-4 h-4" />
                  Ir para configuracoes do Google Calendar
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Google Calendar</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md border border-gray-200 dark:border-slate-700">
        {/* Status da Conexao */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {status?.connected ? (
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-500" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {status?.connected ? 'Conectado' : 'Desconectado'}
                </h3>
                {status?.email && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{status.email}</p>
                )}
              </div>
            </div>

            {status?.connected ? (
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
              >
                {disconnecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4" />
                )}
                Desconectar
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {connecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                Conectar
              </button>
            )}
          </div>
        </div>

        {/* Configuracoes (apenas se conectado) */}
        {status?.connected && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Configuracoes</h3>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Sincronizacao automatica
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Criar eventos no Google Calendar automaticamente ao adicionar na agenda
                </p>
              </div>
              <button
                onClick={handleToggleSync}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  status.syncEnabled
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    status.syncEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {!status.enabled && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    A integracao foi desabilitada devido a um erro de autenticacao.
                    Reconecte sua conta para continuar sincronizando.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Informacoes */}
        <div className="p-6 bg-gray-50 dark:bg-slate-700 rounded-b-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">Como funciona?</h4>
          <ul className="text-sm text-gray-600 dark:text-slate-400 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">1.</span>
              Ao criar um evento na agenda do AdvWell, ele sera automaticamente adicionado ao seu Google Calendar.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">2.</span>
              Alteracoes e exclusoes tambem sao sincronizadas automaticamente.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">3.</span>
              Os eventos sao criados no calendario principal da conta conectada.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
