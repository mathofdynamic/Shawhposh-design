import React, { useState, useMemo } from 'react';
import {
  Box,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ShieldCheck,
  Search,
  Filter,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Layers,
  History,
  Tag,
  Package,
  FileSpreadsheet,
  ExternalLink,
  ChevronLeft,
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
  useToast,
} from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { ProductVariant, WorkshopMaterial } from '../../domain/types';
import { toFaDigits, formatPriceTomans, formatPersianDate } from '../../utils/formatters';
import { StockDetailsDrawer } from './StockDetailsDrawer';
import { useAdminRouter } from '../../router';

export const InventoryPage: React.FC = () => {
  const { state, updateMaterialStock } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'variants' | 'materials' | 'timeline'>('variants');
  const [searchQuery, setSearchQuery] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out_of_stock' | 'healthy'>('all');
  const [warehouseLocationFilter, setWarehouseLocationFilter] = useState('all');

  // Selected SKU for drawer
  const [selectedDrawerSku, setSelectedDrawerSku] = useState<string | null>(null);

  // Material edit modal
  const [editingMaterial, setEditingMaterial] = useState<WorkshopMaterial | null>(null);
  const [materialNewStock, setMaterialNewStock] = useState('');
  const [materialReason, setMaterialReason] = useState('شمارش هفتگی مصرف مواد');

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    let totalOnHand = 0;
    let totalReserved = 0;
    let totalAvailable = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let estimatedValuationTomans = 0;

    state.variants.forEach((v) => {
      const avail = Math.max(0, v.onHandStock - v.reservedStock);
      totalOnHand += v.onHandStock;
      totalReserved += v.reservedStock;
      totalAvailable += avail;

      if (avail <= 0) {
        outOfStockCount++;
      } else if (avail <= v.minStockThreshold) {
        lowStockCount++;
      }

      // Valuation based on variant retail price
      estimatedValuationTomans += v.onHandStock * (v.priceTomans || 590000);
    });

    return {
      totalOnHand,
      totalReserved,
      totalAvailable,
      lowStockCount,
      outOfStockCount,
      estimatedValuationTomans,
    };
  }, [state.variants]);

  // Extract unique warehouse locations for filter
  const warehouseLocations = useMemo(() => {
    const set = new Set<string>();
    state.variants.forEach((v) => {
      if (v.warehouseLocation) set.add(v.warehouseLocation);
    });
    return Array.from(set);
  }, [state.variants]);

  // Filtered variants
  const filteredVariants = useMemo(() => {
    return state.variants.filter((v) => {
      const available = v.onHandStock - v.reservedStock;
      const product = state.products.find((p) => p.id === v.productId);

      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSku = v.sku.toLowerCase().includes(q);
        const matchesName = product?.name.toLowerCase().includes(q) || false;
        const matchesColor = v.colorName.toLowerCase().includes(q);
        if (!matchesSku && !matchesName && !matchesColor) return false;
      }

      // Stock status filter
      if (stockStatusFilter === 'out_of_stock' && available > 0) return false;
      if (stockStatusFilter === 'low' && (available <= 0 || available > v.minStockThreshold)) return false;
      if (stockStatusFilter === 'healthy' && available <= v.minStockThreshold) return false;

      // Warehouse location filter
      if (warehouseLocationFilter !== 'all' && v.warehouseLocation !== warehouseLocationFilter) {
        return false;
      }

      return true;
    });
  }, [state.variants, state.products, searchQuery, stockStatusFilter, warehouseLocationFilter]);

  // Update material stock handler
  const handleUpdateMaterialStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMaterial) return;

    const parsed = parseFloat(materialNewStock);
    if (isNaN(parsed) || parsed < 0) {
      addToast({
        title: 'مقدار نامعتبر',
        description: 'لطفاً عددی نامنفی وارد کنید.',
        type: 'error',
      });
      return;
    }

    const res = updateMaterialStock(
      editingMaterial.id,
      parsed,
      state.staff[0].id,
      materialReason
    );

    if (res.success) {
      addToast({
        title: 'موجودی ماده اولیه بروز شد',
        description: `موجودی ${editingMaterial.nameFa} به ${toFaDigits(parsed)} ${editingMaterial.unitOfMeasure} تغییر یافت.`,
        type: 'success',
      });
      setEditingMaterial(null);
    } else {
      addToast({
        title: 'خطا در ثبت',
        description: res.error || 'خطایی رخ داد.',
        type: 'error',
      });
    }
  };

  // Columns for SKU Matrix
  const variantColumns: ColumnDef<ProductVariant>[] = [
    {
      key: 'product',
      header: 'کالا و مشخصات تنوع',
      render: (row) => {
        const prod = state.products.find((p) => p.id === row.productId);
        return (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
              {prod?.images && prod.images[0] ? (
                <img
                  src={prod.images[0].url}
                  alt={prod.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Box size={18} className="text-stone-500" />
              )}
            </div>
            <div>
              <div className="font-bold text-white text-xs truncate max-w-[200px]">
                {prod?.name || row.productId}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-400">
                <span className="font-mono text-[#eed29d] font-bold">{row.sku}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white/20 inline-block"
                    style={{ backgroundColor: row.colorHex }}
                  />
                  <span>{row.colorName}</span>
                </span>
                <span>•</span>
                <span>سایز {row.size}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'warehouseLocation',
      header: 'لوکیشن قفسه',
      render: (row) => (
        <span className="font-mono text-xs text-stone-300 bg-stone-900/80 px-2 py-1 rounded border border-white/5">
          {row.warehouseLocation || 'مرکزی - قفسه ۱'}
        </span>
      ),
    },
    {
      key: 'onHandStock',
      header: 'موجودی فیزیکی',
      align: 'center',
      render: (row) => (
        <span className="font-fanum text-xs font-bold text-white">
          {toFaDigits(row.onHandStock)}
        </span>
      ),
    },
    {
      key: 'reservedStock',
      header: 'تعهد رزرو',
      align: 'center',
      render: (row) => (
        <span className="font-fanum text-xs font-bold text-amber-400">
          {toFaDigits(row.reservedStock)}
        </span>
      ),
    },
    {
      key: 'available',
      header: 'موجودی آزاد قابل فروش',
      align: 'center',
      render: (row) => {
        const avail = row.onHandStock - row.reservedStock;
        const isLow = avail <= row.minStockThreshold && avail > 0;
        const isOut = avail <= 0;

        return (
          <div className="flex flex-col items-center">
            <span
              className={`font-fanum text-xs font-black ${
                isOut
                  ? 'text-rose-400'
                  : isLow
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {toFaDigits(avail)} عدد
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded mt-0.5 ${
                isOut
                  ? 'bg-rose-500/20 text-rose-300'
                  : isLow
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {isOut ? 'ناموجود' : isLow ? 'هشدار کسری' : 'مطلوب'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'اقدام انبارداری',
      align: 'left',
      render: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDrawerSku(row.sku)}
            className="text-xs"
          >
            کاردکس و تنظیم
          </Button>
        </div>
      ),
    },
  ];

  // Columns for Raw Materials
  const materialColumns: ColumnDef<WorkshopMaterial>[] = [
    {
      key: 'nameFa',
      header: 'عنوان ماده اولیه / ملزومات چاپ',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs">{row.nameFa}</div>
          <div className="text-[10px] text-stone-400 font-mono">{row.category}</div>
        </div>
      ),
    },
    {
      key: 'onHandQuantity',
      header: 'موجودی انبار کارگاه',
      align: 'center',
      render: (row) => (
        <span className="font-fanum text-xs font-bold text-white">
          {toFaDigits(row.onHandQuantity)} {row.unitOfMeasure}
        </span>
      ),
    },
    {
      key: 'threshold',
      header: 'آستانه هشدار سفارش',
      align: 'center',
      render: (row) => (
        <span className="font-fanum text-xs text-stone-400">
          {toFaDigits(row.minThreshold)} {row.unitOfMeasure}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت تامین',
      align: 'center',
      render: (row) => {
        const isCritical = row.onHandQuantity <= row.minThreshold;
        return (
          <Badge
            label={isCritical ? 'نیازمند ثبت سفارش خرید' : 'موجودی پایدار'}
            variant={isCritical ? 'danger' : 'success'}
            size="sm"
          />
        );
      },
    },
    {
      key: 'action',
      header: 'اصلاح موجودی',
      align: 'left',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setEditingMaterial(row);
            setMaterialNewStock(String(row.onHandQuantity));
          }}
        >
          شمارش و تنظیم
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title="موجودی انبار، تعهدات رزرو و انبارگردانی"
        description="انبارگردانی بلادرنگ با پاسداری از فرمول ناوردایی (موجودی فیزیکی - رزروها ≥ ۰) و تفکیک موجودی لباس خام از طرح‌های شخصی."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/admin/catalog/stock-movements')}
              className="flex items-center gap-2"
            >
              <History size={16} />
              دفتر روزنامه گردش انبار
            </Button>
            <Button
              variant="brass"
              size="md"
              onClick={() => navigate('/admin/catalog/purchase-orders')}
              className="flex items-center gap-2"
            >
              <ArrowDownLeft size={16} />
              سفارشات خرید (PO)
            </Button>
          </div>
        }
      />

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400 block mb-1">موجودی فیزیکی کل</span>
          <span className="text-xl font-bold font-fanum text-white block">
            {toFaDigits(stats.totalOnHand)}
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">تکه لباس در سوله</span>
        </div>

        <div className="p-4 bg-[#141211] border border-amber-500/20 rounded-2xl">
          <span className="text-xs text-amber-300 block mb-1">تعهدات رزرو سبد</span>
          <span className="text-xl font-bold font-fanum text-amber-400 block">
            {toFaDigits(stats.totalReserved)}
          </span>
          <span className="text-[10px] text-amber-500/80 mt-1 block">در حال پردازش و چاپ</span>
        </div>

        <div className="p-4 bg-[#141211] border border-emerald-500/20 rounded-2xl">
          <span className="text-xs text-emerald-300 block mb-1">موجودی آزاد قابل فروش</span>
          <span className="text-xl font-bold font-fanum text-emerald-400 block">
            {toFaDigits(stats.totalAvailable)}
          </span>
          <span className="text-[10px] text-emerald-500/80 mt-1 block">آماده تحویل و فروش</span>
        </div>

        <div className="p-4 bg-[#141211] border border-amber-500/20 rounded-2xl">
          <span className="text-xs text-stone-400 block mb-1">اقلام دارای کسری (Low)</span>
          <span className="text-xl font-bold font-fanum text-amber-400 block">
            {toFaDigits(stats.lowStockCount)}
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">زیر آستانه هشدار</span>
        </div>

        <div className="p-4 bg-[#141211] border border-rose-500/20 rounded-2xl">
          <span className="text-xs text-rose-300 block mb-1">کدهای ناموجود (Out)</span>
          <span className="text-xl font-bold font-fanum text-rose-400 block">
            {toFaDigits(stats.outOfStockCount)}
          </span>
          <span className="text-[10px] text-rose-500/80 mt-1 block">موجودی آزاد صفر</span>
        </div>

        <div className="p-4 bg-[#141211] border border-[#ba8d3d]/30 rounded-2xl">
          <span className="text-xs text-[#eed29d] block mb-1">ارزش برآوردی موجودی</span>
          <span className="text-base font-bold font-fanum text-white block truncate">
            {formatPriceTomans(stats.estimatedValuationTomans)}
          </span>
          <span className="text-[10px] text-stone-400 mt-1 block">مبتنی بر نرخ پایه فروش</span>
        </div>
      </div>

      {/* Architectural Invariant Banner: Blank Customizable Garments vs Virtual Artwork */}
      <div className="p-4 bg-gradient-to-r from-[#ba8d3d]/15 via-[#181614] to-black border border-[#ba8d3d]/30 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs text-[#eed29d]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ba8d3d]/20 border border-[#ba8d3d]/40 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} className="text-[#eed29d]" />
          </div>
          <div className="leading-relaxed">
            <strong className="block text-white font-bold">
              ناوردایی بنیادین چاپ سفارشی (POD Inventory Invariant):
            </strong>
            یک تیشرت یا هودی خام ممکن است صدها طرح شخصی را پشتیبانی کند. موجودی فیزیکی منحصراً روی تیشرت خام متمرکز است و هرگز به ازای طرح‌های مجازی تکثیر نمی‌شود.
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-mono bg-black/40 border border-white/10 px-2.5 py-1 rounded-full text-stone-300">
            INVARIANT GUARD: AVAILABLE = ON_HAND - RESERVED ≥ 0
          </span>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="border-b border-white/10 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('variants')}
          className={`py-3 px-4 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'variants'
              ? 'text-[#eed29d] border-[#ba8d3d]'
              : 'text-stone-400 border-transparent hover:text-stone-200'
          }`}
        >
          <Box size={16} />
          ماتریس تنوع کالاها (SKUs)
          <span className="bg-white/10 text-stone-300 font-mono text-[10px] px-2 py-0.5 rounded-full">
            {toFaDigits(state.variants.length)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('materials')}
          className={`py-3 px-4 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'materials'
              ? 'text-[#eed29d] border-[#ba8d3d]'
              : 'text-stone-400 border-transparent hover:text-stone-200'
          }`}
        >
          <Package size={16} />
          مواد اولیه و ملزومات کارگاه چاپ
          <span className="bg-white/10 text-stone-300 font-mono text-[10px] px-2 py-0.5 rounded-full">
            {toFaDigits(state.workshopMaterials.length)}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`py-3 px-4 text-xs font-bold transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'timeline'
              ? 'text-[#eed29d] border-[#ba8d3d]'
              : 'text-stone-400 border-transparent hover:text-stone-200'
          }`}
        >
          <History size={16} />
          تاریخچه و خط زمان گردش انبار
          <span className="bg-white/10 text-stone-300 font-mono text-[10px] px-2 py-0.5 rounded-full">
            {toFaDigits(state.stockMovements?.length || 0)}
          </span>
        </button>
      </div>

      {/* TAB 1: GARMENT VARIANTS (SKUS) */}
      {activeTab === 'variants' && (
        <div className="space-y-4">
          {/* Filters Bar */}
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
                placeholder="جستجو در کد تنوع SKU، نام محصول، یا رنگ..."
                className="w-full bg-[#181614] border border-white/10 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-[#ba8d3d]"
              />
            </div>

            <div className="w-48">
              <Select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value as any)}
                options={[
                  { value: 'all', label: 'همه وضعیت‌های موجودی' },
                  { value: 'low', label: 'کالاهای دارای کسری (هشدار)' },
                  { value: 'out_of_stock', label: 'کالاهای ناموجود' },
                  { value: 'healthy', label: 'موجودی پایدار و کافی' },
                ]}
              />
            </div>

            <div className="w-48">
              <Select
                value={warehouseLocationFilter}
                onChange={(e) => setWarehouseLocationFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'همه قفسه‌ها و سوله' },
                  ...warehouseLocations.map((loc) => ({
                    value: loc,
                    label: loc,
                  })),
                ]}
              />
            </div>

            {(searchQuery || stockStatusFilter !== 'all' || warehouseLocationFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStockStatusFilter('all');
                  setWarehouseLocationFilter('all');
                }}
              >
                پاکسازی فیلترها
              </Button>
            )}
          </div>

          {/* Variants Table */}
          <div className="bg-[#141211] border border-white/10 rounded-2xl overflow-hidden">
            <Table
              data={filteredVariants}
              columns={variantColumns}
              keyExtractor={(v) => v.sku}
              emptyMessage="هیچ کد تنوعی با فیلترهای جاری یافت نشد."
            />
          </div>
        </div>
      )}

      {/* TAB 2: WORKSHOP RAW MATERIALS */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="p-4 bg-stone-900/60 border border-white/10 rounded-2xl flex items-center justify-between text-xs text-stone-300">
            <div>
              <strong className="block text-white font-bold mb-0.5">
                موجودی جوهر مستقیم نساجی، مواد پریکوت، هاردباکس و ملزومات کارگاه
              </strong>
              <span>
                کنترل روزانه مواد مصرفی مانع از توقف خطوط تولید چاپ مستقیم Brother GTX و بسته‌بندی می‌گردد.
              </span>
            </div>
            <Button
              variant="brass"
              size="sm"
              onClick={() => navigate('/admin/catalog/purchase-orders')}
            >
              ثبت سفارش خرید مواد مصرفی
            </Button>
          </div>

          <div className="bg-[#141211] border border-white/10 rounded-2xl overflow-hidden">
            <Table
              data={state.workshopMaterials}
              columns={materialColumns}
              keyExtractor={(m) => m.id}
            />
          </div>
        </div>
      )}

      {/* TAB 3: TIMELINE AUDIT */}
      {activeTab === 'timeline' && (
        <div className="bg-[#141211] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">دفتر گردش انبار و رخدادها</h2>
              <p className="text-xs text-stone-400 mt-0.5">
                ثبت بدون تغییر تمامی تراکنش‌های ورود، خروج، رزرو و اصلاحیه فیزیکی
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/admin/catalog/stock-movements')}
              className="flex items-center gap-1.5"
            >
              <span>مشاهده در صفحه اختصاصی</span>
              <ChevronLeft size={16} />
            </Button>
          </div>

          <div className="space-y-3">
            {(state.stockMovements || []).slice(0, 10).map((m) => {
              const isPositive = m.quantityChange > 0;
              return (
                <div
                  key={m.id}
                  className="p-3.5 bg-stone-900/50 border border-white/10 rounded-xl text-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isPositive
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {toFaDigits(m.quantityChange)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#eed29d] font-bold">{m.sku}</span>
                        <span className="text-white font-medium">{m.reason}</span>
                      </div>
                      <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-3 font-fanum">
                        <span>فیزیکی: {toFaDigits(m.previousOnHand)} ← {toFaDigits(m.newOnHand)}</span>
                        <span>رزرو: {toFaDigits(m.previousReserved)} ← {toFaDigits(m.newReserved)}</span>
                        <span>ثبت‌کننده: {m.actorName}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-fanum text-stone-400 shrink-0">
                    {formatPersianDate(m.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stock Details Drawer */}
      {selectedDrawerSku && (
        <StockDetailsDrawer
          sku={selectedDrawerSku}
          onClose={() => setSelectedDrawerSku(null)}
        />
      )}

      {/* Material Stock Edit Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#181614] border border-white/10 rounded-2xl p-6 shadow-2xl text-right font-sans">
            <h3 className="text-sm font-bold text-white mb-1">
              تنظیم موجودی ماده اولیه: {editingMaterial.nameFa}
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              مقدار شمارش شده جدید را بر حسب {editingMaterial.unitOfMeasure} وارد فرمایید.
            </p>

            <form onSubmit={handleUpdateMaterialStock} className="space-y-4">
              <FormField label={`مقدار موجودی جدید (${editingMaterial.unitOfMeasure})`} required>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={materialNewStock}
                  onChange={(e) => setMaterialNewStock(e.target.value)}
                  placeholder="مثلاً: ۱۵"
                />
              </FormField>

              <FormField label="علت اصلاحیه" required>
                <Input
                  value={materialReason}
                  onChange={(e) => setMaterialReason(e.target.value)}
                  placeholder="مثلاً: انبارگردانی هفتگی و مصرف خط چاپ"
                />
              </FormField>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setEditingMaterial(null)}
                >
                  انصراف
                </Button>
                <Button type="submit" variant="brass" size="md">
                  ثبت در کاردکس
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
