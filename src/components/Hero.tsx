import React from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Shirt } from 'lucide-react';
import type { Product } from '../types';
import { DotField } from './ui/DotField';

interface HeroProps {
  theme?: 'light' | 'dark';
  products: Product[];
  onStartDesign: () => void;
  onExploreProducts: () => void;
}

export default function Hero({ theme = 'dark', products, onStartDesign, onExploreProducts }: HeroProps) {
  const isDark = theme === 'dark';
  const product = products[0];
  const foreground = isDark ? 'text-white' : 'text-slate-950';
  const muted = isDark ? 'text-stone-400' : 'text-slate-600';

  return <section className={`relative isolate flex min-h-[78vh] items-center overflow-hidden px-5 pb-16 pt-28 transition-colors md:px-12 ${isDark ? 'bg-[#0d0c0b]' : 'bg-[#faf8f5]'}`}>
    <div className="pointer-events-none absolute inset-0 -z-10 opacity-70"><DotField dotRadius={1.5} dotSpacing={18} bulgeStrength={35} glowRadius={130} sparkle={false} waveAmplitude={0} gradientFrom={isDark ? 'rgba(186,141,61,.32)' : 'rgba(186,141,61,.22)'} gradientTo="rgba(186,141,61,.04)" glowColor="rgba(186,141,61,.12)"/></div>
    <div className="mx-auto grid w-full max-w-7xl items-center gap-12 lg:grid-cols-12">
      <div className="text-right lg:col-span-7">
        <span className={`inline-flex rounded-full border px-4 py-2 text-xs ${isDark ? 'border-[#ba8d3d]/30 bg-[#ba8d3d]/10 text-[#eed29d]' : 'border-[#ba8d3d]/25 bg-[#ba8d3d]/5 text-[#8d6628]'}`}>فروشگاه آنلاین شاه‌پوش</span>
        <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className={`mt-7 max-w-3xl text-4xl font-semibold leading-[1.25] tracking-tight sm:text-5xl lg:text-6xl ${foreground}`}>پوشاکی با زبان طراحی ایرانی</motion.h1>
        <p className={`mt-5 max-w-2xl text-sm leading-7 md:text-base ${muted}`}>محصولات، رنگ‌ها، سایزها و قیمت‌های این فروشگاه از کاتالوگ فعلی بارگذاری می‌شوند. جزئیات تولید و پرداخت آنلاین تا زمان اتصال سرویس‌های مربوط، فعال نیست.</p>
        <div className="mt-8 flex flex-wrap justify-start gap-3">
          <button onClick={onExploreProducts} className="inline-flex min-h-12 items-center gap-3 rounded-full bg-[#ba8d3d] px-6 text-sm font-semibold text-[#0e0d0c] transition hover:bg-[#c99c4c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba8d3d]">مشاهده محصولات <ArrowLeft size={16}/></button>
          <button onClick={onStartDesign} className={`min-h-12 rounded-full border px-6 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ba8d3d] ${isDark ? 'border-white/15 text-stone-200 hover:bg-white/5' : 'border-slate-300 text-slate-800 hover:bg-black/5'}`}>پیش‌نمایش طراحی</button>
        </div>
      </div>

      <motion.aside initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.65, delay: 0.1 }} className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-2xl md:p-8 lg:col-span-5 ${isDark ? 'border-white/10 bg-[#151311]' : 'border-slate-200 bg-white'}`}>
        <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-[#ba8d3d]/10 blur-3xl"/>
        <div className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl ${isDark ? 'bg-[#0c0b0a]' : 'bg-[#f2efe8]'}`}><Shirt aria-hidden="true" size={96} strokeWidth={0.8} className="text-[#ba8d3d]"/><span className="absolute bottom-4 right-4 text-[10px] uppercase tracking-[0.2em] text-stone-500">Shawhposh</span></div>
        <div className="relative mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0"><p className={`text-[10px] uppercase tracking-[0.18em] ${muted}`}>از کاتالوگ فروشگاه</p><h2 className={`mt-2 truncate text-lg font-semibold ${foreground}`}>{product?.name ?? 'محصولات فروشگاه'}</h2><p className={`mt-2 line-clamp-2 text-xs leading-6 ${muted}`}>{product?.description ?? 'در حال دریافت فهرست محصولات.'}</p></div>
          {product && <strong className="shrink-0 text-sm text-[#ba8d3d]">{product.price.toLocaleString('fa-IR')} تومان</strong>}
        </div>
        <div className={`relative mt-5 flex items-center justify-between border-t pt-4 text-xs ${isDark ? 'border-white/10 text-stone-400' : 'border-slate-200 text-slate-500'}`}><span>{product ? `${product.variants?.length ?? 0} ترکیب رنگ و سایز` : 'کاتالوگ زنده'}</span><button onClick={onExploreProducts} className="font-medium text-[#ba8d3d] hover:underline">رفتن به فروشگاه</button></div>
      </motion.aside>
    </div>
  </section>;
}
