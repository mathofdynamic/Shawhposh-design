import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import type { Product } from '../../types';
import { storefrontProductImages } from '../../lib/productImage';

type CatalogResponse = {
  products: Product[];
  categories: { slug: string; nameFa: string }[];
};

export function useCatalog(enabled = true) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ slug: string; nameFa: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError('');
      return;
    }

    let active = true;
    let pending = false;
    const load = async () => {
      if (pending || document.hidden) return;
      pending = true;
      try {
        const data = await api<CatalogResponse>('/v1/products');
        if (active) {
          setProducts(data.products.map(product => ({
            ...product,
            images: storefrontProductImages(product.images),
          })));
          setCategories(data.categories);
          setError('');
        }
      } catch {
        if (active) setError('بارگذاری محصولات انجام نشد. دوباره تلاش کنید.');
      } finally {
        pending = false;
        if (active) setLoading(false);
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 2000);
    const refresh = () => void load();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled, reloadKey]);

  const retry = () => {
    setLoading(true);
    setReloadKey(key => key + 1);
  };

  return { products, categories, loading, error, retry };
}
