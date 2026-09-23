import React from 'react';
import { motion } from 'motion/react';
import { Cpu } from '@phosphor-icons/react';

interface DtgAnimationProps {
  isDark: boolean;
  mousePosition: { x: number; y: number };
}

export default function DtgAnimation({ isDark, mousePosition }: DtgAnimationProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden">
      {/* Precision grid pattern lines in background */}
      <div className="absolute inset-0 opacity-[0.06] flex items-center justify-center">
        <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" stroke={isDark ? "white" : "black"} strokeWidth="0.25">
          <path d="M 0,20 L 100,20 M 0,40 L 100,40 M 0,60 L 100,60 M 0,80 L 100,80 M 20,0 L 20,100 M 40,0 L 40,100 M 60,0 L 60,100 M 80,0 L 80,100" />
        </svg>
      </div>

      {/* Laser scanner grid line */}
      <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center select-none/none z-10">
        <svg viewBox="0 0 100 100" className={`w-[85%] h-[85%] drop-shadow-[0_25px_45px_rgba(0,0,0,0.18)] transition-colors duration-500 ${isDark ? 'text-[#1c1a18]' : 'text-slate-200'}`} fill="currentColor">
          <path d="M25,20 C30,12 70,12 75,20 C82,23 90,28 92,34 C88,38 85,40 82,38 C80,50 78,75 76,88 C50,91 50,91 24,88 C22,75 20,50 18,38 C15,40 12,38 8,34 C10,28 18,23 25,20 Z" />
        </svg>

        {/* Inkjet atomization beam (nozzles visualization) floating/printing */}
        <div className="absolute top-[32%] left-[28%] right-[28%] bottom-[28%] flex flex-col items-center justify-center z-10" style={{
          transform: `translate(${mousePosition.x * 12}px, ${mousePosition.y * 12}px)`
        }}>
          {/* Farsi labels or symbols */}
          <span className="text-amber-500 text-3xl font-display font-black tracking-wide text-center drop-shadow-[0_0_8px_rgba(234,171,38,0.4)]">
            پرینت مستقیم
          </span>
          <span className={`text-[9px] font-mono tracking-widest mt-2 transition-colors ${isDark ? 'text-amber-400' : 'text-[#8c6221]'}`}>
            پیوند بافت و رنگدانه‌ها
          </span>
        </div>

        {/* Moving laser scanline overlay */}
        <motion.div 
          animate={{ 
            top: ['15%', '85%', '15%']
          }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-[10%] right-[10%] h-[3px] bg-gradient-to-r from-transparent via-[#ba8d3d] to-transparent shadow-[0_0_15px_#ba8d3d] z-20"
        />

        {/* Micro printhead dots sparkling underneath the laser */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-amber-500"
            style={{
              top: `${30 + i * 6}%`,
              left: `${35 + (i * 14) % 30}%`,
            }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              delay: i * 0.25,
            }}
          />
        ))}
      </div>

      <div className={`mt-4 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider z-20 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
        <Cpu size={14} className="text-[#ba8d3d] animate-spin" />
        <span>تثبیت نهایی اتمی رنگ طبیعی روی تاروپود پارچه</span>
      </div>
    </div>
  );
}
