import { AdminNavGroupDef, AdminRouteDef } from './types';

export const ADMIN_GROUPS: AdminNavGroupDef[] = [
  {
    id: 'overview',
    titleFa: 'نمای کلی و خلاصه',
    titleEn: 'Overview',
    iconName: 'LayoutDashboard',
    routes: [
      {
        id: 'dashboard',
        path: '/admin/overview/dashboard',
        groupId: 'overview',
        titleFa: 'داشبورد عملیات کارگاه',
        titleEn: 'Dashboard',
        shortTitleFa: 'داشبورد',
        descriptionFa: 'شاخص‌های کلیدی عملکرد، خلاصه فروش بلادرنگ، وضعیت خطوط چاپ و ناوردایی‌های انبار',
        iconName: 'LayoutGrid',
      },
      {
        id: 'action-center',
        path: '/admin/overview/action-center',
        groupId: 'overview',
        titleFa: 'مرکز اقدام فوری و هشدارهای بحرانی',
        titleEn: 'Action Center',
        shortTitleFa: 'اقدام فوری',
        descriptionFa: 'فهرست اقدامات معوق، طرح‌های نیازمند بازبینی و هشدارهای کسری موجودی بحرانی',
        iconName: 'Zap',
        badgeKey: 'pendingDesigns',
      },
      {
        id: 'work-report',
        path: '/admin/overview/work-report',
        groupId: 'overview',
        titleFa: 'گزارش شیفت کاری و تولید روزانه',
        titleEn: 'Work Report',
        shortTitleFa: 'گزارش شیفت',
        descriptionFa: 'خلاصه تیراژ چاپ، عملکرد اپراتورها، مصرف جوهر نساجی و قطعات بسته‌بندی شده',
        iconName: 'FileSpreadsheet',
      },
    ],
  },
  {
    id: 'sales',
    titleFa: 'فروش و سفارشات',
    titleEn: 'Sales',
    iconName: 'ShoppingBag',
    routes: [
      {
        id: 'orders',
        path: '/admin/sales/orders',
        groupId: 'sales',
        titleFa: 'مدیریت و پردازش سفارش‌ها',
        titleEn: 'Orders',
        shortTitleFa: 'سفارش‌ها',
        descriptionFa: 'فهرست فاکتورها، سبد سفارش‌های تاییدشده، سفارش‌های شخصی‌سازی شده و تغییر مرحله',
        iconName: 'ShoppingBag',
        badgeKey: 'pendingOrders',
        quickAction: {
          label: 'ثبت سفارش دستی',
          actionKey: 'create_order',
        },
      },
      {
        id: 'order-detail',
        path: '/admin/sales/orders/:id',
        groupId: 'sales',
        titleFa: 'شناسنامه و پرونده عملیاتی سفارش',
        titleEn: 'Order Detail',
        shortTitleFa: 'جزئیات سفارش',
        descriptionFa: 'اطلاعات کامل فاکتور، خط تولید، پیش‌نمایش طرح سفارشی، مرسوله و سوابق تغییرات',
        iconName: 'FileText',
      },
      {
        id: 'payments',
        path: '/admin/sales/payments',
        groupId: 'sales',
        titleFa: 'تراکنش‌ها و تسویه درگاه‌های بانکی',
        titleEn: 'Payments',
        shortTitleFa: 'تراکنش‌ها',
        descriptionFa: 'رهگیری پرداخت‌های شاپرک، شماره‌های پیگیری، رسیدها و مبالغ معلق بانکی',
        iconName: 'CreditCard',
        allowedRoles: ['super_admin', 'support_finance'],
        badgeKey: 'unverifiedPayments',
      },
      {
        id: 'payment-detail',
        path: '/admin/sales/payments/:id',
        groupId: 'sales',
        titleFa: 'شناسنامه و رهگیری تراکنش شاپرک',
        titleEn: 'Payment Detail',
        shortTitleFa: 'جزئیات تراکنش',
        descriptionFa: 'اطلاعات کامل درگاه PSP، شماره پیگیری، RRN، سوابق استرداد و لاگ فنی استعلام',
        iconName: 'Receipt',
        allowedRoles: ['super_admin', 'support_finance'],
      },
      {
        id: 'refunds',
        path: '/admin/sales/refunds',
        groupId: 'sales',
        titleFa: 'مدیریت و تسویه استرداد وجه (Refunds)',
        titleEn: 'Refunds Ledger',
        shortTitleFa: 'استرداد وجه',
        descriptionFa: 'بررسی درخواست‌های مرجوعی، کنترل سقف مبلغ استرداد، تایید کارشناسی و تسویه پایا',
        iconName: 'RotateCcw',
        allowedRoles: ['super_admin', 'support_finance'],
      },
      {
        id: 'shipping',
        path: '/admin/sales/shipping',
        groupId: 'sales',
        titleFa: 'ارسال مرسولات و صدور بارنامه',
        titleEn: 'Shipping',
        shortTitleFa: 'مرسولات و بارنامه',
        descriptionFa: 'کدهای رهگیری پست پیشتاز، تیپاکس، ناوگان پیک اختصاصی تهران و بسته‌بندی',
        iconName: 'Truck',
        allowedRoles: ['super_admin', 'production_operator', 'support_finance'],
      },
      {
        id: 'shipment-detail',
        path: '/admin/sales/shipping/:id',
        groupId: 'sales',
        titleFa: 'شناسنامه و رهگیری مرسوله پستی',
        titleEn: 'Shipment Detail',
        shortTitleFa: 'جزئیات مرسوله',
        descriptionFa: 'لیست اقلام بسته، انتخاب ناوگان، وضعیت QC، رویدادهای اصلاح نشانی و پیگیری بارنامه',
        iconName: 'Package',
      },
      {
        id: 'returns',
        path: '/admin/sales/returns',
        groupId: 'sales',
        titleFa: 'مرجوعی‌ها و استرداد وجه فاکتور',
        titleEn: 'Returns',
        shortTitleFa: 'مرجوعی و استرداد',
        descriptionFa: 'مدیریت پرونده‌های مرجوعی، بازگشت کالا به انبار و صدور سند مالی بستانکار',
        iconName: 'RotateCcw',
        allowedRoles: ['super_admin', 'support_finance'],
      },
      {
        id: 'sales-analytics',
        path: '/admin/sales/analytics',
        groupId: 'sales',
        titleFa: 'تحلیل مالی و روند فروش ناخالص و خالص',
        titleEn: 'Sales Analytics',
        shortTitleFa: 'تحلیل فروش',
        descriptionFa: 'نمودارهای مقایسه‌ای درآمد، میانگین ارزش فاکتور (AOV) و پرفروش‌ترین سایزها',
        iconName: 'TrendingUp',
      },
    ],
  },
  {
    id: 'catalog',
    titleFa: 'کاتالوگ و انبارداری',
    titleEn: 'Catalog',
    iconName: 'Layers',
    routes: [
      {
        id: 'products',
        path: '/admin/catalog/products',
        groupId: 'catalog',
        titleFa: 'محصولات پایه و فرم‌های لباس',
        titleEn: 'Products',
        shortTitleFa: 'محصولات پایه',
        descriptionFa: 'مدل‌های تیشرت اورسایز، کلاسیک، هودی ۳۸۰ گرم، کراپ و پارچه‌های خام پنبه سوپر',
        iconName: 'Tag',
      },
      {
        id: 'variants',
        path: '/admin/catalog/variants',
        groupId: 'catalog',
        titleFa: 'تنوع‌های انبار و کدهای شناسایی (SKUs)',
        titleEn: 'Variants',
        shortTitleFa: 'تنوع‌ها (SKU)',
        descriptionFa: 'تفکیک ماتریس ۱۶۸ کد محصول بر اساس رنگ‌بندی، سایزبندی و آرت‌نامبر انبارداری',
        iconName: 'Grid',
      },
      {
        id: 'inventory',
        path: '/admin/catalog/inventory',
        groupId: 'catalog',
        titleFa: 'موجودی انبار، رزروها و انبارگردانی',
        titleEn: 'Inventory',
        shortTitleFa: 'انبار و کسری',
        descriptionFa: 'تنظیم دستی موجودی با رعایت گارد ناوردایی نامنفی و هشدارهای شارژ مجدد',
        iconName: 'Box',
        badgeKey: 'lowStock',
        allowedRoles: ['super_admin', 'production_operator'],
      },
      {
        id: 'categories',
        path: '/admin/catalog/categories',
        groupId: 'catalog',
        titleFa: 'دسته‌بندی‌ها و شاخه‌ها',
        titleEn: 'Categories',
        shortTitleFa: 'دسته‌بندی‌ها',
        descriptionFa: 'مدیریت تگ‌های کالیگرافی، مینیمال، تایپوگرافی معاصر و معماری کاتالوگ',
        iconName: 'FolderTree',
      },
      {
        id: 'collections',
        path: '/admin/catalog/collections',
        groupId: 'catalog',
        titleFa: 'کلکسیون‌ها و دراپ‌های فصلی',
        titleEn: 'Collections',
        shortTitleFa: 'کلکسیون‌ها',
        descriptionFa: 'کلکسیون اختصاصی شاه‌نشین، دراپ پاییزه دماوند و مجموعه‌های لیمیتد ادیشن',
        iconName: 'Sparkles',
      },
      {
        id: 'media',
        path: '/admin/catalog/media',
        groupId: 'catalog',
        titleFa: 'کتابخانه رسانه‌ها و تصاویر استودیو',
        titleEn: 'Media Library',
        shortTitleFa: 'رسانه‌ها',
        descriptionFa: 'مدیریت شات‌های استودیویی، تصاویر بافت پارچه، موکاپ‌ها و متادیتاهای سئو',
        iconName: 'Image',
      },
      {
        id: 'stock-movements',
        path: '/admin/catalog/stock-movements',
        groupId: 'catalog',
        titleFa: 'دفتر روزنامه گردش انبار و رخدادها',
        titleEn: 'Stock Movements',
        shortTitleFa: 'گردش انبار',
        descriptionFa: 'ثبت و حسابرسی تمامی ورودی‌ها، حواله‌های سفارش، ضایعات و انبارگردانی',
        iconName: 'History',
        allowedRoles: ['super_admin', 'production_operator'],
      },
      {
        id: 'suppliers',
        path: '/admin/catalog/suppliers',
        groupId: 'catalog',
        titleFa: 'تامین‌کنندگان پارچه و مواد مصرفی چاپ',
        titleEn: 'Suppliers',
        shortTitleFa: 'تامین‌کنندگان',
        descriptionFa: 'کارخانجات بافندگی پنبه اصفهان، واردکنندگان جوهر برادر (Brother) و کاغذ ترانسفر',
        iconName: 'Factory',
        allowedRoles: ['super_admin', 'production_operator'],
      },
      {
        id: 'purchase-orders',
        path: '/admin/catalog/purchase-orders',
        groupId: 'catalog',
        titleFa: 'سفارش‌های خرید و رسید انبار (PO)',
        titleEn: 'Purchase Orders',
        shortTitleFa: 'سفارش‌های خرید',
        descriptionFa: 'مدیریت پیش‌نویس، تایید خرید، صدور رسید انبار و انطباق با کسری مواد',
        iconName: 'Receipt',
        allowedRoles: ['super_admin', 'production_operator', 'support_finance'],
      },
    ],
  },
  {
    id: 'custom_studio',
    titleFa: 'آتلیه چاپ سفارشی (POD)',
    titleEn: 'Custom Studio',
    iconName: 'Palette',
    routes: [
      {
        id: 'submissions',
        path: '/admin/custom-studio/submissions',
        groupId: 'custom_studio',
        titleFa: 'درخواست‌های دریافتی از طراح آنلاین',
        titleEn: 'Submissions',
        shortTitleFa: 'درخواست‌های جدید',
        descriptionFa: 'طرح‌های بارگذاری شده توسط خریداران، کالیگرافی‌های اختصاصی و فایل‌های خام',
        iconName: 'UploadCloud',
        badgeKey: 'pendingDesigns',
      },
      {
        id: 'approval',
        path: '/admin/custom-studio/approval',
        groupId: 'custom_studio',
        titleFa: 'داوری فنی آتلیه و اعتبارسنجی رزولوشن',
        titleEn: 'Approval',
        shortTitleFa: 'داوری و تایید طرح',
        descriptionFa: 'بررسی DPI، ترانسپارنسی، حاشیه برش و ارسال طرح به صف پرینتر مستقیم صنعتی',
        iconName: 'FileCheck',
        allowedRoles: ['super_admin', 'designer_reviewer'],
        badgeKey: 'pendingDesigns',
      },
      {
        id: 'artwork',
        path: '/admin/custom-studio/artwork',
        groupId: 'custom_studio',
        titleFa: 'آرشیو فایل‌های برداری و موکاپ‌ها',
        titleEn: 'Artwork',
        shortTitleFa: 'آرشیو آرت‌ورک',
        descriptionFa: 'کتابخانه تایپوگرافی‌های نستعلیق و شکسته، موکاپ‌های نوری و پالت‌های رنگی CMYK',
        iconName: 'Image',
      },
      {
        id: 'production',
        path: '/admin/custom-studio/production',
        groupId: 'custom_studio',
        titleFa: 'خط تولید و پرینترهای مستقیم نساجی (DTG)',
        titleEn: 'Production',
        shortTitleFa: 'خط چاپ DTG',
        descriptionFa: 'مانیتورینگ دستگاه Brother GTX، حرارت پرس کانوایر و آماده‌سازی زیرلایه سفید',
        iconName: 'Printer',
        allowedRoles: ['super_admin', 'production_operator'],
      },
      {
        id: 'qc',
        path: '/admin/custom-studio/qc',
        groupId: 'custom_studio',
        titleFa: 'آزمون کنترل کیفیت نهایی و ثبات شستشو',
        titleEn: 'QC',
        shortTitleFa: 'کنترل کیفیت (QC)',
        descriptionFa: 'تست کشش چاپ، دوخت یقه‌گیر، بسته‌بندی لوکس جعبه مشکی و الصاق شناسنامه اصالت',
        iconName: 'ShieldCheck',
        allowedRoles: ['super_admin', 'production_operator'],
      },
      {
        id: 'printing-rules',
        path: '/admin/custom-studio/printing-rules',
        groupId: 'custom_studio',
        titleFa: 'مقررات و استانداردهای فنی چاپخانه',
        titleEn: 'Printing Rules',
        shortTitleFa: 'مقررات فنی چاپ',
        descriptionFa: 'کادرهای مجاز، ترنسپارنسی، رزولوشن ۳۰۰ DPI و مشخصات دستگاه Brother GTX',
        iconName: 'Sliders',
      },
      {
        id: 'design-detail',
        path: '/admin/custom-studio/designs/:id',
        groupId: 'custom_studio',
        titleFa: 'شناسنامه و میز داوری فنی طرح',
        titleEn: 'Design Detail',
        shortTitleFa: 'داوری طرح',
        descriptionFa: 'موکاپ سه‌بعدی روی بافت لباس، کادربندی ایمن چاپ و تاریخچه نسخه‌های اصلاحی',
        iconName: 'Palette',
      },
      {
        id: 'job-detail',
        path: '/admin/custom-studio/jobs/:id',
        groupId: 'custom_studio',
        titleFa: 'شناسنامه و دستور کار خط تولید (Job Detail)',
        titleEn: 'Job Detail',
        shortTitleFa: 'دستور کار چاپ',
        descriptionFa: 'مشخصات فنی چاپ DTG، مواد مصرفی، چک‌لیست ۵ گانه QC و رخدادهای کارگاه',
        iconName: 'Printer',
      },
    ],
  },
  {
    id: 'customers',
    titleFa: 'مشتریان و وفاداری',
    titleEn: 'Customers',
    iconName: 'Users',
    routes: [
      {
        id: 'directory',
        path: '/admin/customers/directory',
        groupId: 'customers',
        titleFa: 'فهرست خریداران و باشگاه مشتریان',
        titleEn: 'Directory',
        shortTitleFa: 'فهرست مشتریان',
        descriptionFa: 'پایگاه مشتریان ثبت‌شده، رده‌های طلایی، نقره‌ای و میزان خریدهای تجمعی',
        iconName: 'Contact2',
      },
      {
        id: 'profiles',
        path: '/admin/customers/profiles',
        groupId: 'customers',
        titleFa: 'پرونده تفصیلی و تاریخچه سفارش‌های کاربر',
        titleEn: 'Profiles',
        shortTitleFa: 'پرونده مشتری',
        descriptionFa: 'تاریخچه سبدهای خرید، طرح‌های سفارشی ذخیره شده و نشانی‌های ارسال پستی',
        iconName: 'UserCheck',
      },
      {
        id: 'customer-detail',
        path: '/admin/customers/profiles/:id',
        groupId: 'customers',
        titleFa: 'شناسنامه و پرونده تفصیلی مشتری',
        titleEn: 'Customer Profile Detail',
        shortTitleFa: 'پرونده مشتری',
        descriptionFa: 'پایش سفارشات، مبالغ پرداختی تاییدشده منهای استردادها (LTV)، طرح‌های اختصاصی، تیکت‌ها و یادداشت‌های پرسنل',
        iconName: 'UserCheck',
      },
      {
        id: 'support',
        path: '/admin/customers/support',
        groupId: 'customers',
        titleFa: 'پشتیبانی، تیکت‌ها و مکاتبات کارگاه',
        titleEn: 'Support',
        shortTitleFa: 'پشتیبانی و تیکت',
        descriptionFa: 'استعلام زمان تحویل، هماهنگی اصلاح طرح‌های گرافیکی و پیگیری مرسولات پستی',
        iconName: 'Headphones',
        allowedRoles: ['super_admin', 'support_finance'],
      },
      {
        id: 'reviews',
        path: '/admin/customers/reviews',
        groupId: 'customers',
        titleFa: 'نظرات، امتیازها و تایید بازخوردها',
        titleEn: 'Reviews',
        shortTitleFa: 'نظرات و دیدگاه‌ها',
        descriptionFa: 'بررسی تصاویر تن‌خور ارسالی کاربران، تایید نظرات برای نمایش در ویترین فروشگاه',
        iconName: 'Star',
      },
    ],
  },
  {
    id: 'analytics',
    titleFa: 'آمار و تحلیل داده‌ها',
    titleEn: 'Analytics',
    iconName: 'BarChart3',
    routes: [
      {
        id: 'sales-analytics',
        path: '/admin/analytics/sales',
        groupId: 'analytics',
        titleFa: 'تحلیل مالی، درآمد و شاخص‌های اقتصادی فروش',
        titleEn: 'Sales & Financials',
        shortTitleFa: 'تحلیل مالی و فروش',
        descriptionFa: 'پایش تفکیکی فروش ناخالص، خالص، تخفیف‌ها، استردادها، بهای تمام‌شده و حاشیه سود',
        iconName: 'TrendingUp',
      },
      {
        id: 'traffic',
        path: '/admin/analytics/traffic',
        groupId: 'analytics',
        titleFa: 'ترافیک روزانه، کاربران یکتا و نشست‌ها',
        titleEn: 'Traffic',
        shortTitleFa: 'ترافیک و بازدید',
        descriptionFa: 'بررسی سلسله‌مراتب بازدیدها، نرخ پرش، میانگین زمان حضور و دستگاه‌های موبایل/دسکتاپ',
        iconName: 'Activity',
      },
      {
        id: 'geography',
        path: '/admin/analytics/geography',
        groupId: 'analytics',
        titleFa: 'توزیع استانی و جغرافیایی سفارش‌ها',
        titleEn: 'Geography',
        shortTitleFa: 'توزیع جغرافیایی',
        descriptionFa: 'تفکیک فروش بر اساس استان‌های تهران، اصفهان، خراسان، فارس، تبریز و شهرهای دیگر',
        iconName: 'MapPin',
      },
      {
        id: 'acquisition',
        path: '/admin/analytics/acquisition',
        groupId: 'analytics',
        titleFa: 'کانال‌های جذب مشتری و رفرال‌ها',
        titleEn: 'Acquisition',
        shortTitleFa: 'کانال‌های جذب',
        descriptionFa: 'آمار ورودی از اینستاگرام شاه‌پوش، جستجوی ارگانیک گوگل، ارجاع مستقیم و کمپین‌ها',
        iconName: 'Share2',
      },
      {
        id: 'conversion',
        path: '/admin/analytics/conversion',
        groupId: 'analytics',
        titleFa: 'قیف نرخ تبدیل (Funnel Conversion)',
        titleEn: 'Conversion',
        shortTitleFa: 'قیف تبدیل',
        descriptionFa: 'رهگیری مسیر کاربر از بازدید صفحه، ورود به طراح سفارشی، افزودن به سبد تا تسویه',
        iconName: 'Filter',
      },
      {
        id: 'campaigns',
        path: '/admin/analytics/campaigns',
        groupId: 'analytics',
        titleFa: 'کمپین‌های فصلی و کدهای تخفیف',
        titleEn: 'Campaigns',
        shortTitleFa: 'کمپین‌های تخفیف',
        descriptionFa: 'نرخ استفاده از کدهای تخفیف جشن‌های پاییزه و بازدهی فروش فلاش‌سیل (Flash Sale)',
        iconName: 'Sparkles',
      },
    ],
  },
  {
    id: 'marketing',
    titleFa: 'مارکتینگ و تبلیغات',
    titleEn: 'Marketing',
    iconName: 'Sparkles',
    routes: [
      {
        id: 'discounts',
        path: '/admin/marketing/discounts',
        groupId: 'marketing',
        titleFa: 'کدهای تخفیف و پروموشن‌های هوشمند',
        titleEn: 'Discounts',
        shortTitleFa: 'کدهای تخفیف',
        descriptionFa: 'تعریف کوپن‌ها، تخفیف‌های خودکار، سقف استفاده، اعتبارسنجی تداخل و ماشین‌حساب زنده',
        iconName: 'Tag',
      },
      {
        id: 'marketing-campaigns',
        path: '/admin/marketing/campaigns',
        groupId: 'marketing',
        titleFa: 'کمپین‌های بازاریابی و پارامترهای UTM',
        titleEn: 'Campaigns',
        shortTitleFa: 'کمپین‌ها و UTM',
        descriptionFa: 'ردیابی تبلیغات اینستاگرام، گوگل و تلگرام با سازنده لینک UTM و محاسبه ROAS شفاف',
        iconName: 'Share2',
      },
      {
        id: 'funnels',
        path: '/admin/marketing/funnels',
        groupId: 'marketing',
        titleFa: 'قیف نرخ تبدیل ۶ مرحله‌ای و رفتار خریدار',
        titleEn: 'Funnels',
        shortTitleFa: 'قیف تبدیل',
        descriptionFa: 'مسیر کاربر از ویترین تا استودیو DTG، آرت‌ورک، سبد، تسویه و پرداخت قطعی شاپرک',
        iconName: 'Filter',
      },
    ],
  },
  {
    id: 'content',
    titleFa: 'مدیریت محتوا و ویترین (CMS)',
    titleEn: 'Storefront CMS',
    iconName: 'Layout',
    routes: [
      {
        id: 'homepage-cms',
        path: '/admin/content/homepage',
        groupId: 'content',
        titleFa: 'چیدمان صفحه اصلی و بنر هیرو',
        titleEn: 'Homepage CMS',
        shortTitleFa: 'چیدمان صفحه اول',
        descriptionFa: 'تنظیم نوار اعلان، اسلایدر هیرو، محصولات برگزیده کاتالوگ، استودیو و پیش‌نمایش زنده',
        iconName: 'Layout',
      },
      {
        id: 'banners',
        path: '/admin/content/banners',
        groupId: 'content',
        titleFa: 'بنرهای تبلیغاتی و جایگاه‌ها',
        titleEn: 'Banners',
        shortTitleFa: 'بنرهای تبلیغاتی',
        descriptionFa: 'مدیریت جایگاه‌های بنر، رنگ پس‌زمینه، متن‌های دوزبانه و وضعیت انتشار در فروشگاه',
        iconName: 'Image',
      },
      {
        id: 'pages',
        path: '/admin/content/pages',
        groupId: 'content',
        titleFa: 'صفحات استاتیک و محتوای متنی',
        titleEn: 'Custom Pages',
        shortTitleFa: 'صفحات سایت',
        descriptionFa: 'مدیریت صفحات درباره ما، راهنمای سایز و نگهداری چاپ با ویرایشگر بلاک و سئو',
        iconName: 'FileText',
      },
      {
        id: 'seo',
        path: '/admin/content/seo',
        groupId: 'content',
        titleFa: 'مدیریت سئو، متادیتا و اسکیما',
        titleEn: 'SEO & Schema',
        shortTitleFa: 'تنظیمات سئو',
        descriptionFa: 'پیکربندی تگ عنوان، توضیحات متا با پیش‌نمایش در گوگل و داده‌های ساختاریافته فکتورین',
        iconName: 'Globe',
      },
    ],
  },
  {
    id: 'team',
    titleFa: 'تیم و منابع انسانی کارگاه',
    titleEn: 'Team',
    iconName: 'Shield',
    routes: [
      {
        id: 'tasks',
        path: '/admin/team/tasks',
        groupId: 'team',
        titleFa: 'کارتابل وظایف و گردش‌کار پرسنل',
        titleEn: 'Tasks',
        shortTitleFa: 'کارتابل وظایف',
        descriptionFa: 'وظایف ارجاعی به اپراتورها، داوری طرح‌ها و پیگیری استردادهای مالی',
        iconName: 'CheckSquare',
        badgeKey: 'openTasks',
      },
      {
        id: 'reports',
        path: '/admin/team/reports',
        groupId: 'team',
        titleFa: 'گزارش راندمان کاری و شیفت‌های آتلیه',
        titleEn: 'Reports',
        shortTitleFa: 'گزارش راندمان',
        descriptionFa: 'تعداد طرح‌های تاییدشده به تفکیک همکار، سرعت پاسخگویی و خطای چاپ صفر',
        iconName: 'LineChart',
        allowedRoles: ['super_admin'],
      },
      {
        id: 'administrators',
        path: '/admin/team/administrators',
        groupId: 'team',
        titleFa: 'فهرست مدیران، طراحان و اپراتورها',
        titleEn: 'Administrators',
        shortTitleFa: 'فهرست همکاران',
        descriptionFa: 'مشخصات پرسنل، نقش‌های شبیه‌سازی شده، شماره تماس داخلی و آخرین زمان ورود',
        iconName: 'UserCog',
        allowedRoles: ['super_admin'],
      },
      {
        id: 'permissions',
        path: '/admin/team/permissions',
        groupId: 'team',
        titleFa: 'ماتریس سطوح دسترسی و اختیارات (RBAC Matrix)',
        titleEn: 'Permissions',
        shortTitleFa: 'ماتریس دسترسی',
        descriptionFa: 'تنظیمات نقش‌ها (مدیر ارشد، طراح آتلیه، اپراتور تولید، مالی) و شفاف‌سازی گاردها',
        iconName: 'Key',
        allowedRoles: ['super_admin'],
      },
      {
        id: 'audit',
        path: '/admin/team/audit',
        groupId: 'team',
        titleFa: 'دفتر لاگ و حسابرسی رویدادها (Audit Logs)',
        titleEn: 'Audit',
        shortTitleFa: 'دفتر حسابرسی و لاگ',
        descriptionFa: 'رویدادهای ثبت‌شده در کارگاه، تغییرات موجودی، تغییر وضعیت سفارش و استردادها',
        iconName: 'History',
        allowedRoles: ['super_admin'],
      },
    ],
  },
  {
    id: 'system',
    titleFa: 'تنظیمات و سیستم',
    titleEn: 'System',
    iconName: 'Sliders',
    routes: [
      {
        id: 'cms',
        path: '/admin/system/cms',
        groupId: 'system',
        titleFa: 'مدیریت محتوا، بنرها و متن‌های ویترین',
        titleEn: 'CMS',
        shortTitleFa: 'مدیریت محتوا (CMS)',
        descriptionFa: 'ویرایش بنر هدر، متون تیتر کالکشن‌ها، قوانین ارسال و راهنمای سایزبندی فروشگاه',
        iconName: 'FileText',
        allowedRoles: ['super_admin'],
      },
      {
        id: 'settings',
        path: '/admin/system/settings',
        groupId: 'system',
        titleFa: 'تنظیمات عمومی فروشگاه و کارگاه',
        titleEn: 'Settings',
        shortTitleFa: 'تنظیمات عمومی',
        descriptionFa: 'نام تجاری شاه‌پوش، هزینه ثابت پست پیشتاز، سقف سفارشات روزانه و زمان تحویل',
        iconName: 'Settings',
        allowedRoles: ['super_admin'],
      },
      {
        id: 'integrations',
        path: '/admin/system/integrations',
        groupId: 'system',
        titleFa: 'درگاه‌های بانکی، پیامک و وب‌سرویس‌ها',
        titleEn: 'Integrations',
        shortTitleFa: 'اتصالات و وب‌سرویس‌ها',
        descriptionFa: 'تنظیمات درگاه سامان/به‌پرداخت، وب‌سرویس پیامکی کاوه‌نگار و وب‌هوک چاپخانه',
        iconName: 'Cpu',
        allowedRoles: ['super_admin'],
      },
      {
        id: 'health',
        path: '/admin/system/health',
        groupId: 'system',
        titleFa: 'سلامت سرویس‌ها، کش و الگوهای عیب‌یابی',
        titleEn: 'Health & Diagnostics',
        shortTitleFa: 'سلامت سرویس‌ها',
        descriptionFa: 'وضعیت حافظه پنهان مرورگر، اتصالات پایگاه داده محلی و هشدارهای سرور',
        iconName: 'HeartPulse',
        allowedRoles: ['super_admin'],
      },
      {
        id: 'logs',
        path: '/admin/system/logs',
        groupId: 'system',
        titleFa: 'دفتر لاگ‌های فنی، سوئیچ‌ها و وب‌هوک‌ها',
        titleEn: 'System Logs',
        shortTitleFa: 'لاگ‌های سیستم',
        descriptionFa: 'پایش بلادرنگ رویدادهای فنی، سوئیچ‌های پرداخت، ارسال پیامک و وب‌هوک‌ها با حفاظت PII',
        iconName: 'FileText',
        allowedRoles: ['super_admin'],
      },
      {
        id: 'data-explorer',
        path: '/admin/system/data-explorer',
        groupId: 'system',
        titleFa: 'جستجوگر خام داده‌ها (Read-only Data Explorer)',
        titleEn: 'Read-only Data Explorer',
        shortTitleFa: 'جستجوگر خام داده',
        descriptionFa: 'مشاهده مستقیم آبجکت‌های شبیه‌سازی شده، کلیدهای حافظه محلی و استخراج JSON',
        iconName: 'Database',
        allowedRoles: ['super_admin'],
      },
      {
        id: 'security',
        path: '/admin/system/security',
        groupId: 'system',
        titleFa: 'امنیت پرسنل، MFA و نشست‌ها',
        titleEn: 'Staff Security & MFA',
        shortTitleFa: 'امنیت و نشست‌ها',
        descriptionFa: 'سیاست‌های حفاظت از حساب‌های همکاران، الزامات ورود دو مرحله‌ای، کنترل نشست و فیلترینگ IP',
        iconName: 'Shield',
        allowedRoles: ['super_admin'],
      },
      {
        id: 'style-gallery',
        path: '/admin/system/style-gallery',
        groupId: 'system',
        titleFa: 'آزمایشگاه و گالری کامپوننت‌های دیزاین سیستم',
        titleEn: 'UI Style Gallery',
        shortTitleFa: 'گالری کامپوننت‌ها',
        descriptionFa: 'بررسی بصری تمامی توکن‌ها، فونت، جداول، فیلدها و رفتارهای واکنشی پنل مدیریت',
        iconName: 'Palette',
        allowedRoles: ['super_admin'],
      },
      {
        id: 'notifications',
        path: '/admin/system/notifications',
        groupId: 'system',
        titleFa: 'قالب‌های پیامک و شبیه‌ساز اعلان‌ها',
        titleEn: 'Notifications',
        shortTitleFa: 'قالب‌های پیامک',
        descriptionFa: 'پیش‌نمایش پیامک‌های ثبت سفارش، تایید طرح، صدور بارنامه، استرداد و لاگ شبیه‌ساز دمو',
        iconName: 'Bell',
      },
    ],
  },
];

