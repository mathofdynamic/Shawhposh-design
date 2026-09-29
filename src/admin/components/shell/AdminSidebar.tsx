import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Shield,
  PanelLeftClose,
  PanelLeft,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { ADMIN_GROUPS, ALL_ADMIN_ROUTES } from '../../router/routes';
import { AdminGroupId, AdminNavGroupDef, AdminRouteDef } from '../../router/types';
import { useAdminRouter } from '../../router';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { StaffRole } from '../../domain/types';
import { RoleKey } from '../../domain/rbac';
import { AdminIcon } from './AdminIcon';
import { toFaDigits } from '../../utils/formatters';

export interface AdminSidebarProps {
  currentRole: StaffRole;
  isCompact: boolean;
  onToggleCompact: () => void;
  onCloseMobileDrawer?: () => void;
  isMobileDrawer?: boolean;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentRole,
  isCompact,
  onToggleCompact,
  onCloseMobileDrawer,
  isMobileDrawer = false,
}) => {
  const { currentPath, activeRoute, navigate, goBackToStore } = useAdminRouter();
  const { state } = useAdminRepository();

  // Normalize legacy and modern roles for allowedRoles matching
  const normalizedRole: RoleKey =
    currentRole === 'super_admin'
      ? 'owner'
      : currentRole === 'designer_reviewer'
      ? 'production'
      : currentRole === 'production_operator'
      ? 'production'
      : currentRole === 'support_finance'
      ? 'finance'
      : (currentRole as RoleKey);

  // Collapsed group IDs state persisted in localStorage
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('shahpoosh_admin_collapsed_groups');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleGroup = (groupId: AdminGroupId) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      try {
        localStorage.setItem('shahpoosh_admin_collapsed_groups', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Badge counts derived from live database
  const badgeCounts = useMemo(() => {
    const pendingOrders = state.orders.filter(
      (o) => o.status === 'paid_processing' || o.status === 'in_production'
    ).length;
    const pendingDesigns = state.customDesigns.filter((d) => d.status === 'under_review').length;
    const lowStock = state.variants.filter((v) => v.onHandStock - v.reservedStock <= 3).length;
    const openTasks = state.tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length;
    const unverifiedPayments = state.payments.filter((p) => p.status === 'pending').length;

    return {
      pendingOrders,
      pendingDesigns,
      lowStock,
      openTasks,
      unverifiedPayments,
    };
  }, [state]);

  const getBadgeValue = (key?: string): number | null => {
    if (!key) return null;
    const count = (badgeCounts as Record<string, number>)[key];
    return count && count > 0 ? count : null;
  };

  return (
    <aside
      aria-label="ناوبری اصلی پنل مدیریت"
      className={`h-full flex flex-col bg-[#110f0e] border-l border-white/10 transition-all duration-300 select-none text-right font-sans ${
        isCompact && !isMobileDrawer ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand & Workshop identity */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
        {!isCompact || isMobileDrawer ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#ba8d3d] to-[#7f5c22] flex items-center justify-center text-stone-950 font-black text-sm shadow-md shrink-0">
              ش
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white tracking-wide truncate">
                شاه‌پوش · میز مدیریت
              </div>
              <div className="text-[10px] text-[#eed29d] tracking-wider truncate font-mono">
                WORKSHOP OPERATIONS
              </div>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-xl bg-gradient-to-br from-[#ba8d3d] to-[#7f5c22] flex items-center justify-center text-stone-950 font-black text-sm shadow-md">
            ش
          </div>
        )}

        {!isMobileDrawer && (
          <button
            type="button"
            onClick={onToggleCompact}
            title={isCompact ? 'گسترش منو' : 'جمع‌کردن منو'}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            {isCompact ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>

      {/* Navigation Groups List */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 focus:outline-none">
        {ADMIN_GROUPS.map((group) => {
          const isGroupCollapsed = Boolean(collapsedGroups[group.id]) && !isCompact;
          const hasActiveChild = group.routes.some((r) => r.path === currentPath);

          return (
            <div key={group.id} className="space-y-1">
              {/* Group Header */}
              {!isCompact || isMobileDrawer ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    hasActiveChild ? 'text-[#eed29d]' : 'text-stone-400 hover:text-stone-200'
                  }`}
                  aria-expanded={!isGroupCollapsed}
                >
                  <div className="flex items-center gap-2">
                    <AdminIcon name={group.iconName} size={15} className="text-[#ba8d3d]" />
                    <span className="text-[11px] font-semibold">{group.titleFa}</span>
                  </div>
                  <ChevronDown
                    size={13}
                    className={`text-stone-500 transition-transform duration-200 ${
                      isGroupCollapsed ? '-rotate-90' : ''
                    }`}
                  />
                </button>
              ) : (
                <div
                  className="w-full text-center py-1 text-stone-500 border-b border-white/5 mb-1"
                  title={group.titleFa}
                >
                  <AdminIcon name={group.iconName} size={16} className="mx-auto text-[#ba8d3d]" />
                </div>
              )}

              {/* Group Routes */}
              {(!isGroupCollapsed || isCompact) && (
                <div className="space-y-0.5">
                  {group.routes.map((route) => {
                    const isActive = route.path === currentPath;
                    const badgeVal = getBadgeValue(route.badgeKey);
                    const isRestrictedForRole =
                      normalizedRole !== 'owner' &&
                      currentRole !== 'super_admin' &&
                      route.allowedRoles &&
                      !route.allowedRoles.includes(currentRole) &&
                      !route.allowedRoles.includes(normalizedRole as any);

                    return (
                      <button
                        key={route.id}
                        type="button"
                        onClick={() => {
                          navigate(route.path);
                          if (isMobileDrawer && onCloseMobileDrawer) {
                            onCloseMobileDrawer();
                          }
                        }}
                        title={
                          isCompact && !isMobileDrawer
                            ? `${route.titleFa}${
                                isRestrictedForRole ? ' (محدود به سایر نقش‌ها)' : ''
                              }`
                            : undefined
                        }
                        className={`w-full group flex items-center justify-between rounded-xl text-right transition-all cursor-pointer relative ${
                          isCompact && !isMobileDrawer
                            ? 'px-0 py-2.5 justify-center'
                            : 'px-3 py-2 text-xs'
                        } ${
                          isActive
                            ? 'bg-[#ba8d3d]/20 text-white font-bold border border-[#ba8d3d]/40 shadow-sm'
                            : 'text-stone-400 hover:text-stone-100 hover:bg-white/5'
                        } ${isRestrictedForRole ? 'opacity-70' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        {/* Active Gold Indicator Bar */}
                        {isActive && (
                          <span className="absolute right-0 top-1.5 bottom-1.5 w-1 bg-[#ba8d3d] rounded-l-full" />
                        )}

                        <div className="flex items-center gap-2.5 min-w-0">
                          <AdminIcon
                            name={route.iconName}
                            size={16}
                            className={`shrink-0 transition-colors ${
                              isActive
                                ? 'text-[#ba8d3d]'
                                : 'text-stone-400 group-hover:text-stone-200'
                            }`}
                          />
                          {(!isCompact || isMobileDrawer) && (
                            <span className="truncate">{route.shortTitleFa}</span>
                          )}
                        </div>

                        {(!isCompact || isMobileDrawer) && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {badgeVal !== null && (
                              <span
                                className={`text-[10px] font-fanum font-bold px-1.5 py-0.2 rounded-full ${
                                  route.badgeKey === 'lowStock'
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : 'bg-[#ba8d3d]/25 text-[#eed29d] border border-[#ba8d3d]/30'
                                }`}
                              >
                                {toFaDigits(badgeVal)}
                              </span>
                            )}
                            {isRestrictedForRole && (
                              <span
                                title="این بخش در نقش کاربری انتخابی نیازمند ترفیع مجوز است."
                                className="text-[9px] text-amber-400/70"
                              >
                                🔒
                              </span>
                            )}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Storefront Link */}
      <div className="p-3 border-t border-white/10 shrink-0 bg-[#0e0d0c]">
        {(!isCompact || isMobileDrawer) ? (
          <button
            type="button"
            onClick={goBackToStore}
            className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 text-stone-300 hover:text-white rounded-xl text-xs transition-colors cursor-pointer"
          >
            <span className="font-medium">بازگشت به ویترین فروشگاه</span>
            <ExternalLink size={13} className="text-[#ba8d3d]" />
          </button>
        ) : (
          <button
            type="button"
            onClick={goBackToStore}
            title="بازگشت به ویترین فروشگاه"
            className="w-full p-2 text-stone-400 hover:text-white hover:bg-white/5 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
          >
            <ExternalLink size={15} className="text-[#ba8d3d]" />
          </button>
        )}
      </div>
    </aside>
  );
};
