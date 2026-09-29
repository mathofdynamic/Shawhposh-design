import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ShieldAlert, Check, LogOut, Info, ShieldCheck } from 'lucide-react';
import { StaffRole } from '../../domain/types';
import { RoleKey, ROLE_DEFINITIONS as RBAC_ROLES } from '../../domain/rbac';
import { useAdminRouter } from '../../router';

export interface AccountRoleMenuProps {
  currentRole: StaffRole;
  onRoleChange: (role: StaffRole) => void;
}

const ROLES_ORDER: RoleKey[] = [
  'owner',
  'store_manager',
  'finance',
  'production',
  'inventory',
  'support',
];

export const AccountRoleMenu: React.FC<AccountRoleMenuProps> = ({ currentRole, onRoleChange }) => {
  const { goBackToStore } = useAdminRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Normalize legacy roles
  const normalizedKey: RoleKey =
    currentRole === 'super_admin'
      ? 'owner'
      : currentRole === 'designer_reviewer'
      ? 'production'
      : currentRole === 'production_operator'
      ? 'production'
      : currentRole === 'support_finance'
      ? 'finance'
      : (currentRole as RoleKey);

  const activeStaff = RBAC_ROLES[normalizedKey] || RBAC_ROLES.owner;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative font-sans" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors cursor-pointer text-right"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div
          style={{ backgroundColor: `${activeStaff.colorHex}25`, borderColor: `${activeStaff.colorHex}50` }}
          className="w-7 h-7 rounded-lg border flex items-center justify-center text-xs font-bold text-white shrink-0"
        >
          {activeStaff.representativeName.slice(0, 1)}
        </div>
        <div className="hidden sm:block text-right">
          <div className="text-xs font-bold text-white leading-none">{activeStaff.representativeName}</div>
          <div className="text-[10px] text-[#eed29d] mt-0.5">{activeStaff.titleEn}</div>
        </div>
        <ChevronDown size={13} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-[#141210] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
          {/* Header Info */}
          <div className="px-4 py-2.5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-300">سوییچر شبیه‌سازی نقش و پرسنل (Demo RBAC)</span>
              <span className="text-[10px] bg-[#ba8d3d]/20 text-[#eed29d] border border-[#ba8d3d]/30 px-1.5 py-0.5 rounded font-mono">
                SIMULATION
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
              تغییر نقش فوری جهت اعتبارسنجی حداقل اختیارات (Least Privilege) و نمایش وضعیت Forbidden برای صفحات غیرمجاز.
            </p>
          </div>

          {/* Role Selection List */}
          <div className="p-2 space-y-1 max-h-[60vh] overflow-y-auto">
            {ROLES_ORDER.map((key) => {
              const r = RBAC_ROLES[key];
              const isSelected = normalizedKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    onRoleChange(key);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-right transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#ba8d3d]/15 border border-[#ba8d3d]/40'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div
                    style={{ backgroundColor: isSelected ? r.colorHex : 'rgba(255,255,255,0.08)' }}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-stone-950 font-bold"
                  >
                    {r.representativeName.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{r.representativeName}</span>
                      {isSelected && <Check size={14} className="text-[#ba8d3d]" />}
                    </div>
                    <span className="text-[11px] text-[#eed29d] font-bold block mt-0.5">{r.titleFa}</span>
                    <span className="text-[10px] text-stone-400 block mt-0.5 leading-normal">
                      {r.descriptionFa}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Disclaimer Box */}
          <div className="mx-2 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[10px] text-amber-300 flex items-start gap-2">
            <Info size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>بیانیه شفافیت امنیتی:</strong> کنترل‌های رابط کاربری (Frontend Gates) تدابیر نهایی امنیتی نیستند؛ کنترل دسترسی واقعی بر پایه توکن و قوانین امنیتی در لایه سرور اجرا می‌گردد.
            </span>
          </div>

          {/* Back to store */}
          <div className="p-2 border-t border-white/5 mt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                goBackToStore();
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-stone-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut size={13} className="text-stone-400" />
              <span>خروج از پنل و بازگشت به ویترین فروشگاه</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
