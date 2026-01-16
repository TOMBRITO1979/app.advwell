import React, { useState, useEffect } from 'react';
import { Database, Save, Send, Clock } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

const BackupSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [backupEmail, setBackupEmail] = useState('');
  const [hasSmtpConfig, setHasSmtpConfig] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/backup-email');
      setBackupEmail(response.data.backupEmail || '');
      setHasSmtpConfig(response.data.hasSmtpConfig);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Erro ao carregar configuracao:', error);
        toast.error('Erro ao carregar configuracao de backup');
      }
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (backupEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(backupEmail)) {
      toast.error('Email invalido');
      return;
    }

    setLoading(true);
    try {
      const response = await api.put('/backup-email', { backupEmail: backupEmail || null });
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar configuracao');
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!backupEmail) {
      toast.error('Configure um email de backup primeiro');
      return;
    }

    setSending(true);
    try {
      const response = await api.post('/backup-email/test');
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar backup de teste');
    } finally {
      setSending(false);
    }
  };

  if (initialLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100">
              Email de Backup
            </h1>
            <p className="text-neutral-600 dark:text-slate-400 mt-1">
              Configure o envio automatico de backup dos seus dados
            </p>
          </div>
          <Database size={32} className="text-primary-600" />
        </div>


        {/* Info Box */}
        <div className="bg-info-50 border border-info-200 rounded-lg p-4">
          <h3 className="font-semibold text-info-700 mb-2">
            Como funciona o Backup por Email
          </h3>
          <ul className="text-sm text-info-600 space-y-1">
            <li className="flex items-center gap-2">
              <Clock size={14} />
              Backups sao enviados automaticamente as <strong>12h</strong> e <strong>18h</strong> todos os dias
            </li>
            <li>Cada backup contem 3 planilhas CSV em anexo:</li>
            <li className="ml-4">- <strong>Clientes:</strong> Todos os clientes cadastrados</li>
            <li className="ml-4">- <strong>Processos:</strong> Todos os processos com dados do cliente</li>
            <li className="ml-4">- <strong>Agenda:</strong> Todos os eventos agendados</li>
            <li>As planilhas podem ser abertas no Excel, Google Sheets ou qualquer leitor de CSV</li>
            <li>Os dados sao exportados com codificacao UTF-8 para suporte a acentos</li>
          </ul>
        </div>

        {/* Formulario */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                Email para receber os backups
              </label>
              <input
                type="email"
                value={backupEmail}
                onChange={(e) => setBackupEmail(e.target.value)}
                placeholder="seu-email@exemplo.com"
                className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-primary-500 min-h-[44px]"
              />
              <p className="text-sm text-neutral-500 dark:text-slate-400 mt-2">
                Deixe em branco para desativar o backup automatico
              </p>
            </div>

            {/* Botoes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleSendTest}
                disabled={sending || !backupEmail || !hasSmtpConfig}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-info-100 text-info-700 border border-info-200 hover:bg-info-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} className={sending ? 'animate-pulse' : ''} />
                {sending ? 'Enviando backup...' : 'Enviar Backup Agora'}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={20} />
                {loading ? 'Salvando...' : 'Salvar Configuracao'}
              </button>
            </div>
          </form>
        </div>

        {/* Info adicional */}
        <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-neutral-900 dark:text-slate-100 mb-3">
            Por que fazer backup?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-white dark:bg-slate-800 p-3 rounded">
              <div className="font-medium text-neutral-900 dark:text-slate-100">Seguranca</div>
              <div className="text-neutral-600 dark:text-slate-400">Tenha uma copia dos seus dados sempre a mao</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded">
              <div className="font-medium text-neutral-900 dark:text-slate-100">Praticidade</div>
              <div className="text-neutral-600 dark:text-slate-400">Receba automaticamente sem precisar lembrar</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded">
              <div className="font-medium text-neutral-900 dark:text-slate-100">Compatibilidade</div>
              <div className="text-neutral-600 dark:text-slate-400">CSV funciona em qualquer programa de planilhas</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default BackupSettings;
