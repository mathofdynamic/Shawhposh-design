import React from 'react';
import { ShieldAlert, ArrowRight, Lock, KeyRound } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAdminRouter } from '../../router';
import { RoleKey, ROLE_DEFINITIONS } from '../../domain/rbac';

export interface ForbiddenViewProps {
  currentRole: RoleKey;
  requiredRoles?: RoleKey[];
  moduleName?: string;
  onSwitchRole?: (role: RoleKey) => void;
}

export const ForbiddenView: React.FC<ForbiddenViewProps> = ({
  currentRole,
  requiredRoles = ['owner'],
  moduleName = 'این بخش عملیاتی',
  onSwitchRole,
}) => {
  const { navigate } = useAdminRouter();
  const currentRoleDef = ROLE_DEFINITIONS[currentRole] || ROLE_DEFINITIONS.owner;

  return (
    <div className="bg-[#131211] border border-amber-500/20 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto my-8 space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
        <Lock size={32} />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono">
          <ShieldAlert size={14} />
          <span>HTTP 403 · FORBIDDEN ACCESS</span>
        </div>
        <h2 className="text-xl font-bold text-white">دسترسی مجاز نمی‌باشد (سطح اختیارات ناکافی)</h2>
        <p className="text-xs sm:text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
          دسترسی به {moduleName} بر اساس سیاست‌های کنترل دسترسی کارگاه شاه‌پوش (RBAC Least Privilege) برای نقش فعلی شما مسدود شده است.
        </p>
      </div>

      {/* Role explanation */}
      <div className="p-4 rounded-2xl bg-[#0c0b0a] border border-white/5 text-right space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-stone-400">نقش فعال در این نشست:</span>
          <span className="text-amber-400 font-bold">{currentRoleDef.titleFa}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-stone-400">نقش‌های واجد شرایط:</span>
          <span className="text-[#eed29d] font-mono">
            {requiredRoles.map((r) => ROLE_DEFINITIONS[r]?.titleEn || r).join(', ')}
          </span>
        </div>
        <div className="pt-2 border-t border-white/5 text-[11px] text-stone-500 leading-relaxed">
          * این صفحه عمداً جهت شفافیت امنیتی نمایش داده شده است و از پنهان‌سازی گیج‌کننده لینک‌های ناوبری خودداری شده است.
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button variant="outline" size="sm" onClick={() => navigate('/admin/overview/dashboard')}>
          بازگشت به داشبورد اصلی
        </Button>
        {onSwitchRole && currentRole !== 'owner' && (
          <Button
            variant="brass"
            size="sm"
            onClick={() => onSwitchRole('owner')}
            className="flex items-center gap-1.5"
          >
            <KeyRound size={14} />
            <span>سوییچ دمو به نقش مالک کارگاه (Owner)</span>
          </Button>
        )}
      </div>
    </div>
  );
};
