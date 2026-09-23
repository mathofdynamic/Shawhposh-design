import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, ChevronLeft, AlertTriangle, FileCheck, ShoppingBag, CheckSquare } from 'lucide-react';
import { useAdminRouter } from '../../router';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { toFaDigits } from '../../utils/formatters';

export const NotificationsPopover: React.FC = () => {
  const { navigate } = useAdminRouter();
  const { state } = useAdminRepository();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const notifications = useMemo(() => {
    const list: {
      id: string;
      title: string;
      description: string;
      icon: any;
      path: string;
      colorClass: string;
      timeAgo: string;
    }[] = [];

    const pendingDesigns = state.customDesigns.filter((d) => d.status === 'under_review');
    if (pendingDesigns.length > 0) {
      list.push({
        id: 'designs',
        title: `${toFaDigits(pendingDesigns.length)} طرح در صف داوری آتلیه`,
        description: 'فایل‌های گرافیکی کاربران نیازمند بررسی رزولوشن و تایید ارسال به خط DTG هستند.',
        icon: FileCheck,
        path: '/admin/custom-studio/approval',
        colorClass: 'text-amber-400 bg-amber-400/10',
        timeAgo: 'اقدام معوق',
      });
    }

    const lowStock = state.variants.filter((v) => v.onHandStock - v.reservedStock <= 3);
    if (lowStock.length > 0) {
      list.push({
        id: 'low-stock',
        title: `${toFaDigits(lowStock.length)} کد کالا در وضعیت موجودی بحرانی`,
        description: 'موجودی قابل فروش به زیر آستانه امن رسیده و نیازمند سفارش پارچه است.',
        icon: AlertTriangle,
        path: '/admin/catalog/inventory',
        colorClass: 'text-rose-400 bg-rose-400/10',
        timeAgo: 'انبار مرکزی',
      });
    }

    const openTasks = state.tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress');
    if (openTasks.length > 0) {
      list.push({
        id: 'tasks',
        title: `${toFaDigits(openTasks.length)} وظیفه ارجاع‌شده در کارتابل پرسنل`,
        description: 'وظایف شیفت کاری امروز نیازمند پیگیری توسط اپراتورها و همکاران است.',
        icon: CheckSquare,
        path: '/admin/team/tasks',
        colorClass: 'text-blue-400 bg-blue-400/10',
        timeAgo: 'کارتابل امروز',
      });
    }

    const recentOrders = state.orders.slice(0, 2);
    recentOrders.forEach((o) => {
      list.push({
        id: `order-${o.id}`,
        title: `سفارش جدید ${o.id}`,
        description: `مشتری: ${o.customerName} (${o.city}) · مبلغ: ${toFaDigits(o.totalTomans.toLocaleString())} تومان`,
        icon: ShoppingBag,
        path: '/admin/sales/orders',
        colorClass: 'text-emerald-400 bg-emerald-400/10',
        timeAgo: 'سفارش آنلاین',
      });
    });

    return list;
  }, [state]);

  const totalCount = notifications.length;

  return (
    <div className="relative font-sans" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 text-stone-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
        aria-label="اعلان‌ها و هشدارهای کارگاه"
      >
        <Bell size={17} />
        {totalCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ba8d3d] ring-2 ring-[#131211]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-[#141210] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 text-right animate-in fade-in zoom-in-95 duration-150">
          <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold text-white">اعلان‌های کارگاه شاه‌پوش</span>
            <span className="text-[10px] text-stone-400 bg-white/5 px-2 py-0.5 rounded">
              {toFaDigits(totalCount)} هشدار فعال
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-1">
            {notifications.map((n) => {
              const Icon = n.icon;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    navigate(n.path);
                    setIsOpen(false);
                  }}
                  className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 text-right transition-colors cursor-pointer border border-transparent hover:border-white/5"
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${n.colorClass}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate">{n.title}</span>
                      <span className="text-[10px] text-stone-500 shrink-0 font-fanum">{n.timeAgo}</span>
                    </div>
                    <p className="text-[11px] text-stone-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {n.description}
                    </p>
                  </div>
                  <ChevronLeft size={14} className="text-stone-600 shrink-0 mt-2" />
                </button>
              );
            })}
          </div>

          <div className="px-4 py-2 border-t border-white/5 text-center">
            <button
              type="button"
              onClick={() => {
                navigate('/admin/overview/action-center');
                setIsOpen(false);
              }}
              className="text-xs text-[#eed29d] hover:text-[#ba8d3d] transition-colors"
            >
              مشاهده مرکز اقدام فوری کارگاه ←
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
