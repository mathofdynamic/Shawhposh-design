/**
 * Shahpoosh Luxury Streetwear - Lean Production Operations & Workshop Kanban
 * URL: `/admin/studio/production` and `/admin/custom-studio/production`
 * Prompt 13: Work orders, scheduling, Kanban/list views, hold/rework branches,
 * daily production metrics, capacity, throughput, and verified payment guardrails.
 */

import React, { useState, useMemo } from 'react';
import {
  Printer,
  Layers,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  User,
  Filter,
  Search,
  ArrowUpRight,
  Sparkles,
  LayoutGrid,
  List as ListIcon,
  Flame,
  Activity,
  Box,
  Calendar,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import {
  Table,
  ColumnDef,
  Badge,
  Button,
  SearchInput,
  Pagination,
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
  formatPersianDate,
  formatPersianDateTime,
} from '../../utils/formatters';
import { STAGE_CONFIG } from './JobDetailPage';

export const ProductionPage: React.FC = () => {
  const {
    state,
    getDailyProductionMetrics,
    advanceProductionJob,
    holdProductionJob,
    resumeProductionJob,
    assignProductionJob,
  } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [activeTab, setActiveTab] = useState<'all' | 'rework' | 'hold' | 'rush'>('all');
  const [search, setSearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('all');

  // Quick Action Modal states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [targetJobId, setTargetJobId] = useState<string | null>(null);
  const [targetOperatorId, setTargetOperatorId] = useState('STF-04');
  const [targetDueDate, setTargetDueDate] = useState('');

  // Daily production overview metrics
  const metrics = useMemo(() => {
    return getDailyProductionMetrics();
  }, [getDailyProductionMetrics, state.productionJobs, state.demoClockIso]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    let list = [...state.productionJobs];

    // Tab filter
    if (activeTab === 'rework') {
      list = list.filter((j) => j.stage === 'reprint_needed' || j.qcStatus === 'failed');
    } else if (activeTab === 'hold') {
      list = list.filter((j) => j.stage === 'on_hold');
    } else if (activeTab === 'rush') {
      list = list.filter((j) => j.priority === 'rush');
    }

    // Operator filter
    if (operatorFilter !== 'all') {
      list = list.filter((j) => j.operatorId === operatorFilter);
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (j) =>
          j.id.toLowerCase().includes(q) ||
          j.orderId.toLowerCase().includes(q) ||
          j.variantSku.toLowerCase().includes(q) ||
          (j.assignedStaffName && j.assignedStaffName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [state.productionJobs, activeTab, operatorFilter, search]);

  // Kanban Stage Columns Mapping
  const kanbanColumns = useMemo(() => {
    const readyJobs = filteredJobs.filter((j) => j.stage === 'ready');
    const queuedJobs = filteredJobs.filter(
      (j) => j.stage === 'queued' || j.stage === 'pretreatment'
    );
    const inProgressJobs = filteredJobs.filter(
      (j) => j.stage === 'printing_dtg' || j.stage === 'curing_heatpress'
    );
    const qcJobs = filteredJobs.filter((j) => j.stage === 'qc_inspection');
    const fulfillmentJobs = filteredJobs.filter(
      (j) => j.stage === 'ready_for_fulfillment' || j.stage === 'packaging' || j.stage === 'completed'
    );

    return [
      { id: 'ready', titleFa: 'آماده تخصیص (Ready)', jobs: readyJobs, variant: 'default' as const },
      { id: 'queued', titleFa: 'در صف آماده‌سازی (Queued)', jobs: queuedJobs, variant: 'warning' as const },
      { id: 'in_progress', titleFa: 'در حال چاپ DTG و پرس', jobs: inProgressJobs, variant: 'brass' as const },
      { id: 'qc', titleFa: 'آزمون کنترل کیفی (QC)', jobs: qcJobs, variant: 'warning' as const },
      { id: 'fulfillment', titleFa: 'آماده ارسال و تکمیل', jobs: fulfillmentJobs, variant: 'success' as const },
    ];
  }, [filteredJobs]);

  const handleAdvance = (job: ProductionJob) => {
    const res = advanceProductionJob(job.id, undefined, 'STF-04');
    if (res.success) {
      addToast({ title: 'پیشروی مرحله', description: res.messageFa, type: 'success' });
    } else {
      addToast({ title: 'خطا', description: res.error || 'خطا در پیشروی کار.', type: 'error' });
    }
  };

  const handleResume = (job: ProductionJob) => {
    const res = resumeProductionJob(job.id, 'STF-04');
    if (res.success) {
      addToast({ title: 'رفع توقف', description: 'دستور کار به صف تولید بازگشت.', type: 'success' });
    }
  };

  const handleAssignSubmit = () => {
    if (!targetJobId) return;
    const res = assignProductionJob(targetJobId, targetOperatorId, targetDueDate || undefined);
    if (res.success) {
      addToast({ title: 'تخصیص دستور کار', description: 'اپراتور و تاریخ تحویل با موفقیت ثبت شد.', type: 'success' });
      setIsAssignModalOpen(false);
      setTargetJobId(null);
    }
  };

  // Table columns definition
  const columns: ColumnDef<ProductionJob>[] = [
    {
      key: 'id',
      header: 'دستور کار',
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
      header: 'البسه خام و تیراژ',
      render: (row) => (
        <div className="text-xs font-fanum">
          <div className="font-mono text-stone-300 font-bold text-[11px]">{row.variantSku}</div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            تعداد: <strong className="text-white">{toFaDigits(row.quantity)} عدد</strong>
            {row.priority === 'rush' && (
              <span className="text-rose-400 mr-1.5 font-bold">· سفارش فوری</span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'printing',
      header: 'روش و موقعیت چاپ',
      render: (row) => (
        <div className="text-xs">
          <div className="text-white truncate max-w-[160px] text-[11px] font-bold">
            {row.printingTechnique}
          </div>
          <div className="text-[10px] text-stone-400 truncate max-w-[160px] mt-0.5">
            {row.printPlacement}
          </div>
        </div>
      ),
    },
    {
      key: 'stage',
      header: 'مرحله خط تولید',
      render: (row) => (
        <Badge
          variant={STAGE_CONFIG[row.stage]?.badgeVariant || 'default'}
          size="sm"
        >
          {STAGE_CONFIG[row.stage]?.labelFa || row.stage}
        </Badge>
      ),
    },
    {
      key: 'qcStatus',
      header: 'وضعیت QC',
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
            : 'در انتظار'}
        </Badge>
      ),
    },
    {
      key: 'operator',
      header: 'اپراتور و موعد تحویل',
      render: (row) => (
        <div className="text-xs font-fanum">
          <div className="text-stone-300 text-[11px]">{row.assignedStaffName || 'تخصیص نیافته'}</div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            تحویل: {formatPersianDate(row.dueDate)}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'اقدام',
      align: 'left',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.stage === 'on_hold' ? (
            <Button
              variant="brass"
              size="sm"
              onClick={() => handleResume(row)}
              className="text-[10px] py-1 px-2 h-7"
              icon={Play}
            >
              ادامه
            </Button>
          ) : (
            row.stage !== 'completed' &&
            row.stage !== 'ready_for_fulfillment' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleAdvance(row)}
                className="text-[10px] py-1 px-2 h-7"
                icon={CheckCircle2}
              >
                مرحله بعد
              </Button>
            )
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/admin/custom-studio/jobs/${row.id}`)}
            className="text-[10px] py-1 px-2.5 h-7"
            icon={ArrowUpRight}
          >
            مشاهده
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-text font-sans pb-16" dir="rtl">
      <AdminPageHeader
        title="دستورات کار خط تولید و مانیتورینگ کارگاه DTG"
        description="گردش کار تولید ناب البسه شخصی‌سازی‌شده: نظارت بر چاپ مستقیم صنعتی Brother GTX، صف آماده‌سازی، کنترل کیفی و بازچاپ ضایعات."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/custom-studio/qc')}
              icon={ShieldCheck}
              className="text-xs"
            >
              میز کنترل کیفی (QC)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/custom-studio/submissions')}
              icon={Eye}
              className="text-xs"
            >
              طرح‌های ثبت‌شده
            </Button>
          </div>
        }
      />

      {/* Honest Manufacturing Capability Disclaimer from Prompt 13 */}
      <div className="p-3.5 bg-gradient-to-r from-stone-900 via-[#161413] to-black border border-white/10 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-stone-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#ba8d3d]/15 border border-[#ba8d3d]/30 flex items-center justify-center shrink-0">
            <Printer size={16} className="text-[#eed29d]" />
          </div>
          <div className="leading-relaxed">
            <strong>مدل تولید ناب کارگاهی (Lean Garment Atelier):</strong> این بخش متمرکز بر اجرای بی‌نقص چاپ تک‌تیراژ،
            کاهش ضایعات جوهر و پارچه، و تضمین انضباط مالی است. سفارشات پرداخت‌نشده یا طرح‌های داوری‌نشده وارد خط چاپ نخواهند
            شد.
          </div>
        </div>
      </div>

      {/* Daily Production Overview Cards (Prompt 13 requirement) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Due & Overdue */}
        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>موعدهای کارگاه</span>
            <Clock size={15} className="text-amber-400" />
          </div>
          <div className="text-xl font-bold font-fanum text-white pt-1">
            {toFaDigits(metrics.overdueCount + metrics.dueTodayCount)}{' '}
            <span className="text-xs font-normal text-stone-400">سفارش</span>
          </div>
          <div className="text-[10px] text-stone-400 font-fanum">
            <span>{toFaDigits(metrics.overdueCount)} تاخیر</span> · <span>{toFaDigits(metrics.dueTodayCount)} امروز</span>
          </div>
        </div>

        {/* Metric 2: Daily Throughput */}
        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>خروجی تکمیل‌شده</span>
            <CheckCircle2 size={15} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-fanum text-emerald-400 pt-1">
            {toFaDigits(metrics.throughput)}{' '}
            <span className="text-xs font-normal text-stone-400">قطعه لباس</span>
          </div>
          <div className="text-[10px] text-stone-400 font-fanum">
            تحویل به بخش بسته‌بندی و ارسال
          </div>
        </div>

        {/* Metric 3: Average Turnaround Time */}
        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>میانگین زمان چرخه</span>
            <Activity size={15} className="text-[#eed29d]" />
          </div>
          <div className="text-xl font-bold font-fanum text-[#eed29d] pt-1">
            {toFaDigits(metrics.avgTurnaroundHours)}{' '}
            <span className="text-xs font-normal text-stone-400">ساعت</span>
          </div>
          <div className="text-[10px] text-stone-400 font-fanum">
            از آغاز اسپری تا پایان پرس نهایی
          </div>
        </div>

        {/* Metric 4: Blocked Work / Rework */}
        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-1">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>کارهای مسدود و ضایعات</span>
            <AlertTriangle size={15} className="text-rose-400" />
          </div>
          <div className="text-xl font-bold font-fanum text-rose-400 pt-1">
            {toFaDigits(metrics.blockedCount)}{' '}
            <span className="text-xs font-normal text-stone-400">مورد بازبینی</span>
          </div>
          <div className="text-[10px] text-stone-400 font-fanum">
            نیاز به بازچاپ یا رفع مانع فنی
          </div>
        </div>

        {/* Metric 5: Available Machine Capacity */}
        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-stone-400 text-xs">
            <span>ظرفیت پرینترها</span>
            <Flame size={15} className="text-sky-400" />
          </div>
          <div className="text-xl font-bold font-fanum text-white pt-1">
            {toFaDigits(metrics.capacityLoadPercent)}٪{' '}
            <span className="text-xs font-normal text-stone-400">لود شیفت</span>
          </div>
          <div className="text-[10px] text-stone-400 font-fanum">
            ظرفیت آزاد: {toFaDigits(metrics.availableCapacityUnits)} از ۳۲ تکه در شیفت
          </div>
        </div>
      </div>

      {/* View Switcher, Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
              activeTab === 'all'
                ? 'bg-[#ba8d3d] text-black'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            تمامی کارهای فعال ({toFaDigits(state.productionJobs.length)})
          </button>

          <button
            onClick={() => setActiveTab('rework')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
              activeTab === 'rework'
                ? 'bg-rose-500 text-white'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            نیازمند بازچاپ / ضایعات (Rework)
          </button>

          <button
            onClick={() => setActiveTab('hold')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
              activeTab === 'hold'
                ? 'bg-amber-500 text-black'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            متوقف شده (Hold)
          </button>

          <button
            onClick={() => setActiveTab('rush')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 ${
              activeTab === 'rush'
                ? 'bg-red-600 text-white'
                : 'text-stone-400 hover:text-white hover:bg-white/5'
            }`}
          >
            سفارشات فوری (Rush)
          </button>
        </div>

        {/* Search & View Mode Switcher */}
        <div className="flex items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="جستجوی شناسه، سفارش یا SKU..."
            className="w-48 text-xs"
          />

          <div className="flex items-center bg-stone-900 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'kanban' ? 'bg-[#ba8d3d] text-black' : 'text-stone-400 hover:text-white'
              }`}
              title="نمای تابلوی کانبان کارگاه"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#ba8d3d] text-black' : 'text-stone-400 hover:text-white'
              }`}
              title="نمای فهرست جدول"
            >
              <ListIcon size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* RENDER VIEW: KANBAN OR TABLE LIST */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5 items-start">
          {kanbanColumns.map((col) => (
            <div
              key={col.id}
              className="bg-[#121110] border border-white/10 rounded-xl p-3.5 space-y-3 min-h-[460px] flex flex-col justify-start"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="text-xs font-bold text-white truncate">{col.titleFa}</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-fanum font-bold bg-white/10 text-stone-300">
                  {toFaDigits(col.jobs.length)}
                </span>
              </div>

              {/* Job Cards */}
              <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[650px] pr-0.5">
                {col.jobs.length === 0 ? (
                  <div className="py-12 text-center text-[11px] text-stone-500">
                    موردی در این ستون وجود ندارد
                  </div>
                ) : (
                  col.jobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-3 bg-[#181615] border border-white/10 hover:border-[#ba8d3d]/50 rounded-xl space-y-2 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => navigate(`/admin/custom-studio/jobs/${job.id}`)}
                          className="font-mono text-xs font-bold text-[#eed29d] hover:underline"
                        >
                          {job.id}
                        </button>
                        {job.priority === 'rush' && (
                          <Badge variant="destructive" size="sm">
                            فوری
                          </Badge>
                        )}
                        {job.stage === 'on_hold' && (
                          <Badge variant="destructive" size="sm">
                            متوقف
                          </Badge>
                        )}
                        {job.stage === 'reprint_needed' && (
                          <Badge variant="destructive" size="sm">
                            بازچاپ
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-stone-300 font-fanum">
                        <span className="font-mono text-[11px] font-bold text-stone-200 block truncate">
                          {job.variantSku}
                        </span>
                        <span className="text-[10px] text-stone-400 block mt-0.5">
                          تعداد: <strong>{toFaDigits(job.quantity)} عدد</strong> · سفارش {job.orderId}
                        </span>
                      </div>

                      <div className="text-[10px] text-stone-400 font-fanum pt-1 border-t border-white/5 flex items-center justify-between">
                        <span className="truncate max-w-[100px]">{job.assignedStaffName || 'اپراتور Brother'}</span>
                        <span>{formatPersianDate(job.dueDate)}</span>
                      </div>

                      {/* Card Quick Actions */}
                      <div className="pt-1.5 flex items-center justify-between gap-1">
                        <button
                          onClick={() => navigate(`/admin/custom-studio/jobs/${job.id}`)}
                          className="text-[10px] text-stone-400 hover:text-white flex items-center gap-0.5"
                        >
                          <span>جزئیات</span>
                          <ArrowUpRight size={10} />
                        </button>

                        {job.stage === 'on_hold' ? (
                          <button
                            onClick={() => handleResume(job)}
                            className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold hover:bg-emerald-500/30"
                          >
                            ادامه
                          </button>
                        ) : (
                          job.stage !== 'completed' &&
                          job.stage !== 'ready_for_fulfillment' && (
                            <button
                              onClick={() => handleAdvance(job)}
                              className="px-2 py-0.5 rounded bg-[#ba8d3d]/20 text-[#eed29d] text-[10px] font-bold hover:bg-[#ba8d3d]/30"
                            >
                              مرحله بعد →
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="space-y-4">
          <Table data={filteredJobs} columns={columns} keyExtractor={(row) => row.id} />
        </div>
      )}

      {/* ASSIGN OPERATOR MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="تخصیص اپراتور به دستور کار"
        description="تعیین اپراتور مسئول دستگاه چاپ یا زمان‌بندی مجدد."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" size="sm" onClick={() => setIsAssignModalOpen(false)}>
              انصراف
            </Button>
            <Button variant="brass" size="sm" onClick={handleAssignSubmit}>
              ذخیره
            </Button>
          </div>
        }
      >
        <div className="space-y-3 font-sans text-xs">
          <FormField label="اپراتور خط چاپ:">
            <select
              value={targetOperatorId}
              onChange={(e) => setTargetOperatorId(e.target.value)}
              className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
            >
              <option value="STF-04">سهراب زارع (اپراتور ارشد پرینتر Brother GTX)</option>
              <option value="STF-05">فرشید اسدی (تکنسین چاپ و کنترل کیفی)</option>
            </select>
          </FormField>

          <FormField label="تاریخ مقرر تحویل:">
            <Input
              value={targetDueDate}
              onChange={(e) => setTargetDueDate(e.target.value)}
              placeholder="مثال: ۱۴۰۵/۰۷/۰۸"
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};
