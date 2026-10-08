import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, PanelLeft, PanelLeftClose } from 'lucide-react';
import { ADMIN_GROUPS } from '../../router/routes';
import type { AdminGroupId, StaffRole } from '../../router/types';
import { useAdminRouter } from '../../router';
import { AdminIcon } from './AdminIcon';

export interface AdminSidebarProps {
  currentRole: StaffRole;
  isCompact: boolean;
  onToggleCompact: () => void;
  onCloseMobileDrawer?: () => void;
  isMobileDrawer?: boolean;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentRole, isCompact, onToggleCompact, onCloseMobileDrawer, isMobileDrawer = false }) => {
  const { currentPath, activeRoute, activeGroup, navigate, goBackToStore } = useAdminRouter();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const value = localStorage.getItem('shahpoosh_admin_sidebar_expanded_groups');
      return value ? JSON.parse(value) as Record<string, boolean> : {};
    } catch { return {}; }
  });

  const currentGroup = activeRoute?.groupId || activeGroup?.id || 'overview';
  const navigableGroups = useMemo(() => ADMIN_GROUPS.map(group => ({
    ...group,
    routes: group.routes.filter(route => route.showInNav !== false && !route.isDetail && (!route.allowedRoles || route.allowedRoles.includes(currentRole))),
  })).filter(group => group.routes.length > 0), [currentRole]);

  useEffect(() => {
    if (expandedGroups[currentGroup] === false) {
      setExpandedGroups(previous => {
        const next = { ...previous, [currentGroup]: true };
        try { localStorage.setItem('shahpoosh_admin_sidebar_expanded_groups', JSON.stringify(next)); } catch { /* preference is optional */ }
        return next;
      });
    }
  }, [currentGroup, expandedGroups]);

  const toggleGroup = (groupId: AdminGroupId) => setExpandedGroups(previous => {
    const currentlyExpanded = previous[groupId] ?? groupId === currentGroup;
    const next = { ...previous, [groupId]: !currentlyExpanded };
    try { localStorage.setItem('shahpoosh_admin_sidebar_expanded_groups', JSON.stringify(next)); } catch { /* preference is optional */ }
    return next;
  });

  return (
    <aside aria-label="ناوبری پنل مدیریت" className={`flex h-full flex-col select-none border-l border-white/10 bg-[#110f0e] text-right font-sans transition-all duration-300 ${isCompact && !isMobileDrawer ? 'w-16' : 'w-64'}`}>
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
        {(!isCompact || isMobileDrawer) ? <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#ba8d3d] text-sm font-black text-stone-950">ش</span><div className="min-w-0"><div className="truncate text-xs font-bold text-white">شهپوش · مدیریت</div><div className="truncate text-[10px] tracking-wider text-[#eed29d]">مدیریت فروشگاه</div></div></div> : <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-[#ba8d3d] text-sm font-black text-stone-950">ش</span>}
        {!isMobileDrawer && <button type="button" onClick={onToggleCompact} title={isCompact ? 'گسترش منو' : 'جمع کردن منو'} className="rounded-lg p-1.5 text-stone-400 hover:bg-white/5 hover:text-white">{isCompact ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}</button>}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {navigableGroups.map(group => {
          const active = group.id === currentGroup;
          const expanded = !isCompact && (expandedGroups[group.id] ?? active);
          return <section key={group.id} className="space-y-1">
            {(!isCompact || isMobileDrawer) ? <button type="button" onClick={() => toggleGroup(group.id)} aria-expanded={expanded} className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-bold ${active ? 'text-[#eed29d]' : 'text-stone-400 hover:text-stone-200'}`}><span className="flex items-center gap-2"><AdminIcon name={group.iconName} size={15} className="text-[#ba8d3d]" />{group.titleFa}</span><ChevronDown size={13} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} /></button> : <div title={group.titleFa} className="mb-1 border-b border-white/5 py-1 text-center"><AdminIcon name={group.iconName} size={16} className="mx-auto text-[#ba8d3d]" /></div>}
            {(expanded || isCompact) && <div className="space-y-0.5">{group.routes.map(route => {
              const isActive = route.path === currentPath || (route.isDetail && currentPath.startsWith(route.path.split('/:')[0] + '/'));
              return <button key={route.id} type="button" title={isCompact && !isMobileDrawer ? route.titleFa : undefined} onClick={() => { navigate(route.path); if (isMobileDrawer) onCloseMobileDrawer?.(); }} aria-current={isActive ? 'page' : undefined} className={`relative flex w-full items-center rounded-xl text-right transition-colors ${isCompact && !isMobileDrawer ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2 text-xs'} ${isActive ? 'border border-[#ba8d3d]/40 bg-[#ba8d3d]/20 font-bold text-white' : 'text-stone-400 hover:bg-white/5 hover:text-stone-100'}`}>
                {isActive && <span className="absolute right-0 top-1.5 bottom-1.5 w-1 rounded-l-full bg-[#ba8d3d]" />}
                <AdminIcon name={route.iconName} size={16} className={isActive ? 'text-[#ba8d3d]' : 'text-stone-400'} />
                {(!isCompact || isMobileDrawer) && <span className="truncate">{route.shortTitleFa}</span>}
              </button>;
            })}</div>}
          </section>;
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 bg-[#0e0d0c] p-3">
        <button type="button" onClick={goBackToStore} title={isCompact && !isMobileDrawer ? 'بازگشت به فروشگاه' : undefined} className={`flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-xs text-stone-300 transition-colors hover:bg-white/10 hover:text-white ${isCompact && !isMobileDrawer ? 'justify-center px-2' : ''}`}>
          {(!isCompact || isMobileDrawer) && <span>بازگشت به فروشگاه</span>}<ExternalLink size={14} className="text-[#ba8d3d]" />
        </button>
      </div>
    </aside>
  );
};
