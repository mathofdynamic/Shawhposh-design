import React, { useEffect, useState } from 'react';
import { Banknote, Plus, RefreshCw, ShoppingBag, UserCheck, UserRound, Users } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button, Dialog, KPICard, Pagination, SearchInput, Table, type ColumnDef } from '../../components/ui';
import { useAdminRouter } from '../../router';
import { createOfflineCustomer, listAdminCustomers, type AdminCustomer, type AdminCustomerSummary } from '../../features/commerceApi';
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
  const [formOpen, setFormOpen] = useState(false);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', email: '', notes: '' });

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
  const submitOfflineCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormSaving(true);
    setFormError('');
    try {
      const result = await createOfflineCustomer({ ...customerForm, email: customerForm.email.trim() || undefined });
      setFormOpen(false);
      setCustomerForm({ name: '', phone: '', email: '', notes: '' });
      navigate(`/admin/customers/${result.customer.id}`);
    } catch (failure) {
      setFormError(failure instanceof Error ? failure.message : 'ثبت مشتری انجام نشد.');
    } finally {
      setFormSaving(false);
    }
  };
  const emptyMessage = error
    ? '\u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u0645\u0634\u062a\u0631\u06cc\u0627\u0646 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062f.'
    : total > 0
      ? '\u062f\u0631 \u0627\u06cc\u0646 \u0635\u0641\u062d\u0647 \u0645\u0634\u062a\u0631\u06cc\u0627\u06cc\u06cc \u0628\u0631\u0627\u06cc \u0646\u0645\u0627\u06cc\u0634 \u0646\u06cc\u0633\u062a.'
      : hasFilters
        ? '\u0645\u0634\u062a\u0631\u06cc\u0627\u06cc\u06cc \u0628\u0627 \u0627\u06cc\u0646 \u0641\u06cc\u0644\u062a\u0631\u0647\u0627 \u067e\u06cc\u062f\u0627 \u0646\u0634\u062f.'
        : 'هنوز پرونده‌ای برای مشتری ثبت نشده است.';

  const columns: ColumnDef<AdminCustomer>[] = [
    { key: 'name', header: 'نام مشتری', render: customer => <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ba8d3d]/20 bg-[#ba8d3d]/10 text-[#eed29d]"><UserRound size={15} /></span><div><strong className="text-white">{customer.name}</strong><span dir="ltr" className="mt-1 block text-[10px] text-stone-500">{customer.email ? maskEmail(customer.email) : 'بدون ایمیل'}</span></div></div> },
    { key: 'source', header: 'نوع پرونده', render: customer => <Badge tone={customer.source === 'offline' ? 'brass' : 'neutral'}>{customer.source === 'offline' ? 'ثبت حضوری' : 'حساب آنلاین'}</Badge> },
    { key: 'phone', header: 'تلفن', render: customer => <span dir="ltr" className="inline-block text-left font-mono text-stone-300">{maskPhoneNumber(customer.phone)}</span> },
    { key: 'status', header: 'وضعیت', render: customer => <Badge tone={customer.status === 'active' ? 'success' : 'neutral'}>{customer.status === 'active' ? 'فعال' : 'غیرفعال'}</Badge> },
    { key: 'orderCount', header: 'تعداد سفارش', align: 'center', render: customer => <span className="font-fanum">{customer.orderCount === 0 ? <span className="persian-zero">۰</span> : customer.orderCount.toLocaleString('fa-IR')}</span> },
    { key: 'lifetimeSpendTomans', header: 'خرید پرداخت‌شده', align: 'left', render: customer => <span className="font-mono">{customer.lifetimeSpendTomans === 0 ? <span className="persian-zero">۰</span> : customer.lifetimeSpendTomans.toLocaleString('fa-IR')} تومان</span> },
    { key: 'createdAt', header: 'تاریخ عضویت', render: customer => <span className="text-xs text-stone-400">{new Date(customer.createdAt).toLocaleDateString('fa-IR')}</span> },
  ];

  return <section dir="rtl" className="space-y-5">
    <AdminPageHeader title="فهرست مشتریان" description="مشتریان آنلاین و خریداران حضوری در یک فهرست؛ مشتری حضوری بدون ساخت حساب کاربری ثبت می‌شود." actions={<div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => setReload(value => value + 1)}>به‌روزرسانی</Button><Button variant="brass" size="sm" leftIcon={<Plus size={15} />} onClick={() => { setFormError(''); setFormOpen(true); }}>افزودن مشتری حضوری</Button></div>} />
    {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-200">{error}<button onClick={() => setReload(value => value + 1)} className="mr-3 underline">تلاش دوباره</button></div>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-5">
      <KPICard title="حساب‌های آنلاین" value={error ? '—' : summary?.registeredCount ?? 0} icon={<Users size={17} />} isLoading={loading} />
      <KPICard title="مشتریان حضوری" value={error ? '—' : summary?.offlineCount ?? 0} icon={<UserRound size={17} />} isLoading={loading} />
      <KPICard title="حساب‌های فعال" value={error ? '—' : summary?.activeCount ?? 0} icon={<UserCheck size={17} />} isLoading={loading} />
      <KPICard title="مشتریان با سفارش" value={error ? '—' : summary?.customersWithOrdersCount ?? 0} icon={<ShoppingBag size={17} />} isLoading={loading} />
      <div className="col-span-2 sm:col-span-1"><KPICard title="خرید پرداخت‌شده" value={error ? '—' : summary?.paidSpendTomans ?? 0} unit="تومان" definition="تنها مبالغ پرداخت‌شده ثبت می‌شوند." icon={<Banknote size={17} />} isLoading={loading} /></div>
    </div>
    <div className="flex flex-col gap-3 sm:flex-row">
      <SearchInput value={search} onChange={value => { setSearch(value); setPage(1); }} placeholder="نام، ایمیل یا تلفن" ariaLabel="جستجوی مشتریان" className="flex-1" />
      <select aria-label="وضعیت مشتری" value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="min-h-[42px] rounded-xl border border-white/10 bg-[#181716] px-3 text-sm text-white"><option value="all">همه مشتریان</option><option value="active">فعال</option><option value="inactive">غیرفعال</option></select>
    </div>
    <div className="flex items-center justify-between text-xs text-stone-400"><span>تعداد حساب‌ها</span><strong className="font-mono text-white">{error || loading ? '—' : total === 0 ? <span className="persian-zero">۰</span> : total.toLocaleString('fa-IR')}</strong></div>
    <Table columns={columns} data={customers} keyExtractor={customer => customer.id} isLoading={loading} emptyMessage={emptyMessage} onRowClick={customer => navigate(`/admin/customers/${customer.id}`)} ariaLabel="فهرست مشتریان" mobileScrollHint />
    {!error && !loading && <Pagination currentPage={page} totalPages={Math.max(1, totalPages)} totalItems={total} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} pageSizeOptions={[10, 20, 50]} />}
    <Dialog isOpen={formOpen} onClose={() => { if (!formSaving) setFormOpen(false); }} title="ثبت مشتری حضوری" description="این پرونده فقط برای نگه‌داری اطلاعات خرید حضوری است و حساب ورود به سایت نمی‌سازد." size="lg" footer={<><Button variant="secondary" onClick={() => setFormOpen(false)} disabled={formSaving}>انصراف</Button><Button variant="brass" type="submit" form="offline-customer-form" disabled={formSaving}>{formSaving ? 'در حال ثبت…' : 'ثبت مشتری'}</Button></>}>
      <form id="offline-customer-form" onSubmit={event => void submitOfflineCustomer(event)} className="space-y-3">
        <label className="block text-sm text-stone-200">نام مشتری<input data-dialog-initial-focus autoComplete="name" required minLength={2} maxLength={120} value={customerForm.name} onChange={event => setCustomerForm({ ...customerForm, name: event.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-sm text-white outline-none focus:border-[#ba8d3d]"/></label>
        <label className="block text-sm text-stone-200">شماره تماس<input dir="ltr" inputMode="tel" autoComplete="tel" required maxLength={30} value={customerForm.phone} onChange={event => setCustomerForm({ ...customerForm, phone: event.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-left text-sm text-white outline-none focus:border-[#ba8d3d]"/></label>
        <label className="block text-sm text-stone-200">ایمیل <span className="text-stone-500">(اختیاری)</span><input dir="ltr" type="email" autoComplete="email" maxLength={254} value={customerForm.email} onChange={event => setCustomerForm({ ...customerForm, email: event.target.value })} className="mt-1 block min-h-11 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-left text-sm text-white outline-none focus:border-[#ba8d3d]"/></label>
        <label className="block text-sm text-stone-200">یادداشت <span className="text-stone-500">(اختیاری)</span><textarea rows={3} maxLength={2000} value={customerForm.notes} onChange={event => setCustomerForm({ ...customerForm, notes: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm leading-6 text-white outline-none focus:border-[#ba8d3d]"/></label>
        {formError && <p role="alert" aria-live="polite" className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm leading-6 text-rose-200">{formError}</p>}
      </form>
    </Dialog>
  </section>;
};
