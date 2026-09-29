/**
 * Shahpoosh Luxury Streetwear - System Configuration & Shared Settings
 * Prompt 18: System health, audit/logs, restricted data explorer, settings
 */

export interface SystemStoreSettings {
  storeName: string;
  brandTagline: string;
  logoUrl: string;
  supportPhone: string;
  supportEmail: string;
  workshopAddress: string;
  postalCode: string;
}

export interface SystemLocalizationSettings {
  locale: 'fa-IR';
  direction: 'rtl';
  displayTimezone: 'Asia/Tehran';
  timeFormat: 'jalali_24h' | 'jalali_12h';
  canonicalMoneyUnit: 'TOMAN';
  secondaryMoneyUnit: 'IRR';
  tomanPresentation: 'separated_fa' | 'k_suffix';
}

export interface SystemTaxSettings {
  isConfigurablePlaceholder: true;
  disclaimer: string;
  taxRatePercent: number; // Placeholder e.g. 0 or 10
  vatNumberPlaceholder: string;
  applyTaxToShipping: boolean;
}

export interface SystemShippingRules {
  defaultCarrier: 'tipax' | 'post_pishtaz' | 'snapp_box';
  flatShippingFeeTomans: number;
  freeShippingThresholdTomans: number;
  returnWindowDays: number;
  damagedItemReturnPolicyDays: number;
  customizedGoodsNonReturnable: boolean;
  returnPolicyNotice: string;
}

export interface SystemCustomizationLimits {
  minResolutionDpi: number; // e.g. 300
  maxUploadSizeBytes: number; // e.g. 52428800 (50MB)
  supportedRasterFormats: string[]; // ['image/png', 'image/tiff', 'image/jpeg', 'image/svg+xml']
  maxActivePrintZonesPerItem: number; // e.g. 4
  allowCustomerCustomText: boolean;
  autoDpiWarningThreshold: number; // 300
}

export interface SystemPrintZoneDef {
  id: string;
  nameFa: string;
  nameEn: string;
  code: string;
  maxWidthCm: number;
  maxHeightCm: number;
  baseSurchargeTomans: number;
  isActive: boolean;
}

export interface SystemDiscountStackingRules {
  allowMultipleCoupons: boolean;
  canStackWithVipTier: boolean;
  canStackWithCategorySale: boolean;
  maxCombinedDiscountPercent: number; // e.g. 40%
}

export interface SystemNotificationPreferences {
  enableOrderConfirmationSms: boolean;
  enableDesignApprovedSms: boolean;
  enableShipmentDispatchedSms: boolean;
  enableRefundProcessedSms: boolean;
  enableStaffDailyDigestEmail: boolean;
  enableCriticalInventoryWebhookAlert: boolean;
  webhookEndpointRef: string; // server reference UX only
}

export interface SystemStorefrontPolicies {
  termsOfServiceExcerpt: string;
  privacyPolicyExcerpt: string;
  dtgManufacturingSlaText: string;
}

export interface SystemStaffSecuritySettings {
  enforceMfaForSuperAdmin: boolean;
  enforceMfaForFinance: boolean;
  sessionInactivityTimeoutMinutes: number; // 15 to 480
  maxFailedLoginAttemptsBeforeLockout: number; // 3 to 10
  ipAllowlistEnabled: boolean;
  allowedCidrRanges: string[];
}

export interface SystemIntegrationSecretReferences {
  sepMerchantKeyRef: string;
  sepTerminalIdRef: string;
  behpardakhtTerminalRef: string;
  kavenegarApiKeyRef: string;
  tipaxApiTokenRef: string;
  printerBridgeSecretRef: string;
}

