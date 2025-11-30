import React from 'react';
import { Download, FileText, Upload } from 'lucide-react';

export type ExportButtonType = 'csv' | 'pdf' | 'import';

interface ExportButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  type: ExportButtonType;
  label?: string;
  loading?: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  type,
  label,
  loading = false,
  className = '',
  ...props
}) => {
  const configs = {
    csv: {
      icon: Download,
      defaultLabel: 'Exportar CSV',
      mobileLabel: 'CSV',
      bgColor: 'bg-purple-100',
      hoverColor: 'hover:bg-purple-200',
      textColor: 'text-purple-700',
      borderColor: 'border border-purple-200',
    },
    pdf: {
      icon: FileText,
      defaultLabel: 'Exportar PDF',
      mobileLabel: 'PDF',
      bgColor: 'bg-red-100',
      hoverColor: 'hover:bg-red-200',
      textColor: 'text-red-700',
      borderColor: 'border border-red-200',
    },
    import: {
      icon: Upload,
      defaultLabel: 'Importar CSV',
      mobileLabel: 'Importar',
      bgColor: 'bg-blue-100',
      hoverColor: 'hover:bg-blue-200',
      textColor: 'text-blue-700',
      borderColor: 'border border-blue-200',
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg
        ${config.bgColor} ${config.hoverColor} ${config.textColor} ${config.borderColor}
        font-medium text-sm
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
        min-h-[44px]
        ${className}
      `}
      disabled={loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4 sm:h-5 sm:w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <Icon size={18} className="sm:w-5 sm:h-5" />
      )}
      <span className="hidden sm:inline">{label || config.defaultLabel}</span>
      <span className="sm:hidden">{label || config.mobileLabel}</span>
    </button>
  );
};

export default ExportButton;
