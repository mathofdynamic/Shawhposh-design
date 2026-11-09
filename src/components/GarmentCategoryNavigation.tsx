import React from 'react';
import { ArrowUpLeft } from 'lucide-react';
import type { GarmentType } from '../types';

const categories: Array<{ id: GarmentType; label: string }> = [
  { id: 'hoodie', label: 'هودی' },
  { id: 'dors', label: 'دورس' },
  { id: 'tshirt', label: 'تیشرت' },
  { id: 'sweatshirt', label: 'سویشرت' },
  { id: 'halfzip', label: 'نیم‌زیپ' },
  { id: 'pants', label: 'شلوار' },
];

interface GarmentCategoryNavigationProps {
  isDark: boolean;
  onSelect: (category: GarmentType) => void;
}

export const GarmentCategoryNavigation: React.FC<GarmentCategoryNavigationProps> = ({ isDark, onSelect }) => (
  <nav aria-label="دسته‌بندی پوشاک" dir="rtl" className="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 md:pt-28 lg:px-8">
    <div className={`flex flex-col gap-2 border-y py-3 md:flex-row md:items-center md:justify-between md:gap-4 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
      <p className={`shrink-0 text-right text-xs font-semibold tracking-wide ${isDark ? 'text-stone-400' : 'text-slate-600'}`}>دسته‌بندی پوشاک</p>
      <div className="grid grid-cols-3 gap-1 md:min-w-0 md:flex-1 md:grid-cols-6 md:justify-end md:gap-2">
        {categories.map(category => <button key={category.id} type="button" onClick={() => onSelect(category.id)} style={{ outlineColor: 'var(--focus-ring)' }} className={`group inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:gap-2 md:px-1 ${isDark ? 'text-stone-300 hover:bg-white/[0.05] hover:text-[#eed29d]' : 'text-slate-700 hover:bg-black/[0.04] hover:text-[var(--text-accent)]'}`}>
          <span>{category.label}</span>
          <ArrowUpLeft aria-hidden="true" size={12} className="-translate-x-1 opacity-0 transition group-hover:translate-x-0 group-hover:opacity-100" />
        </button>)}
      </div>
    </div>
  </nav>
);
