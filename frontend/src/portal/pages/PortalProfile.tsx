import { useEffect, useState } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Briefcase, Building2 } from 'lucide-react';
import PortalLayout from '../components/PortalLayout';
import { portalApi, PortalProfile as ProfileType } from '../services/portalApi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function PortalProfile() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await portalApi.getProfile();
      setProfile(response);
    } catch (error) {
      toast.error('Erro ao carregar perfil');
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

  if (!profile) {
    return (
      <PortalLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Perfil não encontrado</p>
        </div>
      </PortalLayout>
    );
  }

  const InfoRow = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string | null }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
        <Icon className="text-gray-400 mt-0.5 flex-shrink-0" size={20} />
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="font-medium text-gray-900">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Dados</h1>
          <p className="text-gray-500">Informações do seu cadastro no escritório</p>
        </div>

        {/* Profile card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white dark:bg-slate-800/20 rounded-full flex items-center justify-center">
                <User className="text-white" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{profile.name}</h2>
                <p className="text-green-100">
                  {profile.personType === 'FISICA' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Pessoais</h3>
                <div className="space-y-1">
                  <InfoRow icon={User} label="CPF/CNPJ" value={profile.cpf} />
                  <InfoRow icon={User} label="RG" value={profile.rg} />
                  <InfoRow icon={Mail} label="Email" value={profile.email} />
                  <InfoRow icon={Phone} label="Telefone" value={profile.phone} />
                  {profile.birthDate && (
                    <InfoRow
                      icon={Calendar}
                      label="Data de Nascimento"
                      value={format(new Date(profile.birthDate), "dd/MM/yyyy", { locale: ptBR })}
                    />
                  )}
                </div>
              </div>

              {/* Additional info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Adicionais</h3>
                <div className="space-y-1">
                  <InfoRow icon={Briefcase} label="Profissão" value={profile.profession} />
                  <InfoRow icon={User} label="Nacionalidade" value={profile.nationality} />
                  <InfoRow icon={User} label="Estado Civil" value={profile.maritalStatus} />
                  {profile.personType === 'JURIDICA' && (
                    <>
                      <InfoRow icon={Building2} label="Inscrição Estadual" value={profile.stateRegistration} />
                      <InfoRow icon={User} label="Representante Legal" value={profile.representativeName} />
                      <InfoRow icon={User} label="CPF do Representante" value={profile.representativeCpf} />
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Address */}
            {(profile.address || profile.city || profile.state) && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h3>
                <div className="flex items-start gap-3">
                  <MapPin className="text-gray-400 mt-0.5 flex-shrink-0" size={20} />
                  <div>
                    {profile.address && <p className="font-medium text-gray-900">{profile.address}</p>}
                    {(profile.city || profile.state) && (
                      <p className="text-gray-600">
                        {[profile.city, profile.state].filter(Boolean).join(' - ')}
                      </p>
                    )}
                    {profile.zipCode && <p className="text-gray-500">{profile.zipCode}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Client since */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Cliente desde {format(new Date(profile.createdAt), "MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
        </div>

        {/* Info notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-700">
            Para atualizar seus dados cadastrais, entre em contato com o escritório.
          </p>
        </div>
      </div>
    </PortalLayout>
  );
}
