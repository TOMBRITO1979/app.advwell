import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Scale, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      const errorData = error.response?.data;

      // Trata erro de email não verificado
      if (errorData?.error === 'Email não verificado') {
        toast.error(errorData.message || 'Email não verificado');
      } else {
        toast.error(errorData?.error || 'Erro ao fazer login');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-100 via-green-200 to-teal-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4 relative overflow-hidden">
      {/* Animated background geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-emerald-300/30 dark:bg-emerald-900/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-1/4 -right-24 w-96 h-96 bg-green-300/25 dark:bg-green-900/15 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] bg-teal-200/20 dark:bg-teal-900/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

        {/* Dot pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRvdHMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNkb3RzKSIvPjwvc3ZnPg==')] opacity-40"></div>
      </div>

      <div className="max-w-md w-full backdrop-blur-xl bg-white/90 dark:bg-slate-800/90 rounded-2xl shadow-2xl border border-white/40 dark:border-slate-700/40 p-10 relative z-10">
        {/* Decorative corner accents */}
        <div className="absolute -top-3 -left-3 w-28 h-28 bg-gradient-to-br from-white/20 to-transparent rounded-tl-2xl blur-xl"></div>
        <div className="absolute -bottom-3 -right-3 w-28 h-28 bg-gradient-to-tl from-white/20 to-transparent rounded-br-2xl blur-xl"></div>

        <div className="text-center mb-8 relative">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30 transform hover:scale-105 transition-transform duration-300">
              <Scale className="w-11 h-11 text-white" strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-primary-600 dark:text-primary-400 mb-3 drop-shadow-lg tracking-tight">AdvWell</h1>
          <p className="text-base text-neutral-600 dark:text-slate-400 font-medium">Sistema de Advocacia</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full border rounded-lg shadow-sm bg-white dark:bg-slate-700 appearance-none focus:outline-none text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 text-base px-4 py-3 border-neutral-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all min-h-[44px]"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 dark:text-slate-300 mb-2">
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full border rounded-lg shadow-sm bg-white dark:bg-slate-700 appearance-none focus:outline-none text-neutral-900 dark:text-slate-100 placeholder:text-neutral-400 dark:placeholder:text-slate-500 text-base px-4 py-3 pr-12 border-neutral-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-20 transition-all min-h-[44px]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 dark:text-slate-400 hover:text-neutral-700 dark:hover:text-slate-300 focus:outline-none transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link
              to="/forgot-password"
              className="text-sm text-primary-600 hover:text-primary-700 transition-colors duration-200 font-medium"
            >
              Esqueceu a senha?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-semibold text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 hover:shadow-lg hover:shadow-primary-500/30 transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2 relative">
          <p className="text-sm text-neutral-600 dark:text-slate-400">
            Não tem uma conta?{' '}
            <Link to="/register" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200 font-semibold">
              Cadastre-se
            </Link>
          </p>
          <p className="text-xs text-neutral-500 dark:text-slate-500">
            Não recebeu o email de verificação?{' '}
            <Link to="/resend-verification" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors duration-200 font-medium">
              Reenviar
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

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
