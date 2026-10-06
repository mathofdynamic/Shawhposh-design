import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowLeft, Shirt, ShoppingBag, Palette, ArrowUpRight, Award, Compass, Timer, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassButton } from './ui/apple-tahoe-liquid-glass-button';
import { DotField } from './ui/DotField';
import { handleProductImageError, storefrontProductImage } from '../lib/productImage';

const slides = [
  {
    id: 'SH-COL-1405',
    tag: 'کیفیت ممتاز: سوپرپنبه ۱۰۰٪ طبیعی',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    dotColor: 'bg-emerald-400',
    designer: 'SHAHPOOSH® CLASSIC CUT',
    title: 'تیشرت شاهانه‌ی طرح کتیبه پارسی',
    desc: 'تن‌خور لش‌فیت ارگونومیک با چاپ مخمل خاویاری برجسته',
    image: 'https://picsum.photos/seed/editorialmodel/800/1000',
    modelBadge: 'تن‌خور لش‌فیت ارگونومیک',
    modelDesc: 'تراکم پارچه عالی برای گرمای تابستان',
    headlineWords: [
      { text: "پیوندی", highlighted: false },
      { text: "نو", highlighted: false },
      { text: "میان", highlighted: false },
      { text: "هنر", highlighted: false },
      { text: "کهن", highlighted: false },
      { text: "و", highlighted: false, br: true },
      { text: "شکوهِ", highlighted: true },
      { text: "استریت‌ور", highlighted: true },
      { text: "امروزی", highlighted: true }
    ],
    longDesc: "آتلیه مد و ملزومات شهپوش بازخوانی مینیاتورهای عهد باستان، نستعلیق جادوییِ خطاطان نامدار و کتیبه‌های تاریخی است. تیشرت‌ها و البسه آماده ما را بررسی کنید، یا در کارگاه خلاقانه چاپ دیجیتال تیشرت خاص خود را طراحی کنید.",
  },
  {
    id: 'SH-COL-1402',
    tag: 'کالکشن بهار: چاپ مینیاتور اساطیری',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    dotColor: 'bg-amber-400',
    designer: 'SHAHPOOSH® COUTURE EDIT',
    title: 'تیشرت اوور سایز طرح سیمرغ زرین',
    desc: 'تهیه شده از الیاف ۱۰۰٪ کتان پنبه ارگانیک سنگشور شده',
    image: 'https://picsum.photos/seed/streetminiature/800/1000',
    modelBadge: 'موتیف سیمرغ اسطوره‌ای',
    modelDesc: 'طراحی شده بر اساس مینیاتور دوره صفوی',
    headlineWords: [
      { text: "بازآفرینی", highlighted: false },
      { text: "اساطیر", highlighted: false },
      { text: "کهن", highlighted: false },
      { text: "در", highlighted: false, br: true },
      { text: "کالبد", highlighted: true },
      { text: "مدرن", highlighted: true },
      { text: "پوشاک", highlighted: true },
      { text: "عهد", highlighted: true },
      { text: "نو", highlighted: true }
    ],
    longDesc: "طراحی فاخر با الهام از شاهکارهای مینیاتور دوره صفوی و افسانه جاودان سیمرغ زرین. تهیه‌ شده از نفیس‌ترین الیاف کتان پنبه سنگشور شده با قواره‌های اوور سایز بی‌نقص جهت استایل‌دهی مدرن استریت‌ور.",
  },
  {
    id: 'SH-COL-1409',
    tag: 'طرح ویژه: کالیگرافی شکسته نستعلیق',
    tagColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    dotColor: 'bg-blue-400',
    designer: 'SHAHPOOSH® MINIMAL MODERN',
    title: 'تیشرت بادی طرح کتیبه خطاطی',
    desc: 'پارچه ظریف شانه شده بدون ایجاد پرز یا حساسیت پوستی',
    image: 'https://picsum.photos/seed/persianminimal/800/1000',
    modelBadge: 'خوشنویسی گرانروی مدرن',
    modelDesc: 'کالیگرافی اختصاصی استاد جلیلی',
    headlineWords: [
      { text: "جاری", highlighted: false },
      { text: "و", highlighted: false },
      { text: "سیال", highlighted: false },
      { text: "همچون", highlighted: false },
      { text: "قلم", highlighted: false, br: true },
      { text: "کالیگرافی", highlighted: true },
      { text: "فاخرِ", highlighted: true },
      { text: "نستعلیق", highlighted: true }
    ],
    longDesc: "تلفیق مینیمالیسم معاصر ملل با جسارت خط شکسته نستعلیقِ ایرانی. تجربه‌ای فراتر از جریان‌های زودگذر مد روز با خوشنویسی اختصاصی استاد جلیلی روی پلتفرم آنلاین طراحی هوشمند شهپوش.",
  }
];

const textContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.04,
    }
  },
  exit: {
    transition: {
      staggerChildren: 0.015,
      staggerDirection: -1 as const,
    }
  }
};

const wordVariants = {
  hidden: {
    opacity: 0,
    filter: 'blur(8px)',
    y: 8,
  },
  visible: {
    opacity: 1,
    filter: 'blur(0px)',
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
    }
  },
  exit: {
    opacity: 0,
    filter: 'blur(6px)',
    y: -6,
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1],
    }
  }
};

interface HeroProps {
  theme?: 'light' | 'dark';
  onStartDesign: () => void;
  onExploreProducts: () => void;
}

export default function Hero({ theme = 'dark', onStartDesign, onExploreProducts }: HeroProps) {
  const isDark = theme === 'dark';
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const dotColorFrom = isDark ? 'rgba(186, 141, 61, 0.45)' : 'rgba(186, 141, 61, 0.38)';
  const dotColorTo = isDark ? 'rgba(186, 141, 61, 0.10)' : 'rgba(186, 141, 61, 0.08)';
  const glowColorVal = isDark ? 'rgba(186, 141, 61, 0.15)' : 'rgba(186, 141, 61, 0.10)';

  return (
    <section className={`relative min-h-[85vh] lg:min-h-[92dvh] pt-28 pb-10 px-4 md:px-12 flex flex-col justify-between overflow-hidden transition-colors duration-500 font-sans ${
      isDark ? 'bg-[#0d0c0b]' : 'bg-[#faf8f5]'
    }`}>
      {/* Dynamic Golden Particle Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <DotField 
          dotRadius={1.8}
          dotSpacing={16}
          bulgeStrength={55}
          glowRadius={160}
          sparkle={true}
          waveAmplitude={0}
          gradientFrom={dotColorFrom}
          gradientTo={dotColorTo}
          glowColor={glowColorVal}
        />
      </div>

      {/* Ambient Radial Mesh Gradients */}
      <div className={`absolute top-1/6 left-5 w-[45vw] h-[45vw] rounded-full filter blur-[130px] pointer-events-none opacity-40 animate-pulse duration-[10000ms] ${
        isDark ? 'bg-[#ba8d3d]/15' : 'bg-[#ba8d3d]/5'
      }`}></div>
      <div className={`absolute bottom-1/4 right-5 w-[35vw] h-[35vw] rounded-full filter blur-[110px] pointer-events-none opacity-30 animate-pulse duration-[14000ms] ${
        isDark ? 'bg-[#eed29d]/10' : 'bg-[#ba8d3d]/4'
      }`}></div>

      {/* 2. MAIN ASYMMETRICAL GRID */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center my-auto relative z-10">
        
        {/* COLUMN A: EDITORIAL & BALANCED DUAL PATHS (7 columns on large screen) */}
        <div className="lg:col-span-7 flex flex-col items-start text-right">
          
          {/* Eyebrow badge */}
          <div className={`mb-6 flex items-center gap-2 border px-3.5 py-1.5 rounded-full transition-colors duration-300 ${
            isDark 
              ? 'bg-[#ba8d3d]/10 border-[#ba8d3d]/25' 
              : 'bg-[#ba8d3d]/5 border-[#ba8d3d]/15'
          }`}>
            <Sparkles size={11} className={`${isDark ? 'text-[#eed29d]' : 'text-[#ba8d3d]'} animate-spin duration-[6000ms]`} />
            <span className={`text-[9px] uppercase tracking-[0.15em] font-bold ${
              isDark ? 'text-[#eed29d]' : 'text-[#ba8d3d]'
            }`}>
              تلفیق نوستالژی پارسی با قواره‌های نوین امروزی
            </span>
          </div>

          {/* Headline & Description animated carousel area */}
          <div className="w-full relative min-h-[195px] sm:min-h-[160px] md:min-h-[190px] lg:min-h-[220px] flex flex-col justify-start">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                variants={textContainerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full flex flex-col items-start text-right"
              >
                {/* Headline - max 3 lines to fit elegantly */}
                <h1 className={`text-4xl sm:text-5xl md:text-6xl font-display font-black leading-[1.05] tracking-tight mb-5 text-right w-full ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {slides[currentSlide].headlineWords.map((wordObj, wordIdx) => (
                    <span key={wordIdx} className="inline-block">
                      <motion.span
                        variants={wordVariants}
                        className={`inline-block ${
                          wordObj.highlighted
                            ? 'bg-gradient-to-r from-[#ba8d3d] via-[#eed29d] to-[#ba8d3d] bg-clip-text text-transparent'
                            : ''
                        }`}
                      >
                        {wordObj.text}
                      </motion.span>
                      {wordObj.br ? <br /> : " "}
                    </span>
                  ))}
                </h1>

                <p className={`text-xs md:text-sm leading-relaxed max-w-[62ch] mb-8 text-right w-full ${
                  isDark ? 'text-gray-400' : 'text-slate-600'
                }`}>
                  {slides[currentSlide].longDesc.split(' ').map((word, wordIdx) => (
                    <span key={wordIdx} className="inline-block">
                      <motion.span
                        variants={wordVariants}
                        className="inline-block"
                      >
                        {word}
                      </motion.span>
                      {" "}
                    </span>
                  ))}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* DUAL DISCIPLINE CHOICES - STRICT EQUAL FOOTING */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-10 text-right">
            
            {/* OPTION A: PRE-DESIGNED PREMIUM APPAREL */}
            <div 
              onClick={onExploreProducts}
              className={`group relative rounded-[2rem] p-6 border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden ${
                isDark 
                  ? 'bg-[#141211] border-white/5 hover:border-[#ba8d3d]/30 hover:bg-[#1a1816]' 
                  : 'bg-white border-slate-200/60 hover:border-[#ba8d3d]/30 hover:shadow-lg'
              }`}
            >
              {/* Double Bezel lines highlight inside */}
              <div className="absolute inset-[4px] rounded-[calc(2rem-4px)] border border-transparent group-hover:border-[#ba8d3d]/10 pointer-events-none transition-all duration-300" />
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 ${
                    isDark ? 'bg-white/5 text-[#eed29d]' : 'bg-slate-50 text-[#ba8d3d]'
                  }`}>
                    <ShoppingBag size={15} />
                  </div>
                  <span className={`text-[9px] font-mono uppercase tracking-widest font-bold ${isDark ? 'text-[#eed29d]' : 'text-[#ba8d3d]'}`}>[ کالکشن آماده ]</span>
                </div>
                
                <h3 className={`text-sm font-bold mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>تیشرت و لباس‌های آماده</h3>
                <p className={`text-[11px] leading-relaxed mb-6 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  خرید البسه آماده با کارهای کالیگرافی برجسته، نقوش اساطیری و مینیاتور ملی دکوراتیو.
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ba8d3d] group-hover:text-[#eed29d] transition-colors mt-auto">
                <span>ورود به ویترین لباس‌ها</span>
                <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5" />
              </div>
            </div>

            {/* OPTION B: POD DESIGNER CUSTOM STUDIO */}
            <div 
              onClick={onStartDesign}
              className={`group relative rounded-[2rem] p-6 border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden ${
                isDark 
                  ? 'bg-[#141211] border-white/5 hover:border-[#eed29d]/30 hover:bg-[#1a1816]' 
                  : 'bg-white border-slate-200/60 hover:border-[#eed29d]/30 hover:shadow-lg'
              }`}
            >
              {/* Double Bezel lines highlight inside */}
              <div className="absolute inset-[4px] rounded-[calc(2rem-4px)] border border-transparent group-hover:border-[#ba8d3d]/10 pointer-events-none transition-all duration-300" />

              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 ${
                    isDark ? 'bg-white/5 text-[#eed29d]' : 'bg-slate-50 text-[#ba8d3d]'
                  }`}>
                    <Palette size={15} />
                  </div>
                  <span className={`text-[9px] font-mono uppercase tracking-widest font-bold ${isDark ? 'text-[#eed29d]' : 'text-[#ba8d3d]'}`}>[ شخصی‌سازی/POD ]</span>
                </div>

                <h3 className={`text-sm font-bold mb-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>کارگاه طراحی آنلاین (POD)</h3>
                <p className={`text-[11px] leading-relaxed mb-6 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                  طرح دلخواه یا ابیات محبوب خود را روی تیشرت‌های لش‌فیت با مکان‌یابی دلخواه چاپ اختصاصی کنید.
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#ba8d3d] group-hover:text-[#eed29d] transition-colors mt-auto">
                <span>شروع طراحی تیشرت خاص شما</span>
                <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5" />
              </div>
            </div>

          </div>

          {/* Social Proof Stats */}
          <div className="flex gap-8 items-center text-right">
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-700'}`}>
                <Award size={13} />
              </span>
              <div>
                <div className={`text-xs font-bold leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>اصالت گارانتی دوخت</div>
                <div className="text-[9px] text-gray-500 mt-0.5">ضمانت ۱۰۰ روزه تعویض الیاف</div>
              </div>
            </div>
            <div className={`w-px h-8 ${isDark ? 'bg-white/5' : 'bg-slate-200'}`} />
            <div className="flex items-center gap-2">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-white/5 text-gray-400' : 'bg-slate-100 text-slate-700'}`}>
                <Compass size={13} />
              </span>
              <div>
                <div className={`text-xs font-bold leading-none ${isDark ? 'text-white' : 'text-slate-900'}`}>طراحی اصیل پارسی</div>
                <div className="text-[9px] text-gray-500 mt-0.5">موتیف‌ها از کتب تاریخی معتبر</div>
              </div>
            </div>
          </div>

        </div>

        {/* COLUMN B: ASYMMETRICAL DRAMATIC GALLERY DISPLAY - Inspired by SHOPMA */}
        <div className="lg:col-span-5 relative w-full flex justify-center items-center">
          
          {/* Main frame: Double-Bezel Pattern (Doppelrand) */}
          <div className="relative w-full max-w-[420px] aspect-[4/5] group select-none">
            
            {/* Outer bezel */}
            <div className={`absolute inset-0 rounded-[2.5rem] p-2.5 border transition-all duration-500 ${
              isDark ? 'bg-[#151413] border-white/5' : 'bg-white border-slate-200/80 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.06)]'
            }`}>
              
              {/* Inner bezel core - Clickable to view details */}
              <div 
                onClick={onExploreProducts}
                className={`w-full h-full rounded-[calc(2.5rem-0.625rem)] overflow-hidden relative border flex items-center justify-center cursor-pointer transition-all duration-300 hover:ring-2 hover:ring-[#ba8d3d]/30 active:scale-[0.995] select-none ${
                isDark ? 'bg-[#0d0c0b] border-white/5' : 'bg-[#faf8f5] border-slate-100'
              }`}>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 w-full h-full"
                  >
                    {/* Simulated Streetwear Model wearing Persian Calligraphy shirt */}
                    <div className="absolute inset-0 w-full h-full scale-[1.01] transition-transform duration-[12000ms] ease-out hover:scale-105 pointer-events-none">
                      <img 
                        src={storefrontProductImage(slides[currentSlide].image)}
                        alt={slides[currentSlide].title} 
                        referrerPolicy="no-referrer"
                        onError={handleProductImageError}
                        className="product-media-source w-full h-full object-cover grayscale mix-blend-luminosity contrast-[1.12] transition-all duration-700 group-hover:grayscale-0 group-hover:mix-blend-normal opacity-90"
                      />
                      {/* Gradient subtle vignette overlay to make text stand out */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
                    </div>

                    {/* Highly readable, luxurious glassified card for text overlays - solves contrast/visibility completely */}
                    <div className="absolute bottom-5 right-5 left-5 text-right z-10 flex flex-col items-start gap-1 p-4 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-xl pointer-events-auto hover:translate-y-[-2px] hover:border-[#eed29d]/30 hover:bg-black/75 transition-all duration-300">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[9px] text-[#eed29d] font-bold">
                        <span className={`w-1.5 h-1.5 rounded-full ${slides[currentSlide].dotColor} animate-pulse`}></span>
                        <span>{slides[currentSlide].tag}</span>
                      </div>
                      <div className="mt-2 text-white text-right w-full">
                        <div className="text-[10px] font-mono text-[#eed29d]/80 tracking-wide font-medium">{slides[currentSlide].designer}</div>
                        <div className="text-sm font-bold tracking-tight mt-0.5 font-display" style={{ color: '#ffffff' }}>{slides[currentSlide].title}</div>
                        <div className="text-[10px] mt-1 leading-relaxed font-sans font-medium" style={{ color: '#d1d5db' }}>{slides[currentSlide].desc}</div>
                      </div>
                    </div>

                    {/* Top-Right Decorative Floating Badge */}
                    <div className="absolute top-5 right-5 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold tracking-wider bg-black/45 backdrop-blur-md border border-white/15 text-[#eed29d]">
                        ID: {slides[currentSlide].id}
                      </span>
                    </div>

                  </motion.div>
                </AnimatePresence>

                {/* Left side category/view action button */}
                <div className="absolute top-4 left-4 z-15 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-[#ba8d3d]/90 text-black flex items-center justify-center shadow-lg transform hover:scale-110 active:scale-95 transition-all cursor-pointer duration-300 pointer-events-auto"
                       onClick={(e) => {
                         e.stopPropagation();
                         onExploreProducts();
                       }}
                       title="مشاهده تیشرت‌ها">
                    <ArrowLeft size={14} className="-rotate-135" />
                  </div>
                </div>

                {/* Elegant slide indicators in the top-middle */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/10 shadow-md">
                  {slides.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentSlide(idx);
                      }}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 cursor-pointer pointer-events-auto ${
                        idx === currentSlide 
                          ? 'bg-[#ba8d3d] w-3.5' 
                          : 'bg-white/45 hover:bg-white/75'
                      }`}
                      title={`اسلاید ${idx + 1}`}
                    />
                  ))}
                </div>

                {/* Left/Right floating subtle arrow navigation - Luxury styled */}
                <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 z-20 flex justify-between pointer-events-none">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      prevSlide();
                    }}
                    className="w-7 h-7 rounded-full bg-black/40 hover:bg-[#ba8d3d] hover:text-black text-white flex items-center justify-center border border-white/10 backdrop-blur-md pointer-events-auto transition-all transform hover:scale-110 active:scale-95 cursor-pointer shadow-md"
                    title="قبلی"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      nextSlide();
                    }}
                    className="w-7 h-7 rounded-full bg-black/40 hover:bg-[#ba8d3d] hover:text-black text-white flex items-center justify-center border border-white/10 backdrop-blur-md pointer-events-auto transition-all transform hover:scale-110 active:scale-95 cursor-pointer shadow-md"
                    title="بعدی"
                  >
                    <ChevronLeft size={14} />
                  </button>
                </div>

              </div>
            </div>

            {/* Aesthetic offset badge - Inspired by SHOPMA/HUBLOT layouts - Synchronized with Slide! */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentSlide}
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className={`absolute -bottom-5 -left-5 z-20 border rounded-2xl p-4 hidden sm:flex flex-col items-start text-right max-w-[160px] shadow-lg ${
                  isDark ? 'bg-[#1b1917] border-white/10 text-[#eed29d]' : 'bg-white border-slate-200 text-[#ba8d3d]'
                }`}
              >
                <div className="text-[9px] font-mono text-[#ba8d3d] uppercase tracking-wider font-bold">مدل اختصاصی</div>
                <div className="text-[11px] font-bold mt-1 leading-tight" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                  {slides[currentSlide].modelBadge}
                </div>
                <div className="text-[9px] text-gray-500 mt-1 font-sans leading-relaxed">
                  {slides[currentSlide].modelDesc}
                </div>
              </motion.div>
            </AnimatePresence>

          </div>
          
        </div>

      </div>

      {/* Clean high-contrast section bottom spacing for editorial transition */}
      <div className="w-full max-w-7xl mx-auto mt-6" />

    </section>
  );
}
