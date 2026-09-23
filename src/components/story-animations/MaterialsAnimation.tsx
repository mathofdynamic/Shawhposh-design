import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf } from '@phosphor-icons/react';

interface MaterialsAnimationProps {
  isDark: boolean;
  hoveredHotspot: string | null;
  setHoveredHotspot: (hotspot: string | null) => void;
  mousePosition: { x: number; y: number };
}

export default function MaterialsAnimation({ 
  isDark, 
  hoveredHotspot, 
  setHoveredHotspot,
  mousePosition
}: MaterialsAnimationProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
      {/* Cotton Fiber Zoom Vector Simulation */}
      <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center">
        {/* Concentric natural rings of premium cotton thread structure */}
        <svg className="absolute w-full h-full opacity-15 animate-[spin_60s_linear_infinite]" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="90" fill="none" stroke={isDark ? "#ba8d3d" : "#8c6221"} strokeWidth="1" strokeDasharray="5 10" />
          <circle cx="100" cy="100" r="70" fill="none" stroke={isDark ? "white" : "#ba8d3d"} strokeWidth="1" strokeDasharray="3 7" />
          <circle cx="100" cy="100" r="50" fill="none" stroke={isDark ? "white" : "#ba8d3d"} strokeWidth="0.75" strokeDasharray="1 5" />
        </svg>

        {/* Weave Lattice Micro Representation underlay */}
        <div className="absolute inset-0 grid grid-cols-5 gap-3 p-10 opacity-[0.08]" style={{
          transform: `translate(${mousePosition.x * 15}px, ${mousePosition.y * 15}px)`
        }}>
          {Array.from({ length: 25 }).map((_, i) => (
            <div key={i} className={`border rounded-md ${isDark ? 'border-amber-400' : 'border-[#8c6221]'} aspect-square`} />
          ))}
        </div>

        {/* Floating golden leaves/fibers */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute ${isDark ? 'text-[#ba8d3d]/20' : 'text-[#8c6221]/30'}`}
            style={{
              top: `${15 + i * 22}%`,
              left: `${10 + (i * 28) % 70}%`,
            }}
            animate={{
              y: [0, -10, 0],
              rotate: [0, 8, -8, 0],
            }}
            transition={{
              duration: 5 + i,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Leaf size={16} weight="light" />
          </motion.div>
        ))}

        {/* Central Interactive Hotspot Node representing double-knit yarn */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          onHoverStart={() => setHoveredHotspot('fiber')}
          onHoverEnd={() => setHoveredHotspot(null)}
          className={`w-40 h-40 rounded-full border flex flex-col items-center justify-center shadow-2xl relative cursor-pointer z-10 transition-all duration-500 ${
            isDark 
              ? 'bg-[#181715]/95 border-[#ba8d3d]/40 hover:border-[#ba8d3d]/80 text-[#eed29d]' 
              : 'bg-white border-[#f0e4cf] hover:border-[#ba8d3d]/70 text-[#ba8d3d]'
          }`}
          style={{
            transform: `translate(${mousePosition.x * 10}px, ${mousePosition.y * 10}px)`
          }}
        >
          {/* Custom organic Concentric Ring Bezel to mimic hand-sketched uploaded look */}
          <div className={`absolute inset-1.5 rounded-full border border-dashed ${isDark ? 'border-[#ba8d3d]/30' : 'border-[#ba8d3d]/40'}`} />
          
          <Leaf size={32} className="animate-pulse mb-3 select-none text-[#ba8d3d]" weight="light" />
          <span className="text-[10px] font-bold tracking-wider text-center select-none leading-relaxed">
            تار و پود پنبه بومی
            <br />
            <span className="text-[9px] font-normal opacity-70">۱۰۰٪ الیاف شانه شده دیم</span>
          </span>
          
          {/* Interactive Ripple rings */}
          <div className="absolute inset-0 rounded-full border border-[#ba8d3d]/30 animate-ping opacity-40 pointer-events-none" />
        </motion.div>

        {/* Live specs tooltips depending on hover nodes */}
        <AnimatePresence>
          {hoveredHotspot === 'fiber' && (
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              className={`absolute -bottom-14 rounded-2xl border px-5 py-3.5 text-center text-xs font-semibold shadow-xl min-w-[240px] z-20 transition-all ${
                isDark ? 'bg-[#1c1b18] border-[#ba8d3d]/30 text-gray-300' : 'bg-white border-[#f0ecd5] text-slate-800'
              }`}
            >
              الیاف پنبه دیم ممتاز ایران‌زمین، با اتمام ضدپرز و تنفس‌پذیری بسیار بالا
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
