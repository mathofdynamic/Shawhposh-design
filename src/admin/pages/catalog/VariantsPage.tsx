import React, { useState } from 'react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Table, type ColumnDef, useToast } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import type { ProductVariant } from '../../domain/types';

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
    if (!result.success) { setError(result.error || 'Could not save variant.'); return; }
    setOpenForm(false); showToast({ type: 'success', title: 'Variant saved' });
  };

  const archive = async (variant: ProductVariant) => {
    if (!window.confirm(`Archive SKU ${variant.sku}?`)) return;
    const result = await deleteVariant(variant.sku);
    showToast({ type: result.success ? 'success' : 'error', title: result.success ? 'Variant archived' : 'Could not archive variant', message: result.error });
  };

  const columns: ColumnDef<ProductVariant>[] = [
    { key: 'product', header: 'Product', render: (variant) => state.products.find((product) => product.id === variant.productId)?.name ?? '—' },
    { key: 'sku', header: 'SKU', render: (variant) => <span className="font-mono text-[#eed29d]">{variant.sku}</span> },
    { key: 'variant', header: 'Color / size', render: (variant) => <span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full border border-white/20" style={{ background: variant.colorHex }}/>{variant.colorName} · {variant.size}</span> },
    { key: 'price', header: 'Price', align: 'center', render: (variant) => variant.priceTomans == null ? 'Product base price' : `${variant.priceTomans.toLocaleString()} Toman` },
    { key: 'stock', header: 'On hand / reserved', align: 'center', render: (variant) => `${variant.onHandStock} / ${variant.reservedStock}` },
    { key: 'status', header: 'Status', render: (variant) => variant.isEnabled === false ? 'Archived' : 'Active' },
    { key: 'actions', header: 'Actions', align: 'left', render: (variant) => <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => startEdit(variant)}>Edit</Button><Button size="sm" variant="ghost" disabled={variant.isEnabled === false} onClick={() => void archive(variant)}>Archive</Button></div> },
  ];

  return <div className="mx-auto max-w-7xl space-y-5">
    <AdminPageHeader title="Variants and SKUs" description="Product variants and status are stored in the production catalog database." actions={<Button variant="brass" onClick={startCreate}>New SKU</Button>} />
    <Table data={state.variants} columns={columns} keyExtractor={(variant) => variant.id} mobileScrollHint emptyMessage="No product variants." />
    {openForm && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenForm(false); }}>
      <form onSubmit={(event) => void save(event)} className="max-h-[90vh] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-white/10 bg-[#181716] p-6 text-stone-100">
        <h2 className="text-lg font-semibold">{editing ? 'Edit SKU' : 'New SKU'}</h2>
        <label className="block text-sm">Product<select required value={form.productId} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, productId: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#10100f] px-3 py-2">{state.products.filter((product) => product.status !== 'archived').map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        <label className="block text-sm">SKU<input required pattern="[A-Za-z0-9_-]+" maxLength={100} value={form.sku} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, sku: event.target.value.toUpperCase() })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono"/></label>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Color name<input required maxLength={100} value={form.colorName} onChange={(event) => setForm({ ...form, colorName: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label><label className="text-sm">Color hex<input required pattern="#[0-9a-fA-F]{6}" value={form.colorHex} onChange={(event) => setForm({ ...form, colorHex: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono"/></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Size<select value={form.size} onChange={(event) => setForm({ ...form, size: event.target.value as VariantForm['size'] })} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#10100f] px-3 py-2">{['S', 'M', 'L', 'XL', 'XXL'].map((size) => <option key={size}>{size}</option>)}</select></label><label className="text-sm">Fit<select value={form.fit} onChange={(event) => setForm({ ...form, fit: event.target.value as VariantForm['fit'] })} className="mt-1 block w-full rounded-lg border border-white/15 bg-[#10100f] px-3 py-2">{['oversize', 'classic', 'slim', 'oversized', 'regular', 'crop'].map((fit) => <option key={fit}>{fit}</option>)}</select></label></div>
        <div className="grid grid-cols-2 gap-3"><label className="text-sm">Price override (Toman)<input type="number" min="0" max="2000000000" step="1" value={form.priceTomans} onChange={(event) => setForm({ ...form, priceTomans: event.target.value })} placeholder="Use product base price" className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label><label className="text-sm">Low-stock threshold<input required type="number" min="0" max="100000" step="1" value={form.minStockThreshold} onChange={(event) => setForm({ ...form, minStockThreshold: Number(event.target.value) })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label></div>
        <p className="text-xs leading-6 text-stone-400">New SKUs start with zero stock. Record counted stock from Inventory so each quantity change has a movement record.</p>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" type="button" onClick={() => setOpenForm(false)}>Cancel</Button><Button variant="brass" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save SKU'}</Button></div>
      </form>
    </div>}
  </div>;
};