// Flat list of all routes for fast lookup
export const ALL_ADMIN_ROUTES: AdminRouteDef[] = ADMIN_GROUPS.flatMap((g) => g.routes);

export const DEFAULT_ADMIN_ROUTE = ALL_ADMIN_ROUTES[0]; // '/admin/overview/dashboard'

export function matchRoute(path: string): { route: AdminRouteDef; params: Record<string, string> } | undefined {
  const cleanPath = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/admin/overview/dashboard';

  // 1. Direct exact match
  const direct = ALL_ADMIN_ROUTES.find((r) => r.path === cleanPath);
  if (direct) return { route: direct, params: {} };

  // 2. Common root aliases
  if (cleanPath === '/orders') {
    const ordersRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'orders');
    if (ordersRoute) return { route: ordersRoute, params: {} };
  }
  if (cleanPath.startsWith('/orders/')) {
    const id = cleanPath.replace('/orders/', '');
    const detailRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'order-detail');
    if (detailRoute) return { route: detailRoute, params: { id } };
  }
  if (cleanPath === '/payments') {
    const pRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'payments');
    if (pRoute) return { route: pRoute, params: {} };
  }
  if (cleanPath.startsWith('/payments/')) {
    const id = cleanPath.replace('/payments/', '');
    const pDetailRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'payment-detail');
    if (pDetailRoute) return { route: pDetailRoute, params: { id } };
  }
  if (cleanPath === '/refunds' || cleanPath === '/admin/sales/refunds') {
    const rRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'refunds');
    if (rRoute) return { route: rRoute, params: {} };
  }

  // 3. Custom Studio Aliases
  if (cleanPath === '/admin/studio/designs' || cleanPath === '/designs') {
    const sRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'submissions');
    if (sRoute) return { route: sRoute, params: {} };
  }
  if (cleanPath.startsWith('/designs/')) {
    const id = cleanPath.replace('/designs/', '');
    const dRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'design-detail');
    if (dRoute) return { route: dRoute, params: { id } };
  }
  if (cleanPath.startsWith('/admin/studio/designs/')) {
    const id = cleanPath.replace('/admin/studio/designs/', '');
    const dRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'design-detail');
    if (dRoute) return { route: dRoute, params: { id } };
  }
  if (cleanPath === '/approval' || cleanPath === '/admin/studio/approval') {
    const aRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'approval');
    if (aRoute) return { route: aRoute, params: {} };
  }
  if (cleanPath === '/artwork' || cleanPath === '/admin/studio/artwork') {
    const artRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'artwork');
    if (artRoute) return { route: artRoute, params: {} };
  }
  if (cleanPath === '/printing-rules' || cleanPath === '/admin/studio/printing-rules') {
    const prRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'printing-rules');
    if (prRoute) return { route: prRoute, params: {} };
  }

  // 4. Lean Production, Jobs & QC Aliases (Prompt 13)
  if (cleanPath === '/admin/studio/production' || cleanPath === '/production') {
    const prodRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'production');
    if (prodRoute) return { route: prodRoute, params: {} };
  }
  if (cleanPath === '/quality-control' || cleanPath === '/admin/studio/quality-control' || cleanPath === '/qc') {
    const qcRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'qc');
    if (qcRoute) return { route: qcRoute, params: {} };
  }
  if (cleanPath === '/rework' || cleanPath === '/admin/studio/rework') {
    const prodRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'production');
    if (prodRoute) return { route: prodRoute, params: {} };
  }
  if (cleanPath.startsWith('/jobs/')) {
    const id = cleanPath.replace('/jobs/', '');
    const jRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'job-detail');
    if (jRoute) return { route: jRoute, params: { id } };
  }
  if (cleanPath.startsWith('/admin/studio/jobs/')) {
    const id = cleanPath.replace('/admin/studio/jobs/', '');
    const jRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'job-detail');
    if (jRoute) return { route: jRoute, params: { id } };
  }
  if (cleanPath.startsWith('/admin/custom-studio/jobs/')) {
    const id = cleanPath.replace('/admin/custom-studio/jobs/', '');
    const jRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'job-detail');
    if (jRoute) return { route: jRoute, params: { id } };
  }

  // 5. Customers & Profiles Aliases (Prompt 14)
  if (
    cleanPath === '/admin/customers' ||
    cleanPath === '/customers' ||
    cleanPath === '/admin/customers/segments'
  ) {
    const cRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'directory');
    if (cRoute) return { route: cRoute, params: {} };
  }
  if (cleanPath.startsWith('/customers/')) {
    const id = cleanPath.replace('/customers/', '');
    const cdRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'customer-detail');
    if (cdRoute) return { route: cdRoute, params: { id } };
  }
  if (cleanPath.startsWith('/admin/customers/profiles/')) {
    const id = cleanPath.replace('/admin/customers/profiles/', '');
    const cdRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'customer-detail');
    if (cdRoute) return { route: cdRoute, params: { id } };
  }
  if (
    cleanPath.startsWith('/admin/customers/') &&
    cleanPath !== '/admin/customers/directory' &&
    cleanPath !== '/admin/customers/profiles' &&
    cleanPath !== '/admin/customers/support' &&
    cleanPath !== '/admin/customers/reviews' &&
    cleanPath !== '/admin/customers/segments'
  ) {
    const id = cleanPath.replace('/admin/customers/', '');
    const cdRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'customer-detail');
    if (cdRoute) return { route: cdRoute, params: { id } };
  }

  // 6. Shipping, Returns, Support, Reviews & Notifications Aliases (Prompt 15)
  if (cleanPath.startsWith('/shipments/')) {
    const id = cleanPath.replace('/shipments/', '');
    const shpRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'shipment-detail');
    if (shpRoute) return { route: shpRoute, params: { id } };
  }
  if (cleanPath.startsWith('/shipping/')) {
    const id = cleanPath.replace('/shipping/', '');
    const shpRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'shipment-detail');
    if (shpRoute) return { route: shpRoute, params: { id } };
  }
  if (cleanPath.startsWith('/admin/sales/shipping/') && cleanPath !== '/admin/sales/shipping') {
    const id = cleanPath.replace('/admin/sales/shipping/', '');
    const shpRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'shipment-detail');
    if (shpRoute) return { route: shpRoute, params: { id } };
  }
  if (cleanPath === '/returns' || cleanPath === '/admin/returns') {
    const retRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'returns');
    if (retRoute) return { route: retRoute, params: {} };
  }
  if (
    cleanPath === '/support' ||
    cleanPath === '/support/tickets' ||
    cleanPath === '/admin/support' ||
    cleanPath === '/admin/support/tickets'
  ) {
    const supRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'support');
    if (supRoute) return { route: supRoute, params: {} };
  }
  if (cleanPath === '/reviews' || cleanPath === '/admin/reviews') {
    const revRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'reviews');
    if (revRoute) return { route: revRoute, params: {} };
  }
  if (cleanPath === '/notifications' || cleanPath === '/admin/notifications') {
    const notifRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'notifications');
    if (notifRoute) return { route: notifRoute, params: {} };
  }

  // 7. Marketing & CMS Aliases (Prompt 16)
  if (
    cleanPath === '/discounts' ||
    cleanPath === '/admin/discounts' ||
    cleanPath === '/admin/marketing/discounts'
  ) {
    const dRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'discounts');
    if (dRoute) return { route: dRoute, params: {} };
  }
  if (
    cleanPath === '/campaigns' ||
    cleanPath === '/admin/campaigns' ||
    cleanPath === '/admin/marketing/campaigns' ||
    cleanPath === '/admin/analytics/campaigns'
  ) {
    const cRoute =
      ALL_ADMIN_ROUTES.find((r) => r.id === 'marketing-campaigns') ||
      ALL_ADMIN_ROUTES.find((r) => r.id === 'campaigns');
    if (cRoute) return { route: cRoute, params: {} };
  }
  if (
    cleanPath === '/funnels' ||
    cleanPath === '/admin/funnels' ||
    cleanPath === '/admin/marketing/funnels' ||
    cleanPath === '/admin/analytics/conversion'
  ) {
    const fRoute =
      ALL_ADMIN_ROUTES.find((r) => r.id === 'funnels') ||
      ALL_ADMIN_ROUTES.find((r) => r.id === 'conversion');
    if (fRoute) return { route: fRoute, params: {} };
  }
  if (
    cleanPath === '/content/homepage' ||
    cleanPath === '/admin/content/homepage' ||
    cleanPath === '/homepage' ||
    cleanPath === '/admin/homepage'
  ) {
    const hpRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'homepage-cms');
    if (hpRoute) return { route: hpRoute, params: {} };
  }
  if (
    cleanPath === '/banners' ||
    cleanPath === '/admin/banners' ||
    cleanPath === '/admin/content/banners'
  ) {
    const bRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'banners');
    if (bRoute) return { route: bRoute, params: {} };
  }
  if (
    cleanPath === '/pages' ||
    cleanPath === '/admin/pages' ||
    cleanPath === '/admin/content/pages'
  ) {
    const pRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'pages');
    if (pRoute) return { route: pRoute, params: {} };
  }
  if (
    cleanPath === '/media' ||
    cleanPath === '/admin/media' ||
    cleanPath === '/admin/catalog/media'
  ) {
    const mRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'media');
    if (mRoute) return { route: mRoute, params: {} };
  }
  if (
    cleanPath === '/seo' ||
    cleanPath === '/admin/seo' ||
    cleanPath === '/admin/marketing/seo' ||
    cleanPath === '/admin/content/seo'
  ) {
    const sRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'seo');
    if (sRoute) return { route: sRoute, params: {} };
  }

  // 8. System, Health, Logs, Data, Settings, Integrations & Security Aliases (Prompt 18)
  if (
    cleanPath === '/health' ||
    cleanPath === '/admin/health' ||
    cleanPath === '/admin/system/health'
  ) {
    const hRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'health');
    if (hRoute) return { route: hRoute, params: {} };
  }
  if (
    cleanPath === '/logs' ||
    cleanPath === '/admin/logs' ||
    cleanPath === '/admin/system/logs'
  ) {
    const lRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'logs');
    if (lRoute) return { route: lRoute, params: {} };
  }
  if (
    cleanPath === '/data' ||
    cleanPath === '/admin/data' ||
    cleanPath === '/admin/system/data' ||
    cleanPath === '/admin/system/data-explorer'
  ) {
    const dRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'data-explorer');
    if (dRoute) return { route: dRoute, params: {} };
  }
  if (
    cleanPath === '/settings' ||
    cleanPath === '/admin/settings' ||
    cleanPath === '/admin/system/settings'
  ) {
    const sRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'settings');
    if (sRoute) return { route: sRoute, params: {} };
  }
  if (
    cleanPath === '/integrations' ||
    cleanPath === '/admin/integrations' ||
    cleanPath === '/admin/system/integrations'
  ) {
    const iRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'integrations');
    if (iRoute) return { route: iRoute, params: {} };
  }
  if (
    cleanPath === '/security' ||
    cleanPath === '/admin/security' ||
    cleanPath === '/admin/system/security'
  ) {
    const secRoute = ALL_ADMIN_ROUTES.find((r) => r.id === 'security');
    if (secRoute) return { route: secRoute, params: {} };
  }

  // 4. Dynamic segments e.g. /admin/sales/orders/:id
  for (const route of ALL_ADMIN_ROUTES) {
    if (!route.path.includes(':')) continue;
    const routeParts = route.path.split('/');
    const pathParts = cleanPath.split('/');
    if (routeParts.length !== pathParts.length) continue;

    let matched = true;
    const params: Record<string, string> = {};
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = pathParts[i];
      } else if (routeParts[i] !== pathParts[i]) {
        matched = false;
        break;
      }
    }
    if (matched) {
      return { route, params };
    }
  }

  return undefined;
}

export function findRouteByPath(path: string): AdminRouteDef | undefined {
  return matchRoute(path)?.route;
}
