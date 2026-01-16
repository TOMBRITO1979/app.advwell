import { useEffect, useState } from 'react';
import { Megaphone, AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { portalApi, PortalAnnouncement } from '../services/portalApi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';

const priorityConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Info }> = {
  URGENT: { label: 'Urgente', color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: AlertTriangle },
  HIGH: { label: 'Alta Prioridade', color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200', icon: AlertCircle },
  NORMAL: { label: 'Normal', color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: Info },
  LOW: { label: 'Informativo', color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200', icon: CheckCircle },
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
          <h1 className="text-2xl font-bold text-gray-900">Avisos</h1>
          <p className="text-gray-500">Comunicados e informações do escritório</p>
        </div>

        {/* Announcements list */}
        {announcements.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Megaphone className="mx-auto h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum aviso</h3>
            <p className="text-gray-500">Não há avisos do escritório no momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const priority = priorityConfig[announcement.priority] || priorityConfig.NORMAL;
              const PriorityIcon = priority.icon;
              return (
                <div
                  key={announcement.id}
                  className={`bg-white rounded-xl shadow-sm border p-6 ${priority.bgColor}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${priority.color} bg-white shadow-sm`}>
                      <PriorityIcon size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium uppercase ${priority.color}`}>
                          {priority.label}
                        </span>
                        <span className="text-gray-300">|</span>
                        <span className="text-xs text-gray-500">
                          {format(new Date(announcement.publishedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {announcement.title}
                      </h3>
                      <div
                        className="text-gray-700 prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: DOMPurify.sanitize(announcement.content.replace(/\n/g, '<br />'))
                        }}
                      />
                      <p className="text-sm text-gray-500 mt-4">
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
