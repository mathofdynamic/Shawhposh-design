import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle, ClipboardList, CreditCard, MapPin, ShieldCheck } from 'lucide-react';
import { ApiClientError } from '../api/client';
import type { CustomerAddress } from '../features/account/api';
import { loadAddresses } from '../features/account/api';
import { quoteCheckout, type CheckoutConfiguration, type CheckoutOrderInput, type CheckoutQuote, type OrderSnapshot } from '../features/orders/api';
import type { CartItem } from '../types';

interface CheckoutProps {
  cart: CartItem[];
  configuration: CheckoutConfiguration | null;
  onBackToShop: () => void;
  onSubmitOrder: (input: CheckoutOrderInput, idempotencyKey: string) => Promise<OrderSnapshot>;
}

const inputClass = 'w-full rounded-2xl border border-white/10 bg-[#0e0d0c] px-5 py-3.5 text-right text-xs text-white outline-none transition-colors focus:border-[#ba8d3d] focus:ring-1 focus:ring-[#ba8d3d]/30';

export default function Checkout({ cart, configuration, onBackToShop, onSubmitOrder }: CheckoutProps) {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [addressLoading, setAddressLoading] = useState(true);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [selectedShippingMethodId, setSelectedShippingMethodId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  const keyRef = useRef<{ fingerprint: string; key: string } | null>(null);

  useEffect(() => {
    let active = true;
    loadAddresses().then(result => {
      if (!active) return;
      setAddresses(result.addresses);
      const preferred = result.addresses.find(item => item.isDefault) ?? result.addresses[0];
      if (preferred) setSelectedAddressId(preferred.id);
    }).catch(failure => {
      if (active) setError(failure instanceof ApiClientError ? failure.message : 'نشانی‌های ذخیره‌شده بارگذاری نشدند.');
    }).finally(() => { if (active) setAddressLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (order) window.scrollTo(0, 0);
  }, [order]);

  const selectedAddress = addresses.find(item => item.id === selectedAddressId);
  const unavailable = cart.some(item => item.availabilityCode || (item.availableQuantity !== undefined && item.quantity > item.availableQuantity));
  const quoteInput = useMemo(() => {
    if (addressLoading) return null;
    if (selectedAddress) return { addressId: selectedAddress.id };
    const address = { recipientName, phone, province, city, addressLine, postalCode };
    if (Object.values(address).some(value => !value.trim())) return null;
    return { shippingAddress: address };
  }, [addressLoading, selectedAddress, recipientName, phone, province, city, addressLine, postalCode]);
  const cartFingerprint = useMemo(() => cart.map(item => `${item.id}:${item.quantity}`).sort().join('|'), [cart]);

  useEffect(() => {
    let active = true;
    if (!quoteInput || cart.length === 0) {
      setQuote(null);
      setQuoteError('');
      setQuoteLoading(false);
      setSelectedShippingMethodId('');
      return () => { active = false; };
    }
    setQuote(null);
    setQuoteError('');
    setQuoteLoading(true);
    quoteCheckout(quoteInput).then(result => {
      if (!active) return;
      setQuote(result);
      setSelectedShippingMethodId(current => result.shippingMethods.some(method => method.id === current)
        ? current : result.shippingMethods[0]?.id ?? '');
    }).catch(failure => {
      if (!active) return;
      setQuoteError(failure instanceof ApiClientError ? failure.message : 'مبلغ و امکان ارسال سفارش دریافت نشد.');
      setSelectedShippingMethodId('');
    }).finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [quoteInput, cart.length, cartFingerprint]);

  const selectedShippingMethod = quote?.shippingMethods.find(method => method.id === selectedShippingMethodId);
  const subtotalTomans = quote?.subtotalTomans ?? null;
  const totalTomans = selectedShippingMethod?.totalTomans ?? null;

  const chooseAddress = (id: string) => {
    setSelectedAddressId(id);
    setError('');
  };

  const placeOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (!configuration || !quote || !selectedShippingMethod || quoteLoading || unavailable || cart.length === 0) return;
    setError('');
    const expectedQuote = {
      subtotalTomans: quote.subtotalTomans,
      discountTomans: quote.discountTomans,
      shippingMethod: selectedShippingMethod,
      items: quote.items.map(({ availableQuantity: _availableQuantity, ...item }) => item),
    };
    const payload: CheckoutOrderInput = selectedAddress ? { addressId: selectedAddress.id, shippingMethodId: selectedShippingMethod.id, expectedQuote, ...(customerNote.trim() ? { customerNote: customerNote.trim() } : {}) } : {
      shippingAddress: { recipientName, phone, province, city, addressLine, postalCode },
      shippingMethodId: selectedShippingMethod.id,
      expectedQuote,
      ...(customerNote.trim() ? { customerNote: customerNote.trim() } : {}),
    };
    const fingerprint = JSON.stringify(payload);
    if (!keyRef.current || keyRef.current.fingerprint !== fingerprint) {
      keyRef.current = { fingerprint, key: crypto.randomUUID() };
    }
    setSubmitting(true);
    try {
      setOrder(await onSubmitOrder(payload, keyRef.current.key));
    } catch (failure) {
      if (failure instanceof ApiClientError && failure.code === 'QUOTE_CHANGED' && quoteInput) {
        try {
          const refreshedQuote = await quoteCheckout(quoteInput);
          setQuote(refreshedQuote);
          setSelectedShippingMethodId(current => refreshedQuote.shippingMethods.some(method => method.id === current)
            ? current : refreshedQuote.shippingMethods[0]?.id ?? '');
          setError(failure.message);
        } catch (refreshFailure) {
          setQuote(null);
          setQuoteError(refreshFailure instanceof ApiClientError ? refreshFailure.message : 'مبلغ و امکان ارسال سفارش دوباره دریافت نشد.');
          setError('جزئیات سفارش به‌روز نشد. سبد خرید و نشانی را بررسی کنید.');
        }
      } else {
        setError(failure instanceof ApiClientError ? failure.message : 'ثبت سفارش انجام نشد. وضعیت سبد را بررسی کنید و دوباره تلاش کنید.');
      }
    } finally { setSubmitting(false); }
  };

  if (order) {
    return (
      <section className="min-h-[100dvh] px-6 pb-24 pt-12 md:px-12 md:pt-8">
        <div className="double-bezel-outer mx-auto w-full max-w-2xl">
          <div className="double-bezel flex flex-col items-center bg-[#151312] p-8 text-center md:p-12">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#ba8d3d]/30 bg-[#ba8d3d]/10 text-[#eed29d]"><CheckCircle size={30} /></div>
            <h1 className="mb-3 text-2xl font-medium text-white md:text-3xl">سفارش شما ثبت شد</h1>
            <p className="mb-8 max-w-[50ch] text-sm leading-relaxed text-gray-400">سفارش در انتظار پرداخت است. هیچ پرداختی انجام نشده و پس از فعال‌شدن درگاه، ادامه پرداخت از همین بخش در دسترس خواهد بود.</p>
            <div className="mb-8 w-full max-w-md rounded-3xl border border-white/5 bg-[#0e0d0c] p-6">
              <div className="mb-2 text-[10px] tracking-wide text-gray-500">شماره سفارش</div>
              <div dir="ltr" className="whitespace-nowrap font-mono text-base font-bold tracking-wide text-[#eed29d] sm:text-xl">{order.orderNumber}</div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200">
                <CreditCard size={13} /> وضعیت پرداخت: پرداخت‌نشده
              </div>
              <div className="mt-3 text-sm text-stone-300">مبلغ سفارش: {order.totalTomans.toLocaleString('fa-IR')} تومان</div>
              <div className="mt-2 text-xs text-stone-400">روش ارسال: {order.shippingMethodName || '—'} · هزینه ارسال: {order.shippingTomans.toLocaleString('fa-IR')} تومان</div>
            </div>
            <button onClick={onBackToShop} className="rounded-full bg-[#ba8d3d] px-7 py-3.5 text-xs font-bold text-[#0e0d0c] transition-colors hover:bg-[#a67c33]">بازگشت به فروشگاه</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[100dvh] bg-grid-lines px-5 pb-24 pt-12 md:px-12 md:pt-8">
      <div className="mx-auto max-w-7xl">
        <button onClick={onBackToShop} className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/5 bg-white/5 px-5 py-2.5 text-xs text-gray-300 transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d]"><ArrowRight size={14} /> بازگشت به فروشگاه</button>
        <div className="mb-7 text-right">
          <span className="font-mono text-[10px] tracking-wide text-[#ba8d3d]">ORDER REVIEW</span>
          <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">بررسی سفارش</h1>
          <p className="mt-2 text-xs text-stone-400">قیمت، موجودی و مبلغ نهایی هنگام ثبت سفارش در سرور دوباره بررسی می‌شوند.</p>
        </div>
        {error && <div role="alert" className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-right text-sm text-red-200">{error}</div>}
        {unavailable && <div role="alert" className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-right text-sm text-amber-200">موجودی یکی از کالاهای سبد تغییر کرده است. به سبد خرید برگردید و تعدادها را بررسی کنید.</div>}

        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-12">
          <form onSubmit={placeOrder} className="space-y-6 rounded-[2rem] border border-white/5 bg-[#141211] p-5 text-right sm:p-7 lg:col-span-7">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="rounded-full bg-[#ba8d3d]/10 p-2.5 text-[#eed29d]"><MapPin size={16} /></div>
              <div><h2 className="text-sm font-bold text-white">نشانی گیرنده</h2><p className="mt-1 text-[10px] text-gray-500">نشانی تحویل سفارش را انتخاب یا وارد کنید.</p></div>
            </div>

            {addressLoading ? <p role="status" className="text-xs text-stone-400">در حال دریافت نشانی‌ها…</p> : addresses.length > 0 && (
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-gray-300">نشانی ذخیره‌شده
                  <select value={selectedAddressId} onChange={event => chooseAddress(event.target.value)} className={`${inputClass} mt-2`}>
                    <option value="">وارد کردن نشانی دیگر</option>
                    {addresses.map(item => <option key={item.id} value={item.id}>{item.title || item.city} — {item.recipientName}{item.isDefault ? ' (پیش‌فرض)' : ''}</option>)}
                  </select>
                </label>
              </div>
            )}

            {selectedAddress ? <div className="rounded-2xl border border-[#ba8d3d]/20 bg-[#ba8d3d]/5 p-4 text-xs leading-7 text-stone-300">
              <strong className="text-white">{selectedAddress.recipientName} · {selectedAddress.phone}</strong><br />
              {selectedAddress.province}، {selectedAddress.city}<br />{selectedAddress.addressLine}<br />کد پستی: {selectedAddress.postalCode}
            </div> : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold text-gray-300">نام گیرنده<input required minLength={2} maxLength={120} autoComplete="name" value={recipientName} onChange={event => setRecipientName(event.target.value)} className={`${inputClass} mt-2`} /></label>
                <label className="text-xs font-semibold text-gray-300">شماره همراه<input required type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} className={`${inputClass} mt-2`} /></label>
                <label className="text-xs font-semibold text-gray-300">استان<input required minLength={2} maxLength={100} autoComplete="address-level1" value={province} onChange={event => setProvince(event.target.value)} className={`${inputClass} mt-2`} /></label>
                <label className="text-xs font-semibold text-gray-300">شهر<input required minLength={2} maxLength={100} autoComplete="address-level2" value={city} onChange={event => setCity(event.target.value)} className={`${inputClass} mt-2`} /></label>
                <label className="text-xs font-semibold text-gray-300 sm:col-span-2">نشانی کامل<textarea required minLength={8} maxLength={500} rows={3} autoComplete="street-address" value={addressLine} onChange={event => setAddressLine(event.target.value)} className={`${inputClass} mt-2 resize-y leading-relaxed`} /></label>
                <label className="text-xs font-semibold text-gray-300">کد پستی<input required minLength={10} maxLength={10} inputMode="numeric" autoComplete="postal-code" value={postalCode} onChange={event => setPostalCode(event.target.value)} className={`${inputClass} mt-2 font-mono`} /></label>
              </div>
            )}
            <label className="block text-xs font-semibold text-gray-300">یادداشت سفارش (اختیاری)<textarea maxLength={1000} rows={2} value={customerNote} onChange={event => setCustomerNote(event.target.value)} className={`${inputClass} mt-2 resize-y`} /></label>

            <div className="rounded-2xl border border-[#ba8d3d]/20 bg-[#ba8d3d]/5 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#ba8d3d]/10 p-2 text-[#eed29d]"><CreditCard size={14} /></div>
                <div className="text-right"><strong className="block text-xs text-white">پرداخت آنلاین هنوز فعال نیست</strong><span className="mt-1 block text-[10px] text-stone-400">پس از انتخاب روش ارسال، سفارش بدون دریافت وجه و در انتظار پرداخت ثبت می‌شود.</span></div>
              </div>
            </div>
            {quoteError && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs leading-5 text-rose-200">{quoteError}</div>}
            <div className="space-y-3 rounded-2xl border border-white/5 bg-[#0e0d0c]/50 p-4">
              <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-bold text-white">روش ارسال</h3>{quoteLoading && <span role="status" className="text-[10px] text-stone-400">در حال محاسبه…</span>}</div>
              {quote?.shippingMethods.length ? <div className="space-y-2">{quote.shippingMethods.map(method => <label key={method.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selectedShippingMethodId === method.id ? 'border-[#ba8d3d]/50 bg-[#ba8d3d]/[0.07]' : 'border-white/10 hover:border-white/20'} ${quoteLoading ? 'opacity-60' : ''}`}>
                <input type="radio" name="shippingMethod" value={method.id} checked={selectedShippingMethodId === method.id} onChange={() => setSelectedShippingMethodId(method.id)} disabled={quoteLoading} className="mt-1 h-4 w-4 accent-[#ba8d3d]" />
                <span className="flex min-w-0 flex-1 items-start justify-between gap-3 text-right"><span className="min-w-0"><strong className="block text-xs text-white">{method.name}</strong>{method.description && <span className="mt-1 block text-[10px] leading-5 text-stone-400">{method.description}</span>}{method.estimatedMinDays != null && method.estimatedMaxDays != null && <span className="mt-1 block text-[10px] text-stone-400">{method.estimatedMinDays} تا {method.estimatedMaxDays} روز کاری</span>}</span><strong className="shrink-0 text-xs text-[#eed29d]">{method.priceTomans === 0 ? 'رایگان' : `${method.priceTomans.toLocaleString('fa-IR')} تومان`}</strong></span>
              </label>)}</div> : quote && <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">در حال حاضر روش ارسال فعالی برای ثبت سفارش وجود ندارد.</p>}
              {!quote && !quoteLoading && !quoteError && configuration?.orderSubmissionEnabled === false && <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">در حال حاضر روش ارسال فعالی برای ثبت سفارش وجود ندارد.</p>}
              {!quote && !quoteLoading && !quoteError && !configuration && <p role="status" className="text-[10px] leading-5 text-stone-400">اطلاعات ثبت سفارش دریافت نشد. صفحه را دوباره بارگذاری کنید.</p>}
            </div>
            <button type="submit" disabled={!configuration || !selectedShippingMethod || quoteLoading || submitting || unavailable || cart.length === 0 || totalTomans === null} className="w-full rounded-full bg-gradient-to-r from-[#ba8d3d] to-[#e4bc71] px-6 py-4 text-xs font-bold text-[#0e0d0c] shadow-lg transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45">
              {submitting ? 'در حال ثبت سفارش…' : selectedShippingMethod ? 'ثبت سفارش در انتظار پرداخت' : 'ثبت سفارش در حال حاضر در دسترس نیست'}
            </button>
          </form>

          <aside className="space-y-5 rounded-[2rem] border border-white/5 bg-[#141211] p-5 text-right sm:p-7 lg:col-span-5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4"><ClipboardList size={16} className="text-[#eed29d]" /><h2 className="text-sm font-bold text-white">خلاصه سفارش</h2></div>
            <div className="max-h-[340px] space-y-3 overflow-y-auto">
              {quote?.items.map(item => <div key={item.cartItemId} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#0e0d0c]/50 p-3">
                <span className="shrink-0 text-left"><strong className="block font-mono text-xs font-bold text-[#eed29d]">{item.lineTotalTomans.toLocaleString('fa-IR')} تومان</strong><span className="mt-1 block text-[10px] text-stone-500">{item.unitPriceTomans.toLocaleString('fa-IR')} تومان × {item.quantity}</span></span>
                <div className="min-w-0 text-right"><span className="block truncate text-xs font-medium text-white">{item.productName}</span><span className="mt-1 block text-[10px] text-gray-500">{item.colorName} · {item.size} · تعداد {item.quantity}</span><span className="mt-1 block text-[10px] text-gray-500">موجودی فعلی: {item.availableQuantity.toLocaleString('fa-IR')}</span></div>
              </div>)}
              {cart.length === 0 && <p className="py-8 text-center text-sm text-stone-400">سبد خرید خالی است.</p>}
              {cart.length > 0 && !quote && <p role="status" className="py-5 text-center text-xs leading-6 text-stone-400">{quoteLoading ? 'در حال دریافت قیمت و موجودی به‌روز…' : 'قیمت و موجودی به‌روز دریافت نشده است.'}</p>}
            </div>
            <div className="space-y-3 border-t border-white/5 pt-4 text-xs text-gray-400">
              <div className="flex justify-between"><span>{subtotalTomans === null ? '—' : `${subtotalTomans.toLocaleString('fa-IR')} تومان`}</span><span>جمع کالاها</span></div>
              {quote?.discountTomans ? <div className="flex justify-between"><span>{quote.discountTomans.toLocaleString('fa-IR')} تومان</span><span>تخفیف</span></div> : null}
              <div className="flex justify-between"><span>{selectedShippingMethod ? (selectedShippingMethod.priceTomans === 0 ? 'رایگان' : `${selectedShippingMethod.priceTomans.toLocaleString('fa-IR')} تومان`) : '—'}</span><span>هزینه ارسال</span></div>
              <div className="flex items-center justify-between border-t border-white/5 pt-3 text-sm font-bold text-white"><span className="font-mono text-lg text-[#eed29d]">{totalTomans === null ? '—' : `${totalTomans.toLocaleString('fa-IR')} تومان`}</span><span>جمع کل سفارش</span></div>
            </div>
            {selectedShippingMethod ? <div className="flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-3 text-[10px] leading-5 text-stone-400"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-300" /><span>موجودی هنگام ثبت دوباره بررسی و برای {configuration?.reservationMinutes ?? '—'} دقیقه رزرو می‌شود. پرداخت هنوز به درگاه متصل نیست.</span></div> : <div role="status" className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-[10px] leading-5 text-amber-200">مبلغ نهایی پس از فعال‌شدن روش ارسال محاسبه می‌شود.</div>}
          </aside>
        </div>
      </div>
    </section>
  );
}
