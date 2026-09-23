import React, { useState } from 'react';
import { Database, Search, ShieldAlert, Code, Copy, Check } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, SearchInput, Badge } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { toFaDigits } from '../../utils/formatters';

type EntityCollection = 'orders' | 'variants' | 'customers' | 'payments' | 'customDesigns' | 'activities';

export const DataExplorerPage: React.FC = () => {
  const { state } = useAdminRepository();
  const [activeCollection, setActiveCollection] = useState<EntityCollection>('orders');
  const [filterQuery, setFilterQuery] = useState('');
  const [copied, setCopied] = useState(false);

  const collections: { id: EntityCollection; label: string; count: number }[] = [
    { id: 'orders', label: 'سفارش‌ها (Orders)', count: state.orders.length },
    { id: 'variants', label: 'تنوع‌ها (Variants)', count: state.variants.length },
    { id: 'customers', label: 'مشتریان (Customers)', count: state.customers.length },
    { id: 'payments', label: 'تراکنش‌ها (Payments)', count: state.payments.length },
    { id: 'customDesigns', label: 'طرح‌های آتلیه (Designs)', count: state.customDesigns.length },
    { id: 'activities', label: 'دفتر لاگ‌ها (Logs)', count: state.activities.length },
  ];

  const currentData = state[activeCollection] as any[];
  const filteredData = currentData.filter((item) => {
    if (!filterQuery) return true;
    return JSON.stringify(item).toLowerCase().includes(filterQuery.toLowerCase());
  });

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(filteredData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="کاوشگر پایگاه‌داده (Restricted Data Explorer)"
        description="محیط فقط‌خواندنی جهت دیباگ فنی و بازرسی ساختار JSON جداول دامنه توسط توسعه‌دهنده یا مدیر ارشد سیستم."
        actions={
          <Button variant="secondary" size="sm" onClick={handleCopyJson}>
            {copied ? <Check size={13} className="ml-1 text-emerald-400" /> : <Copy size={13} className="ml-1" />}
            {copied ? 'کپی شد!' : 'کپی خروجی JSON'}
          </Button>
        }
      />

      {/* Read-only warning */}
      <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-stone-300">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-[#ba8d3d] shrink-0" />
          <span>
            <strong>سطح دسترسی: فقط خواندنی (Read-Only)</strong> — هیچ تغییری به طور مستقیم از طریق این مرورگر در پایگاه داده اعمال نمی‌گردد.
          </span>
        </div>
        <Badge label="READ ONLY" variant="default" size="sm" />
      </div>

      {/* Collection tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {collections.map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => {
              setActiveCollection(col.id);
              setFilterQuery('');
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
              activeCollection === col.id
                ? 'bg-[#ba8d3d] text-stone-950 font-bold'
                : 'text-stone-400 hover:text-white bg-white/5'
            }`}
          >
            <span>{col.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeCollection === col.id ? 'bg-black/20 text-stone-950' : 'bg-white/10 text-stone-400'
              }`}
            >
              {toFaDigits(col.count)}
            </span>
          </button>
        ))}
      </div>

      {/* Filter search */}
      <div className="bg-[#131211] p-3 rounded-2xl border border-white/10 flex items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="فیلتر در ویژگی‌ها، شناسه‌ها یا مقادیر JSON..."
          />
        </div>
        <div className="text-xs text-stone-400 font-fanum">
          نمایش {toFaDigits(filteredData.length)} از {toFaDigits(currentData.length)} رکورد
        </div>
      </div>

      {/* Code Inspector Block */}
      <div className="bg-[#0c0b0a] border border-white/10 rounded-2xl p-4 font-mono text-xs text-stone-300 max-h-[600px] overflow-auto shadow-inner" dir="ltr">
        <pre className="whitespace-pre text-[11px] leading-relaxed">
          {JSON.stringify(filteredData, null, 2)}
        </pre>
      </div>
    </div>
  );
};
