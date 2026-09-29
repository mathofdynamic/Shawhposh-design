import React, { useState, useMemo } from 'react';
import { FolderTree, Plus, Edit2, Trash2, Sparkles, AlertCircle, Shirt } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, SearchInput, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { AdminCategory } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

export const CategoriesPage: React.FC = () => {
  const {
    state,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useAdminRepository();
  const { addToast } = useToast();

  const categories = getCategories();
  const [search, setSearch] = useState('');
  const [editingCategory, setEditingCategory] = useState<Partial<AdminCategory> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const matchSearch =
        c.nameFa.toLowerCase().includes(search.toLowerCase()) ||
        c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [categories, search]);

  const handleOpenNew = () => {
    setEditingCategory({
      nameFa: '',
      nameEn: '',
      slug: '',
      description: '',
      image: 'https://picsum.photos/seed/cat_new/600/400',
      displayOrder: categories.length + 1,
      isFeatured: false,
    });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat: AdminCategory) => {
    setEditingCategory({ ...cat });
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingCategory?.nameFa?.trim()) {
      setModalError('نام فارسی دسته‌بندی الزامی است.');
      return;
    }

    if (editingCategory.id) {
      const res = updateCategory(editingCategory.id, editingCategory);
      if (!res.success) {
        setModalError(res.error || 'خطا در ویرایش دسته‌بندی.');
        return;
      }
    } else {
      const res = createCategory(editingCategory as any);
      if (!res.success) {
        setModalError(res.error || 'خطا در ایجاد دسته‌بندی.');
        return;
      }
    }

    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = (id: string, name: string) => {
    const confirm = window.confirm(`آیا از حذف دسته‌بندی «${name}» اطمینان دارید؟ در صورت اتصال محصول، حذف ممنوع خواهد بود.`);
    if (!confirm) return;

    const res = deleteCategory(id);
    if (!res.success) {
      addToast({
        title: 'عدم امکان حذف دسته‌بندی',
        description: res.error || 'خطا در حذف دسته‌بندی.',
        type: 'error',
      });
    } else {
      addToast({
        title: 'دسته‌بندی حذف شد',
        description: `دسته‌بندی «${name}» با موفقیت حذف گردید.`,
        type: 'success',
      });
    }
  };

  const columns: ColumnDef<AdminCategory>[] = [
    {
      key: 'image',
      header: 'تصویر شاخص',
      render: (row) => (
        <div className="w-12 h-12 rounded-xl overflow-hidden bg-black border border-white/10">
          <img src={row.image} alt={row.nameFa} className="w-full h-full object-cover" />
        </div>
      ),
    },
    {
      key: 'nameFa',
      header: 'نام دسته‌بندی',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs">{row.nameFa}</div>
          <div className="text-[10px] text-stone-400 font-mono">{row.nameEn}</div>
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'اسلاگ یکتا',
      render: (row) => <span className="font-mono text-xs text-[#eed29d]">{row.slug}</span>,
    },
    {
      key: 'productsCount',
      header: 'تعداد محصولات متصل',
      render: (row) => {
        const count = state.products.filter((p) => p.category === row.id).length;
        return (
          <span className="font-fanum text-xs text-stone-300 font-bold">
            {toFaDigits(count)} فرم لباس
          </span>
        );
      },
    },
    {
      key: 'isFeatured',
      header: 'ویژه صفحه نخست',
      render: (row) => (
        <Badge
          label={row.isFeatured ? 'ویژه' : 'عادی'}
          variant={row.isFeatured ? 'success' : 'default'}
          size="sm"
        />
      ),
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
            title="ویرایش دسته‌بندی"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => handleDelete(row.id, row.nameFa)}
            className="p-1.5 text-stone-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors"
            title="حذف دسته‌بندی"
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
        title="دسته‌بندی‌ها و معماری کاتالوگ"
        description="ساماندهی شاخه‌های محصولات، مدیریت تگ‌های کالیگرافی، مینیمال و هویت بصری فروشگاه."
        actions={
          <Button variant="brass" size="sm" onClick={handleOpenNew}>
            <Plus size={13} className="ml-1" />
            افزودن دسته‌بندی جدید
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-4">
        <div className="w-72">
          <SearchInput
            placeholder="جستجوی دسته‌بندی..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Table
        data={filteredCategories}
        columns={columns}
        keyExtractor={(c) => c.id}
      />

      {/* Modal */}
      {isModalOpen && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181716] border border-white/20 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <FolderTree size={16} className="text-[#eed29d]" />
              {editingCategory.id ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی جدید'}
            </h3>

            {modalError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-300 mb-1">
                  نام فارسی دسته‌بندی <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editingCategory.nameFa || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, nameFa: e.target.value })}
                  placeholder="مثال: کالیگرافی و خط نستعلیق"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#eed29d] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-300 mb-1">نام انگلیسی (جهت سئو و URL)</label>
                <input
                  type="text"
                  value={editingCategory.nameEn || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, nameEn: e.target.value })}
                  placeholder="e.g. Calligraphy"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#eed29d] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-300 mb-1">اسلاگ یکتا</label>
                <input
                  type="text"
                  value={editingCategory.slug || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                  placeholder="calligraphy"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#eed29d] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-300 mb-1">آدرس تصویر شاخص</label>
                <input
                  type="url"
                  value={editingCategory.image || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, image: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#eed29d] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-300 mb-1">توضیحات دسته‌بندی</label>
                <textarea
                  rows={3}
                  value={editingCategory.description || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                  placeholder="معرفی سبک طراحی و ویژگی‌های فرم‌های این شاخه..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-[#eed29d] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-stone-300 mb-1">ترتیب نمایش</label>
                  <input
                    type="number"
                    min={1}
                    value={editingCategory.displayOrder || 1}
                    onChange={(e) => setEditingCategory({ ...editingCategory, displayOrder: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-fanum focus:border-[#eed29d] focus:outline-none"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingCategory.isFeatured || false}
                      onChange={(e) => setEditingCategory({ ...editingCategory, isFeatured: e.target.checked })}
                      className="rounded border-white/20 text-[#eed29d] focus:ring-0"
                    />
                    <span className="font-bold text-stone-300">نمایش در صفحه اصلی</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleSave}>
                ذخیره دسته‌بندی
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
