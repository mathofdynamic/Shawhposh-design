import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button, IconButton } from './Button';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
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
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby={description ? 'dialog-description' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative w-full ${sizeClasses[size]} bg-[#131211] border border-white/10 rounded-2xl shadow-2xl p-6 z-10 animate-in fade-in zoom-in-95 duration-150`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="space-y-1">
            <h3 id="dialog-title" className="text-base font-bold text-white">
              {title}
            </h3>
            {description && (
              <p id="dialog-description" className="text-xs text-gray-400 leading-relaxed font-sans">
                {description}
              </p>
            )}
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="بستن دیالوگ"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={15} />
          </IconButton>
        </div>

        {children && <div className="my-4 text-xs md:text-sm text-gray-300">{children}</div>}

        {footer && <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/5">{footer}</div>}
      </div>
    </div>
  );
};

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'تایید عملیات',
  cancelLabel = 'انصراف',
  isDestructive = false,
  isLoading = false,
}) => {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'primary'}
            size="sm"
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {isDestructive && (
        <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
          <AlertTriangle size={18} className="shrink-0" />
          <span>این عملیات غیرقابل بازگشت است و بر روی موجودی یا اسناد اثر خواهد گذاشت.</span>
        </div>
      )}
    </Dialog>
  );
};
