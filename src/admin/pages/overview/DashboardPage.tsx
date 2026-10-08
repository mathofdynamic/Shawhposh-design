import React, { useCallback, useEffect, useState } from 'react';
import { Activity, Boxes, Package, RefreshCw, ShoppingBag, Users } from 'lucide-react';
import { api } from '../../../api/client';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { useAdminRouter } from '../../router';
import { toFaDigits } from '../../utils/formatters';

interface DashboardSummary {
  products: { total: number; active: number };
  variants: { total: number; active: number; lowStock: number };
  inventory: { onHand: number; reserved: number; available: number };
  customers: number;
  orders: { total: number; awaitingPayment: number };
  generatedAt: string;
}

const initial: DashboardSummary = {
  products: { total: 0, active: 0 },
  variants: { total: 0, active: 0, lowStock: 0 },
  inventory: { onHand: 0, reserved: 0, available: 0 },
  customers: 0,
  orders: { total: 0, awaitingPayment: 0 },
  generatedAt: '',
};

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestKey, setRequestKey] = useState(0);
  const { navigate } = useAdminRouter();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSummary(await api<DashboardSummary>('/v1/admin/dashboard/summary'));
    } catch {
      setError('دریافت خلاصهٔ سامانه انجام نشد. اتصال را بررسی و دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, requestKey]);

  const data = summary ?? initial;
  const cards = [
    { label: 'محصول فعال', value: data.products.active, detail: `${toFaDigits(data.products.total)} محصول ثبت‌شده`, icon: Package, path: '/admin/catalog/products' },
    { label: 'SKU فعال', value: data.variants.active, detail: `${toFaDigits(data.variants.total)} تنوع ثبت‌شده · ${toFaDigits(data.variants.lowStock)} کم‌موجود`, icon: Boxes, path: '/admin/catalog/inventory' },
    { label: 'موجودی قابل فروش', value: data.inventory.available, detail: `${toFaDigits(data.inventory.onHand)} موجود · ${toFaDigits(data.inventory.reserved)} رزروشده`, icon: Activity, path: '/admin/catalog/inventory' },
    { label: 'سفارش', value: data.orders.total, detail: `${toFaDigits(data.orders.awaitingPayment)} در انتظار پرداخت`, icon: ShoppingBag, path: '/admin/sales/orders' },
    { label: 'حساب مشتری', value: data.customers, detail: 'حساب ثبت‌شده در سامانه', icon: Users, path: '/admin/customers/directory' },
  ];

  return (
    <section dir="rtl" className="space-y-6">
      <AdminPageHeader title="داشبورد" description="آمار جاری از کاتالوگ، انبار، مشتریان و سفارش‌های پایگاه داده." actions={<button type="button" onClick={() => setRequestKey(value => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-stone-300 hover:bg-white/10 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />به‌روزرسانی</button>} />
      {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-500/5 p-4 text-sm text-rose-200"><span>{error}</span><button type="button" onClick={() => setRequestKey(value => value + 1)} className="underline">تلاش دوباره</button></div>}
      {loading && !summary ? <div role="status" className="rounded-2xl border border-white/10 bg-[#131211] p-8 text-sm text-stone-400">در حال دریافت داده‌های واقعی سامانه…</div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(card => {
          const Icon = card.icon;
          return <button key={card.label} type="button" onClick={() => navigate(card.path)} className="min-h-36 rounded-2xl border border-white/10 bg-[#131211] p-5 text-right transition-colors hover:border-[#ba8d3d]/40 hover:bg-[#171513] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba8d3d]">
            <span className="flex items-center justify-between text-xs text-stone-400"><span>{card.label}</span><Icon size={17} className="text-[#ba8d3d]" /></span>
            <strong className="mt-5 block font-mono text-3xl text-white">{loading ? '—' : toFaDigits(card.value.toLocaleString('en-US'))}</strong>
            <span className="mt-2 block text-xs text-stone-500">{card.detail}</span>
          </button>;
        })}
      </div>}
      {!loading && !error && summary && <p className="text-left text-[10px] text-stone-600">به‌روزرسانی: {new Date(summary.generatedAt).toLocaleString('fa-IR')}</p>}
    </section>
  );
};
