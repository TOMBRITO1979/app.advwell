import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, AlertTriangle, CreditCard, Crown, Star, Zap, HardDrive } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import { formatDateTime } from '../utils/dateFormatter';

interface SubscriptionInfo {
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | null;
  plan: 'GRATUITO' | 'BASICO' | 'BRONZE' | 'PRATA' | 'OURO' | null;
  planDetails: {
    name: string;
    priceUsd: number;
    priceBrl?: number;
    casesLimit: number;
    storageLimit: number;
    storageLimitFormatted: string;
    features: string[];
  } | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  casesLimit: number;
  casesUsed: number;
  casesRemaining: number;
  // Storage
  storageLimit: string;
  storageLimitFormatted: string;
  storageUsed: string;
  storageUsedFormatted: string;
  storageRemaining: string;
  storageRemainingFormatted: string;
  storageUsedPercent: number;
  isStorageOverLimit: boolean;
  fileCount: number;
  // General
  isValid: boolean;
  daysRemaining?: number;
  availablePlans: {
    GRATUITO: { name: string; priceUsd: number; priceBrl: number; casesLimit: number; storageLimit: number; storageLimitFormatted: string; features: string[] };
    BASICO: { name: string; priceUsd: number; priceBrl: number; casesLimit: number; storageLimit: number; storageLimitFormatted: string; features: string[] };
    BRONZE: { name: string; priceUsd: number; priceBrl: number; casesLimit: number; storageLimit: number; storageLimitFormatted: string; features: string[] };
    PRATA: { name: string; priceUsd: number; priceBrl: number; casesLimit: number; storageLimit: number; storageLimitFormatted: string; features: string[] };
    OURO: { name: string; priceUsd: number; priceBrl: number; casesLimit: number; storageLimit: number; storageLimitFormatted: string; features: string[] };
  };
  hasStripeCustomer: boolean;
  hasStripeSubscription: boolean;
}

const planIcons: Record<string, React.ReactNode> = {
  BRONZE: <Star className="h-8 w-8 text-amber-600" />,
  PRATA: <Zap className="h-8 w-8 text-gray-400" />,
  OURO: <Crown className="h-8 w-8 text-yellow-500" />,
};

const planColors: Record<string, string> = {
  BRONZE: 'border-amber-500 bg-amber-50',
  PRATA: 'border-gray-400 bg-gray-50',
  OURO: 'border-yellow-500 bg-yellow-50',
};

