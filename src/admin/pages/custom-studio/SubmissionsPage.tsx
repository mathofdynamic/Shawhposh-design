/**
 * Shahpoosh Luxury Streetwear - Custom Studio Submissions Center
 * URL: `/admin/custom-studio/submissions` and `/admin/studio/designs`
 * Prompt 12: Submission table with design ID, linked order/line item, creator, blank garment SKU/color/size,
 * design type, submitted at, approval state, reviewer, and SLA status.
 */

import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Search,
  AlertTriangle,
  RotateCcw,
  Palette,
  Layers,
  ArrowUpRight,
  Sparkles,
  ShoppingBag,
  Box,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, SearchInput, Pagination, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router/AdminRouterContext';
import { CustomDesign, DesignReviewStatus } from '../../domain/types';
import {
  toFaDigits,
  formatPersianDate,
  formatPersianDateTime,
  maskPhoneNumber,
} from '../../utils/formatters';
import {
  calculateReviewSla,
  DESIGN_REVIEW_STATUS_CONFIG,
} from '../../domain/customStudio';

export const SubmissionsPage: React.FC = () => {
  const { state } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [slaFilter, setSlaFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Quick stats
  const stats = useMemo(() => {
    let pendingCount = 0;
    let revisionCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let breachedSlaCount = 0;

    state.customDesigns.forEach((d) => {
      if (d.status === 'under_review' || d.status === 'submitted') pendingCount++;
      if (d.status === 'revision_requested') revisionCount++;
      if (d.status === 'approved') approvedCount++;
      if (d.status === 'rejected') rejectedCount++;

      const sla = calculateReviewSla(d.submittedAt, state.demoClockIso, d.status);
      if (sla.status === 'breached') breachedSlaCount++;
    });

    return {
      total: state.customDesigns.length,
      pendingCount,
      revisionCount,
      approvedCount,
      rejectedCount,
      breachedSlaCount,
    };
  }, [state.customDesigns, state.demoClockIso]);

  // Filtered designs
  const filteredDesigns = useMemo(() => {
    let list = [...state.customDesigns];

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((d) => d.status === statusFilter);
    }

    // Type filter (graphic / text / mixed)
    if (typeFilter !== 'all') {
      list = list.filter((d) => d.designType === typeFilter);
    }

    // Zone filter
    if (zoneFilter !== 'all') {
      list = list.filter((d) => d.printZone === zoneFilter);
    }

    // SLA filter
    if (slaFilter !== 'all') {
      list = list.filter((d) => {
        const sla = calculateReviewSla(d.submittedAt, state.demoClockIso, d.status);
        return sla.status === slaFilter;
      });
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.orderId.toLowerCase().includes(q) ||
          (d.lineItemId && d.lineItemId.toLowerCase().includes(q)) ||
          d.title.toLowerCase().includes(q) ||
          (d.customerName && d.customerName.toLowerCase().includes(q)) ||
          (d.blankSku && d.blankSku.toLowerCase().includes(q))
      );
    }

    // Sort: newest first
    list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    return list;
  }, [state.customDesigns, statusFilter, typeFilter, zoneFilter, slaFilter, search, state.demoClockIso]);

  // Pagination
  const total = filteredDesigns.length;
  const totalPages = Math.ceil(total / pageSize) || 1;
  const paginatedDesigns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDesigns.slice(start, start + pageSize);
  }, [filteredDesigns, currentPage, pageSize]);

  // Columns definition according to Prompt 12:
  // "Submission table: design ID, linked order/line item, creator, blank garment SKU/color/size, design type, submitted at, approval state, reviewer and SLA."
  const columns: ColumnDef<CustomDesign>[] = [
    {
      key: 'id',
      header: 'شناسه آرت‌ورک',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-stone-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
            <img
              src={row.previewUrl}
              alt={row.title}
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div>
            <button
              onClick={() => navigate(`/admin/custom-studio/designs/${row.id}`)}
              className="font-mono font-bold text-[#eed29d] hover:text-white text-xs block text-right"
              title="مشاهده شناسنامه و میز داوری فنی"
            >
              {row.id}
            </button>
            <span className="text-[10px] text-stone-400 block truncate max-w-[120px] font-sans">
              {row.title}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'order',
      header: 'سفارش / قلم کالا',
      render: (row) => (
        <div className="font-fanum text-xs space-y-0.5">
          <button
            onClick={() => navigate(`/admin/sales/orders/${row.orderId}`)}
            className="font-mono text-stone-300 hover:text-white text-xs block font-bold"
          >
            {row.orderId}
          </button>
          <span className="text-[10px] text-stone-500 font-mono block">
            {row.lineItemId || 'قلم تیشرت سفارشی'}
          </span>
        </div>
      ),
    },
    {
      key: 'creator',
      header: 'سازنده طرح (کاربر)',
      render: (row) => {
        const cust = state.customers.find((c) => c.id === row.customerId);
        const name = row.customerName || cust?.fullName || 'خریدار مهمان';
        const phone = row.customerPhone || cust?.phone || '۰۹۱۲***';
        return (
          <div className="max-w-[140px]">
            <div className="font-bold text-white text-xs truncate">{name}</div>
            <div className="text-[10px] text-stone-400 font-fanum truncate mt-0.5">
              {maskPhoneNumber(phone)}
            </div>
          </div>
        );
      },
    },
    {
      key: 'blankGarment',
      header: 'لباس خام (SKU/رنگ/سایز)',
      render: (row) => (
        <div className="text-xs font-fanum">
          <div className="font-mono text-[11px] text-stone-300 font-bold">
            {row.blankSku || 'SP101-OVR-BLK-L'}
          </div>
          <div className="text-[10px] text-stone-400 mt-0.5">
            <span>{row.blankColorName || 'مشکی ذغالی'}</span> · <span>سایز {row.blankSize || 'L'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'designType',
      header: 'نوع طرح',
      render: (row) => {
        const type = row.designType || 'graphic';
        return (
          <span
            className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
              type === 'graphic'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : type === 'text'
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
            }`}
          >
            {type === 'graphic' ? 'گرافیک آتلیه' : type === 'text' ? 'متن اختصاصی' : 'طرح ترکیبی'}
          </span>
        );
      },
    },
    {
      key: 'submittedAt',
      header: 'زمان ثبت',
      render: (row) => {
        const dt = formatPersianDateTime(row.submittedAt);
        return (
          <div className="text-xs font-fanum">
            <span className="text-white block text-[11px]">{dt.date}</span>
            <span className="text-[10px] text-stone-400 block">{dt.relative}</span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'وضعیت داوری',
      render: (row) => (
        <Badge
          variant={DESIGN_REVIEW_STATUS_CONFIG[row.status]?.badgeVariant || 'default'}
          size="sm"
        >
          {DESIGN_REVIEW_STATUS_CONFIG[row.status]?.labelFa || row.status}
        </Badge>
      ),
    },
    {
      key: 'reviewerAndSla',
      header: 'داور و مهلت SLA',
      render: (row) => {
        const sla = calculateReviewSla(row.submittedAt, state.demoClockIso, row.status);
        return (
          <div className="space-y-1">
            <div className="text-[11px] text-stone-300 truncate max-w-[130px]">
              {row.reviewerName || 'استاد امین کریمی'}
            </div>
            <Badge variant={sla.badgeVariant} size="sm">
              {sla.labelFa}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'اقدام',
      align: 'left',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/admin/custom-studio/designs/${row.id}`)}
            className="text-[11px] py-1 px-2.5 h-7"
            icon={ArrowUpRight}
            title="ورود به میز داوری و بازبینی کادر ایمن چاپ"
          >
            میز داوری
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 select-text font-sans pb-12" dir="rtl">
      <AdminPageHeader
        title="درخواست‌های دریافتی از طراح آنلاین (Submissions)"
        description="میز پذیرش سفارشات چاپ اختصاصی تیشرت و البسه، اعتبارسنجی رزولوشن DPI، کنترل کادربندی و نظارت بر مهلت SLA داوری."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/custom-studio/printing-rules')}
              icon={Layers}
              className="text-xs"
            >
              قوانین چاپخانه
            </Button>
            <Button
              variant="brass"
              size="sm"
              onClick={() => navigate('/admin/custom-studio/approval')}
              icon={CheckCircle2}
              className="text-xs font-bold"
            >
              صف بررسی فوری ({toFaDigits(stats.pendingCount)})
            </Button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 font-fanum">
        <div className="p-3.5 bg-[#141211] border border-white/10 rounded-2xl">
          <span className="text-[11px] text-stone-400 block mb-1">کل طرح‌های دریافتی</span>
          <span className="text-xl font-bold text-white block">{toFaDigits(stats.total)}</span>
          <span className="text-[10px] text-stone-500 mt-1 block">ثبت در آتلیه آنلاین</span>
        </div>

        <div className="p-3.5 bg-[#141211] border border-amber-500/30 rounded-2xl">
          <span className="text-[11px] text-amber-400 block mb-1">در صف داوری فنی</span>
          <span className="text-xl font-bold text-amber-400 block">{toFaDigits(stats.pendingCount)}</span>
          <span className="text-[10px] text-stone-500 mt-1 block">نیازمند بررسی کارشناس</span>
        </div>

        <div className="p-3.5 bg-[#141211] border border-purple-500/30 rounded-2xl">
          <span className="text-[11px] text-purple-400 block mb-1">منتظر اصلاح کاربر</span>
          <span className="text-xl font-bold text-purple-400 block">{toFaDigits(stats.revisionCount)}</span>
          <span className="text-[10px] text-stone-500 mt-1 block">درخواست ویرایش ابعاد</span>
        </div>

        <div className="p-3.5 bg-[#141211] border border-emerald-500/30 rounded-2xl">
          <span className="text-[11px] text-emerald-400 block mb-1">تایید نهایی آتلیه</span>
          <span className="text-xl font-bold text-emerald-400 block">{toFaDigits(stats.approvedCount)}</span>
          <span className="text-[10px] text-stone-500 mt-1 block">آماده / در صف چاپ DTG</span>
        </div>

        <div className="p-3.5 bg-[#141211] border border-rose-500/30 rounded-2xl col-span-2 md:col-span-1">
          <span className="text-[11px] text-rose-400 block mb-1">هشدار تاخیر SLA</span>
          <span className="text-xl font-bold text-rose-400 block">{toFaDigits(stats.breachedSlaCount)}</span>
          <span className="text-[10px] text-stone-500 mt-1 block">بیش از ۲۴ ساعت در صف</span>
        </div>
      </div>

      {/* Dense Filter & Search Toolbar */}
      <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-4">
            <SearchInput
              value={search}
              onChange={(v) => {
                setSearch(v);
                setCurrentPage(1);
              }}
              placeholder="جستجو در شناسه آرت‌ورک، کد سفارش، نام خریدار یا SKU لباس..."
            />
          </div>

          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="all">تمام وضعیت‌های داوری</option>
              <option value="under_review">در صف داوری فنی</option>
              <option value="approved">تایید نهایی شده</option>
              <option value="revision_requested">نیازمند اصلاح مشتری</option>
              <option value="rejected">رد شده</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="all">تمام انواع طرح</option>
              <option value="graphic">گرافیک آتلیه</option>
              <option value="text">متن اختصاصی</option>
              <option value="mixed">طرح ترکیبی</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={zoneFilter}
              onChange={(e) => {
                setZoneFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="all">تمام نواحی چاپ</option>
              <option value="front_chest">سینه مرکزی (A3)</option>
              <option value="back_full">پشت کامل (A2)</option>
              <option value="sleeve_left">روی آستین</option>
              <option value="collar_minimal">یقه / مینیمال</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={slaFilter}
              onChange={(e) => {
                setSlaFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#181614] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="all">تمام وضعیت‌های SLA</option>
              <option value="on_track">در مهلت استاندارد</option>
              <option value="at_risk">در آستانه تاخیر</option>
              <option value="breached">نقض شده (تاخیردار)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-[#141211] border border-white/10 rounded-2xl overflow-hidden">
        <Table
          columns={columns}
          data={paginatedDesigns}
          keyExtractor={(row) => row.id}
          emptyMessage="هیچ طرح سفارشی با این فیلترها منطبق نیست."
        />

        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-stone-400 font-fanum">
              صفحه {toFaDigits(currentPage)} از {toFaDigits(totalPages)} · مجموعاً {toFaDigits(total)} مورد
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};
