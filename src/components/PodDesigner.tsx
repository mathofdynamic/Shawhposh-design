import React, { useMemo, useState } from 'react';
import { Shirt } from 'lucide-react';
import type { Product } from '../types';

interface PodDesignerProps {
  theme?: 'light' | 'dark';
  products: Product[];
  initialProduct?: Product | null;
}

export default function PodDesigner({ theme = 'dark', products, initialProduct }: PodDesignerProps) {
  const isDark = theme === 'dark';
  const [productId, setProductId] = useState(initialProduct?.id ?? '');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [designText, setDesignText] = useState('');
  const [textColor, setTextColor] = useState('#eed29d');
  const product = products.find((item) => item.id === productId) ?? initialProduct ?? null;

  const colors = product?.colors ?? [];
  const sizes = product?.sizes ?? [];
  const activeColor = colors.find((color) => color.hex === selectedColor) ?? colors[0];
  const activeSize = sizes.includes(selectedSize) ? selectedSize : sizes[0];
  const variant = useMemo(() => product?.variants?.find((item) =>
    item.colorHex === (activeColor?.hex ?? '') && item.size === activeSize
  ), [activeColor?.hex, activeSize, product?.variants]);
  const available = variant?.available ?? 0;

  const panel = isDark ? 'border-white/10 bg-[#141312]' : 'border-slate-200 bg-white';
  const text = isDark ? 'text-stone-100' : 'text-slate-900';
  const muted = isDark ? 'text-stone-400' : 'text-slate-600';

  return <section dir="rtl" className={`min-h-[80vh] px-5 pb-20 pt-28 transition-colors md:px-10 ${isDark ? 'bg-[#0e0d0c]' : 'bg-[#fafafa]'}`}>
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="max-w-3xl text-right">
        <p className="mb-3 text-xs tracking-[0.16em] text-[#ba8d3d]">پیش‌نمایش طراحی</p>
        <h1 className={`text-3xl font-semibold md:text-5xl ${text}`}>طراحی روی محصول</h1>
        <p className={`mt-4 max-w-2xl text-sm leading-7 ${muted}`}>این صفحه فقط پیش‌نمایش متن روی محصول را نشان می‌دهد. ذخیره طرح، فایل چاپ و ثبت سفارش هنوز فعال نیست.</p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className={`rounded-3xl border p-5 md:p-8 ${panel}`}>
          {product ? <>
            <div className={`mb-5 flex items-center justify-between gap-3 text-sm ${muted}`}>
              <span>{product.name}</span>
              <span className="rounded-full border border-amber-500/30 px-3 py-1 text-xs text-amber-300">پیش‌نمایش</span>
            </div>
            <div className="relative mx-auto flex aspect-square max-w-[520px] items-center justify-center overflow-hidden rounded-[2rem] bg-black/10">
              <svg viewBox="0 0 100 100" role="img" aria-label="نمای ساده برای پیش‌نمایش متن روی محصول" className="h-[82%] w-[82%] drop-shadow-[0_22px_34px_rgba(0,0,0,.35)]" style={{ color: activeColor?.hex ?? '#777777' }}>
                <path fill="currentColor" d="M20 20 32 12q6 6 18 6t18-6l12 8-2 15-8-1v51H30V34l-8 1z" />
                <path fill="none" stroke="rgba(255,255,255,.13)" strokeWidth=".8" d="M32 12q6 6 18 6t18-6M30 34v51m40-51v51" />
              </svg>
              {designText.trim() && <span className="absolute top-[43%] max-w-[36%] break-words text-center font-display text-2xl font-semibold leading-tight md:text-3xl" style={{ color: textColor }}>{designText}</span>}
            </div>
            <p className={`mt-4 text-center text-xs ${muted}`}>شبیه‌سازی بصری است و اندازه، رنگ چاپ یا نتیجه نهایی را تضمین نمی‌کند.</p>
          </> : <div className={`flex aspect-square flex-col items-center justify-center rounded-[2rem] border border-dashed ${isDark ? 'border-white/15' : 'border-slate-300'}`}><Shirt size={32} className="mb-3 text-[#ba8d3d]"/><p className={muted}>برای شروع یک محصول از فهرست انتخاب کنید.</p></div>}
        </div>

        <div className="space-y-5">
          <section className={`space-y-4 rounded-3xl border p-5 md:p-6 ${panel}`}>
            <label className={`block text-sm font-medium ${text}`}>محصول
              <select value={product?.id ?? ''} onChange={(event) => { setProductId(event.target.value); setSelectedColor(''); setSelectedSize(''); }} className="mt-2 block w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm text-inherit">
                <option value="">انتخاب محصول</option>
                {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            {product && <>
              <div><p className={`mb-2 text-sm font-medium ${text}`}>رنگ‌های ثبت‌شده</p><div className="flex flex-wrap gap-2">{colors.map((color) => <button key={color.hex} type="button" onClick={() => setSelectedColor(color.hex)} aria-label={color.name} aria-pressed={(activeColor?.hex ?? '') === color.hex} title={color.name} className={`h-9 w-9 rounded-full border-2 ${activeColor?.hex === color.hex ? 'border-[#ba8d3d] ring-2 ring-[#ba8d3d]/30' : 'border-white/20'}`} style={{ backgroundColor: color.hex }}/>)}</div><p className={`mt-2 text-xs ${muted}`}>{activeColor?.name ?? '—'}</p></div>
              <div><p className={`mb-2 text-sm font-medium ${text}`}>سایزهای ثبت‌شده</p><div className="flex flex-wrap gap-2">{sizes.map((size) => <button key={size} type="button" aria-pressed={activeSize === size} onClick={() => setSelectedSize(size)} className={`rounded-lg border px-3 py-2 text-xs ${activeSize === size ? 'border-[#ba8d3d] text-[#eed29d]' : 'border-white/10 text-stone-300'}`}>{size}</button>)}</div><p className={`mt-2 text-xs ${available > 0 ? 'text-emerald-300' : 'text-amber-300'}`}>{variant ? `موجودی قابل فروش ثبت‌شده: ${available.toLocaleString('fa-IR')}` : 'این ترکیب رنگ و سایز در کاتالوگ ثبت نشده است.'}</p></div>
            </>}
          </section>

          <section className={`space-y-4 rounded-3xl border p-5 md:p-6 ${panel}`}>
            <label className={`block text-sm font-medium ${text}`}>متن پیش‌نمایش
              <input type="text" dir="auto" maxLength={32} value={designText} onChange={(event) => setDesignText(event.target.value)} placeholder="متن دلخواه" className="mt-2 block w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3 text-sm" />
            </label>
            <div className="flex items-center justify-between gap-3"><label htmlFor="design-text-color" className={`text-sm ${text}`}>رنگ متن در پیش‌نمایش</label><input id="design-text-color" type="color" value={textColor} onChange={(event) => setTextColor(event.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-transparent"/></div>
            <p className={`text-xs leading-6 ${muted}`}>طرح در این نسخه ذخیره نمی‌شود و به سبد خرید اضافه نخواهد شد.</p>
          </section>
        </div>
      </div>
    </div>
  </section>;
}
