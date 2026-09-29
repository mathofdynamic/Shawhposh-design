/**
 * Shahpoosh Luxury Streetwear - Design Review Cockpit & Version Comparator
 * URL: `/designs/:id` and `/admin/studio/designs/:id`
 * Prompt 12: High-quality garment mockup, placement safe area overlays, serialized settings,
 * compare revisions, physical blank stock check, payment verification guard, and audit history.
 */

import React, { useState, useMemo } from 'react';
import {
  Palette,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  Layers,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Box,
  Eye,
  EyeOff,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  FileText,
  User,
  ShieldCheck,
  Send,
  MessageSquare,
  HelpCircle,
  History,
  Sliders,
  Split,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  Badge,
  Button,
  Modal,
  FormField,
  Input,
  useToast,
} from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { CustomDesign, DesignReviewStatus, DesignSettings } from '../../domain/types';
import {
  toFaDigits,
  formatPriceTomans,
  formatPersianDate,
  formatPersianDateTime,
  maskPhoneNumber,
} from '../../utils/formatters';
import {
  calculateReviewSla,
  DESIGN_REVIEW_STATUS_CONFIG,
  DEFAULT_PRINT_RULE_ZONES,
  validateDesignStructuredRules,
  getUnsupportedFeatureNotice,
} from '../../domain/customStudio';

export interface DesignReviewPageProps {
  designIdProp?: string;
}

