import React, { useEffect, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button, Pagination, SearchInput, Table, type ColumnDef } from '../../components/ui';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { listAdminOrders, type AdminOrder } from '../../features/commerceApi';

const orderLabels: Record<string, string> = {
  draft: 'پیش‌نویس', awaiting_payment: 'در انتظار پرداخت', confirmed: 'تأییدشده', cancelled: 'لغوشده', completed: 'تکمیل‌شده',
};
const paymentLabels: Record<string, string> = {
  unpaid: 'پرداخت‌نشده', pending: 'در حال پرداخت', paid: 'پرداخت‌شده', failed: 'ناموفق', partially_refunded: 'بازپرداخت بخشی', refunded: 'بازپرداخت‌شده',
};
const orderTone = (value: string) => value === 'cancelled' ? 'danger' : value === 'completed' || value === 'confirmed' ? 'success' : 'warning';

export const OrdersPage: React.FC = () => {
  const { navigate } = useAdminRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError('');
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search.trim()) query.set('search', search.trim());
      if (status) query.set('status', status);
      if (paymentStatus) query.set('paymentStatus', paymentStatus);
      if (dateFrom) query.set('dateFrom', dateFrom);
      if (dateTo) query.set('dateTo', dateTo);
      void listAdminOrders(query).then(result => {
        if (!active) return;
        setOrders(result.orders);
        setTotal(result.pagination.total);
        setTotalPages(result.pagination.totalPages);
      }).catch(failure => {
        if (active) {
          setOrders([]);
          setTotal(0);
          setTotalPages(0);
          setError(failure instanceof Error ? failure.message : 'سفارش‌ها دریافت نشدند.');
        }
      }).finally(() => { if (active) setLoading(false); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [page, pageSize, search, status, paymentStatus, dateFrom, dateTo, reload]);

  const hasFilters = Boolean(search.trim() || status || paymentStatus || dateFrom || dateTo);
  const emptyMessage = error
    ? '\u062f\u0631\u06cc\u0627\u0641\u062a \u0633\u0641\u0627\u0631\u0634\u200c\u0647\u0627 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062f.'
    : total > 0
      ? '\u062f\u0631 \u0627\u06cc\u0646 \u0635\u0641\u062d\u0647 \u0633\u0641\u0627\u0631\u0634\u06cc \u0628\u0631\u0627\u06cc \u0646\u0645\u0627\u06cc\u0634 \u0646\u06cc\u0633\u062a.'
      : hasFilters
        ? '\u0633\u0641\u0627\u0631\u0634\u06cc \u0628\u0627 \u0627\u06cc\u0646 \u0641\u06cc\u0644\u062a\u0631\u0647\u0627 \u067e\u06cc\u062f\u0627 \u0646\u0634\u062f.'
        : '\u0647\u0646\u0648\u0632 \u0633\u0641\u0627\u0631\u0634 \u0648\u0627\u0642\u0639\u06cc \u062b\u0628\u062a \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.';

  const columns: ColumnDef<AdminOrder>[] = [
    { key: 'orderNumber', header: 'شماره سفارش', render: order => <span className="whitespace-nowrap font-mono font-bold text-[#eed29d]">{order.orderNumber}</span> },
    { key: 'customer', header: 'مشتری', render: order => <div><div className="font-semibold text-white">{order.customerName}</div><div className="mt-1 text-[10px] text-stone-500">{order.customerEmail || order.customerPhone || '—'}</div></div> },
    { key: 'totalTomans', header: 'مبلغ', align: 'left', render: order => <span className="font-mono">{order.totalTomans.toLocaleString('fa-IR')} تومان</span> },
    { key: 'orderStatus', header: 'وضعیت سفارش', render: order => <Badge tone={orderTone(order.orderStatus)}>{orderLabels[order.orderStatus] ?? order.orderStatus}</Badge> },
    { key: 'paymentStatus', header: 'وضعیت پرداخت', render: order => <Badge tone={order.paymentStatus === 'paid' ? 'success' : order.paymentStatus === 'failed' ? 'danger' : 'neutral'}>{paymentLabels[order.paymentStatus] ?? order.paymentStatus}</Badge> },
    { key: 'createdAt', header: 'تاریخ ثبت', render: order => <span className="text-xs text-stone-400">{new Date(order.createdAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</span> },
    { key: 'open', header: 'جزئیات', align: 'center', render: order => <Button size="sm" variant="ghost" leftIcon={<Eye size={14} />} aria-label={`نمایش ${order.orderNumber}`}>نمایش</Button> },
  ];

  return <section dir="rtl" className="space-y-5">
    <AdminPageHeader title="سفارش‌ها" description="سفارش‌های ثبت‌شده در پایگاه داده؛ پرداخت از طریق درگاه هنوز فعال نیست." actions={<Button variant="outline" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => setReload(value => value + 1)}>به‌روزرسانی</Button>} />
    {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200"><span>{error}</span><Button size="sm" variant="outline" onClick={() => setReload(value => value + 1)}>تلاش دوباره</Button></div>}
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="شماره، نام، تلفن یا ایمیل" ariaLabel="جستجوی سفارش‌ها" />
      <select aria-label="وضعیت سفارش" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="min-h-[42px] rounded-xl border border-white/10 bg-[#181716] px-3 text-sm text-white"><option value="">همه وضعیت‌های سفارش</option>{Object.entries(orderLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <select aria-label="وضعیت پرداخت" value={paymentStatus} onChange={event => { setPaymentStatus(event.target.value); setPage(1); }} className="min-h-[42px] rounded-xl border border-white/10 bg-[#181716] px-3 text-sm text-white"><option value="">همه وضعیت‌های پرداخت</option>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-w-0 items-center gap-1.5 text-[10px] text-stone-500">{'\u0627\u0632'}<input aria-label="از تاریخ" type="date" value={dateFrom} onChange={event => { setDateFrom(event.target.value); setPage(1); }} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#181716] px-2 text-xs text-white" /></label>
        <label className="flex min-w-0 items-center gap-1.5 text-[10px] text-stone-500">{'\u062a\u0627'}<input aria-label="تا تاریخ" type="date" value={dateTo} onChange={event => { setDateTo(event.target.value); setPage(1); }} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#181716] px-2 text-xs text-white" /></label>
      </div>
    </div>
    <div className="flex items-center justify-between text-xs text-stone-400"><span>تعداد سفارش‌های منطبق</span><strong className="font-mono text-white">{error || loading ? '—' : total === 0 ? <span className="persian-zero">۰</span> : total.toLocaleString('fa-IR')}</strong></div>
    <Table columns={columns} data={orders} keyExtractor={order => order.id} isLoading={loading} emptyMessage={emptyMessage} onRowClick={order => navigate(`/admin/sales/orders/${order.id}`)} ariaLabel="سفارش‌های ثبت‌شده" mobileScrollHint />
    {!error && !loading && <Pagination currentPage={page} totalPages={Math.max(1, totalPages)} totalItems={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} pageSizeOptions={[10, 20, 50]} />}
  </section>;
};
