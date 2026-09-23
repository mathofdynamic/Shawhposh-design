import React from 'react';
import { Award, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { toFaDigits } from '../../utils/formatters';

export const ReportsPage: React.FC = () => {
  const { state } = useAdminRepository();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="ارزیابی عملکرد و گزارش‌های پرسنلی"
        description="سنجش سرعت بررسی فایل‌ها در آتلیه، نرخ خطای چاپ، تعهد زمانی ارسال و راندمان هر شیفت کاری."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">میانگین زمان بررسی فایل در آتلیه</span>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-fanum">
            {toFaDigits(12)} دقیقه
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">هدف کارگاه: زیر ۲۰ دقیقه</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">شاخص خطای چاپ (ضایعات پارچه)</span>
          <div className="text-2xl font-black text-white mt-1 font-fanum">
            {toFaDigits(0.4)}٪
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block">بسیار عالی (استاندارد جهانی: زیر ۲٪)</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">رضایت خریداران از کیفیت چاپ</span>
          <div className="text-2xl font-black text-[#eed29d] mt-1 font-fanum">
            ۹۸.۶٪
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">بر اساس نظرات ثبت‌شده</span>
        </div>
      </div>
    </div>
  );
};
