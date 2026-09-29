import React, { useState, useMemo } from 'react';
import { Sparkles, Plus, Edit2, Trash2, Calendar, Tag, ExternalLink, AlertCircle } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, SearchInput, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { AdminCollection } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

export const CollectionsPage: React.FC = () => {
  const {
    state,
    getCollections,
    createCollection,
    updateCollection,
    deleteCollection,
  } = useAdminRepository();
  const { addToast } = useToast();

  const collections = getCollections();
  const [search, setSearch] = useState('');
  const [editingCollection, setEditingCollection] = useState<Partial<AdminCollection> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      const matchSearch =
        c.titleFa.toLowerCase().includes(search.toLowerCase()) ||
        c.titleEn.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [collections, search]);

  const handleOpenNew = () => {
    setEditingCollection({
      titleFa: '',
      titleEn: '',
      slug: '',
      description: '',
      coverImage: 'https://picsum.photos/seed/col_new/1200/500',
      status: 'active',
      displayOrder: collections.length + 1,
      productIds: [],
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (col: AdminCollection) => {
    setEditingCollection({ ...col });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingCollection?.titleFa?.trim()) {
      setModalError('عنوان فارسی کلکسیون الزامی است.');
      return;
    }

    if (editingCollection.id) {
      const res = updateCollection(editingCollection.id, editingCollection);
      if (!res.success) {
        setModalError(res.error || 'خطا در ویرایش کلکسیون.');
        return;
      }
    } else {
      const res = createCollection(editingCollection as any);
      if (!res.success) {
        setModalError(res.error || 'خطا در ایجاد کلکسیون جدید.');
        return;
      }
    }

    setIsModalOpen(false);
    setEditingCollection(null);
  };

  const handleDelete = (id: string, title: string) => {
    const confirm = window.confirm(`آیا از حذف کلکسیون «${title}» اطمینان دارید؟`);
    if (!confirm) return;

    const res = deleteCollection(id);
    if (!res.success) {
      addToast({
        title: 'عدم امکان حذف کلکسیون',
        description: res.error || 'خطا در حذف کلکسیون.',
        type: 'error',
      });
    } else {
      addToast({
        title: 'کلکسیون حذف شد',
        description: `کلکسیون «${title}» با موفقیت حذف گردید.`,
        type: 'success',
      });
    }
  };

  const columns: ColumnDef<AdminCollection>[] = [
    {
      key: 'coverImage',
      header: 'کاور / پوستر',
      render: (row) => (
        <div className="w-16 h-10 rounded-lg overflow-hidden bg-black border border-white/10 relative">
          <img src={row.coverImage} alt={row.titleFa} className="w-full h-full object-cover" />
        </div>
      ),
    },
    {
      key: 'titleFa',
      header: 'عنوان کلکسیون',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs">{row.titleFa}</div>
          <div className="text-[10px] text-stone-400 font-mono">{row.titleEn}</div>
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'اسلاگ آدرس',
      render: (row) => <span className="font-mono text-xs text-[#eed29d]">{row.slug}</span>,
    },
    {
      key: 'status',
      header: 'وضعیت دراپ',
      render: (row) => (
        <Badge
          label={
            row.status === 'active'
              ? 'در حال عرضه'
              : row.status === 'upcoming'
              ? 'به‌زودی'
              : 'آرشیو شده'
          }
          variant={
            row.status === 'active' ? 'success' : row.status === 'upcoming' ? 'warning' : 'default'
          }
          size="sm"
        />
      ),
    },
    {
      key: 'productsCount',
      header: 'محصولات متصل',
      render: (row) => {
        const count = state.products.filter((p) => p.collectionIds?.includes(row.id)).length;
        return (
          <span className="font-fanum text-xs text-stone-300">
            {toFaDigits(count)} محصول
          </span>
        );
      },
    },
    {
      key: 'displayOrder',
      header: 'ترتیب نمایش',
      render: (row) => <span className="font-fanum text-xs text-stone-400">{toFaDigits(row.displayOrder)}</span>,
    },
    {
      key: 'actions',
      header: 'عملیات',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-stone-400 hover:text-[#eed29d] bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            title="ویرایش کلکسیون"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => handleDelete(row.id, row.titleFa)}
            className="p-1.5 text-stone-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors"
            title="حذف کلکسیون"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="کلکسیون‌ها و دراپ‌های فصلی"
        description="مدیریت مجموعه‌های لیمیتد ادیشن، معرفی خطوط جدید استریت‌ویر و دسته‌بندی موضوعی فرم‌ها."
        actions={
          <Button variant="brass" size="sm" onClick={handleOpenNew}>
            <Plus size={13} className="ml-1" />
            تعریف کلکسیون جدید
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <div className="w-72">
          <SearchInput
            placeholder="جستجوی کلکسیون با نام یا اسلاگ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Table
        data={filteredCollections}
        columns={columns}
        keyExtractor={(c) => c.id}
      />

      {/* Create / Edit Modal */}
      {isModalOpen && editingCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181716] border border-white/20 rounded-2xl p-6 max-w-xl w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Sparkles size={16} className="text-[#eed29d]" />
              {editingCollection.id ? 'ویرایش کلکسیون فصلی' : 'ایجاد کلکسیون جدید'}
            </h3>

            {modalError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    عنوان فارسی <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCollection.titleFa || ''}
                    onChange={(e) => setEditingCollection({ ...editingCollection, titleFa: e.target.value })}
                    placeholder="مثال: کلکسیون شاه‌نشین"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#eed29d] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">عنوان انگلیسی</label>
                  <input
                    type="text"
                    value={editingCollection.titleEn || ''}
                    onChange={(e) => setEditingCollection({ ...editingCollection, titleEn: e.target.value })}
                    placeholder="e.g. Shahneshin Capsule"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#eed29d] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">اسلاگ یکتا</label>
                  <input
                    type="text"
                    value={editingCollection.slug || ''}
                    onChange={(e) => setEditingCollection({ ...editingCollection, slug: e.target.value })}
                    placeholder="shahneshin-drop-2026"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#eed29d] focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">وضعیت دراپ</label>
                  <select
                    value={editingCollection.status || 'active'}
                    onChange={(e) => setEditingCollection({ ...editingCollection, status: e.target.value as any })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#eed29d] focus:outline-none"
                  >
                    <option value="active">در حال عرضه (Active)</option>
                    <option value="upcoming">به‌زودی (Upcoming)</option>
                    <option value="expired">منقضی شده (Expired)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">آدرس تصویر کاور / بنر</label>
                <input
                  type="url"
                  value={editingCollection.coverImage || ''}
                  onChange={(e) => setEditingCollection({ ...editingCollection, coverImage: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:border-[#eed29d] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">توضیحات کلکسیون</label>
                <textarea
                  rows={3}
                  value={editingCollection.description || ''}
                  onChange={(e) => setEditingCollection({ ...editingCollection, description: e.target.value })}
                  placeholder="مفهوم طراحی، ادیشن لیمیتد، فلسفه خطوط..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-[#eed29d] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  محصولات اختصاص یافته به این کلکسیون
                </label>
                <div className="max-h-36 overflow-y-auto space-y-1.5 bg-black/40 p-2.5 rounded-xl border border-white/10">
                  {state.products.map((p) => {
                    const isSelected = editingCollection.productIds?.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded-lg text-xs text-stone-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const current = editingCollection.productIds || [];
                            const updated = e.target.checked
                              ? [...current, p.id]
                              : current.filter((id) => id !== p.id);
                            setEditingCollection({ ...editingCollection, productIds: updated });
                          }}
                          className="rounded border-white/20 text-[#eed29d] focus:ring-0"
                        />
                        <span>{p.name}</span>
                        <span className="text-[10px] text-stone-500 font-mono">({p.id})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleSave}>
                ذخیره کلکسیون
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
