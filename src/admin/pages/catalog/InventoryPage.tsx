import React, { useMemo, useState } from 'react';
import { Box, Search } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, SearchInput, Table, type ColumnDef } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import type { ProductVariant } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';
import { StockDetailsDrawer } from './StockDetailsDrawer';
import { persianSize } from '../../../lib/persian-labels';

export const InventoryPage: React.FC = () => {
  const { state } = useCatalogAdmin();
  const [search, setSearch] = useState('');
  const [selectedSku, setSelectedSku] = useState<string | null>(null);

  const variants = useMemo(() => state.variants.filter((variant) => {
    const product = state.products.find((item) => item.id === variant.productId);
    const query = search.trim().toLocaleLowerCase();
    return !query || variant.sku.toLocaleLowerCase().includes(query) ||
      variant.colorName.toLocaleLowerCase().includes(query) ||
      product?.name.toLocaleLowerCase().includes(query);
  }), [search, state.products, state.variants]);

  const columns: ColumnDef<ProductVariant>[] = [
    { key: 'product', header: 'کالا و شناسه', render: (variant) => {
      const product = state.products.find((item) => item.id === variant.productId);
      return <div><div className="font-semibold text-white">{product?.name ?? '—'}</div><div className="mt-1 font-mono text-xs text-stone-400">{variant.sku} · {variant.colorName} · {persianSize(variant.size)}</div></div>;
    } },
    { key: 'onHand', header: 'موجودی فیزیکی', align: 'center', render: (variant) => toFaDigits(variant.onHandStock) },
    { key: 'reserved', header: 'رزروشده', align: 'center', render: (variant) => toFaDigits(variant.reservedStock) },
    { key: 'available', header: 'قابل فروش', align: 'center', render: (variant) => {
      const available = variant.onHandStock - variant.reservedStock;
      return <span className={available <= 0 ? 'text-rose-300' : available <= variant.minStockThreshold ? 'text-amber-300' : 'text-emerald-300'}>{toFaDigits(available)}</span>;
    } },
    { key: 'actions', header: 'عملیات', align: 'left', render: (variant) => <Button size="sm" variant="secondary" onClick={() => setSelectedSku(variant.sku)}>جزئیات و اصلاح</Button> },
  ];

  return <div className="mx-auto max-w-7xl space-y-5">
    <AdminPageHeader title="موجودی انبار" description="موجودی کالاها و سوابق تغییر آن‌ها." />
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#141211] p-4">
      <Search size={16} className="text-stone-400" />
      <SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی شناسه، کالا یا رنگ" />
      <span className="whitespace-nowrap text-xs text-stone-400">{toFaDigits(variants.length)} شناسه</span>
    </div>
    {variants.length ? <Table data={variants} columns={columns} keyExtractor={(variant) => variant.id} mobileScrollHint emptyMessage="رکورد موجودی‌ای ثبت نشده است." /> : <div className="rounded-2xl border border-white/10 bg-[#141211] p-10 text-center text-sm text-stone-400"><Box className="mx-auto mb-3"/><p>{search ? 'شناسه‌ای با این مشخصات پیدا نشد.' : 'هنوز موجودی کالایی ثبت نشده است.'}</p></div>}
    <StockDetailsDrawer sku={selectedSku} onClose={() => setSelectedSku(null)} />
  </div>;
};
