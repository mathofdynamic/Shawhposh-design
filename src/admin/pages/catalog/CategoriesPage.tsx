import React, { useState } from 'react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Table, type ColumnDef, useToast } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import type { AdminCategory } from '../../domain/types';

type CategoryForm = Pick<AdminCategory, 'nameFa' | 'nameEn' | 'slug' | 'description' | 'displayOrder' | 'status'>;
const blankCategory: CategoryForm = { nameFa: '', nameEn: '', slug: '', description: '', displayOrder: 0, status: 'active' };

export const CategoriesPage: React.FC = () => {
  const { state, createCategory, updateCategory, deleteCategory } = useCatalogAdmin();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<CategoryForm>(blankCategory);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const open = (category?: AdminCategory) => {
    setOpenForm(true);
    setEditing(category ?? null);
    setForm(category ? { nameFa: category.nameFa, nameEn: category.nameEn, slug: category.slug, description: category.description ?? '', displayOrder: category.displayOrder, status: category.status } : blankCategory);
    setError('');
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const result = editing ? await updateCategory(editing.id, form) : await createCategory(form);
    setSaving(false);
    if (!result.success) { setError(result.error || 'Could not save category.'); return; }
    setOpenForm(false);
    setEditing(null);
    showToast({ type: 'success', title: 'Category saved' });
  };

  const archive = async (category: AdminCategory) => {
    if (!window.confirm(`Archive “${category.nameFa}”?`)) return;
    const result = await deleteCategory(category.id);
    showToast({ type: result.success ? 'success' : 'error', title: result.success ? 'Category archived' : 'Could not archive category', message: result.error });
  };

  const columns: ColumnDef<AdminCategory>[] = [
    { key: 'name', header: 'Category', render: (category) => <div><strong>{category.nameFa}</strong><p className="mt-1 font-mono text-xs text-stone-400">{category.slug}</p></div> },
    { key: 'description', header: 'Description', render: (category) => <span className="text-stone-300">{category.description || '—'}</span> },
    { key: 'order', header: 'Order', align: 'center', render: (category) => category.displayOrder },
    { key: 'status', header: 'Status', render: (category) => category.status },
    { key: 'actions', header: 'Actions', align: 'left', render: (category) => <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => open(category)}>Edit</Button><Button size="sm" variant="ghost" onClick={() => void archive(category)} disabled={category.status === 'archived'}>Archive</Button></div> },
  ];

  return <div className="mx-auto max-w-7xl space-y-5">
    <AdminPageHeader title="Categories" description="Catalog categories stored in the production database." actions={<Button variant="brass" onClick={() => open()}>New category</Button>} />
    <Table data={state.categories} columns={columns} keyExtractor={(category) => category.id} mobileScrollHint emptyMessage="No catalog categories." />
    {openForm ? <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) { setOpenForm(false); setEditing(null); } }}>
      <form onSubmit={(event) => void save(event)} className="w-full max-w-lg space-y-4 rounded-2xl border border-white/10 bg-[#181716] p-6 text-stone-100">
        <h2 className="text-lg font-semibold">{editing ? 'Edit category' : 'New category'}</h2>
        <label className="block text-sm">Name<input required maxLength={120} value={form.nameFa} onChange={(event) => setForm({ ...form, nameFa: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label>
        <label className="block text-sm">English name<input maxLength={120} value={form.nameEn} onChange={(event) => setForm({ ...form, nameEn: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label>
        <label className="block text-sm">Slug<input required pattern="[a-z0-9-]+" maxLength={120} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono"/></label>
        <label className="block text-sm">Description<textarea maxLength={5000} value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm">Display order<input type="number" min="0" step="1" value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label><label className="block text-sm">Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CategoryForm['status'] })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"><option value="active">Active</option><option value="archived">Archived</option></select></label></div>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" type="button" onClick={() => { setOpenForm(false); setEditing(null); }}>Cancel</Button><Button variant="brass" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button></div>
      </form>
    </div> : null}
  </div>;
};
