/**
 * Shahpoosh Luxury Streetwear - Scoped Manual Order Creation Modal
 * Strictly validates available stock (onHand - reserved) and catalog pricing.
 * Never creates negative stock or bypasses inventory checks.
 */

import React, { useState, useMemo } from 'react';
import { Plus, Trash2, AlertCircle, ShoppingBag, ShieldCheck, Box } from 'lucide-react';
import { Modal, Button, FormField, Input, MoneyDisplay, Badge, useToast } from '../ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { toFaDigits, formatPriceTomans } from '../../utils/formatters';

export interface ManualOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated?: (orderId: string) => void;
}

interface DraftItem {
  variantSku: string;
  quantity: number;
}

export const ManualOrderModal: React.FC<ManualOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
}) => {
  const { state, createManualOrder } = useAdminRepository();
  const { addToast } = useToast();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('0912');
  const [shippingAddress, setShippingAddress] = useState('');
  const [city, setCity] = useState('تهران');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter available variants with positive sellable stock
  const availableVariants = useMemo(() => {
    return state.variants.map((v) => {
      const p = state.products.find((prod) => prod.id === v.productId);
      const sellableStock = Math.max(0, v.onHandStock - v.reservedStock);
      const unitPrice = (p?.basePriceTomans || 590000) + v.priceAdjustmentTomans;
      return {
        variant: v,
        product: p,
        sellableStock,
        unitPrice,
      };
    });
  }, [state.variants, state.products]);

  // Currently selected variant details
  const activeSelection = useMemo(() => {
    return availableVariants.find((av) => av.variant.sku === selectedSku);
  }, [availableVariants, selectedSku]);

  // Handle adding an item to the draft
  const handleAddItem = () => {
    if (!selectedSku || !activeSelection) return;

    if (activeSelection.sellableStock <= 0) {
      addToast({
        title: 'عدم موجودی آزاد',
        description: `تنوع ${selectedSku} در حال حاضر موجودی آزاد جهت رزرو ندارد.`,
        type: 'error',
      });
      return;
    }

    const currentInDraft = items.find((i) => i.variantSku === selectedSku)?.quantity || 0;
    const requestedTotal = currentInDraft + selectedQty;

    if (requestedTotal > activeSelection.sellableStock) {
      addToast({
        title: 'موجودی ناکافی',
        description: `حداکثر موجودی آزاد این تنوع ${activeSelection.sellableStock} عدد است (تعداد درخواستی: ${requestedTotal}).`,
        type: 'error',
      });
      return;
    }

    setItems((prev) => {
      const existing = prev.find((it) => it.variantSku === selectedSku);
      if (existing) {
        return prev.map((it) =>
          it.variantSku === selectedSku ? { ...it, quantity: it.quantity + selectedQty } : it
        );
      }
      return [...prev, { variantSku: selectedSku, quantity: selectedQty }];
    });

    setSelectedSku('');
    setSelectedQty(1);
  };

  const handleRemoveItem = (sku: string) => {
    setItems((prev) => prev.filter((it) => it.variantSku !== sku));
  };

  // Calculated totals
  const subtotalTomans = useMemo(() => {
    return items.reduce((acc, it) => {
      const av = availableVariants.find((a) => a.variant.sku === it.variantSku);
      return acc + (av?.unitPrice || 0) * it.quantity;
    }, 0);
  }, [items, availableVariants]);

  const shippingFeeTomans = subtotalTomans >= 1000000 || subtotalTomans === 0 ? 0 : 45000;
  const totalTomans = subtotalTomans + shippingFeeTomans;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim() || !city.trim()) {
      addToast({
        title: 'نقص اطلاعات',
        description: 'لطفاً تمامی اطلاعات هویتی و نشانی خریدار را وارد نمایید.',
        type: 'error',
      });
      return;
    }

    if (items.length === 0) {
      addToast({
        title: 'سبد سفارش خالی است',
        description: 'حداقل یک قلم کالا با موجودی معتبر به فاکتور اضافه کنید.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    const res = createManualOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      shippingAddress: shippingAddress.trim(),
      city: city.trim(),
      items,
      notes: notes.trim() || undefined,
      staffId: state.staff[0]?.id || 'STF-01',
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      addToast({
        title: 'سفارش دستی با موفقیت صادر شد',
        description: `فاکتور ${res.data.id} با تخصیص رزرو به سیستم انبار اضافه گردید.`,
        type: 'success',
      });
      onClose();
      if (onOrderCreated) {
        onOrderCreated(res.data.id);
      }
    } else {
      addToast({
        title: 'خطا در صدور فاکتور',
        description: res.error || 'خطایی در اعتبارسنجی موجودی یا اقلام رخ داد.',
        type: 'error',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="ثبت سفارش دستی جدید (شبیه‌سازی عملیات کارگاه)"
      description="این فرم با انبارداری لحظه‌ای یکپارچه است. صدور فاکتور مشروط به موجودی فیزیکی آزاد کالا بوده و تعهد رزرو بلافاصله ثبت می‌شود."
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            انصراف
          </Button>
          <Button
            variant="brass"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || items.length === 0}
            icon={ShoppingBag}
          >
            {isSubmitting ? 'در حال صدور فاکتور...' : `ثبت نهایی و رزرو انبار (${formatPriceTomans(totalTomans)})`}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-right font-sans">
        {/* Invariant Banner */}
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
          <ShieldCheck size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>قانون انضباط موجودی:</strong> سیستم اجازه صدور سفارش با موجودی منفی یا فرضی را نمی‌دهد. هر واحد به محض ثبت، از موجودی آزاد کسر و به تعهد رزرو منتقل می‌گردد.
          </div>
        </div>

        {/* Customer Information Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-white flex items-center gap-2">
            <span>مشخصات خریدار و تحویل‌گیرنده</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="نام و نام خانوادگی خریدار" required>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثلاً: علی رضایی"
              />
            </FormField>

            <FormField label="شماره تلفن همراه" required>
              <Input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09121234567"
                dir="ltr"
              />
            </FormField>

            <FormField label="شهر مقصد" required>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="تهران"
              />
            </FormField>

            <FormField label="یادداشت و دستورالعمل داخلی (اختیاری)">
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثلاً: سفارش تلفنی مشتری VIP"
              />
            </FormField>
          </div>

          <FormField label="نشانی کامل پستی تحویل مرسوله" required>
            <Input
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="تهران، خیابان فرشته، پلاک ۱۲، واحد ۴"
            />
          </FormField>
        </div>

        {/* Item Selection with Real-time Inventory Check */}
        <div className="space-y-3 pt-4 border-t border-white/10">
          <h4 className="text-xs font-bold text-white flex items-center justify-between">
            <span>اقلام فاکتور و کنترل موجودی آزاد</span>
            <span className="text-[11px] text-stone-400 font-normal">
              تعداد تنوع‌های انبار: {toFaDigits(availableVariants.length)}
            </span>
          </h4>

          <div className="p-3 bg-stone-900/80 rounded-xl border border-white/10 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
              <div className="md:col-span-8">
                <FormField label="انتخاب محصول و تنوع SKU">
                  <select
                    className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                  >
                    <option value="">-- انتخاب از تنوع‌های کاتالوگ --</option>
                    {availableVariants.map(({ variant, product, sellableStock, unitPrice }) => (
                      <option
                        key={variant.sku}
                        value={variant.sku}
                        disabled={sellableStock <= 0}
                      >
                        {product?.name} ({variant.colorName} - سایز {variant.size}) · SKU: {variant.sku} · آزاد: {toFaDigits(sellableStock)} عدد {sellableStock <= 0 ? '(ناموجود)' : ''} · {formatPriceTomans(unitPrice)}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="md:col-span-2">
                <FormField label="تعداد">
                  <input
                    type="number"
                    min="1"
                    max={activeSelection ? activeSelection.sellableStock : 10}
                    className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-center font-fanum focus:outline-none focus:border-[#ba8d3d]"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  />
                </FormField>
              </div>

              <div className="md:col-span-2">
                <Button
                  type="button"
                  variant="brass"
                  size="sm"
                  className="w-full justify-center"
                  onClick={handleAddItem}
                  disabled={!selectedSku || !activeSelection || activeSelection.sellableStock <= 0}
                  icon={Plus}
                >
                  افزودن
                </Button>
              </div>
            </div>

            {activeSelection && (
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/5 text-stone-300">
                <div className="flex items-center gap-3">
                  <span>موجودی فیزیکی: <strong className="font-fanum text-white">{toFaDigits(activeSelection.variant.onHandStock)}</strong></span>
                  <span>رزرو شده: <strong className="font-fanum text-amber-400">{toFaDigits(activeSelection.variant.reservedStock)}</strong></span>
                  <span>قابل فروش: <strong className="font-fanum text-emerald-400">{toFaDigits(activeSelection.sellableStock)}</strong></span>
                </div>
                <div>
                  قیمت واحد: <strong className="font-fanum text-[#eed29d]">{formatPriceTomans(activeSelection.unitPrice)}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Draft Line Items Table */}
          {items.length > 0 ? (
            <div className="border border-white/10 rounded-xl overflow-hidden divide-y divide-white/10 bg-black/40">
              {items.map((it) => {
                const av = availableVariants.find((a) => a.variant.sku === it.variantSku);
                const lineTotal = (av?.unitPrice || 0) * it.quantity;
                return (
                  <div key={it.variantSku} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-stone-900 border border-white/10 flex items-center justify-center shrink-0">
                        <Box size={14} className="text-[#ba8d3d]" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white truncate">
                          {av?.product?.name || it.variantSku}
                        </div>
                        <div className="text-[11px] text-stone-400 font-fanum flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[#eed29d]">{it.variantSku}</span>
                          <span>·</span>
                          <span>سایز: {av?.variant.size}</span>
                          <span>·</span>
                          <span>رنگ: {av?.variant.colorName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 font-fanum">
                      <div className="text-right">
                        <div className="font-bold text-white">{formatPriceTomans(lineTotal)}</div>
                        <div className="text-[10px] text-stone-400">
                          {toFaDigits(it.quantity)} عدد × {formatPriceTomans(av?.unitPrice || 0)}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.variantSku)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="حذف قلم"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Price Breakdown Footer */}
              <div className="p-3.5 bg-stone-900/50 space-y-1.5 text-xs font-fanum">
                <div className="flex justify-between text-stone-400">
                  <span>جمع ارزش اقلام:</span>
                  <span>{formatPriceTomans(subtotalTomans)}</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>هزینه بسته‌بندی و ارسال:</span>
                  <span>{shippingFeeTomans === 0 ? 'رایگان (بالای ۱ میلیون)' : formatPriceTomans(shippingFeeTomans)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-white/10">
                  <span>مجموع فاکتور:</span>
                  <span className="text-[#eed29d]">{formatPriceTomans(totalTomans)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-stone-500 border border-dashed border-white/10 rounded-xl">
              هنوز کالایی به فاکتور افزوده نشده است. از منوی بالا کالای مورد نظر را انتخاب و دکمه افزودن را بزنید.
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};
