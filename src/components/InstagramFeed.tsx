import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Instagram, ExternalLink, RefreshCw } from 'lucide-react';

// To extend window interface for TypeScript support
declare global {
  interface Window {
    instgrm?: {
      Embeds: {
        process: () => void;
      };
    };
  }
}

interface InstagramPost {
  id: string;
  permalink: string;
  captionFallback: string;
  tag: string;
}

const EMBEDDED_POSTS: InstagramPost[] = [
  {
    id: 'post-1',
    permalink: 'https://www.instagram.com/reel/DVQlQD3jdaP/',
    captionFallback: 'مشاهده طرح خوشنویسی منقش به کلمه «هیچ»',
    tag: 'کالکشن کالیگرافی'
  },
  {
    id: 'post-2',
    permalink: 'https://www.instagram.com/reel/DTLRcDIjSk3/',
    captionFallback: 'کالکشن اساطیری کژوال «هما»',
    tag: 'کالکشن اساطیر'
  },
  {
    id: 'post-3',
    permalink: 'https://www.instagram.com/reel/DTIsNk3jaOi/',
    captionFallback: 'طراحی مینیمال با تایپوگرافی گلدوزی سنتی',
    tag: 'کالکشن مینیمال'
  }
];

interface InstagramFeedProps {
  isDark: boolean;
}

export default function InstagramFeed({ isDark }: InstagramFeedProps) {
  const [loaded, setLoaded] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  // Dynamic script handling and embed processing
  useEffect(() => {
    let script = document.getElementById('instagram-embed-script') as HTMLScriptElement | null;

    const processEmbeds = () => {
      if (window.instgrm) {
        window.instgrm.Embeds.process();
        setLoaded(true);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = 'instagram-embed-script';
      script.src = 'https://www.instagram.com/embed.js';
      script.async = true;
      script.onload = () => {
        // Give browser a split second to parse the script global
        setTimeout(processEmbeds, 100);
      };
      document.body.appendChild(script);
    } else {
      // Script exists, let's process immediately or soon
      if (window.instgrm) {
        processEmbeds();
      } else {
        script.addEventListener('load', processEmbeds);
      }
    }

    // Interval fallback to handle view changes/mounts
    const interval = setInterval(() => {
      if (window.instgrm) {
        window.instgrm.Embeds.process();
        setLoaded(true);
      }
    }, 1500);

    return () => {
      clearInterval(interval);
      if (script) {
        script.removeEventListener('load', processEmbeds);
      }
    };
  }, [retryTrigger]);

  // Handle manual force-refresh of the embeds if needed
  const handleForceRefresh = () => {
    setRetryTrigger(prev => prev + 1);
  };

  return (
    <div className="w-full">
      {/* Editorial Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ba8d3d] animate-pulse"></span>
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium text-gray-400 dark:text-gray-500 font-mono">
              LIVE INSTAGRAM EMBED
            </span>
          </div>
          <h3 className={`text-2xl md:text-3xl font-black font-display tracking-tight transition-colors ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            فید رسمـی اینستـاگـرام شهپـوش
          </h3>
          <p className={`text-xs max-w-xl leading-relaxed duration-300 ${
            isDark ? 'text-gray-400' : 'text-slate-600'
          }`}>
            آخرین دستاوردها، رونمایی از کالکشن‌های پوشاک کژوال و کات‌های مستند از آتلیه را مستقیماً از رسانه رسمی ما تماشا کنید.
          </p>
        </div>

        {/* Brand Direct CTA */}
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleForceRefresh}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="بروزرسانی ماژول نمایش"
            className={`p-3 rounded-full border transition-all duration-300 ${
              isDark 
                ? 'bg-white/5 border-white/10 text-gray-400 hover:text-white' 
                : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm'
            }`}
          >
            <RefreshCw size={14} className={loaded ? "" : "animate-spin"} />
          </motion.button>

          <motion.a
            href="https://www.instagram.com/shahposh.ir/"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-full text-xs font-bold border transition-all duration-300 ${
              isDark 
                ? 'bg-[#ba8d3d]/10 border-[#ba8d3d]/30 text-[#eed29d] hover:bg-[#ba8d3d]/20' 
                : 'bg-amber-50 border-[#ba8d3d]/20 text-[#ba8d3d] hover:bg-amber-100/50 shadow-sm'
            }`}
          >
            <Instagram size={14} />
            <span>پیوند رسمی صفحه ما</span>
            <ExternalLink size={12} className="opacity-75" />
          </motion.a>
        </div>
      </div>

      {/* Grid of 3 Live Instagram Embeds */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start justify-items-center">
        {EMBEDDED_POSTS.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-[400px] flex flex-col items-center"
          >
            <div className={`w-full overflow-hidden rounded-[2rem] border p-2 transition-all duration-500 ${
              isDark 
                ? 'bg-[#151312] border-white/[0.05] shadow-2xl' 
                : 'bg-white border-slate-200/80 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.04)]'
            }`}>
              {/* Card Header Profile Tag */}
              <div className="flex items-center justify-between px-4 py-3 mb-2 border-b border-dashed dark:border-white/[0.05] border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#ba8d3d] to-[#eed29d] p-[1px] flex items-center justify-center">
                    <div className="w-full h-full rounded-full bg-[#1b1917] flex items-center justify-center">
                      <span className="text-[8px] font-black text-[#eed29d]">ش</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold tracking-tight ${isDark ? 'text-[#eed29d]' : 'text-slate-800'}`}>
                    shahpoosh.ir
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-[#ba8d3d]/10 text-[#ba8d3d]">
                  {post.tag}
                </span>
              </div>

              {/* Instagram Official Blockquote Element */}
              <div className="relative w-full rounded-2xl overflow-hidden flex justify-center bg-transparent min-h-[350px]">
                {!loaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-xs text-gray-500 rounded-2xl bg-slate-500/5 animate-pulse">
                    <Instagram size={24} className="text-[#ba8d3d] mb-3 animate-bounce" />
                    <span>در حال بارگذاری نماپرداخت اینستاگرام...</span>
                  </div>
                )}
                
                <blockquote
                  className="instagram-media"
                  data-instgrm-captioned
                  data-instgrm-permalink={`${post.permalink}?utm_source=ig_embed&amp;utm_campaign=loading`}
                  data-instgrm-version="14"
                  style={{
                    background: isDark ? '#141211' : '#FFFFFF',
                    border: 0,
                    borderRadius: '16px',
                    margin: '0 auto',
                    maxWidth: '100%',
                    minWidth: '280px',
                    padding: 0,
                    width: '100%',
                    display: 'block'
                  }}
                >
                  <div className="p-4 flex flex-col items-center justify-center">
                    <a
                      href={`${post.permalink}?utm_source=ig_embed&amp;utm_campaign=loading`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#ba8d3d] flex items-center gap-1.5"
                    >
                      <Instagram size={12} />
                      <span>{post.captionFallback}</span>
                    </a>
                  </div>
                </blockquote>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
