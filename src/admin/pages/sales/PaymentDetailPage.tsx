import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Check, RefreshCw, X } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { approvePayment, getPayment, rejectPayment, reverifyBalePayment } from '../../features/paymentsApi';

const panel = 'rounded-2xl border border-white/[0.08] bg-[#131211] p-4 sm:p-6';
const action = 'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';
const orderStatusLabels: Record<string, string> = { draft: 'پیش‌نویس', awaiting_payment: 'در انتظار پرداخت', confirmed: 'تأییدشده', cancelled: 'لغوشده', completed: 'تکمیل‌شده' };
const orderPaymentLabels: Record<string, string> = { unpaid: 'پرداخت‌نشده', pending: 'در حال پرداخت', paid: 'پرداخت‌شده', failed: 'ناموفق', partially_refunded: 'بخشی بازپرداخت‌شده', refunded: 'بازپرداخت‌شده' };
const fulfillmentLabels: Record<string, string> = { unfulfilled: 'آماده‌نشده', ready_to_pack: 'آماده بسته‌بندی', packed: 'بسته‌بندی‌شده', shipped: 'ارسال‌شده', delivered: 'تحویل‌شده', returned: 'مرجوع‌شده' };
const eventLabels: Record<string, string> = {
  attempt_created: 'تلاش پرداخت ایجاد شد', receipt_uploaded: 'رسید ثبت شد', manual_payment_approved: 'پرداخت دستی تأیید شد',
  manual_payment_rejected: 'پرداخت دستی رد شد', bale_start_claimed: 'پیوند پرداخت در بله باز شد', bale_invoice_sent: 'صورتحساب بله ارسال شد',
  bale_invoice_retry_started: 'ارسال صورتحساب بله دوباره آغاز شد',
  payment_failed: 'پرداخت ناموفق بود', bale_invoice_delivery_unknown: 'وضعیت ارسال صورتحساب نامشخص است',
  bale_precheckout_received: 'درخواست نهایی‌سازی بله دریافت شد', bale_precheckout_rejected: 'درخواست بله رد شد',
  bale_payment_received: 'اعلان پرداخت بله دریافت شد', bale_verification_mismatch: 'اطلاعات پرداخت با سفارش تطبیق ندارد',
  payment_verified: 'پرداخت تأیید شد', attempt_expired: 'مهلت تلاش پرداخت پایان یافت', attempt_superseded: 'این تلاش با پرداخت دیگری جایگزین شد',
  bale_inquiry_failed: 'استعلام بله ناموفق بود',
};
const sourceLabels: Record<string, string> = { customer: 'مشتری', staff: 'کارمند', bale: 'بله', system: 'سامانه' };
const invoiceStatusLabels: Record<string, string> = { not_sent: 'ارسال‌نشده', sending: 'در حال ارسال', sent: 'ارسال‌شده', failed: 'ناموفق', unknown: 'نامشخص' };

function eventSummary(event: { eventType: string; metadata: Record<string, unknown> | null }) {
  const metadata = event.metadata;
  if (event.eventType === 'attempt_created') {
    const method = metadata?.method === 'card_to_card' ? 'کارت‌به‌کارت' : metadata?.method === 'bale_wallet' ? 'کیف پول بله' : '';
    const amount = typeof metadata?.amountTomans === 'number' ? ` · ${metadata.amountTomans.toLocaleString('fa-IR')} تومان` : '';
    return `${method}${amount}`;
  }
  if (event.eventType === 'manual_payment_rejected' && typeof metadata?.reason === 'string') return metadata.reason;
  if (typeof metadata?.amountTomans === 'number' && ['manual_payment_approved', 'payment_verified'].includes(event.eventType)) return `${metadata.amountTomans.toLocaleString('fa-IR')} تومان`;
  if (typeof metadata?.sizeBytes === 'number' && event.eventType === 'receipt_uploaded') return `${Math.ceil(metadata.sizeBytes / 1024).toLocaleString('fa-IR')} کیلوبایت`;
  return '';
}

