import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setEmailSent(true);
      toast.success('Email de recuperação enviado com sucesso!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao enviar email');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-green-600 to-green-700 px-4 relative overflow-hidden">
        {/* Animated background geometric shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-green-300/20 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute top-1/4 -right-24 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] bg-green-200/15 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

          {/* Dot pattern overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRvdHMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNkb3RzKSIvPjwvc3ZnPg==')] opacity-40"></div>
        </div>

        <div className="max-w-md w-full backdrop-blur-xl bg-white/85 rounded-3xl shadow-2xl border border-white/40 p-10 relative z-10">
          {/* Decorative corner accents */}
          <div className="absolute -top-3 -left-3 w-28 h-28 bg-gradient-to-br from-white/20 to-transparent rounded-tl-3xl blur-xl"></div>
          <div className="absolute -bottom-3 -right-3 w-28 h-28 bg-gradient-to-tl from-white/20 to-transparent rounded-br-3xl blur-xl"></div>

          <div className="text-center mb-8 relative">
            <h1 className="text-5xl font-extrabold text-slate-900 mb-3 drop-shadow-2xl tracking-tight">Email Enviado!</h1>
            <p className="text-slate-700 text-lg font-medium">Verifique sua caixa de entrada</p>
          </div>

          <div className="bg-green-50/80 border border-primary-200/50 rounded-xl p-4 mb-6 backdrop-blur-sm relative">
            <p className="text-green-800 text-sm">
              Enviamos um email para <strong className="font-bold">{email}</strong> com instruções para redefinir sua senha.
            </p>
            <p className="text-primary-700 text-sm mt-2">
              O link expira em 1 hora.
            </p>
          </div>

          <div className="text-center relative">
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 font-semibold transition-colors duration-200"
            >
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-green-600 to-green-700 px-4 relative overflow-hidden">
      {/* Animated background geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-green-300/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-1/4 -right-24 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] bg-green-200/15 rounded-full blur-3xl animate-blob animation-delay-4000"></div>

        {/* Dot pattern overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRvdHMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNkb3RzKSIvPjwvc3ZnPg==')] opacity-40"></div>
      </div>

      <div className="max-w-md w-full backdrop-blur-xl bg-white/85 rounded-3xl shadow-2xl border border-white/40 p-10 relative z-10">
        {/* Decorative corner accents */}
        <div className="absolute -top-3 -left-3 w-28 h-28 bg-gradient-to-br from-white/20 to-transparent rounded-tl-3xl blur-xl"></div>
        <div className="absolute -bottom-3 -right-3 w-28 h-28 bg-gradient-to-tl from-white/20 to-transparent rounded-br-3xl blur-xl"></div>

        <div className="text-center mb-8 relative">
          <h1 className="text-5xl font-extrabold text-slate-900 mb-3 drop-shadow-2xl tracking-tight">Esqueceu a senha?</h1>
          <p className="text-slate-700 text-lg font-medium">Digite seu email para recuperar o acesso</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 appearance-none outline outline-1 focus:outline focus:outline-2 text-slate-900 placeholder:text-slate-500 sm:text-sm sm:leading-6 px-3 py-3 outline-green-400/60 hover:outline-green-500 focus:outline-green-500 focus:bg-white/40 min-h-[44px]"
              placeholder="seu@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-xl text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 min-h-[44px]"
          >
            {loading ? 'Enviando...' : 'Enviar email de recuperação'}
          </button>
        </form>

        <div className="mt-6 text-center relative">
          <Link
            to="/login"
            className="text-sm text-primary-600 hover:text-primary-700 font-semibold transition-colors duration-200"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

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
