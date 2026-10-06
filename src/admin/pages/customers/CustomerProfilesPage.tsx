import React, { useEffect, useState } from 'react';
import { ArrowRight, MapPin, Package, RefreshCw, UserRound } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button } from '../../components/ui';
import { useAdminRouter } from '../../router';
import { getAdminCustomer } from '../../features/commerceApi';

interface CustomerProfilesPageProps { customerIdProp?: string; }
type CustomerDetails = Awaited<ReturnType<typeof getAdminCustomer>>;

export const CustomerProfilesPage: React.FC<CustomerProfilesPageProps> = ({ customerIdProp }) => {
  const { params, navigate } = useAdminRouter();
  const customerId = customerIdProp || params.id || '';
  const [details, setDetails] = useState<CustomerDetails | null>(null);
  const [loadedCustomerId, setLoadedCustomerId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setDetails(null);
    setLoadedCustomerId('');
    void getAdminCustomer(customerId)
      .then(result => {
        if (active) {
          setDetails(result);
          setLoadedCustomerId(customerId);
        }
      })
      .catch(failure => {
        if (active) {
          setDetails(null);
          setLoadedCustomerId('');
          setError(failure instanceof Error ? failure.message : 'پرونده مشتری دریافت نشد.');
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customerId, reload]);

  const currentDetails = loadedCustomerId === customerId ? details : null;

  return <section dir="rtl" className="space-y-5">
    <AdminPageHeader title={currentDetails ? `پرونده ${currentDetails.customer.name}` : 'پرونده مشتری'} description="اطلاعات پروفایل، نشانی‌ها و سفارش‌ها از پایگاه داده واقعی." actions={<Button size="sm" variant="outline" leftIcon={<RefreshCw size={14} />} onClick={() => setReload(value => value + 1)}>به‌روزرسانی</Button>} />
    <Button size="sm" variant="ghost" leftIcon={<ArrowRight size={15} />} onClick={() => navigate('/admin/customers/directory')}>بازگشت به فهرست مشتریان</Button>
    {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
    {loading && <p role="status" className="py-12 text-center text-sm text-stone-400">در حال دریافت پرونده…</p>}
    {!loading && !currentDetails && !error && <p className="py-12 text-center text-sm text-stone-400">مشتری پیدا نشد.</p>}
    {currentDetails && <>
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-[#131211] p-5"><span className="flex items-center gap-2 text-[10px] text-stone-500"><UserRound size={14} />مشخصات</span><h2 className="mt-3 text-base font-bold text-white">{currentDetails.customer.name}</h2><p className="mt-2 text-xs text-stone-400">{currentDetails.customer.email || 'بدون ایمیل'}</p><p dir="ltr" className="mt-1 text-left text-xs text-stone-400">{currentDetails.customer.phone || 'بدون تلفن'}</p><div className="mt-3"><Badge tone={currentDetails.customer.status === 'active' ? 'success' : 'neutral'}>{currentDetails.customer.status === 'active' ? 'فعال' : 'غیرفعال'}</Badge></div></div>
        <div className="rounded-2xl border border-white/10 bg-[#131211] p-5"><span className="text-[10px] text-stone-500">عضویت</span><p className="mt-3 text-sm text-white">{new Date(currentDetails.customer.createdAt).toLocaleString('fa-IR')}</p></div>
        <div className="rounded-2xl border border-white/10 bg-[#131211] p-5"><span className="text-[10px] text-stone-500">سفارش‌ها</span><p className="mt-3 font-mono text-2xl text-white">{currentDetails.customer.orderCount.toLocaleString('fa-IR')}</p></div>
        <div className="rounded-2xl border border-white/10 bg-[#131211] p-5"><span className="text-[10px] text-stone-500">مجموع خرید پرداخت‌شده</span><p className="mt-3 font-mono text-lg text-[#eed29d]">{currentDetails.customer.lifetimeSpendTomans.toLocaleString('fa-IR')} تومان</p></div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#131211] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold"><MapPin size={15} className="text-[#eed29d]" />نشانی‌های ذخیره‌شده</h2>
        {currentDetails.addresses.length ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{currentDetails.addresses.map(address => <article key={address.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs leading-6 text-stone-300"><div className="mb-1 flex items-center gap-2 font-bold text-white">{address.title || 'نشانی'}{address.isDefault && <Badge size="sm" tone="brass">پیش‌فرض</Badge>}</div>{address.recipientName} · {address.phone}<br />{address.province}، {address.city}<br />{address.addressLine}<br />کد پستی: {address.postalCode}</article>)}</div> : <p className="text-xs text-stone-500">نشانی ذخیره‌شده‌ای ندارد.</p>}
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#131211] p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold"><Package size={15} className="text-[#eed29d]" />سفارش‌های مشتری</h2>
        {currentDetails.orders.length ? <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-right text-xs"><thead className="border-b border-white/10 text-stone-400"><tr><th className="p-3">شماره</th><th className="p-3">تاریخ</th><th className="p-3">وضعیت</th><th className="p-3">پرداخت</th><th className="p-3">مبلغ</th><th className="p-3">بازکردن</th></tr></thead><tbody className="divide-y divide-white/5">{currentDetails.orders.map(order => <tr key={order.id}><td className="p-3 font-mono text-[#eed29d]">{order.orderNumber}</td><td className="p-3 text-stone-400">{new Date(order.createdAt).toLocaleDateString('fa-IR')}</td><td className="p-3">{order.orderStatus === 'cancelled' ? 'لغوشده' : order.orderStatus === 'awaiting_payment' ? 'در انتظار پرداخت' : order.orderStatus}</td><td className="p-3">{order.paymentStatus === 'unpaid' ? 'پرداخت‌نشده' : order.paymentStatus}</td><td className="p-3 font-mono">{order.totalTomans.toLocaleString('fa-IR')} تومان</td><td className="p-3"><Button size="sm" variant="ghost" onClick={() => navigate(`/admin/sales/orders/${order.id}`)}>نمایش</Button></td></tr>)}</tbody></table></div> : <p className="text-xs text-stone-500">این مشتری هنوز سفارشی ثبت نکرده است.</p>}
      </section>
      <div role="status" className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-4 text-xs leading-6 text-amber-200">سوابق پشتیبانی، رضایت بازاریابی و سایر اطلاعات عملیاتی در فاز بعد متصل می‌شوند؛ در این صفحه داده ساختگی نمایش داده نمی‌شود.</div>
    </>}
  </section>;
};
