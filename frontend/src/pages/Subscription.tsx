import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, AlertTriangle, CreditCard, Crown, Star, Zap, Building2, Rocket, HardDrive } from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import { formatDateTime } from '../utils/dateFormatter';

interface PlanDetails {
  name: string;
  priceBrl: number;
  casesLimit: number;
  storageLimit: number;
  storageLimitFormatted: string;
  monitoringLimit: number;
  users: number;
  stripeLink: string | null;
  popular?: boolean;
  features: string[];
}

interface SubscriptionInfo {
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | null;
  plan: 'GRATUITO' | 'STARTER' | 'PROFISSIONAL' | 'ESCRITORIO' | 'ENTERPRISE' | null;
  planDetails: PlanDetails | null;
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
    GRATUITO: PlanDetails;
    STARTER: PlanDetails;
    PROFISSIONAL: PlanDetails;
    ESCRITORIO: PlanDetails;
    ENTERPRISE: PlanDetails;
  };
  hasStripeCustomer: boolean;
  hasStripeSubscription: boolean;
}

type PlanKey = 'STARTER' | 'PROFISSIONAL' | 'ESCRITORIO' | 'ENTERPRISE';

const planIcons: Record<string, React.ReactNode> = {
  STARTER: <Star className="h-8 w-8 text-blue-500" />,
  PROFISSIONAL: <Zap className="h-8 w-8 text-green-500" />,
  ESCRITORIO: <Building2 className="h-8 w-8 text-purple-500" />,
  ENTERPRISE: <Crown className="h-8 w-8 text-yellow-500" />,
};

const planColors: Record<string, string> = {
  STARTER: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
  PROFISSIONAL: 'border-green-500 bg-green-50 dark:bg-green-900/20',
  ESCRITORIO: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
  ENTERPRISE: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
};

const planButtonColors: Record<string, string> = {
  STARTER: 'bg-blue-600 hover:bg-blue-700',
  PROFISSIONAL: 'bg-green-600 hover:bg-green-700',
  ESCRITORIO: 'bg-purple-600 hover:bg-purple-700',
  ENTERPRISE: 'bg-yellow-600 hover:bg-yellow-700',
};

