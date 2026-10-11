import { useEffect, useState, type ChangeEvent } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { listPayments, type AdminPaymentRow } from '../../features/paymentsApi';

const statusLabels: Record<string, string> = {
  created: 'ایجادشده', awaiting_customer: 'در انتظار مشتری', pending_verification: 'در انتظار بررسی',
  verified: 'تأییدشده', rejected: 'ردشده', failed: 'ناموفق', expired: 'منقضی‌شده',
};
const methodLabels = { card_to_card: 'کارت‌به‌کارت', bale_wallet: 'کیف پول بله' };
const buttonClass = 'rounded-xl border border-white/10 px-3 py-2 text-xs text-stone-300 transition-colors hover:border-[#ba8d3d]/40 hover:text-[#eed29d] disabled:opacity-50';

export function PaymentsPage() {
  const { navigate } = useAdminRouter();
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [status, setStatus] = useState('');
  const [review, setReview] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search.trim()) query.set('search', search.trim());
      if (method) query.set('method', method);
      if (status) query.set('status', status);
      if (review) query.set('review', review);
      setLoading(true); setError('');
      void listPayments(query).then(result => {
        if (!active) return;
        setPayments(result.payments); setPagination(result.pagination);
      }).catch(failure => {
        if (active) { setPayments([]); setPagination({ page, pageSize, total: 0, totalPages: 0 }); setError(failure instanceof Error ? failure.message : 'پرداخت‌ها دریافت نشدند.'); }
      }).finally(() => { if (active) setLoading(false); });
    }, 160);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, method, status, review, page, pageSize, reload]);

  const resetPage = (setter: (value: string) => void) => (event: ChangeEvent<HTMLSelectElement>) => { setter(event.target.value); setPage(1); };
  return <section dir="rtl" className="space-y-5">
    <AdminPageHeader title="پرداخت‌ها" description="تلاش‌های پرداخت و رسیدهای واقعی مشتریان. تأیید کارت‌به‌کارت فقط پس از تطبیق با واریز بانکی انجام شود." />
    <div className="rounded-2xl border border-white/[0.08] bg-[#131211] p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2 min-[1100px]:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(140px,180px))_auto]">
        <label className="relative block sm:col-span-2 min-[1100px]:col-span-1"><span className="sr-only">جستجوی پرداخت</span><Search size={15} className="absolute right-3 top-3 text-stone-500" /><input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="شماره سفارش، مشتری یا شناسه تراکنش" className="w-full rounded-xl border border-white/10 bg-[#0e0d0c] py-2.5 pr-9 pl-3 text-xs text-white outline-none focus:border-[#ba8d3d]" /></label>
        <select aria-label="روش پرداخت" value={method} onChange={resetPage(setMethod)} className="rounded-xl border border-white/10 bg-[#0e0d0c] px-3 py-2.5 text-xs text-white"><option value="">همه روش‌ها</option><option value="card_to_card">کارت‌به‌کارت</option><option value="bale_wallet">کیف پول بله</option></select>
        <select aria-label="وضعیت پرداخت" value={status} onChange={resetPage(setStatus)} className="rounded-xl border border-white/10 bg-[#0e0d0c] px-3 py-2.5 text-xs text-white"><option value="">همه وضعیت‌ها</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select aria-label="وضعیت رسید" value={review} onChange={resetPage(setReview)} className="rounded-xl border border-white/10 bg-[#0e0d0c] px-3 py-2.5 text-xs text-white"><option value="">همه رسیدها</option><option value="pending">در انتظار بررسی</option><option value="approved">تأییدشده</option><option value="rejected">ردشده</option></select>
        <button type="button" onClick={() => setReload(value => value + 1)} className={`${buttonClass} inline-flex w-fit items-center gap-2 justify-self-start whitespace-nowrap`} aria-label="بارگذاری دوباره"><RefreshCw size={15} /><span>بارگذاری دوباره</span></button>
      </div>
      {loading ? <p role="status" className="py-10 text-center text-sm text-stone-400">در حال دریافت پرداخت‌ها…</p>
        : error ? <p role="alert" className="py-10 text-center text-sm text-red-200">{error}</p>
          : payments.length === 0 ? <p role="status" className="py-10 text-center text-sm text-stone-400">{pagination.total ? 'پرداختی با این فیلترها پیدا نشد.' : 'هنوز پرداختی ثبت نشده است.'}</p> : <>
            <div className="mt-4 space-y-3 lg:hidden">
              {payments.map(payment => <article key={payment.id} className="rounded-xl border border-white/[0.08] bg-[#0e0d0c] p-4 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" onClick={() => navigate(`/admin/sales/payments/${payment.id}`)} aria-label={`نمایش پرداخت سفارش ${payment.orderNumber}`} className="rounded-sm font-mono font-semibold text-[#eed29d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eed29d]">{payment.orderNumber}</button>
                  <span className="whitespace-nowrap font-mono text-white">{payment.amountTomans.toLocaleString('fa-IR')} تومان</span>
                </div>
                <p className="mt-3 font-medium text-white">{payment.customer.name}</p>
                <p className="mt-1 break-all text-[10px] text-stone-500">{payment.customer.email || payment.customer.phone || '—'}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3">
                  <span className="text-stone-400">{methodLabels[payment.method]}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] ${payment.status === 'verified' ? 'bg-emerald-400/10 text-emerald-200' : payment.status === 'rejected' || payment.status === 'failed' || payment.status === 'expired' ? 'bg-red-400/10 text-red-200' : 'bg-amber-400/10 text-amber-200'}`}>{statusLabels[payment.status] ?? payment.status}</span>
                </div>
                <p className="mt-2 text-[10px] text-stone-500">{new Date(payment.createdAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</p>
              </article>)}
            </div>
            <div className="mt-4 hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[760px] border-collapse text-right text-xs">
                <thead><tr className="border-b border-white/10 text-stone-500"><th className="px-3 py-3 font-medium">سفارش</th><th className="px-3 py-3 font-medium">مشتری</th><th className="px-3 py-3 font-medium">روش</th><th className="px-3 py-3 font-medium">مبلغ</th><th className="px-3 py-3 font-medium">وضعیت</th><th className="px-3 py-3 font-medium">ثبت</th><th className="px-3 py-3" /></tr></thead>
                <tbody>{payments.map(payment => <tr key={payment.id} className="border-b border-white/[0.06] text-stone-300 transition-colors hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-3 py-3 font-mono font-semibold text-[#eed29d]"><button type="button" onClick={() => navigate(`/admin/sales/payments/${payment.id}`)} aria-label={`نمایش پرداخت سفارش ${payment.orderNumber}`} className="rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eed29d]">{payment.orderNumber}</button></td><td className="px-3 py-3"><span className="block font-medium text-white">{payment.customer.name}</span><span className="mt-1 block text-[10px] text-stone-500">{payment.customer.email || payment.customer.phone || '—'}</span></td>
                  <td className="px-3 py-3">{methodLabels[payment.method]}</td><td className="whitespace-nowrap px-3 py-3 font-mono">{payment.amountTomans.toLocaleString('fa-IR')} تومان</td>
                  <td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] ${payment.status === 'verified' ? 'bg-emerald-400/10 text-emerald-200' : payment.status === 'rejected' || payment.status === 'failed' || payment.status === 'expired' ? 'bg-red-400/10 text-red-200' : 'bg-amber-400/10 text-amber-200'}`}>{statusLabels[payment.status] ?? payment.status}</span></td>
                  <td className="whitespace-nowrap px-3 py-3 text-stone-500">{new Date(payment.createdAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</td><td aria-hidden="true" className="px-3 py-3 text-left text-[#eed29d]">›</td>
                </tr>)}</tbody>
              </table>
            </div>
          </>}
      {!loading && pagination.totalPages > 1 && <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-stone-400"><label className="flex items-center gap-2">تعداد در صفحه<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-lg border border-white/10 bg-[#0e0d0c] px-2 py-1 text-white"><option value={20}>۲۰</option><option value={50}>۵۰</option></select></label><div className="flex items-center gap-3"><button disabled={page <= 1} onClick={() => setPage(value => value - 1)} className={buttonClass}>جدیدتر</button><span>{page.toLocaleString('fa-IR')} / {pagination.totalPages.toLocaleString('fa-IR')}</span><button disabled={page >= pagination.totalPages} onClick={() => setPage(value => value + 1)} className={buttonClass}>قدیمی‌تر</button></div></div>}
    </div>
  </section>;
}
