import React, { useState, useMemo } from 'react';
import {
  Zap,
  AlertTriangle,
  FileCheck,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Filter,
  Search,
  Lock,
  ExternalLink,
  RotateCcw,
  Clock,
  UserCheck,
  Shield,
  Layers,
  CreditCard,
  Printer,
  ChevronLeft,
  HelpCircle,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Badge, Dialog } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router';
import { toFaDigits } from '../../utils/formatters';
import { ActionQueueItem, ActionSeverity, ActionModule, StaffRole } from '../../domain/types';

export const ActionCenterPage: React.FC = () => {
  const { navigate } = useAdminRouter();
  const {
    state,
    getActionQueue,
    approveCustomDesign,
    rejectCustomDesign,
    updateVariantStock,
    completeStaffTask,
    updateOrderStatus,
    resetToFixtures,
  } = useAdminRepository();

  // Selected filters
  const [selectedModule, setSelectedModule] = useState<ActionModule | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<ActionSeverity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Role perspective simulation (to test & demonstrate RBAC and no-permission states)
  const [activeRolePerspective, setActiveRolePerspective] = useState<StaffRole | 'all'>('all');

  // Modals for resolving actions
  const [activeDesignModal, setActiveDesignModal] = useState<ActionQueueItem | null>(null);
  const [activeStockModal, setActiveStockModal] = useState<ActionQueueItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(20);
  const [restockReason, setRestockReason] = useState<string>('شارژ دوره‌ای کارگاه از تامین‌کننده');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const actionQueue = useMemo(() => getActionQueue(), [getActionQueue]);

  // Filtered queue items
  const filteredActions = useMemo(() => {
    return actionQueue.filter((item) => {
      if (selectedModule !== 'all' && item.module !== selectedModule) return false;
      if (selectedSeverity !== 'all' && item.severity !== selectedSeverity) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchDesc = item.description.toLowerCase().includes(q);
        const matchEntity = item.linkedEntityId.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchEntity) return false;
      }
      return true;
    });
  }, [actionQueue, selectedModule, selectedSeverity, searchQuery]);

  // Counts for summary pills
  const criticalCount = useMemo(() => actionQueue.filter((i) => i.severity === 'critical').length, [actionQueue]);
  const highCount = useMemo(() => actionQueue.filter((i) => i.severity === 'high').length, [actionQueue]);
  const mediumCount = useMemo(() => actionQueue.filter((i) => i.severity === 'medium').length, [actionQueue]);

  // Check if active role perspective is allowed to execute this action
  const isAllowedToExecute = (item: ActionQueueItem): boolean => {
    if (activeRolePerspective === 'all') return true; // Super admin perspective
    if (activeRolePerspective === 'super_admin') return true;
    return item.requiredRoleKey === activeRolePerspective || item.requiredRoleKey === 'all';
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Execution Handlers
  const handleApproveDesign = (designId: string) => {
    const currentStaff = state.staff[0];
    approveCustomDesign(designId, currentStaff.id, 'تایید فایل چاپ از مرکز اقدام فوری');
    setActiveDesignModal(null);
    showToast(`فایل طراحی ${designId} با موفقیت تایید شد و به صف چاپ منتقل گردید.`);
  };

  const handleRejectDesign = (designId: string) => {
    if (!rejectReason.trim()) {
      alert('لطفاً دلیل عدم تایید را وارد کنید.');
      return;
    }
    const currentStaff = state.staff[0];
    rejectCustomDesign(designId, currentStaff.id, rejectReason);
    setActiveDesignModal(null);
    setRejectReason('');
    showToast(`طرح ${designId} به علت «${rejectReason}» رد شد.`);
  };

  const handleConfirmRestock = () => {
    if (!activeStockModal) return;
    const v = state.variants.find((vr) => vr.sku === activeStockModal.linkedEntityId);
    if (!v) return;

    const currentStaff = state.staff[0];
    const newOnHand = v.onHandStock + Number(restockQty);
    updateVariantStock(v.sku, newOnHand, currentStaff.id, restockReason);
    setActiveStockModal(null);
    showToast(`تنوع ${v.sku} با موفقیت شارژ شد. موجودی جدید: ${toFaDigits(newOnHand)} عدد.`);
  };

  const handleAdvanceOrder = (orderId: string) => {
    const currentStaff = state.staff[0];
    updateOrderStatus(orderId, 'in_production', currentStaff.id, 'انتقال فاکتور پرداخت‌شده به خط آماده‌سازی چاپ');
    showToast(`سفارش ${orderId} به خط چاپ DTG ارسال شد.`);
  };

  const handleCompleteTask = (taskId: string) => {
    const currentStaff = state.staff[0];
    completeStaffTask(taskId, currentStaff.id);
    showToast(`وظیفه کارگاهی ${taskId} تکمیل و از صف خارج گردید.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-50 bg-emerald-900 border border-emerald-500 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in text-xs font-medium">
          <CheckCircle2 size={18} className="text-emerald-300 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <AdminPageHeader
        title="مرکز اقدام فوری و مدیریت هشدارهای عملیاتی"
        description="کارتابل متمرکز فوریت‌های کارگاه؛ پایش عدم تعادل‌های انبار، بازبینی فایل‌های چاپ سفارشی و رفع موانع سفارشات"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/overview/dashboard')}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft size={14} />
              <span>بازگشت به داشبورد</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                resetToFixtures();
                showToast('داده‌های دمو به وضعیت اولیه بازنشانی شد.');
              }}
              className="flex items-center gap-1.5 text-stone-300"
            >
              <RotateCcw size={14} />
              <span>بازنشانی داده‌ها</span>
            </Button>
          </div>
        }
      />

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400 font-sans">کل اقدامات معوق</span>
            <Zap size={16} className="text-[#eed29d]" />
          </div>
          <div className="text-2xl font-black text-white mt-2 font-fanum">
            {toFaDigits(actionQueue.length)}
          </div>
          <span className="text-[10px] text-stone-500 mt-0.5">در کل بخش‌های کارگاه</span>
        </div>

        <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-300 font-sans">اولویت بحرانی</span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          </div>
          <div className="text-2xl font-black text-rose-300 mt-2 font-fanum">
            {toFaDigits(criticalCount)}
          </div>
          <span className="text-[10px] text-rose-400/80 mt-0.5">توقف خط یا تاخیر تحویل</span>
        </div>

        <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-sans">اولویت بالا</span>
            <AlertTriangle size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300 mt-2 font-fanum">
            {toFaDigits(highCount)}
          </div>
          <span className="text-[10px] text-amber-400/80 mt-0.5">رسیدگی پیش از پایان شیفت</span>
        </div>

        <div className="p-4 bg-blue-950/20 border border-blue-500/30 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blue-300 font-sans">اولویت متوسط</span>
            <Clock size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-300 mt-2 font-fanum">
            {toFaDigits(mediumCount)}
          </div>
          <span className="text-[10px] text-blue-400/80 mt-0.5">انتقال سفارشات و پیگیری</span>
        </div>
      </div>

      {/* Interactive Control & Filter Toolbar */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Module Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            <span className="text-xs text-stone-400 ml-2 shrink-0">ماژول:</span>
            {[
              { id: 'all', label: 'همه بخش‌ها' },
              { id: 'custom_studio', label: 'آتلیه چاپ سفارشی' },
              { id: 'inventory', label: 'انبار و کالاها' },
              { id: 'sales', label: 'سفارش‌ها و فروش' },
              { id: 'production', label: 'خط تولید DTG' },
              { id: 'payments', label: 'تراکنش‌های درگاه' },
              { id: 'tasks', label: 'وظایف کارگاه' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedModule(tab.id as ActionModule | 'all')}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer shrink-0 ${
                  selectedModule === tab.id
                    ? 'bg-[#ba8d3d] text-stone-950 font-bold'
                    : 'bg-white/5 text-stone-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Role Perspective Simulator */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10 shrink-0">
            <Shield size={14} className="text-[#eed29d]" />
            <span className="text-xs text-stone-300 font-medium">نقش نمایشی (RBAC):</span>
            <select
              value={activeRolePerspective}
              onChange={(e) => setActiveRolePerspective(e.target.value as StaffRole | 'all')}
              className="bg-transparent text-xs text-[#eed29d] font-bold outline-none cursor-pointer"
            >
              <option value="all" className="bg-stone-900 text-white">مدیر ارشد (دسترسی کامل)</option>
              <option value="designer_reviewer" className="bg-stone-900 text-white">طراح و ناظر آتلیه</option>
              <option value="production_operator" className="bg-stone-900 text-white">اپراتور پرینتر DTG</option>
              <option value="support_finance" className="bg-stone-900 text-white">پشتیبانی و مالی</option>
            </select>
          </div>
        </div>

        {/* Search & Severity Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در عنوان، شرح یا کد رهگیری (DSG-, SKU-, ORD-)..."
              className="w-full pr-9 pl-4 py-1.5 text-xs bg-black/40 border border-white/10 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-[#ba8d3d]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">سطح فوریت:</span>
            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/10">
              {(['all', 'critical', 'high', 'medium'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                    selectedSeverity === sev
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {sev === 'all' ? 'همه' : sev === 'critical' ? 'بحرانی' : sev === 'high' ? 'بالا' : 'متوسط'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Items List / Empty States */}
      {actionQueue.length === 0 ? (
        /* Helpful Empty State: Fully Cleared Queue */
        <div className="p-10 bg-[#131211] border border-white/10 rounded-2xl text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">کارتابل اقدامات کاملاً تصفیه شد!</h3>
            <p className="text-xs text-stone-400 max-w-md mx-auto mt-1 leading-relaxed">
              تمامی فایل‌های چاپ تایید شدند، کسری انبار با موفقیت شارژ گردید و هیچ سفارش یا وظیفه معوقی در سیستم باقی نمانده است.
            </p>
          </div>
          <Button
            variant="brass"
            size="sm"
            onClick={() => {
              resetToFixtures();
              showToast('داده‌ها بازنشانی شد.');
            }}
          >
            تولید مجدد سناریوهای تستی دمو
          </Button>
        </div>
      ) : filteredActions.length === 0 ? (
        /* Helpful Empty State: Filter mismatch */
        <div className="p-8 bg-[#131211] border border-white/10 rounded-2xl text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-white/5 text-stone-400 flex items-center justify-center mx-auto">
            <Filter size={20} />
          </div>
          <h3 className="text-sm font-bold text-white">هیچ موردی با فیلترهای انتخابی یافت نشد</h3>
          <p className="text-xs text-stone-400">
            برای مشاهده سایر اقدامات، فیلتر ماژول، فوریت یا عبارت جستجو را تغییر دهید.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedModule('all');
              setSelectedSeverity('all');
              setSearchQuery('');
            }}
          >
            پاک کردن فیلترها
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActions.map((item) => {
            const isCritical = item.severity === 'critical';
            const isHigh = item.severity === 'high';
            const allowed = isAllowedToExecute(item);

            return (
              <div
                key={item.id}
                className={`p-4 md:p-5 rounded-2xl border transition-all ${
                  isCritical
                    ? 'bg-rose-950/15 border-rose-500/30 hover:border-rose-500/50'
                    : isHigh
                    ? 'bg-amber-950/10 border-amber-500/25 hover:border-amber-500/40'
                    : 'bg-[#131211] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Metadata & Description */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Severity Pill */}
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md font-fanum flex items-center gap-1 ${
                          isCritical
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}
                      >
                        {isCritical && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
                        {isCritical ? 'بحرانی' : isHigh ? 'اولویت بالا' : 'اولویت متوسط'}
                      </span>

                      {/* Module Badge */}
                      <span className="text-[10px] bg-white/5 text-stone-300 border border-white/10 px-2 py-0.5 rounded">
                        {item.module === 'custom_studio'
                          ? 'آتلیه چاپ سفارشی'
                          : item.module === 'inventory'
                          ? 'انبار و موجودی'
                          : item.module === 'production'
                          ? 'خط چاپ DTG'
                          : item.module === 'sales'
                          ? 'سفارش و فروش'
                          : item.module === 'payments'
                          ? 'درگاه شاپرک'
                          : 'وظایف کارگاه'}
                      </span>

                      {/* Age */}
                      <span className="text-[11px] text-stone-400 flex items-center gap-1 font-fanum">
                        <Clock size={12} />
                        {item.ageText}
                      </span>

                      {/* Linked Entity */}
                      <span className="text-[11px] text-stone-400 font-mono bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                        شناسه: {item.linkedEntityId}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-stone-300 leading-relaxed max-w-3xl">
                      {item.description}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-[11px] text-stone-400">
                      <UserCheck size={13} className="text-[#eed29d]" />
                      <span>مسئول پیگیری:</span>
                      <span className="text-stone-200 font-medium">{item.assignedRole}</span>
                    </div>
                  </div>

                  {/* Right Column: Execution Buttons & No-Permission Indicator */}
                  <div className="flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end gap-2 shrink-0">
                    {!allowed ? (
                      /* Helpful No-Permission State */
                      <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-500/30 px-3 py-2 rounded-xl text-xs text-rose-300">
                        <Lock size={14} className="shrink-0" />
                        <span>نیازمند دسترسی «{item.assignedRole}»</span>
                      </div>
                    ) : item.canDirectResolve ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button
                          variant={isCritical ? 'brass' : 'primary'}
                          size="sm"
                          className="w-full sm:w-auto font-bold text-xs"
                          onClick={() => {
                            if (item.directActionType === 'approve_design') {
                              setActiveDesignModal(item);
                            } else if (item.directActionType === 'restock_variant') {
                              setActiveStockModal(item);
                            } else if (item.directActionType === 'advance_order') {
                              handleAdvanceOrder(item.linkedEntityId);
                            } else if (item.directActionType === 'complete_task') {
                              handleCompleteTask(item.linkedEntityId);
                            }
                          }}
                        >
                          {item.primaryActionLabel}
                        </Button>

                        {item.secondaryActionLabel && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto text-xs"
                            onClick={() => navigate(item.targetRoute)}
                          >
                            {item.secondaryActionLabel}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full sm:w-auto text-xs flex items-center gap-1.5"
                        onClick={() => navigate(item.targetRoute)}
                      >
                        <span>{item.primaryActionLabel}</span>
                        <ExternalLink size={13} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal 1: Custom Design Approval Dialog */}
      {activeDesignModal && (
        <Dialog
          isOpen={true}
          onClose={() => setActiveDesignModal(null)}
          title={`داوری و تایید فایل چاپ سفارشی (${activeDesignModal.linkedEntityId})`}
          size="lg"
        >
          {(() => {
            const design = state.customDesigns.find((d) => d.id === activeDesignModal.linkedEntityId);
            if (!design) return <div>طرح یافت نشد.</div>;

            return (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="w-40 h-40 bg-black rounded-xl border border-white/10 flex items-center justify-center p-2 shrink-0">
                    <img
                      src={design.previewUrl}
                      alt={design.title}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>

                  <div className="space-y-2 flex-1 text-xs">
                    <div>
                      <span className="text-stone-400 block">عنوان و سفارش:</span>
                      <span className="font-bold text-white text-sm">{design.title}</span>
                      <span className="text-stone-400 block font-mono">سفارش: {design.orderId}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                      <div>
                        <span className="text-stone-400">ابعاد چاپ:</span>
                        <span className="text-white block font-mono">{design.dimensionsMm}</span>
                      </div>
                      <div>
                        <span className="text-stone-400">وضوح فایل:</span>
                        <span className="text-emerald-400 block font-mono">{design.resolutionDpi} DPI ({design.colorProfile})</span>
                      </div>
                      <div>
                        <span className="text-stone-400">ناحیه چاپ:</span>
                        <span className="text-white block">
                          {design.printZone === 'front_chest' ? 'سینه جلو' : design.printZone === 'back_full' ? 'پشت کامل' : design.printZone}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-400">فرمت فایل:</span>
                        <span className="text-white block font-mono">{design.format}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Optional Rejection Reason */}
                <div className="pt-3 border-t border-white/10">
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    یادداشت رد طرح (در صورت نیاز به ارجاع به مشتری جهت اصلاح):
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="مثال: رزولوشن پایین‌تر از حد مجاز است یا تصویر پیکسلی می‌باشد"
                    className="w-full px-3 py-1.5 text-xs bg-black/40 border border-white/10 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveDesignModal(null)}
                  >
                    انصراف
                  </Button>
                  <Button
                    variant="critical"
                    size="sm"
                    onClick={() => handleRejectDesign(design.id)}
                    disabled={!rejectReason.trim()}
                  >
                    رد طرح و ارسال پیام به مشتری
                  </Button>
                  <Button
                    variant="brass"
                    size="sm"
                    onClick={() => handleApproveDesign(design.id)}
                  >
                    تایید نهایی و ارسال به خط چاپ DTG
                  </Button>
                </div>
              </div>
            );
          })()}
        </Dialog>
      )}

      {/* Modal 2: Restock Variant Dialog */}
      {activeStockModal && (
        <Dialog
          isOpen={true}
          onClose={() => setActiveStockModal(null)}
          title={`شارژ اضطراری موجودی انبار (${activeStockModal.linkedEntityId})`}
          size="md"
        >
          {(() => {
            const v = state.variants.find((vr) => vr.sku === activeStockModal.linkedEntityId);
            const product = state.products.find((p) => p.id === v?.productId);
            if (!v) return <div>کد کالا یافت نشد.</div>;

            const freeStock = v.onHandStock - v.reservedStock;

            return (
              <div className="space-y-4 pt-2 text-xs">
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1">
                  <div className="font-bold text-white text-sm">{product?.name || 'کالا'}</div>
                  <div className="text-stone-400">
                    کد تنوع: <span className="font-mono text-[#eed29d]">{v.sku}</span> · رنگ: {v.colorName} · سایز: {v.size}
                  </div>
                  <div className="flex items-center gap-4 pt-2 text-stone-300 font-fanum">
                    <span>موجودی فیزیکی فعلی: <strong>{toFaDigits(v.onHandStock)}</strong></span>
                    <span>رزرو سفارشات: <strong className="text-amber-400">{toFaDigits(v.reservedStock)}</strong></span>
                    <span>موجودی آزاد: <strong className="text-rose-400">{toFaDigits(freeStock)}</strong></span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-stone-200 mb-1">
                    تعداد واحدهای اضافه شونده به انبار فیزیکی:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={restockQty}
                      onChange={(e) => setRestockQty(Number(e.target.value))}
                      className="w-28 px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white font-fanum font-bold focus:outline-none focus:border-[#ba8d3d]"
                    />
                    <div className="flex items-center gap-1">
                      {[10, 20, 50, 100].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setRestockQty(num)}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 text-stone-300 rounded text-[11px] font-fanum cursor-pointer"
                        >
                          +{toFaDigits(num)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-stone-400 block mt-1">
                    موجودی فیزیکی پس از ثبت: {toFaDigits(v.onHandStock + Number(restockQty))} عدد
                  </span>
                </div>

                <div>
                  <label className="block font-semibold text-stone-200 mb-1">
                    شرح سند انبارداری / دلیل شارژ:
                  </label>
                  <input
                    type="text"
                    value={restockReason}
                    onChange={(e) => setRestockReason(e.target.value)}
                    className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-[#ba8d3d]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveStockModal(null)}
                  >
                    انصراف
                  </Button>
                  <Button
                    variant="brass"
                    size="sm"
                    onClick={handleConfirmRestock}
                  >
                    ثبت سند و شارژ انبار
                  </Button>
                </div>
              </div>
            );
          })()}
        </Dialog>
      )}
    </div>
  );
};
