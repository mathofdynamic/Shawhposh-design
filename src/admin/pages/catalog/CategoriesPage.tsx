import React, { useState } from 'react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Table, type ColumnDef, useAppDialog, useToast } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import type { AdminCategory } from '../../domain/types';

type CategoryForm = Pick<AdminCategory, 'nameFa' | 'nameEn' | 'slug' | 'description' | 'displayOrder' | 'status'>;
const blankCategory: CategoryForm = { nameFa: '', nameEn: '', slug: '', description: '', displayOrder: 0, status: 'active' };

export const CategoriesPage: React.FC = () => {
  const { state, createCategory, updateCategory, deleteCategory } = useCatalogAdmin();
  const { showToast } = useToast();
  const { confirm: confirmDialog } = useAppDialog();
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
    if (!result.success) { setError(result.error || 'ذخیره دسته‌بندی انجام نشد.'); return; }
    setOpenForm(false);
    setEditing(null);
    showToast({ type: 'success', title: 'دسته‌بندی ذخیره شد' });
  };

  const archive = async (category: AdminCategory) => {
    const confirmed = await confirmDialog({
      title: 'بایگانی دسته‌بندی',
      description: `دسته‌بندی «${category.nameFa}» به بایگانی منتقل شود؟`,
      confirmLabel: 'انتقال به بایگانی',
    });
    if (!confirmed) return;
    const result = await deleteCategory(category.id);
    showToast({ type: result.success ? 'success' : 'error', title: result.success ? 'دسته‌بندی بایگانی شد' : 'بایگانی دسته‌بندی انجام نشد', message: result.error });
  };

  const columns: ColumnDef<AdminCategory>[] = [
    { key: 'name', header: 'دسته‌بندی', render: (category) => <strong>{category.nameFa}</strong> },
    { key: 'description', header: 'توضیحات', render: (category) => <span className="text-stone-300">{category.description || '—'}</span> },
    { key: 'order', header: 'ترتیب', align: 'center', render: (category) => category.displayOrder },
    { key: 'status', header: 'وضعیت', render: (category) => category.status === 'active' ? 'فعال' : category.status === 'archived' ? 'بایگانی‌شده' : 'نامشخص' },
    { key: 'actions', header: 'عملیات', align: 'left', render: (category) => <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => open(category)}>ویرایش</Button><Button size="sm" variant="ghost" onClick={() => void archive(category)} disabled={category.status === 'archived'}>بایگانی</Button></div> },
  ];

  return <div className="mx-auto max-w-7xl space-y-5">
    <AdminPageHeader title="دسته‌بندی‌ها" description="دسته‌بندی‌های کاتالوگ فروشگاه." actions={<Button variant="brass" onClick={() => open()}>دسته‌بندی جدید</Button>} />
    <Table data={state.categories} columns={columns} keyExtractor={(category) => category.id} mobileScrollHint emptyMessage="هنوز دسته‌بندی‌ای ثبت نشده است." />
    {openForm ? <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) { setOpenForm(false); setEditing(null); } }}>
      <form onSubmit={(event) => void save(event)} className="w-full max-w-lg space-y-4 rounded-2xl border border-white/10 bg-[#181716] p-6 text-stone-100">
        <h2 className="text-lg font-semibold">{editing ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}</h2>
        <label className="block text-sm">نام دسته‌بندی<input required maxLength={120} value={form.nameFa} onChange={(event) => setForm({ ...form, nameFa: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label>
        <label className="block text-sm">شناسه دسته‌بندی (لاتین)<input required pattern="[a-z0-9-]+" maxLength={120} value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 font-mono"/></label>
        <label className="block text-sm">توضیحات<textarea maxLength={5000} value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label>
        <div className="grid grid-cols-2 gap-3"><label className="block text-sm">ترتیب نمایش<input type="number" min="0" step="1" value={form.displayOrder} onChange={(event) => setForm({ ...form, displayOrder: Number(event.target.value) })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label><label className="block text-sm">وضعیت<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as CategoryForm['status'] })} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"><option value="active">فعال</option><option value="archived">بایگانی‌شده</option></select></label></div>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <div className="flex justify-end gap-2"><Button variant="ghost" type="button" onClick={() => { setOpenForm(false); setEditing(null); }}>انصراف</Button><Button variant="brass" type="submit" disabled={saving}>{saving ? 'در حال ذخیره…' : 'ذخیره'}</Button></div>
      </form>
    </div> : null}
  </div>;
};
