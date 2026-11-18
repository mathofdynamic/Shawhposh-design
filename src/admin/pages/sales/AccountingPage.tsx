import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart3, Calculator, FileText, RefreshCw, Save } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, KPICard, Table, type ColumnDef } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import {
  createOtherExpense,
  createPurchaseInvoice,
  listPurchaseInvoices,
  loadSalesReport,
  uploadPurchaseInvoiceImage,
  type OtherExpense,
  type PurchaseInvoice,
  type SalesReport,
} from '../../features/accountingApi';

const tehranBusinessDate = (dayOffset = 0) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran', year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  const date = new Date(Date.UTC(value('year'), value('month') - 1, value('day') + dayOffset));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const today = () => tehranBusinessDate();
const daysAgo = (days: number) => tehranBusinessDate(-days);
const money = (value: number) => `${Number(value).toLocaleString('fa-IR')} تومان`;
const fieldClass = 'mt-1 block min-h-11 w-full rounded-lg border border-white/35 bg-[#10100f] px-3 py-2 text-sm text-stone-100 outline-none focus:border-[#ba8d3d] focus:ring-2 focus:ring-[#ba8d3d]/20';
const invoiceForm = () => ({ supplierName: '', productId: '', quantity: '1', purchaseUnitPriceTomans: '', deliveryCostTomans: '0', printingCostTomans: '0', invoiceDate: today(), notes: '' });
const expenseForm = () => ({ description: '', amountTomans: '', expenseDate: today(), notes: '' });

type AccountingView = 'purchases' | 'profit-loss';

