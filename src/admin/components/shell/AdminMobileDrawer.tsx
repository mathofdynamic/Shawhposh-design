import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { StaffRole } from '../../domain/types';
import { AdminSidebar } from './AdminSidebar';

export interface AdminMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentRole: StaffRole;
}

export const AdminMobileDrawer: React.FC<AdminMobileDrawerProps> = ({
  isOpen,
  onClose,
  currentRole,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex justify-end" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel (RTL: slides from right) */}
      <div className="relative w-72 max-w-[85vw] h-full bg-[#110f0e] shadow-2xl flex flex-col z-10 border-l border-white/10 animate-in slide-in-from-right duration-200">
        <div className="absolute top-3.5 left-3 z-20">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white bg-white/5 rounded-lg transition-colors cursor-pointer"
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
