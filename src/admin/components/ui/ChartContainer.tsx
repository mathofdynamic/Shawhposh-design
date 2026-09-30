import React, { useState } from 'react';
import { Table as TableIcon, BarChart2, Info } from 'lucide-react';
import { DateRangeSelector, DateRangePreset } from './DateRangeSelector';
import { EmptyState } from './EmptyState';
import { Button } from './Button';

export interface ChartSeriesLegendItem {
  label: string;
  color: string;
  markerSymbol?: string;
  value?: string | number;
}

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
  tableFallback?: React.ReactNode;
  seriesLegend?: ChartSeriesLegendItem[];
  className?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  sourceMode,
  timeframe,
  onTimeframeChange,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'داده‌ای در بازه انتخابی ثبت نشده است.',
  children,
  actions,
  tableFallback,
  seriesLegend,
  className = '',
}) => {
  const [showTableFallback, setShowTableFallback] = useState(false);

  return (
    <div className={`bg-[#131211] border border-white/10 rounded-xl p-4 sm:p-5 flex flex-col shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5">
        <div className="space-y-1 text-right">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white leading-snug">{title}</h3>
            {sourceMode && (
              <span
                title={`منبع داده: ${sourceMode}`}
                className="text-stone-500 hover:text-stone-300 cursor-help"
                aria-label={sourceMode}
              >
                <Info size={13} />
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-stone-400 font-sans">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {timeframe && onTimeframeChange && (
            <DateRangeSelector value={timeframe} onChange={onTimeframeChange} />
          )}

          {tableFallback && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowTableFallback(!showTableFallback)}
              aria-label={showTableFallback ? 'مشاهده نمای نمودار' : 'مشاهده جدول جایگزین داده‌ها'}
              className="text-xs"
            >
              {showTableFallback ? (
                <>
                  <BarChart2 size={13} className="ml-1 text-[#ba8d3d]" />
                  <span>نمای نمودار</span>
                </>
              ) : (
                <>
                  <TableIcon size={13} className="ml-1 text-[#eed29d]" />
                  <span>جدول داده‌ها</span>
                </>
              )}
            </Button>
          )}

          {actions}
        </div>
      </div>

      {/* Series Legend (if provided, with distinct markers not color alone) */}
      {seriesLegend && seriesLegend.length > 0 && !showTableFallback && (
        <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-stone-300 font-sans" dir="rtl">
          {seriesLegend.map((s, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span
                style={{ backgroundColor: s.color }}
                className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
                aria-hidden="true"
              />
              {s.markerSymbol && (
                <span className="text-[10px] text-stone-400 font-mono" aria-hidden="true">
                  [{s.markerSymbol}]
                </span>
              )}
              <span className="font-medium">{s.label}</span>
              {s.value !== undefined && (
                <span className="font-fanum text-stone-400 font-bold">({s.value})</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chart Canvas Area or Accessible Table Fallback */}
      {showTableFallback && tableFallback ? (
        <div className="flex-1 w-full min-h-[220px] overflow-x-auto text-right select-text pt-1" dir="rtl">
          {tableFallback}
        </div>
      ) : (
        <div className="flex-1 w-full min-h-[240px] relative flex flex-col justify-center select-none" dir="ltr">
          {isLoading ? (
            <div className="w-full h-48 bg-white/5 rounded-xl animate-pulse flex items-center justify-center text-xs text-stone-500 font-sans">
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
      )}
    </div>
  );
};
