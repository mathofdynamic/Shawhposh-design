import React, { useState, useRef, useEffect } from 'react';
import { Quotes, Star, SealCheck } from '@phosphor-icons/react';

interface Review {
  id: number;
  name: string;
  city: string;
  avatarText: string;
  avatarBg: string;
  product: string;
  content: string;
  rating: number;
}

const reviewsData: Review[] = [
  {
    id: 1,
    name: "شهاب م.",
    city: "تهران",
    avatarText: "ش",
    avatarBg: "from-amber-500/10 to-amber-600/5",
    product: "تیشرت کتیبه طرح هیچ",
    content: "تیشرت طرح هیچ به دستم رسید. کیفیت سوپر پنبه واقعا شگفت‌انگیزه، کاملاً اورسایز و لش فیت شیکه و ایستادگی عالی روی شانه داره.",
    rating: 5
  },
  {
    id: 2,
    name: "سارا ا.",
    city: "شیراز",
    avatarText: "س",
    avatarBg: "from-[#eed29d]/10 to-amber-500/5",
    product: "بوم سفارشی شاه‌پوش دیجیتال",
    content: "کارگاه چاپ شاهپوش واقعا دقیقه. رنگ کالیگرافی با کیفیت بالایی ترکیب شده بود و هیچگونه احساس پلاستیکی یا چسبندگی روی پارچه نداره.",
    rating: 5
  },
  {
    id: 3,
    name: "دانیال ک.",
    city: "اصفهان",
    avatarText: "د",
    avatarBg: "from-amber-600/10 to-amber-700/5",
    product: "تیشرت اورسایز کالیگرافی نستعلیق",
    content: "تضمین دوخت و وا نرفتن پارچه کاملا درسته. چند بار شستم و اصلا آبرفت یا دفرمه شدن لبه‌های یقه نداشت. یک محصول ملی با کلاس جهانی.",
    rating: 5
  },
  {
    id: 4,
    name: "مهرآسا ص.",
    city: "تبریز",
    avatarText: "م",
    avatarBg: "from-[#eed29d]/20 to-amber-500/10",
    product: "تیشرت کلمه‌نگاری کوفی مدرن",
    content: "کیفیت بافت دو‌نخ سنگین برای پاییز و بهار فوق‌العاده‌ست. بسته‌بندی نفیس و اصیل خانه طراحی شاه‌پوش هم لایق تحسینه.",
    rating: 5
  },
  {
    id: 5,
    name: "کمیل ر.",
    city: "مشهد",
    avatarText: "ک",
    avatarBg: "from-amber-500/15 to-amber-600/10",
    product: "شبیه‌ساز آنلاین کلمه‌نگاری خیابانی",
    content: "نرم‌افزار کاستومایزر شبیه‌ساز آنلاین واقعاً کار رو راحت کرده. خیلی راحت تونستم بیت شعر محبوبم رو روی تنه لباس در موقعیت دلخواه قرار بدم.",
    rating: 5
  },
  {
    id: 6,
    name: "غزل ح.",
    city: "یزد",
    avatarText: "غ",
    avatarBg: "from-rose-500/10 to-amber-500/5",
    product: "تیشرت کلاسیک دبل‌نیت شاهپور",
    content: "برای هدیه تولد برادرم خریدم. ظرافت کالیگرافی و دوخت بسیار تمیزه. از وقتی خریده مدام تنشه و تعریف می‌کنه. ممنونم از دقت بالاتون.",
    rating: 5
  }
];

interface ReviewScrollTickerProps {
  isDark: boolean;
}

