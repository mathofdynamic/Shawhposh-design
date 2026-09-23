import React from 'react';
import { toFaDigits } from '../../utils/formatters';

export interface ToolbarProps {
  children?: React.ReactNode;
  selectedCount?: number;
  onClearSelection?: () => void;
  batchActions?: React.ReactNode;
  primaryAction?: React.ReactNode;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  children,
  selectedCount = 0,
  onClearSelection,
  batchActions,
  primaryAction,
}) => {
  return (
    <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-[#131211] border border-white/10 rounded-2xl">
      {selectedCount > 0 ? (
        <div className="flex items-center justify-between w-full bg-[#ba8d3d]/10 border border-[#ba8d3d]/25 rounded-xl px-4 py-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-[#eed29d] font-fanum">
              {toFaDigits(selectedCount)} مورد انتخاب شده است
            </span>
            {onClearSelection && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-gray-400 hover:text-white underline cursor-pointer"
              >
                لغو انتخاب
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">{batchActions}</div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 flex-1">{children}</div>
          {primaryAction && <div className="flex items-center gap-2 shrink-0">{primaryAction}</div>}
        </>
      )}
    </div>
  );
};
