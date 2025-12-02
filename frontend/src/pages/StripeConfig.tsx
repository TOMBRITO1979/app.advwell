import { useState, useEffect } from 'react';
import { CreditCard, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';

interface StripeConfigData {
  id?: string;
  stripePublicKey: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function StripeConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<StripeConfigData | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [formData, setFormData] = useState({
    stripePublicKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/stripe-config');
      setConfig(response.data);
      setFormData({
        stripePublicKey: response.data.stripePublicKey || '',
        stripeSecretKey: '', // Never pre-fill secret
        stripeWebhookSecret: '',
      });
    } catch (error: any) {
      if (error.response?.status !== 404) {
        toast.error('Erro ao carregar configuracao');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await api.post('/stripe-config', formData);
      toast.success(response.data.message);
      setConfig(response.data.config);
      setFormData({
        ...formData,
        stripeSecretKey: '',
        stripeWebhookSecret: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar configuracao');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const response = await api.post('/stripe-config/test', {
        stripeSecretKey: formData.stripeSecretKey || undefined,
      });
      toast.success(response.data.message);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Falha no teste');
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir a configuracao Stripe?')) return;

    try {
      await api.delete('/stripe-config');
      toast.success('Configuracao excluida');
      setConfig(null);
      setFormData({
        stripePublicKey: '',
        stripeSecretKey: '',
        stripeWebhookSecret: '',
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-8 h-8 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Configuracao Stripe</h1>
      </div>

      {/* Status Card */}
      {config && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {config.isActive ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-green-700 font-medium">Stripe Configurado</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="text-red-700 font-medium">Stripe Inativo</span>
                </>
              )}
            </div>
            <span className="text-sm text-gray-500">
              Ultima atualizacao: {new Date(config.updatedAt!).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">Como obter suas chaves Stripe:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Acesse <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline">dashboard.stripe.com/apikeys</a></li>
          <li>Copie a "Chave publicavel" (pk_live_... ou pk_test_...)</li>
          <li>Clique em "Revelar chave secreta" e copie (sk_live_... ou sk_test_...)</li>
          <li>Para webhooks: <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="underline">Configurar Webhook</a></li>
        </ol>
      </div>

      {/* Webhook URL Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-yellow-900 mb-2">URL do Webhook:</h3>
        <code className="text-sm bg-yellow-100 px-2 py-1 rounded">
          https://api.advwell.pro/api/stripe-webhook
        </code>
        <p className="text-xs text-yellow-700 mt-2">
          Configure este endpoint no seu dashboard Stripe para receber notificacoes de pagamento.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chave Publica (Publishable Key)
          </label>
          <input
            type="text"
            value={formData.stripePublicKey}
            onChange={(e) => setFormData({ ...formData, stripePublicKey: e.target.value })}
            placeholder="pk_live_... ou pk_test_..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chave Secreta (Secret Key)
          </label>
          <div className="relative">
            <input
              type={showSecretKey ? 'text' : 'password'}
              value={formData.stripeSecretKey}
              onChange={(e) => setFormData({ ...formData, stripeSecretKey: e.target.value })}
              placeholder={config ? 'Deixe em branco para manter a atual' : 'sk_live_... ou sk_test_...'}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required={!config}
            />
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showSecretKey ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Webhook Secret (Opcional)
          </label>
          <div className="relative">
            <input
              type={showWebhookSecret ? 'text' : 'password'}
              value={formData.stripeWebhookSecret}
              onChange={(e) => setFormData({ ...formData, stripeWebhookSecret: e.target.value })}
              placeholder="whsec_..."
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowWebhookSecret(!showWebhookSecret)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showWebhookSecret ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Usado para verificar assinatura dos webhooks (recomendado para producao)
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar Configuracao
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing || (!formData.stripeSecretKey && !config)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {testing && <Loader2 className="w-4 h-4 animate-spin" />}
            Testar Conexao
          </button>

          {config && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Excluir Configuracao
            </button>
          )}
        </div>
      </form>
    </div>
    </Layout>
  );
}
