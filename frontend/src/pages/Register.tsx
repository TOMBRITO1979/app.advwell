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

    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        cnpj: formData.cnpj || undefined,
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-green-600 to-green-700 dark:from-green-900 dark:via-green-900 dark:to-green-800 px-4 py-12 relative overflow-hidden">
        {/* Animated background geometric shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-green-300/20 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute top-1/4 -right-24 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] bg-green-200/15 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRvdHMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNkb3RzKSIvPjwvc3ZnPg==')] opacity-40"></div>
        </div>

        <div className="max-w-md w-full backdrop-blur-xl bg-white/85 dark:bg-slate-900/75 rounded-3xl shadow-2xl border border-white/40 p-10 relative z-10">
          <div className="absolute -top-3 -left-3 w-28 h-28 bg-gradient-to-br from-white/20 to-transparent rounded-tl-3xl blur-xl"></div>
          <div className="absolute -bottom-3 -right-3 w-28 h-28 bg-gradient-to-tl from-white/20 to-transparent rounded-br-3xl blur-xl"></div>
          <div className="text-center relative">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-300/20 mb-4">
              <CheckCircle className="w-10 h-10 text-green-500 dark:text-green-300" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3 drop-shadow-2xl">
              Cadastro Realizado!
            </h1>
            <p className="text-slate-700 dark:text-white/90 mb-6 text-lg">
              Enviamos um email de verificação para:
            </p>
            <div className="bg-green-50 dark:bg-green-900/30 border border-white/40 rounded-lg p-4 mb-6 backdrop-blur-sm">
              <Mail className="w-5 h-5 text-green-500 dark:text-green-300 inline mr-2" />
              <span className="font-semibold text-slate-700 dark:text-white">{userEmail}</span>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-400/40 rounded-lg p-4 mb-6 text-left backdrop-blur-sm">
              <p className="text-sm text-amber-900 dark:text-amber-100 mb-2">
                <strong>Próximos passos:</strong>
              </p>
              <ol className="text-sm text-amber-800 dark:text-amber-50 space-y-1 list-decimal list-inside">
                <li>Verifique sua caixa de entrada</li>
                <li>Clique no link de verificação</li>
                <li>Faça login no sistema</li>
              </ol>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/login')}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg shadow-xl hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-95 font-medium"
              >
                Ir para Login
              </button>
              <button
                onClick={() => navigate('/resend-verification')}
                className="w-full px-4 py-2 text-green-500 dark:text-green-300 hover:text-white transition-colors text-sm font-medium"
              >
                Não recebeu o email? Reenviar
              </button>
            </div>
            <p className="text-xs text-white/70 mt-6">
              Dica: Verifique também sua caixa de spam
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-green-600 to-green-700 dark:from-green-900 dark:via-green-900 dark:to-green-800 px-4 py-12 relative overflow-hidden">
      {/* Animated background geometric shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-green-300/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-1/4 -right-24 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] bg-green-200/15 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRvdHMiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNkb3RzKSIvPjwvc3ZnPg==')] opacity-40"></div>
      </div>

      <div className="max-w-md w-full backdrop-blur-xl bg-white/85 dark:bg-slate-900/75 rounded-3xl shadow-2xl border border-white/40 p-10 relative z-10">
        <div className="absolute -top-3 -left-3 w-28 h-28 bg-gradient-to-br from-white/20 to-transparent rounded-tl-3xl blur-xl"></div>
        <div className="absolute -bottom-3 -right-3 w-28 h-28 bg-gradient-to-tl from-white/20 to-transparent rounded-br-3xl blur-xl"></div>

        <div className="text-center mb-8 relative">
          <h1 className="text-5xl font-extrabold text-slate-900 dark:text-white mb-3 drop-shadow-2xl tracking-tight">Cadastro</h1>
          <p className="text-lg text-slate-700 dark:text-white/90 font-medium">Crie sua conta no AdvWell</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
              Nome Completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={formData.name}
              onChange={handleChange}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 dark:bg-slate-800/50 appearance-none outline outline-1 focus:outline focus:outline-2 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 sm:text-sm sm:leading-6 px-3 py-3 outline-green-400/60 hover:outline-green-500 focus:outline-green-500 focus:bg-white/40"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 dark:bg-slate-800/50 appearance-none outline outline-1 focus:outline focus:outline-2 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 sm:text-sm sm:leading-6 px-3 py-3 outline-green-400/60 hover:outline-green-500 focus:outline-green-500 focus:bg-white/40"
            />
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
              Nome da Empresa/Escritório
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              required
              value={formData.companyName}
              onChange={handleChange}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 dark:bg-slate-800/50 appearance-none outline outline-1 focus:outline focus:outline-2 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 sm:text-sm sm:leading-6 px-3 py-3 outline-green-400/60 hover:outline-green-500 focus:outline-green-500 focus:bg-white/40"
            />
          </div>

          <div>
            <label htmlFor="cnpj" className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
              CNPJ (opcional)
            </label>
            <input
              id="cnpj"
              name="cnpj"
              type="text"
              value={formData.cnpj}
              onChange={handleChange}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 dark:bg-slate-800/50 appearance-none outline outline-1 focus:outline focus:outline-2 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 sm:text-sm sm:leading-6 px-3 py-3 outline-green-400/60 hover:outline-green-500 focus:outline-green-500 focus:bg-white/40"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 dark:bg-slate-800/50 appearance-none outline outline-1 focus:outline focus:outline-2 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 sm:text-sm sm:leading-6 px-3 py-3 outline-green-400/60 hover:outline-green-500 focus:outline-green-500 focus:bg-white/40"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-white mb-2">
              Confirmar Senha
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              className="block w-full border-none rounded-md shadow-sm bg-white/30 dark:bg-slate-800/50 appearance-none outline outline-1 focus:outline focus:outline-2 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 sm:text-sm sm:leading-6 px-3 py-3 outline-green-400/60 hover:outline-green-500 focus:outline-green-500 focus:bg-white/40"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-xl text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-green-500/50 transition-all duration-300 transform hover:scale-[1.02] active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <div className="mt-6 text-center relative">
          <p className="text-sm text-slate-700 dark:text-white/90">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-green-600 dark:text-green-200 hover:text-green-700 dark:hover:text-green-100 transition-colors duration-200 font-bold">
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
