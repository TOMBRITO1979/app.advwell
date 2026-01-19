import React, { useState, useRef, useEffect } from 'react';

interface SidebarTooltipProps {
  label: string;
  isCollapsed: boolean;
  children: React.ReactNode;
}

const SidebarTooltip: React.FC<SidebarTooltipProps> = ({
  label,
  isCollapsed,
  children,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (isCollapsed) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (isCollapsed) {
      timeoutRef.current = setTimeout(() => {
        setIsHovered(false);
      }, 100);
    }
  };

  if (!isCollapsed) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isHovered && (
        <div
          className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-white dark:bg-slate-800 shadow-lg rounded-md border border-neutral-200 dark:border-slate-700 px-3 py-2 z-50 whitespace-nowrap"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">{label}</span>
          {/* Arrow pointing left */}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-white dark:border-r-slate-800" />
          <div className="absolute right-full top-1/2 -translate-y-1/2 mr-px border-8 border-transparent border-r-neutral-200 dark:border-r-slate-700" />
        </div>
      )}
    </div>
  );
};

export default SidebarTooltip;
