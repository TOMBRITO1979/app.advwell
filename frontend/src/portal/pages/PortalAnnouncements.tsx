import { useEffect, useState } from 'react';
import { Megaphone, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { portalApi, PortalAnnouncement } from '../services/portalApi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';

const priorityConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Info }> = {
  URGENT: { label: 'Urgente', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800', icon: AlertTriangle },
  HIGH: { label: 'Alta Prioridade', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800', icon: AlertCircle },
  NORMAL: { label: 'Normal', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800', icon: Info },
  LOW: { label: 'Informativo', color: 'text-gray-700 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600', icon: CheckCircle },
};

export default function PortalAnnouncements() {
  const [announcements, setAnnouncements] = useState<PortalAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const response = await portalApi.getAnnouncements();
      setAnnouncements(response);
    } catch (error) {
      toast.error('Erro ao carregar avisos');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Avisos</h1>
          <p className="text-gray-500 dark:text-slate-400">Comunicados e informações do escritório</p>
        </div>

        {/* Announcements list */}
        {announcements.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-12 text-center">
            <Megaphone className="mx-auto h-16 w-16 text-gray-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Nenhum aviso</h3>
            <p className="text-gray-500 dark:text-slate-400">Não há avisos do escritório no momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const priority = priorityConfig[announcement.priority] || priorityConfig.NORMAL;
              const PriorityIcon = priority.icon;
              return (
                <div
                  key={announcement.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border p-6 ${priority.bgColor}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${priority.color} bg-white dark:bg-slate-700 shadow-sm`}>
                      <PriorityIcon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium uppercase ${priority.color}`}>
                          {priority.label}
                        </span>
                        <span className="text-gray-300 dark:text-slate-600">|</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                          {format(new Date(announcement.publishedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {announcement.title}
                      </h3>
                      <div
                        className="text-gray-700 dark:text-slate-300 prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(announcement.content.replace(/\n/g, '<br />'))
                        }}
                      />
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-4">
                        Publicado por {announcement.creator.name}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
