import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomizerAnimationProps {
  isDark: boolean;
  selectedMotif: string;
  setSelectedMotif: (motif: string) => void;
  motifs: Array<{ text: string; label: string; translation: string }>;
}

export default function CustomizerAnimation({ 
  isDark, 
  selectedMotif, 
  setSelectedMotif,
  motifs 
}: CustomizerAnimationProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      {/* Live garment preview model with springy selector inputs */}
      <div className="relative w-56 h-56 md:w-72 md:h-72 flex items-center justify-center select-none z-10">
        <svg viewBox="0 0 100 100" className={`w-[85%] h-[85%] drop-shadow-[0_25px_45px_rgba(186,141,61,0.08)] transition-colors duration-500 ${isDark ? 'text-[#1d1b19]' : 'text-slate-200'}`} fill="currentColor">
          <path d="M25,20 C30,12 70,12 75,20 C82,23 90,28 92,34 C88,38 85,40 82,38 C80,50 78,75 76,88 C50,91 50,91 24,88 C22,75 20,50 18,38 C15,40 12,38 8,34 C10,28 18,23 25,20 Z" />
        </svg>
        
        {/* Active Motif Display with elastic animation */}
        <div className="absolute top-[32%] left-[28%] right-[28%] bottom-[28%] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span 
              key={selectedMotif}
              initial={{ scale: 0.5, opacity: 0, rotate: -15, filter: 'blur(5px)' }}
              animate={{ scale: 1, opacity: 1, rotate: 0, filter: 'blur(0px)' }}
              exit={{ scale: 1.5, opacity: 0, rotate: 15, filter: 'blur(5px)' }}
              transition={{ type: 'spring', stiffness: 220, damping: 14 }}
              className="text-[#ba8d3d] text-4xl md:text-5xl font-bold select-none text-center font-display drop-shadow-[0_5px_15px_rgba(186,141,61,0.2)]"
            >
              {selectedMotif}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Micro Interactive Selector Grid with luxurious Farsi tag labels */}
      <div className="flex gap-2.5 mt-6 relative z-20">
        {motifs.map((m) => (
          <button
            key={m.text}
            onClick={() => setSelectedMotif(m.text)}
            className={`px-4.5 py-1.5 rounded-full text-[10px] font-bold transition-all duration-300 ${
              selectedMotif === m.text
                ? 'bg-[#ba8d3d] text-[#0e0d0c] shadow-lg scale-105'
                : isDark 
                  ? 'bg-[#1b1917] border border-white/5 hover:border-[#ba8d3d]/50 text-gray-400 hover:text-white'
                  : 'bg-white border border-slate-200 hover:border-[#ba8d3d]/50 text-slate-600 hover:text-slate-900'
            }`}
          >
            {m.text}
          </button>
        ))}
      </div>
    </div>
  );
}
