import React from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';

export interface MobileCardField {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}

export interface MobileCardItem {
  id: string;
  title: string;
  subtitle?: string;
  badge?: {
    text: string;
    color: 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray';
  };
  extraContent?: React.ReactNode;
  fields: MobileCardField[];
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

interface MobileCardListProps {
  items: MobileCardItem[];
  emptyMessage?: string;
}

const badgeColors = {
  green: 'bg-success-100 text-success-800',
  red: 'bg-red-100 text-red-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  blue: 'bg-info-100 text-info-700',
  purple: 'bg-primary-100 text-primary-800',
  gray: 'bg-neutral-100 text-neutral-800',
};

const MobileCardList: React.FC<MobileCardListProps> = ({ items, emptyMessage = 'Nenhum item encontrado' }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="mobile-card">
          {/* Header */}
          <div className="mobile-card-header">
            <div className="flex-1 min-w-0">
              <h3 className="mobile-card-title truncate">{item.title}</h3>
              {item.subtitle && (
                <p className="mobile-card-subtitle truncate">{item.subtitle}</p>
              )}
            </div>
            {item.badge && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${badgeColors[item.badge.color]}`}>
                {item.badge.text}
              </span>
            )}
          </div>

          {/* Extra Content */}
          {item.extraContent && (
            <div className="px-4 pb-2">
              {item.extraContent}
            </div>
          )}

          {/* Fields */}
          <div className="space-y-0">
            {item.fields.map((field, index) => (
              <div key={index} className="mobile-card-row">
                <span className="mobile-card-label">{field.label}</span>
                <span className={`mobile-card-value ${field.highlight ? 'font-semibold text-primary-600' : ''}`}>
                  {field.value || '-'}
                </span>
              </div>
            ))}
          </div>

          {/* Actions */}
          {(item.onView || item.onEdit || item.onDelete) && (
            <div className="mobile-card-actions">
              {item.onView && (
                <button
                  onClick={item.onView}
                  className="flex-1 action-btn action-btn-info bg-info-50 rounded-lg"
                  title="Ver detalhes"
                >
                  <Eye size={18} />
                  <span className="ml-2 text-sm">Ver</span>
                </button>
              )}
              {item.onEdit && (
                <button
                  onClick={item.onEdit}
                  className="flex-1 action-btn action-btn-primary bg-primary-50 rounded-lg"
                  title="Editar"
                >
                  <Edit size={18} />
                  <span className="ml-2 text-sm">Editar</span>
                </button>
              )}
              {item.onDelete && (
                <button
                  onClick={item.onDelete}
                  className="flex-1 action-btn action-btn-danger bg-error-50 rounded-lg"
                  title="Excluir"
                >
                  <Trash2 size={18} />
                  <span className="ml-2 text-sm">Excluir</span>
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MobileCardList;
