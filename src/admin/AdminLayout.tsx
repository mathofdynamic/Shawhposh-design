import { useStaff } from './features/StaffAuth';
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
  const { goBackToStore, activeRoute, currentPath } = useAdminRouter();
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const { state, resetToFixtures, demoClock } = useAdminRepository();
  const { addToast } = useToast();

  useLayoutEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentPath]);

  // Staff role from the authenticated server session
  const staffSession = useStaff();
  const currentRole = staffSession!.staff.role;
  const setCurrentRole = (_role: StaffRole) => {};

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
      title: 'داده‌های نمایشی مرورگر بازنشانی شد',
      description: 'بازنشانی فقط داده‌های آزمایشی پنل را تغییر می‌دهد؛ اطلاعات واقعی کاربران، سفارش‌ها، کاتالوگ و انبار دست‌نخورده می‌مانند.',
      type: 'info',
    });
  };

  const invariantReport = verifyDomainInvariants(state);

  // Dynamic layout max-width based on operational requirements
  const getPageWidthClass = () => {
    if (activeRoute?.layoutWidth === 'wide') return 'max-w-[1580px]';
    if (activeRoute?.layoutWidth === 'narrow') return 'max-w-4xl';
    if (activeRoute?.layoutWidth === 'standard') return 'max-w-6xl';

    const p = currentPath.toLowerCase();
    const id = activeRoute?.id || '';

    // Narrow layout for settings and form-heavy configuration pages
    if (
      id === 'settings' ||
      id === 'integrations' ||
      id === 'notifications' ||
      p.includes('/settings') ||
      p.includes('/integrations') ||
      p.includes('/notifications')
    ) {
      return 'max-w-4xl';
    }

    // Wide layout for large data tables and analytics dashboards
    if (
      id === 'orders' ||
      id === 'products' ||
      id === 'inventory' ||
      id === 'variants' ||
      id === 'customers' ||
      id === 'directory' ||
      id === 'payments' ||
      id === 'production' ||
      id === 'analytics' ||
      id === 'traffic' ||
      id === 'conversion' ||
      id === 'logs' ||
      id === 'returns' ||
      id === 'advanced-tools' ||
      p.includes('/orders') ||
      p.includes('/products') ||
      p.includes('/inventory') ||
      p.includes('/customers') ||
      p.includes('/payments') ||
      p.includes('/production') ||
      p.includes('/analytics') ||
      p.includes('/logs')
    ) {
      return 'max-w-[1580px]';
    }

    // Standard layout for general dashboard/overview/reports
    return 'max-w-6xl';
  };

  return (
    <div className="h-dvh min-h-screen bg-[#0d0c0b] text-stone-100 flex flex-col font-sans select-text overflow-x-hidden antialiased" dir="rtl">
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
        <div ref={contentScrollRef} data-admin-scroll-root className="flex-1 flex flex-col min-w-0 min-h-0 overflow-y-auto">
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
          <main className={`flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 w-full mx-auto ${getPageWidthClass()}`}>
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
        title="بازنشانی داده‌های نمایشی مرورگر"
        message="فقط فیکسچرها و تغییرات نمایشی این مرورگر بازنشانی می‌شوند. کاربران، سفارش‌ها، محصولات، تنوع‌ها و موجودی واقعی سرور تغییر نمی‌کنند."
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
