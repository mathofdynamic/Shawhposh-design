/**
 * Shahpoosh Luxury Streetwear - RBAC & Team Operations System
 * Domain definitions for Roles, Permission Matrix, Audit Logging, and Task Tracking.
 *
 * ROLES:
 * - owner (Owner / بنیان‌گذار و مالک کارگاه)
 * - store_manager (Store Manager / مدیر فروشگاه)
 * - finance (Finance & Auditor / حسابرس و امور مالی)
 * - production (Production Lead / سرپرست خط تولید و چاپ DTG)
 * - inventory (Inventory & Logistics / انباردار و تدارکات)
 * - support (Customer Support / کارشناس پشتیبانی و رضایت مشتری)
 */

export type RoleKey =
  | 'owner'
  | 'store_manager'
  | 'finance'
  | 'production'
  | 'inventory'
  | 'support';

export type PermissionAction =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'refund'
  | 'export'
  | 'reveal_pii';

export type PermissionModule =
  | 'orders'
  | 'products_catalog'
  | 'custom_studio'
  | 'inventory_stock'
  | 'finance_refunds'
  | 'customers'
  | 'marketing_discounts'
  | 'storefront_cms'
  | 'team_staff'
  | 'audit_security'
  | 'system_settings';

export interface RoleDefinition {
  key: RoleKey;
  titleFa: string;
  titleEn: string;
  representativeName: string;
  avatarSeed: string;
  descriptionFa: string;
  colorHex: string;
  badgeVariant: 'warning' | 'default' | 'success' | 'critical' | 'info';
  isOwnerLevel: boolean;
}

export const ROLE_DEFINITIONS: Record<RoleKey, RoleDefinition> = {
  owner: {
    key: 'owner',
    titleFa: 'بنیان‌گذار و مالک کارگاه (Owner)',
    titleEn: 'Owner & Executive',
    representativeName: 'کیوان دادگر',
    avatarSeed: 'dadgar',
    descriptionFa: 'اختیارات تام بدون محدودیت؛ دسترسی به تمام ماژول‌ها، تغییرات ساختاری، استرداد مالی و تعیین نقش‌ها',
    colorHex: '#ba8d3d',
    badgeVariant: 'warning',
    isOwnerLevel: true,
  },
  store_manager: {
    key: 'store_manager',
    titleFa: 'مدیر اجرایی فروشگاه (Store Manager)',
    titleEn: 'Store Manager',
    representativeName: 'سهراب اخوان',
    avatarSeed: 'akhavan',
    descriptionFa: 'مدیریت سفارش‌ها، کاتالوگ، کمپین‌های تبلیغاتی و نظارت بر وظایف جاری پرسنل بدون دسترسی به تنظیمات سرور',
    colorHex: '#38bdf8',
    badgeVariant: 'info',
    isOwnerLevel: false,
  },
  finance: {
    key: 'finance',
    titleFa: 'حسابرس و امور مالی (Finance)',
    titleEn: 'Finance & Auditor',
    representativeName: 'مریم باطنی',
    avatarSeed: 'bateni',
    descriptionFa: 'کنترل پرداخت‌های شاپرک، تایید درخواست‌های استرداد وجه، اسناد تسویه پایا و صدور خروجی‌های مالی',
    colorHex: '#10b981',
    badgeVariant: 'success',
    isOwnerLevel: false,
  },
  production: {
    key: 'production',
    titleFa: 'سرپرست خط چاپ و آتلیه (Production)',
    titleEn: 'Production Lead',
    representativeName: 'وحید رضوانی',
    avatarSeed: 'rezvani',
    descriptionFa: 'داوری آرت‌ورک‌های آتلیه، کالیبراسیون پرینترهای Brother GTX Pro، تست کیفی و کنترل مراحل پرس حرارتی',
    colorHex: '#f59e0b',
    badgeVariant: 'warning',
    isOwnerLevel: false,
  },
  inventory: {
    key: 'inventory',
    titleFa: 'مسئول انبار و زنجیره تامین (Inventory)',
    titleEn: 'Inventory & Logistics',
    representativeName: 'امید فرهمند',
    avatarSeed: 'farahmand',
    descriptionFa: 'تعدیل دستی موجودی مواد خام و تیشرت‌های دوخته‌شده، سفارش خرید از بافندگی و بررسی رسیدهای انبار',
    colorHex: '#a855f7',
    badgeVariant: 'default',
    isOwnerLevel: false,
  },
  support: {
    key: 'support',
    titleFa: 'کارشناس پشتیبانی و مشتریان (Support)',
    titleEn: 'Customer Support',
    representativeName: 'نگار شایگان',
    avatarSeed: 'shaygan',
    descriptionFa: 'پاسخگویی به تیکت‌های خریداران، هماهنگی تغییر سایز قبل از چاپ، بررسی مرجوعی‌ها و مشاهده کنترل‌شده اطلاعات',
    colorHex: '#ec4899',
    badgeVariant: 'default',
    isOwnerLevel: false,
  },
};

