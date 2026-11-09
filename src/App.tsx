import { useState, useEffect, useRef } from 'react';
import { Search, Sliders, Filter, Eye, ArrowLeft, CheckCircle, Shirt, Settings, LoaderCircle } from 'lucide-react';
import Navbar from './components/Navbar';
import { DiscountedShowcase } from './components/DiscountedShowcase';
import { GarmentCategoryNavigation } from './components/GarmentCategoryNavigation';
import ProductCard from './components/ProductCard';
import ProductDetail from './components/ProductDetail';
import PodDesigner from './components/PodDesigner';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import { useCatalog } from './features/catalog/useCatalog';
import { api, post, ApiClientError } from './api/client';
import { StaffAuth } from './admin/features/StaffAuth';
import { CatalogProvider } from './admin/features/CatalogProvider';
import { Product, CartItem, User as UserType } from './types';
import Login from './components/Login';
import Signup from './components/Signup';
import CustomerAccount from './components/CustomerAccount';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { AdminRouterProvider } from './admin/router';
import { AdminLayout } from './admin/AdminLayout';
import { ToastProvider } from './admin/components/ui';
import { addVariantToCart, cartItemsForStorefront, loadCart, migrateLegacyCart, removeCartLine, updateCartQuantity, type ServerCart } from './features/cart/api';
import { resolveLegacyCartVariant } from './features/cart/legacy';
import { createCheckoutOrder, loadCheckoutConfiguration, type CheckoutConfiguration, type CheckoutOrderInput } from './features/orders/api';

function readLegacyCart(): CartItem[] {
  try {
    const raw = localStorage.getItem('shahpoosh_cart');
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];
    const validItems = value.filter((item): item is CartItem => Boolean(item && typeof item === 'object'
      && typeof item.productId === 'string' && typeof item.productName === 'string'
      && typeof item.id === 'string' && typeof item.price === 'number' && Number.isFinite(item.price)
      && Number.isInteger(item.quantity) && item.quantity > 0
      && item.color && typeof item.color.name === 'string' && typeof item.color.hex === 'string'
      && typeof item.size === 'string' && typeof item.image === 'string'));
    return validItems.map(item => ({
      id: item.id, productId: item.productId, variantId: item.variantId, sku: item.sku,
      productName: item.productName, price: item.price, quantity: item.quantity,
      color: item.color, size: item.size, image: item.image,
      availabilityCode: item.availabilityCode ?? null, isCustom: item.isCustom,
    }));
  } catch {
    return [];
  }
}

