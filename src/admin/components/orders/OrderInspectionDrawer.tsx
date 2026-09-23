import React from 'react';
import { Drawer, Button, MoneyDisplay, Badge } from '../ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { StaffRole, Order } from '../../domain/types';
import { toFaDigits, maskIpAddress } from '../../utils/formatters';

export interface OrderInspectionDrawerProps {
  orderId: string | null;
  onClose: () => void;
  currentRole?: StaffRole;
  onApproveDesign?: (designId: string) => void;
  onRefundOrder?: (order: Order) => void;
}

export const OrderInspectionDrawer: React.FC<OrderInspectionDrawerProps> = ({
  orderId,
  onClose,
  currentRole = 'super_admin',
  onApproveDesign,
  onRefundOrder,
}) => {
  const { getOrderById } = useAdminRepository();

  if (!orderId) return null;
  const details = getOrderById(orderId);
  if (!details) return null;

  const { order, customer, payment, designs } = details;

  return (
    <Drawer
      isOpen={Boolean(orderId)}
      onClose={onClose}
      title={`شناسنامه سفارش ${order.id}`}
      description={`ثبت شده در ${new Date(order.createdAt).toLocaleDateString('fa-IR')} · خریدار: ${order.customerName}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" size="sm" onClick={onClose}>
            بستن کشو
          </Button>
          <div className="flex items-center gap-2">
            {designs.length > 0 && designs[0].status === 'under_review' && onApproveDesign && (
              <Button
                variant="brass"
                size="sm"
                onClick={() => {
                  onApproveDesign(designs[0].id);
                  onClose();
                }}
              >
                تایید طرح سفارشی
              </Button>
            )}
            {order.paymentStatus === 'verified_paid' && onRefundOrder && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  onRefundOrder(order);
                  onClose();
                }}
              >
                استرداد وجه سفارش
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-right font-sans">
        {/* Customer Information */}
        <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
          <span className="text-[10px] text-gray-400 font-mono block">اطلاعات خریدار و نشانی تحویل</span>
          <div className="text-xs text-white font-semibold">
            {order.customerName} · {order.customerPhone}
          </div>
          <div className="text-[11px] text-gray-300">{order.shippingAddress}</div>
          <div className="text-[10px] text-stone-400 font-fanum mt-1">
            شهر: {order.city} · کد مشتری: {customer?.id || '---'} · رده: {customer?.tag ? (customer.tag === 'vip' ? 'طلایی (VIP)' : customer.tag === 'wholesale' ? 'عمده' : 'عادی') : '---'}
          </div>
        </div>

        {/* Line Items */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-300 block">
            اقلام فاکتور ({toFaDigits(order.items.length)} ردیف):
          </span>
          {order.items.map((it) => (
            <div
              key={it.id}
              className="p-3 bg-[#0c0b0a] border border-white/10 rounded-xl flex items-center justify-between text-xs"
            >
              <div>
                <span className="text-white font-medium block">{it.productName}</span>
                <span className="text-[10px] text-gray-400 font-mono block" dir="ltr">
                  {it.variantSku} · تعداد: {toFaDigits(it.quantity)}
                </span>
                {it.isCustomPod && (
                  <span className="text-[10px] text-[#eed29d] mt-0.5 block">
                    دارای آرت‌ورک سفارشی آتلیه چاپ شاه‌پوش
                  </span>
                )}
              </div>
              <MoneyDisplay amount={it.subtotalTomans} size="sm" />
            </div>
          ))}
        </div>

        {/* Financial Reconciliation Box */}
        <div className="p-3 bg-stone-900 border border-stone-800 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between text-stone-400">
            <span>جمع اقلام:</span>
            <MoneyDisplay amount={order.subtotalTomans} size="sm" />
          </div>
          <div className="flex justify-between text-stone-400">
            <span>هزینه ارسال پستی:</span>
            <MoneyDisplay amount={order.shippingFeeTomans} size="sm" />
          </div>
          <div className="flex justify-between text-[#eed29d] font-bold pt-1.5 border-t border-stone-800">
            <span>مبلغ نهایی فاکتور:</span>
            <MoneyDisplay amount={order.totalTomans} size="sm" />
          </div>
        </div>

        {/* Payment Transaction Details */}
        {payment && (
          <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-xs space-y-1">
            <span className="text-[10px] text-gray-400 font-mono block">تراکنش درگاه بانکی شاپرک</span>
            <div className="flex justify-between text-stone-300">
              <span>شناسه تراکنش:</span>
              <span className="font-mono text-[11px]">{payment.id}</span>
            </div>
            <div className="flex justify-between text-stone-300">
              <span>شماره پیگیری شاپرک:</span>
              <span className="font-mono text-[11px]">{payment.traceNumber}</span>
            </div>
            <div className="flex justify-between text-stone-300">
              <span>آدرس IP امن ثبت تراکنش:</span>
              <span className="font-mono text-[11px]" dir="ltr">
                {maskIpAddress(payment.maskedIpAddress)}
              </span>
            </div>
          </div>
        )}

        {/* Designs Preview if present */}
        {designs.length > 0 && (
          <div className="p-3 bg-[#0c0b0a] border border-white/10 rounded-xl space-y-2">
            <span className="text-[10px] text-[#eed29d] font-bold block">
              فایل‌های چاپ سفارشی آتلیه ({toFaDigits(designs.length)} طرح):
            </span>
            {designs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 bg-white/5 p-2 rounded-lg">
                <img
                  src={d.previewUrl}
                  alt={d.title}
                  className="w-12 h-12 object-contain bg-black rounded border border-white/10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">{d.title}</div>
                  <div className="text-[10px] text-stone-400">
                    وضعیت: {d.status === 'approved' ? 'تایید شده' : d.status === 'rejected' ? 'رد شده' : 'نیازمند داوری'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Drawer>
  );
};
