import React from 'react';
import { PackageOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center py-6 px-4 sm:py-8 sm:px-6 border border-white/10 rounded-xl bg-[#131211]/60 ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#eed29d] mb-3">
        {icon || <PackageOpen size={20} />}
      </div>
      <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-stone-400 max-w-[45ch] leading-relaxed mb-3.5 font-sans">
        {description}
      </p>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message: string;
  errorCode?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'خطا در بارگذاری داده‌ها',
  message,
  errorCode,
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`w-full flex flex-col items-center justify-center text-center p-8 border border-rose-500/20 rounded-2xl bg-rose-500/5 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 mb-4">
        <AlertCircle size={24} />
      </div>
      <h3 className="text-sm md:text-base font-bold text-rose-200 mb-1.5">{title}</h3>
      <p className="text-xs text-gray-400 max-w-[45ch] leading-relaxed mb-4 font-sans">{message}</p>
      {errorCode && (
        <span className="text-[10px] text-gray-400 font-mono bg-white/5 px-2 py-0.5 rounded mb-4" dir="ltr">
          کد خطا: {errorCode}
        </span>
      )}
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw size={13} />}
          className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
        >
          تلاش مجدد
        </Button>
      )}
    </div>
  );
};

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const variantClasses = {
    text: 'rounded h-4 my-1',
    circular: 'rounded-full',
    rectangular: 'rounded-xl',
  };

  return (
    <div
      aria-hidden="true"
      style={{ width, height }}
      className={`bg-white/[0.08] animate-pulse ${variantClasses[variant]} ${className}`}
    />
  );
};