export const MODULE_DEFINITIONS: {
  key: PermissionModule;
  titleFa: string;
  descriptionFa: string;
}[] = [
  {
    key: 'orders',
    titleFa: 'سفارش‌ها و فاکتورها',
    descriptionFa: 'مشاهده فاکتورها، ویرایش اقلام، تغییر وضعیت به تولید و تخصیص مسئول',
  },
  {
    key: 'products_catalog',
    titleFa: 'کاتالوگ و محصولات',
    descriptionFa: 'ایجاد تیشرت/هودی، ویرایش مشخصات پارچه، قیمت‌گذاری و مدیریت دسته‌بندی‌ها',
  },
  {
    key: 'custom_studio',
    titleFa: 'آتلیه چاپ مستقیم (DTG Studio)',
    descriptionFa: 'داوری آرت‌ورک، تایید یا رد فایل وکتور/نستعلیق و صدور حواله خط چاپ Brother',
  },
  {
    key: 'inventory_stock',
    titleFa: 'انبار و موجودی پارچه خام',
    descriptionFa: 'تعدیل فیزیکی موجودی، ثبت سفارش خرید مواد اولیه و ردیابی جابجایی‌ها',
  },
  {
    key: 'finance_refunds',
    titleFa: 'عملیات مالی و استرداد وجه (Refunds)',
    descriptionFa: 'تایید استرداد مبالغ، دسترسی به تراکنش‌های درگاه شاپرک و گزارش تسویه',
  },
  {
    key: 'customers',
    titleFa: 'مشتریان و تیکت‌های پشتیبانی',
    descriptionFa: 'مدیریت پرونده‌های خریداران، رسیدگی به تیکت‌ها و ارزیابی رضایت',
  },
  {
    key: 'marketing_discounts',
    titleFa: 'مارکتینگ و کدهای تخفیف',
    descriptionFa: 'تعریف کوپن‌ها، کمپین‌های دارای تگ UTM و بررسی قیف ۶ مرحله‌ای',
  },
  {
    key: 'storefront_cms',
    titleFa: 'محتوا، بنرها و سئو (CMS)',
    descriptionFa: 'ویرایش اسلایدر هیرو، بنرهای فصلی، صفحات استاتیک و اسکیما JSON-LD',
  },
  {
    key: 'team_staff',
    titleFa: 'پرسنل، تخصیص وظایف و نقش‌ها',
    descriptionFa: 'دعوت همکار، تخصیص کارتابل و مدیریت ماتریس دسترسی RBAC',
  },
  {
    key: 'audit_security',
    titleFa: 'دفتر کل وقایع امنیتی (Audit Trail)',
    descriptionFa: 'مشاهده زنجیره تغییرات، قبل/بعد وقایع و رهگیری اپراتورها',
  },
  {
    key: 'system_settings',
    titleFa: 'پیکربندی سیستم و درگاه‌ها',
    descriptionFa: 'تنظیمات فنی وب‌سرویس‌ها، بازنشانی داده‌ها و کلیدهای ارتباطی',
  },
];