export const AccountingPage: React.FC = () => {
  const { state } = useCatalogAdmin();
  const [view, setView] = useState<AccountingView>('purchases');
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [purchaseSummary, setPurchaseSummary] = useState({ invoiceCount: 0, purchaseCostTomans: 0 });
  const [purchasePage, setPurchasePage] = useState(1);
  const [purchasePagination, setPurchasePagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [invoice, setInvoice] = useState(invoiceForm);
  const [invoiceImage, setInvoiceImage] = useState<File | null>(null);
  const [uploadingInvoiceId, setUploadingInvoiceId] = useState<string | null>(null);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(true);
  const [purchaseReload, setPurchaseReload] = useState(0);
  const [dateFrom, setDateFrom] = useState(daysAgo(30));
  const [dateTo, setDateTo] = useState(today());
  const [report, setReport] = useState<SalesReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const reportRequestId = useRef(0);
  const [expense, setExpense] = useState(expenseForm);
  const [savingExpense, setSavingExpense] = useState(false);
  const [expenseReload, setExpenseReload] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    setPurchaseLoading(true);
    void listPurchaseInvoices(purchasePage).then(result => {
      if (!active) return;
      setInvoices(result.invoices);
      setPurchaseSummary(result.summary);
      setPurchasePagination(result.pagination);
      setError('');
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'دریافت فاکتورهای خرید انجام نشد.');
    }).finally(() => { if (active) setPurchaseLoading(false); });
    return () => { active = false; };
  }, [purchasePage, purchaseReload]);

  const requestReport = useCallback(async (from: string, until: string) => {
    const requestId = ++reportRequestId.current;
    setReportLoading(true);
    setReportError('');
    setReport(null);
    try {
      const result = await loadSalesReport(from, until);
      if (reportRequestId.current === requestId) setReport(result);
    } catch (failure) {
      if (reportRequestId.current === requestId) {
        const reason = failure instanceof Error ? failure.message.trim() : '';
        const genericReasons = new Set(['درخواست انجام نشد.', 'درخواست انجام نشد', 'Request failed']);
        setReportError(reason && !genericReasons.has(reason)
          ? `گزارش سود و زیان دریافت نشد (${reason}). اتصال یا دسترسی را بررسی کنید و دوباره تلاش کنید.`
          : 'گزارش سود و زیان به‌روزرسانی نشد. اتصال یا دسترسی را بررسی و دوباره تلاش کنید.');
      }
    } finally {
      if (reportRequestId.current === requestId) setReportLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view !== 'profit-loss') return;
    void requestReport(dateFrom, dateTo);
    return () => { reportRequestId.current += 1; };
  }, [view, expenseReload, requestReport]);

  const refreshReport = () => {
    void requestReport(dateFrom, dateTo);
  };

  const updateReportDate = (setter: (value: string) => void, value: string) => {
    reportRequestId.current += 1;
    setter(value);
    setReport(null);
    setReportError('');
    setReportLoading(false);
  };

  const changeView = (nextView: AccountingView) => {
    setView(nextView);
    setSuccess('');
    setError('');
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const tabList = event.currentTarget.closest<HTMLElement>('[role="tablist"]');
    if (!tabList || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;

    const tabs = Array.from(tabList.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    const currentIndex = tabs.indexOf(event.currentTarget);
    if (currentIndex < 0 || tabs.length === 0) return;

    const isRtl = getComputedStyle(tabList).direction === 'rtl';
    const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';
    const previousKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
    let nextIndex = currentIndex;
    if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = tabs.length - 1;
    else if (event.key === nextKey) nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === previousKey) nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else return;

    event.preventDefault();
    tabs[nextIndex].focus();
    tabs[nextIndex].click();
  };

  const submitInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingInvoice(true); setError(''); setSuccess('');
    try {
      const result = await createPurchaseInvoice({
        supplierName: invoice.supplierName.trim(), productId: invoice.productId,
        quantity: Number(invoice.quantity), purchaseUnitPriceTomans: Number(invoice.purchaseUnitPriceTomans),
        deliveryCostTomans: Number(invoice.deliveryCostTomans), printingCostTomans: Number(invoice.printingCostTomans),
        invoiceDate: invoice.invoiceDate, notes: invoice.notes.trim(),
      });
      let imageFailed = false;
      if (invoiceImage) {
        try { await uploadPurchaseInvoiceImage(result.invoice.id, invoiceImage); }
        catch { imageFailed = true; }
      }
      setInvoice(invoiceForm());
      setInvoiceImage(null);
      setPurchasePage(1);
      setPurchaseReload(value => value + 1);
      setSuccess(imageFailed ? 'فاکتور ثبت شد؛ تصویر بارگذاری نشد. از دفتر خرید برای بارگذاری دوباره اقدام کنید.' : 'فاکتور خرید ثبت شد. بهای مواد پس از پرداخت سفارش، بر اساس میانگین وزنی خرید کالا در سود و زیان محاسبه می‌شود.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'ثبت فاکتور خرید انجام نشد.');
    } finally { setSavingInvoice(false); }
  };

  const uploadInvoiceImage = async (invoiceId: string, file: File) => {
    setUploadingInvoiceId(invoiceId); setError(''); setSuccess('');
    try {
      await uploadPurchaseInvoiceImage(invoiceId, file);
      setPurchaseReload(value => value + 1);
      setSuccess('تصویر فاکتور بارگذاری شد.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'بارگذاری تصویر فاکتور انجام نشد.');
    } finally { setUploadingInvoiceId(null); }
  };

  const submitExpense = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingExpense(true); setError(''); setSuccess('');
    try {
      await createOtherExpense({
        description: expense.description.trim(), amountTomans: Number(expense.amountTomans),
        expenseDate: expense.expenseDate, notes: expense.notes.trim(),
      });
      setExpense(expenseForm());
      setExpenseReload(value => value + 1);
      setSuccess('هزینه در گزارش سود و زیان ثبت شد.');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'ثبت هزینه انجام نشد.');
    } finally { setSavingExpense(false); }
  };

  const invoiceColumns: ColumnDef<PurchaseInvoice>[] = [
    { key: 'date', header: 'تاریخ فاکتور', nowrap: true, render: row => new Date(row.invoiceDate).toLocaleDateString('fa-IR') },
    { key: 'supplier', header: 'تأمین‌کننده', nowrap: true, render: row => row.supplierName },
    { key: 'product', header: 'محصول', nowrap: true, render: row => row.productNameSnapshot },
    { key: 'quantity', header: 'تعداد', align: 'center', nowrap: true, render: row => row.quantity.toLocaleString('fa-IR') },
    { key: 'purchase', header: 'خرید واحد', align: 'left', nowrap: true, render: row => money(row.purchaseUnitPriceTomans) },
    { key: 'delivery', header: 'ارسال', align: 'left', nowrap: true, render: row => money(row.deliveryCostTomans) },
    { key: 'printing', header: 'چاپ', align: 'left', nowrap: true, render: row => money(row.printingCostTomans) },
    { key: 'total', header: 'جمع فاکتور', align: 'left', nowrap: true, render: row => money(row.purchaseUnitPriceTomans * row.quantity + row.deliveryCostTomans + row.printingCostTomans) },
    { key: 'image', header: 'تصویر', nowrap: true, render: row => row.hasImage
      ? <a className="inline-flex min-h-11 items-center justify-center px-2 text-[#eed29d] underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d]" href={`/api/v1/admin/purchase-invoices/${encodeURIComponent(row.id)}/image`} target="_blank" rel="noreferrer">مشاهده</a>
      : <label className={`inline-flex min-h-11 cursor-pointer items-center px-2 text-[#eed29d] underline underline-offset-4 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#ba8d3d] ${uploadingInvoiceId ? 'opacity-50' : ''}`}>
        {uploadingInvoiceId === row.id ? 'در حال بارگذاری…' : 'افزودن تصویر'}
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploadingInvoiceId)} className="sr-only" onChange={event => {
          const file = event.target.files?.[0]; event.target.value = '';
          if (file) void uploadInvoiceImage(row.id, file);
        }}/>
      </label> },
  ];

  const expenseColumns: ColumnDef<OtherExpense>[] = [
    { key: 'date', header: 'تاریخ', nowrap: true, render: row => new Date(row.expenseDate).toLocaleDateString('fa-IR') },
    { key: 'description', header: 'شرح هزینه', render: row => <div><strong>{row.description}</strong>{row.notes && <p className="mt-1 text-xs text-stone-400">{row.notes}</p>}</div> },
    { key: 'amount', header: 'مبلغ', align: 'left', nowrap: true, render: row => money(row.amountTomans) },
  ];

  return <section dir="rtl" className="mx-auto max-w-7xl space-y-5">
    <AdminPageHeader title="حسابداری" description="ثبت خرید تأمین‌کننده و گزارش جداگانهٔ فروش تحقق‌یافته." actions={<Button variant="outline" size="sm" className="!min-h-11" leftIcon={<RefreshCw size={14}/>} onClick={() => view === 'purchases' ? setPurchaseReload(value => value + 1) : void refreshReport()}>به‌روزرسانی</Button>} />
    <div role="tablist" aria-label="بخش حسابداری" className="flex gap-2 border-b border-white/10">
      <button id="accounting-purchases-tab" type="button" role="tab" aria-controls="accounting-purchases-panel" aria-selected={view === 'purchases'} tabIndex={view === 'purchases' ? 0 : -1} onKeyDown={handleTabKeyDown} onClick={() => changeView('purchases')} className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${view === 'purchases' ? 'border-[#ba8d3d] text-[#eed29d]' : 'border-transparent text-stone-400 hover:text-white'}`}><FileText size={15}/>فاکتورهای خرید</button>
      <button id="accounting-profit-loss-tab" type="button" role="tab" aria-controls="accounting-profit-loss-panel" aria-selected={view === 'profit-loss'} tabIndex={view === 'profit-loss' ? 0 : -1} onKeyDown={handleTabKeyDown} onClick={() => changeView('profit-loss')} className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${view === 'profit-loss' ? 'border-[#ba8d3d] text-[#eed29d]' : 'border-transparent text-stone-400 hover:text-white'}`}><BarChart3 size={15}/>سود و زیان</button>
    </div>

    {error && <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
    {success && <p role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{success}</p>}

    <div>
    <div id="accounting-purchases-panel" role="tabpanel" aria-labelledby="accounting-purchases-tab" tabIndex={0} hidden={view !== 'purchases'} className={view === 'purchases' ? 'space-y-5' : 'hidden'}>
    {view === 'purchases' && <>
      <div className="grid gap-3 sm:grid-cols-2">
        <KPICard title="فاکتورهای خرید" value={purchaseLoading ? '—' : purchaseSummary.invoiceCount} icon={<Calculator size={17}/>} isLoading={purchaseLoading}/>
        <KPICard title="جمع خرید، ارسال و چاپ" value={purchaseLoading ? '—' : purchaseSummary.purchaseCostTomans} unit="تومان" icon={<Calculator size={17}/>} isLoading={purchaseLoading}/>
      </div>

      <form onSubmit={event => void submitInvoice(event)} className="space-y-4 rounded-2xl border border-white/10 bg-[#141211] p-5 md:p-6">
        <div className="flex items-center gap-2"><FileText size={17} className="text-[#eed29d]"/><h2 className="text-base font-semibold text-white">ثبت فاکتور تأمین‌کننده</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">نام تأمین‌کننده<input required minLength={2} maxLength={160} value={invoice.supplierName} onChange={event => setInvoice({ ...invoice, supplierName: event.target.value })} className={fieldClass}/></label>
          <label className="text-sm">محصول<select required value={invoice.productId} onChange={event => setInvoice({ ...invoice, productId: event.target.value })} className={fieldClass}><option value="" disabled>انتخاب محصول</option>{state.products.filter(product => product.status !== 'archived').map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="text-sm">تعداد<input required type="number" min="1" max="100000" step="1" value={invoice.quantity} onChange={event => setInvoice({ ...invoice, quantity: event.target.value })} className={fieldClass} style={{ colorScheme: 'dark' }}/></label>
          <label className="text-sm">تاریخ فاکتور<input required type="date" value={invoice.invoiceDate} onChange={event => setInvoice({ ...invoice, invoiceDate: event.target.value })} className={fieldClass} style={{ colorScheme: 'dark' }}/></label>
          <label className="text-sm">قیمت خرید هر عدد (تومان)<input required type="number" min="0" max="2000000000" step="1" value={invoice.purchaseUnitPriceTomans} onChange={event => setInvoice({ ...invoice, purchaseUnitPriceTomans: event.target.value })} className={fieldClass} style={{ colorScheme: 'dark' }}/></label>
          <label className="text-sm">هزینه ارسال (تومان)<input required type="number" min="0" max="2000000000" step="1" value={invoice.deliveryCostTomans} onChange={event => setInvoice({ ...invoice, deliveryCostTomans: event.target.value })} className={fieldClass} style={{ colorScheme: 'dark' }}/></label>
          <label className="text-sm">هزینه چاپ (تومان)<input required type="number" min="0" max="2000000000" step="1" value={invoice.printingCostTomans} onChange={event => setInvoice({ ...invoice, printingCostTomans: event.target.value })} className={fieldClass} style={{ colorScheme: 'dark' }}/></label>
          <div className="text-sm">
            <label id="purchase-invoice-image-label" htmlFor="purchase-invoice-image">تصویر فاکتور (اختیاری)</label>
            <div className={`${fieldClass} flex items-center gap-3 overflow-hidden`}>
              <input
                id="purchase-invoice-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-labelledby="purchase-invoice-image-label"
                onChange={event => { const file = event.target.files?.[0] ?? null; event.target.value = ''; setInvoiceImage(file); }}
                className="peer sr-only"
              />
              <label
                htmlFor="purchase-invoice-image"
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-stone-100 transition-colors hover:bg-white/15 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-[#ba8d3d]"
              >
                انتخاب فایل
              </label>
              <span className="min-w-0 flex-1 break-words text-xs text-stone-300" dir="auto" title={invoiceImage?.name ?? 'فایلی انتخاب نشده'} aria-live="polite">
                {invoiceImage?.name ?? 'فایلی انتخاب نشده'}
              </span>
            </div>
          </div>
        </div>
        <label className="block text-sm">یادداشت<textarea rows={2} maxLength={2000} value={invoice.notes} onChange={event => setInvoice({ ...invoice, notes: event.target.value })} className={`${fieldClass} leading-6`}/></label>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
          <p className="text-sm text-stone-400">هزینهٔ ثبت‌شده: <strong className="text-stone-200">{money((Number(invoice.purchaseUnitPriceTomans) || 0) * (Number(invoice.quantity) || 0) + (Number(invoice.deliveryCostTomans) || 0) + (Number(invoice.printingCostTomans) || 0))}</strong><span className="mr-2 text-xs text-stone-400">بهای مواد پس از پرداخت سفارش، بر اساس میانگین وزنی خرید کالا در گزارش سود و زیان ثبت می‌شود.</span></p>
          <Button variant="brass" type="submit" disabled={savingInvoice || !state.products.some(product => product.status !== 'archived')}><Save size={15}/>{savingInvoice ? 'در حال ثبت…' : 'ثبت فاکتور'}</Button>
        </div>
      </form>

      <section className="space-y-3"><h2 className="text-base font-semibold text-white">دفتر خرید از تأمین‌کنندگان</h2>
        <Table data={invoices} columns={invoiceColumns} keyExtractor={row => row.id} isLoading={purchaseLoading} emptyMessage="هنوز فاکتور خریدی ثبت نشده است." ariaLabel="دفتر خرید از تأمین‌کنندگان" mobileScrollHint/>
        {purchasePagination.total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-stone-400">
          <span>{purchasePagination.total.toLocaleString('fa-IR')} فاکتور</span>
          {purchasePagination.totalPages > 1 && <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="min-h-11 sm:min-h-8" disabled={purchasePage <= 1 || purchaseLoading} onClick={() => setPurchasePage(page => Math.max(1, page - 1))}>قبلی</Button>
            <span>صفحه {purchasePagination.page.toLocaleString('fa-IR')} از {purchasePagination.totalPages.toLocaleString('fa-IR')}</span>
            <Button variant="outline" size="sm" className="min-h-11 sm:min-h-8" disabled={purchasePage >= purchasePagination.totalPages || purchaseLoading} onClick={() => setPurchasePage(page => Math.min(purchasePagination.totalPages, page + 1))}>بعدی</Button>
          </div>}
        </div>}
      </section>
    </>}
    </div>
    <div id="accounting-profit-loss-panel" role="tabpanel" aria-labelledby="accounting-profit-loss-tab" tabIndex={0} hidden={view !== 'profit-loss'} className={view === 'profit-loss' ? 'space-y-5' : 'hidden'}>
    {view === 'profit-loss' && <>
      <form onSubmit={event => { event.preventDefault(); void refreshReport(); }} className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-[#141211] p-4">
        <label className="min-w-40 flex-1 text-sm">از تاریخ<input required type="date" value={dateFrom} onChange={event => updateReportDate(setDateFrom, event.target.value)} className={fieldClass} style={{ colorScheme: 'dark' }}/></label>
        <label className="min-w-40 flex-1 text-sm">تا تاریخ<input required type="date" value={dateTo} onChange={event => updateReportDate(setDateTo, event.target.value)} className={fieldClass} style={{ colorScheme: 'dark' }}/></label>
        <Button type="submit" variant="brass" className="!min-h-11" disabled={reportLoading}><RefreshCw size={14}/>نمایش گزارش</Button>
      </form>
      <p className="text-xs leading-6 text-stone-400">فروش بر اساس تاریخ تأیید پرداخت سفارش‌های پرداخت‌شده محاسبه می‌شود؛ مبلغ ارسال در فروش کالا منظور نشده است.</p>
      {reportError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"><p>{reportError}</p><Button variant="outline" size="sm" className="min-h-11" disabled={reportLoading} onClick={refreshReport}>تلاش دوباره</Button></div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title="فروش خالص" value={reportLoading || !report ? '—' : report.summary.salesTomans} unit="تومان" icon={<BarChart3 size={17}/>} isLoading={reportLoading}/>
        <KPICard title="هزینه مواد فروخته‌شده" value={reportLoading || !report ? '—' : report.summary.materialCostTomans} unit="تومان" icon={<Calculator size={17}/>} isLoading={reportLoading}/>
        <KPICard title="سایر هزینه‌ها" value={reportLoading || !report ? '—' : report.summary.otherCostTomans} unit="تومان" icon={<Calculator size={17}/>} isLoading={reportLoading}/>
        <KPICard title="سود خالص" value={reportLoading || !report ? '—' : report.summary.netProfitTomans} unit="تومان" icon={<Calculator size={17}/>} isLoading={reportLoading}/>
      </div>
      {report && report.summary.uncostedQuantity > 0 && <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-100">هزینهٔ مواد برای {report.summary.uncostedQuantity.toLocaleString('fa-IR')} عدد از فروش‌های این بازه ثبت نشده است؛ سود نمایش‌داده‌شده کامل نیست.</p>}
      <div className="grid gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-stone-300 sm:grid-cols-2">
        <p>تعداد سفارش‌های پرداخت‌شده: <strong>{reportLoading || !report ? '—' : report.summary.orderCount.toLocaleString('fa-IR')}</strong></p>
        <p>تعداد اقلام فروخته‌شده بدون بهای مواد: <strong>{reportLoading || !report ? '—' : report.summary.uncostedQuantity.toLocaleString('fa-IR')} عدد</strong></p>
      </div>

      <form onSubmit={event => void submitExpense(event)} className="space-y-4 rounded-2xl border border-white/10 bg-[#141211] p-5 md:p-6">
        <div className="flex items-center gap-2"><Calculator size={17} className="text-[#eed29d]"/><h2 className="text-base font-semibold text-white">ثبت سایر هزینه</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm">شرح هزینه<input required minLength={2} maxLength={160} value={expense.description} onChange={event => setExpense({ ...expense, description: event.target.value })} className={fieldClass}/></label>
          <label className="text-sm">مبلغ (تومان)<input required type="number" min="0" max="2000000000" step="1" value={expense.amountTomans} onChange={event => setExpense({ ...expense, amountTomans: event.target.value })} className={fieldClass}/></label>
          <label className="text-sm">تاریخ هزینه<input required type="date" value={expense.expenseDate} onChange={event => setExpense({ ...expense, expenseDate: event.target.value })} className={fieldClass} style={{ colorScheme: 'dark' }}/></label>
        </div>
        <label className="block text-sm">یادداشت<textarea rows={2} maxLength={2000} value={expense.notes} onChange={event => setExpense({ ...expense, notes: event.target.value })} className={`${fieldClass} leading-6`}/></label>
        <div className="flex justify-end"><Button type="submit" variant="brass" disabled={savingExpense}><Save size={15}/>{savingExpense ? 'در حال ثبت…' : 'ثبت هزینه'}</Button></div>
      </form>
      <section className="space-y-3"><h2 className="text-base font-semibold text-white">هزینه‌های ثبت‌شده در این بازه</h2>
        <Table data={report?.expenses ?? []} columns={expenseColumns} keyExtractor={row => row.id} isLoading={reportLoading} emptyMessage="هزینهٔ دیگری در این بازه ثبت نشده است." emptyTextClassName="text-gray-400" ariaLabel="هزینه‌های ثبت‌شده در این بازه" mobileScrollHint/>
      </section>
    </>}
    </div>
    </div>
  </section>;
};
