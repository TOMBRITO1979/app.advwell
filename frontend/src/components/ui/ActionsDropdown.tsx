import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, ChevronDown } from 'lucide-react';

export interface ActionItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  disabled?: boolean;
  hidden?: boolean;
}

interface ActionsDropdownProps {
  actions: ActionItem[];
  label?: string;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  disabled?: boolean;
}

interface DropdownPosition {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

const variantStyles: Record<string, string> = {
  default: 'text-neutral-700 hover:bg-neutral-100',
  primary: 'text-primary-700 hover:bg-primary-50',
  success: 'text-success-700 hover:bg-success-50',
  warning: 'text-warning-700 hover:bg-warning-50',
  danger: 'text-error-700 hover:bg-error-50',
  info: 'text-info-700 hover:bg-info-50',
};

const ActionsDropdown: React.FC<ActionsDropdownProps> = ({
  actions,
  label = 'Ações',
  size = 'sm',
  align = 'right',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition>({});
  const [openDirection, setOpenDirection] = useState<'up' | 'down'>('up');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter out hidden actions
  const visibleActions = actions.filter(action => !action.hidden);

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
      const menuHeight = 200; // Estimated max height for the dropdown
      const spaceAbove = buttonRect.top;
      const spaceBelow = window.innerHeight - buttonRect.bottom;

      // Decide direction based on available space
      const shouldOpenDown = spaceAbove < menuHeight && spaceBelow > spaceAbove;
      setOpenDirection(shouldOpenDown ? 'down' : 'up');

      const newPosition: DropdownPosition = {};

      if (shouldOpenDown) {
        newPosition.top = buttonRect.bottom + 4;
      } else {
        newPosition.bottom = window.innerHeight - buttonRect.top + 4;
      }

      if (align === 'right') {
        newPosition.right = window.innerWidth - buttonRect.right;
      } else {
        newPosition.left = buttonRect.left;
      }

      setPosition(newPosition);
    }
  }, [isOpen, align]);

  if (visibleActions.length === 0) {
    return null;
  }

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-sm gap-1.5'
    : 'px-4 py-2 text-base gap-2';

  const iconSize = size === 'sm' ? 16 : 18;

  const dropdownMenu = isOpen && createPortal(
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        zIndex: 9999,
        ...position,
      }}
      className="min-w-[180px] bg-white border border-neutral-200 rounded-lg shadow-lg py-1"
    >
      {visibleActions.map((action, index) => (
        <button
          key={index}
          type="button"
          onClick={() => {
            if (!action.disabled) {
              action.onClick();
              setIsOpen(false);
            }
          }}
          disabled={action.disabled}
          className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors ${
            variantStyles[action.variant || 'default']
          } ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {action.icon && <span className="flex-shrink-0">{action.icon}</span>}
          <span>{action.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center justify-center ${sizeClasses} font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
      >
        <MoreVertical size={iconSize} />
        <span className="hidden sm:inline">{label}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? (openDirection === 'up' ? 'rotate-180' : '') : ''}`} />
      </button>
      {dropdownMenu}
    </div>
  );
};

export default ActionsDropdown;
