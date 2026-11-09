import React, { useMemo, useState } from 'react';
import { Archive, Plus } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Dialog, Table, type ColumnDef, useAppDialog, useToast } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import type { ProductVariant } from '../../domain/types';
import { persianFit, persianSize } from '../../../lib/persian-labels';

const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as const;
type ApparelSize = typeof sizes[number];
type VariantForm = {
  productId: string;
  colorName: string;
  size: ApparelSize;
  fit: ProductVariant['fit'];
  weightGrams: string;
  onHandStock: string;
  inventoryReason: string;
  priceTomans: string;
  minStockThreshold: number;
  isEnabled: boolean;
};
const emptyForm = (productId = ''): VariantForm => ({
  productId, colorName: '', size: 'M', fit: 'regular', weightGrams: '', onHandStock: '0', inventoryReason: '',
  priceTomans: '', minStockThreshold: 3, isEnabled: true,
});
const inputClass = 'mt-1 block min-h-11 w-full rounded-lg border border-white/35 bg-[#10100f] px-3 py-2.5 text-sm outline-none focus:border-[#ba8d3d] focus:ring-2 focus:ring-[#ba8d3d]/20';

export const VariantsPage: React.FC = () => {
  const { state, createVariant, updateVariant, deleteVariant } = useCatalogAdmin();
  const { showToast } = useToast();
  const { confirm: confirmDialog } = useAppDialog();
  const [editing, setEditing] = useState<ProductVariant | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<VariantForm>(emptyForm());
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const visibleVariants = useMemo(() => state.variants.filter(variant => statusFilter === 'all'
    || (statusFilter === 'active' ? variant.isEnabled !== false : variant.isEnabled === false)), [state.variants, statusFilter]);
  const selectedProduct = state.products.find(product => product.id === form.productId);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm(state.products.find(product => product.status === 'active')?.id ?? ''));
    setError('');
    setOpenForm(true);
  };
  const startEdit = (variant: ProductVariant) => {
    setEditing(variant);
    setForm({
      productId: variant.productId, colorName: variant.colorName, size: variant.size as ApparelSize,
      fit: variant.fit, weightGrams: variant.weightGrams == null ? '' : String(variant.weightGrams),
      onHandStock: String(variant.onHandStock), inventoryReason: '',
      priceTomans: variant.priceTomans == null ? '' : String(variant.priceTomans),
      minStockThreshold: variant.minStockThreshold, isEnabled: variant.isEnabled !== false,
    });
    setError('');
    setOpenForm(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const stockChanged = Number(form.onHandStock) !== (editing?.onHandStock ?? 0);
    const payload = {
      productId: form.productId,
      ...(editing ? { sku: editing.sku, colorHex: editing.colorHex } : {}),
      colorName: form.colorName.trim(),
      size: form.size,
      fit: form.fit,
      weightGrams: form.weightGrams.trim() ? Number(form.weightGrams) : null,
      onHandStock: Number(form.onHandStock),
      ...(stockChanged ? { inventoryReason: form.inventoryReason.trim() } : {}),
      priceTomans: form.priceTomans.trim() ? Number(form.priceTomans) : null,
      minStockThreshold: Number(form.minStockThreshold),
      isEnabled: form.isEnabled,
    };
    const result = editing ? await updateVariant(editing.sku, payload) : await createVariant(payload);
    setSaving(false);
    if (!result.success) { setError(result.error || 'تنوع ذخیره نشد. ورودی‌های فرم را بررسی کنید.'); return; }
    setOpenForm(false);
    showToast({ type: 'success', title: editing ? 'تنوع به‌روزرسانی شد' : 'تنوع ذخیره شد' });
  };

  const archive = async (variant: ProductVariant) => {
    const confirmed = await confirmDialog({
      title: 'بایگانی تنوع محصول',
      description: `تنوع «${state.products.find(product => product.id === variant.productId)?.name ?? ''}، ${variant.colorName}، ${persianSize(variant.size)}» از فروش پنهان می‌شود و برای حفظ سوابق سفارش و انبار باقی می‌ماند.`,
      confirmLabel: 'بایگانی تنوع',
    });
    if (!confirmed) return;
    const result = await deleteVariant(variant.sku);
    showToast({ type: result.success ? 'success' : 'error', title: result.success ? 'تنوع بایگانی شد' : 'بایگانی تنوع انجام نشد', message: result.error });
  };

  const columns: ColumnDef<ProductVariant>[] = [
    { key: 'product', header: 'محصول', nowrap: true, render: variant => state.products.find(product => product.id === variant.productId)?.name ?? '—' },
    { key: 'variant', header: 'رنگ، اندازه و قواره', nowrap: true, render: variant => <span className="flex items-center gap-2"><i aria-hidden="true" className="h-3 w-3 rounded-full border border-white/20" style={{ background: variant.colorHex }}/>{variant.colorName} · {persianSize(variant.size)} · {persianFit(variant.fit)}</span> },
    { key: 'weight', header: 'وزن', align: 'center', nowrap: true, render: variant => variant.weightGrams == null ? '—' : `${variant.weightGrams.toLocaleString('fa-IR')} گرم` },
    { key: 'price', header: 'قیمت', align: 'center', nowrap: true, render: variant => variant.priceTomans == null ? 'قیمت پایه محصول' : `${variant.priceTomans.toLocaleString('fa-IR')} تومان` },
    { key: 'stock', header: 'موجودی فیزیکی / رزروشده', align: 'center', nowrap: true, render: variant => `${variant.onHandStock.toLocaleString('fa-IR')} / ${variant.reservedStock.toLocaleString('fa-IR')}` },
    { key: 'status', header: 'وضعیت', nowrap: true, render: variant => variant.isEnabled === false ? 'بایگانی‌شده' : 'فعال' },
    { key: 'actions', header: 'عملیات', align: 'left', nowrap: true, render: variant => <div className="flex gap-2"><Button size="sm" variant="secondary" className="min-h-11 whitespace-nowrap sm:min-h-[32px]" onClick={() => startEdit(variant)}>ویرایش</Button>{variant.isEnabled !== false && <Button size="sm" variant="ghost" className="min-h-11 whitespace-nowrap sm:min-h-[32px]" onClick={() => void archive(variant)}><Archive size={14}/> بایگانی</Button>}</div> },
  ];

  return <div className="mx-auto max-w-7xl space-y-5" dir="rtl">
    <AdminPageHeader title="تنوع محصولات" description="دسته پوشاک، رنگ، اندازه، قواره، وزن و موجودی هر محصول را ثبت کنید." actions={<Button variant="brass" className="whitespace-nowrap" onClick={startCreate}><Plus size={16}/> افزودن تنوع</Button>} />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs leading-6 text-stone-500">شناسه کالا خودکار ساخته می‌شود و در این فرم قابل ویرایش نیست.</p>
      <select aria-label="فیلتر وضعیت تنوع" value={statusFilter} onChange={event => setStatusFilter(event.target.value as typeof statusFilter)} className="min-h-11 rounded-xl border border-white/10 bg-[#181716] px-3 text-sm text-stone-200"><option value="active">تنوع‌های فعال</option><option value="archived">تنوع‌های بایگانی‌شده</option><option value="all">همه تنوع‌ها</option></select>
    </div>
    <Table data={visibleVariants} columns={columns} keyExtractor={variant => variant.id} mobileScrollHint emptyMessage={statusFilter === 'active' ? 'تنوع فعالی ثبت نشده است.' : 'تنوعی در این فهرست وجود ندارد.'} />
    <Dialog isOpen={openForm} onClose={() => { if (!saving) setOpenForm(false); }} title={editing ? 'ویرایش تنوع محصول' : 'تنوع جدید'} description="رنگ، اندازه، قواره، وزن و موجودی را برای محصول ثبت کنید." size="lg" footer={<><Button variant="ghost" type="button" onClick={() => setOpenForm(false)} disabled={saving}>انصراف</Button><Button variant="brass" type="submit" form="variant-form" disabled={saving || !state.products.some(product => product.status === 'active')}>{saving ? 'در حال ذخیره…' : editing ? 'ذخیره تغییرات' : 'ثبت تنوع'}</Button></>}>
      <form id="variant-form" onSubmit={event => void save(event)} className="max-h-[calc(92dvh-12rem)] space-y-4 overflow-y-auto overscroll-contain pb-2">
        <label className="block text-sm">محصول<select required value={form.productId} disabled={Boolean(editing)} onChange={event => setForm({ ...form, productId: event.target.value })} className={inputClass}><option value="" disabled>انتخاب محصول</option>{state.products.filter(product => product.status !== 'archived').map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <div className="rounded-lg border border-white/10 bg-white/[0.025] px-3 py-2 text-xs text-stone-400">نوع پوشاک: <strong className="text-[#eed29d]">{selectedProduct ? ({ hoodie: 'هودی', dors: 'دورس', tshirt: 'تیشرت', sweatshirt: 'سویشرت', halfzip: 'نیم‌زیپ', pants: 'شلوار' } as Record<string, string>)[selectedProduct.garmentType ?? ''] ?? 'نوع پوشاک برای این محصول ثبت نشده است.' : 'ابتدا محصول را انتخاب کنید'}</strong></div>
        {editing && <p className="text-xs text-stone-500">شناسه کالا: <span dir="ltr" className="font-mono text-[#eed29d]">{editing.sku}</span></p>}
        <label className="block text-sm">نام رنگ<input required maxLength={100} value={form.colorName} onChange={event => setForm({ ...form, colorName: event.target.value })} className={inputClass} placeholder="مثلاً سرمه‌ای"/></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">اندازه<select value={form.size} onChange={event => setForm({ ...form, size: event.target.value as ApparelSize })} className={inputClass}>{editing && !sizes.includes(editing.size as ApparelSize) && <option value={editing.size}>{persianSize(editing.size)} · مقدار ثبت‌شده</option>}{sizes.map(size => <option key={size} value={size}>{persianSize(size)}</option>)}</select></label>
          <label className="text-sm">قواره<select value={form.fit} onChange={event => setForm({ ...form, fit: event.target.value as VariantForm['fit'] })} className={inputClass}>{(['oversize', 'classic', 'slim', 'oversized', 'regular', 'crop', 'boxy'] as const).map(fit => <option key={fit} value={fit}>{persianFit(fit)}</option>)}</select></label>
          <label className="text-sm">وزن لباس (گرم)<input type="number" min="0" max="100000" step="1" value={form.weightGrams} onChange={event => setForm({ ...form, weightGrams: event.target.value })} className={inputClass} placeholder="اختیاری"/></label>
          <label className="text-sm">قیمت جایگزین (تومان)<input type="number" min="0" max="2000000000" step="1" value={form.priceTomans} onChange={event => setForm({ ...form, priceTomans: event.target.value })} placeholder="قیمت پایه محصول" className={inputClass}/></label>
          <label className="text-sm">موجودی اولیه / فعلی<input required type="number" min="0" max="1000000" step="1" value={form.onHandStock} onChange={event => setForm({ ...form, onHandStock: event.target.value })} className={inputClass}/></label>
          <label className="text-sm">آستانه هشدار کمبود<input required type="number" min="0" max="100000" step="1" value={form.minStockThreshold} onChange={event => setForm({ ...form, minStockThreshold: Number(event.target.value) })} className={inputClass}/></label>
        </div>
        {Number(form.onHandStock) !== (editing?.onHandStock ?? 0) && <label className="block text-sm">دلیل ثبت تغییر موجودی<input required minLength={3} maxLength={1000} value={form.inventoryReason} onChange={event => setForm({ ...form, inventoryReason: event.target.value })} className={inputClass} placeholder="مثلاً شمارش اولیه انبار"/><span className="mt-1 block text-xs text-stone-500">این توضیح در سوابق انبار ثبت می‌شود.</span></label>}
        {editing && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isEnabled} onChange={event => setForm({ ...form, isEnabled: event.target.checked })}/>تنوع برای فروش فعال باشد</label>}
        {error && <p role="alert" aria-live="polite" className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm leading-6 text-rose-200">{error}</p>}
      </form>
    </Dialog>
  </div>;
};
