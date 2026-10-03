import React, { useState } from 'react';
import {
  X,
  Box,
  Layers,
  ShieldCheck,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  MinusCircle,
  History,
  MapPin,
  Tag,
  CheckCircle2,
  Clock,
  User,
} from 'lucide-react';
import { ProductVariant, StockMovement } from '../../domain/types';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import { Button, FormField, Input, Select, Badge, useToast } from '../../components/ui';
import { toFaDigits, formatPriceTomans, formatPersianDate } from '../../utils/formatters';

export interface StockDetailsDrawerProps {
  sku: string | null;
  onClose: () => void;
  onStockUpdated?: () => void;
}

export const StockDetailsDrawer: React.FC<StockDetailsDrawerProps> = ({
  sku,
  onClose,
  onStockUpdated,
}) => {
  const { state, goodsReceipt, recordStockAdjustment, getStockMovements } = useCatalogAdmin();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'info' | 'receipt' | 'adjustment' | 'movements'>('info');

  // Goods receipt form state
  const [receiptQty, setReceiptQty] = useState<string>('50');
  const [receiptSupplier, setReceiptSupplier] = useState<string>('نساجی تاروپود پنبه اصفهان');
  const [receiptPoId, setReceiptPoId] = useState<string>('');
  const [receiptNotes, setReceiptNotes] = useState<string>('تخلیه بار دوره پاییزه کارگاه');

  // Adjustment form state
  const [adjustmentDelta, setAdjustmentDelta] = useState<string>('-2');
  const [adjustmentType, setAdjustmentType] = useState<'manual_adjustment' | 'production_scrap' | 'sample_pull'>('production_scrap');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('افت کیفیت بافت در تست شستشوی کارگاهی');
  const [permissionConfirmed, setPermissionConfirmed] = useState<boolean>(false);

  if (!sku) return null;

  const variant = state.variants.find((v) => v.sku === sku);
  const product = variant ? state.products.find((p) => p.id === variant.productId) : null;
  const movements = getStockMovements(sku);

  if (!variant || !product) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-[#181614] border border-white/10 rounded-2xl p-6 text-center max-w-sm">
          <p className="text-sm text-stone-300">اطلاعات تنوع انبار یافت نشد.</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    );
  }

  const availableStock = variant.onHandStock - variant.reservedStock;
  const isLowStock = availableStock <= variant.minStockThreshold;
  const isOutOfStock = availableStock <= 0;

  // Handle Goods Receipt
  const handleGoodsReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(receiptQty, 10);
    if (isNaN(qty) || qty <= 0) {
      addToast({
        title: 'تعداد نامعتبر',
        description: 'لطفاً یک عدد مثبت برای کالای دریافتی وارد نمایید.',
        type: 'error',
      });
      return;
    }

    const currentStaff = state.staff[0];
    const res = await goodsReceipt(
      variant.sku,
      qty,
      currentStaff.id,
      receiptSupplier,
      receiptPoId || undefined,
      receiptNotes
    );

    if (res.success) {
      addToast({
        title: 'رسید انبار ثبت شد',
        description: `تعداد ${toFaDigits(qty)} عدد به موجودی فیزیکی ${variant.sku} اضافه شد.`,
        type: 'success',
      });
      onStockUpdated?.();
      setActiveTab('movements');
    } else {
      addToast({
        title: 'خطا در ثبت رسید انبار',
        description: res.error || 'خطایی رخ داد.',
        type: 'error',
      });
    }
  };

  // Handle Adjustment
  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const delta = parseInt(adjustmentDelta, 10);
    if (isNaN(delta) || delta === 0) {
      addToast({
        title: 'مقدار نامعتبر',
        description: 'لطفاً مقدار کسر یا اضافه را مشخص کنید.',
        type: 'error',
      });
      return;
    }

    if (!permissionConfirmed) {
      addToast({
        title: 'تایید مجوز الزامی است',
        description: 'جهت جلوگیری از خطای انسانی، تایید مسئولیت الزامی است.',
        type: 'warning',
      });
      return;
    }

    const currentStaff = state.staff[0];
    const res = await recordStockAdjustment(
      variant.sku,
      delta,
      currentStaff.id,
      adjustmentReason,
      adjustmentType
    );

    if (res.success) {
      addToast({
        title: 'اصلاحیه موجودی ثبت شد',
        description: `تغییر ${toFaDigits(delta > 0 ? `+${delta}` : delta)} واحد در دفتر انبار ثبت گردید.`,
        type: 'success',
      });
      onStockUpdated?.();
      setActiveTab('movements');
    } else {
      addToast({
        title: 'نقض ناوردایی انبار',
        description: res.error || 'خطایی رخ داد.',
        type: 'error',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl h-full bg-[#131211] border-r border-white/10 shadow-2xl flex flex-col overflow-hidden text-right font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-[#161514] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-800 border border-white/10 flex items-center justify-center text-[#eed29d]">
              <Box size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide">{product.name}</h2>
                <Badge
                  label={variant.isCustomPodBlank ? 'بستر خام چاپ' : 'محصول آماده'}
                  variant={variant.isCustomPodBlank ? 'accent' : 'info'}
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400 font-mono">
                <span className="text-[#eed29d] font-bold">{variant.sku}</span>
                <span>•</span>
                <span className="font-sans">{variant.colorName}</span>
                <span>•</span>
                <span>سایز {variant.size}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Stock Level Quick Summary Cards */}
        <div className="grid grid-cols-3 gap-3 p-5 border-b border-white/10 bg-black/20 shrink-0">
          <div className="p-3.5 rounded-xl bg-stone-900/80 border border-white/5 text-center">
            <span className="text-[11px] text-stone-400 block mb-1">موجودی فیزیکی کل</span>
            <span className="text-xl font-bold font-fanum text-white">
              {toFaDigits(variant.onHandStock)}
            </span>
            <span className="text-[10px] text-stone-500 block mt-0.5">در قفسه انبار</span>
          </div>

          <div className="p-3.5 rounded-xl bg-stone-900/80 border border-amber-500/20 text-center">
            <span className="text-[11px] text-amber-300 block mb-1">تعهد رزرو سفارشات</span>
            <span className="text-xl font-bold font-fanum text-amber-400">
              {toFaDigits(variant.reservedStock)}
            </span>
            <span className="text-[10px] text-amber-500/80 block mt-0.5">سفارشات جاری</span>
          </div>

          <div
            className={`p-3.5 rounded-xl border text-center ${
              isOutOfStock
                ? 'bg-rose-950/20 border-rose-500/30'
                : isLowStock
                ? 'bg-amber-950/20 border-amber-500/30'
                : 'bg-emerald-950/20 border-emerald-500/30'
            }`}
          >
            <span className="text-[11px] text-stone-300 block mb-1">موجودی آزاد قابل فروش</span>
            <span
              className={`text-xl font-bold font-fanum ${
                isOutOfStock
                  ? 'text-rose-400'
                  : isLowStock
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {toFaDigits(availableStock)}
            </span>
            <span className="text-[10px] text-stone-400 block mt-0.5">
              {isOutOfStock ? 'اتمام موجودی' : isLowStock ? 'هشدار کسری' : 'موجودی پایدار'}
            </span>
          </div>
        </div>

        {/* Single Blank Architecture Invariant Notice */}
        {variant.isCustomPodBlank && (
          <div className="mx-5 my-3 p-3 bg-[#ba8d3d]/10 border border-[#ba8d3d]/30 rounded-xl text-xs text-[#eed29d] flex items-start gap-2.5 leading-relaxed">
            <ShieldCheck size={18} className="shrink-0 mt-0.5 text-[#ba8d3d]" />
            <div>
              <strong className="block font-bold">قاعده ناوردایی البسه خام چاپ:</strong>
              این تیشرت/هودی خام متمرکز است و موجودی فیزیکی آن به ازای طرح‌های مجازی آتلیه تکثیر نمی‌شود. هر سفارش چاپ از همین موجودی فیزیکی رزرو و کسر می‌گردد.
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 px-5 gap-2 shrink-0 bg-[#161514]">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
              activeTab === 'info'
                ? 'text-[#eed29d] border-[#ba8d3d]'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            اطلاعات انبار و قفسه
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('receipt')}
            className={`py-3 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'receipt'
                ? 'text-[#eed29d] border-[#ba8d3d]'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <ArrowDownLeft size={14} className="text-emerald-400" />
            ورود کالا (رسید انبار)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('adjustment')}
            className={`py-3 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'adjustment'
                ? 'text-[#eed29d] border-[#ba8d3d]'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <MinusCircle size={14} className="text-amber-400" />
            اصلاحیه / ضایعات
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('movements')}
            className={`py-3 px-3 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'movements'
                ? 'text-[#eed29d] border-[#ba8d3d]'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <History size={14} className="text-sky-400" />
            کاردکس گردش ({toFaDigits(movements.length)})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: INFO */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="bg-stone-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <MapPin size={15} className="text-[#eed29d]" />
                  موقعیت فیزیکی در سوله مرکزی
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-400 block mb-0.5">لوکیشن و شماره قفسه:</span>
                    <span className="font-mono text-white bg-black/40 px-2 py-1 rounded inline-block font-bold">
                      {variant.warehouseLocation || 'سوله مرکزی - ردیف B - قفسه ۳'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block mb-0.5">آستانه هشدار کسری:</span>
                    <span className="font-fanum text-white">
                      {toFaDigits(variant.minStockThreshold)} عدد
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block mb-0.5">بارکد بین‌المللی:</span>
                    <span className="font-mono text-stone-300">
                      {variant.barcode || '۶۲۶۰۱۲۳۴۵۶۷۸۹'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block mb-0.5">قیمت واحد فروش:</span>
                    <span className="font-fanum text-white font-bold">
                      {formatPriceTomans((variant as ProductVariant & {priceTomans?:number}).priceTomans ?? product?.basePriceTomans ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-stone-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Tag size={15} className="text-[#eed29d]" />
                  ویژگی‌های فیزیکی پارچه و دوخت
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-400 block mb-0.5">رنگ پارچه:</span>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: variant.colorHex }}
                      />
                      <span className="text-white font-medium">{variant.colorName}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-stone-400 block mb-0.5">سایز و قواره:</span>
                    <span className="text-white font-medium">
                      {variant.size} ({variant.fit === 'oversized' ? 'اورسایز آزاد' : 'قواره استاندارد'})
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-stone-400 block mb-0.5">گرماژ و نوع بافت:</span>
                    <span className="text-stone-300 leading-relaxed">
                      {product.fabricSpecs || '۱۰۰٪ پنبه ارگانیک سوپر دو نخ ۲۴۰ گرم بدون پرز'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOODS RECEIPT */}
          {activeTab === 'receipt' && (
            <form onSubmit={handleGoodsReceipt} className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 leading-relaxed">
                ثبت رسید انبار جهت ورود محموله جدید از کارخانجات نساجی. این اقدام بلافاصله موجودی فیزیکی و موجودی قابل فروش را افزایش می‌دهد.
              </div>

              <FormField label="تعداد ورودی به انبار (عدد)" required>
                <Input
                  type="number"
                  min="1"
                  value={receiptQty}
                  onChange={(e) => setReceiptQty(e.target.value)}
                  placeholder="مثلاً: ۵۰"
                />
              </FormField>

              <FormField label="تامین‌کننده / کارخانه بافندگی" required>
                <Select
                  value={receiptSupplier}
                  onChange={(e) => setReceiptSupplier(e.target.value)}
                  options={state.suppliers.map((s) => ({
                    value: s.name,
                    label: `${s.name} (${s.category})`,
                  }))}
                />
              </FormField>

              <FormField label="شماره سفارش خرید / حواله بارنامه (اختیاری)">
                <Input
                  value={receiptPoId}
                  onChange={(e) => setReceiptPoId(e.target.value)}
                  placeholder="مثلاً: PO-2026-039"
                />
              </FormField>

              <FormField label="توضیحات و یادداشت انباردار">
                <Input
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="مثلاً: بررسی کیفیت و تایید بافت بدون گره"
                />
              </FormField>

              <Button type="submit" variant="brass" size="md" className="w-full">
                ثبت رسید انبار و افزایش موجودی
              </Button>
            </form>
          )}

          {/* TAB 3: ADJUSTMENT */}
          {activeTab === 'adjustment' && (
            <form onSubmit={handleAdjustment} className="space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 leading-relaxed">
                <strong>هشدار گارد ناوردایی:</strong> هرگونه کسر موجودی بررسی می‌شود تا از تعهدات جاری سفارشات خریداران کمتر نشود. حداکثر میزان مجاز کسر در حال حاضر برابر با {toFaDigits(availableStock)} عدد است.
              </div>

              <FormField label="نوع اصلاحیه انبارداری" required>
                <Select
                  value={adjustmentType}
                  onChange={(e) => setAdjustmentType(e.target.value as any)}
                  options={[
                    { value: 'production_scrap', label: 'ضایعات خط چاپ و کنترل کیفیت (-)' },
                    { value: 'sample_pull', label: 'خروج نمونه جهت عکاسی یا شوروم (-)' },
                    { value: 'manual_adjustment', label: 'مغایرت‌گیری انبارگردانی دوره‌ای (+/-)' },
                  ]}
                />
              </FormField>

              <FormField label="تغییر موجودی (عدد منفی برای کسر، مثبت برای افزایش)" required>
                <Input
                  type="number"
                  value={adjustmentDelta}
                  onChange={(e) => setAdjustmentDelta(e.target.value)}
                  placeholder="-2"
                />
              </FormField>

              <FormField label="علت تفصیلی اصلاحیه" required>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="توضیح نقص، شماره برگه ضایعات یا صورت‌جلسه انبارگردانی"
                />
              </FormField>

              <label className="flex items-center gap-2 p-3 bg-stone-900 border border-white/10 rounded-xl text-xs text-stone-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissionConfirmed}
                  onChange={(e) => setPermissionConfirmed(e.target.checked)}
                  className="rounded text-[#ba8d3d] focus:ring-0"
                />
                <span>تایید می‌کنم که دارای مجوز سرپرستی انبار جهت ثبت این اصلاحیه هستم.</span>
              </label>

              <Button
                type="submit"
                variant="danger"
                size="md"
                disabled={!permissionConfirmed}
                className="w-full"
              >
                ثبت اصلاحیه و اعمال در کاردکس
              </Button>
            </form>
          )}

          {/* TAB 4: MOVEMENTS TIMELINE */}
          {activeTab === 'movements' && (
            <div className="space-y-3">
              {movements.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500">
                  هیچ سابقه گردشی برای این کد تنوع ثبت نشده است.
                </div>
              ) : (
                movements.map((m) => {
                  const isPositive = m.quantityChange > 0;
                  return (
                    <div
                      key={m.id}
                      className="p-3.5 bg-stone-900/70 border border-white/10 rounded-xl text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isPositive
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {toFaDigits(m.quantityChange)}
                          </span>
                          <span className="font-bold text-white">
                            {m.type === 'goods_receipt' && 'ورود کالا / رسید خرید'}
                            {m.type === 'order_reservation' && 'رزرو سفارش مشتری'}
                            {m.type === 'order_release' && 'خروج سفارش و ارسال'}
                            {m.type === 'order_cancellation' && 'لغو سفارش و آزادسازی'}
                            {m.type === 'order_refund' && 'مرجوعی به انبار'}
                            {m.type === 'production_scrap' && 'ضایعات چاپ'}
                            {m.type === 'sample_pull' && 'خروج نمونه شوروم'}
                            {m.type === 'manual_adjustment' && 'اصلاحیه انبارگردانی'}
                          </span>
                        </div>
                        <span className="text-[11px] font-fanum text-stone-400">
                          {formatPersianDate(m.timestamp)}
                        </span>
                      </div>

                      <p className="text-stone-300 text-[11px] leading-relaxed pr-8">
                        {m.reason}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-fanum text-stone-400 pr-8">
                        <div>
                          <span>فیزیکی: </span>
                          <span className="text-stone-300 font-bold">
                            {toFaDigits(m.previousOnHand)} ← {toFaDigits(m.newOnHand)}
                          </span>
                        </div>
                        <div>
                          <span>رزرو: </span>
                          <span className="text-amber-400 font-bold">
                            {toFaDigits(m.previousReserved)} ← {toFaDigits(m.newReserved)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-stone-400">
                          <User size={12} />
                          <span>{m.actorName}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
