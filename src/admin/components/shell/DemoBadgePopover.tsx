import React, { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Sparkles,
  Info,
} from 'lucide-react';
import { useAdminRouter } from '../../router';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { verifyDomainInvariants } from '../../domain/invariants';
import { toFaDigits } from '../../utils/formatters';

export interface DemoBadgePopoverProps {
  onOpenResetConfirm?: () => void;
  onOpenInvariantsModal?: () => void;
}

export const DemoBadgePopover: React.FC<DemoBadgePopoverProps> = ({
  onOpenResetConfirm,
  onOpenInvariantsModal,
}) => {
  const { navigate } = useAdminRouter();
  const { state, demoClock } = useAdminRepository();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const invariantReport = verifyDomainInvariants(state);
  const allPassed = invariantReport.results.every((r) => r.passed);
  const passedCount = invariantReport.results.filter((r) => r.passed).length;
  const totalCount = invariantReport.results.length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative font-sans" ref={ref}>
      {/* Compact Demo Badge Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-[#eed29d] rounded-lg text-xs font-medium transition-colors cursor-pointer"
        aria-label="اطلاعات نسخه در حال اتصال و وضعیت داده‌ها"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="hidden sm:inline">نسخه در حال اتصال</span><span className="sm:hidden">در حال اتصال</span>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-88 bg-[#141210] border border-white/10 rounded-xl shadow-2xl p-4 z-50 text-right animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#ba8d3d]" />
              <span className="text-xs font-bold text-white">کاتالوگ و موجودی واقعی؛ سایر بخش‌ها دمو</span>
            </div>
            <span className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/25 px-1.5 py-0.5 rounded font-mono">
              SANDBOX
            </span>
          </div>

          {/* Description */}
          <p className="text-[12px] text-stone-300 leading-relaxed">
            محصولات، دسته‌بندی‌ها، تنوع‌های کالا و موجودی روی سرور ذخیره می‌شوند.
            سفارش‌ها، پرداخت‌ها و سایر ماژول‌ها هنوز نمایشی هستند. بازنشانی دمو فقط داده‌های نمایشی مرورگر را تغییر می‌دهد.
          </p>

          {/* Reference Time */}
          <div className="p-2.5 bg-white/5 border border-white/5 rounded-lg flex items-center justify-between text-xs">
            <span className="text-stone-400 flex items-center gap-1.5">
              <Calendar size={13} className="text-[#ba8d3d]" />
              <span>زمان مرجع شبیه‌ساز:</span>
            </span>
            <span className="font-fanum text-white font-medium">۲ مهر ۱۴۰۵ · {demoClock}</span>
          </div>

          {/* Invariant Health */}
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck size={14} className="shrink-0" />
              <span className="font-medium">
                ناوردایی‌ها: {toFaDigits(passedCount)} از {toFaDigits(totalCount)} پاس
              </span>
            </div>
            {onOpenInvariantsModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenInvariantsModal();
                }}
                className="text-[11px] text-[#eed29d] hover:underline cursor-pointer"
              >
                بررسی جزئیات
              </button>
            )}
          </div>

          {/* Actions & Links */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            {onOpenResetConfirm && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenResetConfirm();
                }}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors py-1 px-2 rounded-lg hover:bg-rose-500/10 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>ریست داده‌های دمو</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/admin/system/advanced-tools');
              }}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-[#eed29d] transition-colors py-1 px-2 rounded-lg hover:bg-white/5 cursor-pointer ml-auto"
            >
              <span>ابزارهای پیشرفته</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
