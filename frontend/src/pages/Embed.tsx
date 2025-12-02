import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Embed Component - Auto-login for Chatwell integration
 *
 * URL Format: /embed/{TOKEN}/{PAGE}
 * Examples:
 *   /embed/abc123/dashboard  → Opens Dashboard
 *   /embed/abc123/clients    → Opens Clients
 *   /embed/abc123/cases      → Opens Cases
 *   /embed/abc123/           → Opens Dashboard (default)
 */
const Embed = () => {
  const { token, '*': page } = useParams<{ token: string; '*': string }>();
  const navigate = useNavigate();
  const { setToken, setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authenticate = async () => {
      try {
        // 1. Clear any previous session
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        if (!token) {
          setError('Token não fornecido');
          setLoading(false);
          return;
        }

        // 2. Call embed authentication endpoint
        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.advwell.pro/api';
        const response = await fetch(`${apiUrl}/auth/embed/${token}`);

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Token inválido');
        }

        const data = await response.json();

        // 3. Save session (same format as normal login)
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Update auth context
        setToken(data.token);
        setUser(data.user);

        // 4. Redirect to requested page
        const targetPage = page || 'dashboard';
        navigate(`/${targetPage}`, { replace: true });

      } catch (err: any) {
        console.error('Embed auth error:', err);
        setError(err.message || 'Erro ao autenticar');
        setLoading(false);
      }
    };

    if (token) {
      authenticate();
    }
  }, [token, page, navigate, setToken, setUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-neutral-600">Autenticando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-800 mb-2">Erro de Autenticação</h2>
            <p className="text-red-600">{error}</p>
            <p className="text-sm text-neutral-500 mt-4">
              Verifique se o token de embed está correto e se a empresa está ativa.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default Embed;
