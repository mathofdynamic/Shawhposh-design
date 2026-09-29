import React, { useState, useMemo } from 'react';
import {
  Database,
  Search,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Download,
  Copy,
  Check,
  Table as TableIcon,
  Code,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Eye,
  Info,
  Filter,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, SearchInput, Badge, Dialog, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { toFaDigits } from '../../utils/formatters';

export type WhitelistedCatalogEntity =
  | 'products'
  | 'variants'
  | 'customers'
  | 'orders'
  | 'payments'
  | 'designs'
  | 'jobs'
  | 'shipments';

interface EntityCatalogDef {
  id: WhitelistedCatalogEntity;
  labelFa: string;
  labelEn: string;
  tableName: string;
  descriptionFa: string;
}

export const DataExplorerPage: React.FC = () => {
  const { state } = useAdminRepository();
  const { addToast } = useToast();

  const [activeEntity, setActiveEntity] = useState<WhitelistedCatalogEntity>('orders');
  const [viewMode, setViewMode] = useState<'table' | 'json'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Export Permission State & Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportRole, setExportRole] = useState<'super_admin' | 'guest_operator'>('super_admin');
  const [copiedExport, setCopiedExport] = useState(false);

  const catalogDefinitions: EntityCatalogDef[] = [
    {
      id: 'products',
      labelFa: 'کالاها و محصولات',
      labelEn: 'Products Catalog',
      tableName: 'public.products',
      descriptionFa: 'شناسنامه کالاهای فروشگاه، قیمت پایه، دسته‌بندی و وضعیت انتشار',
    },
    {
      id: 'variants',
      labelFa: 'تنوع‌ها و موجودی انبار',
      labelEn: 'Product Variants & Stock',
      tableName: 'public.product_variants',
      descriptionFa: 'کدهای تنوع (SKU)، رنگ، سایز، موجودی فیزیکی و رزرو شده',
    },
    {
      id: 'customers',
      labelFa: 'مشتریان و حساب‌ها',
      labelEn: 'Customers & Profiles',
      tableName: 'public.customers',
      descriptionFa: 'پروفایل خریداران با ماسک‌سازی کامل شماره همراه و ایمیل (PII Masked)',
    },
    {
      id: 'orders',
      labelFa: 'سفارش‌ها و سبدهای خرید',
      labelEn: 'Sales Orders',
      tableName: 'public.orders',
      descriptionFa: 'فاکتورها، مبالغ کل، وضعیت پرداخت، وضعیت طراحی و آدرس تحویل',
    },
    {
      id: 'payments',
      labelFa: 'تراکنش‌های بانکی شاپرک',
      labelEn: 'Payment Transactions',
      tableName: 'public.payments',
      descriptionFa: 'شماره‌های پیگیری، درگاه‌های PSP، کدهای RRN و مبالغ واریزی',
    },
    {
      id: 'designs',
      labelFa: 'طرح‌های ارسالی آتلیه',
      labelEn: 'Custom Atelier Designs',
      tableName: 'public.custom_designs',
      descriptionFa: 'شناسه طرح‌های سفارشی کاربران، ابعاد، وضعیت تاییدیه و لینک پیش‌نمایش',
    },
    {
      id: 'jobs',
      labelFa: 'دستورکارهای خط تولید',
      labelEn: 'Production Jobs',
      tableName: 'public.production_jobs',
      descriptionFa: 'سفارش‌های چاپ DTG در حال اجرا، مراحل خط تولید و وضعیت بازرسی QC',
    },
    {
      id: 'shipments',
      labelFa: 'مرسولات پستی و بارنامه‌ها',
      labelEn: 'Logistics Shipments',
      tableName: 'public.shipments',
      descriptionFa: 'بارنامه‌های تیپاکس و پست پیشتاز، هزینه‌ها و وضعیت توزیع مرسوله',
    },
  ];

  // Helper function to safely mask PII fields
  const maskSensitivePii = (item: any): any => {
    if (!item || typeof item !== 'object') return item;
    const copy = { ...item };

    if (copy.phone && typeof copy.phone === 'string') {
      const p = copy.phone.trim();
      if (p.length >= 10) {
        copy.phone = `${p.slice(0, 4)}***${p.slice(-4)}`;
      } else {
        copy.phone = '۰۹۱۲***۴۵۶۷';
      }
    }
    if (copy.customerPhone && typeof copy.customerPhone === 'string') {
      const p = copy.customerPhone.trim();
      if (p.length >= 10) {
        copy.customerPhone = `${p.slice(0, 4)}***${p.slice(-4)}`;
      } else {
        copy.customerPhone = '۰۹۱۲***۴۵۶۷';
      }
    }
    if (copy.recipientPhone && typeof copy.recipientPhone === 'string') {
      const p = copy.recipientPhone.trim();
      if (p.length >= 10) {
        copy.recipientPhone = `${p.slice(0, 4)}***${p.slice(-4)}`;
      } else {
        copy.recipientPhone = '۰۹۱۲***۴۵۶۷';
      }
    }
    if (copy.email && typeof copy.email === 'string') {
      const parts = copy.email.split('@');
      if (parts.length === 2) {
        copy.email = `${parts[0].slice(0, 1)}***@${parts[1]}`;
      } else {
        copy.email = 'c***@example.com';
      }
    }
    if (copy.cardNumber && typeof copy.cardNumber === 'string') {
      copy.cardNumber = '6037-99**-****-1234';
    }
    if (copy.shippingAddress && typeof copy.shippingAddress === 'string') {
      // Partial masking of exact street number
      copy.shippingAddress = copy.shippingAddress.replace(/\d+/g, '***');
    }

    return copy;
  };

  // Extract raw entity array based on catalog selection
  const rawEntityData = useMemo(() => {
    switch (activeEntity) {
      case 'products':
        return state.products || [];
      case 'variants':
        return state.variants || [];
      case 'customers':
        return state.customers || [];
      case 'orders':
        return state.orders || [];
      case 'payments':
        return state.payments || [];
      case 'designs':
        return state.customDesigns || [];
      case 'jobs':
        return state.productionJobs || [];
      case 'shipments':
        return state.shipments || [];
      default:
        return [];
    }
  }, [activeEntity, state]);

  // Apply PII masking to all records in read-only explorer
  const sanitizedEntityData = useMemo(() => {
    return rawEntityData.map((item) => maskSensitivePii(item));
  }, [rawEntityData]);

  // Apply search query filter
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return sanitizedEntityData;
    const q = searchQuery.trim().toLowerCase();
    return sanitizedEntityData.filter((item) => {
      return JSON.stringify(item).toLowerCase().includes(q);
    });
  }, [sanitizedEntityData, searchQuery]);

  // Server-like Pagination
  const totalRecords = filteredData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, validCurrentPage, pageSize]);

  // Change tab resets page & search
  const handleTabChange = (entity: WhitelistedCatalogEntity) => {
    setActiveEntity(entity);
    setCurrentPage(1);
    setSearchQuery('');
  };

  // Safe projection for export
  const getSafeExportProjection = () => {
    const projected = sanitizedEntityData.map((item) => {
      const safe = { ...item };
      // Strip internal private fields
      delete safe._internalHash;
      delete safe.secretToken;
      return safe;
    });

    return {
      _exportNotice: '[DEMO_EXPORT - SHAWHPOSH_SYNTHETIC_DATA - NOT FOR PRODUCTION]',
      exportedAt: new Date().toISOString(),
      entityCatalog: activeEntity,
      totalRecordCount: projected.length,
      piiSanitized: true,
      records: projected,
    };
  };

  const handleCopyExportJson = () => {
    const output = getSafeExportProjection();
    navigator.clipboard.writeText(JSON.stringify(output, null, 2));
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
    addToast({
      title: 'خروجی امن کپی شد',
      description: 'داده‌ها به همراه برچسب شبیه‌ساز و ماسک‌سازی PII کپی گردیدند.',
      type: 'success',
    });
  };

  const handleDownloadExportJson = () => {
    const output = getSafeExportProjection();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(output, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `shahpoosh_export_${activeEntity}_demo.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setIsExportModalOpen(false);
    addToast({
      title: 'فایل JSON صادر شد',
      description: `خروجی جدول ${activeEntity} با برچسب دمو دانلود شد.`,
      type: 'info',
    });
  };

  // Columns for tabular view depending on entity
  const renderTableHeaders = () => {
    switch (activeEntity) {
      case 'orders':
        return (
          <>
            <th className="py-3 px-4">شناسه سفارش</th>
            <th className="py-3 px-4">خریدار (Masked)</th>
            <th className="py-3 px-4">مبلغ فاکتور</th>
            <th className="py-3 px-4">وضعیت سفارش</th>
            <th className="py-3 px-4">وضعیت پرداخت</th>
            <th className="py-3 px-4">سفارش شخصی</th>
            <th className="py-3 px-4">تاریخ ثبت</th>
            <th className="py-3 px-4 text-center">مشاهده</th>
          </>
        );
      case 'products':
        return (
          <>
            <th className="py-3 px-4">شناسه</th>
            <th className="py-3 px-4">عنوان کالا</th>
            <th className="py-3 px-4">دسته‌بندی</th>
            <th className="py-3 px-4">قیمت پایه (تومان)</th>
            <th className="py-3 px-4">تنوع‌ها</th>
            <th className="py-3 px-4">شخصی‌سازی</th>
            <th className="py-3 px-4 text-center">مشاهده</th>
          </>
        );
      case 'customers':
        return (
          <>
            <th className="py-3 px-4">شناسه کاربر</th>
            <th className="py-3 px-4">نام کامل</th>
            <th className="py-3 px-4">تلفن همراه (Masked)</th>
            <th className="py-3 px-4">ایمیل (Masked)</th>
            <th className="py-3 px-4">شهر / استان</th>
            <th className="py-3 px-4">تعداد سفارشات</th>
            <th className="py-3 px-4 text-center">مشاهده</th>
          </>
        );
      case 'variants':
        return (
          <>
            <th className="py-3 px-4">کد تنوع (SKU)</th>
            <th className="py-3 px-4">رنگ</th>
            <th className="py-3 px-4">سایز</th>
            <th className="py-3 px-4">موجودی فیزیکی</th>
            <th className="py-3 px-4">رزرو سفارشات</th>
            <th className="py-3 px-4">موجود قابل فروش</th>
            <th className="py-3 px-4 text-center">مشاهده</th>
          </>
        );
      case 'payments':
        return (
          <>
            <th className="py-3 px-4">شناسه تراکنش</th>
            <th className="py-3 px-4">سفارش</th>
            <th className="py-3 px-4">مبلغ (تومان)</th>
            <th className="py-3 px-4">درگاه PSP</th>
            <th className="py-3 px-4">کارت ماسک‌شده</th>
            <th className="py-3 px-4">وضعیت</th>
            <th className="py-3 px-4 text-center">مشاهده</th>
          </>
        );
      case 'designs':
        return (
          <>
            <th className="py-3 px-4">شناسه طرح</th>
            <th className="py-3 px-4">سفارش مرتبط</th>
            <th className="py-3 px-4">عنوان طرح</th>
            <th className="py-3 px-4">موقعیت چاپ</th>
            <th className="py-3 px-4">وضعیت بازبینی</th>
            <th className="py-3 px-4">تاریخ ارسال</th>
            <th className="py-3 px-4 text-center">مشاهده</th>
          </>
        );
      case 'jobs':
        return (
          <>
            <th className="py-3 px-4">کد دستورکار</th>
            <th className="py-3 px-4">سفارش</th>
            <th className="py-3 px-4">تنوع (SKU)</th>
            <th className="py-3 px-4">مرحله تولید</th>
            <th className="py-3 px-4">وضعیت QC</th>
            <th className="py-3 px-4">اولویت</th>
            <th className="py-3 px-4 text-center">مشاهده</th>
          </>
        );
      case 'shipments':
        return (
          <>
            <th className="py-3 px-4">کد مرسوله</th>
            <th className="py-3 px-4">سفارش</th>
            <th className="py-3 px-4">شرکت پستی</th>
            <th className="py-3 px-4">کد رهگیری</th>
            <th className="py-3 px-4">وضعیت بارنامه</th>
            <th className="py-3 px-4">شهر مقصد</th>
            <th className="py-3 px-4 text-center">مشاهده</th>
          </>
        );
      default:
        return <th className="py-3 px-4">داده‌ها</th>;
    }
  };

  const renderTableRow = (item: any) => {
    switch (activeEntity) {
      case 'orders':
        return (
          <>
            <td className="py-3 px-4 font-mono font-bold text-white text-[11px]" dir="ltr">{item.id}</td>
            <td className="py-3 px-4">{item.customerName}</td>
            <td className="py-3 px-4 font-fanum">{toFaDigits(item.totalTomans.toLocaleString())} تومان</td>
            <td className="py-3 px-4"><Badge label={item.status} variant="default" size="sm" /></td>
            <td className="py-3 px-4"><Badge label={item.paymentStatus} variant={item.paymentStatus === 'verified_paid' ? 'success' : 'warning'} size="sm" /></td>
            <td className="py-3 px-4">{item.hasCustomLineItem ? <Badge label="طرح سفارشی" variant="brass" size="sm" /> : <span className="text-stone-500">استاندارد</span>}</td>
            <td className="py-3 px-4 font-mono text-[10px] text-stone-400" dir="ltr">{item.createdAt?.slice(0, 10)}</td>
            <td className="py-3 px-4 text-center">
              <Button variant="secondary" size="sm" onClick={() => setSelectedRecord(item)}>
                <Eye size={12} className="ml-1" />
                بررسی JSON
              </Button>
            </td>
          </>
        );
      case 'products':
        return (
          <>
            <td className="py-3 px-4 font-mono font-bold text-white text-[11px]" dir="ltr">{item.id}</td>
            <td className="py-3 px-4 font-bold text-white">{item.name}</td>
            <td className="py-3 px-4 text-stone-400">{item.category}</td>
            <td className="py-3 px-4 font-fanum">{toFaDigits(item.basePriceTomans?.toLocaleString())}</td>
            <td className="py-3 px-4 font-fanum">{toFaDigits(item.variants?.length || 0)} تنوع</td>
            <td className="py-3 px-4">{item.isCustomizable ? <Badge label="قابلیت چاپ سفارشی" variant="brass" size="sm" /> : <span className="text-stone-500">خیر</span>}</td>
            <td className="py-3 px-4 text-center">
              <Button variant="secondary" size="sm" onClick={() => setSelectedRecord(item)}>
                <Eye size={12} className="ml-1" />
                بررسی JSON
              </Button>
            </td>
          </>
        );
      case 'customers':
        return (
          <>
            <td className="py-3 px-4 font-mono font-bold text-white text-[11px]" dir="ltr">{item.id}</td>
            <td className="py-3 px-4 font-bold text-white">{item.fullName}</td>
            <td className="py-3 px-4 font-mono text-[#eed29d]" dir="ltr">{item.phone}</td>
            <td className="py-3 px-4 font-mono text-stone-400" dir="ltr">{item.email}</td>
            <td className="py-3 px-4">{item.city} / {item.province}</td>
            <td className="py-3 px-4 font-fanum">{toFaDigits(item.totalOrdersCount || 0)} سفارش</td>
            <td className="py-3 px-4 text-center">
              <Button variant="secondary" size="sm" onClick={() => setSelectedRecord(item)}>
                <Eye size={12} className="ml-1" />
                بررسی JSON
              </Button>
            </td>
          </>
        );
      case 'variants':
        const avail = (item.onHandStock || 0) - (item.reservedStock || 0);
        return (
          <>
            <td className="py-3 px-4 font-mono font-bold text-white text-[11px]" dir="ltr">{item.sku}</td>
            <td className="py-3 px-4">{item.colorNameFa || item.color}</td>
            <td className="py-3 px-4 font-bold font-mono">{item.size}</td>
            <td className="py-3 px-4 font-fanum">{toFaDigits(item.onHandStock)}</td>
            <td className="py-3 px-4 font-fanum text-amber-400">{toFaDigits(item.reservedStock)}</td>
            <td className="py-3 px-4 font-fanum font-bold text-emerald-400">{toFaDigits(avail)}</td>
            <td className="py-3 px-4 text-center">
              <Button variant="secondary" size="sm" onClick={() => setSelectedRecord(item)}>
                <Eye size={12} className="ml-1" />
                بررسی JSON
              </Button>
            </td>
          </>
        );
      case 'payments':
        return (
          <>
            <td className="py-3 px-4 font-mono font-bold text-white text-[11px]" dir="ltr">{item.id}</td>
            <td className="py-3 px-4 font-mono text-stone-300" dir="ltr">{item.orderId}</td>
            <td className="py-3 px-4 font-fanum font-bold text-white">{toFaDigits(item.amountTomans?.toLocaleString())}</td>
            <td className="py-3 px-4">{item.gateway || 'سامان کیش (SEP)'}</td>
            <td className="py-3 px-4 font-mono text-stone-400" dir="ltr">{item.cardNumber || '6037-99**-****-1234'}</td>
            <td className="py-3 px-4"><Badge label={item.status} variant={item.status === 'succeeded' || item.status === 'verified' ? 'success' : 'warning'} size="sm" /></td>
            <td className="py-3 px-4 text-center">
              <Button variant="secondary" size="sm" onClick={() => setSelectedRecord(item)}>
                <Eye size={12} className="ml-1" />
                بررسی JSON
              </Button>
            </td>
          </>
        );
      case 'designs':
        return (
          <>
            <td className="py-3 px-4 font-mono font-bold text-white text-[11px]" dir="ltr">{item.id}</td>
            <td className="py-3 px-4 font-mono text-stone-300" dir="ltr">{item.orderId}</td>
            <td className="py-3 px-4 font-bold text-white">{item.title || 'طرح سفارشی کاربر'}</td>
            <td className="py-3 px-4">{item.printPlacement || 'سینه جلو'}</td>
            <td className="py-3 px-4"><Badge label={item.status} variant={item.status === 'approved' ? 'success' : 'warning'} size="sm" /></td>
            <td className="py-3 px-4 font-mono text-[10px] text-stone-400" dir="ltr">{item.submittedAt?.slice(0, 10)}</td>
            <td className="py-3 px-4 text-center">
              <Button variant="secondary" size="sm" onClick={() => setSelectedRecord(item)}>
                <Eye size={12} className="ml-1" />
                بررسی JSON
              </Button>
            </td>
          </>
        );
      case 'jobs':
        return (
          <>
            <td className="py-3 px-4 font-mono font-bold text-white text-[11px]" dir="ltr">{item.id}</td>
            <td className="py-3 px-4 font-mono text-stone-300" dir="ltr">{item.orderId}</td>
            <td className="py-3 px-4 font-mono text-[10px]" dir="ltr">{item.variantSku}</td>
            <td className="py-3 px-4"><Badge label={item.stage} variant="default" size="sm" /></td>
            <td className="py-3 px-4"><Badge label={item.qcStatus} variant={item.qcStatus === 'passed' ? 'success' : 'warning'} size="sm" /></td>
            <td className="py-3 px-4">{item.priority === 'rush' ? <Badge label="فوری" variant="danger" size="sm" /> : <span className="text-stone-500">عادی</span>}</td>
            <td className="py-3 px-4 text-center">
              <Button variant="secondary" size="sm" onClick={() => setSelectedRecord(item)}>
                <Eye size={12} className="ml-1" />
                بررسی JSON
              </Button>
            </td>
          </>
        );
      case 'shipments':
        return (
          <>
            <td className="py-3 px-4 font-mono font-bold text-white text-[11px]" dir="ltr">{item.id}</td>
            <td className="py-3 px-4 font-mono text-stone-300" dir="ltr">{item.orderId}</td>
            <td className="py-3 px-4">{item.carrier === 'tipax' ? 'تیپاکس' : 'پست پیشتاز'}</td>
            <td className="py-3 px-4 font-mono text-[#eed29d]" dir="ltr">{item.trackingCode}</td>
            <td className="py-3 px-4"><Badge label={item.status} variant="default" size="sm" /></td>
            <td className="py-3 px-4">{item.destinationCity}</td>
            <td className="py-3 px-4 text-center">
              <Button variant="secondary" size="sm" onClick={() => setSelectedRecord(item)}>
                <Eye size={12} className="ml-1" />
                بررسی JSON
              </Button>
            </td>
          </>
        );
      default:
        return <td className="py-3 px-4">{JSON.stringify(item)}</td>;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <AdminPageHeader
        title="کاوشگر پایگاه‌داده و کاتالوگ موجودیت‌ها (Restricted Data Explorer)"
        description="محیط بازرسی فقط‌خواندنی جهت دیباگ ساختار ۸ جدول مجاز دامنه با حفاظت هوشمند PII و امکان خروجی کنترل‌شده."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="brass"
              size="sm"
              onClick={() => setIsExportModalOpen(true)}
            >
              <Download size={13} className="ml-1" />
              خروجی امن (Safe Export)
            </Button>
          </div>
        }
      />

      {/* STRICT READ-ONLY SECURITY DISCLAIMER BANNER */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-300">
        <div className="flex items-center gap-2.5">
          <ShieldAlert size={20} className="text-[#ba8d3d] shrink-0" />
          <span>
            <strong>محدودیت دسترسی فقط‌خواندنی (Read-Only Whitelist):</strong> کنسول آزاد SQL، دستورات دستکاری مستقیم (UPDATE / INSERT / DELETE) و حذف جداول در این محیط کاملاً مسدود می‌باشد.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge label="NO ARBITRARY SQL" variant="default" size="sm" />
          <Badge label="PII MASKED" variant="success" size="sm" />
        </div>
      </div>

      {/* Whitelisted Entity Catalog Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {catalogDefinitions.map((cat) => {
          const isSelected = activeEntity === cat.id;
          let count = 0;
          switch (cat.id) {
            case 'products': count = state.products?.length || 0; break;
            case 'variants': count = state.variants?.length || 0; break;
            case 'customers': count = state.customers?.length || 0; break;
            case 'orders': count = state.orders?.length || 0; break;
            case 'payments': count = state.payments?.length || 0; break;
            case 'designs': count = state.customDesigns?.length || 0; break;
            case 'jobs': count = state.productionJobs?.length || 0; break;
            case 'shipments': count = state.shipments?.length || 0; break;
          }

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleTabChange(cat.id)}
              className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#ba8d3d] text-stone-950 border-[#ba8d3d] shadow-lg shadow-[#ba8d3d]/10'
                  : 'bg-[#131211] text-stone-300 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="text-xs font-bold truncate leading-snug">{cat.labelFa}</div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/10 text-[10px]">
                <span className={isSelected ? 'text-stone-900 font-mono' : 'text-stone-400 font-mono'}>
                  {cat.id}
                </span>
                <span className={`px-1.5 py-0.5 rounded font-bold font-fanum ${
                  isSelected ? 'bg-black/20 text-stone-950' : 'bg-white/10 text-stone-300'
                }`}>
                  {toFaDigits(count)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search, View Mode Toggle & Pagination Controls */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={`فیلتر در رکوردهای جدول ${activeEntity}...`}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'table' ? 'bg-[#ba8d3d] text-stone-950' : 'text-stone-400 hover:text-white'
              }`}
            >
              <TableIcon size={13} />
              <span>جدول داده</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('json')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'json' ? 'bg-[#ba8d3d] text-stone-950' : 'text-stone-400 hover:text-white'
              }`}
            >
              <Code size={13} />
              <span>نمای JSON</span>
            </button>
          </div>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-[#1a1817] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
          >
            <option value={10}>۱۰ سطر</option>
            <option value={25}>۲۵ سطر</option>
            <option value={50}>۵۰ سطر</option>
          </select>
        </div>
      </div>

      {/* Main Content: Table or JSON */}
      {viewMode === 'table' ? (
        <div className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#181615] text-stone-400 border-b border-white/10 text-[11px]">
                <tr>{renderTableHeaders()}</tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-stone-500 text-xs">
                      هیچ رکوردی در جدول {activeEntity} مطابق با فیلتر یافت نشد.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-white/[0.02] transition-colors">
                      {renderTableRow(item)}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Server-like Pagination Footer */}
          <div className="p-4 bg-[#181615] border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-400">
            <div className="font-fanum">
              نمایش {toFaDigits(Math.min(totalRecords, (validCurrentPage - 1) * pageSize + 1))} تا{' '}
              {toFaDigits(Math.min(totalRecords, validCurrentPage * pageSize))} از{' '}
              <strong className="text-white font-bold">{toFaDigits(totalRecords)}</strong> رکورد جدول
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronRight size={14} className="ml-1" />
                صفحه قبلی
              </Button>

              <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-mono font-fanum text-stone-300">
                {toFaDigits(validCurrentPage)} / {toFaDigits(totalPages)}
              </span>

              <Button
                variant="secondary"
                size="sm"
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                صفحه بعدی
                <ChevronLeft size={14} className="mr-1" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Formatted JSON Inspector */
        <div className="bg-[#0c0b0a] border border-white/10 rounded-2xl p-4 font-mono text-xs text-stone-300 max-h-[600px] overflow-auto shadow-inner" dir="ltr">
          <pre className="whitespace-pre text-[11px] leading-relaxed">
            {JSON.stringify(paginatedData, null, 2)}
          </pre>
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedRecord(null)}
          title={`ساختار JSON رکورد: ${selectedRecord.id || activeEntity}`}
        >
          <div className="space-y-3" dir="rtl">
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-stone-300">
              داده‌های خام این موجودیت با ماسک‌سازی امنیتی PII (فیلدهای شماره تلفن و ایمیل) نمایش داده می‌شوند.
            </div>

            <div className="bg-[#0b0a09] border border-white/10 rounded-xl p-3 font-mono text-[11px] text-stone-300 overflow-x-auto max-h-80" dir="ltr">
              <pre>{JSON.stringify(selectedRecord, null, 2)}</pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <Button variant="brass" size="sm" onClick={() => setSelectedRecord(null)}>
                بستن پنجره
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Safe Export Permission Dialog */}
      {isExportModalOpen && (
        <Dialog
          isOpen={true}
          onClose={() => setIsExportModalOpen(false)}
          title="دریافت خروجی امن از جدول (Safe Projection Export)"
        >
          <div className="space-y-4 text-xs" dir="rtl">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-amber-200">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-amber-400" />
                <span>الزامات قانونی و محافظت از داده‌های کاربران</span>
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed">
                خروجی استخراج‌شده شامل پروجکشن امن (حذف کلیدهای محرمانه سیستمی و ماسک‌سازی PII) بوده و با برچسب دمو{' '}
                <strong className="text-white font-mono" dir="ltr">[DEMO_EXPORT - SHAWHPOSH_SYNTHETIC_DATA]</strong> نشانه‌گذاری می‌شود.
              </p>
            </div>

            {/* Permission Check Simulation */}
            <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <label className="text-[11px] font-bold text-white block">مجوز استخراج (بررسی سطح دسترسی کاربر):</label>
              <select
                value={exportRole}
                onChange={(e) => setExportRole(e.target.value as any)}
                className="w-full bg-[#1a1817] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#eed29d] font-bold focus:outline-none focus:border-[#ba8d3d]"
              >
                <option value="super_admin">مدیر ارشد (Super Admin) - دارای مجوز صدور خروجی</option>
                <option value="guest_operator">اپراتور کارگاه (اپراتور عادی) - فاقد مجوز استخراج</option>
              </select>
            </div>

            {exportRole !== 'super_admin' ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center text-rose-300 space-y-1">
                <Lock size={20} className="mx-auto text-rose-400" />
                <div className="font-bold">دسترسی مسدود: نیاز به مجوز مدیر ارشد</div>
                <p className="text-[11px] text-stone-400">
                  فقط کاربران دارای سطح دسترسی مدیر ارشد اجازه استخراج فایل داده‌های سامانه را دارند.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-stone-400 text-[11px]">
                  <span>جدول انتخابی: <strong className="text-white font-mono">{activeEntity}</strong></span>
                  <span>تعداد رکوردها: <strong className="text-white font-fanum">{toFaDigits(sanitizedEntityData.length)}</strong></span>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
                  <Button variant="secondary" size="sm" onClick={handleCopyExportJson}>
                    {copiedExport ? <Check size={13} className="ml-1 text-emerald-400" /> : <Copy size={13} className="ml-1" />}
                    {copiedExport ? 'کپی شد!' : 'کپی JSON به کلیپ‌بورد'}
                  </Button>

                  <Button variant="brass" size="sm" onClick={handleDownloadExportJson}>
                    <Download size={13} className="ml-1" />
                    دانلود فایل JSON امن
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
};
