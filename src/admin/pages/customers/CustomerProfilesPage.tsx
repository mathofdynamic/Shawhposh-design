import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Heart,
  Sparkles,
  Shield,
  Lock,
  Unlock,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Trash2,
  Edit,
  ExternalLink,
  MessageSquare,
  Headphones,
  Star,
  FileText,
  DollarSign,
  ChevronLeft,
  X,
  CreditCard,
  Send,
  Info,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, MoneyDisplay, Button, Modal, Table, ColumnDef } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router';
import { toFaDigits, maskPhoneNumber, maskEmail } from '../../utils/formatters';

interface CustomerProfilesPageProps {
  customerIdProp?: string;
}

export const CustomerProfilesPage: React.FC<CustomerProfilesPageProps> = ({ customerIdProp }) => {
  const {
    state,
    getCustomerDetails,
    addCustomerNote,
    updateCustomer,
    toggleCustomerStatus,
    requestCustomerDataExport,
    requestCustomerDeletion,
  } = useAdminRepository();
  const { navigate, params } = useAdminRouter();

  // Determine active customer ID from prop, router params, or fallback to first
  const targetId = customerIdProp || params.id || state.customers[0]?.id || '';
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(targetId);

  // Sync if prop changes
  React.useEffect(() => {
    if (customerIdProp && customerIdProp !== selectedCustomerId) {
      setSelectedCustomerId(customerIdProp);
    }
  }, [customerIdProp]);

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'designs' | 'support' | 'notes' | 'cart' | 'browsing'
  >('overview');

  // Contact unmask state (authorized role toggle)
  const [isContactUnmasked, setIsContactUnmasked] = useState(false);

  // Note creation form state
  const [noteText, setNoteText] = useState('');
  const [noteLinkedOrderId, setNoteLinkedOrderId] = useState<string>('');
  const [noteLinkedDesignId, setNoteLinkedDesignId] = useState<string>('');
  const [noteFeedback, setNoteFeedback] = useState<string | null>(null);

  // Edit Customer Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    city: '',
    province: '',
    address: '',
    postalCode: '',
    marketingConsent: true,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState<string | null>(null);

  // Status Change Modal State
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<'active' | 'inactive' | 'deactivated'>('active');
  const [statusReason, setStatusReason] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);

  // Data Export Modal State
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportJson, setExportJson] = useState<string | null>(null);

  // Deletion Request Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  // Demo Action Dialog (for Email & SMS buttons)
  const [demoActionNotice, setDemoActionNotice] = useState<string | null>(null);

  // Load customer detailed dossier
  const dossier = useMemo(() => {
    return getCustomerDetails(selectedCustomerId);
  }, [getCustomerDetails, selectedCustomerId, state.customers, state.orders, state.payments, state.customDesigns]);

  // Initialize edit form when opening modal
  const handleOpenEdit = () => {
    if (!dossier) return;
    setEditForm({
      fullName: dossier.customer.fullName,
      phone: dossier.customer.phone,
      email: dossier.customer.email,
      city: dossier.customer.city,
      province: dossier.customer.province,
      address: dossier.customer.address,
      postalCode: dossier.customer.postalCode,
      marketingConsent: dossier.customer.marketingConsent ?? true,
    });
    setEditError(null);
    setEditSuccess(null);
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    const res = updateCustomer(selectedCustomerId, editForm, 'مدیر سیستم (آتلیه)');
    if (!res.success) {
      setEditError(res.error || 'خطا در ویرایش اطلاعات مشتری');
      return;
    }
    setEditSuccess('اطلاعات هویتی و ارتباطی مشتری با موفقیت ذخیره شد.');
    setTimeout(() => {
      setIsEditOpen(false);
      setEditSuccess(null);
    }, 1000);
  };

  // Handle adding internal note
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    const res = addCustomerNote(
      selectedCustomerId,
      noteText.trim(),
      'مدیر پشتیبانی شاه‌پوش',
      noteLinkedOrderId || undefined,
      noteLinkedDesignId || undefined
    );

    if (res.success) {
      setNoteText('');
      setNoteLinkedOrderId('');
      setNoteLinkedDesignId('');
      setNoteFeedback('یادداشت پرسنلی ثبت گردید و در ردپای ممیزی پرونده ذخیره شد.');
      setTimeout(() => setNoteFeedback(null), 3000);
    } else {
      setNoteFeedback(res.error || 'خطا در ثبت یادداشت');
    }
  };

  // Handle Status Toggle
  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError(null);
    if (!statusReason.trim()) {
      setStatusError('لطفاً دلیل تغییر وضعیت پرونده را به صورت مکتوب درج نمایید.');
      return;
    }
    const res = toggleCustomerStatus(selectedCustomerId, targetStatus, statusReason.trim(), 'مدیر سیستم');
    if (!res.success) {
      setStatusError(res.error || 'خطا در تغییر وضعیت');
      return;
    }
    setIsStatusOpen(false);
    setStatusReason('');
  };

  // Handle Data Export
  const handleExportData = () => {
    const res = requestCustomerDataExport(selectedCustomerId, 'مدیر انطباق و ممیزی');
    if (res.success && res.exportData) {
      setExportJson(JSON.stringify(res.exportData, null, 2));
      setIsExportOpen(true);
    }
  };

  // Handle Deletion Request
  const handleDeleteRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const res = requestCustomerDeletion(
      selectedCustomerId,
      deleteReason.trim() || 'درخواست حذف داده و اعمال حق فراموشی کاربر',
      'مدیر پشتیبانی'
    );
    if (res.success) {
      setDeleteSuccess(true);
      setTimeout(() => {
        setIsDeleteOpen(false);
        setDeleteSuccess(false);
        setDeleteReason('');
      }, 1500);
    }
  };

  if (!dossier) {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          title="پرونده تفصیلی مشتری یافت نشد"
          description="شناسه مورد نظر در پایگاه داده اعضای شاه‌پوش موجود نیست."
        />
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <AlertTriangle size={36} className="text-amber-400 mx-auto" />
          <p className="text-stone-300 text-sm">
            مشتری با شناسه <code className="text-[#eed29d]">{selectedCustomerId}</code> در سامانه ثبت نشده است.
          </p>
          <Button variant="primary" size="sm" onClick={() => navigate('/admin/customers/directory')}>
            بازگشت به فهرست خریداران
          </Button>
        </div>
      </div>
    );
  }

  const { customer, orders, payments, customDesigns, shipments, supportTickets, reviews, staffNotes, auditTrail } =
    dossier;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/customers/directory')}
            className="text-xs text-[#eed29d] hover:underline flex items-center gap-1 mb-1 cursor-pointer"
          >
            <ChevronLeft size={14} className="rotate-180" />
            <span>بازگشت به فهرست خریداران</span>
          </button>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <span>پرونده تفصیلی: {customer.fullName}</span>
            <span className="text-xs font-mono text-[#eed29d] bg-white/5 px-2.5 py-1 rounded-xl border border-white/10">
              {customer.id}
            </span>
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            سوابق مالی، تاریخچه سفارشات، طرح‌های ارسالی آتلیه، تیکت‌های پشتیبانی و یادداشت‌های مجاز پرسنل.
          </p>
        </div>

        {/* Global Profile Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setDemoActionNotice(
                'سامانه ارسال پیامک در محیط دمو غیرفعال است (نیازمند اتصال به پنل کاوه‌نگار یا وب‌سرویس پیامکی شاه‌پوش).'
              )
            }
            className="flex items-center gap-1.5 opacity-80"
          >
            <Phone size={13} />
            <span>ارسال پیامک (دمو)</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              setDemoActionNotice(
                'ارسال پست الکترونیک در محیط دمو غیرفعال است (نیازمند اتصال به سرور SMTP یا سرویس Transactional Email).'
              )
            }
            className="flex items-center gap-1.5 opacity-80"
          >
            <Mail size={13} />
            <span>ارسال ایمیل (دمو)</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={handleOpenEdit} className="flex items-center gap-1.5">
            <Edit size={13} />
            <span>ویرایش مشخصات</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setTargetStatus(customer.status === 'deactivated' ? 'active' : 'deactivated');
              setIsStatusOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <Shield size={13} />
            <span>تغییر وضعیت حساب</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={handleExportData} className="flex items-center gap-1.5">
            <Download size={13} />
            <span>استخراج داده‌ها (GDPR)</span>
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsDeleteOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Trash2 size={13} />
            <span>درخواست حذف حساب</span>
          </Button>
        </div>
      </div>

      {/* Profile Overview Banner */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#ba8d3d] to-[#5a4014] flex items-center justify-center text-stone-950 font-black text-2xl shadow-lg shadow-[#ba8d3d]/20">
              {customer.fullName.slice(0, 1)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">{customer.fullName}</h2>
                <Badge
                  label={
                    customer.tag === 'vip'
                      ? 'عضو طلایی VIP'
                      : customer.tag === 'wholesale'
                      ? 'خریدار عمده‌فروشی'
                      : customer.tag === 'new'
                      ? 'مشتری جدید'
                      : 'مشتری عادی'
                  }
                  variant={customer.tag === 'vip' ? 'warning' : 'default'}
                  size="sm"
                />
                {customer.status === 'deactivated' ? (
                  <Badge label="حساب مسدود / تعلیق‌شده" variant="danger" size="sm" />
                ) : customer.status === 'inactive' ? (
                  <Badge label="غیرفعال" variant="neutral" size="sm" />
                ) : (
                  <Badge label="حساب کاربری فعال" variant="success" size="sm" />
                )}
              </div>
              <div className="text-xs text-stone-400 flex items-center gap-3 font-fanum flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-stone-500" />
                  {customer.province} · {customer.city}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-stone-500" />
                  عضویت: {new Date(customer.createdAt).toLocaleDateString('fa-IR')}
                </span>
                <span>•</span>
                <span>
                  رضایت اطلاع‌رسانی پیامکی:{' '}
                  {customer.marketingConsent ? (
                    <span className="text-emerald-400 font-bold">تایید شده</span>
                  ) : (
                    <span className="text-stone-500">عدم رضایت</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Contact & Privacy Card */}
          <div className="bg-stone-900/80 border border-white/10 rounded-xl p-3 text-xs space-y-2 min-w-[260px]">
            <div className="flex items-center justify-between">
              <span className="text-stone-400 text-[11px] font-bold flex items-center gap-1.5">
                <Lock size={12} className="text-[#ba8d3d]" />
                حفاظت از اطلاعات هویتی
              </span>
              <button
                type="button"
                onClick={() => setIsContactUnmasked(!isContactUnmasked)}
                className="text-[10px] text-[#eed29d] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {isContactUnmasked ? <Lock size={10} /> : <Unlock size={10} />}
                <span>{isContactUnmasked ? 'ماسک کردن' : 'مشاهده بدون ماسک'}</span>
              </button>
            </div>
            <div className="space-y-1 font-mono text-[11px]" dir="ltr">
              <div className="text-stone-200">
                {isContactUnmasked ? customer.phone : maskPhoneNumber(customer.phone)}
              </div>
              <div className="text-stone-400 truncate">
                {isContactUnmasked ? customer.email : maskEmail(customer.email)}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-1">
            <span className="text-[11px] text-stone-400 block">ارزش خالص مادام‌العمر (LTV)</span>
            <MoneyDisplay amount={dossier.netLtvSpendTomans} size="md" />
            <div className="text-[9px] text-[#eed29d] font-fanum pt-0.5">
              فرمول: پرداختی قطعی - مبالغ استرداد
            </div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-1">
            <span className="text-[11px] text-stone-400 block">میانگین ارزش سفارش (AOV)</span>
            <MoneyDisplay amount={dossier.averageOrderValueTomans} size="md" />
            <div className="text-[9px] text-stone-400 font-fanum pt-0.5">
              بر مبنای {toFaDigits(dossier.verifiedPaidOrdersCount)} فاکتور پرداخت‌شده
            </div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-1">
            <span className="text-[11px] text-stone-400 block">کل سفارشات ثبت‌شده</span>
            <div className="text-base font-bold text-white font-fanum">
              {toFaDigits(dossier.totalOrdersCount)} فاکتور
            </div>
            <div className="text-[9px] text-stone-400 font-fanum pt-0.5">
              {dossier.hasCustomOrders ? 'شامل طرح‌های سفارشی آتلیه' : 'محصولات استاندارد کاتالوگ'}
            </div>
          </div>

          <div className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-1">
            <span className="text-[11px] text-stone-400 block">کل مبالغ استرداد وجه</span>
            <MoneyDisplay amount={dossier.processedRefundsTomans} size="md" />
            <div className="text-[9px] text-stone-400 font-fanum pt-0.5">
              {dossier.processedRefundsTomans > 0 ? 'کسر شده از تراز حساب' : 'بدون سابقه استرداد وجه'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'خلاصه و نشانی‌ها', icon: MapPin },
          { id: 'orders', label: 'خط زمانی سفارشات و پرداخت‌ها', icon: ShoppingBag, count: orders.length },
          { id: 'designs', label: 'طرح‌های اختصاصی آتلیه', icon: Sparkles, count: customDesigns.length },
          { id: 'support', label: 'تیکت‌های پشتیبانی و نظرات', icon: Headphones, count: supportTickets.length + reviews.length },
          { id: 'notes', label: 'یادداشت‌های پرسنل و ممیزی', icon: FileText, count: staffNotes.length },
          { id: 'cart', label: 'سبد خرید و علاقه‌مندی‌ها', icon: Heart },
          { id: 'browsing', label: 'ردپای مرور و فعالیت', icon: Eye },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#ba8d3d] text-[#eed29d]'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-[10px] bg-white/10 px-1.5 py-0.2 rounded-md font-fanum">
                  {toFaDigits(tab.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: Overview & Addresses */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Identity & Legal Consent Details */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Shield size={16} className="text-[#ba8d3d]" />
              <span>مشخصات هویتی و موافقت‌نامه‌های حریم خصوصی</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-stone-400">نام و نام‌خانوادگی:</span>
                <span className="text-white font-bold">{customer.fullName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-stone-400">شناسه سیستمی:</span>
                <span className="font-mono text-[#eed29d]">{customer.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-stone-400">شماره تلفن همراه:</span>
                <span className="font-mono text-stone-200" dir="ltr">
                  {isContactUnmasked ? customer.phone : maskPhoneNumber(customer.phone)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-stone-400">پست الکترونیک:</span>
                <span className="font-mono text-stone-200" dir="ltr">
                  {isContactUnmasked ? customer.email : maskEmail(customer.email)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-stone-400">موافقت با پیامک‌های اطلاع‌رسانی:</span>
                <span className="text-emerald-400">
                  {customer.marketingConsent ? 'دارای رضایت صریح (Opt-In)' : 'عدم رضایت (Opt-Out)'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-white/5">
                <span className="text-stone-400">تاریخ اولین ثبت‌نام:</span>
                <span className="font-fanum text-stone-200">
                  {new Date(customer.createdAt).toLocaleDateString('fa-IR')}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-stone-400">آخرین زمان فعالیت آنلاین:</span>
                <span className="font-fanum text-stone-200">
                  {new Date(customer.lastActiveAt).toLocaleString('fa-IR')}
                </span>
              </div>
            </div>
          </div>

          {/* Registered Delivery Addresses */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <MapPin size={16} className="text-[#ba8d3d]" />
              <span>نشانی‌های ثبت‌شده پستی جهت تحویل مرسولات</span>
            </h3>

            {dossier.addresses.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">هیچ نشانی مجزایی ثبت نشده است.</p>
            ) : (
              <div className="space-y-3">
                {dossier.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-2">
                        <span>{addr.title}</span>
                        {addr.isDefault && (
                          <span className="text-[10px] bg-[#ba8d3d]/20 text-[#eed29d] px-2 py-0.5 rounded border border-[#ba8d3d]/30">
                            نشانی پیش‌فرض
                          </span>
                        )}
                      </span>
                      <span className="text-stone-400 font-fanum text-[11px]">{addr.city}</span>
                    </div>
                    <p className="text-stone-300 leading-relaxed">{addr.fullAddress}</p>
                    <div className="flex items-center justify-between text-[11px] text-stone-400 font-fanum pt-1 border-t border-white/5">
                      <span>گیرنده: {addr.recipientName}</span>
                      <span>کد پستی: <span className="font-mono" dir="ltr">{addr.postalCode}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Orders & Payments Timeline */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">خط زمانی فاکتورها، تراکنش‌ها و پرداخت‌ها</h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  پایش کلیه صورتحساب‌های صادره، رهگیری درگاه شاپرک و استردادهای تاییدشده مربوط به این مشتری.
                </p>
              </div>
              <span className="text-xs text-[#eed29d] font-fanum">
                {toFaDigits(orders.length)} سفارش ثبت‌شده
              </span>
            </div>

            {orders.length === 0 ? (
              <p className="text-xs text-stone-400 py-8 text-center">سفارشی برای این مشتری در پایگاه داده ثبت نشده است.</p>
            ) : (
              <div className="space-y-4">
                {orders.map((o) => {
                  const pay = payments.find((p) => p.orderId === o.id);
                  const isPaid = o.paymentStatus === 'verified_paid';
                  const isRefunded = o.paymentStatus === 'refunded';

                  return (
                    <div
                      key={o.id}
                      className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3 transition-colors hover:border-white/15"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/sales/orders/${o.id}`)}
                            className="font-mono text-xs font-bold text-[#eed29d] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <span>{o.id}</span>
                            <ExternalLink size={11} />
                          </button>
                          <span className="text-stone-400 text-xs font-fanum">
                            {new Date(o.createdAt).toLocaleDateString('fa-IR')} · {toFaDigits(o.items.length)} قلم کالا
                          </span>
                          {o.hasCustomLineItem && (
                            <span className="text-[10px] bg-[#ba8d3d]/20 text-[#eed29d] px-2 py-0.5 rounded border border-[#ba8d3d]/30 font-fanum">
                              سفارش آتلیه چاپ
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <MoneyDisplay amount={o.totalTomans} size="sm" />
                          <Badge
                            label={
                              o.status === 'delivered'
                                ? 'تحویل داده‌شده'
                                : o.status === 'shipped'
                                ? 'ارسال شده'
                                : o.status === 'in_production'
                                ? 'در حال چاپ'
                                : o.status === 'refunded'
                                ? 'استرداد وجه شده'
                                : 'تایید سفارش'
                            }
                            variant={
                              o.status === 'delivered'
                                ? 'success'
                                : o.status === 'refunded'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                          />
                        </div>
                      </div>

                      {/* Items Brief */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {o.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-stone-900/60 rounded-xl text-xs flex items-center justify-between border border-white/5"
                          >
                            <div className="truncate">
                              <div className="font-bold text-stone-200 truncate">{item.productName}</div>
                              <div className="text-[10px] text-stone-400 font-mono">{item.variantSku}</div>
                            </div>
                            <span className="font-fanum text-stone-300 text-[11px] shrink-0 mr-2">
                              {toFaDigits(item.quantity)} عدد
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Payment & Refund Sub-strip */}
                      <div className="bg-stone-950/40 p-2.5 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-stone-400 gap-2">
                        <div className="flex items-center gap-3 font-mono" dir="ltr">
                          <CreditCard size={13} className="text-stone-500" />
                          <span>درگاه: {pay?.method === 'saman_gateway' ? 'سامان کیش' : 'زرین‌پال'}</span>
                          {pay?.gatewayRefId && <span>کد پیگیری: {pay.gatewayRefId}</span>}
                          {pay?.traceNumber && <span>شماره ارجاع: {pay.traceNumber}</span>}
                        </div>

                        {isRefunded && (
                          <div className="text-rose-400 font-fanum flex items-center gap-1.5">
                            <AlertTriangle size={12} />
                            <span>مبلغ استرداد شده: {toFaDigits(o.totalTomans.toLocaleString('fa-IR'))} تومان (مشتری انصراف داد)</span>
                          </div>
                        )}
                        {!isRefunded && isPaid && (
                          <div className="text-emerald-400 flex items-center gap-1 font-fanum">
                            <CheckCircle2 size={12} />
                            <span>پرداخت تاییدشده شاپرک (محاسبه در LTV)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: Custom Designs */}
      {activeTab === 'designs' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">طرح‌های گرافیکی و سفارش‌های سفارشی آتلیه (POD)</h3>
              <p className="text-xs text-stone-400 mt-0.5">
                فایل‌های وکتور، تایپوگرافی‌های نستعلیق و آرت‌ورک‌های ثبت‌شده توسط این مشتری برای چاپ مستقیم DTG.
              </p>
            </div>
            <span className="text-xs text-[#eed29d] font-fanum">
              {toFaDigits(customDesigns.length)} طرح در پایگاه
            </span>
          </div>

          {customDesigns.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Sparkles size={32} className="text-stone-600 mx-auto" />
              <p className="text-xs text-stone-400">
                این مشتری تا کنون سفارش حاوی طرح اختصاصی آتلیه ثبت نکرده است.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customDesigns.map((design) => (
                <div
                  key={design.id}
                  className="p-4 bg-white/5 rounded-2xl border border-white/5 flex gap-4 items-start"
                >
                  <img
                    src={design.previewUrl}
                    alt={design.title}
                    className="w-20 h-20 rounded-xl object-cover border border-white/10 shrink-0 bg-stone-900"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://picsum.photos/seed/default_design/200/200';
                    }}
                  />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-white text-xs truncate">{design.title}</h4>
                      <Badge
                        label={
                          design.status === 'approved'
                            ? 'تایید آتلیه'
                            : design.status === 'rejected'
                            ? 'رد شده'
                            : design.status === 'revision_requested'
                            ? 'درخواست اصلاح'
                            : 'در نوبت بررسی'
                        }
                        variant={
                          design.status === 'approved'
                            ? 'success'
                            : design.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                        }
                        size="sm"
                      />
                    </div>

                    <div className="text-[11px] text-stone-400 font-mono">
                      <span>شناسه: {design.id}</span> · <span>سفارش: {design.orderId}</span>
                    </div>

                    <div className="text-[11px] text-stone-300 font-fanum">
                      لباس پایه: {design.blankProductName} ({design.blankColorName} - سایز {design.blankSize})
                    </div>

                    <div className="text-[10px] text-stone-400 font-fanum">
                      تکنیک چاپ: {design.format} · رزولوشن: {design.resolutionDpi} DPI · ناحیه: {design.printZone}
                    </div>

                    <div className="pt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/designs/${design.id}`)}
                        className="flex items-center gap-1.5 text-xs py-1"
                      >
                        <Eye size={12} />
                        <span>بررسی جزئیات طرح و آتلیه</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 4: Support Tickets & Reviews */}
      {activeTab === 'support' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Support Tickets */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-white/10 pb-3">
              <span className="flex items-center gap-2">
                <Headphones size={16} className="text-[#ba8d3d]" />
                <span>تیکت‌ها و مکاتبات پشتیبانی کارگاه</span>
              </span>
              <span className="text-xs font-fanum text-stone-400">{toFaDigits(supportTickets.length)} مورد</span>
            </h3>

            {supportTickets.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">هیچ تیکت پشتیبانی برای این مشتری ثبت نشده است.</p>
            ) : (
              <div className="space-y-3">
                {supportTickets.map((t) => (
                  <div key={t.id} className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{t.subject}</span>
                      <Badge
                        label={t.status === 'resolved' ? 'پاسخ داده‌شده' : 'در حال بررسی'}
                        variant={t.status === 'resolved' ? 'success' : 'warning'}
                        size="sm"
                      />
                    </div>
                    <p className="text-stone-300 text-[11px] leading-relaxed">{t.lastMessage}</p>
                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1 border-t border-white/5 font-fanum">
                      <span>شناسه: <code className="text-[#eed29d]">{t.id}</code></span>
                      {t.linkedOrderId && (
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/sales/orders/${t.linkedOrderId}`)}
                          className="text-[#eed29d] hover:underline cursor-pointer"
                        >
                          سفارش مرتبط: {t.linkedOrderId}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Reviews */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between border-b border-white/10 pb-3">
              <span className="flex items-center gap-2">
                <Star size={16} className="text-amber-400" />
                <span>دیدگاه‌ها و امتیازهای ثبت‌شده کاربر</span>
              </span>
              <span className="text-xs font-fanum text-stone-400">{toFaDigits(reviews.length)} دیدگاه</span>
            </h3>

            {reviews.length === 0 ? (
              <p className="text-xs text-stone-400 py-6 text-center">دیدگاهی توسط این مشتری در ویترین ثبت نشده است.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{rev.productName}</span>
                      <div className="flex items-center text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} size={11} fill="currentColor" />
                        ))}
                      </div>
                    </div>
                    <p className="text-stone-300 text-[11px] leading-relaxed">"{rev.comment}"</p>
                    <div className="text-[10px] text-emerald-400 font-fanum flex items-center gap-1">
                      <CheckCircle2 size={10} />
                      <span>خریدار تاییدشده فروشگاه شاه‌پوش</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: Staff Notes & Audit Trail */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* New Note Form */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText size={16} className="text-[#ba8d3d]" />
              <span>ثبت یادداشت محرمانه پرسنلی برای این پرونده</span>
            </h3>

            {noteFeedback && (
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 size={14} />
                <span>{noteFeedback}</span>
              </div>
            )}

            <form onSubmit={handleAddNote} className="space-y-3 text-xs">
              <textarea
                rows={3}
                required
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="یادداشت در خصوص هماهنگی با خریدار، تغییر سایز، هماهنگی چاپ یا تحویل اکسپرس..."
                className="w-full bg-stone-900 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[#ba8d3d]"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1">پیوند به سفارش مرتبط (اختیاری):</label>
                  <select
                    value={noteLinkedOrderId}
                    onChange={(e) => setNoteLinkedOrderId(e.target.value)}
                    className="w-full bg-stone-900 border border-white/10 rounded-xl p-2 text-white focus:outline-none focus:border-[#ba8d3d]"
                  >
                    <option value="">-- بدون پیوند سفارش --</option>
                    {orders.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.id} ({toFaDigits(o.totalTomans.toLocaleString('fa-IR'))} تومان)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">پیوند به طرح اختصاصی مرتبط (اختیاری):</label>
                  <select
                    value={noteLinkedDesignId}
                    onChange={(e) => setNoteLinkedDesignId(e.target.value)}
                    className="w-full bg-stone-900 border border-white/10 rounded-xl p-2 text-white focus:outline-none focus:border-[#ba8d3d]"
                  >
                    <option value="">-- بدون پیوند طرح --</option>
                    {customDesigns.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id} - {d.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="sm" className="flex items-center gap-1.5">
                  <Send size={13} />
                  <span>ثبت یادداشت در پرونده و ردپای ممیزی</span>
                </Button>
              </div>
            </form>
          </div>

          {/* Notes History */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3">
              تاریخچه یادداشت‌های ثبت‌شده پرسنل ({toFaDigits(staffNotes.length)})
            </h3>

            {staffNotes.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">هیچ یادداشتی برای این مشتری ثبت نشده است.</p>
            ) : (
              <div className="space-y-3">
                {staffNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3.5 bg-white/5 rounded-xl border border-white/5 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-stone-400 text-[11px] font-fanum">
                      <span className="font-bold text-stone-200">{note.authorName}</span>
                      <span>{new Date(note.timestamp).toLocaleString('fa-IR')}</span>
                    </div>
                    <p className="text-stone-300 leading-relaxed">{note.text}</p>
                    {(note.linkedOrderId || note.linkedDesignId) && (
                      <div className="flex items-center gap-3 pt-1 border-t border-white/5 text-[11px]">
                        {note.linkedOrderId && (
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/sales/orders/${note.linkedOrderId}`)}
                            className="text-[#eed29d] hover:underline cursor-pointer flex items-center gap-1 font-mono"
                          >
                            <span>سفارش: {note.linkedOrderId}</span>
                            <ExternalLink size={10} />
                          </button>
                        )}
                        {note.linkedDesignId && (
                          <button
                            type="button"
                            onClick={() => navigate(`/designs/${note.linkedDesignId}`)}
                            className="text-[#eed29d] hover:underline cursor-pointer flex items-center gap-1 font-mono"
                          >
                            <span>طرح: {note.linkedDesignId}</span>
                            <ExternalLink size={10} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Trail Log */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-white/10 pb-3">
              ردپای ممیزی و تاریخچه تغییرات پرونده (Audit Trail)
            </h3>
            <div className="space-y-2">
              {auditTrail.map((aud) => (
                <div
                  key={aud.id}
                  className="p-2.5 bg-stone-900/60 rounded-xl border border-white/5 flex items-center justify-between text-xs font-fanum"
                >
                  <div>
                    <span className="font-bold text-stone-200 block">{aud.action}</span>
                    {aud.note && <span className="text-[11px] text-stone-400 block">{aud.note}</span>}
                  </div>
                  <div className="text-left text-[11px] text-stone-400 shrink-0 mr-4">
                    <span className="block text-stone-300 font-bold">{aud.actorName}</span>
                    <span>{new Date(aud.timestamp).toLocaleDateString('fa-IR')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: Cart & Favorites */}
      {activeTab === 'cart' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Saved Favorites */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Heart size={16} className="text-rose-400" />
                <span>محصولات ذخیره‌شده در علاقه‌مندی‌ها</span>
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                فقط اقلامی که واقعاً در پایگاه داده برای این مشتری ذخیره شده باشند نمایش داده می‌شوند.
              </p>
            </div>

            {dossier.savedFavorites.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 bg-white/5 rounded-xl border border-white/5 space-y-2">
                <Heart size={24} className="text-stone-600 mx-auto" />
                <p>هیچ کالایی در فهرست علاقه‌مندی‌های این مشتری در پایگاه داده ثبت نشده است.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dossier.savedFavorites.map((fav, i) => (
                  <div
                    key={i}
                    className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{fav.productName}</div>
                      <div className="text-[10px] text-stone-400 font-mono">شناسه کالا: {fav.productId}</div>
                    </div>
                    <span className="text-[10px] text-stone-400 font-fanum">
                      افزوده‌شده در {new Date(fav.addedAt).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Active Cart */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag size={16} className="text-[#ba8d3d]" />
                <span>سبد خرید باز / جاری کاربر</span>
              </h3>
              <p className="text-[11px] text-stone-400 mt-0.5">
                کالاهای در حال انتظار برای تکمیل نهایی سفارش.
              </p>
            </div>

            {dossier.cartItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400 bg-white/5 rounded-xl border border-white/5 space-y-2">
                <ShoppingBag size={24} className="text-stone-600 mx-auto" />
                <p>سبد خرید این کاربر خالی است (سفارش در حال انجامی ندارد).</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {dossier.cartItems.map((cart, i) => (
                  <div
                    key={i}
                    className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{cart.productName}</div>
                      <div className="text-[10px] text-[#eed29d] font-mono">{cart.variantSku}</div>
                    </div>
                    <span className="text-xs font-bold text-white font-fanum bg-stone-900 px-2.5 py-1 rounded-lg">
                      {toFaDigits(cart.quantity)} عدد
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: Browsing & Activity */}
      {activeTab === 'browsing' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="p-4 bg-gradient-to-r from-stone-900 to-[#1e1a12] border border-[#ba8d3d]/30 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#eed29d]">
              <Info size={16} />
              <span>مبنای قانونی و شرایط فنی پایش رفتار کاربران (Privacy & Telemetry Lawful Basis)</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              ثبت و پایش وقایع مرور و رفتار کاربران در محیط تولید نیازمند ابزار دقیق (Instrumentation)، رضایت صریح و مبنای قانونی
              طبق سیاست حریم خصوصی و الزامات شاپرک/کسب‌وکارهای اینترنتی است. اطلاعات زیر صرفاً نمونه‌ای از نشست‌های ناشناس دمو است.
            </p>
          </div>

          <h3 className="text-sm font-bold text-white pt-2">وقایع نشست‌های اخیر کاربر در دمو</h3>
          <div className="space-y-2.5">
            {dossier.browsingEvents.map((ev) => (
              <div
                key={ev.id}
                className="p-3 bg-white/5 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
              >
                <div>
                  <span className="font-bold text-white block">{ev.pageTitle}</span>
                  <span className="text-[10px] text-[#eed29d] font-mono" dir="ltr">
                    {ev.url}
                  </span>
                </div>
                <div className="text-[11px] text-stone-400 font-fanum flex items-center gap-3">
                  <span>{ev.device}</span>
                  <span>•</span>
                  <span>{toFaDigits(ev.durationSeconds || 60)} ثانیه</span>
                  <span>•</span>
                  <span>{new Date(ev.timestamp).toLocaleString('fa-IR')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="ویرایش اطلاعات هویتی و ارتباطی مشتری">
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          {editError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{editError}</span>
            </div>
          )}

          {editSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{editSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-300 mb-1 font-bold">نام و نام‌خانوادگی</label>
              <input
                type="text"
                required
                value={editForm.fullName}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>
            <div>
              <label className="block text-stone-300 mb-1 font-bold">شماره تلفن همراه (۱۱ رقم)</label>
              <input
                type="text"
                required
                dir="ltr"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-300 mb-1 font-bold">پست الکترونیک</label>
              <input
                type="email"
                dir="ltr"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>
            <div>
              <label className="block text-stone-300 mb-1 font-bold">استان</label>
              <input
                type="text"
                value={editForm.province}
                onChange={(e) => setEditForm({ ...editForm, province: e.target.value })}
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-300 mb-1 font-bold">شهر</label>
              <input
                type="text"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>
            <div>
              <label className="block text-stone-300 mb-1 font-bold">کد پستی</label>
              <input
                type="text"
                dir="ltr"
                value={editForm.postalCode}
                onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-300 mb-1 font-bold">نشانی دقیق پستی</label>
            <textarea
              rows={2}
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ba8d3d]"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={editForm.marketingConsent}
              onChange={(e) => setEditForm({ ...editForm, marketingConsent: e.target.checked })}
              className="rounded accent-[#ba8d3d]"
            />
            <span className="text-stone-300 text-xs">موافقت مشتری با دریافت پیامک‌های پیشنهادی و تخفیف‌ها</span>
          </label>

          <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsEditOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm">
              ذخیره تغییرات
            </Button>
          </div>
        </form>
      </Modal>

      {/* STATUS CHANGE MODAL */}
      <Modal isOpen={isStatusOpen} onClose={() => setIsStatusOpen(false)} title="تغییر وضعیت پرونده مشتری">
        <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
          {statusError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{statusError}</span>
            </div>
          )}

          <div>
            <label className="block text-stone-300 mb-1 font-bold">وضعیت جدید حساب:</label>
            <select
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as any)}
              className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="active">فعال (Active)</option>
              <option value="inactive">غیرفعال موقت (Inactive)</option>
              <option value="deactivated">تعلیق / مسدود (Deactivated)</option>
            </select>
          </div>

          <div>
            <label className="block text-stone-300 mb-1 font-bold">دلیل تغییر وضعیت (الزامی جهت ممیزی):</label>
            <textarea
              rows={3}
              required
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="توضیح مکتوب جهت درج در ردپای ممیزی سیستم..."
              className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ba8d3d]"
            />
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => setIsStatusOpen(false)}>
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm">
              ثبت تغییر وضعیت
            </Button>
          </div>
        </form>
      </Modal>

      {/* GDPR DATA EXPORT MODAL */}
      <Modal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} title="خروجی داده‌های شخصی (GDPR Export)">
        <div className="space-y-4 text-xs">
          <p className="text-stone-300">
            بسته داده‌های هویتی، مالی، طرح‌ها و نظرات این مشتری طبق استاندارد قابلیت انتقال داده‌ها (Data Portability) تولید
            گردید.
          </p>
          <pre
            className="p-3 bg-stone-950 rounded-xl border border-white/10 font-mono text-[10px] text-emerald-400 max-h-60 overflow-y-auto"
            dir="ltr"
          >
            {exportJson}
          </pre>
          <div className="flex justify-end gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const blob = new Blob([exportJson || ''], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `customer_export_${customer.id}.json`;
                a.click();
              }}
              className="flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>دانلود فایل JSON</span>
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsExportOpen(false)}>
              بستن
            </Button>
          </div>
        </div>
      </Modal>

      {/* DELETION REQUEST MODAL */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="ثبت درخواست امن حذف و تعلیق حساب">
        <form onSubmit={handleDeleteRequest} className="space-y-4 text-xs">
          {deleteSuccess ? (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>درخواست حذف ثبت گردید و حساب مشتری غیرفعال شد.</span>
            </div>
          ) : (
            <>
              <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-200 rounded-xl space-y-1">
                <strong>رویه امن حذف و حق فراموشی (Right to be Forgotten):</strong>
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  طبق قوانین مالیاتی و الزامات شاپرک، سوابق فاکتورهای قطعی و اسناد تسویه حساب به مدت ۵ سال حفظ می‌شوند.
                  اعمال این درخواست، دسترسی کاربری و ارتباطات بازاریابی را بلافاصله غیرفعال و نشان‌دار می‌کند.
                </p>
              </div>

              <div>
                <label className="block text-stone-300 mb-1 font-bold">دلیل درخواست حذف:</label>
                <textarea
                  rows={2}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="درخواست صریح مشتری طبق سیاست حریم خصوصی..."
                  className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ba8d3d]"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
                <Button type="button" variant="secondary" size="sm" onClick={() => setIsDeleteOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit" variant="danger" size="sm">
                  تایید و غیرفعال‌سازی حساب
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>

      {/* DEMO ACTION NOTICE MODAL */}
      <Modal isOpen={!!demoActionNotice} onClose={() => setDemoActionNotice(null)} title="قابلیت نمایشی در محیط دمو">
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-stone-900 rounded-xl border border-white/10 flex items-center gap-3 text-stone-300">
            <Info size={18} className="text-[#ba8d3d] shrink-0" />
            <span>{demoActionNotice}</span>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setDemoActionNotice(null)}>
              متوجه شدم
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
