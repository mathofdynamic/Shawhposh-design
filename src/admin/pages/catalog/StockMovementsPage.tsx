import React, { useState, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
  MinusCircle,
  PlusCircle,
  FileText,
  User,
  Box,
  Layers,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import {
  Table,
  ColumnDef,
  Button,
  FormField,
  Input,
  Select,
  Badge,
} from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import { StockMovement, StockMovementType } from '../../domain/types';
import { toFaDigits, formatPersianDate } from '../../utils/formatters';
import { useAdminRouter } from '../../router';

export const StockMovementsPage: React.FC = () => {
  const { state, getStockMovements } = useCatalogAdmin();
  const { navigate } = useAdminRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const movements = useMemo(() => {
    return getStockMovements();
  }, [getStockMovements, state.stockMovements]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Type filter
      if (typeFilter !== 'all' && m.type !== typeFilter) {
        return false;
      }

      // Search query filter (matches SKU, reason, actor, referenceId)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSku = m.sku.toLowerCase().includes(q);
        const matchesReason = m.reason.toLowerCase().includes(q);
        const matchesActor = m.actorName.toLowerCase().includes(q);
        const matchesRef = m.referenceId ? m.referenceId.toLowerCase().includes(q) : false;
        if (!matchesSku && !matchesReason && !matchesActor && !matchesRef) {
          return false;
        }
      }

      return true;
    });
  }, [movements, typeFilter, searchQuery]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalInbound = 0;
    let totalOutbound = 0;
    let reservationsCount = 0;

    movements.forEach((m) => {
      if (m.type === 'goods_receipt' || m.type === 'order_refund') {
        totalInbound += Math.abs(m.quantityChange);
      } else if (m.type === 'order_release' || m.type === 'production_scrap' || m.type === 'sample_pull') {
        totalOutbound += Math.abs(m.quantityChange);
      } else if (m.type === 'order_reservation') {
        reservationsCount++;
      }
    });

    return {
      totalMovements: movements.length,
      totalInbound,
      totalOutbound,
      reservationsCount,
    };
  }, [movements]);

  const getTypeBadge = (type: StockMovementType) => {
    switch (type) {
      case 'goods_receipt':
        return <Badge label="ورود کالا / رسید خرید" variant="success" size="sm" />;
      case 'order_reservation':
        return <Badge label="رزرو سفارش مشتری" variant="warning" size="sm" />;
      case 'order_release':
        return <Badge label="خروج و ارسال کالا" variant="info" size="sm" />;
      case 'order_cancellation':
        return <Badge label="لغو و آزادسازی رزرو" variant="neutral" size="sm" />;
      case 'order_refund':
        return <Badge label="مرجوعی به انبار" variant="accent" size="sm" />;
      case 'production_scrap':
        return <Badge label="ضایعات چاپ" variant="danger" size="sm" />;
      case 'sample_pull':
        return <Badge label="خروج نمونه شوروم" variant="neutral" size="sm" />;
      case 'manual_adjustment':
        return <Badge label="اصلاحیه انبارگردانی" variant="warning" size="sm" />;
      default:
        return <Badge label={type} variant="neutral" size="sm" />;
    }
  };

  const columns: ColumnDef<StockMovement>[] = [
    {
      key: 'timestamp',
      header: 'زمان ثبت رخداد',
      render: (row) => (
        <div>
          <div className="font-fanum text-xs text-white">
            {formatPersianDate(row.timestamp)}
          </div>
          <span className="font-mono text-[10px] text-stone-500">{row.id}</span>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'کد تنوع انبار (SKU)',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[#eed29d] bg-stone-900 px-2 py-0.5 rounded border border-white/5">
          {row.sku}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'نوع عملیات گردش',
      render: (row) => getTypeBadge(row.type),
    },
    {
      key: 'quantityChange',
      header: 'میزان تغییر',
      align: 'center',
      render: (row) => {
        const isPositive = row.quantityChange > 0;
        return (
          <span
            className={`font-fanum text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
              isPositive
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {toFaDigits(row.quantityChange)}
          </span>
        );
      },
    },
    {
      key: 'balance',
      header: 'موجودی فیزیکی',
      align: 'center',
      render: (row) => (
        <div className="font-fanum text-xs text-stone-300">
          <span>{toFaDigits(row.previousOnHand)}</span>
          <span className="text-stone-500 mx-1">←</span>
          <span className="font-bold text-white">{toFaDigits(row.newOnHand)}</span>
        </div>
      ),
    },
    {
      key: 'reserved',
      header: 'تعهد رزرو',
      align: 'center',
      render: (row) => (
        <div className="font-fanum text-xs text-stone-400">
          <span>{toFaDigits(row.previousReserved)}</span>
          <span className="text-stone-500 mx-1">←</span>
          <span className="font-bold text-amber-400">{toFaDigits(row.newReserved)}</span>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'شرح و مرجع سند',
      render: (row) => (
        <div className="max-w-xs">
          <div className="text-xs text-white truncate" title={row.reason}>
            {row.reason}
          </div>
          {row.referenceId && (
            <span className="font-mono text-[10px] text-stone-400 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 inline-block mt-0.5">
              مرجع: {row.referenceId}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actor',
      header: 'ثبت‌کننده',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-stone-300">
          <User size={13} className="text-stone-500" />
          <span>{row.actorName}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="گردش انبار"
        description="حسابرسی کامل و ردگیری بلادرنگ تمامی ورودی‌های کالا، خروج به ازای فاکتورها، رزرو سبد، ضایعات و مرجوعی‌ها."
        actions={
          <Button
            variant="secondary"
            size="md"
            onClick={() => navigate('/admin/catalog/inventory')}
            className="flex items-center gap-2"
          >
            <Box size={16} />
            بازگشت به کنترل موجودی
          </Button>
        }
      />

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400 block mb-1">کل اسناد گردش انبار</span>
          <span className="text-2xl font-bold font-fanum text-white block">
            {toFaDigits(stats.totalMovements)}
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">تراکنش ثبت‌شده در پایگاه</span>
        </div>

        <div className="p-4 bg-[#141211] border border-emerald-500/20 rounded-2xl">
          <span className="text-xs text-emerald-300 block mb-1">مجموع اقلام ورودی (رسید)</span>
          <span className="text-2xl font-bold font-fanum text-emerald-400 block">
            +{toFaDigits(stats.totalInbound)}
          </span>
          <span className="text-[10px] text-emerald-500/80 mt-1 block">از بافندگی و مرجوعی</span>
        </div>

        <div className="p-4 bg-[#141211] border border-rose-500/20 rounded-2xl">
          <span className="text-xs text-rose-300 block mb-1">مجموع اقلام خروجی</span>
          <span className="text-2xl font-bold font-fanum text-rose-400 block">
            -{toFaDigits(stats.totalOutbound)}
          </span>
          <span className="text-[10px] text-rose-500/80 mt-1 block">ارسال به مشتری، نمونه، ضایعات</span>
        </div>

        <div className="p-4 bg-[#141211] border border-amber-500/20 rounded-2xl">
          <span className="text-xs text-amber-300 block mb-1">تراکنش‌های رزرو سفارش</span>
          <span className="text-2xl font-bold font-fanum text-amber-400 block">
            {toFaDigits(stats.reservationsCount)}
          </span>
          <span className="text-[10px] text-amber-500/80 mt-1 block">قفل هوشمند موجودی آزاد</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#141211] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس کد تنوع SKU، شرح سند، کاربر، یا شماره مرجع (ORD / PO)..."
            className="w-full bg-[#181614] border border-white/10 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-[#ba8d3d]"
          />
        </div>

        <div className="w-56">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: 'all', label: 'همه انواع گردش' },
              { value: 'goods_receipt', label: 'ورود کالا (رسید خرید)' },
              { value: 'order_reservation', label: 'رزرو سفارش مشتری' },
              { value: 'order_release', label: 'خروج کالا و ارسال' },
              { value: 'order_cancellation', label: 'لغو سفارش و آزادسازی' },
              { value: 'order_refund', label: 'مرجوعی به انبار' },
              { value: 'production_scrap', label: 'ضایعات خط چاپ' },
              { value: 'sample_pull', label: 'خروج نمونه شوروم' },
              { value: 'manual_adjustment', label: 'اصلاحیه انبارگردانی' },
            ]}
          />
        </div>

        {(searchQuery || typeFilter !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery('');
              setTypeFilter('all');
            }}
          >
            پاکسازی فیلترها
          </Button>
        )}
      </div>

      {/* Movements Table */}
      <div className="bg-[#141211] border border-white/10 rounded-2xl overflow-hidden">
        <Table
          data={filteredMovements}
          columns={columns}
          keyExtractor={(m) => m.id}
          emptyMessage="هیچ رکوردی منطبق با جستجوی شما یافت نشد."
        />
      </div>
    </div>
  );
};
