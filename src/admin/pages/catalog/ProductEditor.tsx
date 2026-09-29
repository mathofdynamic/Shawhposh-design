import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowRight,
  Save,
  Trash2,
  Eye,
  Plus,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Layers,
  Shirt,
  Image as ImageIcon,
  DollarSign,
  Search,
  ExternalLink,
  Info,
  Copy,
  Sliders,
  Check,
} from 'lucide-react';
import { AdminProduct, ProductVariant } from '../../domain/types';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router';
import { Button, Badge, MoneyDisplay, useToast } from '../../components/ui';
import { toFaDigits } from '../../utils/formatters';

interface ProductEditorProps {
  productId?: string; // If undefined, "new product" mode
  onBack?: () => void;
}

type EditorTab = 'basic' | 'fabric' | 'pricing' | 'media' | 'variants' | 'seo' | 'preview';

export const ProductEditor: React.FC<ProductEditorProps> = ({ productId, onBack }) => {
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();
  const {
    state,
    getProductById,
    getCategories,
    getCollections,
    createProduct,
    updateProduct,
    deleteProduct,
  } = useAdminRepository();

  const isNew = !productId || productId === 'new';
  const existingProduct = useMemo(() => {
    return isNew ? undefined : getProductById(productId);
  }, [productId, isNew, getProductById]);

  const categories = getCategories();
  const collections = getCollections();

  // Active Tab
  const [activeTab, setActiveTab] = useState<EditorTab>('basic');

  // Form State
  const [formData, setFormData] = useState<Partial<AdminProduct>>({
    id: '',
    skuPrefix: '',
    name: '',
    nameEn: '',
    category: 'calligraphy',
    collectionIds: [],
    basePriceTomans: 380000,
    originalPriceTomans: 440000,
    discountPercent: 14,
    discountStartDate: '',
    discountEndDate: '',
    description: '',
    fabricSpecs: '۱۰۰٪ پنبه ارگانیک سوپر دو نخ ۲۴۰ گرم شانه شده',
    cut: 'لش فیت (Oversized Drop-Shoulder) قواره خیابانی',
    measurements: 'عرض سینه: ۵۸ سانتی‌متر | قد کل: ۷۶ سانتی‌متر | طول آستین: ۲۵ سانتی‌متر',
    careInstructions: 'شستشو با ماشین لباسشویی با دمای ۳۰ درجه و پشت‌ورو | بدون استفاده از سفیدکننده',
    printingMethod: 'چاپ دیجیتال مستقیم (DTG Brother GTX PRO) با جوهرهای دوست‌دار محیط زیست',
    images: ['https://picsum.photos/seed/sp_new_1/800/800'],
    primaryImage: 'https://picsum.photos/seed/sp_new_1/800/800',
    imageAlts: {},
    isLive: true,
    status: 'active',
    productType: 'finished',
    isCustomizable: false,
    permittedPrintAreas: ['front_chest', 'back_full'],
    printingTechnique: 'DTG',
    slug: '',
    seoTitle: '',
    seoMetaDescription: '',
    tags: ['تیشرت', 'پنبه سوپر'],
    variants: [],
  });

  // Track initial state for unsaved dirty check
  const [initialDataJson, setInitialDataJson] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // New Image URL input
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageAlt, setNewImageAlt] = useState('');

  // New Tag input
  const [newTagInput, setNewTagInput] = useState('');

  // Load product if editing
  useEffect(() => {
    if (existingProduct) {
      const data: Partial<AdminProduct> = {
        ...existingProduct,
        collectionIds: existingProduct.collectionIds || [],
        variants: existingProduct.variants.map((v) => ({ ...v })),
        imageAlts: { ...(existingProduct.imageAlts || {}) },
      };
      setFormData(data);
      const json = JSON.stringify(data);
      setInitialDataJson(json);
      setIsDirty(false);
    } else if (isNew) {
      const initialNewId = `sp-${100 + state.products.length + 1}`;
      const defaultNew: Partial<AdminProduct> = {
        id: initialNewId,
        skuPrefix: `${initialNewId.toUpperCase()}-TSH`,
        name: '',
        nameEn: '',
        category: 'calligraphy',
        collectionIds: ['col-shahneshin'],
        basePriceTomans: 395000,
        originalPriceTomans: 460000,
        discountPercent: 14,
        description: 'تیشرت فاخر پنبه‌ای استریت‌ویر با هویت تایپوگرافی اصیل ایرانی',
        fabricSpecs: '۱۰۰٪ پنبه ارگانیک سوپر دو نخ ۲۴۰ گرم شانه شده ضد پرز',
        cut: 'لش فیت خیابانی (Oversized Drop-Shoulder)',
        measurements: 'عرض سینه: ۵۸ سانتی‌متر | قد کل: ۷۶ سانتی‌متر',
        careInstructions: 'شستشو با آب سرد ۳۰ درجه و پشت‌ورو بدون چلاندن شدید',
        printingMethod: 'چاپ دیجیتال مستقیم (DTG) با تفکیک رنگ صنعتی',
        images: [`https://picsum.photos/seed/${initialNewId}_hero/800/800`],
        primaryImage: `https://picsum.photos/seed/${initialNewId}_hero/800/800`,
        imageAlts: {},
        isLive: true,
        status: 'active',
        productType: 'finished',
        isCustomizable: false,
        permittedPrintAreas: ['front_chest', 'back_full'],
        printingTechnique: 'DTG',
        slug: `${initialNewId}-streetwear`,
        seoTitle: '',
        seoMetaDescription: '',
        tags: ['تیشرت', 'کالیگرافی'],
        variants: [
          {
            sku: `${initialNewId.toUpperCase()}-TSH-BLK-S`,
            productId: initialNewId,
            size: 'S',
            colorName: 'مشکی ذغالی',
            colorHex: '#1C1A1A',
            fit: 'oversize',
            material: '۱۰۰٪ پنبه ارگانیک دو نخ',
            onHandStock: 15,
            reservedStock: 0,
            minStockThreshold: 4,
            priceAdjustmentTomans: 0,
            isEnabled: true,
          },
          {
            sku: `${initialNewId.toUpperCase()}-TSH-BLK-M`,
            productId: initialNewId,
            size: 'M',
            colorName: 'مشکی ذغالی',
            colorHex: '#1C1A1A',
            fit: 'oversize',
            material: '۱۰۰٪ پنبه ارگانیک دو نخ',
            onHandStock: 25,
            reservedStock: 0,
            minStockThreshold: 5,
            priceAdjustmentTomans: 0,
            isEnabled: true,
          },
          {
            sku: `${initialNewId.toUpperCase()}-TSH-BLK-L`,
            productId: initialNewId,
            size: 'L',
            colorName: 'مشکی ذغالی',
            colorHex: '#1C1A1A',
            fit: 'oversize',
            material: '۱۰۰٪ پنبه ارگانیک دو نخ',
            onHandStock: 20,
            reservedStock: 0,
            minStockThreshold: 5,
            priceAdjustmentTomans: 0,
            isEnabled: true,
          },
          {
            sku: `${initialNewId.toUpperCase()}-TSH-BLK-XL`,
            productId: initialNewId,
            size: 'XL',
            colorName: 'مشکی ذغالی',
            colorHex: '#1C1A1A',
            fit: 'oversize',
            material: '۱۰۰٪ پنبه ارگانیک دو نخ',
            onHandStock: 10,
            reservedStock: 0,
            minStockThreshold: 4,
            priceAdjustmentTomans: 20000,
            isEnabled: true,
          },
        ],
      };
      setFormData(defaultNew);
      const json = JSON.stringify(defaultNew);
      setInitialDataJson(json);
      setIsDirty(false);
    }
  }, [productId, isNew, existingProduct, state.products.length]);

  // Check dirty status
  const handleFieldChange = <K extends keyof AdminProduct>(field: K, val: AdminProduct[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: val };
      setIsDirty(JSON.stringify(next) !== initialDataJson);
      return next;
    });
    setErrorMessage(null);
  };

  // Safe navigation back
  const handleBackRequest = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      if (onBack) onBack();
      else navigate('/admin/catalog/products');
    }
  };

  // Save changes
  const handleSave = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!formData.name || formData.name.trim() === '') {
      setErrorMessage('عنوان پوشاک الزامی است.');
      setActiveTab('basic');
      return;
    }

    const price = Number(formData.basePriceTomans);
    if (!price || price <= 0) {
      setErrorMessage('قیمت پایه محصول باید بزرگتر از صفر باشد.');
      setActiveTab('pricing');
      return;
    }

    if (!formData.variants || formData.variants.length === 0) {
      setErrorMessage('حداقل یک تنوع سایز و رنگ (SKU) برای محصول تعریف کنید.');
      setActiveTab('variants');
      return;
    }

    // Check SKU uniqueness in product's own matrix
    const skus = formData.variants.map((v) => v.sku);
    if (skus.length !== new Set(skus).size) {
      setErrorMessage('کدهای تنوع (SKU) داخل ماتریس محصول تکراری هستند.');
      setActiveTab('variants');
      return;
    }

    if (isNew) {
      const res = createProduct(formData);
      if (!res.success) {
        setErrorMessage(res.error || 'خطا در ثبت محصول جدید.');
      } else {
        setSuccessMessage('محصول جدید با موفقیت ایجاد گردید.');
        setIsDirty(false);
        setTimeout(() => {
          if (onBack) onBack();
          else navigate('/admin/catalog/products');
        }, 800);
      }
    } else {
      const res = updateProduct(productId!, formData);
      if (!res.success) {
        setErrorMessage(res.error || 'خطا در ذخیره تغییرات محصول.');
      } else {
        setSuccessMessage('مشخصات محصول با موفقیت به‌روزرسانی شد.');
        setIsDirty(false);
        setInitialDataJson(JSON.stringify(formData));
      }
    }
  };

  // Delete product with confirmation & invariant check
  const handleDelete = () => {
    if (isNew || !productId) return;
    const confirm = window.confirm(
      `آیا از حذف محصول «${formData.name}» (${productId}) اطمینان دارید؟ در صورت وجود سفارش برای این محصول، حذف ممنوع خواهد بود.`
    );
    if (!confirm) return;

    const res = deleteProduct(productId);
    if (!res.success) {
      setErrorMessage(res.error || 'امکان حذف این محصول وجود ندارد.');
    } else {
      addToast({
        title: 'محصول حذف شد',
        description: 'محصول با موفقیت از کاتالوگ فروشگاه حذف گردید.',
        type: 'success',
      });
      if (onBack) onBack();
      else navigate('/admin/catalog/products');
    }
  };

  // Add Image to gallery
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    const currentImages = formData.images || [];
    if (currentImages.includes(newImageUrl.trim())) {
      setErrorMessage('این آدرس تصویر قبلاً به گالری اضافه شده است.');
      return;
    }
    const updatedImages = [...currentImages, newImageUrl.trim()];
    const updatedAlts = {
      ...(formData.imageAlts || {}),
      ...(newImageAlt.trim() ? { [newImageUrl.trim()]: newImageAlt.trim() } : {}),
    };
    handleFieldChange('images', updatedImages);
    handleFieldChange('imageAlts', updatedAlts);
    setNewImageUrl('');
    setNewImageAlt('');
  };

  const handleRemoveImage = (urlToRemove: string) => {
    const currentImages = formData.images || [];
    if (currentImages.length <= 1) {
      setErrorMessage('محصول باید حداقل دارای یک تصویر باشد.');
      return;
    }
    const updated = currentImages.filter((img) => img !== urlToRemove);
    handleFieldChange('images', updated);
    if (formData.primaryImage === urlToRemove) {
      handleFieldChange('primaryImage', updated[0]);
    }
  };

  // Add Variant Row
  const handleAddVariant = () => {
    const pId = formData.id || 'SP-NEW';
    const prefix = formData.skuPrefix || `${pId.toUpperCase()}-TSH`;
    const newSku = `${prefix}-BLK-XXL-${Date.now().toString().slice(-4)}`;
    const newVariant: ProductVariant = {
      sku: newSku,
      productId: pId,
      size: 'XXL',
      colorName: 'مشکی ذغالی',
      colorHex: '#1C1A1A',
      fit: 'oversize',
      material: formData.fabricSpecs || '۱۰۰٪ پنبه ارگانیک دو نخ',
      onHandStock: 10,
      reservedStock: 0,
      minStockThreshold: 4,
      priceAdjustmentTomans: 30000,
      isEnabled: true,
    };
    const updated = [...(formData.variants || []), newVariant];
    handleFieldChange('variants', updated);
  };

  const handleUpdateVariant = (index: number, updates: Partial<ProductVariant>) => {
    const updated = [...(formData.variants || [])];
    updated[index] = { ...updated[index], ...updates };
    handleFieldChange('variants', updated);
  };

  const handleRemoveVariant = (index: number) => {
    const current = formData.variants || [];
    if (current.length <= 1) {
      setErrorMessage('محصول باید حداقل دارای ۱ تنوع فعال باشد.');
      return;
    }
    const variantToRemove = current[index];
    // Check if variant has customer orders
    const isReferencedInOrders = state.orders.some((o) =>
      o.items.some((i) => i.variantSku === variantToRemove.sku)
    );
    if (isReferencedInOrders) {
      setErrorMessage(
        `کد تنوع ${variantToRemove.sku} در سفارشات پیشین مشتریان ثبت شده و امکان حذف ندارد. می‌توانید تیک فعال‌بودن آن را بردارید.`
      );
      return;
    }
    const updated = current.filter((_, idx) => idx !== index);
    handleFieldChange('variants', updated);
  };

  // Tags
  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const current = formData.tags || [];
    if (!current.includes(newTagInput.trim())) {
      handleFieldChange('tags', [...current, newTagInput.trim()]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const current = formData.tags || [];
    handleFieldChange('tags', current.filter((t) => t !== tagToRemove));
  };

  // Calculate total stock
  const totalOnHand = useMemo(() => {
    return (formData.variants || []).reduce((acc, v) => acc + (Number(v.onHandStock) || 0), 0);
  }, [formData.variants]);

  const totalReserved = useMemo(() => {
    return (formData.variants || []).reduce((acc, v) => acc + (Number(v.reservedStock) || 0), 0);
  }, [formData.variants]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-16 z-20 backdrop-blur-md bg-opacity-95 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackRequest}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-stone-300 hover:text-white transition-colors border border-white/10"
            title="بازگشت به فهرست محصولات"
          >
            <ArrowRight size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-white">
                {isNew ? 'افزودن محصول و فرم جدید به کاتالوگ' : `ویرایش محصول: ${formData.name || 'بدون نام'}`}
              </h1>
              {isDirty && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  تغییرات ذخیره‌نشده
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              {isNew
                ? 'تعریف مشخصات فنی پارچه، الگو، ماتریس تنوع رنگ و سایز، و قیمت‌گذاری'
                : `شناسه محصول: ${formData.id} | پیش‌وند انبار: ${formData.skuPrefix} | ${toFaDigits(formData.variants?.length || 0)} تنوع SKU`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!isNew && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/30"
            >
              <Trash2 size={13} className="ml-1" />
              حذف محصول
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveTab('preview')}
          >
            <Eye size={13} className="ml-1" />
            پیش‌نمایش در فروشگاه
          </Button>

          <Button
            variant="brass"
            size="sm"
            onClick={handleSave}
            className="shadow-lg shadow-[#eed29d]/10"
          >
            <Save size={13} className="ml-1" />
            {isNew ? 'ثبت و انتشار محصول' : 'ذخیره نهایی تغییرات'}
          </Button>
        </div>
      </div>

      {/* Messages */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl flex items-center gap-3 text-xs">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-3 text-xs">
          <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-white/10 overflow-x-auto pb-1">
        {[
          { id: 'basic', label: 'اطلاعات اصلی و نامگذاری', icon: Layers },
          { id: 'fabric', label: 'مشخصات پارچه و چاپ', icon: Shirt },
          { id: 'pricing', label: 'قیمت‌گذاری و تخفیف', icon: DollarSign },
          { id: 'media', label: 'رسانه‌ها و گالری', icon: ImageIcon },
          { id: 'variants', label: `ماتریس تنوع‌ها (${toFaDigits(formData.variants?.length || 0)})`, icon: Sliders },
          { id: 'seo', label: 'سئو و متا تگ‌ها', icon: Search },
          { id: 'preview', label: 'پیش‌نمایش خریدار', icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as EditorTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#eed29d] text-black shadow-md'
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: BASIC INFO */}
      {activeTab === 'basic' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6 bg-[#131211] border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Layers size={16} className="text-[#eed29d]" />
              مشخصات اولیه و دسته‌بندی
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  عنوان فارسی محصول <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="مثال: تیشرت کالیگرافی هیچ مشکی سوپرپنبه"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-stone-600 focus:border-[#eed29d] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  عنوان انگلیسی (جهت فاکتور و سئو)
                </label>
                <input
                  type="text"
                  value={formData.nameEn || ''}
                  onChange={(e) => handleFieldChange('nameEn', e.target.value)}
                  placeholder="e.g. Calligraphy Heech Streetwear Tee"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-stone-600 focus:border-[#eed29d] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  شناسه کالا (Product ID)
                </label>
                <input
                  type="text"
                  value={formData.id || ''}
                  disabled={!isNew}
                  onChange={(e) => handleFieldChange('id', e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-stone-300 font-mono disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  پیش‌وند کدهای انبارداری (SKU Prefix)
                </label>
                <input
                  type="text"
                  value={formData.skuPrefix || ''}
                  onChange={(e) => handleFieldChange('skuPrefix', e.target.value)}
                  placeholder="مثال: SP101-TSH-OVR"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-stone-600 focus:border-[#eed29d] focus:outline-none font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                توضیحات و داستان محصول (داستان‌سرایی برند شاه‌پوش)
              </label>
              <textarea
                rows={4}
                value={formData.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="توضیح کامل در مورد هویت طراحی، نوع برش پارچه، حس و حال اثر و بافت تن‌پوش..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder:text-stone-600 focus:border-[#eed29d] focus:outline-none leading-relaxed"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                برچسب‌ها و تگ‌های جستجو
              </label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="تگ جدید بنویسید و اینتر بزنید..."
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-[#eed29d] focus:outline-none flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleAddTag}>
                  افزودن
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(formData.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-stone-300"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-stone-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Settings */}
          <div className="space-y-6">
            <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-xs font-black text-white uppercase tracking-wider">
                وضعیت انتشار و معماری فروش
              </h3>

              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1.5">
                  وضعیت عرضه در ویترین
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e) => {
                    const st = e.target.value as any;
                    handleFieldChange('status', st);
                    handleFieldChange('isLive', st === 'active');
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#eed29d] focus:outline-none"
                >
                  <option value="active">عرضه فعال در فروشگاه (Active)</option>
                  <option value="draft">پیش‌نویس / در دست بازبینی (Draft)</option>
                  <option value="archived">بایگانی شده (Archived)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1.5">
                  نوع محصول
                </label>
                <select
                  value={formData.productType || 'finished'}
                  onChange={(e) => {
                    const pt = e.target.value as any;
                    handleFieldChange('productType', pt);
                    handleFieldChange('isCustomizable', pt === 'customizable_blank');
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#eed29d] focus:outline-none"
                >
                  <option value="finished">پوشاک آماده با طرح نهایی شاه‌پوش</option>
                  <option value="customizable_blank">لباس خام قابل چاپ در آتلیه سفارشی (POD Blank)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1.5">
                  دسته‌بندی اصلی
                </label>
                <select
                  value={formData.category || 'calligraphy'}
                  onChange={(e) => handleFieldChange('category', e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#eed29d] focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameFa} ({c.nameEn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 mb-1.5">
                  کلکسیون‌های متصل
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {collections.map((col) => {
                    const isSelected = formData.collectionIds?.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 p-2 bg-black/30 rounded-lg text-xs text-stone-300 hover:bg-white/5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            const current = formData.collectionIds || [];
                            const updated = e.target.checked
                              ? [...current, col.id]
                              : current.filter((id) => id !== col.id);
                            handleFieldChange('collectionIds', updated);
                          }}
                          className="rounded border-white/20 text-[#eed29d] focus:ring-0"
                        />
                        <span>{col.titleFa}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Stock Summary Widget */}
            <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-3">
              <span className="text-xs font-black text-stone-400 block">خلاصه موجودی انبار فرم</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-400">مجموع موجودی فیزیکی:</span>
                <span className="font-bold font-fanum text-white">{toFaDigits(totalOnHand)} عدد</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-400">موجودی رزرو شده:</span>
                <span className="font-bold font-fanum text-amber-400">{toFaDigits(totalReserved)} عدد</span>
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-white/10 font-bold">
                <span className="text-stone-200">قابل فروش:</span>
                <span className="font-fanum text-emerald-400">{toFaDigits(totalOnHand - totalReserved)} عدد</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FABRIC & WORKSHOP SPECS */}
      {activeTab === 'fabric' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-6">
          <h2 className="text-sm font-black text-white flex items-center gap-2">
            <Shirt size={16} className="text-[#eed29d]" />
            مشخصات بافت، الگو و تکنیک‌های کارگاه نساجی
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                جنس پارچه و مشخصات نساجی
              </label>
              <input
                type="text"
                value={formData.fabricSpecs || ''}
                onChange={(e) => handleFieldChange('fabricSpecs', e.target.value)}
                placeholder="مثال: ۱۰۰٪ پنبه ارگانیک سوپر دو نخ ۲۴۰ گرم شانه شده"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#eed29d] focus:outline-none"
              />
              <span className="text-[10px] text-stone-500 mt-1 block">
                تراکم بافت، نوع نخ و ویژگی‌های ضد حساسیت و بدون پرزدهی
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                نوع برش و الگو (Fit & Cut)
              </label>
              <input
                type="text"
                value={formData.cut || ''}
                onChange={(e) => handleFieldChange('cut', e.target.value)}
                placeholder="مثال: لش فیت (Oversized Drop-Shoulder) قواره آزاد خیابانی"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#eed29d] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                جدول ابعاد و اندازه‌ها (Measurements)
              </label>
              <textarea
                rows={3}
                value={formData.measurements || ''}
                onChange={(e) => handleFieldChange('measurements', e.target.value)}
                placeholder="عرض سینه، قد کل و طول آستین در سایزهای مختلف..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white focus:border-[#eed29d] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                دستورالعمل نگهداری و شستشو
              </label>
              <textarea
                rows={3}
                value={formData.careInstructions || ''}
                onChange={(e) => handleFieldChange('careInstructions', e.target.value)}
                placeholder="دمای شستشو، خشک‌کن، اتوکشی غیرمستقیم روی بخش‌های چاپ‌شده..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white focus:border-[#eed29d] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                روش چاپ صنعتی (Printing Method)
              </label>
              <input
                type="text"
                value={formData.printingMethod || ''}
                onChange={(e) => handleFieldChange('printingMethod', e.target.value)}
                placeholder="مثال: چاپ دیجیتال مستقیم صنعتی Brother GTX PRO"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#eed29d] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                تکنولوژی پردازش چاپ
              </label>
              <select
                value={formData.printingTechnique || 'DTG'}
                onChange={(e) => handleFieldChange('printingTechnique', e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:border-[#eed29d] focus:outline-none"
              >
                <option value="DTG">چاپ مستقیم دیجیتال (DTG)</option>
                <option value="SilkScreen">سیلک اسکرین دستی صنعتی (Silk Screen)</option>
                <option value="Embroidery">گلدوزی برجسته کامپیوتری (Embroidery)</option>
                <option value="DTF">ترانسفر حرارتی مستقیم (DTF Transfer)</option>
              </select>
            </div>
          </div>

          {/* Permitted Print Areas */}
          <div>
            <label className="block text-xs font-bold text-stone-300 mb-2">
              نواحی مجاز چاپ طرح بر روی لباس (آتلیه سفارشی و خطوط تولید)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'front_chest', label: 'روی سینه (Front Chest)' },
                { id: 'back_full', label: 'پشت لباس تمام‌صفحه (Full Back)' },
                { id: 'sleeve_left', label: 'آستین چپ (Left Sleeve)' },
                { id: 'sleeve_right', label: 'آستین راست (Right Sleeve)' },
                { id: 'collar_back', label: 'پشت یقه (Back Collar)' },
              ].map((area) => {
                const isSelected = formData.permittedPrintAreas?.includes(area.id);
                return (
                  <label
                    key={area.id}
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#eed29d]/10 border-[#eed29d] text-white'
                        : 'bg-black/30 border-white/10 text-stone-400 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const current = formData.permittedPrintAreas || [];
                        const updated = e.target.checked
                          ? [...current, area.id]
                          : current.filter((id) => id !== area.id);
                        handleFieldChange('permittedPrintAreas', updated);
                      }}
                      className="rounded border-white/20 text-[#eed29d] focus:ring-0"
                    />
                    <span className="text-xs font-bold">{area.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRICING & PROMOTIONS */}
      {activeTab === 'pricing' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <DollarSign size={16} className="text-[#eed29d]" />
              تنظیمات مالی و جشنواره‌های تخفیف
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  قیمت نهایی فروش (تومان) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.basePriceTomans || ''}
                    onChange={(e) => handleFieldChange('basePriceTomans', Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#eed29d] focus:outline-none font-mono"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-stone-500 font-bold">تومان</span>
                </div>
                <span className="text-[10px] text-stone-400 mt-1 block">
                  مبلغ اصلی دریافتی از مشتری برای سایزهای پایه
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  قیمت قبل از تخفیف (خط‌خورده - تومان)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.originalPriceTomans || ''}
                    onChange={(e) => handleFieldChange('originalPriceTomans', Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#eed29d] focus:outline-none font-mono"
                  />
                  <span className="absolute left-3 top-2.5 text-xs text-stone-500 font-bold">تومان</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  درصد تخفیف نمایشی (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={formData.discountPercent || ''}
                  onChange={(e) => handleFieldChange('discountPercent', Number(e.target.value))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#eed29d] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-300 mb-1.5">
                  بازه تاریخ جشنواره (اختیاری)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={formData.discountStartDate || ''}
                    onChange={(e) => handleFieldChange('discountStartDate', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-stone-300 focus:border-[#eed29d] focus:outline-none"
                    placeholder="شروع"
                  />
                  <input
                    type="date"
                    value={formData.discountEndDate || ''}
                    onChange={(e) => handleFieldChange('discountEndDate', e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-stone-300 focus:border-[#eed29d] focus:outline-none"
                    placeholder="پایان"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Preview Box */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              محاسبه سود و مارژین فرم پایه
            </h3>

            <div className="p-4 bg-black/40 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-400">قیمت فروش:</span>
                <MoneyDisplay amount={formData.basePriceTomans || 0} size="sm" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-400">بهای تمام‌شده تخمینی پارچه:</span>
                <MoneyDisplay amount={145000} size="sm" />
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-stone-400">هزینه جوهر چاپ و استهلاک:</span>
                <MoneyDisplay amount={48000} size="sm" />
              </div>
              <div className="flex justify-between items-center text-xs pt-2 border-t border-white/10 font-bold">
                <span className="text-emerald-400">سود ناخالص تخمینی:</span>
                <MoneyDisplay
                  amount={Math.max(0, (formData.basePriceTomans || 0) - 193000)}
                  size="sm"
                  className="text-emerald-400"
                />
              </div>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              * مبالغ فوق بر پایه تیراژ متوسط پارچه سوپرپنبه ۲۴۰ گرم محاسبه گردیده و به صورت درگاه تسویه شاپرک منظور خواهد شد.
            </p>
          </div>
        </div>
      )}

      {/* TAB 4: MEDIA & GALLERY */}
      {activeTab === 'media' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <ImageIcon size={16} className="text-[#eed29d]" />
                گالری تصاویر و نمایه اصلی محصول
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                تعیین تصویر شاخص، تصاویر تن‌خور مانکن و نمای نزدیک بافت پارچه همراه با متن جایگزین (Alt) سئو.
              </p>
            </div>
          </div>

          {/* Add Image Input */}
          <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3">
            <span className="text-xs font-bold text-stone-300 block">افزودن تصویر جدید به گالری</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="آدرس URL تصویر (https://...)"
                className="sm:col-span-2 bg-black/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-stone-600 focus:border-[#eed29d] focus:outline-none font-mono"
              />
              <input
                type="text"
                value={newImageAlt}
                onChange={(e) => setNewImageAlt(e.target.value)}
                placeholder="متن جایگزین (Alt Text) برای سئو..."
                className="bg-black/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-stone-600 focus:border-[#eed29d] focus:outline-none"
              />
            </div>
            <div className="flex justify-end">
              <Button variant="brass" size="sm" onClick={handleAddImage}>
                <Plus size={13} className="ml-1" />
                افزودن تصویر به کاتالوگ
              </Button>
            </div>
          </div>

          {/* Images Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(formData.images || []).map((imgUrl, index) => {
              const isPrimary = formData.primaryImage === imgUrl;
              const altText = formData.imageAlts?.[imgUrl] || '';

              return (
                <div
                  key={index}
                  className={`relative group bg-black/40 border rounded-2xl p-2 flex flex-col justify-between transition-all ${
                    isPrimary ? 'border-[#eed29d] ring-2 ring-[#eed29d]/20' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-black/60 relative mb-2">
                    <img
                      src={imgUrl}
                      alt={altText || formData.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {isPrimary && (
                      <span className="absolute top-2 right-2 bg-[#eed29d] text-black text-[10px] font-black px-2 py-0.5 rounded-md shadow-md">
                        تصویر اصلی
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={altText}
                      onChange={(e) => {
                        const updatedAlts = {
                          ...(formData.imageAlts || {}),
                          [imgUrl]: e.target.value,
                        };
                        handleFieldChange('imageAlts', updatedAlts);
                      }}
                      placeholder="متن Alt تصویر..."
                      className="w-full bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-stone-300 placeholder:text-stone-600 focus:border-[#eed29d] focus:outline-none"
                    />

                    <div className="flex items-center justify-between gap-1 pt-1 border-t border-white/5">
                      {!isPrimary && (
                        <button
                          type="button"
                          onClick={() => handleFieldChange('primaryImage', imgUrl)}
                          className="text-[10px] font-bold text-stone-400 hover:text-[#eed29d] transition-colors"
                        >
                          انتخاب به عنوان تصویر شاخص
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(imgUrl)}
                        className="text-[10px] text-red-400 hover:text-red-300 p-1 mr-auto"
                        title="حذف تصویر"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: VARIANTS MATRIX */}
      {activeTab === 'variants' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Sliders size={16} className="text-[#eed29d]" />
                ماتریس تنوع‌های انبار (سایز × رنگ × جنس)
              </h2>
              <p className="text-xs text-stone-400 mt-1">
                کدهای یکتای انبارداری (SKU)، موجودی فیزیکی، آستانه هشدار کسری و اختلاف قیمت سایزهای خاص.
              </p>
            </div>

            <Button variant="brass" size="sm" onClick={handleAddVariant}>
              <Plus size={13} className="ml-1" />
              افزودن سطر تنوع جدید
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 text-stone-400">
                  <th className="py-3 px-3">کد انبارداری (SKU)</th>
                  <th className="py-3 px-3">سایز</th>
                  <th className="py-3 px-3">رنگ‌بندی</th>
                  <th className="py-3 px-3">قواره</th>
                  <th className="py-3 px-3">موجودی فیزیکی</th>
                  <th className="py-3 px-3">رزرو شده</th>
                  <th className="py-3 px-3">آستانه هشدار</th>
                  <th className="py-3 px-3">اختلاف قیمت (تومان)</th>
                  <th className="py-3 px-3 text-center">وضعیت</th>
                  <th className="py-3 px-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(formData.variants || []).map((v, idx) => (
                  <tr key={v.sku || idx} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-mono font-bold text-[#eed29d]">
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => handleUpdateVariant(idx, { sku: e.target.value })}
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-[#eed29d] font-mono focus:border-[#eed29d] focus:outline-none w-44"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={v.size}
                        onChange={(e) => handleUpdateVariant(idx, { size: e.target.value as any })}
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:border-[#eed29d] focus:outline-none font-mono"
                      >
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free'].map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={v.colorHex || '#1C1A1A'}
                          onChange={(e) => handleUpdateVariant(idx, { colorHex: e.target.value })}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <input
                          type="text"
                          value={v.colorName}
                          onChange={(e) => handleUpdateVariant(idx, { colorName: e.target.value })}
                          className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:border-[#eed29d] focus:outline-none w-28"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={v.fit || 'oversize'}
                        onChange={(e) => handleUpdateVariant(idx, { fit: e.target.value as any })}
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-stone-300 focus:border-[#eed29d] focus:outline-none"
                      >
                        <option value="oversize">اورسایز</option>
                        <option value="regular">معمولی</option>
                        <option value="slim">اسلیم</option>
                        <option value="crop">کراپ</option>
                      </select>
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min={0}
                        value={v.onHandStock}
                        onChange={(e) => handleUpdateVariant(idx, { onHandStock: Math.max(0, Number(e.target.value)) })}
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-fanum focus:border-[#eed29d] focus:outline-none w-20"
                      />
                    </td>
                    <td className="py-3 px-3 font-fanum text-stone-400 text-xs">
                      {toFaDigits(v.reservedStock || 0)}
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        min={1}
                        value={v.minStockThreshold}
                        onChange={(e) => handleUpdateVariant(idx, { minStockThreshold: Math.max(1, Number(e.target.value)) })}
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-stone-300 font-fanum focus:border-[#eed29d] focus:outline-none w-16"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <input
                        type="number"
                        step={10000}
                        value={v.priceAdjustmentTomans || 0}
                        onChange={(e) => handleUpdateVariant(idx, { priceAdjustmentTomans: Number(e.target.value) })}
                        className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-fanum focus:border-[#eed29d] focus:outline-none w-24"
                      />
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleUpdateVariant(idx, { isEnabled: v.isEnabled === false })}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          v.isEnabled !== false
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-stone-800 text-stone-400 border border-white/10'
                        }`}
                      >
                        {v.isEnabled !== false ? 'فعال' : 'غیرفعال'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(idx)}
                        className="p-1 text-stone-500 hover:text-red-400 transition-colors"
                        title="حذف تنوع"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SEO & METADATA */}
      {activeTab === 'seo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Search size={16} className="text-[#eed29d]" />
              پیکربندی بهینه‌سازی موتورهای جستجو (SEO)
            </h2>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                عنوان سئو (Meta Title)
              </label>
              <input
                type="text"
                value={formData.seoTitle || ''}
                onChange={(e) => handleFieldChange('seoTitle', e.target.value)}
                placeholder="مثال: خرید تیشرت کالیگرافی هیچ | پوشاک فاخر خیابانی شاه‌پوش"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-[#eed29d] focus:outline-none"
              />
              <span className="text-[10px] text-stone-500 mt-1 block">
                تعداد کاراکتر توصیه‌شده: ۵۰ تا ۶۰ کاراکتر (طول فعلی: {toFaDigits(formData.seoTitle?.length || 0)})
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                توضیحات متا (Meta Description)
              </label>
              <textarea
                rows={3}
                value={formData.seoMetaDescription || ''}
                onChange={(e) => handleFieldChange('seoMetaDescription', e.target.value)}
                placeholder="خرید اینترنتی تیشرت سوپرپنبه ارگانیک با طرح کالیگرافی نستعلیق و ضمانت ثبات رنگ در شستشو..."
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3.5 text-xs text-white focus:border-[#eed29d] focus:outline-none leading-relaxed"
              />
              <span className="text-[10px] text-stone-500 mt-1 block">
                تعداد کاراکتر توصیه‌شده: ۱۲۰ تا ۱۶۰ کاراکتر (طول فعلی: {toFaDigits(formData.seoMetaDescription?.length || 0)})
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-300 mb-1.5">
                نامک یکتا در آدرس اینترنتی (Canonical URL Slug)
              </label>
              <input
                type="text"
                value={formData.slug || ''}
                onChange={(e) => handleFieldChange('slug', e.target.value)}
                placeholder="sp101-heech-calligraphy-streetwear"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#eed29d] focus:outline-none"
              />
            </div>
          </div>

          {/* Google SERP Preview */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              پیش‌نمایش در نتایج گوگل (Google SERP)
            </h3>

            <div className="bg-[#202124] p-4 rounded-xl space-y-1.5 font-sans text-right" dir="rtl">
              <div className="text-[11px] text-[#bdc1c6] truncate">
                https://shahpoosh.ir/products/{formData.slug || formData.id}
              </div>
              <div className="text-sm font-medium text-[#8ab4f8] hover:underline cursor-pointer line-clamp-1">
                {formData.seoTitle || `${formData.name || 'محصول شاه‌پوش'} | فروشگاه شاه‌پوش`}
              </div>
              <div className="text-xs text-[#bdc1c6] line-clamp-2 leading-relaxed">
                {formData.seoMetaDescription ||
                  formData.description ||
                  'خرید جدیدترین پوشاک استریت‌ویر فاخر با الگوهای مدرن و هویت ایرانی در فروشگاه شاه‌پوش.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: LIVE STOREFRONT PREVIEW */}
      {activeTab === 'preview' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6">
          <div className="max-w-3xl mx-auto bg-black border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <span className="text-xs text-[#eed29d] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} />
                پیش‌نمایش خریدار در فروشگاه آنلاین شاه‌پوش
              </span>
              <Badge
                label={formData.isLive ? 'عرضه فعال' : 'پیش‌نویس'}
                variant={formData.isLive ? 'success' : 'default'}
                size="sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Product Photo */}
              <div className="aspect-square rounded-2xl overflow-hidden bg-stone-900 border border-white/10 relative">
                <img
                  src={formData.primaryImage || formData.images?.[0]}
                  alt={formData.name}
                  className="w-full h-full object-cover"
                />
                {formData.discountPercent ? (
                  <span className="absolute top-3 right-3 bg-red-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">
                    {toFaDigits(formData.discountPercent)}٪ تخفیف
                  </span>
                ) : null}
              </div>

              {/* Product Info */}
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-stone-400 font-mono">{formData.skuPrefix}</span>
                  <h2 className="text-xl font-black text-white mt-1">{formData.name || 'عنوان محصول'}</h2>
                  {formData.nameEn && (
                    <span className="text-xs text-stone-400 font-mono block mt-0.5">{formData.nameEn}</span>
                  )}
                </div>

                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-black text-[#eed29d] font-fanum">
                    {toFaDigits((formData.basePriceTomans || 0).toLocaleString())} تومان
                  </span>
                  {formData.originalPriceTomans && (
                    <span className="text-sm line-through text-stone-500 font-fanum">
                      {toFaDigits(formData.originalPriceTomans.toLocaleString())}
                    </span>
                  )}
                </div>

                <p className="text-xs text-stone-300 leading-relaxed">
                  {formData.description || 'توضیحات کوتاه محصول...'}
                </p>

                {/* Available Sizes */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <span className="text-xs font-bold text-stone-300 block">انتخاب سایز:</span>
                  <div className="flex flex-wrap gap-2">
                    {(formData.variants || []).map((v) => (
                      <span
                        key={v.sku}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-mono font-bold text-white hover:border-[#eed29d] cursor-pointer"
                      >
                        {v.size}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Fabric Highlights */}
                <div className="p-3 bg-white/5 rounded-xl text-xs space-y-1 text-stone-300">
                  <div>• جنس: {formData.fabricSpecs}</div>
                  <div>• برش: {formData.cut}</div>
                  <div>• تکنیک: {formData.printingMethod}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discard Confirmation Dialog */}
      {showDiscardDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181716] border border-white/20 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <AlertCircle size={18} className="text-amber-400" />
              تغییرات ذخیره‌نشده وجود دارد
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              شما تغییراتی در فرم ایجاد کرده‌اید که هنوز ذخیره نشده‌اند. آیا از خروج و صرف‌نظر از تغییرات اطمینان دارید؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowDiscardDialog(false)}>
                ادامه ویرایش
              </Button>
              <Button
                variant="brass"
                size="sm"
                onClick={() => {
                  setShowDiscardDialog(false);
                  if (onBack) onBack();
                  else navigate('/admin/catalog/products');
                }}
              >
                صرف‌نظر و بازگشت
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
