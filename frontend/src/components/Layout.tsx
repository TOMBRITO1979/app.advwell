import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  Home,
  Users,
  UserPlus,
  FileText,
  DollarSign,
  FolderOpen,
  Calendar,
  CheckSquare,
  Settings,
  LogOut,
  Building2,
  Menu,
  X,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Bell,
  CreditCard,
  Mail,
  Bot,
  Scale,
  Clock,
  Gavel,
  Crown,
  AlertTriangle,
  Shield,
  History,
  Database,
} from 'lucide-react';

interface SubscriptionStatus {
  status: 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | null;
  isValid: boolean;
  daysRemaining?: number;
}

interface AccountsDueToday {
  count: number;
  total: number;
}

interface DeadlinesDueToday {
  count: number;
}

interface TasksDueToday {
  count: number;
}

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<SubscriptionStatus | null>(null);
  const [showSubscriptionBanner, setShowSubscriptionBanner] = React.useState(true);
  const [accountsDueToday, setAccountsDueToday] = React.useState<AccountsDueToday | null>(null);
  const [deadlinesDueToday, setDeadlinesDueToday] = React.useState<DeadlinesDueToday | null>(null);
  const [tasksDueToday, setTasksDueToday] = React.useState<TasksDueToday | null>(null);

  // Verificar se a sidebar deve ser escondida para este usuário
  const shouldHideSidebar = user?.hideSidebar === true;

  // Carregar estado do sidebar do localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  // Verificar status da assinatura (apenas para ADMIN, não SUPER_ADMIN)
  React.useEffect(() => {
    const checkSubscription = async () => {
      // Não verificar para SUPER_ADMIN
      if (user?.role === 'SUPER_ADMIN') return;

      try {
        const response = await api.get('/subscription/info');
        setSubscriptionStatus({
          status: response.data.status,
          isValid: response.data.isValid,
          daysRemaining: response.data.daysRemaining,
        });
      } catch (error) {
        console.error('Error checking subscription:', error);
      }
    };

    if (user) {
      checkSubscription();
    }
  }, [user]);

  // Verificar contas a pagar vencendo hoje
  React.useEffect(() => {
    const checkAccountsDueToday = async () => {
      try {
        const response = await api.get('/accounts-payable/due-today');
        setAccountsDueToday({
          count: response.data.count,
          total: response.data.total,
        });
      } catch (error) {
        console.error('Error checking accounts due today:', error);
      }
    };

    if (user) {
      checkAccountsDueToday();
      // Atualizar a cada 5 minutos
      const interval = setInterval(checkAccountsDueToday, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Verificar prazos vencendo hoje
  React.useEffect(() => {
    const checkDeadlinesDueToday = async () => {
      try {
        const response = await api.get('/cases/deadlines-today');
        setDeadlinesDueToday({
          count: response.data.count,
        });
      } catch (error) {
        console.error('Error checking deadlines due today:', error);
      }
    };

    if (user) {
      checkDeadlinesDueToday();
      // Atualizar a cada 5 minutos
      const interval = setInterval(checkDeadlinesDueToday, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Verificar tarefas vencendo hoje
  React.useEffect(() => {
    const checkTasksDueToday = async () => {
      try {
        const response = await api.get('/schedule/tasks-today');
        setTasksDueToday({
          count: response.data.count,
        });
      } catch (error) {
        console.error('Error checking tasks due today:', error);
      }
    };

    if (user) {
      checkTasksDueToday();
      // Atualizar a cada 5 minutos
      const interval = setInterval(checkTasksDueToday, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Salvar estado do sidebar no localStorage
  const toggleSidebarCollapse = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', String(newState));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/schedule', label: 'Agenda', icon: Calendar },
    { path: '/clients', label: 'Clientes', icon: Users },
    { path: '/cases', label: 'Processos', icon: FileText },
    { path: '/deadlines', label: 'Prazos', icon: Clock },
    { path: '/updates', label: 'Atualizações', icon: Bell },
    { path: '/legal-documents', label: 'Documentos', icon: Scale },
    { path: '/documents', label: 'Uploads', icon: FolderOpen },
    { path: '/todos', label: 'Tarefas', icon: CheckSquare },
    { path: '/leads', label: 'Leads', icon: UserPlus },
  ];

  // Campanhas vem após Leads (apenas para Admin)
  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
    menuItems.push({ path: '/campaigns', label: 'Campanhas', icon: Mail });
  }

  // Financeiro e Contas a Pagar
  menuItems.push({ path: '/financial', label: 'Financeiro', icon: DollarSign });
  menuItems.push({ path: '/accounts-payable', label: 'Contas a Pagar', icon: CreditCard });

  // Itens restantes na ordem original
  menuItems.push({ path: '/hearings', label: 'Audiências', icon: Gavel });
  menuItems.push({ path: '/client-subscriptions', label: 'Planos', icon: CreditCard });
  menuItems.push({ path: '/stripe-config', label: 'Config. Stripe', icon: CreditCard });

  // Itens administrativos
  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
    menuItems.push({ path: '/smtp-settings', label: 'Config. SMTP', icon: Settings });
    menuItems.push({ path: '/backup-settings', label: 'Email Backup', icon: Database });
    menuItems.push({ path: '/ai-config', label: 'Config. IA', icon: Bot });
    menuItems.push({ path: '/users', label: 'Usuários', icon: UserCog });
    menuItems.push({ path: '/lgpd-requests', label: 'LGPD Requests', icon: Shield });
    menuItems.push({ path: '/audit-logs', label: 'Logs de Auditoria', icon: History });
    menuItems.push({ path: '/subscription', label: 'Assinatura', icon: Crown });
  }

  if (user?.role === 'SUPER_ADMIN') {
    menuItems.push({ path: '/companies', label: 'Empresas', icon: Building2 });
    menuItems.push({ path: '/subscription-alerts', label: 'Alertas Assinatura', icon: AlertTriangle });
  }

  menuItems.push({ path: '/meus-dados', label: 'Meus Dados', icon: Shield });
  // Logs de Auditoria para todos os usuários (USER vê apenas seus próprios logs)
  if (user?.role === 'USER') {
    menuItems.push({ path: '/audit-logs', label: 'Meus Logs', icon: History });
  }
  menuItems.push({ path: '/settings', label: 'Configurações', icon: Settings });

  // Determinar se deve mostrar o banner de assinatura
  const shouldShowSubscriptionBanner =
    showSubscriptionBanner &&
    subscriptionStatus &&
    user?.role !== 'SUPER_ADMIN' &&
    (!subscriptionStatus.isValid ||
     (subscriptionStatus.status === 'TRIAL' && subscriptionStatus.daysRemaining !== undefined && subscriptionStatus.daysRemaining <= 1));

  const getSubscriptionBannerContent = () => {
    if (!subscriptionStatus) return null;

    if (!subscriptionStatus.isValid) {
      if (subscriptionStatus.status === 'EXPIRED' || subscriptionStatus.status === 'TRIAL') {
        return {
          type: 'error' as const,
          message: 'Seu periodo de teste expirou! Assine agora para continuar usando o sistema.',
          buttonText: 'Assinar Agora',
        };
      }
      if (subscriptionStatus.status === 'CANCELLED') {
        return {
          type: 'warning' as const,
          message: 'Sua assinatura foi cancelada. Reative para continuar usando o sistema.',
          buttonText: 'Reativar',
        };
      }
    }

    if (subscriptionStatus.status === 'TRIAL' && subscriptionStatus.daysRemaining !== undefined) {
      if (subscriptionStatus.daysRemaining <= 0) {
        return {
          type: 'error' as const,
          message: 'Seu periodo de teste expira hoje! Assine agora para nao perder acesso.',
          buttonText: 'Assinar Agora',
        };
      }
      if (subscriptionStatus.daysRemaining === 1) {
        return {
          type: 'warning' as const,
          message: `Seu periodo de teste expira em ${subscriptionStatus.daysRemaining} dia. Assine agora!`,
          buttonText: 'Ver Planos',
        };
      }
    }

    return null;
  };

  const bannerContent = getSubscriptionBannerContent();

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Banner de Assinatura */}
      {shouldShowSubscriptionBanner && bannerContent && (
        <div className={`${
          bannerContent.type === 'error'
            ? 'bg-red-600'
            : 'bg-yellow-500'
        } text-white px-4 py-3 relative z-50`}>
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} />
              <span className="text-sm font-medium">{bannerContent.message}</span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/subscription"
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  bannerContent.type === 'error'
                    ? 'bg-white text-red-600 hover:bg-red-50'
                    : 'bg-white text-yellow-600 hover:bg-yellow-50'
                }`}
              >
                {bannerContent.buttonText}
              </Link>
              <button
                onClick={() => setShowSubscriptionBanner(false)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay para mobile */}
      {!shouldHideSidebar && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-30 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-4">
              {!shouldHideSidebar && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg hover:bg-neutral-100 transition-colors lg:hidden"
                  aria-label="Menu"
                >
                  {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              )}
              <div className="flex items-center gap-2">
                <Scale className="text-primary-600" size={28} />
                <h1 className="text-lg sm:text-2xl font-bold text-primary-600">{user?.companyName || 'AdvWell'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Link
                to="/profile"
                className="text-right hidden sm:block hover:bg-neutral-100 rounded-lg p-2 transition-colors"
                title="Meu Perfil"
              >
                <p className="text-sm font-medium text-neutral-900 truncate max-w-[150px]">{user?.name}</p>
                <p className="text-xs text-neutral-500 truncate max-w-[150px]">{user?.companyName}</p>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-700 hover:text-neutral-900 transition-colors"
                title="Sair"
                aria-label="Sair"
              >
                <LogOut size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Sidebar - escondida quando shouldHideSidebar é true */}
        {!shouldHideSidebar && (
          <aside
            className={`${
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0 ${
              sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
            } w-64 bg-white shadow-lg h-screen fixed lg:sticky top-0 lg:top-0 z-30 lg:z-10 transition-all duration-300 ease-in-out border-r border-neutral-200 flex flex-col`}
          >
            {/* Botão de recolher (apenas desktop) */}
            <div className="hidden lg:flex justify-end p-2">
              <button
                onClick={toggleSidebarCollapse}
                className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-600 transition-colors"
                title={sidebarCollapsed ? 'Expandir' : 'Recolher'}
              >
                {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
            </div>

            <nav className={`${sidebarCollapsed ? 'mt-2' : 'mt-8'} flex-1 overflow-y-auto pb-4`}>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                // Badge para Contas a Pagar
                const showAccountsBadge = item.path === '/accounts-payable' && accountsDueToday && accountsDueToday.count > 0;
                // Badge para Prazos
                const showDeadlinesBadge = item.path === '/deadlines' && deadlinesDueToday && deadlinesDueToday.count > 0;
                // Badge para Tarefas
                const showTasksBadge = item.path === '/todos' && tasksDueToday && tasksDueToday.count > 0;
                // Badge genérico
                const showBadge = showAccountsBadge || showDeadlinesBadge || showTasksBadge;
                const badgeCount = showAccountsBadge
                  ? accountsDueToday?.count
                  : (showDeadlinesBadge
                    ? deadlinesDueToday?.count
                    : (showTasksBadge ? tasksDueToday?.count : 0));
                const badgeTitle = showAccountsBadge
                  ? `${item.label} (${accountsDueToday?.count} vencendo hoje)`
                  : (showDeadlinesBadge
                    ? `${item.label} (${deadlinesDueToday?.count} vencendo hoje)`
                    : (showTasksBadge ? `${item.label} (${tasksDueToday?.count} vencendo hoje)` : item.label));

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center ${
                      sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6'
                    } py-3 transition-all duration-200 font-medium ${
                      isActive
                        ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-500'
                        : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                    title={sidebarCollapsed ? badgeTitle : ''}
                  >
                    <div className="relative">
                      <Icon size={20} />
                      {showBadge && sidebarCollapsed && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {badgeCount && badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex items-center justify-between flex-1">
                        <span className="text-sm">{item.label}</span>
                        {showBadge && (
                          <span
                            className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-2"
                            title={showAccountsBadge
                              ? `R$ ${accountsDueToday?.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vencendo hoje`
                              : (showDeadlinesBadge
                                ? `${deadlinesDueToday?.count} prazo(s) vencendo hoje`
                                : `${tasksDueToday?.count} tarefa(s) vencendo hoje`)}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-8 w-full min-w-0">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
