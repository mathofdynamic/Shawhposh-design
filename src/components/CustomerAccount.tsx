import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, MapPin, Package, Save, Trash2 } from 'lucide-react';
import { ApiClientError } from '../api/client';
import type { CustomerAddress, CustomerProfile } from '../features/account/api';
import { createAddress, deleteAddress, loadAccount, loadAddresses, loadCustomerOrders, updateAccount, updateAddress } from '../features/account/api';
import type { User } from '../types';
import { ConfirmDialog } from '../admin/components/ui';

type OrderSummary = { id: string; orderNumber: string; orderStatus: string; paymentStatus: string; totalTomans: number; createdAt: string };

interface CustomerAccountProps {
  theme: 'dark' | 'light';
  user: User;
  onBack: () => void;
  onUserUpdated: (user: User) => void;
}

const inputClass = 'w-full rounded-xl border border-white/10 bg-[#0e0d0c] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#ba8d3d]';

export default function CustomerAccount({ theme, user, onBack, onUserUpdated }: CustomerAccountProps) {
  const isDark = theme === 'dark';
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null);
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);
  const [orderPagination, setOrderPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [orderPage, setOrderPage] = useState(1);
  const [fullName, setFullName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [addressForm, setAddressForm] = useState({ title: '', recipientName: user.name, phone: user.phone ?? '', province: '', city: '', addressLine: '', postalCode: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [addressesError, setAddressesError] = useState('');
  const [ordersError, setOrdersError] = useState('');
  const [notice, setNotice] = useState('');
  const [addressToDelete, setAddressToDelete] = useState<CustomerAddress | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError('');
    setProfileError('');
    setAddressesError('');
    setOrdersError('');
    const [accountResult, addressResult, orderResult] = await Promise.allSettled([
      loadAccount(), loadAddresses(), loadCustomerOrders(orderPage),
    ]);
    if (accountResult.status === 'fulfilled') {
      setProfile(accountResult.value.user);
      setFullName(accountResult.value.user.name);
      setPhone(accountResult.value.user.phone ?? '');
    } else {
      setProfile(null);
      setProfileError(accountResult.reason instanceof ApiClientError ? accountResult.reason.message : '\u0627\u0637\u0644\u0627\u0639\u0627\u062a \u062d\u0633\u0627\u0628 \u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u0646\u0634\u062f. \u062f\u0648\u0628\u0627\u0631\u0647 \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f.');
    }
    if (addressResult.status === 'fulfilled') setAddresses(addressResult.value.addresses);
    else {
      setAddresses(null);
      setAddressesError(addressResult.reason instanceof ApiClientError ? addressResult.reason.message : '\u0646\u0634\u0627\u0646\u06cc\u200c\u0647\u0627 \u062f\u0631\u06cc\u0627\u0641\u062a \u0646\u0634\u062f\u0646\u062f.');
    }
    if (orderResult.status === 'fulfilled') {
      setOrders(orderResult.value.orders as OrderSummary[]);
      setOrderPagination(orderResult.value.pagination);
    } else {
      setOrders(null);
      setOrdersError(orderResult.reason instanceof ApiClientError ? orderResult.reason.message : '\u0633\u0641\u0627\u0631\u0634\u200c\u0647\u0627 \u062f\u0631\u06cc\u0627\u0641\u062a \u0646\u0634\u062f\u0646\u062f.');
    }
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, [user.id, orderPage]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await updateAccount({ fullName, phone: phone.trim() || null });
      setProfile(result.user);
      onUserUpdated({ ...user, name: result.user.name, phone: result.user.phone ?? undefined });
      setNotice('اطلاعات حساب ذخیره شد.');
    } catch (failure) {
      setError(failure instanceof ApiClientError ? failure.message : 'ذخیره اطلاعات حساب انجام نشد.');
    } finally { setSaving(false); }
  };

  const saveNewAddress = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      await createAddress({ ...addressForm, title: addressForm.title.trim() || null, isDefault: (addresses?.length ?? 0) === 0 });
      setAddressForm(current => ({ ...current, title: '', province: '', city: '', addressLine: '', postalCode: '' }));
      await refresh();
      setNotice('نشانی ذخیره شد.');
    } catch (failure) {
      setError(failure instanceof ApiClientError ? failure.message : 'ذخیره نشانی انجام نشد.');
    } finally { setSaving(false); }
  };

  const showError = async (operation: () => Promise<unknown>, success: string) => {
    setSaving(true); setError(''); setNotice('');
    try { await operation(); await refresh(); setNotice(success); return true; }
    catch (failure) { setError(failure instanceof ApiClientError ? failure.message : 'تغییر انجام نشد.'); return false; }
    finally { setSaving(false); }
  };

  const panel = `rounded-3xl border p-5 md:p-7 ${isDark ? 'border-white/[0.08] bg-[#141211]' : 'border-slate-200 bg-white shadow-sm'}`;
  const fieldLabel = `mb-2 block text-xs font-semibold ${isDark ? 'text-stone-300' : 'text-slate-700'}`;

  return (
    <section className="min-h-[100dvh] px-5 pb-24 pt-32 md:px-12">
      <div className="mx-auto max-w-5xl">
        <button onClick={onBack} className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-stone-300 transition-colors hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d]">
          <ArrowRight size={14} /> بازگشت به فروشگاه
        </button>
        <header className="mb-8 text-right">
          <span className="font-mono text-[10px] tracking-wide text-[#ba8d3d]">SHAHPOOSH ACCOUNT</span>
          <h1 className={`mt-1 text-2xl font-bold md:text-3xl ${isDark ? 'text-white' : 'text-slate-900'}`}>حساب کاربری</h1>
          <p className={`mt-2 text-sm ${isDark ? 'text-stone-400' : 'text-slate-600'}`}>{profile?.email || user.email || profile?.phone || user.phone}</p>
        </header>

        {error && <div role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-right text-sm text-red-200">{error}</div>}
        {notice && <div role="status" className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-right text-sm text-emerald-200">{notice}</div>}
        {loading ? <div role="status" className="py-12 text-center text-sm text-stone-400">در حال دریافت اطلاعات حساب…</div> : (
          <div className="space-y-6">
            {profile ? <form onSubmit={saveProfile} className={panel}>
              <h2 className={`mb-5 text-right text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>اطلاعات شخصی</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={fieldLabel}>نام و نام خانوادگی<input required minLength={2} maxLength={120} value={fullName} onChange={event => setFullName(event.target.value)} className={inputClass} /></label>
                <label className={fieldLabel}>شماره همراه<input type="tel" inputMode="tel" value={phone} onChange={event => setPhone(event.target.value)} placeholder="0912…" className={inputClass} /></label>
                <label className={fieldLabel}>ایمیل<input readOnly value={profile?.email ?? ''} className={`${inputClass} opacity-70`} /></label>
              </div>
              <div className="mt-5 flex justify-end"><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#ba8d3d] px-5 py-3 text-xs font-bold text-[#0e0d0c] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><Save size={14} /> ذخیره اطلاعات</button></div>
            </form> : <div className={panel}><p role="alert" className="text-right text-sm text-red-200">{profileError}<button onClick={() => void refresh()} className="mr-3 underline">{'\u0645\u062c\u062f\u062f \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f'}</button></p></div>}

            <div className={panel}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <span className="text-xs text-stone-500">{addresses === null ? '—' : addresses.length.toLocaleString('fa-IR')} نشانی</span>
                <h2 className={`flex items-center gap-2 text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}><MapPin size={16} className="text-[#ba8d3d]" /> نشانی‌های ارسال</h2>
              </div>
              {addresses === null ? <p role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-right text-sm text-red-200">{addressesError}<button onClick={() => void refresh()} className="mr-3 underline">{'\u0645\u062c\u062f\u062f \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f'}</button></p> : addresses.length === 0 ? <p className="mb-5 rounded-xl border border-dashed border-white/10 p-4 text-right text-sm text-stone-400">هنوز نشانی‌ای ذخیره نشده است.</p> : (
                <div className="mb-5 grid gap-3 md:grid-cols-2">
                  {addresses.map(address => <article key={address.id} className="rounded-2xl border border-white/[0.08] bg-black/15 p-4 text-right">
                    <div className="flex items-start justify-between gap-3">
                      <button aria-label="حذف نشانی" disabled={saving} onClick={() => setAddressToDelete(address)} className="rounded-lg p-2 text-stone-500 transition-colors hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"><Trash2 size={14} /></button>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center justify-end gap-2"><strong className="text-sm text-white">{address.title || address.recipientName}</strong>{address.isDefault && <span className="rounded-full bg-[#ba8d3d]/15 px-2 py-1 text-[10px] text-[#eed29d]">پیش‌فرض</span>}</div>
                        <p className="mt-2 text-xs leading-6 text-stone-400">{address.recipientName} · {address.phone}<br />{address.province}، {address.city}<br />{address.addressLine}<br />کد پستی: {address.postalCode}</p>
                        {!address.isDefault && <button disabled={saving} onClick={() => void showError(() => updateAddress(address.id, { isDefault: true }), 'نشانی پیش‌فرض تغییر کرد.')} className="mt-3 text-xs text-[#eed29d] underline underline-offset-4 disabled:opacity-40">تنظیم به‌عنوان پیش‌فرض</button>}
                      </div>
                    </div>
                  </article>)}
                </div>
              )}
              {addresses !== null && <form onSubmit={saveNewAddress} className="border-t border-white/[0.08] pt-5">
                <h3 className="mb-4 text-right text-sm font-semibold text-stone-200">افزودن نشانی</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={fieldLabel}>عنوان نشانی<input maxLength={60} value={addressForm.title} onChange={event => setAddressForm({ ...addressForm, title: event.target.value })} placeholder="خانه، محل کار" className={inputClass} /></label>
                  <label className={fieldLabel}>نام گیرنده<input required minLength={2} value={addressForm.recipientName} onChange={event => setAddressForm({ ...addressForm, recipientName: event.target.value })} className={inputClass} /></label>
                  <label className={fieldLabel}>شماره همراه گیرنده<input required type="tel" inputMode="tel" value={addressForm.phone} onChange={event => setAddressForm({ ...addressForm, phone: event.target.value })} className={inputClass} /></label>
                  <label className={fieldLabel}>استان<input required minLength={2} value={addressForm.province} onChange={event => setAddressForm({ ...addressForm, province: event.target.value })} className={inputClass} /></label>
                  <label className={fieldLabel}>شهر<input required minLength={2} value={addressForm.city} onChange={event => setAddressForm({ ...addressForm, city: event.target.value })} className={inputClass} /></label>
                  <label className={fieldLabel}>کد پستی<input required minLength={10} maxLength={10} inputMode="numeric" value={addressForm.postalCode} onChange={event => setAddressForm({ ...addressForm, postalCode: event.target.value })} className={inputClass} /></label>
                  <label className={`${fieldLabel} sm:col-span-2`}>نشانی کامل<textarea required minLength={8} maxLength={500} rows={3} value={addressForm.addressLine} onChange={event => setAddressForm({ ...addressForm, addressLine: event.target.value })} className={`${inputClass} resize-y`} /></label>
                </div>
                <div className="mt-5 flex justify-end"><button disabled={saving} className="rounded-full border border-[#ba8d3d]/40 px-5 py-3 text-xs font-bold text-[#eed29d] transition-colors hover:bg-[#ba8d3d]/10 disabled:opacity-50">ذخیره نشانی</button></div>
              </form>}
            </div>

            <div className={panel}>
              <div className="mb-5 flex items-center justify-between">
                <span className="text-xs text-stone-500">{orders === null ? '—' : orderPagination.total.toLocaleString('fa-IR')}</span>
                <h2 className={`flex items-center gap-2 text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}><Package size={16} className="text-[#ba8d3d]" /> سفارش‌های من</h2>
              </div>
              {orders === null ? <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-right text-sm text-red-200">{ordersError}<button onClick={() => void refresh()} className="mr-3 underline">{'\u0645\u062c\u062f\u062f \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f'}</button></p> : orders.length === 0 ? <p className="rounded-xl border border-dashed border-white/10 p-4 text-right text-sm text-stone-400">هنوز سفارشی ثبت نشده است.</p> : <div className="space-y-3">
                {orders.map(order => <article key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] p-4 text-sm">
                  <span className="font-mono text-[#eed29d]">{Number(order.totalTomans).toLocaleString('fa-IR')} تومان</span>
                  <div className="text-right"><strong className="block text-white">{order.orderNumber}</strong><span className="mt-1 block text-xs text-stone-400">{order.orderStatus === 'awaiting_payment' ? 'در انتظار پرداخت' : order.orderStatus === 'cancelled' ? 'لغوشده' : order.orderStatus} · {new Date(order.createdAt).toLocaleDateString('fa-IR')}</span></div>
                </article>)}
              </div>}
              {orders !== null && orderPagination.totalPages > 1 && <nav aria-label="پیمایش سفارش‌ها" className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.08] pt-4 text-xs text-stone-400">
                <button type="button" disabled={orderPage <= 1 || loading} onClick={() => setOrderPage(current => current - 1)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[#eed29d] transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"><ArrowRight size={14} /> {'\u062c\u062f\u06cc\u062f\u062a\u0631'}</button>
                <span>{'\u0635\u0641\u062d\u0647'} {orderPagination.page.toLocaleString('fa-IR')} {'\u0627\u0632'} {orderPagination.totalPages.toLocaleString('fa-IR')}</span>
                <button type="button" disabled={orderPage >= orderPagination.totalPages || loading} onClick={() => setOrderPage(current => current + 1)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[#eed29d] transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">{'\u0642\u062f\u06cc\u0645\u06cc\u200c\u062a\u0631'} <ArrowLeft size={14} /></button>
              </nav>}
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        isOpen={addressToDelete !== null}
        onClose={() => { if (!saving) setAddressToDelete(null); }}
        onConfirm={() => {
          if (!addressToDelete) return;
          void showError(() => deleteAddress(addressToDelete.id), 'نشانی حذف شد.').then(deleted => {
            if (deleted) setAddressToDelete(null);
          });
        }}
        title="حذف نشانی ذخیره‌شده؟"
        description={`نشانی «${addressToDelete?.title || addressToDelete?.recipientName || ''}» از حساب شما حذف می‌شود. سفارش‌های ثبت‌شده بدون تغییر می‌مانند.`}
        confirmLabel="حذف نشانی"
        isDestructive
        isLoading={saving}
      />
    </section>
  );
}
