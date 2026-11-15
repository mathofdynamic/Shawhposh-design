import React from 'react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, type ColumnDef } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import type { AdminCategory } from '../../domain/types';

const garmentSlugs = new Set(['tshirt', 'hoodie', 'dors', 'sweatshirt', 'halfzip', 'pants']);

export const CategoriesPage: React.FC = () => {
  const { state } = useCatalogAdmin();
  const garmentCategories = state.categories.filter(category => category.status === 'active' && garmentSlugs.has(category.slug));
  const columns: ColumnDef<AdminCategory>[] = [
    { key: 'name', header: 'نوع پوشاک', render: category => <strong>{category.nameFa}</strong> },
    { key: 'english', header: 'نام انگلیسی', render: category => <span className="text-stone-300">{category.nameEn || '—'}</span> },
    { key: 'description', header: 'توضیحات', render: category => <span className="text-stone-300">{category.description || '—'}</span> },
  ];

  return <div className="mx-auto max-w-7xl space-y-5">
    <AdminPageHeader title="دسته‌بندی پوشاک" description="محصولات را با نوع لباس دسته‌بندی کنید؛ مانند تیشرت، هودی و دورس." />
    <Table data={garmentCategories} columns={columns} keyExtractor={category => category.id} mobileScrollHint emptyMessage="دسته‌بندی پوشاکی ثبت نشده است." />
  </div>;
};
