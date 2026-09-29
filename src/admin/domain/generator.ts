/**
 * Shahpoosh Synthetic Fixture Generator
 * Deterministic PRNG with stable anchor demo clock: 2026-09-23T12:00:00.000Z
 */

import {
  AdminDatabaseState,
  Customer,
  AdminProduct,
  ProductVariant,
  CustomDesign,
  Order,
  OrderLineItem,
  PaymentAttempt,
  ProductionJob,
  Shipment,
  StaffMember,
  StaffTask,
  ActivityLog,
  DailyMetricSnapshot,
  TrafficChannelAttribution,
  OrderStatus,
  PaymentStatus,
  ProductionStage,
  CarrierName,
  AdminCategory,
  AdminCollection,
  MediaAsset,
  StockMovement,
  Supplier,
  PurchaseOrder,
  WorkshopMaterial,
  DesignRevisionSnapshot,
} from './types';
import { PRODUCTS } from '../../data';
import {
  DEFAULT_ARTWORK_ASSETS,
  DEFAULT_PRINT_RULE_ZONES,
  calculateReviewSla,
} from './customStudio';
import { DEFAULT_RETURN_REQUESTS } from './shippingReturnsNotifications';
import {
  DEFAULT_DISCOUNTS,
  DEFAULT_MARKETING_CAMPAIGNS,
  DEFAULT_HOMEPAGE_CONFIG,
  DEFAULT_STORE_BANNERS,
  DEFAULT_CMS_PAGES,
  DEFAULT_SEO_RECORDS,
} from './marketingCms';

export const SCHEMA_VERSION = 1;
export const DEMO_CLOCK_ISO = '2026-09-23T12:00:00.000Z'; // Anchor time: 2 Mehr 1405

// Linear Congruential Generator for reproducible pseudo-random data
class SeededRandom {
  private seed: number;

