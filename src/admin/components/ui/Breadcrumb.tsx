import React from 'react';
import { ChevronLeft, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
  isCurrent?: boolean;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  onHomeClick?: () => void;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, className = '', onHomeClick }) => {
  return (
    <nav aria-label="مسیر راهنمای بخش ادمین" className={`flex items-center text-xs text-gray-400 ${className}`}>
      <ol className="flex items-center gap-1.5 flex-wrap">
        <li>
          <button
            type="button"
            onClick={onHomeClick}
            aria-label="داشبورد مدیریت"
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ba8d3d] p-0.5 rounded"
          >
            <Home size={13} />
            <span className="hidden sm:inline">مدیریت</span>
          </button>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1 || item.isCurrent;
          return (
            <React.Fragment key={index}>
              <li aria-hidden="true" className="text-gray-600">
                <ChevronLeft size={13} />
              </li>
              <li>
                {isLast ? (
                  <span aria-current="page" className="text-white font-semibold">
                    {item.label}
                  </span>
                ) : item.onClick ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#ba8d3d] p-0.5 rounded"
                  >
                    {item.label}
                  </button>
                ) : (
                  <span>{item.label}</span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};
