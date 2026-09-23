import React, { useState, useMemo } from 'react';
import {
  Tag,
  Plus,
  Shirt,
  CheckCircle,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  FileSpreadsheet,
  AlertCircle,
  Copy,
  ExternalLink,
  CheckSquare,
  Square,
  SlidersHorizontal,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import {
  Table,
  ColumnDef,
  Badge,
  Button,
  MoneyDisplay,
  SearchInput,
  Pagination,
} from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { AdminProduct } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';
import { ProductEditor } from './ProductEditor';

export const ProductsPage: React.FC = () => {
  const {
    state,
    getProducts,
    getCategories,
    bulkUpdateProductStatus,
    deleteProduct,
    createProduct,
    importProductsCsv,
  } = useAdminRepository();

  const categories = getCategories();

  // Navigation to editor
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'updated' | 'priceAsc' | 'priceDesc' | 'stockAsc' | 'stockDesc' | 'name'>('updated');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Bulk Selection
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkActionNotice, setBulkActionNotice] = useState<string | null>(null);

  // CSV Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvImportResult, setCsvImportResult] = useState<{
    success?: boolean;
    importedCount?: number;
    errors?: string[];
  } | null>(null);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let list = state.products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.skuPrefix.toLowerCase().includes(search.toLowerCase()) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));

      const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchType = typeFilter === 'all' || p.productType === typeFilter;

      const hasLowStock = p.variants.some(
        (v) => v.onHandStock - v.reservedStock <= v.minStockThreshold
      );
      const matchStock = !lowStockOnly || hasLowStock;

      return matchSearch && matchCat && matchStatus && matchType && matchStock;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (sortBy === 'priceAsc') return a.basePriceTomans - b.basePriceTomans;
      if (sortBy === 'priceDesc') return b.basePriceTomans - a.basePriceTomans;
      if (sortBy === 'stockAsc') {
        const stockA = a.variants.reduce((acc, v) => acc + v.onHandStock, 0);
        const stockB = b.variants.reduce((acc, v) => acc + v.onHandStock, 0);
        return stockA - stockB;
      }
      if (sortBy === 'stockDesc') {
        const stockA = a.variants.reduce((acc, v) => acc + v.onHandStock, 0);
        const stockB = b.variants.reduce((acc, v) => acc + v.onHandStock, 0);
        return stockB - stockA;
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'fa');
      // Default: updated
      return new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime();
    });

    return list;
  }, [state.products, search, categoryFilter, statusFilter, typeFilter, lowStockOnly, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // If in editor view, render ProductEditor
  if (editingProductId !== null) {
    return (
      <ProductEditor
        productId={editingProductId}
        onBack={() => setEditingProductId(null)}
      />
    );
  }

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedProductIds.length === paginatedProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(paginatedProducts.map((p) => p.id));
    }
  };

  const handleToggleSelectProduct = (id: string) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter((pId) => pId !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  const handleBulkStatus = (newStatus: 'active' | 'draft' | 'archived') => {
    if (selectedProductIds.length === 0) return;
    const res = bulkUpdateProductStatus(selectedProductIds, newStatus);
    setBulkActionNotice(
      `وضعیت ${toFaDigits(res.updatedCount)} محصول با موفقیت به «${
        newStatus === 'active' ? 'عرضه فعال' : newStatus === 'draft' ? 'پیش‌نویس' : 'بایگانی'
      }» تغییر یافت.`
    );
    setSelectedProductIds([]);
    setTimeout(() => setBulkActionNotice(null), 3000);
  };

  // Delete handler
  const handleDeleteProduct = (p: AdminProduct) => {
    const confirm = window.confirm(
      `آیا از حذف محصول «${p.name}» (${p.id}) اطمینان دارید؟ در صورت ثبت سفارش با این محصول، حذف به منظور حفظ یکپارچگی سوابق مالی ممنوع است.`
    );
    if (!confirm) return;

    const res = deleteProduct(p.id);
    if (!res.success) {
      alert(res.error);
    } else {
      alert(`محصول «${p.name}» با موفقیت حذف شد.`);
    }
  };

  // Duplicate Product
  const handleDuplicateProduct = (p: AdminProduct) => {
    const newId = `sp-${100 + state.products.length + 1}`;
    const newSkuPrefix = `${newId.toUpperCase()}-TSH`;

    const duplicatedVariants = p.variants.map((v, i) => ({
      ...v,
      productId: newId,
      sku: `${newSkuPrefix}-${v.size}-${i + 1}`,
      onHandStock: 10,
      reservedStock: 0,
    }));

    createProduct({
      ...p,
      id: newId,
      skuPrefix: newSkuPrefix,
      name: `کپی ${p.name}`,
      nameEn: p.nameEn ? `Copy of ${p.nameEn}` : undefined,
      slug: `${newId}-copy`,
      status: 'draft',
      isLive: false,
      variants: duplicatedVariants,
    });
    alert(`نسخه کپی از محصول «${p.name}» با شناسه ${newId} در وضعیت پیش‌نویس ایجاد شد.`);
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'شناسه کالا',
      'عنوان فارسی',
      'عنوان انگلیسی',
      'پیش‌وند انبار',
      'دسته‌بندی',
      'نوع کالا',
      'قیمت پایه (تومان)',
      'وضعیت انتشار',
      'تعداد تنوع SKU',
      'موجودی فیزیکی کل',
      'موجودی رزرو شده',
      'موجودی قابل فروش',
      'تاریخ آخرین تغییر',
    ];

    const rows = filteredProducts.map((p) => {
      const onHand = p.variants.reduce((acc, v) => acc + v.onHandStock, 0);
      const reserved = p.variants.reduce((acc, v) => acc + v.reservedStock, 0);
      return [
        p.id,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${(p.nameEn || '').replace(/"/g, '""')}"`,
        p.skuPrefix,
        p.category,
        p.productType,
        p.basePriceTomans,
        p.status,
        p.variants.length,
        onHand,
        reserved,
        onHand - reserved,
        p.updatedAt,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `shahpoosh-products-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import CSV
  const handleImportCsv = () => {
    if (!csvText.trim()) return;

    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) {
      setCsvImportResult({ errors: ['فایل CSV خالی است یا فقط دارای سربرگ است.'] });
      return;
    }

    const header = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const obj: any = {};
      header.forEach((h, idx) => {
        obj[h] = values[idx];
      });
      rows.push(obj);
    }

    const res = importProductsCsv(rows);
    setCsvImportResult(res);
    if (res.success) {
      setTimeout(() => {
        setIsImportModalOpen(false);
        setCsvText('');
        setCsvImportResult(null);
      }, 1500);
    }
  };

  // Table Columns
  const columns: ColumnDef<AdminProduct>[] = [
    {
      key: 'select',
      header: (
        <button
          type="button"
          onClick={handleToggleSelectAll}
          className="text-stone-400 hover:text-white"
        >
          {selectedProductIds.length === paginatedProducts.length && paginatedProducts.length > 0 ? (
            <CheckSquare size={15} className="text-[#eed29d]" />
          ) : (
            <Square size={15} />
          )}
        </button>
      ),
      render: (row) => (
        <button
          type="button"
          onClick={() => handleToggleSelectProduct(row.id)}
          className="text-stone-400 hover:text-white"
        >
          {selectedProductIds.includes(row.id) ? (
            <CheckSquare size={15} className="text-[#eed29d]" />
          ) : (
            <Square size={15} />
          )}
        </button>
      ),
    },
    {
      key: 'product',
      header: 'پوشاک / فرم پایه',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden bg-black border border-white/10 flex-shrink-0 relative">
            <img
              src={row.primaryImage || row.images?.[0] || 'https://picsum.photos/seed/thumb/100/100'}
              alt={row.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="font-bold text-white text-xs">{row.name}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-[10px] text-[#eed29d]">{row.id}</span>
              <span className="text-[10px] text-stone-500">•</span>
              <span className="font-mono text-[10px] text-stone-400">{row.skuPrefix}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'productType',
      header: 'نوع الگو',
      render: (row) => (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            row.productType === 'customizable_blank'
              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
              : 'bg-stone-800 text-stone-300 border-white/10'
          }`}
        >
          {row.productType === 'customizable_blank' ? 'خام آتلیه (POD)' : 'فرم آماده'}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'دسته‌بندی',
      render: (row) => {
        const cat = categories.find((c) => c.id === row.category);
        return <span className="text-xs text-stone-300">{cat?.nameFa || row.category}</span>;
      },
    },
    {
      key: 'basePriceTomans',
      header: 'قیمت پایه',
      render: (row) => (
        <div>
          <MoneyDisplay amount={row.basePriceTomans} size="sm" />
          {row.originalPriceTomans && (
            <div className="text-[10px] line-through text-stone-500 font-fanum">
              {toFaDigits(row.originalPriceTomans.toLocaleString())}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'variantsCount',
      header: 'تنوع‌ها (SKU)',
      render: (row) => (
        <span className="text-xs font-fanum text-stone-300">
          {toFaDigits(row.variants.length)} تنوع
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'موجودی کل / قابل فروش',
      render: (row) => {
        const onHand = row.variants.reduce((acc, v) => acc + v.onHandStock, 0);
        const reserved = row.variants.reduce((acc, v) => acc + v.reservedStock, 0);
        const available = onHand - reserved;
        const hasLowStock = row.variants.some((v) => v.onHandStock - v.reservedStock <= v.minStockThreshold);

        return (
          <div className="text-xs space-y-0.5">
            <div className="flex items-center gap-1.5 font-fanum">
              <span className="text-white font-bold">{toFaDigits(available)} عدد</span>
              {hasLowStock && (
                <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded">
                  کسری
                </span>
              )}
            </div>
            <div className="text-[10px] text-stone-500 font-fanum">
              فیزیکی: {toFaDigits(onHand)} | رزرو: {toFaDigits(reserved)}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'وضعیت عرضه',
      render: (row) => {
        const statusMap = {
          active: { label: 'عرضه فعال', variant: 'success' as const },
          draft: { label: 'پیش‌نویس', variant: 'default' as const },
          archived: { label: 'بایگانی', variant: 'warning' as const },
        };
        const st = statusMap[row.status || (row.isLive ? 'active' : 'draft')];
        return <Badge label={st.label} variant={st.variant} size="sm" />;
      },
    },
    {
      key: 'actions',
      header: 'عملیات',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditingProductId(row.id)}
            className="p-1.5 text-stone-400 hover:text-[#eed29d] bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            title="ویرایش محصول"
          >
            <Edit size={13} />
          </button>
          <button
            onClick={() => handleDuplicateProduct(row)}
            className="p-1.5 text-stone-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            title="ایجاد رونوشت (Duplicate)"
          >
            <Copy size={13} />
          </button>
          <button
            onClick={() => handleDeleteProduct(row)}
            className="p-1.5 text-stone-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-lg transition-colors"
            title="حذف محصول"
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
        title="محصولات پایه و فرم‌های لباس"
        description="مدیریت الگوهای خام تیشرت سوپرپنبه، اورسایز ۲۴۰ گرم، هودی‌های سنگین ۳۸۰ گرم و فرم‌های آماده کاتالوگ."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}>
              <Upload size={13} className="ml-1" />
              ورود فایل CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download size={13} className="ml-1" />
              خروجی CSV
            </Button>
            <Button variant="brass" size="sm" onClick={() => setEditingProductId('new')}>
              <Plus size={13} className="ml-1" />
              افزودن فرم جدید
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">تعداد فرم‌های کاتالوگ</span>
          <div className="text-2xl font-black text-white mt-1 font-fanum">
            {toFaDigits(state.products.length)} مدل
          </div>
          <span className="text-[10px] text-[#eed29d] mt-1 block">
            {toFaDigits(state.products.filter((p) => p.status === 'active').length)} فرم در حال عرضه فعال
          </span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">مجموع تنوع‌های SKU انبار</span>
          <div className="text-2xl font-black text-white mt-1 font-fanum">
            {toFaDigits(state.variants.length)} کد شناسایی
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">ترکیب فرم، رنگ و سایز</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">موجودی فیزیکی البسه</span>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-fanum">
            {toFaDigits(state.variants.reduce((a, b) => a + b.onHandStock, 0))} عدد
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">آماده تحویل به خط چاپ و بسته</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">اقلام دارای کسری موجودی</span>
          <div className="text-2xl font-black text-red-400 mt-1 font-fanum">
            {toFaDigits(
              state.products.filter((p) =>
                p.variants.some((v) => v.onHandStock - v.reservedStock <= v.minStockThreshold)
              ).length
            )}{' '}
            محصول
          </div>
          <span className="text-[10px] text-red-400 mt-1 block">نیازمند شارژ از بافندگی اصفهان</span>
        </div>
      </div>

      {/* Bulk Action Notification */}
      {bulkActionNotice && (
        <div className="bg-[#eed29d]/15 border border-[#eed29d]/30 text-[#eed29d] px-4 py-2.5 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle size={14} />
          <span>{bulkActionNotice}</span>
        </div>
      )}

      {/* Bulk Actions Floating Bar */}
      {selectedProductIds.length > 0 && (
        <div className="bg-[#1c1b1a] border border-[#eed29d]/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2 text-xs text-white">
            <span className="font-bold text-[#eed29d] font-fanum">{toFaDigits(selectedProductIds.length)}</span>
            <span>محصول انتخاب شده است:</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleBulkStatus('active')}>
              عرضه فعال
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkStatus('draft')}>
              انتقال به پیش‌نویس
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkStatus('archived')}>
              بایگانی
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedProductIds([])}
              className="text-stone-400"
            >
              لغو انتخاب
            </Button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="w-full lg:w-72">
          <SearchInput
            placeholder="جستجوی محصول با نام، کد یا تگ..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#131211] border border-white/10 rounded-xl px-3 py-2 text-xs text-stone-300 focus:border-[#eed29d] focus:outline-none"
          >
            <option value="all">همه دسته‌بندی‌ها</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameFa}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#131211] border border-white/10 rounded-xl px-3 py-2 text-xs text-stone-300 focus:border-[#eed29d] focus:outline-none"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">عرضه فعال</option>
            <option value="draft">پیش‌نویس</option>
            <option value="archived">بایگانی شده</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#131211] border border-white/10 rounded-xl px-3 py-2 text-xs text-stone-300 focus:border-[#eed29d] focus:outline-none"
          >
            <option value="all">همه انواع پوشاک</option>
            <option value="finished">پوشاک آماده</option>
            <option value="customizable_blank">خام آتلیه (POD Blank)</option>
          </select>

          {/* Low Stock Toggle */}
          <button
            type="button"
            onClick={() => {
              setLowStockOnly(!lowStockOnly);
              setCurrentPage(1);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              lowStockOnly
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-[#131211] border-white/10 text-stone-400 hover:text-white'
            }`}
          >
            <AlertTriangle size={13} />
            <span>فقط کسری انبار</span>
          </button>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#131211] border border-white/10 rounded-xl px-3 py-2 text-xs text-stone-300 focus:border-[#eed29d] focus:outline-none"
          >
            <option value="updated">مرتب‌سازی: آخرین تغییرات</option>
            <option value="priceAsc">قیمت: کم به زیاد</option>
            <option value="priceDesc">قیمت: زیاد به کم</option>
            <option value="stockDesc">بیشترین موجودی</option>
            <option value="stockAsc">کمترین موجودی</option>
            <option value="name">نام الفبایی</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <Table
        data={paginatedProducts}
        columns={columns}
        keyExtractor={(p) => p.id}
      />

      {/* Pagination Bar */}
      <div className="flex justify-between items-center text-xs text-stone-400">
        <span>
          نمایش {toFaDigits((currentPage - 1) * pageSize + 1)} تا{' '}
          {toFaDigits(Math.min(currentPage * pageSize, filteredProducts.length))} از {toFaDigits(filteredProducts.length)} محصول
        </span>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Import CSV Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#181716] border border-white/20 rounded-2xl p-6 max-w-lg w-full space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Upload size={16} className="text-[#eed29d]" />
              ورود دسته‌جمعی محصولات از فایل CSV
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              متن محتوای CSV را در کادر زیر جای‌گذاری کنید. ستون‌های الزامی شامل «نام محصول»، «قیمت پایه» و «دسته‌بندی» می‌باشند.
            </p>

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`نام محصول,قیمت پایه,دسته‌بندی,پیش‌وند\nتیشرت کالکشن پاییزه,395000,calligraphy,SP105-TSH`}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white font-mono placeholder:text-stone-600 focus:border-[#eed29d] focus:outline-none"
            />

            {csvImportResult?.errors && csvImportResult.errors.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl space-y-1">
                <span className="text-xs font-bold text-red-300 block">خطاهای ردیف‌های ورودی:</span>
                {csvImportResult.errors.map((err, i) => (
                  <div key={i} className="text-[11px] text-red-400">
                    • {err}
                  </div>
                ))}
              </div>
            )}

            {csvImportResult?.success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle size={14} />
                <span>
                  تعداد {toFaDigits(csvImportResult.importedCount || 0)} محصول با موفقیت به انبار افزوده شد.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleImportCsv}>
                پردازش و ثبت در کاتالوگ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
