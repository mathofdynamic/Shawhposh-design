import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  ArrowDownLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Truck,
  Package,
  Layers,
  Calendar,
  Box,
  ChevronDown,
  Trash2,
  Check,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import {
  Table,
  ColumnDef,
  Badge,
  Button,
  FormField,
  Input,
  Select,
  useToast,
} from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { PurchaseOrder, PurchaseOrderStatus, PurchaseOrderLineItem } from '../../domain/types';
import { toFaDigits, formatPriceTomans, formatPersianDate } from '../../utils/formatters';
import { useAdminRouter } from '../../router';
import { SuppliersPage } from './SuppliersPage';

export interface PurchaseOrdersPageProps {
  defaultTab?: 'purchase_orders' | 'suppliers';
}

export const PurchaseOrdersPage: React.FC<PurchaseOrdersPageProps> = ({ defaultTab = 'purchase_orders' }) => {
  const [procurementTab, setProcurementTab] = useState<'purchase_orders' | 'suppliers'>(defaultTab);
  const {
    state,
    createPurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder,
  } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Receiving Modal / Drawer
  const [receivingPo, setReceivingPo] = useState<PurchaseOrder | null>(null);
  const [receivedInputs, setReceivedInputs] = useState<Record<string, string>>({});

  // Create PO Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(state.suppliers[0]?.id || '');
  const [expectedDate, setExpectedDate] = useState('2026-10-15');
  const [notes, setNotes] = useState('شارژ موجودی لباس‌های خام پیش از آغاز حراج فصلی');
  const [poItems, setPoItems] = useState<
    Array<{
      id: string;
      itemType: 'variant_sku' | 'raw_material';
      itemRefId: string;
      nameFa: string;
      orderedQuantity: number;
      unitCostTomans: number;
    }>
  >([
    {
      id: 'ITEM-1',
      itemType: 'variant_sku',
      itemRefId: state.variants[0]?.sku || 'TSH-S113-BLK-L',
      nameFa: `تیشرت خام ${state.variants[0]?.sku || ''}`,
      orderedQuantity: 100,
      unitCostTomans: 280000,
    },
  ]);

  // Cancel PO modal
  const [cancellingPo, setCancellingPo] = useState<PurchaseOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('تاخیر غیرمجاز در تولید یا اتمام متریال');

  // Stats
  const stats = useMemo(() => {
    const list = state.purchaseOrders || [];
    const active = list.filter((p) => p.status === 'ordered' || p.status === 'partially_received').length;
    const completed = list.filter((p) => p.status === 'received').length;
    const totalExpenditure = list
      .filter((p) => p.status !== 'cancelled')
      .reduce((sum, p) => sum + p.totalCostTomans, 0);

    return {
      totalCount: list.length,
      activeCount: active,
      completedCount: completed,
      totalExpenditure,
    };
  }, [state.purchaseOrders]);

  // Filtered POs
  const filteredOrders = useMemo(() => {
    const list = state.purchaseOrders || [];
    return list.filter((po) => {
      if (activeTab !== 'all' && po.status !== activeTab) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesId = po.id.toLowerCase().includes(q);
        const matchesSupplier = po.supplierName.toLowerCase().includes(q);
        const matchesNotes = po.notes ? po.notes.toLowerCase().includes(q) : false;
        if (!matchesId && !matchesSupplier && !matchesNotes) return false;
      }

      return true;
    });
  }, [state.purchaseOrders, activeTab, searchQuery]);

  // Open Receiving Modal
  const handleOpenReceive = (po: PurchaseOrder) => {
    setReceivingPo(po);
    const initialInputs: Record<string, string> = {};
    po.items.forEach((item) => {
      // Default to receiving remaining quantity
      const remaining = Math.max(0, item.orderedQuantity - item.receivedQuantity);
      initialInputs[item.id] = String(remaining);
    });
    setReceivedInputs(initialInputs);
  };

  // Submit Receiving (Goods receipt)
  const handleSubmitReceiving = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPo) return;

    const itemsToUpdate = (receivingPo.items || []).map((item) => {
      const addedQty = parseInt(receivedInputs[item.id] || '0', 10);
      const newTotalReceived = Math.min(
        item.orderedQuantity,
        item.receivedQuantity + (isNaN(addedQty) ? 0 : addedQty)
      );
      return {
        itemId: item.id,
        receivedQty: newTotalReceived,
      };
    });

    const res = receivePurchaseOrder(
      receivingPo.id,
      state.staff[0].id,
      itemsToUpdate
    );

    if (res.success) {
      addToast({
        title: 'رسید انبار با موفقیت ثبت شد',
        description: `کالاهای سفارش ${receivingPo.id} دریافت و موجودی انبار بلافاصله شارژ گردید.`,
        type: 'success',
      });
      setReceivingPo(null);
    } else {
      addToast({
        title: 'خطا در ثبت رسید انبار',
        description: res.error || 'خطایی رخ داد.',
        type: 'error',
      });
    }
  };

  // Submit Cancel PO
  const handleSubmitCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingPo) return;

    const res = cancelPurchaseOrder(
      cancellingPo.id,
      state.staff[0].id,
      cancelReason
    );

    if (res.success) {
      addToast({
        title: 'سفارش خرید لغو شد',
        description: `وضعیت سفارش ${cancellingPo.id} به لغو شده تغییر یافت.`,
        type: 'warning',
      });
      setCancellingPo(null);
    } else {
      addToast({
        title: 'خطا در لغو',
        description: res.error || 'خطایی رخ داد.',
        type: 'error',
      });
    }
  };

  // Add Item to Create Form
  const handleAddItem = () => {
    const defaultVariant = state.variants[poItems.length % state.variants.length];
    setPoItems((prev) => [
      ...prev,
      {
        id: `ITEM-${prev.length + 1}`,
        itemType: 'variant_sku',
        itemRefId: defaultVariant.sku,
        nameFa: `تیشرت خام ${defaultVariant.sku}`,
        orderedQuantity: 50,
        unitCostTomans: 280000,
      },
    ]);
  };

  // Remove Item from Create Form
  const handleRemoveItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Create PO
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = state.suppliers.find((s) => s.id === selectedSupplierId);
    if (!sup) {
      addToast({ title: 'تامین‌کننده نامعتبر', description: 'لطفاً یک تامین‌کننده انتخاب کنید.', type: 'error' });
      return;
    }

    if (poItems.length === 0) {
      addToast({ title: 'اقلام سفارش خالی است', description: 'حداقل یک قلم کالا به سفارش اضافه کنید.', type: 'error' });
      return;
    }

    const items: PurchaseOrderLineItem[] = poItems.map((item, idx) => ({
      id: `POI-${Date.now()}-${idx + 1}`,
      itemType: item.itemType,
      itemRefId: item.itemRefId,
      nameFa: item.nameFa,
      orderedQuantity: item.orderedQuantity,
      receivedQuantity: 0,
      unitCostTomans: item.unitCostTomans,
      totalCostTomans: item.orderedQuantity * item.unitCostTomans,
    }));

    const totalCost = items.reduce((acc, it) => acc + it.totalCostTomans, 0);

    const res = createPurchaseOrder({
      supplierId: sup.id,
      supplierName: sup.name,
      supplierCategory: sup.category,
      status: 'ordered',
      expectedDeliveryDate: expectedDate,
      items,
      totalCostTomans: totalCost,
      currency: 'TMN',
      notes,
      createdById: state.staff[0].id,
      createdByName: state.staff[0].fullName,
    });

    if (res.success) {
      addToast({
        title: 'سفارش خرید صادر شد',
        description: `سفارش خرید ${res.data?.id} با موفقیت به تامین‌کننده ابلاغ گردید.`,
        type: 'success',
      });
      setIsCreateModalOpen(false);
    } else {
      addToast({
        title: 'خطا در ثبت سفارش خرید',
        description: res.error || 'خطایی رخ داد.',
        type: 'error',
      });
    }
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft':
        return <Badge label="پیش‌نویس" variant="neutral" size="sm" />;
      case 'ordered':
        return <Badge label="سفارش داده شده" variant="warning" size="sm" />;
      case 'partially_received':
        return <Badge label="دریافت بخشی" variant="info" size="sm" />;
      case 'received':
        return <Badge label="دریافت کامل" variant="success" size="sm" />;
      case 'cancelled':
        return <Badge label="لغو شده" variant="danger" size="sm" />;
      default:
        return <Badge label={status} variant="neutral" size="sm" />;
    }
  };

  const columns: ColumnDef<PurchaseOrder>[] = [
    {
      key: 'id',
      header: 'شماره سفارش (PO)',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-[#eed29d]">{row.id}</span>
          <div className="text-[10px] text-stone-500 font-fanum mt-0.5">
            {formatPersianDate(row.createdAt)}
          </div>
        </div>
      ),
    },
    {
      key: 'supplier',
      header: 'تامین‌کننده و زمینه',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs">{row.supplierName}</div>
          <div className="text-[11px] text-stone-400 mt-0.5">{row.supplierCategory}</div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'اقلام سفارش داده شده',
      render: (row) => {
        const totalOrdered = row.items.reduce((acc, it) => acc + it.orderedQuantity, 0);
        const totalReceived = row.items.reduce((acc, it) => acc + it.receivedQuantity, 0);

        return (
          <div className="text-xs">
            <span className="text-white font-medium">
              {toFaDigits(row.items.length)} ردیف کالا ({toFaDigits(totalOrdered)} عدد)
            </span>
            <div className="text-[10px] font-fanum mt-0.5">
              <span className={totalReceived === totalOrdered ? 'text-emerald-400' : 'text-amber-400'}>
                دریافت‌شده: {toFaDigits(totalReceived)} عدد
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'cost',
      header: 'مبلغ کل سفارش',
      align: 'center',
      render: (row) => (
        <span className="font-fanum text-xs font-bold text-white">
          {formatPriceTomans(row.totalCostTomans)}
        </span>
      ),
    },
    {
      key: 'delivery',
      header: 'موعد تحویل',
      align: 'center',
      render: (row) => (
        <span className="font-fanum text-xs text-stone-300">
          {row.expectedDeliveryDate ? formatPersianDate(row.expectedDeliveryDate) : 'نامشخص'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      align: 'center',
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'actions',
      header: 'عملیات انبارداری',
      align: 'left',
      render: (row) => (
        <div className="flex items-center gap-2 justify-end">
          {row.status !== 'received' && row.status !== 'cancelled' && (
            <Button
              variant="brass"
              size="sm"
              onClick={() => handleOpenReceive(row)}
              className="flex items-center gap-1.5 text-xs"
            >
              <ArrowDownLeft size={14} />
              رسید انبار
            </Button>
          )}

          {row.status !== 'received' && row.status !== 'cancelled' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCancellingPo(row)}
              title="لغو سفارش خرید"
              className="text-stone-500 hover:text-rose-400"
            >
              <XCircle size={15} />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <AdminPageHeader
        title="تأمین و خرید"
        description="سفارش‌های خرید مواد اولیه، پارچه‌های خام و ملزومات چاپ از تأمین‌کنندگان رسمی کارگاه."
        actions={
          procurementTab === 'purchase_orders' ? (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => navigate('/admin/catalog/inventory')}
                className="flex items-center gap-2"
              >
                <Box size={16} />
                موجودی انبار
              </Button>
              <Button
                variant="brass"
                size="md"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                صدور سفارش خرید جدید
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Workspace Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-px overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setProcurementTab('purchase_orders')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            procurementTab === 'purchase_orders'
              ? 'border-[#ba8d3d] text-[#eed29d] bg-white/[0.03] rounded-t-lg'
              : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-700'
          }`}
        >
          <FileText size={16} className={procurementTab === 'purchase_orders' ? 'text-[#ba8d3d]' : 'text-stone-500'} />
          <span>سفارش‌های خرید (PO)</span>
        </button>
        <button
          type="button"
          onClick={() => setProcurementTab('suppliers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            procurementTab === 'suppliers'
              ? 'border-[#ba8d3d] text-[#eed29d] bg-white/[0.03] rounded-t-lg'
              : 'border-transparent text-stone-400 hover:text-stone-200 hover:border-stone-700'
          }`}
        >
          <Truck size={16} className={procurementTab === 'suppliers' ? 'text-[#ba8d3d]' : 'text-stone-500'} />
          <span>تأمین‌کنندگان کارگاه</span>
        </button>
      </div>

      {procurementTab === 'suppliers' ? (
        <SuppliersPage />
      ) : (
        <>
          {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#141211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400 block mb-1">کل سفارشات خرید</span>
          <span className="text-2xl font-bold font-fanum text-white block">
            {toFaDigits(stats.totalCount)}
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">پرونده‌های رسمی بافندگی</span>
        </div>

        <div className="p-4 bg-[#141211] border border-amber-500/20 rounded-2xl">
          <span className="text-xs text-amber-300 block mb-1">سفارشات در انتظار تحویل</span>
          <span className="text-2xl font-bold font-fanum text-amber-400 block">
            {toFaDigits(stats.activeCount)}
          </span>
          <span className="text-[10px] text-amber-500/80 mt-1 block">در مسیر یا تحویل ناقص</span>
        </div>

        <div className="p-4 bg-[#141211] border border-emerald-500/20 rounded-2xl">
          <span className="text-xs text-emerald-300 block mb-1">تحویل کامل و تسویه‌شده</span>
          <span className="text-2xl font-bold font-fanum text-emerald-400 block">
            {toFaDigits(stats.completedCount)}
          </span>
          <span className="text-[10px] text-emerald-500/80 mt-1 block">رسیدهای نهایی انبار</span>
        </div>

        <div className="p-4 bg-[#141211] border border-[#ba8d3d]/30 rounded-2xl">
          <span className="text-xs text-[#eed29d] block mb-1">کل بهای سفارشات تامین</span>
          <span className="text-xl font-bold font-fanum text-white block truncate">
            {formatPriceTomans(stats.totalExpenditure)}
          </span>
          <span className="text-[10px] text-stone-400 mt-1 block">سرمایه‌گذاری در مواد خام</span>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="border-b border-white/10 flex gap-2">
        {[
          { key: 'all', label: 'همه سفارشات' },
          { key: 'ordered', label: 'سفارش داده شده (در انتظار)' },
          { key: 'partially_received', label: 'دریافت بخشی' },
          { key: 'received', label: 'تحویل کامل' },
          { key: 'cancelled', label: 'لغو شده' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 px-4 text-xs font-bold transition-colors border-b-2 cursor-pointer ${
              activeTab === tab.key
                ? 'text-[#eed29d] border-[#ba8d3d]'
                : 'text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-[#141211] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو در شماره سفارش (PO)، نام کارخانه تامین‌کننده، یا یادداشت..."
            className="w-full bg-[#181614] border border-white/10 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-stone-500 focus:outline-hidden focus:border-[#ba8d3d]"
          />
        </div>
        {searchQuery && (
          <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
            پاکسازی
          </Button>
        )}
      </div>

      {/* Orders Table */}
      <div className="bg-[#141211] border border-white/10 rounded-2xl overflow-hidden">
        <Table
          data={filteredOrders}
          columns={columns}
          keyExtractor={(po) => po.id}
          emptyMessage="هیچ سفارش خریدی منطبق با فیلترهای جاری یافت نشد."
        />
      </div>

      {/* RECEIVING (GOODS RECEIPT) MODAL */}
      {receivingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#181614] border border-white/10 rounded-2xl p-6 shadow-2xl text-right font-sans my-8">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ArrowDownLeft size={18} className="text-emerald-400" />
                  ثبت رسید انبار برای سفارش {receivingPo.id}
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  تامین‌کننده: {receivingPo.supplierName} • اقلام را شمارش و تعداد دریافتی را وارد فرمایید.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReceivingPo(null)}
              >
                بستن
              </Button>
            </div>

            <form onSubmit={handleSubmitReceiving} className="space-y-4">
              <div className="space-y-3">
                {(receivingPo.items || []).map((item) => {
                  const remaining = Math.max(0, item.orderedQuantity - item.receivedQuantity);
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 bg-stone-900/60 border border-white/10 rounded-xl flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-white">{item.nameFa}</div>
                        <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                          کد مرجع: {item.itemRefId}
                        </div>
                        <div className="text-[11px] font-fanum text-stone-400 mt-1">
                          تعداد سفارش: <strong className="text-white">{toFaDigits(item.orderedQuantity)}</strong> | قبلاً دریافت‌شده: <strong className="text-emerald-400">{toFaDigits(item.receivedQuantity)}</strong> | باقی‌مانده: <strong className="text-amber-400">{toFaDigits(remaining)}</strong>
                        </div>
                      </div>

                      <div className="w-36">
                        <FormField label="تعداد ورودی این بار">
                          <Input
                            type="number"
                            min="0"
                            max={String(remaining)}
                            value={receivedInputs[item.id] || ''}
                            onChange={(e) =>
                              setReceivedInputs({
                                ...receivedInputs,
                                [item.id]: e.target.value,
                              })
                            }
                            className="font-fanum text-center font-bold"
                          />
                        </FormField>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                <strong>ناوردایی به‌روزرسانی:</strong> با ثبت رسید، موجودی فیزیکی تنوع‌های مربوطه بلافاصله افزایش یافته و اسناد گردش انبار با ذکر شماره سفارش ({receivingPo.id}) ثبت می‌شوند.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setReceivingPo(null)}
                >
                  انصراف
                </Button>
                <Button type="submit" variant="brass" size="md">
                  تایید رسید انبار و افزایش موجودی فیزیکی
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PO MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#181614] border border-white/10 rounded-2xl p-6 shadow-2xl text-right font-sans my-8">
            <h3 className="text-sm font-bold text-white mb-1">
              صدور سفارش خرید جدید به کارخانه بافندگی
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              انتخاب تامین‌کننده، تعیین اقلام پوشاک خام یا مواد اولیه و ثبت در سامانه
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="انتخاب تامین‌کننده" required>
                  <Select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    options={state.suppliers.map((s) => ({
                      value: s.id,
                      label: `${s.name} (${s.category})`,
                    }))}
                  />
                </FormField>

                <FormField label="موعد تحویل مورد انتظار" required>
                  <Input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </FormField>
              </div>

              {/* Line items list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>اقلام سفارش خرید ({toFaDigits(poItems.length)} قلم)</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAddItem}
                    className="text-[#eed29d] hover:text-white"
                  >
                    + افزودن ردیف کالا
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {poItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 bg-stone-900 border border-white/10 rounded-xl grid grid-cols-12 gap-2 items-center text-xs"
                    >
                      <div className="col-span-5">
                        <Select
                          value={item.itemRefId}
                          onChange={(e) => {
                            const val = e.target.value;
                            const v = state.variants.find((v) => v.sku === val);
                            setPoItems((prev) =>
                              prev.map((it, i) =>
                                i === idx
                                  ? {
                                      ...it,
                                      itemRefId: val,
                                      nameFa: v ? `تیشرت خام ${v.colorName} سایز ${v.size}` : val,
                                    }
                                  : it
                              )
                            );
                          }}
                          options={state.variants.map((v) => ({
                            value: v.sku,
                            label: `${v.sku} (${v.colorName} ${v.size})`,
                          }))}
                        />
                      </div>

                      <div className="col-span-3">
                        <Input
                          type="number"
                          min="1"
                          placeholder="تعداد"
                          value={String(item.orderedQuantity)}
                          onChange={(e) => {
                            const q = parseInt(e.target.value, 10) || 1;
                            setPoItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, orderedQuantity: q } : it))
                            );
                          }}
                        />
                      </div>

                      <div className="col-span-3">
                        <Input
                          type="number"
                          placeholder="قیمت واحد"
                          value={String(item.unitCostTomans)}
                          onChange={(e) => {
                            const p = parseInt(e.target.value, 10) || 0;
                            setPoItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, unitCostTomans: p } : it))
                            );
                          }}
                        />
                      </div>

                      <div className="col-span-1 flex justify-center">
                        {poItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-stone-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <FormField label="توضیحات و دستورالعمل حمل بار">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثلاً: هماهنگی جهت تحویل بار با باربری تیپاکس روزهای سه‌شنبه"
                />
              </FormField>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div className="text-xs">
                  <span className="text-stone-400">مجموع ارزش سفارش: </span>
                  <span className="font-fanum text-white font-bold text-sm">
                    {formatPriceTomans(
                      poItems.reduce((acc, it) => acc + it.orderedQuantity * it.unitCostTomans, 0)
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => setIsCreateModalOpen(false)}
                  >
                    انصراف
                  </Button>
                  <Button type="submit" variant="brass" size="md">
                    ثبت و صدور سفارش خرید
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancellingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#181614] border border-white/10 rounded-2xl p-6 shadow-2xl text-right font-sans">
            <h3 className="text-sm font-bold text-white mb-1">
              لغو سفارش خرید: {cancellingPo.id}
            </h3>
            <p className="text-xs text-stone-400 mb-4">
              تامین‌کننده: {cancellingPo.supplierName} • علت لغو را ثبت فرمایید.
            </p>

            <form onSubmit={handleSubmitCancel} className="space-y-4">
              <FormField label="دلیل لغو سفارش خرید" required>
                <Input
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </FormField>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setCancellingPo(null)}
                >
                  انصراف
                </Button>
                <Button type="submit" variant="danger" size="md">
                  تایید لغو سفارش
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
