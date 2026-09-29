import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  ExternalLink,
  Save,
  Globe,
  Layers,
  History,
  AlertCircle,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, SearchInput, Badge, FormField, Input, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { CmsCustomPage } from '../../domain/types';

export const PagesCmsPage: React.FC = () => {
  const { getCmsPages, createCmsPage, updateCmsPage, deleteCmsPage } = useAdminRepository();
  const { addToast } = useToast();
  const pages = getCmsPages();

  const [search, setSearch] = useState('');
  const [selectedPageForPreview, setSelectedPageForPreview] = useState<CmsCustomPage | null>(null);

  // Edit / Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CmsCustomPage>>({
    slug: '',
    titleFa: '',
    titleEn: '',
    summaryFa: '',
    status: 'published',
    seoTitle: '',
    seoDescription: '',
    canonicalUrl: '',
    authorName: 'سهراب اخوان',
    blocks: [
      {
        id: 'BLK-1',
        type: 'rich_text',
        contentJson: {
          heading: 'عنوان بخش نخست',
          body: 'متن بیانیه و پاراگراف توضیحی صفحه جدید.',
        },
      },
    ],
  });

  const filteredPages = pages.filter((p) => {
    return (
      p.titleFa.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleOpenCreate = () => {
    setEditingPageId(null);
    setFormData({
      slug: 'new-page',
      titleFa: 'صفحه جدید کارگاه شاه‌پوش',
      titleEn: 'New Brand Page',
      summaryFa: 'خلاصه محتوای صفحه استاتیک جهت معرفی در فوتر و منوها.',
      status: 'published',
      seoTitle: 'صفحه جدید · شاه‌پوش',
      seoDescription: 'توضیحات متای این صفحه برای موتورهای جستجو.',
      canonicalUrl: 'https://shahpoosh.ir/pages/new-page',
      authorName: 'سهراب اخوان',
      blocks: [
        {
          id: `BLK-${Date.now()}`,
          type: 'rich_text',
          contentJson: {
            heading: 'عنوان بخش اول',
            body: 'توضیحات و جزئیات بیانیه کارگاه در این بخش درج می‌شود.',
          },
        },
      ],
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: CmsCustomPage) => {
    setEditingPageId(p.id);
    setFormData({ ...p });
    setIsModalOpen(true);
  };

  const handleSavePage = () => {
    if (!formData.titleFa?.trim() || !formData.slug?.trim()) {
      addToast({
        title: 'فیلدهای ناقص صفحه',
        description: 'عنوان صفحه و شناسه نامک (Slug) الزامی هستند.',
        type: 'error',
      });
      return;
    }

    const payload = {
      slug: formData.slug.trim().toLowerCase().replace(/\s+/g, '-'),
      titleFa: formData.titleFa.trim(),
      titleEn: formData.titleEn?.trim(),
      summaryFa: formData.summaryFa?.trim(),
      status: formData.status || 'published',
      seoTitle: formData.seoTitle?.trim(),
      seoDescription: formData.seoDescription?.trim(),
      canonicalUrl: formData.canonicalUrl?.trim() || `https://shahpoosh.ir/pages/${formData.slug}`,
      authorName: formData.authorName?.trim() || 'سهراب اخوان',
      blocks: formData.blocks || [],
    };

    if (editingPageId) {
      updateCmsPage(editingPageId, payload, 'سهراب اخوان', 'به‌روزرسانی محتوای صفحه استاتیک');
      addToast({
        title: 'صفحه ذخیره شد',
        description: `تغییرات صفحه «${payload.titleFa}» ذخیره گردید.`,
        type: 'success',
      });
    } else {
      createCmsPage(payload, 'سهراب اخوان');
      addToast({
        title: 'صفحه جدید ایجاد شد',
        description: `صفحه «${payload.titleFa}» با موفقیت انتشار یافت.`,
        type: 'success',
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`آیا از حذف صفحه «${title}» اطمینان دارید؟`)) {
      deleteCmsPage(id, 'سهراب اخوان');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="صفحات استاتیک و محتوای متنی (Custom Pages)"
        description="مدیریت صفحات درباره ما، راهنمای شستشوی چاپ مستقیم، جدول سایزبندی، شرایط گارانتی و تنظیم متادیتاهای سئو."
        actions={
          <Button variant="brass" size="sm" onClick={handleOpenCreate}>
            <Plus size={13} className="ml-1" />
            ایجاد صفحه جدید
          </Button>
        }
      />

      {/* Search Bar */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در عنوان یا نامک صفحه..."
          />
        </div>
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredPages.map((page) => (
          <div
            key={page.id}
            className="bg-[#131211] border border-white/10 rounded-3xl p-5 flex flex-col justify-between space-y-4 hover:border-[#eed29d]/30 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-[#eed29d] bg-[#1c1a17] px-2 py-0.5 rounded border border-white/5">
                  /pages/{page.slug}
                </span>
                <Badge variant={page.status === 'published' ? 'success' : 'neutral'}>
                  {page.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'}
                </Badge>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{page.titleFa}</h3>
                {page.titleEn && (
                  <div className="text-[11px] text-stone-500 font-mono mt-0.5" dir="ltr">
                    {page.titleEn}
                  </div>
                )}
              </div>

              {page.summaryFa && (
                <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                  {page.summaryFa}
                </p>
              )}

              <div className="pt-2 border-t border-white/5 text-[11px] text-stone-500 space-y-1 font-fanum">
                <div>نگارنده: {page.authorName}</div>
                <div>آخرین ویرایش: {new Date(page.updatedAt).toLocaleDateString('fa-IR')}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
              <button
                onClick={() => setSelectedPageForPreview(page)}
                className="text-xs text-stone-300 hover:text-[#eed29d] flex items-center gap-1"
              >
                <Eye size={13} />
                <span>پیش‌نمایش</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(page)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/5"
                  title="ویرایش صفحه"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(page.id, page.titleFa)}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  title="حذف صفحه"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PAGE PREVIEW MODAL */}
      {selectedPageForPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131211] border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[11px] text-[#eed29d] font-mono">
                  https://shahpoosh.ir/pages/{selectedPageForPreview.slug}
                </span>
                <h2 className="text-base font-bold text-white mt-1">
                  {selectedPageForPreview.titleFa}
                </h2>
              </div>
              <button
                onClick={() => setSelectedPageForPreview(null)}
                className="text-stone-400 hover:text-white text-xs"
              >
                بستن
              </button>
            </div>

            <div className="p-6 rounded-2xl bg-[#0c0b0a] border border-white/5 space-y-6 max-h-[60vh] overflow-y-auto">
              {selectedPageForPreview.summaryFa && (
                <div className="p-4 rounded-xl bg-[#1c1a17] border border-white/5 text-xs text-stone-300 leading-relaxed font-bold">
                  {selectedPageForPreview.summaryFa}
                </div>
              )}

              {selectedPageForPreview.blocks?.map((block) => (
                <div key={block.id} className="space-y-3">
                  {block.type === 'rich_text' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-white border-r-2 border-[#ba8d3d] pr-2">
                        {block.contentJson?.heading}
                      </h3>
                      <p className="text-xs text-stone-300 leading-relaxed whitespace-pre-line">
                        {block.contentJson?.body}
                      </p>
                    </div>
                  )}

                  {block.type === 'features_grid' && block.contentJson?.items && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {block.contentJson.items.map((item: any, i: number) => (
                        <div key={i} className="p-3 rounded-xl bg-[#181614] border border-white/5 space-y-1">
                          <div className="text-xs font-bold text-white">{item.title}</div>
                          <div className="text-[11px] text-stone-400">{item.desc}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-stone-400">
              <span>نگارنده: {selectedPageForPreview.authorName}</span>
              <Button variant="brass" size="sm" onClick={() => setSelectedPageForPreview(null)}>
                متوجه شدم
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131211] border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-sm font-bold text-white">
                {editingPageId ? 'ویرایش صفحه استاتیک' : 'ایجاد صفحه استاتیک جدید'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white text-xs"
              >
                انصراف
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="نامک صفحه (Slug انگلیسی)">
                  <Input
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })
                    }
                    placeholder="about-us, care-instructions..."
                    dir="ltr"
                  />
                </FormField>

                <FormField label="وضعیت انتشار">
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="published">منتشرشده (Published)</option>
                    <option value="draft">پیش‌نویس (Draft)</option>
                  </select>
                </FormField>
              </div>

              <FormField label="عنوان اصلی صفحه (فارسی)">
                <Input
                  value={formData.titleFa}
                  onChange={(e) => setFormData({ ...formData, titleFa: e.target.value })}
                  placeholder="مثال: داستان و بیانیه برند شاه‌پوش"
                />
              </FormField>

              <FormField label="عنوان انگلیسی صفحه (اختیاری)">
                <Input
                  value={formData.titleEn || ''}
                  onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                  placeholder="About Shahpoosh"
                  dir="ltr"
                />
              </FormField>

              <FormField label="خلاصه و پیش‌گفتار صفحه">
                <textarea
                  value={formData.summaryFa || ''}
                  onChange={(e) => setFormData({ ...formData, summaryFa: e.target.value })}
                  rows={2}
                  className="w-full bg-[#1c1a17] border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
                />
              </FormField>

              {/* Block 1 editor */}
              <div className="p-4 rounded-2xl bg-[#0c0b0a] border border-white/10 space-y-3">
                <div className="text-xs font-bold text-[#eed29d]">بخش محتوای متنی اصلی (Rich Text Block)</div>
                <FormField label="تیتر بخش">
                  <Input
                    value={formData.blocks?.[0]?.contentJson?.heading || ''}
                    onChange={(e) => {
                      const updatedBlocks = [...(formData.blocks || [])];
                      if (!updatedBlocks[0]) {
                        updatedBlocks[0] = { id: 'BLK-1', type: 'rich_text', contentJson: {} };
                      }
                      updatedBlocks[0].contentJson.heading = e.target.value;
                      setFormData({ ...formData, blocks: updatedBlocks });
                    }}
                  />
                </FormField>

                <FormField label="متن کامل و پاراگراف‌ها">
                  <textarea
                    value={formData.blocks?.[0]?.contentJson?.body || ''}
                    onChange={(e) => {
                      const updatedBlocks = [...(formData.blocks || [])];
                      if (!updatedBlocks[0]) {
                        updatedBlocks[0] = { id: 'BLK-1', type: 'rich_text', contentJson: {} };
                      }
                      updatedBlocks[0].contentJson.body = e.target.value;
                      setFormData({ ...formData, blocks: updatedBlocks });
                    }}
                    rows={4}
                    className="w-full bg-[#1c1a17] border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
                  />
                </FormField>
              </div>

              {/* SEO Fields */}
              <div className="p-4 rounded-2xl bg-[#0c0b0a] border border-white/10 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Globe size={14} className="text-[#eed29d]" />
                  <span>تنظیمات متادیتا و سئو اختصاصی این صفحه</span>
                </div>

                <FormField label="تگ عنوان مرورگر (SEO Title Tag)">
                  <Input
                    value={formData.seoTitle || ''}
                    onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                  />
                </FormField>

                <FormField label="توضیحات متا برای گوگل (Meta Description)">
                  <textarea
                    value={formData.seoDescription || ''}
                    onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                    rows={2}
                    className="w-full bg-[#1c1a17] border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
                  />
                </FormField>

                <FormField label="آدرس کنونیکال (Canonical URL)">
                  <Input
                    value={formData.canonicalUrl || ''}
                    onChange={(e) => setFormData({ ...formData, canonicalUrl: e.target.value })}
                    dir="ltr"
                  />
                </FormField>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleSavePage}>
                {editingPageId ? 'ذخیره صفحه' : 'ایجاد و انتشار صفحه'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
