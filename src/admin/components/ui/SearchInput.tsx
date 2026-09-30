import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  shortcutHint?: string;
  ariaLabel?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'جستجو در داده‌ها...',
  className = '',
  shortcutHint,
  ariaLabel = 'جستجو',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={`relative flex items-center min-w-[200px] sm:min-w-[260px] ${className}`}>
      <span className="absolute right-3.5 text-gray-500 pointer-events-none" aria-hidden="true">
        <Search size={15} />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full min-h-[42px] bg-[#181716] border border-white/10 rounded-xl pr-9 pl-9 py-2 text-[13px] sm:text-sm text-white placeholder:text-stone-500 transition-all duration-150 focus:border-[#ba8d3d] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ba8d3d]"
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="پاک‌کردن جستجو"
          className="absolute left-3 text-gray-500 hover:text-white transition-colors cursor-pointer"
        >
          <X size={14} />
        </button>
      ) : shortcutHint ? (
        <span className="absolute left-2.5 text-[10px] text-gray-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-mono pointer-events-none">
          {shortcutHint}
        </span>
      ) : null}
    </div>
  );
};
