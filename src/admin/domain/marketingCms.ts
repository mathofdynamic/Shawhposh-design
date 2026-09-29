/**
 * Shahpoosh Luxury Streetwear - Marketing, Discounts, Storefront CMS & SEO
 * Prompt 16: Marketing Campaigns, Coupons, Funnels, Storefront CMS Slots, Pages, Banners & SEO
 */

import {
  DiscountRule,
  MarketingCampaign,
  HomepageLayoutConfig,
  StoreBanner,
  CmsCustomPage,
  SeoMetadataRecord,
  FunnelAnalysis,
} from './types';

export const DEFAULT_DISCOUNTS: DiscountRule[] = [
  {
    id: 'DSC-101',
    title: 'جشنواره افتتاحیه دراپ پاییزه شاه‌نشین',
    code: 'SHAHPOSH-FALL',
    applyType: 'code',
    discountType: 'percentage',
    discountValue: 15,
    maxDiscountCapTomans: 300000,
    minOrderAmountTomans: 800000,
    eligibleProductIds: [],
    eligibleCategoryIds: [],
    eligibleSkus: [],
    perCustomerLimit: 1,
    globalUsageLimit: 500,
    usedCount: 84,
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2026-10-15T23:59:59.000Z',
    status: 'active',
    stackingPolicy: 'standalone',
    isFirstOrderOnly: false,
    notes: 'تخفیف ویژه آغاز فصل، غیرقابل جمع با سایر کدهای تخفیف.',
    createdAt: '2026-09-01T10:00:00.000Z',
  },
  {
    id: 'DSC-102',
    title: 'تخفیف خوش‌آمدگویی سفارش اول طراح آنلاین',
    code: 'MYFIRST-POD',
    applyType: 'code',
    discountType: 'percentage',
    discountValue: 10,
    maxDiscountCapTomans: 200000,
    minOrderAmountTomans: 500000,
    eligibleProductIds: [],
    eligibleCategoryIds: [],
    eligibleSkus: [],
    perCustomerLimit: 1,
    globalUsageLimit: 1000,
    usedCount: 165,
    startDate: '2026-08-01T00:00:00.000Z',
    endDate: '2026-12-30T23:59:59.000Z',
    status: 'active',
    stackingPolicy: 'standalone',
    isFirstOrderOnly: true,
    notes: 'صرفاً برای خریدارانی که سابقه سفارش قبلی در سامانه ندارند.',
    createdAt: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'DSC-103',
    title: 'کمپین تخفیف هودی‌های گرم زمستانه',
    code: 'WINTER-WARM',
    applyType: 'code',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscountCapTomans: 400000,
    minOrderAmountTomans: 1000000,
    eligibleProductIds: ['sp-103', 'sp-107'],
    eligibleCategoryIds: [],
    eligibleSkus: [],
    perCustomerLimit: 2,
    globalUsageLimit: 300,
    usedCount: 0,
    startDate: '2026-11-01T00:00:00.000Z',
    endDate: '2026-12-30T23:59:59.000Z',
    status: 'scheduled',
    stackingPolicy: 'standalone',
    isFirstOrderOnly: false,
    notes: 'اختصاصی برای مدل‌های هودی لش ۳۸۰ گرم پنبه خارخورده.',
    createdAt: '2026-09-15T14:00:00.000Z',
  },
  {
    id: 'DSC-104',
    title: 'کد هدیه باشگاه مشتریان طلایی (VIP)',
    code: 'VIP-GOLD',
    applyType: 'code',
    discountType: 'fixed_amount',
    discountValue: 150000,
    minOrderAmountTomans: 1200000,
    eligibleProductIds: [],
    eligibleCategoryIds: [],
    eligibleSkus: [],
    perCustomerLimit: 2,
    globalUsageLimit: 200,
    usedCount: 38,
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2026-10-30T23:59:59.000Z',
    status: 'active',
    stackingPolicy: 'stackable_with_promotions',
    isFirstOrderOnly: false,
    notes: 'تخفیف نقدی ثابت برای مشتریان با ارزش خرید تجمعی بالا.',
    createdAt: '2026-09-01T12:00:00.000Z',
  },
  {
    id: 'DSC-105',
    title: 'تخفیف خودکار ارسال رایگان سبدهای لوکس',
    applyType: 'automatic',
    discountType: 'fixed_amount',
    discountValue: 85000,
    minOrderAmountTomans: 1500000,
    eligibleProductIds: [],
    eligibleCategoryIds: [],
    eligibleSkus: [],
    perCustomerLimit: 0,
    globalUsageLimit: 0,
    usedCount: 312,
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2026-12-31T23:59:59.000Z',
    status: 'active',
    stackingPolicy: 'stackable_with_promotions',
    isFirstOrderOnly: false,
    notes: 'اعمال خودکار کسر هزینه حمل در فاکتورهای بالای ۱,۵۰۰,۰۰۰ تومان.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const DEFAULT_MARKETING_CAMPAIGNS: MarketingCampaign[] = [
  {
    id: 'CMP-01',
    name: 'کمپین اینستاگرام - لانچ کلکسیون شاه‌نشین',
    utmSource: 'instagram',
    utmMedium: 'influencer_story',
    utmCampaign: 'shahneshin_fall',
    utmContent: 'black_box_unboxing',
    utmTerm: 'streetwear_tehran',
    startDate: '2026-09-01T00:00:00.000Z',
    endDate: '2026-09-30T23:59:59.000Z',
    status: 'active',
    adSpendCostTomans: 18500000,
    hasInstrumentedCost: true,
    targetUrl: 'https://shahpoosh.ir/collections/shahneshin?utm_source=instagram&utm_medium=influencer_story&utm_campaign=shahneshin_fall',
    linkedDiscountCode: 'SHAHPOSH-FALL',
    trackedVisits: 5420,
    trackedOrders: 168,
    attributedRevenueTomans: 142800000,
    notes: 'همکاری با اینفلوئنسرهای مد و استایل خیابانی تهران.',
    createdAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'CMP-02',
    name: 'تبلیغات جستجوی گوگل - خرید تیشرت کالیگرافی',
    utmSource: 'google',
    utmMedium: 'cpc',
    utmCampaign: 'calligraphy_apparel',
    utmContent: 'text_ad_top',
    utmTerm: 'تیشرت نستعلیق',
    startDate: '2026-09-05T00:00:00.000Z',
    endDate: '2026-10-05T23:59:59.000Z',
    status: 'active',
    adSpendCostTomans: 9200000,
    hasInstrumentedCost: true,
    targetUrl: 'https://shahpoosh.ir/catalog?category=calligraphy&utm_source=google&utm_medium=cpc&utm_campaign=calligraphy_apparel',
    trackedVisits: 3180,
    trackedOrders: 89,
    attributedRevenueTomans: 74600000,
    notes: 'کمپین کلمات کلیدی پرجستجوی هنر کالیگرافی و تیشرت ایرانی.',
    createdAt: '2026-09-05T09:30:00.000Z',
  },
  {
    id: 'CMP-03',
    name: 'کانال تلگرام استریت‌ویر - دراپ هودی لش',
    utmSource: 'telegram',
    utmMedium: 'post_broadcast',
    utmCampaign: 'hoodie_oversize_drop',
    startDate: '2026-09-12T00:00:00.000Z',
    endDate: '2026-09-26T23:59:59.000Z',
    status: 'completed',
    adSpendCostTomans: undefined,
    hasInstrumentedCost: false,
    targetUrl: 'https://shahpoosh.ir/products/sp-103?utm_source=telegram&utm_medium=post_broadcast&utm_campaign=hoodie_oversize_drop',
    trackedVisits: 1840,
    trackedOrders: 51,
    attributedRevenueTomans: 48900000,
    notes: 'پست پین‌شده در کانال‌های پوشاک استریت‌ویر بدون اعلام هزینه مستقیم.',
    createdAt: '2026-09-12T11:00:00.000Z',
  },
];

export const DEFAULT_HOMEPAGE_CONFIG: HomepageLayoutConfig = {
  announcementBar: {
    enabled: true,
    textFa: 'ارسال رایگان سفارش‌های بالای ۱.۵ میلیون تومان با پست پیشتاز به تمام شهرهای ایران',
    textEn: 'Free Express Shipping Nationwide on Orders Over 1,500,000 Tomans',
    linkUrl: '/collections/shahneshin',
    bgColor: '#ba8d3d',
  },
  heroSlides: [
    {
      id: 'SLIDE-1',
      titleFa: 'شاه‌پوش · جامهٔ اصیل ایرانی با امضای شما',
      titleEn: 'Shahpoosh · Persian Heritage Streetwear',
      subtitleFa: 'طراحی آنلاین روی سوپرپنبه ۲۴۰ گرم، چاپ مستقیم ماندگار Brother GTX، بسته‌بندی در جعبه‌های هاردباکس مشکی.',
      subtitleEn: 'Custom online apparel, direct-to-garment Brother GTX printing, luxury black box packaging.',
      ctaTextFa: 'ورود به آتلیه طراحی اختصاصی (POD)',
      ctaLink: '/custom-studio',
      secondaryCtaTextFa: 'مشاهده کلکسیون شاه‌نشین',
      secondaryCtaLink: '/collections/shahneshin',
      imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&q=80',
      badgeFa: 'کلکسیون جدید ۱۴۰۵',
      displayOrder: 1,
      isActive: true,
    },
    {
      id: 'SLIDE-2',
      titleFa: 'دراپ اختصاصی پاییزه دماوند',
      titleEn: 'Damavand Autumn Drop',
      subtitleFa: 'هودی‌های لش ۳۸۰ گرم با بافت پارچه پنبه سه نخ خارخورده و تایپوگرافی معاصر فارسی.',
      subtitleEn: 'Heavyweight 380gsm fleece hoodies with contemporary Persian calligraphy.',
      ctaTextFa: 'خرید مستقیم از کاتالوگ',
      ctaLink: '/catalog',
      imageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=1200&q=80',
      badgeFa: 'لیمیتد ادیشن',
      displayOrder: 2,
      isActive: true,
    },
  ],
  featuredProductIds: ['sp-101', 'sp-102', 'sp-103', 'sp-104'],
  featuredCollectionIds: ['col-1', 'col-2'],
  studioTeaserBlock: {
    enabled: true,
    titleFa: 'آتلیه چاپ مستقیم نساجی (DTG Studio)',
    descriptionFa: 'طرح، کالیگرافی، موکاپ یا تصویر دلخواه خود را بارگذاری کنید. فناوری Brother GTXPro چاپ را با بافت پارچه پیوند می‌دهد.',
    ctaTextFa: 'شروع طراحی سه‌بعدی آنلاین',
    ctaLink: '/custom-studio',
    previewMockupUrl: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80',
  },
  storySection: {
    enabled: true,
    titleFa: 'فلسفه طراحی و کیفیت کارگاه شاه‌پوش',
    bodyFa: 'شاه‌پوش پیوند میان هنر فاخر خط و تایپوگرافی کهن ایرانی با الگوهای مدرن استریت‌ویر جهان است. تمامی پوشاک از پارچه‌های ۱۰۰٪ پنبه شانه شده تولید شده و با استانداردهای سختگیرانه کنترل کیفیت روانه بازار می‌شوند.',
    craftFeatures: [
      {
        id: 'CR-1',
        titleFa: 'پارچه سوپرپنبه ۲۴۰ گرم',
        descFa: 'بافت سنگین و بدون آبرفت، با تکمیل نرم و دوخت تقویت‌شده سرشانه.',
        iconName: 'Sparkles',
      },
      {
        id: 'CR-2',
        titleFa: 'چاپ جوهر پایه آب Brother GTX',
        descFa: 'نفوذ جوهر بدون حس پلاستیکی روی بافت پارچه، با ماندگاری شستشوی بالای ۵۰ بار.',
        iconName: 'Printer',
      },
      {
        id: 'CR-3',
        titleFa: 'جعبه هاردباکس لوکس مشکی',
        descFa: 'بسته‌بندی در کاغذ پوستی زرکوب، همراه با شناسنامه اصالت و روبان تشریفات.',
        iconName: 'Package',
      },
    ],
  },
  status: 'published',
  updatedAt: '2026-09-24T12:00:00.000Z',
  revisionHistory: [
    {
      id: 'REV-01',
      timestamp: '2026-09-24T12:00:00.000Z',
      actorName: 'سهراب اخوان (مدیر محتوا)',
      changeSummary: 'تنظیم بنر اعلان بالای سایت و فعال‌سازی دراپ پاییزه شاه‌نشین',
      status: 'published',
    },
    {
      id: 'REV-02',
      timestamp: '2026-09-18T16:30:00.000Z',
      actorName: 'کیان دارابی',
      changeSummary: 'به‌روزرسانی اسلاید هیرو و محصولات برگزیده صفحه اول',
      status: 'published',
    },
  ],
};

export const DEFAULT_STORE_BANNERS: StoreBanner[] = [
  {
    id: 'BAN-01',
    title: 'نوار اطلاعیه ارسال رایگان',
    slot: 'top_announcement',
    contentFa: 'ارسال رایگان سفارش‌های بالای ۱.۵ میلیون تومان با پست پیشتاز به تمام شهرهای ایران',
    contentEn: 'Free Express Shipping Nationwide on Orders Over 1,500,000 Tomans',
    linkUrl: '/collections/shahneshin',
    backgroundColorHex: '#ba8d3d',
    textColorHex: '#ffffff',
    status: 'published',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-24T12:00:00.000Z',
  },
  {
    id: 'BAN-02',
    title: 'بنر دعوت به آتلیه چاپ مستقیم',
    slot: 'middle_collection',
    contentFa: 'استودیو چاپ اختصاصی شاه‌پوش: لباس‌های خام بدون طرح را با هنر کالیگرافی خود تن‌پوش کنید.',
    imageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&q=80',
    linkUrl: '/custom-studio',
    status: 'published',
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-20T15:00:00.000Z',
  },
  {
    id: 'BAN-03',
    title: 'بنر عضویت در باشگاه وفاداری VIP',
    slot: 'footer_vip',
    contentFa: 'خریداران بالای ۵ میلیون تومان، عضویت طلایی شاه‌پوش و هدایای ویژه فصلی دریافت می‌کنند.',
    linkUrl: '/vip-club',
    backgroundColorHex: '#131211',
    textColorHex: '#eed29d',
    status: 'draft',
    createdAt: '2026-09-22T08:00:00.000Z',
    updatedAt: '2026-09-22T08:00:00.000Z',
  },
];

export const DEFAULT_CMS_PAGES: CmsCustomPage[] = [
  {
    id: 'about-us',
    slug: 'about-us',
    titleFa: 'داستان و بیانیه شاه‌پوش',
    titleEn: 'About Shahpoosh',
    summaryFa: 'معرفی بنیان‌گذاران، فلسفه پیوند کالیگرافی و پوشاک استریت‌ویر، و استاندارد کارگاه چاپ مستقیم.',
    status: 'published',
    seoTitle: 'داستان برند شاه‌پوش · استریت‌ویر اصیل ایرانی',
    seoDescription: 'روایت خلق برند شاه‌پوش، پیوند هنر کالیگرافی با البسه پنبه سنگین و تعهد به کیفیت پایدار.',
    canonicalUrl: 'https://shahpoosh.ir/pages/about-us',
    authorName: 'سهراب اخوان',
    createdAt: '2026-08-10T10:00:00.000Z',
    updatedAt: '2026-09-20T14:00:00.000Z',
    blocks: [
      {
        id: 'BLK-1',
        type: 'rich_text',
        contentJson: {
          heading: 'هنر تن‌پوش در کالبد کالیگرافی معاصر',
          body: 'شاه‌پوش از پاییز ۱۴۰۲ در کارگاهی در قلب تهران متولد شد؛ با این باور که خیابان‌های ایران شایسته دیدن خطوط نستعلیق و نقاشی‌خط روی باکیفیت‌ترین پارچه‌های پنبه سنگین هستند.',
        },
      },
      {
        id: 'BLK-2',
        type: 'features_grid',
        contentJson: {
          items: [
            { title: 'پنبه ارگانیک سوپر ۲۴۰ گرم', desc: 'بدون پرزدهی و افت کیفیت پس از شستشو' },
            { title: 'پرینترهای نساجی Brother GTX', desc: 'بالاترین وضوح ۱۲۰۰ DPI و تثبیت در دمای ۱۸۰ درجه' },
            { title: 'پشتیبانی و ضمانت تعویض ۷ روزه', desc: 'حق اطمینان کامل خریدار از تن‌پوش لباس' },
          ],
        },
      },
    ],
    revisionHistory: [
      {
        id: 'REV-1',
        timestamp: '2026-09-20T14:00:00.000Z',
        actorName: 'سهراب اخوان',
        summary: 'تکمیل متن بیانیه برند و افزودن ویژگی‌های فنی چاپ DTG',
      },
    ],
  },
  {
    id: 'size-guide',
    slug: 'size-guide',
    titleFa: 'راهنمای جامع سایزبندی و جدول تن‌پوش',
    titleEn: 'Size Guide',
    summaryFa: 'جدول دقیق ابعاد عرض سینه، قد لباس و سرشانه برای برش‌های اورسایز، کلاسیک و اسلیم فیت.',
    status: 'published',
    seoTitle: 'راهنمای سایز هودی و تیشرت اورسایز · شاه‌پوش',
    seoDescription: 'جدول سانتی‌متری ابعاد تیشرت اورسایز و هودی شاه‌پوش جهت انتخاب دقیق‌ترین اندازه قبل از خرید.',
    canonicalUrl: 'https://shahpoosh.ir/pages/size-guide',
    authorName: 'کیان دارابی',
    createdAt: '2026-08-15T12:00:00.000Z',
    updatedAt: '2026-09-22T10:00:00.000Z',
    blocks: [
      {
        id: 'BLK-SG-1',
        type: 'rich_text',
        contentJson: {
          heading: 'نحوه اندازه‌گیری دقیق تن‌پوش',
          body: 'یک تیشرت یا هودی که هم‌اکنون به خوبی اندازه شماست را روی سطح صاف پهن کنید و فاصله زیر بغل تا زیر بغل (عرض سینه) و بالاترین نقطه سرشانه تا پایین (قد لباس) را اندازه بگیرید.',
        },
      },
    ],
    revisionHistory: [
      {
        id: 'REV-SG-1',
        timestamp: '2026-09-22T10:00:00.000Z',
        actorName: 'کیان دارابی',
        summary: 'افزودن جدول سایزبندی سایز XXL برای دراپ جدید',
      },
    ],
  },
  {
    id: 'care-instructions',
    slug: 'care-instructions',
    titleFa: 'راهنمای شستشو و نگهداری چاپ مستقیم نساجی',
    titleEn: 'Garment Care Instructions',
    summaryFa: 'توصیه‌های فنی آتلیه برای حفظ حداکثر دوام رنگ و بافت پارچه پنبه سوپر پس از ده‌ها بار شستشو.',
    status: 'published',
    seoTitle: 'نحوه شستشوی تیشرت با چاپ DTG · شاه‌پوش',
    seoDescription: 'بهترین روش‌های شستشو، اتوکشی و نگهداری تیشرت و هودی چاپ مستقیم جهت پیشگیری از ترک‌خوردگی رنگ.',
    canonicalUrl: 'https://shahpoosh.ir/pages/care-instructions',
    authorName: 'کارشناس QC آتلیه',
    createdAt: '2026-08-20T11:00:00.000Z',
    updatedAt: '2026-09-23T09:00:00.000Z',
    blocks: [
      {
        id: 'BLK-CARE-1',
        type: 'rich_text',
        contentJson: {
          heading: 'اصول پنج‌گانه مراقبت از چاپ DTG',
          body: '۱. لباس را همواره پشت‌ورو بشویید.\n۲. دمای آب بیشتر از ۳۰ درجه سانتی‌گراد نباشد.\n۳. از خشک‌کن چرخشی استفاده نکنید و در سایه خشک فرمایید.\n۴. از پودرهای آنزیم‌دار یا سفیدکننده‌های کلره خودداری نمایید.\n۵. اتو را مستقیماً روی طرح نگذارید؛ از پشت لباس اتوکشی کنید.',
        },
      },
    ],
    revisionHistory: [
      {
        id: 'REV-CARE-1',
        timestamp: '2026-09-23T09:00:00.000Z',
        actorName: 'کارشناس QC',
        summary: 'ثبت پروتکل آزمون شستشوی ۵۰ باره آزمایشگاه نساجی',
      },
    ],
  },
];

export const DEFAULT_SEO_RECORDS: SeoMetadataRecord[] = [
  {
    id: 'SEO-HOME',
    pageType: 'home',
    urlPath: '/',
    slug: '',
    titleFa: 'شاه‌پوش · جامهٔ اصیل ایرانی و استریت‌ویر فاخر',
    titleEn: 'Shahpoosh | Luxury Persian Streetwear & Custom POD',
    metaDescriptionFa: 'طراحی آنلاین تیشرت و هودی اورسایز روی سوپرپنبه ۲۴۰ گرم، چاپ مستقیم ماندگار Brother GTX، بسته‌بندی لوکس هاردباکس با ضمانت تعویض ۷ روزه.',
    metaDescriptionEn: 'Contemporary Persian calligraphy streetwear, premium 240gsm cotton tees, custom DTG printing studio.',
    canonicalUrl: 'https://shahpoosh.ir/',
    ogImageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=1200&q=80',
    robotsDirective: 'index, follow',
    structuredDataJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'شاه‌پوش (Shahpoosh)',
      url: 'https://shahpoosh.ir',
      logo: 'https://shahpoosh.ir/logo.png',
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+98-21-88889999',
        contactType: 'customer service',
      },
    },
    updatedAt: '2026-09-24T12:00:00.000Z',
  },
  {
    id: 'SEO-CATALOG',
    pageType: 'catalog',
    urlPath: '/catalog',
    slug: 'catalog',
    titleFa: 'کاتالوگ محصولات، تیشرت اورسایز و هودی لش · شاه‌پوش',
    titleEn: 'Product Catalog | Shahpoosh Streetwear',
    metaDescriptionFa: 'خرید انواع تیشرت کالیگرافی، هودی ۳۸۰ گرم، کراپ پنبه‌ای و البسه آماده ارسال شاه‌پوش با ارسال اکسپرس به سراسر کشور.',
    canonicalUrl: 'https://shahpoosh.ir/catalog',
    robotsDirective: 'index, follow',
    structuredDataJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'صفحه اصلی', item: 'https://shahpoosh.ir/' },
        { '@type': 'ListItem', position: 2, name: 'کاتالوگ محصولات', item: 'https://shahpoosh.ir/catalog' },
      ],
    },
    updatedAt: '2026-09-22T10:00:00.000Z',
  },
  {
    id: 'SEO-STUDIO',
    pageType: 'studio',
    urlPath: '/custom-studio',
    slug: 'custom-studio',
    titleFa: 'استودیو طراحی آنلاین و چاپ اختصاصی تیشرت (POD) · شاه‌پوش',
    titleEn: 'Custom Design Studio | Direct-to-Garment Printing',
    metaDescriptionFa: 'طراحی سه‌بعدی آنلاین روی تیشرت پنبه سوپر، بارگذاری عکس دلخواه، خطاطی نستعلیق و ارسال مستقیم به پرینتر صنعتی Brother GTX.',
    canonicalUrl: 'https://shahpoosh.ir/custom-studio',
    robotsDirective: 'index, follow',
    structuredDataJsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'آتلیه چاپ سفارشی شاه‌پوش',
      description: 'سامانه طراحی آنلاین و تولید البسه سفارشی تک و تیراژ.',
    },
    updatedAt: '2026-09-20T16:00:00.000Z',
  },
];

