import { useEffect, useRef, useState } from 'react';
import { Copy, ExternalLink, Upload } from 'lucide-react';
import { ApiClientError } from '../api/client';
import { createBalePayment, createBalePaymentLink, createCardPayment, loadPaymentOptions, loadPaymentStatus, uploadPaymentReceipt, type CustomerPaymentAttempt, type CustomerPaymentMethod, type CustomerPaymentStatus, type PaymentOptions } from '../features/payments/api';

type Summary = { method: string; status: string; failureMessage: string | null; receipt: { status: string; reviewNote: string | null } | null } | null;
const buttonClass = 'rounded-lg border border-white/10 px-3 py-2 text-[10px] text-stone-300 transition-colors hover:border-[#ba8d3d]/40 hover:text-[#eed29d] disabled:opacity-50';

export function CustomerOrderPayment({ orderId, orderStatus, paymentStatus, summary }: {
  orderId: string; orderStatus: string; paymentStatus: string; summary: Summary;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<PaymentOptions | null>(null);
  const [attempt, setAttempt] = useState<CustomerPaymentAttempt | null>(null);
  const [status, setStatus] = useState<CustomerPaymentStatus | null>(null);
  const [card, setCard] = useState<CustomerPaymentMethod | null>(null);
  const [baleUrl, setBaleUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pollError, setPollError] = useState('');
  const [pollRetry, setPollRetry] = useState(0);
  const keyRef = useRef<{ method: string; key: string } | null>(null);
  const baleRecoveryRequested = useRef<string | null>(null);

  const requestBaleRecoveryLink = async (attemptId: string, retry = false) => {
    if (!retry && baleRecoveryRequested.current === attemptId) return;
    baleRecoveryRequested.current = attemptId;
    try {
      const result = await createBalePaymentLink(attemptId);
      setBaleUrl(result.paymentUrl);
      setNotice(result.paymentUrl
        ? 'اگر صورتحساب قبلی در بله دیده می‌شود همان را تکمیل کنید؛ در غیر این صورت پیوند را دوباره باز کنید.'
        : 'صورتحساب در حال ارسال است یا در گفت‌وگوی بله قرار دارد.');
    } catch (failure) {
      baleRecoveryRequested.current = null;
      throw failure;
    }
  };

  const openPayment = async () => {
    setOpen(true); setBusy(true); setError('');
    try {
      const next = await loadPaymentOptions(orderId);
      setOptions(next); setAttempt(next.activeAttempt);
      if (!next.activeAttempt) {
        keyRef.current = null;
        baleRecoveryRequested.current = null;
        setStatus(null); setCard(null); setBaleUrl(null); setFile(null);
      }
      if (next.activeAttempt?.method === 'card_to_card') setCard(next.activeAttempt.methodSnapshot ?? null);
      if (next.activeAttempt?.method === 'bale_wallet' && ['not_sent', 'unknown'].includes(next.activeAttempt.baleInvoiceStatus ?? '')) {
        await requestBaleRecoveryLink(next.activeAttempt.id, true);
      }
    } catch (failure) { setError(failure instanceof ApiClientError ? failure.message : 'وضعیت پرداخت دریافت نشد.'); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!open || !attempt || !['awaiting_customer', 'pending_verification'].includes(attempt.status)) return;
    let active = true;
    const poll = async () => {
      try {
        const next = await loadPaymentStatus(attempt.id);
        if (!active) return;
        setStatus(next); setAttempt(next.attempt); setPollError('');
        if (next.attempt.method === 'bale_wallet' && next.attempt.baleInvoiceStatus === 'unknown'
          && baleRecoveryRequested.current !== next.attempt.id) {
          await requestBaleRecoveryLink(next.attempt.id);
        } else if (next.attempt.method === 'bale_wallet' && next.attempt.baleInvoiceStatus !== 'unknown') {
          setBaleUrl(null);
        }
        if (['rejected', 'failed', 'expired'].includes(next.attempt.status)) {
          const refreshed = await loadPaymentOptions(orderId);
          if (!active) return;
          if (!refreshed.activeAttempt) keyRef.current = null;
          setOptions(refreshed); setAttempt(refreshed.activeAttempt);
          setCard(refreshed.activeAttempt?.method === 'card_to_card' ? refreshed.activeAttempt.methodSnapshot ?? null : null); setBaleUrl(null);
        }
      } catch { if (active) setPollError('وضعیت تازه دریافت نشد؛ آخرین وضعیت تأییدشده حفظ شده است. دوباره تلاش کنید.'); }
    };
    void poll();
    const timer = window.setInterval(() => { void poll(); }, 7000);
    return () => { active = false; window.clearInterval(timer); };
  }, [open, orderId, attempt?.id, attempt?.status, pollRetry]);

  const createAttempt = async (method: 'card_to_card' | 'bale_wallet') => {
    setBusy(true); setError(''); setNotice('');
    const key = keyRef.current?.method === method ? keyRef.current.key : crypto.randomUUID();
    keyRef.current = { method, key };
    try {
      if (method === 'card_to_card') {
        const result = await createCardPayment(orderId, key); setAttempt(result.attempt); setCard(result.card); setBaleUrl(null); setStatus(null);
      } else {
        const result = await createBalePayment(orderId, key); setAttempt(result.attempt); setBaleUrl(result.paymentUrl); setStatus(null);
        setNotice(result.paymentUrl ? 'پیوند بله آماده است؛ پرداخت را در ربات انجام دهید.' : 'صورتحساب در بله در دسترس است. صفحه را برای بررسی وضعیت باز نگه دارید.');
      }
      setOptions(null);
    } catch (failure) { setError(failure instanceof ApiClientError ? failure.message : 'شروع پرداخت انجام نشد.'); }
    finally { setBusy(false); }
  };

  const submitReceipt = async () => {
    if (!attempt || !file) return;
    setBusy(true); setError('');
    try {
      const result = await uploadPaymentReceipt(attempt.id, file); setAttempt(result.attempt); setFile(null);
      setStatus(await loadPaymentStatus(attempt.id)); setNotice('رسید ثبت شد و در انتظار بررسی است.');
    } catch (failure) { setError(failure instanceof ApiClientError ? failure.message : 'ارسال رسید انجام نشد.'); }
    finally { setBusy(false); }
  };

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setNotice('کپی شد.'); }
    catch { setError('کپی انجام نشد؛ مقدار را دستی انتخاب کنید.'); }
  };
  const effectivePaymentStatus = status?.order.paymentStatus ?? (attempt?.status === 'verified' ? 'paid' : paymentStatus);
  const receiptPending = attempt?.method === 'card_to_card' && attempt.status === 'pending_verification'
    || !attempt && summary?.method === 'card_to_card' && summary.receipt?.status === 'pending';
  const balePending = attempt?.method === 'bale_wallet' && attempt.status === 'pending_verification';
  const stateLabel = effectivePaymentStatus === 'paid' ? 'پرداخت تأیید شد' : receiptPending ? 'رسید در انتظار بررسی' : balePending ? 'تأیید پرداخت بله در حال انجام' : attempt?.status === 'rejected' || (!attempt && summary?.method === 'card_to_card' && summary.receipt?.status === 'rejected') ? 'رسید رد شد' : attempt?.status === 'failed' || attempt?.status === 'expired' || effectivePaymentStatus === 'failed' ? 'پرداخت ناموفق' : effectivePaymentStatus === 'pending' || attempt?.status === 'awaiting_customer' ? 'در انتظار پرداخت' : 'پرداخت‌نشده';
  const cardDetails = card ?? (attempt?.method === 'card_to_card' ? attempt.methodSnapshot ?? null : null);

  return <div className="mt-3 w-full border-t border-white/[0.06] pt-3 text-right">
    <div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] ${paymentStatus === 'paid' ? 'bg-emerald-400/10 text-emerald-200' : summary?.receipt?.status === 'pending' ? 'bg-amber-400/10 text-amber-200' : 'bg-white/[0.06] text-stone-300'}`}>{stateLabel}</span>
      {orderStatus === 'awaiting_payment' && effectivePaymentStatus !== 'paid' && <button type="button" onClick={() => open ? setOpen(false) : void openPayment()} className={buttonClass}>{open ? 'بستن' : summary?.receipt?.status === 'pending' || attempt?.status === 'pending_verification' ? 'پیگیری پرداخت' : 'ادامه پرداخت'}</button>}
    </div>
    {summary?.failureMessage && <p className="mt-2 text-[10px] leading-5 text-amber-200">{summary.failureMessage}</p>}
    {open && <div className="mt-3 space-y-3 rounded-xl border border-white/[0.07] bg-black/20 p-3">
      {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-500/10 p-2 text-xs text-red-200">{error}</p>}{notice && <p role="status" className="rounded-lg border border-emerald-400/15 bg-emerald-500/5 p-2 text-xs text-emerald-100">{notice}</p>}
      {pollError && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-400/20 bg-amber-500/5 p-2 text-xs text-amber-100"><span>{pollError}</span><button type="button" onClick={() => setPollRetry(value => value + 1)} className={buttonClass}>تلاش دوباره</button></div>}
      {busy && <p role="status" className="text-xs text-stone-400">در حال دریافت یا ثبت اطلاعات پرداخت…</p>}
      {options?.unavailableReason && !options.methods.length && !attempt && <p className="text-xs leading-5 text-amber-100">در حال حاضر روش پرداخت فعالی برای این سفارش وجود ندارد.</p>}
      {options?.methods.map(method => <button key={method.method} type="button" disabled={busy} onClick={() => void createAttempt(method.method)} className="flex w-full items-center justify-between rounded-lg border border-white/10 p-3 text-xs text-white hover:border-[#ba8d3d]/40"><span className="text-[#eed29d]">›</span><span className="text-right"><strong className="block">{method.title}</strong><span className="mt-1 block text-[10px] text-stone-500">{method.description}</span></span></button>)}
      {attempt?.method === 'card_to_card' && cardDetails && <div className="space-y-3"><p className="text-xs text-stone-300">مبلغ {attempt.amountTomans.toLocaleString('fa-IR')} تومان را به کارت زیر واریز کنید.</p><div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/[0.06] p-3"><strong dir="ltr" className="font-mono text-xs text-[#eed29d]">{String(cardDetails.formattedCardNumber || cardDetails.cardNumber || '')}</strong><button type="button" onClick={() => void copy(String(cardDetails.cardNumber || ''))} className={buttonClass}><Copy size={12} /> کپی کارت</button><span className="text-[10px] text-stone-400">{String(cardDetails.cardholderName || '')}</span></div>
        {attempt.status === 'pending_verification' ? <p className="text-xs leading-5 text-amber-100">رسید ثبت شد و در انتظار بررسی است. {status?.receipt?.reviewNote ?? ''}</p> : <><label className="block text-[10px] text-stone-400">تصویر رسید<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full text-xs text-stone-300" /></label><button disabled={!file || busy} onClick={() => void submitReceipt()} type="button" className={`${buttonClass} w-full`}><Upload size={12} /> ارسال رسید</button></>}</div>}
      {attempt?.method === 'bale_wallet' && <div className="space-y-2"><p className="text-xs text-stone-300">پس از پرداخت در بله، وضعیت از سرور دریافت می‌شود.</p>{baleUrl ? <a href={baleUrl} target="_blank" rel="noreferrer" className={`${buttonClass} flex items-center justify-center gap-2`}>{attempt.baleInvoiceStatus === 'unknown' ? 'تلاش دوباره در بله' : 'ادامه در بله'} <ExternalLink size={12} /></a> : attempt.baleInvoiceStatus === 'unknown' ? <div className="space-y-2"><p className="text-[10px] leading-5 text-amber-100">نتیجه ارسال قبلی مشخص نیست. اگر صورتحساب را در بله نمی‌بینید، پیوند امن تازه بگیرید؛ مبلغ دوبار ثبت نمی‌شود.</p><button type="button" disabled={busy} onClick={() => { setBusy(true); setError(''); void requestBaleRecoveryLink(attempt.id, true).catch(failure => setError(failure instanceof ApiClientError ? failure.message : 'پیوند بله دریافت نشد.')).finally(() => setBusy(false)); }} className={buttonClass}>گرفتن پیوند تلاش دوباره</button></div> : <p className="text-[10px] text-stone-500">صورتحساب در حال ارسال است یا در گفت‌وگوی ربات بله قرار دارد.</p>}</div>}
      {attempt?.status === 'verified' && <p className="text-xs text-emerald-200">پرداخت توسط سرور تأیید شد.</p>}
    </div>}
  </div>;
}
