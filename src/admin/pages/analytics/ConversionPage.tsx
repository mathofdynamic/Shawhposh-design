import React from 'react';
import { Filter, GitMerge, ShoppingCart, CheckCircle, ArrowDown } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { toFaDigits } from '../../utils/formatters';

export const ConversionPage: React.FC = () => {
  const funnelSteps = [
    { step: '۱. بازدید از صفحه نخست و ویترین کاتالوگ', count: 18360, dropoff: '۴۲٪ ورود به طراح' },
    { step: '۲. باز کردن استودیو و طراح سه‌بعدی تیشرت', count: 7710, dropoff: '۳۸٪ انتخاب الگو' },
    { step: '۳. ویرایش آرت‌ورک، متن نستعلیق یا فونت دلخواه', count: 2930, dropoff: '۵۱٪ افزودن به سبد' },
    { step: '۴. افزودن پوشاک اختصاصی به سبد خرید', count: 1495, dropoff: '۶۹٪ ورود به پرداخت' },
    { step: '۵. انتقال به درگاه شاپرک و تسویه قطعی فاکتور', count: 1032, dropoff: 'موفقیت نهایی' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="قیف تبدیل و رفتار خریدار در طراح آنلاین"
        description="ردیابی مراحل حرکت خریدار از ورود به فروشگاه تا شخصی‌سازی تیشرت، افزودن به سبد و تسویه نهایی بانکی."
      />

      <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-sm font-bold text-white mb-4">مراحل پنج‌گانه قیف تبدیل سفارشات (Funnel Stages)</h2>

        <div className="space-y-3">
          {funnelSteps.map((f, i) => {
            const pct = Math.round((f.count / 18360) * 100);
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{f.step}</span>
                  <div className="flex items-center gap-3 font-fanum">
                    <span className="text-stone-400">{toFaDigits(f.count.toLocaleString())} کاربر</span>
                    <span className="text-[#eed29d] font-bold">({toFaDigits(pct)}٪)</span>
                  </div>
                </div>

                <div className="w-full bg-stone-900 h-3 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-[#ba8d3d] to-[#eed29d] h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
