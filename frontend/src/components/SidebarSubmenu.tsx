import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface SubmenuItem {
  path: string;
  label: string;
  icon: LucideIcon | React.ForwardRefExoticComponent<any>;
  badge?: number;
  badgeTitle?: string;
}

interface SidebarSubmenuProps {
  label: string;
  icon: LucideIcon;
  items: SubmenuItem[];
  isCollapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}

const SidebarSubmenu: React.FC<SidebarSubmenuProps> = ({
  label,
  icon: Icon,
  items,
  isCollapsed,
  isOpen,
  onToggle,
  onNavigate,
}) => {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = items.some(item => location.pathname.startsWith(item.path));

  // Detectar se e mobile (md breakpoint = 768px)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    setIsMobile(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const headerHeight = 41; // Header: py-2 (16px) + text (20px) + border (1px) + spacing (4px)
      const itemHeight = 40; // Cada item: py-2.5 (20px) + conteúdo (20px)

      // Posiciona o primeiro item na mesma altura do ícone
      let top = rect.top - 70;

      // Garante que não saia da tela
      const menuHeight = items.length * itemHeight + headerHeight;
      const maxTop = window.innerHeight - menuHeight - 10;
      if (top > maxTop) top = maxTop;
      if (top < 10) top = 10;

      setPosition({
        top,
        left: rect.right + 4,
      });
    }
  };

  const handleMouseEnter = () => {
    if (isCollapsed) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      updatePosition();
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsed) {
      // Small delay to allow moving to the dropdown
      timeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 150);
    }
  };

  // When collapsed (desktop only), show hover dropdown
  // On mobile, always show expanded mode (toggle dropdown)
  if (isCollapsed && !isMobile) {
    return (
      <div
        ref={containerRef}
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Parent button */}
        <button
          className={`w-full flex items-center justify-center px-3 py-3 transition-all duration-200 font-medium ${
            isActive
              ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
              : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400'
          }`}
        >
          <Icon size={20} />
        </button>

        {/* Hover dropdown - fixed position */}
        {isHovered && (
          <div
            className="fixed bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-neutral-200 dark:border-slate-700 py-2 min-w-48 z-[100]"
            style={{
              top: position.top,
              left: position.left,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Header */}
            <div className="px-3 py-2 border-b border-neutral-100 dark:border-slate-700">
              <span className="text-sm font-semibold text-neutral-900 dark:text-slate-100">{label}</span>
            </div>

            {/* Items */}
            {items.map((item) => {
              const ItemIcon = item.icon;
              const isItemActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 transition-all duration-200 ${
                    isItemActive
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400'
                  }`}
                  onClick={() => {
                    setIsHovered(false);
                    onNavigate();
                  }}
                >
                  <ItemIcon size={18} />
                  <span className="text-sm">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5"
                      title={item.badgeTitle}
                    >
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // When expanded, show normal toggle dropdown
  return (
    <>
      <button
        onClick={onToggle}
        className={`w-full flex items-center space-x-3 px-4 py-3 transition-all duration-200 font-medium ${
          isActive
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
            : 'text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400'
        }`}
      >
        <Icon size={20} />
        <span className="text-sm flex-1 text-left">{label}</span>
      </button>

      {isOpen && (
        <div className="bg-neutral-50 dark:bg-slate-700/50">
          {items.map((item) => {
            const ItemIcon = item.icon;
            const isItemActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 pl-8 py-2.5 transition-all duration-200 font-medium ${
                  isItemActive
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border-r-4 border-primary-500'
                    : 'text-neutral-600 dark:text-slate-400 hover:bg-neutral-100 dark:hover:bg-slate-700 hover:text-primary-600 dark:hover:text-primary-400'
                }`}
                onClick={onNavigate}
              >
                <ItemIcon size={18} />
                <div className="flex items-center justify-between flex-1">
                  <span className="text-sm">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 ml-2"
                      title={item.badgeTitle}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
};

export default SidebarSubmenu;
