import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { AlertTriangle, Clock, XCircle, RefreshCw, Building2, Users, FileText, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime } from '../utils/dateFormatter';

interface CompanyAlert {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  createdAt: string;
  _count: {
    users: number;
    cases: number;
  };
}

interface AlertsData {
  summary: {
    expiredTrials: number;
    expiredSubscriptions: number;
    cancelledSubscriptions: number;
    expiringTrials: number;
    total: number;
  };
  expiredTrials: CompanyAlert[];
  expiredSubscriptions: CompanyAlert[];
  cancelledSubscriptions: CompanyAlert[];
  expiringTrials: CompanyAlert[];
}

const SubscriptionAlerts: React.FC = () => {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    expiringTrials: true,
    expiredTrials: true,
    expiredSubscriptions: true,
    cancelledSubscriptions: true,
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') {
      navigate('/dashboard');
      return;
    }
    loadAlerts();
  }, [user, navigate]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/companies/subscription-alerts');
      setData(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao carregar alertas');
    } finally {
      setLoading(false);
    }
  };

  // Wrapper que retorna '-' para datas vazias
  const formatDate = (dateString: string | null) => formatDateTime(dateString) || '-';

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const goToCompanies = () => {
    navigate('/companies');
  };

  const renderCompanyList = (companies: CompanyAlert[], emptyMessage: string) => {
    if (companies.length === 0) {
      return (
        <p className="text-sm text-neutral-500 py-4 text-center">{emptyMessage}</p>
      );
    }

    return (
      <div className="divide-y divide-neutral-100">
        {companies.map((company) => (
          <div
            key={company.id}
            className="py-3 px-4 hover:bg-neutral-50 cursor-pointer transition-colors"
            onClick={goToCompanies}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-neutral-900 truncate">{company.name}</p>
                <p className="text-sm text-neutral-500 truncate">{company.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
                <div className="flex items-center gap-1" title="Usuários">
                  <Users size={14} className="text-neutral-400 flex-shrink-0" />
                  <span>{company._count.users}</span>
                </div>
                <div className="flex items-center gap-1" title="Processos">
                  <FileText size={14} className="text-neutral-400 flex-shrink-0" />
                  <span>{company._count.cases}</span>
                </div>
                {company.trialEndsAt && (
                  <div className="flex items-center gap-1 text-xs text-neutral-500">
                    <Clock size={12} className="flex-shrink-0" />
                    <span className="whitespace-nowrap">Trial: {formatDate(company.trialEndsAt)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const SectionHeader: React.FC<{
    title: string;
    count: number;
    icon: React.ReactNode;
    color: string;
    sectionKey: string;
  }> = ({ title, count, icon, color, sectionKey }) => (
    <button
      onClick={() => toggleSection(sectionKey)}
      className={`w-full flex items-center justify-between px-4 py-3 ${color} rounded-t-lg`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="font-semibold">{title}</span>
        <span className="px-2 py-0.5 bg-white bg-opacity-50 rounded-full text-sm font-medium">
          {count}
        </span>
      </div>
      {expandedSections[sectionKey] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
    </button>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Carregando alertas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">Alertas de Assinatura</h1>
            <p className="text-neutral-600 mt-1">Acompanhe empresas com problemas de assinatura</p>
          </div>
          <button
            onClick={loadAlerts}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-primary-100 text-primary-700 border border-primary-200 hover:bg-primary-200 font-medium rounded-lg transition-all duration-200"
          >
            <RefreshCw size={18} />
            Atualizar
          </button>
        </div>

        {/* Summary Cards */}
        {data && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-700">
                <Clock size={20} />
                <span className="text-sm font-medium">Expirando Hoje</span>
              </div>
              <p className="text-3xl font-bold text-orange-800 mt-2">{data.summary.expiringTrials}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle size={20} />
                <span className="text-sm font-medium">Trial Expirado</span>
              </div>
              <p className="text-3xl font-bold text-red-800 mt-2">{data.summary.expiredTrials}</p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-yellow-700">
                <Crown size={20} />
                <span className="text-sm font-medium">Assinatura Expirada</span>
              </div>
              <p className="text-3xl font-bold text-yellow-800 mt-2">{data.summary.expiredSubscriptions}</p>
            </div>
            <div className="bg-neutral-100 border border-neutral-300 rounded-lg p-4">
              <div className="flex items-center gap-2 text-neutral-700">
                <XCircle size={20} />
                <span className="text-sm font-medium">Canceladas</span>
              </div>
              <p className="text-3xl font-bold text-neutral-800 mt-2">{data.summary.cancelledSubscriptions}</p>
            </div>
          </div>
        )}

        {/* Alert: No problems */}
        {data && data.summary.total === 0 && data.summary.expiringTrials === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Building2 size={24} className="text-green-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-green-800">Tudo em ordem!</h3>
            <p className="text-green-600 mt-1">Nenhuma empresa com problemas de assinatura no momento.</p>
          </div>
        )}

        {/* Sections */}
        {data && (
          <div className="space-y-4">
            {/* Expiring Today */}
            {data.summary.expiringTrials > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <SectionHeader
                  title="Trial Expirando Hoje"
                  count={data.summary.expiringTrials}
                  icon={<Clock size={20} />}
                  color="bg-orange-100 text-orange-800"
                  sectionKey="expiringTrials"
                />
                {expandedSections.expiringTrials && renderCompanyList(
                  data.expiringTrials,
                  'Nenhuma empresa com trial expirando hoje'
                )}
              </div>
            )}

            {/* Expired Trials */}
            {data.summary.expiredTrials > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <SectionHeader
                  title="Trial Expirado"
                  count={data.summary.expiredTrials}
                  icon={<AlertTriangle size={20} />}
                  color="bg-red-100 text-red-800"
                  sectionKey="expiredTrials"
                />
                {expandedSections.expiredTrials && renderCompanyList(
                  data.expiredTrials,
                  'Nenhuma empresa com trial expirado'
                )}
              </div>
            )}

            {/* Expired Subscriptions */}
            {data.summary.expiredSubscriptions > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <SectionHeader
                  title="Assinatura Expirada"
                  count={data.summary.expiredSubscriptions}
                  icon={<Crown size={20} />}
                  color="bg-yellow-100 text-yellow-800"
                  sectionKey="expiredSubscriptions"
                />
                {expandedSections.expiredSubscriptions && renderCompanyList(
                  data.expiredSubscriptions,
                  'Nenhuma empresa com assinatura expirada'
                )}
              </div>
            )}

            {/* Cancelled Subscriptions */}
            {data.summary.cancelledSubscriptions > 0 && (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <SectionHeader
                  title="Assinatura Cancelada"
                  count={data.summary.cancelledSubscriptions}
                  icon={<XCircle size={20} />}
                  color="bg-neutral-200 text-neutral-800"
                  sectionKey="cancelledSubscriptions"
                />
                {expandedSections.cancelledSubscriptions && renderCompanyList(
                  data.cancelledSubscriptions,
                  'Nenhuma empresa com assinatura cancelada'
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SubscriptionAlerts;