  constructor(initialSeed = 14050723) {
    this.seed = initialSeed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(items: readonly T[]): T {
    return items[this.range(0, items.length - 1)];
  }

  sample<T>(items: readonly T[], count: number): T[] {
    const copy = [...items];
    const result: T[] = [];
    for (let i = 0; i < count && copy.length > 0; i++) {
      const idx = this.range(0, copy.length - 1);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }
}

const IRANIAN_FIRST_NAMES = [
  'آرش', 'مریم', 'کامران', 'نیلوفر', 'سهراب', 'فرشته', 'امید', 'بهاره',
  'فرهاد', 'سارا', 'نیما', 'مهتاب', 'کیوان', 'شیدا', 'پدرام', 'غزاله',
  'سینا', 'الناز', 'پویا', 'رکسانا', 'بهرام', 'مینا', 'حمید', 'یاسمن',
  'کاوه', 'نگین', 'امیرعلی', 'پرستو', 'مانی', 'سوگند', 'آرمین', 'شیرین',
  'دانیال', 'مهسا', 'احسان', 'آیدا', 'روزبه', 'زهرا', 'افشین', 'تینا',
  'شهاب', 'رویا'
];

const IRANIAN_LAST_NAMES = [
  'کاظمی', 'صالحی', 'نادری', 'پروانه', 'زارع', 'نیک‌فر', 'سپهری', 'افشار',
  'شایان', 'رضوانی', 'منفرد', 'راد', 'یزدانی', 'مهرگان', 'مصدق', 'امینی',
  'هدایتی', 'فرهمند', 'آذری', 'طهماسبی', 'کیانی', 'باطنی', 'محمودی', 'روشن',
  'صادقی', 'خسروی', 'بهمنش', 'کریمی', 'سرمد', 'طاهری', 'غفاری', 'نیک‌پور',
  'سلطانی', 'فروتن', 'مقدم', 'کوشا', 'دانشور', 'معتمدی', 'اسفندیاری', 'زند'
];

const IRANIAN_CITIES: { city: string; province: string }[] = [
  { city: 'تهران', province: 'تهران' },
  { city: 'اصفهان', province: 'اصفهان' },
  { city: 'شیراز', province: 'فارس' },
  { city: 'مشهد', province: 'خراسان رضوی' },
  { city: 'تبریز', province: 'آذربایجان شرقی' },
  { city: 'رشت', province: 'گیلان' },
  { city: 'یزد', province: 'یزد' },
  { city: 'کرج', province: 'البرز' },
  { city: 'کرمانشاه', province: 'کرمانشاه' },
  { city: 'اهواز', province: 'خوزستان' },
  { city: 'قزوین', province: 'قزوین' },
  { city: 'همدان', province: 'همدان' },
];

const STREET_NAMES = [
  'خیابان ولیعصر، بالاتر از زعفرانیه',
  'بلوار میرداماد، میدان مادر',
  'سعادت‌آباد، میدان کاج، خیابان مروارید',
  'خیابان زند، کوچه انوری',
  'چهارباغ عباسی، بن‌بست شیخ بهایی',
  'بلوار وکیل‌آباد، نبش هاشمیه',
  'خیابان ولیعصر تبریز، فلکه تختی',
  'گلسار، خیابان توحید، کوچه اقاقیا',
  'میدان اطلسی شیراز، کوچه کاج',
  'شهرک غرب، بلوار فرحزادی',
  'خیابان پاسداران، نبش بوستان پنجم',
  'میدان ونک، خیابان ملاصدرا'
];

// RFC 5737 documentation fake IPs
function generateFakeIp(rng: SeededRandom): string {
  const subnet = rng.choice(['192.0.2', '198.51.100', '203.0.113']);
  const host = rng.range(2, 250);
  return `${subnet}.${host}`;
}

export function generateSyntheticDatabase(): AdminDatabaseState {
  const rng = new SeededRandom(14050723);
  const nowMs = new Date(DEMO_CLOCK_ISO).getTime();

  // Helper for generating deterministic past dates
  const daysAgoIso = (days: number, minuteOffset = 0): string => {
    return new Date(nowMs - days * 24 * 3600 * 1000 - minuteOffset * 60 * 1000).toISOString();
  };

  // 1. Staff Members (6 realistic workshop staff across 4 roles)
  const staff: StaffMember[] = [
    {
      id: 'STF-01',
      fullName: 'کیوان دادگر',
      role: 'super_admin',
      email: 'dadgar@shahpoosh.ir',
      phone: '09121110001',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      isOnline: true,
      activeTasksCount: 4,
    },
    {
      id: 'STF-02',
      fullName: 'سهراب زارع',
      role: 'designer_reviewer',
      email: 'zare@shahpoosh.ir',
      phone: '09121110002',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      isOnline: true,
      activeTasksCount: 6,
    },
    {
      id: 'STF-03',
      fullName: 'ستاره نیک‌فر',
      role: 'designer_reviewer',
      email: 'nikfar@shahpoosh.ir',
      phone: '09121110003',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      isOnline: false,
      activeTasksCount: 3,
    },
    {
      id: 'STF-04',
      fullName: 'وحید رضوانی',
      role: 'production_operator',
      email: 'rezvani@shahpoosh.ir',
      phone: '09121110004',
      isOnline: true,
      activeTasksCount: 8,
    },
    {
      id: 'STF-05',
      fullName: 'امید فرهمند',
      role: 'production_operator',
      email: 'farahmand@shahpoosh.ir',
      phone: '09121110005',
      isOnline: true,
      activeTasksCount: 5,
    },
    {
      id: 'STF-06',
      fullName: 'مریم باطنی',
      role: 'support_finance',
      email: 'bateni@shahpoosh.ir',
      phone: '09121110006',
      isOnline: true,
      activeTasksCount: 2,
    },
  ];

  // 2. Customers (42 realistic customers with phone, address, orders count)
  const customers: Customer[] = [];
  for (let i = 1; i <= 42; i++) {
    const fName = rng.choice(IRANIAN_FIRST_NAMES);
    const lName = rng.choice(IRANIAN_LAST_NAMES);
    const loc = rng.choice(IRANIAN_CITIES);
    const street = rng.choice(STREET_NAMES);
    const phoneSuffix = (1000000 + i * 142857) % 9000000 + 1000000;
    const phone = `0912${phoneSuffix.toString().slice(0, 7)}`;
    const tag: Customer['tag'] = i <= 5 ? 'vip' : i % 8 === 0 ? 'wholesale' : i > 35 ? 'new' : 'regular';
    const regDaysAgo = rng.range(15, 120);

    customers.push({
      id: `CUST-${1000 + i}`,
      fullName: `${fName} ${lName}`,
      phone,
      email: `client${1000 + i}@gmail.com`,
      city: loc.city,
      province: loc.province,
      address: `${loc.city}، ${street}، پلاک ${rng.range(2, 140)}`,
      postalCode: `19${rng.range(10000000, 99999999)}`.slice(0, 10),
      totalOrdersCount: 0, // calculated from orders later
      totalSpentTomans: 0, // calculated from orders later
      tag,
      status: i === 41 ? 'deactivated' : i > 37 ? 'inactive' : 'active',
      marketingConsent: i % 3 !== 0,
      createdAt: daysAgoIso(regDaysAgo, rng.range(10, 500)),
      lastActiveAt: daysAgoIso(rng.range(0, 14), rng.range(5, 700)),
      notes: tag === 'vip' ? 'مشتری طلایی با اولویت ویژه در تحویل اکسپرس' : undefined,
      addresses: [
        {
          id: `ADDR-${1000 + i}-1`,
          title: 'نشانی اصلی (منزل)',
          recipientName: `${fName} ${lName}`,
          phone,
          province: loc.province,
          city: loc.city,
          fullAddress: `${loc.city}، ${street}، پلاک ${rng.range(2, 140)}، واحد ${rng.range(1, 12)}`,
          postalCode: `19${rng.range(10000000, 99999999)}`.slice(0, 10),
          isDefault: true,
        },
        ...(i % 3 === 0
          ? [
              {
                id: `ADDR-${1000 + i}-2`,
                title: 'محل کار / دفتر مرکزی',
                recipientName: `${fName} ${lName}`,
                phone,
                province: loc.province,
                city: loc.city,
                fullAddress: `${loc.city}، بلوار میرداماد، مجتمع تجاری پایتخت، طبقه ${rng.range(2, 6)}`,
                postalCode: `15${rng.range(10000000, 99999999)}`.slice(0, 10),
                isDefault: false,
              },
            ]
          : []),
      ],
      auditTrail: [
        {
          id: `AUD-CUST-${i}-1`,
          timestamp: daysAgoIso(regDaysAgo, rng.range(10, 500)),
          actorName: 'سیستم ثبت‌نام آنلاین',
          action: 'افتتاح حساب کاربری',
          note: 'احراز هویت پیامکی از طریق درگاه شاهکار',
        },
      ],
    });
  }

  // 3. Products and Variants (18 products: 6 from storefront + 12 additional exclusive POD models)
  const additionalProductsData = [
    {
      id: 'sp-107',
      name: 'هودی لش کالیگرافی «مولانا»',
      category: 'calligraphy' as const,
      basePrice: 890000,
      description: 'هودی دورس سه‌نخ تو کرکی گرم بالا با طراحی خوشنویسی بیت «عشق جز دولت و عنایت نیست».',
      colors: [
        { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
        { name: 'سپید استخوانی', hex: '#F5F2EB' },
        { name: 'سبز کهربایی', hex: '#233A2E' },
      ],
      sizes: ['M', 'L', 'XL', 'XXL'] as const,
      isCustomizable: true,
      tags: ['هودی', 'پاییزه', 'کالیگرافی', 'لش فیت'],
    },
    {
      id: 'sp-108',
      name: 'تیشرت اسلیم فیت «سیمرغ عطار»',
      category: 'graphic' as const,
      basePrice: 510000,
      description: 'تصویرسازی هندسی سیمرغ با تکنیک چاپ رآکتیو بدون برجستگی روی الیاف نخ پنبه.',
      colors: [
        { name: 'سورمه‌ای عمیق', hex: '#1E2530' },
        { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
      ],
      sizes: ['S', 'M', 'L', 'XL'] as const,
      isCustomizable: true,
      tags: ['اسلیم فیت', 'سیمرغ', 'اساطیری'],
    },
    {
      id: 'sp-109',
      name: 'دورس جلو بسته «شعر آزادی»',
      category: 'calligraphy' as const,
      basePrice: 760000,
      description: 'دورس پنبه پاییزه با آستین‌های رگلان و تایپوگرافی مدرن افقی در پشت لباس.',
      colors: [
        { name: 'خاکستری مِلانژ', hex: '#7E8287' },
        { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'] as const,
      isCustomizable: true,
      tags: ['دورس', 'مینیمال', 'پاییزه'],
    },
    {
      id: 'sp-110',
      name: 'کراپ تاپ پنبه‌ای «نقش خورشید»',
      category: 'minimalist' as const,
      basePrice: 380000,
      description: 'کراپ تاپ اورسایز زنانه تولید شده از الیاف فوق‌العاده نرم با طرح خورشید قاجاری.',
      colors: [
        { name: 'سپید استخوانی', hex: '#F5F2EB' },
        { name: 'آجری کویر', hex: '#7D4734' },
      ],
      sizes: ['S', 'M', 'L'] as const,
      isCustomizable: true,
      tags: ['کراپ تاپ', 'زنانه', 'قاجار'],
    },
    {
      id: 'sp-111',
      name: 'سویشرت زیپ‌دار با آستر ساتن «شاهنامه»',
      category: 'graphic' as const,
      basePrice: 1150000,
      description: 'سویشرت زیپ‌دار سنگین با آستر ابریشم‌نما حاوی مینیاتورهای رزم رستم و سهراب.',
      colors: [
        { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
      ],
      sizes: ['M', 'L', 'XL', 'XXL'] as const,
      isCustomizable: false,
      tags: ['سویشرت', 'لوکس', 'شاهنامه'],
    },
    {
      id: 'sp-112',
      name: 'تیشرت آستین بلند «خط شکسته نستعلیق»',
      category: 'calligraphy' as const,
      basePrice: 530000,
      description: 'تیشرت لانگ اسلیو با امتداد خطوط خوشنویسی از سرشانه تا مچ دست.',
      colors: [
        { name: 'سپید استخوانی', hex: '#F5F2EB' },
        { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
        { name: 'زرشکی شیراز', hex: '#5E1B26' },
      ],
      sizes: ['S', 'M', 'L', 'XL'] as const,
      isCustomizable: true,
      tags: ['آستین بلند', 'شکسته نستعلیق', 'کالیگرافی'],
    },
    {
      id: 'sp-113',
      name: 'تیشرت خام مخصوص سفارش دلخواه (Custom Canvas)',
      category: 'minimalist' as const,
      basePrice: 390000,
      description: 'بستر آماده چاپ مستقیم DTG با الیاف ۱۰۰٪ پنبه شانه شده مخصوص ثبت طرح‌های شخصی کاربران.',
      colors: [
        { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
        { name: 'سپید استخوانی', hex: '#F5F2EB' },
        { name: 'خاکستری مِلانژ', hex: '#7E8287' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'] as const,
      isCustomizable: true,
      tags: ['سفارشی', 'تیشرت خام', 'POD'],
    },
    {
      id: 'sp-114',
      name: 'تیشرت گلدوزی «بته‌جقه مینیمال»',
      category: 'minimalist' as const,
      basePrice: 470000,
      description: 'گلدوزی ظریف موتیف بته‌جقه با نخ ابریشمی مات روی جیب سینه.',
      colors: [
        { name: 'سبز زیتونی سیر', hex: '#313B2E' },
        { name: 'سپید استخوانی', hex: '#F5F2EB' },
      ],
      sizes: ['M', 'L', 'XL'] as const,
      isCustomizable: false,
      tags: ['بته جقه', 'گلدوزی', 'مینیمال'],
    },
    {
      id: 'sp-115',
      name: 'تیشرت لش «تهران ۱۹۷۱»',
      category: 'graphic' as const,
      basePrice: 510000,
      description: 'تایپوگرافی رترو فارسی با الهام از پوسترهای فیلم و سینمای دهه ۵۰ خورشیدی.',
      colors: [
        { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
        { name: 'خردلی اخرایی', hex: '#BA8D3D' },
      ],
      sizes: ['S', 'M', 'L', 'XL', 'XXL'] as const,
      isCustomizable: true,
      tags: ['تهران', 'رترو', 'لش فیت'],
    },
    {
      id: 'sp-116',
      name: 'هودی کلاه‌دار طرح «اسب مینیاتور تبریز»',
      category: 'graphic' as const,
      basePrice: 940000,
      description: 'طرح باشکوه اسب نگارگری مکتب تبریز بر روی سینه هودی با جیب کانگورویی دوبل.',
      colors: [
        { name: 'سورمه‌ای عمیق', hex: '#1E2530' },
        { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
      ],
      sizes: ['M', 'L', 'XL', 'XXL'] as const,
      isCustomizable: false,
      tags: ['هودی', 'نگارگری', 'تبریز'],
    },
    {
      id: 'sp-117',
      name: 'تیشرت قواره آزاد «سکوتی که داد می‌زند»',
      category: 'calligraphy' as const,
      basePrice: 485000,
      description: 'کالیگرافی آبستره مدرن با رنگ نقره‌ای و پودر شبرنگ بر روی پارچه تنفس‌پذیر پنبه.',
      colors: [
        { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
      ],
      sizes: ['S', 'M', 'L', 'XL'] as const,
      isCustomizable: true,
      tags: ['کالیگرافی', 'آبستره', 'آزاد'],
    },
    {
      id: 'sp-118',
      name: 'تیشرت باکس فیت «ایران من»',
      category: 'minimalist' as const,
      basePrice: 460000,
      description: 'نقشه هندسی خطی ایران به صورت مینیمال پشت یقه به همراه نام ایران با خط نستعلیق.',
      colors: [
        { name: 'سپید استخوانی', hex: '#F5F2EB' },
        { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
      ],
      sizes: ['M', 'L', 'XL'] as const,
      isCustomizable: true,
      tags: ['ایران', 'باکس فیت', 'مینیمال'],
    },
  ];

  const products: AdminProduct[] = [];
  const allVariants: ProductVariant[] = [];

  // Helper to map color hex to SKU code
  const colorSkuCode = (hex: string) => {
    switch (hex.toUpperCase()) {
      case '#1C1A1A': return 'BLK';
      case '#F5F2EB': return 'IVR';
      case '#233A2E': return 'EMR';
      case '#1E2530': return 'NAV';
      case '#7E8287': return 'MEL';
      case '#313B2E': return 'OLV';
      case '#7D4734': return 'TER';
      case '#BA8D3D': return 'GLD';
      case '#5E1B26': return 'BRG';
      default: return 'CLR';
    }
  };

  // Add 6 products from storefront
  PRODUCTS.forEach((sp, idx) => {
    const fit: 'oversize' | 'classic' = idx % 2 === 0 ? 'oversize' : 'classic';
    const pCode = sp.id.toUpperCase().replace('-', '');
    const skuPrefix = `${pCode}-${fit === 'oversize' ? 'OVR' : 'CLS'}`;

    const variants: ProductVariant[] = [];
    sp.colors.forEach((c) => {
      const cCode = colorSkuCode(c.hex);
      sp.sizes.forEach((s) => {
        // Intentionally create low stock and out-of-stock cases for inspectability!
        let onHand = rng.range(8, 45);
        let reserved = rng.range(0, 4);

        // Specific intentional low stock case
        if (sp.id === 'sp-101' && cCode === 'BLK' && s === 'XL') {
          onHand = 3;
          reserved = 2; // available = 1 (triggers low stock threshold of 5!)
        } else if (sp.id === 'sp-103' && cCode === 'OLV' && s === 'S') {
          onHand = 1;
          reserved = 1; // available = 0 (out of stock!)
        } else if (sp.id === 'sp-106' && cCode === 'BRG' && s === 'XXL') {
          onHand = 4;
          reserved = 1; // available = 3 (low stock)
        }

        const variant: ProductVariant = {
          sku: `${skuPrefix}-${cCode}-${s}`,
          productId: sp.id,
          size: s as any,
          colorName: c.name,
          colorHex: c.hex,
          fit,
          material: sp.details[0] || '۱۰۰٪ پنبه ارگانیک سوپر دو نخ',
          onHandStock: onHand,
          reservedStock: reserved,
          minStockThreshold: 5,
          priceAdjustmentTomans: 0,
          isEnabled: true,
          warehouseLocation: `انبار مرکزی تهران - ردیف C${(variants.length % 5) + 1}`,
        };
        variants.push(variant);
        allVariants.push(variant);
      });
    });

    const isCustom = sp.category === 'calligraphy' || sp.category === 'minimalist';
    products.push({
      id: sp.id,
      skuPrefix,
      name: sp.name,
      nameEn: sp.id === 'sp-101' ? 'Calligraphy "Heech" T-Shirt' : sp.id === 'sp-102' ? 'Vintage Tehran Gate T-Shirt' : sp.id === 'sp-103' ? 'Minimalist "Peace" T-Shirt' : sp.name,
      category: sp.category as any,
      collectionIds: sp.id === 'sp-101' ? ['col-shahneshin', 'col-hafez-molana'] : sp.id === 'sp-102' ? ['col-shahneshin', 'col-vintage-tehran'] : ['col-autumn-damavand'],
      basePriceTomans: sp.price,
      originalPriceTomans: sp.originalPrice || Math.round(sp.price * 1.15),
      discountPercent: sp.discountPercent || (sp.originalPrice ? Math.round((1 - sp.price / sp.originalPrice) * 100) : 0),
      discountStartDate: '2026-09-01',
      discountEndDate: '2026-10-15',
      description: sp.description,
      fabricSpecs: sp.details[0] || '۱۰۰٪ پنبه ارگانیک سوپر دو نخ ۲۴۰ گرم شانه شده',
      cut: 'لش فیت (Oversized Drop-Shoulder) قواره خیابانی راحت و مدرن',
      measurements: 'عرض سینه: ۵۸ سانتی‌متر | قد کل: ۷۶ سانتی‌متر | طول آستین: ۲۵ سانتی‌متر (سایز L)',
      careInstructions: 'شستشو با ماشین لباسشویی یا دستی در دمای ۳۰ درجه و پشت‌ورو | بدون استفاده از سفیدکننده | اتوکشی غیرمستقیم',
      printingMethod: 'چاپ دیجیتال مستقیم صنعتی DTG Brother GTX PRO با جوهرهای دوست‌دار محیط زیست',
      images: sp.images,
      primaryImage: sp.images[0],
      imageAlts: {
        [sp.images[0]]: `نمای روبروی ${sp.name} بر تن مدل`,
        ...(sp.images[1] ? { [sp.images[1]]: `نمای پشت و جزییات بافت ${sp.name}` } : {}),
      },
      isLive: true,
      status: 'active',
      productType: isCustom ? 'customizable_blank' : 'finished',
      isCustomizable: isCustom,
      permittedPrintAreas: ['front_chest', 'back_full', 'sleeve_left'],
      baseGarmentSku: variants[0]?.sku || `${skuPrefix}-BLK-L`,
      printingTechnique: 'DTG',
      slug: `${sp.id}-${sp.category}-luxury-streetwear`,
      seoTitle: `${sp.name} | پوشاک فاخر خیابانی شاه‌پوش`,
      seoMetaDescription: `خرید اینترنتی ${sp.name} با پنبه سوپر ارگانیک، دوخت دوبل و تضمین ثبات رنگ در فروشگاه شاه‌پوش.`,
      variants,
      createdAt: daysAgoIso(90 - idx * 5),
      updatedAt: daysAgoIso(idx + 1),
      tags: [sp.category, 'تیشرت', fit, 'سوپرپنبه'],
    });
  });

  // Add remaining 12 products
  additionalProductsData.forEach((ap, idx) => {
    const isHoodie = ap.name.includes('هودی') || ap.name.includes('سویشرت') || ap.name.includes('دورس');
    const isCrop = ap.name.includes('کراپ');
    const fitPrefix = isHoodie ? 'HOD-HVY' : isCrop ? 'CRP-WMS' : 'TSH-OVR';
    const apCode = ap.id.toUpperCase().replace('-', '');
    const skuPrefix = `${apCode}-${fitPrefix}`;

    const variants: ProductVariant[] = [];
    ap.colors.forEach((c) => {
      const cCode = colorSkuCode(c.hex);
      ap.sizes.forEach((s) => {
        let onHand = rng.range(5, 30);
        let reserved = rng.range(0, 3);

        // Low stock inspectable item
        if (ap.id === 'sp-107' && cCode === 'BLK' && s === 'XXL') {
          onHand = 2;
          reserved = 1;
        }

        const variant: ProductVariant = {
          sku: `${skuPrefix}-${cCode}-${s}`,
          productId: ap.id,
          size: s as any,
          colorName: c.name,
          colorHex: c.hex,
          fit: isHoodie ? 'oversize' : isCrop ? 'slim' : 'oversize',
          material: isHoodie ? 'پارچه دورس ۳ نخ خارخورده ۳۸۰ گرم' : 'پنبه شانه شده بهاره ضد پرز ۲۴۰ گرم',
          onHandStock: onHand,
          reservedStock: reserved,
          minStockThreshold: 4,
          priceAdjustmentTomans: s === 'XXL' ? 30000 : 0,
          isEnabled: true,
          warehouseLocation: `انبار کارگاه چاپ - ردیف ${(variants.length % 4) + 1}`,
        };
        variants.push(variant);
        allVariants.push(variant);
      });
    });

    const isCustom = ap.isCustomizable;
    products.push({
      id: ap.id,
      skuPrefix,
      name: ap.name,
      nameEn: `${ap.name} - Streetwear Edition`,
      category: ap.category,
      collectionIds: idx % 2 === 0 ? ['col-shahneshin'] : ['col-autumn-damavand'],
      basePriceTomans: ap.basePrice,
      originalPriceTomans: Math.round(ap.basePrice * 1.15),
      discountPercent: 12,
      discountStartDate: '2026-09-10',
      discountEndDate: '2026-10-25',
      description: ap.description,
      fabricSpecs: isHoodie ? 'دورس پنبه ۳ نخ سوپر ضخیم با کرک داخلی لطیف' : 'پنبه شانه شده بهاره با تکنولوژی ریسندگی پیشرفته ضد پرز',
      cut: isHoodie ? 'اورسایز کلاه‌دار / Heavyweight Boxy Fit' : isCrop ? 'کراپ کوتاه زنانه / Crop Streetwear' : 'لش‌فیت استاندارد',
      measurements: 'عرض سینه: ۶۰ سانتی‌متر | قد کل: ۷۴ سانتی‌متر | قد آستین: ۲۶ سانتی‌متر',
      careInstructions: 'شستشوی ملایم ۳۰ درجه، خشک کردن روی سطح صاف بدون آویزان کردن',
      printingMethod: isHoodie ? 'چاپ سیلک اسکرین پلاستیزول با دوام بالا' : 'چاپ دیجیتال مستقیم (DTG)',
      images: [
        `https://picsum.photos/seed/${ap.id}_thumb_1/800/800`,
        `https://picsum.photos/seed/${ap.id}_thumb_2/800/800`,
      ],
      primaryImage: `https://picsum.photos/seed/${ap.id}_thumb_1/800/800`,
      imageAlts: {
        [`https://picsum.photos/seed/${ap.id}_thumb_1/800/800`]: `تصویر استودیویی ${ap.name}`,
      },
      isLive: true,
      status: 'active',
      productType: isCustom ? 'customizable_blank' : 'finished',
      isCustomizable: isCustom,
      permittedPrintAreas: ['front_chest', 'back_full'],
      baseGarmentSku: variants[0]?.sku || `${skuPrefix}-BLK-M`,
      printingTechnique: isHoodie ? 'SilkScreen' : 'DTG',
      slug: `${ap.id}-${ap.category}-edition`,
      seoTitle: `${ap.name} | استریت‌ویر فاخر شاه‌پوش`,
      seoMetaDescription: `خرید اینترنتی ${ap.name} با دوخت تخصصی و ارسال رایگان در بسته‌بندی نفیس.`,
      variants,
      createdAt: daysAgoIso(75 - idx * 4),
      updatedAt: daysAgoIso(idx + 1),
      tags: ap.tags,
    });
  });

  // 4. Custom Designs (for POD orders)
  const customDesigns: CustomDesign[] = [];
  const DESIGN_TITLES = [
    'کالیگرافی بیت «بنی‌آدم اعضای یک پیکرند»',
    'تایپوگرافی نام «آریا» به خط ثلث زرین',
    'لوگوی استودیو معماری طاق کسری',
    'طرح اختصاصی نشان ماه تولد مهرگان',
    'نقش فیروزه‌ای کاشی‌کاری مسجد شیخ لطف‌الله',
    'خوشنویسی ترجیع‌بند «ساقی سیمین‌ساق»',
    'تصویرسازی انتزاعی پرنده صلح',
    'بیت «هرگز نمیرد آنکه دلش زنده شد به عشق»',
    'کلاژ شعر معاصر هوشنگ ابتهاج (سایه)',
    'تایپوگرافی مدرن کلمه «رستگاری»',
    'آرم انحصاری باشگاه سوارکاری پارس',
    'مینیمال خطی مقبره کوروش پاسارگاد',
    'کالیگرافی نستعلیق «هیچ» با افکت ورق طلا',
    'طرح اختصاصی سالگرد ازدواج با تاریخ خورشیدی',
    'خوشنویسی رباعیات خیام به خط کوفی بنایی',
    'تصویر گرافیکی یوزپلنگ ایرانی در کویر',
  ];

  // 5. Orders (108 orders across the 90 days range)
  const orders: Order[] = [];
  const payments: PaymentAttempt[] = [];
  const productionJobs: ProductionJob[] = [];
  const shipments: Shipment[] = [];
  const activities: ActivityLog[] = [];

  let designSeq = 1;
  let jobSeq = 1;
  let shipSeq = 1;
  let paySeq = 1;

  for (let i = 1; i <= 108; i++) {
    // Generate order timing with higher density in recent 30 days
    let daysAgo: number;
    if (i <= 10) {
      daysAgo = 0; // Today
    } else if (i <= 35) {
      daysAgo = rng.range(1, 7); // Last 7 days
    } else if (i <= 75) {
      daysAgo = rng.range(8, 30); // Last 30 days
    } else {
      daysAgo = rng.range(31, 88); // 31 - 90 days ago
    }

    const orderTimeIso = daysAgoIso(daysAgo, rng.range(10, 1400));
    const customer = rng.choice(customers);
    const orderId = `SHP-1405-${(882000 + i).toString()}`;

    const customizableVariants = allVariants.filter((v) => {
      const p = products.find((prod) => prod.id === v.productId);
      return p?.isCustomizable;
    });

    // Select 1 to 3 items
    const itemCount = i % 12 === 0 ? 3 : i % 4 === 0 ? 2 : 1;
    const isPodOrder = i <= 6 || i % 3 === 0;
    const variantPool = isPodOrder ? customizableVariants : allVariants;
    const selectedVariants = rng.sample(variantPool, itemCount);

    let hasCustom = false;
    let designStatus: Order['designStatus'] = 'not_applicable';
    let lineItemsSubtotal = 0;

    const items: OrderLineItem[] = selectedVariants.map((v, lIdx) => {
      const prod = products.find((p) => p.id === v.productId)!;
      const isCustomLine = prod.isCustomizable && isPodOrder && lIdx === 0;
      let customDesignId: string | undefined;

      if (isCustomLine) {
        hasCustom = true;
        const dId = `DSG-${9000 + designSeq}`;
        designSeq++;
        const dTitle = rng.choice(DESIGN_TITLES);
        const lineItemId = `ITEM-${orderId}-${lIdx + 1}`;
        const reviewStatus: CustomDesign['status'] =
          i <= 2
            ? 'under_review'
            : i === 3
            ? 'rejected'
            : i === 6
            ? 'revision_requested'
            : 'approved';

        const graphicChoices = [
          { id: 'heeche', name: 'کالیگرافی نستعلیق «هیچ»' },
          { id: 'eshgh', name: 'کالیگرافی خط ثلث «عشق»' },
          { id: 'tehran_vintage', name: 'ایلوستراسیون دروازه تهران' },
          { id: 'damavand_minimal', name: 'خطوط نمادین قله دماوند' },
          { id: 'hafez_collage', name: 'کلاژ ابیات دیوان حافظ' },
          { id: 'persian_lion', name: 'مهر اساطیری شیر و خورشید' },
        ];
        const gChoice = rng.choice(graphicChoices);
        const designType: 'graphic' | 'text' | 'mixed' = (i % 3 === 0) ? 'graphic' : (i % 3 === 1) ? 'text' : 'mixed';
        const customTextSample = designType === 'text' ? 'هیچ مگو' : designType === 'mixed' ? 'شهپوش استایل تهران' : undefined;

        const currentSettings = {
          designMode: designType,
          selectedGraphicId: designType !== 'text' ? gChoice.id : undefined,
          graphicName: designType !== 'text' ? gChoice.name : undefined,
          customText: customTextSample,
          fontName: 'ایران نستعلیق',
          textColorHex: rng.choice(['#eed29d', '#ffffff', '#0e0d0c', '#E61919']),
          designScale: rng.choice([80, 100, 110, 120]),
          designPosX: rng.choice([0, 5, -5]),
          designPosY: rng.choice([0, 10, -5]),
          tshirtColorName: v.colorName,
          tshirtColorHex: v.colorHex,
        };

        const revisions: DesignRevisionSnapshot[] = reviewStatus === 'revision_requested' ? [
          {
            revisionNumber: 1,
            submittedAt: daysAgoIso(daysAgo + 1, -120),
            previewUrl: `https://picsum.photos/seed/design_${dId}_rev1/800/800`,
            settings: {
              ...currentSettings,
              designScale: 90,
              designPosY: -10,
            },
            changeSummaryFa: 'نسخه اولیه ثبت‌شده توسط مشتری در طراح آنلاین',
            customerNote: 'طرح در بالای سینه باشد.',
          },
          {
            revisionNumber: 2,
            submittedAt: orderTimeIso,
            previewUrl: `https://picsum.photos/seed/design_${dId}/800/800`,
            settings: currentSettings,
            changeSummaryFa: 'اصلاح موقعیت و افزایش مقیاس به درخواست کارشناس آتلیه',
            customerNote: 'موقعیت طرح به مرکز سینه منتقل شد.',
          },
        ] : [
          {
            revisionNumber: 1,
            submittedAt: orderTimeIso,
            previewUrl: `https://picsum.photos/seed/design_${dId}/800/800`,
            settings: currentSettings,
            changeSummaryFa: 'طرح اولیه ثبت‌شده توسط مشتری در طراح آنلاین',
            customerNote: 'طرح با وسواس در وسط سینه تنظیم شده، لطفاً چاپ تمیز و بدون حاشیه سفید باشد.',
          },
        ];

        const sla = calculateReviewSla(orderTimeIso, DEMO_CLOCK_ISO, reviewStatus);
        const slaDueAt = daysAgoIso(daysAgo, -24);

        const customDesign: CustomDesign = {
          id: dId,
          orderId,
          lineItemId,
          customerId: customer.id,
          customerName: customer.fullName,
          customerPhone: customer.phone,
          title: dTitle,
          previewUrl: `https://picsum.photos/seed/design_${dId}/800/800`,
          format: rng.choice(['SVG', 'PNG', 'PDF']),
          resolutionDpi: reviewStatus === 'rejected' ? 150 : 300,
          colorProfile: 'CMYK',
          dimensionsMm: '۲۸۰ × ۳۸۰ میلی‌متر',
          printZone: rng.choice(['front_chest', 'back_full']),
          status: reviewStatus,
          designType,
          blankSku: v.sku,
          blankProductName: prod.name,
          blankColorName: v.colorName,
          blankSize: v.size,
          reviewerNotes:
            reviewStatus === 'approved'
              ? 'رزولوشن ۳۰۰ DPI و بستر رنگی CMYK توسط آتلیه تایید شد.'
              : reviewStatus === 'rejected'
              ? 'کیفیت تصویر ارسالی پایین‌تر از حداقل ۳۰۰ DPI است و لبه‌های طرح مات است.'
              : reviewStatus === 'revision_requested'
              ? 'لطفاً پس‌زمینه سفید فایل PNG حذف و نسخه ترنسپرنت ارسال شود.'
              : 'در نوبت بررسی کارشناس گرافیک آتلیه',
          assignedStaffId: 'STF-02',
          reviewerName: 'استاد امین کریمی',
          submittedAt: orderTimeIso,
          reviewedAt: reviewStatus !== 'under_review' ? daysAgoIso(daysAgo, -30) : undefined,
          slaDueAt,
          slaStatus: sla.status === 'completed' ? 'on_track' : sla.status,
          revisionCount: reviewStatus === 'revision_requested' ? 2 : 1,
          settings: currentSettings,
          revisions,
          customerNote: 'طرح با وسواس در وسط سینه تنظیم شده، لطفاً چاپ تمیز و بدون حاشیه سفید باشد.',
          auditTrail: [
            {
              id: `AUD-${dId}-1`,
              timestamp: orderTimeIso,
              actorId: customer.id,
              actorName: customer.fullName,
              action: 'submitted',
              notes: 'ثبت طرح از طریق طراح آنلاین پوشاک',
              newStatus: 'submitted',
            },
            {
              id: `AUD-${dId}-2`,
              timestamp: daysAgoIso(daysAgo, -15),
              actorId: 'STF-02',
              actorName: 'استاد امین کریمی',
              action: reviewStatus === 'approved' ? 'approved' : reviewStatus === 'rejected' ? 'rejected' : reviewStatus === 'revision_requested' ? 'revision_requested' : 'assigned',
              notes: reviewStatus === 'approved' ? 'تایید فنی جهت چاپ مستقیم DTG' : reviewStatus === 'rejected' ? 'رد به دلیل رزولوشن پایین' : 'بررسی کارشناسی آتلیه',
              previousStatus: 'submitted',
              newStatus: reviewStatus,
            },
          ],
          staffNotes: [
            {
              id: `NOTE-${dId}-1`,
              timestamp: orderTimeIso,
              authorId: 'STF-02',
              authorName: 'استاد امین کریمی',
              text: 'طرح بررسی شد. کادربندی روی پارچه سوپرپنبه ۲۴۰ گرم بدون مشکل است.',
            },
          ],
        };
        customDesigns.push(customDesign);
        customDesignId = dId;
        designStatus = reviewStatus === 'approved' ? 'approved' : reviewStatus === 'rejected' ? 'rejected' : 'pending_review';
      }

      const unitPrice = prod.basePriceTomans + v.priceAdjustmentTomans + (isCustomLine ? 65000 : 0);
      const qty = rng.choice([1, 1, 1, 2]);
      const subtotal = unitPrice * qty;
      lineItemsSubtotal += subtotal;

      return {
        id: `ITEM-${orderId}-${lIdx + 1}`,
        orderId,
        productId: prod.id,
        variantSku: v.sku,
        productName: prod.name,
        colorName: v.colorName,
        size: v.size,
        fit: v.fit,
        unitPriceTomans: unitPrice,
        quantity: qty,
        subtotalTomans: subtotal,
        customDesignId,
        isCustomPod: isCustomLine,
      };
    });

    const shippingFee = lineItemsSubtotal >= 1000000 ? 0 : 45000;
    const discount = i % 7 === 0 ? 50000 : 0;
    const totalTomans = lineItemsSubtotal + shippingFee - discount;

    // Status transitions
    let status: OrderStatus;
    let paymentStatus: PaymentStatus;

    if (i === 1) {
      status = 'pending_payment';
      paymentStatus = 'pending';
    } else if (i === 2) {
      status = 'cancelled';
      paymentStatus = 'failed';
    } else if (i === 3) {
      status = 'refunded';
      paymentStatus = 'refunded';
    } else if (i <= 6) {
      status = 'paid_processing';
      paymentStatus = 'verified_paid';
    } else if (i <= 14) {
      status = 'in_production';
      paymentStatus = 'verified_paid';
    } else if (i <= 20) {
      status = 'quality_check';
      paymentStatus = 'verified_paid';
    } else if (i <= 26) {
      status = 'ready_to_ship';
      paymentStatus = 'verified_paid';
    } else if (i <= 45) {
      status = 'shipped';
      paymentStatus = 'verified_paid';
    } else {
      status = 'delivered';
      paymentStatus = 'verified_paid';
    }

    const order: Order = {
      id: orderId,
      customerId: customer.id,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      shippingAddress: customer.address,
      city: customer.city,
      items,
      subtotalTomans: lineItemsSubtotal,
      shippingFeeTomans: shippingFee,
      discountTomans: discount,
      totalTomans,
      status,
      paymentStatus,
      designStatus,
      hasCustomLineItem: hasCustom,
      createdAt: orderTimeIso,
      updatedAt: daysAgoIso(Math.max(0, daysAgo - 1)),
      isRushOrder: i % 9 === 0,
      notes: i % 11 === 0 ? 'مشتری تقاضای بسته‌بندی کادویی با روبان طلایی دارد.' : undefined,
    };
    orders.push(order);

    // Payments: Strictly aligned with order paymentStatus and total
    const payMethod = rng.choice<PaymentAttempt['method']>([
      'saman_gateway',
      'zarinpal',
      'card_to_card',
      'saman_gateway',
    ]);
    const refId = `REF-${770000 + paySeq}`;
    const traceNum = `${rng.range(100000, 999999)}`;
    const fakeIp = generateFakeIp(rng);

    const payment: PaymentAttempt = {
      id: `PAY-${5000 + paySeq}`,
      orderId,
      customerId: customer.id,
      amountTomans: totalTomans,
      method: payMethod,
      status: paymentStatus,
      gatewayRefId: refId,
      traceNumber: traceNum,
      maskedIpAddress: fakeIp,
      createdAt: orderTimeIso,
      errorMessage: paymentStatus === 'failed' ? 'انصراف کاربر از پرداخت در درگاه شاپرک' : undefined,
      refundedAmountTomans: paymentStatus === 'refunded' ? totalTomans : undefined,
      refundReason: paymentStatus === 'refunded' ? 'درخواست مشتری به دلیل تغییر سایز پیش از چاپ' : undefined,
      refundedAt: paymentStatus === 'refunded' ? daysAgoIso(daysAgo, -180) : undefined,
    };
    payments.push(payment);
    paySeq++;

    // Production Jobs for active/completed manufacturing
    if (
      status === 'in_production' ||
      status === 'quality_check' ||
      status === 'ready_to_ship' ||
      status === 'shipped' ||
      status === 'delivered'
    ) {
      items.forEach((item) => {
        let stage: ProductionStage =
          status === 'delivered' || status === 'shipped'
            ? 'completed'
            : status === 'ready_to_ship'
            ? 'ready_for_fulfillment'
            : status === 'quality_check'
            ? 'qc_inspection'
            : rng.choice(['printing_dtg', 'pretreatment', 'curing_heatpress', 'queued']);

        // Introduce hold or rework for specific demo fixture variety
        let holdReason: string | undefined;
        let reworkReason: string | undefined;
        let defectReason: string | undefined;
        let wastedGarmentCount: number | undefined;

        if (jobSeq === 3) {
          stage = 'reprint_needed';
          reworkReason = 'انحراف ۱.۵ سانتی‌متری در تراز شاقولی طرح سینه هنگام حرارت پرس کانوایر';
          defectReason = 'انحراف کادر چاپ (Placement Misalignment)';
          wastedGarmentCount = 1;
        } else if (jobSeq === 5) {
          stage = 'on_hold';
          holdReason = 'استعلام رنگ نخ و دوخت سرشانه از طراح ارشد آتلیه';
        }

        const operatorId = rng.choice(['STF-04', 'STF-05']);
        const operatorName =
          operatorId === 'STF-04'
            ? 'سهراب زارع (اپراتور ارشد پرینتر)'
            : 'فرشید اسدی (تکنسین چاپ و کنترل کیفی)';

        const isCompleted = stage === 'completed' || stage === 'ready_for_fulfillment';
        const hasPassedQc = isCompleted;

        const job: ProductionJob = {
          id: `JOB-${300 + jobSeq}`,
          orderId,
          lineItemId: item.id,
          variantSku: item.variantSku,
          customDesignId: item.customDesignId,
          operatorId,
          assignedStaffName: operatorName,
          vendorPartner: rng.choice([undefined, undefined, 'کارگاه تکمیلی چاپ سیلک بهار']),
          stage,
          priority: order.isRushOrder ? 'rush' : 'normal',
          quantity: item.quantity || 1,
          printingTechnique: item.isCustomPod
            ? 'چاپ دیجیتال مستقیم نساجی (DTG صنعتی Brother GTX Pro)'
            : 'سیلک اسکرین پریمیوم استاندارد',
          printPlacement: 'سینه مرکزی (A3+ Front Chest)',
          dueDate: daysAgoIso(Math.max(-3, daysAgo - 4)),
          qcStatus: stage === 'reprint_needed' ? 'failed' : hasPassedQc ? 'passed' : 'pending',
          qcNotes:
            stage === 'reprint_needed'
              ? 'تست کشش و تراز شاقولی رد شد. نیازمند تنظیم مجدد قالب تیشرت در دستگاه.'
              : hasPassedQc
              ? 'آزمون ماندگاری چاپ و شستشو در دمای ۴۰ درجه با موفقیت انجام شد.'
              : undefined,
          reprintCount: stage === 'reprint_needed' ? 1 : 0,
          holdReason,
          reworkReason,
          defectReason,
          wastedGarmentCount,
          checklist: [
            {
              id: 'c1',
              title: 'بررسی عدم ترک‌خوردگی پیگمنت در کشش تار و پود',
              checked: isCompleted,
            },
            {
              id: 'c2',
              title: 'یکنواختی زیرلایه سفید (Pretreatment) و عدم لکه زرد',
              checked: isCompleted,
            },
            {
              id: 'c3',
              title: 'دوخت یقه ضدحساسیت و لیبل ساتن شاه‌پوش',
              checked: isCompleted,
            },
            {
              id: 'c4',
              title: 'کارت اصالت شماره‌دار و مهر طلاکوب آتلیه',
              checked: isCompleted,
            },
            {
              id: 'c5',
              title: 'بسته‌بندی در کاغذ پوستی عطری و هاردباکس مشکی',
              checked: stage === 'completed',
            },
          ],
          materialRequirements: [
            {
              name: 'پارچه خام تیشرت پنبه ارگانیک سوپر',
              quantityNeeded: `${item.quantity || 1} عدد`,
              available: true,
              consumed: stage !== 'queued',
            },
            {
              name: 'جوهر سفید نساجی Brother GTX Pure White',
              quantityNeeded: `${(item.quantity || 1) * 12} میلی‌لیتر`,
              available: true,
              consumed: stage === 'printing_dtg' || isCompleted || stage === 'qc_inspection',
            },
            {
              name: 'کارتریج رنگی CMYK اختصاصی نساجی',
              quantityNeeded: `${(item.quantity || 1) * 8} میلی‌لیتر`,
              available: true,
              consumed: stage === 'printing_dtg' || isCompleted || stage === 'qc_inspection',
            },
            {
              name: 'مایع آماده‌سازی پارچه (Pretreatment Solution)',
              quantityNeeded: `${(item.quantity || 1) * 25} میلی‌لیتر`,
              available: true,
              consumed: stage !== 'queued',
            },
          ],
          auditTrail: [
            {
              id: `ADT-${jobSeq}-1`,
              timestamp: daysAgoIso(daysAgo, -60),
              actorName: 'سیستم سفارشات',
              action: 'ایجاد دستور کار تولید',
              note: `سفارش تایید شد و مقدار ${item.quantity || 1} عدد ثبت گردید`,
            },
            {
              id: `ADT-${jobSeq}-2`,
              timestamp: daysAgoIso(daysAgo, -30),
              actorName: operatorName,
              action: 'تخصیص اپراتور',
              note: 'دستگاه Brother GTXpro برای اجرای دستور کار مشخص شد',
            },
          ],
          startedAt: daysAgoIso(daysAgo, -60),
          finishedAt: stage === 'completed' ? daysAgoIso(Math.max(0, daysAgo - 2)) : undefined,
        };
        productionJobs.push(job);
        jobSeq++;
      });
    }

    // Shipments for ready, dispatched, in_transit, delivered, and exception orders
    if (status === 'shipped' || status === 'delivered' || status === 'ready_to_ship') {
      const carrier: CarrierName = rng.choice(['tipax', 'post_pishtaz', 'chapar', 'courier_tehran']);
      const trackingCode = `${carrier === 'tipax' ? 'TPX' : carrier === 'courier_tehran' ? 'TEH' : 'PST'}-${rng.range(100000000, 999999999)}`;

      const shipmentStatus: Shipment['status'] =
        status === 'delivered'
          ? 'delivered'
          : status === 'shipped'
          ? (shipSeq % 7 === 0 ? 'exception' : shipSeq % 3 === 0 ? 'dispatched' : 'in_transit')
          : (shipSeq % 2 === 0 ? 'packed' : 'ready');

      const shipmentItems = items.map((it) => {
        const d = customDesigns.find((des) => des.orderId === orderId && des.lineItemId === it.id);
        return {
          sku: it.variantSku,
          productName: it.productName,
          quantity: it.quantity,
          isCustomPod: it.isCustomPod,
          designId: d?.id,
          designTitle: d?.title,
        };
      });

      const timeline = [
        {
          timestamp: daysAgoIso(daysAgo, -30),
          stage: 'order_confirmed',
          titleFa: 'تایید نهایی سفارش و تخصیص انبار',
          descriptionFa: 'سفارش در سیستم شاه‌پوش ثبت و قطعی گردید.',
          isCompleted: true,
        },
        {
          timestamp: daysAgoIso(daysAgo, -60),
          stage: 'packed',
          titleFa: 'بسته‌بندی در جعبه مشکی لوکس شاه‌پوش',
          descriptionFa: 'کالاها در کاور مشکی مات همراه با شناسنامه اصالت و روبان زرکوب بسته‌بندی شد.',
          isCompleted: shipmentStatus !== 'ready',
        },
        {
          timestamp: daysAgoIso(daysAgo, -120),
          stage: 'label_created',
          titleFa: 'تولید بارنامه و بارکد رهگیری پستی',
          descriptionFa: `بارنامه الکترونیک ${carrier} با شناسه رهگیری ${trackingCode} صادر شد.`,
          isCompleted: ['label_created', 'dispatched', 'in_transit', 'delivered', 'exception'].includes(shipmentStatus),
        },
        {
          timestamp: daysAgoIso(daysAgo, -180),
          stage: 'dispatched',
          titleFa: 'خروج از مرکز توزیع کارگاه و تحویل به ناوگان',
          descriptionFa: 'بسته توسط نماینده جمع‌آوری تحویل گرفته شد و به هاب پستی منتقل گردید.',
          location: 'مرکز مبادلات پستی تهران',
          isCompleted: ['dispatched', 'in_transit', 'delivered', 'exception'].includes(shipmentStatus),
        },
        {
          timestamp: daysAgoIso(Math.max(0, daysAgo - 1), -60),
          stage: 'in_transit',
          titleFa: 'در مسیر به سمت مقصد',
          descriptionFa: `مرسوله در خط مبادلاتی به سمت استان ${customer.province}، شهر ${customer.city} است.`,
          location: `هاب منطقه‌ای ${customer.province}`,
          isCompleted: ['in_transit', 'delivered'].includes(shipmentStatus),
        },
        {
          timestamp: daysAgoIso(Math.max(0, daysAgo - 2)),
          stage: 'delivered',
          titleFa: 'تحویل نهایی به گیرنده',
          descriptionFa: `مرسوله با امضای دیجیتال گیرنده (${customer.fullName}) تحویل گردید.`,
          isCompleted: shipmentStatus === 'delivered',
        },
      ];

      const shipment: Shipment = {
        id: `SHP-PKG-${2000 + shipSeq}`,
        orderId,
        customerId: customer.id,
        customerName: customer.fullName,
        recipientName: customer.fullName,
        recipientPhone: customer.phone,
        shippingAddress: customer.address,
        carrier,
        trackingCode,
        status: shipmentStatus,
        destinationCity: customer.city,
        shippingFeeTomans: shippingFee,
        dispatchedAt: ['dispatched', 'in_transit', 'delivered', 'exception'].includes(shipmentStatus)
          ? daysAgoIso(daysAgo, -180)
          : undefined,
        deliveredAt: shipmentStatus === 'delivered' ? daysAgoIso(Math.max(0, daysAgo - 3)) : undefined,
        estimatedDeliveryDate: daysAgoIso(Math.max(0, daysAgo - 4)),
        items: shipmentItems,
        timeline,
        exceptionReason: shipmentStatus === 'exception' ? 'عدم حضور گیرنده در نشانی ثبت‌شده پستی' : undefined,
        isMockLabel: true,
        packedAt: daysAgoIso(daysAgo, -60),
        packedByStaffId: 'STF-04',
        packedByStaffName: 'کیان دارابی',
      };
      shipments.push(shipment);
      shipSeq++;
    }
  }

  // Update customer summary metrics and link customer-centric demo records
  customers.forEach((c, cIdx) => {
    const custOrders = orders.filter((o) => o.customerId === c.id);
    const custDesigns = customDesigns.filter((d) => d.customerId === c.id || custOrders.some((o) => o.id === d.orderId));
    c.totalOrdersCount = custOrders.length;
    
    // Exact formula: Verified Paid Spend minus Processed Refunds
    const verifiedPaidTotal = custOrders
      .filter((o) => o.paymentStatus === 'verified_paid')
      .reduce((sum, o) => sum + o.totalTomans, 0);
    const refundedTotal = custOrders
      .filter((o) => o.paymentStatus === 'refunded')
      .reduce((sum, o) => sum + o.totalTomans, 0);
    c.totalSpentTomans = Math.max(0, verifiedPaidTotal - refundedTotal);

    // Initialize support tickets linked to real fixture orders and designs
    c.supportTickets = [];
    if (custOrders.length > 0 && cIdx % 2 === 0) {
      const targetOrder = custOrders[0];
      const targetDesign = custDesigns[0];
      c.supportTickets.push({
        id: `TCK-${800 + cIdx}`,
        subject: targetDesign 
          ? `استعلام تطبیق رنگ چاپ کالیگرافی برای سفارش ${targetOrder.id}` 
          : `پیگیری زمان ارسال و تحویل سفارش ${targetOrder.id}`,
        status: targetOrder.status === 'delivered' ? 'resolved' : 'in_progress',
        priority: targetOrder.isRushOrder ? 'high' : 'normal',
        category: targetDesign ? 'بررسی طرح اختصاصی' : 'پیگیری مرسوله',
        createdAt: targetOrder.createdAt,
        linkedOrderId: targetOrder.id,
        linkedDesignId: targetDesign?.id,
        lastMessage: targetDesign
          ? 'پاسخ کارشناس آتلیه: فایل وکتور CMYK بازبینی شده و آماده ارسال به چاپ مستقیم DTG است.'
          : 'پاسخ واحد پشتیبانی: مرسوله شما در حال بسته‌بندی در کارگاه است و بارنامه پستی به زودی ثبت می‌گردد.',
      });
    }

    // Initialize reviews for delivered orders
    c.reviews = [];
    const deliveredOrder = custOrders.find((o) => o.status === 'delivered');
    if (deliveredOrder && deliveredOrder.items.length > 0) {
      const reviewedItem = deliveredOrder.items[0];
      c.reviews.push({
        id: `REV-${900 + cIdx}`,
        productId: reviewedItem.productId,
        productName: reviewedItem.productName,
        rating: cIdx % 5 === 0 ? 4 : 5,
        comment: cIdx % 2 === 0
          ? 'کیفیت بافت پنبه سنگین فوق‌العاده‌ست. چاپ روی سینه بعد از چند بار شستشو هیچ ترکی برنداشته و ماندگاره.'
          : 'تن‌خور اورسایز دقیقاً مطابق جدول سایز بود و بسته‌بندی پرچم‌دار کارگاه با سلیقه تمام انجام شده بود.',
        status: 'approved',
        createdAt: deliveredOrder.updatedAt,
      });
    }

    // Initialize permitted staff notes with deep links
    c.staffNotes = [
      {
        id: `NOTE-${c.id}-1`,
        timestamp: c.createdAt,
        authorId: 'STF-01',
        authorName: 'سهراب سپهری',
        text: 'افتتاح حساب کاربری در سامانه شاه‌پوش با احراز هویت پیامکی موفق.',
      },
    ];
    if (c.tag === 'vip') {
      c.staffNotes.push({
        id: `NOTE-${c.id}-2`,
        timestamp: c.lastActiveAt,
        authorId: 'STF-02',
        authorName: 'کیان دارابی',
        text: 'مشتری رده طلایی (VIP)؛ اولویت بالا در صف پرینتر صنعتی DTG و بسته‌بندی اختصاصی با روبان زرکوب.',
        linkedOrderId: custOrders[0]?.id,
        linkedDesignId: custDesigns[0]?.id,
      });
    }

    // Saved Favorites (dataset contains them for specific customers only)
    if (cIdx % 3 === 0) {
      const prodSample = products[cIdx % products.length];
      c.savedFavorites = [
        {
          productId: prodSample.id,
          productName: prodSample.name,
          addedAt: c.lastActiveAt,
        },
      ];
    } else {
      c.savedFavorites = [];
    }

    // Saved Cart Items (only where underlying dataset contains them)
    if (cIdx % 5 === 0 && allVariants.length > 0) {
      const variantSample = allVariants[cIdx % allVariants.length];
      const prodParent = products.find((p) => p.id === variantSample.productId);
      c.cartItems = [
        {
          productId: variantSample.productId,
          productName: prodParent ? prodParent.name : 'محصول پایه شاه‌پوش',
          variantSku: variantSample.sku,
          quantity: 1,
        },
      ];
    } else {
      c.cartItems = [];
    }

    // Browsing Activity Events (demo anonymous session events with lawful basis notice)
    c.browsingEvents = [
      {
        id: `EVT-${c.id}-1`,
        timestamp: c.lastActiveAt,
        eventType: 'view_product',
        pageTitle: 'مشاهده تیشرت اورسایز پنبه سوپر',
        url: '/catalog/sp-101',
        device: 'موبایل (iOS / Safari)',
        durationSeconds: 145,
      },
      {
        id: `EVT-${c.id}-2`,
        timestamp: c.lastActiveAt,
        eventType: 'studio_session',
        pageTitle: 'آتلیه طراحی سه‌بعدی و ماک‌آپ سفارشی',
        url: '/studio',
        device: 'موبایل (iOS / Safari)',
        durationSeconds: 320,
      },
    ];
  });

  // 6. Staff Tasks
  const tasks: StaffTask[] = [
    {
      id: 'TSK-501',
      title: 'بررسی فایل وکتور سفارش SHP-1405-882103',
      description: 'فایل SVG کالیگرافی ارسالی مشتری نیاز به تراز خطوط راهنما در محدوده چاپ ۳۸۰ میلی‌متری دارد.',
      assignedStaffId: 'STF-02',
      priority: 'urgent',
      status: 'in_progress',
      relatedEntityType: 'order',
      relatedEntityId: 'SHP-1405-882103',
      dueDate: daysAgoIso(0, -180),
      createdAt: daysAgoIso(1),
    },
    {
      id: 'TSK-502',
      title: 'تنظیم هد و تمیزکاری پرینتر صنعتی DTG شماره ۲',
      description: 'کالیبراسیون قطره‌چکان جوهر سفید پس از ۵۰ چرخه چاپ متوالی پارچه تیره.',
      assignedStaffId: 'STF-04',
      priority: 'high',
      status: 'todo',
      dueDate: daysAgoIso(0, -360),
      createdAt: daysAgoIso(0, 120),
    },
    {
      id: 'TSK-503',
      title: 'انبارگردانی تیشرت‌های سوپرپنبه مشکی XL',
      description: 'موجودی انبار مرکزی به زیر ۵ عدد رسیده و نیاز به ثبت سفارش خرید خام از بافندگی است.',
      assignedStaffId: 'STF-01',
      priority: 'high',
      status: 'in_progress',
      dueDate: daysAgoIso(0, -600),
      createdAt: daysAgoIso(2),
    },
    {
      id: 'TSK-504',
      title: 'پاسخگویی به تیکت اصلاح سایز سفارش آرش کاظمی',
      description: 'مشتری تمایل دارد سایز تیشرت از L به XL قبل از مرحله پرس حرارتی تغییر یابد.',
      assignedStaffId: 'STF-06',
      priority: 'medium',
      status: 'completed',
      relatedEntityType: 'order',
      relatedEntityId: 'SHP-1405-882101',
      dueDate: daysAgoIso(1),
      createdAt: daysAgoIso(3),
      completedAt: daysAgoIso(1, 30),
    },
    {
      id: 'TSK-505',
      title: 'تسویه حساب هفتگی درگاه‌های بانکی',
      description: 'انطباق تراکنش‌های شاپرک با اسناد فاکتورهای صادره هفته جاری.',
      assignedStaffId: 'STF-06',
      priority: 'low',
      status: 'todo',
      dueDate: daysAgoIso(-2),
      createdAt: daysAgoIso(1),
    },
  ];

  // 7. Activity Logs
  const baseActivities: Omit<ActivityLog, 'id'>[] = [
    {
      actorId: 'STF-02',
      actorName: 'سهراب زارع',
      actorRole: 'designer_reviewer',
      actionType: 'DESIGN_APPROVED',
      description: 'طرح کالیگرافی سفارش SHP-1405-882105 جهت ارسال به خط چاپ DTG تایید شد.',
      entityType: 'design',
      entityId: 'DSG-9005',
      timestamp: daysAgoIso(0, 45),
    },
    {
      actorId: 'STF-04',
      actorName: 'وحید رضوانی',
      actorRole: 'production_operator',
      actionType: 'STAGE_CHANGED',
      description: 'سفارش SHP-1405-882104 از مرحله چاپ مستقیم به پرس حرارتی منتقل شد.',
      entityType: 'production',
      entityId: 'JOB-304',
      timestamp: daysAgoIso(0, 110),
    },
    {
      actorId: 'STF-01',
      actorName: 'کیوان دادگر',
      actorRole: 'super_admin',
      actionType: 'STOCK_ADJUSTED',
      description: 'موجودی تنوع TSH-OVR-BLK-XL پس از دریافت محموله بافندگی بروزرسانی گردید.',
      entityType: 'stock',
      entityId: 'TSH-OVR-BLK-XL',
      timestamp: daysAgoIso(1, 180),
      metadata: { previousOnHand: 3, newOnHand: 25 },
    },
    {
      actorId: 'STF-06',
      actorName: 'مریم باطنی',
      actorRole: 'support_finance',
      actionType: 'REFUND_ISSUED',
      description: 'استرداد وجه سفارش SHP-1405-882103 با تایید سرپرست مالی در سامانه ثبت شد.',
      entityType: 'payment',
      entityId: 'PAY-5003',
      timestamp: daysAgoIso(2, 340),
      metadata: { amountTomans: 410000 },
    },
    {
      actorId: 'system',
      actorName: 'سامانه هوشمند شهپوش',
      actorRole: 'system',
      actionType: 'SHIPMENT_DISPATCHED',
      description: 'کد رهگیری پست پیشتاز برای سفارش SHP-1405-882110 از وب‌سرویس پست دریافت شد.',
      entityType: 'order',
      entityId: 'SHP-1405-882110',
      timestamp: daysAgoIso(3, 400),
    },
  ];

  baseActivities.forEach((act, idx) => {
    activities.push({
      id: `LOG-${9900 + idx + 1}`,
      ...act,
    });
  });

  // 8. Analytics Aggregates (Strictly distinct: visitors !== sessions !== pageviews)
  const dailySnapshots: DailyMetricSnapshot[] = [];
  for (let d = 89; d >= 0; d--) {
    const snapDate = new Date(nowMs - d * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const dayOrders = orders.filter((o) => o.createdAt.startsWith(snapDate));
    const dayGross = dayOrders
      .filter((o) => o.paymentStatus === 'verified_paid')
      .reduce((sum, o) => sum + o.totalTomans, 0);
    const dayRefunds = dayOrders
      .filter((o) => o.paymentStatus === 'refunded')
      .reduce((sum, o) => sum + o.totalTomans, 0);

    const visitors = rng.range(280, 650) + (d < 14 ? 120 : 0);
    const sessions = Math.floor(visitors * 1.34) + rng.range(10, 45); // sessions > visitors
    const pageviews = Math.floor(sessions * 3.8) + rng.range(20, 90); // pageviews > sessions
    const bounceRatePercent = Number((24 + (d % 7) * 0.8 + rng.range(0, 30) / 10).toFixed(1));
    const avgSessionDurationSec = rng.range(180, 240);

    dailySnapshots.push({
      date: snapDate,
      visitors,
      sessions,
      pageviews,
      bounceRatePercent,
      avgSessionDurationSec,
      ordersCount: dayOrders.length,
      grossSalesTomans: dayGross,
      netSalesTomans: dayGross - dayRefunds,
      refundsTomans: dayRefunds,
    });
  }

  const sumMetric = (days: number, key: 'visitors' | 'sessions' | 'pageviews') => {
    return dailySnapshots.slice(-days).reduce((acc, curr) => acc + curr[key], 0);
  };

  const channelAttribution: TrafficChannelAttribution[] = [
    {
      channel: 'instagram',
      label: 'اینستاگرام و استوری‌های بلاگرها',
      sessionsCount: 14200,
      conversionRatePercent: 3.4,
      revenueTomans: 28400000,
    },
    {
      channel: 'direct',
      label: 'ورود مستقیم به آدرس وب‌سایت',
      sessionsCount: 9800,
      conversionRatePercent: 4.8,
      revenueTomans: 22600000,
    },
    {
      channel: 'organic_google',
      label: 'جستجوی ارگانیک گوگل',
      sessionsCount: 8400,
      conversionRatePercent: 2.9,
      revenueTomans: 14100000,
    },
    {
      channel: 'telegram',
      label: 'کانال‌ها و گروه‌های تلگرام',
      sessionsCount: 4100,
      conversionRatePercent: 2.1,
      revenueTomans: 5900000,
    },
    {
      channel: 'torob_referral',
      label: 'موتور جستجوی ترب',
      sessionsCount: 3200,
      conversionRatePercent: 3.8,
      revenueTomans: 6200000,
    },
  ];

  // 12. Catalog Collections & Categories Fixtures
  const categories: AdminCategory[] = [
    {
      id: 'calligraphy',
      slug: 'calligraphy',
      nameFa: 'کالیگرافی و خط نستعلیق',
      nameEn: 'Persian Calligraphy',
      descriptionFa: 'طرح‌های اصیل برگرفته از اشعار کهن فارسی با تکنیک چاپ دیجیتال مستقیم (DTG) برجسته و متراکم',
      imageUrl: 'https://picsum.photos/seed/cat_calligraphy/600/400',
      displayOrder: 1,
      isFeatured: true,
    },
    {
      id: 'minimalist',
      slug: 'minimalist',
      nameFa: 'مینیمال و تایپوگرافی معاصر',
      nameEn: 'Minimalist & Contemporary',
      descriptionFa: 'ترکیب هندسی، حروف‌نگاری مدرن و برش‌های مینیمال تک‌رنگ ویژه استایل‌های ساختاریافته شهری',
      imageUrl: 'https://picsum.photos/seed/cat_minimalist/600/400',
      displayOrder: 2,
      isFeatured: true,
    },
    {
      id: 'graphic',
      slug: 'graphic',
      nameFa: 'طرح‌های گرافیکی و اساطیری',
      nameEn: 'Mythological & Vintage Graphics',
      descriptionFa: 'نمادهای سیمرغ، شیر و خورشید و دروازه‌های تاریخی پایتخت با پردازش دیجیتال و رنگ‌آمیزی عمیق',
      imageUrl: 'https://picsum.photos/seed/cat_graphic/600/400',
      displayOrder: 3,
      isFeatured: false,
    },
    {
      id: 'hoodies',
      slug: 'hoodies',
      nameFa: 'هودی و دورس ۳ نخ سنگین',
      nameEn: 'Heavyweight Hoodies',
      descriptionFa: 'پوشاک گرم پاییزه و زمستانه با پارچه دورس پنبه خارخورده ۳۸۰ گرم و یقه دوبل مقاوم',
      imageUrl: 'https://picsum.photos/seed/cat_hoodies/600/400',
      displayOrder: 4,
      isFeatured: true,
    },
    {
      id: 'oversize',
      slug: 'oversize',
      nameFa: 'تیشرت‌های لش و قواره آزاد',
      nameEn: 'Oversized Streetwear',
      descriptionFa: 'برش‌های دراپ شولدر (Drop Shoulder) با پنبه شانه شده سوپر ۲۴۰ گرم مناسب فصول گرم',
      imageUrl: 'https://picsum.photos/seed/cat_oversize/600/400',
      displayOrder: 5,
      isFeatured: true,
    },
  ];

  const collections: AdminCollection[] = [
    {
      id: 'col-shahneshin',
      slug: 'imperial-shahneshin',
      titleFa: 'کلکسیون اختصاصی شاه‌نشین (لیمیتد ادیشن)',
      titleEn: 'Imperial Shahneshin Limited Drop',
      descriptionFa: 'تیشرت‌ها و هودی‌های انحصاری شماره‌دار با پلاک برنجی و جعبه چوبی معطر شاه‌پوش',
      imageUrl: 'https://picsum.photos/seed/col_shahneshin_cover/1200/600',
      bannerUrl: 'https://picsum.photos/seed/col_shahneshin_banner/1600/500',
      displayOrder: 1,
      status: 'active',
      startDate: '2026-08-01',
      endDate: '2026-10-30',
      productIds: ['sp-101', 'sp-102', 'sp-104'],
    },
    {
      id: 'col-autumn-damavand',
      slug: 'damavand-autumn',
      titleFa: 'دراپ پاییزه قله دماوند',
      titleEn: 'Mount Damavand Autumn Drop',
      descriptionFa: 'طراحی مونوکروم و هندسی خطوط نمادین قله ایران بر روی دورس‌های مشکی ذغالی و کرم استخوانی',
      imageUrl: 'https://picsum.photos/seed/col_damavand_cover/1200/600',
      bannerUrl: 'https://picsum.photos/seed/col_damavand_banner/1600/500',
      displayOrder: 2,
      status: 'active',
      startDate: '2026-09-01',
      endDate: '2026-11-30',
      productIds: ['sp-103', 'sp-105', 'sp-107'],
    },
    {
      id: 'col-hafez-molana',
      slug: 'mystic-verses',
      titleFa: 'کالکشن ابیات عرفانی حافظ و مولانا',
      titleEn: 'Mystic Verses Collection',
      descriptionFa: 'کلاژ هافتون تایپوگرافی اشعار کهن بر روی بافت پنبه سنگ‌شور با مقاومت شستشوی بالا',
      imageUrl: 'https://picsum.photos/seed/col_mystic_cover/1200/600',
      bannerUrl: 'https://picsum.photos/seed/col_mystic_banner/1600/500',
      displayOrder: 3,
      status: 'active',
      startDate: '2026-07-15',
      endDate: '2026-12-30',
      productIds: ['sp-101', 'sp-104', 'sp-106'],
    },
    {
      id: 'col-vintage-tehran',
      slug: 'retro-tehran-streetwear',
      titleFa: 'کلکسیون رترو طهران قدیم',
      titleEn: 'Retro Tehran Streetwear',
      descriptionFa: 'تلفیق نوستالژی پایتخت و آرت‌دکو در فضایی مدرن و استریت‌ویر',
      imageUrl: 'https://picsum.photos/seed/col_tehran_cover/1200/600',
      bannerUrl: 'https://picsum.photos/seed/col_tehran_banner/1600/500',
      displayOrder: 4,
      status: 'upcoming',
      startDate: '2026-10-15',
      endDate: '2027-01-15',
      productIds: ['sp-102', 'sp-108'],
    },
  ];

  const mediaAssets: MediaAsset[] = [
    {
      id: 'med-001',
      url: 'https://picsum.photos/seed/heech_tshirt_1/800/800',
      filename: 'heech-oversize-studio-front.jpg',
      title: 'نمای استودیویی روبروی تیشرت هیچ',
      altText: 'تیشرت کالیگرافی نستعلیق هیچ مشکی ذغالی تن‌خور مدل استریت',
      fileSizeBytes: 485000,
      dimensions: '1600 x 1600',
      aspectRatio: '1:1',
      format: 'JPEG',
      category: 'product_photo',
      associatedProductIds: ['sp-101'],
      uploadedAt: daysAgoIso(30),
    },
    {
      id: 'med-002',
      url: 'https://picsum.photos/seed/heech_tshirt_2/800/800',
      filename: 'heech-oversize-fabric-zoom.jpg',
      title: 'بزرگ‌نمایی بافت پارچه سوپرپنبه هیچ',
      altText: 'جزئیات بافت ۱۰۰٪ پنبه دو نخ شانه شده تیشرت هیچ',
      fileSizeBytes: 620000,
      dimensions: '1600 x 1600',
      aspectRatio: '1:1',
      format: 'JPEG',
      category: 'fabric_detail',
      associatedProductIds: ['sp-101'],
      uploadedAt: daysAgoIso(28),
    },
    {
      id: 'med-003',
      url: 'https://picsum.photos/seed/tehran_gate_1/800/800',
      filename: 'tehran-gate-navy-hero.jpg',
      title: 'شات خیابانی تیشرت دروازه تهران',
      altText: 'تیشرت سرمه‌ای دروازه تهران در نور طبیعی غروب پایتخت',
      fileSizeBytes: 540000,
      dimensions: '1600 x 1600',
      aspectRatio: '1:1',
      format: 'JPEG',
      category: 'model_shot',
      associatedProductIds: ['sp-102'],
      uploadedAt: daysAgoIso(25),
    },
    {
      id: 'med-004',
      url: 'https://picsum.photos/seed/peace_min_1/800/800',
      filename: 'peace-minimal-olive.jpg',
      title: 'تیشرت مینیمال صلح سبز زیتونی',
      altText: 'طرح گلدوزی کلمه صلح به خط کوفی روی سینه',
      fileSizeBytes: 390000,
      dimensions: '1600 x 1600',
      aspectRatio: '1:1',
      format: 'JPEG',
      category: 'product_photo',
      associatedProductIds: ['sp-103'],
      uploadedAt: daysAgoIso(22),
    },
    {
      id: 'med-005',
      url: 'https://picsum.photos/seed/hafez_shirt_1/800/800',
      filename: 'hafez-collage-tshirt.jpg',
      title: 'کلاژ ابیات حافظ شیرازی',
      altText: 'کلاژ هافتون اشعار حافظ چاپ مستقیم DTG',
      fileSizeBytes: 710000,
      dimensions: '1600 x 1600',
      aspectRatio: '1:1',
      format: 'JPEG',
      category: 'artwork',
      associatedProductIds: ['sp-104'],
      uploadedAt: daysAgoIso(20),
    },
    {
      id: 'med-006',
      url: 'https://picsum.photos/seed/sp-106_thumb_1/800/800',
      filename: 'damavand-hoodie-heavyweight.jpg',
      title: 'هودی دورس خارخورده دماوند',
      altText: 'هودی مشکی سنگین ۳۸۰ گرم با خطوط سفید کوه دماوند',
      fileSizeBytes: 890000,
      dimensions: '1600 x 1600',
      aspectRatio: '1:1',
      format: 'JPEG',
      category: 'mockup',
      associatedProductIds: ['sp-106'],
      uploadedAt: daysAgoIso(18),
    },
    {
      id: 'med-007',
      url: 'https://picsum.photos/seed/sp-107_thumb_1/800/800',
      filename: 'crop-top-streetwear-black.jpg',
      title: 'کراپ تاپ استریت زنانه مشکی',
      altText: 'کراپ بافت پنبه لاکرا فیت آزاد',
      fileSizeBytes: 420000,
      dimensions: '1600 x 1600',
      aspectRatio: '1:1',
      format: 'JPEG',
      category: 'product_photo',
      associatedProductIds: ['sp-107'],
      uploadedAt: daysAgoIso(15),
    },
    {
      id: 'med-008',
      url: 'https://picsum.photos/seed/sp-108_thumb_1/800/800',
      filename: 'shahneshin-embroidery-crest.jpg',
      title: 'پچ گلدوزی برجسته نشان شاه‌نشین',
      altText: 'جزئیات نخ زری و ابریشم پچ شاه‌نشین روی آستین',
      fileSizeBytes: 640000,
      dimensions: '1600 x 1600',
      aspectRatio: '1:1',
      format: 'JPEG',
      category: 'fabric_detail',
      associatedProductIds: ['sp-108'],
      uploadedAt: daysAgoIso(12),
    },
  ];

  // 13. Suppliers
  const suppliers: Supplier[] = [
    {
      id: 'SUP-01',
      name: 'نساجی تاروپود پنبه اصفهان',
      category: 'blank_apparel',
      categoryLabelFa: 'پارچه خام پنبه و البسه دوخته شده',
      contactPerson: 'حاج محمود معتمدی',
      phone: '09131114821',
      maskedPhone: '۰۹۱۳***۴۸۲۱',
      email: 'motamedi@tarpood-textile.ir',
      maskedEmail: 'm***@tarpood-textile.ir',
      city: 'اصفهان',
      address: 'شهرک صنعتی جی، خیابان چهارم، پلاک ۱۸',
      leadTimeDays: 7,
      minimumOrderQuantity: 50,
      ratingScore: 4.9,
      qualityRating: 'درجه یک ممتاز (A+)',
      status: 'active',
      suppliedMaterialIds: ['MAT-BLANK-OVR-BLK', 'MAT-BLANK-HD-BLK'],
      notes: 'تامین‌کننده انحصاری پارچه‌های سوپرپنبه ۲۴۰ گرم و دورس ۳ نخ ۳۸۰ گرم بدون آبرفت.',
      createdAt: daysAgoIso(90),
    },
    {
      id: 'SUP-02',
      name: 'بازرگانی برادران پرینت تکنولوژی',
      category: 'printing_consumables',
      categoryLabelFa: 'جوهر مستقیم DTG و محلول‌های کوتینگ',
      contactPerson: 'مهندس حسینی',
      phone: '09123339182',
      maskedPhone: '۰۹۱۲***۹۱۸۲',
      email: 'sales@brother-print-tech.ir',
      maskedEmail: 's***@brother-print-tech.ir',
      city: 'تهران',
      address: 'میدان فردوسی، خیابان ایرانشهر، کوچه دهقانی، شماره ۶',
      leadTimeDays: 3,
      minimumOrderQuantity: 5,
      ratingScore: 4.8,
      qualityRating: 'استاندارد OEKO-TEX اروپا',
      status: 'active',
      suppliedMaterialIds: ['MAT-INK-WHT', 'MAT-INK-CMYK', 'MAT-PRE-TREAT'],
      notes: 'واردکننده مستقیم جوهرهای ژاپنی Brother GTX Pro سازگار با محیط‌زیست و بدون حساسیت پوست.',
      createdAt: daysAgoIso(80),
    },
    {
      id: 'SUP-03',
      name: 'صنایع کارتن‌سازی و جعبه مشکی نفیس تبریز',
      category: 'luxury_packaging',
      categoryLabelFa: 'هاردباکس لوکس، کاغذ پوستی و روبان طلاکوب',
      contactPerson: 'آقای شمس',
      phone: '09144441290',
      maskedPhone: '۰۹۱۴***۱۲۹۰',
      email: 'info@nafis-hardbox.ir',
      maskedEmail: 'i***@nafis-hardbox.ir',
      city: 'تبریز',
      address: 'جاده ائل‌گلی، فاز ۲ شهرک رجایی، سوله نفیس',
      leadTimeDays: 5,
      minimumOrderQuantity: 100,
      ratingScore: 4.7,
      qualityRating: 'کیفیت صادراتی پریمیوم',
      status: 'active',
      suppliedMaterialIds: ['MAT-BOX-LUX', 'MAT-PAPER-WAX'],
      notes: 'تولیدکننده جعبه‌های هاردباکس مغناطیسی مات با فوم برش‌خورده با لیزر و مقوای ۱۲۰۰ گرم.',
      createdAt: daysAgoIso(75),
    },
    {
      id: 'SUP-04',
      name: 'بافندگی نخ‌ریزان و برچسب البرز',
      category: 'trims_labels',
      categoryLabelFa: 'لیبل بافته‌شده ساتن و اتیکت چرمی',
      contactPerson: 'خانم مهندس راد',
      phone: '09126668734',
      maskedPhone: '۰۹۱۲***۸۷۳۴',
      email: 'rad@alborz-trims.com',
      maskedEmail: 'r***@alborz-trims.com',
      city: 'کرج',
      address: 'شهرک صنعتی سیمین‌دشت، خیابان هفتم شرقی',
      leadTimeDays: 10,
      minimumOrderQuantity: 500,
      ratingScore: 4.6,
      qualityRating: 'مقاوم در برابر شست‌وشوی مکرر',
      status: 'active',
      suppliedMaterialIds: ['MAT-LABEL-STN', 'MAT-FOIL-GOLD'],
      notes: 'اتیکت‌های پشت یقه ضد حساسیت با نخ‌های لورکس طلایی و پلاک‌های چرمی حکاکی لیزری.',
      createdAt: daysAgoIso(60),
    },
  ];

  // 14. Workshop Raw Materials & Consumables
  const workshopMaterials: WorkshopMaterial[] = [
    {
      id: 'MAT-INK-WHT',
      nameFa: 'جوهر سفید نساجی Brother GTX Pro',
      nameEn: 'Brother GTX Pro White Textile Ink',
      category: 'ink_dtg',
      unitOfMeasure: 'لیتر',
      onHandQuantity: 24,
      reservedQuantity: 8,
      minThreshold: 6,
      unitCostTomans: 1850000,
      supplierId: 'SUP-02',
      supplierName: 'بازرگانی برادران پرینت تکنولوژی',
      shelfLocation: 'انبار مواد شیمیایی - قفسه B1',
      linkedProductionStage: 'printing_dtg',
    },
    {
      id: 'MAT-INK-CMYK',
      nameFa: 'پک جوهرهای ۴ رنگ CMYK نساجی صنعتی',
      nameEn: 'Industrial CMYK Textile Ink Pack',
      category: 'ink_dtg',
      unitOfMeasure: 'قوطی',
      onHandQuantity: 16,
      reservedQuantity: 4,
      minThreshold: 5,
      unitCostTomans: 2400000,
      supplierId: 'SUP-02',
      supplierName: 'بازرگانی برادران پرینت تکنولوژی',
      shelfLocation: 'انبار مواد شیمیایی - قفسه B2',
      linkedProductionStage: 'printing_dtg',
    },
    {
      id: 'MAT-PRE-TREAT',
      nameFa: 'محلول زیرلایه و پرایمر بافت پنبه تاروپود',
      nameEn: 'Cotton Pretreatment Solution',
      category: 'pretreatment',
      unitOfMeasure: 'لیتر',
      onHandQuantity: 45,
      reservedQuantity: 10,
      minThreshold: 12,
      unitCostTomans: 650000,
      supplierId: 'SUP-02',
      supplierName: 'بازرگانی برادران پرینت تکنولوژی',
      shelfLocation: 'انبار مواد شیمیایی - مخزن T1',
      linkedProductionStage: 'pretreatment',
    },
    {
      id: 'MAT-BOX-LUX',
      nameFa: 'جعبه هاردباکس لوکس مشکی مات با فوم ضربه‌گیر',
      nameEn: 'Matte Black Luxury Hardbox with Laser Foam',
      category: 'packaging_box',
      unitOfMeasure: 'عدد',
      onHandQuantity: 380,
      reservedQuantity: 45,
      minThreshold: 50,
      unitCostTomans: 48000,
      supplierId: 'SUP-03',
      supplierName: 'صنایع کارتن‌سازی و جعبه مشکی نفیس تبریز',
      shelfLocation: 'انبار بسته‌بندی - پالت P1',
      linkedProductionStage: 'packaging',
    },
    {
      id: 'MAT-PAPER-WAX',
      nameFa: 'رول کاغذ پوستی مومی محافظ چاپ با لوگوی طلاکوب',
      nameEn: 'Wax Protective Paper Roll',
      category: 'wrapping_paper',
      unitOfMeasure: 'متر',
      onHandQuantity: 550,
      reservedQuantity: 60,
      minThreshold: 100,
      unitCostTomans: 4500,
      supplierId: 'SUP-03',
      supplierName: 'صنایع کارتن‌سازی و جعبه مشکی نفیس تبریز',
      shelfLocation: 'انبار بسته‌بندی - ردیف P2',
      linkedProductionStage: 'packaging',
    },
    {
      id: 'MAT-FOIL-GOLD',
      nameFa: 'رول فویل طلاکوب حرارتی متالیک درجه یک',
      nameEn: 'Metallic Gold Foil Transfer Roll',
      category: 'wrapping_paper',
      unitOfMeasure: 'متر',
      onHandQuantity: 220,
      reservedQuantity: 25,
      minThreshold: 40,
      unitCostTomans: 18000,
      supplierId: 'SUP-04',
      supplierName: 'بافندگی نخ‌ریزان و برچسب البرز',
      shelfLocation: 'کارگاه طلاکوب - قفسه F1',
      linkedProductionStage: 'curing_heatpress',
    },
    {
      id: 'MAT-LABEL-STN',
      nameFa: 'لیبل بافته‌شده ساتن شاه‌پوش با نخ زرین لورکس',
      nameEn: 'Woven Satin Neck Label with Gold Thread',
      category: 'label_trim',
      unitOfMeasure: 'عدد',
      onHandQuantity: 1150,
      reservedQuantity: 120,
      minThreshold: 200,
      unitCostTomans: 3200,
      supplierId: 'SUP-04',
      supplierName: 'بافندگی نخ‌ریزان و برچسب البرز',
      shelfLocation: 'انبار ملزومات خیاطی - قفسه L1',
      linkedProductionStage: 'pretreatment',
    },
  ];

  // 15. Purchase Orders
  const purchaseOrders: PurchaseOrder[] = [
    {
      id: 'PO-2026-038',
      supplierId: 'SUP-01',
      supplierName: 'نساجی تاروپود پنبه اصفهان',
      status: 'received',
      createdAt: daysAgoIso(25),
      expectedDeliveryDate: daysAgoIso(18),
      receivedAt: daysAgoIso(19),
      totalCostTomans: 16500000,
      shippingCostTomans: 450000,
      notes: 'شارژ البسه خام تیشرت اورسایز مشکی و عاجی - بازرسی کیفی تایید شد.',
      createdById: 'staff-1',
      createdByName: 'کیان دارابی',
      items: [
        {
          id: 'POLI-101',
          itemType: 'variant_sku',
          itemRefId: 'SP101-OVR-BLK-L',
          title: 'تیشرت خام اورسایز ۲۴۰ گرم مشکی ذغالی سایز L',
          orderedQuantity: 50,
          receivedQuantity: 50,
          unitCostTomans: 165000,
          subtotalCostTomans: 8250000,
        },
        {
          id: 'POLI-102',
          itemType: 'variant_sku',
          itemRefId: 'SP101-OVR-BLK-XL',
          title: 'تیشرت خام اورسایز ۲۴۰ گرم مشکی ذغالی سایز XL',
          orderedQuantity: 50,
          receivedQuantity: 50,
          unitCostTomans: 165000,
          subtotalCostTomans: 8250000,
        },
      ],
    },
    {
      id: 'PO-2026-039',
      supplierId: 'SUP-02',
      supplierName: 'بازرگانی برادران پرینت تکنولوژی',
      status: 'received',
      createdAt: daysAgoIso(15),
      expectedDeliveryDate: daysAgoIso(12),
      receivedAt: daysAgoIso(12),
      totalCostTomans: 18500000,
      shippingCostTomans: 200000,
      notes: 'جوهر سفید نساجی و پرایمر به همراه گواهی اصالت بچ‌نامبر.',
      createdById: 'staff-2',
      createdByName: 'سهراب اخوان',
      items: [
        {
          id: 'POLI-103',
          itemType: 'raw_material',
          itemRefId: 'MAT-INK-WHT',
          title: 'جوهر سفید نساجی Brother GTX Pro (لیتر)',
          orderedQuantity: 10,
          receivedQuantity: 10,
          unitCostTomans: 1850000,
          subtotalCostTomans: 18500000,
        },
      ],
    },
    {
      id: 'PO-2026-040',
      supplierId: 'SUP-03',
      supplierName: 'صنایع کارتن‌سازی و جعبه مشکی نفیس تبریز',
      status: 'partially_received',
      createdAt: daysAgoIso(7),
      expectedDeliveryDate: daysAgoIso(1),
      receivedAt: daysAgoIso(2),
      totalCostTomans: 24000000,
      shippingCostTomans: 850000,
      notes: 'پارت اول ۳۰۰ جعبه دریافت شد، مابقی در حمل باربری چاپار است.',
      createdById: 'staff-1',
      createdByName: 'کیان دارابی',
      items: [
        {
          id: 'POLI-104',
          itemType: 'raw_material',
          itemRefId: 'MAT-BOX-LUX',
          title: 'جعبه هاردباکس لوکس مشکی مات با فوم محافظ',
          orderedQuantity: 500,
          receivedQuantity: 300,
          unitCostTomans: 48000,
          subtotalCostTomans: 24000000,
        },
      ],
    },
    {
      id: 'PO-2026-041',
      supplierId: 'SUP-01',
      supplierName: 'نساجی تاروپود پنبه اصفهان',
      status: 'ordered',
      createdAt: daysAgoIso(3),
      expectedDeliveryDate: '2026-09-26T12:00:00.000Z',
      totalCostTomans: 28500000,
      shippingCostTomans: 600000,
      notes: 'سفارش اضطراری شارژ کدهای کم‌موجود هودی و تیشرت کالیگرافی.',
      createdById: 'staff-1',
      createdByName: 'کیان دارابی',
      items: [
        {
          id: 'POLI-105',
          itemType: 'variant_sku',
          itemRefId: 'SP101-OVR-BLK-XL',
          title: 'تیشرت خام اورسایز ۲۴۰ گرم مشکی ذغالی سایز XL',
          orderedQuantity: 80,
          receivedQuantity: 0,
          unitCostTomans: 165000,
          subtotalCostTomans: 13200000,
        },
        {
          id: 'POLI-106',
          itemType: 'variant_sku',
          itemRefId: 'SP108-OVR-BLK-L',
          title: 'هودی خام ۳۸۰ گرم خارخورده مشکی سایز L',
          orderedQuantity: 40,
          receivedQuantity: 0,
          unitCostTomans: 382500,
          subtotalCostTomans: 15300000,
        },
      ],
    },
    {
      id: 'PO-2026-042',
      supplierId: 'SUP-04',
      supplierName: 'بافندگی نخ‌ریزان و برچسب البرز',
      status: 'draft',
      createdAt: daysAgoIso(1),
      expectedDeliveryDate: '2026-10-05T12:00:00.000Z',
      totalCostTomans: 4800000,
      shippingCostTomans: 150000,
      notes: 'پیش‌نویس سفارش ملزومات و لیبل‌های کالکشن زمستانه.',
      createdById: 'staff-2',
      createdByName: 'سهراب اخوان',
      items: [
        {
          id: 'POLI-107',
          itemType: 'raw_material',
          itemRefId: 'MAT-LABEL-STN',
          title: 'لیبل بافته‌شده ساتن شاه‌پوش با نخ زرین',
          orderedQuantity: 1500,
          receivedQuantity: 0,
          unitCostTomans: 3200,
          subtotalCostTomans: 4800000,
        },
      ],
    },
  ];

  // 16. Stock Movements (Historical Audit Ledger)
  const stockMovements: StockMovement[] = [
    {
      id: 'MOV-1001',
      timestamp: daysAgoIso(20),
      sku: 'SP101-OVR-BLK-L',
      productId: 'sp-101',
      type: 'goods_receipt',
      quantityChange: 50,
      fieldAffected: 'onHand',
      previousOnHand: 12,
      newOnHand: 62,
      previousReserved: 2,
      newReserved: 2,
      reason: 'ورود محموله از تامین‌کننده (حواله ورود PO-2026-038)',
      referenceId: 'PO-2026-038',
      actorId: 'staff-1',
      actorName: 'کیان دارابی',
    },
    {
      id: 'MOV-1002',
      timestamp: daysAgoIso(20),
      sku: 'SP101-OVR-BLK-XL',
      productId: 'sp-101',
      type: 'goods_receipt',
      quantityChange: 50,
      fieldAffected: 'onHand',
      previousOnHand: 4,
      newOnHand: 54,
      previousReserved: 1,
      newReserved: 1,
      reason: 'ورود محموله از تامین‌کننده (حواله ورود PO-2026-038)',
      referenceId: 'PO-2026-038',
      actorId: 'staff-1',
      actorName: 'کیان دارابی',
    },
    {
      id: 'MOV-1003',
      timestamp: daysAgoIso(12),
      sku: 'SP101-OVR-BLK-L',
      productId: 'sp-101',
      type: 'order_reservation',
      quantityChange: 1,
      fieldAffected: 'reserved',
      previousOnHand: 62,
      newOnHand: 62,
      previousReserved: 2,
      newReserved: 3,
      reason: 'رزرو خودکار به ازای ثبت سفارش مشتری',
      referenceId: orders[0]?.id || 'SHP-1405-882101',
      actorId: 'system',
      actorName: 'موتور ثبت سفارش شاه‌پوش',
    },
    {
      id: 'MOV-1004',
      timestamp: daysAgoIso(10),
      sku: 'SP101-OVR-BLK-L',
      productId: 'sp-101',
      type: 'order_release',
      quantityChange: -1,
      fieldAffected: 'both',
      previousOnHand: 62,
      newOnHand: 61,
      previousReserved: 3,
      newReserved: 2,
      reason: 'خروج فیزیکی و تحویل به مامور تیپاکس جهت ارسال',
      referenceId: orders[0]?.id || 'SHP-1405-882101',
      actorId: 'staff-3',
      actorName: 'پویا ناصری',
    },
    {
      id: 'MOV-1005',
      timestamp: daysAgoIso(6),
      sku: 'SP102-CLS-IVR-M',
      productId: 'sp-102',
      type: 'production_scrap',
      quantityChange: -1,
      fieldAffected: 'onHand',
      previousOnHand: 22,
      newOnHand: 21,
      previousReserved: 1,
      newReserved: 1,
      reason: 'ضایعات چاپ: پخش شدن جوهر روی آستین به دلیل پرز اضافه پارچه',
      actorId: 'staff-2',
      actorName: 'سهراب اخوان',
    },
    {
      id: 'MOV-1006',
      timestamp: daysAgoIso(4),
      sku: 'SP106-OVR-BRG-XXL',
      productId: 'sp-106',
      type: 'manual_adjustment',
      quantityChange: -2,
      fieldAffected: 'onHand',
      previousOnHand: 6,
      newOnHand: 4,
      previousReserved: 1,
      newReserved: 1,
      reason: 'انبارگردانی دوره‌ای و ثبت مغایرت فیزیکی قفسه B2',
      actorId: 'staff-1',
      actorName: 'کیان دارابی',
    },
    {
      id: 'MOV-1007',
      timestamp: daysAgoIso(2),
      sku: 'SP103-CLS-EMR-M',
      productId: 'sp-103',
      type: 'order_refund',
      quantityChange: 1,
      fieldAffected: 'onHand',
      previousOnHand: 14,
      newOnHand: 15,
      previousReserved: 0,
      newReserved: 0,
      reason: 'بازگشت کالای مرجوعی سالم به قفسه پس از تایید کنترل کیفیت',
      referenceId: 'RET-4401',
      actorId: 'staff-3',
      actorName: 'پویا ناصری',
    },
    {
      id: 'MOV-1008',
      timestamp: daysAgoIso(1),
      sku: 'SP108-OVR-BLK-L',
      productId: 'sp-108',
      type: 'sample_pull',
      quantityChange: -1,
      fieldAffected: 'onHand',
      previousOnHand: 18,
      newOnHand: 17,
      previousReserved: 2,
      newReserved: 2,
      reason: 'خروج نمونه تن‌پوش مدل جهت عکاسی ژورنال پاییزه در کاخ سعدآباد',
      actorId: 'staff-1',
      actorName: 'کیان دارابی',
    },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    demoClockIso: DEMO_CLOCK_ISO,
    isSyntheticDemo: true,
    customers,
    products,
    variants: allVariants,
    categories,
    collections,
    mediaAssets,
    orders,
    customDesigns,
    payments,
    productionJobs,
    shipments,
    staff,
    tasks,
    activities,
    analytics: {
      visitors: {
        today: sumMetric(1, 'visitors'),
        last7d: sumMetric(7, 'visitors'),
        last30d: sumMetric(30, 'visitors'),
        last90d: sumMetric(90, 'visitors'),
      },
      sessions: {
        today: sumMetric(1, 'sessions'),
        last7d: sumMetric(7, 'sessions'),
        last30d: sumMetric(30, 'sessions'),
        last90d: sumMetric(90, 'sessions'),
      },
      pageviews: {
        today: sumMetric(1, 'pageviews'),
        last7d: sumMetric(7, 'pageviews'),
        last30d: sumMetric(30, 'pageviews'),
        last90d: sumMetric(90, 'pageviews'),
      },
      channelAttribution,
      dailySnapshots,
    },
    stockMovements,
    suppliers,
    purchaseOrders,
    workshopMaterials,
    artworks: [...DEFAULT_ARTWORK_ASSETS],
    printRuleZones: [...DEFAULT_PRINT_RULE_ZONES],
    returnRequests: [...DEFAULT_RETURN_REQUESTS],
    discounts: [...DEFAULT_DISCOUNTS],
    marketingCampaigns: [...DEFAULT_MARKETING_CAMPAIGNS],
    homepageConfig: { ...DEFAULT_HOMEPAGE_CONFIG },
    storeBanners: [...DEFAULT_STORE_BANNERS],
    cmsPages: [...DEFAULT_CMS_PAGES],
    seoRecords: [...DEFAULT_SEO_RECORDS],
  };
}
