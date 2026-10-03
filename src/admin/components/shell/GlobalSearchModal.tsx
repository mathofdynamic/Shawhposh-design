import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, ChevronLeft, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';
import { useAdminRouter } from '../../router';
import { ALL_ADMIN_ROUTES } from '../../router/routes';
import { AdminRouteDef } from '../../router/types';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import { AdminIcon } from './AdminIcon';
import { toFaDigits } from '../../utils/formatters';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResultItem {
  id: string;
  type: 'route' | 'order' | 'product' | 'customer';
  title: string;
  subtitle: string;
  path: string;
  iconName?: string;
  badgeText?: string;
  meta?: string;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const { navigate } = useAdminRouter();
  const { state } = useCatalogAdmin();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard shortcut listener (Ctrl+K / Cmd+K / Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Compute search results
  const results: SearchResultItem[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const navRoutes = ALL_ADMIN_ROUTES.filter(
      (r) => r.showInNav !== false && !r.isDetail && !r.path.includes(':') && !r.devOnly
    );

    if (!q) {
      // Default recommended quick links
      return navRoutes.slice(0, 6).map((r) => ({
        id: `route-${r.id}`,
        type: 'route',
        title: r.titleFa,
        subtitle: r.descriptionFa,
        path: r.path,
        iconName: r.iconName,
        badgeText: 'بخش سیستم',
      }));
    }

    const items: SearchResultItem[] = [];

    // 1. Search in Routes
    navRoutes.forEach((r) => {
      const match =
        r.titleFa.toLowerCase().includes(q) ||
        r.titleEn.toLowerCase().includes(q) ||
        r.descriptionFa.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q);
      if (match) {
        items.push({
          id: `route-${r.id}`,
          type: 'route',
          title: r.titleFa,
          subtitle: `${r.titleEn} · ${r.path}`,
          path: r.path,
          iconName: r.iconName,
          badgeText: 'صفحه ناوبری',
        });
      }
    });

    // 2. Search in Orders (up to 4)
    state.orders
      .filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q) ||
          o.city.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .forEach((o) => {
        items.push({
          id: `order-${o.id}`,
          type: 'order',
          title: `سفارش ${o.id} · ${o.customerName}`,
          subtitle: `شهر: ${o.city} · مبلغ: ${toFaDigits(o.totalTomans.toLocaleString())} تومان`,
          path: '/admin/sales/orders',
          iconName: 'ShoppingBag',
          badgeText: o.status === 'in_production' ? 'خط چاپ' : 'سفارش',
        });
      });

    // 3. Search in Variants / Products (up to 4)
    state.variants
      .filter((v) => v.sku.toLowerCase().includes(q) || v.colorName.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((v) => {
        items.push({
          id: `variant-${v.sku}`,
          type: 'product',
          title: `${v.sku} · ${v.colorName} (سایز ${v.size})`,
          subtitle: `موجودی فیزیکی: ${toFaDigits(v.onHandStock)} · رزرو: ${toFaDigits(v.reservedStock)}`,
          path: '/admin/catalog/variants',
          iconName: 'Box',
          badgeText: 'انبار کالا',
        });
      });

    // 4. Search in Customers (up to 3)
    state.customers
      .filter((c) => c.fullName.toLowerCase().includes(q) || c.phone.includes(q) || c.city.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((c) => {
        items.push({
          id: `customer-${c.id}`,
          type: 'customer',
          title: `${c.fullName} (${c.city})`,
          subtitle: `تعداد سفارشات: ${toFaDigits(c.totalOrdersCount)} · سطح: ${c.tag === 'vip' ? 'VIP' : c.tag}`,
          path: '/admin/customers/directory',
          iconName: 'Users',
          badgeText: 'مشتری',
        });
      });

    return items;
  }, [query, state]);

  // Handle keyboard list navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[selectedIndex];
      if (target) {
        navigate(target.path);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#141210] border border-[#ba8d3d]/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-right font-sans"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-[#181614]">
          <Search size={18} className="text-[#ba8d3d] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="جستجوی همه‌جانبه در صفحات، سفارش‌ها، مشتریان و کدهای تنوع..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-stone-500 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="text-stone-400 hover:text-white p-1 rounded transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <span className="hidden sm:inline-block text-[10px] font-mono text-stone-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs">
              <p>هیچ نتیجه‌ای متناسب با «{query}» یافت نشد.</p>
              <p className="text-stone-600 mt-1">املا یا نام بخش دیگری را امتحان نمایید.</p>
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-right transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#ba8d3d]/15 border border-[#ba8d3d]/40 text-white'
                      : 'hover:bg-white/5 text-stone-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isSelected ? 'bg-[#ba8d3d] text-stone-950' : 'bg-white/5 text-stone-400'
                      }`}
                    >
                      <AdminIcon name={item.iconName || 'Folder'} size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold truncate text-white">{item.title}</span>
                        {item.badgeText && (
                          <span className="text-[10px] bg-white/5 text-[#eed29d] border border-white/10 px-1.5 py-0.5 rounded">
                            {item.badgeText}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-400 truncate block mt-0.5">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pr-2">
                    {isSelected && (
                      <span className="text-[10px] text-[#eed29d] flex items-center gap-1">
                        انتخاب <CornerDownLeft size={11} />
                      </span>
                    )}
                    <ChevronLeft size={14} className="text-stone-600" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-[#0e0d0c] border-t border-white/10 flex items-center justify-between text-[11px] text-stone-500">
          <div className="flex items-center gap-3">
            <span>
              حرکت با کلیدهای <kbd className="font-mono bg-white/5 px-1 py-0.5 rounded">↑</kbd>{' '}
              <kbd className="font-mono bg-white/5 px-1 py-0.5 rounded">↓</kbd>
            </span>
            <span>
              انتخاب با <kbd className="font-mono bg-white/5 px-1 py-0.5 rounded">Enter</kbd>
            </span>
          </div>
          <span className="text-[#ba8d3d]/80">جستجوی بلادرنگ کارگاه شاه‌پوش</span>
        </div>
      </div>
    </div>
  );
};
