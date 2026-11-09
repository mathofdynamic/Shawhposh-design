import React, { useEffect, useMemo, useState } from 'react';
import { Calculator, RefreshCw, Save } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, KPICard, Table, type ColumnDef } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import { createPurchaseInvoice, listPurchaseInvoices, type PurchaseInvoice } from '../../features/accountingApi';

const today = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
};
const money = (value: number) => `${value.toLocaleString('fa-IR')} تومان`;
const fieldClass = 'mt-1 block min-h-11 w-full rounded-lg border border-white/35 bg-[#10100f] px-3 py-2 text-sm text-stone-100 outline-none focus:border-[#ba8d3d] focus:ring-2 focus:ring-[#ba8d3d]/20';

const initialForm = () => ({ supplierName: '', productId: '', quantity: '1', purchaseUnitPriceTomans: '', saleUnitPriceTomans: '', deliveryCostTomans: '0', printingCostTomans: '0', invoiceDate: today(), notes: '' });

export const AccountingPage: React.FC = () => {
  const { state } = useCatalogAdmin();
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [summary, setSummary] = useState({ invoiceCount: 0, purchaseCostTomans: 0, projectedProfitTomans: 0 });
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void listPurchaseInvoices().then(result => {
      if (!active) return;
      setInvoices(result.invoices);
      setSummary(result.summary);
    }).catch(failure => {
      if (active) setError(failure instanceof Error ? failure.message : 'دریافت فاکتورها انجام نشد.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const quantity = Number(form.quantity) || 0;
  const purchase = Number(form.purchaseUnitPriceTomans) || 0;
  const sale = Number(form.saleUnitPriceTomans) || 0;
  const delivery = Number(form.deliveryCostTomans) || 0;
  const printing = Number(form.printingCostTomans) || 0;
  const estimatedProfit = useMemo(() => sale * quantity - purchase * quantity - delivery - printing, [sale, quantity, purchase, delivery, printing]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await createPurchaseInvoice({
        supplierName: form.supplierName.trim(), productId: form.productId, quantity,
        purchaseUnitPriceTomans: purchase, saleUnitPriceTomans: sale,
        deliveryCostTomans: delivery, printingCostTomans: printing,
        invoiceDate: new Date(`${form.invoiceDate}T12:00:00.000Z`).toISOString(), notes: form.notes.trim(),
      });
      setForm(initialForm());
      setSuccess('فاکتور ثبت شد و در دفتر حسابداری قرار گرفت.');
      setReload(value => value + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'ثبت فاکتور انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const columns: ColumnDef<PurchaseInvoice>[] = [
    { key: 'date', header: 'تاریخ', render: invoice => new Date(invoice.invoiceDate).toLocaleDateString('fa-IR') },
    { key: 'supplier', header: 'تأمین‌کننده', render: invoice => invoice.supplierName },
    { key: 'product', header: 'محصول', render: invoice => invoice.productNameSnapshot },
    { key: 'quantity', header: 'تعداد', align: 'center', render: invoice => invoice.quantity.toLocaleString('fa-IR') },
    { key: 'purchase', header: 'خرید واحد', align: 'left', render: invoice => money(invoice.purchaseUnitPriceTomans) },
    { key: 'sale', header: 'فروش واحد', align: 'left', render: invoice => money(invoice.saleUnitPriceTomans) },
    { key: 'costs', header: 'ارسال و چاپ', align: 'left', render: invoice => money(invoice.deliveryCostTomans + invoice.printingCostTomans) },
    { key: 'profit', header: 'سود برآوردی', align: 'left', render: invoice => <span className={invoice.netProfitTomans < 0 ? 'text-rose-300' : 'text-emerald-300'}>{money(invoice.netProfitTomans)}</span> },
  ];

  return <section dir="rtl" className="mx-auto max-w-7xl space-y-5">
    <AdminPageHeader title="حسابداری و فاکتور خرید" description="هزینه خرید، فروش، ارسال و چاپ را ثبت کنید. سود نمایش‌داده‌شده برآورد فروش کل تعداد درج‌شده است." actions={<Button variant="outline" size="sm" leftIcon={<RefreshCw size={14}/>} onClick={() => setReload(value => value + 1)}>به‌روزرسانی</Button>} />
    <div className="grid gap-3 sm:grid-cols-3">
      <KPICard title="فاکتورهای ثبت‌شده" value={loading ? '—' : summary.invoiceCount} icon={<Calculator size={17}/>} isLoading={loading}/>
      <KPICard title="هزینه خرید، ارسال و چاپ" value={loading ? '—' : summary.purchaseCostTomans} unit="تومان" icon={<Calculator size={17}/>} isLoading={loading}/>
      <KPICard title="سود خالص برآوردی" value={loading ? '—' : summary.projectedProfitTomans} unit="تومان" icon={<Calculator size={17}/>} isLoading={loading}/>
    </div>

    <form onSubmit={event => void submit(event)} className="space-y-4 rounded-2xl border border-white/10 bg-[#141211] p-5 md:p-6">
      <div className="flex items-center gap-2"><Calculator size={17} className="text-[#eed29d]"/><h2 className="text-base font-semibold text-white">ثبت فاکتور جدید</h2></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">نام تأمین‌کننده<input required minLength={2} maxLength={160} value={form.supplierName} onChange={event => setForm({ ...form, supplierName: event.target.value })} className={fieldClass}/></label>
        <label className="text-sm">محصول<select required value={form.productId} onChange={event => setForm({ ...form, productId: event.target.value })} className={fieldClass}><option value="" disabled>انتخاب محصول</option>{state.products.filter(product => product.status !== 'archived').map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <label className="text-sm">تعداد<input required type="number" min="1" max="100000" step="1" value={form.quantity} onChange={event => setForm({ ...form, quantity: event.target.value })} className={fieldClass}/></label>
        <label className="text-sm">تاریخ فاکتور<input required type="date" value={form.invoiceDate} onChange={event => setForm({ ...form, invoiceDate: event.target.value })} className={fieldClass}/></label>
        <label className="text-sm">قیمت خرید هر عدد (تومان)<input required type="number" min="0" max="2000000000" step="1" value={form.purchaseUnitPriceTomans} onChange={event => setForm({ ...form, purchaseUnitPriceTomans: event.target.value })} className={fieldClass}/></label>
        <label className="text-sm">قیمت فروش هر عدد (تومان)<input required type="number" min="0" max="2000000000" step="1" value={form.saleUnitPriceTomans} onChange={event => setForm({ ...form, saleUnitPriceTomans: event.target.value })} className={fieldClass}/></label>
        <label className="text-sm">هزینه ارسال (تومان)<input required type="number" min="0" max="2000000000" step="1" value={form.deliveryCostTomans} onChange={event => setForm({ ...form, deliveryCostTomans: event.target.value })} className={fieldClass}/></label>
        <label className="text-sm">هزینه چاپ (تومان)<input required type="number" min="0" max="2000000000" step="1" value={form.printingCostTomans} onChange={event => setForm({ ...form, printingCostTomans: event.target.value })} className={fieldClass}/></label>
      </div>
      <label className="block text-sm">یادداشت<textarea rows={2} maxLength={2000} value={form.notes} onChange={event => setForm({ ...form, notes: event.target.value })} className={`${fieldClass} leading-6`}/></label>
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
        <p className="text-sm text-stone-400">سود برآوردی: <strong className={estimatedProfit < 0 ? 'text-rose-300' : 'text-emerald-300'}>{money(estimatedProfit)}</strong><span className="mr-2 text-xs text-stone-500">(فروش × تعداد) − (خرید × تعداد) − ارسال − چاپ</span></p>
        <Button variant="brass" type="submit" disabled={saving || !state.products.length}><Save size={15}/>{saving ? 'در حال ثبت…' : 'ثبت فاکتور'}</Button>
      </div>
      {error && <p role="alert" aria-live="polite" className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm leading-6 text-rose-200">{error}</p>}
      {success && <p role="status" className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm leading-6 text-emerald-200">{success}</p>}
    </form>

    <section className="space-y-3"><h2 className="text-base font-semibold text-white">دفتر فاکتورها</h2>
      {error && invoices.length === 0 ? <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p>
        : <Table data={invoices} columns={columns} keyExtractor={invoice => invoice.id} isLoading={loading} emptyMessage="هنوز فاکتوری ثبت نشده است." mobileScrollHint/>}
    </section>
  </section>;
};