export interface CompleteSystemSettings {
  store: SystemStoreSettings;
  localization: SystemLocalizationSettings;
  tax: SystemTaxSettings;
  shipping: SystemShippingRules;
  customization: SystemCustomizationLimits;
  printZones: SystemPrintZoneDef[];
  discountStacking: SystemDiscountStackingRules;
  notifications: SystemNotificationPreferences;
  policies: SystemStorefrontPolicies;
  security: SystemStaffSecuritySettings;
  integrationReferences: SystemIntegrationSecretReferences;
  lastUpdated: string;
  lastUpdatedBy: string;
}

export const DEFAULT_PRINT_ZONES: SystemPrintZoneDef[] = [
  {
    id: 'pz-chest-center',
    nameFa: 'سینه جلو (مرکز طرح)',
    nameEn: 'Front Chest Center',
    code: 'CHEST_CENTER',
    maxWidthCm: 35,
    maxHeightCm: 45,
    baseSurchargeTomans: 0,
    isActive: true,
  },
  {
    id: 'pz-back-full',
    nameFa: 'پشت کامل لباس (پوستر DTG)',
    nameEn: 'Back Full Oversized',
    code: 'BACK_FULL',
    maxWidthCm: 40,
    maxHeightCm: 50,
    baseSurchargeTomans: 85000,
    isActive: true,
  },
  {
    id: 'pz-sleeve-left',
    nameFa: 'بازوی چپ (تایپوگرافی یا نماد)',
    nameEn: 'Left Sleeve',
    code: 'SLEEVE_LEFT',
    maxWidthCm: 10,
    maxHeightCm: 30,
    baseSurchargeTomans: 40000,
    isActive: true,
  },
  {
    id: 'pz-sleeve-right',
    nameFa: 'بازوی راست',
    nameEn: 'Right Sleeve',
    code: 'SLEEVE_RIGHT',
    maxWidthCm: 10,
    maxHeightCm: 30,
    baseSurchargeTomans: 40000,
    isActive: true,
  },
  {
    id: 'pz-neck-inner',
    nameFa: 'اتیکت داخلی پشت یقه',
    nameEn: 'Inner Neck Print',
    code: 'NECK_INNER',
    maxWidthCm: 8,
    maxHeightCm: 8,
    baseSurchargeTomans: 25000,
    isActive: true,
  },
];

