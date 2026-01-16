import { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Clock,
  FileText,
  User,
  UserPlus,
  UserMinus,
  Edit,
  Upload,
  Trash2,
  RefreshCw,
  Activity
} from 'lucide-react';
import { formatDateTime } from '../utils/dateFormatter';

interface AuditLog {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  metadata: any;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface CaseTimelineProps {
  caseId: string;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'CASE_CREATED':
      return <FileText className="text-success-600" size={18} />;
    case 'STATUS_CHANGED':
      return <Activity className="text-info-600" size={18} />;
    case 'DEADLINE_CHANGED':
    case 'DEADLINE_RESPONSIBLE_CHANGED':
      return <Clock className="text-orange-600" size={18} />;
    case 'PART_ADDED':
      return <UserPlus className="text-success-600" size={18} />;
    case 'PART_UPDATED':
      return <Edit className="text-info-600" size={18} />;
    case 'PART_DELETED':
      return <UserMinus className="text-red-600" size={18} />;
    case 'DOCUMENT_ADDED':
      return <Upload className="text-success-600" size={18} />;
    case 'DOCUMENT_DELETED':
      return <Trash2 className="text-red-600" size={18} />;
    case 'DATAJUD_SYNCED':
      return <RefreshCw className="text-primary-600" size={18} />;
    case 'FIELD_UPDATED':
      return <Edit className="text-info-600" size={18} />;
    default:
      return <Activity className="text-neutral-600" size={18} />;
  }
};

export default function CaseTimeline({ caseId }: CaseTimelineProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, [caseId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/cases/${caseId}/audit-logs`);
      setLogs(response.data);
    } catch (err: any) {
      console.error('Erro ao buscar logs de auditoria:', err);
      setError(err.response?.data?.error || 'Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="text-neutral-600 mt-4">Carregando histórico...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-neutral-500">Nenhum histórico encontrado para este processo.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="relative">
        {/* Linha vertical da timeline */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neutral-200"></div>

        {/* Items da timeline */}
        <div className="space-y-6">
          {logs.map((log) => (
            <div key={log.id} className="relative flex gap-4">
              {/* Ícone */}
              <div className="relative z-10 flex-shrink-0 w-8 h-8 bg-white dark:bg-slate-700 rounded-full border-2 border-neutral-200 dark:border-slate-600 flex items-center justify-center">
                {getActionIcon(log.action)}
              </div>

              {/* Conteúdo */}
              <div className="flex-1 pb-6">
                <div className="bg-neutral-50 dark:bg-slate-700 rounded-lg p-4 border border-neutral-200 dark:border-slate-600">
                  <p className="text-neutral-900 dark:text-slate-100 font-medium mb-1">{log.description}</p>

                  <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-slate-400 mt-2">
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      <span>{log.user.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{formatDateTime(log.createdAt)}</span>
                    </div>
                  </div>

                  {/* Metadados adicionais (se houver) */}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-200">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {log.metadata.oldValue !== undefined && (
                          <div>
                            <span className="text-neutral-500">Valor anterior:</span>
                            <span className="ml-1 text-neutral-700">{String(log.metadata.oldValue)}</span>
                          </div>
                        )}
                        {log.metadata.newValue !== undefined && (
                          <div>
                            <span className="text-neutral-500">Novo valor:</span>
                            <span className="ml-1 text-neutral-700">{String(log.metadata.newValue)}</span>
                          </div>
                        )}
                        {log.metadata.movementsCount !== undefined && (
                          <div>
                            <span className="text-neutral-500">Movimentações:</span>
                            <span className="ml-1 text-neutral-700">{log.metadata.movementsCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
