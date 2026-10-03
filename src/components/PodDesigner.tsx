import { useState } from 'react';
import { Sliders, Sparkles, ShoppingBag, Plus, Minus, Move, CaseSensitive, Palette } from 'lucide-react';
import { PersianGraphics } from '../data';
import { CustomDesign, CartItem } from '../types';
import { GlassButton } from './ui/apple-tahoe-liquid-glass-button';

interface PodDesignerProps {
  theme?: 'light' | 'dark';
  onAddToCart: (item: Omit<CartItem, 'id'>) => void;
  initialProduct?: any; // To preload a base design if redirected from details
}

export default function PodDesigner({ theme = 'dark', onAddToCart, initialProduct }: PodDesignerProps) {
  const isDark = theme === 'dark';
  // Configurable colors for T-shirt
  const tshirtColors = [
    { name: 'جغرافیای مشکی (ذغالی)', hex: '#1C1A1A' },
    { name: 'سپید استخوانی', hex: '#F5F2EB' },
    { name: 'سبز کهربایی', hex: '#233A2E' },
    { name: 'زرشکی شیراز', hex: '#5E1B26' },
    { name: 'خردلی اخرایی', hex: '#BA8D3D' },
  ];

  // Configurable colors for custom text
  const textColors = [
    { name: 'طلایی شهپوش', hex: '#eed29d' },
    { name: 'سفید خالص', hex: '#ffffff' },
    { name: 'مشکی زغالی', hex: '#0e0d0c' },
    { name: 'قرمز یاقوتی', hex: '#E61919' },
  ];

  // States
  const [selectedTshirtColor, setSelectedTshirtColor] = useState(
    initialProduct ? (initialProduct.colors[0] || tshirtColors[0]) : tshirtColors[0]
  );
  const [designMode, setDesignMode] = useState<'graphic' | 'text'>('graphic');
  const [selectedGraphic, setSelectedGraphic] = useState(PersianGraphics[0]);
  const [customText, setCustomText] = useState('هیچ مگو');
  const [selectedTextColor, setSelectedTextColor] = useState(textColors[0]);
  const [designScale, setDesignScale] = useState(100); // 50% - 150%
  const [designPosX, setDesignPosX] = useState(0); // -20 to 20 % offset
  const [designPosY, setDesignPosY] = useState(0); // -20 to 20 % offset
  const [selectedSize, setSelectedSize] = useState('L');
  const [quantity, setQuantity] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // Computed Pricing
  const baseTshirtPrice = 410000;
  const printingAddonPrice = designMode === 'graphic' ? 80000 : 50000;
  const perTshirtPrice = baseTshirtPrice + printingAddonPrice;
  const totalPrice = perTshirtPrice * quantity;

  // Add customized item to cart
  const handleAddToCart = () => {
    onAddToCart({
      productId: `pod-${Date.now()}`,
      productName: `تیشرت سفارشی شهپوش (${designMode === 'graphic' ? selectedGraphic.name : 'طرح متنی اختصاصی'})`,
      price: perTshirtPrice,
      quantity,
      color: selectedTshirtColor,
      size: selectedSize,
      image: 'https://picsum.photos/seed/custom_pod/800/800', // standard visual thumbnail representation
      isCustom: true,
      customDesign: {
        text: designMode === 'text' ? customText : '',
        textColor: selectedTextColor.hex,
        textSize: designScale,
        textPosition: { x: designPosX, y: designPosY },
        selectedGraphicId: designMode === 'graphic' ? selectedGraphic.id : null,
        tshirtColor: selectedTshirtColor.name,
        tshirtColorHex: selectedTshirtColor.hex,
        basePrice: perTshirtPrice,
      }
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
    }, 3000);
  };

  return (
    <section className={`min-h-[100dvh] pt-32 pb-24 px-6 md:px-12 bg-grid-lines transition-colors duration-300 ${
      isDark ? 'bg-[#0e0d0c]' : 'bg-[#fafafa]'
    }`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="mb-12 text-right">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#eed29d] font-semibold border-r-2 border-[#ba8d3d] pr-3 mb-3 block">
            آتلیه آنلاین چاپی
          </span>
          <h1 className={`text-3xl md:text-5xl font-display font-medium tracking-tight mb-2 transition-colors ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            کارگاه طراحی آنلاین تیشرت و لباس سفارشی
          </h1>
          <p className={`text-xs md:text-sm mt-3 max-w-[70ch] leading-relaxed transition-colors ${
            isDark ? 'text-gray-400' : 'text-slate-600'
          }`}>
            با انتخاب پارچه‌های ارگانیک تیشرت، جایگذاری نقوش سنتی کالیگرافی ایرانی یا درج اشعار انتخابی خودتان به صورت آنی، جامه شخصی شده دلخواهت را بسازید.
          </p>
        </div>

        {/* Studio Grid split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Right/Left Preview Box: Column 5 */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            
            {/* Doppelrand Bezel visualizer frame */}
            <div className="double-bezel-outer w-full">
              <div 
                className={`double-bezel relative aspect-square overflow-hidden flex items-center justify-center p-8 border transition-all duration-500 rounded-[2.5rem] ${
                  isDark ? 'border-white/5 shadow-lg' : 'border-slate-200/80 shadow-md'
                }`}
                style={{ backgroundColor: isDark ? '#141312' : '#f4f3ef' }}
              >
                {/* Visualizer lighting details */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#eed29d]/0.01 to-transparent pointer-events-none"></div>
                <div className={`absolute top-4 right-4 border px-2 py-1 rounded text-[8px] font-mono transition-colors ${
                  isDark ? 'bg-[#0e0d0c]/80 border-white/10 text-gray-500' : 'bg-white/90 border-slate-200 text-slate-500'
                }`}>
                  DESIGNER_ZOOM_MOCKUP: ACTIVE
                </div>

                {/* Highly responsive SVG Interactive T-shirt layer based on selected states */}
                <div className="relative w-80 h-80 flex items-center justify-center pointer-events-none transition-transform duration-300">
                  
                  {/* Dynamic Colorable T-Shirt SVG */}
                  <svg 
                    viewBox="0 0 100 100" 
                    className="w-full h-full drop-shadow-[0_20px_35px_rgba(0,0,0,0.4)] transition-colors duration-500"
                    style={{ color: selectedTshirtColor.hex }}
                  >
                    <path 
                      fill="currentColor"
                      d="M 20 20 L 32 12 Q 38 18 50 18 Q 62 18 68 12 L 80 20 L 78 35 L 70 34 L 70 85 L 30 85 L 30 34 L 22 35 Z"
                    />
                    {/* Inner texture highlights / shadow folds of a high-end streetwear garment */}
                    <path 
                      fill="none" 
                      stroke="rgba(255, 255, 255, 0.08)" 
                      strokeWidth="0.8"
                      // Adds neck rib cuffs & sleeve lines
                      d="M 30 40 L 30 85 M 70 40 L 70 85 M 32 12 L 30 34 M 68 12 L 70 34" 
                    />
                    {/* Shadow draping simulating 3D depth */}
                    <path
                      fill="rgba(0,0,0,0.12)"
                      d="M 32 12 Q 38 18 50 18 Q 62 18 68 12 Q 62 15 50 15 Q 38 15 32 12 Z"
                    />
                  </svg>

                  {/* Graphic Print Placement Area - Bound inside the bounds of chest */}
                  <div 
                    className="absolute top-[35%] w-36 h-36 flex flex-col items-center justify-center text-center select-none transition-all duration-300"
                    style={{
                      transform: `translate(${designPosX}px, ${designPosY}px) scale(${designScale / 100})`,
                    }}
                  >
                    {designMode === 'graphic' ? (
                      /* Display Selected Traditional Artwork overlay */
                      <div className="flex flex-col items-center">
                        {/* Artwork representation */}
                        <div 
                          className="text-3xl text-center flex items-center justify-center font-display drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] transition-colors duration-300"
                          style={{ color: selectedTshirtColor.hex === '#F5F2EB' ? '#1C1A1A' : '#eed29d' }}
                        >
                          {selectedGraphic.name.includes('هیچ') ? 'هیچ' : selectedGraphic.name.includes('عشق') ? 'عشق' : 'آرت اصیل'}
                        </div>
                        <span className="text-[6px] tracking-wider uppercase opacity-55 font-mono text-gray-400 mt-2 block">
                          * {selectedGraphic.id.toUpperCase()} PRINT *
                        </span>
                      </div>
                    ) : (
                      /* Display Typed Farsi calligraphy overlay */
                      <div 
                        className="font-display px-2 py-1 leading-normal break-words text-center flex flex-col items-center justify-center select-none"
                        style={{ color: selectedTextColor.hex }}
                      >
                        <span className="text-3xl tracking-tight leading-tight select-none block drop-shadow-md">
                          {customText || 'شهپوش'}
                        </span>
                        <span className="text-[6px] tracking-widest text-[#eed29d]/55 uppercase font-mono mt-1.5">
                          * POD UNIQUE TEXT *
                        </span>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            </div>

            {/* Scale and position guidelines helper tag */}
            <div className={`border rounded-2xl p-4 flex flex-col gap-2 transition-colors ${
              isDark ? 'bg-[#121110]/80 border-white/5' : 'bg-slate-50 border-slate-200 shadow-sm'
            }`}>
              <span className="text-[10px] text-gray-500 font-mono text-right">CONTROLLER PANEL CO-ORDINATES</span>
              <div className={`grid grid-cols-3 gap-2 text-center text-[10px] font-mono transition-colors ${
                isDark ? 'text-gray-400' : 'text-slate-600'
              }`}>
                <div>اندازه: {designScale}%</div>
                <div>افقی: {designPosX}px</div>
                <div>عمودی: {designPosY}px</div>
              </div>
            </div>

          </div>

          {/* Left Column: Custom controls and steps - Column 7 */}
          <div className="lg:col-span-7 flex flex-col gap-6.5">

            {/* step 1: Choose Tshirt Color */}
            <div className={`border rounded-3xl p-6.5 transition-colors ${
              isDark ? 'bg-[#141312] border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-mono text-gray-500">STEP_01 / FABRIC</span>
                <span className="text-xs text-[#ba8d3d] font-bold">۱. رنگ پارچه تیشرت را انتخاب کنید</span>
              </div>
              
              <div className="flex flex-wrap gap-3.5 pt-2">
                {tshirtColors.map((color) => {
                  const isSelected = selectedTshirtColor.name === color.name;
                  return (
                    <button
                      key={color.name}
                      onClick={() => setSelectedTshirtColor(color)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-medium flex items-center gap-2 border transition-all duration-300 cursor-pointer ${
                        isSelected 
                          ? isDark ? 'border-[#ba8d3d] bg-white/5 text-white font-semibold' : 'border-[#ba8d3d] bg-slate-50 text-slate-950 font-bold'
                          : isDark ? 'border-white/5 bg-[#0e0d0c]/40 text-gray-400 hover:border-white/10' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="w-3.5 h-3.5 rounded-full border border-white/10 shrink-0" style={{ backgroundColor: color.hex }} />
                      <span>{color.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* step 2: Custom Graphic or Calligraphy Design Selection */}
            <div className={`border rounded-3xl p-6.5 transition-colors ${
              isDark ? 'bg-[#141312] border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex justify-between items-center mb-5">
                <span className="text-[10px] font-mono text-gray-500">STEP_02 / PRINT MODE</span>
                <span className="text-xs text-[#ba8d3d] font-bold">۲. منبع طرح گرافیکی روی تیشرت</span>
              </div>

              {/* Mode switch pills */}
              <div className={`grid grid-cols-2 gap-3 p-1.5 rounded-2xl border mb-6 transition-colors ${
                isDark ? 'bg-[#0e0d0c] border-white/5' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  onClick={() => setDesignMode('graphic')}
                  className={`py-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-luxury cursor-pointer ${
                    designMode === 'graphic' 
                      ? 'bg-[#ba8d3d] text-[#0e0d0c] shadow-sm' 
                      : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Sparkles size={13} className={designMode === 'graphic' ? 'stroke-2' : 'stroke-1.5'} />
                  <span>طرح‌های آماده</span>
                </button>
                <button
                  onClick={() => setDesignMode('text')}
                  className={`py-3.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-luxury cursor-pointer ${
                    designMode === 'text' 
                      ? 'bg-[#ba8d3d] text-[#0e0d0c] shadow-sm' 
                      : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <CaseSensitive size={13} className={designMode === 'text' ? 'stroke-2' : 'stroke-1.5'} />
                  <span>تایپ شعر دلخواه</span>
                </button>
              </div>

              {/* Graphic list slider */}
              {designMode === 'graphic' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto">
                  {PersianGraphics.map((graphic) => {
                    const isSelected = selectedGraphic.id === graphic.id;
                    return (
                      <button
                        key={graphic.id}
                        onClick={() => setSelectedGraphic(graphic)}
                        className={`p-3.5 rounded-2xl border text-right transition-all duration-300 cursor-pointer flex flex-col justify-between h-auto ${
                          isSelected 
                            ? isDark ? 'bg-[#ba8d3d]/10 border-[#ba8d3d] text-white shadow-sm' : 'bg-[#ba8d3d]/5 border-[#ba8d3d] text-slate-900 font-bold'
                            : isDark ? 'bg-[#0e0d0c]/30 border-white/5 text-gray-400 hover:border-white/10' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full mb-1">
                          <span className={`text-xs font-bold ${isSelected ? 'text-[#ba8d3d]' : isDark ? 'text-gray-300' : 'text-slate-700'}`}>
                            {graphic.name}
                          </span>
                        </div>
                        <span className={`text-[10px] leading-normal mb-1 ${isDark ? 'text-gray-500' : 'text-slate-500'}`}>{graphic.description}</span>
                        <span className={`text-[8px] font-mono block ${isDark ? 'text-gray-600' : 'text-slate-400'}`}>پدیدآور: {graphic.artist}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Text design studio tools */
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col">
                    <label className={`text-xs mb-2 font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>متن یا شعر دلخواه خود را تایپ کنید:</label>
                    <input
                      type="text"
                      dir="rtl"
                      maxLength={32}
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="مانند: گر عشق نباشی، بمیرم..."
                      className={`w-full border focus:border-[#ba8d3d] focus:ring-1 focus:ring-[#ba8d3d]/30 rounded-2xl px-5 py-4 text-sm outline-none transition-all duration-300 text-right ${
                        isDark ? 'bg-[#0e0d0c] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white'
                      }`}
                    />
                  </div>

                  {/* Colors of customized text */}
                  <div>
                    <label className={`text-xs mb-2 font-medium block ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>رنگ آمیزی نوشته شما:</label>
                    <div className="flex gap-2.5">
                      {textColors.map((color) => {
                        const isSelected = selectedTextColor.name === color.name;
                        return (
                          <button
                            key={color.name}
                            onClick={() => setSelectedTextColor(color)}
                            className={`w-8 h-8 rounded-full border relative flex items-center justify-center transition-all duration-300 cursor-pointer ${
                              isSelected 
                                ? 'border-[#ba8d3d] scale-110 ring-2 ring-[#ba8d3d]/20 shadow-sm' 
                                : isDark ? 'border-white/10 hover:border-white/30' : 'border-slate-300 hover:border-slate-400'
                            }`}
                            style={{ backgroundColor: color.hex }}
                            title={color.name}
                          >
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white block mix-blend-difference" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* step 3: Scale & placement position controller */}
            <div className={`border rounded-3xl p-6.5 transition-colors ${
              isDark ? 'bg-[#141312] border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-mono text-gray-500">STEP_03 / RESIZE & ALIGN</span>
                <span className="text-xs text-[#ba8d3d] font-bold font-sans">۳. کنترل اندازه و مکان طرح چاپی</span>
              </div>

              <div className="flex flex-col gap-5 pt-3">
                {/* Scale Slider */}
                <div>
                  <div className={`flex justify-between items-center mb-1 text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    <span className="font-mono">{designScale}%</span>
                    <span>بزرگ‌نمایی طرح:</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={designScale}
                    onChange={(e) => setDesignScale(Number(e.target.value))}
                    className={`w-full accent-[#ba8d3d] h-1.5 rounded-lg cursor-pointer appearance-none ${
                      isDark ? 'bg-[#0e0d0c]' : 'bg-slate-200'
                    }`}
                  />
                </div>

                {/* X and Y positional slider controls (Extremely robust cross platform implementation) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className={`flex justify-between items-center mb-1 text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                      <span className="font-mono">{designPosX}px</span>
                      <span>جابجایی افقی (چپ/راست):</span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="40"
                      value={designPosX}
                      onChange={(e) => setDesignPosX(Number(e.target.value))}
                      className={`w-full accent-[#ba8d3d] h-1.5 rounded-lg cursor-pointer appearance-none ${
                        isDark ? 'bg-[#0e0d0c]' : 'bg-slate-200'
                      }`}
                    />
                  </div>

                  <div>
                    <div className={`flex justify-between items-center mb-1 text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                      <span className="font-mono">{designPosY}px</span>
                      <span>جابجایی عمودی (بالا/پایین):</span>
                    </div>
                    <input
                      type="range"
                      min="-30"
                      max="30"
                      value={designPosY}
                      onChange={(e) => setDesignPosY(Number(e.target.value))}
                      className={`w-full accent-[#ba8d3d] h-1.5 rounded-lg cursor-pointer appearance-none ${
                        isDark ? 'bg-[#0e0d0c]' : 'bg-slate-200'
                      }`}
                    />
                  </div>
                </div>

                {/* Reset button coordinates */}
                <button
                  onClick={() => {
                    setDesignScale(100);
                    setDesignPosX(0);
                    setDesignPosY(0);
                  }}
                  className={`w-max mr-auto border text-[10px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    isDark 
                      ? 'border-white/5 hover:border-white/10 hover:bg-white/5 text-gray-500 hover:text-white' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  بازنشانی موقعیت طرح به مرکز
                </button>
              </div>
            </div>

            {/* step 4: Sizing and checkout details */}
            <div className={`border rounded-3xl p-6.5 transition-colors ${
              isDark ? 'bg-[#141312] border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
            }`}>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-mono text-gray-500">STEP_04 / FINALIZE</span>
                <span className="text-xs text-[#ba8d3d] font-bold">۴. تعیین سایز لباس و تعداد سفارش</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
                {/* Size Selection */}
                <div className="flex flex-col items-start text-right">
                  <span className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>انتخاب سایز نهایی:</span>
                  <div className="flex gap-1.5">
                    {['S', 'M', 'L', 'XL', 'XXL'].map((size) => {
                      const isSelected = selectedSize === size;
                      return (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`w-9 h-9 rounded-xl font-mono text-xs font-bold transition-all duration-300 cursor-pointer flex items-center justify-center ${
                            isSelected 
                              ? 'bg-[#ba8d3d] text-[#0e0d0c] shadow-md' 
                              : isDark ? 'bg-white/5 border border-white/5 text-gray-300 hover:border-white/15' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantifier selection */}
                <div className="flex flex-col items-start md:items-end text-right md:text-left">
                  <span className={`text-xs font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>تعداد محصولات:</span>
                  <div className={`flex items-center gap-1.5 border rounded-2xl px-2 py-1 transition-colors ${
                    isDark ? 'bg-[#0e0d0c] border-white/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                        isDark ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-white text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-50'
                      }`}
                    >
                      -
                    </button>
                    <span className={`font-mono text-xs px-3 min-w-[25px] text-center ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      {quantity.toLocaleString('fa-IR')}
                    </span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                        isDark ? 'bg-white/5 text-gray-400 hover:text-white' : 'bg-white text-slate-600 border border-slate-200 shadow-sm hover:bg-slate-50'
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Total checkout price & action call */}
            <div className={`p-7 rounded-[2rem] flex flex-col md:flex-row gap-6 justify-between items-center transition-colors border ${
              isDark 
                ? 'bg-[#1b1917] border-[#ba8d3d]/25 shadow-[0_15px_30px_-5px_rgba(0,0,0,0.4)] text-white' 
                : 'bg-white border-slate-200 shadow-lg text-slate-900'
            }`}>
              <div className="flex flex-col items-start text-right">
                <span className="text-[10px] text-gray-500 font-mono">CALCULATED TOTAL ESTIMATE</span>
                <span className={`text-sm mt-1 font-medium ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>مجموع برآورد هزینه چاپی:</span>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className={`font-mono text-2xl md:text-3xl font-bold ${isDark ? 'text-[#eed29d]' : 'text-[#ba8d3d]'}`}>
                    {totalPrice.toLocaleString('fa-IR')}
                  </span>
                  <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-slate-500'} font-sans`}>تومان</span>
                </div>
              </div>

              {/* Add Custom T-shirt button-in-button using custom premium GlassButton */}
              <GlassButton
                disabled
                title="ثبت سفارش چاپ پس از اتصال سفارش‌ها و ذخیره‌سازی طرح فعال می‌شود."
                glassColor={isDark ? "rgb(186, 141, 61)" : "rgb(238, 210, 157)"}
                className="w-full md:w-auto flex-1 md:flex-initial group relative flex items-center justify-center gap-4 px-8 py-4 rounded-full text-xs font-bold transition-all duration-300 transform active:scale-95 cursor-pointer text-[#0e0d0c]"
              >
                <ShoppingBag size={14} className="stroke-[2.5px]" />
                <span>پیش‌نمایش طرح؛ ثبت سفارش هنوز فعال نیست</span>
                {submitted && (
                  <span className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-[#4AF626]/15 border border-[#4AF626]/30 text-[#4AF626] font-semibold text-[10px] px-3 py-1.5 rounded-full shadow-lg block animate-fade-in whitespace-nowrap">
                    ✓ تیشرت سفارشی شما به سبد افزوده شد
                  </span>
                )}
              </GlassButton>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
