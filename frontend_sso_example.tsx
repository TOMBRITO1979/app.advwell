/**
 * Exemplo de implementação SSO no Frontend do AdvWell
 *
 * Este código deve ser adicionado ao frontend para suportar login automático
 * quando o usuário vem do Chatwoot com um token SSO na URL
 *
 * Adicionar em: frontend/src/App.tsx ou criar um componente separado
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

/**
 * Hook para verificar e processar SSO Token da URL
 * Uso: Adicionar no componente App ou Layout principal
 */
export const useSSOHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    const handleSSOToken = async () => {
      // Verifica se há um token SSO na URL
      const urlParams = new URLSearchParams(location.search);
      const ssoToken = urlParams.get('sso_token');

      if (!ssoToken) {
        return; // Não há token SSO, continua normalmente
      }

      console.log('🔐 Token SSO detectado, fazendo login automático...');

      try {
        // Armazena o token no localStorage
        localStorage.setItem('token', ssoToken);

        // Busca os dados do usuário usando o token
        const response = await fetch('https://api.advwell.pro/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${ssoToken}`
          }
        });

        if (!response.ok) {
          throw new Error('Token SSO inválido');
        }

        const userData = await response.json();

        // Atualiza o estado de autenticação
        login(ssoToken, {
          id: userData.id,
          name: userData.name,
          email: userData.email,
          role: userData.role,
          companyId: userData.companyId,
          companyName: userData.company?.name
        });

        // Remove o token da URL e redireciona
        const cleanUrl = window.location.pathname;
        navigate(cleanUrl, { replace: true });

        console.log('✅ Login SSO realizado com sucesso!');

      } catch (error) {
        console.error('❌ Erro ao processar SSO:', error);

        // Remove token inválido
        localStorage.removeItem('token');

        // Redireciona para login
        navigate('/login', { replace: true });
      }
    };

    handleSSOToken();
  }, [location, navigate, login]);
};

/**
 * Componente wrapper que adiciona suporte a SSO
 *
 * Uso em App.tsx:
 *
 * function App() {
 *   return (
 *     <SSOProvider>
 *       {// resto da aplicação}
 *     </SSOProvider>
 *   );
 * }
 */
export const SSOProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useSSOHandler();
  return <>{children}</>;
};

/**
 * ALTERNATIVA: Adicionar diretamente no App.tsx
 *
 * import { useSSOHandler } from './hooks/useSSOHandler';
 *
 * function App() {
 *   useSSOHandler(); // Adicionar esta linha
 *
 *   return (
 *     <Router>
 *       {// rotas...}
 *     </Router>
 *   );
 * }
 */

/**
 * Exemplo de URL SSO do Chatwoot:
 * https://app.advwell.pro?sso_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * Fluxo:
 * 1. Usuário faz login no Chatwoot
 * 2. Chatwoot chama API /integration/sso-token
 * 3. Chatwoot redireciona para AdvWell com token na URL
 * 4. Frontend detecta token e faz login automático
 * 5. Usuário é redirecionado para dashboard
 */

/**
 * Configuração do Iframe no Chatwoot
 *
 * HTML:
 * <iframe
 *   id="advwell-frame"
 *   src=""
 *   width="100%"
 *   height="100%"
 *   frameborder="0"
 *   style="border: none;"
 * ></iframe>
 *
 * JavaScript:
 * async function loadAdvWell(userEmail) {
 *   const response = await fetch('https://api.advwell.pro/api/integration/sso-token', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *       'X-API-Key': 'SUA-API-KEY-AQUI'
 *     },
 *     body: JSON.stringify({ email: userEmail })
 *   });
 *
 *   const { token } = await response.json();
 *   const iframe = document.getElementById('advwell-frame');
 *   iframe.src = `https://app.advwell.pro?sso_token=${token}`;
 * }
 *
 * // Quando o usuário logar no Chatwoot
 * loadAdvWell('usuario@email.com');
 */

/**
 * CORS: Certificar que o backend permite requests do Chatwoot
 *
 * backend/src/index.ts:
 * app.use(cors({
 *   origin: [
 *     'https://app.advwell.pro',
 *     'https://chatwoot.seu-dominio.com' // Adicionar domínio do Chatwoot
 *   ],
 *   credentials: true
 * }));
 */
