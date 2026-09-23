import React, { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, Box, ShoppingBag, Palette, RotateCcw, TrendingUp, RefreshCw } from 'lucide-react';
import { useAdminRouter } from '../../router';
import { useAdminRepository } from '../../domain/useAdminRepository';

export interface QuickActionsMenuProps {
  onOpenResetConfirm: () => void;
}

export const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({ onOpenResetConfirm }) => {
  const { navigate } = useAdminRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const actions = [
    {
      label: 'پردازش و ثبت سفارش‌ها',
      icon: ShoppingBag,
      onClick: () => {
        navigate('/admin/sales/orders');
        setIsOpen(false);
      },
    },
    {
      label: 'اصلاح سریع موجودی انبار (SKU)',
      icon: Box,
      onClick: () => {
        navigate('/admin/catalog/inventory');
        setIsOpen(false);
      },
    },
    {
      label: 'داوری فنی طرح سفارشی آتلیه',
      icon: Palette,
      onClick: () => {
        navigate('/admin/custom-studio/approval');
        setIsOpen(false);
      },
    },
    {
      label: 'ثبت استرداد و مرجوعی کالا',
      icon: RotateCcw,
      onClick: () => {
        navigate('/admin/sales/returns');
        setIsOpen(false);
      },
    },
    {
      label: 'تحلیل آمار و دفاتر مالی',
      icon: TrendingUp,
      onClick: () => {
        navigate('/admin/sales/analytics');
        setIsOpen(false);
      },
    },
    {
      label: 'بازنشانی پایگاه داده نمایشی',
      icon: RefreshCw,
      danger: true,
      onClick: () => {
        setIsOpen(false);
        onOpenResetConfirm();
      },
    },
  ];

  return (
    <div className="relative font-sans" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#ba8d3d]/15 hover:bg-[#ba8d3d]/25 border border-[#ba8d3d]/40 text-[#eed29d] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Plus size={14} />
        <span className="hidden md:inline">اقدام سریع</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-56 bg-[#141210] border border-white/10 rounded-xl shadow-xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1.5 text-[10px] text-stone-400 font-bold border-b border-white/5 uppercase tracking-wider text-right">
            عملیات فوری کارگاه
          </div>
          {actions.map((act, i) => {
            const Icon = act.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={act.onClick}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-right transition-colors cursor-pointer ${
                  act.danger
                    ? 'text-rose-400 hover:bg-rose-500/10 border-t border-white/5 mt-1'
                    : 'text-stone-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={14} className={act.danger ? 'text-rose-400' : 'text-[#ba8d3d]'} />
                <span>{act.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
