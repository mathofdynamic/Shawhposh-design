import React from 'react';

export type BadgeTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'destructive'
  | 'info'
  | 'neutral'
  | 'brass'
  | 'default'
  | 'secondary'
  | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeTone;
  label?: React.ReactNode;
  dot?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  label,
  tone,
  variant,
  dot = true,
  size = 'md',
  className = '',
  ...props
}) => {
  // Normalize tone / variant
  const effectiveTone: BadgeTone = (tone || variant || 'neutral') as BadgeTone;

  const toneClasses: Record<string, { text: string; bg: string; border: string; dotColor: string; iconSymbol?: string }> = {
    success: {
      text: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/25',
      dotColor: 'bg-emerald-400',
      iconSymbol: '✓',
    },
    warning: {
      text: 'text-amber-300',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/25',
      dotColor: 'bg-amber-400',
      iconSymbol: '!',
    },
    danger: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/25',
      dotColor: 'bg-rose-400',
      iconSymbol: '✕',
    },
    destructive: {
      text: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/25',
      dotColor: 'bg-rose-400',
      iconSymbol: '✕',
    },
    info: {
      text: 'text-sky-300',
      bg: 'bg-sky-500/10',
      border: 'border-sky-500/25',
      dotColor: 'bg-sky-400',
      iconSymbol: 'ℹ',
    },
    neutral: {
      text: 'text-stone-300',
      bg: 'bg-white/5',
      border: 'border-white/10',
      dotColor: 'bg-stone-400',
      iconSymbol: '•',
    },
    default: {
      text: 'text-stone-300',
      bg: 'bg-white/5',
      border: 'border-white/10',
      dotColor: 'bg-stone-400',
      iconSymbol: '•',
    },
    secondary: {
      text: 'text-stone-300',
      bg: 'bg-white/5',
      border: 'border-white/10',
      dotColor: 'bg-stone-400',
      iconSymbol: '•',
    },
    outline: {
      text: 'text-stone-300',
      bg: 'bg-transparent',
      border: 'border-white/20',
      dotColor: 'bg-stone-400',
      iconSymbol: '•',
    },
    brass: {
      text: 'text-[#eed29d]',
      bg: 'bg-[#ba8d3d]/15',
      border: 'border-[#ba8d3d]/30',
      dotColor: 'bg-[#ba8d3d]',
      iconSymbol: '◆',
    },
  };

  const selected = toneClasses[effectiveTone] || toneClasses.neutral;
  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5 rounded-md gap-1.5'
      : size === 'lg'
      ? 'text-xs px-3 py-1.5 rounded-lg gap-2'
      : 'text-xs px-2.5 py-1 rounded-md gap-2';

  const content = label !== undefined ? label : children;

  return (
    <span
      className={`inline-flex items-center font-medium border font-sans select-none tracking-normal ${sizeClasses} ${selected.bg} ${selected.border} ${selected.text} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${selected.dotColor}`}
          aria-hidden="true"
        />
      )}
      <span className="truncate">{content}</span>
    </span>
  );
};
