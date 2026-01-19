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
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
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
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isHovered && (
        <div
          className="fixed bg-white dark:bg-slate-800 shadow-lg rounded-md border border-neutral-200 dark:border-slate-700 px-3 py-2 z-[100] whitespace-nowrap"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translateY(-50%)',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <span className="text-sm font-medium text-neutral-900 dark:text-slate-100">{label}</span>
          {/* Arrow pointing left */}
          <div
            className="absolute border-8 border-transparent border-r-white dark:border-r-slate-800"
            style={{
              right: '100%',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
          <div
            className="absolute border-8 border-transparent border-r-neutral-200 dark:border-r-slate-700"
            style={{
              right: 'calc(100% + 1px)',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SidebarTooltip;
