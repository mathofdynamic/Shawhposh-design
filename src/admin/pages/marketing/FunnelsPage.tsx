import React, { useState } from 'react';
import {
  Filter,
  Layers,
  Sparkles,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
  ArrowDown,
  Palette,
  Users,
  Award,
  Gift,
  ChevronRight,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { toFaDigits } from '../../utils/formatters';

export const FunnelsPage: React.FC = () => {
  const { getFunnelAnalysis } = useAdminRepository();
  const funnel = getFunnelAnalysis();

  const [activeSegment, setActiveSegment] = useState<'all' | 'custom_pod' | 'standard'>('all');

  const baseVisitors = funnel.stages[0]?.totalVisitors || 18360;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="قیف تبدیل رفتار خریدار (Funnel Analysis)"
        description="ردیابی ۶ مرحله‌ای تبدیل کاربر از بازدید ویترین، ورود به آتلیه چاپ مستقیم نساجی، آرت‌ورک، سبد خرید تا تسویه موفق شاپرک."
      />

      {/* Consent & Privacy Notice Banner */}
      <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/10 flex items-start gap-3">
        <ShieldAlert size={18} className="text-[#eed29d] shrink-0 mt-0.5" />
        <div className="text-xs text-stone-300 leading-relaxed">
          <span className="font-bold text-white">ضمانت حریم خصوصی و عدم ادعای شناسایی هویت:</span>{' '}
          {funnel.consentNotice}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-fanum">
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">نرخ تبدیل نهایی کل</div>
            <div className="text-xl font-bold text-[#eed29d] mt-1">
              {toFaDigits(funnel.overallConversionRatePct)}٪
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">از بازدید تا پرداخت موفق</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#ba8d3d]/10 border border-[#ba8d3d]/20 flex items-center justify-center text-[#eed29d]">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">نرخ تبدیل طراحی سفارشی (POD)</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {toFaDigits(funnel.customPodVsStandardSplit.customConversionPct)}٪
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">کاربران طراح آنلاین Brother GTX</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Palette size={20} />
          </div>
        </div>

        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">نرخ تبدیل البسه آماده کاتالوگ</div>
            <div className="text-xl font-bold text-sky-400 mt-1">
              {toFaDigits(funnel.customPodVsStandardSplit.standardConversionPct)}٪
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">خرید مستقیم بدون سفارش چاپ تک</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <ShoppingBag size={20} />
          </div>
        </div>

        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">سهم درآمد البسه سفارشی</div>
            <div className="text-xl font-bold text-white mt-1">
              {toFaDigits(
                Math.round(
                  (funnel.customPodVsStandardSplit.customRevenueTomans /
                    (funnel.customPodVsStandardSplit.customRevenueTomans +
                      funnel.customPodVsStandardSplit.standardRevenueTomans || 1)) *
                    100
                )
              )}
              ٪
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">
              {toFaDigits(funnel.customPodVsStandardSplit.customRevenueTomans.toLocaleString())} ت
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Layers size={20} />
          </div>
        </div>
      </div>

      {/* Segment Switcher */}
      <div className="flex items-center justify-between bg-[#131211] border border-white/10 rounded-2xl p-3">
        <span className="text-xs font-bold text-white mr-2">تفکیک سگمنت بازدیدکنندگان:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSegment('all')}
            className={`px-3 py-1.5 rounded-xl text-xs transition-colors ${
              activeSegment === 'all'
                ? 'bg-[#ba8d3d] text-black font-bold'
                : 'text-stone-400 hover:text-white bg-[#1c1a17]'
            }`}
          >
            همه کاربران (تلفیقی)
          </button>
          <button
            onClick={() => setActiveSegment('custom_pod')}
            className={`px-3 py-1.5 rounded-xl text-xs transition-colors ${
              activeSegment === 'custom_pod'
                ? 'bg-[#ba8d3d] text-black font-bold'
                : 'text-stone-400 hover:text-white bg-[#1c1a17]'
            }`}
          >
            طراحان آتلیه آنلاین (Custom POD)
          </button>
          <button
            onClick={() => setActiveSegment('standard')}
            className={`px-3 py-1.5 rounded-xl text-xs transition-colors ${
              activeSegment === 'standard'
                ? 'bg-[#ba8d3d] text-black font-bold'
                : 'text-stone-400 hover:text-white bg-[#1c1a17]'
            }`}
          >
            خریداران کاتالوگ آماده (Standard)
          </button>
        </div>
      </div>

      {/* 6-Stage Visual Funnel */}
      <div className="bg-[#131211] border border-white/10 rounded-3xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h2 className="text-sm font-bold text-white">سیر جریان خرید ۶ مرحله‌ای کاربر</h2>
            <p className="text-xs text-stone-400 mt-0.5">
              از اولین کلیک روی محصول تا خروج از درگاه شاپرک با تاییدیه قطعی سفارش
            </p>
          </div>
          <span className="text-xs text-stone-400 font-fanum">{funnel.timeframe}</span>
        </div>

        <div className="space-y-4">
          {funnel.stages.map((stage, idx) => {
            const count =
              activeSegment === 'all'
                ? stage.totalVisitors
                : activeSegment === 'custom_pod'
                ? stage.customDesignPodCount
                : stage.standardGarmentCount;

            const baseCount =
              activeSegment === 'all'
                ? baseVisitors
                : activeSegment === 'custom_pod'
                ? funnel.stages[0]?.customDesignPodCount || 7160
                : funnel.stages[0]?.standardGarmentCount || 11200;

            const retentionPct = Math.round((count / baseCount) * 100);

            return (
              <div
                key={stage.stageId}
                className="p-4 rounded-2xl bg-[#0c0b0a] border border-white/10 space-y-2 hover:border-[#eed29d]/40 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#ba8d3d]/20 border border-[#ba8d3d]/30 text-[#eed29d] text-xs font-bold font-fanum flex items-center justify-center shrink-0">
                      {toFaDigits(stage.stepNumber)}
                    </span>
                    <span className="text-xs font-bold text-white">{stage.titleFa}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-fanum mr-9 sm:mr-0">
                    <span className="text-stone-300 font-bold">
                      {toFaDigits(count.toLocaleString())} کاربر
                    </span>
                    <span className="text-[#eed29d]">
                      ({toFaDigits(retentionPct)}٪ از کل ورودی)
                    </span>
                    {idx > 0 && (
                      <span className="text-stone-400">
                        گذار از مرحله قبل: {toFaDigits(stage.conversionFromPreviousPct)}٪
                      </span>
                    )}
                    {stage.dropoffPct > 0 && (
                      <span className="text-rose-400/90 text-[11px]">
                        ریزش: {toFaDigits(stage.dropoffPct)}٪
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Visual Bar */}
                <div className="w-full bg-stone-900 h-3 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-[#ba8d3d] to-[#eed29d] h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.max(4, retentionPct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loyalty & Referral Roadmap Affordance (Honest Next Phase Disclosure) */}
      <div className="bg-[#131211] border border-white/10 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#eed29d]">
            <Award size={18} />
            <h3 className="text-sm font-bold text-white">
              برنامه باشگاه مشتریان وفادار و ریفرال (Loyalty & Referral Tier)
            </h3>
          </div>
          <Badge variant="info">برنامه فاز آتی (Next Phase Roadmap)</Badge>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed">
          سامانه پاداش‌دهی، کش‌بک و معرفی دوستان در نقشه راه توسعه فروشگاه قرار دارد. کلیه ارقام و انتساب‌های این صفحه صرفاً بر اساس نشست‌های مستعار واقعی و پرداخت‌های شاپرک کارگاه است و پرداخت جعلی برای ریفرال صورت نمی‌پذیرد.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#1c1a17] border border-white/5 space-y-1">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Gift size={14} className="text-[#eed29d]" />
              <span>سطح برنزی (ورود اول)</span>
            </div>
            <p className="text-[11px] text-stone-400">
              ۱۰٪ تخفیف روی اولین چاپ مستقیم DTG با ثبت‌نام شماره همراه.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#1c1a17] border border-white/5 space-y-1">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Award size={14} className="text-[#eed29d]" />
              <span>سطح نقره‌ای (خریداران فصلی)</span>
            </div>
            <p className="text-[11px] text-stone-400">
              ارسال رایگان دائمی و دسترسی زودهنگام ۲۴ ساعته به دراپ‌های لیمیتد.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#1c1a17] border border-white/5 space-y-1">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#eed29d]" />
              <span>سطح طلایی (VIP شاه‌نشین)</span>
            </div>
            <p className="text-[11px] text-stone-400">
              هدایای دست‌ساز هاردباکس، دعوت به شوروم حضوری و تیشرت اختصاصی سالانه.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
