import { post } from '../api/client';
import React, { useEffect, useRef, useState } from 'react';
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, ShieldCheck, Phone, Sparkles } from 'lucide-react';
import { User as UserType } from '../types';
import { GlassButton } from './ui/apple-tahoe-liquid-glass-button';
import { useAppDialog } from '../admin/components/ui/DialogProvider';

interface SignupProps {
  theme: 'dark' | 'light';
  onLogin: (user: UserType) => void;
  onClose: () => void;
  onNavigateToLogin: () => void;
}

export default function Signup({ theme, onLogin, onClose, onNavigateToLogin }: SignupProps) {
  const { showMessage } = useAppDialog();
  const isDark = theme === 'dark';
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'' | 'female' | 'male'>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'idle' | 'loading' | 'success'>('idle');
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const restoreFocusRef = useRef(true);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusInitialField = window.setTimeout(() => {
      const initialField = dialog.querySelector<HTMLElement>('#signup-full-name');
      (initialField || dialog).focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeDialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
      if (activeDialogs[activeDialogs.length - 1] !== dialog) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(dialog.querySelectorAll(focusableSelector) as NodeListOf<HTMLElement>);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const focusIsInsideDialog = dialog.contains(document.activeElement);
      if (event.shiftKey && (!focusIsInsideDialog || document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!focusIsInsideDialog || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusInitialField);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      if (restoreFocusRef.current && previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, []);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); if(!agreeTerms){setError('پذیرش قوانین الزامی است.');return;} setLoading('loading');
    try {
      const result = await post<{user:UserType}>('/v1/auth/register', {
        fullName, email, password, gender,
        ...(phone ? { phone } : {}), ...(dateOfBirth ? { dateOfBirth } : {}), ...(address.trim() ? { address: address.trim() } : {}),
      });
      setLoading('success'); onLogin(result.user);
    }
    catch(e) { setError((e as Error).message); setLoading('idle'); }
  };
  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="ایجاد حساب کاربری در شهپوش" tabIndex={-1} className="fixed inset-0 z-50 flex overflow-hidden bg-[#0e0d0c] font-sans antialiased focus:outline-none" dir="rtl">
      <div className="flex w-full h-full min-h-[100dvh]">
        
        {/* Left Side: Dramatic artistic showcase (different look for sign-up) */}
        <div className={`hidden lg:flex lg:w-[45%] xl:w-[40%] relative flex-col justify-between p-12 overflow-hidden border-l select-none ${
          isDark ? 'bg-[#0f0e0d] border-white/5' : 'bg-[#faf8f4] border-slate-200/60'
        }`}>
          {/* Faint Grid and Pattern backdrop */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(circle, #ba8d3d 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          {/* Top Info */}
          <div className="z-10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ba8d3d] to-[#eed29d] flex items-center justify-center shadow-[0_4px_12px_rgba(186,141,61,0.15)]">
              <span className="font-display text-lg text-[#0e0d0c] font-black">ش</span>
            </div>
            <div className="flex flex-col text-right">
              <span className={`text-sm font-semibold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                آتلیه مد و لباس شهپوش
              </span>
              <span className={`text-[8px] uppercase tracking-wider ${isDark ? 'text-[#eed29d]/70' : 'text-[#ba8d3d]'}`}>
                پوشاک فاخر با هویت ملی پارسی
              </span>
            </div>
          </div>

          {/* Epic Statement */}
          <div className="z-10 mt-auto text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-4 border-[#ba8d3d]/20 bg-[#ba8d3d]/5">
              <Sparkles size={11} className="text-[#ba8d3d]" />
              <span className="text-[9px] uppercase font-bold tracking-[0.15em] text-[#ba8d3d]">عضویت در کلوپ سلطنتی</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-black tracking-tight leading-snug font-display text-balance" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              خلق پیوندی نو میان هنر و تکنولوژی مد
            </h1>
            <p className="mt-4 text-xs leading-relaxed max-w-[40ch]" style={{ color: isDark ? '#9e9a93' : '#6e675c' }}>
              از بخش حساب کاربری، اطلاعات شخصی، نشانی‌های ارسال و سفارش‌های خود را مدیریت کنید.
            </p>

            <div className="mt-8 pt-8 border-t border-dashed" style={{ borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }}>
              <div className="flex gap-6 items-center">
                <div>
                  <div className="text-xl font-bold font-mono text-[#eed29d]" style={{ color: isDark ? '#eed29d' : '#ba8d3d' }}>۱۰۰+ طرح ملی</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">موتیف، خطاطی و کتیبه تاریخی</div>
                </div>
                <div className={`w-px h-8 ${isDark ? 'bg-white/5' : 'bg-slate-200'}`} />
                <div>
                  <div className="text-xl font-bold font-mono text-emerald-500">پشتیبانی ۲۴ ساعته</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">تیم فنی و ارسال کشوری</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Elite Registration Form */}
        <div className={`w-full lg:w-[55%] xl:w-[60%] flex flex-col justify-between p-6 sm:p-12 overflow-y-auto relative ${
          isDark ? 'bg-[#131211]' : 'bg-white'
        }`}>
          {/* Top Return and Switch to Login actions */}
          <div className="flex justify-between items-center z-10">
            <button 
              onClick={onClose}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs cursor-pointer transition-all duration-300 transform active:scale-95 ${
                isDark 
                  ? 'border-white/5 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white' 
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowRight size={13} />
              <span>بازگشت به فروشگاه</span>
            </button>

            <div className="flex items-center gap-2">
              <span className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>قبلاً ثبت‌نام کرده‌اید؟</span>
              <button 
                onClick={() => { restoreFocusRef.current = false; onNavigateToLogin(); }}
                className={`text-xs font-bold transition-all duration-300 hover:underline cursor-pointer ${
                  isDark ? 'text-[#eed29d] hover:text-[#ba8d3d]' : 'text-[#ba8d3d] hover:text-[#a0742d]'
                }`}
              >
                ورود به پنل کاربری
              </button>
            </div>
          </div>

          {/* Form Core Centered */}
          <div className="my-auto max-w-md w-full mx-auto py-10 z-10">
            
            {/* Success State */}
            {loading === 'success' ? (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in duration-500">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mb-5 shadow-[0_0_35px_rgba(16,185,129,0.15)] animate-bounce">
                  <ShieldCheck size={40} className="stroke-[1.5px]" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-emerald-500">ثبت نام با موفقیت انجام پذیرفت</h3>
                <p className={`text-xs max-w-[32ch] leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                  حساب کاربری شما با موفقیت ایجاد شد. در حال بازگشت به فروشگاه...
                </p>
              </div>
            ) : loading === 'loading' ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 border-2 border-t-[#ba8d3d] border-[#ba8d3d]/15 rounded-full animate-spin mb-6"></div>
                <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>ایجاد حساب کاربری</h4>
                <p className={`text-xs mt-1.5 ${isDark ? 'text-[#eed29d]' : 'text-[#ba8d3d]'}`}>ثبت‌نام با نشست امن سمت سرور...</p>
              </div>
            ) : (
              <>
                {/* Header title */}
                <div className="text-right mb-6">
                  <h2 className="text-3xl font-black font-display tracking-tight" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
                    عضویت در شهپوش
                  </h2>
                  <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    پس از ورود، اطلاعات حساب، نشانی‌های ارسال و سفارش‌های خود را از این بخش مدیریت کنید.
                  </p>
                </div>

                {error && (
                  <div role="alert" aria-live="assertive" className="mb-4 text-[11px] text-rose-500 bg-rose-500/10 border border-rose-500/20 px-4 py-3 rounded-xl text-right leading-relaxed animate-fade-in">
                    ⚠️ {error}
                  </div>
                )}

                {/* Main Form */}
                <form onSubmit={handleFormSubmit} className="space-y-3.5">
                  
                  {/* Name field */}
                  <div className="space-y-1 text-right">
                    <label htmlFor="signup-full-name" className={`text-xs uppercase font-bold block ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>نام و نام خانوادگی *</label>
                    <div className="relative">
                      <input
                        type="text"
                        id="signup-full-name"
                        required
                        autoComplete="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="مانند: محمد علوی"
                        className="w-full text-xs pr-10 pl-4 py-3 rounded-xl border outline-none transition-all"
                        style={{
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#fdfbfa',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
                          color: isDark ? '#ffffff' : '#0f172a',
                        }}
                        autoFocus
                      />
                      <User size={14} className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div className="space-y-1 text-right">
                    <label htmlFor="signup-email" className={`text-xs uppercase font-bold block ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>آدرس پست الکترونیکی (ایمیل) *</label>
                    <div className="relative">
                      <input
                        type="email"
                        id="signup-email"
                        required
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="نشانی ایمیل"
                        className="w-full text-xs pr-10 pl-4 py-3 rounded-xl border outline-none transition-all text-left font-sans text-right placeholder:text-right"
                        style={{
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#fdfbfa',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
                          color: isDark ? '#ffffff' : '#0f172a',
                        }}
                      />
                      <Mail size={14} className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  {/* Phone field (optional) */}
                  <div className="space-y-1 text-right">
                    <label htmlFor="signup-phone" className={`text-xs uppercase font-bold block ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>شماره تلفن همراه (اختیاری)</label>
                    <div className="relative">
                      <input
                        type="tel"
                        id="signup-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                        className="w-full text-xs pr-10 pl-4 py-3 rounded-xl border outline-none transition-all text-left font-sans text-right placeholder:text-right"
                        style={{
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#fdfbfa',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
                          color: isDark ? '#ffffff' : '#0f172a',
                        }}
                      />
                      <Phone size={14} className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1 text-right text-xs font-bold">
                      <label htmlFor="signup-gender" className={`block ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>جنسیت *</label>
                      <select
                        id="signup-gender"
                        required
                        value={gender}
                        onChange={(e) => setGender(e.target.value as 'female' | 'male' | '')}
                        className="w-full rounded-xl border px-3 py-3 text-xs outline-none transition-all"
                        style={{
                          backgroundColor: isDark ? '#171615' : '#fdfbfa',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
                          color: isDark ? '#ffffff' : '#0f172a',
                        }}
                      >
                        <option value="" disabled>انتخاب کنید</option>
                        <option value="female">خانم</option>
                        <option value="male">آقا</option>
                      </select>
                    </div>
                    <div className="space-y-1 text-right text-xs font-bold">
                      <label htmlFor="signup-date-of-birth" className={`block ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>تاریخ تولد (اختیاری)</label>
                      <input
                        type="date"
                        id="signup-date-of-birth"
                        max={new Date().toISOString().slice(0, 10)}
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full rounded-xl border px-3 py-3 text-xs outline-none transition-all"
                        style={{
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#fdfbfa',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
                          color: isDark ? '#ffffff' : '#0f172a',
                          colorScheme: isDark ? 'dark' : 'light',
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-right">
                    <label className={`text-xs uppercase font-bold block ${isDark ? 'text-gray-400' : 'text-slate-600'}`} htmlFor="signup-address">نشانی (اختیاری)</label>
                    <textarea
                      id="signup-address"
                      rows={2}
                      maxLength={500}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="نشانی محل سکونت"
                      className="w-full resize-y rounded-xl border px-4 py-3 text-xs outline-none transition-all placeholder:text-right"
                      style={{
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#fdfbfa',
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
                        color: isDark ? '#ffffff' : '#0f172a',
                      }}
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1 text-right">
                    <label htmlFor="signup-password" className={`text-xs uppercase font-bold block ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>رمز عبور جدید *</label>
                    <div className="relative">
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={12}
                        autoComplete="new-password"
                        placeholder="حداقل ۱۲ کاراکتر"
                        className="w-full text-xs pr-10 pl-14 py-3 rounded-xl border outline-none transition-all text-left font-sans text-right placeholder:text-right"
                        style={{
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#fdfbfa',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0',
                          color: isDark ? '#ffffff' : '#0f172a',
                        }}
                      />
                      <Lock size={14} className="absolute top-1/2 right-3.5 -translate-y-1/2 text-gray-400" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
                        aria-pressed={showPassword}
                        className="absolute top-1/2 left-1 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-300 transition-colors hover:text-[#ba8d3d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d]"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Terms acceptance helper */}
                  <div className="flex items-start gap-2 pt-1 text-[11px]">
                    <label htmlFor="signup-terms" className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg focus-within:outline focus-within:outline-2 focus-within:outline-[#ba8d3d]">
                      <input
                        id="signup-terms"
                        type="checkbox"
                        checked={agreeTerms}
                        required
                        onChange={event => setAgreeTerms(event.target.checked)}
                        aria-label="پذیرش قوانین و حریم خصوصی"
                        className="h-5 w-5 cursor-pointer rounded border-white/30 bg-white/5 accent-[#ba8d3d] focus:ring-[#ba8d3d]"
                      />
                    </label>
                    <p className={`min-h-11 flex-1 leading-relaxed text-right pt-2 ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                      با عضویت در پلتفرم، <button type="button" className="underline hover:text-[#ba8d3d]" onClick={() => { void showMessage({ title: 'قوانین و حریم خصوصی', description: 'قوانین شامل حفظ حریم خصوصی، رعایت اصالت کپی‌رایت نقوش تاریخی گبه و خوش‌نویسی و خطوط اختصاصی شهپوش است.' }); }}>قوانین، شرایط خدمات و بیانیه حریم خصوصی</button> شرکت البسه فاخر شهپوش را می‌پذیرم.
                    </p>
                  </div>

                  {/* Trigger Action */}
                  <div className="pt-2">
                    <GlassButton
                      onClick={() => {}}
                      glassColor={isDark ? "rgb(186, 141, 61)" : "rgb(238, 210, 157)"}
                      className="w-full group flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-xs font-bold transition-all duration-300 transform active:scale-95 cursor-pointer text-[#0e0d0c] font-sans"
                    >
                      <span>تکمیل ثبت نام و ایجاد حساب ملوکانه</span>
                    </GlassButton>
                  </div>
                </form>

                {/* Separator */}
                <div className="relative my-6 flex py-1 items-center">
                  <div className={`flex-grow border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}></div>
                  <span className={`flex-shrink mx-4 text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>ثبت نام سریع با اکانت شبکه همکار</span>
                  <div className={`flex-grow border-t ${isDark ? 'border-white/5' : 'border-slate-100'}`}></div>
                </div>

                {/* Social logins */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled aria-label="ثبت‌نام با گوگل؛ به‌زودی فعال می‌شود" title="هنوز فعال نیست"
                    className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-55 ${
                      isDark
                        ? 'bg-[#1b1917] border-white/5 text-white'
                        : 'bg-white border-[#ba8d3d]/15 text-slate-800'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12.24 10.285V14.4h6.887c-.275 1.564-1.88 4.604-6.887 4.604-4.33 0-7.859-3.579-7.859-7.989 0-4.41 3.529-7.989 7.859-7.989 2.464 0 4.112 1.025 5.057 1.926l3.245-3.125C18.3 1.95 15.547 1 12.24 1c-6.075 0-11 4.925-11 11s4.925 11 11 11c6.34 0 10.556-4.45 10.556-10.74 0-.72-.08-1.27-.18-1.815H12.24z"
                      />
                    </svg>
                    <span className="flex flex-col items-start"><span>گوگل</span><span className="text-[9px] font-normal text-stone-400">به‌زودی</span></span>
                  </button>

                  <button
                    type="button"
                    disabled aria-label="ثبت‌نام با اپل؛ به‌زودی فعال می‌شود" title="هنوز فعال نیست"
                    className={`flex min-h-14 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-55 ${
                      isDark
                        ? 'bg-white text-black border-white'
                        : 'bg-black text-white border-black'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.152 6.896c-.22 0-.74-.24-.74-.24s-.48-.22-.32-.58c.2-.44.5-.86.76-1.28c.3-.48.58-.66.86-.66c.26 0 .54.16.8.64c.28.5.54.98.66 1.4c.1.36-.26.72-.56.72c-.22 0-.42-.04-.54.14c-.16.24.12 1-.22 1.08c-.14.04-.22-.22-.22-.22zM18.66 11.232c-.31.258-.871.554-1.127.871l-.14.179c-.105.152-.162.339-.162.531c0 .487.359.888.847.962l.142.022c.284.053.64.212.871.493a3.504 3.504 0 0 1 .475 2.18c0 .351-.23.951-.43 1.341c-.48 1.071-1.07 2.15-1.92 2.15c-.45 0-.82-.25-1.39-.25c-.56 0-.96.25-1.39.25c-.83 0-1.57-1.12-2.12-2.19c-.83-1.63-1.46-4-.56-5.591a3.513 3.513 0 0 1 .53-.78c.621-.611 1.481-1.011 2.37-1.011c1.07 0 1.631.62 1.631.62s.37-.54 1.25-.59s1.42.34 1.83.82c.452.541.681 1.241.521 1.941c-.04.162-.11.31-.22.45L18.66 11.232z" />
                    </svg>
                    <span className="flex flex-col items-start"><span>حساب اپل</span><span className="text-[9px] font-normal opacity-60">به‌زودی</span></span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Bottom license */}
          <div className="z-10 text-center mt-auto pt-6 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
            <p className="text-[9px] text-gray-500 leading-relaxed font-mono">
              درگاه ورود حساب کاربری شهپوش · کلیه حقوق محفوظ است.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
