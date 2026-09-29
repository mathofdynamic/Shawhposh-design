import React, { useState } from 'react';
import {
  Globe,
  Search,
  Code,
  CheckCircle2,
  AlertCircle,
  Save,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Layers,
  Sparkles,
  Eye,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, FormField, Input, Badge } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { SeoMetadataRecord } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

export const SeoManagementPage: React.FC = () => {
  const { getSeoRecords, updateSeoRecord, state } = useAdminRepository();
  const records = getSeoRecords();
  const products = state.products || [];

  const [selectedRecordId, setSelectedRecordId] = useState<string>(records[0]?.id || 'SEO-HOME');
  const selectedRecord = records.find((r) => r.id === selectedRecordId) || records[0];

  const [formData, setFormData] = useState<SeoMetadataRecord>({ ...selectedRecord });
  const [jsonLdText, setJsonLdText] = useState(
    JSON.stringify(selectedRecord?.structuredDataJsonLd || {}, null, 2)
  );
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // When switching records
  const handleSelectRecord = (record: SeoMetadataRecord) => {
    setSelectedRecordId(record.id);
    setFormData({ ...record });
    setJsonLdText(JSON.stringify(record.structuredDataJsonLd || {}, null, 2));
    setJsonError(null);
  };

  const handleSave = () => {
    let parsedJson = formData.structuredDataJsonLd;
    if (jsonLdText.trim()) {
      try {
        parsedJson = JSON.parse(jsonLdText);
        setJsonError(null);
      } catch (err: any) {
        setJsonError('فرمت JSON-LD دارای خطای نگارشی است.');
        return;
      }
    }

    const payload = {
      ...formData,
      structuredDataJsonLd: parsedJson,
    };

    updateSeoRecord(selectedRecordId, payload, 'سهراب اخوان (مدیر سئو)');
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  // Google snippet length calculations
  const titleLen = formData.titleFa.length;
  const descLen = formData.metaDescriptionFa.length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="مدیریت سئو، متادیتا و اسکیما (SEO & Schema.org)"
        description="پیکربندی تگ‌های عنوان و توضیحات متا، پیش‌نمایش بلادرنگ در نتایج سرچ گوگل، اعتبارسنجی کنونیکال و تولید داده‌های ساختاریافته فکتورین بدون اطلاعات ساختگی."
        actions={
          <Button variant="brass" size="sm" onClick={handleSave}>
            <Save size={13} className="ml-1" />
            ذخیره تنظیمات سئو
          </Button>
        }
      />

      {/* Ethical Guardrail Disclaimer */}
      <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/10 flex items-start gap-3">
        <ShieldCheck size={18} className="text-[#eed29d] shrink-0 mt-0.5" />
        <div className="text-xs text-stone-300 leading-relaxed">
          <span className="font-bold text-white">پروتکل صداقت داده‌های ساختاریافته (Schema Integrity):</span>{' '}
          داده‌های Schema.org صرفاً بر مبنای اطلاعات واقعی کاتالوگ (نام اثر، جنس ۲۴۰ گرم، قیمت بر حسب تومان و موجودی انبار) ایجاد می‌شوند. انتشار ستاره‌های ساختگی (Mock AggregateRating) یا گواهینامه‌های تاییدنشده در اسکیما جهت رعایت دستورالعمل‌های رسمی گوگل مسدود است.
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>تنظیمات سئو و متادیتا با موفقیت ذخیره شد.</span>
        </div>
      )}

      {/* Page Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10">
        {records.map((r) => (
          <button
            key={r.id}
            onClick={() => handleSelectRecord(r)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
              selectedRecordId === r.id
                ? 'bg-[#ba8d3d] text-black shadow-md'
                : 'bg-[#131211] text-stone-400 hover:text-white border border-white/5'
            }`}
          >
            <Globe size={13} />
            <span>{r.titleFa.split('·')[0].trim()}</span>
            <span className="text-[10px] font-mono opacity-80" dir="ltr">
              {r.urlPath}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Form Inputs */}
        <div className="space-y-6">
          <div className="bg-[#131211] border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Globe size={16} className="text-[#eed29d]" />
              <span>تگ‌های متا و مشخصات صفحه</span>
            </h3>

            <FormField label="آدرس صفحه در فروشگاه (URL Path)">
              <Input value={formData.urlPath} disabled className="text-stone-500 font-mono" dir="ltr" />
            </FormField>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-white">تگ عنوان مرورگر (Title Tag)</span>
                <span
                  className={`font-fanum text-[11px] ${
                    titleLen >= 50 && titleLen <= 65
                      ? 'text-emerald-400'
                      : titleLen > 65
                      ? 'text-amber-400'
                      : 'text-stone-400'
                  }`}
                >
                  {toFaDigits(titleLen)} / ۶۰ کاراکتر (بهینه)
                </span>
              </div>
              <Input
                value={formData.titleFa}
                onChange={(e) => setFormData({ ...formData, titleFa: e.target.value })}
                placeholder="عنوان جذاب حاوی کلمات کلیدی و برند"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-white">توضیحات متا (Meta Description)</span>
                <span
                  className={`font-fanum text-[11px] ${
                    descLen >= 120 && descLen <= 165
                      ? 'text-emerald-400'
                      : descLen > 165
                      ? 'text-amber-400'
                      : 'text-stone-400'
                  }`}
                >
                  {toFaDigits(descLen)} / ۱۵۵ کاراکتر (بهینه)
                </span>
              </div>
              <textarea
                value={formData.metaDescriptionFa}
                onChange={(e) => setFormData({ ...formData, metaDescriptionFa: e.target.value })}
                rows={3}
                className="w-full bg-[#1c1a17] border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
                placeholder="خلاصه ترغیب‌کننده و متنی که در زیر لینک گوگل نشان داده می‌شود."
              />
            </div>

            <FormField label="آدرس کنونیکال (Canonical URL)">
              <Input
                value={formData.canonicalUrl}
                onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                dir="ltr"
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="دستور ربات‌های جستجوگر (Robots)">
                <select
                  value={formData.robotsDirective}
                  onChange={(e) => setFormData({ ...formData, robotsDirective: e.target.value as any })}
                  className="w-full bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="index, follow">index, follow (پیش‌فرض)</option>
                  <option value="noindex, follow">noindex, follow</option>
                  <option value="noindex, nofollow">noindex, nofollow</option>
                </select>
              </FormField>

              <FormField label="آدرس تصویر اشتراک‌گذاری (OG Image)">
                <Input
                  value={formData.ogImageUrl || ''}
                  onChange={(e) => setFormData({ ...formData, ogImageUrl: e.target.value })}
                  dir="ltr"
                  placeholder="https://..."
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* Right Column: Google SERP Snippet Preview & Schema JSON-LD */}
        <div className="space-y-6">
          {/* Live Google Search Preview Card */}
          <div className="bg-[#131211] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Search size={16} className="text-[#eed29d]" />
                <span>پیش‌نمایش در نتایج جستجوی گوگل (Google SERP Snippet)</span>
              </div>
              <Badge variant="info">Desktop & Mobile</Badge>
            </div>

            <div className="bg-[#202124] rounded-2xl p-4 space-y-2 border border-white/10 text-right">
              {/* URL & Favicon */}
              <div className="flex items-center gap-2 text-[11px] text-[#bdc1c6] font-mono" dir="ltr">
                <div className="w-5 h-5 rounded-full bg-[#303134] flex items-center justify-center text-[10px] text-[#eed29d] font-bold">
                  S
                </div>
                <span className="truncate">{formData.canonicalUrl}</span>
              </div>

              {/* Title Link */}
              <h4 className="text-base text-[#8ab4f8] hover:underline font-medium cursor-pointer line-clamp-1 leading-snug">
                {formData.titleFa || 'عنوان صفحه در گوگل'}
              </h4>

              {/* Meta Description */}
              <p className="text-xs text-[#bdc1c6] leading-relaxed line-clamp-2">
                {formData.metaDescriptionFa || 'توضیحات متا در اینجا نمایش داده خواهد شد.'}
              </p>
            </div>
          </div>

          {/* Schema.org JSON-LD Editor */}
          <div className="bg-[#131211] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Code size={16} className="text-[#eed29d]" />
                <span>داده‌های ساختاریافته (Schema.org JSON-LD)</span>
              </div>
              <span className="text-[11px] text-stone-400 font-mono">
                @type: {formData.structuredDataJsonLd?.['@type'] || 'StructuredData'}
              </span>
            </div>

            {jsonError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="text-rose-400 shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}

            <textarea
              value={jsonLdText}
              onChange={(e) => setJsonLdText(e.target.value)}
              rows={8}
              className="w-full bg-[#0c0b0a] border border-white/10 rounded-2xl p-4 font-mono text-xs text-[#eed29d] resize-none leading-relaxed"
              dir="ltr"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
