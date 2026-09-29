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
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    // Initial focus
    const timer = setTimeout(() => {
      if (drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          drawerRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      // Keyboard trap inside drawer
      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0] as HTMLElement | undefined;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement | undefined;

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === drawerRef.current) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocusedElementRef.current && typeof previouslyFocusedElementRef.current.focus === 'function') {
        previouslyFocusedElementRef.current.focus();
      }
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
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-200 motion-reduce:transition-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel (In RTL: slides from right) */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-0 sm:pl-10 pointer-events-none">
        <div
          ref={drawerRef}
          tabIndex={-1}
          className={`w-screen ${sizeClasses[size]} bg-[#131211] border-l border-white/10 shadow-2xl flex flex-col pointer-events-auto focus:outline-none transition-transform duration-250 ease-out motion-reduce:transition-none`}
        >
          {/* Header */}
          <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-white/10 flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 id="drawer-title" className="text-sm sm:text-base font-bold text-white">
                {title}
              </h2>
              {subtitle && <p className="text-xs text-stone-400 font-sans">{subtitle}</p>}
            </div>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label="بستن پنجره"
              onClick={onClose}
              className="text-stone-400 hover:text-white shrink-0"
            >
              <X size={16} />
            </IconButton>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 select-text">{children}</div>

          {/* Optional Footer */}
          {footer && (
            <div className="p-4 px-5 sm:px-6 border-t border-white/10 bg-[#0c0b0a]/80 flex flex-wrap items-center justify-end gap-2.5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
