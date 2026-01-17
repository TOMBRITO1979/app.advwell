import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Circle, Clock, CheckCircle } from 'lucide-react';

type KanbanStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

interface KanbanStatusDropdownProps {
  value: KanbanStatus;
  onChange: (status: KanbanStatus) => void;
  disabled?: boolean;
}

const statusConfig = {
  TODO: {
    label: 'A Fazer',
    shortLabel: 'A Fazer',
    icon: Circle,
    textColor: 'text-blue-600 dark:text-blue-400',
    hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-900/30',
  },
  IN_PROGRESS: {
    label: 'Em Andamento',
    shortLabel: 'Andamento',
    icon: Clock,
    textColor: 'text-yellow-600 dark:text-yellow-400',
    hoverBg: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/30',
  },
  DONE: {
    label: 'Concluído',
    shortLabel: 'Concluído',
    icon: CheckCircle,
    textColor: 'text-green-600 dark:text-green-400',
    hoverBg: 'hover:bg-green-50 dark:hover:bg-green-900/30',
  },
};

const KanbanStatusDropdown: React.FC<KanbanStatusDropdownProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentStatus = statusConfig[value] || statusConfig.TODO;
  const StatusIcon = currentStatus.icon;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideButton = dropdownRef.current && !dropdownRef.current.contains(target);
      const isOutsideMenu = menuRef.current && !menuRef.current.contains(target);

      if (isOutsideButton && isOutsideMenu) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Calculate position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const menuHeight = 150;
      const spaceAbove = buttonRect.top;
      const spaceBelow = window.innerHeight - buttonRect.bottom;

      const shouldOpenDown = spaceAbove < menuHeight && spaceBelow > spaceAbove;

      const newPosition: { top?: number; bottom?: number; left?: number; right?: number } = {};

      if (shouldOpenDown) {
        newPosition.top = buttonRect.bottom + 4;
      } else {
        newPosition.bottom = window.innerHeight - buttonRect.top + 4;
      }

      newPosition.left = buttonRect.left;

      setPosition(newPosition);
    }
  }, [isOpen]);

  const handleSelect = (status: KanbanStatus) => {
    onChange(status);
    setIsOpen(false);
  };

  const dropdownMenu = isOpen && createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...position,
      }}
      className="min-w-[140px] bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-700 rounded-lg shadow-lg dark:shadow-slate-900/50 py-1"
    >
      {(Object.keys(statusConfig) as KanbanStatus[]).map((status) => {
        const config = statusConfig[status];
        const Icon = config.icon;
        const isSelected = status === value;

        return (
          <button
            key={status}
            type="button"
            onClick={() => handleSelect(status)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${config.textColor} ${config.hoverBg} ${isSelected ? 'bg-neutral-100 dark:bg-slate-700' : ''}`}
          >
            <Icon size={16} />
            <span className="flex-1">{config.label}</span>
            {isSelected && <CheckCircle size={14} className="text-green-500" />}
          </button>
        );
      })}
    </div>,
    document.body
  );

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md border border-neutral-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-neutral-700 dark:text-slate-300 hover:bg-neutral-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        <StatusIcon size={14} className={currentStatus.textColor} />
        <span className="hidden sm:inline">{currentStatus.shortLabel}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {dropdownMenu}
    </div>
  );
};

export default KanbanStatusDropdown;
