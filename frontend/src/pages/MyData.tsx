import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/dateFormatter';
import {
  User,
  Database,
  FileText,
  Shield,
  Download,
  Trash2,
  Edit3,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  Lock,
} from 'lucide-react';

interface UserData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  };
  company: {
    id: string;
    name: string;
    email: string;
    cnpj?: string;
  };
  statistics: {
    totalClients: number;
    totalCases: number;
    totalDocuments: number;
    totalFinancialRecords: number;
    totalScheduleEvents: number;
  };
}

interface Consent {
  id: string;
  consentType: string;
  version: string;
  consentedAt: string;
  revokedAt?: string;
}

interface DataRequest {
  id: string;
  requestType: string;
  status: string;
  description?: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  notes?: string;
  rejectionReason?: string;
  resultUrl?: string;
}

const MyData: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('personal');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestType, setRequestType] = useState<string>('');
  const [requestDescription, setRequestDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dataRes, consentsRes, requestsRes] = await Promise.all([
        api.get('/lgpd/my-data'),
        api.get('/lgpd/my-consents'),
        api.get('/lgpd/requests'),
      ]);
      setUserData(dataRes.data);
      setConsents(consentsRes.data);
      setRequests(requestsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeConsent = async (consentType: string) => {
    if (!confirm('Tem certeza que deseja revogar este consentimento? Algumas funcionalidades podem ser afetadas.')) {
      return;
    }

    try {
      await api.post('/lgpd/revoke-consent', { consentType });
      toast.success('Consentimento revogado com sucesso');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao revogar consentimento');
    }
  };

  const handleCreateRequest = async () => {
    if (!requestType) {
      toast.error('Selecione o tipo de solicitacao');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/lgpd/request', {
        requestType,
        description: requestDescription,
      });
      toast.success('Solicitacao criada com sucesso');
      setShowRequestModal(false);
      setRequestType('');
      setRequestDescription('');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao criar solicitacao');
    } finally {
      setSubmitting(false);
    }
  };

  const getConsentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      PRIVACY_POLICY: 'Politica de Privacidade',
      TERMS_OF_USE: 'Termos de Uso',
      MARKETING_EMAIL: 'Emails de Marketing',
      DATA_PROCESSING: 'Processamento de Dados',
    };
    return labels[type] || type;
  };

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      ACCESS: 'Acesso aos Dados',
      CORRECTION: 'Correcao de Dados',
      DELETION: 'Exclusao de Dados',
      PORTABILITY: 'Portabilidade',
      REVOKE_CONSENT: 'Revogacao de Consentimento',
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      PENDING: { color: 'bg-warning-100 text-warning-700', icon: <Clock className="w-4 h-4" />, label: 'Pendente' },
      IN_PROGRESS: { color: 'bg-primary-100 text-primary-700', icon: <RefreshCw className="w-4 h-4" />, label: 'Em Processamento' },
      COMPLETED: { color: 'bg-success-100 text-success-700', icon: <CheckCircle className="w-4 h-4" />, label: 'Concluído' },
      REJECTED: { color: 'bg-danger-100 text-danger-700', icon: <XCircle className="w-4 h-4" />, label: 'Rejeitado' },
    };
    const config = configs[status] || configs.PENDING;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-neutral-800">Meus Dados</h1>
          </div>
          <p className="text-neutral-600">
            Gerencie seus dados pessoais e exerca seus direitos conforme a LGPD
          </p>
        </div>

        {/* Personal Data Section */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('personal')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-neutral-800">Dados Pessoais</span>
            </div>
            {expandedSection === 'personal' ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </button>
          {expandedSection === 'personal' && userData && (
            <div className="px-6 pb-6 border-t border-neutral-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-sm text-neutral-500">Nome</label>
                  <p className="font-medium text-neutral-800">{userData.user.name}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-500">Email</label>
                  <p className="font-medium text-neutral-800">{userData.user.email}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-500">Funcao</label>
                  <p className="font-medium text-neutral-800">{userData.user.role}</p>
                </div>
                <div>
                  <label className="text-sm text-neutral-500">Cadastrado em</label>
                  <p className="font-medium text-neutral-800">
                    {formatDate(userData.user.createdAt)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-neutral-500">Empresa</label>
                  <p className="font-medium text-neutral-800">{userData.company.name}</p>
                </div>
                {userData.company.cnpj && (
                  <div>
                    <label className="text-sm text-neutral-500">CNPJ</label>
                    <p className="font-medium text-neutral-800">{userData.company.cnpj}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Statistics Section */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('statistics')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-neutral-800">Dados Armazenados</span>
            </div>
            {expandedSection === 'statistics' ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </button>
          {expandedSection === 'statistics' && userData && (
            <div className="px-6 pb-6 border-t border-neutral-100">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-neutral-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-primary-600">{userData.statistics.totalClients}</p>
                  <p className="text-sm text-neutral-600">Clientes</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-primary-600">{userData.statistics.totalCases}</p>
                  <p className="text-sm text-neutral-600">Processos</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-primary-600">{userData.statistics.totalDocuments}</p>
                  <p className="text-sm text-neutral-600">Documentos</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-primary-600">{userData.statistics.totalFinancialRecords}</p>
                  <p className="text-sm text-neutral-600">Registros Financeiros</p>
                </div>
                <div className="bg-neutral-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-primary-600">{userData.statistics.totalScheduleEvents}</p>
                  <p className="text-sm text-neutral-600">Eventos na Agenda</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Consents Section */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('consents')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-neutral-800">Meus Consentimentos</span>
              <span className="bg-primary-100 text-primary-700 text-xs px-2 py-0.5 rounded-full">
                {consents.filter(c => !c.revokedAt).length} ativos
              </span>
            </div>
            {expandedSection === 'consents' ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </button>
          {expandedSection === 'consents' && (
            <div className="px-6 pb-6 border-t border-neutral-100">
              {consents.length === 0 ? (
                <p className="text-neutral-500 mt-4">Nenhum consentimento registrado</p>
              ) : (
                <div className="space-y-3 mt-4">
                  {consents.map((consent) => (
                    <div
                      key={consent.id}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        consent.revokedAt ? 'bg-neutral-100' : 'bg-success-50'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-neutral-800">
                          {getConsentTypeLabel(consent.consentType)}
                        </p>
                        <p className="text-sm text-neutral-500">
                          Versao {consent.version} - Aceito em {formatDate(consent.consentedAt)}
                          {consent.revokedAt && (
                            <span className="text-danger-600">
                              {' '}| Revogado em {formatDate(consent.revokedAt)}
                            </span>
                          )}
                        </p>
                      </div>
                      {!consent.revokedAt && consent.consentType !== 'PRIVACY_POLICY' && consent.consentType !== 'TERMS_OF_USE' && (
                        <button
                          onClick={() => handleRevokeConsent(consent.consentType)}
                          className="text-danger-600 hover:text-danger-700 text-sm font-medium"
                        >
                          Revogar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Requests Section */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 mb-4 overflow-hidden">
          <button
            onClick={() => toggleSection('requests')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-neutral-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary-600" />
              <span className="font-semibold text-neutral-800">Minhas Solicitacoes</span>
              {requests.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length > 0 && (
                <span className="bg-warning-100 text-warning-700 text-xs px-2 py-0.5 rounded-full">
                  {requests.filter(r => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length} em andamento
                </span>
              )}
            </div>
            {expandedSection === 'requests' ? (
              <ChevronUp className="w-5 h-5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-neutral-400" />
            )}
          </button>
          {expandedSection === 'requests' && (
            <div className="px-6 pb-6 border-t border-neutral-100">
              {requests.length === 0 ? (
                <p className="text-neutral-500 mt-4">Nenhuma solicitacao realizada</p>
              ) : (
                <div className="space-y-3 mt-4">
                  {requests.map((request) => (
                    <div key={request.id} className="border border-neutral-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-neutral-800">
                          {getRequestTypeLabel(request.requestType)}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-neutral-500 mb-2">
                        Solicitado em {formatDate(request.requestedAt)}
                        {request.completedAt && (
                          <span> | Concluído em {formatDate(request.completedAt)}</span>
                        )}
                      </p>
                      {request.description && (
                        <p className="text-sm text-neutral-600 mb-2">{request.description}</p>
                      )}
                      {request.notes && (
                        <p className="text-sm text-primary-600 mb-2">
                          <strong>Observacao:</strong> {request.notes}
                        </p>
                      )}
                      {request.rejectionReason && (
                        <p className="text-sm text-danger-600 mb-2">
                          <strong>Motivo da rejeicao:</strong> {request.rejectionReason}
                        </p>
                      )}
                      {request.resultUrl && (
                        <a
                          href={request.resultUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                        >
                          <Download className="w-4 h-4" />
                          Baixar arquivo
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions Section */}
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6">
          <h2 className="font-semibold text-neutral-800 mb-4">Acoes Disponiveis</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                setRequestType('ACCESS');
                setShowRequestModal(true);
              }}
              className="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors text-left"
            >
              <Eye className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-medium text-neutral-800">Acessar Meus Dados</p>
                <p className="text-sm text-neutral-500">Solicitar copia completa</p>
              </div>
            </button>
            <button
              onClick={() => {
                setRequestType('CORRECTION');
                setShowRequestModal(true);
              }}
              className="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors text-left"
            >
              <Edit3 className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-medium text-neutral-800">Corrigir Dados</p>
                <p className="text-sm text-neutral-500">Solicitar correcao</p>
              </div>
            </button>
            <button
              onClick={() => {
                setRequestType('PORTABILITY');
                setShowRequestModal(true);
              }}
              className="flex items-center gap-3 p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors text-left"
            >
              <Download className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-medium text-neutral-800">Portabilidade</p>
                <p className="text-sm text-neutral-500">Exportar dados</p>
              </div>
            </button>
            <button
              onClick={() => {
                setRequestType('DELETION');
                setShowRequestModal(true);
              }}
              className="flex items-center gap-3 p-4 border border-danger-200 rounded-lg hover:bg-danger-50 transition-colors text-left"
            >
              <Trash2 className="w-5 h-5 text-danger-600" />
              <div>
                <p className="font-medium text-danger-700">Excluir Conta</p>
                <p className="text-sm text-danger-500">Solicitar exclusao</p>
              </div>
            </button>
          </div>
        </div>

        {/* Request Modal */}
        {showRequestModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto my-4">
              <h3 className="text-lg font-semibold text-neutral-800 mb-4">
                Nova Solicitacao LGPD
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Tipo de Solicitacao
                  </label>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="ACCESS">Acesso aos Dados</option>
                    <option value="CORRECTION">Correcao de Dados</option>
                    <option value="DELETION">Exclusao de Dados</option>
                    <option value="PORTABILITY">Portabilidade</option>
                    <option value="REVOKE_CONSENT">Revogacao de Consentimento</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Descricao (opcional)
                  </label>
                  <textarea
                    value={requestDescription}
                    onChange={(e) => setRequestDescription(e.target.value)}
                    rows={3}
                    placeholder="Descreva sua solicitacao..."
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                {requestType === 'DELETION' && (
                  <div className="bg-danger-50 border border-danger-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-danger-700">
                        <strong>Atencao:</strong> A exclusao de dados e irreversivel. Todos os seus dados serao permanentemente removidos.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestType('');
                    setRequestDescription('');
                  }}
                  className="flex-1 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateRequest}
                  disabled={submitting || !requestType}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Enviando...' : 'Enviar Solicitacao'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MyData;
