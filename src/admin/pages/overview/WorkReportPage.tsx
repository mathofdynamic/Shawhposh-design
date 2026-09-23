import React from 'react';
import { FileSpreadsheet, Printer, Users, CheckCircle, Clock, Award } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { toFaDigits } from '../../utils/formatters';

export const WorkReportPage: React.FC = () => {
  const { state } = useAdminRepository();

  const completedTasks = state.tasks.filter((t) => t.status === 'completed');
  const staff = state.staff;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="گزارش شیفت کاری و راندمان کارگاه"
        description="خلاصه آمار عملکرد شیفت‌های صبح و عصر، تیراژ دستگاه‌های چاپ DTG و مصرف جوهر و ملزومات بسته‌بندی."
        actions={
          <Button variant="secondary" size="sm">
            دریافت خروجی اکسل شیفت
          </Button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">تیراژ چاپ شده امروز</span>
          <div className="text-2xl font-black text-white mt-1 font-fanum">
            {toFaDigits(48)} قطعه پوشاک
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block">بدون پرتی و خطای رنگی (۰٪ ضایعات)</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">پرسنل حاضر در شیفت</span>
          <div className="text-2xl font-black text-white mt-1 font-fanum">
            {toFaDigits(staff.length)} نفر
          </div>
          <span className="text-[10px] text-[#eed29d] mt-1 block">آتلیه، خط چاپ، کنترل کیفی و انبار</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">وظایف تکمیل‌شده شیفت</span>
          <div className="text-2xl font-black text-white mt-1 font-fanum">
            {toFaDigits(completedTasks.length)} اقدام
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">شامل بررسی و بسته‌بندی مرسولات</span>
        </div>
      </div>

      {/* Operators shift roster */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-4">راندمان تیم کارگاه و آتلیه در شیفت جاری</h2>
        <div className="divide-y divide-white/5">
          {staff.map((s) => (
            <div key={s.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#ba8d3d]/15 text-[#eed29d] flex items-center justify-center font-bold text-xs">
                  {s.fullName.slice(0, 1)}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{s.fullName}</div>
                  <div className="text-[10px] text-stone-400">
                    {s.role === 'super_admin'
                      ? 'مدیر ارشد کارگاه'
                      : s.role === 'designer_reviewer'
                      ? 'طراح و ناظر آتلیه چاپ'
                      : s.role === 'production_operator'
                      ? 'اپراتور پرینتر DTG'
                      : 'پشتیبانی و مالی'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-fanum">
                <span className="text-stone-300">
                  وضعیت شیفت: <strong className="text-emerald-400 font-normal">حاضر</strong>
                </span>
                <span className="text-stone-400 hidden sm:inline">داخلی {toFaDigits(s.id.slice(-2))}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
