import React from 'react';
import { Clock } from 'lucide-react';
import { formatPersianDateTime, formatTomans } from '../../utils/formatters';

export interface DateTimeDisplayProps {
  iso: string;
  showTime?: boolean;
  showRelative?: boolean;
  className?: string;
}

export const DateTimeDisplay: React.FC<DateTimeDisplayProps> = ({
  iso,
  showTime = true,
  showRelative = false,
  className = '',
}) => {
  const formatted = formatPersianDateTime(iso);

  return (
    <div
      className={`inline-flex flex-col text-right font-fanum select-text ${className}`}
      title={`ISO: ${formatted.iso}`}
    >
      <div className="flex items-center gap-1.5 text-xs text-gray-200">
        <span>{formatted.date}</span>
        {showTime && (
          <span className="text-gray-400 font-mono text-[11px]" dir="ltr">
            {formatted.time}
          </span>
        )}
      </div>
      {showRelative && (
        <span className="text-[10px] text-gray-500 font-sans mt-0.5 flex items-center gap-1">
          <Clock size={10} className="shrink-0 text-gray-600" />
          <span>{formatted.relative}</span>
        </span>
      )}
    </div>
  );
};

export interface MoneyDisplayProps {
  amount: number;
  showUnit?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  trend?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export const MoneyDisplay: React.FC<MoneyDisplayProps> = ({
  amount,
  showUnit = true,
  size = 'md',
  trend,
  className = '',
}) => {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const { formatted, raw } = formatTomans(absAmount);

  const sizeClasses: Record<string, { value: string; unit: string }> = {
    xs: { value: 'text-[11px] font-semibold', unit: 'text-[8px]' },
    sm: { value: 'text-xs font-semibold', unit: 'text-[9px]' },
    md: { value: 'text-sm font-bold', unit: 'text-[10px]' },
    lg: { value: 'text-xl md:text-2xl font-black', unit: 'text-xs font-sans' },
    xl: { value: 'text-2xl md:text-3xl font-black', unit: 'text-sm font-sans' },
  };

  const activeSize = sizeClasses[size] || sizeClasses.md;

  const trendColor =
    trend === 'positive'
      ? 'text-emerald-400'
      : trend === 'negative' || isNegative
      ? 'text-rose-400'
      : 'text-white';

  return (
    <div
      className={`inline-flex items-baseline gap-1 font-fanum select-text ${className}`}
      title={`${amount.toLocaleString('en-US')} Tomans`}
    >
      <span className={`${activeSize.value} ${trendColor}`}>
        {isNegative && <span className="ml-0.5">− </span>}
        {formatted}
      </span>
      {showUnit && (
        <span className={`text-stone-400 font-sans font-normal ${activeSize.unit}`}>
          تومان
        </span>
      )}
    </div>
  );
};