export default function Subscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleSubscribe = (stripeLink: string | null) => {
    if (stripeLink) {
      window.open(stripeLink, '_blank');
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
          <p className="text-gray-500 dark:text-slate-400">Erro ao carregar informações</p>
        </div>
      </Layout>
    );
  }

  const statusColors: Record<string, string> = {
    TRIAL: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400',
    ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    EXPIRED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
    CANCELLED: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  };

  const statusLabels: Record<string, string> = {
    TRIAL: 'Período de Teste',
    ACTIVE: 'Ativa',
    EXPIRED: 'Expirada',
    CANCELLED: 'Cancelada',
  };

  // Filter only paid plans for display
  const paidPlans = Object.entries(info.availablePlans).filter(
    ([key]) => key !== 'GRATUITO'
  ) as [PlanKey, PlanDetails][];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Assinatura</h1>
        </div>

      {/* Status Card */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100">Status da Assinatura</h2>
            <div className="mt-2 flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  statusColors[info.status || 'EXPIRED']
                }`}
              >
                {statusLabels[info.status || 'EXPIRED'] || 'Sem assinatura'}
              </span>
              {info.plan && (
                <span className="text-gray-600 dark:text-slate-400">
                  Plano: <strong className="dark:text-slate-200">{info.planDetails?.name || info.plan}</strong>
                </span>
              )}
            </div>
          </div>
          {info.hasStripeSubscription && (
            <button
              onClick={handleManageBilling}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
            >
              <CreditCard className="h-4 w-4" />
              Gerenciar Pagamento
            </button>
          )}
        </div>

        {/* Alert for expiring/expired */}
        {!info.isValid && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {info.status === 'TRIAL'
                  ? 'Seu período de teste expirou'
                  : info.status === 'EXPIRED'
                  ? 'Sua assinatura expirou'
                  : 'Assine um plano para continuar usando o sistema'}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                Escolha um plano abaixo para continuar usando todas as funcionalidades.
              </p>
            </div>
          </div>
        )}

        {/* Usage stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-slate-400">Processos Cadastrados</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">{info.casesUsed}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-slate-400">Limite de Processos</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {info.casesLimit >= 999999 ? 'Ilimitado' : info.casesLimit.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-slate-400">Monitoramento</p>
            <p className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
              {info.planDetails?.monitoringLimit || 0}/mês
            </p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {info.status === 'TRIAL' ? 'Teste expira em' : 'Renova em'}
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              {info.daysRemaining !== undefined
                ? `${info.daysRemaining} dia(s)`
                : formatDate(info.subscriptionEndsAt || info.trialEndsAt)}
            </p>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-medium text-purple-900 dark:text-purple-300">Armazenamento</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-purple-700 dark:text-purple-400">Usado</span>
              <span className="font-medium text-purple-900 dark:text-purple-300">
                {info.storageUsedFormatted} de {info.storageLimitFormatted}
              </span>
            </div>
            <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-3">
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
            <div className="flex justify-between items-center text-xs text-purple-600 dark:text-purple-400">
              <span>{info.storageUsedPercent?.toFixed(1) || 0}% usado</span>
              <span>{info.fileCount} arquivo(s)</span>
            </div>
            {info.isStorageOverLimit && (
              <div className="flex items-center gap-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                Limite de armazenamento excedido! Faça upgrade do seu plano.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-6">Escolha seu Plano</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {paidPlans.map(([key, plan]) => {
            const isCurrentPlan = info.plan === key && info.status === 'ACTIVE';
            const isPopular = plan.popular;

            return (
              <div
                key={key}
                className={`relative rounded-xl border-2 p-5 ${
                  isCurrentPlan
                    ? planColors[key]
                    : isPopular
                    ? 'border-green-500 dark:border-green-400'
                    : 'border-gray-200 dark:border-slate-600'
                }`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-green-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Plano Atual
                    </span>
                  </div>
                )}
                {isPopular && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-green-600 text-white text-xs font-medium px-3 py-1 rounded-full">
                      Mais Popular
                    </span>
                  </div>
                )}

                <div className="text-center">
                  <div className="flex justify-center mb-3">{planIcons[key]}</div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                      R${plan.priceBrl}
                    </span>
                    <span className="text-gray-500 dark:text-slate-400">/mês</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    {plan.users} usuário{plan.users > 1 ? 's' : ''} • {plan.storageLimitFormatted}
                  </p>
                </div>

                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 dark:text-slate-300">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4">
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 text-sm font-medium text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 rounded-lg cursor-not-allowed"
                    >
                      Plano Atual
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan.stripeLink)}
                      className={`w-full py-2.5 px-4 text-sm font-medium text-white rounded-lg transition-colors ${planButtonColors[key]}`}
                    >
                      {info.status === 'ACTIVE' ? 'Mudar para este plano' : 'Assinar Agora'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Perguntas Frequentes</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-slate-200">Como funciona a cobrança?</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              A cobrança é mensal e automática no cartão cadastrado. Você pode cancelar a qualquer
              momento.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-slate-200">Posso mudar de plano?</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Sim, você pode fazer upgrade ou downgrade a qualquer momento. A diferença será
              calculada proporcionalmente.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-slate-200">Os processos são ilimitados?</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              Sim! Todos os planos pagos oferecem cadastro ilimitado de processos judiciais e PNJs.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 dark:text-slate-200">O que é monitoramento?</h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
              O monitoramento acompanha automaticamente as movimentações dos seus processos via DataJud
              e notifica você sobre novas publicações.
            </p>
          </div>
        </div>
      </div>
      </div>
    </Layout>
  );
}
