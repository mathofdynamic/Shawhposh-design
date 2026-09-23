import { Product } from './types';

export const PersianGraphics = [
  {
    id: 'heeche',
    name: 'کالیگرافی نستعلیق «هیچ»',
    svgPath: 'M 10 20 L 90 20 L 50 80 Z', // custom elegant styling
    artist: 'کارگاه شهپوش',
    description: 'خوشنویسی سنتی بر پایه هنر معاصر',
    // We will render these as gorgeous inline SVG illustrations in the POD editor!
    type: 'calligraphy' as const,
  },
  {
    id: 'eshgh',
    name: 'کالیگرافی خط ثلث «عشق»',
    artist: 'استاد امین',
    description: 'طرح برجسته با الهام از اشعار مولوی',
    type: 'calligraphy' as const,
  },
  {
    id: 'tehran_vintage',
    name: 'ایلوستراسیون دروازه تهران',
    artist: 'مهرگان منفرد',
    description: 'تلفیق نوستالژی پایتخت و آرت دکو',
    type: 'graphic' as const,
  },
  {
    id: 'damavand_minimal',
    name: 'خطوط نمادین کوه دماوند',
    artist: 'سیاوش راد',
    description: 'نمای مونوکروم و هندسی قله ایران',
    type: 'minimalist' as const,
  },
  {
    id: 'hafez_collage',
    name: 'کلاژ ابیات دیوان حافظ',
    artist: 'ستاره نیک‌فر',
    description: 'تایپوگرافی اشعار گرانبهای خواجه شیراز',
    type: 'graphic' as const,
  },
  {
    id: 'persian_lion',
    name: 'مهر اساطیری شیر و خورشید',
    artist: 'سهراب زارع',
    description: 'بازآفرینی اساطیری نقش دوران ساسانی',
    type: 'graphic' as const,
  }
];

