import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  RotateCcw, 
  Star, 
  Sparkles, 
  ShoppingBag, 
  MessageSquare, 
  Heart, 
  ThumbsUp, 
  Send, 
  Check, 
  Ruler, 
  Package, 
  BookOpen, 
  Smile,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Product, CartItem } from '../types';
import { handleProductImageError } from '../lib/productImage';
import { GlassButton } from './ui/apple-tahoe-liquid-glass-button';
import { motion, AnimatePresence } from 'motion/react';

interface ProductComment {
  id: string;
  author: string;
  rating: number;
  date: string;
  title: string;
  content: string;
  colorName: string;
  sizeBought: string;
  helpfulCount: number;
  isVerified: boolean;
  likedByUser?: boolean;
}

const SEED_COMMENTS: Record<string, ProductComment[]> = {
  'sp-101': [
    {
      id: 'r-101-1',
      author: 'امیرارسلان کمالی',
      rating: 5,
      date: '۴ روز پیش',
      title: 'خوشنویسی فوق‌العاده باوقار و پارچه عالی',
      content: 'طرح خط خوشنویسی چاپ فوق‌العاده با کیفیتی داره. اصطکاک چندانی با پوست نداره و بعد از چند بار شستشوی مداوم هم هیچ تغییری نکرده. تیشرت لش، سنگین و خیلی شیکیه. پیشنهاد می‌کنم حتماً بگیرید.',
      colorName: 'جغرافیای مشکی (ذغالی)',
      sizeBought: 'XL',
      helpfulCount: 14,
      isVerified: true
    },
    {
      id: 'r-101-2',
      author: 'ماندانا رضایی',
      rating: 4,
      date: '۱ هفته پیش',
      title: 'فوق‌العاده لطیف و خوش‌دوخت',
      content: 'جنس پارچه‌اش عالیه، واقعاً ۱۰۰٪ پنبه سوپر پنبه‌ست و احساس لطافت کاملی میده. طراحی دور یقه و چاپ نستعلیقش چشمان همه رو به خودش جذب می‌کنه. فقط به راهنمای سایز آزاد هماهنگ با استایل لش بودنش دقت کنید.',
      colorName: 'سپید استخوانی',
      sizeBought: 'M',
      helpfulCount: 9,
      isVerified: true
    }
  ],
  'sp-102': [
    {
      id: 'r-102-1',
      author: 'بردیا کریمی',
      rating: 5,
      date: '۳ روز پیش',
      title: 'نوستالژیِ بی‌نظیر دروازه قدیمی تهران',
      content: 'یه‌کار واقعاً متفاوته. کانسپت دروازه قدیمی تهران ترکیب جذابی با این پوشاک نوین گرانج داشته. چاپ سیلکش بسیار ضخیم و باکیفیته. دم طراحش گرم واقعاً که چنین کانسپت‌هایی رو زنده می‌کنه.',
      colorName: 'جغرافیای مشکی (ذغالی)',
      sizeBought: 'L',
      helpfulCount: 18,
      isVerified: true
    },
    {
      id: 'r-102-2',
      author: 'مریم صالحی',
      rating: 4,
      date: '۲ هفته پیش',
      title: 'بسیار جذاب با تن‌خور فوق‌العاده',
      content: 'کیفیت چاپ فوق‌العاده بالاست، تن خورش هم خیلی زیبایه. رنگ سرمه‌ای عمیق رو انتخاب کردم خیلی غلظت زیبایی داره و کلاً بسته‌بندی شناسنامه‌دار شاهپوش کلاس کار رو به اوج می‌رسونه.',
      colorName: 'سورمه‌ای عمیق',
      sizeBought: 'M',
      helpfulCount: 5,
      isVerified: true
    }
  ],
  'sp-103': [
    {
      id: 'r-103-1',
      author: 'سحر عابدی',
      rating: 5,
      date: '۵ روز پیش',
      title: 'گلدوزی صلح فوق‌العاده ظریفه',
      content: 'خیلی لطیف و سنگ‌شوره. لوگوی صلح گلدوزی شده خیلی ظریف و خاص کار شده روی سینه. من رنگ زیتونیش رو گرفتم محشره. برای استایل مینیمال واقعاً بی‌نقصه.',
      colorName: 'سبز زیتونی سیر',
      sizeBought: 'S',
      helpfulCount: 12,
      isVerified: true
    }
  ],
  'sp-104': [
    {
      id: 'r-104-1',
      author: 'کوروش تهمتن',
      rating: 5,
      date: '۲ روز پیش',
      title: 'تلاقی حافظ، پاپ‌ارت و مد خیابانی!',
      content: 'این کار به معنای واقعی هنر پاپ ارته. تلفیق کلاژ اشعار حافظ با برش مدرن برای من بی‌نظیر بود. جعبه چوبی معطری هم که کار توش پیچیده شده بود سوپرایز جذابی بود که نشان از احترام به مشتری داشت.',
      colorName: 'جغرافیای مشکی (ذغالی)',
      sizeBought: 'XXL',
      helpfulCount: 22,
      isVerified: true
    }
  ],
  'sp-105': [
    {
      id: 'r-105-1',
      author: 'یاسمن فرهمند',
      rating: 4,
      date: '۶ روز پیش',
      title: 'طراحی پرنده هما فوق‌العاده قویه',
      content: 'طرح پرنده هما خیلی اصیل و قویه! رو تیشرت خردلی فوق‌العاده خودنمایی می‌کنه و جلوه چشم‌نوازی در خیابون داره. ایستایی لباس خیلی خوبه و جنسش هم نخی خنکه.',
      colorName: 'خردلی اخرایی',
      sizeBought: 'M',
      helpfulCount: 8,
      isVerified: true
    }
  ],
  'sp-106': [
    {
      id: 'r-106-1',
      author: 'سروش دادگر',
      rating: 5,
      date: '۳ روز پیش',
      title: 'چاپ جیر مخملی بی‌نظیر',
      content: 'چاپ مخمل جیرش واقعاً لول کار رو برده بالا. وقتی دست روی طرح می‌کشی حس مخملی و تراکم برجسته‌ای داره. کشبافت دور یقه هم خیلی مقاوم کار شده و وا نمیره.',
      colorName: 'زرشکی شیراز',
      sizeBought: 'L',
      helpfulCount: 15,
      isVerified: true
    }
  ]
};

