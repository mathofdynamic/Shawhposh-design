import React, { useState, useMemo } from 'react';
import {
  Truck,
  Package,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Eye,
  CheckSquare,
  Square,
  ShieldAlert,
  ShieldCheck,
  Split,
  Copy,
  Check,
  Building,
  RefreshCw,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, MoneyDisplay, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { Shipment, CarrierName, ShipmentStatus } from '../../domain/types';
import { CARRIER_CONFIG } from '../../domain/shippingReturnsNotifications';
import { toFaDigits } from '../../utils/formatters';

export const ShippingPage: React.FC = () => {
  const { state, packShipment, bulkPackEligibleShipments, canFulfillShipment } = useAdminRepository();
  const { addToast } = useToast();

  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCarrier, setSelectedCarrier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [unmaskAddresses, setUnmaskAddresses] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    let list = [...(state.shipments || [])];

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'ready') {
        list = list.filter((s) => s.status === 'ready');
      } else if (selectedStatus === 'packed') {
        list = list.filter((s) => s.status === 'packed');
      } else if (selectedStatus === 'label_created') {
        list = list.filter((s) => s.status === 'label_created');
      } else if (selectedStatus === 'in_transit') {
        list = list.filter((s) => s.status === 'in_transit' || s.status === 'dispatched');
      } else if (selectedStatus === 'delivered') {
        list = list.filter((s) => s.status === 'delivered');
      } else if (selectedStatus === 'exception') {
        list = list.filter((s) => s.status === 'exception');
      }
    }

    if (selectedCarrier !== 'all') {
      list = list.filter((s) => s.carrier === selectedCarrier);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.orderId.toLowerCase().includes(q) ||
          (s.trackingCode && s.trackingCode.toLowerCase().includes(q)) ||
          (s.customerName && s.customerName.toLowerCase().includes(q)) ||
          (s.destinationCity && s.destinationCity.toLowerCase().includes(q))
      );
    }

    return list;
  }, [state.shipments, selectedStatus, selectedCarrier, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const all = state.shipments || [];
    return {
      total: all.length,
      readyToPack: all.filter((s) => s.status === 'ready').length,
      packed: all.filter((s) => s.status === 'packed').length,
      labelCreated: all.filter((s) => s.status === 'label_created').length,
      inTransit: all.filter((s) => s.status === 'in_transit' || s.status === 'dispatched').length,
      delivered: all.filter((s) => s.status === 'delivered').length,
      exceptions: all.filter((s) => s.status === 'exception').length,
    };
  }, [state.shipments]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    addToast({
      title: 'بارکد کپی شد',
      description: code,
      type: 'info',
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredShipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredShipments.map((s) => s.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkPack = () => {
    if (selectedIds.length === 0) return;
    const res = bulkPackEligibleShipments(selectedIds, 'کیان دارابی (سرپرست بسته‌بندی)');
    if (res.packedCount > 0) {
      addToast({
        title: 'بسته‌بندی گروهی تکمیل شد',
        description: `${toFaDigits(res.packedCount)} مرسوله با موفقیت بسته‌بندی شد. ${
          res.skippedCount > 0
            ? `${toFaDigits(res.skippedCount)} مورد به علت عدم تایید QC آتلیه عبور داده شد.`
            : ''
        }`,
        type: 'success',
      });
      setSelectedIds([]);
    } else {
      addToast({
        title: 'هیچ مرسوله‌ای بسته‌بندی نشد',
        description: res.errors[0] || 'تمامی اقلام انتخابی نیازمند اتمام آزمون کنترل کیفیت در خط تولید هستند.',
        type: 'warning',
      });
    }
  };

  const getCarrierBadgeLabel = (carrier: CarrierName) => {
    const cfg = CARRIER_CONFIG[carrier];
    return cfg ? cfg.nameFa : carrier;
  };

  const columns: ColumnDef<Shipment>[] = [
    {
      key: 'select',
      header: (
        <button
          type="button"
          onClick={handleToggleSelectAll}
          className="text-stone-400 hover:text-white p-1"
          aria-label="انتخاب همه مرسولات"
        >
          {selectedIds.length > 0 && selectedIds.length === filteredShipments.length ? (
            <CheckSquare size={16} className="text-[#eed29d]" />
          ) : (
            <Square size={16} />
          )}
        </button>
      ),
      render: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleToggleRow(row.id);
          }}
          className="text-stone-400 hover:text-white p-1"
          aria-label={`انتخاب مرسوله ${row.id}`}
        >
          {selectedIds.includes(row.id) ? (
            <CheckSquare size={16} className="text-[#eed29d]" />
          ) : (
            <Square size={16} />
          )}
        </button>
      ),
    },
    {
      key: 'id',
      header: 'کد مرسوله',
      render: (row) => (
        <div className="space-y-0.5">
          <a
            href={`#/shipments/${row.id}`}
            className="font-mono text-xs font-bold text-[#eed29d] hover:underline block"
          >
            {row.id}
          </a>
          <span className="text-[10px] text-stone-500 font-fanum">
            {toFaDigits(row.items?.length || 0)} قلم کالا
          </span>
        </div>
      ),
    },
    {
      key: 'orderId',
      header: 'کد سفارش / خریدار',
      render: (row) => (
        <div className="space-y-0.5">
          <a
            href={`#/admin/sales/orders/${row.orderId}`}
            className="font-mono text-xs text-white hover:text-[#eed29d] hover:underline block"
          >
            {row.orderId}
          </a>
          <span className="text-xs text-stone-400 block">{row.customerName || 'کاربر گرامی'}</span>
        </div>
      ),
    },
    {
      key: 'carrier',
      header: 'ناوگان حمل و رهگیری',
      render: (row) => {
        return (
          <div className="space-y-1">
            <span className="text-xs font-bold text-stone-200 block">
              {getCarrierBadgeLabel(row.carrier)}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-400" dir="ltr">
              <span>{row.trackingCode || 'در انتظار بارنامه'}</span>
              {row.trackingCode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy(row.trackingCode);
                  }}
                  className="text-stone-500 hover:text-[#eed29d] p-0.5"
                  title="کپی بارکد"
                >
                  {copiedCode === row.trackingCode ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'address',
      header: 'مقصد و نشانی تحویل',
      render: (row) => {
        const maskedAddr = row.shippingAddress
          ? unmaskAddresses
            ? row.shippingAddress
            : row.shippingAddress.replace(/پلاک\s*\d+/, 'پلاک **')
          : 'تهران، خیابان ولیعصر';

        return (
          <div className="space-y-0.5 max-w-xs">
            <span className="text-xs font-bold text-white block">{row.destinationCity}</span>
            <span className="text-[11px] text-stone-400 line-clamp-1" title={maskedAddr}>
              {maskedAddr}
            </span>
          </div>
        );
      },
    },
    {
      key: 'itemReadiness',
      header: 'آمادگی اقلام و QC',
      render: (row) => {
        const qc = canFulfillShipment(row.orderId);
        const hasCustom = row.items?.some((it) => it.isCustomPod);

        return (
          <div className="space-y-1">
            {hasCustom ? (
              qc.eligible ? (
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold">
                  <ShieldCheck size={14} />
                  <span>QC چاپ تایید شد ✓</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-amber-400 font-bold" title={qc.reasonFa}>
                  <ShieldAlert size={14} />
                  <span>در انتظار تایید QC</span>
                </div>
              )
            ) : (
              <span className="text-[11px] text-stone-400">کالای کاتالوگ انبار</span>
            )}

            {/* Line-item split check */}
            {row.items && row.items.length > 1 && hasCustom && (
              <span className="inline-flex items-center gap-1 text-[10px] text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">
                <Split size={10} />
                <span>تفکیک اقلام استاندارد/سفارشی</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'وضعیت ارسال',
      render: (row) => {
        switch (row.status) {
          case 'delivered':
            return <Badge label="تحویل نهایی" variant="success" size="sm" />;
          case 'in_transit':
          case 'dispatched':
            return <Badge label="در راه مقصد" variant="warning" size="sm" />;
          case 'label_created':
            return <Badge label="بارنامه صادر شد" variant="brass" size="sm" />;
          case 'packed':
            return <Badge label="بسته‌بندی شده" variant="neutral" size="sm" />;
          case 'exception':
            return <Badge label="رخداد استثنا" variant="critical" size="sm" />;
          case 'ready':
          default:
            return <Badge label="آماده در کارگاه" variant="neutral" size="sm" />;
        }
      },
    },
    {
      key: 'actions',
      header: 'عملیات',
      render: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            window.location.hash = `#/shipments/${row.id}`;
          }}
          className="text-xs gap-1.5 text-[#eed29d] border-[#eed29d]/30 hover:bg-[#eed29d]/10"
        >
          <Eye size={14} />
          <span>شناسنامه مرسوله</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="ارسال مرسولات و صدور بارنامه پستی"
        description="صف سازماندهی مرسولات پستی، کنترل گارد QC خط تولید، بارنامه‌های تیپاکس و بسته‌بندی‌های لوکس جعبه مشکی شاه‌پوش با شناسنامه اصالت."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">کل مرسولات</span>
          <div className="text-xl font-black text-white mt-1 font-fanum">
            {toFaDigits(metrics.total)}
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">پوشش سراسری</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">آماده بسته‌بندی</span>
          <div className="text-xl font-black text-amber-400 mt-1 font-fanum">
            {toFaDigits(metrics.readyToPack)}
          </div>
          <span className="text-[10px] text-amber-400/80 mt-1 block">در انتظار کاور و جعبه</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">بسته‌بندی شده</span>
          <div className="text-xl font-black text-[#eed29d] mt-1 font-fanum">
            {toFaDigits(metrics.packed)}
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">آماده صدور بارنامه</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">بارنامه صادر شده</span>
          <div className="text-xl font-black text-white mt-1 font-fanum">
            {toFaDigits(metrics.labelCreated)}
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">آماده خروج از مرکز</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">در مسیر حمل ناوگان</span>
          <div className="text-xl font-black text-amber-400 mt-1 font-fanum">
            {toFaDigits(metrics.inTransit)}
          </div>
          <span className="text-[10px] text-amber-400/80 mt-1 block">دارای کد رهگیری فعال</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">رخداد استثنا پستی</span>
          <div className="text-xl font-black text-rose-400 mt-1 font-fanum">
            {toFaDigits(metrics.exceptions)}
          </div>
          <span className="text-[10px] text-rose-400/80 mt-1 block">نیازمند بازتوزیع</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status selector */}
          <div className="flex items-center gap-1.5 text-xs bg-black/40 p-1 rounded-xl border border-white/10">
            <span className="text-stone-400 px-2">وضعیت:</span>
            {[
              { id: 'all', label: 'همه' },
              { id: 'ready', label: 'آماده بسته‌بندی' },
              { id: 'packed', label: 'بسته‌بندی شده' },
              { id: 'label_created', label: 'بارنامه صادر شد' },
              { id: 'in_transit', label: 'در راه' },
              { id: 'delivered', label: 'تحویل شده' },
              { id: 'exception', label: 'استثنا' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  selectedStatus === st.id
                    ? 'bg-[#eed29d] text-black font-bold shadow'
                    : 'text-stone-300 hover:text-white'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Carrier selector */}
          <select
            value={selectedCarrier}
            onChange={(e) => setSelectedCarrier(e.target.value)}
            className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#eed29d]"
          >
            <option value="all">همه شرکت‌های حمل</option>
            <option value="tipax">تیپاکس اکسپرس</option>
            <option value="post_pishtaz">پست پیشتاز</option>
            <option value="courier_tehran">پیک اختصاصی تهران</option>
            <option value="chapar">چاپار اکسپرس</option>
          </select>
        </div>

        {/* Search input & bulk actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute right-3 top-2.5 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی کد مرسوله، سفارش، بارنامه یا شهر..."
              className="pr-9 pl-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs w-64 focus:outline-none focus:border-[#eed29d]"
            />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUnmaskAddresses(!unmaskAddresses)}
            className="text-xs text-stone-400 hover:text-white"
          >
            {unmaskAddresses ? 'مخفی‌سازی پلاک' : 'نمایش کامل نشانی'}
          </Button>

          {selectedIds.length > 0 && (
            <Button
              variant="brass"
              size="sm"
              onClick={handleBulkPack}
              className="text-xs gap-1.5"
            >
              <Package size={14} />
              <span>بسته‌بندی گروهی ({toFaDigits(selectedIds.length)})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <Table
        data={filteredShipments}
        columns={columns}
        keyExtractor={(row) => row.id}
        emptyMessage="مرسوله‌ای مطابق با فیلترهای انتخاب‌شده یافت نشد."
        onRowClick={(row) => {
          window.location.hash = `#/shipments/${row.id}`;
        }}
      />
    </div>
  );
};
