import React from 'react';
import { LayoutDashboard, ShoppingBag, Users, Box, Menu } from 'lucide-react';
import { useAdminRouter } from '../../router';

export interface AdminMobileBottomNavProps {
  onOpenMenu: () => void;
}

export const AdminMobileBottomNav: React.FC<AdminMobileBottomNavProps> = ({ onOpenMenu }) => {
  const { currentPath, navigate } = useAdminRouter();

  const items = [
    {
      label: 'داشبورد',
      icon: LayoutDashboard,
      path: '/admin/overview/dashboard',
      matchPrefix: '/admin/overview',
    },
    {
      label: 'سفارش‌ها',
      icon: ShoppingBag,
      path: '/admin/sales/orders',
      matchPrefix: '/admin/sales',
    },
    {
      label: 'آتلیه',
      icon: Users,
      path: '/admin/customers/directory',
      matchPrefix: '/admin/customers',
    },
    {
      label: 'انبار',
      icon: Box,
      path: '/admin/catalog/inventory',
      matchPrefix: '/admin/catalog',
    },
  ];

  return (
    <nav
      aria-label="نوار دسترسی سریع پایین موبایل"
      className="lg:hidden relative z-40 h-14 shrink-0 bg-[#110f0e]/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around px-2 font-sans"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          currentPath === item.path || currentPath.startsWith(item.matchPrefix);

        return (
          <button
            key={item.path}
            type="button"
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-colors cursor-pointer ${
              isActive ? 'text-[#eed29d]' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Icon size={18} className={isActive ? 'text-[#ba8d3d]' : ''} />
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </button>
        );
      })}

      {/* Menu / Drawer Toggle Button */}
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center gap-1 flex-1 py-1 text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
        aria-label="نمایش تمام بخش‌های منو"
      >
        <Menu size={18} />
        <span className="text-[10px] font-medium leading-none">کل بخش‌ها</span>
      </button>
    </nav>
  );
};