const DEFAULT_COMMENTS: ProductComment[] = [
  {
    id: 'rd-1',
    author: 'پارسا مهرابی',
    rating: 5,
    date: '۳ روز پیش',
    title: 'تن‌خور فوق‌العاده و دوخت بی‌نظیر کارگاهی',
    content: 'تیشرت واقعاً باکیفیته. ایستادگی فوق‌العاده عالی روی شانه داره و جنس نخی اون به پوست آسیب نمی‌زنه. خرید رو حتماً پیشنهاد می‌کنم.',
    colorName: 'جغرافیای مشکی (ذغالی)',
    sizeBought: 'L',
    helpfulCount: 7,
    isVerified: true
  },
  {
    id: 'rd-2',
    author: 'مهسا نوری',
    rating: 4.5,
    date: '۵ روز پیش',
    title: 'طراحی مدرن و خاص پسند',
    content: 'دوخت کارگاه شهپوش تمیز و با دقته. چاپ روی کار ماندگاره. حس خوب حمایت از تولید هنری باکیفیت رو داره.',
    colorName: 'سپید استخوانی',
    sizeBought: 'M',
    helpfulCount: 4,
    isVerified: true
  }
];

interface ProductDetailProps {
  theme?: 'light' | 'dark';
  product: Product;
  onBack: () => void;
  onAddToCart: (item: Omit<CartItem, 'id'>) => void;
  onCustomize: (product: Product) => void;
}

