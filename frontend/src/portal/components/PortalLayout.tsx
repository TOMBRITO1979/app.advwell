import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  User,
  Building2,
  Megaphone,
  FileText,
  MessageCircle,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface PortalLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { path: '/portal', icon: LayoutDashboard, label: 'Painel' },
  { path: '/portal/cases', icon: Briefcase, label: 'Meus Processos' },
  { path: '/portal/documents', icon: FileText, label: 'Documentos' },
  { path: '/portal/messages', icon: MessageCircle, label: 'Mensagens' },
  { path: '/portal/profile', icon: User, label: 'Meus Dados' },
  { path: '/portal/company', icon: Building2, label: 'Escritório' },
  { path: '/portal/announcements', icon: Megaphone, label: 'Avisos' },
];

export default function PortalLayout({ children }: PortalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Mobile header */}
      <div className="lg:hidden bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-200"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <h1 className="text-lg font-semibold text-green-700 dark:text-green-400">Portal do Cliente</h1>
        <div className="w-10" />
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-100 dark:border-slate-700">
            <h1 className="text-xl font-bold text-green-700 dark:text-green-400">Portal do Cliente</h1>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">AdvWell</p>
          </div>

          {/* User info */}
          <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
            <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium'
                      : 'text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-100 dark:border-slate-700">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