export default function ReviewScrollTicker({ isDark }: ReviewScrollTickerProps) {
  const [hoveredCardIndex, setHoveredCardIndex] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [groupWidth, setGroupWidth] = useState(0);

  const groupRef = useRef<HTMLDivElement>(null);
  const speedRef = useRef(1); // multiplier
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Monitor hovered state to smoothly lerp animation speed
  useEffect(() => {
    let animationFrameId: number;
    const targetSpeed = hoveredCardIndex !== null ? 0.08 : 1.0; // Slow down to 8% for highly legible smooth reading

    const updateSpeed = () => {
      const diff = targetSpeed - speedRef.current;
      if (Math.abs(diff) > 0.005) {
        speedRef.current += diff * 0.08; // smooth easing
        animationFrameId = requestAnimationFrame(updateSpeed);
      } else {
        speedRef.current = targetSpeed;
      }
    };

    animationFrameId = requestAnimationFrame(updateSpeed);
    return () => cancelAnimationFrame(animationFrameId);
  }, [hoveredCardIndex]);

  // Dynamically measure the scroll group width including the gap (24px)
  useEffect(() => {
    if (groupRef.current) {
      const handleResize = () => {
        if (groupRef.current) {
          setGroupWidth(groupRef.current.scrollWidth + 24);
        }
      };
      handleResize();
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(groupRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Frame loop for 100% glitch-free continuous custom translation
  useEffect(() => {
    const loop = (time: number) => {
      if (lastTimeRef.current !== null) {
        const delta = time - lastTimeRef.current;
        // Normal base speed: 0.05px per millisecond adjusted by transition multiplier
        const step = 0.05 * delta * speedRef.current;

        setOffset((prev) => {
          let next = prev - step;
          const currentGroupWidth = groupWidth || (groupRef.current ? groupRef.current.scrollWidth + 24 : 2088);
          
          // Wrap around seamlessly once we move past the size of one complete group
          if (Math.abs(next) >= currentGroupWidth) {
            next = next + currentGroupWidth;
          }
          return next;
        });
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      lastTimeRef.current = null;
    };
  }, [groupWidth]);

  return (
    <div className="mt-20">
      <div className={`relative rounded-[2.5rem] border p-8 md:p-10 overflow-hidden transition-all duration-1000 ${
        isDark 
          ? 'bg-gradient-to-b from-[#121110] to-[#0d0c0b] border-white/5' 
          : 'bg-gradient-to-b from-white to-[#FAF9F6] border-[#e6e4de] shadow-[0_20px_40px_-20px_rgba(0,0,0,0.03)]'
      }`}>
        <div className={`absolute inset-0 bg-grid-lines opacity-[0.2] transition-opacity duration-1000 ${isDark ? '' : 'invert opacity-[0.03]'}`} />

        <div className="relative z-10 flex flex-col gap-10 w-full">
          
          {/* Header Section with Satisfaction Stats */}
          <div className="flex flex-col md:flex-row-reverse md:items-center justify-between gap-6 border-b border-dashed border-gray-700/25 pb-6">
            <div className="flex items-center flex-row-reverse gap-4 text-right shrink-0">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center transition-all duration-500 shadow-sm ${
                isDark 
                  ? 'bg-gradient-to-b from-white/10 to-white/5 border-white/10 text-amber-300' 
                  : 'bg-[#fff] border-[#eae6de] text-[#ba8d3d] shadow-md'
              }`}>
                <Quotes size={24} className="stroke-[1.5]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono tracking-widest text-[#ba8d3d] font-semibold mb-1 uppercase">FEEDBACK HUB // وب یادداشت هنر همراه</span>
                <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>صدای خریداران ارگانیک شاه‌پوش</p>
              </div>
            </div>

            {/* Satisfaction Badge */}
            <div className={`inline-flex items-center gap-3 border rounded-2xl px-5 py-3 self-start md:self-auto ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-[#fcfaf5] border-[#ebe7df] shadow-sm'
            }`}>
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 animate-pulse">
                <SealCheck size={18} weight="fill" />
              </div>
              <div className="flex flex-col text-right animate-fade-in">
                <span className={`text-xs font-bold leading-none ${isDark ? 'text-gray-300' : 'text-slate-800'}`}>۱۰۰٪ رضایت کامل مراجعین</span>
                <span className={`text-[9px] mt-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>بر اساس سنجش دیجیتال سفارشات کالیگرافی</span>
              </div>
            </div>
          </div>

          {/* INFINITE SCROLLING CONTAINER (RTL text read order, LTR layout track vector) */}
          <div className="relative overflow-hidden w-full max-w-full [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] py-4">
            
            {/* The continuous scrolling track */}
            <div 
              className="flex gap-6 whitespace-nowrap"
              style={{
                direction: 'ltr',
                transform: `translateX(${offset}px)`,
                willChange: 'transform'
              }}
            >
              {/* PRIMARY LIST GROUP */}
              <div ref={groupRef} className="flex gap-6 shrink-0">
                {reviewsData.map((rev, index) => {
                  const uniqueIndex = index;
                  const isCardHovered = hoveredCardIndex === uniqueIndex;
                  return (
                    <div
                      key={`g1-${rev.id}`}
                      onMouseEnter={() => setHoveredCardIndex(uniqueIndex)}
                      onMouseLeave={() => setHoveredCardIndex(null)}
                      className={`inline-flex flex-col justify-between text-right border rounded-[2rem] p-6 text-right transition-all duration-500 select-none cursor-help ${
                        isCardHovered
                          ? isDark
                            ? 'bg-[#1e1c18] border-amber-500/60 shadow-[0_12px_24px_-10px_rgba(186,141,61,0.25)] scale-[1.03] translate-y-[-4px]'
                            : 'bg-white border-[#ba8d3d]/50 shadow-[0_12px_24px_-10px_rgba(186,141,61,0.15)] scale-[1.03] translate-y-[-4px]'
                          : isDark
                            ? 'bg-[#11100f]/90 border-white/5 hover:border-white/10'
                            : 'bg-[#FAF9F6]/80 border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                      style={{
                        width: '320px',
                        minWidth: '320px',
                        whiteSpace: 'normal',
                      }}
                    >
                      {/* Upper section: rating */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-[9px] font-mono px-2.5 py-1 rounded-full border ${
                          isDark 
                            ? 'bg-white/5 border-white/5 text-amber-300' 
                            : 'bg-amber-500/5 border-[#ba8d3d]/25 text-[#735118]'
                        }`}>
                          صداقت خریدار
                        </span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} size={11} weight="fill" className="text-amber-500 filter drop-shadow-[0_0_2px_rgba(245,158,11,0.4)]" />
                          ))}
                        </div>
                      </div>

                      {/* Content */}
                      <p className={`text-[12.5px] leading-relaxed mb-6 flex-1 text-right font-medium transition-colors ${
                        isCardHovered
                          ? isDark ? 'text-gray-100' : 'text-slate-900'
                          : isDark ? 'text-gray-400' : 'text-slate-600'
                      }`} style={{ direction: 'rtl' }}>
                        «{rev.content}»
                      </p>

                      {/* Customer details */}
                      <div className="border-t border-dashed border-gray-700/20 pt-4 mt-auto">
                        <div className="flex items-center flex-row-reverse justify-between">
                          <div className="flex items-center flex-row-reverse gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${rev.avatarBg} border ${
                              isDark ? 'border-white/10' : 'border-[#ebe6de]'
                            } flex items-center justify-center text-[13px] font-bold text-amber-500`}>
                              {rev.avatarText}
                            </div>
                            <div className="flex flex-col text-right">
                              <span className={`text-xs font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                                {rev.name}
                              </span>
                              <span className="text-[10px] text-gray-500 mt-0.5">
                                از {rev.city}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[8.5px] font-semibold tracking-wider max-w-[120px] truncate ${
                            isDark ? 'text-amber-400/80' : 'text-[#8c672b]'
                          }`}>
                            {rev.product}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SECONDARY MATCHING GROUP FOR SEAMLESS 100% INFINITE LOOP */}
              <div aria-hidden="true" className="flex gap-6 shrink-0">
                {reviewsData.map((rev, index) => {
                  const uniqueIndex = index + reviewsData.length;
                  const isCardHovered = hoveredCardIndex === uniqueIndex;
                  return (
                    <div
                      key={`g2-${rev.id}`}
                      onMouseEnter={() => setHoveredCardIndex(uniqueIndex)}
                      onMouseLeave={() => setHoveredCardIndex(null)}
                      className={`inline-flex flex-col justify-between text-right border rounded-[2rem] p-6 text-right transition-all duration-500 select-none cursor-help ${
                        isCardHovered
                          ? isDark
                            ? 'bg-[#1e1c18] border-amber-500/60 shadow-[0_12px_24px_-10px_rgba(186,141,61,0.25)] scale-[1.03] translate-y-[-4px]'
                            : 'bg-white border-[#ba8d3d]/50 shadow-[0_12px_24px_-10px_rgba(186,141,61,0.15)] scale-[1.03] translate-y-[-4px]'
                          : isDark
                            ? 'bg-[#11100f]/90 border-white/5 hover:border-white/10'
                            : 'bg-[#FAF9F6]/80 border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                      style={{
                        width: '320px',
                        minWidth: '320px',
                        whiteSpace: 'normal',
                      }}
                    >
                      {/* Upper section: rating */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`text-[9px] font-mono px-2.5 py-1 rounded-full border ${
                          isDark 
                            ? 'bg-white/5 border-white/5 text-amber-300' 
                            : 'bg-amber-500/5 border-[#ba8d3d]/25 text-[#735118]'
                        }`}>
                          صداقت خریدار
                        </span>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} size={11} weight="fill" className="text-amber-500 filter drop-shadow-[0_0_2px_rgba(245,158,11,0.4)]" />
                          ))}
                        </div>
                      </div>

                      {/* Content */}
                      <p className={`text-[12.5px] leading-relaxed mb-6 flex-1 text-right font-medium transition-colors ${
                        isCardHovered
                          ? isDark ? 'text-gray-100' : 'text-slate-900'
                          : isDark ? 'text-gray-400' : 'text-slate-600'
                      }`} style={{ direction: 'rtl' }}>
                        «{rev.content}»
                      </p>

                      {/* Customer details */}
                      <div className="border-t border-dashed border-gray-700/20 pt-4 mt-auto">
                        <div className="flex items-center flex-row-reverse justify-between">
                          <div className="flex items-center flex-row-reverse gap-3">
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${rev.avatarBg} border ${
                              isDark ? 'border-white/10' : 'border-[#ebe6de]'
                            } flex items-center justify-center text-[13px] font-bold text-amber-500`}>
                              {rev.avatarText}
                            </div>
                            <div className="flex flex-col text-right">
                              <span className={`text-xs font-bold ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                                {rev.name}
                              </span>
                              <span className="text-[10px] text-gray-500 mt-0.5">
                                از {rev.city}
                              </span>
                            </div>
                          </div>

                          <span className={`text-[8.5px] font-semibold tracking-wider max-w-[120px] truncate ${
                            isDark ? 'text-amber-400/80' : 'text-[#8c672b]'
                          }`}>
                            {rev.product}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
