import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Archive, Check, ImagePlus, Save, X } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, useAppDialog, useToast } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import { useAdminRouter } from '../../router';
import type { AdminProduct, GarmentType } from '../../domain/types';

interface ProductEditorProps { productId?: string; onBack?: () => void }

type FormState = Pick<AdminProduct, 'name' | 'category' | 'description' | 'basePriceTomans' | 'status' | 'isCustomizable' | 'featured'> & {
  garmentType: GarmentType;
  discountPercent: string;
};

const garmentOptions: Array<{ value: GarmentType; label: string }> = [
  { value: 'hoodie', label: 'هودی' },
  { value: 'dors', label: 'دورس' },
  { value: 'tshirt', label: 'تیشرت' },
  { value: 'sweatshirt', label: 'سویشرت' },
  { value: 'halfzip', label: 'نیم‌زیپ' },
  { value: 'pants', label: 'شلوار' },
];

const fieldClass = 'mt-1 block min-h-11 w-full rounded-lg border border-white/35 bg-[#10100f] px-3 py-2.5 text-sm text-stone-100 outline-none transition focus:border-[#ba8d3d] focus:ring-2 focus:ring-[#ba8d3d]/20';

export const ProductEditor: React.FC<ProductEditorProps> = ({ productId, onBack }) => {
  const { navigate } = useAdminRouter();
  const { showToast } = useToast();
  const { confirm: confirmDialog } = useAppDialog();
  const { state, getProductById, createProduct, updateProduct, deleteProduct, uploadProductImage, reload } = useCatalogAdmin();
  const isNew = !productId || productId === 'new';
  const current = useMemo(() => isNew ? undefined : getProductById(productId), [getProductById, isNew, productId]);
  const [savedId, setSavedId] = useState('');
  const [form, setForm] = useState<FormState>(() => current ? {
    name: current.name,
    category: current.category,
    garmentType: current.garmentType ?? 'tshirt',
    description: current.description,
    basePriceTomans: current.basePriceTomans,
    discountPercent: current.discountPercent ? String(current.discountPercent) : '',
    status: current.status,
    isCustomizable: current.isCustomizable,
    featured: current.featured,
  } : {
    name: '', category: state.categories.find((item) => item.status === 'active')?.slug ?? '', garmentType: 'tshirt',
    description: '', basePriceTomans: 0, discountPercent: '', status: 'draft', isCustomizable: false, featured: false,
  });
  const [keptImages, setKeptImages] = useState<string[]>(current?.images ?? []);
  const [imagesChanged, setImagesChanged] = useState(false);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const urls = newImages.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [newImages]);

  const back = () => { if (onBack) onBack(); else navigate('/admin/catalog/products'); };
  const selectImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (saving) { event.target.value = ''; return; }
    const selected: File[] = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    const accepted = selected.filter(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 5 * 1024 * 1024);
    if (accepted.length !== selected.length) setError('قالب تصویر پشتیبانی نمی‌شود یا حجم آن از ۵ مگابایت بیشتر است.');
    const room = Math.max(0, 30 - keptImages.length - newImages.length);
    if (accepted.length > room) setError('هر محصول حداکثر ۳۰ تصویر می‌تواند داشته باشد.');
    setNewImages(previous => [...previous, ...accepted.slice(0, room)]);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (keptImages.length + newImages.length > 30) { setError('هر محصول حداکثر ۳۰ تصویر می‌تواند داشته باشد.'); return; }
    const persistedId = current?.id ?? savedId;
    const payload = {
      ...form,
      discountPercent: form.discountPercent.trim() ? Number(form.discountPercent) : null,
      basePriceTomans: Number(form.basePriceTomans),
      ...(imagesChanged ? { images: keptImages, primaryImage: keptImages[0], imageAlts: current?.imageAlts ?? {} } : {}),
      skuPrefix: current?.skuPrefix ?? '',
      fabricSpecs: current?.fabricSpecs ?? '',
      tags: current?.tags ?? [],
      details: current?.details ?? [],
    };
    setSaving(true);
    try {
      const result = persistedId ? await updateProduct(persistedId, payload) : await createProduct(payload);
      const id = persistedId || result.id || '';
      if (!result.success || !id) {
        setError(result.error || 'محصول ذخیره نشد. ورودی‌های فرم را بررسی کنید.');
        return;
      }
      setSavedId(id);
      setImagesChanged(false);
      const pendingImages = [...newImages];
      const uploadedImageUrls: string[] = [];
      let uploadedCount = 0;
      while (pendingImages.length) {
        const upload = await uploadProductImage(id, pendingImages[0], form.name.trim());
        if (!upload.success) {
          setNewImages(pendingImages);
          try {
            const refreshed = await reload();
            const persistedImages = refreshed.products.find(product => product.id === id)?.images;
            if (persistedImages) setKeptImages(persistedImages);
            else setKeptImages(previous => [...new Set([...previous, ...uploadedImageUrls])]);
          } catch {
            setKeptImages(previous => [...new Set([...previous, ...uploadedImageUrls])]);
          }
          setError(`اطلاعات محصول ذخیره شد؛ ${uploadedCount ? `${uploadedCount} تصویر بارگذاری شد و` : 'اما'} تصویر بعدی بارگذاری نشد: ${upload.error || 'خطای نامشخص'}`);
          return;
        }
        uploadedImageUrls.push(upload.image.url);
        setKeptImages(previous => previous.includes(upload.image.url) ? previous : [...previous, upload.image.url]);
        pendingImages.shift();
        uploadedCount += 1;
      }
      setNewImages([]);
      try { await reload(); } catch { /* The saved product remains committed; the catalog provider offers a retry. */ }
      showToast({ type: 'success', title: newImages.length ? 'محصول و تصاویر ذخیره شدند' : 'محصول ذخیره شد' });
      back();
    } catch {
      setError('ذخیره محصول انجام نشد. دوباره تلاش کنید.');
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!current) return;
    const confirmed = await confirmDialog({
      title: 'بایگانی محصول',
      description: `محصول «${current.name}» از فروشگاه پنهان و برای حفظ سوابق سفارش و انبار نگه‌داری می‌شود.`,
      confirmLabel: 'بایگانی محصول',
    });
    if (!confirmed) return;
    const result = await deleteProduct(current.id);
    if (!result.success) { setError(result.error || 'بایگانی محصول انجام نشد.'); return; }
    showToast({ type: 'success', title: 'محصول بایگانی شد' });
    back();
  };

  return <div className="mx-auto max-w-5xl space-y-5" dir="rtl">
    <AdminPageHeader title={current?.name ?? (savedId ? form.name : isNew ? 'محصول جدید' : 'محصول پیدا نشد')} description="مشخصات محصول، نوع پوشاک، تصویرها و تخفیف را ثبت کنید." actions={<Button variant="ghost" onClick={back} disabled={saving}><ArrowLeft size={16}/> بازگشت به محصولات</Button>} />
    {!current && !isNew ? <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-amber-200">این محصول در فهرست فعلی وجود ندارد.</div> : <form onSubmit={(event) => void save(event)} className="space-y-6 rounded-2xl border border-white/10 bg-[#141211] p-5 md:p-7">
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        <label className="text-sm">نام محصول<input required maxLength={200} disabled={saving} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className={fieldClass}/></label>
        <label className="text-sm">نوع پوشاک<select required disabled={saving} value={form.garmentType} onChange={(event) => setForm({ ...form, garmentType: event.target.value as GarmentType })} className={fieldClass}>{garmentOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label className="text-sm">سبک طرح<select required disabled={saving} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className={fieldClass}>{state.categories.filter((category) => category.status === 'active').map((category) => <option key={category.id} value={category.slug}>{category.nameFa}</option>)}</select></label>
        <label className="text-sm">قیمت پایه (تومان)<input required disabled={saving} type="number" min="0" max="2000000000" step="1" value={form.basePriceTomans} onChange={(event) => setForm({ ...form, basePriceTomans: Number(event.target.value) })} className={fieldClass}/></label>
        <label className="text-sm">تخفیف (درصد)<input disabled={saving} type="number" min="1" max="90" step="1" inputMode="numeric" value={form.discountPercent} onChange={(event) => setForm({ ...form, discountPercent: event.target.value })} placeholder="بدون تخفیف" className={fieldClass}/><span className="mt-1 block text-xs text-stone-400">قیمت نهایی در فروشگاه به‌صورت خودکار محاسبه می‌شود.</span></label>
        <label className="text-sm">وضعیت فروش<select disabled={saving} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState['status'] })} className={fieldClass}><option value="draft">پیش‌نویس</option><option value="active">فعال</option><option value="archived">بایگانی‌شده</option></select></label>
      </div>
      <label className="block text-sm">توضیحات<textarea disabled={saving} maxLength={20000} rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={`${fieldClass} leading-6`}/></label>

      <section className="space-y-3 border-t border-white/10 pt-5" aria-labelledby="product-images-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="product-images-heading" className="text-sm font-semibold">تصاویر محصول</h2><p className="mt-1 text-xs text-stone-500">قالب‌های تصویری رایج؛ حداکثر ۵ مگابایت برای هر تصویر.</p></div>
          <label aria-disabled={saving} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#ba8d3d]/40 px-4 text-sm text-[#eed29d] transition focus-within:ring-2 focus-within:ring-[#ba8d3d] ${saving ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[#ba8d3d]/10'}`}>
            <ImagePlus size={16}/> افزودن تصویر
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={saving} className="sr-only" onChange={selectImages}/>
          </label>
        </div>
        {keptImages.length + newImages.length > 0 ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {keptImages.map((url, index) => <figure key={url} className="group relative overflow-hidden rounded-xl border border-white/10 bg-black/20">
            <img src={url} alt={`${form.name || 'محصول'}، تصویر ${index + 1}`} className="aspect-[4/3] w-full object-cover"/>
            <button type="button" disabled={saving} aria-label={`حذف تصویر ${index + 1}`} onClick={() => { setKeptImages(images => images.filter(image => image !== url)); setImagesChanged(true); }} className="absolute left-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/75 text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-50"><X size={16}/></button>
            {index === 0 && <figcaption className="absolute bottom-0 right-0 left-0 bg-black/65 px-2 py-1 text-[10px] text-[#eed29d]">تصویر اصلی</figcaption>}
          </figure>)}
          {newImages.map((file, index) => <figure key={`${file.name}-${file.lastModified}-${index}`} className="group relative overflow-hidden rounded-xl border border-[#ba8d3d]/30 bg-black/20">
            {previewUrls[index] && <img src={previewUrls[index]} alt={`پیش‌نمایش ${file.name}`} className="aspect-[4/3] w-full object-cover"/>}
            <figcaption className="truncate px-2 py-1 text-[10px] text-stone-400">پس از ذخیره بارگذاری می‌شود</figcaption>
            <button type="button" disabled={saving} aria-label={`حذف تصویر تازه ${index + 1}`} onClick={() => setNewImages(images => images.filter((_, imageIndex) => imageIndex !== index))} className="absolute left-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-black/75 text-white transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-50"><X size={16}/></button>
          </figure>)}
        </div> : <div className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-stone-500">هنوز تصویری برای این محصول ثبت نشده است.</div>}
      </section>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <label className="flex min-h-11 items-center gap-2">
          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
            <input type="checkbox" disabled={saving} checked={form.isCustomizable} onChange={event => setForm({ ...form, isCustomizable: event.target.checked })} className="peer absolute inset-0 z-10 h-5 w-5 cursor-pointer opacity-0 disabled:cursor-not-allowed" />
            <span aria-hidden="true" className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#eed29d] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#141211] ${form.isCustomizable ? 'border-[#ba8d3d] bg-[#ba8d3d] text-[#0e0d0c]' : 'border-white/25 bg-[#10100f]'}`}>{form.isCustomizable && <Check size={11} strokeWidth={3}/>}</span>
          </span>
          امکان شخصی‌سازی
        </label>
        <label className="flex min-h-11 items-center gap-2">
          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
            <input type="checkbox" disabled={saving} checked={form.featured} onChange={event => setForm({ ...form, featured: event.target.checked })} className="peer absolute inset-0 z-10 h-5 w-5 cursor-pointer opacity-0 disabled:cursor-not-allowed" />
            <span aria-hidden="true" className={`pointer-events-none flex h-4 w-4 items-center justify-center rounded border transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#eed29d] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[#141211] ${form.featured ? 'border-[#ba8d3d] bg-[#ba8d3d] text-[#0e0d0c]' : 'border-white/25 bg-[#10100f]'}`}>{form.featured && <Check size={11} strokeWidth={3}/>}</span>
          </span>
          نمایش ویژه در کاتالوگ
        </label>
      </div>
      {error && <p role="alert" aria-live="polite" className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm leading-6 text-rose-200">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-white/10 pt-4">{current && <Button type="button" variant="ghost" disabled={saving} onClick={() => void archive()}><Archive size={15}/> بایگانی</Button>}<Button variant="brass" type="submit" disabled={saving || !state.categories.some((category) => category.status === 'active')}><Save size={15}/>{saving ? 'در حال ذخیره…' : 'ذخیره محصول'}</Button></div>
    </form>}
  </div>;
};
