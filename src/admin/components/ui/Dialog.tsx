import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button, IconButton } from './Button';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    // Focus first focusable element or dialog container
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      // Keyboard trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
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
          if (document.activeElement === firstElement || document.activeElement === dialogRef.current) {
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
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-150 motion-reduce:transition-none"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`relative w-full ${sizeClasses[size]} bg-[#131211] border border-white/10 rounded-2xl shadow-2xl p-4 sm:p-6 z-10 my-8 focus:outline-none animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1 pr-1">
            <h3 id="dialog-title" className="text-sm sm:text-base font-bold text-white leading-snug">
              {title}
            </h3>
            {description && (
              <p id="dialog-description" className="text-xs text-stone-400 leading-relaxed font-sans">
                {description}
              </p>
            )}
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="بستن دیالوگ"
            onClick={onClose}
            className="text-stone-400 hover:text-white shrink-0"
          >
            <X size={16} />
          </IconButton>
        </div>

        {children && <div className="my-4 text-xs md:text-sm text-stone-300 select-text">{children}</div>}

        {footer && <div className="mt-6 flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-white/5">{footer}</div>}
      </div>
    </div>
  );
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  variant?: 'destructive' | 'primary' | 'secondary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  message,
  confirmLabel = 'تایید عملیات',
  cancelLabel = 'انصراف',
  isDestructive = false,
  variant,
  isLoading = false,
}) => {
  const effectiveDescription = description || message || '';
  const effectiveDestructive = isDestructive || variant === 'destructive';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={effectiveDescription}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={effectiveDestructive ? 'destructive' : 'primary'}
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {effectiveDestructive && (
        <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
          <AlertTriangle size={18} className="shrink-0 text-rose-400" />
          <span>این عملیات حساس و نیازمند تایید است.</span>
        </div>
      )}
    </Dialog>
  );
};
