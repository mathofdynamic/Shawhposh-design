import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  UserCheck,
  Eye,
  Shield,
  Plus,
  ArrowUpDown,
  Filter,
  ShoppingBag,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Download,
  Info,
  Layers,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import {
  Table,
  ColumnDef,
  Badge,
  Button,
  SearchInput,
  Pagination,
  MoneyDisplay,
  KPICard,
  Modal,
} from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router';
import { Customer } from '../../domain/types';
import { toFaDigits, maskPhoneNumber, maskEmail } from '../../utils/formatters';

export const CustomerDirectoryPage: React.FC = () => {
  const { state, getCustomersList, createCustomer } = useAdminRepository();
  const { navigate } = useAdminRouter();

  // Search & Filters
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<
    'all' | 'first_time' | 'repeat' | 'recently_active' | 'inactive' | 'custom_design' | 'high_spend'
  >('all');
  const [orderType, setOrderType] = useState<'all' | 'has_custom' | 'standard_only'>('all');
  const [province, setProvince] = useState<string>('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive' | 'deactivated'>('all');
  const [sortBy, setSortBy] = useState<
    'ltv_desc' | 'ltv_asc' | 'orders_desc' | 'recent_active' | 'date_desc' | 'name'
  >('ltv_desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // New Customer Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    city: 'تهران',
    province: 'تهران',
    address: '',
    postalCode: '',
    marketingConsent: true,
    tag: 'new' as Customer['tag'],
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  // Fetch segmented and filtered customer list
  const queryResult = useMemo(() => {
    return getCustomersList({
      search,
      segment,
      orderType,
      province,
      status,
      sortBy,
    });
  }, [getCustomersList, search, segment, orderType, province, status, sortBy, state.customers, state.orders]);

  const { items, customerMetrics, summary } = queryResult;

  // Available provinces for filter
  const provincesList = useMemo(() => {
    const setP = new Set<string>();
    state.customers.forEach((c) => {
      if (c.province) setP.add(c.province);
    });
    return Array.from(setP).sort();
  }, [state.customers]);

  const totalPages = Math.ceil(items.length / pageSize) || 1;
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, currentPage, pageSize]);

  // Handle Create Customer
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateSuccess(null);

    const res = createCustomer(createForm, 'مدیر سیستم (آتلیه)');
    if (!res.success) {
      setCreateError(res.error || 'خطا در ثبت مشتری');
      return;
    }

    setCreateSuccess(`پرونده مشتری ${res.customer?.fullName} با شناسه ${res.customer?.id} با موفقیت ثبت شد.`);
    setTimeout(() => {
      setIsCreateOpen(false);
      setCreateSuccess(null);
      setCreateForm({
        fullName: '',
        phone: '',
        email: '',
        city: 'تهران',
        province: 'تهران',
        address: '',
        postalCode: '',
        marketingConsent: true,
        tag: 'new',
      });
      if (res.customer) {
        navigate(`/customers/${res.customer.id}`);
      }
    }, 1200);
  };

  const columns: ColumnDef<Customer>[] = [
    {
      key: 'id',
      header: 'کد مشتری',
      render: (row) => (
        <button
          type="button"
          onClick={() => navigate(`/customers/${row.id}`)}
          className="font-mono text-xs font-bold text-[#eed29d] hover:underline cursor-pointer flex items-center gap-1"
        >
          <span>{row.id}</span>
        </button>
      ),
    },
    {
      key: 'fullName',
      header: 'نام و موقعیت',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs flex items-center gap-2">
            <span>{row.fullName}</span>
            {row.deletionRequested && (
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30">
                درخواست حذف
              </span>
            )}
          </div>
          <div className="text-[10px] text-stone-400 font-fanum flex items-center gap-1.5 mt-0.5">
            <MapPin size={10} className="text-stone-500" />
            <span>{row.province} · {row.city}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'اطلاعات تماس (ماسک‌شده)',
      render: (row) => (
        <div className="space-y-0.5">
          <div className="font-mono text-xs text-stone-300 flex items-center gap-1.5" dir="ltr">
            <Lock size={10} className="text-stone-500" />
            <span>{maskPhoneNumber(row.phone)}</span>
          </div>
          <div className="font-mono text-[10px] text-stone-400 truncate max-w-[150px]" dir="ltr">
            {maskEmail(row.email)}
          </div>
        </div>
      ),
    },
    {
      key: 'tag',
      header: 'رده و وضعیت',
      render: (row) => {
        const m = customerMetrics.get(row.id);
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge
                label={
                  row.tag === 'vip'
                    ? 'طلایی (VIP)'
                    : row.tag === 'wholesale'
                    ? 'عمده‌فروشی'
                    : row.tag === 'new'
                    ? 'مشتری جدید'
                    : 'عادی'
                }
                variant={row.tag === 'vip' ? 'warning' : 'default'}
                size="sm"
              />
              {row.status === 'deactivated' ? (
                <Badge label="مسدود" variant="danger" size="sm" />
              ) : row.status === 'inactive' ? (
                <Badge label="غیرفعال" variant="neutral" size="sm" />
              ) : (
                <Badge label="فعال" variant="success" size="sm" />
              )}
            </div>
            {m?.hasCustom && (
              <span className="text-[9px] text-[#eed29d] flex items-center gap-1 font-fanum">
                <Sparkles size={9} /> خریدار آتلیه سفارشی
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'totalOrdersCount',
      header: 'تعداد فاکتورها',
      render: (row) => {
        const m = customerMetrics.get(row.id);
        const count = m?.totalOrders ?? row.totalOrdersCount;
        return (
          <div>
            <span className="font-fanum text-xs font-bold text-white">
              {toFaDigits(count)} سفارش
            </span>
            <div className="text-[10px] text-stone-400 font-fanum">
              {count >= 2 ? (
                <span className="text-emerald-400">مشتری وفادار (تکرار خرید)</span>
              ) : count === 1 ? (
                <span className="text-sky-400">خرید اول</span>
              ) : (
                <span className="text-stone-500">بدون سفارش قطعی</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'totalSpentTomans',
      header: 'خرید خالص (LTV)',
      render: (row) => {
        const m = customerMetrics.get(row.id);
        const netLtv = m?.netLtv ?? row.totalSpentTomans;
        return (
          <div>
            <MoneyDisplay amount={netLtv} size="sm" />
            {m && m.refunds > 0 && (
              <div className="text-[9px] text-rose-400 font-fanum mt-0.5">
                کسر {toFaDigits(m.refunds.toLocaleString('fa-IR'))} ت استرداد
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'lastActiveAt',
      header: 'آخرین فعالیت',
      render: (row) => {
        const m = customerMetrics.get(row.id);
        const days = m?.daysSinceActive ?? 0;
        return (
          <div className="text-xs text-stone-300 font-fanum">
            <span>{days === 0 ? 'امروز' : `${toFaDigits(days)} روز پیش`}</span>
            <div className="text-[10px] text-stone-500 font-fanum">
              عضویت: {new Date(row.createdAt).toLocaleDateString('fa-IR')}
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'اقدامات',
      align: 'left',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/customers/${row.id}`)}
            className="flex items-center gap-1.5 text-xs py-1"
          >
            <Eye size={12} />
            <span>پرونده تفصیلی</span>
          </Button>
        </div>
      ),
    },
  ];

  const segmentsTabs = [
    { id: 'all', label: 'همه مشتریان', count: summary.segments.all },
    { id: 'first_time', label: 'خریدار بار اول', count: summary.segments.first_time },
    { id: 'repeat', label: 'وفادار (تکرار خرید)', count: summary.segments.repeat },
    { id: 'recently_active', label: 'فعال در ۳۰ روز اخیر', count: summary.segments.recently_active },
    { id: 'inactive', label: 'غیرفعال (> ۳۰ روز)', count: summary.segments.inactive },
    { id: 'custom_design', label: 'سفارش طرح آتلیه', count: summary.segments.custom_design },
    { id: 'high_spend', label: 'ارزش بالا (LTV > ۲م)', count: summary.segments.high_spend },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <AdminPageHeader
        title="فهرست خریداران و باشگاه مشتریان شاه‌پوش"
        description="ساماندهی پایگاه مشتریان، رده‌بندی اعضای باشگاه، تفکیک خریداران طرح اختصاصی و پایش ارزش مادام‌العمر (LTV) مبتنی بر تراکنش‌های قطعی."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus size={15} />
              <span>افتتاح حساب مشتری جدید</span>
            </Button>
          </div>
        }
      />

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="کل مشتریان ثبت‌شده"
          value={`${toFaDigits(summary.totalCount)} نفر`}
          subtitle={`فعال: ${toFaDigits(summary.activeCount)} نفر در پایگاه`}
          icon={<Users size={20} className="text-[#ba8d3d]" />}
        />
        <KPICard
          title="مجموع ارزش خالص (LTV تجمعی)"
          value={`${toFaDigits(summary.totalVerifiedLtv.toLocaleString('fa-IR'))} تومان`}
          subtitle="فرمول: پرداختی‌های تاییدشده منهای استردادها"
          icon={<ShoppingBag size={20} className="text-emerald-400]" />}
        />
        <KPICard
          title="نرخ تکرار خرید (Repeat Buyers)"
          value={`${toFaDigits(
            summary.totalCount > 0 ? Math.round((summary.repeatBuyersCount / summary.totalCount) * 100) : 0
          )}٪`}
          subtitle={`${toFaDigits(summary.repeatBuyersCount)} مشتری با ۲ فاکتور یا بیشتر`}
          icon={<CheckCircle2 size={20} className="text-sky-400" />}
        />
        <KPICard
          title="خریداران طرح‌های اختصاصی آتلیه"
          value={`${toFaDigits(summary.customBuyersCount)} خریدار`}
          subtitle="سفارش دارای شخصی‌سازی و چاپ مستقیم DTG"
          icon={<Sparkles size={20} className="text-[#eed29d]" />}
        />
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-3.5 bg-gradient-to-r from-stone-900 to-[#191714] border border-[#ba8d3d]/20 rounded-2xl flex items-center justify-between text-xs text-stone-300 gap-4">
        <div className="flex items-center gap-2.5">
          <Shield size={18} className="text-[#ba8d3d] shrink-0" />
          <span>
            <strong>حریم خصوصی و حفاظت از داده‌ها:</strong> اطلاعات تماس مشتریان به صورت پیش‌فرض طبق استانداردهای امنیتی
            ماسک شده است. مشاهده شماره کامل و پست الکترونیک صرفاً برای نقش‌های مجاز (مدیر ارشد و مالی) در پرونده تفصیلی در دسترس است.
          </span>
        </div>
        <span className="text-[11px] text-[#eed29d] bg-white/5 px-2.5 py-1 rounded-xl whitespace-nowrap border border-white/5">
          بدون دسته‌بندی‌های غیراخلاقی یا حساس
        </span>
      </div>

      {/* Segment Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {segmentsTabs.map((tab) => {
          const isActive = segment === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setSegment(tab.id as any);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#ba8d3d] text-stone-950 shadow-md shadow-[#ba8d3d]/20'
                  : 'bg-[#131211] text-stone-400 hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-fanum ${
                  isActive ? 'bg-stone-950/20 text-stone-950 font-black' : 'bg-white/5 text-stone-300'
                }`}
              >
                {toFaDigits(tab.count)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#131211] p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="md:col-span-1">
            <SearchInput
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="جستجو با نام، شناسه، تلفن یا شهر..."
            />
          </div>

          {/* Order Type Filter */}
          <div>
            <select
              value={orderType}
              onChange={(e) => {
                setOrderType(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="all">همه انواع سفارشات</option>
              <option value="has_custom">سفارش‌دهندگان طرح اختصاصی (POD)</option>
              <option value="standard_only">صرفاً محصولات استاندارد کاتالوگ</option>
            </select>
          </div>

          {/* Province Filter */}
          <div>
            <select
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="all">همه استان‌ها و مناطق ({toFaDigits(provincesList.length)})</option>
              {provincesList.map((p) => (
                <option key={p} value={p}>
                  استان {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status & Sort */}
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-1/2 bg-stone-900 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="all">همه وضعیت‌ها</option>
              <option value="active">فعال</option>
              <option value="inactive">غیرفعال</option>
              <option value="deactivated">تعلیق / مسدود</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-1/2 bg-stone-900 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="ltv_desc">بیشترین خرید (LTV)</option>
              <option value="ltv_asc">کمترین خرید</option>
              <option value="orders_desc">تعداد سفارشات</option>
              <option value="recent_active">جدیدترین فعالیت</option>
              <option value="date_desc">جدیدترین عضویت</option>
              <option value="name">نام خانوادگی (الفبا)</option>
            </select>
          </div>
        </div>

        {/* Filter Counters Feedback */}
        <div className="flex items-center justify-between text-xs text-stone-400 pt-1 font-fanum">
          <div>
            نمایش <strong>{toFaDigits(items.length)}</strong> مشتری منطبق بر فیلترها (از مجموع {toFaDigits(summary.totalCount)})
          </div>
          {(search || segment !== 'all' || orderType !== 'all' || province !== 'all' || status !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSegment('all');
                setOrderType('all');
                setProvince('all');
                setStatus('all');
                setSortBy('ltv_desc');
                setCurrentPage(1);
              }}
              className="text-[#eed29d] hover:underline cursor-pointer"
            >
              پاک‌سازی فیلترها
            </button>
          )}
        </div>
      </div>

      {/* Main Customers Table */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <Table
          columns={columns}
          data={pageItems}
          keyExtractor={(c) => c.id}
          emptyMessage="هیچ رکوردی منطبق با شرایط جستجو و فیلتر یافت نشد."
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-stone-400 font-fanum">
              صفحه {toFaDigits(currentPage)} از {toFaDigits(totalPages)}
            </span>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* New Customer Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="افتتاح حساب و پرونده مشتری جدید"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
          {createError && (
            <div className="p-3 bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
              <AlertTriangle size={16} />
              <span>{createError}</span>
            </div>
          )}

          {createSuccess && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{createSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-300 mb-1 font-bold">نام و نام‌خانوادگی *</label>
              <input
                type="text"
                required
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                placeholder="مثال: آرمان شریفی"
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>

            <div>
              <label className="block text-stone-300 mb-1 font-bold">شماره تلفن همراه (۱۱ رقم) *</label>
              <input
                type="text"
                required
                dir="ltr"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="09123456789"
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-300 mb-1 font-bold">پست الکترونیک (اختیاری)</label>
              <input
                type="email"
                dir="ltr"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="client@example.com"
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>

            <div>
              <label className="block text-stone-300 mb-1 font-bold">سطح مشتری در باشگاه</label>
              <select
                value={createForm.tag}
                onChange={(e) => setCreateForm({ ...createForm, tag: e.target.value as any })}
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ba8d3d]"
              >
                <option value="new">مشتری جدید</option>
                <option value="regular">عادی</option>
                <option value="vip">طلایی (VIP)</option>
                <option value="wholesale">عمده‌فروشی</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-stone-300 mb-1 font-bold">استان</label>
              <input
                type="text"
                value={createForm.province}
                onChange={(e) => setCreateForm({ ...createForm, province: e.target.value })}
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>

            <div>
              <label className="block text-stone-300 mb-1 font-bold">شهر</label>
              <input
                type="text"
                value={createForm.city}
                onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>

            <div>
              <label className="block text-stone-300 mb-1 font-bold">کد پستی (۱۰ رقم)</label>
              <input
                type="text"
                dir="ltr"
                value={createForm.postalCode}
                onChange={(e) => setCreateForm({ ...createForm, postalCode: e.target.value })}
                placeholder="1985714230"
                className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-300 mb-1 font-bold">نشانی دقیق پستی</label>
            <textarea
              rows={2}
              value={createForm.address}
              onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
              placeholder="تهران، خیابان ولیعصر، نرسیده به میدان تجریش، پلاک..."
              className="w-full bg-stone-900 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#ba8d3d]"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={createForm.marketingConsent}
              onChange={(e) => setCreateForm({ ...createForm, marketingConsent: e.target.checked })}
              className="rounded accent-[#ba8d3d]"
            />
            <span className="text-stone-300 text-xs">
              ثبت رضایت مشتری جهت دریافت پیامک اطلاع‌رسانی پیگیری مرسوله و پیشنهادات آتلیه
            </span>
          </label>

          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
            >
              انصراف
            </Button>
            <Button type="submit" variant="primary" size="sm">
              ثبت و صدور پرونده
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
