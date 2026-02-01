import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  className = '' 
}: SearchBarProps) {
  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative">
        <Search 
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" 
          style={{ 
            width: '14px', 
            height: '14px',
            color: 'var(--text-muted)',
            strokeWidth: 2
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-1.5 text-xs transition-all duration-200"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--foreground)',
            height: '34px',
            fontSize: '0.8125rem',
            lineHeight: '1.25',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--primary)';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.boxShadow = 'none';
          }}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 transition-opacity duration-200 hover:opacity-70"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            aria-label="Clear search"
          >
            <X 
              style={{ 
                width: '16px', 
                height: '16px',
                color: 'var(--text-muted)',
                strokeWidth: 2
              }}
            />
          </button>
        )}
      </div>
    </div>
  );
}
