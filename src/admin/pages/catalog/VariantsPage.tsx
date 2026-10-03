import React, { useState, useMemo } from 'react';
import {
  Grid,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Sliders,
  Eye,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, SearchInput, Pagination, MoneyDisplay, useToast } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import { ProductVariant } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

export const VariantsPage: React.FC = () => {
  const {
    state,
    getVariants,
    updateVariant,
    deleteVariant,
    createVariant,
    updateVariantStock,
  } = useCatalogAdmin();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Quick Stock Edit Modal
  const [stockModalVariant, setStockModalVariant] = useState<ProductVariant | null>(null);
  const [newStockOnHand, setNewStockOnHand] = useState<number>(0);
  const [stockChangeReason, setStockChangeReason] = useState<string>('انبارگردانی دوره‌ای');
  const [modalError, setModalError] = useState<string | null>(null);

  // Add Variant Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newVariant, setNewVariant] = useState<Partial<ProductVariant>>({
    productId: state.products[0]?.id || '',
    sku: '',
    size: 'L',
    colorName: 'مشکی ذغالی',
    colorHex: '#1C1A1A',
    fit: 'oversize',
    material: '۱۰۰٪ پنبه ارگانیک دو نخ ۲۴۰ گرم',
    onHandStock: 0,
    minStockThreshold: 4,
    priceAdjustmentTomans: 0,
    isEnabled: true,
  });

  const filtered = useMemo(() => {
    return state.variants.filter((v) => {
      const matchSearch =
        v.sku.toLowerCase().includes(search.toLowerCase()) ||
        v.colorName.toLowerCase().includes(search.toLowerCase()) ||
        v.productId.toLowerCase().includes(search.toLowerCase());

      const matchSize = sizeFilter === 'all' || v.size === sizeFilter;
      const matchProduct = productFilter === 'all' || v.productId === productFilter;

      const available = v.onHandStock - v.reservedStock;
      let matchStock = true;
      if (stockStatusFilter === 'low') {
        matchStock = available <= v.minStockThreshold && available > 0;
      } else if (stockStatusFilter === 'out') {
        matchStock = available <= 0;
      }

      return matchSearch && matchSize && matchProduct && matchStock;
    });
  }, [state.variants, search, sizeFilter, productFilter, stockStatusFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenStockModal = (variant: ProductVariant) => {
    setStockModalVariant(variant);
    setNewStockOnHand(variant.onHandStock);
    setStockChangeReason('شارژ مجدد پارچه خام از بافندگی');
    setModalError(null);
  };

  const handleSaveStock = async () => {
    if (!stockModalVariant) return;
    if (newStockOnHand < 0) {
      setModalError('موجودی فیزیکی نمی‌تواند منفی باشد.');
      return;
    }
    if (newStockOnHand < stockModalVariant.reservedStock) {
      setModalError(
        `موجودی فیزیکی (${newStockOnHand}) نمی‌تواند از تعداد رزرو شده در سفارشات مشتری (${stockModalVariant.reservedStock}) کمتر باشد.`
      );
      return;
    }

    const staffId = state.staff[0]?.id || 'staff-1';
    const success = await updateVariantStock(
      stockModalVariant.sku,
      newStockOnHand,
      staffId,
      stockChangeReason
    );

    if (success) {
      setStockModalVariant(null);
    } else {
      setModalError('خطا در به‌روزرسانی موجودی انبار.');
    }
  };

  const handleSaveNewVariant = async () => {
    if (!newVariant.sku?.trim()) {
      setModalError('کد تنوع انبار (SKU) الزامی است.');
      return;
    }
    if(Number(newVariant.onHandStock)>0&&!initialStockReason.trim()){setModalError('دلیل ثبت موجودی را وارد کنید.');return;}

    const res = await createVariant({
      ...newVariant,
      productId: newVariant.productId || state.products[0]?.id,
      sku: newVariant.sku.trim().toUpperCase(),
      size: newVariant.size || 'L',
      colorName: newVariant.colorName || 'مشکی',
      colorHex: newVariant.colorHex || '#1C1A1A',
      fit: newVariant.fit || 'oversize',
      material: newVariant.material || '۱۰۰٪ پنبه ارگانیک',
      onHandStock: Math.max(0, Number(newVariant.onHandStock) || 0),
      reservedStock: 0,
      minStockThreshold: Math.max(1, Number(newVariant.minStockThreshold) || 3),
      priceAdjustmentTomans: Number(newVariant.priceAdjustmentTomans) || 0,
      ...(initialStockReason ? {inventoryReason:initialStockReason} : {}),
      isEnabled: true,
    } as ProductVariant);

    if (!res.success) {
      setModalError(res.error || 'خطا در ثبت تنوع.');
    } else {
      setIsAddModalOpen(false);
      setModalError(null);
    }
  };

  const [initialStockReason,setInitialStockReason]=useState('');
  const handleDelete = async (sku: string) => {
    const confirm = window.confirm(
      `آیا از حذف تنوع ${sku} اطمینان دارید؟ در صورت وجود سفارش ثبت‌شده با این SKU، حذف غیرمجاز خواهد بود.`
    );
    if (!confirm) return;

    const res = await deleteVariant(sku);
    if (!res.success) {
      addToast({
        title: 'عدم امکان حذف تنوع',
        description: res.error || 'امکان حذف این کد تنوع وجود ندارد.',
        type: 'error',
      });
    } else {
      addToast({
        title: 'تنوع حذف شد',
        description: `کد تنوع کالایی ${sku} با موفقیت حذف گردید.`,
        type: 'success',
      });
    }
  };

  const columns: ColumnDef<ProductVariant>[] = [
    {
      key: 'product',
      header: 'محصول والد',
      render: (row) => {
        const product = state.products.find((p) => p.id === row.productId);
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-black border border-white/10 flex-shrink-0">
              <img
                src={product?.primaryImage || product?.images?.[0] || 'https://picsum.photos/seed/thumb/100/100'}
                alt={product?.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="font-bold text-white text-xs line-clamp-1">{product?.name || row.productId}</div>
              <span className="font-mono text-[10px] text-stone-400">{row.productId}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'sku',
      header: 'کد تنوع انبار (SKU)',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[#eed29d]">{row.sku}</span>
      ),
    },
    {
      key: 'size',
      header: 'سایز',
      render: (row) => (
        <span className="font-mono font-bold text-xs bg-white/5 px-2 py-0.5 rounded border border-white/10 text-white">
          {row.size}
        </span>
      ),
    },
    {
      key: 'colorName',
      header: 'رنگ‌بندی پارچه',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div
            className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0"
            style={{ backgroundColor: row.colorHex }}
          />
          <span className="text-xs text-stone-200">{row.colorName}</span>
        </div>
      ),
    },
    {
      key: 'onHandStock',
      header: 'موجودی فیزیکی',
      render: (row) => (
        <span className="font-fanum text-xs text-white font-bold">{toFaDigits(row.onHandStock)}</span>
      ),
    },
    {
      key: 'reservedStock',
      header: 'رزرو در سبد',
      render: (row) => (
        <span className="font-fanum text-xs text-amber-400 font-bold">{toFaDigits(row.reservedStock)}</span>
      ),
    },
    {
      key: 'availableStock',
      header: 'قابل فروش',
      render: (row) => {
        const available = row.onHandStock - row.reservedStock;
        const isLow = available <= row.minStockThreshold;
        const isOut = available <= 0;

        return (
          <div className="flex items-center gap-1.5 font-fanum text-xs">
            <span
              className={`font-bold ${
                isOut ? 'text-red-400' : isLow ? 'text-amber-300' : 'text-emerald-400'
              }`}
            >
              {toFaDigits(available)}
            </span>
            {isOut ? (
              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-sans">
                ناموجود
              </span>
            ) : isLow ? (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-sans">
                کسری
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      key: 'priceAdjustmentTomans',
      header: 'اختلاف قیمت',
      render: (row) =>
        row.priceAdjustmentTomans ? (
          <span className="font-fanum text-xs text-stone-300">
            +{toFaDigits(row.priceAdjustmentTomans.toLocaleString())} تومان
          </span>
        ) : (
          <span className="text-[10px] text-stone-600">—</span>
        ),
    },
    {
      key: 'isEnabled',
      header: 'وضعیت',
      render: (row) => (
        <Badge
          label={row.isEnabled !== false ? 'فعال' : 'غیرفعال'}
          variant={row.isEnabled !== false ? 'success' : 'default'}
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      header: 'عملیات',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenStockModal(row)}
            className="p-1.5 text-stone-400 hover:text-[#eed29d] bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            title="اصلاح موجودی انبار"
          >
            <Edit2 size={13} />
          </button>
          <button
            onClick={() => handleDelete(row.sku)}
            className="p-1.5 text-stone-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors"
            title="حذف تنوع"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="تنوع‌های انبار و کدهای شناسایی (SKUs)"
        description="تفکیک ماتریس ۱۶۸ کد محصول بر اساس رنگ‌بندی، سایزبندی، آرت‌نامبر انبارداری و سطح موجودی."
        actions={
          <Button variant="brass" size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus size={13} className="ml-1" />
            تعریف تنوع جدید (SKU)
          </Button>
        }
      />

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">کل تنوع‌های فعال (SKU)</span>
          <div className="text-2xl font-black text-white mt-1 font-fanum">
            {toFaDigits(state.variants.length)} کد
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">پوشش کامل سایزهای XS تا 3XL</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">موجودی فیزیکی کل انبار</span>
          <div className="text-2xl font-black text-white mt-1 font-fanum">
            {toFaDigits(state.variants.reduce((a, b) => a + b.onHandStock, 0))} عدد
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block">آماده تحویل به خطوط چاپ</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">اقلام رزرو شده مشتریان</span>
          <div className="text-2xl font-black text-amber-400 mt-1 font-fanum">
            {toFaDigits(state.variants.reduce((a, b) => a + b.reservedStock, 0))} عدد
          </div>
          <span className="text-[10px] text-stone-500 mt-1 block">در جریان فرآیند پرداخت و ارسال</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">کدهای نیازمند شارژ فوری</span>
          <div className="text-2xl font-black text-red-400 mt-1 font-fanum">
            {toFaDigits(
              state.variants.filter((v) => v.onHandStock - v.reservedStock <= v.minStockThreshold).length
            )}{' '}
            مورد
          </div>
          <span className="text-[10px] text-red-400 mt-1 block">رسیده به حد آستانه انبار</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="w-full lg:w-72">
          <SearchInput
            placeholder="جستجوی کد SKU، رنگ، شناسه محصول..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Product Filter */}
          <select
            value={productFilter}
            onChange={(e) => {
              setProductFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#131211] border border-white/10 rounded-xl px-3 py-2 text-xs text-stone-300 focus:border-[#eed29d] focus:outline-none"
          >
            <option value="all">همه محصولات والد</option>
            {state.products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Size Filter */}
          <select
            value={sizeFilter}
            onChange={(e) => {
              setSizeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#131211] border border-white/10 rounded-xl px-3 py-2 text-xs text-stone-300 focus:border-[#eed29d] focus:outline-none"
          >
            <option value="all">همه سایزها</option>
            {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free'].map((s) => (
              <option key={s} value={s}>
                سایز {s}
              </option>
            ))}
          </select>

          {/* Stock Status Filter */}
          <select
            value={stockStatusFilter}
            onChange={(e) => {
              setStockStatusFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-[#131211] border border-white/10 rounded-xl px-3 py-2 text-xs text-stone-300 focus:border-[#eed29d] focus:outline-none"
          >
            <option value="all">وضعیت موجودی: همه</option>
            <option value="low">فقط کدهای دارای کسری انبار</option>
            <option value="out">فقط کدهای تمام‌شده (ناموجود)</option>
          </select>
        </div>
      </div>

      <Table
        data={pageItems}
        columns={columns}
        keyExtractor={(v) => v.sku}
      />

      <div className="flex justify-between items-center text-xs text-stone-400">
        <span>
          نمایش {toFaDigits((currentPage - 1) * pageSize + 1)} تا{' '}
          {toFaDigits(Math.min(currentPage * pageSize, filtered.length))} از {toFaDigits(filtered.length)} تنوع
        </span>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Quick Stock Modal */}
      {stockModalVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181716] border border-white/20 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Sliders size={16} className="text-[#eed29d]" />
              اصلاح موجودی انبار: {stockModalVariant.sku}
            </h3>

            {modalError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-black/40 rounded-xl space-y-1.5 border border-white/5">
                <div className="flex justify-between text-stone-400">
                  <span>تعداد رزرو جاری:</span>
                  <span className="font-fanum text-amber-400 font-bold">
                    {toFaDigits(stockModalVariant.reservedStock)} عدد
                  </span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>آستانه هشدار کسری:</span>
                  <span className="font-fanum text-stone-300 font-bold">
                    {toFaDigits(stockModalVariant.minStockThreshold)} عدد
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-300 mb-1">
                  موجودی فیزیکی جدید (On-Hand)
                </label>
                <input
                  type="number"
                  min={stockModalVariant.reservedStock}
                  value={newStockOnHand}
                  onChange={(e) => setNewStockOnHand(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-fanum focus:border-[#eed29d] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-300 mb-1">دلیل ثبت تغییر موجودی</label>
                <select
                  value={stockChangeReason}
                  onChange={(e) => setStockChangeReason(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white focus:border-[#eed29d] focus:outline-none"
                >
                  <option value="ورود پارچه جدید از کارخانه بافندگی اصفهان">
                    ورود پارچه جدید از کارخانه بافندگی اصفهان
                  </option>
                  <option value="انبارگردانی و تطبیق دوره‌ای اقلام فیزیکی">
                    انبارگردانی و تطبیق دوره‌ای اقلام فیزیکی
                  </option>
                  <option value="ضایعات دوخت یا آسیب پارچه در کارگاه چاپ">
                    ضایعات دوخت یا آسیب پارچه در کارگاه چاپ
                  </option>
                  <option value="اصلاح خطای اپراتور انبار">اصلاح خطای اپراتور انبار</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="outline" size="sm" onClick={() => setStockModalVariant(null)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleSaveStock}>
                ثبت در کاردکس انبار
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Variant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181716] border border-white/20 rounded-2xl p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Plus size={16} className="text-[#eed29d]" />
              تعریف کد تنوع جدید (SKU)
            </h3>

            {modalError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-300 mb-1">
                  محصول والد <span className="text-red-400">*</span>
                </label>
                <select
                  value={newVariant.productId}
                  onChange={(e) => {
                    const pId = e.target.value;
                    const prod = state.products.find((p) => p.id === pId);
                    setNewVariant({
                      ...newVariant,
                      productId: pId,
                      sku: `${prod?.skuPrefix || pId.toUpperCase()}-NEW-L`,
                    });
                  }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white focus:border-[#eed29d] focus:outline-none"
                >
                  {state.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-300 mb-1">
                  کد تنوع انبار (SKU یکتا) <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newVariant.sku}
                  onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value.toUpperCase() })}
                  placeholder="SP101-TSH-BLK-L"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-[#eed29d] focus:outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-300 mb-1">سایز</label>
                  <select
                    value={newVariant.size}
                    onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value as any })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white font-mono focus:border-[#eed29d] focus:outline-none"
                  >
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-300 mb-1">قواره دوخت (Fit)</label>
                  <select
                    value={newVariant.fit}
                    onChange={(e) => setNewVariant({ ...newVariant, fit: e.target.value as any })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-2 text-white focus:border-[#eed29d] focus:outline-none"
                  >
                    <option value="oversize">اورسایز</option>
                    <option value="regular">معمولی</option>
                    <option value="slim">اسلیم</option>
                    <option value="crop">کراپ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-300 mb-1">نام رنگ</label>
                  <input
                    type="text"
                    value={newVariant.colorName}
                    onChange={(e) => setNewVariant({ ...newVariant, colorName: e.target.value })}
                    placeholder="مشکی ذغالی"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-[#eed29d] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-300 mb-1">کد رنگ هگز</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newVariant.colorHex}
                      onChange={(e) => setNewVariant({ ...newVariant, colorHex: e.target.value })}
                      className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newVariant.colorHex}
                      onChange={(e) => setNewVariant({ ...newVariant, colorHex: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-[#eed29d] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="col-span-3 block text-stone-300">دلیل ثبت موجودی
                  <input value={initialStockReason} onChange={e=>setInitialStockReason(e.target.value)} className="block mt-2 w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white" />
                </label>
                <div>
                  <label className="block font-bold text-stone-300 mb-1">موجودی فیزیکی</label>
                  <input
                    type="number"
                    min={0}
                    value={newVariant.onHandStock}
                    onChange={(e) => setNewVariant({ ...newVariant, onHandStock: Math.max(0, Number(e.target.value)) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-fanum focus:border-[#eed29d] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-300 mb-1">آستانه هشدار</label>
                  <input
                    type="number"
                    min={1}
                    value={newVariant.minStockThreshold}
                    onChange={(e) => setNewVariant({ ...newVariant, minStockThreshold: Math.max(1, Number(e.target.value)) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-fanum focus:border-[#eed29d] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-300 mb-1">اختلاف قیمت</label>
                  <input
                    type="number"
                    step={10000}
                    value={newVariant.priceAdjustmentTomans}
                    onChange={(e) => setNewVariant({ ...newVariant, priceAdjustmentTomans: Number(e.target.value) })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-fanum focus:border-[#eed29d] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
              <Button variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleSaveNewVariant}>
                ایجاد تنوع انبار
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