export default function App() {
  const prefersReducedMotion = useReducedMotion();
  useEffect(() => {
    try {
      const legacyKeys = Object.keys(localStorage).filter(key =>
        /^SHAHPOOSH_ADMIN_DB_V\d+$/i.test(key) ||
        key === 'SHAWHPOSH_ADMIN_REPO_V1' ||
        key === 'SHAWHPOSH_ADMIN_SYSTEM_SETTINGS_V1',
      );
      legacyKeys.forEach(key => localStorage.removeItem(key));
    } catch { /* storage may be unavailable */ }
  }, []);
  // Navigation Screen State
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined' && (window.location.hash.startsWith('#admin') || window.location.pathname.startsWith('/admin'))) {
      return 'admin';
    }
    return 'home';
  });

  // Reusable admin environment boolean flag
  const isAdminView =
    activeTab === 'admin' ||
    (typeof window !== 'undefined' &&
      (window.location.pathname.startsWith('/admin') ||
        window.location.hash.startsWith('#admin')));

  const { products: PRODUCTS, categories:catalogCategories, loading: catalogLoading, error: catalogError, retry: retryCatalog } = useCatalog(!isAdminView);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  useEffect(() => {
    setSelectedProduct(current => current ? PRODUCTS.find(p => p.id === current.id) || null : null);
  }, [PRODUCTS]);

  // History & Hash listener for direct /admin/* and /#admin deep linking
  useEffect(() => {
    const handleUrlChange = () => {
      const isNowAdmin = window.location.hash.startsWith('#admin') || window.location.pathname.startsWith('/admin');
      if (isNowAdmin && activeTab !== 'admin') {
        setActiveTab('admin');
      } else if (!isNowAdmin && activeTab === 'admin') {
        setActiveTab('home');
      }
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [activeTab]);

  // Theme State with localStorage integration
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('shahpoosh_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  // Customer identity comes only from the server-backed session.
  const [user, setUser] = useState<UserType | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError,setAuthError]=useState('');
  useEffect(() => {
    let active = true;
    api<{ user: UserType | null }>('/v1/auth/me')
      .then(result => { if (active) setUser(result.user); })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setAuthReady(true); });
    return () => { active = false; };
  }, []);
  const [authPage, setAuthPage] = useState<'login' | 'signup' | null>(null);

  const handleLogin = (loggedUser: UserType) => {
    setUser(loggedUser);
    setAuthPage(null);
  };

  const handleLogout = async () => {
    try {
      await post('/v1/auth/logout', {});
      setUser(null);
      setServerCart(null);
      setLocalCart([]);
      setAuthError('');
      cartHydratedUserRef.current = null;
    }
    catch(e){setAuthError((e as Error).message);}
  };

  // Sync theme to document element - ensuring html.light is never active while admin environment is displayed
  useEffect(() => {
    if (theme === 'light' && !isAdminView) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('shahpoosh_theme', theme);
  }, [theme, isAdminView]);
  
  const isDark = theme === 'dark';

  const [localCart, setLocalCart] = useState<CartItem[]>(readLegacyCart);
  const [serverCart, setServerCart] = useState<ServerCart | null>(null);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState('');
  const [cartNotice, setCartNotice] = useState('');
  const [cartRefreshToken, setCartRefreshToken] = useState(0);
  const [checkoutConfiguration, setCheckoutConfiguration] = useState<CheckoutConfiguration | null>(null);
  const checkoutAfterLoginRef = useRef(false);
  const cartHydratedUserRef = useRef<string | null>(null);
  const cartLoadingUserRef = useRef<string | null>(null);
  const productsRef = useRef(PRODUCTS);
  productsRef.current = PRODUCTS;
  const cart: CartItem[] = user ? (serverCart ? cartItemsForStorefront(serverCart) : []) : localCart;
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!cartNotice) return;
    const timer = window.setTimeout(() => setCartNotice(''), 5000);
    return () => window.clearTimeout(timer);
  }, [cartNotice]);

  useEffect(() => {
    let active = true;
    loadCheckoutConfiguration().then(result => { if (active) setCheckoutConfiguration(result); }).catch(() => {
      if (active) setCheckoutConfiguration(null);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authReady || !user || cartHydratedUserRef.current === user.id || cartLoadingUserRef.current === user.id) return;
    let legacyRaw: string | null = null;
    try { legacyRaw = localStorage.getItem('shahpoosh_cart'); } catch { /* storage may be unavailable */ }
    if (legacyRaw && catalogLoading) return;
    if (legacyRaw && (catalogError || PRODUCTS.length === 0)) {
      setCartError('فهرست محصولات در دسترس نیست؛ سبد قبلی تا بارگذاری دوباره حفظ شده است.');
      return;
    }

    cartLoadingUserRef.current = user.id;
    let active = true;
    setCartLoading(true);
    setCartError('');
    void (async () => {
      try {
        const loaded = await loadCart();
        if (!active) return;
        setServerCart(loaded.cart);
        if (legacyRaw) {
          let oldItems: unknown[];
          try {
            const parsed: unknown = JSON.parse(legacyRaw);
            if (!Array.isArray(parsed)) throw new Error('ساختار سبد خرید قدیمی معتبر نیست.');
            oldItems = parsed;
          } catch {
            setCartError('سبد خرید ذخیره‌شده در این مرورگر قابل خواندن نیست؛ داده موجود حفظ شده است.');
            cartHydratedUserRef.current = user.id;
            return;
          }
          const valid: Array<{ variantId: string; quantity: number }> = [];
          let unmappableCount = 0;
          for (const rawItem of oldItems) {
            if (!rawItem || typeof rawItem !== 'object') { unmappableCount += 1; continue; }
            const legacyItem = rawItem as Partial<CartItem>;
            if (legacyItem.isCustom || !Number.isInteger(legacyItem.quantity) || !legacyItem.quantity || legacyItem.quantity < 1 || legacyItem.quantity > 20) {
              unmappableCount += 1;
              continue;
            }
            const variant = resolveLegacyCartVariant(productsRef.current, legacyItem);
            if (!variant) { unmappableCount += 1; continue; }
            valid.push({ variantId: variant.id, quantity: legacyItem.quantity });
          }
          let migrationKey: string;
          try {
            migrationKey = localStorage.getItem('shahpoosh_cart_migration_key') || crypto.randomUUID();
            localStorage.setItem('shahpoosh_cart_migration_key', migrationKey);
          } catch {
            throw new Error('امکان ذخیره شناسه امن انتقال سبد وجود ندارد؛ سبد قبلی حفظ شد.');
          }
          const migrated = await migrateLegacyCart(valid, migrationKey);
          if (!active) return;
          setServerCart(migrated.cart);
          let legacyRemoved = false;
          try {
            localStorage.removeItem('shahpoosh_cart');
            legacyRemoved = true;
            localStorage.removeItem('shahpoosh_cart_migration_key');
          } catch { /* keep the idempotency key while a local copy remains */ }
          if (legacyRemoved) setLocalCart([]);
          const rejectedCount = migrated.migration.rejected.length + unmappableCount;
          if (rejectedCount) setCartNotice(`${migrated.migration.accepted} کالا منتقل شد؛ ${rejectedCount} مورد نامعتبر، ناموجود یا مربوط به طرح سفارشی منتقل نشد.`);
          else if (migrated.migration.accepted) setCartNotice('سبد خرید قبلی با قیمت و موجودی فعلی سرور منتقل شد.');
        }
        cartHydratedUserRef.current = user.id;
        if (checkoutAfterLoginRef.current) {
          checkoutAfterLoginRef.current = false;
          setActiveTab('checkout');
        }
      } catch (failure) {
        if (active) setCartError(failure instanceof ApiClientError ? failure.message : 'سبد خرید از سرور دریافت نشد. دوباره تلاش کنید.');
      } finally {
        if (cartLoadingUserRef.current === user.id) cartLoadingUserRef.current = null;
        if (active) setCartLoading(false);
      }
    })();
    return () => { active = false; };
  }, [authReady, user?.id, catalogLoading, catalogError, PRODUCTS.length, cartRefreshToken]);

  // Shop state toggling
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGarmentType, setSelectedGarmentType] = useState<string>('all');
  const focusShopHeadingOnMount = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc'>('default');

  const handleAddToCart = (newItem: Omit<CartItem, 'id'>) => {
    setCartError('');
    if (newItem.isCustom) {
      setCartNotice('ذخیره طرح سفارشی در سفارش هنوز فعال نیست؛ این طرح در سبد خرید ثبت نشد.');
      return;
    }
    const product = PRODUCTS.find(item => item.id === newItem.productId);
    const variant = product?.variants?.find(item => item.id === newItem.variantId);
    if (!product || !variant || newItem.quantity < 1 || newItem.quantity > 20 || !variant.inStock) {
      setCartError('این اندازه در حال حاضر برای سفارش در دسترس نیست؛ محصول دیگری انتخاب کنید یا بعداً دوباره تلاش کنید.');
      return;
    }
    if (user) {
      if (cartHydratedUserRef.current !== user.id) {
        setCartError('سبد خرید از سرور در حال آماده‌سازی است؛ دوباره تلاش کنید.');
        return;
      }
      void addVariantToCart(variant.id, newItem.quantity).then(result => setServerCart(result.cart)).catch(failure => {
        setCartError(failure instanceof Error ? failure.message : 'افزودن کالا انجام نشد.');
      });
      return;
    }
    const guestItem = { ...newItem, price: variant.priceTomans ?? product.price, availabilityCode: null };
    setLocalCart(previous => {
      const existing = previous.find(item => item.variantId === variant.id);
      const quantity = (existing?.quantity ?? 0) + newItem.quantity;
      if (quantity > 20) {
        setCartError('برای هر محصول حداکثر ۲۰ عدد می‌توانید به سبد خرید اضافه کنید.');
        return previous;
      }
      if (existing) return previous.map(item => item.variantId === variant.id ? { ...item, quantity } : item);
      return [...previous, { ...guestItem, id: variant.id, variantId: variant.id }];
    });
  };

  const handleUpdateQuantity = (id: string, newQty: number) => {
    if (user) {
      void updateCartQuantity(id, newQty).then(result => setServerCart(result.cart)).catch(failure => setCartError(failure instanceof Error ? failure.message : 'تعداد به‌روزرسانی نشد.'));
      return;
    }
    setLocalCart(previous => previous.map(item => item.id === id ? { ...item, quantity: Math.max(1, Math.min(newQty, 20)) } : item));
  };

  const handleRemoveItem = (id: string) => {
    if (user) {
      void removeCartLine(id).then(result => setServerCart(result.cart)).catch(failure => setCartError(failure instanceof Error ? failure.message : 'حذف کالا انجام نشد.'));
      return;
    }
    setLocalCart(previous => previous.filter(item => item.id !== id));
  };

  // Switch designer view loaded with template
  const handleCustomizeProduct = (product: Product) => {
    setSelectedProduct(null);
    setActiveTab('designer');
  };

  const handleCheckout = () => {
    setCartOpen(false);
    if (!authReady) {
      setCartNotice('در حال بررسی نشست حساب کاربری؛ چند لحظه دیگر دوباره تلاش کنید.');
      return;
    }
    if (!user) {
      checkoutAfterLoginRef.current = true;
      setAuthPage('login');
      return;
    }
    if (cartHydratedUserRef.current !== user.id) {
      setCartError('در حال آماده‌سازی سبد خرید؛ چند لحظه دیگر دوباره تلاش کنید.');
      return;
    }
    setActiveTab('checkout');
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  const refreshServerCart = async () => {
    try { setServerCart((await loadCart()).cart); setCartError(''); }
    catch (failure) { setCartError(failure instanceof Error ? failure.message : 'سبد خرید به‌روزرسانی نشد.'); }
  };

  const handleSubmitOrder = async (input: CheckoutOrderInput, idempotencyKey: string) => {
    const result = await createCheckoutOrder(input, idempotencyKey);
    await refreshServerCart();
    return result.order;
  };

  // Set active product detail screen
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  // Filter products
  const filteredProducts = PRODUCTS.filter((product) => {
    const isCategoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
    const isGarmentTypeMatch = selectedGarmentType === 'all' || product.garmentType === selectedGarmentType;
    const isSearchMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return isCategoryMatch && isGarmentTypeMatch && isSearchMatch;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    return 0; // default
  });

  const garmentLabelByType: Record<string, string> = {
    hoodie: 'هودی',
    dors: 'دورس',
    tshirt: 'تیشرت',
    sweatshirt: 'سویشرت',
    halfzip: 'نیم‌زیپ',
    pants: 'شلوار',
  };
  const garmentCatalogTitleByType: Record<string, string> = {
    hoodie: 'هودی‌های آماده',
    dors: 'دورس‌های آماده',
    tshirt: 'تیشرت‌های آماده',
    sweatshirt: 'سویشرت‌های آماده',
    halfzip: 'نیم‌زیپ‌های آماده',
    pants: 'شلوارهای آماده',
  };

  // Isolated Admin Environment Gate
  if (isAdminView) {
    return (
      <ToastProvider>
        <AdminRouterProvider
          onBackToStore={() => {
            setActiveTab('home');
            window.history.pushState({}, '', '/');
            window.location.hash = '';
            window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
          }}
        >
          <StaffAuth><CatalogProvider><AdminLayout /></CatalogProvider></StaffAuth>
        </AdminRouterProvider>
      </ToastProvider>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col antialiased overflow-x-hidden w-full max-w-full transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0e0d0c] text-[#f5f2eb]' : 'bg-[#fafafa] text-[#1a1917]'
    }`}>
      <a href="#main-content" className="sr-only z-[100] rounded-lg bg-[#ba8d3d] px-4 py-3 font-bold text-black focus:not-sr-only focus:fixed focus:left-4 focus:top-4">رفتن به محتوای اصلی</a>
      {/* Floating Header */}
      {authError && <div role="alert" className="fixed bottom-4 right-4 z-50 rounded-xl bg-black/90 p-3 text-red-300">{authError}<button onClick={()=>void handleLogout()} className="mr-3 underline">تلاش دوباره</button></div>}
      {cartLoading && <div role="status" className="fixed bottom-4 right-4 z-40 rounded-xl bg-black/90 p-3 text-stone-200">در حال دریافت سبد خرید…</div>}
      {cartError && <div role="alert" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-red-400/20 bg-black/95 p-3 text-xs text-red-200">{cartError}{user && <button onClick={() => setCartRefreshToken(value => value + 1)} className="mr-3 underline">تلاش دوباره</button>}</div>}
      <Navbar 
        activeTab={activeTab} 
        isCheckout={activeTab === 'checkout'}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedProduct(null);
          window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }} 
        cart={cart}
        setCartOpen={setCartOpen}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        user={user}
        onLoginClick={() => setAuthPage('login')}
        onLogout={handleLogout}
        onAccountClick={() => { setActiveTab('account'); window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' }); }}
        onAdminClick={() => {
          setActiveTab('admin');
          window.history.pushState({}, '', '/admin/overview/dashboard');
          window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }}
      />
      {cartNotice && <div role="status" className="mx-auto mt-24 w-[calc(100%-2rem)] max-w-5xl rounded-xl border border-[#ba8d3d]/20 bg-black/95 p-3 text-xs text-[#eed29d]">{cartNotice}<button onClick={() => setCartNotice('')} className="mr-3 underline">بستن</button></div>}

      {/* Primary Page views */}
      <main id="main-content" className="flex-1 w-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            {activeTab === 'home' && (
              <>
                <GarmentCategoryNavigation isDark={isDark} onSelect={category => {
                  setSelectedGarmentType(category);
                  setSelectedCategory('all');
                  focusShopHeadingOnMount.current = true;
                  setActiveTab('shop');
                  window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
                }} />
                <DiscountedShowcase products={PRODUCTS.filter(product => (product.discountPercent ?? 0) > 0)} isDark={isDark} isLoading={catalogLoading} error={catalogError} onSelect={handleSelectProduct} onRetry={retryCatalog} onBrowseCatalog={() => setActiveTab('shop')} />
              </>
            )}
        {activeTab === 'shop' && (
          <section className="pt-32 pb-24 px-6 md:px-12">
            <motion.div 
              initial={prefersReducedMotion ? false : 'hidden'}
              animate="visible"
              variants={{
                hidden: { opacity: prefersReducedMotion ? 1 : 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: prefersReducedMotion ? 0 : 0.035
                  }
                }
              }}
              className="max-w-7xl mx-auto"
            >
              {/* Showcase Banner */}
              <motion.div 
                variants={{
                  hidden: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0, transition: { duration: prefersReducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="mb-12 text-right"
              >
                <span className="text-[10px] text-gray-500 font-mono">کاتالوگ اینترنتی شهپوش</span>
                <h1
                  ref={element => {
                    if (!element || !focusShopHeadingOnMount.current) return;
                    focusShopHeadingOnMount.current = false;
                    requestAnimationFrame(() => {
                      if (element.isConnected) element.focus({ preventScroll: true });
                    });
                  }}
                  tabIndex={-1}
                  data-page-heading="shop"
                  className={`text-xl leading-relaxed sm:text-3xl md:text-5xl font-display font-medium tracking-tight mt-1 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  <span className="whitespace-nowrap">کاتالوگ{selectedGarmentType === 'all' ? ' پوشاک' : ''}</span>{' '}<span className="whitespace-nowrap">{selectedGarmentType === 'all' ? 'آماده' : garmentCatalogTitleByType[selectedGarmentType] ?? 'پوشاک'} شهپوش</span>
                </h1>
                <p className={`text-xs mt-2 max-w-2xl leading-relaxed ${
                  isDark ? 'text-gray-400' : 'text-slate-600'
                }`}>
                  محصولات را بر پایه نوع پوشاک یا سبک طرح پیدا کنید.
                </p>
              </motion.div>

              {/* Filtering Controls */}
              <motion.div 
                variants={{
                  hidden: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
                  visible: { opacity: 1, y: 0, transition: { duration: prefersReducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] } }
                }}
                className={`border rounded-[2rem] p-6 mb-12 flex flex-col md:flex-row gap-6 justify-between items-center text-right transition-colors duration-300 ${
                  isDark ? 'bg-[#141211] border-white/5' : 'bg-white border-slate-200/60 shadow-[0_15px_35px_rgba(0,0,0,0.02)]'
                }`}
              >
                
                {/* Search Bar */}
                <div className={`relative w-full md:max-w-sm flex items-center rounded-2xl border overflow-hidden px-4 transition-colors duration-300 ${
                  isDark ? 'bg-[#0e0d0c] border-white/5' : 'bg-[#faf8f5] border-slate-200/60'
                }`}>
                  <Search size={16} className="text-gray-500 shrink-0" />
                  <label htmlFor="catalog-search" className="sr-only">جست‌وجوی محصولات</label>
                  <input
                    id="catalog-search"
                    type="text"
                    dir="rtl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="نام محصول، کد یا طرح"
                    className={`w-full bg-transparent px-3 py-3.5 text-xs outline-none text-right ${
                      isDark ? 'text-white placeholder:text-stone-400' : 'text-slate-900 placeholder:text-slate-600'
                    }`}
                  />
                </div>

                <div className="flex flex-1 flex-col gap-3">
                  <div><p className="mb-2 text-[10px] text-stone-500">نوع پوشاک</p><div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'همه پوشاک' }, { id: 'hoodie', label: 'هودی' }, { id: 'dors', label: 'دورس' },
                      { id: 'tshirt', label: 'تیشرت' }, { id: 'sweatshirt', label: 'سویشرت' }, { id: 'halfzip', label: 'نیم‌زیپ' }, { id: 'pants', label: 'شلوار' },
                    ].map(category => <button key={category.id} type="button" aria-pressed={selectedGarmentType === category.id} onClick={() => setSelectedGarmentType(category.id)} className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-3 py-2 text-[10px] font-semibold transition ${selectedGarmentType === category.id ? 'bg-[#ba8d3d] text-[#0e0d0c]' : isDark ? 'border border-white/5 bg-white/[0.03] text-stone-400 hover:text-white' : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900'}`}>{category.label}</button>)}
                  </div></div>
                  <div><p className="mb-2 text-[10px] text-stone-500">سبک طرح</p><div className="flex flex-wrap gap-2">
                    {[
                      { id: 'all', label: 'همه طرح‌ها' },
                      ...catalogCategories.map(category => ({ id: category.slug, label: ({ calligraphy: 'کالیگرافی و نستعلیق', graphic: 'طرح‌های گرافیکی', minimalist: 'مینیمال ایرانی' } as Record<string, string>)[category.slug] || category.nameFa })),
                    ].map(category => <button key={category.id} type="button" aria-pressed={selectedCategory === category.id} onClick={() => setSelectedCategory(category.id)} className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-3 py-2 text-[10px] font-semibold transition ${selectedCategory === category.id ? 'bg-[#ba8d3d] text-[#0e0d0c]' : isDark ? 'border border-white/5 bg-white/[0.03] text-stone-400 hover:text-white' : 'border border-slate-200 bg-white text-slate-600 hover:text-slate-900'}`}>{category.label}</button>)}
                  </div></div>
                </div>

                {/* Sorting options */}
                <div className={`flex items-center gap-2 border rounded-2xl p-1.5 shrink-0 self-start md:self-center transition-colors duration-300 ${
                  isDark ? 'bg-[#0e0d0c] border-white/5' : 'bg-[#faf8f5] border-slate-200/60'
                }`}>
                  <Filter size={12} className="text-[var(--text-accent)] mr-2" />
                  <label className="sr-only" htmlFor="catalog-sort">مرتب‌سازی محصولات</label>
                  <select
                    id="catalog-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className={`bg-transparent text-xs py-1.5 px-3.5 border-none outline-none text-right cursor-pointer min-w-[150px] ${
                      isDark ? 'text-gray-200' : 'text-slate-700'
                    }`}
                  >
                    <option value="default" className={isDark ? 'bg-[#0e0d0c]' : 'bg-white'}>مرتب‌سازی هوشمند</option>
                    <option value="price-asc" className={isDark ? 'bg-[#0e0d0c]' : 'bg-white'}>قیمت: کم به زیاد</option>
                    <option value="price-desc" className={isDark ? 'bg-[#0e0d0c]' : 'bg-white'}>قیمت: زیاد به کم</option>
                  </select>
                </div>

              </motion.div>

              {catalogError && PRODUCTS.length > 0 && <div role="status" className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-200/20 bg-amber-200/5 text-stone-200' : 'border-amber-800/20 bg-amber-50 text-slate-800'}`}>
                <span>اتصال به فهرست محصولات برقرار نشد؛ آخرین اطلاعات در حال نمایش است.</span>
                <button type="button" onClick={retryCatalog} className="min-h-11 rounded-lg px-3 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">تلاش دوباره</button>
              </div>}

              <section aria-labelledby="catalog-products-heading">
              <h2 id="catalog-products-heading" className="sr-only">محصولات کاتالوگ</h2>
              {catalogLoading && PRODUCTS.length === 0 ? (
                <div role="status" className={`flex min-h-48 flex-col items-center justify-center rounded-3xl border px-6 text-center ${isDark ? 'border-white/10 bg-[#141211]/50 text-stone-300' : 'border-slate-200 bg-white text-slate-700'}`}>
                  <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none text-[var(--text-accent)]" size={28}/>
                  <p className="mt-4 text-sm">در حال دریافت محصولات…</p>
                </div>
              ) : catalogError && PRODUCTS.length === 0 ? (
                <div role="alert" className={`rounded-3xl border px-6 py-12 text-center ${isDark ? 'border-rose-200/15 bg-[#141211]/50 text-stone-200' : 'border-rose-800/20 bg-rose-50 text-slate-800'}`}>
                  <h3 className="text-base font-bold">دریافت محصولات انجام نشد</h3>
                  <p className={`mx-auto mt-2 max-w-sm text-sm leading-6 ${isDark ? 'text-stone-400' : 'text-slate-600'}`}>اتصال را بررسی کنید و دوباره تلاش کنید.</p>
                  <button type="button" onClick={retryCatalog} className="mt-5 min-h-11 rounded-full bg-[#ba8d3d] px-5 font-bold text-[#17130c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">تلاش دوباره</button>
                </div>
              ) : sortedProducts.length === 0 ? (
                <motion.div 
                  initial={prefersReducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
                  className="py-20 text-center bg-[#141211]/50 border border-white/5 rounded-3xl"
                >
                  <Shirt className="mx-auto text-gray-500 stroke-1 mb-4" size={32} />
                  <h3 className="text-white text-base font-bold mb-1">{PRODUCTS.length === 0 ? 'هنوز محصولی در کاتالوگ ثبت نشده است' : selectedGarmentType === 'all' ? 'محصولی مطابق فیلترها پیدا نشد' : `محصولی از گروه «${garmentLabelByType[selectedGarmentType] ?? 'پوشاک'}» پیدا نشد`}</h3>
                  <p className="text-gray-500 text-xs max-w-sm mx-auto leading-relaxed">عبارت جستجو، دسته پوشاک یا سبک طرح را تغییر دهید.</p>
                </motion.div>
              ) : (
                <motion.div 
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0 }
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {sortedProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      variants={{
                        hidden: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 },
                        visible: { opacity: 1, y: 0, transition: { duration: prefersReducedMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] } }
                      }}
                    >
                      <ProductCard
                        theme={theme}
                        product={product}
                        onSelect={handleSelectProduct}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              )}
              </section>

            </motion.div>
          </section>
        )}

        {activeTab === 'detail' && selectedProduct && (
          <ProductDetail
              theme={theme}
              product={selectedProduct}
              onBack={() => {
                setActiveTab('shop');
                setSelectedProduct(null);
              }}
              onAddToCart={handleAddToCart}
              onCustomize={handleCustomizeProduct}
          />
        )}

        {activeTab==='detail'&&!selectedProduct&&<div role="status" className="p-12 text-center">این محصول دیگر در ویترین فعال نیست.<button onClick={()=>setActiveTab('shop')} className="block mx-auto mt-4 underline">بازگشت به محصولات</button></div>}
        {activeTab === 'designer' && (
          <div key={selectedProduct ? selectedProduct.id : 'new'} className="animate-fade-in animate-duration-500">
            <PodDesigner 
              theme={theme}
              products={PRODUCTS}
              initialProduct={selectedProduct} 
            />
          </div>
        )}

        {activeTab === 'about' && (
          <section className="min-h-[70vh] px-6 pb-24 pt-32 md:px-12">
            <div className="mx-auto max-w-7xl text-right">
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--text-accent)]">درباره شهپوش</span>
              <h1 className={`mt-3 text-3xl font-semibold md:text-5xl ${isDark ? 'text-white' : 'text-slate-900'}`}>فروشگاه شهپوش</h1>
              <p className={`mt-5 max-w-3xl text-sm leading-7 ${isDark ? 'text-stone-400' : 'text-slate-600'}`}>اطلاعات این صفحه از کاتالوگ ثبت‌شده در پایگاه داده فروشگاه می‌آید. تصویر محصول، جزئیات تولید و خدمات عملیاتی فقط پس از ثبت و تأیید نمایش داده می‌شوند.</p>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                <article className="rounded-2xl border border-white/10 bg-[#141211] p-6"><h2 className="font-semibold text-[#eed29d]">کاتالوگ</h2><p className="mt-3 text-sm leading-6 text-stone-400">نام، تنوع، قیمت و موجودی از کاتالوگ فعلی بارگذاری می‌شود.</p></article>
                <article className="rounded-2xl border border-white/10 bg-[#141211] p-6"><h2 className="font-semibold text-[#eed29d]">پرداخت</h2><p className="mt-3 text-sm leading-6 text-stone-400">رسید کارت‌به‌کارت پس از بررسی دستی و پرداخت بله پس از استعلام رسمی تأیید می‌شود. سفارش پیش از تأیید وجه، پرداخت‌شده نمایش داده نمی‌شود.</p></article>
                <article className="rounded-2xl border border-white/10 bg-[#141211] p-6"><h2 className="font-semibold text-[#eed29d]">پیش‌نمایش طراحی</h2><p className="mt-3 text-sm leading-6 text-stone-400">طراح، متن دلخواه را روی یکی از تنوع‌های کاتالوگ پیش‌نمایش می‌کند. ذخیره طرح و ثبت سفارش سفارشی فعال نیست.</p></article>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'checkout' && (
          <div className="animate-fade-in animate-duration-500">
            <Checkout 
              cart={cart}
              configuration={checkoutConfiguration}
              onBackToShop={() => setActiveTab('shop')}
              onSubmitOrder={handleSubmitOrder}
            />
          </div>
        )}
        {activeTab === 'account' && user && (
          <CustomerAccount
            theme={theme}
            user={user}
            onBack={() => setActiveTab('home')}
            onUserUpdated={setUser}
          />
        )}
        {activeTab === 'account' && !user && (
          <section className="min-h-[70vh] px-6 pt-40 text-center text-stone-300">
            <p>برای مشاهده حساب کاربری وارد شوید.</p>
            <button onClick={() => setAuthPage('login')} className="mt-5 rounded-full bg-[#ba8d3d] px-6 py-3 text-sm font-bold text-black">ورود به حساب</button>
          </section>
        )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Persistent Shopping Cart Sidebar Drawer */}
      <Cart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={handleCheckout}
      />

      {/* Styled Iranian Streetwear Footer */}
      <footer className={`py-20 px-6 md:px-12 text-right transition-colors border-t overflow-hidden relative ${
        isDark ? 'bg-[#0e0d0c] border-white/[0.06]' : 'bg-[#faf9f6] border-slate-200'
      }`}>
        {/* Subtle decorative grid background in footer */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none opacity-40"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 sm:gap-x-12 sm:gap-y-8 lg:gap-12 relative z-10">
          
          {/* Logo brand intro Column - Span 5 */}
          <div className="sm:col-span-2 lg:col-span-5 space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative group/footlogo">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#ba8d3d] to-[#eed29d] opacity-25 group-hover/footlogo:opacity-100 blur-sm transition-opacity duration-500"></div>
                <div className="relative w-11 h-11 rounded-full bg-[#1b1917] dark:bg-[#121110] border border-[#ba8d3d]/30 flex items-center justify-center font-bold text-[#ba8d3d] font-display text-xl shadow-lg">
                  ش
                </div>
              </div>
              <div className="flex flex-col">
                <span className={`font-display text-lg font-black transition-colors tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  پلتفرم ملبوسات فاخر شهپوش
                </span>
                <span className="text-xs text-[var(--text-accent)] font-medium tracking-wide">آتلیه طراحی و دوخت کژوال ایرانی</span>
              </div>
            </div>
            
            <p className={`text-xs leading-relaxed max-w-sm transition-colors font-sans ${
              isDark ? 'text-gray-450 text-gray-400' : 'text-slate-600'
            }`}>
              شهپوش خانه ایرانی تیشرت‌های گرافیکی اصیل و آتلیه شخصی‌سازی شماست. ما با پیوند میان نقوش خطاطی، کالیگرافی اصیل و هندسه خیابانی مدرن، جامه‌ای درخور اصالت شما می‌آفرینیم.
            </p>
            
          </div>

          {/* Catalog switches Columns 2 */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-black tracking-wider text-[var(--text-accent)] border-r-2 border-[#ba8d3d]/40 pr-2">بایگانی مجموعه‌ها</h4>
            <ul className={`space-y-1 text-xs transition-colors [&_button]:min-h-11 [&_button]:w-full [&_button]:justify-start ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              <li>
                <button onClick={() => { setSelectedCategory('calligraphy'); setActiveTab('shop'); }} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[var(--text-accent)]'}`}>
                  <span className="w-1 h-1 rounded-full bg-[#ba8d3d]/60"></span>
                  تیشرت‌های خوشنویسی
                </button>
              </li>
              <li>
                <button onClick={() => { setSelectedCategory('graphic'); setActiveTab('shop'); }} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[var(--text-accent)]'}`}>
                  <span className="w-1 h-1 rounded-full bg-[#ba8d3d]/60"></span>
                  طرح‌های گرافیکی
                </button>
              </li>
              <li>
                <button onClick={() => { setSelectedCategory('minimalist'); setActiveTab('shop'); }} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[var(--text-accent)]'}`}>
                  <span className="w-1 h-1 rounded-full bg-[#ba8d3d]/60"></span>
                  تیشرت‌های منقش کوفی
                </button>
              </li>
              <li>
                <button onClick={() => { setActiveTab('designer'); }} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[var(--text-accent)]'}`}>
                  <span className="w-1 h-1 rounded-full bg-[#ba8d3d]/60"></span>
                  طراحی اختصاصی با هوش مصنوعی
                </button>
              </li>
            </ul>
          </div>

          {/* Quick links Columns 2 */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-black tracking-wider text-[var(--text-accent)] border-r-2 border-[#ba8d3d]/40 pr-2">نقشه راهبری سایت</h4>
            <ul className={`space-y-1 text-xs transition-colors [&_button]:min-h-11 [&_button]:w-full [&_button]:justify-start ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              <li>
                <button onClick={() => setActiveTab('home')} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[var(--text-accent)]'}`}>
                  <span className="w-1 h-1 rounded-full bg-slate-400/40"></span>
                  صفحه نخست
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('shop')} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[var(--text-accent)]'}`}>
                  <span className="w-1 h-1 rounded-full bg-slate-400/40"></span>
                  فروشگاه ملبوسات
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('designer')} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[var(--text-accent)]'}`}>
                  <span className="w-1 h-1 rounded-full bg-slate-400/40"></span>
                  آتلیه شخصی‌سازی لباس
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('about')} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[var(--text-accent)]'}`}>
                  <span className="w-1 h-1 rounded-full bg-slate-400/40"></span>
                  درباره برند شهپوش
                </button>
              </li>
            </ul>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 space-y-4">
            <h4 className="text-xs font-black tracking-wider text-[var(--text-accent)] border-r-2 border-[#ba8d3d]/40 pr-2">وضعیت فروشگاه</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 ${
                isDark ? 'bg-[#151312] border-white/5 shadow-lg' : 'bg-white border-slate-200/80 shadow-sm text-slate-800'
              }`}>
                <div className="w-7 h-7 rounded-full bg-[#ba8d3d]/10 flex items-center justify-center text-[10px] text-[var(--text-accent)] font-bold">ک</div>
                <span className={`text-xs font-extrabold ${isDark ? 'text-[#eed29d]' : 'text-[var(--text-accent)]'}`}>کاتالوگ</span>
                <span className={`text-xs leading-normal ${isDark ? 'text-gray-500' : 'text-slate-550'}`}>محصولات از پایگاه داده</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 ${
                isDark ? 'bg-[#151312] border-white/5 shadow-lg' : 'bg-white border-slate-200/80 shadow-sm text-slate-800'
              }`}>
                <div className="w-7 h-7 rounded-full bg-[#ba8d3d]/10 flex items-center justify-center text-[10px] text-[var(--text-accent)] font-bold">پ</div>
                <span className={`text-xs font-extrabold ${isDark ? 'text-[#eed29d]' : 'text-[var(--text-accent)]'}`}>روش‌های پرداخت</span>
                <span className={`text-xs leading-normal ${isDark ? 'text-gray-500' : 'text-slate-550'}`}>پس از پیکربندی واقعی فعال می‌شوند</span>
              </div>
            </div>
            <div className={`text-xs leading-relaxed transition-colors ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              ثبت سفارش پس از تعیین هزینه ارسال و فعال‌سازی روش پرداخت در تنظیمات مدیریت در دسترس می‌شود.
            </div>
          </div>

        </div>

        {/* Floating bottom credits */}
        <div className={`max-w-7xl mx-auto mt-16 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-xs transition-colors ${
          isDark ? 'border-white/[0.05] text-gray-500' : 'border-slate-200 text-slate-500'
        }`}>
          <span>کپی‌رایت © تمام حقوق مادی و معنوی محصولات، تصاویر و الگوهای طراحی شده برای پلتفرم شهپوش محفوظ است.</span>
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <span className="tracking-wide text-center sm:text-right">توسعه با عشق و افتخار در قطب فرهنگ و هنر پارس - ۱۴۰۵ خورشیدی</span>
            <button
              onClick={() => {
                setActiveTab('admin');
                window.history.pushState({}, '', '/admin/overview/dashboard');
                window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
              }}
              className={`min-h-11 min-w-max transition-colors cursor-pointer inline-flex items-center gap-1.5 font-mono text-xs px-3 py-2 rounded-lg border ${isDark ? 'text-gray-400 bg-white/5 hover:bg-white/10 hover:text-[#eed29d] border-white/5' : 'text-slate-700 bg-white hover:bg-slate-100 hover:text-[var(--text-accent)] border-slate-200'}`}
            >
              <span className="whitespace-nowrap">میز عملیات کارگاه</span>
              <span className={`px-1 rounded text-xs font-bold ${isDark ? 'bg-[#ba8d3d]/20 text-[#eed29d]' : 'bg-[#ba8d3d]/10 text-[var(--text-accent)]'}`}>مدیریت</span>
            </button>
          </div>
        </div>
      </footer>

      {authPage === 'login' && (
        <Login 
          theme={theme}
          onLogin={handleLogin}
          onClose={() => setAuthPage(null)}
          onNavigateToSignup={() => setAuthPage('signup')}
        />
      )}

      {authPage === 'signup' && (
        <Signup 
          theme={theme}
          onLogin={handleLogin}
          onClose={() => setAuthPage(null)}
          onNavigateToLogin={() => setAuthPage('login')}
        />
      )}
    </div>
  );
}
