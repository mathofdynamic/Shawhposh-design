import React from 'react';
import { Menu } from 'lucide-react';
import { useAdminRouter } from '../../router';
import { Breadcrumb } from '../ui/Breadcrumb';
import { AccountRoleMenu } from './AccountRoleMenu';

export interface AdminHeaderProps {
  onOpenMobileMenu: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onOpenMobileMenu }) => {
  const { activeGroup, activeRoute, navigate } = useAdminRouter();
  const breadcrumbItems = [
    ...(activeGroup ? [{ label: activeGroup.titleFa, onClick: () => navigate(activeGroup.routes[0].path) }] : []),
    ...(activeRoute ? [{ label: activeRoute.shortTitleFa, isCurrent: true }] : []),
  ];

  return (
    <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#141210]/95 px-4 backdrop-blur-md sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={onOpenMobileMenu} className="rounded-xl p-2 text-stone-400 transition-colors hover:bg-white/5 hover:text-white lg:hidden" aria-label="باز کردن منو">
          <Menu size={18} />
        </button>
        <Breadcrumb items={breadcrumbItems} onHomeClick={() => navigate('/admin/overview/dashboard')} className="hidden lg:flex" />
        <div className="truncate text-xs font-bold text-white lg:hidden">{activeRoute?.shortTitleFa || 'پنل مدیریت'}</div>
      </div>
      <AccountRoleMenu />
    </header>
  );
};
