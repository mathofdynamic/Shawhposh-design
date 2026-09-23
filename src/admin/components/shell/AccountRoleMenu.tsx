import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ShieldAlert, Check, LogOut, Info } from 'lucide-react';
import { StaffRole, StaffMember } from '../../domain/types';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router';

export interface AccountRoleMenuProps {
  currentRole: StaffRole;
  onRoleChange: (role: StaffRole) => void;
}

const ROLE_DEFINITIONS: {
  role: StaffRole;
  name: string;
  titleFa: string;
  avatarSeed: string;
  scopeDescription: string;
}[] = [
  {
    role: 'super_admin',
    name: 'کیوان دادگر',
    titleFa: 'مدیر ارشد کارگاه',
    avatarSeed: 'keyvan',
    scopeDescription: 'دسترسی نامحدود به تمامی ۸ بخش، گزارش‌های مالی و سیستم',
  },
  {
    role: 'designer_reviewer',
    name: 'سهراب زارع',
    titleFa: 'کارشناس ارشد آتلیه و گرافیک',
    avatarSeed: 'sohrab',
    scopeDescription: 'داوری فایل‌های چاپی، بررسی کیفیت و تایید ارسال به خط DTG',
  },
  {
    role: 'production_operator',
    name: 'وحید رضوانی',
    titleFa: 'سرپرست خط چاپ مستقیم و انبار',
    avatarSeed: 'vahid',
    scopeDescription: 'اپراتوری دستگاه‌های چاپ Brother، اصلاح موجودی و آزمون کیفی',
  },
  {
    role: 'support_finance',
    name: 'مریم باطنی',
    titleFa: 'کارشناس پشتیبانی و امور مالی',
    avatarSeed: 'maryam',
    scopeDescription: 'رسیدگی به تراکنش‌های درگاه، استرداد وجوه و تیکت‌های خریداران',
  },
];

export const AccountRoleMenu: React.FC<AccountRoleMenuProps> = ({ currentRole, onRoleChange }) => {
  const { goBackToStore } = useAdminRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const activeStaff = ROLE_DEFINITIONS.find((r) => r.role === currentRole) || ROLE_DEFINITIONS[0];

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
        <div className="w-7 h-7 rounded-lg bg-[#ba8d3d]/20 border border-[#ba8d3d]/40 flex items-center justify-center text-xs font-bold text-[#eed29d]">
          {activeStaff.name.slice(0, 1)}
        </div>
        <div className="hidden sm:block text-right">
          <div className="text-xs font-bold text-white leading-none">{activeStaff.name}</div>
          <div className="text-[10px] text-[#eed29d] mt-0.5">{activeStaff.titleFa}</div>
        </div>
        <ChevronDown size={13} className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-[#141210] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
          {/* Header Info */}
          <div className="px-4 py-2.5 border-b border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-400">نشست شبیه‌سازی نقش کاربری</span>
              <span className="text-[10px] bg-[#ba8d3d]/20 text-[#eed29d] border border-[#ba8d3d]/30 px-1.5 py-0.5 rounded font-mono">
                DEMO SESSION
              </span>
            </div>
            <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
              برای ارزیابی رابط کاربری، می‌توانید بین نقش‌های فرضی کارگاه جابجا شوید.
            </p>
          </div>

          {/* Role Selection List */}
          <div className="p-2 space-y-1">
            {ROLE_DEFINITIONS.map((r) => {
              const isSelected = r.role === currentRole;
              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => {
                    onRoleChange(r.role);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-start gap-3 p-2.5 rounded-xl text-right transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#ba8d3d]/15 border border-[#ba8d3d]/40'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-[#ba8d3d] text-stone-950 font-bold'
                        : 'bg-white/10 text-stone-300'
                    }`}
                  >
                    {r.name.slice(0, 1)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{r.name}</span>
                      {isSelected && <Check size={14} className="text-[#ba8d3d]" />}
                    </div>
                    <span className="text-[11px] text-[#eed29d] block mt-0.5">{r.titleFa}</span>
                    <span className="text-[10px] text-stone-400 block mt-0.5 leading-normal">
                      {r.scopeDescription}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Disclaimer Box */}
          <div className="mx-2 p-2.5 bg-stone-900/80 border border-stone-800 rounded-xl text-[10px] text-stone-400 flex items-start gap-2">
            <Info size={14} className="text-[#ba8d3d] shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>توجه توسعه:</strong> انتخاب نقش صرفاً برای بررسی وضعیت بصری و راهبری پنل است. اعمال قطعی مجوزها و احراز هویت واقعی در لایه سرور/بک‌اند صورت خواهد گرفت.
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
