import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  Sparkles, 
  ShoppingBag, 
  Ruler, 
  Package, 
  BookOpen, 
  Shirt,
  CheckCircle2,
} from 'lucide-react';
import { Product, CartItem } from '../types';
import { handleProductImageError } from '../lib/productImage';
import { GlassButton } from './ui/apple-tahoe-liquid-glass-button';
import { motion, AnimatePresence } from 'motion/react';

interface ProductDetailProps {
  theme?: 'light' | 'dark';
  product: Product;
  onBack: () => void;
  onAddToCart: (item: Omit<CartItem, 'id'>) => void;
  onCustomize: (product: Product) => void;
}

export default function ProductDetail({ theme = 'dark', product, onBack, onAddToCart, onCustomize }: ProductDetailProps) {
  const isDark = theme === 'dark';
  
  // State for gallery and color/size triggers
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || {name:'—',hex:'#000000'});
  const [selectedSize, setSelectedSize] = useState(product.sizes[1] || product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'story' | 'size' | 'workshop'>('story');

  useEffect(() => {
    setSelectedImageIndex(0);
    setSelectedColor(product.colors[0] || { name: '?', hex: '#000000' });
    setSelectedSize(product.sizes[1] || product.sizes[0]);
    setQuantity(1);
  }, [product.id]);

  useEffect(()=>{
    if(!product.colors.some(c=>c.hex===selectedColor.hex))setSelectedColor(product.colors[0]||{name:'—',hex:'#000000'});
    if(!product.sizes.includes(selectedSize))setSelectedSize(product.sizes[0]);
    if(selectedImageIndex>=product.images.length)setSelectedImageIndex(0);
  },[product.colors,product.sizes,product.images,selectedColor.hex,selectedSize,selectedImageIndex]);
  const formattedPrice = (product.variants?.find(v=>v.colorHex===selectedColor?.hex && v.size===selectedSize)?.priceTomans ?? product.price).toLocaleString('fa-IR');

  const selectedVariant = product.variants?.find(v=>v.colorHex===selectedColor?.hex && v.size===selectedSize);
  const available = selectedVariant?.available ?? 0;
  const handleAddToCart = () => {
    if (!selectedVariant || quantity < 1 || available < 1 || quantity > available) return;
    onAddToCart({
      productId: product.id,
      variantId: selectedVariant!.id,
      sku: selectedVariant!.sku,
      productName: product.name,
      price: selectedVariant?.priceTomans ?? product.price,
      quantity,
      color: selectedColor,
      size: selectedSize,
      image: product.images[selectedImageIndex] || product.images[0],
    });
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 2500);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05
      }
    }
  };

  const slideUpVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)',
      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } 
    }
  };

  return (
    <article className={`min-h-[100dvh] pt-32 pb-24 px-6 md:px-12 bg-grid-lines transition-colors duration-400 ${
      isDark ? 'bg-[#0e0d0c]' : 'bg-[#faf8f5]'
    }`}>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-7xl mx-auto"
      >
        {/* Back Button layout */}
        <motion.button
          variants={slideUpVariants}
          onClick={onBack}
          className={`mb-8 flex items-center gap-2 px-5 py-2.5 border rounded-full text-xs transition-colors duration-350 group cursor-pointer font-bold ${
            isDark 
              ? 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/15 text-gray-300' 
              : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300 text-slate-800 shadow-sm'
          }`}
        >
          <ArrowRight size={14} className="group-hover:translate-x-[3px] transition-transform" />
          <span>بازگشت به فروشگاه</span>
        </motion.button>

        {/* Product details main block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Right/Left: Images Side - Columns 5 */}
          <motion.div 
            variants={slideUpVariants}
            className="lg:col-span-5 flex flex-col gap-6"
          >
            {/* Main Showcase wrapper with doppelrand hardware */}
            <div className="w-full">
              <div className={`rounded-[2.5rem] border p-2 transition-all duration-400 ${
                isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-200/25 border-slate-200/50'
              }`}>
                <div className={`relative aspect-square overflow-hidden rounded-[2.2rem] flex items-center justify-center border transition-all duration-300 ${
                  isDark ? 'bg-[#141211] border-white/[0.04]' : 'bg-white border-slate-200/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] shadow-sm'
                }`}>


                  {product.images.length > 0 ? (
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={selectedImageIndex}
                        onError={handleProductImageError}
                        initial={{ opacity: 0, scale: 0.95, filter: 'blur(5px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 1.03, filter: 'blur(5px)' }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        src={product.images[selectedImageIndex]}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="product-media-source w-full h-full max-h-[380px] object-contain p-6 drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_25px_45px_rgba(0,0,0,0.55)]"
                      />
                    </AnimatePresence>
                  ) : (
                    <div role="img" aria-label={"No image registered for " + product.name} className="flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-black/10 text-stone-500">
                      <Shirt size={54} strokeWidth={1} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Thumbnail switcher */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3 bg-neutral-500/5 dark:bg-white/[0.01] p-2.5 rounded-2xl border dark:border-white/[0.03] border-slate-200/50">
                {product.images.map((img, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square rounded-xl overflow-hidden p-1.5 border cursor-pointer transition-all duration-300 ${
                      selectedImageIndex === index 
                        ? 'border-[#ba8d3d] scale-[0.98] ring-2 ring-[#ba8d3d]/25' 
                        : isDark ? 'bg-[#161514]/40 border-white/5 hover:border-white/15' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} - تصویر ${index + 1}`}
                      referrerPolicy="no-referrer"
                      onError={handleProductImageError}
                      className="product-media-source w-full h-full object-contain filter contrast-[1.05]"
                    />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Micro Details info cards block */}
            <div className={`p-5 rounded-[1.8rem] border text-right space-y-3 ${
              isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white border-slate-200/80 shadow-[0_10px_20px_rgba(0,0,0,0.02)]'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200/50 dark:border-white/[0.03]">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>شناسه انحصاری اثر</span>
                <span className="font-mono text-xs text-[#ba8d3d] font-bold">{product.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>برش فابریک تن‌خور</span>
                <span className={`text-xs ${isDark ? 'text-white' : 'text-slate-800'} font-bold`}>لش‌فیت عریض (Oversized)</span>
              </div>
            </div>
          </motion.div>

          {/* Left/Right: Content specifications - Columns 7 */}
          <motion.div 
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08
                }
              }
            }}
            className="lg:col-span-7 text-right"
          >
            
            <motion.div variants={slideUpVariants} className="flex items-center gap-2 mb-4">
              <span className="bg-[#ba8d3d]/10 border border-[#ba8d3d]/20 text-[#eed29d] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                {product.category === 'calligraphy' ? 'کالکشن کالیگرافی' : product.category === 'graphic' ? 'کالکشن گرافیک ملل' : 'کالکشن مینیمال'}
              </span>

            </motion.div>

            {/* Title */}
            <motion.h1 
              variants={slideUpVariants}
              className={`text-3xl md:text-5xl font-black font-display mb-4 tracking-tight leading-[1.1] transition-colors duration-400 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {product.name}
            </motion.h1>

            {/* Pricing Section */}
            <motion.div 
              variants={slideUpVariants}
              className={`flex items-center gap-4 mb-8 p-4 md:p-5 rounded-2xl border w-max transition-all duration-300 ${
                isDark ? 'bg-[#181513] border-white/[0.04]' : 'bg-white border-slate-200/80 shadow-md'
              }`}
            >
              <span className={`text-[11px] font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>قیمت محصول:</span>
              <div className="flex flex-col items-start text-left">
                <div className="flex items-baseline gap-1">
                  <span className={`font-mono text-2xl md:text-3.5xl font-black tracking-tight ${isDark ? 'text-[#eed29d]' : 'text-[#ba8d3d]'}`}>
                    {formattedPrice}
                  </span>
                  <span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>تومان</span>
                </div>
              </div>
            </motion.div>

            {/* Option pickers (Colors & Sizes) */}
            <motion.div 
              variants={slideUpVariants}
              className={`grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pt-6 border-t ${
                isDark ? 'border-white/5' : 'border-slate-200'
              }`}
            >
              
              {/* Color Picker */}
              <div className="flex flex-col items-start text-right">
                <span className={`text-xs font-black mb-3 ${isDark ? 'text-gray-300' : 'text-slate-800'}`}>
                  گزینش رنگ پارچه: <span className="text-[#ba8d3d] mr-1">{selectedColor.name}</span>
                </span>
                <div className="flex gap-2.5">
                  {product.colors.map((color) => {
                    const isSelected = selectedColor.name === color.name;
                    return (
                      <motion.button
                        key={color.name}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedColor(color)}
                        className={`w-9.5 h-9.5 rounded-full relative flex items-center justify-center border transition-all duration-300 cursor-pointer ${
                          isSelected 
                            ? 'border-[#ba8d3d] scale-105 ring-2 ring-[#ba8d3d]/30 shadow-md' 
                            : isDark ? 'border-white/10 hover:border-white/20' : 'border-slate-300 hover:border-slate-400 shadow-sm'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white block mix-blend-difference"></span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Size Selection */}
              <div className="flex flex-col items-start text-right">
                <span className={`text-xs font-black mb-3 ${isDark ? 'text-gray-300' : 'text-slate-800'}`}>
                  گزینش سایز لباس: <span className="text-[#ba8d3d] mr-1">{selectedSize}</span>
                </span>
                <div className="flex gap-1.5">
                  {product.sizes.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <motion.button
                        key={size}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedSize(size)}
                        className={`w-10 h-10 rounded-xl font-mono text-xs font-bold transition-all duration-300 cursor-pointer flex items-center justify-center ${
                          isSelected 
                            ? 'bg-[#ba8d3d] text-[#0e0d0c] shadow-[0_2px_12px_rgba(186,141,61,0.3)]' 
                            : isDark ? 'bg-white/5 border border-white/5 text-gray-300 hover:border-white/15' : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 shadow-sm'
                        }`}
                      >
                        {size}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

            </motion.div>

            {/* Quantity Selector & Main Buttons */}
            <motion.div 
              variants={slideUpVariants}
              className={`flex flex-col sm:flex-row gap-4 items-stretch mb-10 pt-6 border-t ${
                isDark ? 'border-white/5' : 'border-slate-200'
              }`}
            >
              
              {/* Quantifier */}
              <div className={`flex items-center gap-1.5 border rounded-full px-2.5 py-1.5 transition-colors ${
                isDark ? 'bg-[#141211] border-white/5' : 'bg-slate-100 border-slate-200 shadow-sm'
              }`}>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  aria-label="کاهش تعداد"
                  disabled={available < 1 || quantity <= 1}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer font-bold transition-colors ${
                    isDark ? 'bg-white/5 text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-gray-400' : 'bg-white text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white'
                  }`}
                >
                  -
                </motion.button>
                <span className={`font-mono text-sm px-3.5 min-w-[32px] text-center font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {quantity.toLocaleString('fa-IR')}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  aria-label="افزایش تعداد"
                  disabled={quantity>=available}
                  onClick={() => setQuantity(Math.max(1,Math.min(available, quantity + 1)))}
                  className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer font-bold transition-colors ${
                    isDark ? 'bg-white/5 text-gray-400 hover:text-white disabled:hover:text-gray-400' : 'bg-white text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-50 disabled:hover:bg-white'
                  }`}
                >
                  +
                </motion.button>
              </div>

              {/* Add To Cart Button-in-Button */}
              <GlassButton
                disabled={!selectedVariant || available < 1 || quantity < 1 || available < quantity}
                onClick={handleAddToCart}
                glassColor={isDark ? "rgb(186, 141, 61)" : "rgb(238, 210, 157)"}
                className="flex-1 group relative flex items-center justify-center gap-4 px-8 py-4 rounded-full text-xs font-bold shadow-lg transition-all duration-300 transform active:scale-95 cursor-pointer text-[#0e0d0c] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
              >
                <ShoppingBag size={14} className="stroke-[2.5px]" />
                <span>{available < 1 ? 'ناموجود' : 'افزودن به سبد خرید'}</span>
                {addedMessage && (
                  <span className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-[#4AF626]/15 border border-[#4AF626]/20 text-[#2db312] dark:text-[#4AF626] font-bold text-[10px] px-3.5 py-1.5 rounded-full shadow-lg block animate-fade-in whitespace-nowrap">
                    ✓ با موفقیت به سبد خرید اضافه شد
                  </span>
                )}
              </GlassButton>

              {/* Customize POD option button (Awesome linkage!) */}
              <GlassButton
                onClick={() => onCustomize(product)}
                glassColor={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"}
                className={`group flex items-center justify-center gap-2.5 px-6 py-4 rounded-full text-xs font-bold select-none transition-all duration-300 cursor-pointer ${
                  isDark ? 'text-[#eed29d] border border-white/5' : 'text-slate-800 border border-slate-200 shadow-sm'
                }`}
              >
                <Sparkles size={13} className={`transition-colors ${isDark ? 'text-[#eed29d] group-hover:rotate-12 duration-200' : 'text-[#ba8d3d] group-hover:rotate-12 duration-200'}`} />
                <span>شخصی‌سازی مجدد طرح</span>
              </GlassButton>
            </motion.div>

            {/* Editorial Multi-Tab Specs & Story Box */}
            <motion.div 
              variants={slideUpVariants}
              className={`rounded-3xl border overflow-hidden ${
                isDark ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200/80 shadow-[0_15px_30px_rgba(0,0,0,0.02)]'
              }`}
            >
              {/* Tab Toggles */}
              <div className="grid grid-cols-3 border-b border-slate-200/50 dark:border-white/[0.04] bg-neutral-500/[0.02]">
                <button
                  onClick={() => setActiveTab('story')}
                  className={`py-4 text-xs font-black transition-all tracking-tight cursor-pointer ${
                    activeTab === 'story'
                      ? 'border-b-2 border-[#ba8d3d] text-[#ba8d3d] bg-neutral-500/[0.04]'
                      : `text-gray-400 dark:text-gray-500 hover:text-slate-800 dark:hover:text-white`
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <BookOpen size={13} />
                    <span>داستان اثر</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('size')}
                  className={`py-4 text-xs font-black transition-all tracking-tight cursor-pointer ${
                    activeTab === 'size'
                      ? 'border-b-2 border-[#ba8d3d] text-[#ba8d3d] bg-neutral-500/[0.04]'
                      : `text-gray-400 dark:text-gray-500 hover:text-slate-800 dark:hover:text-white`
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Ruler size={13} />
                    <span>راهنمای سایز لش‌فیت</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('workshop')}
                  className={`py-4 text-xs font-black transition-all tracking-tight cursor-pointer ${
                    activeTab === 'workshop'
                      ? 'border-b-2 border-[#ba8d3d] text-[#ba8d3d] bg-neutral-500/[0.04]'
                      : `text-gray-400 dark:text-gray-500 hover:text-slate-800 dark:hover:text-white`
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Package size={13} />
                    <span>مشخصات فنی</span>
                  </span>
                </button>
              </div>

              {/* Tab Contents with animations */}
              <div className="p-6 text-right">
                <AnimatePresence mode="wait">
                  {activeTab === 'story' && (
                    <motion.div
                      key="story"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <h4 className={`text-xs font-black text-[#ba8d3d]`}>تأملی در اندیشه طرح:</h4>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                        {product.description}
                      </p>

                    </motion.div>
                  )}

                  {activeTab === 'size' && (
                    <motion.div
                      key="size"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ba8d3d]"></span>
                        <h4 className="text-xs font-black text-[#ba8d3d]">اندازه‌های کلاسیک تیشرت عریض (بر حسب سانتی‌متر):</h4>
                      </div>
                      
                      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <p className="text-xs font-bold text-stone-200">اندازه‌های فعال این محصول</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {product.sizes.map(size => <span key={size} className="rounded-lg border border-[#ba8d3d]/20 bg-[#ba8d3d]/5 px-3 py-1.5 font-mono text-xs text-[#eed29d]">{size}</span>)}
                        </div>
                        <p className="mt-4 text-[11px] leading-6 text-stone-500">ابعاد عددی هر سایز هنوز برای این محصول ثبت نشده است.</p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'workshop' && (
                    <motion.div
                      key="workshop"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4.5"
                    >
                      <h4 className="text-xs font-black text-[#ba8d3d]">استانداردهای مهندسی تولید شهپوش:</h4>
                      <ul className="flex flex-col gap-3">
                        {product.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                            <CheckCircle2 size={13} className="text-[#eed29d] mt-1 shrink-0" />
                            <span className={`${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>



          </motion.div>

        </div>

      </motion.div>
    </article>
  );
}
