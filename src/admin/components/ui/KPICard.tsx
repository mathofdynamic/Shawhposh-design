import React from 'react';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { toFaDigits } from '../../utils/formatters';

export interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  definition?: string;
  timeframe?: string;
  changePercent?: number; // e.g., +12.4 or -4.2
  trendText?: string;
  sourceMode?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  definition,
  timeframe = '۳۰ روز گذشته',
  changePercent,
  trendText,
  sourceMode = 'شبیه‌سازی دترمینستیک',
  icon,
  isLoading = false,
}) => {
  const isPositive = changePercent !== undefined && changePercent > 0;
  const isNegative = changePercent !== undefined && changePercent < 0;
  const isNeutral = changePercent === 0;

  return (
    <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 md:p-6 flex flex-col justify-between transition-colors hover:border-white/15">
      {/* Header: Title, Definition, and Optional Icon */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs md:text-sm font-semibold text-gray-200">{title}</span>
            {definition && (
              <span title={definition} className="text-gray-500 hover:text-gray-300 cursor-help" aria-label={definition}>
                <Info size={13} />
              </span>
            )}
          </div>
          <span className="text-[11px] text-gray-400 block font-sans">{timeframe}</span>
        </div>
        {icon && (
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[#eed29d] shrink-0">
            {icon}
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="my-2">
        {isLoading ? (
          <div className="h-9 w-36 bg-white/10 rounded animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2 text-right">
            <span className="text-2xl md:text-3xl lg:text-4xl font-black font-fanum text-white tracking-tight">
              {typeof value === 'number' ? toFaDigits(value.toLocaleString('fa-IR')) : value}
            </span>
            {unit && <span className="text-xs md:text-sm text-gray-400 font-sans font-medium">{unit}</span>}
          </div>
        )}
      </div>

      {/* Footer: Trend Delta and Source Mode */}
      <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        {changePercent !== undefined && (
          <div className="flex items-center gap-1.5 font-fanum font-medium">
            {isPositive && (
              <span className="text-emerald-400 flex items-center gap-0.5">
                <TrendingUp size={14} />
                <span>+{toFaDigits(changePercent.toFixed(1))}%</span>
              </span>
            )}
            {isNegative && (
              <span className="text-rose-400 flex items-center gap-0.5">
                <TrendingDown size={14} />
                <span>{toFaDigits(changePercent.toFixed(1))}%</span>
              </span>
            )}
            {isNeutral && (
              <span className="text-gray-400 flex items-center gap-0.5">
                <Minus size={14} />
                <span>۰٪</span>
              </span>
            )}
            {trendText && <span className="text-gray-500 mr-1 font-sans">{trendText}</span>}
          </div>
        )}

        <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 font-mono">
          {sourceMode}
        </span>
      </div>
    </div>
  );
};
