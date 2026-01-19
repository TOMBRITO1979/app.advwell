import { useEffect, useState } from 'react';
import { Building2, Mail, Phone, MapPin } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { portalApi, PortalCompany as CompanyType } from '../services/portalApi';
import toast from 'react-hot-toast';

export default function PortalCompany() {
  const [company, setCompany] = useState<CompanyType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompany();
  }, []);

  const loadCompany = async () => {
    try {
      const response = await portalApi.getCompany();
      setCompany(response);
    } catch (error) {
      toast.error('Erro ao carregar dados do escritório');
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

  if (!company) {
    return (
      <PortalLayout>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-slate-400">Dados do escritório não encontrados</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Escritório</h1>
          <p className="text-gray-500 dark:text-slate-400">Informações de contato do escritório</p>
        </div>

        {/* Company card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          {/* Header with logo */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-8">
            <div className="flex items-center gap-6">
              {company.logo ? (
                <img
                  src={company.logo}
                  alt={company.name}
                  className="w-20 h-20 rounded-xl object-cover bg-white"
                />
              ) : (
                <div className="w-20 h-20 bg-white/20 rounded-xl flex items-center justify-center">
                  <Building2 className="text-white" size={40} />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-white">{company.name}</h2>
                <p className="text-green-100 mt-1">Escritório de Advocacia</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Contact info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Contato</h3>
                <div className="space-y-4">
                  {company.email && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <Mail className="text-green-600 dark:text-green-400" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Email</p>
                        <a
                          href={`mailto:${company.email}`}
                          className="font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                        >
                          {company.email}
                        </a>
                      </div>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <Phone className="text-green-600 dark:text-green-400" size={20} />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 dark:text-slate-400">Telefone</p>
                        <a
                          href={`tel:${company.phone}`}
                          className="font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                        >
                          {company.phone}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Address */}
              {(company.address || company.city || company.state) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Endereço</h3>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="text-green-600 dark:text-green-400" size={20} />
                    </div>
                    <div>
                      {company.address && (
                        <p className="font-medium text-gray-900 dark:text-slate-100">{company.address}</p>
                      )}
                      {(company.city || company.state) && (
                        <p className="text-gray-600 dark:text-slate-300">
                          {[company.city, company.state].filter(Boolean).join(' - ')}
                        </p>
                      )}
                      {company.zipCode && <p className="text-gray-500 dark:text-slate-400">{company.zipCode}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
