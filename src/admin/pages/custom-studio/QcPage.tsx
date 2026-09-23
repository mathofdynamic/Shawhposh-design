import React from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, Award, PackageCheck } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button } from '../../components/ui';

export const QcPage: React.FC = () => {
  const qcChecklist = [
    {
      title: 'تست کشش بافت و ثبات چاپ',
      description: 'بررسی عدم ترک‌خوردگی پیگمنت چاپ در کشش تار و پود پارچه',
      passed: true,
    },
    {
      title: 'بررسی یکنواختی پوشش زیرلایه سفید (Pre-treatment)',
      description: 'اطمینان از نبود لکه یا هاله زرد ناشی از حرارت پرس اولیه',
      passed: true,
    },
    {
      title: 'دوخت یقه و الصاق برچسب پارچه‌ای شاه‌پوش',
      description: 'نوار دوزی یقه ضدحساسیت و لیبل ساتن برند با دستور شستشو',
      passed: true,
    },
    {
      title: 'الصاق شناسنامه اصالت شماره‌دار و مهر طلاکوب',
      description: 'کارت گارانتی اصالت کارگاه و شماره سریال یکتای چاپ',
      passed: true,
    },
    {
      title: 'بسته‌بندی در کاغذ پوستی عطری و هاردباکس مشکی',
      description: 'جعبه لوکس هدیه با روبان طلایی بدون چین‌خوردگی',
      passed: true,
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="آزمون کنترل کیفیت نهایی و ثبات شستشو"
        description="چک‌لیست پنج‌مرحله‌ای استاندارد لوکس شاه‌پوش پیش از بسته‌بندی در جعبه مشکی و تحویل به ناوگان ارسال."
      />

      <div className="bg-[#131211] border border-white/10 rounded-2xl p-6">
        <h2 className="text-sm font-bold text-white mb-4">چک‌لیست ۵ گانه بازرسی پوشاک خروجی کارگاه</h2>
        <div className="space-y-3">
          {qcChecklist.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5"
            >
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-bold text-white">{item.title}</div>
                <div className="text-[11px] text-stone-400 mt-0.5">{item.description}</div>
              </div>
              <Badge label="تایید فنی" variant="success" size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
