import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle, ClipboardList, Copy, CreditCard, ExternalLink, MapPin, ShieldCheck, Upload } from 'lucide-react';
import { ApiClientError } from '../api/client';
import type { CustomerAddress } from '../features/account/api';
import { loadAddresses } from '../features/account/api';
import { quoteCheckout, type CheckoutConfiguration, type CheckoutOrderInput, type CheckoutQuote, type OrderSnapshot } from '../features/orders/api';
import { createBalePayment, createBalePaymentLink, createCardPayment, loadAvailablePaymentMethods, loadPaymentOptions, loadPaymentStatus, uploadPaymentReceipt, type CustomerPaymentAttempt, type CustomerPaymentMethod, type CustomerPaymentStatus, type PaymentOptions } from '../features/payments/api';
import type { CartItem } from '../types';
import { persianSize } from '../lib/persian-labels';

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
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<CustomerPaymentMethod[] | null>(null);
  const [selectedCheckoutPaymentMethod, setSelectedCheckoutPaymentMethod] = useState<CustomerPaymentMethod['method'] | ''>('');
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderSnapshot | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);
  const [paymentAttempt, setPaymentAttempt] = useState<CustomerPaymentAttempt | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<CustomerPaymentStatus | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card_to_card' | 'bale_wallet' | ''>('');
  const [paymentCard, setPaymentCard] = useState<CustomerPaymentMethod | null>(null);
  const [baleUrl, setBaleUrl] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const paymentKeyRef = useRef<{ orderId: string; method: string; key: string } | null>(null);
  const keyRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const orderHeadingRef = useRef<HTMLHeadingElement>(null);

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
    let active = true;
    loadAvailablePaymentMethods().then(result => {
      if (!active) return;
      setAvailablePaymentMethods(result.methods);
      setSelectedCheckoutPaymentMethod(current => result.methods.some(method => method.method === current)
        ? current : result.methods[0]?.method ?? '');
    }).catch(failure => {
      if (active) setPaymentMethodsError(failure instanceof ApiClientError ? failure.message : 'روش‌های پرداخت بارگذاری نشدند.');
    }).finally(() => { if (active) setPaymentMethodsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (order) {
      window.scrollTo(0, 0);
      orderHeadingRef.current?.focus();
    }
  }, [order]);

  useEffect(() => {
    if (!order) return;
    let active = true;
    setPaymentLoading(true); setPaymentError('');
    void loadPaymentOptions(order.id).then(async options => {
      if (!active) return;
      setPaymentOptions(options);
      const current = options.activeAttempt;
      if (current) {
        setPaymentAttempt(current); setPaymentMethod(current.method);
        if (current.method === 'card_to_card') setPaymentCard(current.methodSnapshot ?? null);
        if (current.method === 'bale_wallet' && current.baleInvoiceStatus === 'not_sent') {
          const link = await createBalePaymentLink(current.id);
          if (active) setBaleUrl(link.paymentUrl);
        }
      }
    }).catch(failure => {
      if (active) setPaymentError(failure instanceof ApiClientError ? failure.message : 'وضعیت روش‌های پرداخت دریافت نشد.');
    }).finally(() => { if (active) setPaymentLoading(false); });
    return () => { active = false; };
  }, [order?.id]);

  useEffect(() => {
    if (!paymentAttempt || !['awaiting_customer', 'pending_verification'].includes(paymentAttempt.status)) return;
    let active = true;
    const refreshStatus = async () => {
      try {
        const current = await loadPaymentStatus(paymentAttempt.id);
        if (!active) return;
        setPaymentStatus(current); setPaymentAttempt(current.attempt);
        if (['rejected', 'failed', 'expired'].includes(current.attempt.status)) {
          const options = await loadPaymentOptions(current.order.id);
          if (!active) return;
          if (!options.activeAttempt) paymentKeyRef.current = null;
          setPaymentOptions(options); setPaymentAttempt(options.activeAttempt); setPaymentMethod(options.activeAttempt?.method ?? '');
          setPaymentCard(options.activeAttempt?.method === 'card_to_card' ? options.activeAttempt.methodSnapshot ?? null : null); setBaleUrl(null);
          setPaymentNotice(current.attempt.status === 'rejected' ? 'پرداخت رد شد. می‌توانید دوباره رسید ارسال کنید یا روش دیگری را انتخاب کنید.' : 'این تلاش پرداخت پایان یافته است. برای ادامه، روش پرداخت دیگری انتخاب کنید.');
        }
      } catch (failure) {
        if (active && failure instanceof ApiClientError && failure.status === 0) setPaymentError('ارتباط قطع شد؛ وضعیت پرداخت پس از برقراری ارتباط دوباره بررسی می‌شود.');
      }
    };
    void refreshStatus();
    const timer = window.setInterval(() => { void refreshStatus(); }, 7000);
    return () => { active = false; window.clearInterval(timer); };
  }, [paymentAttempt?.id, paymentAttempt?.status]);

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
    if (!configuration || !quote || !selectedShippingMethod || !selectedCheckoutPaymentMethod
      || !availablePaymentMethods?.some(method => method.method === selectedCheckoutPaymentMethod)
      || paymentMethodsLoading || paymentMethodsError || quoteLoading || unavailable || cart.length === 0) return;
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
      const createdOrder = await onSubmitOrder(payload, keyRef.current.key);
      const paymentKey = crypto.randomUUID();
      paymentKeyRef.current = { orderId: createdOrder.id, method: selectedCheckoutPaymentMethod, key: paymentKey };
      try {
        if (selectedCheckoutPaymentMethod === 'card_to_card') {
          const result = await createCardPayment(createdOrder.id, paymentKey);
          setPaymentAttempt(result.attempt); setPaymentCard(result.card); setPaymentMethod('card_to_card'); setPaymentOptions(null);
        } else {
          const result = await createBalePayment(createdOrder.id, paymentKey);
          setPaymentAttempt(result.attempt); setPaymentMethod('bale_wallet'); setBaleUrl(result.paymentUrl); setPaymentOptions(null);
          setPaymentNotice(result.paymentUrl ? 'پیوند امن بله آماده است. پرداخت را در بله انجام دهید و همین صفحه را برای بررسی وضعیت باز نگه دارید.' : 'صورتحساب در بله در حال ارسال یا فعال است. پرداخت را در گفت‌وگوی ربات ادامه دهید و این صفحه را باز نگه دارید.');
        }
      } catch (paymentFailure) {
        setPaymentError(paymentFailure instanceof ApiClientError ? paymentFailure.message : 'سفارش ثبت شد، اما شروع پرداخت کامل نشد. از همین صفحه یا حساب کاربری دوباره تلاش کنید.');
      }
      setOrder(createdOrder);
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

  const startPayment = async (method: 'card_to_card' | 'bale_wallet') => {
    if (!order) return;
    setPaymentLoading(true); setPaymentError(''); setPaymentNotice(''); setPaymentStatus(null);
    const current = paymentKeyRef.current;
    const key = current?.orderId === order.id && current.method === method ? current.key : crypto.randomUUID();
    paymentKeyRef.current = { orderId: order.id, method, key };
    try {
      if (method === 'card_to_card') {
        const result = await createCardPayment(order.id, key);
        setPaymentAttempt(result.attempt); setPaymentCard(result.card); setPaymentMethod(method); setBaleUrl(null);
      } else {
        const result = await createBalePayment(order.id, key);
        setPaymentAttempt(result.attempt); setPaymentMethod(method); setBaleUrl(result.paymentUrl);
        setPaymentNotice(result.paymentUrl ? 'پیوند امن بله آماده است. پرداخت را در بله انجام دهید و همین صفحه را برای بررسی وضعیت باز نگه دارید.' : 'صورتحساب قبلی در بله در حال ارسال یا فعال است. پرداخت را در گفت‌وگوی ربات ادامه دهید و این صفحه را باز نگه دارید.');
      }
      setPaymentOptions(null);
    } catch (failure) {
      setPaymentError(failure instanceof ApiClientError ? failure.message : 'شروع پرداخت انجام نشد.');
    } finally { setPaymentLoading(false); }
  };

  const submitReceipt = async () => {
    if (!paymentAttempt || !receiptFile) return;
    setReceiptUploading(true); setPaymentError(''); setPaymentNotice('');
    try {
      const result = await uploadPaymentReceipt(paymentAttempt.id, receiptFile);
      setPaymentAttempt(result.attempt); setReceiptFile(null);
      setPaymentNotice('رسید شما ثبت شد و در انتظار بررسی است. پس از تطبیق واریز بانکی، وضعیت سفارش به‌روزرسانی می‌شود.');
      setPaymentStatus(await loadPaymentStatus(paymentAttempt.id));
    } catch (failure) { setPaymentError(failure instanceof ApiClientError ? failure.message : 'ارسال رسید انجام نشد.'); }
    finally { setReceiptUploading(false); }
  };

  const copyValue = async (value: string, label: string) => {
    try { await navigator.clipboard.writeText(value); setPaymentNotice(`${label} کپی شد.`); }
    catch { setPaymentError('کپی انجام نشد؛ مقدار را دستی انتخاب کنید.'); }
  };

  if (order) {
    const activeCard = paymentCard ?? (paymentAttempt?.method === 'card_to_card' ? paymentAttempt.methodSnapshot ?? null : null);
    const isPaid = paymentStatus?.order.paymentStatus === 'paid' || order.paymentStatus === 'paid';
    const receiptPending = paymentAttempt?.method === 'card_to_card' && paymentAttempt.status === 'pending_verification';
    const balePending = paymentAttempt?.method === 'bale_wallet' && paymentAttempt.status === 'pending_verification';
    return (
      <section className="min-h-[100dvh] px-6 pb-24 pt-12 md:px-12 md:pt-8">
        <div className="double-bezel-outer mx-auto w-full max-w-2xl">
          <div className="double-bezel flex flex-col items-center bg-[#151312] p-8 text-center md:p-12">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#ba8d3d]/30 bg-[#ba8d3d]/10 text-[#eed29d]"><CheckCircle size={30} /></div>
            <h1 ref={orderHeadingRef} tabIndex={-1} className="mb-3 rounded-sm text-2xl font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#eed29d] md:text-3xl">سفارش شما ثبت شد</h1>
            <p className="mb-6 max-w-[50ch] text-sm leading-relaxed text-gray-400">{isPaid ? 'پرداخت شما از سامانه تأیید شد.' : receiptPending ? 'رسید شما ثبت شد و در انتظار بررسی است.' : balePending ? 'تأیید پرداخت بله از طریق استعلام سرور در حال انجام است.' : 'سفارش ثبت شده و تا تأیید پرداخت، در انتظار پرداخت می‌ماند.'}</p>
            <div className="mb-6 w-full max-w-md rounded-3xl border border-white/5 bg-[#0e0d0c] p-6">
              <div className="mb-2 text-[10px] tracking-wide text-gray-500">شماره سفارش</div>
              <div dir="ltr" className="whitespace-nowrap font-mono text-base font-bold tracking-wide text-[#eed29d] sm:text-xl">{order.orderNumber}</div>
              <div className={`mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${isPaid ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200' : 'border-amber-400/20 bg-amber-400/10 text-amber-200'}`}>
                <CreditCard size={13} /> وضعیت پرداخت: {isPaid ? 'تأییدشده' : receiptPending ? 'رسید در انتظار بررسی' : balePending ? 'تأیید بله در حال انجام' : paymentAttempt?.status === 'rejected' ? 'ردشده' : paymentAttempt?.status === 'failed' || paymentAttempt?.status === 'expired' ? 'ناموفق یا منقضی' : 'در انتظار پرداخت'}
              </div>
              <div className="mt-3 text-sm text-stone-300">مبلغ سفارش: {order.totalTomans.toLocaleString('fa-IR')} تومان</div>
              <div className="mt-2 text-xs text-stone-400">روش ارسال: {order.shippingMethodName || '—'} · هزینه ارسال: {order.shippingTomans.toLocaleString('fa-IR')} تومان</div>
            </div>
            {paymentError && <div role="alert" className="mb-4 w-full max-w-xl rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-right text-sm text-red-200">{paymentError}</div>}
            {paymentNotice && <div role="status" className="mb-4 w-full max-w-xl rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-3 text-right text-xs leading-6 text-emerald-100">{paymentNotice}</div>}
            {paymentLoading && <p role="status" className="mb-4 text-xs text-stone-400">در حال بررسی روش‌های پرداخت…</p>}
            {paymentOptions && !isPaid && !paymentAttempt && paymentOptions.methods.length > 0 && <div className="mb-6 w-full max-w-xl space-y-3 text-right">
              <h2 className="text-sm font-bold text-white">روش پرداخت</h2>
              {paymentOptions.methods.map(method => <button key={method.method} type="button" disabled={paymentLoading} onClick={() => void startPayment(method.method)} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0e0d0c] p-4 text-right transition-colors hover:border-[#ba8d3d]/50 disabled:opacity-50"><span className="text-[#eed29d]">{method.method === 'card_to_card' ? '›' : '›'}</span><span className="flex-1"><strong className="block text-sm text-white">{method.title}</strong><span className="mt-1 block text-xs text-stone-400">{method.description}</span></span></button>)}
            </div>}
            {paymentOptions?.unavailableReason === 'NO_ACTIVE_PAYMENT_METHOD' && !paymentAttempt && <p role="status" className="mb-5 max-w-xl rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs leading-6 text-amber-100">در حال حاضر روش پرداخت فعالی برای تکمیل این سفارش وجود ندارد. سفارش در انتظار پرداخت باقی می‌ماند.</p>}
            {paymentAttempt && !isPaid && <div className="mb-6 w-full max-w-xl space-y-4 rounded-2xl border border-white/10 bg-[#0e0d0c] p-4 text-right sm:p-5">
              {paymentAttempt.method === 'card_to_card' && activeCard && <>
                <h2 className="text-sm font-bold text-white">پرداخت کارت‌به‌کارت</h2>
                <p className="text-xs leading-6 text-stone-400">مبلغ سفارش را به کارت زیر واریز کنید و سپس تصویر رسید را ارسال کنید.</p>
                <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4 text-center"><p className="text-[10px] text-stone-500">مبلغ دقیق</p><div className="mt-2 flex items-center justify-center gap-3"><strong className="font-mono text-lg text-[#eed29d]">{paymentAttempt.amountTomans.toLocaleString('fa-IR')} تومان</strong><button type="button" onClick={() => void copyValue(String(paymentAttempt.amountTomans), 'مبلغ')} aria-label="کپی مبلغ" className="rounded-lg border border-white/10 p-2 text-stone-300 hover:text-white"><Copy size={14} /></button></div><p className="mt-4 text-[10px] text-stone-500">شماره کارت · {String(activeCard.bankName || '')}</p><div className="mt-2 flex flex-wrap items-center justify-center gap-3"><strong dir="ltr" className="font-mono text-sm tracking-wide text-white">{String(activeCard.formattedCardNumber || activeCard.cardNumber || '—')}</strong><button type="button" onClick={() => void copyValue(String(activeCard.cardNumber || ''), 'شماره کارت')} aria-label="کپی شماره کارت" className="rounded-lg border border-white/10 p-2 text-stone-300 hover:text-white"><Copy size={14} /></button></div><p className="mt-2 text-xs text-stone-300">{String(activeCard.cardholderName || '')}</p>{activeCard.accountIban && <p dir="ltr" className="mt-2 font-mono text-[10px] text-stone-400">{String(activeCard.accountIban)}</p>}</div>
                {!!activeCard.instructions && <p className="whitespace-pre-line text-xs leading-6 text-stone-300">{String(activeCard.instructions)}</p>}
                {receiptPending ? <p className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs leading-6 text-amber-100">رسید پرداخت ثبت شده و در انتظار بررسی است. تا تطبیق با واریز بانکی، پرداخت تأیید نمی‌شود.</p> : <div className="space-y-3"><label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-[#eed29d] transition-colors hover:bg-white/5 focus-within:outline focus-within:outline-2 focus-within:outline-[#ba8d3d]"><span>{receiptFile ? 'تغییر تصویر رسید' : 'انتخاب تصویر رسید'}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setReceiptFile(event.target.files?.[0] ?? null)} className="sr-only" /></label>{receiptFile && <p className="text-[10px] text-stone-500">{receiptFile.name} · {Math.round(receiptFile.size / 1024).toLocaleString('fa-IR')} کیلوبایت</p>}<button type="button" disabled={!receiptFile || receiptUploading} onClick={() => void submitReceipt()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ba8d3d] px-4 py-3 text-xs font-bold text-[#0e0d0c] disabled:opacity-50"><Upload size={14} />{receiptUploading ? 'در حال ارسال رسید…' : 'ارسال رسید پرداخت'}</button></div>}
              </>}
              {paymentAttempt.method === 'bale_wallet' && <><h2 className="text-sm font-bold text-white">پرداخت با کیف پول بله</h2><p className="text-xs leading-6 text-stone-400">پرداخت را در گفت‌وگوی ربات بله انجام دهید. وضعیت فقط پس از تأیید سرور به‌روزرسانی می‌شود.</p>{baleUrl ? <a href={baleUrl} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ba8d3d] px-4 py-3 text-xs font-bold text-[#0e0d0c]">ادامه پرداخت در بله <ExternalLink size={14} /></a> : <p className="rounded-xl border border-white/[0.07] p-3 text-xs leading-6 text-stone-400">اگر صورتحساب قبلاً ساخته شده، گفت‌وگوی ربات بله را بررسی کنید. برای پیگیری، این صفحه را تازه‌سازی کنید.</p>}<p className="text-[10px] text-stone-500">اگر بله باز نشد، دوباره تلاش کنید. نتیجه پرداخت از روی بازگشت مرورگر تعیین نمی‌شود.</p></>}
              {paymentStatus?.receipt?.reviewNote && <p className="rounded-xl border border-red-400/20 bg-red-500/5 p-3 text-xs leading-6 text-red-100">دلیل رد رسید: {paymentStatus.receipt.reviewNote}</p>}
            </div>}
            {paymentError && order && !paymentOptions && <button type="button" onClick={() => { setPaymentError(''); setPaymentLoading(true); void loadPaymentOptions(order.id).then(setPaymentOptions).catch(failure => setPaymentError(failure instanceof Error ? failure.message : 'روش‌های پرداخت دریافت نشدند.')).finally(() => setPaymentLoading(false)); }} className="mb-4 rounded-xl border border-white/10 px-4 py-2.5 text-xs text-stone-300">تلاش دوباره برای دریافت روش پرداخت</button>}
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
          <span className="font-mono text-[10px] tracking-wide text-[#ba8d3d]">مرور سفارش</span>
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
            <div className="space-y-3 rounded-2xl border border-white/5 bg-[#0e0d0c]/50 p-4">
              <div className="flex items-center justify-between gap-3"><h3 className="text-xs font-bold text-white">روش پرداخت</h3>{paymentMethodsLoading && <span role="status" className="text-[10px] text-stone-400">در حال دریافت روش‌ها…</span>}</div>
              {paymentMethodsError && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs leading-5 text-red-200">{paymentMethodsError}</p>}
              {availablePaymentMethods?.length ? <div className="space-y-2">{availablePaymentMethods.map(method => <label key={method.method} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selectedCheckoutPaymentMethod === method.method ? 'border-[#ba8d3d]/50 bg-[#ba8d3d]/[0.07]' : 'border-white/10 hover:border-white/20'}`}>
                <input type="radio" name="paymentMethod" value={method.method} checked={selectedCheckoutPaymentMethod === method.method} onChange={() => setSelectedCheckoutPaymentMethod(method.method)} disabled={paymentMethodsLoading || submitting} className="mt-1 h-4 w-4 accent-[#ba8d3d]" />
                <span className="min-w-0 flex-1 text-right"><strong className="block text-xs text-white">{method.title}</strong><span className="mt-1 block text-[10px] leading-5 text-stone-400">{method.description}</span></span>
              </label>)}</div> : !paymentMethodsLoading && !paymentMethodsError && <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-200">در حال حاضر روش پرداخت فعالی برای ثبت سفارش وجود ندارد.</p>}
              {availablePaymentMethods?.length ? <p className="text-[10px] leading-5 text-stone-500">سفارش پس از ثبت با روش انتخاب‌شده قابل پرداخت است و تا تأیید سرور در انتظار می‌ماند.</p> : null}
            </div>
            <button type="submit" disabled={!configuration || !selectedShippingMethod || !selectedCheckoutPaymentMethod || !availablePaymentMethods?.length || paymentMethodsLoading || Boolean(paymentMethodsError) || quoteLoading || submitting || unavailable || cart.length === 0 || totalTomans === null} className="w-full rounded-full bg-gradient-to-r from-[#ba8d3d] to-[#e4bc71] px-6 py-4 text-xs font-bold text-[#0e0d0c] shadow-lg transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45">
              {submitting ? 'در حال ثبت سفارش و آغاز پرداخت…' : selectedShippingMethod && selectedCheckoutPaymentMethod ? 'ثبت سفارش و ادامه پرداخت' : 'ثبت سفارش در حال حاضر در دسترس نیست'}
            </button>
          </form>

          <aside className="space-y-5 rounded-[2rem] border border-white/5 bg-[#141211] p-5 text-right sm:p-7 lg:col-span-5">
            <div className="flex items-center gap-3 border-b border-white/5 pb-4"><ClipboardList size={16} className="text-[#eed29d]" /><h2 className="text-sm font-bold text-white">خلاصه سفارش</h2></div>
            <div className="max-h-[340px] space-y-3 overflow-y-auto">
              {quote?.items.map(item => <div key={item.cartItemId} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-[#0e0d0c]/50 p-3">
                <span className="shrink-0 text-left"><strong className="block font-mono text-xs font-bold text-[#eed29d]">{item.lineTotalTomans.toLocaleString('fa-IR')} تومان</strong><span className="mt-1 block text-[10px] text-stone-500">{item.unitPriceTomans.toLocaleString('fa-IR')} تومان × {item.quantity}</span></span>
                <div className="min-w-0 text-right"><span className="block truncate text-xs font-medium text-white">{item.productName}</span><span className="mt-1 block text-[10px] text-gray-500">{item.colorName} · {persianSize(item.size)} · تعداد {item.quantity}</span><span className="mt-1 block text-[10px] text-gray-500">موجودی فعلی: {item.availableQuantity.toLocaleString('fa-IR')}</span></div>
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
            {selectedShippingMethod ? <div className="flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-500/5 p-3 text-[10px] leading-5 text-stone-400"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-300" /><span>موجودی هنگام ثبت دوباره بررسی و برای {configuration?.reservationMinutes ?? '—'} دقیقه رزرو می‌شود. هیچ سفارشی تا تأیید پرداخت بله یا بررسی دستی، پرداخت‌شده نیست.</span></div> : <div role="status" className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-[10px] leading-5 text-amber-200">مبلغ نهایی پس از فعال‌شدن روش ارسال محاسبه می‌شود.</div>}
          </aside>
        </div>
      </div>
    </section>
  );
}
