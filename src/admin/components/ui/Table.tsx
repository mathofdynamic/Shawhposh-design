import React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export type TableDensity = 'compact' | 'normal';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  align?: 'right' | 'left' | 'center';
  width?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface TableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  density?: TableDensity;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnKey: string) => void;
  selectedIds?: string[];
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  density = 'normal',
  sortColumn,
  sortDirection,
  onSort,
  selectedIds,
  onSelectRow,
  onSelectAll,
  isLoading = false,
  emptyMessage = 'هیچ موردی جهت نمایش یافت نشد.',
  onRowClick,
}: TableProps<T>) {
  const isAllSelected = selectedIds && data.length > 0 && data.every((row, i) => selectedIds.includes(keyExtractor(row, i)));
  const isIndeterminate = selectedIds && selectedIds.length > 0 && !isAllSelected;

  const rowPadding = density === 'compact' ? 'py-2.5 px-3.5 text-xs' : 'py-3.5 px-4 text-xs md:text-sm';
  const headerPadding = density === 'compact' ? 'py-2.5 px-3.5 text-xs' : 'py-3 px-4 text-xs';

  return (
    <div className="w-full overflow-hidden border border-white/10 rounded-2xl bg-[#131211]">
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse select-text">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              {onSelectAll && (
                <th scope="col" className={`w-10 text-center ${headerPadding}`}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = Boolean(isIndeterminate);
                    }}
                    onChange={onSelectAll}
                    aria-label="انتخاب همه ردیف‌ها"
                    className="w-4 h-4 rounded bg-white/5 border-white/20 text-[#ba8d3d] focus:ring-[#ba8d3d] cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sortColumn === col.key;
                const alignClass =
                  col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right';

                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width }}
                    className={`font-semibold text-gray-300 ${alignClass} ${headerPadding}`}
                  >
                    {col.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer group"
                      >
                        <span>{col.header}</span>
                        <span className="text-gray-500 group-hover:text-gray-300">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp size={13} className="text-[#eed29d]" />
                            ) : (
                              <ArrowDown size={13} className="text-[#eed29d]" />
                            )
                          ) : (
                            <ArrowUpDown size={13} />
                          )}
                        </span>
                      </button>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx}>
                  {onSelectAll && (
                    <td className={`text-center ${rowPadding}`}>
                      <div className="w-4 h-4 mx-auto bg-white/10 rounded animate-pulse" />
                    </td>
                  )}
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={rowPadding}>
                      <div className="h-4 bg-white/10 rounded animate-pulse" style={{ width: `${60 + (cIdx * 15) % 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (onSelectAll ? 1 : 0)}
                  className="py-12 text-center text-gray-500 text-xs md:text-sm font-sans"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => {
                const rowKey = keyExtractor(row, idx);
                const isSelected = selectedIds?.includes(rowKey);

                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick?.(row)}
                    className={`transition-colors hover:bg-white/[0.03] ${
                      isSelected ? 'bg-white/[0.05]' : ''
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {onSelectRow && (
                      <td
                        className={`text-center ${rowPadding}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow(rowKey)}
                          aria-label={`انتخاب ردیف ${rowKey}`}
                          className="w-4 h-4 rounded bg-white/5 border-white/20 text-[#ba8d3d] focus:ring-[#ba8d3d] cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'left' ? 'text-left' : col.align === 'center' ? 'text-center' : 'text-right';

                      return (
                        <td key={col.key} className={`text-gray-300 font-sans ${alignClass} ${rowPadding}`}>
                          {col.render ? col.render(row, idx) : (row as any)[col.key]}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
