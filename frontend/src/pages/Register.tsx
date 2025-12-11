import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Mail, CheckCircle } from 'lucide-react';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    cnpj: '',
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Voce precisa aceitar os Termos de Uso e a Politica de Privacidade');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        cnpj: formData.cnpj || undefined,
        consents: [
          { type: 'PRIVACY_POLICY', version: '1.0' },
          { type: 'TERMS_OF_USE', version: '1.0' },
        ],
      });
      setUserEmail(formData.email);
      setRegistered(true);
      toast.success('Cadastro realizado! Verifique seu email.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao fazer cadastro');
    } finally {
      setLoading(false);
    }
  };

  // Tela de sucesso após registro
  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 px-4 py-12 relative overflow-hidden">
        {/* Animated background geometric shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary-300/20 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute top-1/4 -right-24 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] bg-primary-200/15 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRvdHMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNkb3RzKSIvPjwvc3ZnPg==')] opacity-40"></div>
        </div>

        <div className="max-w-md w-full backdrop-blur-xl bg-white/85 rounded-3xl shadow-2xl border border-white/40 p-10 relative z-10">
          <div className="absolute -top-3 -left-3 w-28 h-28 bg-gradient-to-br from-white/20 to-transparent rounded-tl-3xl blur-xl"></div>
          <div className="absolute -bottom-3 -right-3 w-28 h-28 bg-gradient-to-tl from-white/20 to-transparent rounded-br-3xl blur-xl"></div>
          <div className="text-center relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-300/20 mb-4">
              <CheckCircle className="w-10 h-10 text-primary-500" />
            </div>
            <h1 className="text-3xl font-extrabold text-neutral-900 mb-3 drop-shadow-2xl">
              Cadastro Realizado!
            </h1>
            <p className="text-neutral-700 mb-6 text-lg">
              Enviamos um email de verificação para:
            </p>
            <div className="bg-primary-50 border border-white/40 rounded-lg p-4 mb-6 backdrop-blur-sm">
              <Mail className="w-5 h-5 text-primary-500 inline mr-2" />
              <span className="font-semibold text-neutral-700">{userEmail}</span>
            </div>
            <div className="bg-warning-50 border border-warning-300 rounded-lg p-4 mb-6 text-left backdrop-blur-sm">
              <p className="text-sm text-warning-700 mb-2">
                <strong>Próximos passos:</strong>
              </p>
              <ol className="text-sm text-warning-600 space-y-1 list-decimal list-inside">
                <li>Verifique sua caixa de entrada</li>
                <li>Clique no link de verificação</li>
                <li>Faça login no sistema</li>
              </ol>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg shadow-xl hover:shadow-primary-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-95 font-medium min-h-[44px]"
              >
                Ir para Login
              </button>
              <button
                onClick={() => navigate('/resend-verification')}
                className="w-full px-4 py-2 text-primary-500 hover:text-neutral-900 transition-colors text-sm font-medium"
              >
                Não recebeu o email? Reenviar
              </button>
            </div>
            <p className="text-xs text-neutral-900/70 mt-6">
              Dica: Verifique também sua caixa de spam
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 px-4 py-12 relative overflow-hidden">
      {/* Animated background geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-primary-300/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-1/4 -right-24 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] bg-primary-200/15 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRvdHMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNkb3RzKSIvPjwvc3ZnPg==')] opacity-40"></div>
      </div>

      <div className="max-w-md w-full backdrop-blur-xl bg-white/85 rounded-3xl shadow-2xl border border-white/40 p-10 relative z-10">
        <div className="absolute -top-3 -left-3 w-28 h-28 bg-gradient-to-br from-white/20 to-transparent rounded-tl-3xl blur-xl"></div>
        <div className="absolute -bottom-3 -right-3 w-28 h-28 bg-gradient-to-tl from-white/20 to-transparent rounded-br-3xl blur-xl"></div>

        <div className="text-center mb-8 relative">
          <h1 className="text-5xl font-extrabold text-neutral-900 mb-3 drop-shadow-2xl tracking-tight">Cadastro</h1>
          <p className="text-lg text-neutral-700 font-medium">Crie sua conta no AdvWell</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
              Nome Completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 appearance-none outline outline-1 focus:outline focus:outline-2 text-neutral-900 placeholder:text-neutral-500 sm:text-sm sm:leading-6 px-3 py-3 outline-primary-400/60 hover:outline-primary-500 focus:outline-primary-500 focus:bg-white/40 min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 appearance-none outline outline-1 focus:outline focus:outline-2 text-neutral-900 placeholder:text-neutral-500 sm:text-sm sm:leading-6 px-3 py-3 outline-primary-400/60 hover:outline-primary-500 focus:outline-primary-500 focus:bg-white/40 min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-neutral-700 mb-2">
              Nome da Empresa/Escritório
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              required
              value={formData.companyName}
              onChange={handleChange}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 appearance-none outline outline-1 focus:outline focus:outline-2 text-neutral-900 placeholder:text-neutral-500 sm:text-sm sm:leading-6 px-3 py-3 outline-primary-400/60 hover:outline-primary-500 focus:outline-primary-500 focus:bg-white/40 min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="cnpj" className="block text-sm font-medium text-neutral-700 mb-2">
              CNPJ (opcional)
            </label>
            <input
              id="cnpj"
              name="cnpj"
              type="text"
              value={formData.cnpj}
              onChange={handleChange}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 appearance-none outline outline-1 focus:outline focus:outline-2 text-neutral-900 placeholder:text-neutral-500 sm:text-sm sm:leading-6 px-3 py-3 outline-primary-400/60 hover:outline-primary-500 focus:outline-primary-500 focus:bg-white/40 min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-2">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 appearance-none outline outline-1 focus:outline focus:outline-2 text-neutral-900 placeholder:text-neutral-500 sm:text-sm sm:leading-6 px-3 py-3 outline-primary-400/60 hover:outline-primary-500 focus:outline-primary-500 focus:bg-white/40 min-h-[44px]"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-2">
              Confirmar Senha
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 appearance-none outline outline-1 focus:outline focus:outline-2 text-neutral-900 placeholder:text-neutral-500 sm:text-sm sm:leading-6 px-3 py-3 outline-primary-400/60 hover:outline-primary-500 focus:outline-primary-500 focus:bg-white/40 min-h-[44px]"
            />
          </div>

          {/* Checkbox de Consentimento LGPD */}
          <div className="flex items-start mt-4">
            <div className="flex items-center h-5">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="h-4 w-4 text-primary-600 border-primary-300 rounded focus:ring-primary-500 cursor-pointer"
                required
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="terms" className="text-neutral-700 cursor-pointer">
                Li e aceito a{' '}
                <Link
                  to="/politica-de-privacidade"
                  target="_blank"
                  className="text-primary-600 hover:text-primary-700 font-semibold underline"
                >
                  Politica de Privacidade
                </Link>
                {' '}e os{' '}
                <Link
                  to="/termos-de-uso"
                  target="_blank"
                  className="text-primary-600 hover:text-primary-700 font-semibold underline"
                >
                  Termos de Uso
                </Link>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-xl text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 hover:shadow-primary-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 min-h-[44px]"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 text-center relative">
          <p className="text-sm text-neutral-700">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 transition-colors duration-200 font-bold">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

// Add CSS animations for blobs
const style = document.createElement('style');
style.textContent = `
  @keyframes blob {
    0%, 100% {
      transform: translate(0, 0) scale(1) rotate(0deg);
    }
    25% {
      transform: translate(20px, -20px) scale(1.1) rotate(90deg);
    }
    50% {
      transform: translate(-20px, 20px) scale(0.9) rotate(180deg);
    }
    75% {
      transform: translate(20px, 20px) scale(1.05) rotate(270deg);
    }
  }

  .animate-blob {
    animation: blob 25s ease-in-out infinite;
  }

  .animation-delay-2000 {
    animation-delay: 2s;
  }

  .animation-delay-4000 {
    animation-delay: 4s;
  }
`;
if (typeof document !== 'undefined' && !document.getElementById('blob-animations')) {
  style.id = 'blob-animations';
  document.head.appendChild(style);
}
