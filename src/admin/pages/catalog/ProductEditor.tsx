import React, { useMemo, useState } from 'react';
import { ArrowLeft, Archive, Save } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, useAppDialog, useToast } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import { useAdminRouter } from '../../router';
import type { AdminProduct } from '../../domain/types';

interface ProductEditorProps { productId?: string; onBack?: () => void }

type FormState = Pick<AdminProduct, 'name' | 'slug' | 'category' | 'description' | 'basePriceTomans' | 'status' | 'isCustomizable' | 'featured'>;

export const ProductEditor: React.FC<ProductEditorProps> = ({ productId, onBack }) => {
  const { navigate } = useAdminRouter();
  const { showToast } = useToast();
  const { confirm: confirmDialog } = useAppDialog();
  const { state, getProductById, createProduct, updateProduct, deleteProduct } = useCatalogAdmin();
  const isNew = !productId || productId === 'new';
  const current = useMemo(() => isNew ? undefined : getProductById(productId), [getProductById, isNew, productId]);
  const [form, setForm] = useState<FormState>(() => current ? {
    name: current.name,
    slug: current.slug,
    category: current.category,
    description: current.description,
    basePriceTomans: current.basePriceTomans,
    status: current.status,
    isCustomizable: current.isCustomizable,
    featured: current.featured,
  } : {
    name: '', slug: '', category: state.categories.find((item) => item.status === 'active')?.slug ?? '',
    description: '', basePriceTomans: 0, status: 'draft', isCustomizable: false, featured: false,
  });
  const [imagesText, setImagesText] = useState(current?.images.join('\n') ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const back = () => { if (onBack) onBack(); else navigate('/admin/catalog/products'); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const images = imagesText.split('\n').map((image) => image.trim()).filter(Boolean);
    const payload = {
      ...form,
      basePriceTomans: Number(form.basePriceTomans),
      images,
      primaryImage: current?.primaryImage && images.includes(current.primaryImage) ? current.primaryImage : images[0],
      imageAlts: current?.imageAlts ?? {},
      skuPrefix: current?.skuPrefix ?? '',
      fabricSpecs: current?.fabricSpecs ?? '',
      tags: current?.tags ?? [],
      details: current?.details ?? [],
    };
    setSaving(true);
    const result = current ? await updateProduct(current.id, payload) : await createProduct(payload);
    setSaving(false);
    if (!result.success) { setError(result.error || 'ذخیره محصول انجام نشد.'); return; }
    showToast({ type: 'success', title: 'محصول ذخیره شد' });
    back();
  };

  const archive = async () => {
    if (!current) return;
    const confirmed = await confirmDialog({
      title: 'بایگانی محصول',
      description: `آیا محصول «${current.name}» به بایگانی منتقل شود؟`,
      confirmLabel: 'انتقال به بایگانی',
    });
    if (!confirmed) return;
    const result = await deleteProduct(current.id);
    if (!result.success) { setError(result.error || 'بایگانی محصول انجام نشد.'); return; }
    showToast({ type: 'success', title: 'محصول بایگانی شد' });
    back();
  };

  return <div className="mx-auto max-w-5xl space-y-5">
    <AdminPageHeader title={current?.name ?? (isNew ? 'محصول جدید' : 'محصول پیدا نشد')} description="تغییرات در فهرست محصولات ذخیره می‌شوند." actions={<Button variant="ghost" onClick={back}><ArrowLeft size={16}/> بازگشت به محصولات</Button>} />
    {!current && !isNew ? <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-amber-200">این محصول در فهرست فعلی وجود ندارد.</div> : <form onSubmit={(event) => void save(event)} className="space-y-5 rounded-2xl border border-white/10 bg-[#141211] p-5 md:p-7">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">نام محصول<input required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label>
        <label className="text-sm">شناسه نشانی (لاتین)<input required pattern="[a-z0-9-]+" maxLength={150} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono"/></label>
        <label className="text-sm">دسته‌بندی<select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#10100f] px-3 py-2">{state.categories.filter((category) => category.status === 'active').map((category) => <option key={category.id} value={category.slug}>{category.nameFa}</option>)}</select></label>
        <label className="text-sm">قیمت پایه (تومان)<input required type="number" min="0" max="2000000000" step="1" value={form.basePriceTomans} onChange={(event) => setForm({ ...form, basePriceTomans: Number(event.target.value) })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label>
        <label className="text-sm">وضعیت<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState['status'] })} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#10100f] px-3 py-2"><option value="draft">پیش‌نویس</option><option value="active">فعال</option><option value="archived">بایگانی‌شده</option></select></label>
      </div>
      <label className="block text-sm">توضیحات<textarea maxLength={20000} rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 leading-6"/></label>
      <label className="block text-sm">نشانی تصویر یا مسیر فایل (هر مورد در یک سطر)<textarea rows={3} value={imagesText} onChange={(event) => setImagesText(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-xs"/><span className="mt-1 block text-xs text-stone-500">برای این محصول تصویری ثبت نشده است. امکان بارگذاری تصویر در این نسخه وجود ندارد.</span></label>
      <div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.isCustomizable} onChange={(event) => setForm({ ...form, isCustomizable: event.target.checked })}/>امکان شخصی‌سازی</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })}/>نمایش ویژه در کاتالوگ</label></div>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-white/10 pt-4">{current && <Button type="button" variant="ghost" onClick={() => void archive()}><Archive size={15}/> بایگانی</Button>}<Button variant="brass" type="submit" disabled={saving || !state.categories.some((category) => category.status === 'active')}><Save size={15}/>{saving ? 'در حال ذخیره…' : 'ذخیره محصول'}</Button></div>
    </form>}
  </div>;
};
