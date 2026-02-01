'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface BaseItem {
  _id: string;
  [key: string]: any;
}

interface ItemSelectorProps<T extends BaseItem> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: T[];
  renderSelected: (item: T) => React.ReactNode;
  renderOption: (item: T) => React.ReactNode;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  showError?: boolean;
  getSearchableText: (item: T) => string;
}

export default function ItemSelector<T extends BaseItem>({
  label,
  value,
  onChange,
  items,
  renderSelected,
  renderOption,
  placeholder = 'Select an item',
  required = false,
  disabled = false,
  helperText,
  error,
  showError = false,
  getSearchableText,
}: ItemSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
    } else {
      document.removeEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  const selectedItem = items.find((item) => String(item._id) === String(value));
  console.log('ItemSelector Render:', { label, value, hasSelectedItem: !!selectedItem, itemsCount: items.length });

  // Safe filtering with fallback
  const filteredItems = items.filter((item) => {
    try {
      const searchText = getSearchableText(item);
      if (!searchText) return false;
      return searchText.toLowerCase().includes(searchQuery.toLowerCase());
    } catch (error) {
      console.error('Error in getSearchableText:', error);
      return false;
    }
  });

  const handleSelect = (itemId: string) => {
    onChange(itemId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className="relative" ref={containerRef} style={{ zIndex: isOpen ? 100 : 1 }}>
      <label className="label">
        {label.replace(' *', '')} {required && <span style={{ color: 'var(--error)' }}>*</span>}
      </label>

      {/* Selector Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '0.375rem 0.625rem',
          minHeight: '32px',
        }}
        className={`
          input flex items-center justify-between
          ${isOpen ? 'ring-2' : ''}
          ${showError && error ? 'border-red-500 focus:ring-red-500' : ''}
        `}
      >
        <div className="flex-1 text-left overflow-hidden text-sm">
          {selectedItem ? (
            <div className="flex items-center gap-2">
              {renderSelected(selectedItem)}
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {selectedItem && !disabled && (
            <div
              onClick={handleClear}
              className="p-0.5 rounded transition-colors cursor-pointer hover:bg-slate-100"
            >
              <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${
              isOpen ? 'transform rotate-180' : ''
            }`}
            style={{ color: 'var(--text-muted)' }}
          />
        </div>
      </button>

      {helperText && !showError && (
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {helperText}
        </p>
      )}

      {showError && error && (
        <p className="text-[11px] mt-0.5 text-red-600 font-medium">
          {error}
        </p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute z-[9999] w-full mt-1 rounded-lg shadow-2xl max-h-80 overflow-hidden border border-slate-300"
          style={{
            background: 'white',
            pointerEvents: 'auto'
          }}
        >
            {/* Search Input */}
            <div 
              className="p-2"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-2 py-1.5 text-xs rounded-lg focus:outline-none"
                style={{
                  border: '1px solid var(--border)',
                  background: 'white',
                  color: 'var(--foreground)',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--primary)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--border)';
                  e.target.style.boxShadow = 'none';
                }}
                autoFocus={false}
              />
            </div>

            {/* Items List */}
            <div className="overflow-y-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-200">
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  {searchQuery ? 'No items match your search' : 'No items available'}
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleSelect(item._id);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className={`w-full p-2 text-left shadow-none transition-all border-l-4 flex items-center justify-between group ${
                      String(value) === String(item._id)
                        ? 'bg-blue-50 border-blue-600' 
                        : 'bg-white border-transparent hover:bg-slate-50'
                    }`}
                    style={{ 
                      pointerEvents: 'auto', 
                      cursor: 'pointer',
                      display: 'flex',
                      zIndex: 10001
                    }}
                  >
                    <div className="flex-1 text-sm pointer-events-none">
                      {renderOption(item)}
                    </div>
                    {String(value) === String(item._id) && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-600 ml-2" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
      )}
    </div>
  );
}