export const ACTION_DEFINITIONS: {
  key: PermissionAction;
  titleFa: string;
  icon: string;
  descriptionFa: string;
}[] = [
  { key: 'read', titleFa: 'مشاهده (Read)', icon: 'Eye', descriptionFa: 'دسترسی خواندن داده‌ها در جدول‌ها و کارت‌ها' },
  { key: 'create', titleFa: 'ایجاد (Create)', icon: 'Plus', descriptionFa: 'ثبت رکورد جدید، ایجاد محصول یا وظیفه' },
  { key: 'update', titleFa: 'ویرایش (Update)', icon: 'Edit3', descriptionFa: 'تغییر فیلدها و ذخیره‌سازی داده‌های موجود' },
  { key: 'delete', titleFa: 'حذف (Delete)', icon: 'Trash2', descriptionFa: 'بایگانی یا حذف پایدار رکوردها' },
  { key: 'approve', titleFa: 'تایید رسمی (Approve)', icon: 'CheckCircle2', descriptionFa: 'تایید آرت‌ورک چاپی، پذیرش سفارش خرید یا مرجوعی' },
  { key: 'refund', titleFa: 'استرداد مالی (Refund)', icon: 'RotateCcw', descriptionFa: 'تایید و صدور دستور استرداد وجه به حساب خریدار' },
  { key: 'export', titleFa: 'خروجی اکسل/CSV', icon: 'Download', descriptionFa: 'استخراج داده‌های سیستمی در قالب فایل' },
  { key: 'reveal_pii', titleFa: 'نمایش هویت/PII', icon: 'ShieldAlert', descriptionFa: 'رفع ماسک شماره تماس خریدار، آدرس کامل و کد پستی' },
];

/**
 * Explicit Permission Matrix with Safe Default Deny.
 * If not explicitly listed, access is DENIED.
 */
export const PERMISSION_MATRIX: Record<
  PermissionModule,
  Record<PermissionAction, RoleKey[]>
