/**
 * Shahpoosh Luxury Streetwear - Custom Studio Quick Approval Cockpit
 * URL: `/approval` and `/admin/custom-studio/approval`
 * Prompt 12: Technical graphic review, DPI validation, SLA urgency, and verified payment enforcement.
 */

import React, { useState, useMemo } from 'react';
import {
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Eye,
  Sliders,
  Sparkles,
  ShoppingBag,
  CreditCard,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Badge, Modal, FormField, Input, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { CustomDesign } from '../../domain/types';
import {
  toFaDigits,
  formatPriceTomans,
  formatPersianDate,
  maskPhoneNumber,
} from '../../utils/formatters';
import {
  calculateReviewSla,
  DESIGN_REVIEW_STATUS_CONFIG,
  DEFAULT_PRINT_RULE_ZONES,
  validateDesignStructuredRules,
  getUnsupportedFeatureNotice,
} from '../../domain/customStudio';
import { SubmissionsPage } from './SubmissionsPage';

export interface ApprovalPageProps {
  defaultTab?: 'cockpit' | 'submissions';
}

export const ApprovalPage: React.FC<ApprovalPageProps> = ({ defaultTab = 'cockpit' }) => {
  const [activeTab, setActiveTab] = useState<'cockpit' | 'submissions'>(defaultTab);
  const { state, approveCustomDesign, rejectCustomDesign, requestDesignRevision } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();

  const [selectedDesign, setSelectedDesign] = useState<CustomDesign | null>(null);
  const [rejectReason, setRejectReason] = useState('کیفیت فایل ارسالی یا رزولوشن کمتر از ۳۰۰ DPI است.');
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [targetRejectId, setTargetRejectId] = useState<string | null>(null);

  const [revisionReason, setRevisionReason] = useState('لطفاً حاشیه سفید پس‌زمینه را حذف و ابعاد را تراز نمایید.');
  const [isRevisionOpen, setIsRevisionOpen] = useState(false);
  const [targetRevisionId, setTargetRevisionId] = useState<string | null>(null);

  const pendingDesigns = useMemo(() => {
    return state.customDesigns
      .filter((d) => d.status === 'under_review' || d.status === 'submitted')
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  }, [state.customDesigns]);

  const recentDecisions = useMemo(() => {
    return state.customDesigns
      .filter((d) => d.status === 'approved' || d.status === 'rejected' || d.status === 'revision_requested')
      .slice(0, 8);
  }, [state.customDesigns]);

  const handleApprove = (design: CustomDesign) => {
    const res = approveCustomDesign(design.id, 'STF-02', 'تایید فنی و ارسال به پرینتر مستقیم صنعتی DTG');
    if (res.success) {
      addToast({
        title: 'طرح تایید شد',
        description: res.messageFa,
        type: res.dispatchedToProduction ? 'success' : 'warning',
      });
      if (selectedDesign?.id === design.id) setSelectedDesign(null);
    } else {
      addToast({ title: 'خطا', description: res.error || 'خطا در تایید طرح.', type: 'error' });
    }
  };

  const handleRejectConfirm = () => {
    if (!targetRejectId) return;
    const res = rejectCustomDesign(targetRejectId, 'STF-02', rejectReason);
    if (res.success) {
      addToast({
        title: 'طرح رد شد',
        description: 'طرح به وضعیت رد شده تغییر یافت. وضعیت پرداخت سفارش دست‌نخورده باقی ماند.',
        type: 'warning',
      });
      setIsRejectOpen(false);
      setTargetRejectId(null);
      if (selectedDesign?.id === targetRejectId) setSelectedDesign(null);
    }
  };

  const handleRevisionConfirm = () => {
    if (!targetRevisionId) return;
    const res = requestDesignRevision(targetRevisionId, 'STF-02', revisionReason);
    if (res.success) {
      addToast({
        title: 'درخواست اصلاحیه ثبت شد',
        description: 'توضیحات اصلاح برای خریدار ثبت گردید.',
        type: 'success',
      });
      setIsRevisionOpen(false);
      setTargetRevisionId(null);
      if (selectedDesign?.id === targetRevisionId) setSelectedDesign(null);
    }
  };

  return (
    <div className="space-y-6 select-text font-sans pb-16" dir="rtl">
      <AdminPageHeader
        title="داوری فنی و تایید طرح‌های آتلیه"
        description="میز کارشناس گرافیک و ناظر چاپخانه: اعتبارسنجی رزولوشن ۳۰۰ DPI، بررسی کادر ایمن روی بافت لباس و نظارت بر مهلت SLA."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/custom-studio/printing-rules')}
              icon={Sliders}
              className="text-xs"
            >
              مقررات فنی چاپ
            </Button>
          </div>
        }
      />

      {/* Workspace Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-px overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('cockpit')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'cockpit'
              ? 'border-[#ba8d3d] text-[#eed29d] bg-white/[0.03] rounded-t-lg'
              : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-700'
          }`}
        >
          <FileCheck size={16} className={activeTab === 'cockpit' ? 'text-[#ba8d3d]' : 'text-stone-500'} />
          <span>پیش‌خوان داوری سریع</span>
          {pendingDesigns.length > 0 && (
            <span className="bg-amber-500/20 text-amber-300 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
              {toFaDigits(pendingDesigns.length)}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'submissions'
              ? 'border-[#ba8d3d] text-[#eed29d] bg-white/[0.03] rounded-t-lg'
              : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-700'
          }`}
        >
          <Layers size={16} className={activeTab === 'submissions' ? 'text-[#ba8d3d]' : 'text-stone-500'} />
          <span>جدول کل طرح‌ها و سوابق</span>
          <span className="bg-white/10 text-stone-300 font-mono text-[10px] px-2 py-0.5 rounded-full">
            {toFaDigits(state.customDesigns.length)}
          </span>
        </button>
      </div>

      {activeTab === 'submissions' ? (
        <SubmissionsPage />
      ) : (
        <>
          {/* Pending Reviews Queue */}
          <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            طرح‌های نیازمند بررسی فوری ({toFaDigits(pendingDesigns.length)} طرح در نوبت)
          </h2>
          <span className="text-xs text-stone-400 font-fanum">
            استاندارد کارگاه: حداقل ۳۰۰ دی‌پی‌آی · مهلت داوری ۲۴ ساعته
          </span>
        </div>

        {pendingDesigns.length === 0 ? (
          <div className="p-10 bg-[#131211] border border-white/10 rounded-2xl text-center space-y-2">
            <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">صف داوری آتلیه خالی است!</h3>
            <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
              تمامی طرح‌های ارسالی کاربران بررسی و تعیین وضعیت شده‌اند. طرح‌های جدید بلافاصله پس از ثبت در سایت اینجا ظاهر
              می‌شوند.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingDesigns.map((design) => {
              const order = state.orders.find((o) => o.id === design.orderId);
              const zone = DEFAULT_PRINT_RULE_ZONES.find((z) => z.id === design.printZone) || DEFAULT_PRINT_RULE_ZONES[0];
              const sla = calculateReviewSla(design.submittedAt, state.demoClockIso, design.status);
              const isPaid = order?.paymentStatus === 'verified_paid';

              return (
                <div
                  key={design.id}
                  className="bg-[#141211] border border-white/10 hover:border-white/20 transition-all rounded-2xl p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    {/* Header bar of the card */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-16 rounded-xl bg-stone-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img
                            src={design.previewUrl}
                            alt={design.title}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>

                        <div className="space-y-0.5">
                          <button
                            onClick={() => navigate(`/admin/custom-studio/designs/${design.id}`)}
                            className="text-sm font-bold text-white hover:text-[#eed29d] transition-colors block text-right"
                          >
                            {design.title}
                          </button>
                          <div className="flex items-center gap-2 text-[11px] font-mono">
                            <span className="text-[#eed29d] font-bold">{design.id}</span>
                            <span className="text-stone-600">·</span>
                            <span className="text-stone-400">سفارش: {design.orderId}</span>
                          </div>
                          <div className="text-[10px] text-stone-400 font-sans">
                            ناحیه چاپ: <strong>{zone.nameFa}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <Badge variant={sla.badgeVariant} size="sm">
                          {sla.labelFa}
                        </Badge>
                        <span className="text-[10px] text-stone-400 font-fanum">
                          {toFaDigits(sla.remainingTextFa)}
                        </span>
                      </div>
                    </div>

                    {/* Metadata strip */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-fanum bg-stone-900/60 p-2.5 rounded-xl border border-white/5">
                      <div>
                        <span className="text-[10px] text-stone-500 block">مشخصات فایل:</span>
                        <strong className="text-stone-300">
                          {toFaDigits(design.resolutionDpi)} DPI · {design.format} ({design.colorProfile})
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-stone-500 block">وضعیت پرداخت فاکتور:</span>
                        <strong className={isPaid ? 'text-emerald-400' : 'text-amber-400'}>
                          {isPaid ? 'تسویه تاییدشده' : 'پرداخت معلق (فاقد اعزام)'}
                        </strong>
                      </div>
                    </div>

                    {/* Customer note / special request */}
                    {design.customerNote && (
                      <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 text-[11px] text-stone-300 leading-relaxed">
                        <strong className="text-[#eed29d]">توضیحات خریدار:</strong> {design.customerNote}
                      </div>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/admin/custom-studio/designs/${design.id}`)}
                      icon={ArrowUpRight}
                      className="text-xs"
                    >
                      میز داوری و کادر ایمن
                    </Button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setTargetRevisionId(design.id);
                          setIsRevisionOpen(true);
                        }}
                        className="text-xs"
                        icon={RotateCcw}
                      >
                        اصلاحیه
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setTargetRejectId(design.id);
                          setIsRejectOpen(true);
                        }}
                        className="text-xs"
                        icon={XCircle}
                      >
                        رد
                      </Button>

                      <Button
                        variant="brass"
                        size="sm"
                        onClick={() => handleApprove(design)}
                        className="text-xs font-bold"
                        icon={CheckCircle2}
                      >
                        تایید
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Decisions Section */}
      <div className="p-4 md:p-6 bg-[#141211] border border-white/10 rounded-2xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Clock size={16} className="text-[#ba8d3d]" />
          <span>آخرین تصمیمات کارشناسی آتلیه (Recent Review Log)</span>
        </h3>

        <div className="divide-y divide-white/10">
          {recentDecisions.map((d) => (
            <div
              key={d.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-fanum"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-stone-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                  <img src={d.previewUrl} alt={d.title} className="w-full h-full object-contain" />
                </div>
                <div>
                  <button
                    onClick={() => navigate(`/admin/custom-studio/designs/${d.id}`)}
                    className="font-bold text-white hover:text-[#eed29d] transition-colors"
                  >
                    {d.title}
                  </button>
                  <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                    {d.id} · سفارش: {d.orderId}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <Badge
                  variant={DESIGN_REVIEW_STATUS_CONFIG[d.status]?.badgeVariant || 'default'}
                  size="sm"
                >
                  {DESIGN_REVIEW_STATUS_CONFIG[d.status]?.labelFa || d.status}
                </Badge>
                <span className="text-[10px] text-stone-500 font-mono">
                  {formatPersianDate(d.reviewedAt || d.submittedAt)}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/admin/custom-studio/designs/${d.id}`)}
                  className="text-[11px] h-7 px-2"
                >
                  پرونده
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      </>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="رد طرح سفارشی"
        description="ثبت علت رد الزامی است و برای کاربر پیام اطلاع‌رسانی ارسال می‌گردد. وضعیت مالی سفارش تغییر نخواهد کرد."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsRejectOpen(false)}>
              انصراف
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRejectConfirm} icon={XCircle}>
              ثبت رد طرح
            </Button>
          </div>
        }
      >
        <div className="space-y-3 font-sans text-xs">
          <FormField label="علت رد فنی (جهت اطلاع کاربر):" required>
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="مثال: لبه‌های مات، ابعاد غیراستاندارد..."
            />
          </FormField>
        </div>
      </Modal>

      {/* Revision Modal */}
      <Modal
        isOpen={isRevisionOpen}
        onClose={() => setIsRevisionOpen(false)}
        title="درخواست اصلاحیه از کاربر"
        description="ایرادات فنی طرح به کاربر اعلام شده و وضعیت سفارش در حالت انتظار اصلاحیه قرار می‌گیرد."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsRevisionOpen(false)}>
              انصراف
            </Button>
            <Button variant="brass" size="sm" onClick={handleRevisionConfirm} icon={RotateCcw}>
              ارسال درخواست اصلاح
            </Button>
          </div>
        }
      >
        <div className="space-y-3 font-sans text-xs">
          <FormField label="توضیحات اصلاحیه فنی برای خریدار:" required>
            <Input
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="مثال: حذف پس‌زمینه سفید فایل PNG..."
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};
