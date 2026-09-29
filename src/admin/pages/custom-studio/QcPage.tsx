/**
 * Shahpoosh Luxury Streetwear - Quality Control (QC) & Wash-Fastness Testing Cockpit
 * URL: `/quality-control` and `/admin/custom-studio/qc`
 * Prompt 13: QC form: pass/fail, defect reason, optional demo photo metadata,
 * reprint/rework assignment and wasted material count; guardrails preventing rejected QC items from becoming shippable.
 */

import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Camera,
  FileCheck,
  ArrowRight,
  Eye,
  Sliders,
  Layers,
  ArrowUpRight,
  Sparkles,
  Printer,
  ShoppingBag,
  Award,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import {
  Table,
  ColumnDef,
  Badge,
  Button,
  Modal,
  FormField,
  Input,
  useToast,
} from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { ProductionJob } from '../../domain/types';
import {
  toFaDigits,
  formatPersianDate,
  formatPersianDateTime,
} from '../../utils/formatters';

export const QcPage: React.FC = () => {
  const { state, submitQcInspection } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'pending' | 'rework' | 'passed'>('pending');
  const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);

  // Modal inspection form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qcPassed, setQcPassed] = useState(true);
  const [defectReason, setDefectReason] = useState('انحراف کادر چاپ (Placement Misalignment)');
  const [notes, setNotes] = useState('');
  const [wastedCount, setWastedCount] = useState(1);
  const [reprintAssigned, setReprintAssigned] = useState(true);
  const [demoPhotoMeta, setDemoPhotoMeta] = useState('شات ماکرو از بافت پارچه - خطای لکه مرکب سفید');

  // Categorize jobs
  const pendingJobs = useMemo(() => {
    return state.productionJobs.filter(
      (j) => j.stage === 'qc_inspection' || (j.qcStatus === 'pending' && j.stage !== 'completed')
    );
  }, [state.productionJobs]);

  const reworkJobs = useMemo(() => {
    return state.productionJobs.filter(
      (j) => j.qcStatus === 'failed' || j.stage === 'reprint_needed'
    );
  }, [state.productionJobs]);

  const passedJobs = useMemo(() => {
    return state.productionJobs.filter(
      (j) => j.qcStatus === 'passed' && (j.stage === 'ready_for_fulfillment' || j.stage === 'completed')
    );
  }, [state.productionJobs]);

  const currentList = useMemo(() => {
    if (activeTab === 'pending') return pendingJobs;
    if (activeTab === 'rework') return reworkJobs;
    return passedJobs;
  }, [activeTab, pendingJobs, reworkJobs, passedJobs]);

  const openInspectionModal = (job: ProductionJob) => {
    setSelectedJob(job);
    setQcPassed(true);
    setDefectReason('انحراف کادر چاپ (Placement Misalignment)');
    setNotes('');
    setWastedCount(1);
    setReprintAssigned(true);
    setIsModalOpen(true);
  };

  const handleInspectionSubmit = () => {
    if (!selectedJob) return;

    const res = submitQcInspection(selectedJob.id, {
      passed: qcPassed,
      defectReason: qcPassed ? undefined : defectReason,
      wastedGarmentCount: qcPassed ? 0 : wastedCount,
      reprintReworkAssigned: qcPassed ? false : reprintAssigned,
      operatorId: 'STF-05',
      notes,
    });

    if (res.success) {
      addToast({
        title: qcPassed ? 'تایید کیفی محصول' : 'رد کیفی و ارجاع به بازچاپ',
        description: res.messageFa,
        type: qcPassed ? 'success' : 'warning',
      });
      setIsModalOpen(false);
      setSelectedJob(null);
    } else {
      addToast({ title: 'خطا', description: res.error || 'خطا در ثبت QC', type: 'error' });
    }
  };

  const columns: ColumnDef<ProductionJob>[] = [
    {
      key: 'id',
      header: 'شناسه کار / سفارش',
      render: (row) => (
        <div>
          <button
            onClick={() => navigate(`/admin/custom-studio/jobs/${row.id}`)}
            className="font-mono font-bold text-[#eed29d] hover:text-white text-xs block text-right"
          >
            {row.id}
          </button>
          <span className="text-[10px] text-stone-500 font-mono block">
            سفارش {row.orderId}
          </span>
        </div>
      ),
    },
    {
      key: 'garment',
      header: 'البسه و تیراژ',
      render: (row) => (
        <div className="text-xs font-fanum">
          <div className="font-mono text-stone-300 font-bold text-[11px]">{row.variantSku}</div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            تیراژ: <strong className="text-white">{toFaDigits(row.quantity)} عدد</strong>
            {row.priority === 'rush' && <span className="text-rose-400 mr-1">· فوری</span>}
          </div>
        </div>
      ),
    },
    {
      key: 'technique',
      header: 'روش چاپ و مرحله',
      render: (row) => (
        <div className="text-xs">
          <div className="text-white truncate max-w-[160px] text-[11px] font-bold">
            {row.printingTechnique}
          </div>
          <div className="text-[10px] text-stone-400 truncate max-w-[160px] mt-0.5">
            {row.stage}
          </div>
        </div>
      ),
    },
    {
      key: 'qcStatus',
      header: 'وضعیت بازرسی',
      render: (row) => (
        <Badge
          variant={
            row.qcStatus === 'passed'
              ? 'success'
              : row.qcStatus === 'failed'
              ? 'destructive'
              : 'warning'
          }
          size="sm"
        >
          {row.qcStatus === 'passed'
            ? 'تایید QC'
            : row.qcStatus === 'failed'
            ? 'رد شده (بازچاپ)'
            : 'در انتظار بازرسی'}
        </Badge>
      ),
    },
    {
      key: 'defect',
      header: 'علت نقص / ضایعات',
      render: (row) => {
        if (row.qcStatus === 'failed' || row.defectReason) {
          return (
            <div className="text-xs text-rose-300">
              <span className="block font-bold text-[11px]">{row.defectReason}</span>
              {row.wastedGarmentCount && (
                <span className="text-[10px] text-stone-400 font-fanum block">
                  ضایعات: {toFaDigits(row.wastedGarmentCount)} تکه لباس
                </span>
              )}
            </div>
          );
        }
        return <span className="text-[11px] text-stone-500">—</span>;
      },
    },
    {
      key: 'actions',
      header: 'اقدام',
      align: 'left',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.qcStatus !== 'passed' && (
            <Button
              variant="brass"
              size="sm"
              onClick={() => openInspectionModal(row)}
              className="text-[10px] py-1 px-2.5 h-7 font-bold"
              icon={ShieldCheck}
            >
              ثبت بازرسی
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/admin/custom-studio/jobs/${row.id}`)}
            className="text-[10px] py-1 px-2.5 h-7"
            icon={ArrowUpRight}
          >
            شناسنامه
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-text font-sans pb-16" dir="rtl">
      <AdminPageHeader
        title="آزمون کنترل کیفیت نهایی و ثبات شستشو (Quality Control)"
        description="میز کارشناس کنترل کیفی کارگاه: تست کشش پیگمنت چاپ، یکنواختی زیرلایه سفید، دوخت یقه و ثبت ضایعات بازچاپ."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/custom-studio/production')}
              icon={Printer}
              className="text-xs"
            >
              خط تولید و پرینترها
            </Button>
          </div>
        }
      />

      {/* QC Discipline & Guardrail Notice */}
      <div className="p-3.5 bg-gradient-to-r from-stone-900 via-[#161413] to-black border border-white/10 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-stone-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck size={16} className="text-emerald-400" />
          </div>
          <div className="leading-relaxed">
            <strong>قانون ناوردایی کنترل کیفی:</strong> هیچ محصولی بدون پاس کردن آزمون ۵ گانه به بارنامه ارسال تحویل نخواهد
            شد. اقلام رد شده به صورت خودکار به صف بازچاپ (Rework) ارجاع می‌شوند و ضایعات پارچه با کسر از موجودی ثبت می‌گردد.
          </div>
        </div>
      </div>

      {/* QC Summary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-1">
          <span className="text-xs text-stone-400">در انتظار بازرسی نهایی</span>
          <div className="text-2xl font-bold font-fanum text-amber-400 pt-1">
            {toFaDigits(pendingJobs.length)}{' '}
            <span className="text-xs font-normal text-stone-400">دستور کار</span>
          </div>
          <p className="text-[10px] text-stone-400">آماده ورود به میز تست کشش و بررسی دوخت</p>
        </div>

        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-1">
          <span className="text-xs text-stone-400">تایید شده و آماده ارسال</span>
          <div className="text-2xl font-bold font-fanum text-emerald-400 pt-1">
            {toFaDigits(passedJobs.length)}{' '}
            <span className="text-xs font-normal text-stone-400">محصول سالم</span>
          </div>
          <p className="text-[10px] text-stone-400">بسته‌بندی در هاردباکس مشکی و تحویل تیپاکس/چاپار</p>
        </div>

        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-1">
          <span className="text-xs text-stone-400">ضایعات و نیازمند بازچاپ (Rework)</span>
          <div className="text-2xl font-bold font-fanum text-rose-400 pt-1">
            {toFaDigits(reworkJobs.length)}{' '}
            <span className="text-xs font-normal text-stone-400">مورد رد شده</span>
          </div>
          <p className="text-[10px] text-stone-400">ارجاع به پرینتر Brother با تنظیم مجدد زیرلایه</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
            activeTab === 'pending'
              ? 'bg-[#ba8d3d] text-black'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          صف انتظار بازرسی ({toFaDigits(pendingJobs.length)})
        </button>

        <button
          onClick={() => setActiveTab('rework')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
            activeTab === 'rework'
              ? 'bg-rose-500 text-white'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          نیازمند بازچاپ و ضایعات ({toFaDigits(reworkJobs.length)})
        </button>

        <button
          onClick={() => setActiveTab('passed')}
          className={`px-3.5 py-1.5 rounded-xl font-bold transition-colors ${
            activeTab === 'passed'
              ? 'bg-emerald-500 text-white'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          تایید شده‌های نهایی ({toFaDigits(passedJobs.length)})
        </button>
      </div>

      {/* Table view */}
      <div className="space-y-4">
        <Table data={currentList} columns={columns} keyExtractor={(row) => row.id} />
      </div>

      {/* QC FORM MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`فرم بازرسی کنترل کیفی دستور کار ${selectedJob?.id || ''}`}
        description="ثبت رسمی نتیجه آزمون ۵ گانه استانداردهای چاپخانه و تصمیم‌گیری درباره بسته‌بندی یا بازچاپ."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
              انصراف
            </Button>
            <Button variant="brass" size="sm" onClick={handleInspectionSubmit}>
              ثبت قطعی نتیجه آزمون
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
              <FormField label="علت رد کیفی و نوع نقص فنی:" required>
                <select
                  value={defectReason}
                  onChange={(e) => setDefectReason(e.target.value)}
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
                    <span>ارجاع خودکار به صف بازچاپ (Rework)</span>
                  </label>
                </div>
              </div>

              <FormField label="متادیتای تصویر نمونه نقص (Demo Photo Metadata):">
                <div className="flex items-center gap-2">
                  <Camera size={16} className="text-stone-400 shrink-0" />
                  <Input
                    value={demoPhotoMeta}
                    onChange={(e) => setDemoPhotoMeta(e.target.value)}
                    placeholder="ثبت توضیحات شات ماکرو یا شناسنامه نقص قطعه..."
                  />
                </div>
              </FormField>
            </div>
          )}

          <FormField label="یادداشت‌های نهایی بازرس کنترل کیفیت:">
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="توضیحات تکمیلی آزمون ثبات شستشو و..."
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};
