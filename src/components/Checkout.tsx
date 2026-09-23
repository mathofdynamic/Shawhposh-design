import React, { useState } from 'react';
import { ArrowRight, CheckCircle, ShieldCheck, CreditCard, Sparkles, MapPin, ClipboardList } from 'lucide-react';
import { CartItem, Order } from '../types';

interface CheckoutProps {
  cart: CartItem[];
  onBackToShop: () => void;
  onSubmitOrder: (orderDetails: any) => void;
}

export default function Checkout({ cart, onBackToShop, onSubmitOrder }: CheckoutProps) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [orderId, setOrderId] = useState('');

  const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const formattedTotalPrice = totalPrice.toLocaleString('fa-IR');

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!fullName.trim()) errors.fullName = 'نام و نام خانوادگی را وارد نمایید';
    if (!phone.trim()) errors.phone = 'شماره تلفن همراه را وارد نمایید';
    else if (!/^09\d{9}$/.test(phone)) errors.phone = 'شماره معتبر نیست (مثال: 09123456789)';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'ایمیل وارد شده معتبر نیست';
    if (!city.trim()) errors.city = 'استان و شهر محل سکونت را وارد نمایید';
    if (!address.trim()) errors.address = 'نشانی دقیق پستی را بنویسید';
    if (!postalCode.trim()) errors.postalCode = 'کد پستی ۱۰ رقمی را همراه داشته باشید';
    else if (!/^\d{10}$/.test(postalCode)) errors.postalCode = 'کد پستی باید ده رقم متوالی باشد';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Simulate success
    const generatedId = `SHP-1405-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderId(generatedId);
    
    onSubmitOrder({
      fullName,
      phone,
      email,
      city,
      address,
      postalCode,
      generatedId,
    });

    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <section className="min-h-[100dvh] pt-32 pb-24 px-6 md:px-12 bg-grid-lines flex items-center justify-center">
        {/* Outer Hardware frame double-bezel nesting */}
        <div className="double-bezel-outer w-full max-w-2xl">
          <div className="double-bezel p-8 md:p-12 text-center bg-[#151312] flex flex-col items-center">
            
            <div className="w-16 h-16 rounded-full bg-[#4AF626]/10 border border-[#4AF626]/20 text-[#4AF626] flex items-center justify-center mb-6 shadow-md">
              <CheckCircle size={32} className="stroke-[2px]" />
            </div>

            <h1 className="text-2xl md:text-4xl font-display font-medium text-white mb-3">
              سفارش شما با موفقیت ثبت شد!
            </h1>
            
            <p className="text-xs md:text-sm text-gray-400 max-w-[50ch] leading-relaxed mb-8">
              هنرمندان و کارورزان چاپ‌خانه شهپوش در حال آماده‌سازی و پیاده‌سازی طرح شما بر روی البسه گران‌بها هستند. جزئیات به زودی پیامک خواهد شد.
            </p>

            {/* Tracking Code with monospaced format */}
            <div className="bg-[#0e0d0c] border border-white/5 rounded-3xl p-6 mb-8 w-full max-w-md">
              <div className="text-[10px] text-gray-500 font-mono tracking-wider mb-2">UNIQUE ORDER REFERENCE</div>
              <div className="font-mono text-xl md:text-2xl font-bold text-[#eed29d] tracking-widest">{orderId}</div>
              <div className="text-[10px] text-[#4AF626] bg-[#4AF626]/10 border border-[#4AF626]/20 px-3 py-1 rounded-full w-max mx-auto mt-3">
                وضعیت: در حال پردازش ملزومات چاپی
              </div>
            </div>

            {/* Guarantees list inline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mb-8 text-right">
              <div className="flex gap-2 p-3 bg-white/5 border border-white/5 rounded-2xl">
                <ShieldCheck size={16} className="text-[#ba8d3d] shrink-0 mt-0.5" />
                <span className="text-[11px] text-gray-400">شناسنامه انحصاری اصالت اثر صادر شده و در کادوی ویژه ارسال خواهد شد.</span>
              </div>
              <div className="flex gap-2 p-3 bg-white/5 border border-white/5 rounded-2xl">
                <MapPin size={16} className="text-[#ba8d3d] shrink-0 mt-0.5" />
                <span className="text-[11px] text-gray-400">ارسال با بیمه کامل پستی در سریع‌ترین زمان از گمرک پایتخت.</span>
              </div>
            </div>

            <button
              onClick={onBackToShop}
              className="px-8 py-4 bg-[#ba8d3d] hover:bg-[#a67c33] text-[#0e0d0c] rounded-full text-xs font-bold shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              بازگشت به صفحه اصلی فروشگاه
            </button>

          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[100dvh] pt-32 pb-24 px-6 md:px-12 bg-grid-lines">
      <div className="max-w-7xl mx-auto">
        
        {/* Navigation Head Back */}
        <button
          onClick={onBackToShop}
          className="mb-8 flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-xs text-gray-300 transition-all duration-300 group cursor-pointer"
        >
          <ArrowRight size={14} className="group-hover:translate-x-[2px] transition-transform" />
          <span>بازگشت به کارگاه فروشگاه</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Right/Left: Checkout Delivery Information Form - Columns 7 */}
          <form 
            onSubmit={handlePlaceOrder}
            className="lg:col-span-7 bg-[#141211] border border-white/5 rounded-[2rem] p-6.5 md:p-8 text-right"
          >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
              <div className="p-2.5 bg-[#ba8d3d]/10 text-[#eed29d] rounded-full">
                <MapPin size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white">نشانی و مشخصات گیرنده محموله</h2>
                <p className="text-[10px] text-gray-500 mt-0.5">ثبت آدرس دقیق جهت بسته‌بندی پستی</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-300 font-semibold">نام و نام خانوادگی تحویل‌گیرنده:</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="مثال: بردیا مهدوی"
                  className="w-full bg-[#0e0d0c] border border-white/10 focus:border-[#ba8d3d] focus:ring-1 focus:ring-[#ba8d3d]/30 text-white rounded-2xl px-5 py-3.5 text-xs outline-none transition-all"
                />
                {formErrors.fullName && <p className="text-[10px] text-[#E61919] font-medium">{formErrors.fullName}</p>}
              </div>

              {/* Phone and Email row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-300 font-semibold">شماره موبایل (جهت هماهنگی پیکی/کد رهگیری):</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="مثال: 09121234567"
                    className="w-full bg-[#0e0d0c] border border-white/10 focus:border-[#ba8d3d] focus:ring-1 focus:ring-[#ba8d3d]/30 text-white rounded-2xl px-5 py-3.5 text-xs outline-none transition-all font-mono placeholder:font-sans"
                  />
                  {formErrors.phone && <p className="text-[10px] text-[#E61919] font-medium">{formErrors.phone}</p>}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-gray-300 font-semibold">آدرس ایمیل (اختیاری):</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="مثال: client@shahpoosh.com"
                    className="w-full bg-[#0e0d0c] border border-white/10 focus:border-[#ba8d3d] text-white rounded-2xl px-5 py-3.5 text-xs outline-none transition-all font-mono placeholder:font-sans"
                  />
                  {formErrors.email && <p className="text-[10px] text-[#E61919] font-medium">{formErrors.email}</p>}
                </div>
              </div>

              {/* City & State */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-300 font-semibold">استان و شهر:</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="مثال: تهران، تجریش"
                  className="w-full bg-[#0e0d0c] border border-white/10 focus:border-[#ba8d3d] focus:ring-1 focus:ring-[#ba8d3d]/30 text-white rounded-2xl px-5 py-3.5 text-xs outline-none transition-all"
                />
                {formErrors.city && <p className="text-[10px] text-[#E61919] font-medium">{formErrors.city}</p>}
              </div>

              {/* Full Address */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-300 font-semibold">نشانی کامل پستی دقیق:</label>
                <textarea
                  rows={3}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="خیابان، کوچه، پلاک، واحد، واحد اداری/مسکونی"
                  className="w-full bg-[#0e0d0c] border border-white/10 focus:border-[#ba8d3d] focus:ring-1 focus:ring-[#ba8d3d]/30 text-white rounded-2xl px-5 py-3.5 text-xs outline-none transition-all resize-none leading-relaxed"
                />
                {formErrors.address && <p className="text-[10px] text-[#E61919] font-medium">{formErrors.address}</p>}
              </div>

              {/* Postal Code */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-gray-300 font-semibold">کد پستی ۱۰ رقمی:</label>
                <input
                  type="text"
                  maxLength={10}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="مثال: 1234567890"
                  className="w-full bg-[#0e0d0c] border border-white/10 focus:border-[#ba8d3d] focus:ring-1 focus:ring-[#ba8d3d]/30 text-white rounded-2xl px-5 py-3.5 text-xs outline-none transition-all font-mono placeholder:font-sans"
                />
                {formErrors.postalCode && <p className="text-[10px] text-[#E61919] font-medium">{formErrors.postalCode}</p>}
              </div>
            </div>

            {/* Billing Payment Selection mock */}
            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
              <span className="text-xs text-gray-300 font-semibold block">روش پرداخت منتخب:</span>
              <div className="p-4 bg-[#ba8d3d]/5 border border-[#ba8d3d]/20 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#ba8d3d]/10 text-[#eed29d] rounded-xl">
                    <CreditCard size={14} />
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-white font-semibold block">کارت به کارت به حساب کارگاه (ثبت امن آنی)</span>
                    <span className="text-[10px] text-gray-500">شماره حساب پس از تایید طراح پیامک می‌گردد</span>
                  </div>
                </div>
                <div className="w-4 h-4 rounded-full border-2 border-[#ba8d3d] flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ba8d3d] block" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="mt-8 w-full py-4 bg-gradient-to-r from-[#ba8d3d] to-[#e4bc71] hover:from-[#ba8d3d] hover:to-[#ba8d3d] text-[#0e0d0c] rounded-full text-xs font-bold transition-all duration-300 active:scale-95 cursor-pointer shadow-lg text-center"
            >
              ثبت نهایی و صدور فاکتور شهپوش
            </button>

          </form>

          {/* Left/Right: Order Summary sidebar - Columns 5 */}
          <div className="lg:col-span-5 bg-[#141211] border border-white/5 rounded-[2rem] p-6.5 text-right space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <ClipboardList size={16} className="text-[#eed29d]" />
              <h3 className="text-xs font-bold text-white">خلاصه پیش‌فاکتور خرید</h3>
            </div>

            {/* List Ordered Items */}
            <div className="space-y-3 max-h-[250px] overflow-y-auto">
              {cart.map((item) => {
                const itemTotalPrice = (item.price * item.quantity).toLocaleString('fa-IR');
                return (
                  <div key={item.id} className="flex gap-3 justify-between items-center bg-[#0e0d0c]/50 p-3 rounded-xl border border-white/5">
                    <div className="text-right flex-1">
                      <span className="text-xs text-white font-medium line-clamp-1">{item.productName}</span>
                      <div className="text-[10px] text-gray-500 font-mono mt-1 flex gap-2">
                        <span>سایز: {item.size}</span>
                        <span>رنگ: {item.color.name}</span>
                        <span>تعداد: {item.quantity}</span>
                      </div>
                    </div>
                    <div className="text-left font-mono shrink-0">
                      <span className="text-xs font-bold text-[#eed29d]">{itemTotalPrice}</span>
                      <span className="text-[8px] text-gray-500 mr-0.5 font-sans">تومان</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Billing total box itemizes */}
            <div className="pt-4 border-t border-white/5 space-y-2 text-xs text-gray-400">
              <div className="flex justify-between items-center">
                <span>جمع کل موارد اقلام منتخب</span>
                <span className="font-mono">{formattedTotalPrice} تومان</span>
              </div>
              <div className="flex justify-between items-center text-[#eed29d] font-semibold bg-[#eed29d]/5 border border-[#eed29d]/15 p-2 rounded-xl text-[11px]">
                <span>هزینه کادو پیچ و ارسال سراسری</span>
                <span>رایگان و ضمانت‌دار</span>
              </div>
              <div className="pt-3 border-t border-white/5 flex justify-between items-end">
                <span className="text-white font-semibold text-sm">مبلغ کل فاکتور صادر شده:</span>
                <div className="text-left font-mono text-[#eed29d] font-bold text-lg">
                  <span>{formattedTotalPrice}</span>
                  <span className="text-[9px] text-gray-500 font-sans mr-1">تومان</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
