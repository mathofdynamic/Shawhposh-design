import React, { useState } from 'react';
import {
  Bell,
  MessageSquare,
  Smartphone,
  Mail,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
  Info,
  Layers,
  Search,
  Eye,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { NotificationTemplate, SimulatedNotificationLog } from '../../domain/types';
import { renderNotificationTemplate } from '../../domain/shippingReturnsNotifications';
import { toFaDigits } from '../../utils/formatters';

export const NotificationsPage: React.FC = () => {
  const {
    getNotificationTemplates,
    getSimulatedNotificationLogs,
    sendSimulatedNotification,
  } = useAdminRepository();
  const { addToast } = useToast();

  const templates = getNotificationTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    templates[0]?.id || 'TPL-ORD-CONFIRM'
  );

  const activeTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0];

  // Dynamic variable values input
  const [varInputs, setVarInputs] = useState<Record<string, string>>({
    customer_name: 'آرمان شریفی',
    order_id: 'SHP-1405-882101',
    items_count: '۲',
    total_amount: '۱,۳۹۰,۰۰۰',
    amount: '۲,۱۵۰,۰۰۰',
    gateway_ref: 'REF-771405',
    design_title: 'کالیگرافی سیمرغ طلایی',
    garment_name: 'هودی لش مشکی',
    carrier_name: 'تیپاکس اکسپرس',
    tracking_code: 'TPX-88219405',
    estimated_date: '۱۴۰۵/۰۷/۰۵',
    reason: 'عدم حضور گیرنده در نشانی پستی',
    return_id: 'RET-101',
    refund_amount: '۹۲۰,۰۰۰',
    tracking_ref: 'PAYA-992014',
  });

  const [recipientInput, setRecipientInput] = useState('۰۹۱۲۱۲۳۴۵۶۷');
  const [unmaskLogs, setUnmaskLogs] = useState(false);

  // Live validation & render
  const renderResult = activeTemplate
    ? renderNotificationTemplate(activeTemplate, varInputs)
    : { renderedText: '', isValid: true, missingVariables: [] };

  const logs = getSimulatedNotificationLogs();

  const handleSimulateSend = () => {
    if (!activeTemplate) return;
    const res = sendSimulatedNotification(
      activeTemplate.id,
      recipientInput,
      varInputs,
      'پشتیبان لجستیک شاه‌پوش'
    );

    if (res.success) {
      addToast({
        title: 'ارسال شبیه‌سازی شد (محیط دمو)',
        description: `اعلان برای ${recipientInput} در دفتر لاگ سیستم ثبت گردید.`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'خطا در اعتبارسنجی متغیرها',
        description: res.error,
        type: 'critical',
      });
    }
  };

  const logColumns: ColumnDef<SimulatedNotificationLog>[] = [
    {
      key: 'timestamp',
      header: 'زمان شبیه‌سازی',
      render: (row) => (
        <span className="text-[11px] text-stone-400 font-fanum">
          {new Date(row.timestamp).toLocaleTimeString('fa-IR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'channel',
      header: 'کانال ارتباطی',
      render: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-stone-300">
          {row.channel === 'sms' ? (
            <Smartphone size={14} className="text-[#eed29d]" />
          ) : (
            <Mail size={14} className="text-purple-400" />
          )}
          <span>{row.channel === 'sms' ? 'پیامک خدماتی' : 'ایمیل'}</span>
        </div>
      ),
    },
    {
      key: 'recipient',
      header: 'گیرنده',
      render: (row) => {
        const masked = unmaskLogs
          ? row.recipient
          : row.recipient.replace(/(\d{4})\d{4}(\d{3})/, '$1****$2');
        return <span className="font-mono text-xs text-white" dir="ltr">{masked}</span>;
      },
    },
    {
      key: 'renderedBody',
      header: 'متن پیامک رندرشده',
      render: (row) => (
        <span className="text-xs text-stone-300 line-clamp-1 max-w-md">
          {row.renderedBody}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت ارسال',
      render: () => (
        <Badge
          label="شبیه‌سازی موفق (دمو)"
          variant="brass"
          size="sm"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <AdminPageHeader
        title="قالب‌های پیامک و شبیه‌ساز اعلان‌ها"
        description="پیش‌نمایش الگوهای پیامک خدماتی، اعتبارسنجی متغیرهای پویا ({customer_name}, {order_id})، شبیه‌ساز ارسال دمو و ثبت لاگ پیام‌ها بدون اتصال به مخابرات."
      />

      {/* Real Messaging Notice */}
      <div className="p-4 bg-stone-900/60 border border-white/10 rounded-2xl flex items-start gap-3 text-xs text-stone-300">
        <Info size={18} className="text-[#eed29d] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold text-white block">
            شفافیت درگاه‌های ارتباطی (Honest System State):
          </strong>
          <p className="leading-relaxed text-stone-400">
            در این محیط توسعه محلی، وب‌سرویس درگاه‌های پیامکی (نظیر کاوه‌نگار یا مگفا) در حالت شبیه‌ساز کاملاً امن فعال است. هیچ‌گونه پیامک واقعی به شبکه مخابراتی کشور ارسال نمی‌شود و تمامی رخدادها در دفتر لاگ پایگاه داده محلی ذخیره می‌گردند.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Selector List */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-stone-400">انتخاب رویداد محرک (Event Trigger):</h2>
          <div className="space-y-2">
            {templates.map((tpl) => {
              const isSelected = tpl.id === selectedTemplateId;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(tpl.id)}
                  className={`w-full p-4 rounded-2xl border text-right transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-[#eed29d]/10 border-[#eed29d] ring-1 ring-[#eed29d]/30'
                      : 'bg-[#131211] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{tpl.titleFa}</span>
                    <Badge label={tpl.channel === 'sms' ? 'SMS' : 'Email'} variant="neutral" size="sm" />
                  </div>
                  <span className="text-[11px] text-stone-400 font-mono" dir="ltr">
                    {tpl.trigger}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Variable Validator & Phone Mockup */}
        <div className="lg:col-span-2 space-y-6">
          {activeTemplate && (
            <div className="p-6 bg-[#131211] border border-white/10 rounded-3xl space-y-6">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-white">{activeTemplate.titleFa}</h3>
                  <span className="text-xs text-stone-500 font-mono" dir="ltr">
                    {activeTemplate.id}
                  </span>
                </div>
                <Badge
                  label={renderResult.isValid ? 'متغیرها معتبر است ✓' : 'متغیر ناقص'}
                  variant={renderResult.isValid ? 'success' : 'critical'}
                  size="md"
                />
              </div>

              {/* Variable inputs grid */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-stone-300 block">
                  متغیرهای جایگزین الگو:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeTemplate.variables.map((varName) => (
                    <div key={varName} className="space-y-1">
                      <label className="text-[11px] font-mono text-stone-400 block" dir="ltr">
                        {`{${varName}}`}
                      </label>
                      <input
                        type="text"
                        value={varInputs[varName] || ''}
                        onChange={(e) =>
                          setVarInputs({ ...varInputs, [varName]: e.target.value })
                        }
                        className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#eed29d]"
                      />
                    </div>
                  ))}
                </div>

                {!renderResult.isValid && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-400" />
                    <span>
                      متغیرهای بدون مقدار:{' '}
                      <strong className="font-mono">{renderResult.missingVariables.join(', ')}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Realistic Mobile Preview Screen */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-stone-300 block">
                  پیش‌نمایش خروجی روی دستگاه کاربر:
                </span>

                <div className="max-w-md mx-auto p-4 bg-stone-950 border border-white/10 rounded-3xl space-y-3 shadow-2xl">
                  {/* Phone Header */}
                  <div className="flex items-center justify-between text-[11px] text-stone-500 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-1.5 text-stone-300 font-bold">
                      <Smartphone size={14} className="text-[#eed29d]" />
                      <span>پیامک دریافتی از: SHAHPOOSH</span>
                    </div>
                    <span>امروز، ۱۲:۳۰</span>
                  </div>

                  {/* SMS Bubble */}
                  <div className="p-4 bg-[#1e1c1a] border border-[#eed29d]/20 rounded-2xl text-xs leading-relaxed text-stone-200 text-right font-sans">
                    {renderResult.renderedText}
                  </div>

                  <div className="text-[10px] text-center text-stone-500">
                    شناسه قالب خدماتی مصوب شاپرک/اپراتور
                  </div>
                </div>
              </div>

              {/* Simulate dispatch control */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400">شماره مقصد دمو:</span>
                  <input
                    type="text"
                    value={recipientInput}
                    onChange={(e) => setRecipientInput(e.target.value)}
                    className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-white text-xs w-36 font-mono text-center focus:outline-none focus:border-[#eed29d]"
                    dir="ltr"
                  />
                </div>

                <Button
                  variant="brass"
                  size="md"
                  onClick={handleSimulateSend}
                  disabled={!renderResult.isValid}
                  className="gap-2 shadow-lg shadow-[#eed29d]/10"
                >
                  <Send size={16} />
                  <span>شبیه‌سازی ارسال پیامک و ثبت لاگ</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulated Notification Log Section */}
      <div className="p-6 bg-[#131211] border border-white/10 rounded-3xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-[#eed29d]" />
            <h2 className="text-sm font-bold text-white">دفتر ثبت لاگ پیام‌های شبیه‌سازی شده (Demo Log)</h2>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUnmaskLogs(!unmaskLogs)}
            className="text-xs text-stone-400 hover:text-white"
          >
            {unmaskLogs ? 'مخفی‌سازی شماره‌ها' : 'نمایش کامل شماره'}
          </Button>
        </div>

        <Table
          data={logs}
          columns={logColumns}
          keyExtractor={(row) => row.id}
          emptyMessage="هنوز پیامی شبیه‌سازی نشده است. با دکمه بالا ارسال دمو را تست کنید."
        />
      </div>
    </div>
  );
};
