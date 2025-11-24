import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Users,
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
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  // Carregar estado do sidebar do localStorage
  React.useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true');
    }
  }, []);

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
    { path: '/todos', label: 'Tarefas', icon: CheckSquare },
    { path: '/clients', label: 'Clientes', icon: Users },
    { path: '/cases', label: 'Processos', icon: FileText },
    { path: '/deadlines', label: 'Prazos', icon: Clock },
    { path: '/documents', label: 'Uploads', icon: FolderOpen },
    { path: '/updates', label: 'Atualizações', icon: Bell },
    { path: '/financial', label: 'Financeiro', icon: DollarSign },
    { path: '/accounts-payable', label: 'Contas a Pagar', icon: CreditCard },
  ];

  if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
    menuItems.push({ path: '/campaigns', label: 'Campanhas', icon: Mail });
    menuItems.push({ path: '/smtp-settings', label: 'Config. SMTP', icon: Settings });
    menuItems.push({ path: '/ai-config', label: 'Config. IA', icon: Bot });
    menuItems.push({ path: '/users', label: 'Usuários', icon: UserCog });
  }

  if (user?.role === 'SUPER_ADMIN') {
    menuItems.push({ path: '/companies', label: 'Empresas', icon: Building2 });
  }

  menuItems.push({ path: '/settings', label: 'Configurações', icon: Settings });

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Overlay para mobile */}
      {sidebarOpen && (
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
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-neutral-100 transition-colors lg:hidden"
                aria-label="Menu"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
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
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 ${
            sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
          } w-64 bg-white shadow-lg min-h-screen fixed lg:sticky top-0 z-30 lg:z-10 transition-all duration-300 ease-in-out border-r border-neutral-200`}
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

          <nav className={sidebarCollapsed ? 'mt-2' : 'mt-8'}>
            {menuItems.map((item) => {
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

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-8 w-full min-w-0">
          <div className="max-w-7xl mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
