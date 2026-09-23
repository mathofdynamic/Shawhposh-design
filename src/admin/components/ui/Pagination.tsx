import React from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { toFaDigits } from '../../utils/formatters';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className = '',
}) => {
  if (totalItems === 0) return null;

  const startItem = Math.min((currentPage - 1) * pageSize + 1, totalItems);
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // In RTL, "Next" page advances left (ChevronLeft), "Prev" page moves right (ChevronRight)
  return (
    <div
      className={`w-full flex flex-col sm:flex-row items-center justify-between gap-4 py-3 text-xs text-gray-400 font-sans ${className}`}
    >
      {/* Count summary */}
      <div className="flex items-center gap-3">
        <span className="font-fanum">
          نمایش <strong className="text-white font-semibold">{toFaDigits(startItem)}</strong> تا{' '}
          <strong className="text-white font-semibold">{toFaDigits(endItem)}</strong> از{' '}
          <strong className="text-white font-semibold">{toFaDigits(totalItems)}</strong> مورد
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 mr-2 pr-2 border-r border-white/10">
            <span className="text-[11px] text-gray-500">در هر صفحه:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="تعداد ردیف در صفحه"
              className="bg-[#181716] border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-200 focus:ring-1 focus:ring-[#ba8d3d] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {toFaDigits(opt)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <nav aria-label="ناوبری صفحات" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="صفحه قبلی"
          className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight size={15} />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((page, idx, arr) => {
            const prev = arr[idx - 1];
            const isEllipsis = prev && page - prev > 1;
            const isActive = page === currentPage;

            return (
              <React.Fragment key={page}>
                {isEllipsis && <span className="px-1 text-gray-600">...</span>}
                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-8 h-8 rounded-lg font-fanum font-medium text-xs transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#ba8d3d] text-[#0e0d0c] font-bold shadow-sm'
                      : 'border border-white/10 text-gray-300 hover:bg-white/5'
                  }`}
                >
                  {toFaDigits(page)}
                </button>
              </React.Fragment>
            );
          })}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="صفحه بعدی"
          className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft size={15} />
        </button>
      </nav>
    </div>
  );
};
