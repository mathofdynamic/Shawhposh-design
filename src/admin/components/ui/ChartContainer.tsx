import React from 'react';
import { DateRangeSelector, DateRangePreset } from './DateRangeSelector';
import { EmptyState } from './EmptyState';

export interface ChartContainerProps {
  title: string;
  subtitle?: string;
  sourceMode?: string;
  timeframe?: DateRangePreset;
  onTimeframeChange?: (preset: DateRangePreset) => void;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  sourceMode = 'شبیه‌سازی دترمینستیک',
  timeframe,
  onTimeframeChange,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'داده‌ای در بازه انتخابی ثبت نشده است.',
  children,
  actions,
  className = '',
}) => {
  return (
    <div className={`bg-[#131211] border border-white/10 rounded-2xl p-5 md:p-6 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
        <div className="space-y-1 text-right">
          <div className="flex items-center gap-2">
            <h3 className="text-sm md:text-base font-bold text-white">{title}</h3>
            <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded font-mono">
              {sourceMode}
            </span>
          </div>
          {subtitle && <p className="text-xs text-gray-400 font-sans">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {timeframe && onTimeframeChange && (
            <DateRangeSelector value={timeframe} onChange={onTimeframeChange} />
          )}
          {actions}
        </div>
      </div>

      {/* Chart Canvas Area: LTR isolation for coordinates & axes */}
      <div className="flex-1 w-full min-h-[240px] relative flex flex-col justify-center" dir="ltr">
        {isLoading ? (
          <div className="w-full h-48 bg-white/5 rounded-xl animate-pulse flex items-center justify-center text-xs text-gray-500 font-sans">
            در حال بارگذاری نمودار...
          </div>
        ) : isEmpty ? (
          <div dir="rtl">
            <EmptyState title="نمودار خالی" description={emptyMessage} />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};
