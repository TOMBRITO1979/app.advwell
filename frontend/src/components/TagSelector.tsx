import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import api from '../services/api';
import TagBadge from './TagBadge';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function TagSelector({
  selectedTagIds,
  onChange,
  placeholder = 'Selecionar tags...',
  disabled = false,
}: TagSelectorProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTags();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTags = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tags/search');
      setTags(response.data);
    } catch (error) {
      console.error('Erro ao carregar tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  };

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  return (
    <div ref={containerRef} className="relative">
      {/* Selected Tags Display */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedTags.map((tag) => (
            <TagBadge
              key={tag.id}
              name={tag.name}
              color={tag.color}
              size="sm"
              onRemove={() => handleRemoveTag(tag.id)}
            />
          ))}
        </div>
      )}

      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-neutral-300 dark:border-slate-600 rounded-md flex items-center justify-between min-h-[44px] ${
          disabled
            ? 'bg-neutral-100 dark:bg-slate-800 cursor-not-allowed'
            : 'bg-white dark:bg-slate-700 hover:border-neutral-400 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500'
        }`}
      >
        <span className={selectedTagIds.length === 0 ? 'text-neutral-400 dark:text-slate-500' : 'text-neutral-700 dark:text-slate-200'}>
          {selectedTagIds.length === 0
            ? placeholder
            : `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? 's' : ''} selecionada${selectedTagIds.length > 1 ? 's' : ''}`}
        </span>
        <ChevronDown
          size={20}
          className={`text-neutral-400 dark:text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-neutral-200 dark:border-slate-600 rounded-lg shadow-lg max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-neutral-200 dark:border-slate-600">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar tags..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-700 border border-neutral-300 dark:border-slate-600 rounded-md text-sm text-neutral-900 dark:text-slate-100 placeholder-neutral-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>
          </div>

          {/* Tags List */}
          <div className="overflow-y-auto max-h-48">
            {loading ? (
              <div className="p-4 text-center text-neutral-500 dark:text-slate-400">Carregando...</div>
            ) : filteredTags.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 dark:text-slate-400">
                {tags.length === 0 ? 'Nenhuma tag cadastrada' : 'Nenhuma tag encontrada'}
              </div>
            ) : (
              filteredTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    className={`w-full px-3 py-2 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-slate-700 ${
                      isSelected ? 'bg-primary-50 dark:bg-primary-900/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: tag.color,
                          color: getTextColor(tag.color),
                        }}
                      >
                        {tag.name}
                      </span>
                    </div>
                    {isSelected && <Check size={16} className="text-primary-600" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Calculate text color based on background luminance
const getTextColor = (hexColor: string): string => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};
