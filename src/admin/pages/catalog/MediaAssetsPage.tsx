import React, { useState, useMemo } from 'react';
import { Image as ImageIcon, Plus, Trash2, Copy, Check, Filter, ExternalLink, Sparkles } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, SearchInput, Badge, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { MediaAsset } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

export const MediaAssetsPage: React.FC = () => {
  const { getMediaAssets, addMediaAsset, deleteMediaAsset, state } = useAdminRepository();
  const { addToast } = useToast();
  const mediaAssets = getMediaAssets();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // New Media Form
  const [newAsset, setNewAsset] = useState<Partial<MediaAsset>>({
    url: '',
    title: '',
    altText: '',
    category: 'product_photo',
    dimensions: '800x800',
    aspectRatio: '1:1',
    fileSizeBytes: 420000,
    format: 'webp',
  });

  const filtered = useMemo(() => {
    return mediaAssets.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.altText.toLowerCase().includes(search.toLowerCase()) ||
        item.url.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [mediaAssets, search, categoryFilter]);

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateAsset = () => {
    if (!newAsset.url?.trim()) {
      addToast({
        title: 'خطای ورودی تصویر',
        description: 'آدرس URL تصویر رسانه الزامی است.',
        type: 'error',
      });
      return;
    }
    addMediaAsset({
      url: newAsset.url.trim(),
      filename: newAsset.title ? `${newAsset.title.toLowerCase().replace(/\s+/g, '-')}.webp` : 'studio-shot.webp',
      title: newAsset.title?.trim() || 'شات استودیویی شاه‌پوش',
      altText: newAsset.altText?.trim() || 'تصویر پوشاک شاه‌پوش',
      category: newAsset.category || 'product_photo',
      dimensions: newAsset.dimensions || '800x800',
      aspectRatio: newAsset.aspectRatio || '1:1',
      fileSizeBytes: newAsset.fileSizeBytes || 350000,
      format: newAsset.format || 'webp',
      associatedProductIds: [],
    });
    addToast({
      title: 'رسانه افزوده شد',
      description: 'فایل تصویری با موفقیت به کتابخانه رسانه شاه‌پوش اضافه شد.',
      type: 'success',
    });
    setIsUploadModalOpen(false);
    setNewAsset({
      url: '',
      title: '',
      altText: '',
      category: 'product_photo',
      dimensions: '800x800',
      aspectRatio: '1:1',
      fileSizeBytes: 420000,
      format: 'webp',
    });
  };

  const handleDelete = (id: string) => {
    const confirm = window.confirm('آیا از حذف این فایل چندرسانه‌ای اطمینان دارید؟');
    if (!confirm) return;
    deleteMediaAsset(id);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="کتابخانه رسانه‌ها و تصاویر استودیو"
        description="شات‌های آتلیه‌ای، تصاویر بافت پارچه‌های ارگانیک، موکاپ‌های برش الگو و مستندات گرافیکی."
        actions={
          <Button variant="brass" size="sm" onClick={() => setIsUploadModalOpen(true)}>
            <Plus size={13} className="ml-1" />
            افزودن تصویر جدید
          </Button>
        }
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="w-72">
          <SearchInput
            placeholder="جستجو در عنوان یا متن Alt تصویر..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'همه فایل‌ها' },
            { id: 'product_photo', label: 'شات محصول' },
            { id: 'fabric_detail', label: 'بافت پارچه' },
            { id: 'model_shot', label: 'تن‌پوش مانکن' },
            { id: 'mockup', label: 'موکاپ خط تولید' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                categoryFilter === cat.id
                  ? 'bg-[#eed29d] text-black shadow-md'
                  : 'bg-[#131211] text-stone-400 border border-white/10 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((item) => {
          const isCopied = copiedId === item.id;
          return (
            <div
              key={item.id}
              className="bg-[#131211] border border-white/10 rounded-2xl p-3 flex flex-col justify-between hover:border-white/20 transition-all group"
            >
              <div>
                <div className="aspect-square rounded-xl overflow-hidden bg-black/60 relative mb-3">
                  <img
                    src={item.url}
                    alt={item.altText}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 right-2 bg-black/70 backdrop-blur-md text-stone-300 text-[10px] font-mono px-2 py-0.5 rounded border border-white/10">
                    {item.dimensions}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white line-clamp-1">{item.title}</h4>
                  <p className="text-[10px] text-stone-400 line-clamp-1">{item.altText}</p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/5 mt-3 flex items-center justify-between text-xs">
                <span className="text-[10px] font-mono uppercase text-stone-500">{item.format}</span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleCopyUrl(item.url, item.id)}
                    className="p-1.5 text-stone-400 hover:text-[#eed29d] bg-white/5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1 text-[10px]"
                    title="کپی لینک تصویر"
                  >
                    {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{isCopied ? 'کپی شد' : 'لینک'}</span>
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-stone-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="حذف رسانه"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181716] border border-white/20 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ImageIcon size={16} className="text-[#eed29d]" />
              پیوست تصویر جدید به کتابخانه
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-300 mb-1">
                  آدرس اینترنتی تصویر (URL) <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  value={newAsset.url}
                  onChange={(e) => setNewAsset({ ...newAsset, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-[#eed29d] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-300 mb-1">عنوان تصویر</label>
                <input
                  type="text"
                  value={newAsset.title}
                  onChange={(e) => setNewAsset({ ...newAsset, title: e.target.value })}
                  placeholder="مثال: شات استودیویی تیشرت هیچ مشکی"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#eed29d] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-300 mb-1">متن جایگزین (Alt Text جهت سئو)</label>
                <input
                  type="text"
                  value={newAsset.altText}
                  onChange={(e) => setNewAsset({ ...newAsset, altText: e.target.value })}
                  placeholder="توضیح نمای دیداری جهت موتورهای جستجو..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#eed29d] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-300 mb-1">دسته‌بندی</label>
                  <select
                    value={newAsset.category}
                    onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value as any })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white focus:border-[#eed29d] focus:outline-none"
                  >
                    <option value="product_photo">شات محصول</option>
                    <option value="fabric_detail">بافت پارچه</option>
                    <option value="model_shot">تن‌پوش مانکن</option>
                    <option value="mockup">موکاپ تولید</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-300 mb-1">ابعاد پیکسل</label>
                  <input
                    type="text"
                    value={newAsset.dimensions}
                    onChange={(e) => setNewAsset({ ...newAsset, dimensions: e.target.value })}
                    placeholder="800x800"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-[#eed29d] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleCreateAsset}>
                ثبت تصویر
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
