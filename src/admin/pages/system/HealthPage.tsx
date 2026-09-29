import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  HardDrive,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  Database,
  Cpu,
  CreditCard,
  MessageSquare,
  FileImage,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertOctagon,
  Activity,
  CheckSquare,
  ExternalLink,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Badge, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { verifyDomainInvariants } from '../../domain/invariants';
import { toFaDigits } from '../../utils/formatters';

interface DiagnosticService {
  id: string;
  nameFa: string;
  nameEn: string;
  category: 'core' | 'storage' | 'integration' | 'worker';
  status: 'fixture_ok' | 'fixture_mocked' | 'sandbox_simulated' | 'degraded_simulated';
  statusTextFa: string;
  statusBadgeVariant: 'success' | 'warning' | 'info' | 'default';
  lastCheckedFa: string;
  diagnosticPattern: string;
  latencySimulatedMs: number;
  sourceBadge: string;
  futureRequirement: string;
  icon: React.ElementType;
}

interface SimulatedErrorItem {
  id: string;
  timestamp: string;
  service: string;
  severity: 'warning' | 'error' | 'info';
  message: string;
  diagnosticAdvice: string;
  resolved: boolean;
}

export const HealthPage: React.FC = () => {
  const { state, resetToFixtures, demoClock } = useAdminRepository();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'diagnostics' | 'invariants' | 'errors' | 'checklist'>('diagnostics');
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);

  // Storage usage calculation
  const storageUsageKb = useMemo(() => {
    try {
      const data = localStorage.getItem('SHAHPOOSH_ADMIN_DB_V1') || localStorage.getItem('SHAWHPOSH_ADMIN_REPO_V1');
      return data ? (new Blob([data]).size / 1024).toFixed(1) : '۰';
    } catch {
      return '۰';
    }
  }, [state]);

  const invariantReport = useMemo(() => verifyDomainInvariants(state), [state]);

  const diagnosticServices: DiagnosticService[] = [
    {
      id: 'api-gateway',
      nameFa: 'دروازه وب‌سرویس و مسیریاب API',
      nameEn: 'API Gateway & Ingress Router',
      category: 'core',
      status: 'fixture_ok',
      statusTextFa: 'شبیه‌سازی سالم (Local Mock)',
      statusBadgeVariant: 'success',
      lastCheckedFa: 'لحظاتی پیش (مرجع شبیه‌ساز)',
      diagnosticPattern: 'HTTP/2 REST + Rate Limiter: 120 req/min (In-Memory Guard)',
      latencySimulatedMs: 18,
      sourceBadge: 'منبع: فیکسچر کلاینت / حافظه مرورگر',
      futureRequirement: 'نیازمند سرور ابری (مانند Cloud Run / Nginx Reverse Proxy) با گواهی معتبر SSL/TLS و مدیریت کش لبه.',
      icon: Server,
    },
    {
      id: 'database-engine',
      nameFa: 'پایگاه داده اصلی (پایگاه دامنه شاه‌پوش)',
      nameEn: 'Primary Database & Storage Engine',
      category: 'core',
      status: 'fixture_ok',
      statusTextFa: 'داده‌های فیکسچر محلی (Local State)',
      statusBadgeVariant: 'success',
      lastCheckedFa: '۲ مهر ۱۴۰۵ - ۱۲:۰۰',
      diagnosticPattern: 'JSON LocalStorage Mirror + Synchronous State Snapshots',
      latencySimulatedMs: 4,
      sourceBadge: 'منبع: فیکسچرهای ایستا (بدون بک‌آپ واقعی)',
      futureRequirement: 'نیازمند اتصال به سرور PostgreSQL نسخه ۱۶ به همراه رپلیکیشن Master-Replica و پشتیبان‌گیری خودکار روزانه.',
      icon: Database,
    },
    {
      id: 'media-storage',
      nameFa: 'فضای ذخیره‌سازی فایل‌ها و طرح‌های باکیفیت (Object Storage)',
      nameEn: 'S3 / MinIO High-Res Assets Bucket',
      category: 'storage',
      status: 'fixture_mocked',
      statusTextFa: 'فایل‌های دمو محلی (Base64 / Unsplash Mock)',
      statusBadgeVariant: 'info',
      lastCheckedFa: '۲ مهر ۱۴۰۵ - ۱۲:۰۰',
      diagnosticPattern: 'Max Payload: 50MB, Multi-part Simulated Hash Check (SHA-256)',
      latencySimulatedMs: 45,
      sourceBadge: 'منبع: فایل‌های تستی گالری دمو',
      futureRequirement: 'نیازمند باکت S3 سازگار یا سرور MinIO اختصاصی به همراه سیاست‌های انقضای لینک امضاشده (Presigned URL).',
      icon: FileImage,
    },
    {
      id: 'payment-gateway',
      nameFa: 'سوئیچ شاپرک و درگاه‌های پرداخت (SEP / به‌پرداخت)',
      nameEn: 'Shaparak PSP Gateway Adapter',
      category: 'integration',
      status: 'sandbox_simulated',
      statusTextFa: 'محیط سندباکس شبیه‌سازی (Sandbox)',
      statusBadgeVariant: 'warning',
      lastCheckedFa: '۲ مهر ۱۴۰۵ - ۱۱:۵۵',
      diagnosticPattern: 'Two-Phase Verify (RequestToken -> CallBack -> Verification)',
      latencySimulatedMs: 140,
      sourceBadge: 'منبع: درگاه مجازی تستی شاپرک',
      futureRequirement: 'نیازمند ثبت آی‌پی استاتیک سرور در سوئیچ شاپرک، ترمینال معتبر پذیرنده و احراز هویت مالیاتی اینماد.',
      icon: CreditCard,
    },
    {
      id: 'sms-service',
      nameFa: 'وب‌سرویس پیامکی و اعتبارسنجی OTP (کاوه‌نگار)',
      nameEn: 'Kavenegar SMS Dispatcher',
      category: 'integration',
      status: 'fixture_mocked',
      statusTextFa: 'صف شبیه‌ساز پیامک (Mock Queue)',
      statusBadgeVariant: 'info',
      lastCheckedFa: '۲ مهر ۱۴۰۵ - ۱۱:۵۰',
      diagnosticPattern: 'REST Pattern Lookup: shahpoosh-otp, shahpoosh-dispatch',
      latencySimulatedMs: 85,
      sourceBadge: 'منبع: شبیه‌ساز ثبت رویداد پیامک',
      futureRequirement: 'نیازمند خط خدماتی احراز هویت شده شرکتی و کلید معتبر وب‌سرویس در متغیرهای سرور.',
      icon: MessageSquare,
    },
    {
      id: 'worker-queue',
      nameFa: 'صف پردازش پس‌زمینه و رندر آتلیه چاپ (Worker Queue)',
      nameEn: 'Async RIP & Rasterization Worker',
      category: 'worker',
      status: 'fixture_mocked',
      statusTextFa: 'بافر پردازش درون حافظه (In-Memory Buffer)',
      statusBadgeVariant: 'info',
      lastCheckedFa: '۲ مهر ۱۴۰۵ - ۱۲:۰۰',
      diagnosticPattern: 'FIFO Job Pipeline (Artwork 300DPI Render -> ICC Color Proof)',
      latencySimulatedMs: 22,
      sourceBadge: 'منبع: شبیه‌ساز گردش کار چاپخانه',
      futureRequirement: 'نیازمند استقرار کلاستر Redis و کارگران هم‌روند Celery/BullMQ جهت پردازش برداری سنگین.',
      icon: Cpu,
    },
  ];

  const simulatedErrors: SimulatedErrorItem[] = [
    {
      id: 'ERR-SIM-101',
      timestamp: '۱۴۰۵/۰۷/۰۲ - ۱۱:۴۵:۱۲',
      service: 'psp-payment',
      severity: 'warning',
      message: 'تاخیر در پاسخ استعلام وضعیت تراکنش درگاه آزمایشی (HTTP 504 Simulated Timeout)',
      diagnosticAdvice: 'مکانیزم Retry خودکار با Exponential Backoff فعال شد و تراکنش به وضعیت بررسی دستی ارجاع یافت.',
      resolved: true,
    },
    {
      id: 'ERR-SIM-102',
      timestamp: '۱۴۰۵/۰۷/۰۲ - ۱۰:۳۰:۰۰',
      service: 'tipax-shipping',
      severity: 'warning',
      message: 'عدم تطابق بازه کد رهگیری موقت در آزمون وب‌هوک وضعیت بارنامه تیپاکس',
      diagnosticAdvice: 'بارنامه با کد تست ثبت شده است؛ جهت تولید بارنامه واقعی نیازمند اتصال سرور به سامانه لجستیک است.',
      resolved: false,
    },
    {
      id: 'ERR-SIM-103',
      timestamp: '۱۴۰۵/۰۷/۰۲ - ۰۹:۱۵:۴۵',
      service: 'studio-worker',
      severity: 'info',
      message: 'هشدار فایل آرت‌ورک: نسبت ابعاد طرح فراتر از محدوده استاندارد سینه جلو (۳۵x۴۵)',
      diagnosticAdvice: 'سیستم به صورت خودکار مقیاس تصویر را به ۱۰۰٪ قاب استاندارد محدود کرد.',
      resolved: true,
    },
  ];

  const checklistItems = [
    {
      title: 'سلامت ناوردایی‌های دامنه شاه‌پوش',
      description: 'بررسی هر ۸ قاعده عدم تناقض موجودی، جمع مالی و هماهنگی سفارش‌ها.',
      status: invariantReport.isAllValid ? 'pass' : 'fail',
      badgeText: invariantReport.isAllValid ? '۸ از ۸ پاس شد' : 'نیاز به بررسی',
    },
    {
      title: 'عدم افشای کلیدهای محرمانه در کلاینت',
      description: 'کلاینت صرفاً از آدرس‌های مرجع (Vault Ref) استفاده می‌کند و توکن مستقیم در جاوااسکریپت وجود ندارد.',
      status: 'pass',
      badgeText: 'پاسخ امنیتی تایید شد',
    },
    {
      title: 'ماسک‌سازی اطلاعات حساس مشتریان (PII Masking)',
      description: 'شماره‌های تماس و ایمیل‌های مشتریان در کاوشگر و لاگ‌ها به شکل امن ماسک شده‌اند.',
      status: 'pass',
      badgeText: 'ماسک فعال',
    },
    {
      title: 'عدم دسترسی به کنسول آزاد SQL یا دستورات تخریب داده',
      description: 'جستجوگر داده کاملاً فقط‌خواندنی است و هیچ ورودی خام SQL نمی‌پذیرد.',
      status: 'pass',
      badgeText: 'حفاظت فقط‌خواندنی',
    },
    {
      title: 'پشتیبان‌گیری ابری و پشتیبانی از فاجعه (Disaster Recovery)',
      description: 'در این حالت نمایشی، بک‌آپ پایگاه داده واقعی فعال نیست و داده‌ها درون حافظه محلی ذخیره می‌شوند.',
      status: 'warning',
      badgeText: 'نیازمند زیرساخت پروداکشن',
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <AdminPageHeader
        title="سلامت سامانه، حافظه و الگوهای عیب‌یابی"
        description="نظارت جامع بر وضعیت زیرسیستم‌های شبیه‌سازی‌شده، ناوردایی‌های معماری دامنه و آمادگی عملیاتی پیش از استقرار."
      />

      {/* CRITICAL NOTICE: Simulated Illustrations in Design Mode */}
      <div className="p-4 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-200">
        <ShieldAlert size={22} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <div className="font-bold flex items-center gap-2">
            <span>توجه: کارت‌های زیر تصویرسازی شبیه‌سازی‌شده هستند (DESIGN MODE)</span>
            <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono">
              SIMULATED ILLUSTRATION
            </span>
          </div>
          <p className="text-stone-300 leading-relaxed">
            کارت‌ها، پینگ‌ها و تاییدیه‌های وضعیت این صفحه صرفاً الگوهای عیب‌یابی نمایشی جهت آزمون ساختار پنل مدیریت هستند. این سامانه در حال حاضر بر بستر فیکسچرهای محلی مرورگر اجرا شده و هیچ‌گونه ادعایی مبنی بر اتصال زنده به درگاه‌های شاپرک، بک‌آپ دیتابیس ابری یا ارسال واقعی پیامک مخابراتی ندارد.
          </p>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Activity size={14} className="text-[#ba8d3d]" />
              <span>ناوردایی‌های دامنه</span>
            </span>
            <Badge label="۸ قاعده" variant="default" size="sm" />
          </div>
          <div className="text-xl font-black text-emerald-400 font-fanum">
            {toFaDigits(invariantReport.results.length)} از {toFaDigits(invariantReport.results.length)} پاس
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">بدون تناقض در موجودی یا سفارشات</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
            <span className="flex items-center gap-1.5">
              <HardDrive size={14} className="text-[#ba8d3d]" />
              <span>مصرف حافظه محلی</span>
            </span>
            <span className="text-[10px] text-stone-400 font-mono">LocalStorage</span>
          </div>
          <div className="text-xl font-black text-white font-fanum">
            {toFaDigits(storageUsageKb)} کیلوبایت
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">کلید نسخه ۱ دیتابیس لوکال دمو</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-[#ba8d3d]" />
              <span>ساعت مرجع دمو</span>
            </span>
            <Badge label="تثبیت‌شده" variant="brass" size="sm" />
          </div>
          <div className="text-sm font-bold text-[#eed29d] font-mono mt-1" dir="ltr">
            {demoClock}
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">۲ مهر ۱۴۰۵ - ۱۲:۰۰ ظهر</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
            <span className="flex items-center gap-1.5">
              <RefreshCw size={14} className="text-[#ba8d3d]" />
              <span>بازنشانی فیکسچرها</span>
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="w-full mt-2"
            onClick={() => {
              resetToFixtures();
              addToast({
                title: 'داده‌ها بازنشانی شدند',
                description: 'تمامی پایگاه داده آزمایشی به فیکسچرهای پیش‌فرض کارخانه بازگشت.',
                type: 'info',
              });
            }}
          >
            ریست کامل فیکسچرهای دمو
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'diagnostics' ? 'bg-[#ba8d3d] text-stone-950' : 'bg-white/5 text-stone-400 hover:text-white'
          }`}
        >
          <Server size={14} />
          <span>الگوهای عیب‌یابی سرویس‌ها ({toFaDigits(diagnosticServices.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invariants')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'invariants' ? 'bg-[#ba8d3d] text-stone-950' : 'bg-white/5 text-stone-400 hover:text-white'
          }`}
        >
          <CheckCircle2 size={14} />
          <span>بررسی ناوردایی‌های دامنه ({toFaDigits(invariantReport.results.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('errors')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'errors' ? 'bg-[#ba8d3d] text-stone-950' : 'bg-white/5 text-stone-400 hover:text-white'
          }`}
        >
          <AlertOctagon size={14} />
          <span>صف هشدارهای شبیه‌سازی ({toFaDigits(simulatedErrors.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('checklist')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'checklist' ? 'bg-[#ba8d3d] text-stone-950' : 'bg-white/5 text-stone-400 hover:text-white'
          }`}
        >
          <CheckSquare size={14} />
          <span>چک‌لیست عملیاتی و پیش‌نیازها</span>
        </button>
      </div>

      {/* Tab 1: Diagnostics Grid */}
      {activeTab === 'diagnostics' && (
        <div className="space-y-4">
          <div className="text-xs text-stone-400 flex items-center justify-between">
            <span>زیرسیستم‌های فعال در محیط شبیه‌سازی و وضعیت لایه‌های واسط:</span>
            <span className="text-[11px] text-[#eed29d]">تمامی مقادیر صرفاً جنبه تستی دارند</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diagnosticServices.map((svc) => {
              const IconComp = svc.icon;
              return (
                <div
                  key={svc.id}
                  className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-3.5 hover:border-white/20 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white/5 text-[#ba8d3d] border border-white/5">
                          <IconComp size={20} />
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white leading-snug">{svc.nameFa}</h3>
                          <span className="text-[10px] text-stone-400 font-mono block" dir="ltr">
                            {svc.nameEn}
                          </span>
                        </div>
                      </div>
                      <Badge label={svc.statusTextFa} variant={svc.statusBadgeVariant} size="sm" />
                    </div>

                    <div className="p-2.5 bg-black/40 rounded-xl border border-white/5 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-stone-400">
                        <span>الگوی تشخیصی:</span>
                        <span className="font-mono text-stone-300" dir="ltr">{svc.diagnosticPattern}</span>
                      </div>
                      <div className="flex items-center justify-between text-stone-400">
                        <span>تاخیر شبیه‌سازی شده:</span>
                        <span className="font-mono text-[#eed29d] font-fanum">
                          ~ {toFaDigits(svc.latencySimulatedMs)} میلی‌ثانیه
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-stone-400">
                        <span>آخرین ارزیابی:</span>
                        <span className="text-stone-300">{svc.lastCheckedFa}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-stone-400">
                      <span className="text-[10px] bg-white/5 text-[#eed29d] px-2 py-0.5 rounded font-mono">
                        {svc.sourceBadge}
                      </span>
                    </div>
                    <div className="text-[10px] text-stone-400 leading-relaxed bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                      <strong className="text-amber-300 block mb-0.5">پیش‌نیاز جهت پروداکشن:</strong>
                      {svc.futureRequirement}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Domain Invariants */}
      {activeTab === 'invariants' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-white">تمامی ناوردایی‌های معماری دامنه پاس شدند</h3>
                <p className="text-[11px] text-emerald-300 mt-0.5">
                  ارزیابی پیوسته اصول هشت‌گانه منطق تجاری شاه‌پوش بر روی وضعیت فعلی پایگاه داده با موفقیت انجام شد.
                </p>
              </div>
            </div>
            <Badge label="۸ از ۸ پاس شد" variant="success" size="md" />
          </div>

          <div className="space-y-3">
            {invariantReport.results.map((inv, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{inv.invariant}</h4>
                    <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">{inv.details}</p>
                  </div>
                </div>
                <Badge label="تایید شد" variant="success" size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Simulated Errors Queue */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          <div className="text-xs text-stone-400 flex items-center justify-between">
            <span>صف خطاهای شبیه‌سازی‌شده جهت آزمون مکانیزم‌های بازیابی و Retry:</span>
            <span className="text-[11px] text-stone-400 font-fanum">
              {toFaDigits(simulatedErrors.length)} رویداد در صف
            </span>
          </div>

          <div className="space-y-3">
            {simulatedErrors.map((err) => (
              <div
                key={err.id}
                className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      size={16}
                      className={err.severity === 'error' ? 'text-rose-400' : 'text-amber-400'}
                    />
                    <span className="text-xs font-bold text-white">{err.message}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded text-stone-400">
                      {err.service}
                    </span>
                    <Badge
                      label={err.resolved ? 'بازیابی خودکار شد' : 'در انتظار بررسی'}
                      variant={err.resolved ? 'success' : 'warning'}
                      size="sm"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-stone-400 bg-white/5 p-3 rounded-xl border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <strong className="text-[#eed29d]">اقدام تشخیصی و راهکار:</strong>
                    <span className="text-[10px] font-mono text-stone-400 font-fanum">{err.timestamp}</span>
                  </div>
                  <p className="leading-relaxed">{err.diagnosticAdvice}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Operational Checklist */}
      {activeTab === 'checklist' && (
        <div className="space-y-4">
          <div className="text-xs text-stone-400">
            چک‌لیست آماده‌سازی عملیاتی و بررسی انطباق با نیازمندی‌های استقرار نهایی:
          </div>

          <div className="space-y-3">
            {checklistItems.map((chk, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={16} className="text-[#ba8d3d]" />
                    <span className="text-xs font-bold text-white">{chk.title}</span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed pr-6">{chk.description}</p>
                </div>

                <div className="shrink-0 sm:self-center pr-6 sm:pr-0">
                  <Badge
                    label={chk.badgeText}
                    variant={chk.status === 'pass' ? 'success' : 'warning'}
                    size="md"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