/**
 * Live discount preview calculation with realistic guardrails
 */
export function calculateDiscountPreview(
  discount: DiscountRule,
  cartTotalTomans: number,
  itemProductIds: string[] = []
): {
  isEligible: boolean;
  ineligibleReason?: string;
  discountAmountTomans: number;
  finalTotalTomans: number;
} {
  const nowIso = new Date().toISOString();

  // Date validity check
  if (discount.startDate && nowIso < discount.startDate) {
    return {
      isEligible: false,
      ineligibleReason: 'این کمپین هنوز آغاز نشده است.',
      discountAmountTomans: 0,
      finalTotalTomans: cartTotalTomans,
    };
  }

  if (discount.endDate && nowIso > discount.endDate) {
    return {
      isEligible: false,
      ineligibleReason: 'مهلت استفاده از این کد تخفیف به پایان رسیده است.',
      discountAmountTomans: 0,
      finalTotalTomans: cartTotalTomans,
    };
  }

  // Minimum order check
  if (discount.minOrderAmountTomans > 0 && cartTotalTomans < discount.minOrderAmountTomans) {
    return {
      isEligible: false,
      ineligibleReason: `حداقل مبلغ سفارش برای اعمال این تخفیف ${discount.minOrderAmountTomans.toLocaleString('fa-IR')} تومان است.`,
      discountAmountTomans: 0,
      finalTotalTomans: cartTotalTomans,
    };
  }

  // Eligible products check
  if (discount.eligibleProductIds && discount.eligibleProductIds.length > 0) {
    const hasEligibleProduct = itemProductIds.some((id) => discount.eligibleProductIds.includes(id));
    if (!hasEligibleProduct && itemProductIds.length > 0) {
      return {
        isEligible: false,
        ineligibleReason: 'این کد تخفیف برای اقلام موجود در سبد خرید معتبر نیست.',
        discountAmountTomans: 0,
        finalTotalTomans: cartTotalTomans,
      };
    }
  }

  // Usage limit check
  if (discount.globalUsageLimit > 0 && discount.usedCount >= discount.globalUsageLimit) {
    return {
      isEligible: false,
      ineligibleReason: 'ظرفیت سقف استفاده از این کد تخفیف تکمیل شده است.',
      discountAmountTomans: 0,
      finalTotalTomans: cartTotalTomans,
    };
  }

  // Calculate discount value
  let deduction = 0;
  if (discount.discountType === 'percentage') {
    deduction = Math.round((cartTotalTomans * discount.discountValue) / 100);
    if (discount.maxDiscountCapTomans && discount.maxDiscountCapTomans > 0) {
      deduction = Math.min(deduction, discount.maxDiscountCapTomans);
    }
  } else {
    deduction = Math.min(discount.discountValue, cartTotalTomans);
  }

  const finalTotal = Math.max(0, cartTotalTomans - deduction);

  return {
    isEligible: true,
    discountAmountTomans: deduction,
    finalTotalTomans: finalTotal,
  };
}

