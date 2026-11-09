import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, patch, post } from '../../api/client';
import type { AdminCategory, AdminProduct, ProductVariant, StockMovement } from '../domain/types';

type CatalogSnapshot = { products: AdminProduct[]; variants: ProductVariant[]; categories: AdminCategory[]; stockMovements: StockMovement[] };
type MutationResult = { success: boolean; error?: string; id?: string; updatedCount: number };
type CatalogContextValue = { snapshot: CatalogSnapshot; reload: () => Promise<CatalogSnapshot> };

const emptySnapshot: CatalogSnapshot = { products: [], variants: [], categories: [], stockMovements: [] };
const Context = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    try {
      const result = await api<CatalogSnapshot>('/v1/admin/catalog/snapshot');
      setSnapshot(result);
      setError('');
      return result;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'به‌روزرسانی فهرست انجام نشد.');
      throw failure;
    }
  }, []);

  useEffect(() => { void reload().catch(() => {}); }, [reload]);

  const retry = useCallback(async () => {
    setBusy(true);
    try { await reload(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'دریافت کاتالوگ انجام نشد.'); }
    finally { setBusy(false); }
  }, [reload]);

  if (error && !snapshot) return <div role="alert" className="p-8 text-stone-200"><p>دریافت اطلاعات کاتالوگ انجام نشد.</p><button disabled={busy} onClick={() => void retry()} className="mt-4 min-h-11 rounded-xl border border-white/20 px-4 disabled:opacity-50">تلاش دوباره</button></div>;
  if (!snapshot) return <div role="status" className="p-8 text-stone-300">در حال دریافت اطلاعات کاتالوگ…</div>;

  return <Context.Provider value={{ snapshot, reload }}>
    {error && <div role="status" className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/20 bg-[#211b12] px-4 py-3 text-sm text-amber-100">
      <span>اتصال به فهرست برقرار نشد؛ اطلاعات قبلی همچنان در دسترس است.</span>
      <button type="button" disabled={busy} onClick={() => void retry()} className="min-h-11 rounded-lg px-3 font-semibold underline underline-offset-4 disabled:opacity-50">تلاش دوباره</button>
    </div>}
    {children}
  </Context.Provider>;
}

function useContextValue() {
  const context = useContext(Context);
  if (!context) throw new Error('بخش کاتالوگ در دسترس نیست.');
  return context;
}

export function useCatalogAdmin() {
  const { snapshot, reload } = useContextValue();

  const mutate = async (path: string, data: unknown, method: 'POST' | 'PATCH' = 'POST'): Promise<MutationResult> => {
    let result: { item?: { id: string } };
    try {
      result = await (method === 'PATCH' ? patch : post)<{ item?: { id: string } }>(path, data);
    } catch (failure) {
      return { success: false, error: failure instanceof Error ? failure.message : 'ذخیره انجام نشد.', updatedCount: 0 };
    }
    try { await reload(); } catch { /* The write is committed; the provider displays the refresh failure. */ }
    return { success: true, id: result.item?.id, updatedCount: 1 };
  };

  const state = useMemo(() => ({ ...emptySnapshot, ...snapshot }), [snapshot]);
  const variantId = (sku: string) => {
    const variant = snapshot.variants.find(item => item.sku === sku);
    if (!variant) throw new Error('شناسه کالا پیدا نشد.');
    return variant.id;
  };

  return {
    state,
    reload,
    getProducts: (filters?: { search?: string; status?: string; category?: string }) => snapshot.products.filter(product =>
      (!filters?.search || product.name.toLocaleLowerCase().includes(filters.search.toLocaleLowerCase())) &&
      (!filters?.status || filters.status === 'all' || product.status === filters.status) &&
      (!filters?.category || filters.category === 'all' || product.category === filters.category)),
    getProductById: (id: string) => snapshot.products.find(product => product.id === id),
    getVariants: () => snapshot.variants,
    getCategories: () => snapshot.categories,
    createProduct: (product: Partial<AdminProduct>) => mutate('/v1/admin/products', product),
    updateProduct: (id: string, product: Partial<AdminProduct>) => mutate(`/v1/admin/products/${encodeURIComponent(id)}`, product, 'PATCH'),
    deleteProduct: (id: string) => mutate(`/v1/admin/products/${encodeURIComponent(id)}`, { status: 'archived' }, 'PATCH'),
    uploadProductImage: async (productId: string, file: File, altText: string) => {
      const body = new FormData();
      body.append('image', file);
      body.append('altText', altText);
      try {
        const result = await api<{ image: { url: string } }>(`/v1/admin/products/${encodeURIComponent(productId)}/images`, { method: 'POST', body });
        return { success: true as const, image: result.image };
      } catch (failure) {
        return { success: false as const, error: failure instanceof Error ? failure.message : 'بارگذاری تصویر انجام نشد.' };
      }
    },
    bulkUpdateProductStatus: async (ids: string[], status: string) => {
      let updatedCount = 0;
      for (const id of ids) {
        const result = await mutate(`/v1/admin/products/${encodeURIComponent(id)}`, { status }, 'PATCH');
        if (!result.success) return { ...result, updatedCount };
        updatedCount++;
      }
      return { success: true, updatedCount };
    },
    createVariant: (variant: Partial<ProductVariant>) => mutate('/v1/admin/variants', variant),
    updateVariant: (sku: string, variant: Partial<ProductVariant>) => mutate(`/v1/admin/variants/${encodeURIComponent(variantId(sku))}`, variant, 'PATCH'),
    deleteVariant: (sku: string) => mutate(`/v1/admin/variants/${encodeURIComponent(variantId(sku))}`, { isEnabled: false }, 'PATCH'),
    createCategory: (category: Partial<AdminCategory>) => mutate('/v1/admin/categories', category),
    updateCategory: (id: string, category: Partial<AdminCategory>) => mutate(`/v1/admin/categories/${encodeURIComponent(id)}`, category, 'PATCH'),
    deleteCategory: (id: string) => mutate(`/v1/admin/categories/${encodeURIComponent(id)}`, { status: 'archived' }, 'PATCH'),
    updateVariantStock: async (sku: string, newQuantity: number, _actor: string, reason: string) => (await mutate(`/v1/admin/inventory/${encodeURIComponent(sku)}/adjustments`, { newQuantity, reason })).success,
    recordStockAdjustment: (sku: string, delta: number, _actor: string, reason: string) => mutate(`/v1/admin/inventory/${encodeURIComponent(sku)}/adjustments`, { delta, reason }),
    getStockMovements: (sku?: string) => snapshot.stockMovements.filter(movement => !sku || movement.sku === sku),
    importProductsCsv: async (rows: unknown[]) => {
      let result: { success: boolean; importedCount: number; errors: string[] };
      try {
        result = await post<{ success: boolean; importedCount: number; errors: string[] }>('/v1/admin/catalog/import', { rows });
      } catch (failure) {
        return { success: false, importedCount: 0, errors: [failure instanceof Error ? failure.message : 'وارد کردن فایل انجام نشد.'] };
      }
      try { await reload(); } catch { /* The import is committed; the provider displays the refresh failure. */ }
      return result;
    },
  };
}
