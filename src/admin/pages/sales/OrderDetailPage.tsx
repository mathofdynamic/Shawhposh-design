import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Ban, MapPin, MessageSquare, Package, RefreshCw, Save, UserRound } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button, ConfirmDialog } from '../../components/ui';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { useStaff } from '../../features/StaffAuth';
import { addAdminOrderNote, cancelAdminOrder, getAdminOrder, updateAdminOrderAddress, type AdminOrder } from '../../features/commerceApi';

export interface OrderDetailPageProps { orderIdProp?: string; }

const orderLabels: Record<string, string> = { draft: 'پیش‌نویس', awaiting_payment: 'در انتظار پرداخت', confirmed: 'تأییدشده', cancelled: 'لغوشده', completed: 'تکمیل‌شده' };
const paymentLabels: Record<string, string> = { unpaid: 'پرداخت‌نشده', pending: 'در حال پرداخت', paid: 'پرداخت‌شده', failed: 'ناموفق', partially_refunded: 'بازپرداخت بخشی', refunded: 'بازپرداخت‌شده' };
const inputClass = 'w-full rounded-xl border border-white/10 bg-[#181716] px-3 py-2.5 text-sm text-white outline-none focus:border-[#ba8d3d]';

export const OrderDetailPage: React.FC<OrderDetailPageProps> = ({ orderIdProp }) => {
  const { params, navigate } = useAdminRouter();
  const staff = useStaff()?.staff;
  const orderId = orderIdProp || params.id || '';
  const canManage = staff?.role === 'owner' || staff?.role === 'store_manager';
  const canAddNote = canManage || staff?.role === 'support';
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loadedOrderId, setLoadedOrderId] = useState('');
  const requestSequence = useRef(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [note, setNote] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [addressForm, setAddressForm] = useState({ recipientName: '', phone: '', province: '', city: '', addressLine: '', postalCode: '' });
  const [addressReason, setAddressReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const refresh = async () => {
    const request = ++requestSequence.current;
    setOrder(null);
    setLoadedOrderId('');
    setLoading(true);
    setError('');
    setNotice('');
    if (!orderId) {
      setLoading(false);
      return;
    }
    try {
      const result = await getAdminOrder(orderId);
      if (request !== requestSequence.current) return;
      setOrder(result.order);
      setLoadedOrderId(orderId);
      setAddressForm({ ...result.order.shippingAddress });
    } catch (failure) {
      if (request === requestSequence.current) setError(failure instanceof Error ? failure.message : 'جزئیات سفارش دریافت نشد.');
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
    return () => { requestSequence.current += 1; };
  }, [orderId]);

  const mutate = async (action: () => Promise<{ order: AdminOrder }>, success: string) => {
    setBusy(true); setError(''); setNotice('');
    try { setOrder((await action()).order); setNotice(success); return true; }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'تغییر ذخیره نشد.'); return false; }
    finally { setBusy(false); }
  };

  const currentOrder = loadedOrderId === orderId ? order : null;
  const isUnpaidAwaiting = currentOrder?.orderStatus === 'awaiting_payment' && currentOrder.paymentStatus === 'unpaid';
  const confirmCancellation = async () => {
    if (!currentOrder) return;
    const cancelled = await mutate(() => cancelAdminOrder(currentOrder.id, cancelReason), 'سفارش لغو و رزرو موجودی آزاد شد.');
    if (cancelled) {
      setShowCancelConfirm(false);
      setCancelReason('');
    }
  };
  return <section dir="rtl" className="space-y-5">
    <AdminPageHeader title={currentOrder ? `سفارش ${currentOrder.orderNumber}` : 'جزئیات سفارش'} description="نمایش اطلاعات و تاریخچه واقعی سفارش از پایگاه داده." actions={<Button variant="outline" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => void refresh()}>به‌روزرسانی</Button>} />
    <Button variant="ghost" size="sm" leftIcon={<ArrowRight size={15} />} onClick={() => navigate('/admin/sales/orders')}>بازگشت به سفارش‌ها</Button>
    {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div>}
    {loading && <p role="status" className="py-12 text-center text-sm text-stone-400">در حال دریافت سفارش…</p>}
    {!loading && !currentOrder && !error && <p className="py-12 text-center text-sm text-stone-400">سفارش پیدا نشد.</p>}
    {currentOrder && <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#131211] p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div><p className="font-mono text-lg font-bold text-[#eed29d]">{currentOrder.orderNumber}</p><p className="mt-1 text-xs text-stone-500">ثبت‌شده در {new Date(currentOrder.createdAt).toLocaleString('fa-IR')}</p></div>
            <div className="flex gap-2"><Badge tone={currentOrder.orderStatus === 'cancelled' ? 'danger' : 'warning'}>{orderLabels[currentOrder.orderStatus] ?? currentOrder.orderStatus}</Badge><Badge tone={currentOrder.paymentStatus === 'paid' ? 'success' : 'neutral'}>{paymentLabels[currentOrder.paymentStatus] ?? currentOrder.paymentStatus}</Badge></div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><span className="block text-[10px] text-stone-500">جمع کالاها</span><strong className="mt-1 block font-mono">{currentOrder.subtotalTomans.toLocaleString('fa-IR')} تومان</strong></div>
            <div><span className="block text-[10px] text-stone-500">تخفیف</span><strong className="mt-1 block font-mono">{currentOrder.discountTomans.toLocaleString('fa-IR')} تومان</strong></div>
            <div><span className="block text-[10px] text-stone-500">هزینه ارسال</span><strong className="mt-1 block font-mono">{currentOrder.shippingTomans.toLocaleString('fa-IR')} تومان</strong></div>
            <div><span className="block text-[10px] text-stone-500">مبلغ سفارش</span><strong className="mt-1 block font-mono text-[#eed29d]">{currentOrder.totalTomans.toLocaleString('fa-IR')} تومان</strong></div>
          </div>
            <div className="overflow-hidden rounded-xl border border-white/5">
            <div role="region" tabIndex={0} aria-label={'\u0622\u06cc\u062a\u0645\u200c\u0647\u0627\u06cc \u0633\u0641\u0627\u0631\u0634. \u0628\u0631\u0627\u06cc \u0645\u0634\u0627\u0647\u062f\u0647 \u0647\u0645\u0647 \u0633\u062a\u0648\u0646\u200c\u0647\u0627 \u062f\u0631 \u0645\u0648\u0628\u0627\u06cc\u0644 \u0627\u0641\u0642\u06cc \u067e\u06cc\u0645\u0627\u06cc\u0634 \u06a9\u0646\u06cc\u062f.'} className="overflow-x-auto focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d]"><table className="w-full min-w-[560px] text-right text-xs"><thead className="bg-white/[0.03] text-stone-400"><tr><th className="p-3">کالا</th><th className="p-3">SKU</th><th className="p-3">ویژگی</th><th className="p-3">تعداد</th><th className="p-3">قیمت نهایی</th></tr></thead><tbody className="divide-y divide-white/5">{currentOrder.items.map(item => <tr key={item.id}><td className="p-3 font-medium text-white">{item.productName}</td><td className="p-3 font-mono text-stone-400">{item.sku}</td><td className="p-3 text-stone-400">{item.variant.colorName} · {item.variant.size}</td><td className="p-3">{item.quantity.toLocaleString('fa-IR')}</td><td className="p-3 font-mono">{item.lineTotalTomans.toLocaleString('fa-IR')} تومان</td></tr>)}</tbody></table></div>
            <p className="border-t border-white/5 px-3 py-2 text-right text-[10px] text-stone-500 sm:hidden">{'\u0628\u0631\u0627\u06cc \u0645\u0634\u0627\u0647\u062f\u0647 \u0647\u0645\u0647 \u0633\u062a\u0648\u0646\u200c\u0647\u0627\u060c \u062c\u062f\u0648\u0644 \u0631\u0627 \u0627\u0641\u0642\u06cc \u0628\u06a9\u0634\u06cc\u062f.'}</p>
          </div>
        </section>
        <section className="space-y-4 rounded-2xl border border-white/10 bg-[#131211] p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold"><UserRound size={15} className="text-[#eed29d]" />مشتری</h2>
          <p className="text-sm font-semibold text-white">{currentOrder.customerName}</p><p className="text-xs text-stone-400">{currentOrder.customerEmail || 'بدون ایمیل'}</p><p className="text-xs text-stone-400">{currentOrder.customerPhone || 'بدون تلفن'}</p>
          {currentOrder.customerId && <Button size="sm" variant="outline" onClick={() => navigate(`/admin/customers/profiles/${currentOrder.customerId}`)}>نمایش پرونده مشتری</Button>}
          <div className="border-t border-white/5 pt-4"><h3 className="mb-2 flex items-center gap-2 text-xs font-bold"><MapPin size={14} className="text-[#eed29d]" />نشانی تحویل</h3><p className="text-xs leading-6 text-stone-300">{currentOrder.shippingAddress.recipientName} · {currentOrder.shippingAddress.phone}<br />{currentOrder.shippingAddress.province}، {currentOrder.shippingAddress.city}<br />{currentOrder.shippingAddress.addressLine}<br />کد پستی: {currentOrder.shippingAddress.postalCode}</p></div>
          {currentOrder.customerNote && <div className="border-t border-white/5 pt-4"><p className="text-[10px] text-stone-500">یادداشت مشتری</p><p className="mt-1 whitespace-pre-wrap text-xs text-stone-300">{currentOrder.customerNote}</p></div>}
        </section>
      </div>

      {canManage && <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isUnpaidAwaiting && <form onSubmit={event => { event.preventDefault(); setShowCancelConfirm(true); }} className="space-y-3 rounded-2xl border border-rose-400/15 bg-[#131211] p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-rose-200"><Ban size={15} />لغو سفارش پرداخت‌نشده</h2>
          <label className="block text-[10px] font-medium text-stone-400">دلیل لغو سفارش
            <input required minLength={3} maxLength={1000} value={cancelReason} onChange={event => setCancelReason(event.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <Button type="submit" variant="destructive" disabled={busy || cancelReason.trim().length < 3}>لغو سفارش و آزادسازی موجودی</Button>
        </form>}
        {currentOrder.fulfillmentStatus === 'unfulfilled' && currentOrder.orderStatus !== 'cancelled' && <form onSubmit={event => { event.preventDefault(); void mutate(() => updateAdminOrderAddress(currentOrder.id, { ...addressForm, reason: addressReason }), 'نشانی سفارش به‌روزرسانی شد.'); }} className="space-y-3 rounded-2xl border border-white/10 bg-[#131211] p-5">
          <h2 className="text-sm font-bold">ویرایش نشانی پیش از ارسال</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{([['recipientName','نام گیرنده'],['phone','شماره تماس'],['province','استان'],['city','شهر'],['addressLine','نشانی کامل'],['postalCode','کد پستی']] as const).map(([key,label]) => <label key={key} className="text-[10px] text-stone-400">{label}<input required value={addressForm[key]} onChange={event => setAddressForm(value => ({ ...value, [key]: event.target.value }))} className={`${inputClass} mt-1`} /></label>)}</div>
          <label className="block text-[10px] font-medium text-stone-400">دلیل تغییر نشانی
            <input required minLength={3} maxLength={1000} value={addressReason} onChange={event => setAddressReason(event.target.value)} className={`${inputClass} mt-1`} />
          </label>
          <Button type="submit" variant="secondary" leftIcon={<Save size={14} />} disabled={busy || addressReason.trim().length < 3}>ذخیره نشانی</Button>
        </form>}
      </section>}

      {canAddNote && <form onSubmit={event => { event.preventDefault(); void mutate(() => addAdminOrderNote(currentOrder.id, note), 'یادداشت داخلی ثبت شد.').then(saved => { if (saved) setNote(''); }); }} className="space-y-3 rounded-2xl border border-white/10 bg-[#131211] p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold"><MessageSquare size={15} className="text-[#eed29d]" />یادداشت داخلی</h2>
        <label className="block text-[10px] font-medium text-stone-400">یادداشت داخلی برای تیم
          <textarea required minLength={2} maxLength={2000} rows={3} value={note} onChange={event => setNote(event.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <Button type="submit" variant="secondary" disabled={busy || note.trim().length < 2}>ثبت یادداشت</Button>
      </form>}

      <section className="rounded-2xl border border-white/10 bg-[#131211] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold"><Package size={15} className="text-[#eed29d]" />تاریخچه سفارش</h2>
        <ol className="space-y-4">{[...currentOrder.timeline].reverse().map((event, index) => <li key={`${event.type}-${event.createdAt}-${index}`} className="flex gap-3 border-r border-[#ba8d3d]/30 pr-4 text-xs"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#ba8d3d]" /><div><strong className="text-stone-200">{event.note || event.type}</strong><time className="mt-1 block text-[10px] text-stone-500">{new Date(event.createdAt).toLocaleString('fa-IR')}</time></div></li>)}</ol>
      </section>
      <p className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-3 text-xs text-amber-200">وضعیت پرداخت فقط پس از اتصال و تأیید درگاه تغییر می‌کند. امکان ثبت دستی پرداخت وجود ندارد.</p>
    </>}
    <ConfirmDialog
      isOpen={showCancelConfirm && Boolean(currentOrder)}
      onClose={() => { if (!busy) setShowCancelConfirm(false); }}
      onConfirm={() => { void confirmCancellation(); }}
      title="تأیید لغو سفارش"
      description={`سفارش ${currentOrder?.orderNumber ?? ''} لغو می‌شود و موجودی رزروشده آزاد خواهد شد. این تغییر قابل بازگردانی نیست.`}
      confirmLabel="لغو سفارش و آزادسازی موجودی"
      isDestructive
      isLoading={busy}
    />
  </section>;
};
