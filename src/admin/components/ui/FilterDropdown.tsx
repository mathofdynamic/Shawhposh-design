import React, { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown, Check, X } from 'lucide-react';
import { toFaDigits } from '../../utils/formatters';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
}

export const FilterDropdown: React.FC<FilterDropdownProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  multiple = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeCount = selectedValues.length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = (value: string) => {
    if (multiple) {
      if (selectedValues.includes(value)) {
        onChange(selectedValues.filter((v) => v !== value));
      } else {
        onChange([...selectedValues, value]);
      }
    } else {
      onChange(selectedValues.includes(value) ? [] : [value]);
      setIsOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative inline-block text-right" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`inline-flex items-center gap-2 px-3 py-2 text-xs rounded-xl border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba8d3d] ${
          activeCount > 0
            ? 'bg-[#ba8d3d]/15 border-[#ba8d3d]/40 text-[#eed29d]'
            : 'bg-[#181716] border-white/10 text-gray-300 hover:text-white hover:border-white/20'
        }`}
      >
        <Filter size={13} className="shrink-0" />
        <span>{label}</span>
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-[#ba8d3d] text-[#0e0d0c] font-fanum font-bold text-[10px] flex items-center justify-center">
            {toFaDigits(activeCount)}
          </span>
        )}
        <ChevronDown size={13} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-multiselectable={multiple}
          className="absolute z-30 mt-2 min-w-[200px] bg-[#1a1918] border border-white/15 rounded-xl shadow-xl py-1.5 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 text-[11px] text-gray-400">
            <span>فیلتر بر اساس {label}</span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-rose-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <X size={11} />
                <span>حذف همه</span>
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto py-1 space-y-0.5">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggle(option.value)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-200 hover:bg-white/5 cursor-pointer text-right transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-[#ba8d3d] border-[#ba8d3d] text-[#0e0d0c]'
                          : 'border-white/20 bg-white/5'
                      }`}
                    >
                      {isSelected && <Check size={10} className="stroke-[3]" />}
                    </span>
                    <span>{option.label}</span>
                  </div>
                  {option.count !== undefined && (
                    <span className="text-[10px] text-gray-500 font-fanum">
                      {toFaDigits(option.count)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