export const DesignReviewPage: React.FC<DesignReviewPageProps> = ({ designIdProp }) => {
  const { currentPath, params, navigate } = useAdminRouter();
  const {
    state,
    getCustomDesignById,
    approveCustomDesign,
    rejectCustomDesign,
    requestDesignRevision,
    submitCustomerRevision,
    addDesignStaffNote,
  } = useAdminRepository();
  const { addToast } = useToast();

  const designId = useMemo(() => {
    if (designIdProp) return designIdProp;
    if (params.id) return params.id;
    const parts = currentPath.split('/');
    return parts[parts.length - 1] || '';
  }, [designIdProp, params.id, currentPath]);

  const designDetails = useMemo(() => {
    if (!designId) return null;
    return getCustomDesignById(designId);
  }, [designId, getCustomDesignById, state.customDesigns, state.orders, state.productionJobs]);

  // View & Overlay controls
  const [showSafeOverlay, setShowSafeOverlay] = useState(true);
  const [showGarmentBg, setShowGarmentBg] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [compareRevisionNumber, setCompareRevisionNumber] = useState<number | null>(null);

  // Modals & Action Forms
  const [isApproveConfirmOpen, setIsApproveConfirmOpen] = useState(false);
  const [approveNotes, setApproveNotes] = useState('طرح با استانداردهای چاپ صنعتی آتلیه مطابقت دارد.');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('کیفیت فایل یا رزولوشن برای چاپ مستقیم مناسب نیست.');
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState('لطفاً حاشیه سفید پس‌زمینه را حذف و ابعاد را مجدداً تراز نمایید.');
  const [isCustomerSimulateOpen, setIsCustomerSimulateOpen] = useState(false);
  const [simulatedCustomerNote, setSimulatedCustomerNote] = useState('نسخه جدید با کادربندی اصلاح‌شده ارسال شد.');
  const [newStaffNote, setNewStaffNote] = useState('');
  const [showPreflightNotice, setShowPreflightNotice] = useState(false);

  if (!designDetails) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto my-12 font-sans" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-white/10 flex items-center justify-center mx-auto text-stone-500">
          <Palette size={28} />
        </div>
        <h2 className="text-lg font-bold text-white">طرح سفارشی مورد نظر یافت نشد</h2>
        <p className="text-xs text-stone-400">
          شناسه <span className="font-mono text-[#eed29d]">{designId}</span> در سوابق آتلیه آنلاین ثبت نشده است.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/admin/custom-studio/submissions')}
          icon={ArrowRight}
        >
          بازگشت به فهرست طرح‌ها
        </Button>
      </div>
    );
  }

  const { design, order, customer, blankVariant, blankProduct, payment, relatedJob } = designDetails;

  const activeZone = useMemo(() => {
    return DEFAULT_PRINT_RULE_ZONES.find((z) => z.id === design.printZone) || DEFAULT_PRINT_RULE_ZONES[0];
  }, [design.printZone]);

  const ruleValidation = useMemo(() => {
    return validateDesignStructuredRules(design, activeZone);
  }, [design, activeZone]);

  const sla = useMemo(() => {
    return calculateReviewSla(design.submittedAt, state.demoClockIso, design.status);
  }, [design.submittedAt, design.status, state.demoClockIso]);

  // Sellable Blank Stock: OnHand - Reserved >= 0
  const blankStockStats = useMemo(() => {
    if (!blankVariant) return null;
    const onHand = blankVariant.onHandStock;
    const reserved = blankVariant.reservedStock;
    const sellable = Math.max(0, onHand - reserved);
    const isLow = sellable <= (blankVariant.minStockThreshold || 3);
    return { onHand, reserved, sellable, isLow };
  }, [blankVariant]);

  // Selected revision for comparison (if active)
  const comparisonRevision = useMemo(() => {
    if (!compareRevisionNumber || !design.revisions) return null;
    return design.revisions.find((r) => r.revisionNumber === compareRevisionNumber) || null;
  }, [compareRevisionNumber, design.revisions]);

  // Settings to preview
  const activeSettings: DesignSettings = useMemo(() => {
    return (
      design.settings || {
        designMode: design.designType || 'graphic',
        selectedGraphicId: 'heeche',
        graphicName: 'کالیگرافی نستعلیق «هیچ»',
        customText: 'هیچ مگو',
        fontName: 'ایران نستعلیق',
        textColorHex: '#eed29d',
        designScale: 100,
        designPosX: 0,
        designPosY: 0,
        tshirtColorName: design.blankColorName || 'مشکی ذغالی',
        tshirtColorHex: blankVariant?.colorHex || '#1C1A1A',
      }
    );
  }, [design.settings, design.designType, design.blankColorName, blankVariant]);

  // Actions Handlers
  const handleApprove = () => {
    const res = approveCustomDesign(design.id, 'STF-02', approveNotes);
    if (res.success) {
      addToast({
        title: 'طرح با موفقیت تایید شد',
        description: res.messageFa,
        type: 'success',
      });
      setIsApproveConfirmOpen(false);
    } else {
      addToast({
        title: 'خطا در تایید طرح',
        description: res.error || 'عملیات تایید با خطا مواجه شد.',
        type: 'error',
      });
    }
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      addToast({ title: 'خطا', description: 'ثبت علت رد الزامی است.', type: 'error' });
      return;
    }
    const res = rejectCustomDesign(design.id, 'STF-02', rejectReason);
    if (res.success) {
      addToast({
        title: 'طرح رد شد',
        description: 'وضعیت به رد شده تغییر یافت. وضعیت پرداخت فاکتور طبق ناوردایی بدون تغییر باقی ماند.',
        type: 'warning',
      });
      setIsRejectOpen(false);
    }
  };

  const handleRequestRevision = () => {
    if (!revisionReason.trim()) {
      addToast({ title: 'خطا', description: 'ذکر توضیحات اصلاحیه برای خریدار الزامی است.', type: 'error' });
      return;
    }
    const res = requestDesignRevision(design.id, 'STF-02', revisionReason);
    if (res.success) {
      addToast({
        title: 'درخواست اصلاحیه ثبت شد',
        description: 'درخواست اصلاح به سوابق اضافه گردید و منتظر ارسال نسخه جدید از کاربر است.',
        type: 'success',
      });
      setIsRevisionOpen(false);
    }
  };

  const handleSimulateCustomerRevision = () => {
    const res = submitCustomerRevision(
      design.id,
      {
        designScale: Math.min(130, activeSettings.designScale + 10),
        designPosY: 0,
      },
      simulatedCustomerNote
    );
    if (res.success) {
      addToast({
        title: 'نسخه جدید کاربر شبیه‌سازی شد',
        description: 'نسخه قبلی به عنوان سند تاریخی ثبت شد و طرح مجدداً در صف داوری قرار گرفت.',
        type: 'success',
      });
      setIsCustomerSimulateOpen(false);
    }
  };

  const handleAddNote = () => {
    if (!newStaffNote.trim()) return;
    const res = addDesignStaffNote(design.id, 'STF-02', newStaffNote.trim());
    if (res.success) {
      addToast({ title: 'یادداشت ثبت شد', description: 'یادداشت داخلی با برچسب کارشناس ذخیره شد.', type: 'success' });
      setNewStaffNote('');
    }
  };

  const isOrderPaid = order?.paymentStatus === 'verified_paid';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans select-text" dir="rtl">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => navigate('/admin/custom-studio/submissions')}
            className="text-stone-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>طرح‌های آتلیه</span>
          </button>
          <span className="text-stone-600">/</span>
          <span className="text-stone-400">میز داوری فنی</span>
          <span className="text-stone-600">/</span>
          <span className="font-mono font-bold text-[#eed29d]">{design.id}</span>
        </div>

        <div className="flex items-center gap-2">
          {order && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/admin/sales/orders/${order.id}`)}
              icon={ShoppingBag}
              className="text-xs"
            >
              پرونده سفارش {order.id}
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/custom-studio/submissions')}
            icon={ArrowRight}
            className="text-xs"
          >
            بازگشت
          </Button>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-lg font-bold text-[#eed29d]">{design.id}</span>
              <Badge
                variant={DESIGN_REVIEW_STATUS_CONFIG[design.status]?.badgeVariant || 'default'}
                size="md"
              >
                {DESIGN_REVIEW_STATUS_CONFIG[design.status]?.labelFa || design.status}
              </Badge>
              <Badge variant={sla.badgeVariant} size="sm">
                SLA: {sla.labelFa} ({toFaDigits(sla.remainingTextFa)})
              </Badge>
              {design.revisionCount > 1 && (
                <Badge variant="brass" size="sm">
                  نسخه ویرایش {toFaDigits(design.revisionCount)}
                </Badge>
              )}
            </div>

            <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <span>{design.title}</span>
            </h1>

            <p className="text-xs text-stone-400 leading-relaxed max-w-2xl">
              ثبت‌شده توسط <strong>{design.customerName || customer?.fullName || 'خریدار محترم'}</strong> در تاریخ{' '}
              {formatPersianDate(design.submittedAt)} · چاپگر هدف: {activeZone.primaryTechnique}
            </p>
          </div>

          {/* Action Decision Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {design.status !== 'approved' && (
              <Button
                variant="brass"
                size="sm"
                onClick={() => setIsApproveConfirmOpen(true)}
                icon={CheckCircle2}
                className="font-bold text-xs"
              >
                تایید نهایی آتلیه
              </Button>
            )}

            {design.status !== 'rejected' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setIsRejectOpen(true)}
                icon={XCircle}
                className="text-xs"
              >
                رد طرح
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsRevisionOpen(true)}
              icon={RotateCcw}
              className="text-xs"
            >
              درخواست اصلاحیه
            </Button>
          </div>
        </div>

        {/* Unpaid Warning Banner (Prompt 12 Invariant) */}
        {!isOrderPaid && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2.5 text-xs text-amber-300">
            <AlertTriangle size={16} className="shrink-0 text-amber-400" />
            <div className="leading-relaxed">
              <strong>هشدار انضباط تسویه:</strong> فاکتور این سفارش هنوز تسویه نهایی نشده است (وضعیت پرداخت:{' '}
              {order?.paymentStatus || 'نامشخص'}). می‌توانید طرح را از نظر هنری بررسی و داوری نمایید، اما تا زمان تایید
              پرداخت در شاپرک، به صف تولید دستگاه DTG اعزام نخواهد شد.
            </div>
          </div>
        )}
      </div>

      {/* Main Review Workspace Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Visual Garment Mockup & Overlays (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Mockup Canvas Container */}
          <div className="bg-[#121110] border border-white/10 rounded-2xl p-4 md:p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[480px]">
            {/* Canvas Toolbar */}
            <div className="absolute top-4 right-4 left-4 z-20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => setShowSafeOverlay(!showSafeOverlay)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    showSafeOverlay ? 'bg-[#ba8d3d] text-black' : 'text-stone-400 hover:text-white'
                  }`}
                  title="نمایش یا پنهان‌سازی کادر ایمن چاپ و فاصله استاندارد یقه"
                >
                  کادر ایمن چاپ
                </button>
                <button
                  onClick={() => setShowGarmentBg(!showGarmentBg)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    showGarmentBg ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-white'
                  }`}
                  title="تغییر پس‌زمینه تیشرت"
                >
                  بافت لباس
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/10 rounded-xl p-1 font-mono text-[11px]">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
                  className="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-white rounded hover:bg-white/10"
                  title="کوچک‌نمایی"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="px-1 text-stone-400">{zoomLevel}٪</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
                  className="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-white rounded hover:bg-white/10"
                  title="بزرگ‌نمایی"
                >
                  <ZoomIn size={13} />
                </button>
              </div>
            </div>

            {/* Garment Mockup Visual Representation */}
            <div
              className="relative transition-transform duration-200 mt-6"
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
              }}
            >
              {/* T-Shirt Silhouette Base */}
              <div
                className="w-80 h-96 rounded-3xl relative flex items-center justify-center shadow-2xl transition-colors duration-300 border border-white/5"
                style={{
                  backgroundColor: showGarmentBg ? activeSettings.tshirtColorHex : '#1e1c1b',
                }}
              >
                {/* Collar graphic marker */}
                <div className="absolute top-2 w-28 h-10 rounded-b-full border-b-2 border-white/20 bg-black/20" />
                <div className="absolute top-5 text-[9px] text-stone-500 font-mono select-none">
                  یقه استاندارد لباس
                </div>

                {/* Printable Bounding Zone (Overlay Safe Area) */}
                <div
                  className={`w-52 h-64 border-2 rounded-xl relative flex items-center justify-center transition-all ${
                    showSafeOverlay
                      ? 'border-dashed border-[#ba8d3d]/60 bg-[#ba8d3d]/5'
                      : 'border-transparent'
                  }`}
                >
                  {showSafeOverlay && (
                    <>
                      <span className="absolute top-1 right-2 text-[8px] font-mono text-[#eed29d] bg-black/60 px-1 rounded">
                        کادر مجاز A3 ({activeZone.nameFa})
                      </span>
                      {/* Safety margin guides */}
                      <div className="absolute inset-2 border border-dotted border-emerald-400/40 rounded pointer-events-none" />
                      <div className="absolute bottom-1 text-[8px] text-emerald-400 font-mono">
                        حاشیه ایمن ۲۵ میلی‌متر
                      </div>
                    </>
                  )}

                  {/* Artwork Representation (Placed with serialized X/Y & Scale) */}
                  <div
                    className="relative transition-all duration-300 p-2 flex flex-col items-center justify-center select-none"
                    style={{
                      transform: `translate(${activeSettings.designPosX * 2}px, ${
                        activeSettings.designPosY * 2
                      }px) scale(${activeSettings.designScale / 100})`,
                    }}
                  >
                    {activeSettings.designMode === 'text' ? (
                      <div
                        className="text-center font-bold px-4 py-2"
                        style={{
                          color: activeSettings.textColorHex || '#eed29d',
                          fontFamily: 'IRANSansX, sans-serif',
                          fontSize: '22px',
                        }}
                      >
                        {activeSettings.customText || 'هیچ مگو'}
                      </div>
                    ) : (
                      <img
                        src={design.previewUrl}
                        alt={design.title}
                        className="max-w-[160px] max-h-[180px] object-contain drop-shadow-md rounded"
                        onError={(e) => {
                          // Safe artwork fallback
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    )}

                    {activeSettings.designMode === 'mixed' && activeSettings.customText && (
                      <div
                        className="text-center font-bold text-xs mt-1"
                        style={{ color: activeSettings.textColorHex || '#ffffff' }}
                      >
                        {activeSettings.customText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Status strip */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px] text-stone-400 font-fanum">
              <span>
                رنگ پارچه: <strong>{activeSettings.tshirtColorName}</strong>
              </span>
              <span>·</span>
              <span>
                مقیاس: <strong>{toFaDigits(activeSettings.designScale)}٪</strong>
              </span>
              <span>·</span>
              <span>
                جابجایی افقی/عمودی: <strong>X: {toFaDigits(activeSettings.designPosX)}٪</strong> ،{' '}
                <strong>Y: {toFaDigits(activeSettings.designPosY)}٪</strong>
              </span>
            </div>
          </div>

          {/* Revision Comparator View (When fixture has historical revisions) */}
          {design.revisions && design.revisions.length > 0 && (
            <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Split size={15} className="text-[#ba8d3d]" />
                  <span>مقایسه نسخه‌های اصلاحی (Version History Diff)</span>
                </h3>
                <span className="text-[11px] text-stone-400 font-fanum">
                  شامل {toFaDigits(design.revisions.length)} نسخه ثبت‌شده
                </span>
              </div>

              {/* Revision Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  onClick={() => setCompareRevisionNumber(null)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                    compareRevisionNumber === null
                      ? 'bg-[#ba8d3d] text-black'
                      : 'bg-stone-800 text-stone-300 hover:text-white'
                  }`}
                >
                  نسخه جاری (V{toFaDigits(design.revisionCount)})
                </button>

                {design.revisions.map((rev) => (
                  <button
                    key={rev.revisionNumber}
                    onClick={() => setCompareRevisionNumber(rev.revisionNumber)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors ${
                      compareRevisionNumber === rev.revisionNumber
                        ? 'bg-[#ba8d3d] text-black'
                        : 'bg-stone-800 text-stone-300 hover:text-white'
                    }`}
                  >
                    نسخه {toFaDigits(rev.revisionNumber)} ({formatPersianDate(rev.submittedAt)})
                  </button>
                ))}
              </div>

              {/* Revision Diff Comparison Box */}
              {comparisonRevision ? (
                <div className="p-3 bg-stone-900/80 border border-white/10 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-stone-200">
                    <span>تفاوت‌های نسخه {toFaDigits(comparisonRevision.revisionNumber)} با نسخه نهایی:</span>
                    <span className="text-[10px] text-stone-400 font-fanum">
                      ثبت: {formatPersianDateTime(comparisonRevision.submittedAt).date}
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">
                    {comparisonRevision.changeSummaryFa || 'تغییر در ابعاد و موقعیت طرح'}
                  </p>
                  {comparisonRevision.customerNote && (
                    <div className="p-2 bg-black/40 rounded text-[11px] text-stone-400 border border-white/5">
                      <strong>پیام خریدار:</strong> {comparisonRevision.customerNote}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px] font-fanum">
                    <div>
                      <span className="text-stone-500 block">مقیاس نسخه قبلی:</span>
                      <strong className="text-stone-300">{toFaDigits(comparisonRevision.settings.designScale)}٪</strong>
                    </div>
                    <div>
                      <span className="text-stone-500 block">مقیاس نسخه جاری:</span>
                      <strong className="text-emerald-400">{toFaDigits(activeSettings.designScale)}٪</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-stone-500">
                  جهت مشاهده تغییرات پارامترهای چاپ و توضیحات کاربر در نسخه‌های قبلی، روی دکمه‌های بالا کلیک کنید.
                </p>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Operational Details, Blank Stock, Order Confirmation & Audit (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card 1: Serialized Design Settings */}
          <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Sliders size={14} className="text-[#ba8d3d]" />
              <span>پیکربندی سریالایز شده طراح آنلاین (Design Settings)</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs font-fanum">
              <div className="p-2.5 bg-stone-900 rounded-xl">
                <span className="text-[10px] text-stone-400 block mb-0.5">نوع طرح انتخابی</span>
                <strong className="text-white">
                  {activeSettings.designMode === 'graphic'
                    ? 'گرافیک کالیگرافی'
                    : activeSettings.designMode === 'text'
                    ? 'متن اختصاصی'
                    : 'ترکیبی (متن + آرت‌ورک)'}
                </strong>
              </div>

              <div className="p-2.5 bg-stone-900 rounded-xl">
                <span className="text-[10px] text-stone-400 block mb-0.5">ناحیه چاپ لباس</span>
                <strong className="text-white">{activeZone.nameFa}</strong>
              </div>

              <div className="p-2.5 bg-stone-900 rounded-xl">
                <span className="text-[10px] text-stone-400 block mb-0.5">رزولوشن / فرمت</span>
                <strong className="text-white">
                  {toFaDigits(design.resolutionDpi)} DPI · {design.format}
                </strong>
              </div>

              <div className="p-2.5 bg-stone-900 rounded-xl">
                <span className="text-[10px] text-stone-400 block mb-0.5">فضای رنگی استاندارد</span>
                <strong className="text-white">{design.colorProfile}</strong>
              </div>
            </div>

            {/* Structured Rule Checks Summary */}
            <div className="p-3 bg-stone-900/60 rounded-xl border border-white/5 space-y-2 text-xs">
              <span className="text-[11px] font-bold text-stone-300 block">اعتبارسنجی مشخصات فنی چاپخانه:</span>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">حداقل رزولوشن ۳۰۰ دی‌پی‌آی:</span>
                  {ruleValidation.dpiCheck === 'valid' ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 size={12} /> تایید استاندار
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <XCircle size={12} /> کمتر از حد مجاز
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-400">فرمت وکتور / فایل شفاف:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> {design.format} سازگار
                  </span>
                </div>
              </div>

              {/* Unsupported preflight notice trigger */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] text-stone-500">پایش پیکسلی و اکسپورت RIP:</span>
                <button
                  onClick={() => setShowPreflightNotice(!showPreflightNotice)}
                  className="text-[10px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <HelpCircle size={11} />
                  <span>نیازمند پردازش فایل</span>
                </button>
              </div>

              {showPreflightNotice && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] text-amber-200 leading-relaxed">
                  <strong>توضیح فنی:</strong> {getUnsupportedFeatureNotice('deep_preflight').descriptionFa}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Blank Garment & Stock Invariants */}
          <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Box size={14} className="text-[#ba8d3d]" />
                <span>موجودی فیزیکی البسه خام (Blank Stock)</span>
              </h3>
              {blankVariant && (
                <span className="font-mono text-xs text-[#eed29d] font-bold">{blankVariant.sku}</span>
              )}
            </div>

            {blankVariant ? (
              <div className="space-y-3 text-xs font-fanum">
                <div className="text-stone-300">
                  <strong>{blankProduct?.name || 'تیشرت سوپرپنبه شهپوش'}</strong> · رنگ{' '}
                  <strong>{blankVariant.colorName}</strong> · سایز <strong>{blankVariant.size}</strong> · فیت{' '}
                  <strong>{blankVariant.fit}</strong>
                </div>

                {blankStockStats && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-stone-900 rounded-xl">
                      <span className="text-[10px] text-stone-400 block">موجودی فیزیکی</span>
                      <strong className="text-white text-sm">{toFaDigits(blankStockStats.onHand)}</strong>
                    </div>

                    <div className="p-2 bg-stone-900 rounded-xl">
                      <span className="text-[10px] text-stone-400 block">تعهد رزرو</span>
                      <strong className="text-amber-400 text-sm">{toFaDigits(blankStockStats.reserved)}</strong>
                    </div>

                    <div
                      className={`p-2 rounded-xl border ${
                        blankStockStats.isLow
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      <span className="text-[10px] block opacity-80">موجودی قابل رزرو</span>
                      <strong className="text-sm">{toFaDigits(blankStockStats.sellable)}</strong>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-500">اطلاعات تنوع انبار متصل در دسترس نیست.</p>
            )}
          </div>

          {/* Card 3: Order & Customer Link */}
          {order && (
            <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <ShoppingBag size={14} className="text-[#ba8d3d]" />
                <span>تاییدیه سفارش و وضعیت مالی</span>
              </h3>

              <div className="flex items-center justify-between text-xs font-fanum pb-2 border-b border-white/10">
                <div>
                  <span className="text-stone-400">شناسه سفارش: </span>
                  <button
                    onClick={() => navigate(`/admin/sales/orders/${order.id}`)}
                    className="font-mono font-bold text-[#eed29d] hover:underline"
                  >
                    {order.id}
                  </button>
                </div>
                <Badge
                  variant={order.paymentStatus === 'verified_paid' ? 'success' : 'warning'}
                  size="sm"
                >
                  {order.paymentStatus === 'verified_paid' ? 'تسویه موفق شاپرک' : 'در انتظار پرداخت'}
                </Badge>
              </div>

              <div className="space-y-1 text-xs text-stone-300 font-fanum">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">خریدار:</span>
                  <span className="font-bold text-white">{order.customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">شماره تماس (ماسک‌شده):</span>
                  <span>{maskPhoneNumber(order.customerPhone)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">مبلغ فاکتور:</span>
                  <span className="font-bold text-white">{formatPriceTomans(order.totalTomans)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Card 4: Customer Revision Simulation (Demo Feature from Prompt 12) */}
          <div className="p-4 bg-gradient-to-r from-stone-900 to-[#141211] border border-white/10 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <RotateCcw size={14} className="text-[#ba8d3d]" />
                <span>شبیه‌سازی ارسال نسخه اصلاحی توسط کاربر</span>
              </h3>
              <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-stone-400 font-mono">DEMO</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-relaxed">
              جهت تست فرآیند ایجاد نسخه جدید و بررسی ناوردایی پیوند نسخه‌های تاریخی بدون بازنویسی مخرب.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCustomerSimulateOpen(true)}
              className="w-full text-xs"
            >
              شبیه‌سازی ارسال نسخه اصلاحی (V{toFaDigits(design.revisionCount + 1)})
            </Button>
          </div>

          {/* Card 5: Staff Internal Notes & Audit Trail */}
          <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <History size={14} className="text-[#ba8d3d]" />
              <span>تاریخچه رخدادها و یادداشت‌های کارشناسی (Audit Trail)</span>
            </h3>

            {/* Add note input */}
            <div className="flex items-center gap-2">
              <Input
                value={newStaffNote}
                onChange={(e) => setNewStaffNote(e.target.value)}
                placeholder="ثبت یادداشت کارشناس برای این طرح..."
                className="text-xs"
              />
              <Button variant="brass" size="sm" onClick={handleAddNote} className="shrink-0 text-xs">
                ثبت
              </Button>
            </div>

            {/* Audit & Notes list */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {design.staffNotes?.map((n) => (
                <div key={n.id} className="p-2.5 bg-stone-900/90 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-stone-400 font-fanum">
                    <span className="text-[#eed29d] font-bold">{n.authorName}</span>
                    <span>{formatPersianDate(n.timestamp)}</span>
                  </div>
                  <p className="text-stone-300 text-[11px]">{n.text}</p>
                </div>
              ))}

              {design.auditTrail?.map((entry) => (
                <div key={entry.id} className="p-2 bg-stone-900/40 rounded-lg text-[11px] space-y-0.5 border border-white/5">
                  <div className="flex items-center justify-between font-fanum text-stone-400">
                    <span className="font-bold text-white">{entry.actorName}</span>
                    <span>{formatPersianDate(entry.timestamp)}</span>
                  </div>
                  <div className="text-stone-400">
                    اقدام: <strong>{entry.action}</strong>
                    {entry.notes && ` · ${entry.notes}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Confirm Approval */}
      <Modal
        isOpen={isApproveConfirmOpen}
        onClose={() => setIsApproveConfirmOpen(false)}
        title="تایید نهایی طرح و ارسال به خط چاپ DTG"
        description="با تایید این طرح، در صورت تسویه فاکتور سفارش، به صف پرینتر مستقیم صنعتی نساجی هدایت می‌شود."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsApproveConfirmOpen(false)}>
              انصراف
            </Button>
            <Button variant="brass" size="sm" onClick={handleApprove} icon={CheckCircle2}>
              تایید قطعی آتلیه
            </Button>
          </div>
        }
      >
        <div className="space-y-3 font-sans text-xs">
          <FormField label="یادداشت و تاییدیه کارشناس گرافیک:">
            <Input
              value={approveNotes}
              onChange={(e) => setApproveNotes(e.target.value)}
              placeholder="توضیحات در پرونده سفارش ثبت خواهد شد..."
            />
          </FormField>
          {!isOrderPaid && (
            <p className="text-amber-400 text-[11px] leading-relaxed">
              توجه: وضعیت پرداخت سفارش «{order?.paymentStatus || 'معلق'}» است. طبق قانون ناوردایی کارگاه، وضعیت طرح
              تایید می‌شود اما تا زمان پرداخت معتبر، دستگاه چاپ فعال نخواهد شد.
            </p>
          )}
        </div>
      </Modal>

      {/* MODAL 2: Reject Design */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="رد فنی طرح سفارشی"
        description="ثبت علت رد الزامی است و برای کاربر پیام اطلاع‌رسانی ارسال می‌گردد. وضعیت پرداخت فاکتور تغییر نخواهد کرد."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsRejectOpen(false)}>
              انصراف
            </Button>
            <Button variant="destructive" size="sm" onClick={handleReject} icon={XCircle}>
              ثبت رد طرح
            </Button>
          </div>
        }
      >
        <div className="space-y-3 font-sans text-xs">
          <FormField label="علت رد کارشناسی (جهت اعلام به خریدار):" required>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="مثال: رزولوشن کمتر از ۳۰۰ DPI، عدم تطابق کادر یا کیفیت پایین فایل..."
            />
          </FormField>
        </div>
      </Modal>

      {/* MODAL 3: Request Revision */}
      <Modal
        isOpen={isRevisionOpen}
        onClose={() => setIsRevisionOpen(false)}
        title="درخواست اصلاحیه از خریدار"
        description="ایرادات فنی طرح به کاربر اعلام شده و وضعیت سفارش در حالت انتظار اصلاحیه قرار می‌گیرد."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsRevisionOpen(false)}>
              انصراف
            </Button>
            <Button variant="brass" size="sm" onClick={handleRequestRevision} icon={Send}>
              ارسال درخواست به مشتری
            </Button>
          </div>
        }
      >
        <div className="space-y-3 font-sans text-xs">
          <FormField label="توضیحات اصلاحیه فنی برای خریدار:" required>
            <Input
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="مثال: لطفاً پس‌زمینه سفید فایل PNG حذف و نسخه ترنسپرنت ارسال شود..."
            />
          </FormField>
        </div>
      </Modal>

      {/* MODAL 4: Simulate Customer Revision (Demo helper) */}
      <Modal
        isOpen={isCustomerSimulateOpen}
        onClose={() => setIsCustomerSimulateOpen(false)}
        title="شبیه‌سازی بارگذاری نسخه اصلاحی خریدار"
        description="این ابزار نسخه جاری را در آرشیو تاریخچه ثبت نموده و یک نسخه جدید با تنظیمات کادربندی به روز ایجاد می‌کند."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsCustomerSimulateOpen(false)}>
              انصراف
            </Button>
            <Button variant="brass" size="sm" onClick={handleSimulateCustomerRevision} icon={RotateCcw}>
              ثبت نسخه اصلاحی جدید
            </Button>
          </div>
        }
      >
        <div className="space-y-3 font-sans text-xs">
          <FormField label="پیام توضیحی خریدار درباره تغییرات جدید:">
            <Input
              value={simulatedCustomerNote}
              onChange={(e) => setSimulatedCustomerNote(e.target.value)}
              placeholder="توضیحات کاربر درباره فایل اصلاحی..."
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};
