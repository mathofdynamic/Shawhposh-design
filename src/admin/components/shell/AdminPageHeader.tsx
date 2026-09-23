import React from 'react';
import { ShieldAlert, RefreshCw, Download, Plus } from 'lucide-react';
import { useAdminRouter } from '../../router';
import { StaffRole } from '../../domain/types';
import { AdminIcon } from './AdminIcon';

export interface AdminPageHeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  currentRole?: StaffRole;
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  title,
  description,
  actions,
  currentRole,
}) => {
  const { activeRoute, activeGroup } = useAdminRouter();

  const displayTitle = title || activeRoute?.titleFa || 'میز کارگاه';
  const displayDescription = description || activeRoute?.descriptionFa || '';
  const isRestricted =
    currentRole &&
    activeRoute?.allowedRoles &&
    !activeRoute.allowedRoles.includes(currentRole);

  return (
    <div className="border-b border-white/10 pb-5 mb-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title & Description */}
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#ba8d3d]/15 text-[#ba8d3d] border border-[#ba8d3d]/30 shrink-0">
              <AdminIcon name={activeRoute?.iconName || 'LayoutGrid'} size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {displayTitle}
                </h1>
                {activeRoute?.titleEn && (
                  <span className="hidden sm:inline-block text-[11px] font-mono text-stone-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    {activeRoute.titleEn}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 leading-relaxed">
                {displayDescription}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* Role Restriction Banner if applicable */}
      {isRestricted && (
        <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="shrink-0 text-amber-400" />
            <span>
              <strong>شبیه‌سازی مجوز (Demo Role):</strong> در نقش فعال شما دسترسی کامل به این بخش محدود شده است. اعمال قطعی محدودیت‌های امنیتی در لایه سرور پیاده خواهد شد.
            </span>
          </div>
          <span className="text-[10px] bg-amber-500/20 px-2 py-0.5 rounded font-mono shrink-0">
            RBAC PROTOTYPE
          </span>
        </div>
      )}
    </div>
  );
};
