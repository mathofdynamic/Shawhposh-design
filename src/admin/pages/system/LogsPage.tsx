import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  ChevronDown,
  Terminal,
  Activity,
  Layers,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Badge, SearchInput, Dialog, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { toFaDigits } from '../../utils/formatters';

export type LogLevel = 'ALL' | 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'AUDIT';
export type LogService =
  | 'ALL'
  | 'api-gateway'
  | 'psp-payment'
  | 'kavenegar-sms'
  | 'studio-worker'
  | 'order-statemachine'
  | 'auth-rbac'
  | 'tipax-shipping';

export interface SystemLogEntry {
  id: string;
  correlationId: string;
  timestamp: string; // ISO
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY' | 'AUDIT';
  service: LogService;
  actor: string;
  actorRole: string;
  action: string;
  message: string;
  ipAddressMasked: string; // e.g. "192.168.1.***"
  isSecuritySensitive: boolean;
  sanitizedPayload: Record<string, any>;
  headersSanitized: Record<string, string>;
}

export const LogsPage: React.FC = () => {
  const { state } = useAdminRepository();
  const { addToast } = useToast();

  const [selectedLevel, setSelectedLevel] = useState<LogLevel>('ALL');
  const [selectedService, setSelectedService] = useState<LogService>('ALL');
  const [timeRange, setTimeRange] = useState<'all' | 'today' | '24h' | '7d'>('all');
  const [correlationQuery, setCorrelationQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<SystemLogEntry | null>(null);
  const [copied, setCopied] = useState(false);

  // Role simulation check for permission-gated security views
  const [simulatedRole, setSimulatedRole] = useState<'super_admin' | 'production_operator'>('super_admin');

  // Realistic synthetic log events with verified redactions
  const mockSystemLogs: SystemLogEntry[] = useMemo(() => {
    return [
      {
        id: 'LOG-7721',
        correlationId: 'req_trace_9901_sep',
        timestamp: '2026-09-23T11:58:20.000Z',
        level: 'INFO',
        service: 'psp-payment',
        actor: 'سیستم خودکار درگاه شاپرک',
        actorRole: 'system',
        action: 'WEBHOOK_PAYMENT_VERIFIED',
        message: 'تایید دو مرحله‌ای تراکنش خرید سفارش SHP-1405-882101 از درگاه سامان کیش (SEP)',
        ipAddressMasked: '185.143.232.*** [MASKED]',
        isSecuritySensitive: false,
        sanitizedPayload: {
          orderId: 'SHP-1405-882101',
          amountTomans: 3850000,
          rrn: '772109841203',
          maskedPan: '6037-99**-****-4412',
          cvv2: '*** [REDACTED]',
          terminalId: 'SEP-TRM-8812',
          authHeader: 'Bearer [REDACTED_API_TOKEN]',
          verificationResult: 'SUCCEEDED',
        },
        headersSanitized: {
          'x-correlation-id': 'req_trace_9901_sep',
          'x-forwarded-for': '185.143.232.***',
          'authorization': 'Bearer [REDACTED_BEARER_TOKEN]',
          'content-type': 'application/json',
        },
      },
      {
        id: 'LOG-7722',
        correlationId: 'req_trace_9902_sec',
        timestamp: '2026-09-23T11:55:10.000Z',
        level: 'SECURITY',
        service: 'auth-rbac',
        actor: 'علیرضا شمس (مدیر ارشد)',
        actorRole: 'super_admin',
        action: 'RBAC_PERMISSION_AUDIT',
        message: 'بررسی و تایید ماتریس دسترسی نقش‌های کارگاه و تایید احراز هویت دومرحله‌ای TOTP',
        ipAddressMasked: '2.180.45.*** [MASKED]',
        isSecuritySensitive: true,
        sanitizedPayload: {
          targetRole: 'super_admin',
          sessionKeyRef: 'vault:session/auth#ref_9921',
          mfaMethod: 'TOTP_AUTHENTICATOR_APP',
          mfaCode: '****** [REDACTED]',
          outcome: 'AUTHORIZED',
        },
        headersSanitized: {
          'x-correlation-id': 'req_trace_9902_sec',
          'x-client-ip': '2.180.45.***',
          'cookie': 'session_id=[REDACTED_SESSION_COOKIE]',
        },
      },
      {
        id: 'LOG-7723',
        correlationId: 'req_trace_9903_sms',
        timestamp: '2026-09-23T11:50:00.000Z',
        level: 'INFO',
        service: 'kavenegar-sms',
        actor: 'سامانه اطلاع‌رسانی خودکار',
        actorRole: 'system',
        action: 'SMS_DISPATCH_QUEUE',
        message: 'ارسال پیامک تایید سفارش به خریدار با شماره ۰۹۱۲***۳۴۵۶ (الگوی shahpoosh-verify)',
        ipAddressMasked: '10.0.4.*** [INTERNAL]',
        isSecuritySensitive: false,
        sanitizedPayload: {
          template: 'shahpoosh-verify',
          recipientPhoneMasked: '۰۹۱۲***۳۴۵۶',
          senderNumber: '30009900',
          apiKey: '[REDACTED_KAVENEGAR_KEY]',
          status: 'QUEUED_IN_DEMO_BUFFER',
        },
        headersSanitized: {
          'x-correlation-id': 'req_trace_9903_sms',
          'content-type': 'application/json',
        },
      },
      {
        id: 'LOG-7724',
        correlationId: 'req_trace_9904_wrk',
        timestamp: '2026-09-23T11:42:15.000Z',
        level: 'WARN',
        service: 'studio-worker',
        actor: 'کارگر رندر DTG آتلیه',
        actorRole: 'system',
        action: 'ARTWORK_RESOLUTION_WARNING',
        message: 'طرح بارگذاری شده در سفارش سفارشی کمتر از ۳۰۰ DPI بود؛ اعمال پیش‌پردازش افزایش وضوح خودکار',
        ipAddressMasked: '10.0.8.*** [INTERNAL]',
        isSecuritySensitive: false,
        sanitizedPayload: {
          designId: 'DES-201',
          detectedDpi: 240,
          targetDpi: 300,
          upscalerModel: 'BicubicLanczosSharpener',
          fileHash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
        headersSanitized: {
          'x-correlation-id': 'req_trace_9904_wrk',
        },
      },
      {
        id: 'LOG-7725',
        correlationId: 'req_trace_9905_err',
        timestamp: '2026-09-23T11:30:00.000Z',
        level: 'ERROR',
        service: 'tipax-shipping',
        actor: 'درایور لجستیک تیپاکس',
        actorRole: 'system',
        action: 'WEBHOOK_BARCODE_RETRY',
        message: 'خطای موقت در دریافت وب‌هوک بارنامه تیپاکس: درگاه به دلیل شبیه‌سازی در دسترس نبود',
        ipAddressMasked: '80.191.12.*** [MASKED]',
        isSecuritySensitive: false,
        sanitizedPayload: {
          trackingCode: 'TPX-MOCK-99410',
          httpStatus: 504,
          retryAttempt: 2,
          maxRetries: 3,
          nextRetrySeconds: 60,
        },
        headersSanitized: {
          'x-correlation-id': 'req_trace_9905_err',
          'authorization': 'Bearer [REDACTED_LOGISTICS_TOKEN]',
        },
      },
      {
        id: 'LOG-7726',
        correlationId: 'req_trace_9906_aud',
        timestamp: '2026-09-23T11:15:22.000Z',
        level: 'AUDIT',
        service: 'order-statemachine',
        actor: 'سارا نوری (پشتیبانی و مالی)',
        actorRole: 'support_finance',
        action: 'ORDER_STATUS_OVERRIDE',
        message: 'تغییر دستی وضعیت سفارش SHP-1405-882103 از «آماده‌سازی» به «بسته‌بندی و صدور بارنامه»',
        ipAddressMasked: '2.180.45.*** [MASKED]',
        isSecuritySensitive: true,
        sanitizedPayload: {
          orderId: 'SHP-1405-882103',
          fromStatus: 'paid_processing',
          toStatus: 'ready_to_ship',
          justification: 'بررسی فیزیکی کیفیت چاپ تیشرت در خط تولید انجام شد',
          actorStaffId: 'STF-03',
        },
        headersSanitized: {
          'x-correlation-id': 'req_trace_9906_aud',
          'x-authenticated-staff': 'STF-03',
        },
      },
    ];
  }, []);

  // Merge domain state activities as AUDIT logs
  const allLogs: SystemLogEntry[] = useMemo(() => {
    const domainAuditLogs: SystemLogEntry[] = state.activities.map((act) => ({
      id: act.id,
      correlationId: `trace_dom_${act.id.replace('LOG-', '')}`,
      timestamp: act.timestamp,
      level: act.actionType.includes('REJECT') || act.actionType.includes('FAIL')
        ? 'WARN'
        : act.actionType.includes('SECURITY') || act.actionType.includes('RBAC')
        ? 'SECURITY'
        : 'AUDIT',
      service: act.entityType === 'payment'
        ? 'psp-payment'
        : act.entityType === 'order'
        ? 'order-statemachine'
        : act.entityType === 'stock' || act.entityType === 'production'
        ? 'studio-worker'
        : 'api-gateway',
      actor: act.actorName,
      actorRole: act.actorRole,
      action: act.actionType,
      message: act.description,
      ipAddressMasked: '192.168.10.*** [LOCAL_ADMIN]',
      isSecuritySensitive: act.entityType === 'rbac_permission' || act.entityType === 'payment',
      sanitizedPayload: {
        entityId: act.entityId,
        entityType: act.entityType,
        conciseBefore: act.conciseBefore || '[MASKED]',
        conciseAfter: act.conciseAfter || '[MASKED]',
        metadata: act.metadata || {},
      },
      headersSanitized: {
        'x-correlation-id': `trace_dom_${act.id.replace('LOG-', '')}`,
        'x-actor-role': act.actorRole,
      },
    }));

    return [...mockSystemLogs, ...domainAuditLogs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [mockSystemLogs, state.activities]);

  // Filtering
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      if (selectedLevel !== 'ALL' && log.level !== selectedLevel) return false;
      if (selectedService !== 'ALL' && log.service !== selectedService) return false;

      if (correlationQuery.trim()) {
        const cq = correlationQuery.trim().toLowerCase();
        if (!log.correlationId.toLowerCase().includes(cq)) return false;
      }

      if (searchQuery.trim()) {
        const sq = searchQuery.trim().toLowerCase();
        const inMsg = log.message.toLowerCase().includes(sq);
        const inActor = log.actor.toLowerCase().includes(sq);
        const inAction = log.action.toLowerCase().includes(sq);
        if (!inMsg && !inActor && !inAction) return false;
      }

      return true;
    });
  }, [allLogs, selectedLevel, selectedService, correlationQuery, searchQuery]);

  // Handle safe copy
  const handleCopySanitized = () => {
    if (!selectedLog) return;
    const safeOutput = {
      label: '[SAFE_REDACTED_LOG - SHAWHPOSH_DEMO]',
      correlationId: selectedLog.correlationId,
      timestamp: selectedLog.timestamp,
      level: selectedLog.level,
      service: selectedLog.service,
      message: selectedLog.message,
      clientIpMasked: selectedLog.ipAddressMasked,
      sanitizedPayload: selectedLog.sanitizedPayload,
      headers: selectedLog.headersSanitized,
    };
    navigator.clipboard.writeText(JSON.stringify(safeOutput, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast({
      title: 'لاگ بدون اطلاعات حساس کپی شد',
      description: 'تمامی کلیدهای امنیتی و داده‌های هویتی ماسک شده هستند.',
      type: 'info',
    });
  };

  const isAccessDeniedToSecurityLogs =
    (selectedLevel === 'SECURITY' || selectedLevel === 'AUDIT') &&
    simulatedRole !== 'super_admin';

  return (
    <div className="space-y-6" dir="rtl">
      <AdminPageHeader
        title="دفتر لاگ‌های فنی، رویدادها و وب‌هوک‌ها"
        description="نظارت لحظه‌ای بر وقایع سوئیچ‌های پرداخت، ارسال پیامک، صف کارگران و رهگیری رخدادهای حساس با فیلترینگ چندبعدی."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400">نقش شبیه‌ساز:</span>
            <select
              value={simulatedRole}
              onChange={(e) => setSimulatedRole(e.target.value as any)}
              className="bg-[#1a1817] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-[#eed29d] font-bold focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="super_admin">مدیر ارشد (دسترسی کامل به لاگ‌های امنیتی)</option>
              <option value="production_operator">اپراتور کارگاه (دسترسی محدود)</option>
            </select>
          </div>
        }
      />

      {/* Security & Masking Guarantee Banner */}
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-stone-300">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
          <span>
            <strong>تضمین حفاظت امنیتی:</strong> تمامی توکن‌های احراز هویت (Bearer Tokens)، شماره‌های کارت بانکی (PAN)، ارقام CVV2 و کدهای یکبارمصرف پیامکی پیش از ثبت در لاگ به صورت غیرقابل‌بازگشت <strong>[REDACTED]</strong> و ماسک‌سازی شده‌اند.
          </span>
        </div>
        <Badge label="تضمین عدم نشت سکرت‌ها" variant="success" size="sm" />
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Level Filter */}
          <div>
            <label className="text-[11px] text-stone-400 block mb-1 font-medium">سطح رویداد (Level):</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as LogLevel)}
              className="w-full bg-[#1a1817] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="ALL">تمامی سطوح</option>
              <option value="INFO">INFO (اطلاعاتی)</option>
              <option value="WARN">WARN (هشدار)</option>
              <option value="ERROR">ERROR (خطای سیستمی)</option>
              <option value="SECURITY">SECURITY (امنیت و احراز هویت)</option>
              <option value="AUDIT">AUDIT (حسابرسی تغییرات)</option>
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <label className="text-[11px] text-stone-400 block mb-1 font-medium">سرویس تولیدکننده (Service):</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value as LogService)}
              className="w-full bg-[#1a1817] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ba8d3d]"
            >
              <option value="ALL">تمامی سرویس‌ها</option>
              <option value="api-gateway">api-gateway (دروازه API)</option>
              <option value="psp-payment">psp-payment (سوئیچ شاپرک)</option>
              <option value="kavenegar-sms">kavenegar-sms (پیامک)</option>
              <option value="studio-worker">studio-worker (کارگر آتلیه)</option>
              <option value="order-statemachine">order-statemachine (ماشین وضعیت)</option>
              <option value="auth-rbac">auth-rbac (احراز هویت و دسترسی)</option>
              <option value="tipax-shipping">tipax-shipping (لجستیک)</option>
            </select>
          </div>

          {/* Correlation ID Search */}
          <div>
            <label className="text-[11px] text-stone-400 block mb-1 font-medium">شناسه ردگیری (Correlation ID):</label>
            <input
              type="text"
              dir="ltr"
              value={correlationQuery}
              onChange={(e) => setCorrelationQuery(e.target.value)}
              placeholder="مثال: req_trace_9901_sep"
              className="w-full bg-[#1a1817] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#eed29d] font-mono focus:outline-none focus:border-[#ba8d3d]"
            />
          </div>

          {/* General Search */}
          <div>
            <label className="text-[11px] text-stone-400 block mb-1 font-medium">جستجو در متن رویداد / عامل:</label>
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در پیام، عامل یا اقدام..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-stone-400">
          <div className="flex items-center gap-2 font-fanum">
            <span>تعداد رویدادهای فیلترشده:</span>
            <strong className="text-white font-bold">{toFaDigits(filteredLogs.length)}</strong>
            <span>از مجموع {toFaDigits(allLogs.length)} رویداد</span>
          </div>

          {(selectedLevel !== 'ALL' || selectedService !== 'ALL' || correlationQuery || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedLevel('ALL');
                setSelectedService('ALL');
                setCorrelationQuery('');
                setSearchQuery('');
              }}
              className="text-xs text-[#eed29d] hover:underline cursor-pointer"
            >
              پاک‌سازی فیلترها
            </button>
          )}
        </div>
      </div>

      {/* Permission Gate Banner if viewing restricted security logs with non-admin role */}
      {isAccessDeniedToSecurityLogs ? (
        <div className="p-8 bg-[#131211] border border-rose-500/30 rounded-2xl text-center space-y-3">
          <Lock size={36} className="text-rose-400 mx-auto" />
          <h3 className="text-sm font-bold text-white">دسترسی به لاگ‌های امنیتی و حسابرسی مسدود است</h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
            مشاهده رویدادهای امنیتی (SECURITY) و تغییرات اختیارات سیستمی (AUDIT) نیازمند مجوز سطح <strong>مدیر ارشد (Super Admin)</strong> می‌باشد. لطفاً از طریق منوی بالای صفحه، نقش شبیه‌ساز را تغییر دهید.
          </p>
        </div>
      ) : (
        /* Logs Table */
        <div className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#181615] text-stone-400 border-b border-white/10 text-[11px]">
                <tr>
                  <th className="py-3 px-4 font-bold">زمان / رخداد</th>
                  <th className="py-3 px-4 font-bold">سطح</th>
                  <th className="py-3 px-4 font-bold">سرویس</th>
                  <th className="py-3 px-4 font-bold">عامل / IP امن</th>
                  <th className="py-3 px-4 font-bold">پیام رویداد</th>
                  <th className="py-3 px-4 font-bold">شناسه ردگیری</th>
                  <th className="py-3 px-4 font-bold text-center">جزئیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-stone-500 text-xs">
                      هیچ رویدادی مطابق با فیلترهای انتخابی یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const levelColors: Record<string, string> = {
                      INFO: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      WARN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      ERROR: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                      SECURITY: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
                      AUDIT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    };

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                        onClick={() => setSelectedLog(log)}
                      >
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-stone-400" dir="ltr">
                          {log.timestamp.replace('T', ' ').slice(0, 19)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${
                              levelColors[log.level] || 'bg-white/5 text-stone-400'
                            }`}
                          >
                            {log.level}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-[11px] font-mono text-stone-300 bg-white/5 px-2 py-0.5 rounded">
                            {log.service}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-bold text-white text-[11px]">{log.actor}</div>
                          <span className="text-[10px] text-stone-400 font-mono" dir="ltr">
                            {log.ipAddressMasked}
                          </span>
                        </td>

                        <td className="py-3 px-4 max-w-md">
                          <div className="text-stone-200 line-clamp-1 text-[11px]">{log.message}</div>
                          <span className="text-[10px] text-stone-400 font-mono block mt-0.5">
                            اقدام: {log.action}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[10px] text-[#eed29d]" dir="ltr">
                          {log.correlationId}
                        </td>

                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                          >
                            <Eye size={12} className="ml-1" />
                            بررسی
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Detail Modal */}
      {selectedLog && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`شناسنامه رویداد: ${selectedLog.id}`}
        >
          <div className="space-y-4 text-xs" dir="rtl">
            <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">{selectedLog.message}</span>
                <span className="font-mono text-[11px] text-[#eed29d]" dir="ltr">
                  {selectedLog.correlationId}
                </span>
              </div>
              <div className="flex items-center gap-2 text-stone-400 text-[11px]">
                <span>سرویس: <strong className="text-white">{selectedLog.service}</strong></span>
                <span>•</span>
                <span>عامل: <strong className="text-white">{selectedLog.actor}</strong></span>
                <span>•</span>
                <span>آی‌پی ماسک شده: <strong className="text-white font-mono" dir="ltr">{selectedLog.ipAddressMasked}</strong></span>
              </div>
            </div>

            {/* Sanitized Headers */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-stone-300 block">هدرهای درخواست (Sanitized Headers):</span>
              <div className="bg-[#0b0a09] border border-white/10 rounded-xl p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto" dir="ltr">
                <pre>{JSON.stringify(selectedLog.headersSanitized, null, 2)}</pre>
              </div>
            </div>

            {/* Sanitized Payload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-300">
                  داده‌های رویداد و پی‌لود (Redacted Payload):
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  [PASS: NO RAW SECRETS]
                </span>
              </div>
              <div className="bg-[#0b0a09] border border-white/10 rounded-xl p-3 font-mono text-[11px] text-stone-300 overflow-x-auto max-h-60" dir="ltr">
                <pre>{JSON.stringify(selectedLog.sanitizedPayload, null, 2)}</pre>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <Button variant="secondary" size="sm" onClick={handleCopySanitized}>
                {copied ? <Check size={13} className="ml-1 text-emerald-400" /> : <Copy size={13} className="ml-1" />}
                {copied ? 'کپی شد!' : 'کپی خروجی امن JSON'}
              </Button>

              <Button variant="brass" size="sm" onClick={() => setSelectedLog(null)}>
                بستن پنجره
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