export const DEFAULT_SYSTEM_SETTINGS: CompleteSystemSettings = {
  store: {
    storeName: 'شاه‌پوش | خانه مد و استریت‌ویر لوکس',
    brandTagline: 'تلاقی هنر نگارگری ایرانی و مد آوانگارد شهری',
    logoUrl: '/images/brand/logo.svg',
    supportPhone: '۰۲۱-۸۸۹۹۰۰۱۱',
    supportEmail: 'concierge@shahpoosh.ir',
    workshopAddress: 'تهران، خیابان ولیعصر، نرسیده به میدان تجریش، مجتمع کارگاهی آتلیه شاه‌پوش',
    postalCode: '۱۹۸۵۷۴۳۲۱۰',
  },
  localization: {
    locale: 'fa-IR',
    direction: 'rtl',
    displayTimezone: 'Asia/Tehran',
    timeFormat: 'jalali_24h',
    canonicalMoneyUnit: 'TOMAN',
    secondaryMoneyUnit: 'IRR',
    tomanPresentation: 'separated_fa',
  },
  tax: {
    isConfigurablePlaceholder: true,
    disclaimer: 'تذکر سیستمی: نرخ‌های مالیاتی فوق صرفاً فیلدهای محاسباتی قابل تنظیم جهت آزمایش محاسبات فاکتور بوده و به هیچ وجه استنتاج تعهدات قانونی یا مشاوره مالیاتی محسوب نمی‌گردد.',
    taxRatePercent: 0,
    vatNumberPlaceholder: '۴۱۱-۰۰۰-۰۰۰۰-۰۰',
    applyTaxToShipping: false,
  },
  shipping: {
    defaultCarrier: 'tipax',
    flatShippingFeeTomans: 45000,
    freeShippingThresholdTomans: 1500000,
    returnWindowDays: 7,
    damagedItemReturnPolicyDays: 48,
    customizedGoodsNonReturnable: true,
    returnPolicyNotice: 'کالاهای شخصی‌سازی شده در آتلیه چاپ اختصاصی، طبق ماده ۳۷ قانون تجارت الکترونیک، به دلیل تولید بر اساس سفارش مشتری قابل عودت به انبار نیستند؛ مگر در صورت عدم انطباق یا نقص فنی در دوخت و پارچه.',
  },
  customization: {
    minResolutionDpi: 300,
    maxUploadSizeBytes: 52428800, // 50MB
    supportedRasterFormats: ['PNG', 'TIFF', 'JPEG', 'SVG'],
    maxActivePrintZonesPerItem: 4,
    allowCustomerCustomText: true,
    autoDpiWarningThreshold: 300,
  },
  printZones: DEFAULT_PRINT_ZONES,
  discountStacking: {
    allowMultipleCoupons: false,
    canStackWithVipTier: true,
    canStackWithCategorySale: false,
    maxCombinedDiscountPercent: 40,
  },
  notifications: {
    enableOrderConfirmationSms: true,
    enableDesignApprovedSms: true,
    enableShipmentDispatchedSms: true,
    enableRefundProcessedSms: true,
    enableStaffDailyDigestEmail: true,
    enableCriticalInventoryWebhookAlert: true,
    webhookEndpointRef: 'vault:secret/webhooks/ops#notification_sink',
  },
  policies: {
    termsOfServiceExcerpt: 'کلیه سفارش‌های ثبت‌شده در شاه‌پوش ظرف مدت ۲۴ ساعت کاری وارد چرخه تولید آتلیه و چاپ DTG گردیده و مطابق استانداردهای تضمین کیفیت نساجی بازرسی می‌شوند.',
    privacyPolicyExcerpt: 'حریم خصوصی، شماره تماس و اطلاعات هویتی مشتریان صرفاً جهت پردازش سفارشات، ارسال بارنامه و ارتقای خدمات استفاده شده و تحت پروتکل‌های امنیتی محافظت می‌گردد.',
    dtgManufacturingSlaText: 'تعهد زمانی چاپ و آماده‌سازی محصولات سفارش اختصاصی بین ۲ الی ۴ روز کاری است. ماندگاری جوهر نساجی تا ۶۰ بار شستشوی بدون سفیدکننده تضمین می‌گردد.',
  },
  security: {
    enforceMfaForSuperAdmin: true,
    enforceMfaForFinance: true,
    sessionInactivityTimeoutMinutes: 60,
    maxFailedLoginAttemptsBeforeLockout: 5,
    ipAllowlistEnabled: false,
    allowedCidrRanges: ['192.168.1.0/24', '10.0.0.0/8'],
  },
  integrationReferences: {
    sepMerchantKeyRef: 'vault:secret/gateways/sep#merchant_key_v2',
    sepTerminalIdRef: 'vault:secret/gateways/sep#terminal_id',
    behpardakhtTerminalRef: 'vault:secret/gateways/behpardakht#terminal_id',
    kavenegarApiKeyRef: 'ref:env/KAVENEGAR_API_KEY',
    tipaxApiTokenRef: 'vault:secret/logistics/tipax#api_token',
    printerBridgeSecretRef: 'local:network/bridge/gtx6#device_secret',
  },
  lastUpdated: '2026-09-23T12:00:00.000Z',
  lastUpdatedBy: 'مدیر ارشد فنی',
};

const SETTINGS_STORAGE_KEY = 'SHAWHPOSH_ADMIN_SYSTEM_SETTINGS_V1';

