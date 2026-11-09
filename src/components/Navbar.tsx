import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ShoppingBag, Shirt, Sparkles, Menu, X, Sliders, Info, Sun, Moon, User, LogOut, Shield } from 'lucide-react';
import { CartItem, User as UserType } from '../types';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';

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
  onAccountClick: () => void;
  onAdminClick?: () => void;
  isCheckout?: boolean;
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
  onLogout,
  onAccountClick,
  onAdminClick,
  isCheckout = false
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuId = useId();
  const mobileMenuRef = useRef<HTMLElement | null>(null);
  const mobileMenuToggleRef = useRef<HTMLButtonElement | null>(null);
  const userMenuToggleRef = useRef<HTMLButtonElement | null>(null);
  const restoreMobileMenuFocus = useRef(true);
  const prefersReducedMotion = useReducedMotion();
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const isDark = theme === 'dark';

  const navLinks = [
    { id: 'home', label: 'صفحه اصلی', icon: Shirt },
    { id: 'shop', label: 'کاتالوگ پوشاک آماده', icon: ShoppingBag },
    { id: 'designer', label: 'کارگاه طراحی شخصی', icon: Sparkles },
    { id: 'about', label: 'اصالت و داستان برند', icon: Info },
  ];

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const menu = mobileMenuRef.current;
    if (!menu) return;

    const toggle = mobileMenuToggleRef.current;
    const previousOverflow = document.body.style.overflow;
    const getFocusableItems = () => Array.from(menu.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )) as HTMLElement[];
    document.body.style.overflow = 'hidden';
    getFocusableItems()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const items = getFocusableItems();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (restoreMobileMenuFocus.current) requestAnimationFrame(() => toggle?.focus());
      restoreMobileMenuFocus.current = true;
    };
  }, [mobileMenuOpen]);

  useLayoutEffect(() => {
    const menu = mobileMenuRef.current;
    if (!menu) return;

    menu.inert = !mobileMenuOpen;
    menu.setAttribute('aria-hidden', String(!mobileMenuOpen));
    if (mobileMenuOpen) menu.setAttribute('aria-modal', 'true');
    else menu.removeAttribute('aria-modal');
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setUserMenuOpen(false);
      requestAnimationFrame(() => userMenuToggleRef.current?.focus());
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [userMenuOpen]);

  return (
    <nav className={`${isCheckout ? 'relative' : 'fixed'} top-0 left-0 right-0 z-50 px-2 sm:px-4 md:px-8 pt-4 md:pt-6 pointer-events-none`}>
      <div className={`max-w-7xl mx-auto h-16 md:h-18 flex items-center justify-between border backdrop-blur-md rounded-full px-4 sm:px-6 pointer-events-auto transition-all duration-300 ${
        isDark 
          ? 'bg-[#131211]/80 border-white/5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]' 
          : 'bg-white/90 border-[#ba8d3d]/15 shadow-[0_20px_45px_-12px_rgba(186,141,61,0.08)]'
      }`}>
        
        {/* Brand Logo & Name */}
        <button
          type="button"
          aria-label="صفحه اصلی شهپوش"
          onClick={() => {
            setActiveTab('home');
            setMobileMenuOpen(false);
          }} 
          className="flex shrink-0 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-inherit group focus-visible:rounded-xl"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ba8d3d] to-[#eed29d] flex items-center justify-center shadow-[0_4px_12px_rgba(186,141,61,0.15)] group-hover:scale-105 transition-transform duration-200 shrink-0">
            <span className="font-display text-lg text-[#0e0d0c] font-black">ش</span>
          </div>
          <div className="flex flex-col text-right">
            <span className={`font-display text-base tracking-tight group-hover:text-[var(--text-accent)] transition-colors duration-300 leading-tight ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}>
              شهپوش
            </span>
            <span className={`text-xs uppercase tracking-[0.05em] hidden lg:inline leading-none mt-0.5 ${
              isDark ? 'text-[#eed29d]/70' : 'text-[var(--text-accent)]'
            }`}>
              پلتفرم انحصاری پوشاک پارسی
            </span>
          </div>
        </button>

        {/* Desktop Navigation Links (Switched md: to lg: layout to prevent crowding) */}
        <div className="hidden lg:flex items-center gap-2 h-full">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveTab(link.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative px-4 py-2 rounded-full text-[12.5px] font-sans font-medium flex items-center gap-2 transition-all duration-305 cursor-pointer whitespace-nowrap active:scale-95 group ${
                  isActive 
                    ? 'text-[var(--text-accent)] font-bold'
                    : isDark 
                      ? 'text-gray-400 hover:text-white' 
                      : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId={prefersReducedMotion ? undefined : 'desktopNavActive'}
                    className={`absolute inset-0 rounded-full -z-10 ${
                      isDark 
                        ? 'bg-white/5 border border-white/5' 
                        : 'bg-[#ba8d3d]/8 border border-[#ba8d3d]/15 shadow-[0_2px_8px_rgba(186,141,61,0.02)]'
                    }`}
                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={14} className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? 'stroke-[2px]' : 'stroke-1.5'}`} />
                <span>{link.label}</span>
                {isActive && (
                  <motion.span 
                    layoutId={prefersReducedMotion ? undefined : 'activeDesktopDot'}
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--text-accent)] shadow-[0_0_6px_rgba(186,141,61,0.8)]"
                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Cart & Utility Area */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {/* Admin Desk Link Button */}
            {onAdminClick && (
              <button
                onClick={onAdminClick}
                className={`hidden min-h-11 min-w-11 p-2.5 rounded-xl transition-all duration-300 items-center justify-center relative cursor-pointer active:scale-90 sm:flex ${
                  isDark 
                    ? 'hover:bg-white/5 text-gray-400 hover:text-[#eed29d]' 
                    : 'hover:bg-black/5 text-slate-600 hover:text-[var(--text-accent)]'
                }`}
                title="ورود به پنل مدیریت کارگاه شهپوش"
                aria-label="میز مدیریت کارگاه"
              >
                <Shield size={17} className="stroke-1.5" />
              </button>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className={`min-h-11 min-w-11 p-2.5 rounded-xl transition-all duration-300 flex items-center justify-center relative cursor-pointer active:scale-90 ${
                isDark 
                  ? 'hover:bg-white/5 text-gray-400 hover:text-[#eed29d]' 
                    : 'hover:bg-black/5 text-slate-600 hover:text-[var(--text-accent)]'
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
              className={`min-h-11 min-w-11 p-2.5 rounded-xl transition-all duration-300 relative cursor-pointer active:scale-90 ${
                isDark 
                  ? 'hover:bg-white/5 text-gray-400 hover:text-[#eed29d]' 
                    : 'hover:bg-black/5 text-slate-600 hover:text-[var(--text-accent)]'
              }`}
              aria-label="سبد خرید"
            >
              <ShoppingBag size={17} className="stroke-1.5" />
              {totalItems > 0 && (
                  <span className={`absolute top-1 right-1 w-4 h-4 font-mono text-[9px] font-bold flex items-center justify-center rounded-full ${
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
                  ref={userMenuToggleRef}
                  aria-label={`حساب کاربری ${user.name}`}
                  aria-expanded={userMenuOpen}
                  aria-controls={userMenuId}
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 pr-3.5 pl-1 py-1 rounded-full text-xs font-semibold cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group whitespace-nowrap shrink-0 border ${
                    isDark 
                      ? 'bg-[#1b1917]/85 border-white/5 text-white hover:bg-[#252220]' 
                      : 'bg-[#fcf8f2] border-[#ba8d3d]/20 text-slate-850 hover:bg-white'
                  }`}
                >
                  <span className="whitespace-nowrap max-w-[85px] overflow-hidden text-ellipsis inline-block">
                    <span className="hidden max-w-[85px] overflow-hidden text-ellipsis whitespace-nowrap sm:inline-block">{user.name}</span>
                  </span>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" className="w-6.5 h-6.5 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className={`w-6.5 h-6.5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                      isDark ? 'bg-[#ba8d3d]/20 text-[#eed29d]' : 'bg-[#ba8d3d]/15 text-[var(--text-accent)]'
                    }`}>
                      {user.name.charAt(0)}
                    </span>
                  )}
                </button>
                
                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div
                    aria-hidden="true"
                    className="fixed inset-0 z-10"
                    onClick={() => {
                      setUserMenuOpen(false);
                      requestAnimationFrame(() => userMenuToggleRef.current?.focus());
                    }}
                  />
                )}
                <div
                  id={userMenuId}
                  role="group"
                  aria-label="منوی حساب کاربری"
                  hidden={!userMenuOpen}
                  className={`absolute left-0 mt-3.5 w-52 rounded-2xl border p-1.5 z-20 shadow-[0_15px_30px_rgba(186,141,61,0.08)] animate-fade-in ${
                      isDark 
                        ? 'bg-[#131211] border-white/5 text-white' 
                        : 'bg-white border-slate-100 text-slate-800'
                    }`}>
                      <div className={`px-4 py-3 border-b text-[10px] text-right ${isDark ? 'border-white/5 text-gray-400' : 'border-slate-100 text-slate-500'}`}>
                        <div className="font-bold text-xs truncate mb-0.5" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{user.name}</div>
                        <div className="truncate font-sans" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>{user.email}</div>
                      </div>
                      <button
                        onClick={() => { onAccountClick(); setUserMenuOpen(false); }}
                        className={`w-full flex items-center justify-between text-right px-4 py-2.5 text-xs font-semibold rounded-xl hover:bg-[#ba8d3d]/10 transition-colors duration-200 cursor-pointer mt-1 ${isDark ? 'hover:text-[#eed29d]' : 'hover:text-[var(--text-accent)]'}`}
                      >
                        <span>حساب کاربری و سفارش‌ها</span>
                        <User size={12} />
                      </button>
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
            ref={mobileMenuToggleRef}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-menu"
            className={`min-h-11 min-w-11 p-2.5 rounded-xl lg:hidden cursor-pointer transition-colors duration-300 ${mobileMenuOpen ? 'invisible pointer-events-none' : ''} ${
              isDark 
                ? 'hover:bg-white/5 text-gray-400 hover:text-white' 
                : 'hover:bg-black/5 text-slate-600 hover:text-slate-950'
            }`}
            aria-label={mobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop & Panel */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav
            ref={mobileMenuRef}
            role="dialog"
            aria-modal="true"
            aria-hidden={!mobileMenuOpen}
            inert={!mobileMenuOpen}
            id="mobile-navigation-menu"
            aria-label="منوی اصلی"
            initial={prefersReducedMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: -6, transition: { duration: 0.12 } }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={event => {
              if (event.target === event.currentTarget) setMobileMenuOpen(false);
            }}
            className={`fixed inset-0 top-[76px] left-0 right-0 z-40 p-6 flex flex-col gap-4 pointer-events-auto lg:hidden ${
              isDark ? 'bg-black/95 backdrop-blur-sm' : 'bg-white/95 backdrop-blur-sm border-t border-slate-200'
            }`}
          >
            <button
              type="button"
              aria-label="بستن منو"
              onClick={() => setMobileMenuOpen(false)}
              className={`inline-flex min-h-11 min-w-11 self-start items-center justify-center rounded-xl ${isDark ? 'text-stone-300 hover:bg-white/5' : 'text-slate-700 hover:bg-black/5'}`}
            >
              <X size={18} />
            </button>
            <motion.div 
              initial={prefersReducedMotion ? false : 'hidden'}
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: prefersReducedMotion ? 0 : 0.06
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
                    aria-current={isActive ? 'page' : undefined}
                    variants={{
                      hidden: { opacity: 0, x: 15 },
                      visible: { opacity: 1, x: 0 }
                    }}
                    transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 28 }}
                    key={link.id}
                    onClick={() => {
                      setActiveTab(link.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-5 py-4 rounded-2xl flex items-center justify-between text-sm font-semibold transition-all duration-300 relative overflow-hidden group ${
                      isActive 
                        ? 'text-[var(--text-accent)]'
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
                        className="w-1.5 h-1.5 rounded-full bg-[var(--text-accent)]"
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activeMobilePill"
                        className={`absolute inset-0 rounded-2xl -z-10 ${
                          isDark ? 'bg-white/5' : 'bg-[#ba8d3d]/8'
                        }`}
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
            
            <motion.div 
              initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.22, duration: 0.25 }}
              className="mt-4 flex flex-col gap-3.5 border-t pt-4 border-dashed" 
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}
            >
              {user ? (
                <div className="flex flex-col gap-3 px-2">
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover border border-[#ba8d3d]/20" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm bg-[#ba8d3d]/15 text-[var(--text-accent)]">
                        {user.name.charAt(0)}
                      </div>
                    )}
                    <div className="text-right">
                      <div className="font-bold text-xs" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>{user.name}</div>
                      <div className="text-[10px] text-gray-500 font-sans">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { onAccountClick(); setMobileMenuOpen(false); }}
                      className={`flex-1 rounded-xl border border-[#ba8d3d]/20 bg-[#ba8d3d]/10 px-4 py-3 text-xs font-bold ${isDark ? 'text-[#eed29d]' : 'text-[var(--text-accent)]'}`}
                    >حساب کاربری و سفارش‌ها</button>
                    <button
                      onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                      className="rounded-xl bg-rose-500/10 px-4 py-3 text-rose-500 hover:bg-rose-500/20 transition-colors cursor-pointer"
                      title="خروج از حساب"
                    ><LogOut size={16} className="stroke-[2px]" /></button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    restoreMobileMenuFocus.current = false;
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
                    : 'bg-[#fcf8f2] border border-[#ba8d3d]/15 text-[var(--text-accent)]'
                }`}
              >
                کارگاه طراحی شخصی تیشرت
              </button>

              {onAdminClick && (
                <button
                  onClick={() => {
                    onAdminClick();
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full py-3.5 rounded-2xl text-center text-xs font-bold border flex items-center justify-center gap-2 cursor-pointer ${isDark ? 'border-white/10 text-stone-400 hover:text-white bg-white/5' : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-white'}`}
                >
                  <Shield size={14} className="text-[var(--text-accent)]" />
                  <span>ورود به میز مدیریت کارگاه</span>
                </button>
              )}
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>
    </nav>
  );
}
