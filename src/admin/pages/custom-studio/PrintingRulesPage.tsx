/**
 * Shahpoosh Luxury Streetwear - Printing Rules & Machine Preflight Regulations
 * URL: `/printing-rules` and `/admin/custom-studio/printing-rules`
 * Prompt 12: Allowed areas, intended size, technique, file dimensions, DPI/transparency requirements,
 * restrictions; structured attribute validator; honest notice for unsupported deep file processing.
 */

import React, { useState, useMemo } from 'react';
import {
  Layers,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  FileCheck,
  Printer,
  Sparkles,
  ShieldCheck,
  Maximize2,
  Sliders,
  Send,
  Eye,
  ArrowRight,
  Info,
  Terminal,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Badge, Modal, FormField, Input, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { PrintRuleZone, CustomDesign } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';
import {
  DEFAULT_PRINT_RULE_ZONES,
  validateDesignStructuredRules,
  getUnsupportedFeatureNotice,
} from '../../domain/customStudio';

export const PrintingRulesPage: React.FC = () => {
  const { state, getPrintRuleZones } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();

  const zones: PrintRuleZone[] = useMemo(() => {
    return getPrintRuleZones() || DEFAULT_PRINT_RULE_ZONES;
  }, [getPrintRuleZones]);

  const [selectedZoneId, setSelectedZoneId] = useState<string>('front_chest');
  const [selectedDesignId, setSelectedDesignId] = useState<string>(
    state.customDesigns[0]?.id || ''
  );
  const [deepExportTested, setDeepExportTested] = useState(false);

  const activeZone = useMemo(() => {
    return zones.find((z) => z.id === selectedZoneId) || zones[0];
  }, [zones, selectedZoneId]);

  const activeDesign = useMemo(() => {
    return state.customDesigns.find((d) => d.id === selectedDesignId) || state.customDesigns[0];
  }, [state.customDesigns, selectedDesignId]);

  // Structured Attribute Validation Results
  const validation = useMemo(() => {
    if (!activeDesign || !activeZone) return null;
    return validateDesignStructuredRules(activeDesign, activeZone);
  }, [activeDesign, activeZone]);

  const handleTestDeepPreflight = () => {
    setDeepExportTested(true);
  };

  return (
    <div className="space-y-6 select-text font-sans pb-16" dir="rtl">
      <AdminPageHeader
        title="مقررات و استانداردهای فنی چاپخانه (Printing Rules)"
        description="چارچوب‌های ابعادی کادر مجاز، الزامات ترنسپارنسی، حداقل رزولوشن ۳۰۰ DPI و مشخصات دستگاه چاپ مستقیم Brother GTX."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/custom-studio/approval')}
              icon={FileCheck}
              className="text-xs"
            >
              صف داوری آتلیه
            </Button>
            <Button
              variant="brass"
              size="sm"
              onClick={() => navigate('/admin/custom-studio/submissions')}
              icon={Eye}
              className="text-xs font-bold"
            >
              طرح‌های ثبت‌شده
            </Button>
          </div>
        }
      />

      {/* Honest Capability Boundary Notice from Prompt 12 */}
      <div className="p-4 bg-gradient-to-r from-stone-900 via-[#161413] to-black border border-white/10 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-stone-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ba8d3d]/15 border border-[#ba8d3d]/30 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-[#eed29d]" />
          </div>
          <div className="leading-relaxed">
            <strong>قوانین اعتبارسنجی دمو:</strong> سیستم در این بخش مشخصات ساختاریافته طرح (ابعاد، موقعیت، DPI ثبت‌شده،
            فرمت و فضای رنگی CMYK) را به دقت کنترل می‌کند. پردازش‌های سنگین پیکسلی فایل باینری اصلی یا خروجی مستقیم
            پرینتر صنعتی، نیازمند زیرساخت مجزای پردازش فایل است که با برچسب شفاف مشخص گردیده است.
          </div>
        </div>
      </div>

      {/* Allowed Printing Zones Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Layers size={16} className="text-[#ba8d3d]" />
          <span>نواحی مجاز چاپ روی البسه (Allowed Printing Zones)</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {zones.map((zone) => {
            const isSelected = zone.id === selectedZoneId;
            return (
              <div
                key={zone.id}
                onClick={() => setSelectedZoneId(zone.id)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-[#181614] border-[#ba8d3d] shadow-lg shadow-black/40 ring-1 ring-[#ba8d3d]'
                    : 'bg-[#141211] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-stone-500 uppercase">{zone.id}</span>
                    <Badge variant={isSelected ? 'brass' : 'default'} size="sm">
                      {zone.minResolutionDpi} DPI
                    </Badge>
                  </div>

                  <h3 className="font-bold text-white text-sm">{zone.nameFa}</h3>

                  <div className="space-y-1 text-xs text-stone-400 font-fanum pt-1">
                    <div>
                      <span className="text-stone-500">حداکثر ابعاد: </span>
                      <strong className="text-stone-300">{zone.maxDimensionsMm}</strong>
                    </div>
                    <div>
                      <span className="text-stone-500">ابعاد توصیه‌شده: </span>
                      <strong className="text-[#eed29d]">{zone.recommendedDimensionsMm}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 text-[11px] text-stone-400 flex items-center justify-between">
                  <span>تکنیک اصلی:</span>
                  <span className="text-emerald-400 font-bold truncate max-w-[120px]">
                    {zone.primaryTechnique.split(' ')[0]} DTG
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Zone Deep Technical Specification */}
      <div className="p-5 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Printer size={18} className="text-[#ba8d3d]" />
              <span>مشخصات فنی و استانداردهای تفصیلی: {activeZone.nameFa}</span>
            </h3>
            <p className="text-xs text-stone-400 mt-1">
              دستگاه هدف: {activeZone.primaryTechnique} · حاشیه ایمن لبه دوخت: {toFaDigits(activeZone.safetyMarginMm)} میلی‌متر
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs text-stone-400">فرمت‌های مجاز:</span>
            {(activeZone.allowedFormats || []).map((fmt) => (
              <span key={fmt} className="px-2 py-0.5 rounded bg-stone-900 border border-white/10 text-[11px] font-mono text-white">
                {fmt}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Rules & Requirements */}
          <div className="space-y-3">
            <h4 className="font-bold text-stone-200">الزامات گرافیکی فایل چاپ:</h4>
            <div className="space-y-2 font-fanum">
              <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-1">
                <span className="text-stone-400 block text-[11px]">حداقل رزولوشن استاندارد (DPI):</span>
                <strong className="text-white text-sm">حداقل {toFaDigits(activeZone.minResolutionDpi)} نقطه در اینچ (DPI)</strong>
                <p className="text-[10px] text-stone-500">برای حفظ شفافیت خطوط خوشنویسی و جلوگیری از پیکسلی شدن لبه‌ها.</p>
              </div>

              <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-1">
                <span className="text-stone-400 block text-[11px]">فضای رنگی استاندارد:</span>
                <strong className="text-white text-sm">پروفایل CMYK FOGRA39 (یا تبدیل ایمن sRGB)</strong>
                <p className="text-[10px] text-stone-500">جوهرهای تخصصی دستگاه برادر با پالت استاندارد CMYK همگام هستند.</p>
              </div>

              <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-1">
                <span className="text-stone-400 block text-[11px]">شفافیت پس‌زمینه (Transparency):</span>
                <strong className="text-emerald-400 text-sm">
                  {activeZone.transparencyRequired ? 'الزامی (۱۰۰٪ Transparent)' : 'اختیاری'}
                </strong>
                <p className="text-[10px] text-stone-500">چاپگر دیجیتال پس‌زمینه غیرشفاف را به عنوان لایه سفید تلقی می‌کند.</p>
              </div>
            </div>
          </div>

          {/* Technical Restrictions List */}
          <div className="space-y-3">
            <h4 className="font-bold text-stone-200">محدودیت‌ها و خطوط قرمز کارگاه (Restrictions):</h4>
            <div className="p-4 bg-stone-900/40 rounded-xl border border-white/5 space-y-2.5">
              {(activeZone.restrictions || []).map((res, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-stone-300 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span>{res}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-stone-900/80 rounded-xl border border-white/10 text-[11px] text-stone-400 space-y-1">
              <span className="font-bold text-[#eed29d] block">تکنیک جایگزین در تیراژ بالا:</span>
              <p>{activeZone.alternativeTechnique || 'فاقد روش جایگزین، صرفاً چاپ مستقیم نساجی.'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Structured Attribute Validator */}
      <div className="p-5 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders size={16} className="text-[#ba8d3d]" />
              <span>اعتبارسنجی مشخصات ساختاریافته طرح (Structured Attribute Validator)</span>
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              آزمایش انطباق ویژگی‌های ثبت‌شده طرح با ناحیه انتخابی چاپخانه بر اساس متادیتاهای واقعی پایگاه داده.
            </p>
          </div>

          {/* Design Selector Dropdown */}
          <div className="w-full sm:w-72">
            <select
              value={selectedDesignId}
              onChange={(e) => setSelectedDesignId(e.target.value)}
              className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              {state.customDesigns.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id} - {d.title} ({d.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {validation && activeDesign && (
          <div className="space-y-4">
            {/* Validation Outcome Banner */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                validation.passed
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-3">
                {validation.passed ? (
                  <CheckCircle2 size={24} className="shrink-0 text-emerald-400" />
                ) : (
                  <XCircle size={24} className="shrink-0 text-rose-400" />
                )}
                <div>
                  <h4 className="font-bold text-xs">
                    {validation.passed
                      ? 'تمامی مشخصات ساختاریافته با استاندارد چاپخانه منطبق است.'
                      : 'مغایرت در مشخصات ساختاریافته طرح شناسایی شد!'}
                  </h4>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    طرح: <strong>{activeDesign.title}</strong> · ناحیه هدف: <strong>{activeZone.nameFa}</strong>
                  </p>
                </div>
              </div>

              <Badge variant={validation.passed ? 'success' : 'destructive'} size="sm">
                {validation.passed ? 'آماده چاپ صنعتی' : 'نیازمند اصلاح فنی'}
              </Badge>
            </div>

            {/* Structured Criteria Checks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-fanum">
              <div className="p-3 bg-stone-900 rounded-xl space-y-1">
                <span className="text-[10px] text-stone-500 block">بررسی DPI فایل:</span>
                <div className="flex items-center justify-between">
                  <strong className="text-white">{toFaDigits(activeDesign.resolutionDpi)} DPI</strong>
                  {validation.dpiCheck === 'valid' ? (
                    <span className="text-emerald-400 font-bold text-[11px]">تایید شد</span>
                  ) : (
                    <span className="text-rose-400 font-bold text-[11px]">کمتر از ۳۰۰</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-stone-900 rounded-xl space-y-1">
                <span className="text-[10px] text-stone-500 block">سازگاری فرمت:</span>
                <div className="flex items-center justify-between">
                  <strong className="text-white">{activeDesign.format}</strong>
                  {validation.formatCheck === 'valid' ? (
                    <span className="text-emerald-400 font-bold text-[11px]">مجاز در این کادر</span>
                  ) : (
                    <span className="text-rose-400 font-bold text-[11px]">غیرمجاز</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-stone-900 rounded-xl space-y-1">
                <span className="text-[10px] text-stone-500 block">محدوده مقیاس کادر:</span>
                <div className="flex items-center justify-between">
                  <strong className="text-white">
                    {toFaDigits(activeDesign.settings?.designScale || 100)}٪
                  </strong>
                  {validation.scaleCheck === 'valid' ? (
                    <span className="text-emerald-400 font-bold text-[11px]">در محدوده ایمن</span>
                  ) : (
                    <span className="text-rose-400 font-bold text-[11px]">فراتر از حد</span>
                  )}
                </div>
              </div>
            </div>

            {/* Errors / Warnings List if any */}
            {validation.errors.length > 0 && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-1.5">
                <span className="font-bold text-rose-300 block">خطاهای نیازمند رفع:</span>
                {validation.errors.map((err, i) => (
                  <div key={i} className="text-rose-200 text-[11px] flex items-center gap-1.5">
                    <XCircle size={12} className="shrink-0 text-rose-400" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            {validation.warnings.length > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs space-y-1.5">
                <span className="font-bold text-amber-300 block">هشدارهای کیفی کارشناسی:</span>
                {validation.warnings.map((warn, i) => (
                  <div key={i} className="text-amber-200 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle size={12} className="shrink-0 text-amber-400" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Deep Preflight / RIP Export Button & Honest Notice */}
            <div className="p-4 bg-stone-950 border border-white/10 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-bold text-white text-xs">اکسپورت صنعتی و پردازش عمیق پیکسلی RIP</h5>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    ایجاد فایل دستور پرینتر صنعتی Brother GTX با تفکیک قطره‌های جوهر سفید و رنگی
                  </p>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleTestDeepPreflight}
                  icon={Terminal}
                  className="text-xs shrink-0"
                >
                  استعلام پردازش RIP
                </Button>
              </div>

              {deepExportTested && (
                <div className="p-3 bg-stone-900 border border-amber-500/30 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-2 text-amber-300 font-bold">
                    <HelpCircle size={14} className="shrink-0" />
                    <span>{getUnsupportedFeatureNotice('file_export').labelFa}</span>
                  </div>
                  <p className="text-stone-300 text-[11px] leading-relaxed">
                    {getUnsupportedFeatureNotice('file_export').descriptionFa} هیچ خروجی ساختگی بدون زیرساخت سخت‌افزاری
                    ارائه نمی‌گردد.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
