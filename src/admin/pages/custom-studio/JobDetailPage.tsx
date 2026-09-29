/**
 * Shahpoosh Luxury Streetwear - Work Order & Production Job Detail Cockpit
 * URL: `/jobs/:id` and `/admin/custom-studio/jobs/:id`
 * Prompt 13: Lean manufacturing job detail, print spec mock preview, task owner,
 * progress timestamps, status actions, garment specs, materials, and QC checklist.
 */

import React, { useState, useMemo } from 'react';
import {
  Printer,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Clock,
  Layers,
  Sparkles,
  ShoppingBag,
  Box,
  Eye,
  Sliders,
  Send,
  User,
  ShieldCheck,
  Calendar,
  Building,
  HelpCircle,
  History,
  FileCheck,
  Play,
  Pause,
  Maximize2,
  Package,
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
import { ProductionJob, ProductionStage } from '../../domain/types';
import {
  toFaDigits,
  formatPriceTomans,
  formatPersianDate,
  formatPersianDateTime,
  maskPhoneNumber,
} from '../../utils/formatters';

export const STAGE_CONFIG: Record<
  ProductionStage,
  { labelFa: string; badgeVariant: 'default' | 'success' | 'warning' | 'destructive' | 'brass'; stepIndex: number }
> = {
  ready: { labelFa: 'آماده تخصیص چاپ', badgeVariant: 'default', stepIndex: 0 },
  queued: { labelFa: 'در صف آماده‌سازی', badgeVariant: 'warning', stepIndex: 1 },
  pretreatment: { labelFa: 'اسپری زیرلایه سفید', badgeVariant: 'warning', stepIndex: 2 },
  printing_dtg: { labelFa: 'چاپ مستقیم صنعتی DTG', badgeVariant: 'brass', stepIndex: 3 },
  curing_heatpress: { labelFa: 'حرارت و تثبیت پرس', badgeVariant: 'brass', stepIndex: 4 },
  qc_inspection: { labelFa: 'بازرسی کنترل کیفیت', badgeVariant: 'warning', stepIndex: 5 },
  ready_for_fulfillment: { labelFa: 'آماده بسته‌بندی و ارسال', badgeVariant: 'success', stepIndex: 6 },
  packaging: { labelFa: 'در حال بسته‌بندی هاردباکس', badgeVariant: 'success', stepIndex: 6 },
  completed: { labelFa: 'تکمیل و تحویل باربری', badgeVariant: 'success', stepIndex: 7 },
  reprint_needed: { labelFa: 'نیازمند بازچاپ (ضایعات)', badgeVariant: 'destructive', stepIndex: -1 },
  on_hold: { labelFa: 'متوقف / دارای مانع (Hold)', badgeVariant: 'destructive', stepIndex: -1 },
};

export interface JobDetailPageProps {
  jobIdProp?: string;
}

export const JobDetailPage: React.FC<JobDetailPageProps> = ({ jobIdProp }) => {
  const { currentPath, params, navigate } = useAdminRouter();
  const {
    state,
    getProductionJobById,
    advanceProductionJob,
    holdProductionJob,
    resumeProductionJob,
    submitQcInspection,
    assignProductionJob,
  } = useAdminRepository();
  const { addToast } = useToast();

  const jobId = useMemo(() => {
    if (jobIdProp) return jobIdProp;
    if (params.id) return params.id;
    const parts = currentPath.split('/');
    return parts[parts.length - 1] || '';
  }, [jobIdProp, params.id, currentPath]);

  const jobDetails = useMemo(() => {
    if (!jobId) return null;
    return getProductionJobById(jobId);
  }, [jobId, getProductionJobById, state.productionJobs, state.orders]);

  // Action Modals
  const [isHoldOpen, setIsHoldOpen] = useState(false);
  const [holdReason, setHoldReason] = useState('نیاز به استعلام رنگ نخ یا تنظیمات پارچه از مشتری');
  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [qcPassed, setQcPassed] = useState(true);
  const [qcDefectReason, setQcDefectReason] = useState('انحراف کادر چاپ یا لکه مرکب سفید');
  const [qcNotes, setQcNotes] = useState('');
  const [wastedCount, setWastedCount] = useState(1);
  const [reprintAssigned, setReprintAssigned] = useState(true);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedOperatorId, setSelectedOperatorId] = useState('STF-04');
  const [newDueDate, setNewDueDate] = useState('');
  const [vendorPartner, setVendorPartner] = useState('');

  // Interactive Checklist
  const [checklist, setChecklist] = useState<Array<{ id: string; title: string; checked: boolean }>>([]);

  // Sync checklist when job loads
  React.useEffect(() => {
    if (jobDetails?.job.checklist) {
      setChecklist(jobDetails.job.checklist);
    }
  }, [jobDetails?.job.id]);

  if (!jobDetails) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto my-12 font-sans" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-stone-900 border border-white/10 flex items-center justify-center mx-auto text-stone-500">
          <Printer size={28} />
        </div>
        <h2 className="text-lg font-bold text-white">دستور کار تولید یافت نشد</h2>
        <p className="text-xs text-stone-400">
          شناسه <span className="font-mono text-[#eed29d]">{jobId}</span> در خط تولید ثبت نشده است.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/admin/custom-studio/production')}
          icon={ArrowRight}
        >
          بازگشت به کارگاه تولید
        </Button>
      </div>
    );
  }

  const { job, order, lineItem, design, variant, product, customer, operator } = jobDetails;

  const handleAdvance = () => {
    const res = advanceProductionJob(job.id, undefined, 'STF-04');
    if (res.success) {
      addToast({ title: 'پیشروی خط تولید', description: res.messageFa, type: 'success' });
    } else {
      addToast({ title: 'خطا', description: res.error || 'خطا در پیشروی مرحله.', type: 'error' });
    }
  };

  const handleHoldConfirm = () => {
    if (!holdReason.trim()) return;
    const res = holdProductionJob(job.id, holdReason.trim(), 'STF-04');
    if (res.success) {
      addToast({ title: 'توقف کار ثبت شد', description: 'دستور کار به وضعیت معلق منتقل گردید.', type: 'warning' });
      setIsHoldOpen(false);
    }
  };

  const handleResume = () => {
    const res = resumeProductionJob(job.id, 'STF-04');
    if (res.success) {
      addToast({ title: 'ازسرگیری دستور کار', description: 'کار به صف فعال تولید بازگشت.', type: 'success' });
    }
  };

  const handleQcSubmit = () => {
    const res = submitQcInspection(job.id, {
      passed: qcPassed,
      defectReason: qcPassed ? undefined : qcDefectReason,
      wastedGarmentCount: qcPassed ? 0 : wastedCount,
      reprintReworkAssigned: qcPassed ? false : reprintAssigned,
      operatorId: 'STF-05',
      notes: qcNotes,
    });

    if (res.success) {
      addToast({
        title: qcPassed ? 'تایید کنترل کیفی' : 'ثبت رد کنترل کیفی',
        description: res.messageFa,
        type: qcPassed ? 'success' : 'error',
      });
      setIsQcModalOpen(false);
    }
  };

  const handleAssignConfirm = () => {
    const res = assignProductionJob(job.id, selectedOperatorId, newDueDate || undefined, vendorPartner || undefined);
    if (res.success) {
      addToast({ title: 'تخصیص دستور کار', description: 'مسئول و زمان‌بندی به روز شد.', type: 'success' });
      setIsAssignModalOpen(false);
    }
  };

  const toggleChecklistItem = (cId: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === cId ? { ...item, checked: !item.checked } : item))
    );
  };

  const isOrderPaid = order?.paymentStatus === 'verified_paid';
  const isDesignApproved = !order?.hasCustomLineItem || order?.designStatus === 'approved';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans select-text" dir="rtl">
      {/* Top Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={() => navigate('/admin/custom-studio/production')}
            className="text-stone-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>کارگاه تولید DTG</span>
          </button>
          <span className="text-stone-600">/</span>
          <span className="text-stone-400">شناسنامه دستور کار</span>
          <span className="text-stone-600">/</span>
          <span className="font-mono font-bold text-[#eed29d]">{job.id}</span>
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

          {design && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/admin/custom-studio/designs/${design.id}`)}
              icon={Eye}
              className="text-xs"
            >
              داوری آتلیه {design.id}
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/custom-studio/production')}
            icon={ArrowRight}
            className="text-xs"
          >
            بازگشت به خط تولید
          </Button>
        </div>
      </div>

      {/* Main Job Banner */}
      <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-lg font-bold text-[#eed29d]">{job.id}</span>
              <Badge variant={STAGE_CONFIG[job.stage]?.badgeVariant || 'default'} size="md">
                {STAGE_CONFIG[job.stage]?.labelFa || job.stage}
              </Badge>
              {job.priority === 'rush' && (
                <Badge variant="destructive" size="sm">
                  سفارش فوری (Rush)
                </Badge>
              )}
              {job.reprintCount > 0 && (
                <Badge variant="destructive" size="sm">
                  بازچاپ {toFaDigits(job.reprintCount)} بار
                </Badge>
              )}
            </div>

            <h1 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <span>{product?.name || 'تیشرت خام پنبه سوپر'}</span>
              <span className="text-xs text-stone-400 font-fanum">
                (تعداد: {toFaDigits(job.quantity)} عدد · تنوع: {job.variantSku})
              </span>
            </h1>

            <p className="text-xs text-stone-400 leading-relaxed max-w-2xl font-fanum">
              روش چاپ: <strong>{job.printingTechnique}</strong> · موقعیت: <strong>{job.printPlacement}</strong> ·
              مهلت تحویل: <strong>{formatPersianDate(job.dueDate)}</strong>
            </p>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {job.stage === 'on_hold' ? (
              <Button variant="brass" size="sm" onClick={handleResume} icon={Play} className="text-xs font-bold">
                رفع توقف و ادامه چاپ
              </Button>
            ) : (
              <>
                {job.stage !== 'completed' && job.stage !== 'ready_for_fulfillment' && (
                  <Button
                    variant="brass"
                    size="sm"
                    onClick={handleAdvance}
                    icon={CheckCircle2}
                    className="text-xs font-bold"
                  >
                    پیشروی مرحله بعدی
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsQcModalOpen(true)}
                  icon={ShieldCheck}
                  className="text-xs"
                >
                  ثبت بازرسی QC
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setIsHoldOpen(true)}
                  icon={Pause}
                  className="text-xs"
                >
                  توقف (Hold)
                </Button>
              </>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAssignModalOpen(true)}
              icon={User}
              className="text-xs"
            >
              تخصیص اپراتور
            </Button>
          </div>
        </div>

        {/* Guardrail Banners */}
        {!isOrderPaid && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center gap-2 text-xs text-amber-300">
            <AlertTriangle size={16} className="shrink-0 text-amber-400" />
            <div>
              <strong>هشدار انضباط مالی:</strong> سفارش مربوطه هنوز در شاپرک تایید قطعی نشده است. ارسال پارچه به دستگاه
              چاپ تا زمان تسویه ممنوع است.
            </div>
          </div>
        )}

        {!isDesignApproved && (
          <div className="mt-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
            <XCircle size={16} className="shrink-0 text-rose-400" />
            <div>
              <strong>طرح داوری نشده:</strong> فایل گرافیکی این سفارش هنوز در آتلیه تایید نشده است. پیشروی خط تولید
              امکان‌پذیر نیست.
            </div>
          </div>
        )}

        {job.holdReason && (
          <div className="mt-3 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-200">
            <strong>علت توقف کارگاه:</strong> {job.holdReason}
          </div>
        )}

        {job.reworkReason && (
          <div className="mt-3 p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-200">
            <strong>علت بازچاپ (ضایعات QC):</strong> {job.reworkReason} (تعداد لباس ضایعات:{' '}
            {toFaDigits(job.wastedGarmentCount || 1)} عدد)
          </div>
        )}
      </div>

      {/* 2-Column Work Order Cockpit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Print Spec Mock Preview & Garment Specs (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Print Spec Mock Preview */}
          <div className="p-4 md:p-6 bg-[#121110] border border-white/10 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center">
            {/* Disclaimer pill as mandated by Prompt 13 */}
            <div className="w-full mb-4 p-2.5 bg-black/60 border border-white/10 rounded-xl flex items-center justify-between text-[11px] text-amber-300 font-sans">
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                <span>پیش‌نمایش شماتیک چیدمان چاپ (این ماژول خروجی نهایی ریپ پرینتر Brother نیست)</span>
              </span>
              <span className="text-[9px] font-mono text-stone-500 uppercase">MOCKUP ONLY</span>
            </div>

            {/* Garment Mockup Container */}
            <div
              className="w-72 h-88 rounded-3xl relative flex items-center justify-center shadow-2xl transition-colors duration-300 border border-white/5 my-4"
              style={{
                backgroundColor: variant?.colorHex || '#1C1A1A',
              }}
            >
              {/* Collar graphic marker */}
              <div className="absolute top-2 w-24 h-8 rounded-b-full border-b-2 border-white/20 bg-black/20" />

              {/* Printable Bounding Zone */}
              <div className="w-48 h-60 border border-dashed border-[#ba8d3d]/50 bg-[#ba8d3d]/5 rounded-xl relative flex items-center justify-center p-2">
                <span className="absolute top-1 right-1.5 text-[7px] font-mono text-[#eed29d] bg-black/70 px-1 rounded">
                  A3+ (320 × 450 mm)
                </span>

                {/* Placed graphic / text */}
                {design?.previewUrl ? (
                  <img
                    src={design.previewUrl}
                    alt={design.title}
                    className="max-w-[140px] max-h-[160px] object-contain drop-shadow-md rounded"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="text-center text-xs font-bold text-[#eed29d]">
                    {lineItem?.customDesignId ? 'طرح کالیگرافی سفارشی' : 'چاپ استاندارد کالکشن'}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full text-center text-[11px] text-stone-400 font-fanum border-t border-white/10 pt-3 mt-2">
              تنوع پارچه: <strong>{variant?.colorName || 'مشکی ذغالی'}</strong> · سایز:{' '}
              <strong>{variant?.size || 'L'}</strong> · تناسب: <strong>{variant?.fit || 'اورسایز'}</strong>
            </div>
          </div>

          {/* Garment & Fabric Technical Specifications */}
          <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3 text-xs">
            <h3 className="font-bold text-white flex items-center gap-2 text-xs">
              <Box size={14} className="text-[#ba8d3d]" />
              <span>مشخصات فنی البسه خام و پارچه (Garment Specifications)</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-fanum">
              <div className="p-2.5 bg-stone-900 rounded-xl">
                <span className="text-[10px] text-stone-400 block mb-0.5">شناسه تنوع انبار (SKU)</span>
                <strong className="text-white font-mono text-[11px]">{job.variantSku}</strong>
              </div>
              <div className="p-2.5 bg-stone-900 rounded-xl">
                <span className="text-[10px] text-stone-400 block mb-0.5">گرماژ پارچه</span>
                <strong className="text-white">۳۲۰ گرم پنبه دو نخ</strong>
              </div>
              <div className="p-2.5 bg-stone-900 rounded-xl">
                <span className="text-[10px] text-stone-400 block mb-0.5">ترکیب الیاف</span>
                <strong className="text-white">۱۰۰٪ پنبه شانه شده</strong>
              </div>
              <div className="p-2.5 bg-stone-900 rounded-xl">
                <span className="text-[10px] text-stone-400 block mb-0.5">موجودی انبار</span>
                <strong className="text-emerald-400">{toFaDigits(variant?.onHandStock || 0)} عدد</strong>
              </div>
            </div>
          </div>

          {/* Consumable Materials Requirements */}
          <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3 text-xs">
            <h3 className="font-bold text-white flex items-center gap-2 text-xs">
              <Layers size={14} className="text-[#ba8d3d]" />
              <span>مواد مصرفی و الزامات شیمیایی کارگاه (Materials Requirements)</span>
            </h3>

            <div className="space-y-2 font-fanum">
              {job.materialRequirements?.map((mat, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 bg-stone-900 rounded-xl border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        mat.consumed ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                    <span className="font-bold text-white">{mat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-stone-400">{toFaDigits(mat.quantityNeeded)}</span>
                    <Badge variant={mat.consumed ? 'success' : 'default'} size="sm">
                      {mat.consumed ? 'مصرف شده' : 'رزرو در انبار مواد'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Operational Details, QC Checklist, Audit (5 cols) */}
        <div className="lg:col-span-5 space-y-5 text-xs">
          {/* Operational Owner Card */}
          <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3">
            <h3 className="font-bold text-white flex items-center gap-2 text-xs">
              <User size={14} className="text-[#ba8d3d]" />
              <span>تخصیص اپراتور و زمان‌بندی (Work Order Ownership)</span>
            </h3>

            <div className="space-y-2 font-fanum">
              <div className="flex items-center justify-between p-2.5 bg-stone-900 rounded-xl">
                <span className="text-stone-400">اپراتور مسئول چاپ:</span>
                <strong className="text-white">{job.assignedStaffName || operator?.fullName || 'نامشخص'}</strong>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-stone-900 rounded-xl">
                <span className="text-stone-400">موعد مقرر تحویل (Due Date):</span>
                <strong className="text-white">{formatPersianDate(job.dueDate)}</strong>
              </div>

              {job.vendorPartner && (
                <div className="flex items-center justify-between p-2.5 bg-stone-900 rounded-xl">
                  <span className="text-stone-400">پیمانکار برون‌سپاری:</span>
                  <span className="text-amber-300 font-bold">{job.vendorPartner}</span>
                </div>
              )}
            </div>
          </div>

          {/* 5-Point Quality Control Checklist */}
          <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2 text-xs">
                <ShieldCheck size={14} className="text-[#ba8d3d]" />
                <span>چک‌لیست پنج‌گانه بازرسی QC پیش از بسته‌بندی</span>
              </h3>
              <Badge variant={job.qcStatus === 'passed' ? 'success' : job.qcStatus === 'failed' ? 'destructive' : 'warning'} size="sm">
                {job.qcStatus === 'passed' ? 'تایید QC' : job.qcStatus === 'failed' ? 'رد شده' : 'در انتظار بازرسی'}
              </Badge>
            </div>

            <div className="space-y-2">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                    item.checked
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-stone-900 border-white/5 text-stone-400 hover:border-white/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => {}}
                    className="mt-0.5 rounded text-[#ba8d3d] focus:ring-0"
                  />
                  <span className="text-[11px] leading-relaxed select-none">{item.title}</span>
                </div>
              ))}
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsQcModalOpen(true)}
              icon={FileCheck}
              className="w-full text-xs mt-2"
            >
              ثبت فرم رسمی آزمون کیفی و گزارش ضایعات
            </Button>
          </div>

          {/* Audit Trail & Timestamps */}
          <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3">
            <h3 className="font-bold text-white flex items-center gap-2 text-xs">
              <History size={14} className="text-[#ba8d3d]" />
              <span>ردیابی رویدادها و حسابرسی کارگاه (Audit Trail)</span>
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {job.auditTrail?.map((entry) => (
                <div key={entry.id} className="p-2.5 bg-stone-900 rounded-xl text-[11px] space-y-1">
                  <div className="flex items-center justify-between font-fanum text-stone-400">
                    <span className="text-[#eed29d] font-bold">{entry.actorName}</span>
                    <span>{formatPersianDate(entry.timestamp)}</span>
                  </div>
                  <p className="text-white font-bold">{entry.action}</p>
                  {entry.note && <p className="text-stone-400">{entry.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Hold Job */}
      <Modal
        isOpen={isHoldOpen}
        onClose={() => setIsHoldOpen(false)}
        title="توقف دستور کار تولید (Hold)"
        description="ثبت علت توقف الزامی است و برای تیم مانیتورینگ کارگاه اطلاع‌رسانی می‌شود."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsHoldOpen(false)}>
              انصراف
            </Button>
            <Button variant="destructive" size="sm" onClick={handleHoldConfirm}>
              تایید توقف
            </Button>
          </div>
        }
      >
        <div className="space-y-3 font-sans text-xs">
          <FormField label="علت توقف خط چاپ:" required>
            <Input
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="مثال: عدم تایید طیف رنگی، نقص پارچه، کسری جوهر سفید..."
            />
          </FormField>
        </div>
      </Modal>

      {/* MODAL 2: QC Inspection Form */}
      <Modal
        isOpen={isQcModalOpen}
        onClose={() => setIsQcModalOpen(false)}
        title="فرم رسمی کنترل کیفیت (QC Inspection Form)"
        description="بررسی نتایج آزمون تست کشش، ثبات شستشو، دوخت و بسته‌بندی هاردباکس."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsQcModalOpen(false)}>
              انصراف
            </Button>
            <Button variant="brass" size="sm" onClick={handleQcSubmit}>
              ثبت نتیجه نهایی QC
            </Button>
          </div>
        }
      >
        <div className="space-y-4 font-sans text-xs">
          {/* Pass / Fail Toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setQcPassed(true)}
              className={`p-3 rounded-xl border font-bold text-center transition-all ${
                qcPassed
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                  : 'bg-stone-900 border-white/10 text-stone-400'
              }`}
            >
              <CheckCircle2 size={18} className="mx-auto mb-1 text-emerald-400" />
              تایید کیفی (Pass)
            </button>

            <button
              onClick={() => setQcPassed(false)}
              className={`p-3 rounded-xl border font-bold text-center transition-all ${
                !qcPassed
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500'
                  : 'bg-stone-900 border-white/10 text-stone-400'
              }`}
            >
              <XCircle size={18} className="mx-auto mb-1 text-rose-400" />
              رد کیفی (Fail / Rework)
            </button>
          </div>

          {!qcPassed && (
            <div className="space-y-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <FormField label="علت رد کیفی و نقص قطعه:" required>
                <select
                  value={qcDefectReason}
                  onChange={(e) => setQcDefectReason(e.target.value)}
                  className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="انحراف کادر چاپ (Placement Misalignment)">انحراف کادر چاپ (Placement Misalignment)</option>
                  <option value="لکه جوهر سفید یا ناهمگونی زیرلایه (White Ink Staining)">لکه جوهر سفید یا ناهمگونی زیرلایه</option>
                  <option value="ترک‌خوردگی پیگمنت در تست کشش (Curing Failure)">ترک‌خوردگی پیگمنت در تست کشش</option>
                  <option value="نقص دوخت یقه یا پارگی تار و پود (Fabric Defect)">نقص دوخت یقه یا پارگی تار و پود</option>
                  <option value="اختلاف طیف رنگ CMYK با پروفایل تاییدشده">اختلاف طیف رنگ CMYK با پروفایل تاییدشده</option>
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3 font-fanum">
                <FormField label="تعداد البسه ضایعاتی:">
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={wastedCount}
                    onChange={(e) => setWastedCount(parseInt(e.target.value) || 1)}
                  />
                </FormField>

                <div className="pt-6">
                  <label className="flex items-center gap-2 cursor-pointer text-stone-300">
                    <input
                      type="checkbox"
                      checked={reprintAssigned}
                      onChange={(e) => setReprintAssigned(e.target.checked)}
                      className="rounded text-[#ba8d3d]"
                    />
                    <span>ارسال فوری به صف بازچاپ (Rework)</span>
                  </label>
                </div>
              </div>

              <p className="text-[10px] text-rose-300 leading-relaxed">
                قانون ناوردایی: اقلام رد شده در QC به هیچ وجه به بارنامه ارسال تحویل نخواهند شد و تا زمان بازچاپ یا
                اصلاح، وضعیت سفارش در حالت «نیازمند اصلاح» باقی می‌ماند.
              </p>
            </div>
          )}

          <FormField label="یادداشت‌های نهایی بازرس کنترل کیفیت:">
            <Input
              value={qcNotes}
              onChange={(e) => setQcNotes(e.target.value)}
              placeholder="توضیحات آزمون ماندگاری، بسته‌بندی هاردباکس و..."
            />
          </FormField>
        </div>
      </Modal>

      {/* MODAL 3: Assign Operator & Due Date */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="تخصیص اپراتور و زمان‌بندی دستور کار"
        description="تغییر مسئول خط چاپ، تاریخ مقرر تحویل و یا واگذاری به پیمانکار برون‌سپاری."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsAssignModalOpen(false)}>
              انصراف
            </Button>
            <Button variant="brass" size="sm" onClick={handleAssignConfirm}>
              ذخیره تغییرات
            </Button>
          </div>
        }
      >
        <div className="space-y-3 font-sans text-xs">
          <FormField label="اپراتور مسئول کارگاه:">
            <select
              value={selectedOperatorId}
              onChange={(e) => setSelectedOperatorId(e.target.value)}
              className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="STF-04">سهراب زارع (اپراتور ارشد پرینتر Brother GTX)</option>
              <option value="STF-05">فرشید اسدی (تکنسین چاپ و کنترل کیفی)</option>
              <option value="STF-02">استاد امین کریمی (طراح ارشد آتلیه)</option>
            </select>
          </FormField>

          <FormField label="تاریخ مقرر تحویل (Due Date):">
            <Input
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              placeholder="مثال: ۱۴۰۵/۰۷/۰۸"
            />
          </FormField>

          <FormField label="پیمانکار برون‌سپاری (اختیاری):">
            <Input
              value={vendorPartner}
              onChange={(e) => setVendorPartner(e.target.value)}
              placeholder="مثال: کارگاه تکمیلی بهار (در صورت نیاز به برون‌سپاری)"
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};
