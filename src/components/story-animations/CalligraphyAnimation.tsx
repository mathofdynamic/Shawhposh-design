import React from 'react';
import { motion } from 'motion/react';

interface CalligraphyAnimationProps {
  isDark: boolean;
  mousePosition: { x: number; y: number };
}

export default function CalligraphyAnimation({ isDark, mousePosition }: CalligraphyAnimationProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden">
      {/* Floating Calligraphic Geometry in Background with pure Persian letters */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-30">
        <motion.div 
          animate={{ 
            rotate: [2, 10, -10, 2],
            scale: [1, 1.08, 0.95, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className={`font-display text-[9rem] md:text-[13rem] leading-none opacity-[0.14] text-center select-none font-bold transition-colors duration-500 ${
            isDark ? 'text-[#ba8d3d]' : 'text-[#8c6221]'
          }`}
          style={{
            transform: `translate(${mousePosition.x * -60}px, ${mousePosition.y * -60}px)`
          }}
        >
          خطاطی
        </motion.div>
      </div>

      {/* Floating particles representing ink dots */}
      <div className="absolute inset-0 z-0">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-1.5 h-1.5 rounded-full ${isDark ? 'bg-[#ba8d3d]/20' : 'bg-[#ba8d3d]/40'}`}
            style={{
              top: `${20 + i * 15}%`,
              left: `${15 + (i * 12) % 70}%`,
            }}
            animate={{
              y: [0, -15, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Premium T-Shirt Model Frame projection */}
      <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center transition-transform duration-700 select-none z-10">
        {/* Realistic minimalist T-Shirt Line Asset with SVG */}
        <svg viewBox="0 0 100 100" className={`w-[85%] h-[85%] drop-shadow-[0_25px_45px_rgba(0,0,0,0.18)] transition-colors duration-500 ${isDark ? 'text-[#1d1b19]' : 'text-slate-200'}`} fill="currentColor">
          <path d="M25,20 C30,12 70,12 75,20 C82,23 90,28 92,34 C88,38 85,40 82,38 C80,50 78,75 76,88 C50,91 50,91 24,88 C22,75 20,50 18,38 C15,40 12,38 8,34 C10,28 18,23 25,20 Z" />
        </svg>

        {/* Ink splatter graphic animation under the main motif */}
        <div className="absolute top-[35%] left-[30%] right-[30%] bottom-[30%] flex items-center justify-center opacity-20">
          <svg viewBox="0 0 100 100" className={`w-full h-full ${isDark ? 'text-[#ba8d3d]' : 'text-[#8c6221]'}`} fill="currentColor">
            <path d="M50,30 C40,40 35,45 30,50 C25,55 32,65 42,60 C48,58 52,68 60,65 C68,62 72,50 65,42 C58,35 60,25 50,30 Z" />
          </svg>
        </div>

        {/* Fused Calligraphy Graphic Overlaid exactly on chest */}
        <div className="absolute top-[32%] left-[28%] right-[28%] bottom-[28%] flex flex-col items-center justify-center font-display select-none">
          <motion.span 
            animate={{ 
              y: [0, -3, 3, 0],
              scale: [1, 1.03, 0.97, 1],
              filter: isDark 
                ? [
                    'drop-shadow(0 4px 6px rgba(186,141,61,0.3))', 
                    'drop-shadow(0 12px 20px rgba(186,141,61,0.5))', 
                    'drop-shadow(0 4px 6px rgba(186,141,61,0.3))'
                  ]
                : [
                    'drop-shadow(0 4px 6px rgba(140,98,33,0.2))', 
                    'drop-shadow(0 10px 15px rgba(140,98,33,0.35))', 
                    'drop-shadow(0 4px 6px rgba(140,98,33,0.2))'
                  ]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className={`text-4xl md:text-5xl font-black font-display tracking-widest text-center ${
              isDark ? 'text-[#eed29d]' : 'text-[#8c6221]'
            }`}
            style={{
              transform: `translate(${mousePosition.x * 24}px, ${mousePosition.y * 24}px)`
            }}
          >
            هیچ
          </motion.span>
          <span className={`text-[8px] font-mono tracking-widest mt-3 transition-colors ${
            isDark ? 'text-gray-500' : 'text-slate-500'
          }`}>
            اصالت نقش شاه‌پوش
          </span>
        </div>
      </div>
    </div>
  );
}
