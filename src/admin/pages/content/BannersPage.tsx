import React, { useState, useMemo } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  Eye,
  CheckCircle2,
  AlertCircle,
  Palette,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, SearchInput, Badge, FormField, Input, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { StoreBanner } from '../../domain/types';

export const BannersPage: React.FC = () => {
  const { getStoreBanners, createStoreBanner, updateStoreBanner, deleteStoreBanner } =
    useAdminRepository();
  const { addToast } = useToast();
  const banners = getStoreBanners();

  const [search, setSearch] = useState('');
  const [slotFilter, setSlotFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<StoreBanner>>({
    title: '',
    slot: 'middle_collection',
    contentFa: '',
    contentEn: '',
    imageUrl: '',
    linkUrl: '',
    backgroundColorHex: '#131211',
    textColorHex: '#eed29d',
    status: 'published',
  });

  const filteredBanners = useMemo(() => {
    return banners.filter((b) => {
      const matchSearch =
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.contentFa.toLowerCase().includes(search.toLowerCase());
      const matchSlot = slotFilter === 'all' || b.slot === slotFilter;
      return matchSearch && matchSlot;
    });
  }, [banners, search, slotFilter]);

  const handleOpenCreate = () => {
    setEditingBannerId(null);
    setFormData({
      title: 'بنر جدید کلکسیون',
      slot: 'middle_collection',
      contentFa: 'شعار و فراخوان جدید کالکشن شاه‌پوش با بافت فاخر پنبه سنگین.',
      contentEn: 'New collection banner with luxury heavyweight cotton apparel.',
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80',
      linkUrl: '/collections/shahneshin',
      backgroundColorHex: '#131211',
      textColorHex: '#eed29d',
      status: 'published',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: StoreBanner) => {
    setEditingBannerId(b.id);
    setFormData({ ...b });
    setIsModalOpen(true);
  };

  const handleSaveBanner = () => {
    if (!formData.title?.trim() || !formData.contentFa?.trim()) {
      addToast({
        title: 'فیلدهای ناقص بنر',
        description: 'عنوان و متن فارسی بنر الزامی هستند.',
        type: 'error',
      });
      return;
    }

    const payload = {
      title: formData.title.trim(),
      slot: formData.slot || 'middle_collection',
      contentFa: formData.contentFa.trim(),
      contentEn: formData.contentEn?.trim(),
      imageUrl: formData.imageUrl?.trim(),
      linkUrl: formData.linkUrl?.trim(),
      backgroundColorHex: formData.backgroundColorHex || '#131211',
      textColorHex: formData.textColorHex || '#ffffff',
      status: formData.status || 'published',
    };

    if (editingBannerId) {
      updateStoreBanner(editingBannerId, payload, 'سهراب اخوان (مدیر محتوا)');
      addToast({
        title: 'بنر ویرایش شد',
        description: `تغییرات بنر «${payload.title}» ذخیره گردید.`,
        type: 'success',
      });
    } else {
      createStoreBanner(payload, 'سهراب اخوان (مدیر محتوا)');
      addToast({
        title: 'بنر ایجاد شد',
        description: `بنر جدید «${payload.title}» با موفقیت افزوده شد.`,
        type: 'success',
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`آیا از حذف بنر «${title}» اطمینان دارید؟`)) {
      deleteStoreBanner(id, 'سهراب اخوان');
    }
  };

  const getSlotLabel = (slot: StoreBanner['slot']) => {
    switch (slot) {
      case 'top_announcement':
        return 'نوار اعلان بالای سایت';
      case 'middle_collection':
        return 'بنر میانی کالکشن';
      case 'footer_vip':
        return 'بنر انتهای صفحه (VIP)';
      case 'hero_secondary':
        return 'بنر ثانویه هیرو';
      default:
        return slot;
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="بنرهای تبلیغاتی و جایگاه‌های ویترین (Storefront Banners)"
        description="مدیریت بنرهای اسلات‌بندی‌شده، تنظیم رنگ، تصویر پس‌زمینه، متن‌های دوزبانه و وضعیت نمایش در استورفرانت."
        actions={
          <Button variant="brass" size="sm" onClick={handleOpenCreate}>
            <Plus size={13} className="ml-1" />
            افزودن بنر جدید
          </Button>
        }
      />

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#131211] border border-white/10 rounded-2xl p-4">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در عنوان یا متن بنر..."
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={slotFilter}
            onChange={(e) => setSlotFilter(e.target.value)}
            className="bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-stone-300"
          >
            <option value="all">همه جایگاه‌ها (Slots)</option>
            <option value="top_announcement">نوار اعلان بالای سایت</option>
            <option value="middle_collection">بنر میانی کالکشن</option>
            <option value="footer_vip">بنر انتهای صفحه (VIP)</option>
          </select>
        </div>
      </div>

      {/* Visual Banners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredBanners.map((banner) => (
          <div
            key={banner.id}
            className="bg-[#131211] border border-white/10 rounded-3xl p-5 space-y-4 relative flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{banner.title}</h3>
                  <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-[#eed29d]">{banner.id}</span>
                    <span>•</span>
                    <span>{getSlotLabel(banner.slot)}</span>
                  </div>
                </div>
                <Badge variant={banner.status === 'published' ? 'success' : 'neutral'}>
                  {banner.status === 'published' ? 'منتشرشده' : 'پیش‌نویس'}
                </Badge>
              </div>

              {/* Rendered Live Visual Banner Card */}
              <div
                style={{
                  backgroundColor: banner.backgroundColorHex || '#131211',
                  color: banner.textColorHex || '#ffffff',
                }}
                className="rounded-2xl p-5 border border-white/15 relative overflow-hidden min-h-[120px] flex flex-col justify-center space-y-2 shadow-inner"
              >
                {banner.imageUrl && (
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="relative z-10 text-xs font-bold leading-relaxed">
                  {banner.contentFa}
                </div>
                {banner.contentEn && (
                  <div className="relative z-10 text-[10px] opacity-75 font-mono" dir="ltr">
                    {banner.contentEn}
                  </div>
                )}
                {banner.linkUrl && (
                  <div className="relative z-10 pt-1">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold underline">
                      <span>لینک: {banner.linkUrl}</span>
                      <ExternalLink size={10} />
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-stone-400">
              <span className="text-[11px]">
                به‌روزرسانی: {new Date(banner.updatedAt).toLocaleDateString('fa-IR')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(banner)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/5"
                  title="ویرایش بنر"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={() => handleDelete(banner.id, banner.title)}
                  className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  title="حذف بنر"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131211] border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-sm font-bold text-white">
                {editingBannerId ? 'ویرایش بنر جایگاه' : 'افزودن بنر تبلیغاتی جدید'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white text-xs"
              >
                انصراف
              </button>
            </div>

            <div className="space-y-3">
              <FormField label="عنوان داخلی بنر">
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: بنر ارسال رایگان"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="جایگاه قرارگیری در سایت (Slot)">
                  <select
                    value={formData.slot}
                    onChange={(e) => setFormData({ ...formData, slot: e.target.value as any })}
                    className="w-full bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="top_announcement">نوار اعلان بالای سایت</option>
                    <option value="middle_collection">بنر میانی کالکشن</option>
                    <option value="footer_vip">بنر انتهای صفحه (VIP)</option>
                    <option value="hero_secondary">بنر ثانویه هیرو</option>
                  </select>
                </FormField>

                <FormField label="وضعیت انتشار">
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="published">منتشرشده</option>
                    <option value="draft">پیش‌نویس</option>
                  </select>
                </FormField>
              </div>

              <FormField label="متن پیام بنر (فارسی)">
                <textarea
                  value={formData.contentFa}
                  onChange={(e) => setFormData({ ...formData, contentFa: e.target.value })}
                  rows={2}
                  className="w-full bg-[#1c1a17] border border-white/10 rounded-xl p-3 text-xs text-white resize-none"
                />
              </FormField>

              <FormField label="متن پیام بنر (انگلیسی - اختیاری)">
                <Input
                  value={formData.contentEn || ''}
                  onChange={(e) => setFormData({ ...formData, contentEn: e.target.value })}
                  dir="ltr"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="رنگ پس‌زمینه">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.backgroundColorHex}
                      onChange={(e) =>
                        setFormData({ ...formData, backgroundColorHex: e.target.value })
                      }
                      className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                    />
                    <Input
                      value={formData.backgroundColorHex}
                      onChange={(e) =>
                        setFormData({ ...formData, backgroundColorHex: e.target.value })
                      }
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </FormField>

                <FormField label="رنگ متن">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.textColorHex}
                      onChange={(e) => setFormData({ ...formData, textColorHex: e.target.value })}
                      className="w-8 h-8 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                    />
                    <Input
                      value={formData.textColorHex}
                      onChange={(e) => setFormData({ ...formData, textColorHex: e.target.value })}
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </FormField>
              </div>

              <FormField label="آدرس تصویر پس‌زمینه (اختیاری)">
                <Input
                  value={formData.imageUrl || ''}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                />
              </FormField>

              <FormField label="آدرس لینک مقصد (URL)">
                <Input
                  value={formData.linkUrl || ''}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="/collections/shahneshin"
                  dir="ltr"
                />
              </FormField>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleSaveBanner}>
                {editingBannerId ? 'ذخیره تغییرات' : 'ایجاد بنر'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
