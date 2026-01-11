import React, { forwardRef } from 'react';
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
  Megaphone,
  Bot,
  Scale,
  Clock,
  Gavel,
  Crown,
  AlertTriangle,
  Shield,
  History,
  Database,
  Key,
  MessageCircle,
  Tag,
  BarChart3,
  Radar,
  Book,
  LucideProps,
} from 'lucide-react';

// WhatsApp icon component (outline style to match other icons)
const WhatsAppIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ size = 24, strokeWidth = 2, className, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
    </svg>
  )
);
WhatsAppIcon.displayName = 'WhatsAppIcon';

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

interface UnreadMessagesCount {
  count: number;
  messages: number;
  documents: number;
}

interface ChatwellStatus {
  enabled: boolean;
  hasAccess: boolean;
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
  const [credentialsOpen, setCredentialsOpen] = React.useState(false);
  const [agendaOpen, setAgendaOpen] = React.useState(false);
  const [pessoasOpen, setPessoasOpen] = React.useState(false);
  const [processosOpen, setProcessosOpen] = React.useState(false);
  const [marketingOpen, setMarketingOpen] = React.useState(false);
  const [financeiroOpen, setFinanceiroOpen] = React.useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<SubscriptionStatus | null>(null);
  const [showSubscriptionBanner, setShowSubscriptionBanner] = React.useState(true);
  const [accountsDueToday, setAccountsDueToday] = React.useState<AccountsDueToday | null>(null);
  const [deadlinesDueToday, setDeadlinesDueToday] = React.useState<DeadlinesDueToday | null>(null);
  const [tasksDueToday, setTasksDueToday] = React.useState<TasksDueToday | null>(null);
  const [unreadMessagesCount, setUnreadMessagesCount] = React.useState<UnreadMessagesCount | null>(null);
  const [chatwellStatus, setChatwellStatus] = React.useState<ChatwellStatus | null>(null);

  // Verificar se a sidebar deve ser escondida para este usuário
  const shouldHideSidebar = user?.hideSidebar === true;

  // Carregar estado do sidebar do localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

