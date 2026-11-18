import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { StaffRole } from '../../domain/types';
import { AdminSidebar } from './AdminSidebar';

export interface AdminMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: StaffRole;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export const AdminMobileDrawer: React.FC<AdminMobileDrawerProps> = ({
  isOpen,
  onClose,
  currentRole,
  triggerRef,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const candidates = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const focusable: HTMLElement[] = [];
        candidates.forEach((element: HTMLElement) => {
          if (element.tabIndex >= 0 && element.getClientRects().length > 0) focusable.push(element);
        });

        if (focusable.length === 0) {
          e.preventDefault();
          dialogRef.current.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement;
        const activeInsideDialog = dialogRef.current.contains(activeElement);
        if (e.shiftKey && (!activeInsideDialog || activeElement === first || activeElement === dialogRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (!activeInsideDialog || activeElement === last)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus();
      if (triggerRef.current === trigger) triggerRef.current = null;
    };
  }, [isOpen, triggerRef]);

  if (!isOpen) return null;

  return (
    <div ref={dialogRef} tabIndex={-1} className="fixed inset-0 z-50 lg:hidden flex justify-start focus:outline-none" aria-modal="true" role="dialog" aria-labelledby="admin-mobile-drawer-title">
      <div id="admin-mobile-drawer-title" className="sr-only">منوی مدیریت</div>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel (RTL: slides from right) */}
      <div className="relative w-72 max-w-[85vw] h-full bg-[#110f0e] shadow-2xl flex flex-col z-10 border-l border-white/10 animate-in slide-in-from-right duration-200">
        <div className="absolute top-3.5 left-3 z-20">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-white/5 text-stone-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba8d3d] cursor-pointer"
            aria-label="بستن منو"
          >
            <X size={18} />
          </button>
        </div>

        <AdminSidebar
          currentRole={currentRole}
          isCompact={false}
          onToggleCompact={() => {}}
          onCloseMobileDrawer={onClose}
          isMobileDrawer={true}
        />
      </div>
    </div>
  );
};
