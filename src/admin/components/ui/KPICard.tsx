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
  timeframe,
  changePercent,
  trendText,
  icon,
  isLoading = false,
}) => {
  const isPositive = changePercent !== undefined && changePercent > 0;
  const isNegative = changePercent !== undefined && changePercent < 0;
  const isNeutral = changePercent === 0;

  return (
    <div className="bg-[#131211] border border-white/10 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between transition-colors hover:border-white/20">
      {/* Header: Label and Optional Icon */}
      <div className="flex items-start justify-between gap-2.5 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs sm:text-[13px] font-semibold text-stone-300 truncate">{title}</span>
          {definition && (
            <span
              title={definition}
              className="text-stone-500 hover:text-stone-300 cursor-help shrink-0"
              aria-label={definition}
            >
              <Info size={13} />
            </span>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-[#eed29d] shrink-0">
            {icon}
          </div>
        )}
      </div>

      {/* Main Metric Value & Unit */}
      <div className="my-1">
        {isLoading ? (
          <div className="h-8 w-28 bg-white/10 rounded animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2 text-right">
            <span className="text-2xl sm:text-[28px] font-bold font-fanum text-white tracking-tight leading-tight">
              {typeof value === 'number' ? toFaDigits(value.toLocaleString('fa-IR')) : value}
            </span>
            {unit && (
              <span className="text-xs text-stone-400 font-sans font-medium">{unit}</span>
            )}
          </div>
        )}
      </div>

      {/* Trend or Timeframe summary */}
      {(changePercent !== undefined || timeframe || trendText) && (
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-xs font-sans">
          {changePercent !== undefined && (
            <div className="flex items-center gap-1 font-fanum font-medium">
              {isPositive && (
                <span className="text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp size={13} />
                  <span>+{toFaDigits(changePercent.toFixed(1))}%</span>
                </span>
              )}
              {isNegative && (
                <span className="text-rose-400 flex items-center gap-0.5">
                  <TrendingDown size={13} />
                  <span>{toFaDigits(changePercent.toFixed(1))}%</span>
                </span>
              )}
              {isNeutral && (
                <span className="text-stone-400 flex items-center gap-0.5">
                  <Minus size={13} />
                  <span>۰٪</span>
                </span>
              )}
              {trendText && <span className="text-stone-400 mr-1 text-[11px]">{trendText}</span>}
            </div>
          )}
          {timeframe && (
            <span className="text-[11px] text-stone-400 font-sans ml-auto">{timeframe}</span>
          )}
        </div>
      )}
    </div>
  );
};
