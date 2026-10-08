import React from 'react';
import { ArrowUpLeft, Layers3, PenTool, ShieldOff } from 'lucide-react';
import { motion } from 'motion/react';

interface BentoShowcaseProps {
  theme?: 'light' | 'dark';
  categories: { slug: string; nameFa: string }[];
  productCount: number;
  onStartDesign: () => void;
  onSelectCategory: (category: 'all' | 'minimalist' | 'calligraphy' | 'graphic' | 'pod') => void;
}

export default function BentoShowcase({ theme = 'dark', categories, productCount, onStartDesign, onSelectCategory }: BentoShowcaseProps) {
  const isDark = theme === 'dark';
  const panel = isDark ? 'border-white/10 bg-[#141211]' : 'border-slate-200 bg-white';
  const heading = isDark ? 'text-white' : 'text-slate-900';
  const muted = isDark ? 'text-stone-400' : 'text-slate-600';
  const catalogGroups = categories.filter((category) => ['calligraphy', 'graphic', 'minimalist'].includes(category.slug));

  return <section id="exhibition-story" className={`relative overflow-hidden px-5 py-20 md:px-12 md:py-28 ${isDark ? 'bg-[#0a0a09]' : 'bg-[#faf9f6]'}`}>
    <div className="mx-auto max-w-7xl">
      <motion.header initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mb-12 text-right">
        <span className="text-xs tracking-[0.16em] text-[#ba8d3d]">از کاتالوگ تا پیش‌نمایش</span>
        <h2 className={`mt-3 text-3xl font-semibold md:text-5xl ${heading}`}>فروشگاه در یک نگاه</h2>
        <p className={`mt-4 max-w-2xl text-sm leading-7 ${muted}`}>اطلاعات محصولات از کاتالوگ زنده می‌آید. بخش‌های ثبت سفارش و طراحی سفارشی تا تکمیل سرویس‌های لازم محدود هستند.</p>
      </motion.header>

      <div className="grid gap-4 lg:grid-cols-12">
        <article className={`rounded-3xl border p-6 md:p-8 lg:col-span-7 ${panel}`}>
          <div className="flex items-start justify-between gap-4"><span className="rounded-2xl bg-[#ba8d3d]/10 p-3 text-[#eed29d]"><Layers3 size={22}/></span><span className={`text-xs ${muted}`}>{productCount.toLocaleString('fa-IR')} محصول ثبت‌شده</span></div>
          <h3 className={`mt-8 text-xl font-semibold ${heading}`}>دسته‌بندی محصولات</h3>
          <div className="mt-5 flex flex-wrap gap-2">{catalogGroups.map((category) => <button key={category.slug} onClick={() => onSelectCategory(category.slug as 'calligraphy' | 'graphic' | 'minimalist')} className={`rounded-full border px-4 py-2 text-sm transition hover:border-[#ba8d3d] ${isDark ? 'border-white/10 text-stone-200' : 'border-slate-200 text-slate-700'}`}>{category.nameFa}</button>)}<button onClick={() => onSelectCategory('all')} className="rounded-full border border-[#ba8d3d]/40 px-4 py-2 text-sm text-[#ba8d3d]">همه محصولات</button></div>
          <p className={`mt-5 text-xs leading-6 ${muted}`}>موجودی و مشخصات هر تنوع از سامانه خوانده می‌شود؛ محصولی که تصویر ثبت‌شده ندارد با جایگزین عمومی نمایش داده می‌شود.</p>
        </article>

        <article className={`rounded-3xl border p-6 md:p-8 lg:col-span-5 ${panel}`}>
          <span className="inline-flex rounded-2xl bg-[#ba8d3d]/10 p-3 text-[#eed29d]"><PenTool size={22}/></span>
          <h3 className={`mt-8 text-xl font-semibold ${heading}`}>پیش‌نمایش متن روی لباس</h3>
          <p className={`mt-3 text-sm leading-7 ${muted}`}>یک تنوع ثبت‌شده انتخاب کنید و جای‌گیری متن را ببینید. طرح ذخیره نمی‌شود و سفارش سفارشی از این صفحه ثبت نخواهد شد.</p>
          <button onClick={onStartDesign} className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#ba8d3d] px-5 py-3 text-sm font-semibold text-[#0e0d0c]">بازکردن پیش‌نمایش <ArrowUpLeft size={16}/></button>
        </article>

        <div className={`flex items-center gap-4 rounded-2xl border p-5 lg:col-span-12 ${isDark ? 'border-amber-500/20 bg-amber-500/[0.04]' : 'border-amber-700/20 bg-amber-500/[0.04]'}`}>
          <ShieldOff size={20} className="shrink-0 text-amber-400"/><p className={`text-sm leading-6 ${muted}`}>درگاه پرداخت فعال نیست؛ هیچ پرداخت یا خرید تکمیل‌شده‌ای در این نسخه نمایش داده نمی‌شود.</p>
        </div>
      </div>
    </div>
  </section>;
}