const planButtonColors: Record<string, string> = {
  BRONZE: 'bg-amber-600 hover:bg-amber-700',
  PRATA: 'bg-gray-600 hover:bg-gray-700',
  OURO: 'bg-yellow-600 hover:bg-yellow-700',
};

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionInfo();

    // Handle success/cancel from Stripe
    if (searchParams.get('success') === 'true') {
      toast.success('Assinatura realizada com sucesso!');
      // Clear URL params
      navigate('/subscription', { replace: true });
    } else if (searchParams.get('canceled') === 'true') {
      toast('Pagamento cancelado');
      navigate('/subscription', { replace: true });
    }
  }, [searchParams, navigate]);

  const loadSubscriptionInfo = async () => {
    try {
      const response = await api.get('/subscription/info');
      setInfo(response.data);
    } catch (error) {
      console.error('Error loading subscription info:', error);
      toast.error('Erro ao carregar informações da assinatura');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: 'BRONZE' | 'PRATA' | 'OURO') => {
    setCheckoutLoading(plan);
    try {
      const response = await api.post('/subscription/checkout', { plan });
      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error('Erro ao iniciar pagamento');
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await api.post('/subscription/billing-portal');
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Error opening billing portal:', error);
      toast.error('Erro ao abrir portal de pagamentos');
    }
  };

  // Wrapper que retorna '-' para datas vazias
  const formatDate = (dateStr: string | null) => formatDateTime(dateStr) || '-';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    );
  }

  if (!info) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Erro ao carregar informações</p>
        </div>
      </Layout>
    );
  }

  const statusColors: Record<string, string> = {
    TRIAL: 'bg-blue-100 text-blue-800',
    ACTIVE: 'bg-green-100 text-green-800',
    EXPIRED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    TRIAL: 'Período de Teste',
    ACTIVE: 'Ativa',
    EXPIRED: 'Expirada',
    CANCELLED: 'Cancelada',
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Assinatura</h1>
        </div>

      {/* Status Card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Status da Assinatura</h2>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[info.status || 'EXPIRED']
                }`}
              >
                {statusLabels[info.status || 'EXPIRED'] || 'Sem assinatura'}
              </span>
              {info.plan && (
                <span className="text-gray-600">
                  Plano: <strong>{info.plan}</strong>
                </span>
              )}
            </div>
          </div>
          {info.hasStripeSubscription && (
            <button
              onClick={handleManageBilling}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50"
            >
              <CreditCard className="h-4 w-4" />
              Gerenciar Pagamento
            </button>
          )}
        </div>

        {/* Alert for expiring/expired */}
        {!info.isValid && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                {info.status === 'TRIAL'
                  ? 'Seu período de teste expirou'
                  : info.status === 'EXPIRED'
                  ? 'Sua assinatura expirou'
                  : 'Assine um plano para continuar usando o sistema'}
              </p>
              <p className="text-sm text-red-600 mt-1">
                Escolha um plano abaixo para continuar usando todas as funcionalidades.
              </p>
            </div>
          </div>
        )}

        {/* Usage stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Processos Usados</p>
            <p className="text-2xl font-semibold text-gray-900">{info.casesUsed}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Limite de Processos</p>
            <p className="text-2xl font-semibold text-gray-900">{info.casesLimit}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">Restantes</p>
            <p className="text-2xl font-semibold text-gray-900">{info.casesRemaining}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500">
              {info.status === 'TRIAL' ? 'Teste expira em' : 'Renova em'}
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {info.daysRemaining !== undefined
                ? `${info.daysRemaining} dia(s)`
                : formatDate(info.subscriptionEndsAt || info.trialEndsAt)}
            </p>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="h-5 w-5 text-purple-600" />
            <h3 className="font-medium text-purple-900">Armazenamento</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-purple-700">Usado</span>
              <span className="font-medium text-purple-900">
                {info.storageUsedFormatted} de {info.storageLimitFormatted}
              </span>
            </div>
            <div className="w-full bg-purple-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  info.storageUsedPercent > 90
                    ? 'bg-red-500'
                    : info.storageUsedPercent > 70
                    ? 'bg-yellow-500'
                    : 'bg-purple-600'
                }`}
                style={{ width: `${Math.min(info.storageUsedPercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-purple-600">
              <span>{info.storageUsedPercent?.toFixed(1) || 0}% usado</span>
              <span>{info.fileCount} arquivo(s)</span>
            </div>
            {info.isStorageOverLimit && (
              <div className="flex items-center gap-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                <AlertTriangle className="h-4 w-4" />
                Limite de armazenamento excedido! Faça upgrade do seu plano.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Escolha seu Plano</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(info.availablePlans).map(([key, plan]) => {
            const planKey = key as 'BRONZE' | 'PRATA' | 'OURO';
            const isCurrentPlan = info.plan === planKey && info.status === 'ACTIVE';

            return (
              <div
                key={key}
                className={`relative rounded-xl border-2 p-6 ${
                  isCurrentPlan ? planColors[planKey] : 'border-gray-200'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-green-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Plano Atual
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <div className="flex justify-center mb-4">{planIcons[planKey]}</div>
                  <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-4xl font-bold text-gray-900">${plan.priceUsd}</span>
                    <span className="text-gray-500">/mês</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Até {plan.casesLimit.toLocaleString()} processos
                  </p>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-3 px-4 text-sm font-medium text-gray-500 bg-gray-100 rounded-lg cursor-not-allowed"
                    >
                      Plano Atual
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(planKey)}
                      disabled={checkoutLoading !== null}
                      className={`w-full py-3 px-4 text-sm font-medium text-white rounded-lg transition-colors ${
                        planButtonColors[planKey]
                      } ${checkoutLoading === planKey ? 'opacity-70' : ''}`}
                    >
                      {checkoutLoading === planKey ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processando...
                        </span>
                      ) : info.status === 'ACTIVE' ? (
                        'Mudar para este plano'
                      ) : (
                        'Assinar Agora'
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Perguntas Frequentes</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900">Como funciona a cobrança?</h3>
            <p className="text-sm text-gray-600 mt-1">
              A cobrança é mensal e automática no cartão cadastrado. Você pode cancelar a qualquer
              momento.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Posso mudar de plano?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Sim, você pode fazer upgrade ou downgrade a qualquer momento. A diferença será
              calculada proporcionalmente.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">O que acontece se eu exceder o limite?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Você receberá uma notificação para fazer upgrade do plano. Processos existentes não
              serão afetados.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Os valores são em dólares?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Sim, todos os preços são em dólares americanos (USD). A conversão para reais é feita
              automaticamente pelo seu banco.
            </p>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  );
}
