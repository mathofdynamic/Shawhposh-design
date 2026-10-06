import React, { useEffect, useState } from 'react';
import { Banknote, RefreshCw, ShoppingBag, UserCheck, UserRound, Users } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button, KPICard, Pagination, SearchInput, Table, type ColumnDef } from '../../components/ui';
import { useAdminRouter } from '../../router';
import { listAdminCustomers, type AdminCustomer, type AdminCustomerSummary } from '../../features/commerceApi';
import { maskEmail, maskPhoneNumber } from '../../utils/formatters';

export const CustomerDirectoryPage: React.FC = () => {
  const { navigate } = useAdminRouter();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [summary, setSummary] = useState<AdminCustomerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true); setError('');
      const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status });
      if (search.trim()) query.set('search', search.trim());
      void listAdminCustomers(query).then(result => {
        if (!active) return;
        setCustomers(result.customers); setTotal(result.pagination.total); setTotalPages(result.pagination.totalPages); setSummary(result.summary);
      }).catch(failure => { if (active) {
        setCustomers([]);
        setTotal(0);
        setTotalPages(0);
        setSummary(null);
        setError('\u0641\u0647\u0631\u0633\u062a \u0645\u0634\u062a\u0631\u06cc\u0627\u0646 \u062f\u0631\u06cc\u0627\u0641\u062a \u0646\u0634\u062f.');
      } })
        .finally(() => { if (active) setLoading(false); });
    }, 180);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, status, page, pageSize, reload]);

  const hasFilters = Boolean(search.trim() || status !== 'all');
  const emptyMessage = error
    ? '\u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u0645\u0634\u062a\u0631\u06cc\u0627\u0646 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062f.'
    : total > 0
      ? '\u062f\u0631 \u0627\u06cc\u0646 \u0635\u0641\u062d\u0647 \u0645\u0634\u062a\u0631\u06cc\u0627\u06cc\u06cc \u0628\u0631\u0627\u06cc \u0646\u0645\u0627\u06cc\u0634 \u0646\u06cc\u0633\u062a.'
      : hasFilters
        ? '\u0645\u0634\u062a\u0631\u06cc\u0627\u06cc\u06cc \u0628\u0627 \u0627\u06cc\u0646 \u0641\u06cc\u0644\u062a\u0631\u0647\u0627 \u067e\u06cc\u062f\u0627 \u0646\u0634\u062f.'
        : '\u0647\u0646\u0648\u0632 \u062d\u0633\u0627\u0628 \u0645\u0634\u062a\u0631\u06cc \u062b\u0628\u062a \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.';

  const columns: ColumnDef<AdminCustomer>[] = [
    { key: 'name', header: 'نام مشتری', render: customer => <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ba8d3d]/20 bg-[#ba8d3d]/10 text-[#eed29d]"><UserRound size={15} /></span><div><strong className="text-white">{customer.name}</strong><span dir="ltr" className="mt-1 block text-[10px] text-stone-500">{customer.email ? maskEmail(customer.email) : 'بدون ایمیل'}</span></div></div> },
    { key: 'phone', header: 'تلفن', render: customer => <span dir="ltr" className="inline-block text-left font-mono text-stone-300">{maskPhoneNumber(customer.phone)}</span> },
    { key: 'status', header: 'وضعیت', render: customer => <Badge tone={customer.status === 'active' ? 'success' : 'neutral'}>{customer.status === 'active' ? 'فعال' : 'غیرفعال'}</Badge> },
    { key: 'orderCount', header: 'تعداد سفارش', align: 'center', render: customer => <span className="font-fanum">{customer.orderCount === 0 ? <span className="persian-zero">۰</span> : customer.orderCount.toLocaleString('fa-IR')}</span> },
    { key: 'lifetimeSpendTomans', header: 'خرید پرداخت‌شده', align: 'left', render: customer => <span className="font-mono">{customer.lifetimeSpendTomans === 0 ? <span className="persian-zero">۰</span> : customer.lifetimeSpendTomans.toLocaleString('fa-IR')} تومان</span> },
    { key: 'createdAt', header: 'تاریخ عضویت', render: customer => <span className="text-xs text-stone-400">{new Date(customer.createdAt).toLocaleDateString('fa-IR')}</span> },
  ];

  return <section dir="rtl" className="space-y-5">
    <AdminPageHeader title="فهرست مشتریان" description="حساب‌های ثبت‌شده واقعی؛ خرید پرداخت‌شده تا اتصال درگاه صفر می‌ماند." actions={<Button variant="outline" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => setReload(value => value + 1)}>به‌روزرسانی</Button>} />
    {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}<button onClick={() => setReload(value => value + 1)} className="mr-3 underline">تلاش دوباره</button></div>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <KPICard title="مشتریان ثبت‌شده" value={error ? '—' : summary?.registeredCount ?? 0} icon={<Users size={17} />} isLoading={loading} />
      <KPICard title="حساب‌های فعال" value={error ? '—' : summary?.activeCount ?? 0} icon={<UserCheck size={17} />} isLoading={loading} />
      <KPICard title="مشتریان با سفارش" value={error ? '—' : summary?.customersWithOrdersCount ?? 0} icon={<ShoppingBag size={17} />} isLoading={loading} />
      <KPICard title="خرید پرداخت‌شده" value={error ? '—' : summary?.paidSpendTomans ?? 0} unit="تومان" definition="تنها مبالغ پرداخت‌شده ثبت می‌شوند." icon={<Banknote size={17} />} isLoading={loading} />
    </div>
    <div className="flex flex-col gap-3 sm:flex-row">
      <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="نام، ایمیل یا تلفن" ariaLabel="جستجوی مشتریان" className="flex-1" />
      <select aria-label="وضعیت مشتری" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="min-h-[42px] rounded-xl border border-white/10 bg-[#181716] px-3 text-sm text-white"><option value="all">همه مشتریان</option><option value="active">فعال</option><option value="inactive">غیرفعال</option></select>
    </div>
    <div className="flex items-center justify-between text-xs text-stone-400"><span>تعداد حساب‌ها</span><strong className="font-mono text-white">{error || loading ? '—' : total === 0 ? <span className="persian-zero">۰</span> : total.toLocaleString('fa-IR')}</strong></div>
    <Table columns={columns} data={customers} keyExtractor={customer => customer.id} isLoading={loading} emptyMessage={emptyMessage} onRowClick={customer => navigate(`/admin/customers/profiles/${customer.id}`)} ariaLabel="مشتریان ثبت‌شده" mobileScrollHint />
    {!error && !loading && <Pagination currentPage={page} totalPages={Math.max(1, totalPages)} totalItems={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} pageSizeOptions={[10, 20, 50]} />}
  </section>;
};
