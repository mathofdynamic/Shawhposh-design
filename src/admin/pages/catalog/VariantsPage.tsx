import React, { useState } from 'react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Table, type ColumnDef, useToast } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import type { ProductVariant } from '../../domain/types';
import { persianFit, persianSize } from '../../../lib/persian-labels';

type VariantForm = { productId: string; sku: string; colorName: string; colorHex: string; size: ProductVariant['size']; fit: ProductVariant['fit']; priceTomans: string; minStockThreshold: number; isEnabled: boolean };
const emptyForm = (productId = ''): VariantForm => ({ productId, sku: '', colorName: '', colorHex: '#000000', size: 'M', fit: 'oversize', priceTomans: '', minStockThreshold: 3, isEnabled: true });

export const VariantsPage: React.FC = () => {
  const { state, createVariant, updateVariant, deleteVariant } = useCatalogAdmin();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<VariantForm>(emptyForm());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const startCreate = () => { setEditing(null); setForm(emptyForm(state.products.find((product) => product.status === 'active')?.id ?? '')); setError(''); setOpenForm(true); };
  const startEdit = (variant: ProductVariant) => { setEditing(variant); setForm({ productId: variant.productId, sku: variant.sku, colorName: variant.colorName, colorHex: variant.colorHex, size: variant.size, fit: variant.fit, priceTomans: variant.priceTomans == null ? '' : String(variant.priceTomans), minStockThreshold: variant.minStockThreshold, isEnabled: variant.isEnabled !== false }); setError(''); setOpenForm(true); };

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    const payload = { ...form, sku: form.sku.trim().toUpperCase(), colorName: form.colorName.trim(), priceTomans: form.priceTomans.trim() ? Number(form.priceTomans) : null };
    const result = editing ? await updateVariant(editing.sku, payload) : await createVariant(payload);
    setSaving(false);
    if (!result.success) { setError(result.error || 'ذخیره تنوع انجام نشد.'); return; }
    setOpenForm(false); showToast({ type: 'success', title: 'تنوع ذخیره شد' });
  };

  const archive = async (variant: ProductVariant) => {
    if (!window.confirm(`شناسه ${variant.sku} به بایگانی منتقل شود؟`)) return;
    const result = await deleteVariant(variant.sku);
    showToast({ type: result.success ? 'success' : 'error', title: result.success ? 'تنوع بایگانی شد' : 'بایگانی تنوع انجام نشد', message: result.error });
  };

  const columns: ColumnDef<ProductVariant>[] = [
    { key: 'product', header: 'محصول', render: (variant) => state.products.find((product) => product.id === variant.productId)?.name ?? '—' },
    { key: 'sku', header: 'شناسه کالا', render: (variant) => <span className="font-mono text-[#eed29d]">{variant.sku}</span> },
    { key: 'variant', header: 'رنگ و اندازه', render: (variant) => <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full border border-white/20" style={{ background: variant.colorHex }}/>{variant.colorName} · {persianSize(variant.size)}</span> },
    { key: 'price', header: 'قیمت', align: 'center', render: (variant) => variant.priceTomans == null ? 'قیمت پایه محصول' : `${variant.priceTomans.toLocaleString('fa-IR')} تومان` },
    { key: 'stock', header: 'موجودی فیزیکی / رزروشده', align: 'center', render: (variant) => `${variant.onHandStock.toLocaleString('fa-IR')} / ${variant.reservedStock.toLocaleString('fa-IR')}` },
    { key: 'status', header: 'وضعیت', render: (variant) => variant.isEnabled === false ? 'بایگانی‌شده' : 'فعال' },
    { key: 'actions', header: 'عملیات', align: 'left', render: (variant) => <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => startEdit(variant)}>ویرایش</Button><Button size="sm" variant="ghost" disabled={variant.isEnabled === false} onClick={() => void archive(variant)}>بایگانی</Button></div> },
  ];

  return <div className="mx-auto max-w-7xl space-y-5">
    <AdminPageHeader title="تنوع‌ها و شناسه‌های کالا" description="رنگ، اندازه و وضعیت هر تنوع محصول." actions={<Button variant="brass" onClick={startCreate}>شناسه جدید</Button>} />
    <Table data={state.variants} columns={columns} keyExtractor={(variant) => variant.id} mobileScrollHint emptyMessage="تنوعی برای محصولات ثبت نشده است." />
    {openForm && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenForm(false); }}>
      <form onSubmit={(event) => void save(event)} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#181716] p-6 text-stone-100">
        <h2 className="text-lg font-semibold">{editing ? 'ویرایش شناسه کالا' : 'شناسه کالای جدید'}</h2>
        <label className="block text-sm">محصول<select required value={form.productId} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, productId: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#10100f] px-3 py-2">{state.products.filter((product) => product.status !== 'archived').map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <label className="block text-sm">شناسه کالا<input required pattern="[A-Za-z0-9_-]+" maxLength={100} value={form.sku} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, sku: event.target.value.toUpperCase() })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono"/></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">نام رنگ<input required maxLength={100} value={form.colorName} onChange={(event) => setForm({ ...form, colorName: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label><label className="text-sm">کد رنگ<input required pattern="#[0-9a-fA-F]{6}" value={form.colorHex} onChange={(event) => setForm({ ...form, colorHex: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono"/></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">اندازه<select value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value as VariantForm['size'] })} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#10100f] px-3 py-2">{(['S', 'M', 'L', 'XL', 'XXL'] as const).map((size) => <option key={size} value={size}>{persianSize(size)}</option>)}</select></label><label className="text-sm">قواره<select value={form.fit} onChange={(event) => setForm({ ...form, fit: event.target.value as VariantForm['fit'] })} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#10100f] px-3 py-2">{(['oversize', 'classic', 'slim', 'oversized', 'regular', 'crop'] as const).map((fit) => <option key={fit} value={fit}>{persianFit(fit)}</option>)}</select></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">قیمت جایگزین (تومان)<input type="number" min="0" max="2000000000" step="1" value={form.priceTomans} onChange={(event) => setForm({ ...form, priceTomans: event.target.value })} placeholder="استفاده از قیمت پایه محصول" className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label><label className="text-sm">آستانه کمبود موجودی<input required type="number" min="0" max="100000" step="1" value={form.minStockThreshold} onChange={(event) => setForm({ ...form, minStockThreshold: Number(event.target.value) })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label></div>
        <p className="text-xs leading-6 text-stone-400">موجودی شناسه‌های جدید صفر است. تعداد شمارش‌شده را از بخش موجودی ثبت کنید تا تغییرات در سوابق انبار بماند.</p>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" type="button" onClick={() => setOpenForm(false)}>انصراف</Button><Button variant="brass" type="submit" disabled={saving}>{saving ? 'در حال ذخیره…' : 'ذخیره شناسه'}</Button></div>
      </form>
    </div>}
  </div>;
};
