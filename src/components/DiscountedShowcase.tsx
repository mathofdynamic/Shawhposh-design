import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BadgePercent, LoaderCircle, Shirt, ShoppingBag } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { Product } from '../types';
import { handleProductImageError } from '../lib/productImage';

interface DiscountedShowcaseProps {
  products: Product[];
  isDark: boolean;
  isLoading: boolean;
  error: string;
  onSelect: (product: Product) => void;
  onRetry: () => void;
  onBrowseCatalog: () => void;
}

export const DiscountedShowcase: React.FC<DiscountedShowcaseProps> = ({ products, isDark, isLoading, error, onSelect, onRetry, onBrowseCatalog }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const reducedMotion = useReducedMotion();
  const active = products[activeIndex];

  useEffect(() => setActiveIndex(index => Math.min(index, Math.max(0, products.length - 1))), [products.length]);
  const move = (direction: -1 | 1) => setActiveIndex(index => (index + direction + products.length) % products.length);

  return <section dir="rtl" aria-label="محصولات تخفیف‌دار" className="mx-auto w-full max-w-7xl px-4 pb-16 pt-7 sm:px-6 sm:pb-24 sm:pt-10 lg:px-8">
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-[var(--text-accent)]"><BadgePercent size={14}/> پیشنهادهای تخفیف‌دار</p>
        <h1 className={`text-2xl font-semibold tracking-tight sm:text-4xl ${isDark ? 'text-stone-100' : 'text-slate-900'}`}>فرصت خرید این روزها</h1>
      </div>
      {products.length > 1 && <div className="hidden items-center gap-2 sm:flex">
        <button type="button" aria-label="محصول قبلی" onClick={() => move(-1)} className={`flex h-11 w-11 items-center justify-center rounded-full border transition-[border-color,color,transform] duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 hover:border-[#ba8d3d]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${isDark ? 'border-white/10 text-stone-300 hover:text-[#eed29d]' : 'border-slate-300 text-slate-700 hover:text-[var(--text-accent)]'}`}><ArrowRight size={17}/></button>
        <button type="button" aria-label="محصول بعدی" onClick={() => move(1)} className={`flex h-11 w-11 items-center justify-center rounded-full border transition-[border-color,color,transform] duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 hover:border-[#ba8d3d]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${isDark ? 'border-white/10 text-stone-300 hover:text-[#eed29d]' : 'border-slate-300 text-slate-700 hover:text-[var(--text-accent)]'}`}><ArrowLeft size={17}/></button>
      </div>}
    </div>

    <p className="sr-only" aria-live="polite" aria-atomic="true">{active ? `محصول ${activeIndex + 1} از ${products.length}: ${active.name}` : ''}</p>
    {error && products.length > 0 && <div role="status" className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-amber-200/20 bg-amber-200/5 text-stone-200' : 'border-amber-800/20 bg-amber-50 text-slate-800'}`}>
      <span>اتصال به فهرست محصولات برقرار نشد؛ آخرین اطلاعات در حال نمایش است.</span>
      <button type="button" onClick={onRetry} className="min-h-11 rounded-lg px-3 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">تلاش دوباره</button>
    </div>}
    {active ? <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#151312] sm:rounded-[2.25rem]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.article key={active.id} role="group" aria-roledescription="اسلاید" aria-label={`محصول ${activeIndex + 1} از ${products.length}: ${active.name}`} initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -4, transition: { duration: 0.08 } }} transition={{ duration: reducedMotion ? 0 : 0.18 }} className="grid min-h-[420px] grid-cols-1 lg:min-h-[500px] lg:grid-cols-[1.02fr_0.98fr]">
          <div className="relative flex min-h-[250px] items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(186,141,61,0.1),transparent_62%)] p-6 sm:min-h-[340px] sm:p-12">
            <div className="absolute right-5 top-5 z-10 rounded-full border border-rose-300/25 bg-[#281512]/90 px-3 py-1.5 text-xs font-bold text-rose-200 sm:right-7 sm:top-7">{active.discountPercent}% تخفیف</div>
            {active.images[0] ? <img src={active.images[0]} alt={active.name} onError={handleProductImageError} referrerPolicy="no-referrer" className="product-media-source relative z-0 max-h-[330px] w-full max-w-[490px] object-contain drop-shadow-[0_28px_34px_rgba(0,0,0,.35)] sm:max-h-[400px]"/> : <div role="img" aria-label={`تصویری برای ${active.name} ثبت نشده است`} className="flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-black/10 text-stone-500 sm:h-48 sm:w-48"><Shirt size={64} strokeWidth={1}/></div>}
          </div>
          <div className="flex flex-col justify-center border-t border-white/10 p-5 sm:p-9 lg:border-r lg:border-t-0 lg:p-12">
            <p className="mb-3 text-xs text-stone-400">{active.garmentType === 'hoodie' ? 'هودی' : active.garmentType === 'dors' ? 'دورس' : active.garmentType === 'tshirt' ? 'تیشرت' : active.garmentType === 'sweatshirt' ? 'سویشرت' : active.garmentType === 'halfzip' ? 'نیم‌زیپ' : active.garmentType === 'pants' ? 'شلوار' : 'پوشاک'}</p>
            <h2 className="text-xl font-semibold leading-9 text-stone-100 sm:text-3xl sm:leading-[1.55]">{active.name}</h2>
            {active.description && <p className="mt-3 line-clamp-3 max-w-xl text-sm leading-7 text-stone-400">{active.description}</p>}
            <div className="mt-7 flex flex-wrap items-end justify-between gap-5 border-t border-white/10 pt-5">
              <div>
                {active.originalPriceTomans != null && <p className="text-xs text-stone-400"><del>{active.originalPriceTomans.toLocaleString('fa-IR')} تومان</del></p>}
                <p className="mt-1 font-mono text-2xl font-bold tracking-tight text-[#eed29d] sm:text-3xl">{active.price.toLocaleString('fa-IR')} <span className="font-sans text-xs font-medium">تومان</span></p>
              </div>
              <button type="button" onClick={() => onSelect(active)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ba8d3d] px-5 text-sm font-bold text-[#17130c] transition hover:bg-[#d5ad65] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#eed29d] focus-visible:ring-offset-2 focus-visible:ring-offset-[#151312]"><ShoppingBag size={16}/> مشاهده محصول</button>
            </div>
            {products.length > 1 && <div className="mt-7 flex items-center justify-between gap-3">
              <div role="group" className="flex items-center gap-0" aria-label={`انتخاب پیشنهاد ${activeIndex + 1} از ${products.length}`}>
                {products.map((product, index) => <button key={product.id} type="button" aria-label={`نمایش پیشنهاد ${index + 1}`} aria-current={index === activeIndex ? 'true' : undefined} onClick={() => setActiveIndex(index)} className="flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"><span aria-hidden="true" className={`block h-2 rounded-full transition-[width,background-color] duration-150 motion-reduce:transition-none ${index === activeIndex ? 'w-7 bg-[#ba8d3d]' : 'w-2 bg-white/30'}`}/></button>)}</div>
              <div className="flex gap-2 sm:hidden"><button type="button" aria-label="محصول قبلی" onClick={() => move(-1)} className={`flex h-11 w-11 items-center justify-center rounded-full border transition-transform duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${isDark ? 'border-white/10 text-stone-300' : 'border-slate-300 text-slate-700'}`}><ArrowRight size={16}/></button><button type="button" aria-label="محصول بعدی" onClick={() => move(1)} className={`flex h-11 w-11 items-center justify-center rounded-full border transition-transform duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${isDark ? 'border-white/10 text-stone-300' : 'border-slate-300 text-slate-700'}`}><ArrowLeft size={16}/></button></div>
            </div>}
          </div>
        </motion.article>
      </AnimatePresence>
    </div> : <div role={isLoading ? 'status' : error ? 'alert' : undefined} className={`flex min-h-[290px] flex-col items-center justify-center rounded-[1.75rem] border border-dashed px-6 text-center sm:min-h-[380px] ${isDark ? 'border-white/15 bg-[#141211] text-stone-200' : 'border-slate-300 bg-white text-slate-900'}`}>
      {isLoading ? <LoaderCircle size={28} aria-hidden="true" className="animate-spin motion-reduce:animate-none text-[var(--text-accent)]"/> : error ? <BadgePercent size={28} aria-hidden="true" className="text-rose-500"/> : <BadgePercent size={28} aria-hidden="true" className={isDark ? 'text-[#ba8d3d]' : 'text-[var(--text-accent)]'}/>}
      <h2 className={`mt-4 text-base font-semibold ${isDark ? 'text-stone-200' : 'text-slate-900'}`}>{isLoading ? 'در حال دریافت پیشنهادها…' : error ? 'دریافت پیشنهادها انجام نشد' : 'فعلاً محصول تخفیف‌داری ثبت نشده است'}</h2>
      <p className={`mt-2 max-w-sm text-sm leading-6 ${isDark ? 'text-stone-400' : 'text-slate-600'}`}>{isLoading ? 'پیشنهادهای فروشگاه تا لحظاتی دیگر نمایش داده می‌شوند.' : error ? 'اتصال را بررسی کنید و دوباره تلاش کنید.' : 'پیشنهادهای ویژه پس از ثبت تخفیف روی محصولات، در همین بخش نمایش داده می‌شوند.'}</p>
      {!isLoading && (error ? <button type="button" onClick={onRetry} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#ba8d3d] px-5 text-sm font-bold text-[#17130c] transition-transform duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]">تلاش دوباره</button> : <button type="button" onClick={onBrowseCatalog} className={`mt-5 inline-flex min-h-11 items-center justify-center rounded-full border px-5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] ${isDark ? 'border-white/15 text-stone-100 hover:bg-white/5' : 'border-slate-300 text-slate-800 hover:bg-slate-100'}`}>مشاهده همه محصولات</button>)}
    </div>}
  </section>;
};
