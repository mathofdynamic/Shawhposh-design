import { useState } from 'react';
import { ShoppingBag, Shirt, Sparkles, Menu, X, Sliders, Info, Sun, Moon, User, LogOut } from 'lucide-react';
import { CartItem, User as UserType } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  cart: CartItem[];
  setCartOpen: (open: boolean) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  user: UserType | null;
  onLoginClick: () => void;
  onLogout: () => void;
}

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  cart, 
  setCartOpen, 
  theme, 
  onToggleTheme,
  user,
  onLoginClick,
  onLogout
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isDark = theme === 'dark';

  const navLinks = [
    { id: 'home', label: 'صفحه اصلی', icon: Shirt },
    { id: 'shop', label: 'کاتالوگ پوشاک آماده', icon: ShoppingBag },
    { id: 'designer', label: 'کارگاه طراحی شخصی', icon: Sparkles },
    { id: 'about', label: 'اصالت و داستان برند', icon: Info },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 md:px-8 pt-4 md:pt-6 pointer-events-none">
      <div className={`max-w-7xl mx-auto h-16 md:h-18 flex items-center justify-between border backdrop-blur-md rounded-full px-6 pointer-events-auto transition-all duration-300 ${
        isDark 
          ? 'bg-[#131211]/80 border-white/5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]' 
          : 'bg-white/90 border-[#ba8d3d]/15 shadow-[0_20px_45px_-12px_rgba(186,141,61,0.08)]'
      }`}>
        
        {/* Brand Logo & Name */}
        <div 
          onClick={() => {
            setActiveTab('home');
            setMobileMenuOpen(false);
          }} 
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ba8d3d] to-[#eed29d] flex items-center justify-center shadow-[0_4px_12px_rgba(186,141,61,0.15)] group-hover:scale-105 transition-all duration-500 shrink-0">
            <span className="font-display text-lg text-[#0e0d0c] font-black">ش</span>
          </div>
          <div className="flex flex-col text-right">
            <span className={`font-display text-base tracking-tight group-hover:text-[#ba8d3d] transition-colors duration-300 leading-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              شهپوش
            </span>
            <span className={`text-[8px] uppercase tracking-[0.05em] hidden lg:inline leading-none mt-0.5 ${
              isDark ? 'text-[#eed29d]/70' : 'text-[#ba8d3d]'
            }`}>
              پلتفرم انحصاری پوشاک پارسی
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links (Switched md: to lg: layout to prevent crowding) */}
        <div className="hidden lg:flex items-center gap-2 h-full">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                className={`relative px-4 py-2 rounded-full text-[12.5px] font-sans font-medium flex items-center gap-2 transition-all duration-305 cursor-pointer whitespace-nowrap active:scale-95 group ${
                  isActive 
                    ? 'text-[#ba8d3d] font-bold' 
                    : isDark 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="desktopNavActive"
                    className={`absolute inset-0 rounded-full -z-10 ${
                      isDark 
                        ? 'bg-white/5 border border-white/5' 
                        : 'bg-[#ba8d3d]/8 border border-[#ba8d3d]/15 shadow-[0_2px_8px_rgba(186,141,61,0.02)]'
                    }`}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={14} className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'stroke-[2px]' : 'stroke-1.5'}`} />
                <span>{link.label}</span>
                {isActive && (
                  <motion.span 
                    layoutId="activeDesktopDot"
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#ba8d3d] shadow-[0_0_6px_rgba(186,141,61,0.8)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Cart & Utility Area */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className={`p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center relative cursor-pointer active:scale-90 ${
                isDark 
                  ? 'hover:bg-white/5 text-gray-400 hover:text-[#eed29d]' 
                  : 'hover:bg-black/5 text-slate-600 hover:text-[#ba8d3d]'
              }`}
              title={isDark ? 'تغییر به پوسته روشن' : 'تغییر به پوسته تاریک'}
              aria-label="تغییر پوسته"
            >
              {isDark ? (
                <Sun size={17} className="stroke-1.5 duration-500 hover:rotate-45 transition-transform" />
              ) : (
                <Moon size={17} className="stroke-1.5 duration-500 hover:scale-110 transition-transform" />
              )}
            </button>

            {/* Cart Icon Widget */}
            <button
              onClick={() => setCartOpen(true)}
              className={`p-2.5 rounded-xl transition-all duration-300 relative cursor-pointer active:scale-90 ${
                isDark 
                  ? 'hover:bg-white/5 text-gray-400 hover:text-[#eed29d]' 
                  : 'hover:bg-black/5 text-slate-600 hover:text-[#ba8d3d]'
              }`}
              aria-label="سبد خرید"
            >
              <ShoppingBag size={17} className="stroke-1.5" />
              {totalItems > 0 && (
                <span className={`absolute top-1 right-1 w-4 h-4 font-mono text-[9px] font-bold flex items-center justify-center rounded-full animate-bounce ${
                  isDark 
                    ? 'bg-[#ba8d3d] text-[#0e0d0c] shadow-[0_2px_8px_rgba(186,141,61,0.4)]' 
                    : 'bg-[#ba8d3d] text-white shadow-[0_2px_8px_rgba(186,141,61,0.3)]'
                }`}>
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          {/* User Section replacing the old wide "طراحی دلخواه" button */}
          <div className="relative shrink-0">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 pr-3.5 pl-1 py-1 rounded-full text-xs font-semibold cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group whitespace-nowrap shrink-0 border ${
                    isDark 
                      ? 'bg-[#1b1917]/85 border-white/5 text-white hover:bg-[#252220]' 
                      : 'bg-[#fcf8f2] border-[#ba8d3d]/20 text-slate-850 hover:bg-white'
                  }`}
                >
                  <span className="whitespace-nowrap max-w-[85px] overflow-hidden text-ellipsis inline-block">
                    {user.name}
                  </span>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" className="w-6.5 h-6.5 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className={`w-6.5 h-6.5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                      isDark ? 'bg-[#ba8d3d]/20 text-[#eed29d]' : 'bg-[#ba8d3d]/15 text-[#ba8d3d]'
                    }`}>
                      {user.name.charAt(0)}
                    </span>
                  )}
                </button>
                
                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className={`absolute left-0 mt-3.5 w-52 rounded-2xl border p-1.5 z-20 shadow-[0_15px_30px_rgba(186,141,61,0.08)] animate-fade-in ${
                      isDark 
                        ? 'bg-[#131211] border-white/5 text-white' 
                        : 'bg-white border-slate-100 text-slate-800'
                    }`}>
                      <div className={`px-4 py-3 border-b text-[10px] text-right ${isDark ? 'border-white/5 text-gray-400' : 'border-slate-100 text-slate-500'}`}>
                        <div className="font-bold text-xs truncate mb-0.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{user.name}</div>
                        <div className="truncate font-sans" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>{user.email}</div>
                      </div>
                      <button
                        onClick={() => {
                          onLogout();
                          setUserMenuOpen(false);
                        }}
                        className="w-full flex items-center justify-between text-right px-4 py-2.5 text-xs font-semibold rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-colors duration-200 cursor-pointer text-rose-500 mt-1"
                      >
                        <span>خروج از حساب</span>
                        <LogOut size={12} className="stroke-[2.5px]" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                onClick={onLoginClick}
                className={`hidden sm:flex items-center gap-2.5 pr-4 pl-1.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group whitespace-nowrap shrink-0 ${
                  isDark 
                    ? 'bg-gradient-to-r from-[#ba8d3d] to-[#e4bc71] hover:from-[#ba8d3d] hover:to-[#ba8d3d] text-[#0e0d0c] shadow-[0_4px_16px_rgba(186,141,61,0.15)]' 
                    : 'bg-[#171513] hover:bg-[#2d2925] text-white shadow-[0_4px_12px_rgba(23,21,19,0.12)]'
                }`}
              >
                <span className="whitespace-nowrap">ورود / عضویت</span>
                <span className="w-6.5 h-6.5 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-105 bg-black/10 shrink-0">
                  <User size={11} className={`stroke-[2.5px] ${isDark ? 'text-[#0e0d0c]' : 'text-white'}`} />
                </span>
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2.5 rounded-xl lg:hidden cursor-pointer transition-colors duration-300 ${
              isDark 
                ? 'hover:bg-white/5 text-gray-400 hover:text-white' 
                : 'hover:bg-black/5 text-slate-600 hover:text-slate-950'
            }`}
            aria-label="منو"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop & Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`fixed inset-0 top-[76px] left-0 right-0 z-40 p-6 flex flex-col gap-4 pointer-events-auto lg:hidden ${
              isDark ? 'bg-black/95 backdrop-blur-2xl' : 'bg-white/95 backdrop-blur-2xl border-t border-slate-200'
            }`}
          >
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.08
                  }
                }
              }}
              className="flex flex-col gap-3 text-right"
            >
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = activeTab === link.id;
                return (
                  <motion.button
                    variants={{
                      hidden: { opacity: 0, x: 15 },
                      visible: { opacity: 1, x: 0 }
                    }}
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    key={link.id}
                    onClick={() => {
                      setActiveTab(link.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-5 py-4 rounded-2xl flex items-center justify-between text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
                      isActive 
                        ? 'text-[#ba8d3d]' 
                        : isDark ? 'text-gray-300 hover:text-white' : 'text-slate-700 hover:text-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Icon size={18} />
                      <span>{link.label}</span>
                    </div>
                    {isActive && (
                      <motion.div 
                        layoutId="activeMobileIndicator"
                        className="w-1.5 h-1.5 rounded-full bg-[#ba8d3d]"
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activeMobilePill"
                        className={`absolute inset-0 rounded-2xl -z-10 ${
                          isDark ? 'bg-white/5' : 'bg-[#ba8d3d]/8'
                        }`}
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28, duration: 0.35 }}
              className="mt-4 flex flex-col gap-3.5 border-t pt-4 border-dashed" 
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}
            >
              {user ? (
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border border-[#ba8d3d]/20" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-[#ba8d3d]/15 text-[#ba8d3d]">
                        {user.name.charAt(0)}
                      </div>
                    )}
                    <div className="text-right">
                      <div className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{user.name}</div>
                      <div className="text-[10px] text-gray-500 font-sans">{user.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    title="خروج از حساب"
                  >
                    <LogOut size={16} className="stroke-[2px]" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onLoginClick();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full py-4.5 rounded-2xl text-center text-sm font-bold flex items-center justify-center gap-2 cursor-pointer ${
                    isDark 
                      ? 'bg-gradient-to-r from-[#ba8d3d] to-[#eed29d] text-[#0e0d0c] shadow-md' 
                      : 'bg-[#171513] text-white hover:bg-[#2e2a26]'
                  }`}
                >
                  <User size={16} />
                  <span>ورود به حساب کاربری شهپوش</span>
                </button>
              )}
              
              <button 
                onClick={() => {
                  setActiveTab('designer');
                  setMobileMenuOpen(false);
                }} 
                className={`px-6 py-4.5 rounded-2xl text-center text-sm font-bold shadow-lg cursor-pointer ${
                  isDark 
                    ? 'bg-white/5 border border-white/5 text-[#eed29d]' 
                    : 'bg-[#fcf8f2] border border-[#ba8d3d]/15 text-[#ba8d3d]'
                }`}
              >
                کارگاه طراحی شخصی تیشرت
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