> = {
  orders: {
    read: ['owner', 'store_manager', 'finance', 'production', 'inventory', 'support'],
    create: ['owner', 'store_manager', 'support'],
    update: ['owner', 'store_manager', 'production', 'support'],
    delete: ['owner'],
    approve: ['owner', 'store_manager', 'production'],
    refund: ['owner', 'finance'],
    export: ['owner', 'store_manager', 'finance'],
    reveal_pii: ['owner', 'store_manager', 'support'],
  },
  products_catalog: {
    read: ['owner', 'store_manager', 'finance', 'production', 'inventory', 'support'],
    create: ['owner', 'store_manager'],
    update: ['owner', 'store_manager', 'production'],
    delete: ['owner'],
    approve: ['owner', 'store_manager'],
    refund: [],
    export: ['owner', 'store_manager', 'inventory'],
    reveal_pii: [],
  },
  custom_studio: {
    read: ['owner', 'store_manager', 'production', 'support'],
    create: ['owner', 'production'],
    update: ['owner', 'production'],
    delete: ['owner'],
    approve: ['owner', 'production'],
    refund: [],
    export: ['owner', 'production'],
    reveal_pii: ['owner', 'production'],
  },
  inventory_stock: {
    read: ['owner', 'store_manager', 'production', 'inventory', 'finance'],
    create: ['owner', 'inventory'],
    update: ['owner', 'inventory', 'production'],
    delete: ['owner'],
    approve: ['owner', 'inventory'],
    refund: [],
    export: ['owner', 'inventory', 'finance'],
    reveal_pii: [],
  },
  finance_refunds: {
    read: ['owner', 'finance', 'store_manager'],
    create: ['owner', 'finance'],
    update: ['owner', 'finance'],
    delete: ['owner'],
    approve: ['owner', 'finance'],
    refund: ['owner', 'finance'],
    export: ['owner', 'finance'],
    reveal_pii: ['owner', 'finance'],
  },
  customers: {
    read: ['owner', 'store_manager', 'support', 'finance'],
    create: ['owner', 'support'],
    update: ['owner', 'support', 'store_manager'],
    delete: ['owner'],
    approve: ['owner', 'support'],
    refund: ['owner', 'finance'],
    export: ['owner', 'store_manager'],
    reveal_pii: ['owner', 'store_manager', 'support'],
  },
  marketing_discounts: {
    read: ['owner', 'store_manager', 'finance'],
    create: ['owner', 'store_manager'],
    update: ['owner', 'store_manager'],
    delete: ['owner'],
    approve: ['owner', 'store_manager'],
    refund: [],
    export: ['owner', 'store_manager'],
    reveal_pii: [],
  },
  storefront_cms: {
    read: ['owner', 'store_manager'],
    create: ['owner', 'store_manager'],
    update: ['owner', 'store_manager'],
    delete: ['owner'],
    approve: ['owner'],
    refund: [],
    export: ['owner', 'store_manager'],
    reveal_pii: [],
  },
  team_staff: {
    read: ['owner', 'store_manager'],
    create: ['owner'],
    update: ['owner'],
    delete: ['owner'],
    approve: ['owner'],
    refund: [],
    export: ['owner'],
    reveal_pii: ['owner'],
  },
  audit_security: {
    read: ['owner', 'store_manager', 'finance'],
    create: [], // Automated by repository
    update: [], // Immutable
    delete: [], // Immutable
    approve: [],
    refund: [],
    export: ['owner', 'finance'],
    reveal_pii: ['owner'],
  },
  system_settings: {
    read: ['owner'],
    create: ['owner'],
    update: ['owner'],
    delete: ['owner'],
    approve: ['owner'],
    refund: [],
    export: ['owner'],
    reveal_pii: ['owner'],
  },
};

/**
 * Check permission helper with safe default deny
 */
export function hasPermission(
  role: RoleKey,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  const modulePerms = PERMISSION_MATRIX[module];
  if (!modulePerms) return false;
  const allowedRoles = modulePerms[action];
  if (!allowedRoles) return false;
  return allowedRoles.includes(role);
}

/**
 * Work Report Record for staff daily/period logging
 */
export interface StaffWorkReport {
  id: string; // e.g. "REP-20260923-01"
  staffId: string;
  staffName: string;
  staffRole: RoleKey;
  reportDate: string; // "YYYY-MM-DD"
  shiftType: 'morning' | 'evening' | 'full_day';
  completedSummary: string;
  ongoingWork: string;
  blockedItems?: string;
  notes?: string;
  submittedAt: string;
  isSelfEntered: boolean; // Distinguish self-entered report from automated audit events
  linkedActionCount: number; // Count of underlying audit actions recorded for that person
  pendingAssignmentsCount: number;
}

/**
 * Staff Invitation (DEMO simulation invite)
 */
export interface StaffInvitationRecord {
  id: string;
  fullName: string;
  email: string;
  role: RoleKey;
  invitedBy: string;
  invitedAt: string;
  status: 'pending_demo_acceptance' | 'activated' | 'expired';
  demoToken: string;
  isDemoInvitation: true;
}

/**
 * Session history item (Synthetic & clearly labelled)
 */
export interface StaffSessionRecord {
  id: string;
  staffId: string;
  staffName: string;
  role: RoleKey;
  ipAddress: string;
  device: string;
  browser: string;
  startedAt: string;
  endedAt?: string;
  isSyntheticDemoSession: true;
  status: 'active' | 'terminated';
}
