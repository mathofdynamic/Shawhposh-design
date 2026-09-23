import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const paddingClass = size === 'sm' ? 'p-0.5' : 'p-1';
  const itemPaddingClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-xs md:text-sm';

  return (
    <div
      role="radiogroup"
      className={`inline-flex items-center bg-[#181716] border border-white/10 rounded-xl ${paddingClass} ${className}`}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ba8d3d] ${itemPaddingClass} ${
              isSelected
                ? 'bg-white/10 text-white font-semibold shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded-full text-gray-300 font-fanum">
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  badge?: string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeId, onChange, className = '' }) => {
  return (
    <div className={`border-b border-white/10 overflow-x-auto ${className}`}>
      <nav role="tablist" aria-label="تب‌های مدیریتی" className="flex items-center gap-6 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`pb-3 pt-1 text-xs md:text-sm font-medium border-b-2 flex items-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba8d3d] ${
                isActive
                  ? 'border-[#ba8d3d] text-white font-bold'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-white/20'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-fanum ${
                    isActive ? 'bg-[#ba8d3d]/20 text-[#eed29d]' : 'bg-white/5 text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
