import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Building2, MapPin, Save } from 'lucide-react';

interface CompanySettings {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logo?: string;
}

const Settings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<CompanySettings>({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    logo: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/companies/own');
      setSettings(response.data);
    } catch (error) {
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await api.put('/companies/own', {
        name: settings.name,
        email: settings.email,
        phone: settings.phone,
        address: settings.address,
        city: settings.city,
        state: settings.state,
        zipCode: settings.zipCode,
        logo: settings.logo,
      });

      setSettings(response.data);
      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Building2 className="h-7 w-7" />
              Configurações da Empresa
            </h1>
            <p className="text-gray-600 mt-2">
              Configure os dados da sua empresa. Essas informações serão incluídas nos relatórios em PDF.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
            {/* Informações Básicas */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Informações Básicas
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={settings.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={settings.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={settings.phone || ''}
                    onChange={handleChange}
                    placeholder="(00) 0000-0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL do Logo
                  </label>
                  <input
                    type="text"
                    name="logo"
                    value={settings.logo || ''}
                    onChange={handleChange}
                    placeholder="https://exemplo.com/logo.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logradouro
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={settings.address || ''}
                    onChange={handleChange}
                    placeholder="Rua, Avenida, número"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={settings.city || ''}
                    onChange={handleChange}
                    placeholder="Ex: São Paulo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={settings.state || ''}
                    onChange={handleChange}
                    placeholder="Ex: SP"
                    maxLength={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CEP
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={settings.zipCode || ''}
                    onChange={handleChange}
                    placeholder="00000-000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Botão Salvar */}
            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>

          {/* Informações Adicionais */}
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">ℹ️ Informação</h3>
            <p className="text-sm text-green-800">
              Os dados configurados aqui serão automaticamente incluídos no cabeçalho dos relatórios
              financeiros em PDF, dando um aspecto mais profissional aos seus documentos.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
