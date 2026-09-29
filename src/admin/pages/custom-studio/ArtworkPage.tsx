/**
 * Shahpoosh Luxury Streetwear - Artwork Library & Graphic Archive
 * URL: `/artwork` and `/admin/custom-studio/artwork`
 * Prompt 12: Prebuilt graphic/calligraphy assets with attribution, license/rights field,
 * categories, active status and preview; future customer uploads displayed as sample future capability explicitly marked.
 */

import React, { useState, useMemo } from 'react';
import {
  Image as ImageIcon,
  Sparkles,
  Download,
  Eye,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Folder,
  Layers,
  Filter,
  FileCheck,
  UploadCloud,
  Lock,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Badge, Modal, FormField, Input, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { ArtworkAsset } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';
import { DEFAULT_ARTWORK_ASSETS } from '../../domain/customStudio';

export const ArtworkPage: React.FC = () => {
  const { state } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<ArtworkAsset | null>(null);
  const [isNewAssetModalOpen, setIsNewAssetModalOpen] = useState(false);

  const assets: ArtworkAsset[] = useMemo(() => {
    return state.artworks || DEFAULT_ARTWORK_ASSETS;
  }, [state.artworks]);

  const officialAssets = useMemo(() => {
    return assets.filter((a) => !a.isCustomerUploadSample);
  }, [assets]);

  const customerUploadSamples = useMemo(() => {
    return assets.filter((a) => a.isCustomerUploadSample);
  }, [assets]);

  const filteredOfficialAssets = useMemo(() => {
    if (activeCategory === 'all') return officialAssets;
    return officialAssets.filter((a) => a.category === activeCategory);
  }, [officialAssets, activeCategory]);

  const handleDownload = (art: ArtworkAsset) => {
    addToast({
      title: 'دانلود فایل وکتور',
      description: `فایل وکتور استاندارد CMYK برای آرت‌ورک «${art.title}» آماده‌سازی شد.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6 select-text font-sans pb-16" dir="rtl">
      <AdminPageHeader
        title="کتابخانه فایل‌های برداری و آرت‌ورک‌های رسمی (Artwork Library)"
        description="مخزن مرکزی خوشنویسی‌های نستعلیق، تایپوگرافی‌های معاصر، نقوش اسلیمی و گواهی‌های مالکیت معنوی اختصاصی برند شاه‌پوش."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/custom-studio/printing-rules')}
              icon={Layers}
              className="text-xs"
            >
              قوانین چاپخانه
            </Button>
            <Button
              variant="brass"
              size="sm"
              onClick={() => setIsNewAssetModalOpen(true)}
              icon={Plus}
              className="text-xs font-bold"
            >
              ثبت آرت‌ورک جدید
            </Button>
          </div>
        }
      />

      {/* Honest Feature Capability Disclaimer from Prompt 12 */}
      <div className="p-4 bg-gradient-to-r from-stone-900 via-[#161413] to-black border border-white/10 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-stone-300">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ba8d3d]/15 border border-[#ba8d3d]/30 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-[#eed29d]" />
          </div>
          <div className="leading-relaxed">
            <strong>دامنه کارکرد طراح فروشگاه (Storefront PodDesigner):</strong> تمامی سفارشات شخصی‌سازی بر پایه
            گرافیک‌های وکتور معتبر بالا، فونت‌های لایسنس‌شده نستعلیق و رنگ‌بندی‌های اختصاصی انجام می‌گیرد. آپلود مستقیم
            فایل‌های بیرونی کاربر هنوز به عنوان ماژول فعال storefront راه‌اندازی نشده و نمونه‌های آن صرفاً به صورت آزمایشی
            نشان داده می‌شوند.
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/10">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activeCategory === 'all'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          تمام آرت‌ورک‌ها ({toFaDigits(officialAssets.length)})
        </button>

        <button
          onClick={() => setActiveCategory('calligraphy')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activeCategory === 'calligraphy'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          خوشنویسی و کالیگرافی
        </button>

        <button
          onClick={() => setActiveCategory('contemporary_typography')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activeCategory === 'contemporary_typography'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          تایپوگرافی معاصر
        </button>

        <button
          onClick={() => setActiveCategory('classic_ornament')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activeCategory === 'classic_ornament'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          نقوش کهن و اساطیری
        </button>

        <button
          onClick={() => setActiveCategory('street_miniature')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 ${
            activeCategory === 'street_miniature'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          مینیاتور خیابانی و مدرن
        </button>
      </div>

      {/* Grid of Official Artworks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOfficialAssets.map((art) => (
          <div
            key={art.id}
            className="bg-[#141211] border border-white/10 hover:border-white/20 transition-all rounded-2xl overflow-hidden flex flex-col justify-between"
          >
            <div>
              {/* Image Preview Box */}
              <div className="h-52 bg-stone-950 relative overflow-hidden flex items-center justify-center p-3 border-b border-white/5">
                <img
                  src={art.previewUrl}
                  alt={art.title}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />

                <span className="absolute top-4 right-4 text-[10px] bg-black/80 backdrop-blur-md text-[#eed29d] border border-white/15 px-2 py-0.5 rounded-md font-mono font-bold">
                  {art.id}
                </span>

                <span className="absolute bottom-4 left-4 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md font-bold">
                  تایید کارگاه
                </span>
              </div>

              {/* Information body */}
              <div className="p-4 space-y-3 text-xs">
                <div>
                  <h3 className="font-bold text-white text-sm leading-snug">{art.title}</h3>
                  <div className="text-[11px] text-[#eed29d] font-fanum mt-0.5">طراح / خوشنویس: {art.artist}</div>
                </div>

                <div className="space-y-1.5 p-2.5 bg-stone-900/60 rounded-xl border border-white/5 text-[11px] leading-relaxed">
                  <div>
                    <span className="text-stone-500 block">انتساب هنری:</span>
                    <span className="text-stone-300">{art.attributionFa}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block">مجوز و حقوق نشر:</span>
                    <span className="text-amber-300/90 font-medium">{art.license}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-400 font-fanum pt-1">
                  <span>فرمت: {art.format}</span>
                  <span>{toFaDigits(art.usageCount)} بار چاپ شده</span>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="p-4 pt-0 flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedAsset(art)}
                className="flex-1 text-xs"
                icon={Eye}
              >
                مشاهده شناسنامه
              </Button>
              <Button
                variant="brass"
                size="sm"
                onClick={() => handleDownload(art)}
                className="text-xs"
                icon={Download}
                title="دانلود وکتور لایسنس‌شده"
              >
                دانلود
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION: Sample Future Customer Upload Capability (Prompt 12 requirement) */}
      <div className="mt-12 p-6 bg-[#121110] border border-white/10 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <UploadCloud size={18} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">
              نمونه‌های آزمایشی آپلود مستقیم مشتری (Sample Future Capability)
            </h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold font-mono self-start sm:self-center">
            قابلیت آتی: نیازمند ماژول آپلود مستقیم کاربر
          </span>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed max-w-3xl">
          فایل‌های زیر به عنوان ماک‌آپ آزمایشی و پیش‌نمایش معماری سیستم جهت اضافه شدن قابلیت آپلود فایل دلخواه توسط
          خریداران در فازهای بعدی آماده شده‌اند. در نسخه کنونی، سیستم این موارد را به عنوان فایل‌های فاقد تایید کپی‌رایت
          علامت‌گذاری می‌کند.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {customerUploadSamples.map((sample) => (
            <div
              key={sample.id}
              className="p-4 bg-stone-900/50 border border-amber-500/20 rounded-xl flex items-center gap-4 text-xs font-fanum"
            >
              <div className="w-16 h-16 rounded-xl bg-black border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-1 relative">
                <img src={sample.previewUrl} alt={sample.title} className="w-full h-full object-cover rounded" />
                <span className="absolute inset-0 bg-black/40 flex items-center justify-center text-[9px] text-amber-300 font-bold">
                  آزمایشی
                </span>
              </div>

              <div className="space-y-1 flex-1">
                <div className="font-bold text-white text-xs">{sample.title}</div>
                <div className="text-[11px] text-stone-400">فرستنده: {sample.artist}</div>
                <div className="text-[10px] text-amber-400/90 leading-tight">
                  وضعیت کپی‌رایت: {sample.license}
                </div>
              </div>

              <Badge variant="warning" size="sm">
                نیازمند پردازش ابری
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Inspection Modal */}
      {selectedAsset && (
        <Modal
          isOpen={Boolean(selectedAsset)}
          onClose={() => setSelectedAsset(null)}
          title={`شناسنامه آرت‌ورک: ${selectedAsset.title}`}
          description={`شناسه اثر: ${selectedAsset.id} · طراح: ${selectedAsset.artist}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-stone-400 font-fanum">
                مجموع دفعات چاپ در کارگاه: {toFaDigits(selectedAsset.usageCount)}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => setSelectedAsset(null)}>
                  بستن
                </Button>
                <Button variant="brass" size="sm" onClick={() => handleDownload(selectedAsset)} icon={Download}>
                  دریافت فایل وکتور
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 font-sans text-xs">
            <div className="h-64 bg-black rounded-xl overflow-hidden flex items-center justify-center border border-white/10 p-2">
              <img src={selectedAsset.previewUrl} alt={selectedAsset.title} className="max-h-full object-contain" />
            </div>

            <div className="space-y-2 p-3 bg-stone-900 rounded-xl">
              <div>
                <span className="text-stone-400 block font-bold mb-0.5">شناسنامه و تاریخچه اثر:</span>
                <p className="text-stone-300 leading-relaxed">{selectedAsset.attributionFa}</p>
              </div>

              <div className="pt-2 border-t border-white/10">
                <span className="text-stone-400 block font-bold mb-0.5">مجوز استفاده تجاری و حقوق مالکیت:</span>
                <p className="text-amber-300 leading-relaxed">{selectedAsset.license}</p>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-stone-300">
                <span>استاندارد فرمت فایل:</span>
                <strong className="font-mono text-white">{selectedAsset.format}</strong>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* New Asset Registration Modal */}
      <Modal
        isOpen={isNewAssetModalOpen}
        onClose={() => setIsNewAssetModalOpen(false)}
        title="ثبت آرت‌ورک جدید در آرشیو آتلیه"
        description="ثبت مشخصات طرح وکتور و الصاق گواهی لایسنس کارگاهی برند شاه‌پوش."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsNewAssetModalOpen(false)}>
              انصراف
            </Button>
            <Button
              variant="brass"
              size="sm"
              onClick={() => {
                addToast({
                  title: 'آرت‌ورک ثبت شد',
                  description: 'طرح جدید در کتابخانه مرکزی آتلیه اضافه گردید.',
                  type: 'success',
                });
                setIsNewAssetModalOpen(false);
              }}
              icon={CheckCircle2}
            >
              ذخیره در کتابخانه
            </Button>
          </div>
        }
      >
        <div className="space-y-3 font-sans text-xs">
          <FormField label="عنوان آرت‌ورک:" required>
            <Input placeholder="مثال: کالیگرافی سیمرغ و قاف..." />
          </FormField>

          <FormField label="نام طراح یا خوشنویس:" required>
            <Input placeholder="مثال: استاد امین کریمی..." />
          </FormField>

          <FormField label="متن مجوز / لایسنس تجاری:" required>
            <Input placeholder="مثال: مجوز انحصاری چاپ و نشر برند شاه‌پوش..." />
          </FormField>

          <FormField label="دسته‌بندی هنری:">
            <select className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white">
              <option value="calligraphy">خوشنویسی و کالیگرافی</option>
              <option value="contemporary_typography">تایپوگرافی معاصر</option>
              <option value="classic_ornament">نقوش کهن و اساطیری</option>
              <option value="street_miniature">مینیاتور خیابانی</option>
            </select>
          </FormField>
        </div>
      </Modal>
    </div>
  );
};
