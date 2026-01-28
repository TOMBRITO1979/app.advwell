import React, { forwardRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import SidebarSubmenu from './SidebarSubmenu';
import SidebarTooltip from './SidebarTooltip';
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
  Sun,
  Moon,
  LayoutGrid,
  LucideProps,
  ClipboardList,
  Menu,
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
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
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

  // Fechar menu mobile e recolher sidebar ao mudar de rota
  React.useEffect(() => {
    setMobileMenuOpen(false);
    // Recolher sidebar no desktop quando navegar para uma nova página
    setSidebarCollapsed(true);
  }, [location.pathname]);

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

  // Expandir/recolher sidebar (não persiste - sempre inicia recolhido)
  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
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

  // Submenu Agenda (dropdown) - filtra por permissão
  const agendaItems = [
    ...(hasPermission('schedule') ? [{ path: '/schedule', label: 'Agendamentos', icon: Calendar }] : []),
    ...(hasPermission('todos') ? [{ path: '/todos', label: 'Tarefas', icon: CheckSquare }] : []),
    ...(hasPermission('kanban') ? [{ path: '/kanban', label: 'Kanban', icon: LayoutGrid }] : []),
    ...(hasPermission('hearings') ? [{ path: '/hearings', label: 'Audiências', icon: Gavel }] : []),
    ...(hasPermission('google-calendar') ? [{ path: '/google-calendar', label: 'Google Calendar', icon: Calendar }] : []),
  ];

  // Submenu Pessoas (dropdown) - filtra por permissão
  const pessoasItems = [
    ...(hasPermission('clients') ? [{ path: '/clients', label: 'Clientes', icon: Users }] : []),
    ...(hasPermission('document-requests') ? [{ path: '/document-requests', label: 'Solicitações', icon: ClipboardList }] : []),
    ...(hasPermission('adverses') ? [{ path: '/adverses', label: 'Adversos', icon: UserPlus }] : []),
    ...(hasPermission('lawyers') ? [{ path: '/lawyers', label: 'Advogados', icon: Scale }] : []),
    // Usuários: acesso restrito a SUPER_ADMIN e ADMIN (não usa hasPermission)
    ...((user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') ? [{ path: '/users', label: 'Usuários', icon: UserCog }] : []),
  ];

  // Submenu Processos (dropdown) - filtra por permissão
  const processosItems = [
    ...(hasPermission('cases') ? [{ path: '/cases', label: 'Judiciais', icon: FileText }] : []),
    ...(hasPermission('pnj') ? [{ path: '/pnj', label: 'PNJ', icon: FileText }] : []),
    ...(hasPermission('deadlines') ? [{ path: '/deadlines', label: 'Prazos', icon: Clock }] : []),
    ...(hasPermission('monitoring') ? [{ path: '/monitoring', label: 'Importar Proc.', icon: Radar }] : []),
    ...(hasPermission('updates') ? [{ path: '/updates', label: 'Atualizações', icon: Bell }] : []),
  ];

  // Submenu Marketing (dropdown) - filtra por permissão
  const marketingItems = [
    ...(hasPermission('tags') ? [{ path: '/tags', label: 'Tags', icon: Tag }] : []),
    ...(hasPermission('leads') ? [{ path: '/leads', label: 'Leads', icon: UserPlus }] : []),
    ...(hasPermission('lead-analytics') ? [{ path: '/lead-analytics', label: 'Analytics Leads', icon: BarChart3 }] : []),
    ...(hasPermission('campaigns') ? [{ path: '/campaigns', label: 'Campanhas', icon: Mail }] : []),
    ...(hasPermission('whatsapp-campaigns') ? [{ path: '/whatsapp-campaigns', label: 'Campanhas WhatsApp', icon: WhatsAppIcon }] : []),
  ];

  // Submenu Financeiro (dropdown) - filtra por permissão
  const financeiroItems = [
    ...(hasPermission('financial') ? [{ path: '/financial', label: 'Fluxo de Caixa', icon: DollarSign }] : []),
    ...(hasPermission('accounts-payable') ? [{ path: '/accounts-payable', label: 'Contas a Pagar', icon: CreditCard }] : []),
    ...(hasPermission('cost-centers') ? [{ path: '/cost-centers', label: 'Centros de Custo', icon: Building2 }] : []),
    ...(hasPermission('client-subscriptions') ? [{ path: '/client-subscriptions', label: 'Planos', icon: CreditCard }] : []),
    ...(hasPermission('subscription') ? [{ path: '/subscription', label: 'Assinatura', icon: Crown }] : []),
  ];

  // Itens principais do menu - filtra por permissão
  const menuItems = [
    ...(hasPermission('dashboard') ? [{ path: '/dashboard', label: 'Dashboard', icon: Home }] : []),
    // Agenda, Pessoas, Processos, Marketing e Financeiro serão renderizados como dropdowns separadamente
    ...(hasPermission('legal-documents') ? [{ path: '/legal-documents', label: 'Documentos', icon: Scale }] : []),
    ...(hasPermission('documents') ? [{ path: '/documents', label: 'Uploads', icon: FolderOpen }] : []),
    ...(hasPermission('reports') ? [{ path: '/reports', label: 'Relatórios', icon: BarChart3 }] : []),
  ];

  // Portal do Cliente (apenas para Admin) - não vai para Marketing
  // Portal do Cliente - filtra por permissão
  if (hasPermission('announcements')) {
    menuItems.push({ path: '/announcements', label: 'Portal do Cliente', icon: Megaphone });
  }

  // Chatwell - mostrar apenas se habilitado e com acesso e permissão
  if (chatwellStatus?.enabled && chatwellStatus?.hasAccess && hasPermission('chatwell')) {
    menuItems.push({ path: '/chatwell', label: 'Chatwell', icon: MessageCircle });
  }

  // Submenu de Credenciais - filtra por permissão
  const credentialsItems = [
    ...(hasPermission('stripe-config') ? [{ path: '/stripe-config', label: 'Config. Stripe', icon: CreditCard }] : []),
    ...(hasPermission('smtp-settings') ? [{ path: '/smtp-settings', label: 'Config. SMTP', icon: Mail }] : []),
    ...(hasPermission('whatsapp-settings') ? [{ path: '/whatsapp-settings', label: 'Config. WhatsApp', icon: MessageCircle }] : []),
    ...(hasPermission('backup-settings') ? [{ path: '/backup-settings', label: 'Email Backup', icon: Database }] : []),
    ...(hasPermission('ai-config') ? [{ path: '/ai-config', label: 'Config. IA', icon: Bot }] : []),
    ...(hasPermission('google-calendar-config') ? [{ path: '/google-calendar-config', label: 'Config. Google Cal.', icon: Calendar }] : []),
  ];

  // Itens após Credenciais
  const afterCredentialsItems: typeof menuItems = [];

  // Configurações - filtra por permissão
  if (hasPermission('settings')) {
    afterCredentialsItems.push({ path: '/settings', label: 'Configurações', icon: Settings });
  }
  // Meus Dados - sempre disponível para todos (dados pessoais)
  afterCredentialsItems.push({ path: '/meus-dados', label: 'Meus Dados', icon: Shield });

  // LGPD Requests - filtra por permissão
  if (hasPermission('lgpd-requests')) {
    afterCredentialsItems.push({ path: '/lgpd-requests', label: 'LGPD Requests', icon: Shield });
  }

  // Logs de Auditoria - filtra por permissão
  if (hasPermission('audit-logs')) {
    afterCredentialsItems.push({ path: '/audit-logs', label: 'Logs de Auditoria', icon: History });
  }

  // Empresas e Alertas - apenas SUPER_ADMIN
  if (user?.role === 'SUPER_ADMIN') {
    afterCredentialsItems.push({ path: '/companies', label: 'Empresas', icon: Building2 });
    afterCredentialsItems.push({ path: '/subscription-alerts', label: 'Alertas Assinatura', icon: AlertTriangle });
  }

  // Manual do Usuário - filtra por permissão
  if (hasPermission('manual')) {
    afterCredentialsItems.push({ path: '/manual', label: 'Manual', icon: Book });
  }

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
    <div className="min-h-screen bg-neutral-50 dark:bg-slate-900 transition-colors duration-300">
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

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm sticky top-0 z-40 border-b border-neutral-200 dark:border-slate-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Botao menu mobile (hamburger) */}
              {!shouldHideSidebar && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 transition-colors md:hidden"
                  title="Menu"
                  aria-label="Abrir menu"
                >
                  <Menu size={22} />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Scale className="text-primary-600 dark:text-primary-400 hidden sm:block" size={28} />
                <h1 className="text-lg sm:text-2xl font-bold text-primary-600 dark:text-primary-400 hidden sm:block">{user?.companyName || 'AdvWell'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 transition-colors"
                title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
                aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
              >
                {theme === 'light' ? (
                  <Moon size={18} className="sm:w-5 sm:h-5" />
                ) : (
                  <Sun size={18} className="sm:w-5 sm:h-5" />
                )}
              </button>
              <Link
                to="/profile"
                className="text-right hidden sm:block hover:bg-neutral-100 dark:hover:bg-slate-700 rounded-lg p-2 transition-colors"
                title="Meu Perfil"
              >
                <p className="text-sm font-medium text-neutral-900 dark:text-slate-100 truncate max-w-[150px]">{user?.name}</p>
                <p className="text-xs text-neutral-500 dark:text-slate-400 truncate max-w-[150px]">{user?.companyName}</p>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-700 dark:text-slate-200 hover:text-neutral-900 dark:hover:text-white transition-colors"
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
        {/* Overlay/backdrop para mobile */}
        {!shouldHideSidebar && mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar - escondida quando shouldHideSidebar é true */}
        {/* No mobile: drawer overlay, escondido por padrão */}
        {/* No desktop (md+): sempre visível, colapsável */}
        {!shouldHideSidebar && (
          <aside
            className={`
              ${sidebarCollapsed ? 'md:w-14 lg:w-16' : 'md:w-[160px] lg:w-[216px]'}
              w-[260px]
              bg-white dark:bg-slate-800 shadow-lg
              flex flex-col flex-shrink-0
              border-r border-neutral-200 dark:border-slate-700
              transition-all duration-300 ease-in-out

              /* Mobile: drawer fixo, oculto por padrão */
              fixed md:sticky
              top-0 md:top-0
              left-0
              h-full md:h-screen
              z-40 md:z-10
              ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}
          >
            {/* Header do drawer mobile com botao fechar */}
            <div className="flex items-center justify-between p-3 border-b border-neutral-100 dark:border-slate-700 md:hidden">
              <span className="font-semibold text-neutral-800 dark:text-slate-200">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 transition-colors"
                title="Fechar menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Botão de recolher/expandir - apenas desktop */}
            <div className="hidden md:flex justify-center lg:justify-end p-2 border-b border-neutral-100 dark:border-slate-700 lg:border-0">
              <button
                onClick={toggleSidebarCollapse}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-slate-700 text-neutral-600 dark:text-slate-300 transition-colors"
                title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
              >
                {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
              </button>
            </div>

            <nav className={`${sidebarCollapsed ? 'md:mt-1' : 'md:mt-2 lg:mt-6'} mt-2 flex-1 overflow-y-auto pb-4 safe-area-bottom`}>
              {/* Dashboard (primeiro item) - verifica permissão */}
              {hasPermission('dashboard') && (
                <SidebarTooltip label="Dashboard" isCollapsed={sidebarCollapsed}>
                  <Link
                    to="/dashboard"
                    className={`flex items-center ${
                      sidebarCollapsed ? 'md:justify-center md:px-4' : 'md:space-x-3 md:px-4'
                    } space-x-3 px-4 py-3 transition-all duration-200 font-medium ${
                      location.pathname === '/dashboard'
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-r-4 border-primary-500'
                        : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400'
                    }`}
                                      >
                    <Home size={20} />
                    <span className={`text-sm ${sidebarCollapsed ? 'md:hidden' : ''}`}>Dashboard</span>
                  </Link>
                </SidebarTooltip>
              )}

              {/* Dropdown Agenda - só mostra se tiver itens */}
              {agendaItems.length > 0 && (
                <SidebarSubmenu
                label="Agenda"
                icon={Calendar}
                items={agendaItems.map(item => ({
                  ...item,
                  badge: item.path === '/todos' && tasksDueToday ? tasksDueToday.count : undefined,
                  badgeTitle: item.path === '/todos' && tasksDueToday ? `${tasksDueToday.count} tarefa(s) para hoje` : undefined,
                }))}
                isCollapsed={sidebarCollapsed}
                isOpen={agendaOpen}
                onToggle={() => setAgendaOpen(!agendaOpen)}
                onNavigate={() => {}}
              />
              )}

              {/* Dropdown Pessoas - só mostra se tiver itens */}
              {pessoasItems.length > 0 && (
                <SidebarSubmenu
                  label="Pessoas"
                  icon={Users}
                  items={pessoasItems}
                  isCollapsed={sidebarCollapsed}
                  isOpen={pessoasOpen}
                  onToggle={() => setPessoasOpen(!pessoasOpen)}
                  onNavigate={() => {}}
                />
              )}

              {/* Dropdown Processos - só mostra se tiver itens */}
              {processosItems.length > 0 && (
                <SidebarSubmenu
                  label="Processos"
                  icon={FileText}
                  items={processosItems.map(item => ({
                    ...item,
                    badge: item.path === '/deadlines' && deadlinesDueToday ? deadlinesDueToday.count : undefined,
                    badgeTitle: item.path === '/deadlines' && deadlinesDueToday ? `${deadlinesDueToday.count} prazo(s) para hoje` : undefined,
                  }))}
                  isCollapsed={sidebarCollapsed}
                  isOpen={processosOpen}
                  onToggle={() => setProcessosOpen(!processosOpen)}
                  onNavigate={() => {}}
                />
              )}

              {/* Dropdown Marketing - só mostra se tiver itens */}
              {marketingItems.length > 0 && (
                <SidebarSubmenu
                  label="Marketing"
                  icon={Megaphone}
                  items={marketingItems}
                  isCollapsed={sidebarCollapsed}
                  isOpen={marketingOpen}
                  onToggle={() => setMarketingOpen(!marketingOpen)}
                  onNavigate={() => {}}
                />
              )}

              {/* Dropdown Financeiro - só mostra se tiver itens */}
              {financeiroItems.length > 0 && (
                <SidebarSubmenu
                  label="Financeiro"
                  icon={DollarSign}
                items={financeiroItems.map(item => ({
                  ...item,
                  badge: item.path === '/accounts-payable' && accountsDueToday ? accountsDueToday.count : undefined,
                  badgeTitle: item.path === '/accounts-payable' && accountsDueToday
                    ? `R$ ${accountsDueToday.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vencendo hoje`
                    : undefined,
                }))}
                isCollapsed={sidebarCollapsed}
                isOpen={financeiroOpen}
                onToggle={() => setFinanceiroOpen(!financeiroOpen)}
                onNavigate={() => {}}
              />
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
                  <SidebarTooltip key={item.path} label={badgeTitle} isCollapsed={sidebarCollapsed}>
                    <Link
                      to={item.path}
                      className={`flex items-center ${
                        sidebarCollapsed ? 'md:justify-center md:px-4' : 'md:space-x-3 md:px-4'
                      } space-x-3 px-4 py-3 transition-all duration-200 font-medium ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-r-4 border-primary-500'
                          : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400'
                      }`}
                                          >
                      <div className="relative flex-shrink-0">
                        <Icon size={20} />
                        {showMessagesBadge && sidebarCollapsed && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 md:flex items-center justify-center hidden">
                            {badgeCount && badgeCount > 9 ? '9+' : badgeCount}
                          </span>
                        )}
                      </div>
                      {/* Label: sempre visivel no mobile, condicional no desktop */}
                      <div className={`flex items-center justify-between flex-1 ${sidebarCollapsed ? 'md:hidden' : ''}`}>
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
                    </Link>
                  </SidebarTooltip>
                );
              })}

              {/* Submenu Credenciais */}
              {credentialsItems.length > 0 && (
                <SidebarSubmenu
                  label="Credenciais"
                  icon={Key}
                  items={credentialsItems}
                  isCollapsed={sidebarCollapsed}
                  isOpen={credentialsOpen}
                  onToggle={() => setCredentialsOpen(!credentialsOpen)}
                  onNavigate={() => {}}
                />
              )}

              {/* Itens após Credenciais */}
              {afterCredentialsItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <SidebarTooltip key={item.path} label={item.label} isCollapsed={sidebarCollapsed}>
                    <Link
                      to={item.path}
                      className={`flex items-center ${
                        sidebarCollapsed ? 'md:justify-center md:px-4' : 'md:space-x-3 md:px-4'
                      } space-x-3 px-4 py-3 transition-all duration-200 font-medium ${
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-r-4 border-primary-500'
                          : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400'
                      }`}
                                          >
                      <Icon size={20} className="flex-shrink-0" />
                      {/* Label: sempre visivel no mobile, condicional no desktop */}
                      <span className={`text-sm ${sidebarCollapsed ? 'md:hidden' : ''}`}>{item.label}</span>
                    </Link>
                  </SidebarTooltip>
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