export function getStoredSystemSettings(): CompleteSystemSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SYSTEM_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SYSTEM_SETTINGS,
      ...parsed,
      store: { ...DEFAULT_SYSTEM_SETTINGS.store, ...parsed.store },
      localization: { ...DEFAULT_SYSTEM_SETTINGS.localization, ...parsed.localization },
      tax: { ...DEFAULT_SYSTEM_SETTINGS.tax, ...parsed.tax },
      shipping: { ...DEFAULT_SYSTEM_SETTINGS.shipping, ...parsed.shipping },
      customization: { ...DEFAULT_SYSTEM_SETTINGS.customization, ...parsed.customization },
      printZones: parsed.printZones || DEFAULT_PRINT_ZONES,
      discountStacking: { ...DEFAULT_SYSTEM_SETTINGS.discountStacking, ...parsed.discountStacking },
      notifications: { ...DEFAULT_SYSTEM_SETTINGS.notifications, ...parsed.notifications },
      policies: { ...DEFAULT_SYSTEM_SETTINGS.policies, ...parsed.policies },
      security: { ...DEFAULT_SYSTEM_SETTINGS.security, ...parsed.security },
      integrationReferences: { ...DEFAULT_SYSTEM_SETTINGS.integrationReferences, ...parsed.integrationReferences },
    };
  } catch {
    return DEFAULT_SYSTEM_SETTINGS;
  }
}

export function saveSystemSettings(settings: CompleteSystemSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save system settings to localStorage', err);
  }
}

export function resetSystemSettingsToDefaults(): CompleteSystemSettings {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
  } catch {}
  return DEFAULT_SYSTEM_SETTINGS;
}

export interface SettingsValidationError {
  field: string;
  message: string;
}

export function validateSystemSettings(settings: CompleteSystemSettings): SettingsValidationError[] {
  const errors: SettingsValidationError[] = [];

  if (!settings.store.storeName.trim()) {
    errors.push({ field: 'store.storeName', message: 'نام فروشگاه نمی‌تواند خالی باشد.' });
  }

  if (settings.shipping.flatShippingFeeTomans < 0) {
    errors.push({ field: 'shipping.flatShippingFeeTomans', message: 'هزینه ارسال نمی‌تواند منفی باشد.' });
  }

  if (settings.shipping.freeShippingThresholdTomans < settings.shipping.flatShippingFeeTomans) {
    errors.push({
      field: 'shipping.freeShippingThresholdTomans',
      message: 'سقف ارسال رایگان باید بزرگتر یا مساوی هزینه پایه ارسال باشد.',
    });
  }

  if (settings.customization.minResolutionDpi < 150 || settings.customization.minResolutionDpi > 1200) {
    errors.push({
      field: 'customization.minResolutionDpi',
      message: 'رزولوشن مجاز فایل آرت‌ورک باید بین ۱۵۰ تا ۱۲۰۰ DPI تنظیم شود.',
    });
  }

  if (
    settings.customization.maxUploadSizeBytes < 1048576 ||
    settings.customization.maxUploadSizeBytes > 209715200
  ) {
    errors.push({
      field: 'customization.maxUploadSizeBytes',
      message: 'حداکثر حجم آپلود باید بین ۱ تا ۲۰۰ مگابایت باشد.',
    });
  }

  if (
    settings.discountStacking.maxCombinedDiscountPercent < 5 ||
    settings.discountStacking.maxCombinedDiscountPercent > 90
  ) {
    errors.push({
      field: 'discountStacking.maxCombinedDiscountPercent',
      message: 'سقف درصد تخفیف تجمیعی باید مقداری بین ۵٪ تا ۹۰٪ باشد.',
    });
  }

  if (
    settings.security.sessionInactivityTimeoutMinutes < 5 ||
    settings.security.sessionInactivityTimeoutMinutes > 1440
  ) {
    errors.push({
      field: 'security.sessionInactivityTimeoutMinutes',
      message: 'مدت انقضای نشست کاری باید بین ۵ تا ۱۴۴۰ دقیقه باشد.',
    });
  }

  return errors;
}
