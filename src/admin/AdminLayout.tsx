import React, { Suspense, useLayoutEffect, useRef, useState } from 'react';
import { useStaff } from './features/StaffAuth';
import { useAdminRouter } from './router';
import { AdminSidebar } from './components/shell/AdminSidebar';
import { AdminHeader } from './components/shell/AdminHeader';
import { AdminMobileDrawer } from './components/shell/AdminMobileDrawer';
import { AdminMobileBottomNav } from './components/shell/AdminMobileBottomNav';
import { AdminPageDispatcher } from './pages/AdminPageDispatcher';

export const AdminLayout: React.FC = () => {
  const { goBackToStore, activeRoute, currentPath } = useAdminRouter();
  const staffSession = useStaff();
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const mobileDrawerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(() => {
    try { return localStorage.getItem('SHAWHPOSH_ADMIN_SIDEBAR_COMPACT') === 'true'; }
    catch { return false; }
  });
  const role = staffSession?.staff.role ?? 'support';

  useLayoutEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentPath]);

  useLayoutEffect(() => {
    document.documentElement.classList.remove('light');
  }, []);

  const toggleCompact = () => setIsCompact(current => {
    const next = !current;
    try { localStorage.setItem('SHAWHPOSH_ADMIN_SIDEBAR_COMPACT', String(next)); } catch { /* preference is optional */ }
    return next;
  });

  const width = activeRoute?.layoutWidth === 'wide' ? 'max-w-[1580px]' : activeRoute?.layoutWidth === 'narrow' ? 'max-w-4xl' : 'max-w-6xl';
  const openMobileDrawer = (trigger: HTMLButtonElement) => {
    mobileDrawerTriggerRef.current = trigger;
    setIsMobileDrawerOpen(true);
  };
  const closeMobileDrawer = () => setIsMobileDrawerOpen(false);

  return (
    <div className="h-dvh min-h-screen overflow-x-hidden bg-[#0d0c0b] font-sans text-stone-100 antialiased" dir="rtl">
      <div className="flex min-h-0 h-full">
        <aside className={`z-30 hidden shrink-0 flex-col border-l border-white/10 bg-[#110f0e] transition-all duration-200 lg:flex ${isCompact ? 'w-20' : 'w-64'}`}>
          <AdminSidebar currentRole={role} isCompact={isCompact} onToggleCompact={toggleCompact} />
        </aside>
        <div ref={contentScrollRef} data-admin-scroll-root className="mb-[calc(3.5rem+env(safe-area-inset-bottom))] flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto lg:mb-0">
          <AdminHeader onOpenMobileMenu={openMobileDrawer} />
          <main className={`mx-auto w-full flex-1 p-4 pb-6 sm:p-6 sm:pb-6 lg:p-8 lg:pb-8 ${width}`}>
            <Suspense fallback={<div role="status" aria-label="Loading admin page" className="flex min-h-[12rem] items-center justify-center"><span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-[#ba8d3d] motion-reduce:animate-none" /></div>}>
              <AdminPageDispatcher />
            </Suspense>
          </main>
        </div>
      </div>
      <AdminMobileDrawer isOpen={isMobileDrawerOpen} onClose={closeMobileDrawer} currentRole={role} triggerRef={mobileDrawerTriggerRef} />
      <AdminMobileBottomNav onOpenMenu={openMobileDrawer} />
    </div>
  );
};
