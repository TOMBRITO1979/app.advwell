import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getSubdomain } from '../../utils/subdomain';
import api from '../../services/api';

interface CompanyInfo {
  id: string;
  name: string;
  logo?: string;
}

export default function PortalLogin() {
  const navigate = useNavigate();
  const { login, token } = useAuth();
  const subdomain = getSubdomain();

  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Se já logado, redirecionar para o portal
  useEffect(() => {
    if (token) {
      navigate('/portal');
    }
  }, [token, navigate]);

  // Buscar informações do escritório pelo subdomain
  useEffect(() => {
    if (subdomain) {
      setLoadingCompany(true);
      api.get(`/auth/company-by-subdomain/${subdomain}`)
        .then(res => {
          setCompany(res.data);
          setNotFound(false);
        })
        .catch(() => {
          setNotFound(true);
        })
        .finally(() => {
          setLoadingCompany(false);
        });
    } else {
      setLoadingCompany(false);
      setNotFound(true);
    }
  }, [subdomain]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, subdomain || undefined);
      navigate('/portal');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Erro ao fazer login';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Loading inicial
  if (loadingCompany) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-green-600 mx-auto" />
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Escritório não encontrado
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Escritório não encontrado</h1>
            <p className="text-gray-600 mb-6">
              Não foi possível encontrar o escritório para este endereço.
              Verifique a URL e tente novamente.
            </p>
            <p className="text-sm text-gray-500">
              Se você acredita que isso é um erro, entre em contato com o escritório.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo e nome do escritório */}
          <div className="text-center mb-8">
            {company?.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                className="h-20 w-auto mx-auto mb-4 object-contain"
              />
            ) : (
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Scale className="h-10 w-10 text-green-600" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{company?.name}</h1>
            <p className="text-green-600 font-medium mt-1">Área do Cliente</p>
          </div>

          {/* Formulário de login - SEM links de cadastro ou recuperação */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors pr-12"
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !company}
              className="w-full py-3 px-4 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:ring-4 focus:ring-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Mensagem de suporte - contato com escritório */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Problemas para acessar? Entre em contato com o escritório.
            </p>
          </div>
        </div>

        {/* Footer discreto */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Sistema de gestão jurídica
        </p>
      </div>
    </div>
  );
}
