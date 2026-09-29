import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Store,
  Globe,
  DollarSign,
  Truck,
  Palette,
  Percent,
  Bell,
  FileCheck,
  Lock,
  Key,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import {
  Button,
  FormField,
  Input,
  Switch,
  Badge,
  Dialog,
  useToast,
} from '../../components/ui';
import {
  CompleteSystemSettings,
  getStoredSystemSettings,
  saveSystemSettings,
  resetSystemSettingsToDefaults,
  validateSystemSettings,
  SettingsValidationError,
  DEFAULT_SYSTEM_SETTINGS,
} from '../../domain/systemConfig';
import { adminRepository } from '../../domain/repository';
import { toFaDigits } from '../../utils/formatters';

export const SettingsPage: React.FC = () => {
  const { addToast } = useToast();

  const [savedSettings, setSavedSettings] = useState<CompleteSystemSettings>(() => getStoredSystemSettings());
  const [formData, setFormData] = useState<CompleteSystemSettings>(() => getStoredSystemSettings());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<SettingsValidationError[]>([]);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<
    | 'store'
    | 'locale'
    | 'tax'
    | 'shipping'
    | 'customization'
    | 'discounts'
    | 'notifications'
    | 'policies'
    | 'security'
    | 'secrets'
  >('store');

  // Check for unsaved changes whenever formData changes
  useEffect(() => {
    const isDifferent = JSON.stringify(savedSettings) !== JSON.stringify(formData);
    setHasUnsavedChanges(isDifferent);
  }, [formData, savedSettings]);

  // Handle Save
  const handleSave = () => {
    const errors = validateSystemSettings(formData);
    setValidationErrors(errors);

    if (errors.length > 0) {
      addToast({
        title: 'خطای اعتبارسنجی در تنظیمات',
        description: errors[0].message,
        type: 'danger',
      });
      return;
    }

    const updated: CompleteSystemSettings = {
      ...formData,
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: 'علیرضا شمس (مدیر ارشد)',
    };

    saveSystemSettings(updated);
    setSavedSettings(updated);
    setHasUnsavedChanges(false);

    // Record in Domain Audit Log
    adminRepository.addActivityLog({
      actorId: 'STF-01',
      actorName: 'علیرضا شمس',
      actorRole: 'super_admin',
      actionType: 'SYSTEM_SETTINGS_UPDATED',
      description: 'تنظیمات کلی فروشگاه، پارامترهای ارسال، آتلیه چاپ و سیاست‌های امنیتی ذخیره شد.',
      entityType: 'general',
      entityId: 'SYSTEM_CONFIG',
      metadata: {
        storeName: updated.store.storeName,
        flatShipping: updated.shipping.flatShippingFeeTomans,
        minDpi: updated.customization.minResolutionDpi,
      },
    });

    addToast({
      title: 'تنظیمات با موفقیت ذخیره شد',
      description: 'پیکربندی جدید در حافظه اشتراکی ثبت و در لاگ حسابرسی سامانه درج گردید.',
      type: 'success',
    });
  };

  // Handle Cancel / Discard
  const handleDiscard = () => {
    setFormData(savedSettings);
    setHasUnsavedChanges(false);
    setValidationErrors([]);
    addToast({
      title: 'تغییرات لغو شد',
      description: 'تنظیمات به آخرین وضعیت ذخیره‌شده بازگشت.',
      type: 'info',
    });
  };

  // Handle Restore Defaults
  const handleConfirmRestoreDefaults = () => {
    const def = resetSystemSettingsToDefaults();
    setSavedSettings(def);
    setFormData(def);
    setHasUnsavedChanges(false);
    setValidationErrors([]);
    setIsResetConfirmOpen(false);

    // Record in Domain Audit Log
    adminRepository.addActivityLog({
      actorId: 'STF-01',
      actorName: 'علیرضا شمس',
      actorRole: 'super_admin',
      actionType: 'SYSTEM_SETTINGS_RESTORED_DEFAULTS',
      description: 'تمامی تنظیمات سیستمی به مقادیر پیش‌فرض استاندارد شاه‌پوش بازنشانی شد.',
      entityType: 'general',
      entityId: 'SYSTEM_CONFIG',
    });

    addToast({
      title: 'تنظیمات پیش‌فرض بازنشانی شد',
      description: 'تمامی مقادیر به پیکربندی کارخانه بازگشت و در لاگ سیستم ثبت گردید.',
      type: 'info',
    });
  };

  const tabs = [
    { id: 'store', label: 'اطلاعات فروشگاه و تماس', icon: Store },
    { id: 'locale', label: 'بومی‌سازی، تاریخ و ارز', icon: Globe },
    { id: 'tax', label: 'فیلدهای مالیاتی (Placeholder)', icon: DollarSign },
    { id: 'shipping', label: 'قوانین ارسال و مرجوعی', icon: Truck },
    { id: 'customization', label: 'محدودیت‌های آتلیه و نواحی چاپ', icon: Palette },
    { id: 'discounts', label: 'قوانین همپوشانی تخفیف‌ها', icon: Percent },
    { id: 'notifications', label: 'اعلان‌های پیامکی و وب‌هوک', icon: Bell },
    { id: 'policies', label: 'سیاست‌های حقوقی ویترین', icon: FileCheck },
    { id: 'security', label: 'امنیت پرسنل و نشست‌ها', icon: Lock },
    { id: 'secrets', label: 'مراجع امن وب‌سرویس‌ها', icon: Key },
  ];

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader
        title="تنظیمات جامع فروشگاه، آتلیه و زیرساخت"
        description="پیکربندی متمرکز هویت برند، تقویم جلالی، هزینه ارسال، محدودیت‌های چاپ سفارشی، سیاست‌های مرجوعی و مراجع امن سرور."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsResetConfirmOpen(true)}
            >
              <RotateCcw size={13} className="ml-1" />
              بازنشانی پیش‌فرض‌ها
            </Button>

            <Button
              variant="brass"
              size="sm"
              onClick={handleSave}
              disabled={!hasUnsavedChanges && validationErrors.length === 0}
            >
              <Save size={13} className="ml-1" />
              ذخیره تنظیمات
            </Button>
          </div>
        }
      />

      {/* Validation Errors Box */}
      {validationErrors.length > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-1.5 text-xs text-rose-300">
          <div className="font-bold flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-400" />
            <span>لطفاً خطاهای زیر را پیش از ذخیره برطرف نمایید:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pr-2">
            {validationErrors.map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-[#ba8d3d] text-stone-950 shadow-md shadow-[#ba8d3d]/15'
                  : 'bg-white/5 text-stone-400 hover:text-white'
              }`}
            >
              <IconComp size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Store & Contact */}
      {activeTab === 'store' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white">هویت فروشگاه و اطلاعات ارتباطی</h3>
            <p className="text-xs text-stone-400 mt-0.5">نام رسمی، لوگو، تلفن‌های پشتیبانی و آدرس فیزیکی کارگاه آتلیه</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="نام رسمی فروشگاه / برند">
              <Input
                value={formData.store.storeName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    store: { ...formData.store, storeName: e.target.value },
                  })
                }
              />
            </FormField>

            <FormField label="شعار تبلیغاتی (Tagline)">
              <Input
                value={formData.store.brandTagline}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    store: { ...formData.store, brandTagline: e.target.value },
                  })
                }
              />
            </FormField>

            <FormField label="تلفن تماس پشتیبانی">
              <Input
                value={formData.store.supportPhone}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    store: { ...formData.store, supportPhone: e.target.value },
                  })
                }
              />
            </FormField>

            <FormField label="ایمیل رسمی خدمات مشتریان">
              <Input
                value={formData.store.supportEmail}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    store: { ...formData.store, supportEmail: e.target.value },
                  })
                }
              />
            </FormField>

            <div className="md:col-span-2">
              <FormField label="آدرس فیزیکی دفتر مرکزی و کارگاه چاپ">
                <Input
                  value={formData.store.workshopAddress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      store: { ...formData.store, workshopAddress: e.target.value },
                    })
                  }
                />
              </FormField>
            </div>

            <FormField label="کد پستی ۱۰ رقمی کارگاه">
              <Input
                value={formData.store.postalCode}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    store: { ...formData.store, postalCode: e.target.value },
                  })
                }
              />
            </FormField>
          </div>
        </div>
      )}

      {/* Tab 2: Locale & Currency */}
      {activeTab === 'locale' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white">بومی‌سازی، تقویم جلالی و واحد پول</h3>
            <p className="text-xs text-stone-400 mt-0.5">زبان سامانه، منطقه زمانی ایران و فرمت ارائه مبالغ</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="زبان و منطقه (Locale)">
              <Input value="fa-IR (فارسی - ایران)" disabled />
            </FormField>

            <FormField label="جهت چیدمان محتوا (Direction)">
              <Input value="RTL (راست به چپ)" disabled />
            </FormField>

            <FormField label="منطقه زمانی مرجع (Display Timezone)">
              <Input value="Asia/Tehran (ساعت رسمی ایران / IRST)" disabled />
            </FormField>

            <FormField label="فرمت تقویم و ساعت">
              <select
                value={formData.localization.timeFormat}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    localization: {
                      ...formData.localization,
                      timeFormat: e.target.value as any,
                    },
                  })
                }
                className="w-full bg-[#1a1817] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
              >
                <option value="jalali_24h">تقویم هجری شمسی ۲۴ ساعته (مثال: ۲ مهر ۱۴۰۵ - ۱۲:۰۰)</option>
                <option value="jalali_12h">تقویم هجری شمسی ۱۲ ساعته (مثال: ۲ مهر ۱۴۰۵ - ۱۲:۰۰ ب.ظ)</option>
              </select>
            </FormField>

            <FormField label="واحد پول رسمی دیتابیس (Canonical Unit)">
              <Input value="تومان (TOMAN) - ارقام بدون اعشار" disabled />
            </FormField>

            <FormField label="نحوه نمایش مبالغ در فاکتورها">
              <select
                value={formData.localization.tomanPresentation}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    localization: {
                      ...formData.localization,
                      tomanPresentation: e.target.value as any,
                    },
                  })
                }
                className="w-full bg-[#1a1817] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
              >
                <option value="separated_fa">ارقام جداشده فارسی (مثال: ۳,۸۵۰,۰۰۰ تومان)</option>
                <option value="k_suffix">مخفف هزار تومان (مثال: ۳,۸۵۰ هزار تومان)</option>
              </select>
            </FormField>
          </div>
        </div>
      )}

      {/* Tab 3: Tax Settings */}
      {activeTab === 'tax' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">فیلدهای محاسباتی مالیات و عوارض</h3>
              <Badge label="CONFIGURABLE PLACEHOLDER" variant="warning" size="sm" />
            </div>
            <p className="text-xs text-stone-400 mt-0.5">پیکربندی درصدهای محاسباتی آزمایشی جهت نمایش در پیش‌فاکتورها</p>
          </div>

          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 leading-relaxed">
            <strong className="block mb-1 text-amber-300">سلب مسئولیت قانونی و سیستمی:</strong>
            {formData.tax.disclaimer}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="درصد مالیات ارزش افزوده آزمایشی (VAT Rate %)">
              <Input
                type="number"
                value={formData.tax.taxRatePercent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tax: { ...formData.tax, taxRatePercent: Number(e.target.value) },
                  })
                }
              />
            </FormField>

            <FormField label="شناسه مالیاتی آزمایشی (VAT Number Placeholder)">
              <Input
                value={formData.tax.vatNumberPlaceholder}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tax: { ...formData.tax, vatNumberPlaceholder: e.target.value },
                  })
                }
              />
            </FormField>

            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5 md:col-span-2">
              <div>
                <span className="text-xs font-bold text-white block">اعمال نرخ آزمایشی بر هزینه ارسال مرسولات</span>
                <span className="text-[11px] text-stone-400">محاسبه یا عدم محاسبه درصد مالیات بر کرایه پستی</span>
              </div>
              <Switch
                checked={formData.tax.applyTaxToShipping}
                onChange={(checked) =>
                  setFormData({
                    ...formData,
                    tax: { ...formData.tax, applyTaxToShipping: checked },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Shipping & Returns */}
      {activeTab === 'shipping' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white">قوانین ارسال مرسولات و سیاست‌های مرجوعی</h3>
            <p className="text-xs text-stone-400 mt-0.5">تعیین هزینه پایه کرایه، سقف ارسال رایگان و مهلت قانونی عودت کالا</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="هزینه ثابت ارسال عادی (تومان)">
              <Input
                type="number"
                value={formData.shipping.flatShippingFeeTomans}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shipping: {
                      ...formData.shipping,
                      flatShippingFeeTomans: Number(e.target.value),
                    },
                  })
                }
              />
            </FormField>

            <FormField label="حداقل سبد خرید برای ارسال رایگان (تومان)">
              <Input
                type="number"
                value={formData.shipping.freeShippingThresholdTomans}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shipping: {
                      ...formData.shipping,
                      freeShippingThresholdTomans: Number(e.target.value),
                    },
                  })
                }
              />
            </FormField>

            <FormField label="مهلت درخواست مرجوعی کالاهای استاندارد (روز)">
              <Input
                type="number"
                value={formData.shipping.returnWindowDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shipping: {
                      ...formData.shipping,
                      returnWindowDays: Number(e.target.value),
                    },
                  })
                }
              />
            </FormField>

            <FormField label="مهلت گزارش نقص دوخت یا پارگی (ساعت)">
              <Input
                type="number"
                value={formData.shipping.damagedItemReturnPolicyDays}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    shipping: {
                      ...formData.shipping,
                      damagedItemReturnPolicyDays: Number(e.target.value),
                    },
                  })
                }
              />
            </FormField>

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <span className="text-xs font-bold text-white block">عدم امکان عودت محصولات سفارشی DTG</span>
                  <span className="text-[11px] text-stone-400">
                    محصولاتی که طرح اختصاصی مشتری بر آن‌ها چاپ شده، غیرقابل بازگشت به موجودی فروشگاه هستند
                  </span>
                </div>
                <Switch
                  checked={formData.shipping.customizedGoodsNonReturnable}
                  onChange={(checked) =>
                    setFormData({
                      ...formData,
                      shipping: {
                        ...formData.shipping,
                        customizedGoodsNonReturnable: checked,
                      },
                    })
                  }
                />
              </div>

              <FormField label="متن اطلاعیه قانونی مرجوعی برای خریداران">
                <Input
                  value={formData.shipping.returnPolicyNotice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      shipping: {
                        ...formData.shipping,
                        returnPolicyNotice: e.target.value,
                      },
                    })
                  }
                />
              </FormField>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Customization Limits & Print Zones */}
      {activeTab === 'customization' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-6">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white">محدودیت‌های فنی آتلیه و نواحی مجاز چاپ DTG</h3>
            <p className="text-xs text-stone-400 mt-0.5">کیفیت فایل‌های ورودی، حجم مجاز و جانمایی‌های چاپ روی البسه</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="حداقل رزولوشن استاندارد (DPI)">
              <Input
                type="number"
                value={formData.customization.minResolutionDpi}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customization: {
                      ...formData.customization,
                      minResolutionDpi: Number(e.target.value),
                    },
                  })
                }
              />
            </FormField>

            <FormField label="حداکثر حجم مجاز فایل (بایت)">
              <Input
                type="number"
                value={formData.customization.maxUploadSizeBytes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customization: {
                      ...formData.customization,
                      maxUploadSizeBytes: Number(e.target.value),
                    },
                  })
                }
              />
            </FormField>

            <FormField label="سقف تعداد نواحی فعال چاپ روی هر لباس">
              <Input
                type="number"
                value={formData.customization.maxActivePrintZonesPerItem}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    customization: {
                      ...formData.customization,
                      maxActivePrintZonesPerItem: Number(e.target.value),
                    },
                  })
                }
              />
            </FormField>
          </div>

          {/* Print Zones Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white">نواحی پنج‌گانه چاپ اختصاصی کارگاه:</h4>
              <span className="text-[11px] text-stone-400 font-fanum">
                {toFaDigits(formData.printZones.length)} ناحیه تعریف‌شده
              </span>
            </div>

            <div className="border border-white/10 rounded-xl overflow-hidden">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#181615] text-stone-400 text-[11px] border-b border-white/10">
                  <tr>
                    <th className="py-2.5 px-3">کد ناحیه</th>
                    <th className="py-2.5 px-3">عنوان فارسی</th>
                    <th className="py-2.5 px-3">حداکثر ابعاد (سانتی‌متر)</th>
                    <th className="py-2.5 px-3">اضافه‌بهای چاپ (تومان)</th>
                    <th className="py-2.5 px-3 text-center">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {formData.printZones.map((zone, idx) => (
                    <tr key={zone.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 px-3 font-mono text-stone-400 text-[11px]">{zone.code}</td>
                      <td className="py-2.5 px-3 font-bold text-white">{zone.nameFa}</td>
                      <td className="py-2.5 px-3 font-fanum text-stone-300">
                        {toFaDigits(zone.maxWidthCm)} × {toFaDigits(zone.maxHeightCm)}
                      </td>
                      <td className="py-2.5 px-3 font-fanum">
                        {zone.baseSurchargeTomans === 0 ? (
                          <span className="text-emerald-400">پایه رایگان</span>
                        ) : (
                          `${toFaDigits(zone.baseSurchargeTomans.toLocaleString())} تومان`
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Switch
                          checked={zone.isActive}
                          onChange={(checked) => {
                            const nextZones = [...formData.printZones];
                            nextZones[idx] = { ...zone, isActive: checked };
                            setFormData({ ...formData, printZones: nextZones });
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Discount Stacking */}
      {activeTab === 'discounts' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white">قوانین همپوشانی و تجمیع کدهای تخفیف</h3>
            <p className="text-xs text-stone-400 mt-0.5">کنترل حاشیه سود کارگاه و جلوگیری از سوءاستفاده از کوپن‌ها</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
              <div>
                <span className="text-xs font-bold text-white block">امکان ثبت چند کوپن تخفیف در یک سفارش</span>
                <span className="text-[11px] text-stone-400">اجازه ورود بیش از یک کد تبلیغاتی</span>
              </div>
              <Switch
                checked={formData.discountStacking.allowMultipleCoupons}
                onChange={(checked) =>
                  setFormData({
                    ...formData,
                    discountStacking: {
                      ...formData.discountStacking,
                      allowMultipleCoupons: checked,
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
              <div>
                <span className="text-xs font-bold text-white block">همپوشانی با تخفیف سطح باشگاه مشتریان (VIP)</span>
                <span className="text-[11px] text-stone-400">اعمال همزمان کوپن تخفیف و تخفیف وفاداری</span>
              </div>
              <Switch
                checked={formData.discountStacking.canStackWithVipTier}
                onChange={(checked) =>
                  setFormData({
                    ...formData,
                    discountStacking: {
                      ...formData.discountStacking,
                      canStackWithVipTier: checked,
                    },
                  })
                }
              />
            </div>

            <FormField label="سقف حداکثر تخفیف کل فاکتور (درصد)">
              <Input
                type="number"
                value={formData.discountStacking.maxCombinedDiscountPercent}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountStacking: {
                      ...formData.discountStacking,
                      maxCombinedDiscountPercent: Number(e.target.value),
                    },
                  })
                }
              />
            </FormField>
          </div>
        </div>
      )}

      {/* Tab 7: Notifications */}
      {activeTab === 'notifications' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white">ترایگرهای ارسال پیامک و وب‌هوک‌های عملیاتی</h3>
            <p className="text-xs text-stone-400 mt-0.5">مدیریت رخدادهایی که منجر به ارسال پیامک به مشتری یا لاگ وب‌هوک می‌گردند</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
              <div>
                <span className="text-xs font-bold text-white block">ارسال پیامک تایید سفارش و دریافت وجه</span>
                <span className="text-[11px] text-stone-400">ارسال شماره سفارش و مبلغ پرداخت‌شده به خریدار</span>
              </div>
              <Switch
                checked={formData.notifications.enableOrderConfirmationSms}
                onChange={(checked) =>
                  setFormData({
                    ...formData,
                    notifications: {
                      ...formData.notifications,
                      enableOrderConfirmationSms: checked,
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
              <div>
                <span className="text-xs font-bold text-white block">ارسال پیامک تاییدیه طرح اختصاصی آتلیه</span>
                <span className="text-[11px] text-stone-400">اطلاع به کاربر پس از تایید طرح توسط طراح کارگاه</span>
              </div>
              <Switch
                checked={formData.notifications.enableDesignApprovedSms}
                onChange={(checked) =>
                  setFormData({
                    ...formData,
                    notifications: {
                      ...formData.notifications,
                      enableDesignApprovedSms: checked,
                    },
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
              <div>
                <span className="text-xs font-bold text-white block">ارسال پیامک صدور بارنامه و کد رهگیری پستی</span>
                <span className="text-[11px] text-stone-400">ارسال کد رهگیری تیپاکس یا پست به شماره تحویل‌گیرنده</span>
              </div>
              <Switch
                checked={formData.notifications.enableShipmentDispatchedSms}
                onChange={(checked) =>
                  setFormData({
                    ...formData,
                    notifications: {
                      ...formData.notifications,
                      enableShipmentDispatchedSms: checked,
                    },
                  })
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: Storefront Policies */}
      {activeTab === 'policies' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white">سیاست‌های حقوقی و تجاری ویترین فروشگاه</h3>
            <p className="text-xs text-stone-400 mt-0.5">متون استاندارد شرایط خرید، حریم خصوصی و SLA تولید</p>
          </div>

          <div className="space-y-4">
            <FormField label="شرایط و قوانین عمومی خرید (Terms of Service)">
              <Input
                value={formData.policies.termsOfServiceExcerpt}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    policies: {
                      ...formData.policies,
                      termsOfServiceExcerpt: e.target.value,
                    },
                  })
                }
              />
            </FormField>

            <FormField label="تعهدنامه کیفیت و SLA تولید پوشاک اختصاصی DTG">
              <Input
                value={formData.policies.dtgManufacturingSlaText}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    policies: {
                      ...formData.policies,
                      dtgManufacturingSlaText: e.target.value,
                    },
                  })
                }
              />
            </FormField>
          </div>
        </div>
      )}

      {/* Tab 9: Staff Security & MFA */}
      {activeTab === 'security' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white">امنیت پرسنل، MFA و سیاست‌های انقضای نشست</h3>
            <p className="text-xs text-stone-400 mt-0.5">پروتکل‌های ورود دومرحله‌ای و کنترل دسترسی تیم مدیریت</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3.5 bg-white/5 rounded-xl border border-white/5">
              <div>
                <span className="text-xs font-bold text-white block">الزام ورود دو مرحله‌ای (MFA) برای مدیران ارشد</span>
                <span className="text-[11px] text-stone-400">ورود با اپلیکیشن Google Authenticator یا پیامک OTP</span>
              </div>
              <Switch
                checked={formData.security.enforceMfaForSuperAdmin}
                onChange={(checked) =>
                  setFormData({
                    ...formData,
                    security: {
                      ...formData.security,
                      enforceMfaForSuperAdmin: checked,
                    },
                  })
                }
              />
            </div>

            <FormField label="مدت زمان انقضای نشست به دلیل بی‌تحرکی (دقیقه)">
              <Input
                type="number"
                value={formData.security.sessionInactivityTimeoutMinutes}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    security: {
                      ...formData.security,
                      sessionInactivityTimeoutMinutes: Number(e.target.value),
                    },
                  })
                }
              />
            </FormField>

            <FormField label="سقف دفعات تلاش ناموفق ورود پیش از قفل موقت حساب">
              <Input
                type="number"
                value={formData.security.maxFailedLoginAttemptsBeforeLockout}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    security: {
                      ...formData.security,
                      maxFailedLoginAttemptsBeforeLockout: Number(e.target.value),
                    },
                  })
                }
              />
            </FormField>
          </div>
        </div>
      )}

      {/* Tab 10: Secret Reference UX */}
      {activeTab === 'secrets' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">مراجع امنیتی وب‌سرویس‌ها و کلیدهای سرور (Secret Reference UX)</h3>
              <Badge label="ZERO SECRETS IN JS" variant="success" size="sm" />
            </div>
            <p className="text-xs text-stone-400 mt-0.5">کلیدهای محرمانه هرگز در جاوااسکریپت کلاینت قرار نمی‌گیرند و صرفاً از طریق مرجع مدیریت مخزن امن (Vault) متصل می‌شوند</p>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-1">
              <span className="text-[11px] text-stone-400 block font-medium">مرجع کلید درگاه سامان کیش (SEP):</span>
              <div className="font-mono text-xs text-[#eed29d]" dir="ltr">
                {formData.integrationReferences.sepMerchantKeyRef}
              </div>
            </div>

            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-1">
              <span className="text-[11px] text-stone-400 block font-medium">مرجع ترمینال شاپرک:</span>
              <div className="font-mono text-xs text-[#eed29d]" dir="ltr">
                {formData.integrationReferences.sepTerminalIdRef}
              </div>
            </div>

            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-1">
              <span className="text-[11px] text-stone-400 block font-medium">مرجع کلید وب‌سرویس پیامکی کاوه‌نگار:</span>
              <div className="font-mono text-xs text-[#eed29d]" dir="ltr">
                {formData.integrationReferences.kavenegarApiKeyRef}
              </div>
            </div>

            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-1">
              <span className="text-[11px] text-stone-400 block font-medium">مرجع توکن سامانه لجستیک تیپاکس:</span>
              <div className="font-mono text-xs text-[#eed29d]" dir="ltr">
                {formData.integrationReferences.tipaxApiTokenRef}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Unsaved Changes Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-1/2 sm:translate-x-1/2 bg-[#1c1a18] border-2 border-[#ba8d3d] rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 z-50 animate-bounce-subtle">
          <div className="flex items-center gap-2.5 text-xs text-white">
            <AlertTriangle size={18} className="text-[#ba8d3d] shrink-0" />
            <span>شما تغییرات ذخیره‌نشده در فرم تنظیمات دارید.</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleDiscard}>
              انصراف
            </Button>
            <Button variant="brass" size="sm" onClick={handleSave}>
              ذخیره تغییرات
            </Button>
          </div>
        </div>
      )}

      {/* Restore Defaults Confirmation Dialog */}
      {isResetConfirmOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsResetConfirmOpen(false)}
          title="تایید بازنشانی تنظیمات به پیش‌فرض"
        >
          <div className="space-y-4 text-xs" dir="rtl">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 leading-relaxed">
              آیا از بازنشانی تمامی فیلدهای تنظیمات فروشگاه، قوانین ارسال، محدودیت‌های چاپ و مراجع امن به مقادیر اولیه کارخانه اطمینان دارید؟
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="secondary" size="sm" onClick={() => setIsResetConfirmOpen(false)}>
                انصراف
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmRestoreDefaults}>
                تایید و بازنشانی کامل
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
