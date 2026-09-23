import React from 'react';
import { Printer, Flame, CheckCircle, Cpu, Clock, AlertCircle } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button } from '../../components/ui';
import { toFaDigits } from '../../utils/formatters';

export const ProductionPage: React.FC = () => {
  const printers = [
    {
      id: 'DTG-PRN-01',
      model: 'Brother GTXpro Bulk Direct-to-Garment',
      status: 'printing',
      currentJob: 'سفارش ORD-003 · تیشرت اورسایز مشکی',
      temperatureC: 165,
      whiteInkLevel: 84,
      colorInkLevel: 92,
      operator: 'وحید رضوانی',
    },
    {
      id: 'DTG-PRN-02',
      model: 'Brother GTXpro High-Volume',
      status: 'idle',
      currentJob: 'در صف دریافت آرت‌ورک جدید',
      temperatureC: 160,
      whiteInkLevel: 71,
      colorInkLevel: 79,
      operator: 'سهراب زارع',
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="خط تولید و پرینترهای مستقیم نساجی (DTG)"
        description="مانیتورینگ بلادرنگ دستگاه‌های چاپ صنعتی Brother GTX، وضعیت نازل‌ها، دمای پرس کانوایر و سطوح جوهر سفید نساجی."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {printers.map((prn) => (
          <div
            key={prn.id}
            className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-[#ba8d3d]" />
                  <span className="text-sm font-bold text-white">{prn.model}</span>
                </div>
                <span className="text-[10px] text-stone-400 font-mono block mt-0.5">{prn.id}</span>
              </div>
              <Badge
                label={prn.status === 'printing' ? 'در حال چاپ فعال' : 'آماده به کار'}
                variant={prn.status === 'printing' ? 'warning' : 'success'}
                size="sm"
              />
            </div>

            <div className="p-3 bg-stone-900 rounded-xl border border-white/5 space-y-1">
              <span className="text-[10px] text-stone-400 block">سفارش در حال اجرا:</span>
              <div className="text-xs font-bold text-white">{prn.currentJob}</div>
              <div className="text-[10px] text-stone-400">اپراتور مسئول: {prn.operator}</div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs font-fanum">
              <div className="p-2.5 bg-white/5 rounded-xl text-center">
                <span className="text-[10px] text-stone-400 block">دمای پرس کانوایر</span>
                <strong className="text-white text-xs mt-0.5 block">{toFaDigits(prn.temperatureC)} °C</strong>
              </div>
              <div className="p-2.5 bg-white/5 rounded-xl text-center">
                <span className="text-[10px] text-stone-400 block">سطح جوهر سفید</span>
                <strong className="text-emerald-400 text-xs mt-0.5 block">{toFaDigits(prn.whiteInkLevel)}٪</strong>
              </div>
              <div className="p-2.5 bg-white/5 rounded-xl text-center">
                <span className="text-[10px] text-stone-400 block">سطح CMYK</span>
                <strong className="text-emerald-400 text-xs mt-0.5 block">{toFaDigits(prn.colorInkLevel)}٪</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