export function PaymentDetailPage({ paymentId }: { paymentId: string }) {
  const { navigate } = useAdminRouter();
  const [payment, setPayment] = useState<Awaited<ReturnType<typeof getPayment>>['payment'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setPayment((await getPayment(paymentId)).payment); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'جزئیات پرداخت دریافت نشد.'); }
    finally { setLoading(false); }
  }, [paymentId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const approve = async () => {
    if (!window.confirm('رسید و واریز بانکی/SMS بانک را بررسی کرده‌اید؟ تصویر رسید به‌تنهایی اثبات واریز نیست.')) return;
    setSaving(true); setError(''); setNotice('');
    try { await approvePayment(paymentId); setNotice('پرداخت پس از بررسی ثبت شد.'); await refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'تأیید پرداخت انجام نشد.'); }
    finally { setSaving(false); }
  };
  const reject = async () => {
    if (reason.trim().length < 2) { setError('برای رد پرداخت، دلیل را وارد کنید.'); return; }
    setSaving(true); setError(''); setNotice('');
    try { await rejectPayment(paymentId, reason.trim()); setReason(''); setNotice('نتیجه بررسی ثبت شد.'); await refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'رد پرداخت انجام نشد.'); }
    finally { setSaving(false); }
  };
  const recheckBale = async () => {
    setRechecking(true); setError(''); setNotice('');
    try {
      const result = await reverifyBalePayment(paymentId);
      setNotice(result.verified ? 'بله پرداخت را در استعلام سرور تأیید کرد.' : 'استعلام انجام شد؛ پرداخت هنوز تأیید نشده است.');
      await refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'استعلام دوباره از بله انجام نشد.'); }
    finally { setRechecking(false); }
  };

  if (loading && !payment) return <section role="status" className="p-10 text-center text-sm text-stone-400">در حال دریافت جزئیات پرداخت…</section>;
  if (!payment) return <section dir="rtl" className="space-y-4"><button onClick={() => navigate('/admin/sales/payments')} className={`${action} border border-white/10 text-stone-300`}><ArrowRight size={15} /> بازگشت به پرداخت‌ها</button><p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error || 'پرداخت پیدا نشد.'}</p></section>;

  const card = payment.method === 'card_to_card' ? payment.methodSnapshot as Record<string, unknown> : null;
  const canReview = payment.method === 'card_to_card' && payment.status === 'pending_verification' && payment.receipts.some(receipt => receipt.reviewStatus === 'pending');
  const methodName = payment.method === 'card_to_card' ? 'کارت‌به‌کارت' : 'کیف پول بله';
  const statusName: Record<string, string> = { created: 'ایجادشده', awaiting_customer: 'در انتظار مشتری', pending_verification: 'در انتظار بررسی', verified: 'تأییدشده', rejected: 'ردشده', failed: 'ناموفق', expired: 'منقضی‌شده' };

  return <section dir="rtl" className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><button onClick={() => navigate('/admin/sales/payments')} className={`${action} border border-white/10 text-stone-300`}><ArrowRight size={15} /> پرداخت‌ها</button><button onClick={() => void refresh()} className={`${action} border border-white/10 text-stone-300`}><RefreshCw size={14} /> تازه‌سازی</button></div>
    <AdminPageHeader title={`پرداخت ${payment.order.orderNumber}`} description="جزئیات و رویدادهای ثبت‌شده در سامانه پرداخت." />
    {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}{notice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      <div className={panel}><h2 className="mb-4 text-sm font-bold text-white">وضعیت پرداخت</h2><dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs"><dt className="text-stone-500">روش</dt><dd className="min-w-0 text-stone-200">{methodName}</dd><dt className="text-stone-500">وضعیت تلاش</dt><dd className="min-w-0 text-stone-200">{statusName[payment.status] ?? payment.status}</dd><dt className="text-stone-500">مبلغ سفارش</dt><dd className="min-w-0 font-mono text-[#eed29d]">{payment.amountTomans.toLocaleString('fa-IR')} تومان</dd><dt className="text-stone-500">مشتری</dt><dd className="min-w-0 break-all text-stone-200">{payment.customer.name} · {payment.customer.email || payment.customer.phone || '—'}</dd><dt className="text-stone-500">شناسه تلاش</dt><dd dir="ltr" className="min-w-0 break-all font-mono text-[10px] text-stone-400">{payment.id}</dd><dt className="text-stone-500">ثبت</dt><dd className="min-w-0 text-stone-200">{new Date(payment.createdAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</dd>{payment.paidAt && <><dt className="text-stone-500">تأیید</dt><dd className="min-w-0 text-stone-200">{new Date(payment.paidAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</dd></>}</dl></div>
      <div className={panel}><h2 className="mb-4 text-sm font-bold text-white">سفارش و گیرنده</h2><dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs"><dt className="text-stone-500">شماره سفارش</dt><dd className="min-w-0"><button onClick={() => navigate(`/admin/sales/orders/${payment.order.id}`)} className="break-all font-mono text-[#eed29d] underline">{payment.order.orderNumber}</button></dd><dt className="text-stone-500">وضعیت سفارش</dt><dd className="min-w-0 break-words text-stone-200">{orderStatusLabels[payment.order.orderStatus] ?? 'نامشخص'}</dd><dt className="text-stone-500">وضعیت پرداخت</dt><dd className="min-w-0 break-words text-stone-200">{orderPaymentLabels[payment.order.paymentStatus] ?? 'نامشخص'}</dd><dt className="text-stone-500">وضعیت ارسال</dt><dd className="min-w-0 break-words text-stone-200">{fulfillmentLabels[payment.order.fulfillmentStatus] ?? 'نامشخص'}</dd><dt className="text-stone-500">گیرنده</dt><dd className="min-w-0 break-words text-stone-200">{payment.order.recipientName}</dd><dt className="text-stone-500">تلفن</dt><dd className="min-w-0 break-all text-stone-200">{payment.order.recipientPhone}</dd><dt className="text-stone-500">نشانی</dt><dd className="col-span-2 min-w-0 break-words leading-6 text-stone-300">{[payment.order.shippingAddress.province, payment.order.shippingAddress.city, payment.order.shippingAddress.addressLine, payment.order.shippingAddress.postalCode].filter(Boolean).join('، ')}</dd></dl></div>
    </div>
    {card && <div className={panel}><h2 className="mb-4 text-sm font-bold text-white">مقصد کارت‌به‌کارت ذخیره‌شده برای این تلاش</h2><div className="grid gap-3 text-xs text-stone-300 sm:grid-cols-2"><p>صاحب کارت: <strong className="text-white">{String(card.cardholderName || '—')}</strong></p><p>بانک: <strong className="text-white">{String(card.bankName || '—')}</strong></p><p dir="ltr" className="font-mono text-[#eed29d]">{String(card.formattedCardNumber || card.cardNumber || '—')}</p><p dir="ltr" className="font-mono">{String(card.accountIban || '')}</p></div>{typeof card.instructions === 'string' && <p className="mt-3 whitespace-pre-line text-xs leading-6 text-stone-400">{card.instructions}</p>}</div>}
    {payment.method === 'bale_wallet' && <div className={panel}><h2 className="mb-4 text-sm font-bold text-white">استعلام بله</h2><dl className="grid gap-3 text-xs sm:grid-cols-2"><dt className="text-stone-500">وضعیت صورتحساب</dt><dd className="text-stone-200">{payment.bale?.invoiceStatus ? invoiceStatusLabels[payment.bale.invoiceStatus] ?? 'نامشخص' : '—'}</dd><dt className="text-stone-500">شناسه تراکنش</dt><dd dir="ltr" className="break-all font-mono text-stone-300">{payment.externalTransactionId ?? '—'}</dd><dt className="text-stone-500">ارجاع ارائه‌دهنده</dt><dd dir="ltr" className="break-all font-mono text-stone-300">{payment.externalProviderReference ?? '—'}</dd><dt className="text-stone-500">ارجاع payload</dt><dd dir="ltr" className="break-all font-mono text-stone-300">{payment.providerPayloadReference ?? payment.bale?.payloadReference ?? '—'}</dd></dl>{payment.status === 'pending_verification' && payment.externalTransactionId && <button type="button" disabled={rechecking} onClick={() => void recheckBale()} className={`${action} mt-4 border border-white/10 text-stone-200`}><RefreshCw size={14} />{rechecking ? 'در حال استعلام…' : 'استعلام دوباره از بله'}</button>}</div>}
    {payment.receipts.length > 0 && <div className={panel}><h2 className="mb-4 text-sm font-bold text-white">رسیدهای ثبت‌شده</h2><div className="grid gap-4 sm:grid-cols-2">{payment.receipts.map(receipt => <article key={receipt.id} className="overflow-hidden rounded-xl border border-white/10"><a href={receipt.url} target="_blank" rel="noreferrer"><img src={receipt.url} alt={`رسید پرداخت ${payment.order.orderNumber}`} className="max-h-[420px] w-full bg-black object-contain" loading="lazy" /></a><div className="space-y-1 p-3 text-[10px] text-stone-400"><p>وضعیت رسید: {receipt.reviewStatus === 'pending' ? 'در انتظار بررسی' : receipt.reviewStatus === 'approved' ? 'تأییدشده' : 'ردشده'}</p><p>{new Date(receipt.uploadedAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })} · {(receipt.sizeBytes / 1024).toFixed(0)} KB</p>{receipt.reviewNote && <p className="text-amber-200">{receipt.reviewNote}</p>}</div></article>)}</div></div>}
    {canReview && <div className={`${panel} space-y-4`}><div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 text-xs leading-6 text-amber-100">تصویر رسید به‌تنهایی اثبات پرداخت نیست. پیش از تأیید، مبلغ، مقصد، شناسه تراکنش و واریز در اعلان یا گردش حساب بانکی را بررسی کنید.</div><div className="flex flex-wrap gap-3"><button type="button" disabled={saving} onClick={() => void approve()} className={`${action} bg-emerald-600 text-white hover:bg-emerald-500`}><Check size={14} /> تأیید پرداخت</button><button type="button" disabled={saving} onClick={() => void reject()} className={`${action} border border-red-400/30 text-red-200 hover:bg-red-500/10`}><X size={14} /> رد پرداخت</button></div><label className="block text-xs text-stone-400">دلیل رد رسید<textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={500} rows={2} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0e0d0c] p-3 text-sm text-white outline-none focus:border-[#ba8d3d]" placeholder="برای رد پرداخت، دلیل را وارد کنید." /></label></div>}
    <div className={panel}><h2 className="mb-4 text-sm font-bold text-white">رویدادهای پرداخت</h2>{payment.timeline.length ? <ol className="space-y-3">{payment.timeline.map((event, index) => { const summary = eventSummary(event); return <li key={`${event.eventType}-${event.createdAt}-${index}`} className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-3 text-xs"><div><strong className="text-stone-200">{eventLabels[event.eventType] ?? 'رویداد پرداخت'}</strong><span className="mr-2 text-stone-500">{sourceLabels[event.source] ?? 'سامانه'}</span>{summary && <p className="mt-1 text-stone-400">{summary}</p>}</div><time className="shrink-0 text-[10px] text-stone-500">{new Date(event.createdAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</time></li>; })}</ol> : <p className="text-xs text-stone-500">هنوز رویدادی ثبت نشده است.</p>}</div>
  </section>;
}
