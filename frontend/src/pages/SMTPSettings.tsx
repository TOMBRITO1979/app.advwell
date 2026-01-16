import React, { useState, useEffect } from 'react';
import { Mail, Save, RefreshCw } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';

interface SMTPConfig {
  id?: string;
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
}

const SMTPSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);

  const [formData, setFormData] = useState<SMTPConfig>({
    host: '',
    port: 587,
    user: '',
    password: '',
    fromEmail: '',
    fromName: '',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/smtp-config');
      const config = response.data;
      setFormData({
        host: config.host,
        port: config.port,
        user: config.user,
        password: '', // Nunca retorna a senha
        fromEmail: config.fromEmail,
        fromName: config.fromName || '',
      });
      setHasConfig(true);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Erro ao carregar configuração:', error);
      }
    }
  };

  const handleTest = async () => {
    if (!formData.host || !formData.port || !formData.user || !formData.fromEmail) {
      toast.error('Preencha todos os campos obrigatórios antes de testar');
      return;
    }

    if (!formData.password && !hasConfig) {
      toast.error('Senha é obrigatória para o primeiro teste');
      return;
    }

    setTesting(true);
    try {
      const testData = formData.password ? formData : undefined;
      await api.post('/smtp-config/test', testData);
      toast.success('✅ Conexão SMTP testada com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.details || 'Falha ao testar conexão SMTP');
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.password && !hasConfig) {
      toast.error('Senha é obrigatória');
      return;
    }

    setLoading(true);
    try {
      const dataToSend = formData.password
        ? formData
        : { ...formData, password: 'unchanged' }; // Backend ignora se não mudar

      await api.post('/smtp-config', dataToSend);
      toast.success('Configuração SMTP salva com sucesso!');
      setHasConfig(true);
      setFormData({ ...formData, password: '' }); // Limpar senha do formulário
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar configuração');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-slate-100">
              Configuração SMTP
            </h1>
            <p className="text-neutral-600 dark:text-slate-400 mt-1">
              Configure o servidor SMTP para envio de campanhas de email
            </p>
          </div>
          <Mail size={32} className="text-success-600" />
        </div>

        {/* Info Box */}
        <div className="bg-info-50 border border-info-200 rounded-lg p-4">
          <h3 className="font-semibold text-info-700 mb-2">
            ℹ️ Informações Importantes
          </h3>
          <ul className="text-sm text-info-600 space-y-1">
            <li>• Esta configuração será usada apenas para campanhas de email em massa</li>
            <li>• Emails do sistema (redefinição de senha) continuam usando o SMTP global</li>
            <li>• A senha é criptografada com AES-256 e nunca é exposta</li>
            <li>• Use o botão "Testar Conexão" antes de salvar</li>
          </ul>
        </div>

        {/* Formulário */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Host e Porta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Host SMTP *
                </label>
                <input
                  type="text"
                  required
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-green-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Porta *
                </label>
                <input
                  type="number"
                  required
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                  placeholder="587"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-green-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Usuário e Senha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Usuário *
                </label>
                <input
                  type="text"
                  required
                  value={formData.user}
                  onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                  placeholder="seu-email@gmail.com"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-green-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Senha {hasConfig ? '' : '*'}
                </label>
                <input
                  type="password"
                  required={!hasConfig}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={hasConfig ? 'Deixe em branco para manter a atual' : 'Senha do SMTP'}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-green-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Email Remetente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Email Remetente *
                </label>
                <input
                  type="email"
                  required
                  value={formData.fromEmail}
                  onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
                  placeholder="noreply@suaempresa.com"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-green-500 min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
                  Nome Remetente
                </label>
                <input
                  type="text"
                  value={formData.fromName}
                  onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                  placeholder="Minha Empresa"
                  className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-green-500 min-h-[44px]"
                />
              </div>
            </div>

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

        {/* Portas Comuns */}
        <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4">
          <h3 className="font-semibold text-neutral-900 dark:text-slate-100 mb-3">
            📌 Portas SMTP Comuns
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="bg-white dark:bg-slate-800 p-3 rounded">
              <div className="font-medium text-neutral-900 dark:text-slate-100">Porta 587</div>
              <div className="text-neutral-600 dark:text-slate-400">STARTTLS (Recomendado)</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded">
              <div className="font-medium text-neutral-900 dark:text-slate-100">Porta 465</div>
              <div className="text-neutral-600 dark:text-slate-400">SSL/TLS</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-3 rounded">
              <div className="font-medium text-neutral-900 dark:text-slate-100">Porta 25</div>
              <div className="text-neutral-600 dark:text-slate-400">Sem criptografia (não recomendado)</div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SMTPSettings;
