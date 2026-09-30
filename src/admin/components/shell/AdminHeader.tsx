import React from 'react';
import { Menu, Search } from 'lucide-react';
import { useAdminRouter } from '../../router';
import { StaffRole } from '../../domain/types';
import { Breadcrumb } from '../ui/Breadcrumb';
import { QuickActionsMenu } from './QuickActionsMenu';
import { NotificationsPopover } from './NotificationsPopover';
import { DemoBadgePopover } from './DemoBadgePopover';
import { AccountRoleMenu } from './AccountRoleMenu';

export interface AdminHeaderProps {
  currentRole: StaffRole;
  onRoleChange: (role: StaffRole) => void;
  onOpenSearch: () => void;
  onOpenMobileMenu: () => void;
  onOpenInvariantsModal: () => void;
  onOpenResetConfirm: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  currentRole,
  onRoleChange,
  onOpenSearch,
  onOpenMobileMenu,
  onOpenInvariantsModal,
  onOpenResetConfirm,
}) => {
  const { activeGroup, activeRoute, navigate } = useAdminRouter();

  // Breadcrumb items
  const breadcrumbItems = [
    ...(activeGroup
      ? [
          {
            label: activeGroup.titleFa,
            onClick: () => navigate(activeGroup.routes[0].path),
          },
        ]
      : []),
    ...(activeRoute
      ? [
          {
            label: activeRoute.shortTitleFa,
            isCurrent: true,
          },
        ]
      : []),
  ];

  return (
    <header className="h-16 bg-[#141210]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-30 font-sans">
      {/* START / RIGHT: Mobile Toggle + Breadcrumbs / Current Context */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-stone-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
          aria-label="باز کردن منوی مدیریت"
        >
          <Menu size={18} />
        </button>

        <Breadcrumb
          items={breadcrumbItems}
          onHomeClick={() => navigate('/admin/overview/dashboard')}
          className="hidden sm:flex"
        />

        {/* Mobile current title */}
        <div className="sm:hidden font-bold text-xs text-white truncate">
          {activeRoute?.shortTitleFa || 'میز مدیریت'}
        </div>
      </div>

      {/* CENTER: Global Search Trigger */}
      <div className="flex-1 max-w-md mx-2 hidden md:block">
        <button
          type="button"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-stone-400 hover:text-stone-200 transition-colors text-xs cursor-pointer group"
          aria-label="جستجوی همه‌جانبه در پنل"
        >
          <div className="flex items-center gap-2">
            <Search size={14} className="text-[#ba8d3d]" />
            <span className="text-[13px]">جستجو در صفحات، سفارش‌ها، محصولات و مشتریان...</span>
          </div>
          <kbd className="text-[10px] font-mono bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-stone-400 group-hover:text-stone-200">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* END / LEFT: Quick Action, Notifications, Demo Badge, Account Menu */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Mobile search icon */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="md:hidden p-2 text-stone-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          aria-label="جستجو"
        >
          <Search size={16} />
        </button>

        {/* Quick Actions Dropdown */}
        <QuickActionsMenu onOpenResetConfirm={onOpenResetConfirm} />

        {/* Notifications Popover */}
        <NotificationsPopover />

        {/* Compact Demo Badge Popover */}
        <DemoBadgePopover
          onOpenResetConfirm={onOpenResetConfirm}
          onOpenInvariantsModal={onOpenInvariantsModal}
        />

        {/* Account / Role Simulation Menu */}
        <AccountRoleMenu currentRole={currentRole} onRoleChange={onRoleChange} />
      </div>
    </header>
  );
};