  // Listener para evento de recolher sidebar (usado pela página Chatwell)
  React.useEffect(() => {
    const handleSidebarCollapse = (event: CustomEvent) => {
      if (event.detail?.collapsed !== undefined) {
        setSidebarCollapsed(event.detail.collapsed);
      }
    };

    window.addEventListener('sidebarCollapse', handleSidebarCollapse as EventListener);
    return () => {
      window.removeEventListener('sidebarCollapse', handleSidebarCollapse as EventListener);
    };
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

  // Verificar mensagens não lidas de clientes e documentos (apenas para ADMIN e SUPER_ADMIN)
  React.useEffect(() => {
    const checkUnreadMessages = async () => {
      try {
        const response = await api.get('/client-messages/office/unread-count');
        setUnreadMessagesCount({
          count: response.data.count || 0,
          messages: response.data.messages || 0,
          documents: response.data.documents || 0,
        });
      } catch (error) {
        console.error('Error checking unread messages:', error);
      }
    };

    // Listener para atualização manual do contador (quando marcar mensagem como lida ou baixar documento)
    const handleRefreshUnread = () => {
      checkUnreadMessages();
    };

    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      checkUnreadMessages();
      // Atualizar a cada 1 minuto para alertas mais rápidos
      const interval = setInterval(checkUnreadMessages, 1 * 60 * 1000);

      // Escutar evento de atualização manual
      window.addEventListener('refreshUnreadCount', handleRefreshUnread);

      return () => {
        clearInterval(interval);
        window.removeEventListener('refreshUnreadCount', handleRefreshUnread);
      };
    }
  }, [user]);

  // Verificar status do Chatwell
  React.useEffect(() => {
    const checkChatwellStatus = async () => {
      try {
        const response = await api.get('/companies/own/chatwell');
        setChatwellStatus({
          enabled: response.data.enabled || false,
          hasAccess: true,
        });
      } catch (error: any) {
        // 403 = sem permissão, outros erros = não configurado
        setChatwellStatus({
          enabled: false,
          hasAccess: error.response?.status !== 403,
        });
      }
    };

    // SUPER_ADMIN sempre tem acesso
    if (user?.role === 'SUPER_ADMIN') {
      setChatwellStatus({ enabled: true, hasAccess: true });
    } else if (user) {
      checkChatwellStatus();
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

  // Helper function to check if user has permission for a resource
  const hasPermission = (resource: string): boolean => {
    // ADMIN and SUPER_ADMIN always have access
    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      return true;
    }
    // USER role needs explicit permission
    if (user?.role === 'USER' && user?.permissions) {
      const permission = user.permissions.find(p => p.resource === resource);
      return permission?.canView === true;
    }
    return false;
  };

  // Submenu Agenda (dropdown)
  const agendaItems = [
    { path: '/schedule', label: 'Agendamentos', icon: Calendar },
    { path: '/todos', label: 'Tarefas', icon: CheckSquare },
    { path: '/hearings', label: 'Audiências', icon: Gavel },
    { path: '/google-calendar', label: 'Google Calendar', icon: Calendar },
  ];

  // Submenu Pessoas (dropdown) - Usuários só para ADMIN/SUPER_ADMIN
  const pessoasItems = [
    { path: '/clients', label: 'Clientes', icon: Users },
    { path: '/adverses', label: 'Adversos', icon: UserPlus },
    { path: '/lawyers', label: 'Advogados', icon: Scale },
    ...((user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')
      ? [{ path: '/users', label: 'Usuários', icon: UserCog }]
      : []),
  ];

  // Submenu Processos (dropdown)
  const processosItems = [
    { path: '/cases', label: 'Judiciais', icon: FileText },
    { path: '/pnj', label: 'PNJ', icon: FileText },
    { path: '/deadlines', label: 'Prazos', icon: Clock },
    { path: '/monitoring', label: 'Monitoramento', icon: Radar },
    { path: '/updates', label: 'Atualizações', icon: Bell },
  ];

  // Submenu Marketing (dropdown) - itens condicionais por permissão/role
  const marketingItems = [
    ...(hasPermission('tags') ? [{ path: '/tags', label: 'Tags', icon: Tag }] : []),
    { path: '/leads', label: 'Leads', icon: UserPlus },
    ...(hasPermission('lead-analytics') ? [{ path: '/lead-analytics', label: 'Analytics Leads', icon: BarChart3 }] : []),
    ...((user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? [
      { path: '/campaigns', label: 'Campanhas', icon: Mail },
      { path: '/whatsapp-campaigns', label: 'Campanhas WhatsApp', icon: WhatsAppIcon },
    ] : []),
  ];

  // Submenu Financeiro (dropdown) - Assinatura só para ADMIN/SUPER_ADMIN
  const financeiroItems = [
    { path: '/financial', label: 'Fluxo de Caixa', icon: DollarSign },
    { path: '/accounts-payable', label: 'Contas a Pagar', icon: CreditCard },
    { path: '/client-subscriptions', label: 'Planos', icon: CreditCard },
    ...((user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN')
      ? [{ path: '/subscription', label: 'Assinatura', icon: Crown }]
      : []),
  ];

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    // Agenda, Pessoas, Processos, Marketing e Financeiro serão renderizados como dropdowns separadamente
    { path: '/legal-documents', label: 'Documentos', icon: Scale },
    { path: '/documents', label: 'Uploads', icon: FolderOpen },
  ];

  // Portal do Cliente (apenas para Admin) - não vai para Marketing
  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
    menuItems.push({ path: '/announcements', label: 'Portal do Cliente', icon: Megaphone });
  }

  // Chatwell - mostrar apenas se habilitado e com acesso
  if (chatwellStatus?.enabled && chatwellStatus?.hasAccess) {
    menuItems.push({ path: '/chatwell', label: 'Chatwell', icon: MessageCircle });
  }

  // Itens administrativos (Google Calendar e Usuários movidos para dropdowns)

  // Submenu de Credenciais (apenas para ADMIN e SUPER_ADMIN)
  const credentialsItems = (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') ? [
    { path: '/stripe-config', label: 'Config. Stripe', icon: CreditCard },
    { path: '/smtp-settings', label: 'Config. SMTP', icon: Mail },
    { path: '/whatsapp-settings', label: 'Config. WhatsApp', icon: MessageCircle },
    { path: '/backup-settings', label: 'Email Backup', icon: Database },
    { path: '/ai-config', label: 'Config. IA', icon: Bot },
    { path: '/google-calendar-config', label: 'Config. Google Cal.', icon: Calendar },
  ] : [];

  // Itens após Credenciais
  const afterCredentialsItems: typeof menuItems = [];

  // Configurações vem logo após Credenciais
  afterCredentialsItems.push({ path: '/settings', label: 'Configurações', icon: Settings });
  // Meus Dados vem após Configurações
  afterCredentialsItems.push({ path: '/meus-dados', label: 'Meus Dados', icon: Shield });

  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
    afterCredentialsItems.push({ path: '/lgpd-requests', label: 'LGPD Requests', icon: Shield });
    afterCredentialsItems.push({ path: '/audit-logs', label: 'Logs de Auditoria', icon: History });
  }

  if (user?.role === 'SUPER_ADMIN') {
    afterCredentialsItems.push({ path: '/companies', label: 'Empresas', icon: Building2 });
    afterCredentialsItems.push({ path: '/subscription-alerts', label: 'Alertas Assinatura', icon: AlertTriangle });
  }

  // Logs de Auditoria para todos os usuários (USER vê apenas seus próprios logs)
  if (user?.role === 'USER') {
    afterCredentialsItems.push({ path: '/audit-logs', label: 'Meus Logs', icon: History });
  }

  // Manual do Usuário (disponível para todos)
  afterCredentialsItems.push({ path: '/manual', label: 'Manual', icon: Book });

  // Gerenciar Manual (apenas SUPER_ADMIN)
  if (user?.role === 'SUPER_ADMIN') {
    afterCredentialsItems.push({ path: '/manual-admin', label: 'Gerenciar Manual', icon: Book });
  }

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
              {/* Dashboard (primeiro item fixo) */}
              <Link
                to="/dashboard"
                className={`flex items-center ${
                  sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6'
                } py-3 transition-all duration-200 font-medium ${
                  location.pathname === '/dashboard'
                    ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-500'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                }`}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? 'Dashboard' : ''}
              >
                <Home size={20} />
                {!sidebarCollapsed && <span className="text-sm">Dashboard</span>}
              </Link>

              {/* Dropdown Agenda */}
              <button
                onClick={() => setAgendaOpen(!agendaOpen)}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6'
                } py-3 transition-all duration-200 font-medium ${
                  agendaItems.some(item => location.pathname.startsWith(item.path))
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                }`}
                title={sidebarCollapsed ? 'Agenda' : ''}
              >
                <Calendar size={20} />
                {!sidebarCollapsed && <span className="text-sm">Agenda</span>}
              </button>
              {(agendaOpen || sidebarCollapsed) && (
                <div className={sidebarCollapsed ? '' : 'bg-neutral-50'}>
                  {agendaItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const showTasksBadge = item.path === '/todos' && tasksDueToday && tasksDueToday.count > 0;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center ${
                          sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6 pl-10'
                        } py-2.5 transition-all duration-200 font-medium ${
                          isActive
                            ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-500'
                            : 'text-neutral-600 hover:bg-neutral-100 hover:text-primary-600'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                        title={sidebarCollapsed ? item.label : ''}
                      >
                        <div className="relative">
                          <Icon size={18} />
                          {showTasksBadge && sidebarCollapsed && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                              {tasksDueToday && tasksDueToday.count > 9 ? '9+' : tasksDueToday?.count}
                            </span>
                          )}
                        </div>
                        {!sidebarCollapsed && (
                          <div className="flex items-center justify-between flex-1">
                            <span className="text-sm">{item.label}</span>
                            {showTasksBadge && (
                              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-2">
                                {tasksDueToday?.count}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Dropdown Pessoas */}
              <button
                onClick={() => setPessoasOpen(!pessoasOpen)}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6'
                } py-3 transition-all duration-200 font-medium ${
                  pessoasItems.some(item => location.pathname.startsWith(item.path))
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                }`}
                title={sidebarCollapsed ? 'Pessoas' : ''}
              >
                <Users size={20} />
                {!sidebarCollapsed && <span className="text-sm">Pessoas</span>}
              </button>
              {(pessoasOpen || sidebarCollapsed) && (
                <div className={sidebarCollapsed ? '' : 'bg-neutral-50'}>
                  {pessoasItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center ${
                          sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6 pl-10'
                        } py-2.5 transition-all duration-200 font-medium ${
                          isActive
                            ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-500'
                            : 'text-neutral-600 hover:bg-neutral-100 hover:text-primary-600'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                        title={sidebarCollapsed ? item.label : ''}
                      >
                        <Icon size={18} />
                        {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Dropdown Processos */}
              <button
                onClick={() => setProcessosOpen(!processosOpen)}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6'
                } py-3 transition-all duration-200 font-medium ${
                  processosItems.some(item => location.pathname.startsWith(item.path))
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                }`}
                title={sidebarCollapsed ? 'Processos' : ''}
              >
                <FileText size={20} />
                {!sidebarCollapsed && <span className="text-sm">Processos</span>}
              </button>
              {(processosOpen || sidebarCollapsed) && (
                <div className={sidebarCollapsed ? '' : 'bg-neutral-50'}>
                  {processosItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const showDeadlinesBadge = item.path === '/deadlines' && deadlinesDueToday && deadlinesDueToday.count > 0;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center ${
                          sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6 pl-10'
                        } py-2.5 transition-all duration-200 font-medium ${
                          isActive
                            ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-500'
                            : 'text-neutral-600 hover:bg-neutral-100 hover:text-primary-600'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                        title={sidebarCollapsed ? item.label : ''}
                      >
                        <div className="relative">
                          <Icon size={18} />
                          {showDeadlinesBadge && sidebarCollapsed && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                              {deadlinesDueToday && deadlinesDueToday.count > 9 ? '9+' : deadlinesDueToday?.count}
                            </span>
                          )}
                        </div>
                        {!sidebarCollapsed && (
                          <div className="flex items-center justify-between flex-1">
                            <span className="text-sm">{item.label}</span>
                            {showDeadlinesBadge && (
                              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-2">
                                {deadlinesDueToday?.count}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Dropdown Marketing */}
              {marketingItems.length > 0 && (
                <>
                  <button
                    onClick={() => setMarketingOpen(!marketingOpen)}
                    className={`w-full flex items-center ${
                      sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6'
                    } py-3 transition-all duration-200 font-medium ${
                      marketingItems.some(item => location.pathname.startsWith(item.path))
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                    }`}
                    title={sidebarCollapsed ? 'Marketing' : ''}
                  >
                    <Megaphone size={20} />
                    {!sidebarCollapsed && <span className="text-sm">Marketing</span>}
                  </button>
                  {(marketingOpen || sidebarCollapsed) && (
                    <div className={sidebarCollapsed ? '' : 'bg-neutral-50'}>
                      {marketingItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center ${
                              sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6 pl-10'
                            } py-2.5 transition-all duration-200 font-medium ${
                              isActive
                                ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-500'
                                : 'text-neutral-600 hover:bg-neutral-100 hover:text-primary-600'
                            }`}
                            onClick={() => setSidebarOpen(false)}
                            title={sidebarCollapsed ? item.label : ''}
                          >
                            <Icon size={18} />
                            {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Dropdown Financeiro */}
              <button
                onClick={() => setFinanceiroOpen(!financeiroOpen)}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6'
                } py-3 transition-all duration-200 font-medium ${
                  financeiroItems.some(item => location.pathname.startsWith(item.path))
                    ? 'bg-primary-50 text-primary-600'
                    : 'text-neutral-700 hover:bg-neutral-50 hover:text-primary-600'
                }`}
                title={sidebarCollapsed ? 'Financeiro' : ''}
              >
                <DollarSign size={20} />
                {!sidebarCollapsed && <span className="text-sm">Financeiro</span>}
              </button>
              {(financeiroOpen || sidebarCollapsed) && (
                <div className={sidebarCollapsed ? '' : 'bg-neutral-50'}>
                  {financeiroItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const showAccountsBadge = item.path === '/accounts-payable' && accountsDueToday && accountsDueToday.count > 0;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center ${
                          sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6 pl-10'
                        } py-2.5 transition-all duration-200 font-medium ${
                          isActive
                            ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-500'
                            : 'text-neutral-600 hover:bg-neutral-100 hover:text-primary-600'
                        }`}
                        onClick={() => setSidebarOpen(false)}
                        title={sidebarCollapsed ? item.label : ''}
                      >
                        <div className="relative">
                          <Icon size={18} />
                          {showAccountsBadge && sidebarCollapsed && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                              {accountsDueToday && accountsDueToday.count > 9 ? '9+' : accountsDueToday?.count}
                            </span>
                          )}
                        </div>
                        {!sidebarCollapsed && (
                          <div className="flex items-center justify-between flex-1">
                            <span className="text-sm">{item.label}</span>
                            {showAccountsBadge && (
                              <span
                                className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-2"
                                title={`R$ ${accountsDueToday?.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vencendo hoje`}
                              >
                                {accountsDueToday?.count}
                              </span>
                            )}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Demais itens do menu (exceto Dashboard que já foi renderizado) */}
              {menuItems.filter(item => item.path !== '/dashboard').map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                // Badge para Portal do Cliente (mensagens não lidas + documentos de clientes)
                const showMessagesBadge = item.path === '/announcements' && unreadMessagesCount && unreadMessagesCount.count > 0;
                const badgeCount = showMessagesBadge ? unreadMessagesCount?.count : 0;
                const getBadgeTitle = () => {
                  if (!showMessagesBadge) return item.label;
                  const parts = [];
                  if (unreadMessagesCount?.messages && unreadMessagesCount.messages > 0) {
                    parts.push(`${unreadMessagesCount.messages} mensagem(ns)`);
                  }
                  if (unreadMessagesCount?.documents && unreadMessagesCount.documents > 0) {
                    parts.push(`${unreadMessagesCount.documents} documento(s)`);
                  }
                  return parts.length > 0 ? `${item.label} - ${parts.join(' e ')} de clientes` : item.label;
                };
                const badgeTitle = getBadgeTitle();

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
                      {showMessagesBadge && sidebarCollapsed && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                          {badgeCount && badgeCount > 9 ? '9+' : badgeCount}
                        </span>
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <div className="flex items-center justify-between flex-1">
                        <span className="text-sm">{item.label}</span>
                        {showMessagesBadge && (
                          <span
                            className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-2"
                            title={badgeTitle}
                          >
                            {badgeCount}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );
              })}

              {/* Submenu Credenciais */}
              {credentialsItems.length > 0 && (
                <>
                  <button
                    onClick={() => setCredentialsOpen(!credentialsOpen)}
                    className={`w-full flex items-center ${
                      sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6'
                    } py-3 transition-all duration-200 font-medium text-neutral-700 hover:bg-neutral-50 hover:text-primary-600`}
                    title={sidebarCollapsed ? 'Credenciais' : ''}
                  >
                    <Key size={20} />
                    {!sidebarCollapsed && <span className="text-sm">Credenciais</span>}
                  </button>
                  {(credentialsOpen || sidebarCollapsed) && (
                    <div className={sidebarCollapsed ? '' : 'bg-neutral-50'}>
                      {credentialsItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center ${
                              sidebarCollapsed ? 'justify-center px-4' : 'space-x-3 px-6 pl-10'
                            } py-2.5 transition-all duration-200 font-medium ${
                              isActive
                                ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-500'
                                : 'text-neutral-600 hover:bg-neutral-100 hover:text-primary-600'
                            }`}
                            onClick={() => setSidebarOpen(false)}
                            title={sidebarCollapsed ? item.label : ''}
                          >
                            <Icon size={18} />
                            {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Itens após Credenciais */}
              {afterCredentialsItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

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
                    title={sidebarCollapsed ? item.label : ''}
                  >
                    <Icon size={20} />
                    {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
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
