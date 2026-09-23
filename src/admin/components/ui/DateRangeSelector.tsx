import React from 'react';
import { Calendar } from 'lucide-react';

export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'all';

export interface DateRangeSelectorProps {
  value: DateRangePreset;
  onChange: (value: DateRangePreset) => void;
  className?: string;
}

export const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const presets: { id: DateRangePreset; label: string }[] = [
    { id: 'today', label: 'امروز' },
    { id: '7d', label: '۷ روز' },
    { id: '30d', label: '۳۰ روز' },
    { id: '90d', label: '۹۰ روز' },
    { id: 'all', label: 'کل دوره' },
  ];

  return (
    <div
      role="group"
      aria-label="بازه زمانی گزارش"
      className={`inline-flex items-center p-1 bg-[#181716] border border-white/10 rounded-xl gap-1 ${className}`}
    >
      <span className="px-2 text-gray-500 hidden sm:inline-flex" aria-hidden="true">
        <Calendar size={13} />
      </span>
      {presets.map((preset) => {
        const isActive = value === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange(preset.id)}
            aria-pressed={isActive}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ba8d3d] ${
              isActive
                ? 'bg-[#ba8d3d] text-[#0e0d0c] font-bold shadow-sm'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
};
