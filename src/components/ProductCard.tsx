import React, { useState, useEffect } from 'react';
import { Shirt, ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../types';
import { handleProductImageError } from '../lib/productImage';

interface ProductCardProps {
  key?: string;
  theme?: 'light' | 'dark';
  product: Product;
  onSelect: (product: Product) => void;
}

export default function ProductCard({ theme = 'dark', product, onSelect }: ProductCardProps) {
  const isDark = theme === 'dark';
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  
  // Format price in Toman with thousand separator
  const formattedPrice = product.price.toLocaleString('fa-IR');

  // Automatic slideshow on hover
  useEffect(() => {
    if (!isHovered || product.images.length <= 1) {
      if (!isHovered) {
        setCurrentImageIndex(0);
      }
      return;
    }

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
    }, 1200);

    return () => clearInterval(interval);
  }, [isHovered, product.images.length]);

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative cursor-pointer group rounded-[2.25rem] p-5 border backdrop-blur-xl transition-all duration-500 flex flex-col justify-between min-h-[460px] ${
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
            <span key={size} className={`w-5 h-5 rounded border text-[8px] font-mono flex items-center justify-center transition-colors ${
              isDark 
                ? 'bg-[#0e0d0c]/70 border-white/5 text-gray-400' 
                : 'bg-[#fafafa]/80 border-slate-200/60 text-slate-500'
            }`}>
              {size}
            </span>
          ))}
          {product.sizes.length > 3 && (
            <span className={`w-5 h-5 rounded border text-[8px] font-mono flex items-center justify-center transition-colors ${
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
        <div className={`absolute w-36 h-36 rounded-full filter blur-3xl transition-all duration-500 ${
          isDark ? 'bg-[#ba8d3d]/5 group-hover:bg-[#ba8d3d]/12' : 'bg-[#ba8d3d]/8 group-hover:bg-[#ba8d3d]/15'
        }`}></div>

        {/* Carousel Prev/Next Buttons (only show when multiple images exist and hovered) */}
        {product.images.length > 1 && (
          <>
            <button 
              onClick={(e) => navigateImage('prev', e)}
              className="absolute left-2 z-20 w-8 h-8 rounded-full flex items-center justify-center bg-black/45 hover:bg-[#ba8d3d] text-white hover:text-black backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-1 hover:translate-x-0"
              aria-label="Previous image"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={(e) => navigateImage('next', e)}
              className="absolute right-2 z-20 w-8 h-8 rounded-full flex items-center justify-center bg-black/45 hover:bg-[#ba8d3d] text-white hover:text-black backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-1 hover:translate-x-0"
              aria-label="Next image"
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
            alt={`${product.name} - ${index + 1}`}
            referrerPolicy="no-referrer"
            onError={handleProductImageError}
            className={`product-media-source absolute w-44 h-44 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)] transition-all duration-500 ease-out transform ${
              index === currentImageIndex 
                ? 'opacity-100 scale-100 group-hover:scale-105' 
                : 'opacity-0 scale-95 pointer-events-none'
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
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-20">
            {product.images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-all duration-350 ${
                  index === currentImageIndex 
                    ? 'bg-[#ba8d3d] w-3.5' 
                    : isDark ? 'bg-white/20 hover:bg-white/50' : 'bg-black/15 hover:bg-black/45'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
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
          <h4 className={`text-sm font-bold tracking-tight transition-colors duration-300 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            {product.name}
          </h4>
        </div>

        {/* Fully Readable Prominent Price Aligned Left */}
        <div className="flex flex-col items-end min-w-[85px] shrink-0">
          <span className={`font-mono text-lg md:text-xl font-black tracking-tight leading-none ${
            isDark ? 'text-[#eed29d]' : 'text-[#ba8d3d]'
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