/**
 * Validates discount configuration for conflicting rules
 */
export function validateDiscountConflicts(
  discount: Partial<DiscountRule>,
  existingDiscounts: DiscountRule[]
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (discount.code && discount.code.trim()) {
    const codeClean = discount.code.trim().toUpperCase();
    const duplicate = existingDiscounts.find(
      (d) => d.id !== discount.id && d.code?.toUpperCase() === codeClean
    );
    if (duplicate) {
      errors.push(`کد تخفیف «${codeClean}» تکراری است و قبلاً در کمپین ${duplicate.title} استفاده شده است.`);
    }
  }

  if (discount.startDate && discount.endDate && discount.startDate > discount.endDate) {
    errors.push('تاریخ پایان کمپین نمی‌تواند قبل از تاریخ شروع باشد.');
  }

  if (discount.discountType === 'percentage') {
    if (discount.discountValue && (discount.discountValue <= 0 || discount.discountValue > 100)) {
      errors.push('درصد تخفیف باید عددی بین ۱ الی ۱۰۰ باشد.');
    }
  } else if (discount.discountType === 'fixed_amount') {
    if (discount.discountValue && discount.discountValue <= 0) {
      errors.push('مبلغ تخفیف نقدی باید بزرگتر از صفر باشد.');
    }
    if (discount.minOrderAmountTomans && discount.discountValue && discount.discountValue > discount.minOrderAmountTomans) {
      warnings.push('مبلغ تخفیف از حداقل مبلغ فاکتور بیشتر است؛ این امر ممکن است منجر به فاکتور صفر شود.');
    }
  }

  if (discount.stackingPolicy === 'stackable_with_promotions') {
    warnings.push('این تخفیف قابلیت ترکیب با سایر پروموشن‌ها را دارد. سقف حاشیه سود کارگاه را در نظر داشته باشید.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