export const PRODUCTS: Product[] = [
  {
    id: 'sp-101',
    name: 'تیشرت کالیگرافی «هیچ»',
    price: 490000,
    originalPrice: 545000,
    discountPercent: 10,
    description: 'تیشرت نخی سوپرپنبه با چاپ دیجیتال مستقیم نستعلیق برجسته. این محصول ترکیبی از تایپوگرافی اصیل ایرانی و برش‌های مدرن خیابانی (Streetwear) است که با رنگ‌آمیزی عمیق و کیفیت دوخت در سطح استانداردهای جهانی، تجربه‌ای نوینی از پوشاک ایرانی ارائه می‌کند.',
    details: [
      'جنس پارچه: ۱۰۰٪ پنبه شانه شده دو نخ (سوپرپنبه ارگانیک)',
      'نوع دوخت: دوخت شانه به شانه تقویت‌شده با نوار الاستیک',
      'تکنولوژی چاپ: دیجیتال مستقیم (DTG) با جوهرهای دوست‌دار زیست‌محیطی ایتالیایی',
      'دستورالعمل شستشو: شستشو با دست یا ماشین لباسشویی با آب سرد (۳۰ درجه) و پشت‌ورو',
      'برش بدنه: لش فیت (Oversized) راحت و اسپرت مناسب آقایان و بانوان'
    ],
    category: 'calligraphy',
    images: [
      'https://picsum.photos/seed/heech_tshirt_1/800/800',
      'https://picsum.photos/seed/heech_tshirt_2/800/800',
      'https://picsum.photos/seed/heech_tshirt_3/800/800',
      'https://picsum.photos/seed/heech_tshirt_4/800/800'
    ],
    colors: [
      { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
      { name: 'سپید استخوانی', hex: '#F5F2EB' },
      { name: 'سبز کهربایی', hex: '#233A2E' }
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    rating: 4.8,
    reviewsCount: 38,
    isPopular: true,
    isNew: false
  },
  {
    id: 'sp-102',
    name: 'تیشرت گرافیکی «دروازه تهران»',
    price: 520000,
    description: 'نگاهی نوستالژیک و هنرمندانه به دروازه‌های تاریخی تهران قدیم در فضایی آرت دکو و مدرن. چاپی فوق‌العاده متراکم با جزئیات ظریف بر روی پارچه کتان مرغوب پنبه‌ای. مناسب استایل‌های ساختاریافته شهری.',
    details: [
      'جنس پارچه: ۹۵٪ پنبه سوپر، ۵٪ الاستین جهت داوم فرم یقه‌ها',
      'یقه گرد متراکم کش‌بافت بدون تغییر حالت در اثر شستشوی مکرر',
      'نوع بستر طرح: چاپ سیلک اسکرین برجسته مقاوم در برابر سایش',
      'دارای شناسنامه انحصاری طراح و شماره پیگیری کارگاه شهپوش',
      'برش بدنه: فیت کلاسیک متناسب با آناتومی خاورمیانه‌ای'
    ],
    category: 'graphic',
    images: [
      'https://picsum.photos/seed/tehran_gate_1/800/800',
      'https://picsum.photos/seed/tehran_gate_2/800/800',
      'https://picsum.photos/seed/tehran_gate_3/800/800'
    ],
    colors: [
      { name: 'سورمه‌ای عمیق', hex: '#1E2530' },
      { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
      { name: 'خاکستری مِلانژ', hex: '#7E8287' }
    ],
    sizes: ['M', 'L', 'XL', 'XXL'],
    rating: 4.9,
    reviewsCount: 24,
    isPopular: false,
    isNew: true
  },
  {
    id: 'sp-103',
    name: 'تیشرت مینیمال «صلح ابدی»',
    price: 450000,
    description: 'طرحی ساده، متفکرانه و به دور از هیاهو. کلمه «صلح» به خط کوفی مدرن به صورت مینیمال در مرکز سینه گلدوزی شده است. مناسب کسانی که به دنبال وقار، سادگی و ماندگاری هستند.',
    details: [
      'جنس پارچه: ۱۰۰٪ پنبه ارگانیک با شستشوی سنگ‌شور لطیف',
      'گلدوزی با تراکم بالا بدون کشیدگی تار و پود کارآمد شده',
      'برچسب پشت یقه با تکنولوژی چاپ بدون لمس و ایجاد حساسیت',
      'آستین‌های راسته و برش جانبی بدون درز (Seamless Side-seams)',
      'مناسب تمامی فصول با تراکم بافت ۲۰۰ گرم بر متر مربع'
    ],
    category: 'minimalist',
    originalPrice: 530000,
    discountPercent: 15,
    images: [
      'https://picsum.photos/seed/peace_min_1/800/800',
      'https://picsum.photos/seed/peace_min_2/800/800',
      'https://picsum.photos/seed/peace_min_3/800/800',
      'https://picsum.photos/seed/peace_min_4/800/800',
      'https://picsum.photos/seed/peace_min_5/800/800'
    ],
    colors: [
      { name: 'سبز زیتونی سیر', hex: '#313B2E' },
      { name: 'سپید استخوانی', hex: '#F5F2EB' },
      { name: 'آجری کویر', hex: '#7D4734' }
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.7,
    reviewsCount: 19,
    isPopular: true,
    isNew: false
  },
  {
    id: 'sp-104',
    name: 'تیشرت تایپوگرافی اشعار «حافظ»',
    price: 540000,
    description: 'کلاژی بی‌نظیر از غزل‌های ناب حافظ شیرازی. این کلاژ به صورت تکنیک هافتون عکاسی و چاپ افست پارچه انجام شده و ترکیبی خارق‌العاده از هنر سنتی و هنر پاپ‌ارت مدرن پدید آورده است.',
    details: [
      'جنس پارچه: پنبه شانه شده نخ ۳۰ بسیار ریزبافت ضد پرز',
      'طرح دیجیتال سرتاسری بدون افت کیفیت در شستشوی خشک یا تر',
      'برش لش اسورت مناسب پوشش چند لایه با دور آستین دو رو',
      'ارائه شده در جعبه چوبی و معطر ویژه شهپوش',
      'تن‌خور آزاد و رها جهت عبور بهینه هوا در روزهای گرم سال'
    ],
    category: 'graphic',
    images: [
      'https://picsum.photos/seed/hafez_shirt_1/800/800'
    ],
    colors: [
      { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
      { name: 'سپید استخوانی', hex: '#F5F2EB' }
    ],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    rating: 5.0,
    reviewsCount: 42,
    isPopular: true,
    isNew: true
  },
  {
    id: 'sp-105',
    name: 'تیشرت مینیاتور اساطیری «هما»',
    price: 496000,
    originalPrice: 620000,
    discountPercent: 20,
    description: 'برگرفته از کاشی‌کاری‌ها و مینیاتورهای دوره صفوی با بازآفرینی پرنده فرخنده همای سعادت در پس‌زمینه زوایای مدرن. این کار نفیس تداعی‌گر زیبایی اصیل موزه ملی است بر جامه مد امروز.',
    details: [
      'جنس پارچه: ۱۰۰٪ پنبه شانه شده بهاره با تکنولوژی ریسندگی پیشرفته',
      'برش ارگونومیک یقه‌ها هماهنگ با آزادی حرکت شانه‌ها',
      'رنگ‌آمیزی صد در صد نخی با ماندگاری کامل ثبات نوری بالا',
      'جلوگیری از بوی عرق با پوشش دهی آنتی‌باکتریال فابریک',
      'قد تیشرت بلندتر از استانداردهای بازاری جهت راحتی در شلوار'
    ],
    category: 'graphic',
    images: [
      'https://picsum.photos/seed/homa_shirt_1/800/800',
      'https://picsum.photos/seed/homa_shirt_2/800/800'
    ],
    colors: [
      { name: 'خردلی اخرایی', hex: '#BA8D3D' },
      { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' }
    ],
    sizes: ['M', 'L', 'XL'],
    rating: 4.6,
    reviewsCount: 12,
    isPopular: false,
    isNew: true
  },
  {
    id: 'sp-106',
    name: 'تیشرت کالیگرافی خط ثلث «عشق»',
    price: 480000,
    description: 'طرحی به کلام «عشق» با خط نستعلیق و خط ثلث تودرتو و عمیق، چاپ شده به صورت مخمل برجسته (چاپ جیر) در قسمت جلویی لباس. بسیار لمس متفاوتی دارد و حس اصالت را به بیننده القا می‌کند.',
    details: [
      'نوع پارچه: تری‌کو پنبه‌ای گرم بالا با تراکم بافت منسجم',
      'جنس طرح: چاپ جیر حرارتی وارداتی کره‌ای فوق‌العاده نرم',
      'کشبافت یقه حاوی فیبر نایلون ضد تغییر فرم و وا رفتگی دایمی',
      'دارای بسته‌بندی هاردباکس به همراه آویز کارت‌پستال اشعار',
      'طراحی خلوت و مجلسی متناسب استایل نیمه‌رسمی'
    ],
    category: 'calligraphy',
    images: [
      'https://picsum.photos/seed/eshgh_shirt_1/800/800',
      'https://picsum.photos/seed/eshgh_shirt_2/800/800',
      'https://picsum.photos/seed/eshgh_shirt_3/800/800',
      'https://picsum.photos/seed/eshgh_shirt_4/800/800'
    ],
    colors: [
      { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
      { name: 'سپید استخوانی', hex: '#F5F2EB' },
      { name: 'زرشکی شیراز', hex: '#5E1B26' }
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    rating: 4.9,
    reviewsCount: 31,
    isPopular: true,
    isNew: false
  }
];
