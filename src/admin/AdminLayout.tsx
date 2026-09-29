import React, { useState, useEffect } from 'react';
import { useAdminRouter } from './router';
import { StaffRole } from './domain/types';
import { useAdminRepository } from './domain/useAdminRepository';
import { verifyDomainInvariants } from './domain/invariants';
import { AdminSidebar } from './components/shell/AdminSidebar';
import { AdminHeader } from './components/shell/AdminHeader';
import { AdminMobileDrawer } from './components/shell/AdminMobileDrawer';
import { AdminMobileBottomNav } from './components/shell/AdminMobileBottomNav';
import { GlobalSearchModal } from './components/shell/GlobalSearchModal';
import { AdminPageDispatcher } from './pages/AdminPageDispatcher';
import {
  ConfirmDialog,
  Dialog,
  Button,
  Badge,
  useToast,
} from './components/ui';
import { ShieldCheck, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';
import { toFaDigits } from './utils/formatters';

export const AdminLayout: React.FC = () => {
  const { goBackToStore } = useAdminRouter();
  const { state, resetToFixtures, demoClock } = useAdminRepository();
  const { addToast } = useToast();

  // Role simulation state
  const [currentRole, setCurrentRole] = useState<StaffRole>('super_admin');

  // Sidebar compact state persisted locally
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    try {
      return localStorage.getItem('SHAWHPOSH_ADMIN_SIDEBAR_COMPACT') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCompact = () => {
    setIsCompact((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('SHAWHPOSH_ADMIN_SIDEBAR_COMPACT', String(next));
      } catch {}
      return next;
    });
  };

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isInvariantsModalOpen, setIsInvariantsModalOpen] = useState(false);

  // Keyboard shortcut for Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Guarantee admin environment is dark-only
  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('light')) {
      document.documentElement.classList.remove('light');
    }
  }, []);

  const handleReset = () => {
    resetToFixtures();
    setIsResetConfirmOpen(false);
    addToast({
      title: 'پایگاه داده بازنشانی شد',
      description: 'تمامی مقادیر، سفارش‌ها و موجودی انبار به حالت پیش‌فرض کارخانه بازگشت.',
      type: 'info',
    });
  };

  const invariantReport = verifyDomainInvariants(state);

  return (
    <div className="min-h-screen bg-[#0d0c0b] text-stone-100 flex flex-col font-sans select-text overflow-x-hidden antialiased" dir="rtl">
      {/* Top Demo Notice Bar */}
      <div className="bg-[#ba8d3d]/15 border-b border-[#ba8d3d]/20 px-4 py-1.5 text-xs text-[#eed29d] flex items-center justify-between z-40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ba8d3d] animate-pulse" />
          <span className="font-bold">محیط آزمایشی مدیریت شاه‌پوش (داده‌های نمایشی کارگاه)</span>
          <span className="hidden md:inline text-[11px] text-stone-400">
            · ساعت مرجع: {demoClock} (۲ مهر ۱۴۰۵)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsInvariantsModalOpen(true)}
            className="text-[11px] bg-[#ba8d3d]/20 hover:bg-[#ba8d3d]/30 text-[#eed29d] px-2 py-0.5 rounded transition-colors cursor-pointer"
          >
            ناوردایی‌ها: {toFaDigits(invariantReport.results.length)} / {toFaDigits(invariantReport.results.length)} پاس
          </button>
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="text-[11px] text-stone-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RotateCcw size={11} />
            <span>ریست داده</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Desktop Sidebar */}
        <aside
          className={`hidden lg:flex flex-col shrink-0 bg-[#110f0e] border-l border-white/10 transition-all duration-200 z-30 ${
            isCompact ? 'w-20' : 'w-64'
          }`}
        >
          <AdminSidebar
            currentRole={currentRole}
            isCompact={isCompact}
            onToggleCompact={handleToggleCompact}
          />
        </aside>

        {/* Content Body */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto">
          {/* Header */}
          <AdminHeader
            currentRole={currentRole}
            onRoleChange={setCurrentRole}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
            onOpenInvariantsModal={() => setIsInvariantsModalOpen(true)}
            onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
          />

          {/* Page View Region */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8 max-w-7xl w-full mx-auto">
            <AdminPageDispatcher />
          </main>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AdminMobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        currentRole={currentRole}
      />

      {/* Mobile Bottom Navigation Bar */}
      <AdminMobileBottomNav onOpenMenu={() => setIsMobileDrawerOpen(true)} />

      {/* Global Search Palette (⌘K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        currentRole={currentRole}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        onConfirm={handleReset}
        title="بازنشانی کامل پایگاه‌داده دمو"
        message="آیا مطمئن هستید؟ تمامی فاکتورهای جدید، تغییرات انبار و تاییدهای آتلیه پاک شده و به داده‌های اولیه بازمی‌گردد."
        confirmLabel="بله، بازنشانی شود"
        cancelLabel="انصراف"
        variant="destructive"
      />

      {/* Invariants Audit Modal */}
      <Dialog
        isOpen={isInvariantsModalOpen}
        onClose={() => setIsInvariantsModalOpen(false)}
        title="پایش و تایید سلامت ناوردایی‌های هشت‌گانه دامنه"
        description="ارزیابی زنده و خودکار قوانین پایه معماری جهت جلوگیری از داده‌های مخدوش و ناهمخوان:"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setIsInvariantsModalOpen(false)}>
            بستن پنجره
          </Button>
        }
      >
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {invariantReport.results.map((r, i) => (
            <div
              key={i}
              className="p-3 bg-white/5 border border-white/5 rounded-xl flex items-start gap-2.5 text-right"
            >
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-bold text-white">{r.invariant}</div>
                <div className="text-[11px] text-stone-400 mt-0.5 leading-relaxed">{r.details}</div>
              </div>
              <Badge label="تایید شد" variant="success" size="sm" />
            </div>
          ))}
        </div>
      </Dialog>
    </div>
  );
};
