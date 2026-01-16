import React, { useState, useEffect } from 'react';
import {
  CreditCard, Plus, Users, TrendingUp, AlertTriangle,
  RefreshCw, Loader2, X, Search
} from 'lucide-react';
import Layout from '../components/Layout';
import MobileCardList, { MobileCardItem } from '../components/MobileCardList';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateFormatter';

interface ServicePlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  isActive: boolean;
  _count?: { subscriptions: number };
}

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Subscription {
  id: string;
  status: string;
  stripeSubscriptionId: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  cancelReason: string | null;
  client: Client;
  servicePlan: ServicePlan;
  payments: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  paidAt: string | null;
  failedAt: string | null;
  receiptUrl: string | null;
}

interface Reports {
  summary: {
    activeSubscriptions: number;
    pastDueSubscriptions: number;
    canceledThisMonth: number;
    receivedThisMonth: number;
    monthlyForecast: number;
  };
  monthlyRevenue: Array<{ month: string; total: number }>;
  delinquentClients: Array<Subscription>;
}

const intervalLabels: Record<string, string> = {
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
};

const statusLabels: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Ativo', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' },
  PAST_DUE: { label: 'Atrasado', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400' },
  CANCELED: { label: 'Cancelado', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' },
  UNPAID: { label: 'Nao Pago', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' },
  INCOMPLETE: { label: 'Aguardando', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' },
  TRIALING: { label: 'Teste', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400' },
};

export default function ClientSubscriptions() {
  const [activeTab, setActiveTab] = useState<'subscriptions' | 'plans' | 'reports'>('subscriptions');
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [reports, setReports] = useState<Reports | null>(null);
  const [clients, setClients] = useState<Client[]>([]);

  // Modal states
  const [showNewPlanModal, setShowNewPlanModal] = useState(false);
  const [showNewSubscriptionModal, setShowNewSubscriptionModal] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Form states
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: '',
    interval: 'MONTHLY',
  });

  const [subscriptionForm, setSubscriptionForm] = useState({
    clientId: '',
    servicePlanId: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subsRes, plansRes, reportsRes, clientsRes] = await Promise.all([
        api.get('/client-subscriptions'),
        api.get('/service-plans'),
        api.get('/client-subscriptions/reports'),
        api.get('/clients?limit=1000'),
      ]);
      setSubscriptions(Array.isArray(subsRes.data) ? subsRes.data : []);
      setPlans(Array.isArray(plansRes.data) ? plansRes.data : []);
      setReports(reportsRes.data);
      // Clients API returns { data: [...] }
      setClients(Array.isArray(clientsRes.data?.data) ? clientsRes.data.data : (Array.isArray(clientsRes.data) ? clientsRes.data : []));
    } catch (error: any) {
      console.error(error);
      // Don't show error for 404 on reports (might not exist yet)
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/service-plans', {
        ...planForm,
        price: parseFloat(planForm.price),
      });
      toast.success('Plano criado com sucesso');
      setShowNewPlanModal(false);
      setPlanForm({ name: '', description: '', price: '', interval: 'MONTHLY' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar plano');
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/client-subscriptions', subscriptionForm);
      toast.success('Assinatura criada! Link de pagamento gerado.');

      // Open checkout URL in new tab
      if (response.data.checkoutUrl) {
        window.open(response.data.checkoutUrl, '_blank');
      }

      setShowNewSubscriptionModal(false);
      setSubscriptionForm({ clientId: '', servicePlanId: '' });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar assinatura');
    }
  };

  const handleCancelSubscription = async (id: string) => {
    const reason = prompt('Motivo do cancelamento (opcional):');
    if (reason === null) return; // User clicked cancel

    try {
      await api.post(`/client-subscriptions/${id}/cancel`, { reason });
      toast.success('Assinatura cancelada');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao cancelar');
    }
  };

  const handleRegenerateCheckout = async (id: string) => {
    try {
      const response = await api.post(`/client-subscriptions/${id}/regenerate-checkout`);
      toast.success('Novo link gerado');
      if (response.data.checkoutUrl) {
        window.open(response.data.checkoutUrl, '_blank');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao gerar link');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;
    try {
      await api.delete(`/service-plans/${id}`);
      toast.success('Plano excluido');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir');
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchText.toLowerCase()))
  );

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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Planos de Servico</h1>
        </div>
        <button
          onClick={() => loadData()}
          className="p-2 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
          title="Atualizar"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Summary Cards */}
      {reports && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Assinaturas Ativas</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{reports.summary.activeSubscriptions}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Inadimplentes</p>
                <p className="text-2xl font-bold text-red-600">{reports.summary.pastDueSubscriptions}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Recebido este mes</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  R$ {reports.summary.receivedThisMonth.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Previsao Mensal</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  R$ {reports.summary.monthlyForecast.toFixed(2).replace('.', ',')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'subscriptions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
          }`}
        >
          Assinaturas
        </button>
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'plans'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
          }`}
        >
          Planos
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'reports'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
          }`}
        >
          Relatorios
        </button>
      </div>

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowNewSubscriptionModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Nova Assinatura
            </button>
          </div>

          {/* Mobile Card View */}
          <div className="mobile-card-view">
            <MobileCardList
              items={subscriptions.map((sub): MobileCardItem => ({
                id: sub.id,
                title: sub.client.name,
                subtitle: sub.client.email || sub.client.phone || '-',
                badge: {
                  text: statusLabels[sub.status]?.label || sub.status,
                  color: sub.status === 'ACTIVE' ? 'green' :
                         sub.status === 'PAST_DUE' ? 'red' :
                         sub.status === 'CANCELED' ? 'gray' :
                         sub.status === 'UNPAID' ? 'yellow' :
                         sub.status === 'INCOMPLETE' ? 'blue' :
                         sub.status === 'TRIALING' ? 'purple' : 'gray',
                },
                fields: [
                  { label: 'Plano', value: sub.servicePlan.name },
                  { label: 'Valor', value: `R$ ${sub.servicePlan.price.toFixed(2).replace('.', ',')} / ${intervalLabels[sub.servicePlan.interval]}` },
                  { label: 'Periodo', value: sub.currentPeriodEnd ? `Ate ${formatDate(sub.currentPeriodEnd)}` : '-' },
                ],
              }))}
              emptyMessage="Nenhuma assinatura encontrada"
            />
            {/* Subscription actions for mobile */}
            {subscriptions.filter(sub => sub.status === 'INCOMPLETE' || sub.status === 'ACTIVE' || sub.status === 'PAST_DUE').length > 0 && (
              <div className="p-4 space-y-2">
                {subscriptions.map((sub) => (
                  <React.Fragment key={`action-${sub.id}`}>
                    {sub.status === 'INCOMPLETE' && (
                      <button
                        onClick={() => handleRegenerateCheckout(sub.id)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200"
                      >
                        Gerar Link - {sub.client.name}
                      </button>
                    )}
                    {(sub.status === 'ACTIVE' || sub.status === 'PAST_DUE') && (
                      <button
                        onClick={() => handleCancelSubscription(sub.id)}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-error-100 text-error-700 border border-error-200 hover:bg-error-200 font-medium rounded-lg transition-all duration-200"
                      >
                        Cancelar - {sub.client.name}
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="desktop-table-view bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">Plano</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">Periodo</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-300 uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                      Nenhuma assinatura encontrada
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">{sub.client.name}</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">{sub.client.email || sub.client.phone}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-gray-900 dark:text-slate-100">{sub.servicePlan.name}</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400">
                            R$ {sub.servicePlan.price.toFixed(2).replace('.', ',')} / {intervalLabels[sub.servicePlan.interval]}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusLabels[sub.status]?.color || 'bg-gray-100 dark:bg-gray-700'}`}>
                          {statusLabels[sub.status]?.label || sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">
                        {sub.currentPeriodEnd ? (
                          <>Ate {formatDate(sub.currentPeriodEnd)}</>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {sub.status === 'INCOMPLETE' && (
                          <button
                            onClick={() => handleRegenerateCheckout(sub.id)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                          >
                            Gerar Link
                          </button>
                        )}
                        {(sub.status === 'ACTIVE' || sub.status === 'PAST_DUE') && (
                          <button
                            onClick={() => handleCancelSubscription(sub.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                          >
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowNewPlanModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Novo Plano
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.length === 0 ? (
              <div className="col-span-3 text-center py-8 text-gray-500 dark:text-slate-400">
                Nenhum plano criado ainda
              </div>
            ) : (
              plans.map((plan) => (
                <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">{plan.description}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${plan.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
                      {plan.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900 dark:text-slate-100">
                      R$ {plan.price.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-gray-500 dark:text-slate-400">/{intervalLabels[plan.interval]}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500 dark:text-slate-400">
                    <span>{plan._count?.subscriptions || 0} assinantes</span>
                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && reports && (
        <div className="space-y-6">
          {/* Delinquent Clients */}
          {reports.delinquentClients.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Clientes Inadimplentes
              </h3>
              <div className="divide-y dark:divide-slate-700">
                {reports.delinquentClients.map((sub) => (
                  <div key={sub.id} className="py-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">{sub.client.name}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{sub.servicePlan.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-600">
                        R$ {sub.servicePlan.price.toFixed(2).replace('.', ',')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{sub.client.phone || sub.client.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Monthly Revenue Chart (Simple Table) */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-700/20 p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-4">Receita Mensal (Ultimos 12 meses)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b dark:border-slate-700">
                    <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-slate-400">Mes</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500 dark:text-slate-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.monthlyRevenue.map((item) => (
                    <tr key={item.month} className="border-b dark:border-slate-700">
                      <td className="py-2 text-gray-900 dark:text-slate-100">
                        {new Date(item.month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="py-2 text-right text-gray-900 dark:text-slate-100">
                        R$ {item.total.toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* New Plan Modal */}
      {showNewPlanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto my-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Novo Plano</h2>
              <button onClick={() => setShowNewPlanModal(false)}>
                <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome do Plano</label>
                <input
                  type="text"
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Descricao</label>
                <textarea
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Preco (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Intervalo</label>
                <select
                  value={planForm.interval}
                  onChange={(e) => setPlanForm({ ...planForm, interval: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg"
                >
                  <option value="MONTHLY">Mensal</option>
                  <option value="QUARTERLY">Trimestral</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewPlanModal(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Criar Plano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Subscription Modal */}
      {showNewSubscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto my-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">Nova Assinatura</h2>
              <button onClick={() => setShowNewSubscriptionModal(false)}>
                <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCreateSubscription} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Cliente</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg"
                  />
                </div>
                {searchText && (
                  <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700">
                    {filteredClients.slice(0, 10).map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSubscriptionForm({ ...subscriptionForm, clientId: client.id });
                          setSearchText(client.name);
                        }}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-slate-600 ${
                          subscriptionForm.clientId === client.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                        }`}
                      >
                        <p className="font-medium text-gray-900 dark:text-slate-100">{client.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{client.email || client.phone}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Plano</label>
                <select
                  value={subscriptionForm.servicePlanId}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, servicePlanId: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 rounded-lg"
                  required
                >
                  <option value="">Selecione um plano</option>
                  {plans.filter(p => p.isActive).map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} - R$ {plan.price.toFixed(2).replace('.', ',')} / {intervalLabels[plan.interval]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
                Ao criar a assinatura, sera gerado um link de pagamento Stripe Checkout para enviar ao cliente.
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewSubscriptionModal(false)}
                  className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!subscriptionForm.clientId || !subscriptionForm.servicePlanId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Criar e Gerar Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}
