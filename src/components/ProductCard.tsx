import React, { useState } from 'react';
import { Shirt, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { persianSize } from '../lib/persian-labels';
import { handleProductImageError, PRODUCT_IMAGE_FALLBACK } from '../lib/productImage';

interface ProductCardProps {
  key?: string;
  theme?: 'light' | 'dark';
  product: Product;
  onSelect: (product: Product) => void;
}

export default function ProductCard({ theme = 'dark', product, onSelect }: ProductCardProps) {
  const isDark = theme === 'dark';
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Format price in Toman with thousand separator
  const formattedPrice = product.price.toLocaleString('fa-IR');

  const navigateImage = (direction: 'prev' | 'next', e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.images.length <= 1) return;
    
    if (direction === 'next') {
      setCurrentImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
    } else {
      setCurrentImageIndex((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
    }
  };

  return (
    <div 
      onClick={() => onSelect(product)}
      className={`relative cursor-pointer group rounded-[2.25rem] p-5 border backdrop-blur-xl transition-[border-color,box-shadow] duration-200 flex flex-col justify-between min-h-[460px] ${
        isDark 
          ? 'bg-[#151312]/60 border-white/[0.08] hover:border-[#ba8d3d]/30 shadow-[0_25px_50px_-15px_rgba(0,0,0,0.35)]' 
          : 'bg-white/70 border-slate-200/50 shadow-[0_15px_30px_rgba(0,0,0,0.02)] hover:border-[#ba8d3d]/30 hover:shadow-[0_25px_45px_rgba(0,0,0,0.05)]'
      }`}
    >
      {/* 1. Header Row (Tags + Sizes) */}
      <div className="flex justify-between items-center z-10 w-full mb-3">
        <div className="flex gap-1.5 flex-wrap">
        </div>

        {/* Sizes Badge Indicators */}
        <div className="flex gap-1">
          {product.sizes.slice(0, 3).map((size) => (
              <span key={size} className={`product-size-badge min-h-7 min-w-10 px-1 rounded border text-xs font-sans flex items-center justify-center transition-colors ${
              isDark 
                ? 'bg-[#0e0d0c]/70 border-white/5 text-gray-400' 
                : 'bg-[#fafafa]/80 border-slate-200/60 text-slate-500'
            }`}>
              {persianSize(size)}
            </span>
          ))}
          {product.sizes.length > 3 && (
            <span className={`min-h-7 min-w-7 rounded border text-xs font-mono flex items-center justify-center transition-colors ${
              isDark 
                ? 'bg-[#0e0d0c]/70 border-white/5 text-gray-400' 
                : 'bg-[#fafafa]/80 border-slate-200/60 text-slate-500'
            }`}>
              +
            </span>
          )}
        </div>
      </div>

      {/* 2. Image Area (Fully transparent background with ambient golden/yellow glow underlying it) */}
      <div className="relative w-full aspect-square flex items-center justify-center overflow-hidden mb-4">
        {/* Ambient background glow under model */}
        <div className={`absolute w-36 h-36 rounded-full filter blur-3xl transition-colors duration-150 motion-reduce:transition-none ${
          isDark ? 'bg-[#ba8d3d]/5 group-hover:bg-[#ba8d3d]/12' : 'bg-[#ba8d3d]/8 group-hover:bg-[#ba8d3d]/15'
        }`}></div>

        {/* Carousel controls stay available on touch and reveal on desktop hover or focus. */}
        {product.images.length > 1 && (
          <>
            <button 
              onClick={(e) => navigateImage('prev', e)}
              className="absolute left-2 z-20 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/65 text-white transition-[background-color,color,transform] duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 hover:bg-[#ba8d3d] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              aria-label="تصویر قبلی"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={(e) => navigateImage('next', e)}
              className="absolute right-2 z-20 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-black/65 text-white transition-[background-color,color,transform] duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 hover:bg-[#ba8d3d] hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
              aria-label="تصویر بعدی"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Transparent product images with smooth crossfade */}
        {product.images.map((img, index) => (
          <img 
            key={`${img}-${index}`}
            src={img} 
            alt={img === PRODUCT_IMAGE_FALLBACK ? `تصویر واقعی ${product.name} ثبت نشده است` : `${product.name}، تصویر ${index + 1}`}
            aria-hidden={index !== currentImageIndex}
            referrerPolicy="no-referrer"
            onError={handleProductImageError}
            className={`product-media-source absolute w-44 h-44 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition-opacity duration-150 ease-out motion-reduce:transition-none ${
              index === currentImageIndex 
                ? 'opacity-100'
                : 'opacity-0 pointer-events-none'
            }`}
          />
        ))}
        {product.images.length === 0 && (
          <div role="img" aria-label={`تصویر برای ${product.name} ثبت نشده است`} className="relative z-10 flex h-36 w-36 items-center justify-center rounded-full border border-white/10 bg-black/10 text-stone-500">
            <Shirt size={44} strokeWidth={1} />
          </div>
        )}

        {/* Slideshow index dots (only relevant when multiple images exist) */}
        {product.images.length > 1 && (
          <div className="absolute bottom-0 left-1/2 z-20 flex -translate-x-1/2 gap-0.5">
            {product.images.map((_, index) => (
                <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                aria-label={`نمایش تصویر ${(index + 1).toLocaleString('fa-IR')}`}
                aria-pressed={index === currentImageIndex}
                className="flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
                type="button"
              >
                <span aria-hidden="true" className={`block h-1.5 rounded-full transition-[width,background-color] duration-150 motion-reduce:transition-none ${
                  index === currentImageIndex
                    ? 'w-3.5 bg-[#ba8d3d]'
                    : isDark ? 'w-1.5 bg-white/35 hover:bg-white/70' : 'w-1.5 bg-black/35 hover:bg-black/70'
                }`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Bottom Color Chips */}
      <div className="flex gap-1.5 items-center mb-3">
        {product.colors.map((color) => (
          <span 
            key={color.name}
            className={`w-2.5 h-2.5 rounded-full border ${isDark ? 'border-white/10' : 'border-slate-300'}`}
            style={{ backgroundColor: color.hex }}
            title={color.name}
          />
        ))}
      </div>

      {/* 4. Product Info & Deluxe Readable Price Aligned Nicely */}
      <div className="flex justify-between items-start gap-2 pt-2 border-t border-slate-100/10 dark:border-white/[0.04]">
        <div className="flex flex-col items-start text-right">
          <h3 className="text-sm font-bold tracking-tight">
            <button type="button" onClick={(event) => { event.stopPropagation(); onSelect(product); }} className={`rounded-sm text-right transition-colors duration-150 hover:text-[var(--text-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus-ring)] ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {product.name}
            </button>
          </h3>
        </div>

        {/* Fully Readable Prominent Price Aligned Left */}
        <div className="flex flex-col items-end min-w-[85px] shrink-0">
          <span className={`font-mono text-lg md:text-xl font-black tracking-tight leading-none ${
            isDark ? 'text-[#eed29d]' : 'text-[var(--text-accent)]'
          }`}>
            {formattedPrice}
          </span>
          <span className={`text-[8.5px] md:text-[9.5px] tracking-wider font-sans mt-1 ${
            isDark ? 'text-gray-400' : 'text-slate-500'
          }`}>
            تومان
          </span>
        </div>
      </div>
    </div>
  );
}
