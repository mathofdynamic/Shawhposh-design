import { useEffect, useRef } from 'react';
import { X, Trash2, ShoppingBag, ArrowLeft, Sliders } from 'lucide-react';
import { CartItem } from '../types';
import { handleProductImageError, isDemoProductImage, storefrontProductImage } from '../lib/productImage';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: () => void;
  shippingTomans?: number | null;
}

export default function Cart({ isOpen, onClose, cart, onUpdateQuantity, onRemoveItem, onCheckout, shippingTomans }: CartProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) as NodeListOf<HTMLElement>);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalPrice = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const formattedTotalPrice = totalPrice.toLocaleString('fa-IR');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 pointer-events-auto"
      />

      <div className="absolute inset-y-0 left-0 max-w-full flex pr-10">
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="cart-title" tabIndex={-1} className="w-screen max-w-lg bg-[#0e0d0c] border-r border-white/5 shadow-2xl flex flex-col pointer-events-auto">
          
          {/* Cart Header */}
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#ba8d3d]/10 text-[#eed29d] rounded-full">
                <ShoppingBag size={16} />
              </div>
              <div className="text-right">
                <h2 id="cart-title" className="text-sm font-bold text-white">سبد خرید شما</h2>
                <span className="text-[10px] text-stone-300 font-mono">
                  {totalItems.toLocaleString('fa-IR')} محصول اضافه شده است
                </span>
              </div>
            </div>

            {/* Close Cross */}
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="بستن سبد خرید"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d] focus-visible:outline-offset-2"
            >
              <X size={16} />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-20">
                <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 mb-6">
                  <ShoppingBag size={24} className="stroke-1.5" />
                </div>
                <h3 className="text-sm font-bold text-white mb-2">سبد خرید شما خالی است</h3>
                <p className="text-xs text-gray-500 leading-relaxed mb-6 max-w-[30ch]">
                  کالکشن جدید تیشرت‌های شهپوش را بررسی کنید و یا در آتلیه آنلاین تیشرت سفارشی خود را بسازید.
                </p>
                <button
                  onClick={() => {
                    onClose();
                  }}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-[#eed29d] font-semibold rounded-full duration-300 cursor-pointer"
                >
                  ادامه گشت و گذار در فروشگاه
                </button>
              </div>
            ) : (
              cart.map((item) => {
                const formattedItemPrice = (item.price * item.quantity).toLocaleString('fa-IR');
                return (
                  <div 
                    key={item.id}
                    className="flex gap-4 p-4 bg-[#141312]/70 border border-white/5 rounded-2xl text-right items-stretch"
                  >
                    {/* Item Image */}
                    <div className="w-20 h-20 rounded-xl bg-[#0e0d0c] border border-white/5 p-2 flex items-center justify-center shrink-0">
                      <img
                        src={storefrontProductImage(item.image)}
                        alt={isDemoProductImage(item.image) ? 'تصویر محصول در دسترس نیست' : item.productName}
                        referrerPolicy="no-referrer"
                        onError={handleProductImageError}
                        className="product-media-source w-full h-full object-contain"
                      />
                    </div>

                    {/* Item Details */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        {/* Title & Remove */}
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-white line-clamp-1">{item.productName}</h4>
                          <button
                            onClick={() => onRemoveItem(item.id)}
                            aria-label="حذف کالا از سبد خرید"
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-stone-400 hover:text-[#E61919] hover:bg-white/5 rounded transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d] focus-visible:outline-offset-2"
                            title="حذف کالا"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Attribute Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/5 font-mono text-gray-400">
                            سایز: {item.size}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 border border-white/5 flex items-center gap-1.5 text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color.hex }} />
                            <span>{item.color.name}</span>
                          </span>
                          {item.isCustom && (
                            <span className="text-[9px] px-2 py-0.5 rounded bg-[#ba8d3d]/10 border border-[#ba8d3d]/20 text-[#eed29d] flex items-center gap-1 font-semibold">
                              <Sliders size={8} />
                              <span>طرح سفارشی POD</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {item.availabilityCode && (
                        <p role="status" className="mt-2 text-[10px] font-medium text-amber-300">
                          {item.availableQuantity === 0 ? 'این سایز دیگر موجود نیست.' : `فقط ${item.availableQuantity?.toLocaleString('fa-IR')} عدد باقی مانده است.`}
                        </p>
                      )}

                      {/* Quantity & Price Row */}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                        
                        {/* Quantity picker */}
                        <div className="flex items-center gap-1 bg-[#0e0d0c] border border-white/5 rounded-lg p-0.5">
                          <button
                            aria-label="کاهش تعداد"
                            disabled={item.quantity <= 1}
                            onClick={() => onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))}
                            className="w-11 h-11 rounded bg-white/5 hover:bg-white/10 text-gray-400 text-xs flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            -
                          </button>
                          <span className="font-mono text-xs text-white px-2.5 min-w-[20px] text-center">
                            {item.quantity.toLocaleString('fa-IR')}
                          </span>
                          <button
                            aria-label="افزایش تعداد"
                            disabled={item.availableQuantity !== undefined && item.quantity >= item.availableQuantity}
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="w-11 h-11 rounded bg-white/5 hover:bg-white/10 text-gray-400 text-xs flex items-center justify-center cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>

                        {/* Price output */}
                        <div className="text-left font-mono">
                          <span className="text-xs font-bold text-[#eed29d]">{formattedItemPrice}</span>
                          <span className="text-[8px] text-gray-500 mr-1 font-sans">تومان</span>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Checkout billing foot parameters */}
          {cart.length > 0 && (
            <div className="border-t border-white/5 bg-[#121110] px-6 py-6 space-y-4">
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>جمع کالاها</span>
                  <span className="font-mono">{formattedTotalPrice} تومان</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400">
                  <span>هزینه ارسال</span>
                  <span className="text-[#eed29d] text-[10px] bg-[#eed29d]/10 border border-[#eed29d]/20 px-2 py-0.5 rounded-full font-semibold">
                    {shippingTomans == null ? 'تعرفه هنوز تعیین نشده' : `${shippingTomans.toLocaleString('fa-IR')} تومان`}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-sm font-bold text-white">
                  <span>مجموع سبد بدون هزینه ارسال</span>
                  <span className="font-mono text-[#eed29d] text-base">{formattedTotalPrice} تومان</span>
                </div>
              </div>

              {/* Checkout CTA button-in-button pattern */}
              <button
                onClick={onCheckout}
                className="w-full group relative flex items-center justify-center gap-4 px-6 py-4.5 bg-gradient-to-r from-[#ba8d3d] to-[#e4bc71] hover:from-[#ba8d3d] hover:to-[#ba8d3d] text-[#0e0d0c] rounded-full text-xs font-bold shadow-lg transition-all duration-300 transform active:scale-95 cursor-pointer"
              >
                <span>بررسی نشانی و هزینه ارسال</span>
                <span className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center group-hover:translate-x-[-3px] transition-transform">
                  <ArrowLeft size={12} className="stroke-[2.5px]" />
                </span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
