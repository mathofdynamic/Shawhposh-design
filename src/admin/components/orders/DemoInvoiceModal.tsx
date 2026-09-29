/**
 * Shahpoosh Luxury Streetwear - Demo Invoice & Packing Slip Modal
 * Clearly watermarked and marked as DEMO / فاقد اعتبار قانونی مالیاتی
 */

import React, { useRef } from 'react';
import { Printer, Download, X, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import { Order, Customer } from '../../domain/types';
import { toFaDigits, formatPriceTomans, formatPersianDate } from '../../utils/formatters';

export interface DemoInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  customer?: Customer | null;
  mode?: 'invoice' | 'packing_slip';
}

export const DemoInvoiceModal: React.FC<DemoInvoiceModalProps> = ({
  isOpen,
  onClose,
  order,
  customer,
  mode = 'invoice',
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const isPackingSlip = mode === 'packing_slip';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isPackingSlip ? `برگه بسته‌بندی و حواله خروج انبار (DEMO)` : `پیش‌فاکتور و برگه سفارش (DEMO)`}
      description="این نسخه صرفاً جهت بررسی فرآیندهای عملیاتی و دموی سیستم است و فاقد هرگونه اعتبار مالیاتی و حقوقی می‌باشد."
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <AlertTriangle size={15} className="shrink-0" />
            <span>علامت‌گذاری شده با واترمارک دمو</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              بستن
            </Button>
            <Button variant="brass" size="sm" onClick={handlePrint} icon={Printer}>
              چاپ نسخه چاپی
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Printable Paper Canvas */}
        <div
          ref={printRef}
          className="relative bg-white text-stone-900 p-6 md:p-8 rounded-xl font-sans text-xs border border-stone-300 shadow-xl overflow-hidden select-text"
          dir="rtl"
        >
          {/* Prominent Diagonal Watermark */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10 rotate-[-30deg] select-none z-0">
            <div className="text-center font-black tracking-widest text-red-600">
              <span className="text-6xl md:text-8xl block font-mono">DEMO ONLY</span>
              <span className="text-3xl md:text-5xl block font-sans mt-2">نسخه آزمایشی - فاقد اعتبار قانونی</span>
            </div>
          </div>

          {/* Top Banner Notice */}
          <div className="relative z-10 mb-6 p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-center text-amber-800 text-[11px] font-medium flex items-center justify-center gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <span>
              <strong>توجه:</strong> این سند صرفاً برای شبیه‌سازی عملیات کارگاهی برند شاه‌پوش صادر شده و یک فاکتور رسمی مالیاتی نیست.
            </span>
          </div>

          {/* Header */}
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-stone-300 gap-4">
            <div>
              <div className="text-xl font-bold font-serif text-stone-900 tracking-tight">
                خانه مد و پوشاک فاخر شاه‌پوش
              </div>
              <div className="text-[11px] text-stone-600 mt-1">
                Shahpoosh Luxury Streetwear & POD Atelier
              </div>
              <div className="text-[10px] text-stone-500 mt-0.5">
                کارگاه مرکزی: تهران، شهرک صنعتی نصیرآباد، سالن تخصصی چاپ دیجیتال
              </div>
            </div>

            <div className="text-left md:text-right font-fanum text-[11px] space-y-1 bg-stone-100 p-3 rounded-lg border border-stone-200 min-w-[200px]">
              <div>
                <span className="text-stone-500">شماره سفارش: </span>
                <span className="font-mono font-bold text-stone-900">{order.id}</span>
              </div>
              <div>
                <span className="text-stone-500">تاریخ ثبت: </span>
                <span className="font-bold text-stone-900">{formatPersianDate(order.createdAt)}</span>
              </div>
              <div>
                <span className="text-stone-500">وضعیت پرداخت: </span>
                <span className="font-bold text-stone-900">
                  {order.paymentStatus === 'verified_paid' ? 'تایید و تسویه شده' : 'معلق / پرداخت نشده'}
                </span>
              </div>
            </div>
          </div>

          {/* Buyer & Delivery Info */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-b border-stone-200">
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 block">مشخصات تحویل‌گیرنده</span>
              <div className="font-bold text-stone-900">{order.customerName}</div>
              <div className="text-[11px] text-stone-700">تلفن: {toFaDigits(order.customerPhone)}</div>
              <div className="text-[11px] text-stone-700 font-fanum">
                شهر: {order.city} · کد مشتری: {customer?.id || '---'}
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
              <span className="text-[10px] font-bold text-stone-500 block">نشانی دقیق ارسال مرسوله</span>
              <div className="text-[11px] text-stone-800 leading-relaxed">{order.shippingAddress}</div>
              <div className="text-[10px] text-stone-500 mt-1">
                روش ارسال: پست پیشتاز / تیپاکس اکسپرس · بسته‌بندی هاردباکس لوکس شاه‌پوش
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="relative z-10 my-4 overflow-x-auto">
            <table className="w-full text-right border-collapse text-[11px]">
              <thead>
                <tr className="bg-stone-200/80 text-stone-800 font-bold border-b border-stone-300">
                  <th className="py-2.5 px-3">ردیف</th>
                  <th className="py-2.5 px-3">شرح کالا و تنوع</th>
                  <th className="py-2.5 px-3">شناسه SKU</th>
                  <th className="py-2.5 px-3 text-center">تعداد</th>
                  {!isPackingSlip && <th className="py-2.5 px-3 text-left">قیمت واحد</th>}
                  {!isPackingSlip && <th className="py-2.5 px-3 text-left">مبلغ کل</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {order.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-fanum text-stone-500">{toFaDigits(idx + 1)}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-stone-900">{item.productName}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5">
                        رنگ: {item.colorName} · سایز: {item.size} · برش: {item.fit}
                        {item.isCustomPod && (
                          <span className="mr-2 inline-block px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-semibold text-[9px]">
                            چاپ سفارشی DTG
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-stone-700">{item.variantSku}</td>
                    <td className="py-2.5 px-3 text-center font-fanum font-bold text-stone-900">
                      {toFaDigits(item.quantity)}
                    </td>
                    {!isPackingSlip && (
                      <td className="py-2.5 px-3 text-left font-fanum text-stone-700">
                        {formatPriceTomans(item.unitPriceTomans)}
                      </td>
                    )}
                    {!isPackingSlip && (
                      <td className="py-2.5 px-3 text-left font-fanum font-bold text-stone-900">
                        {formatPriceTomans(item.subtotalTomans)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown (Invoice mode only) */}
          {!isPackingSlip && (
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-4 pt-4 border-t border-stone-300">
              <div className="text-[11px] text-stone-500 max-w-sm">
                <span className="font-bold text-stone-700 block mb-1">شرایط و قوانین بازگشت:</span>
                کالاهای آماده طبق دستورالعمل تا ۷ روز کاری امکان تعویض سایز دارند. اقلام شخصی‌سازی شده در استودیو چاپ طبق قوانین تجارت الکترونیک شامل تعویض سلیقه‌ای نمی‌شوند.
              </div>

              <div className="w-full md:w-64 space-y-1.5 font-fanum text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>جمع اقلام:</span>
                  <span>{formatPriceTomans(order.subtotalTomans)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>هزینه بسته‌بندی و ارسال:</span>
                  <span>{order.shippingFeeTomans === 0 ? 'رایگان' : formatPriceTomans(order.shippingFeeTomans)}</span>
                </div>
                {order.discountTomans > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>تخفیف ویژه:</span>
                    <span>-{formatPriceTomans(order.discountTomans)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-stone-300">
                  <span>مبلغ قابل پرداخت:</span>
                  <span className="text-[#ba8d3d]">{formatPriceTomans(order.totalTomans)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Packing Sign-off section (Packing slip mode) */}
          {isPackingSlip && (
            <div className="relative z-10 grid grid-cols-3 gap-4 pt-6 mt-4 border-t border-stone-300 text-center text-[10px] text-stone-600">
              <div className="border border-stone-200 p-3 rounded-lg h-24 flex flex-col justify-between">
                <span>تایید کننده انبار قطعات</span>
                <span className="text-stone-400">امضا و تاریخ</span>
              </div>
              <div className="border border-stone-200 p-3 rounded-lg h-24 flex flex-col justify-between">
                <span>بازرس کنترل کیفی (QC)</span>
                <span className="text-stone-400">امضا و تاریخ</span>
              </div>
              <div className="border border-stone-200 p-3 rounded-lg h-24 flex flex-col justify-between">
                <span>مسئول بسته‌بندی و تحویل باربری</span>
                <span className="text-stone-400">امضا و تاریخ</span>
              </div>
            </div>
          )}

          {/* Barcode & Footer Notice */}
          <div className="relative z-10 mt-6 pt-4 border-t border-stone-200 flex flex-col md:flex-row items-center justify-between text-[10px] text-stone-400 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-stone-700 font-bold tracking-widest">{order.id}</span>
              <span>· شناسه نرم‌افزاری انحصاری سامانه مدیریت شاه‌پوش</span>
            </div>
            <div className="text-amber-700 font-medium">
              نسخه شبیه‌سازی عملیات (DEMO ONLY) — فاقد ارزش معاملاتی
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
