import React, { useState, useMemo } from 'react';
import {
  Layout,
  Save,
  Eye,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ExternalLink,
  History,
  Image as ImageIcon,
  Palette,
  AlertCircle,
  Edit3,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, FormField, Input, Badge } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { HomepageLayoutConfig } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

export const HomepageCmsPage: React.FC = () => {
  const { getHomepageConfig, updateHomepageConfig, state } = useAdminRepository();
  const config = getHomepageConfig();
  const allProducts = state.products || [];

  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'revisions'>('editor');
  const [formData, setFormData] = useState<HomepageLayoutConfig>({ ...config });
  const [changeSummary, setChangeSummary] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Hero slide editor modal
  const [isSlideModalOpen, setIsSlideModalOpen] = useState(false);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [slideForm, setSlideForm] = useState({
    titleFa: '',
    titleEn: '',
    subtitleFa: '',
    subtitleEn: '',
    ctaTextFa: '',
    ctaLink: '',
    secondaryCtaTextFa: '',
    secondaryCtaLink: '',
    imageUrl: '',
    badgeFa: '',
    displayOrder: 1,
    isActive: true,
  });

  const handleSaveAll = () => {
    updateHomepageConfig(
      formData,
      'سهراب اخوان (مدیر محتوا)',
      changeSummary.trim() || 'به‌روزرسانی تنظیمات صفحه اصلی و بنرها'
    );
    setSaveSuccessMsg(true);
    setChangeSummary('');
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  const handleOpenAddSlide = () => {
    setEditingSlideIndex(null);
    setSlideForm({
      titleFa: 'تیتر اسلاید جدید شاه‌پوش',
      titleEn: 'New Hero Slide Title',
      subtitleFa: 'توضیحات و شعار کلکسیون جدید با خط نستعلیق و پارچه پنبه سوپر',
      subtitleEn: 'Premium Persian Calligraphy on Heavyweight Cotton',
      ctaTextFa: 'مشاهده و خرید',
      ctaLink: '/catalog',
      secondaryCtaTextFa: 'ورود به آتلیه طراحی',
      secondaryCtaLink: '/custom-studio',
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&q=80',
      badgeFa: 'جدید',
      displayOrder: (formData.heroSlides?.length || 0) + 1,
      isActive: true,
    });
    setIsSlideModalOpen(true);
  };

  const handleOpenEditSlide = (idx: number) => {
    setEditingSlideIndex(idx);
    const slide = formData.heroSlides[idx];
    setSlideForm({ ...slide });
    setIsSlideModalOpen(true);
  };

  const handleSaveSlide = () => {
    const updatedSlides = [...(formData.heroSlides || [])];
    if (editingSlideIndex !== null) {
      updatedSlides[editingSlideIndex] = {
        ...updatedSlides[editingSlideIndex],
        ...slideForm,
      };
    } else {
      updatedSlides.push({
        id: `SLIDE-${Date.now()}`,
        ...slideForm,
      });
    }
    setFormData({ ...formData, heroSlides: updatedSlides });
    setIsSlideModalOpen(false);
  };

  const handleDeleteSlide = (idx: number) => {
    if (confirm('آیا از حذف این اسلاید هیرو اطمینان دارید؟')) {
      const updated = formData.heroSlides.filter((_, i) => i !== idx);
      setFormData({ ...formData, heroSlides: updated });
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="مدیریت چیدمان و محتوای صفحه اول (Homepage CMS)"
        description="تنظیم نوار اعلان، اسلایدر هیرو، انتخاب محصولات برگزیده از کاتالوگ مشترک، بخش آتلیه و مدیریت تاریخچه ویرایش‌ها."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'preview' ? 'brass' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(activeTab === 'preview' ? 'editor' : 'preview')}
            >
              <Eye size={13} className="ml-1" />
              {activeTab === 'preview' ? 'بازگشت به ویرایشگر' : 'پیش‌نمایش استورفرانت'}
            </Button>
            <Button variant="brass" size="sm" onClick={handleSaveAll}>
              <Save size={13} className="ml-1" />
              ذخیره و انتشار تغییرات
            </Button>
          </div>
        }
      />

      {/* Honest Scope Disclosure */}
      <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/10 flex items-start gap-3">
        <AlertCircle size={18} className="text-[#eed29d] shrink-0 mt-0.5" />
        <div className="text-xs text-stone-300 leading-relaxed">
          <span className="font-bold text-white">شفافیت محدوده توسعه (Scope Disclosure):</span>{' '}
          تنظیمات ویرایش‌شده در پایگاه داده محلی ذخیره شده و در زبانه «پیش‌نمایش استورفرانت» به صورت بلادرنگ شبیه‌سازی می‌گردند. اتصال کامل به فرانت‌اند عمومی طبق نقشه راه پس از نهایی‌سازی معماری انجام خواهد شد.
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>تغییرات صفحه اول با موفقیت در پایگاه داده ثبت شد و نسخه جدید در تاریخچه قرار گرفت.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('editor')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'editor'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white bg-[#131211]'
          }`}
        >
          ویرایشگر بخش‌های صفحه اصلی
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'preview'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white bg-[#131211]'
          }`}
        >
          پیش‌نمایش زنده در استورفرانت
        </button>
        <button
          onClick={() => setActiveTab('revisions')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors ${
            activeTab === 'revisions'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white bg-[#131211]'
          }`}
        >
          تاریخچه نسخه‌ها و بازبینی‌ها ({toFaDigits(formData.revisionHistory?.length || 0)})
        </button>
      </div>

      {/* TAB 1: EDITOR */}
      {activeTab === 'editor' && (
        <div className="space-y-6">
          {/* Section 1: Announcement Bar */}
          <div className="bg-[#131211] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Palette size={16} className="text-[#eed29d]" />
                <span>نوار اعلان بالای سایت (Top Announcement Bar)</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.announcementBar.enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      announcementBar: { ...formData.announcementBar, enabled: e.target.checked },
                    })
                  }
                  className="rounded accent-[#ba8d3d]"
                />
                <span>نمایش نوار اعلان</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="متن پیام (فارسی)">
                <Input
                  value={formData.announcementBar.textFa}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      announcementBar: { ...formData.announcementBar, textFa: e.target.value },
                    })
                  }
                />
              </FormField>

              <FormField label="متن پیام (انگلیسی)">
                <Input
                  value={formData.announcementBar.textEn || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      announcementBar: { ...formData.announcementBar, textEn: e.target.value },
                    })
                  }
                  dir="ltr"
                />
              </FormField>

              <FormField label="آدرس لینک مقصد">
                <Input
                  value={formData.announcementBar.linkUrl}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      announcementBar: { ...formData.announcementBar, linkUrl: e.target.value },
                    })
                  }
                  dir="ltr"
                />
              </FormField>

              <FormField label="رنگ پس‌زمینه (کد هگز)">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={formData.announcementBar.bgColor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        announcementBar: { ...formData.announcementBar, bgColor: e.target.value },
                      })
                    }
                    className="w-9 h-9 rounded-xl border border-white/20 bg-transparent cursor-pointer"
                  />
                  <Input
                    value={formData.announcementBar.bgColor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        announcementBar: { ...formData.announcementBar, bgColor: e.target.value },
                      })
                    }
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </FormField>
            </div>
          </div>

          {/* Section 2: Hero Slides */}
          <div className="bg-[#131211] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">اسلایدر هیرو (Hero Banner Slides)</h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  مدیریت تصاویر بزرگ صفحه نخست، پیام‌های اصلی برند و دکمه‌های فراخوان
                </p>
              </div>
              <Button variant="brass" size="sm" onClick={handleOpenAddSlide}>
                <Plus size={13} className="ml-1" />
                افزودن اسلاید هیرو
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(formData.heroSlides || []).map((slide, idx) => (
                <div
                  key={slide.id}
                  className="bg-[#0c0b0a] border border-white/10 rounded-2xl p-4 space-y-3 relative overflow-hidden"
                >
                  <div className="aspect-[16/8] rounded-xl overflow-hidden bg-stone-900 border border-white/10 relative">
                    <img
                      src={slide.imageUrl}
                      alt={slide.titleFa}
                      className="w-full h-full object-cover"
                    />
                    {slide.badgeFa && (
                      <span className="absolute top-2 right-2 bg-[#ba8d3d] text-black text-[10px] font-bold px-2 py-0.5 rounded shadow">
                        {slide.badgeFa}
                      </span>
                    )}
                    <span className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm text-stone-300 text-[10px] font-fanum px-2 py-0.5 rounded">
                      اسلاید {toFaDigits(idx + 1)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-bold text-white line-clamp-1">{slide.titleFa}</div>
                    <div className="text-[11px] text-stone-400 line-clamp-2">{slide.subtitleFa}</div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <span className="text-[#eed29d] font-bold text-[11px] truncate max-w-[180px]">
                      CTA: {slide.ctaTextFa}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditSlide(idx)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/5"
                        title="ویرایش اسلاید"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteSlide(idx)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                        title="حذف اسلاید"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Featured Products Selector (Shared Catalog) */}
          <div className="bg-[#131211] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">محصولات برگزیده ویترین (Featured Catalog Items)</h3>
              <p className="text-xs text-stone-400 mt-0.5">
                انتخاب مستقیم از محصولات کاتالوگ شاه‌پوش (بدون رکورد تکراری در سیستم)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allProducts.map((p) => {
                const isFeatured = formData.featuredProductIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      isFeatured
                        ? 'bg-[#ba8d3d]/10 border-[#ba8d3d]/40'
                        : 'bg-[#0c0b0a] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isFeatured}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            featuredProductIds: [...formData.featuredProductIds, p.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            featuredProductIds: formData.featuredProductIds.filter((id) => id !== p.id),
                          });
                        }
                      }}
                      className="rounded accent-[#ba8d3d]"
                    />
                    <div className="w-10 h-10 rounded-xl bg-stone-900 overflow-hidden border border-white/10 shrink-0">
                      <img
                        src={p.primaryImage || p.images[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200'}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{p.name}</div>
                      <div className="text-[10px] text-stone-400 font-fanum mt-0.5">
                        {toFaDigits(p.basePriceTomans.toLocaleString())} تومان
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 4: Story & Craft Features */}
          <div className="bg-[#131211] border border-white/10 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">بخش روایت و استانداردهای کیفی کارگاه</h3>
              <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.storySection.enabled}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      storySection: { ...formData.storySection, enabled: e.target.checked },
                    })
                  }
                  className="rounded accent-[#ba8d3d]"
                />
                <span>نمایش بخش روایت</span>
              </label>
            </div>

            <FormField label="عنوان بخش روایت">
              <Input
                value={formData.storySection.titleFa}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    storySection: { ...formData.storySection, titleFa: e.target.value },
                  })
                }
              />
            </FormField>

            <FormField label="متن بیانیه کیفیت">
              <textarea
                value={formData.storySection.bodyFa}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    storySection: { ...formData.storySection, bodyFa: e.target.value },
                  })
                }
                rows={3}
                className="w-full bg-[#1c1a17] border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
              />
            </FormField>
          </div>

          {/* Section 5: Publishing & Status Controls */}
          <div className="bg-[#131211] border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">کنترل انتشار و تغییرات</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="وضعیت انتشار">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="published">منتشرشده (Live in Demo)</option>
                  <option value="draft">پیش‌نویس (Draft)</option>
                  <option value="scheduled">زمان‌بندی‌شده برای دراپ آینده</option>
                </select>
              </FormField>

              <FormField label="خلاصه تغییرات جهت ثبت در تاریخچه بازبینی">
                <Input
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="مثال: به‌روزرسانی اسلاید هیرو و محصولات برگزیده پاییز"
                />
              </FormField>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE STOREFRONT PREVIEW */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="p-3 bg-[#1c1a17] border border-[#ba8d3d]/30 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-stone-300">
              <Eye size={14} className="text-[#eed29d]" />
              <span>
                پیش‌نمایش شبیه‌سازی‌شده ویترین فروشگاه شاه‌پوش بر مبنای کانفیگ فعال
              </span>
            </div>
            <Badge variant="info">محیط دمو پنل ادمین</Badge>
          </div>

          {/* Mock Storefront Container */}
          <div className="border border-white/15 rounded-3xl overflow-hidden bg-[#0c0b0a] shadow-2xl">
            {/* Mock Announcement Bar */}
            {formData.announcementBar.enabled && (
              <div
                style={{ backgroundColor: formData.announcementBar.bgColor }}
                className="py-2.5 px-4 text-center text-xs font-bold text-white flex items-center justify-center gap-2"
              >
                <span>{formData.announcementBar.textFa}</span>
                <ArrowRight size={12} />
              </div>
            )}

            {/* Mock Header Navigation */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-[#131211]/80 backdrop-blur-md">
              <div className="text-base font-bold text-white tracking-widest font-mono">
                SHAHPOOSH · شاه‌پوش
              </div>
              <div className="flex items-center gap-6 text-xs text-stone-300">
                <span>کلکسیون‌ها</span>
                <span>تیشرت و هودی</span>
                <span className="text-[#eed29d] font-bold">آتلیه چاپ اختصاصی (DTG)</span>
                <span>راهنمای سایز</span>
                <span>داستان برند</span>
              </div>
              <div className="text-xs text-stone-400">سبد خرید (۰)</div>
            </div>

            {/* Mock Hero Slide */}
            {formData.heroSlides[0] && (
              <div className="relative aspect-[16/7] w-full overflow-hidden flex items-center justify-center p-8 text-center">
                <img
                  src={formData.heroSlides[0].imageUrl}
                  alt={formData.heroSlides[0].titleFa}
                  className="absolute inset-0 w-full h-full object-cover filter brightness-50"
                />
                <div className="relative z-10 max-w-2xl space-y-4">
                  {formData.heroSlides[0].badgeFa && (
                    <span className="inline-block bg-[#ba8d3d] text-black text-xs font-bold px-3 py-1 rounded-full">
                      {formData.heroSlides[0].badgeFa}
                    </span>
                  )}
                  <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">
                    {formData.heroSlides[0].titleFa}
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-200 drop-shadow">
                    {formData.heroSlides[0].subtitleFa}
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button className="bg-[#ba8d3d] hover:bg-[#c99b49] text-black font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg">
                      {formData.heroSlides[0].ctaTextFa}
                    </button>
                    {formData.heroSlides[0].secondaryCtaTextFa && (
                      <button className="bg-black/60 hover:bg-black/80 border border-white/20 text-white font-bold text-xs px-5 py-2.5 rounded-xl">
                        {formData.heroSlides[0].secondaryCtaTextFa}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mock Featured Products Grid */}
            <div className="p-8 space-y-6">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-white">محصولات برگزیده دراپ پاییزه</h2>
                <p className="text-xs text-stone-400">انتخاب‌شده از کاتالوگ رسمی کارگاه شاه‌پوش</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {formData.featuredProductIds.slice(0, 4).map((pId) => {
                  const prod = allProducts.find((p) => p.id === pId);
                  if (!prod) return null;
                  return (
                    <div
                      key={pId}
                      className="bg-[#131211] border border-white/5 rounded-2xl p-3 space-y-2 hover:border-[#eed29d]/30 transition-colors"
                    >
                      <div className="aspect-square rounded-xl bg-stone-900 overflow-hidden">
                        <img
                          src={prod.primaryImage || prod.images[0] || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=200'}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs font-bold text-white truncate">{prod.name}</div>
                      <div className="text-xs text-[#eed29d] font-fanum">
                        {toFaDigits(prod.basePriceTomans.toLocaleString())} تومان
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mock Studio Teaser */}
            {formData.studioTeaserBlock.enabled && (
              <div className="m-8 p-6 rounded-3xl bg-[#131211] border border-white/10 flex flex-col md:flex-row items-center gap-6">
                <div className="aspect-[4/3] w-full md:w-56 rounded-2xl overflow-hidden bg-stone-900 shrink-0">
                  <img
                    src={formData.studioTeaserBlock.previewMockupUrl}
                    alt="DTG Studio"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-white">
                    {formData.studioTeaserBlock.titleFa}
                  </h3>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {formData.studioTeaserBlock.descriptionFa}
                  </p>
                  <button className="bg-[#ba8d3d] text-black font-bold text-xs px-4 py-2 rounded-xl">
                    {formData.studioTeaserBlock.ctaTextFa}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: REVISION HISTORY */}
      {activeTab === 'revisions' && (
        <div className="bg-[#131211] border border-white/10 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white">تاریخچه بازبینی‌ها و تغییرات صفحه اصلی</h3>
            <span className="text-xs text-stone-400">
              ثبت شفاف نام اپراتور و زمان دقیق ویرایش
            </span>
          </div>

          <div className="space-y-3">
            {formData.revisionHistory?.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-2xl bg-[#0c0b0a] border border-white/5 flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-white">{rev.changeSummary}</div>
                  <div className="text-[11px] text-stone-400 flex items-center gap-2">
                    <span>{rev.actorName}</span>
                    <span>•</span>
                    <span className="font-fanum">{new Date(rev.timestamp).toLocaleString('fa-IR')}</span>
                  </div>
                </div>
                <Badge variant={rev.status === 'published' ? 'success' : 'neutral'}>
                  {rev.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SLIDE EDIT MODAL */}
      {isSlideModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131211] border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-sm font-bold text-white">
                {editingSlideIndex !== null ? 'ویرایش اسلاید هیرو' : 'افزودن اسلاید هیرو جدید'}
              </h2>
              <button
                onClick={() => setIsSlideModalOpen(false)}
                className="text-stone-400 hover:text-white text-xs"
              >
                انصراف
              </button>
            </div>

            <div className="space-y-3">
              <FormField label="عنوان اصلی اسلاید (فارسی)">
                <Input
                  value={slideForm.titleFa}
                  onChange={(e) => setSlideForm({ ...slideForm, titleFa: e.target.value })}
                />
              </FormField>

              <FormField label="زیرعنوان و توضیحات (فارسی)">
                <Input
                  value={slideForm.subtitleFa}
                  onChange={(e) => setSlideForm({ ...slideForm, subtitleFa: e.target.value })}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="متن دکمه اول">
                  <Input
                    value={slideForm.ctaTextFa}
                    onChange={(e) => setSlideForm({ ...slideForm, ctaTextFa: e.target.value })}
                  />
                </FormField>
                <FormField label="لینک دکمه اول">
                  <Input
                    value={slideForm.ctaLink}
                    onChange={(e) => setSlideForm({ ...slideForm, ctaLink: e.target.value })}
                    dir="ltr"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="متن دکمه دوم (اختیاری)">
                  <Input
                    value={slideForm.secondaryCtaTextFa}
                    onChange={(e) =>
                      setSlideForm({ ...slideForm, secondaryCtaTextFa: e.target.value })
                    }
                  />
                </FormField>
                <FormField label="لینک دکمه دوم">
                  <Input
                    value={slideForm.secondaryCtaLink}
                    onChange={(e) =>
                      setSlideForm({ ...slideForm, secondaryCtaLink: e.target.value })
                    }
                    dir="ltr"
                  />
                </FormField>
              </div>

              <FormField label="آدرس تصویر پس‌زمینه (URL)">
                <Input
                  value={slideForm.imageUrl}
                  onChange={(e) => setSlideForm({ ...slideForm, imageUrl: e.target.value })}
                  dir="ltr"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="بج / نشانک (مانند: لیمیتد ادیشن)">
                  <Input
                    value={slideForm.badgeFa}
                    onChange={(e) => setSlideForm({ ...slideForm, badgeFa: e.target.value })}
                  />
                </FormField>
                <FormField label="ترتیب نمایش">
                  <Input
                    type="number"
                    value={slideForm.displayOrder}
                    onChange={(e) =>
                      setSlideForm({ ...slideForm, displayOrder: Number(e.target.value) || 1 })
                    }
                  />
                </FormField>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsSlideModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleSaveSlide}>
                ذخیره اسلاید
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
