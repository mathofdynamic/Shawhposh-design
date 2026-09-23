import React from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brass';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = 'neutral',
  dot = true,
  size = 'md',
  className = '',
  ...props
}) => {
  const toneClasses: Record<BadgeTone, { text: string; bg: string; border: string; dotColor: string }> = {
    success: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      dotColor: 'bg-emerald-400',
    },
    warning: {
      text: 'text-amber-300',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      dotColor: 'bg-amber-400',
    },
    danger: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      dotColor: 'bg-rose-400',
    },
    info: {
      text: 'text-sky-300',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/20',
      dotColor: 'bg-sky-400',
    },
    neutral: {
      text: 'text-gray-300',
      bg: 'bg-white/5',
      border: 'border-white/10',
      dotColor: 'bg-gray-400',
    },
    brass: {
      text: 'text-[#eed29d]',
      bg: 'bg-[#ba8d3d]/15',
      border: 'border-[#ba8d3d]/30',
      dotColor: 'bg-[#ba8d3d]',
    },
  };

  const selected = toneClasses[tone];
  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5 rounded-md gap-1.5' : 'text-xs px-2.5 py-1 rounded-md gap-2';

  return (
    <span
      className={`inline-flex items-center font-medium border font-sans select-none tracking-normal ${sizeClasses} ${selected.bg} ${selected.border} ${selected.text} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected.dotColor}`} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};
