import React, { useMemo, useState } from 'react';
import { ArrowLeft, Archive, Save } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, useToast } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import { useAdminRouter } from '../../router';
import type { AdminProduct } from '../../domain/types';

interface ProductEditorProps { productId?: string; onBack?: () => void }

type FormState = Pick<AdminProduct, 'name' | 'slug' | 'category' | 'description' | 'basePriceTomans' | 'status' | 'isCustomizable' | 'featured'>;

export const ProductEditor: React.FC<ProductEditorProps> = ({ productId, onBack }) => {
  const { navigate } = useAdminRouter();
  const { showToast } = useToast();
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
    if (!result.success) { setError(result.error || 'Could not save product.'); return; }
    showToast({ type: 'success', title: 'Product saved' });
    back();
  };

  const archive = async () => {
    if (!current || !window.confirm(`Archive “${current.name}”?`)) return;
    const result = await deleteProduct(current.id);
    if (!result.success) { setError(result.error || 'Could not archive product.'); return; }
    showToast({ type: 'success', title: 'Product archived' });
    back();
  };

  return <div className="mx-auto max-w-5xl space-y-5">
    <AdminPageHeader title={current?.name ?? (isNew ? 'New product' : 'Product not found')} description="Edits are saved to the production catalog database." actions={<Button variant="ghost" onClick={back}><ArrowLeft size={16}/> Back to products</Button>} />
    {!current && !isNew ? <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 text-amber-200">This product is not present in the current catalog.</div> : <form onSubmit={(event) => void save(event)} className="space-y-5 rounded-2xl border border-white/10 bg-[#141211] p-5 md:p-7">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm">Product name<input required maxLength={200} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label>
        <label className="text-sm">Slug<input required pattern="[a-z0-9-]+" maxLength={150} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono"/></label>
        <label className="text-sm">Category<select required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#10100f] px-3 py-2">{state.categories.filter((category) => category.status === 'active').map((category) => <option key={category.id} value={category.slug}>{category.nameFa}</option>)}</select></label>
        <label className="text-sm">Base price (Toman)<input required type="number" min="0" max="2000000000" step="1" value={form.basePriceTomans} onChange={(event) => setForm({ ...form, basePriceTomans: Number(event.target.value) })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label>
        <label className="text-sm">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState['status'] })} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#10100f] px-3 py-2"><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select></label>
      </div>
      <label className="block text-sm">Description<textarea maxLength={20000} rows={5} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 leading-6"/></label>
      <label className="block text-sm">Product image URLs or local paths, one per line<textarea rows={3} value={imagesText} onChange={(event) => setImagesText(event.target.value)} placeholder="/images/product-front.webp" className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono text-xs"/><span className="mt-1 block text-xs text-stone-500">No product image is currently registered for this item. Upload support is not part of this release.</span></label>
      <div className="flex flex-wrap gap-5 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.isCustomizable} onChange={(event) => setForm({ ...form, isCustomizable: event.target.checked })}/>Customization available</label><label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })}/>Featured in catalog</label></div>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      <div className="flex justify-end gap-2 border-t border-white/10 pt-4">{current && <Button type="button" variant="ghost" onClick={() => void archive()}><Archive size={15}/> Archive</Button>}<Button variant="brass" type="submit" disabled={saving || !state.categories.some((category) => category.status === 'active')}><Save size={15}/>{saving ? 'Saving…' : 'Save product'}</Button></div>
    </form>}
  </div>;
};
