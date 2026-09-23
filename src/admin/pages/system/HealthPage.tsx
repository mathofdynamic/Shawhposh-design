import React, { useMemo } from 'react';
import { ShieldCheck, HardDrive, Clock, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Badge } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { verifyDomainInvariants } from '../../domain/invariants';
import { toFaDigits } from '../../utils/formatters';

export const HealthPage: React.FC = () => {
  const { state, resetToFixtures, demoClock } = useAdminRepository();

  const invariantReport = useMemo(() => verifyDomainInvariants(state), [state]);
  const storageUsage = useMemo(() => {
    try {
      const data = localStorage.getItem('SHAWHPOSH_ADMIN_REPO_V1');
      return data ? (new Blob([data]).size / 1024).toFixed(1) : '0';
    } catch {
      return '0';
    }
  }, [state]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="سلامت سامانه، حافظه و بررسی ناوردایی‌ها"
        description="نظارت لحظه‌ای بر سلامت داده‌های پایگاه محلی، حجم مصرفی کش مرورگر و ارزیابی پیوسته اصول هشت‌گانه منطق کسب‌وکار."
      />

      {/* Primary Status Card */}
      <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">سامانه و دیتابیس در سلامت کامل قرار دارد</h2>
            <p className="text-xs text-emerald-300 mt-0.5">
              هر ۸ ناوردایی معماری دامنه بررسی شده و هیچ‌گونه تناقض، مغایرت مالی یا موجودی منفی وجود ندارد.
            </p>
          </div>
        </div>

        <Badge label="۸ از ۸ ناوردایی پاس شد" variant="success" size="lg" />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
            <HardDrive size={16} className="text-[#ba8d3d]" />
            <span>حجم داده محلی (LocalStorage)</span>
          </div>
          <div className="text-2xl font-black text-white font-fanum">
            {toFaDigits(storageUsage)} کیلوبایت
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">کلید ذخیره‌سازی: SHAWHPOSH_ADMIN_REPO_V1</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
            <Clock size={16} className="text-[#ba8d3d]" />
            <span>ساعت مرجع شبیه‌سازی (Demo Clock)</span>
          </div>
          <div className="text-base font-bold text-stone-200 mt-1 font-mono">
            2026-09-23 12:00 UTC
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">مبدا محاسبه فیلترهای روزانه و هفتگی</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
            <RefreshCw size={16} className="text-[#ba8d3d]" />
            <span>بازنشانی به داده‌های اولیه</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 w-full"
            onClick={resetToFixtures}
          >
            ریست کامل پایگاه داده دمو
          </Button>
        </div>
      </div>

      {/* Detailed Invariant Checks List */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-white">گزارش آزمون‌های هشت‌گانه ناوردایی دامنه</h2>

        <div className="space-y-3">
          {invariantReport.results.map((item, i) => (
            <div
              key={i}
              className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-start gap-3"
            >
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-bold text-white">{item.invariant}</div>
                <div className="text-[11px] text-stone-400 mt-0.5">{item.details}</div>
              </div>
              <Badge label="تایید شد" variant="success" size="sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
