import React, { useState } from 'react';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Printer,
  Edit3,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Building,
  User,
  Phone,
  QrCode,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button, MoneyDisplay, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { CarrierName, ShipmentStatus } from '../../domain/types';
import { CARRIER_CONFIG } from '../../domain/shippingReturnsNotifications';
import { toFaDigits } from '../../utils/formatters';

interface ShipmentDetailPageProps {
  shipmentIdProp?: string;
}

export const ShipmentDetailPage: React.FC<ShipmentDetailPageProps> = ({ shipmentIdProp }) => {
  const {
    state,
    getShipmentById,
    packShipment,
    generateMockShippingLabel,
    dispatchShipment,
    deliverShipment,
    recordShipmentAddressCorrection,
    recordShipmentException,
  } = useAdminRepository();
  const { addToast } = useToast();

  // Determine current shipment ID from prop or state fallback
  const shipmentId = shipmentIdProp || (state.shipments && state.shipments[0]?.id) || 'SHP-PKG-2001';
  const detail = getShipmentById(shipmentId);

  const [selectedCarrier, setSelectedCarrier] = useState<CarrierName>(
    detail?.shipment.carrier || 'tipax'
  );
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState('');
  const [addressReasonInput, setAddressReasonInput] = useState('');
  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [exceptionReasonInput, setExceptionReasonInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [unmaskAddress, setUnmaskAddress] = useState(false);
  const [printSlipOpen, setPrintSlipOpen] = useState(false);

  if (!detail) {
    return (
      <div className="p-8 bg-[#131211] border border-white/10 rounded-3xl text-center space-y-4 max-w-lg mx-auto mt-12">
        <AlertTriangle size={48} className="text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">مرسوله یافت نشد</h2>
        <p className="text-xs text-stone-400">
          شناسه مرسوله <span className="font-mono text-[#eed29d]">{shipmentId}</span> در سوابق سیستم ثبت نشده است.
        </p>
        <Button
          variant="brass"
          size="md"
          onClick={() => {
            window.location.hash = '#/admin/sales/shipping';
          }}
          className="mx-auto"
        >
          بازگشت به صف ارسال مرسولات
        </Button>
      </div>
    );
  }

  const { shipment, order, customer, qcEligibility } = detail;
  const carrierInfo = CARRIER_CONFIG[shipment.carrier] || CARRIER_CONFIG.tipax;

  const handleCopyTracking = () => {
    if (shipment.trackingCode) {
      navigator.clipboard.writeText(shipment.trackingCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      addToast({
        title: 'کد رهگیری کپی شد',
        description: shipment.trackingCode,
        type: 'info',
      });
    }
  };

  const handlePack = () => {
    const res = packShipment(shipment.id, 'کیان دارابی (انباردار مرکزی)');
    if (res.success) {
      addToast({
        title: 'مرسوله بسته‌بندی شد',
        description: 'کالاها در جعبه مشکی لوکس شاه‌پوش قرار گرفتند.',
        type: 'success',
      });
    } else {
      addToast({
        title: 'امکان بسته‌بندی وجود ندارد',
        description: res.error || 'خطا در بسته‌بندی مرسوله',
        type: 'critical',
      });
    }
  };

  const handleGenerateLabel = () => {
    const res = generateMockShippingLabel(
      shipment.id,
      selectedCarrier,
      'کیان دارابی (مسئول لجستیک)'
    );
    if (res.success) {
      addToast({
        title: 'بارنامه صادر شد (شبیه‌ساز)',
        description: `کد رهگیری: ${res.trackingCode}`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'خطا در صدور بارنامه',
        description: res.error,
        type: 'critical',
      });
    }
  };

  const handleDispatch = () => {
    const res = dispatchShipment(shipment.id, 'کیان دارابی');
    if (res.success) {
      addToast({
        title: 'مرسوله به ناوگان تحویل شد',
        description: `وضعیت سفارش ${shipment.orderId} به «ارسال شده» تغییر یافت.`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'امکان ارسال وجود ندارد',
        description: res.error,
        type: 'critical',
      });
    }
  };

  const handleDeliver = () => {
    const res = deliverShipment(shipment.id, 'سیستم پشتیبانی شاه‌پوش');
    if (res.success) {
      addToast({
        title: 'تحویل نهایی تایید شد',
        description: 'مرسوله با امضای خریدار تحویل داده شد.',
        type: 'success',
      });
    }
  };

  const handleSaveAddressCorrection = () => {
    if (!newAddressInput.trim()) return;
    const res = recordShipmentAddressCorrection(
      shipment.id,
      newAddressInput,
      addressReasonInput,
      'کارشناس پشتیبانی و لجستیک'
    );
    if (res.success) {
      setAddressModalOpen(false);
      setNewAddressInput('');
      setAddressReasonInput('');
      addToast({
        title: 'نشانی مرسوله اصلاح گردید',
        description: 'رویداد تغییر نشانی در پرونده ثبت شد.',
        type: 'success',
      });
    } else {
      addToast({
        title: 'خطا در ویرایش نشانی',
        description: res.error,
        type: 'critical',
      });
    }
  };

  const handleSaveException = () => {
    if (!exceptionReasonInput.trim()) return;
    const res = recordShipmentException(
      shipment.id,
      exceptionReasonInput,
      'پشتیبانی توزیع ناوگان'
    );
    if (res.success) {
      setExceptionModalOpen(false);
      setExceptionReasonInput('');
      addToast({
        title: 'رخداد استثنا در توزیع ثبت شد',
        description: 'وضعیت مرسوله به حالت استثنا تغییر یافت.',
        type: 'warning',
      });
    }
  };

  const getStatusBadge = (status: ShipmentStatus) => {
    switch (status) {
      case 'delivered':
        return <Badge label="تحویل نهایی شده" variant="success" size="md" />;
      case 'in_transit':
      case 'dispatched':
        return <Badge label="در مسیر حمل ناوگان" variant="warning" size="md" />;
      case 'label_created':
        return <Badge label="بارنامه صادر شده" variant="brass" size="md" />;
      case 'packed':
        return <Badge label="بسته‌بندی شده" variant="neutral" size="md" />;
      case 'exception':
        return <Badge label="رخداد استثنا در توزیع" variant="critical" size="md" />;
      case 'ready':
      default:
        return <Badge label="آماده بسته‌بندی در کارگاه" variant="neutral" size="md" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.location.hash = '#/admin/sales/shipping';
            }}
            className="text-stone-400 hover:text-white gap-2"
          >
            <ArrowRight size={16} />
            <span>بازگشت به صف مرسولات</span>
          </Button>
          <span className="text-stone-600">/</span>
          <span className="font-mono text-sm font-bold text-[#eed29d]">{shipment.id}</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrintSlipOpen(true)}
            className="gap-2"
          >
            <Printer size={16} />
            <span>چاپ برگه بسته‌بندی و بارکد</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddressModalOpen(true)}
            className="gap-2 text-stone-300"
          >
            <Edit3 size={16} />
            <span>اصلاح نشانی گیرنده</span>
          </Button>

          {shipment.status !== 'exception' && shipment.status !== 'delivered' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExceptionModalOpen(true)}
              className="gap-2 text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
            >
              <AlertTriangle size={16} />
              <span>ثبت رخداد استثنا</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Header Card */}
      <div className="p-6 bg-[#131211] border border-white/10 rounded-3xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-black text-white font-fanum">
                شناسنامه مرسوله {shipment.id}
              </h1>
              {getStatusBadge(shipment.status)}
            </div>
            <p className="text-xs text-stone-400">
              سفارش متناظر:{' '}
              <a
                href={`#/admin/sales/orders/${shipment.orderId}`}
                className="text-[#eed29d] hover:underline font-mono inline-flex items-center gap-1"
              >
                <span>{shipment.orderId}</span>
                <ExternalLink size={12} />
              </a>
              {' '}| خریدار:{' '}
              <a
                href={`#/admin/customers/profiles/${shipment.customerId}`}
                className="text-[#eed29d] hover:underline inline-flex items-center gap-1 font-bold"
              >
                <span>{shipment.customerName || 'کاربر گرامی'}</span>
                <ExternalLink size={12} />
              </a>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {shipment.status === 'ready' && (
              <Button
                variant="brass"
                size="md"
                onClick={handlePack}
                disabled={!qcEligibility.eligible}
                className="gap-2 shadow-lg shadow-[#eed29d]/10"
              >
                <Package size={18} />
                <span>بسته‌بندی مرسوله در کارگاه</span>
              </Button>
            )}

            {shipment.status === 'packed' && (
              <Button
                variant="brass"
                size="md"
                onClick={handleGenerateLabel}
                className="gap-2 shadow-lg shadow-[#eed29d]/10"
              >
                <Truck size={18} />
                <span>صدور بارنامه پستی و بارکد</span>
              </Button>
            )}

            {shipment.status === 'label_created' && (
              <Button
                variant="brass"
                size="md"
                onClick={handleDispatch}
                disabled={!qcEligibility.eligible}
                className="gap-2 shadow-lg shadow-emerald-500/10 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <CheckCircle2 size={18} />
                <span>تحویل بسته به راننده / مامور جمع‌آوری</span>
              </Button>
            )}

            {shipment.status === 'in_transit' && (
              <Button
                variant="brass"
                size="md"
                onClick={handleDeliver}
                className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <CheckCircle2 size={18} />
                <span>ثبت تحویل نهایی به مشتری</span>
              </Button>
            )}
          </div>
        </div>

        {/* QC Production Invariant Guard Alert */}
        {!qcEligibility.eligible && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3">
            <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-amber-200 leading-relaxed">
              <strong className="font-bold text-amber-300 block">
                توقف فرایند لجستیک (پروتکل تولید ناب - Invariant Check):
              </strong>
              <span>{qcEligibility.reasonFa}</span>
              <div className="pt-1">
                <a
                  href="#/admin/custom-studio/qc"
                  className="text-[#eed29d] underline font-bold inline-flex items-center gap-1 hover:text-white"
                >
                  <span>ورود به میز آزمون کنترل کیفیت نهایی (QC)</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        )}

        {qcEligibility.eligible && qcEligibility.hasCustomItems && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-xs text-emerald-300">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
            <span>
              تمام اقلام سفارشی چاپ مستقیم DTG این سفارش با موفقیت آزمون ۵ گانه QC و تثبیت کانوایر را پشت سر گذاشته‌اند. مرسوله مجاز به بسته‌بندی و الصاق شناسنامه اصالت است.
            </span>
          </div>
        )}
      </div>

      {/* Grid: Left Column (Packing list & Carrier), Right Column (Tracking Timeline & Info) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Packing List Card */}
          <div className="p-6 bg-[#131211] border border-white/10 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Package size={18} className="text-[#eed29d]" />
                <h2 className="text-sm font-bold text-white">فهرست اقلام بسته‌بندی (Packing List)</h2>
              </div>
              <span className="text-xs text-stone-400 font-fanum">
                {toFaDigits(shipment.items?.length || 0)} قلم کالا
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {(shipment.items || []).map((it, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{it.productName}</span>
                      {it.isCustomPod ? (
                        <Badge label="چاپ مستقیم سفارشی (POD)" variant="brass" size="sm" />
                      ) : (
                        <Badge label="محصول کاتالوگ" variant="neutral" size="sm" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-400">
                      <span className="font-mono text-stone-300">SKU: {it.sku}</span>
                      {it.designTitle && (
                        <span>
                          طرح:{' '}
                          <a
                            href={`#/admin/custom-studio/designs/${it.designId || ''}`}
                            className="text-[#eed29d] hover:underline"
                          >
                            {it.designTitle}
                          </a>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-xs text-stone-400 block">تعداد</span>
                    <span className="text-base font-bold text-white font-fanum">
                      {toFaDigits(it.quantity)} عدد
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-stone-900/60 border border-white/5 rounded-2xl flex items-center justify-between text-xs text-stone-300">
              <span className="text-stone-400">الزامات بسته‌بندی لوکس:</span>
              <span className="text-emerald-400 font-bold">
                ✓ جعبه مشکی هاردباکس مات + کاغذ پوستی زرکوب + شناسنامه اصالت
              </span>
            </div>
          </div>

          {/* Carrier Selection & Live Rates Display */}
          <div className="p-6 bg-[#131211] border border-white/10 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-[#eed29d]" />
                <h2 className="text-sm font-bold text-white">پیکربندی و انتخاب ناوگان حمل (Carrier Setup)</h2>
              </div>
              <Badge label="شبیه‌ساز دمو فعال" variant="neutral" size="sm" />
            </div>

            <p className="text-xs text-stone-400 leading-relaxed">
              نرخ‌نامه و درگاه‌های وب‌سرویس پستی جهت صدور بارنامه الکترونیک و استعلام بارکد:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(Object.keys(CARRIER_CONFIG) as CarrierName[]).map((cKey) => {
                const cfg = CARRIER_CONFIG[cKey];
                const isSelected = selectedCarrier === cKey;
                return (
                  <button
                    key={cKey}
                    type="button"
                    onClick={() => setSelectedCarrier(cKey)}
                    className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#eed29d]/10 border-[#eed29d] ring-1 ring-[#eed29d]/30'
                        : 'bg-[#181716] border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white">{cfg.nameFa}</span>
                      {isSelected && <Check size={16} className="text-[#eed29d]" />}
                    </div>
                    <div className="flex items-center justify-between w-full text-xs text-stone-400 pt-2 border-t border-white/5">
                      <span>زمان تحویل: {cfg.deliveryTimeDays}</span>
                      <MoneyDisplay amount={cfg.basePriceTomans} size="xs" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Carrier sync notice */}
            <div className="p-3 bg-stone-900/60 border border-white/5 rounded-2xl text-[11px] text-stone-400 space-y-1">
              <div className="font-bold text-stone-300">وضعیت اتصال به درگاه API ناوگان:</div>
              <div>{carrierInfo.mockNotice}</div>
            </div>
          </div>

          {/* Delivery Address & Customer Contact Info */}
          <div className="p-6 bg-[#131211] border border-white/10 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-[#eed29d]" />
                <h2 className="text-sm font-bold text-white">مشخصات گیرنده و مقصد توزیع</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUnmaskAddress(!unmaskAddress)}
                className="text-xs text-stone-400 hover:text-white"
              >
                {unmaskAddress ? 'مخفی‌سازی مشخصات' : 'نمایش کامل (با مجوز)'}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-stone-900/60 rounded-xl space-y-1">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <User size={14} />
                  <span>نام گیرنده:</span>
                </span>
                <span className="text-white font-bold block text-sm">
                  {shipment.recipientName || shipment.customerName || 'کاربر گرامی'}
                </span>
              </div>

              <div className="p-3 bg-stone-900/60 rounded-xl space-y-1">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <Phone size={14} />
                  <span>تلفن تماس:</span>
                </span>
                <span className="text-white font-bold block text-sm font-mono" dir="ltr">
                  {unmaskAddress
                    ? shipment.recipientPhone || '09121234567'
                    : (shipment.recipientPhone || '09121234567').replace(/(\d{4})\d{4}(\d{3})/, '$1****$2')}
                </span>
              </div>

              <div className="sm:col-span-2 p-3 bg-stone-900/60 rounded-xl space-y-1">
                <span className="text-stone-400 flex items-center gap-1.5">
                  <Building size={14} />
                  <span>نشانی پستی تحویل:</span>
                </span>
                <span className="text-white font-bold block leading-relaxed">
                  {unmaskAddress
                    ? shipment.shippingAddress || 'تهران، خیابان ولیعصر'
                    : (shipment.shippingAddress || 'تهران، خیابان ولیعصر').replace(/پلاک\s*\d+/, 'پلاک **')}
                </span>
              </div>
            </div>

            {/* Address Corrections History */}
            {shipment.addressCorrections && shipment.addressCorrections.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-xs font-bold text-amber-300 block">
                  تاریخچه اصلاحات نشانی (Address Correction Events):
                </span>
                <div className="space-y-2">
                  {shipment.addressCorrections.map((ac) => (
                    <div
                      key={ac.id}
                      className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs space-y-1 text-stone-300"
                    >
                      <div className="flex items-center justify-between text-amber-400">
                        <span className="font-bold">{ac.actorName}</span>
                        <span className="text-[10px] text-stone-400 font-fanum">
                          {new Date(ac.timestamp).toLocaleDateString('fa-IR')}
                        </span>
                      </div>
                      <div>
                        نشانی جدید: <strong className="text-white">{ac.newAddress}</strong>
                      </div>
                      <div className="text-[10px] text-stone-400">علت: {ac.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tracking Code Card & Chronological Timeline */}
        <div className="space-y-6">
          {/* Tracking Reference & Barcode Card */}
          <div className="p-6 bg-[#131211] border border-white/10 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs text-stone-400">کد رهگیری / بارنامه</span>
              <span className="text-xs font-bold text-[#eed29d]">{carrierInfo.nameFa}</span>
            </div>

            <div className="p-4 bg-black/60 border border-white/10 rounded-2xl text-center space-y-2">
              <div className="font-mono text-lg font-black text-white tracking-wider" dir="ltr">
                {shipment.trackingCode || 'در انتظار صدور بارنامه'}
              </div>

              {shipment.trackingCode && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyTracking}
                    className="text-xs gap-1.5"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copiedCode ? 'کپی شد' : 'کپی بارکد'}</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Summary KPIs */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-stone-400">هزینه ارسال:</span>
                <MoneyDisplay amount={shipment.shippingFeeTomans} size="xs" />
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                <span className="text-stone-400">شهر مقصد:</span>
                <span className="text-white font-bold">{shipment.destinationCity}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-stone-400">تحویل تخمینی:</span>
                <span className="text-stone-300 font-fanum">
                  {new Date(shipment.estimatedDeliveryDate).toLocaleDateString('fa-IR')}
                </span>
              </div>
            </div>
          </div>

          {/* Chronological Tracking Timeline */}
          <div className="p-6 bg-[#131211] border border-white/10 rounded-3xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#eed29d]" />
                <h3 className="text-sm font-bold text-white">رویدادهای رهگیری مرسوله</h3>
              </div>
            </div>

            <div className="space-y-4 relative before:absolute before:top-2 before:bottom-2 before:right-2 before:w-0.5 before:bg-white/10 pr-6">
              {(shipment.timeline || []).map((ev, i) => (
                <div key={i} className="relative space-y-1">
                  <div
                    className={`absolute -right-6 top-1 w-2.5 h-2.5 rounded-full ring-4 ring-[#131211] ${
                      ev.isCompleted ? 'bg-emerald-400' : 'bg-stone-600'
                    }`}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{ev.titleFa}</span>
                    <span className="text-[10px] text-stone-500 font-fanum">
                      {new Date(ev.timestamp).toLocaleTimeString('fa-IR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">{ev.descriptionFa}</p>
                  {ev.location && (
                    <span className="text-[10px] text-[#eed29d] block">موقعیت: {ev.location}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Exception Details */}
          {shipment.status === 'exception' && (
            <div className="p-5 bg-rose-500/10 border border-rose-500/20 rounded-3xl space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <AlertTriangle size={16} />
                <span>گزارش نقص در توزیع پستی</span>
              </div>
              <p className="text-xs text-rose-200 leading-relaxed">
                {shipment.exceptionReason || 'عدم حضور گیرنده در نشانی ثبت‌شده پستی.'}
              </p>
              <Button
                variant="brass"
                size="sm"
                onClick={handleDispatch}
                className="w-full gap-2 text-xs"
              >
                <RefreshCw size={14} />
                <span>هماهنگی ارسال مجدد مرسوله</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Address Correction Modal */}
      {addressModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181716] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Edit3 size={18} className="text-[#eed29d]" />
              <span>اصلاح نشانی گیرنده مرسوله</span>
            </h3>
            <p className="text-xs text-stone-400">
              نشانی فعلی: <span className="text-white">{shipment.shippingAddress}</span>
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-stone-300">نشانی کامل جدید:</label>
                <textarea
                  rows={3}
                  value={newAddressInput}
                  onChange={(e) => setNewAddressInput(e.target.value)}
                  placeholder="استان، شهر، خیابان اصلی، پلاک، واحد..."
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#eed29d]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-300">علت اصلاح:</label>
                <input
                  type="text"
                  value={addressReasonInput}
                  onChange={(e) => setAddressReasonInput(e.target.value)}
                  placeholder="مثال: تماس تلفنی خریدار به دلیل تغییر محل کار"
                  className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#eed29d]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setAddressModalOpen(false)}>
                انصراف
              </Button>
              <Button
                variant="brass"
                size="sm"
                onClick={handleSaveAddressCorrection}
                disabled={!newAddressInput.trim()}
              >
                ثبت نشانی جدید
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Exception Event Modal */}
      {exceptionModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#181716] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 text-rose-400">
              <AlertTriangle size={18} />
              <span>ثبت رخداد استثنا در توزیع پستی</span>
            </h3>

            <div className="space-y-2">
              <label className="text-xs text-stone-300">علت عدم تحویل یا تاخیر ناوگان:</label>
              <textarea
                rows={3}
                value={exceptionReasonInput}
                onChange={(e) => setExceptionReasonInput(e.target.value)}
                placeholder="مثال: عدم حضور خریدار در نشانی، آسیب به بسته در هاب یا اشتباه مامور توزیع..."
                className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-rose-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setExceptionModalOpen(false)}>
                انصراف
              </Button>
              <Button
                variant="brass"
                size="sm"
                onClick={handleSaveException}
                disabled={!exceptionReasonInput.trim()}
                className="bg-rose-600 hover:bg-rose-500 text-white"
              >
                ثبت استثنا
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Mock Packing Slip Modal */}
      {printSlipOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white text-black max-w-xl w-full p-8 rounded-2xl shadow-2xl space-y-6 text-right font-sans">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-lg font-black tracking-tight">برگه ارسال و شناسنامه مرسوله شاه‌پوش</h2>
                <p className="text-xs text-gray-500">Luxury Streetwear Workshop Dispatch Slip</p>
              </div>
              <div className="text-left font-mono text-sm font-bold">
                {shipment.id}
                <div className="text-xs text-gray-500">{carrierInfo.nameFa}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500 block">گیرنده:</span>
                <strong className="text-sm block">{shipment.recipientName || 'کاربر گرامی'}</strong>
                <div className="mt-1" dir="ltr">{shipment.recipientPhone}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500 block">کد رهگیری بارنامه:</span>
                <strong className="text-sm font-mono block" dir="ltr">
                  {shipment.trackingCode || 'MOCK-LABEL-ACTIVE'}
                </strong>
                <span className="text-[10px] text-gray-400">بارکد استاندارد پستی</span>
              </div>
              <div className="col-span-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500 block">نشانی تحویل:</span>
                <strong className="block leading-relaxed">{shipment.shippingAddress}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold block text-gray-700">اقلام بسته:</span>
              <table className="w-full text-xs border">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-2 text-right">عنوان کالا</th>
                    <th className="p-2 text-right">کد SKU</th>
                    <th className="p-2 text-center">تعداد</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(shipment.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2">{it.productName}</td>
                      <td className="p-2 font-mono">{it.sku}</td>
                      <td className="p-2 text-center font-bold">{it.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t pt-4 flex items-center justify-between text-xs text-gray-500">
              <span>تایید بسته‌بندی کارگاه: کیان دارابی</span>
              <span>مهر کنترل کیفیت (QC Passed) ✓</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => setPrintSlipOpen(false)} className="text-gray-600">
                بستن
              </Button>
              <Button
                variant="brass"
                size="sm"
                onClick={() => {
                  window.print();
                }}
                className="gap-2 bg-black text-white hover:bg-gray-800"
              >
                <Printer size={16} />
                <span>پرینت فیزیکی</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
