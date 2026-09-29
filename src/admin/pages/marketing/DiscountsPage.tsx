import React, { useState, useMemo } from 'react';
import {
  Tag,
  Percent,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Edit3,
  Trash2,
  Calculator,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Info,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, SearchInput, Badge, FormField, Input, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { DiscountRule } from '../../domain/types';
import { calculateDiscountPreview, validateDiscountConflicts } from '../../domain/marketingCms';
import { toFaDigits } from '../../utils/formatters';

export const DiscountsPage: React.FC = () => {
  const {
    getDiscounts,
    createDiscount,
    updateDiscount,
    toggleDiscountStatus,
    deleteDiscount,
    state,
  } = useAdminRepository();
  const { addToast } = useToast();

  const discounts = getDiscounts();
  const products = state.products || [];

  const [activeTab, setActiveTab] = useState<'list' | 'calculator'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'expired'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'code' | 'automatic'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Edit / Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<DiscountRule>>({
    title: '',
    code: '',
    applyType: 'code',
    discountType: 'percentage',
    discountValue: 15,
    maxDiscountCapTomans: 300000,
    minOrderAmountTomans: 500000,
    eligibleProductIds: [],
    perCustomerLimit: 1,
    globalUsageLimit: 500,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'active',
    stackingPolicy: 'standalone',
    isFirstOrderOnly: false,
    notes: '',
  });

  // Live Calculator State
  const [calcCode, setCalcCode] = useState('SHAHPOSH-FALL');
  const [calcCartTotal, setCalcCartTotal] = useState(1200000);
  const [calcSelectedProductIds, setCalcSelectedProductIds] = useState<string[]>(['sp-101']);

  // Copy code handler
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Filtered discount list
  const filteredDiscounts = useMemo(() => {
    return discounts.filter((d) => {
      const matchSearch =
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        (d.code && d.code.toLowerCase().includes(search.toLowerCase())) ||
        d.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || d.status === statusFilter;
      const matchType = typeFilter === 'all' || d.applyType === typeFilter;
      return matchSearch && matchStatus && matchType;
    });
  }, [discounts, search, statusFilter, typeFilter]);

  // Open modal for new
  const handleOpenCreate = () => {
    setEditingDiscountId(null);
    setFormData({
      title: '',
      code: '',
      applyType: 'code',
      discountType: 'percentage',
      discountValue: 15,
      maxDiscountCapTomans: 300000,
      minOrderAmountTomans: 500000,
      eligibleProductIds: [],
      perCustomerLimit: 1,
      globalUsageLimit: 500,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'active',
      stackingPolicy: 'standalone',
      isFirstOrderOnly: false,
      notes: '',
    });
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (discount: DiscountRule) => {
    setEditingDiscountId(discount.id);
    setFormData({
      ...discount,
      startDate: discount.startDate ? discount.startDate.split('T')[0] : '',
      endDate: discount.endDate ? discount.endDate.split('T')[0] : '',
    });
    setIsModalOpen(true);
  };

  // Conflict validation for modal form
  const modalValidation = useMemo(() => {
    return validateDiscountConflicts(
      {
        ...formData,
        id: editingDiscountId || undefined,
      },
      discounts
    );
  }, [formData, editingDiscountId, discounts]);

  // Save discount
  const handleSaveDiscount = () => {
    if (!formData.title?.trim()) {
      addToast({
        title: 'عنوان تخفیف الزامی است',
        description: 'لطفاً عنوان تخفیف را وارد کنید.',
        type: 'error',
      });
      return;
    }
    if (formData.applyType === 'code' && !formData.code?.trim()) {
      addToast({
        title: 'کد تخفیف الزامی است',
        description: 'برای تخفیف‌های کوپنی، تعیین کد تخفیف الزامی است.',
        type: 'error',
      });
      return;
    }

    if (!modalValidation.isValid) {
      addToast({
        title: 'خطای اعتبارسنجی تخفیف',
        description: modalValidation.errors.join(' · '),
        type: 'error',
      });
      return;
    }

    const payload = {
      title: formData.title.trim(),
      code: formData.applyType === 'code' ? formData.code?.trim().toUpperCase() : undefined,
      applyType: formData.applyType || 'code',
      discountType: formData.discountType || 'percentage',
      discountValue: Number(formData.discountValue) || 0,
      maxDiscountCapTomans: formData.maxDiscountCapTomans ? Number(formData.maxDiscountCapTomans) : undefined,
      minOrderAmountTomans: Number(formData.minOrderAmountTomans) || 0,
      eligibleProductIds: formData.eligibleProductIds || [],
      eligibleCategoryIds: formData.eligibleCategoryIds || [],
      eligibleSkus: [],
      perCustomerLimit: Number(formData.perCustomerLimit) || 1,
      globalUsageLimit: Number(formData.globalUsageLimit) || 0,
      startDate: formData.startDate ? `${formData.startDate}T00:00:00.000Z` : '',
      endDate: formData.endDate ? `${formData.endDate}T23:59:59.000Z` : '',
      status: formData.status || 'active',
      stackingPolicy: formData.stackingPolicy || 'standalone',
      isFirstOrderOnly: Boolean(formData.isFirstOrderOnly),
      notes: formData.notes?.trim() || '',
    };

    if (editingDiscountId) {
      const res = updateDiscount(editingDiscountId, payload, 'سهراب اخوان (مدیر فروش)');
      if (res.success) {
        setIsModalOpen(false);
        addToast({
          title: 'تخفیف به‌روزرسانی شد',
          description: `قوانین تخفیف «${payload.title}» ذخیره گردید.`,
          type: 'success',
        });
      } else {
        addToast({
          title: 'خطای ویرایش تخفیف',
          description: res.error || 'خطا در ویرایش تخفیف',
          type: 'error',
        });
      }
    } else {
      const res = createDiscount(payload, 'سهراب اخوان (مدیر فروش)');
      if (res.success) {
        setIsModalOpen(false);
        addToast({
          title: 'تخفیف ایجاد شد',
          description: `تخفیف جدید «${payload.title}» با موفقیت ثبت شد.`,
          type: 'success',
        });
      } else {
        addToast({
          title: 'خطای ایجاد تخفیف',
          description: res.error || 'خطا در ثبت کد تخفیف',
          type: 'error',
        });
      }
    }
  };

  // Toggle active/disabled
  const handleToggleStatus = (id: string, currentStatus: DiscountRule['status']) => {
    const nextStatus = currentStatus === 'active' ? 'disabled' : 'active';
    toggleDiscountStatus(id, nextStatus, 'سهراب اخوان');
  };

  // Delete discount
  const handleDeleteDiscount = (id: string, title: string) => {
    if (confirm(`آیا از حذف کد تخفیف «${title}» اطمینان دارید؟`)) {
      deleteDiscount(id, 'سهراب اخوان');
    }
  };

  // Live Calculator Calculation
  const selectedDiscountForCalc = useMemo(() => {
    return discounts.find(
      (d) => d.code?.toUpperCase() === calcCode.trim().toUpperCase() || d.id === calcCode.trim()
    );
  }, [discounts, calcCode]);

  const calcResult = useMemo(() => {
    if (!selectedDiscountForCalc) {
      return {
        isEligible: false,
        ineligibleReason: 'کد تخفیفی با این شناسه یافت نشد.',
        discountAmountTomans: 0,
        finalTotalTomans: calcCartTotal,
      };
    }
    return calculateDiscountPreview(
      selectedDiscountForCalc,
      calcCartTotal,
      calcSelectedProductIds
    );
  }, [selectedDiscountForCalc, calcCartTotal, calcSelectedProductIds]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="کدهای تخفیف و پروموشن‌های هوشمند"
        description="تعریف تخفیف‌های کوپنی و خودکار، سقف استفاده، اعتبارسنجی قوانین متضاد و ماشین‌حساب پیش‌نمایش بلادرنگ."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant={activeTab === 'calculator' ? 'brass' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(activeTab === 'calculator' ? 'list' : 'calculator')}
            >
              <Calculator size={13} className="ml-1" />
              {activeTab === 'calculator' ? 'مشاهده جدول تخفیف‌ها' : 'ماشین‌حساب زنده تخفیف'}
            </Button>
            <Button variant="brass" size="sm" onClick={handleOpenCreate}>
              <Plus size={13} className="ml-1" />
              ایجاد کد تخفیف جدید
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">کدهای تخفیف فعال</div>
            <div className="text-xl font-bold text-white font-fanum mt-1">
              {toFaDigits(discounts.filter((d) => d.status === 'active').length)} کد
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Tag size={20} />
          </div>
        </div>

        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">تخفیف‌های خودکار سبد</div>
            <div className="text-xl font-bold text-white font-fanum mt-1">
              {toFaDigits(discounts.filter((d) => d.applyType === 'automatic').length)} کمپین
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Sparkles size={20} />
          </div>
        </div>

        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">تعداد دفعات استفاده کل</div>
            <div className="text-xl font-bold text-[#eed29d] font-fanum mt-1">
              {toFaDigits(discounts.reduce((sum, d) => sum + d.usedCount, 0).toLocaleString())} بار
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#ba8d3d]/10 border border-[#ba8d3d]/20 flex items-center justify-center text-[#eed29d]">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">تخفیف‌های زمان‌بندی‌شده</div>
            <div className="text-xl font-bold text-white font-fanum mt-1">
              {toFaDigits(discounts.filter((d) => d.status === 'scheduled').length)} کمپین
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'calculator' ? (
        /* LIVE DISCOUNT CALCULATOR PREVIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#eed29d] font-bold text-sm">
              <Calculator size={16} />
              <span>تنظیم ورودی‌های ماشین‌حساب</span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed">
              تست واقعی قوانین شرطی، سقف تخفیف، حداقل مبلغ فاکتور و اقلام مجاز پیش از انتشار رسمی در ویترین فروشگاه.
            </p>

            <FormField label="کد تخفیف مورد تست">
              <div className="flex gap-2">
                <select
                  value={calcCode}
                  onChange={(e) => setCalcCode(e.target.value)}
                  className="w-full bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {discounts.map((d) => (
                    <option key={d.id} value={d.code || d.id}>
                      {d.code ? `[${d.code}]` : '(خودکار)'} {d.title}
                    </option>
                  ))}
                </select>
              </div>
            </FormField>

            <FormField label="مبلغ فرضی فاکتور (تومان)">
              <Input
                type="number"
                value={calcCartTotal}
                onChange={(e) => setCalcCartTotal(Number(e.target.value) || 0)}
              />
            </FormField>

            <FormField label="اقلام موجود در سبد تست">
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {products.map((p) => {
                  const isSelected = calcSelectedProductIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 p-2 rounded-lg bg-[#181614] border border-white/5 text-xs text-stone-300 cursor-pointer hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCalcSelectedProductIds([...calcSelectedProductIds, p.id]);
                          } else {
                            setCalcSelectedProductIds(calcSelectedProductIds.filter((id) => id !== p.id));
                          }
                        }}
                        className="rounded accent-[#ba8d3d]"
                      />
                      <span className="truncate">{p.name}</span>
                    </label>
                  );
                })}
              </div>
            </FormField>
          </div>

          <div className="lg:col-span-2 bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-sm font-bold text-white">نتیجه ارزیابی موتور تخفیف</h3>
                <p className="text-xs text-stone-400 mt-1">
                  کد انتخاب‌شده: <span className="text-[#eed29d] font-mono">{calcCode}</span>
                </p>
              </div>
              <Badge variant={calcResult.isEligible ? 'success' : 'danger'}>
                {calcResult.isEligible ? 'تخفیف قابل اعمال است' : 'عدم احراز شرایط'}
              </Badge>
            </div>

            {selectedDiscountForCalc ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#1c1a17] border border-white/5 space-y-2">
                  <div className="text-xs font-bold text-white">{selectedDiscountForCalc.title}</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-stone-400 pt-2 border-t border-white/5 font-fanum">
                    <div>
                      نوع تخفیف:{' '}
                      <span className="text-white">
                        {selectedDiscountForCalc.discountType === 'percentage'
                          ? `${toFaDigits(selectedDiscountForCalc.discountValue)}٪`
                          : `${toFaDigits(selectedDiscountForCalc.discountValue.toLocaleString())} تومان`}
                      </span>
                    </div>
                    <div>
                      سقف تخفیف:{' '}
                      <span className="text-white">
                        {selectedDiscountForCalc.maxDiscountCapTomans
                          ? `${toFaDigits(selectedDiscountForCalc.maxDiscountCapTomans.toLocaleString())} ت`
                          : 'نامحدود'}
                      </span>
                    </div>
                    <div>
                      حداقل فاکتور:{' '}
                      <span className="text-white">
                        {selectedDiscountForCalc.minOrderAmountTomans > 0
                          ? `${toFaDigits(selectedDiscountForCalc.minOrderAmountTomans.toLocaleString())} ت`
                          : 'بدون شرط'}
                      </span>
                    </div>
                    <div>
                      سیاست تجمیع:{' '}
                      <span className="text-white">
                        {selectedDiscountForCalc.stackingPolicy === 'standalone' ? 'منفرد' : 'قابل ترکیب'}
                      </span>
                    </div>
                  </div>
                </div>

                {!calcResult.isEligible && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <ShieldAlert size={16} className="shrink-0 text-rose-400" />
                    <span>دلیل رد تخفیف: {calcResult.ineligibleReason}</span>
                  </div>
                )}

                {/* Calculation breakdown */}
                <div className="p-5 rounded-2xl bg-[#0c0b0a] border border-white/10 space-y-3 font-fanum">
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span>مجموع سبد خرید:</span>
                    <span className="text-white text-sm">
                      {toFaDigits(calcCartTotal.toLocaleString())} تومان
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span>کسر تخفیف محاسبه‌شده:</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      - {toFaDigits(calcResult.discountAmountTomans.toLocaleString())} تومان
                    </span>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm font-bold">
                    <span className="text-white">مبلغ نهایی قابل پرداخت:</span>
                    <span className="text-[#eed29d] text-base">
                      {toFaDigits(calcResult.finalTotalTomans.toLocaleString())} تومان
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-stone-400">کد تخفیف معتبری انتخاب نشده است.</div>
            )}
          </div>
        </div>
      ) : (
        /* DISCOUNTS LIST VIEW */
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#131211] border border-white/10 rounded-2xl p-4">
            <div className="w-full sm:w-72">
              <SearchInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در عنوان، کد یا شناسه..."
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-stone-300"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="active">فعال</option>
                <option value="scheduled">زمان‌بندی‌شده</option>
                <option value="expired">منقضی‌شده</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-stone-300"
              >
                <option value="all">همه انواع</option>
                <option value="code">کد کوپنی</option>
                <option value="automatic">تخفیف خودکار</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-stone-400">
                    <th className="py-3 px-4 font-normal">کد / نوع</th>
                    <th className="py-3 px-4 font-normal">عنوان کمپین و یادداشت</th>
                    <th className="py-3 px-4 font-normal">میزان و سقف تخفیف</th>
                    <th className="py-3 px-4 font-normal">شرایط حداقل و اقلام</th>
                    <th className="py-3 px-4 font-normal">مصرف / ظرفیت</th>
                    <th className="py-3 px-4 font-normal">بازه زمانی</th>
                    <th className="py-3 px-4 font-normal">وضعیت</th>
                    <th className="py-3 px-4 font-normal text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredDiscounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-500">
                        هیچ کد تخفیفی با این فیلترها یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredDiscounts.map((discount) => {
                      const isExpired = discount.endDate && new Date().toISOString() > discount.endDate;
                      return (
                        <tr key={discount.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 font-mono">
                            {discount.code ? (
                              <div className="flex items-center gap-1.5">
                                <span className="bg-[#1c1a17] border border-white/10 px-2 py-0.5 rounded text-white font-bold tracking-wider">
                                  {discount.code}
                                </span>
                                <button
                                  onClick={() => handleCopyCode(discount.code!)}
                                  className="text-stone-400 hover:text-white p-1"
                                  title="کپی کد"
                                >
                                  {copiedCode === discount.code ? (
                                    <Check size={12} className="text-emerald-400" />
                                  ) : (
                                    <Copy size={12} />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <Badge variant="info">خودکار</Badge>
                            )}
                          </td>

                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-bold text-white">{discount.title}</div>
                            {discount.notes && (
                              <div className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                                {discount.notes}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-fanum">
                            <div className="text-white font-bold">
                              {discount.discountType === 'percentage'
                                ? `${toFaDigits(discount.discountValue)}٪`
                                : `${toFaDigits(discount.discountValue.toLocaleString())} تومان`}
                            </div>
                            {discount.maxDiscountCapTomans && (
                              <div className="text-[10px] text-stone-400">
                                سقف: {toFaDigits(discount.maxDiscountCapTomans.toLocaleString())} ت
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-fanum">
                            <div className="text-stone-300">
                              {discount.minOrderAmountTomans > 0
                                ? `حداقل ${toFaDigits(discount.minOrderAmountTomans.toLocaleString())} ت`
                                : 'بدون حداقل'}
                            </div>
                            <div className="text-[10px] text-stone-400">
                              {discount.eligibleProductIds && discount.eligibleProductIds.length > 0
                                ? `${toFaDigits(discount.eligibleProductIds.length)} محصول مجاز`
                                : 'همه محصولات'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-fanum">
                            <div className="text-white">
                              {toFaDigits(discount.usedCount)}{' '}
                              <span className="text-stone-400">
                                / {discount.globalUsageLimit > 0 ? toFaDigits(discount.globalUsageLimit) : 'نامحدود'}
                              </span>
                            </div>
                            <div className="text-[10px] text-stone-400">
                              هر کاربر: {toFaDigits(discount.perCustomerLimit)} بار
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-fanum text-[11px] text-stone-300">
                            <div>از {discount.startDate ? discount.startDate.split('T')[0] : 'آغاز'}</div>
                            <div>تا {discount.endDate ? discount.endDate.split('T')[0] : 'نامحدود'}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                discount.status === 'active'
                                  ? 'success'
                                  : discount.status === 'scheduled'
                                  ? 'info'
                                  : 'neutral'
                              }
                            >
                              {discount.status === 'active'
                                ? 'فعال'
                                : discount.status === 'scheduled'
                                ? 'زمان‌بندی‌شده'
                                : discount.status === 'disabled'
                                ? 'متوقف‌شده'
                                : 'منقضی'}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleToggleStatus(discount.id, discount.status)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/5 text-[11px]"
                                title={discount.status === 'active' ? 'توقف کمپین' : 'فعال‌سازی'}
                              >
                                {discount.status === 'active' ? 'توقف' : 'فعال'}
                              </button>
                              <button
                                onClick={() => handleOpenEdit(discount)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/5"
                                title="ویرایش"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteDiscount(discount.id, discount.title)}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                title="حذف"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131211] border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white">
                {editingDiscountId ? 'ویرایش کد تخفیف' : 'ایجاد کد تخفیف جدید'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white text-xs"
              >
                انصراف
              </button>
            </div>

            {/* Validation Warnings / Errors Banner */}
            {modalValidation.errors.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs space-y-1">
                {modalValidation.errors.map((err, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <ShieldAlert size={14} className="shrink-0 text-rose-400" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}
            {modalValidation.warnings.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-1">
                {modalValidation.warnings.map((warn, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <FormField label="عنوان کمپین یا مناسبت تخفیف">
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="مثال: جشنواره دراپ پاییزه شاه‌پوش"
                  />
                </FormField>
              </div>

              <div>
                <FormField label="نحوه اعمال">
                  <select
                    value={formData.applyType}
                    onChange={(e) => setFormData({ ...formData, applyType: e.target.value as any })}
                    className="w-full bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="code">کد کوپنی دستی (توسط کاربر)</option>
                    <option value="automatic">تخفیف خودکار روی فاکتور</option>
                  </select>
                </FormField>
              </div>

              {formData.applyType === 'code' ? (
                <div>
                  <FormField label="کد تخفیف (انگلیسی و بزرگ)">
                    <Input
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, '') })
                      }
                      placeholder="AUTUMN-DROP"
                      className="font-mono text-center tracking-widest"
                    />
                  </FormField>
                </div>
              ) : (
                <div>
                  <FormField label="یادداشت سیستم">
                    <Input
                      disabled
                      value="بدون نیاز به درج کد توسط خریدار"
                      className="text-stone-500"
                    />
                  </FormField>
                </div>
              )}

              <div>
                <FormField label="نوع کسر مبلغ">
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                    className="w-full bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="percentage">درصدی (٪)</option>
                    <option value="fixed_amount">مبلغ نقدی ثابت (تومان)</option>
                  </select>
                </FormField>
              </div>

              <div>
                <FormField
                  label={formData.discountType === 'percentage' ? 'درصد تخفیف (۱ الی ۱۰۰)' : 'مبلغ تخفیف (تومان)'}
                >
                  <Input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) || 0 })}
                  />
                </FormField>
              </div>

              {formData.discountType === 'percentage' && (
                <div>
                  <FormField label="حداکثر سقف تخفیف (تومان)">
                    <Input
                      type="number"
                      value={formData.maxDiscountCapTomans || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, maxDiscountCapTomans: Number(e.target.value) || undefined })
                      }
                      placeholder="مثال: ۳۰۰۰۰۰ (اختیاری)"
                    />
                  </FormField>
                </div>
              )}

              <div>
                <FormField label="حداقل مبلغ سفارش (تومان)">
                  <Input
                    type="number"
                    value={formData.minOrderAmountTomans}
                    onChange={(e) => setFormData({ ...formData, minOrderAmountTomans: Number(e.target.value) || 0 })}
                    placeholder="۰ = بدون شرط مبلغ"
                  />
                </FormField>
              </div>

              <div>
                <FormField label="سقف استفاده کل در سامانه">
                  <Input
                    type="number"
                    value={formData.globalUsageLimit}
                    onChange={(e) => setFormData({ ...formData, globalUsageLimit: Number(e.target.value) || 0 })}
                    placeholder="۰ = نامحدود"
                  />
                </FormField>
              </div>

              <div>
                <FormField label="سقف استفاده به ازای هر کاربر">
                  <Input
                    type="number"
                    value={formData.perCustomerLimit}
                    onChange={(e) => setFormData({ ...formData, perCustomerLimit: Number(e.target.value) || 1 })}
                  />
                </FormField>
              </div>

              <div>
                <FormField label="تاریخ آغاز کمپین">
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </FormField>
              </div>

              <div>
                <FormField label="تاریخ پایان مهلت استفاده">
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </FormField>
              </div>

              <div>
                <FormField label="سیاست هم‌پوشانی و تجمیع (Stacking)">
                  <select
                    value={formData.stackingPolicy}
                    onChange={(e) => setFormData({ ...formData, stackingPolicy: e.target.value as any })}
                    className="w-full bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="standalone">منفرد (غیرقابل ترکیب با سایر کدها)</option>
                    <option value="stackable_with_promotions">قابل تجمیع با پروموشن‌های خودکار</option>
                  </select>
                </FormField>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <label className="flex items-center gap-2 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFirstOrderOnly}
                    onChange={(e) => setFormData({ ...formData, isFirstOrderOnly: e.target.checked })}
                    className="rounded accent-[#ba8d3d]"
                  />
                  <span>مخصوص خریداران بار اول (سفارش اول)</span>
                </label>
              </div>

              <div className="sm:col-span-2">
                <FormField label="یادداشت داخلی یا متن شرایط استفاده">
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="توضیحات و قیدهای مربوط به این کد تخفیف"
                  />
                </FormField>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                انصراف
              </Button>
              <Button
                variant="brass"
                size="sm"
                onClick={handleSaveDiscount}
                disabled={!modalValidation.isValid}
              >
                {editingDiscountId ? 'ذخیره تغییرات' : 'ایجاد و ثبت کد'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
