import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel (In RTL: slides from left or right. Standard right slide-over) */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
        <div
          ref={drawerRef}
          className={`w-screen ${sizeClasses[size]} bg-[#131211] border-l border-white/10 shadow-2xl flex flex-col pointer-events-auto transition-transform duration-250 ease-out`}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 id="drawer-title" className="text-base font-bold text-white">
                {title}
              </h2>
              {subtitle && <p className="text-xs text-gray-400 font-sans">{subtitle}</p>}
            </div>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="بستن پنجره"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X size={16} />
            </IconButton>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 select-text">{children}</div>

          {/* Optional Footer */}
          {footer && (
            <div className="p-4 px-6 border-t border-white/10 bg-[#0c0b0a]/60 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
