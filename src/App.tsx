import { useState, useEffect } from 'react';
import { Search, Sliders, Filter, Phone, MapPin, Eye, ArrowLeft, CheckCircle, Shirt, Settings } from 'lucide-react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import BentoShowcase from './components/BentoShowcase';
import ProductCard from './components/ProductCard';
import ProductDetail from './components/ProductDetail';
import PodDesigner from './components/PodDesigner';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import ReviewScrollTicker from './components/ReviewScrollTicker';
import InstagramFeed from './components/InstagramFeed';
import { PRODUCTS } from './data';
import { Product, CartItem, User as UserType } from './types';
import Login from './components/Login';
import Signup from './components/Signup';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Navigation Screen State
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Theme State with localStorage integration
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('shahpoosh_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  // User State with localStorage integration for persistent sessions
  const [user, setUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('shahpoosh_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authPage, setAuthPage] = useState<'login' | 'signup' | null>(null);

  const handleLogin = (loggedUser: UserType) => {
    setUser(loggedUser);
    localStorage.setItem('shahpoosh_user', JSON.stringify(loggedUser));
    setAuthPage(null);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('shahpoosh_user');
  };

  // Sync theme to document element
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('shahpoosh_theme', theme);
  }, [theme]);
  
  const isDark = theme === 'dark';

  // Cart state with localStorage integration
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('shahpoosh_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [cartOpen, setCartOpen] = useState(false);

  // Shop state toggling
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'minimalist' | 'calligraphy' | 'graphic'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'popular'>('default');

  // Sync cart to local Storage
  useEffect(() => {
    localStorage.setItem('shahpoosh_cart', JSON.stringify(cart));
  }, [cart]);

  // Add Item to active cart
  const handleAddToCart = (newItem: Omit<CartItem, 'id'>) => {
    const uniqueId = newItem.isCustom 
      ? newItem.productId // Already generated uniquely
      : `${newItem.productId}-${newItem.color.hex}-${newItem.size}`;

    setCart((prevCart) => {
      const existingIdx = prevCart.findIndex((item) => item.id === uniqueId);
      if (existingIdx > -1) {
        const updated = [...prevCart];
        updated[existingIdx].quantity += newItem.quantity;
        return updated;
      }
      return [...prevCart, { ...newItem, id: uniqueId }];
    });
  };

  // Modify quantities
  const handleUpdateQuantity = (id: string, newQty: number) => {
    setCart((prevCart) => 
      prevCart.map((item) => item.id === id ? { ...item, quantity: newQty } : item)
    );
  };

  // Remove single card item
  const handleRemoveItem = (id: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  // Switch designer view loaded with template
  const handleCustomizeProduct = (product: Product) => {
    setSelectedProduct(null);
    setActiveTab('designer');
  };

  // Handle Order Submit (clear cart)
  const handleSubmitOrder = (orderDetails: any) => {
    setCart([]);
    localStorage.removeItem('shahpoosh_cart');
  };

  // Set active product detail screen
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setActiveTab('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter products
  const filteredProducts = PRODUCTS.filter((product) => {
    const isCategoryMatch = selectedCategory === 'all' || product.category === selectedCategory;
    const isSearchMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    return isCategoryMatch && isSearchMatch;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'popular') return b.rating - a.rating;
    return 0; // default
  });

  return (
    <main className={`min-h-screen flex flex-col antialiased overflow-x-hidden w-full max-w-full transition-colors duration-300 ${
      theme === 'dark' ? 'bg-[#0e0d0c] text-[#f5f2eb]' : 'bg-[#fafafa] text-[#1a1917]'
    }`}>
      {/* Floating Header */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setSelectedProduct(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} 
        cart={cart}
        setCartOpen={setCartOpen}
        theme={theme}
        onToggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
        user={user}
        onLoginClick={() => setAuthPage('login')}
        onLogout={handleLogout}
      />

      {/* Primary Page views */}
      <div className="flex-1 w-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
          >
            {activeTab === 'home' && (
              <div className="animate-fade-in animate-duration-500">
            <Hero 
              theme={theme}
              onStartDesign={() => setActiveTab('designer')} 
              onExploreProducts={() => setActiveTab('shop')} 
            />
            <BentoShowcase 
              theme={theme}
              onStartDesign={() => setActiveTab('designer')}
              onSelectCategory={(cat) => {
                if (cat !== 'pod') {
                  setSelectedCategory(cat as any);
                  setActiveTab('shop');
                } else {
                  setActiveTab('designer');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
            
            {/* Quick pre-selected designs view */}
            <section className="py-24 px-6 md:px-12 bg-grid-lines">
              <div className="max-w-7xl mx-auto">
                <motion.div 
                  initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                  whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col md:flex-row justify-between items-end mb-16"
                >
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 font-mono">SELECTED ORIGINAL WEAR</span>
                    <h2 className={`text-2xl md:text-4xl font-display font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      تیشرت‌های آماده طلایی شهپوش
                    </h2>
                  </div>
                  <button 
                    onClick={() => setActiveTab('shop')}
                    className={`mt-4 md:mt-0 text-xs font-semibold border-b pb-1 transition-all cursor-pointer ${
                      isDark ? 'text-[#eed29d] border-[#ba8d3d]/40 hover:text-[#ba8d3d]' : 'text-[#ba8d3d] border-[#ba8d3d]/30 hover:text-[#a0742d]'
                    }`}
                  >
                    گشت و گذار در تمام طرح‌ها ←
                  </button>
                </motion.div>

                <motion.div 
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.08,
                      }
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 text-right"
                >
                  {PRODUCTS.map((product) => (
                    <motion.div
                      key={product.id}
                      variants={{
                        hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
                        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
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
              </div>
            </section>

            {/* HIGH-END SCROLLING TICKER LOOP - REAL CUSTOMER FEEDBACK */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 pb-24">
              <ReviewScrollTicker isDark={isDark} />
            </div>

            {/* HIGH-END INTERACTIVE INSTAGRAM FEED GRID */}
            <div className="max-w-7xl mx-auto px-6 md:px-12 pb-28">
              <InstagramFeed isDark={isDark} />
            </div>
          </div>
        )}

        {activeTab === 'shop' && (
          <section className="pt-32 pb-24 px-6 md:px-12">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.08,
                    delayChildren: 0.05
                  }
                }
              }}
              className="max-w-7xl mx-auto"
            >
              {/* Showcase Banner */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
                  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="mb-12 text-right"
              >
                <span className="text-[10px] text-gray-500 font-mono">SHAHPOOSH ONLINE CATALOG</span>
                <h1 className={`text-3xl md:text-5xl font-display font-medium tracking-tight mt-1 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  کاتالوگ تیشرت‌های آماده شهپوش
                </h1>
                <p className={`text-xs mt-2 max-w-2xl leading-relaxed ${
                  isDark ? 'text-gray-400' : 'text-slate-600'
                }`}>
                  تیشرت‌های نخی درجه یک، دوخته شده با وسواس کارگاه‌های بافندگی ما، با طراحی‌های چشم‌گیر الهام گرفته شده از غنای ادبی و نمادهای مینیاتور ایران زمین.
                </p>
              </motion.div>

              {/* Filtering Controls */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 20, filter: 'blur(6px)' },
                  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } }
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
                  <input
                    type="text"
                    dir="rtl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="جستجو در بین آثار..."
                    className={`w-full bg-transparent px-3 py-3.5 text-xs outline-none text-right ${
                      isDark ? 'text-white placeholder:text-gray-600' : 'text-slate-900 placeholder:text-slate-400'
                    }`}
                  />
                </div>

                {/* Category Switches */}
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { id: 'all', label: 'همه البسه' },
                    { id: 'calligraphy', label: 'کالیگرافی و نستعلیق' },
                    { id: 'graphic', label: 'بین‌المللی و کلاژ' },
                    { id: 'minimalist', label: 'مینیمال ایرانی' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id as any)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-300 ${
                        selectedCategory === cat.id 
                          ? 'bg-[#ba8d3d] text-[#0e0d0c] font-bold shadow-md' 
                          : isDark 
                            ? 'bg-white/5 border border-white/5 text-gray-400 hover:text-white' 
                            : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Sorting options */}
                <div className={`flex items-center gap-2 border rounded-2xl p-1.5 shrink-0 self-start md:self-center transition-colors duration-300 ${
                  isDark ? 'bg-[#0e0d0c] border-white/5' : 'bg-[#faf8f5] border-slate-200/60'
                }`}>
                  <Filter size={12} className="text-[#ba8d3d] mr-2" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className={`bg-transparent text-xs py-1.5 px-3.5 border-none outline-none text-right cursor-pointer min-w-[150px] ${
                      isDark ? 'text-gray-200' : 'text-slate-700'
                    }`}
                  >
                    <option value="default" className={isDark ? 'bg-[#0e0d0c]' : 'bg-white'}>مرتب‌سازی هوشمند</option>
                    <option value="popular" className={isDark ? 'bg-[#0e0d0c]' : 'bg-white'}>محبوب‌ترین خریداران</option>
                    <option value="price-asc" className={isDark ? 'bg-[#0e0d0c]' : 'bg-white'}>قیمت: کم به زیاد</option>
                    <option value="price-desc" className={isDark ? 'bg-[#0e0d0c]' : 'bg-white'}>قیمت: زیاد به کم</option>
                  </select>
                </div>

              </motion.div>

              {/* Product Grid output */}
              {sortedProducts.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-20 text-center bg-[#141211]/50 border border-white/5 rounded-3xl"
                >
                  <Shirt className="mx-auto text-gray-500 stroke-1 mb-4" size={32} />
                  <h3 className="text-white text-base font-bold mb-1">هیچ تیشرتی مطابق فیلتر یافت نشد</h3>
                  <p className="text-gray-500 text-xs max-w-sm mx-auto leading-relaxed">کلمات جستجوی خود را تغییر داده یا دسته‌بندی تیشرت فرعی دیگری را آزمایش کنید.</p>
                </motion.div>
              ) : (
                <motion.div 
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.05
                      }
                    }
                  }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                  {sortedProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      variants={{
                        hidden: { opacity: 0, y: 24, filter: 'blur(4px)' },
                        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
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

            </motion.div>
          </section>
        )}

        {activeTab === 'detail' && selectedProduct && (
          <div className="animate-fade-in animate-duration-500">
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
          </div>
        )}

        {activeTab === 'designer' && (
          <div key={selectedProduct ? selectedProduct.id : 'new'} className="animate-fade-in animate-duration-500">
            <PodDesigner 
              theme={theme}
              onAddToCart={handleAddToCart} 
              initialProduct={selectedProduct} 
            />
          </div>
        )}

        {activeTab === 'about' && (
          <section className="pt-32 pb-24 px-6 md:px-12">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1,
                    delayChildren: 0.05
                  }
                }
              }}
              className="max-w-7xl mx-auto text-right"
            >
              
              {/* Story Intro */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 24, filter: 'blur(8px)' },
                  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } }
                }}
                className="mb-16"
              >
                <span className="text-[10px] text-gray-500 font-mono">ABOUT THE SHAHPOOSH PLATFORM</span>
                <h1 className={`text-3xl md:text-5xl font-display font-medium tracking-tight mt-1 ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  وقار گام‌های کهن، طراحی نوین خیابانی
                </h1>
                <p className={`text-xs md:text-sm mt-4 leading-relaxed max-w-4xl ${
                  isDark ? 'text-gray-400' : 'text-slate-605'
                }`}>
                  شهپوش در سال ۱۴۰۳ با این ایده راسخ متولد شد که تیشرت‌های گرافیکی کژوال می‌توانند تریبونی شایسته برای درخشش هویت بصری غنی ایران زمین باشند. ما با ادغام تکنولوژی فوق پیشرفته چاپ دیجیتال مستقیم منسوجات (DTG) به صورت تقاضامحور (POD)، گامی موثر در حذف الگوهای کهنه صنعت مد برداشته‌ایم.
                </p>
              </motion.div>

              {/* Features split row layout */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
                  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } }
                }}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20 p-8 md:p-12 rounded-[2rem] border transition-colors duration-300 ${
                  isDark ? 'bg-grid-lines bg-[#141211] border-white/5' : 'bg-[#fbf9f6] border-slate-200/65'
                }`}
              >
                <div>
                  <h2 className={`text-xl md:text-2xl font-display mb-4 ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>کارگاه چاپ مستقیم روی الیاف (DTG)</h2>
                  <p className={`text-xs leading-relaxed mb-4 ${
                    isDark ? 'text-gray-300' : 'text-slate-605'
                  }`}>
                    بر خلاف چسبیدگی‌های پلاستیکی چاپ‌های ارزان سیلک و ترنسفر، تکنیک چاپ مستقیم دیجیتال ما رنگ‌دانه‌های طبیعی جوهر را با شتاب حرارتی عمیقاً در بافت مولکولی پنبه تزریق می‌کند. نتیجه، لطافت کامل، عدم تعریق پوست و ثبات نقوش حتی پس از شستشو با ماشین لباسشویی است.
                  </p>
                  <ul className={`space-y-2 text-xs ${
                    isDark ? 'text-gray-300' : 'text-slate-650'
                  }`}>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ba8d3d]" />
                      <span>جوهرهای پودری ضد حساسیت و دوست‌دار زیست‌محیطی</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ba8d3d]" />
                      <span>دقت تفکیک بالای ۱۲۰۰ دی‌پی‌آی خطوط بسیار باریک خوشنویسی</span>
                    </li>
                  </ul>
                </div>
                <div className={`aspect-[16/10] overflow-hidden rounded-2xl p-1 flex items-center justify-center border transition-colors duration-300 ${
                  isDark ? 'bg-[#161514] border-white/5' : 'bg-white border-slate-200/60'
                }`}>
                  <img
                    src="https://picsum.photos/seed/printing_tech/800/500"
                    alt="مراحل تولید تیشرت در چاپ‌خانه"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-80 hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </motion.div>

              {/* Guarantees stats details */}
              <motion.div 
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05
                    }
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {[
                  { title: 'مواد اولیه طبیعی', desc: 'استفاده انحصاری از مزارع مرغوب پنبه دیم کشور با تکنولوژی نساجی الیاف دو نخ گرم بالا.' },
                  { title: 'ارسال با ضمانت پستی', desc: 'حمل فوری و اختصاصی محصولات در بسته‌بندی زیست‌تخریب‌پذیر به تمامی نقاط دور و نزدیک کشور.' },
                  { title: 'طراحی مشارکتی', desc: 'همکاری مستقیم با کالیگرافرها و کارتونیست‌های خلاق ایرانی و تخصیص حق اثر عادلانه.' }
                ].map((stat, i) => (
                  <motion.div 
                    key={i} 
                    variants={{
                      hidden: { opacity: 0, y: 20, filter: 'blur(4px)' },
                      visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } }
                    }}
                    className={`p-6.5 rounded-3xl border transition-colors duration-350 ${
                      isDark ? 'bg-[#141211] border-white/5' : 'bg-[#fbf9f6] border-slate-200/60'
                    } space-y-2`}
                  >
                    <span className="font-mono text-[9px] text-[#eed29d]">SHP-VALUE-PRO-0{i+1}</span>
                    <h3 className={`text-xs font-bold ${
                      isDark ? 'text-white' : 'text-slate-900'
                    }`}>{stat.title}</h3>
                    <p className={`text-[11px] leading-normal ${
                      isDark ? 'text-gray-500' : 'text-slate-650'
                    }`}>{stat.desc}</p>
                  </motion.div>
                ))}
              </motion.div>

            </motion.div>
          </section>
        )}

        {activeTab === 'checkout' && (
          <div className="animate-fade-in animate-duration-500">
            <Checkout 
              cart={cart}
              onBackToShop={() => setActiveTab('shop')}
              onSubmitOrder={handleSubmitOrder}
            />
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Persistent Shopping Cart Sidebar Drawer */}
      <Cart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => {
          setCartOpen(false);
          setActiveTab('checkout');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Styled Iranian Streetwear Footer */}
      <footer className={`py-20 px-6 md:px-12 text-right transition-colors border-t overflow-hidden relative ${
        isDark ? 'bg-[#0e0d0c] border-white/[0.06]' : 'bg-[#faf9f6] border-slate-200'
      }`}>
        {/* Subtle decorative grid background in footer */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none opacity-40"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 relative z-10">
          
          {/* Logo brand intro Column - Span 5 */}
          <div className="md:col-span-5 space-y-6">
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
                <span className="text-[10px] text-[#ba8d3d]/90 font-medium tracking-wide">آتلیه طراحی و دوخت کژوال ایرانی</span>
              </div>
            </div>
            
            <p className={`text-xs leading-relaxed max-w-sm transition-colors font-sans ${
              isDark ? 'text-gray-450 text-gray-400' : 'text-slate-600'
            }`}>
              شهپوش خانه ایرانی تیشرت‌های گرافیکی اصیل و آتلیه شخصی‌سازی شماست. ما با پیوند میان نقوش خطاطی، کالیگرافی اصیل و هندسه خیابانی مدرن، جامه‌ای درخور اصالت شما می‌آفرینیم.
            </p>
            
            <div className="flex flex-col gap-3 pt-2">
              <div className={`flex items-center gap-3 text-xs transition-colors ${isDark ? 'text-gray-450 text-gray-400' : 'text-slate-600'}`}>
                <div className="w-6 h-6 rounded-lg bg-[#ba8d3d]/10 flex items-center justify-center">
                  <Phone size={11} className="text-[#ba8d3d]" />
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500 ml-1 text-[10px]">تماس با واحد پشتیبانی:</span>
                  <span className="font-mono font-medium tracking-wide">۰۲۱-۸۸۹۹۲۲۰</span>
                </div>
              </div>
              <div className={`flex items-center gap-3 text-xs transition-colors ${isDark ? 'text-gray-450 text-gray-400' : 'text-slate-600'}`}>
                <div className="w-6 h-6 rounded-lg bg-[#ba8d3d]/10 flex items-center justify-center">
                  <MapPin size={11} className="text-[#ba8d3d]" />
                </div>
                <div>
                  <span className="text-gray-400 dark:text-gray-500 ml-1 text-[10px]">کارگاه مرکزی:</span>
                  <span className="font-sans">تهران، خیابان هنرستان غربی، کوی چاپخانه شهپوش</span>
                </div>
              </div>
            </div>
          </div>

          {/* Catalog switches Columns 2 */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-[11px] font-black tracking-wider text-[#ba8d3d] border-r-2 border-[#ba8d3d]/40 pr-2">بایگانی مجموعه‌ها</h4>
            <ul className={`space-y-3 text-xs transition-colors ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              <li>
                <button onClick={() => { setSelectedCategory('calligraphy'); setActiveTab('shop'); }} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[#ba8d3d]'}`}>
                  <span className="w-1 h-1 rounded-full bg-[#ba8d3d]/60"></span>
                  تیشرت‌های خوشنویسی
                </button>
              </li>
              <li>
                <button onClick={() => { setSelectedCategory('graphic'); setActiveTab('shop'); }} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[#ba8d3d]'}`}>
                  <span className="w-1 h-1 rounded-full bg-[#ba8d3d]/60"></span>
                  تصویرسازی‌های تاریخی
                </button>
              </li>
              <li>
                <button onClick={() => { setSelectedCategory('minimalist'); setActiveTab('shop'); }} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[#ba8d3d]'}`}>
                  <span className="w-1 h-1 rounded-full bg-[#ba8d3d]/60"></span>
                  تیشرت‌های منقش کوفی
                </button>
              </li>
              <li>
                <button onClick={() => { setActiveTab('designer'); }} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[#ba8d3d]'}`}>
                  <span className="w-1 h-1 rounded-full bg-[#ba8d3d]/60"></span>
                  طراحی اختصاصی با هوش مصنوعی
                </button>
              </li>
            </ul>
          </div>

          {/* Quick links Columns 2 */}
          <div className="md:col-span-2 space-y-4">
            <h4 className="text-[11px] font-black tracking-wider text-[#ba8d3d] border-r-2 border-[#ba8d3d]/40 pr-2">نقشه راهبری سایت</h4>
            <ul className={`space-y-3 text-xs transition-colors ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
              <li>
                <button onClick={() => setActiveTab('home')} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[#ba8d3d]'}`}>
                  <span className="w-1 h-1 rounded-full bg-slate-400/40"></span>
                  صفحه نخست
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('shop')} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[#ba8d3d]'}`}>
                  <span className="w-1 h-1 rounded-full bg-slate-400/40"></span>
                  فروشگاه ملبوسات
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('designer')} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[#ba8d3d]'}`}>
                  <span className="w-1 h-1 rounded-full bg-slate-400/40"></span>
                  آتلیه شخصی‌سازی لباس
                </button>
              </li>
              <li>
                <button onClick={() => setActiveTab('about')} className={`transition-colors duration-300 cursor-pointer flex items-center gap-1.5 hover:translate-x-[-4px] ${isDark ? 'hover:text-white' : 'hover:text-[#ba8d3d]'}`}>
                  <span className="w-1 h-1 rounded-full bg-slate-400/40"></span>
                  درباره برند شهپوش
                </button>
              </li>
            </ul>
          </div>

          {/* Dynamic trust certificates (Enamad) Mock Column 3 */}
          <div className="md:col-span-3 space-y-4">
            <h4 className="text-[11px] font-black tracking-wider text-[#ba8d3d] border-r-2 border-[#ba8d3d]/40 pr-2">مجوزها و استانداردهای تایید شده</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all duration-300 hover:scale-[1.03] ${
                isDark ? 'bg-[#151312] border-white/5 hover:border-[#ba8d3d]/20 shadow-lg' : 'bg-white border-slate-200/80 hover:border-[#ba8d3d]/30 shadow-sm text-slate-800'
              }`}>
                <div className="w-7 h-7 rounded-full bg-[#ba8d3d]/10 flex items-center justify-center text-[10px] text-[#ba8d3d] font-bold">ص</div>
                <span className="text-[10px] text-[#eed29d] font-extrabold">وزارت صنعت معدن</span>
                <span className={`text-[8px] leading-normal ${isDark ? 'text-gray-500' : 'text-slate-550'}`}>درمانگاه امن اعتماد الکترونیکی</span>
              </div>
              <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 transition-all duration-300 hover:scale-[1.03] ${
                isDark ? 'bg-[#151312] border-white/5 hover:border-[#ba8d3d]/20 shadow-lg' : 'bg-white border-slate-200/80 hover:border-[#ba8d3d]/30 shadow-sm text-slate-800'
              }`}>
                <div className="w-7 h-7 rounded-full bg-[#ba8d3d]/10 flex items-center justify-center text-[10px] text-[#ba8d3d] font-bold">ر</div>
                <span className="text-[10px] text-[#eed29d] font-extrabold">ارشاد و رسانه</span>
                <span className={`text-[8px] leading-normal ${isDark ? 'text-gray-500' : 'text-slate-550'}`}>سامانه نشان طلایی فرهنگ عامه</span>
              </div>
            </div>
            <div className={`text-[9.5px] leading-relaxed transition-colors ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>
              پلتفرم امن شهپوش مجهز به پروتکل رمزگذاری سراسری تبادلات مالی همگام با استانداردهای شبکه بانکی کشور است.
            </div>
          </div>

        </div>

        {/* Floating bottom credits */}
        <div className={`max-w-7xl mx-auto mt-16 pt-8 border-t flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] transition-colors ${
          isDark ? 'border-white/[0.05] text-gray-500' : 'border-slate-200 text-slate-500'
        }`}>
          <span>کپی‌رایت © تمام حقوق مادی و معنوی محصولات، تصاویر و الگوهای طراحی شده برای پلتفرم شهپوش محفوظ است.</span>
          <span className="tracking-wide">توسعه با عشق و افتخار در قطب فرهنگ و هنر پارس - ۱۴۰۵ خورشیدی</span>
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
    </main>
  );
}
