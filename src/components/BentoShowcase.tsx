import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkle, 
  Cpu, 
  Quotes, 
  Star, 
  Sliders, 
  CheckCircle, 
  Fingerprint, 
  PaintBrush, 
  Leaf, 
  ArrowLeft,
  ArrowRight,
  Flame,
  Waveform,
  HardDrive
} from '@phosphor-icons/react';
import { GlassButton } from './ui/apple-tahoe-liquid-glass-button';
import { motion, AnimatePresence } from 'motion/react';
import CalligraphyAnimation from './story-animations/CalligraphyAnimation';
import MaterialsAnimation from './story-animations/MaterialsAnimation';
import DtgAnimation from './story-animations/DtgAnimation';
import CustomizerAnimation from './story-animations/CustomizerAnimation';

interface BentoShowcaseProps {
  theme?: 'light' | 'dark';
  onStartDesign: () => void;
  onSelectCategory: (category: 'all' | 'minimalist' | 'calligraphy' | 'graphic' | 'pod') => void;
}

type ArtAct = 'calligraphy' | 'materials' | 'dtg' | 'customizer';

export default function BentoShowcase({ theme = 'dark', onStartDesign, onSelectCategory }: BentoShowcaseProps) {
  const isDark = theme === 'dark';
  const [activeAct, setActiveAct] = useState<ArtAct>('calligraphy');
  const [selectedMotif, setSelectedMotif] = useState<string>('هیچ');
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Handle active act automatic rotation with a gentle timing indicator, unless hovered
  const [isHovered, setIsHovered] = useState(false);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);
  const acts: ArtAct[] = ['calligraphy', 'materials', 'dtg', 'customizer'];

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveAct((prev) => {
        const currentIndex = acts.indexOf(prev);
        const nextIndex = (currentIndex + 1) % acts.length;
        return acts[nextIndex];
      });
    }, 9000); // Gentle 9s story beats

    return () => clearInterval(interval);
  }, [isHovered]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePosition({ x, y });
  };

  // Define local motifs for Act I and IV
  const motifs = [
    { text: 'هیچ', label: 'هیچ مأگاه', translation: 'The mystical void of being' },
    { text: 'عشق', label: 'کوبیسم عشق', translation: 'Divine passion in street format' },
    { text: 'صبر', label: 'خطاطی صبر', translation: 'Patience in chaotic lines' },
    { text: 'رند', label: 'رندی عاقلان', translation: 'The playful wise rebel' }
  ];

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={`pt-10 pb-32 md:pt-14 md:pb-48 px-6 md:px-12 relative transition-colors duration-1000 overflow-hidden ${
        isDark ? 'bg-[#0a0a09]' : 'bg-[#faf9f6]'
      }`}
      id="exhibition-story"
    >
      {/* Cinematic Static Film Grain Layer */}
      <div className="fixed inset-0 pointer-events-none z-40 opacity-[0.02] mix-blend-overlay bg-noise" />

      {/* Atmospheric Ambient Light Fields */}
      <div className={`absolute top-0 right-1/4 w-[45rem] h-[45rem] rounded-full mix-blend-multiply filter blur-[150px] opacity-25 transition-all duration-1000 pointer-events-none ${
        isDark ? 'bg-[#ba8d3d]/20 mix-blend-screen' : 'bg-[#eed29d]/40'
      }`} style={{ transform: `translate(${mousePosition.x * 40}px, ${mousePosition.y * 40}px)` }} />
      <div className={`absolute bottom-0 left-1/4 w-[35rem] h-[35rem] rounded-full mix-blend-multiply filter blur-[130px] opacity-15 transition-all duration-1000 pointer-events-none ${
        isDark ? 'bg-[#6d512a]/30 mix-blend-screen' : 'bg-[#ba8d3d]/15'
      }`} style={{ transform: `translate(${mousePosition.x * -30}px, ${mousePosition.y * -30}px)` }} />

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header with Elite Typographic Arrangement */}
        <div className="mb-24 flex flex-col md:flex-row-reverse md:items-end justify-between gap-8 text-right">
          <motion.div 
            initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="flex-1"
          >
            <span className={`text-[10px] uppercase tracking-[0.25em] font-mono font-bold inline-flex items-center gap-2 mb-4 pr-3 border-r-2 transition-colors duration-500 ${
              isDark ? 'text-[#eed29d] border-[#ba8d3d]/60' : 'text-[#ba8d3d] border-[#ba8d3d]'
            }`}>
              <Flame size={12} weight="fill" className="animate-pulse" />
              تار و پود هنر و فن‌آوری / آفرینش
            </span>
            <h2 className={`text-4xl md:text-5xl lg:text-[3.75rem] font-display font-medium tracking-tight leading-none transition-colors duration-500 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              از خط تا تاریک‌خانه دیجیتال
            </h2>
          </motion.div>
          
          <motion.p 
            initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className={`text-sm md:text-base leading-relaxed max-w-md md:text-right text-right transition-colors duration-500 ${
              isDark ? 'text-gray-400' : 'text-slate-500'
            }`}
          >
            روایتی پویا از برخورد میراث بصری ایران‌زمین با مرزهای مدرن پوشاک خیابانی و چاپ تقاضامحور. برای درک فلسفه ما، پرده‌ها را ورق بزنید.
          </motion.p>
        </div>

        {/* Storyboard Split Arena */}
        <div 
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          
          {/* LEFT COLUMN: The Living Kinetic Art Projection Sandbox */}
          <div className="lg:col-span-6 flex flex-col justify-between relative min-h-[480px] lg:min-h-[580px] rounded-[3rem] p-8 overflow-hidden transition-all duration-700 shadow-[0_24px_50px_rgba(0,0,0,0.06)] group/canvas">
            {/* Double Bezel Glass Frame */}
            <div className={`absolute inset-0 transition-colors duration-700 ${
              isDark ? 'bg-gradient-to-b from-[#141311] via-[#0d0c0b] to-[#12110f] border border-white/5' : 'bg-gradient-to-b from-white via-[#fcfbf9] to-[#faf9f6] border border-slate-200/80'
            } rounded-[3rem]`} />
            
            {/* Noise Overlay */}
            <div className={`absolute inset-0 opacity-[0.03] pointer-events-none z-10 ${isDark ? 'bg-radial' : 'bg-linear'}`} />

            {/* Subtle Grid Indicator */}
            <div className="absolute top-8 left-8 flex items-center gap-2 font-mono text-[9px] tracking-wider text-gray-500 z-20">
              <span>نمای کالیبره // اسکن سه‌بعدی الیاف</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            </div>

            {/* ART WORKSPACE VIEWPORT */}
            <div className="flex-1 flex items-center justify-center relative w-full h-full my-8">
              
              <AnimatePresence mode="wait">
                {/* ACT I: CALLIGRAPHY PROJECTION */}
                {activeAct === 'calligraphy' && (
                  <motion.div 
                    key="calligraphy-act"
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(15px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.05, filter: 'blur(15px)' }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  >
                    <CalligraphyAnimation isDark={isDark} mousePosition={mousePosition} />
                  </motion.div>
                )}

                {/* ACT II: MATERIALS COMPOSITION */}
                {activeAct === 'materials' && (
                  <motion.div 
                    key="materials-act"
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(15px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.05, filter: 'blur(15px)' }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <MaterialsAnimation 
                      isDark={isDark} 
                      hoveredHotspot={hoveredHotspot} 
                      setHoveredHotspot={setHoveredHotspot}
                      mousePosition={mousePosition}
                    />
                  </motion.div>
                )}

                {/* ACT III: DIGITAL ALCHEMY (DTG) */}
                {activeAct === 'dtg' && (
                  <motion.div 
                    key="dtg-act"
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(15px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.05, filter: 'blur(15px)' }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                  >
                    <DtgAnimation isDark={isDark} mousePosition={mousePosition} />
                  </motion.div>
                )}

                {/* ACT IV: INTERACTIVE DESIGNS PREVIEW SANDBOX */}
                {activeAct === 'customizer' && (
                  <motion.div 
                    key="customizer-act"
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(15px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.05, filter: 'blur(15px)' }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <CustomizerAnimation 
                      isDark={isDark} 
                      selectedMotif={selectedMotif} 
                      setSelectedMotif={setSelectedMotif}
                      motifs={motifs}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* LOWER CAPTION BOX WITH DETAILED INSIGHTS */}
            <div className="relative z-10 w-full flex items-center justify-between border-t border-dashed border-gray-700/35 pt-6 text-right flex-row-reverse">
              <span className="text-[10px] pb-1 tracking-wider text-[#eed29d] font-bold">تاسیس ۱۴۰۳ // خانه طراحی شاه‌پوش</span>
              <div className="flex items-center gap-1">
                {acts.map((act) => (
                  <div 
                    key={act}
                    onClick={() => setActiveAct(act)}
                    className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                      activeAct === act 
                        ? 'w-6 bg-[#ba8d3d]' 
                        : 'w-1.5 bg-gray-500/40 hover:bg-gray-500/80'
                    }`} 
                  />
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Interactive Chapters Selector & Dynamic Visual Storyteller */}
          <div className="lg:col-span-6 flex flex-col justify-between gap-6">
            
            <div className="space-y-4">
              
              {/* ACT SELECTORS: Chapter Cards */}
              {[
                {
                  id: 'calligraphy' as ArtAct,
                  actNum: 'پرده نخست',
                  title: 'جوهره زنده خوشنویسی سنتی',
                  desc: 'تلفیق کلام هنرمندان خلاق ایرانی با سبک کژوال و تایپوگرافی برجسته کوفی، نستعلیق و شکسته بر بستر خیابان‌ها.',
                  icon: PaintBrush
                },
                {
                  id: 'materials' as ArtAct,
                  actNum: 'پرده دوم',
                  title: 'الیاف تافته سوپر پنبه ۲ نخ',
                  desc: 'پنبه دیم مزارع بومی کشور با تکمیل ضد پرز و پوز، مناسب استفاده روزمره به شکل اورسایز با ماندگاری مادام‌العمر.',
                  icon: Leaf
                },
                {
                  id: 'dtg' as ArtAct,
                  actNum: 'پرده سوم',
                  title: 'کارگاه چاپ مستقیم الیاف (DTG)',
                  desc: 'پرینت دیجیتال تقاضامحور (POD) که تارهای لباس را بدون چسبندگی پلاستیکی رنگ‌آمیزی می‌کند؛ خنک و ضد حساسیت.',
                  icon: Cpu
                },
                {
                  id: 'customizer' as ArtAct,
                  actNum: 'پرده چهارم',
                  title: 'بوم سفارشی و تعاملی پوشش تو',
                  desc: 'تعبیه شعر، نقش‌های اصیل یا لوگو در موقعیت‌های گوناگون لباس بدون پیش‌زمینه گرافیکی با پلتفرم شبیه‌ساز آنلاین.',
                  icon: Sliders
                }
              ].map((act, index) => {
                const ActIcon = act.icon;
                const isActive = activeAct === act.id;
                
                return (
                  <div
                    key={act.id}
                    onClick={() => setActiveAct(act.id)}
                    className={`p-6.5 rounded-[2rem] border transition-all duration-500 cursor-pointer text-right flex flex-row-reverse items-start gap-5 relative overflow-hidden group/chapter ${
                      isActive 
                        ? isDark
                          ? 'bg-gradient-to-r from-[#1c1a17] to-[#141311] border-[#ba8d3d]/50 shadow-[0_12px_24px_-10px_rgba(186,141,61,0.15)] scale-[1.01]'
                          : 'bg-white border-[#ba8d3d]/45 shadow-lg scale-[1.01]'
                        : isDark
                          ? 'bg-[#11100f] border-white/5 hover:border-white/10'
                          : 'bg-[#faf9f6]/40 border-slate-200/60 hover:border-slate-300'
                    }`}
                  >
                    {/* Tiny animated tracking beam for the active chapter */}
                    {isActive && (
                      <motion.div 
                        layoutId="active-chapter-indicator"
                        className="absolute right-0 top-0 bottom-0 w-[4px] bg-[#ba8d3d]"
                        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      />
                    )}

                    {/* Highlyprominent active double-bezel concentric chapter icon container */}
                    <div className="shrink-0 transition-all duration-500 pb-1">
                      {isActive ? (
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-[#ba8d3d]/60 bg-[#ba8d3d]/15 ring-2 ring-[#ba8d3d]/30 shadow-lg scale-110 rotate-[-4deg] transition-all duration-500">
                          <div className="w-10 h-10 border border-dashed border-[#ba8d3d]/70 rounded-xl flex items-center justify-center bg-[#ba8d3d]/10">
                            <ActIcon size={20} weight="bold" className={`${isDark ? 'text-amber-300' : 'text-[#875f1b]'} filter drop-shadow-[0_0_4px_rgba(186,141,61,0.4)]`} />
                          </div>
                        </div>
                      ) : (
                        <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-500 group-hover/chapter:-rotate-6 ${
                          isDark
                            ? 'bg-white/5 border-white/5 text-gray-400 group-hover/chapter:bg-[#ba8d3d]/10 group-hover/chapter:border-[#ba8d3d]/30 group-hover/chapter:text-[#eed29d]'
                            : 'bg-white border-slate-200 text-slate-500 group-hover/chapter:bg-[#ba8d3d]/5 group-hover/chapter:border-[#ba8d3d]/20 group-hover/chapter:text-[#ba8d3d]'
                        }`}>
                          <ActIcon size={20} className="stroke-[1.5]" />
                        </div>
                      )}
                    </div>

                    {/* Description Texts */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-row-reverse mb-1.5">
                        <span className={`text-[9px] font-mono font-bold tracking-widest ${isActive ? 'text-[#ba8d3d]' : 'text-gray-500'}`}>
                          {act.actNum}
                        </span>
                        <h3 className={`text-sm md:text-base font-bold transition-colors ${
                          isActive 
                            ? isDark ? 'text-white' : 'text-slate-900' 
                            : isDark ? 'text-gray-400' : 'text-slate-600'
                        }`}>
                          {act.title}
                        </h3>
                      </div>
                      <p className={`text-[12px] leading-relaxed transition-colors ${
                        isActive 
                          ? isDark ? 'text-gray-300' : 'text-slate-600' 
                          : isDark ? 'text-gray-500' : 'text-slate-500'
                      }`}>
                        {act.desc}
                      </p>
                    </div>

                  </div>
                );
              })}

            </div>

            {/* CALL TO ACTION OR STATS CORNER */}
            <div className={`p-8 rounded-[2.5rem] border flex flex-col sm:flex-row-reverse sm:items-center justify-between gap-6 transition-colors duration-1000 ${
              isDark ? 'bg-gradient-to-l from-[#131211] to-[#0c0b0a] border-white/5' : 'bg-white border-[#e5e4e0]'
            }`}>
              <div className="text-right">
                <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>پوششی با بوم اختصاصی خود طراجی کن</p>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>کارگاه چاپ مستقیم DTG شهپوش پاسخگوی بلندپروازی بصری توست</p>
              </div>
              <GlassButton
                onClick={onStartDesign}
                glassColor="rgb(186, 141, 61)"
                className="px-8 py-3.5 rounded-full text-xs font-bold transition-all duration-300 hover:scale-105 active:scale-95 text-[#0e0d0c] shadow-lg whitespace-nowrap self-end sm:self-auto"
              >
                شروع طراحی آنلاین
              </GlassButton>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