export default function ProductDetail({ theme = 'dark', product, onBack, onAddToCart, onCustomize }: ProductDetailProps) {
  const isDark = theme === 'dark';
  
  // State for gallery and color/size triggers
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0] || {name:'—',hex:'#000000'});
  const [selectedSize, setSelectedSize] = useState(product.sizes[1] || product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<'story' | 'size' | 'workshop'>('story');

  // State for dynamic interactive local-first comments block
  const [comments, setComments] = useState<ProductComment[]>([]);
  const [newCommentName, setNewCommentName] = useState('');
  const [newCommentRating, setNewCommentRating] = useState(5);
  const [newCommentTitle, setNewCommentTitle] = useState('');
  const [newCommentContent, setNewCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  // Stats computation for local changes to ratings
  const [localRating, setLocalRating] = useState(product.rating);
  const [localReviewsCount, setLocalReviewsCount] = useState(product.reviewsCount);

  // Initialize and load comments for product
  useEffect(() => {
    const productComments = SEED_COMMENTS[product.id] || DEFAULT_COMMENTS;
    setComments(productComments);
    setSelectedImageIndex(0);
    setSelectedColor(product.colors[0] || {name:'—',hex:'#000000'});
    setSelectedSize(product.sizes[1] || product.sizes[0]);
    setQuantity(1);
    setShowCommentForm(false);
    setSubmissionSuccess(false);
    
    // Compute exact score based on seed reviews or keep fallback
    if (productComments.length > 0) {
      const sum = productComments.reduce((acc, c) => acc + c.rating, 0);
      const avg = Number((sum / productComments.length).toFixed(1));
      setLocalRating(avg);
      setLocalReviewsCount(productComments.length);
    } else {
      setLocalRating(product.rating);
      setLocalReviewsCount(product.reviewsCount);
    }
  }, [product.id]);

  useEffect(()=>{
    if(!product.colors.some(c=>c.hex===selectedColor.hex))setSelectedColor(product.colors[0]||{name:'—',hex:'#000000'});
    if(!product.sizes.includes(selectedSize))setSelectedSize(product.sizes[0]);
    if(selectedImageIndex>=product.images.length)setSelectedImageIndex(0);
  },[product.colors,product.sizes,product.images,selectedColor.hex,selectedSize,selectedImageIndex]);
  const formattedPrice = (product.variants?.find(v=>v.colorHex===selectedColor?.hex && v.size===selectedSize)?.priceTomans ?? product.price).toLocaleString('fa-IR');

  const selectedVariant = product.variants?.find(v=>v.colorHex===selectedColor?.hex && v.size===selectedSize);
  const available = selectedVariant?.available ?? 0;
  const handleAddToCart = () => {
    if (!selectedVariant || quantity < 1 || available < 1 || quantity > available) return;
    onAddToCart({
      productId: product.id,
      variantId: selectedVariant!.id,
      sku: selectedVariant!.sku,
      productName: product.name,
      price: selectedVariant?.priceTomans ?? product.price,
      quantity,
      color: selectedColor,
      size: selectedSize,
      image: product.images[selectedImageIndex] || product.images[0],
    });
    setAddedMessage(true);
    setTimeout(() => setAddedMessage(false), 2500);
  };

  const guarantees = [
    { title: 'ارسال سریع سراسری', desc: 'بسته‌بندی کادویی اختصاصی شهپوش با خدمات تیپاکس و پست پیشتاز', icon: Truck },
    { title: 'تضمین بازگشت وجه ۷ روزه', desc: 'تعویض سایز یا بازگشت کامل بدون چون و چرا در صورت عدم رضایت', icon: RotateCcw },
    { title: 'ضمانت اصالت و دوخت کارگاه', desc: '۱۰۰٪ تولید بومی با نخ باکیفیت پنبه شانه شده صادراتی', icon: ShieldCheck },
  ];

  const sizeMeasurements = [
    { label: 'سایز اسمال S', width: '۵۰ سانتی‌متر', length: '۷۰ سانتی‌متر', sleeve: '۲۲ سانتی‌متر' },
    { label: 'سایز مدیوم M', width: '۵۳ سانتی‌متر', length: '۷۳ سانتی‌متر', sleeve: '۲۳ سانتی‌متر' },
    { label: 'سایز لارج L', width: '۵۶ سانتی‌متر', length: '۷۶ سانتی‌متر', sleeve: '۲۴ سانتی‌متر' },
    { label: 'سایز ایکس‌لارج XL', width: '۵۹ سانتی‌متر', length: '۷۸ سانتی‌متر', sleeve: '۲۵ سانتی‌متر' },
    { label: 'سایز دوایکس‌لارج XXL', width: '۶۲ سانتی‌متر', length: '۸۰ سانتی‌متر', sleeve: '۲۶ سانتی‌متر' },
  ];

  // Helpfulness Vote Toggle Handler
  const handleVoteHelpful = (commentId: string) => {
    setComments(prev =>
      prev.map(c => {
        if (c.id === commentId) {
          const alreadyLiked = c.likedByUser;
          return {
            ...c,
            helpfulCount: alreadyLiked ? c.helpfulCount - 1 : c.helpfulCount + 1,
            likedByUser: !alreadyLiked
          };
        }
        return c;
      })
    );
  };

  // Submit Comments Handler
  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentName.trim() || !newCommentContent.trim() || !newCommentTitle.trim()) {
      return;
    }

    setSubmitting(true);

    // Simulate elite network request latency
    setTimeout(() => {
      const newComment: ProductComment = {
        id: `r-user-${Date.now()}`,
        author: newCommentName,
        rating: newCommentRating,
        date: 'هم‌اکنون',
        title: newCommentTitle,
        content: newCommentContent,
        colorName: selectedColor.name,
        sizeBought: selectedSize,
        helpfulCount: 0,
        isVerified: true
      };

      const updatedCommentsList = [newComment, ...comments];
      setComments(updatedCommentsList);

      // Recompute stats instantly
      const sum = updatedCommentsList.reduce((acc, c) => acc + c.rating, 0);
      const avg = Number((sum / updatedCommentsList.length).toFixed(1));
      setLocalRating(avg);
      setLocalReviewsCount(updatedCommentsList.length);

      // Reset form variables
      setNewCommentName('');
      setNewCommentTitle('');
      setNewCommentContent('');
      setNewCommentRating(5);
      setSubmitting(false);
      setSubmissionSuccess(true);

      // Close forms with smooth transition
      setTimeout(() => {
        setShowCommentForm(false);
        setSubmissionSuccess(false);
      }, 1800);
    }, 1200);
  };

  // Ratings Distribution Bars calculations
  const calculateRatingFractions = (starVal: number) => {
    if (comments.length === 0) return 0;
    const count = comments.filter(c => Math.floor(c.rating) === starVal).length;
    return (count / comments.length) * 100;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05
      }
    }
  };

  const slideUpVariants = {
    hidden: { opacity: 0, y: 30, filter: 'blur(8px)' },
    visible: { 
      opacity: 1, 
      y: 0, 
      filter: 'blur(0px)',
      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] } 
    }
  };

  return (
    <article className={`min-h-[100dvh] pt-32 pb-24 px-6 md:px-12 bg-grid-lines transition-colors duration-400 ${
      isDark ? 'bg-[#0e0d0c]' : 'bg-[#faf8f5]'
    }`}>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-7xl mx-auto"
      >
        {/* Back Button layout */}
        <motion.button
          variants={slideUpVariants}
          onClick={onBack}
          className={`mb-8 flex items-center gap-2 px-5 py-2.5 border rounded-full text-xs transition-colors duration-350 group cursor-pointer font-bold ${
            isDark 
              ? 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/15 text-gray-300' 
              : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-slate-300 text-slate-800 shadow-sm'
          }`}
        >
          <ArrowRight size={14} className="group-hover:translate-x-[3px] transition-transform" />
          <span>بازگشت به فروشگاه</span>
        </motion.button>

        {/* Product details main block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Right/Left: Images Side - Columns 5 */}
          <motion.div 
            variants={slideUpVariants}
            className="lg:col-span-5 flex flex-col gap-6"
          >
            {/* Main Showcase wrapper with doppelrand hardware */}
            <div className="w-full">
              <div className={`rounded-[2.5rem] border p-2 transition-all duration-400 ${
                isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-slate-200/25 border-slate-200/50'
              }`}>
                <div className={`relative aspect-square overflow-hidden rounded-[2.2rem] flex items-center justify-center border transition-all duration-300 ${
                  isDark ? 'bg-[#141211] border-white/[0.04]' : 'bg-white border-slate-200/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] shadow-sm'
                }`}>
                  <div className={`absolute top-5 right-5 border px-3 py-1 rounded-full text-[8px] font-bold font-mono tracking-widest transition-colors ${
                    isDark ? 'bg-black/60 border-white/10 text-amber-100/70' : 'bg-[#ba8d3d]/10 border-[#ba8d3d]/15 text-[#ba8d3d]'
                  }`}>
                    SHAHPOOSH PRO COAT
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.img
                      key={selectedImageIndex}
                      onError={handleProductImageError}
                      initial={{ opacity: 0, scale: 0.95, filter: 'blur(5px)' }}
                      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, scale: 1.03, filter: 'blur(5px)' }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      src={product.images[selectedImageIndex]}
                      alt={`${product.name} - تصویر اصلی`}
                      referrerPolicy="no-referrer"
                      className="product-media-source w-full h-full max-h-[380px] object-contain p-6 drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_25px_45px_rgba(0,0,0,0.55)]"
                    />
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Thumbnail switcher */}
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3 bg-neutral-500/5 dark:bg-white/[0.01] p-2.5 rounded-2xl border dark:border-white/[0.03] border-slate-200/50">
                {product.images.map((img, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square rounded-xl overflow-hidden p-1.5 border cursor-pointer transition-all duration-300 ${
                      selectedImageIndex === index 
                        ? 'border-[#ba8d3d] scale-[0.98] ring-2 ring-[#ba8d3d]/25' 
                        : isDark ? 'bg-[#161514]/40 border-white/5 hover:border-white/15' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} - تصویر ${index + 1}`}
                      referrerPolicy="no-referrer"
                      onError={handleProductImageError}
                      className="product-media-source w-full h-full object-contain filter contrast-[1.05]"
                    />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Micro Details info cards block */}
            <div className={`p-5 rounded-[1.8rem] border text-right space-y-3 ${
              isDark ? 'bg-white/[0.02] border-white/[0.05]' : 'bg-white border-slate-200/80 shadow-[0_10px_20px_rgba(0,0,0,0.02)]'
            }`}>
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-slate-200/50 dark:border-white/[0.03]">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>شناسه انحصاری اثر</span>
                <span className="font-mono text-xs text-[#ba8d3d] font-bold">{product.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>برش فابریک تن‌خور</span>
                <span className={`text-xs ${isDark ? 'text-white' : 'text-slate-800'} font-bold`}>لش‌فیت عریض (Oversized)</span>
              </div>
            </div>
          </motion.div>

          {/* Left/Right: Content specifications - Columns 7 */}
          <motion.div 
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.08
                }
              }
            }}
            className="lg:col-span-7 text-right"
          >
            
            <motion.div variants={slideUpVariants} className="flex items-center gap-2 mb-4">
              <span className="bg-[#ba8d3d]/10 border border-[#ba8d3d]/20 text-[#eed29d] text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                {product.category === 'calligraphy' ? 'کالکشن کالیگرافی' : product.category === 'graphic' ? 'کالکشن گرافیک ملل' : 'کالکشن مینیمال'}
              </span>
              <div className="flex items-center mr-auto bg-neutral-500/5 dark:bg-white/[0.01] px-3.5 py-1 rounded-full border dark:border-white/5 border-slate-200/80">
                <Star size={11} fill="#ba8d3d" stroke="none" />
                <span className={`font-mono text-xs font-bold mr-1.5 mt-0.5 ${isDark ? 'text-[#eed29d]' : 'text-[#ba8d3d]'}`}>
                  {localRating.toLocaleString('fa-IR')}
                </span>
                <span className={`text-[10px] mr-2 font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  ({localReviewsCount.toLocaleString('fa-IR')} خریدار ثبت‌شده)
                </span>
              </div>
            </motion.div>

            {/* Title */}
            <motion.h1 
              variants={slideUpVariants}
              className={`text-3xl md:text-5xl font-black font-display mb-4 tracking-tight leading-[1.1] transition-colors duration-400 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {product.name}
            </motion.h1>

            {/* Pricing Section */}
            <motion.div 
              variants={slideUpVariants}
              className={`flex items-center gap-4 mb-8 p-4 md:p-5 rounded-2xl border w-max transition-all duration-300 ${
                isDark ? 'bg-[#181513] border-white/[0.04]' : 'bg-white border-slate-200/80 shadow-md'
              }`}
            >
              <span className={`text-[11px] font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>تضمین قیمت کارگاه:</span>
              <div className="flex flex-col items-start text-left">
                {product.originalPrice && (
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-mono text-sm line-through decoration-red-500/40 tracking-tight ${
                      isDark ? 'text-gray-500' : 'text-slate-400'
                    }`}>
                      {product.originalPrice.toLocaleString('fa-IR')}
                    </span>
                    <span className="bg-red-500/10 border border-red-500/25 px-1.5 py-0.5 rounded text-[9px] font-black text-red-500 dark:text-red-400">
                      {product.discountPercent?.toLocaleString('fa-IR')}٪ تخفیف
                    </span>
                  </div>
                )}
                <div className="flex items-baseline gap-1">
                  <span className={`font-mono text-2xl md:text-3.5xl font-black tracking-tight ${isDark ? 'text-[#eed29d]' : 'text-[#ba8d3d]'}`}>
                    {formattedPrice}
                  </span>
                  <span className={`text-xs font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>تومان</span>
                </div>
              </div>
            </motion.div>

            {/* Option pickers (Colors & Sizes) */}
            <motion.div 
              variants={slideUpVariants}
              className={`grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 pt-6 border-t ${
                isDark ? 'border-white/5' : 'border-slate-200'
              }`}
            >
              
              {/* Color Picker */}
              <div className="flex flex-col items-start text-right">
                <span className={`text-xs font-black mb-3 ${isDark ? 'text-gray-300' : 'text-slate-800'}`}>
                  گزینش رنگ پارچه: <span className="text-[#ba8d3d] mr-1">{selectedColor.name}</span>
                </span>
                <div className="flex gap-2.5">
                  {product.colors.map((color) => {
                    const isSelected = selectedColor.name === color.name;
                    return (
                      <motion.button
                        key={color.name}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedColor(color)}
                        className={`w-9.5 h-9.5 rounded-full relative flex items-center justify-center border transition-all duration-300 cursor-pointer ${
                          isSelected 
                            ? 'border-[#ba8d3d] scale-105 ring-2 ring-[#ba8d3d]/30 shadow-md' 
                            : isDark ? 'border-white/10 hover:border-white/20' : 'border-slate-300 hover:border-slate-400 shadow-sm'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white block mix-blend-difference"></span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Size Selection */}
              <div className="flex flex-col items-start text-right">
                <span className={`text-xs font-black mb-3 ${isDark ? 'text-gray-300' : 'text-slate-800'}`}>
                  گزینش سایز لباس: <span className="text-[#ba8d3d] mr-1">{selectedSize}</span>
                </span>
                <div className="flex gap-1.5">
                  {product.sizes.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <motion.button
                        key={size}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedSize(size)}
                        className={`w-10 h-10 rounded-xl font-mono text-xs font-bold transition-all duration-300 cursor-pointer flex items-center justify-center ${
                          isSelected 
                            ? 'bg-[#ba8d3d] text-[#0e0d0c] shadow-[0_2px_12px_rgba(186,141,61,0.3)]' 
                            : isDark ? 'bg-white/5 border border-white/5 text-gray-300 hover:border-white/15' : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 shadow-sm'
                        }`}
                      >
                        {size}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

            </motion.div>

            {/* Quantity Selector & Main Buttons */}
            <motion.div 
              variants={slideUpVariants}
              className={`flex flex-col sm:flex-row gap-4 items-stretch mb-10 pt-6 border-t ${
                isDark ? 'border-white/5' : 'border-slate-200'
              }`}
            >
              
              {/* Quantifier */}
              <div className={`flex items-center gap-1.5 border rounded-full px-2.5 py-1.5 transition-colors ${
                isDark ? 'bg-[#141211] border-white/5' : 'bg-slate-100 border-slate-200 shadow-sm'
              }`}>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  aria-label="کاهش تعداد"
                  disabled={available < 1 || quantity <= 1}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer font-bold transition-colors ${
                    isDark ? 'bg-white/5 text-gray-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-gray-400' : 'bg-white text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white'
                  }`}
                >
                  -
                </motion.button>
                <span className={`font-mono text-sm px-3.5 min-w-[32px] text-center font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {quantity.toLocaleString('fa-IR')}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  aria-label="افزایش تعداد"
                  disabled={quantity>=available}
                  onClick={() => setQuantity(Math.max(1,Math.min(available, quantity + 1)))}
                  className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer font-bold transition-colors ${
                    isDark ? 'bg-white/5 text-gray-400 hover:text-white disabled:hover:text-gray-400' : 'bg-white text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-50 disabled:hover:bg-white'
                  }`}
                >
                  +
                </motion.button>
              </div>

              {/* Add To Cart Button-in-Button */}
              <GlassButton
                disabled={!selectedVariant || available < 1 || quantity < 1 || available < quantity}
                onClick={handleAddToCart}
                glassColor={isDark ? "rgb(186, 141, 61)" : "rgb(238, 210, 157)"}
                className="flex-1 group relative flex items-center justify-center gap-4 px-8 py-4 rounded-full text-xs font-bold shadow-lg transition-all duration-300 transform active:scale-95 cursor-pointer text-[#0e0d0c] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
              >
                <ShoppingBag size={14} className="stroke-[2.5px]" />
                <span>{available < 1 ? 'ناموجود' : 'افزودن به سبد خرید'}</span>
                {addedMessage && (
                  <span className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-[#4AF626]/15 border border-[#4AF626]/20 text-[#2db312] dark:text-[#4AF626] font-bold text-[10px] px-3.5 py-1.5 rounded-full shadow-lg block animate-fade-in whitespace-nowrap">
                    ✓ با موفقیت به سبد خرید اضافه شد
                  </span>
                )}
              </GlassButton>

              {/* Customize POD option button (Awesome linkage!) */}
              <GlassButton
                onClick={() => onCustomize(product)}
                glassColor={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)"}
                className={`group flex items-center justify-center gap-2.5 px-6 py-4 rounded-full text-xs font-bold select-none transition-all duration-300 cursor-pointer ${
                  isDark ? 'text-[#eed29d] border border-white/5' : 'text-slate-800 border border-slate-200 shadow-sm'
                }`}
              >
                <Sparkles size={13} className={`transition-colors ${isDark ? 'text-[#eed29d] group-hover:rotate-12 duration-200' : 'text-[#ba8d3d] group-hover:rotate-12 duration-200'}`} />
                <span>شخصی‌سازی مجدد طرح</span>
              </GlassButton>
            </motion.div>

            {/* Editorial Multi-Tab Specs & Story Box */}
            <motion.div 
              variants={slideUpVariants}
              className={`rounded-3xl border overflow-hidden ${
                isDark ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200/80 shadow-[0_15px_30px_rgba(0,0,0,0.02)]'
              }`}
            >
              {/* Tab Toggles */}
              <div className="grid grid-cols-3 border-b border-slate-200/50 dark:border-white/[0.04] bg-neutral-500/[0.02]">
                <button
                  onClick={() => setActiveTab('story')}
                  className={`py-4 text-xs font-black transition-all tracking-tight cursor-pointer ${
                    activeTab === 'story'
                      ? 'border-b-2 border-[#ba8d3d] text-[#ba8d3d] bg-neutral-500/[0.04]'
                      : `text-gray-400 dark:text-gray-500 hover:text-slate-800 dark:hover:text-white`
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <BookOpen size={13} />
                    <span>داستان اثر</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('size')}
                  className={`py-4 text-xs font-black transition-all tracking-tight cursor-pointer ${
                    activeTab === 'size'
                      ? 'border-b-2 border-[#ba8d3d] text-[#ba8d3d] bg-neutral-500/[0.04]'
                      : `text-gray-400 dark:text-gray-500 hover:text-slate-800 dark:hover:text-white`
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Ruler size={13} />
                    <span>راهنمای سایز لش‌فیت</span>
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('workshop')}
                  className={`py-4 text-xs font-black transition-all tracking-tight cursor-pointer ${
                    activeTab === 'workshop'
                      ? 'border-b-2 border-[#ba8d3d] text-[#ba8d3d] bg-neutral-500/[0.04]'
                      : `text-gray-400 dark:text-gray-500 hover:text-slate-800 dark:hover:text-white`
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Package size={13} />
                    <span>مشخصات فنی</span>
                  </span>
                </button>
              </div>

              {/* Tab Contents with animations */}
              <div className="p-6 text-right">
                <AnimatePresence mode="wait">
                  {activeTab === 'story' && (
                    <motion.div
                      key="story"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <h4 className={`text-xs font-black text-[#ba8d3d]`}>تأملی در اندیشه طرح:</h4>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                        {product.description}
                      </p>
                      <div className="pt-2 flex items-center gap-2">
                        <Smile size={14} className="text-[#ba8d3d]" />
                        <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>توصیه آتلیه: این کانسپت با هر سه تم رنگی تیشرت هماهنگی منحصربه‌فردی ایجاد می‌کند.</span>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'size' && (
                    <motion.div
                      key="size"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ba8d3d]"></span>
                        <h4 className="text-xs font-black text-[#ba8d3d]">اندازه‌های کلاسیک تیشرت عریض (بر حسب سانتی‌متر):</h4>
                      </div>
                      
                      <div className="overflow-x-auto rounded-2xl border dark:border-white/5 border-slate-200">
                        <table className="w-full text-xs text-right border-collapse">
                          <thead>
                            <tr className="bg-neutral-500/5 dark:bg-white/[0.02] border-b border-dashed border-slate-200/80 dark:border-white/[0.05]">
                              <th className="p-3 font-black">سایز هدف</th>
                              <th className="p-3 font-black">عرض سینه</th>
                              <th className="p-3 font-black">قد کل جامه</th>
                              <th className="p-3 font-black">طول آستین</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sizeMeasurements.map((m, idx) => (
                              <tr 
                                key={idx} 
                                className={`border-b dark:border-white/5 border-slate-200 hover:bg-neutral-500/5 transition-colors ${
                                  selectedSize === m.label.split(' ')[2] ? 'bg-[#ba8d3d]/5 font-black text-[#ba8d3d]' : ''
                                }`}
                              >
                                <td className="p-3 font-bold">{m.label}</td>
                                <td className="p-3 font-mono">{m.width}</td>
                                <td className="p-3 font-mono">{m.length}</td>
                                <td className="p-3 font-mono">{m.sleeve}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <p className={`text-[9.5px] leading-relaxed ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>
                        * به دلیل ماهیت الیاف طبیعی پنبه ارگانیک، خطای احتمالی اگزکت تا ۱ سانتی‌متر طبیعی است. برای استایل فیت معمولی می‌توانید یک سایز کوچک‌تر از روتین خود ثبت کنید.
                      </p>
                    </motion.div>
                  )}

                  {activeTab === 'workshop' && (
                    <motion.div
                      key="workshop"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4.5"
                    >
                      <h4 className="text-xs font-black text-[#ba8d3d]">استانداردهای مهندسی تولید شهپوش:</h4>
                      <ul className="flex flex-col gap-3">
                        {product.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed">
                            <CheckCircle2 size={13} className="text-[#eed29d] mt-1 shrink-0" />
                            <span className={`${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Brand Values and Guarantees */}
            <motion.div 
              variants={slideUpVariants}
              className={`grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 pt-6 border-t ${
                isDark ? 'border-white/5' : 'border-slate-200'
              }`}
            >
              {guarantees.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className={`flex flex-col items-start p-4.5 rounded-2xl border transition-colors ${
                    isDark ? 'bg-[#141312]/50 border-white/5' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="p-2.5 bg-[#ba8d3d]/10 text-[#eed29d] rounded-xl mb-3">
                      <Icon size={16} className={`${isDark ? 'text-[#eed29d]' : 'text-[#ba8d3d]'} stroke-1.5`} />
                    </div>
                    <span className={`text-xs font-black mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>{item.title}</span>
                    <p className={`text-[10px] leading-relaxed ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{item.desc}</p>
                  </div>
                );
              })}
            </motion.div>

          </motion.div>

        </div>

        {/* ================================================================= */}
        {/* PREMIUM INTERACTIVE COMMENTS & REVIEWS SECTION MODULE */}
        {/* ================================================================= */}
        <section className={`mt-24 pt-16 border-t border-dashed ${
          isDark ? 'border-white/[0.05]' : 'border-slate-200/85'
        }`}>
          <div className="max-w-5xl mx-auto space-y-12">
            
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2.5 text-right">
                <div className="flex items-center gap-2">
                  <MessageSquare size={14} className="text-[#ba8d3d]" />
                  <span className="text-[9.5px] uppercase tracking-[0.25em] font-black font-sans text-gray-400 dark:text-gray-500">
                    VOICE OF PATRONS
                  </span>
                </div>
                <h3 className={`text-2xl md:text-3.5xl font-black font-display tracking-tight transition-colors ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  دیدگاه‌های خریداران در آتلیه
                </h3>
                <p className={`text-xs max-w-xl leading-relaxed duration-300 ${
                  isDark ? 'text-gray-400' : 'text-slate-600'
                }`}>
                  شفافیت، امضای کیفیت ماست. دیدگاه‌های گرانقدر مشتریان محترم هویت آفرینی مارک تجاری شهپوش را تأیید می‌کنند.
                </p>
              </div>

              {/* Toggle Write Comment button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setShowCommentForm(!showCommentForm);
                  setSubmissionSuccess(false);
                }}
                className={`px-6 py-3 rounded-full text-xs font-black flex items-center gap-2 border shadow-sm cursor-pointer transition-all duration-300 ${
                  showCommentForm
                    ? 'bg-[#ba8d3d]/15 border-[#ba8d3d] text-[#eed29d]'
                    : isDark 
                      ? 'bg-white/5 hover:bg-white/10 border-white/5 text-white' 
                      : 'bg-[#ba8d3d] border-[#ba8d3d] text-white hover:bg-[#ba8d3d]/90'
                }`}
              >
                <Sparkles size={13} className={showCommentForm ? "animate-spin" : ""} />
                <span>{showCommentForm ? 'بستن فرم دیدگاه' : 'نوشتن بازخورد جدید'}</span>
              </motion.button>
            </div>

            {/* Quality Evaluation Stats Dashboard Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch pt-2">
              
              {/* Box 1: Aggregate Rating Gauge */}
              <div className={`md:col-span-5 p-6 rounded-3xl border flex flex-col items-center justify-center text-center transition-colors ${
                isDark ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200/80 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.02)]'
              }`}>
                <span className={`text-[10px] uppercase font-mono tracking-widest font-black mb-3 text-[#ba8d3d]`}>
                  AGGREGATE SCORE
                </span>
                
                <h4 className={`text-5xl md:text-6xl font-black font-mono tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {localRating.toLocaleString('fa-IR')}
                </h4>
                
                {/* Visual Stars */}
                <div className="flex gap-1.5 my-3.5">
                  {[1, 2, 3, 4, 5].map((s) => {
                    const fullStars = Math.floor(localRating);
                    const isFilled = s <= fullStars;
                    return (
                      <Star 
                        key={s} 
                        size={15} 
                        fill={isFilled ? "#ba8d3d" : "none"} 
                        stroke={isFilled ? "none" : "#ba8d3d"} 
                        className="stroke-1.5"
                      />
                    );
                  })}
                </div>

                <p className={`text-xs font-bold leading-normal ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                  بر اساس <span className="text-[#ba8d3d] font-mono font-bold mx-0.5">{comments.length.toLocaleString('fa-IR')}</span> گزارش ثبت‌شناسه
                </p>

                {/* Recommendation percentage badge badge */}
                <div className="mt-5 px-3.5 py-1.5 rounded-full bg-[#4AF626]/10 border border-[#4AF626]/20 flex items-center gap-1.5 text-[#2db312] dark:text-[#4AF626] font-black text-[10px]">
                  <Check size={12} className="stroke-[3px]" />
                  <span>٪۹۷ توصیه خریداران شاهپوش</span>
                </div>
              </div>

              {/* Box 2: Linear Bars Distribution of Ratings */}
              <div className={`md:col-span-7 p-6 rounded-3xl border text-right flex flex-col justify-between transition-colors ${
                isDark ? 'bg-white/[0.01] border-white/5' : 'bg-white border-slate-200/80 shadow-[0_15px_30px_-10px_rgba(0,0,0,0.02)]'
              }`}>
                <span className={`text-[10px] uppercase tracking-widest font-black text-[#ba8d3d] mb-4`}>
                  RATINGS DISTRIBUTION
                </span>

                <div className="space-y-3 flex-1 flex flex-col justify-center">
                  {[5, 4, 3, 2, 1].map((starIdx) => {
                    const pct = calculateRatingFractions(starIdx);
                    return (
                      <div key={starIdx} className="flex items-center gap-4">
                        <div className="flex items-center gap-1 w-8 shrink-0">
                          <Star size={10} fill="#ba8d3d" stroke="none" />
                          <span className="font-mono text-[11px] font-black mr-1 mt-0.5">{starIdx.toLocaleString('fa-IR')}</span>
                        </div>
                        {/* Interactive bar core */}
                        <div className="flex-1 h-2 rounded-full dark:bg-white/5 bg-slate-100 overflow-hidden relative">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            className="absolute top-0 bottom-0 right-0 rounded-full bg-gradient-to-l from-[#ba8d3d] to-[#eed29d]"
                          />
                        </div>
                        <span className="font-mono text-[10px] text-gray-400 w-8 text-left">
                          {Math.round(pct).toLocaleString('fa-IR')}٪
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-dashed dark:border-white/[0.03] border-slate-200/60 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-0.5">درجه لطافت پارچه</span>
                    <span className="text-xs font-black text-[#ba8d3d]">عالی (٪۹۸)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block mb-0.5">ثبات چاپ در شستشو</span>
                    <span className="text-xs font-black text-[#ba8d3d]">عالی (٪۹۶)</span>
                  </div>
                </div>
              </div>

            </div>

            {/* WRITE NEW PREMUM COMMENT FORM DRAWER */}
            <AnimatePresence>
              {showCommentForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0, scale: 0.98 }}
                  animate={{ opacity: 1, height: 'auto', scale: 1 }}
                  exit={{ opacity: 0, height: 0, scale: 0.98 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <form 
                    onSubmit={handleSubmitComment}
                    className={`p-6 md:p-8 rounded-[2.2rem] border text-right space-y-6 ${
                      isDark ? 'bg-[#141211] border-[#ba8d3d]/30' : 'bg-amber-50/20 border-[#ba8d3d]/30 shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 pb-4 border-b dark:border-white/[0.04] border-slate-200/60">
                      <Sparkles size={16} className="text-[#ba8d3d] animate-pulse" />
                      <h4 className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        مشارکت در اصالت هنر: نگارش دیدگاه جدید
                      </h4>
                    </div>

                    {submissionSuccess ? (
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="py-12 flex flex-col items-center justify-center text-center space-y-3"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#4AF626]/12 flex items-center justify-center text-[#4AF626] animate-bounce">
                          <CheckCircle2 size={24} />
                        </div>
                        <h4 className="text-sm font-black text-green-500 dark:text-[#4AF626]">سپاس‌گزار تعهد شما به کیفیت هستیم!</h4>
                        <p className="text-xs text-gray-400">دیدگاه شما ثبت گردید و بلافاصله بر روی آتلیه ظاهر خواهد شد.</p>
                      </motion.div>
                    ) : (
                      <div className="space-y-6">
                        {/* Row 1: Authorship & Interactive stars selectors */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Stars Selector Box */}
                          <div className="space-y-2 flex flex-col items-start">
                            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-300">
                              امتیاز شما به جامه چطور است؟
                            </span>
                            <div className="flex items-center gap-2 bg-neutral-500/5 dark:bg-black/20 p-2.5 rounded-2xl border dark:border-white/5 border-slate-200">
                              {[1, 2, 3, 4, 5].map((starIndex) => {
                                const currentRating = starIndex;
                                const isHighlighted = hoverRating !== null 
                                  ? currentRating <= hoverRating 
                                  : currentRating <= newCommentRating;
                                return (
                                  <motion.button
                                    key={starIndex}
                                    type="button"
                                    whileHover={{ scale: 1.25 }}
                                    whileTap={{ scale: 0.9 }}
                                    onMouseEnter={() => setHoverRating(currentRating)}
                                    onMouseLeave={() => setHoverRating(null)}
                                    onClick={() => setNewCommentRating(currentRating)}
                                    className="p-1 cursor-pointer"
                                  >
                                    <Star 
                                      size={18} 
                                      fill={isHighlighted ? "#ba8d3d" : "none"} 
                                      stroke="#ba8d3d"
                                      className="transition-colors duration-150 stroke-2"
                                    />
                                  </motion.button>
                                );
                              })}
                              <span className="font-mono text-xs w-8 text-center font-black text-[#ba8d3d] mr-2">
                                {newCommentRating.toLocaleString('fa-IR')} / ۵
                              </span>
                            </div>
                          </div>

                          {/* Full Name input */}
                          <div className="space-y-2 flex flex-col items-start">
                            <label className="text-[11px] font-bold text-gray-400 dark:text-gray-300">نام و نام خانوادگی گرانقدر شما</label>
                            <input 
                              type="text" 
                              required
                              placeholder="مثال: کیان رادفر"
                              value={newCommentName}
                              onChange={(e) => setNewCommentName(e.target.value)}
                              className={`w-full max-w-sm px-4.5 py-3 rounded-xl text-xs font-bold border transition-all duration-300 focus:outline-none ${
                                isDark 
                                  ? 'bg-black/30 border-white/[0.08] focus:border-[#ba8d3d] text-white' 
                                  : 'bg-white border-slate-200 focus:border-[#ba8d3d] shadow-sm text-slate-900'
                              }`}
                            />
                          </div>

                        </div>

                        {/* Title of Review Input row */}
                        <div className="space-y-2 flex flex-col items-start">
                          <label className="text-[11px] font-bold text-gray-400 dark:text-gray-300">عنوان توصیفی دیدگاه (خلاصه خلاقانه)</label>
                          <input 
                            type="text" 
                            required
                            placeholder="مثال: پارچه لش به شدت باکیفیت و ایستایی عالی"
                            value={newCommentTitle}
                            onChange={(e) => setNewCommentTitle(e.target.value)}
                            className={`w-full px-4.5 py-3 rounded-xl text-xs font-bold border transition-all duration-300 focus:outline-none ${
                              isDark 
                                ? 'bg-black/30 border-white/[0.08] focus:border-[#ba8d3d] text-white' 
                                : 'bg-white border-slate-200 focus:border-[#ba8d3d] shadow-sm text-slate-900'
                            }`}
                          />
                        </div>

                        {/* Textarea Detail field */}
                        <div className="space-y-2 flex flex-col items-start">
                          <label className="text-[11px] font-bold text-gray-400 dark:text-gray-300">شرح مشروح و سازنده بازخورد</label>
                          <textarea 
                            required
                            rows={4}
                            placeholder="تجربه خودتان از نرمی پنبه کارگاه، نوع چاپ دیجیتال و راحتی سایز را بنویسید..."
                            value={newCommentContent}
                            onChange={(e) => setNewCommentContent(e.target.value)}
                            className={`w-full px-4.5 py-3 rounded-2xl text-xs leading-relaxed border transition-all duration-300 focus:outline-none ${
                              isDark 
                                ? 'bg-black/30 border-white/[0.08] focus:border-[#ba8d3d] text-white' 
                                : 'bg-white border-slate-200 focus:border-[#ba8d3d] shadow-sm text-slate-900'
                            }`}
                          />
                        </div>

                        {/* Action buttons list */}
                        <div className="flex justify-end gap-3 pt-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={submitting}
                            className={`px-8 py-3.5 rounded-full text-xs font-black flex items-center gap-2 border cursor-pointer transition-all duration-300 ${
                              submitting 
                                ? 'bg-[#ba8d3d]/50 text-white/50 border-[#ba8d3d]/30 cursor-not-allowed'
                                : 'bg-[#ba8d3d] border-[#ba8d3d] text-[#0e0d0c] hover:bg-[#ba8d3d]/90 hover:scale-[1.01]'
                            }`}
                          >
                            {submitting ? (
                              <>
                                <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
                                <span>در حال ثبت اصالت...</span>
                              </>
                            ) : (
                              <>
                                <Send size={12} />
                                <span>ثبت ثبتی دیدگاه در آتلیه</span>
                              </>
                            )}
                          </motion.button>
                        </div>
                      </div>
                    )}
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List of Review Item Cards */}
            <div className="space-y-6">
              {comments.length === 0 ? (
                <div className={`py-12 rounded-3xl border border-dashed text-center flex flex-col items-center justify-center p-6 ${
                  isDark ? 'bg-white/[0.01] border-white/5' : 'bg-slate-50 border-slate-200'
                }`}>
                  <AlertCircle size={20} className="text-[#ba8d3d] mb-2" />
                  <p className="text-xs text-gray-500 font-bold">هنوز هیچ دیدگاهی برای این لباس ثبت نشده است.</p>
                  <p className="text-[10px] text-gray-400 mt-1">اولین نفر باشید که دیدگاهی ثبت می‌فرمایید!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <AnimatePresence initial={false}>
                    {comments.map((comment, index) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className={`p-6 md:p-7 rounded-[2.2rem] border transition-all duration-300 text-right space-y-4 ${
                          isDark 
                            ? 'bg-[#11100f] border-white/[0.04] hover:bg-[#141312] focus:border-[#ba8d3d]/30' 
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-[0_15px_30px_-15px_rgba(0,0,0,0.02)]'
                        }`}
                      >
                        {/* Row 1: Profile Header details */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-dashed dark:border-white/[0.04] border-slate-200/60">
                          
                          {/* Inner Avatar and rating breakdown info */}
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#ba8d3d] to-[#eed29d] p-[1.5px] flex items-center justify-center">
                              <div className="w-full h-full rounded-full dark:bg-[#1b1917] bg-white flex items-center justify-center">
                                <span className="text-[10px] font-black text-[#ba8d3d]">
                                  {comment.author.charAt(0)}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                  {comment.author}
                                </span>
                                {comment.isVerified && (
                                  <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black bg-[#ba8d3d]/10 text-[#ba8d3d] border border-[#ba8d3d]/20 flex items-center gap-1">
                                    <Check size={9} className="stroke-[3.5px]" />
                                    <span>خریدار تأیید شده</span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                                <span>خرید این جامه با مشخصه:</span>
                                <span className={`px-1.5 py-0.2 rounded-md bg-neutral-500/5 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{comment.colorName}</span>
                                <span>•</span>
                                <span className="font-mono">{comment.sizeBought}</span>
                              </div>
                            </div>
                          </div>

                          {/* Date and Star Rating column */}
                          <div className="flex flex-row-reverse sm:flex-col sm:items-end justify-between items-center sm:gap-1.5">
                            <span className="text-[10px] text-gray-400 font-bold">{comment.date}</span>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((st) => {
                                const fullSt = Math.floor(comment.rating);
                                const isFl = st <= fullSt;
                                return (
                                  <Star 
                                    key={st} 
                                    size={10.5} 
                                    fill={isFl ? "#ba8d3d" : "none"} 
                                    stroke={isFl ? "none" : "#ba8d3d"} 
                                    className="stroke-1.5"
                                  />
                                );
                              })}
                            </div>
                          </div>

                        </div>

                        {/* Title of comment */}
                        <div className="space-y-1.5">
                          <h4 className={`text-xs md:text-sm font-black ${isDark ? 'text-[#eed29d]' : 'text-[#ba8d3d]'}`}>
                            {comment.title}
                          </h4>
                          {/* Content of Review body text */}
                          <p className={`text-xs leading-relaxed font-sans ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                            {comment.content}
                          </p>
                        </div>

                        {/* Voting / Interactive helpful action tools */}
                        <div className="flex items-center justify-between pt-3 border-t dark:border-white/[0.03] border-slate-200/50">
                          <div className="flex items-center gap-1 text-[10px] text-[#eed29d]">
                            <Smile size={12} className="text-[#eed29d]" />
                            <span>تطابق سایز: کاملاً متناسب</span>
                          </div>

                          {/* Voting Helpful button */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleVoteHelpful(comment.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-[10px] font-bold cursor-pointer transition-all duration-300 ${
                              comment.likedByUser
                                ? 'bg-red-500/10 border-red-500/20 text-red-500'
                                : isDark 
                                  ? 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:border-white/10' 
                                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <Heart size={11} className={comment.likedByUser ? "fill-current" : ""} />
                            <span>{comment.likedByUser ? 'مفید بود' : 'این دیدگاه مفید بود؟'}</span>
                            <span className="font-mono font-bold mr-1 bg-neutral-500/10 px-1 py-0.2 rounded-full">
                              {comment.helpfulCount.toLocaleString('fa-IR')}
                            </span>
                          </motion.button>
                        </div>

                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

          </div>
        </section>

      </motion.div>
    </article>
  );
}
