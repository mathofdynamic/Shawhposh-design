import React, { useState } from 'react';
import {
  Cpu,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Key,
  Globe,
  CreditCard,
  MessageSquare,
  Truck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Terminal,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button, Dialog, useToast } from '../../components/ui';
import { toFaDigits } from '../../utils/formatters';

interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  status: 'simulated_sandbox' | 'simulated_local' | 'mock_connected';
  statusLabelFa: string;
  sourceBadge: string;
  secretReference: string;
  description: string;
  futureRequirement: string;
  icon: React.ElementType;
}

export const IntegrationsPage: React.FC = () => {
  const { addToast } = useToast();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<any | null>(null);

  const integrations: IntegrationItem[] = [
    {
      id: 'sep',
      name: 'سامان کیش (SEP) - درگاه پرداخت شاپرک',
      category: 'درگاه پرداخت اینترنتی PSP',
      status: 'simulated_sandbox',
      statusLabelFa: 'سندباکس شبیه‌سازی شده',
      sourceBadge: 'منبع: محیط آزمایشی شاپرک',
      secretReference: 'vault:secret/gateways/sep#terminal_id',
      description: 'سوئیچ پروتکل امن شاپرک با تایید دو مرحله‌ای (Verify) و تطبیق مستقیم با فاکتور سفارش.',
      futureRequirement: 'نیازمند ترمینال معتبر شاپرک، آی‌پی استاتیک ثبت‌شده سرور در سوئیچ بانکی و نماد اعتماد الکترونیکی.',
      icon: CreditCard,
    },
    {
      id: 'behpardakht',
      name: 'به‌پرداخت ملت - درگاه پشتیبان پرداخت',
      category: 'درگاه پرداخت اینترنتی PSP',
      status: 'simulated_sandbox',
      statusLabelFa: 'سندباکس شبیه‌سازی شده',
      sourceBadge: 'منبع: محیط آزمایشی شاپرک',
      secretReference: 'vault:secret/gateways/behpardakht#merchant_key',
      description: 'درگاه پرداخت ثانویه جهت توزیع بار تراکنش‌ها و Failover خودکار هنگام کندی شبکه شاپرک.',
      futureRequirement: 'نیازمند قرارداد فعال پذیرندگی با شرکت به‌پرداخت ملت و تبادل گواهی امضای دیجیتال.',
      icon: CreditCard,
    },
    {
      id: 'kavenegar',
      name: 'وب‌سرویس پیامکی کاوه‌نگار (Kavenegar SMS)',
      category: 'اطلاع‌رسانی پیامکی و اعتبارسنجی',
      status: 'simulated_sandbox',
      statusLabelFa: 'صف شبیه‌ساز پیامک',
      sourceBadge: 'منبع: شبیه‌ساز رویدادهای محلی',
      secretReference: 'ref:env/KAVENEGAR_API_KEY',
      description: 'ارسال پیامک‌های تایید سفارش، صدور بارنامه تیپاکس و کدهای یکبارمصرف با خطوط خدماتی بدون بلک‌لیست.',
      futureRequirement: 'نیازمند ثبت خط خدماتی شرکتی در سامانه شاهکار و شارژ ریالی حساب پنل پیامک.',
      icon: MessageSquare,
    },
    {
      id: 'tipax',
      name: 'سامانه رهگیری لجستیک تیپاکس (Tipax Bridge)',
      category: 'لجستیک و حمل‌ونقل مرسولات',
      status: 'simulated_sandbox',
      statusLabelFa: 'سندباکس شبیه‌سازی شده',
      sourceBadge: 'منبع: وب‌هوک تستی لجستیک',
      secretReference: 'vault:secret/logistics/tipax#api_token',
      description: 'صدور خودکار بارنامه پستی، دریافت بارکد مرسوله و همگام‌سازی لحظه‌ای وضعیت توزیع به مشتری.',
      futureRequirement: 'نیازمند کد نمایندگی فعال تیپاکس و فعال‌سازی وب‌هوک اختصاصی تغییر وضعیت بارنامه در سرور.',
      icon: Truck,
    },
    {
      id: 'brother-gtx',
      name: 'رابط پرینترهای مستقیم نساجی Brother GTX 6 Industrial',
      category: 'اتوماسیون صنعتی کارگاه',
      status: 'simulated_local',
      statusLabelFa: 'شبیه‌ساز شبکه محلی کارگاه',
      sourceBadge: 'منبع: درایور مجازی درون حافظه',
      secretReference: 'local:network/bridge/gtx6#device_secret',
      description: 'ارسال مستقیم فایل‌های برداری تفکیک رنگ شده به بافر حافظه پرینترهای DTG کارگاه شاه‌پوش.',
      futureRequirement: 'نیازمند استقرار Agent نرم‌افزاری محلی در شبکه LAN کارگاه و اتصال سوکت TCP پورت ۹۱۰۰.',
      icon: Cpu,
    },
  ];

  const handleTestConnection = (item: IntegrationItem) => {
    setTestingId(item.id);
    setTimeout(() => {
      setTestingId(null);
      setDryRunResult({
        title: `نتیجه آزمون شبیه‌سازی اتصال: ${item.name}`,
        service: item.name,
        targetRef: item.secretReference,
        latencyMs: Math.floor(Math.random() * 40) + 15,
        timestamp: new Date().toISOString(),
        status: 'SIMULATED_HANDSHAKE_OK',
        notice: 'توجه: این آزمون در محیط شبیه‌ساز (DESIGN MODE) انجام شده و ارتباط اینترنتی زنده با سرورهای خارجی برقرار نکرده است.',
      });
      addToast({
        title: 'تست شبیه‌سازی انجام شد',
        description: `آزمون هندشیک مجازی با ${item.name} با موفقیت خاتمه یافت.`,
        type: 'info',
      });
    }, 600);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <AdminPageHeader
        title="یکپارچه‌سازی وب‌سرویس‌ها و اتصالات خارجی"
        description="وضعیت اتصال درگاه‌های بانکی، وب‌سرویس پیامک، درایورهای پرینتر نساجی و مراجع امن سرور بدون افشای کلیدها."
      />

      {/* DESIGN MODE DISCLAIMER */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
        <ShieldAlert size={20} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold flex items-center gap-2">
            <span>کارت‌ها و وضعیت‌های زیر صرفاً شبیه‌سازی نمایشی هستند (DESIGN MODE)</span>
            <span className="bg-amber-400/20 text-amber-300 text-[10px] px-2 py-0.5 rounded font-mono">
              SIMULATED ILLUSTRATION
            </span>
          </div>
          <p className="text-stone-300 leading-relaxed">
            هیچ‌گونه ارتباط مستقیم یا زنده‌ای با سوئیچ شاپرک، پنل پیامکی کاوه‌نگار یا دستگاه‌های پرینتر کارگاه از درون مرورگر ادعا نمی‌شود. کلیدهای دسترسی صرفاً به صورت مراجع امن سروری (Vault Reference) نمایش داده می‌شوند.
          </p>
        </div>
      </div>

      {/* Zero Secrets Guarantee Banner */}
      <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs text-stone-300">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
          <span>
            <strong>عدم افشای سکرت‌ها در جاوااسکریپت:</strong> متغیرهای محرمانه و کلیدهای اصلی API در کد فرانت‌اند وجود ندارند و همگی از طریق مراجع سروری خوانده می‌شوند.
          </span>
        </div>
        <Badge label="SECRET REFERENCE UX" variant="success" size="sm" />
      </div>

      {/* Integrations Catalog Cards */}
      <div className="space-y-4">
        {integrations.map((item) => {
          const IconComp = item.icon;
          const isTesting = testingId === item.id;

          return (
            <div
              key={item.id}
              className="p-5 bg-[#131211] border border-white/10 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-white/20 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/5 text-[#ba8d3d] rounded-2xl border border-white/5 shrink-0 mt-0.5">
                  <IconComp size={24} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-bold text-white">{item.name}</h3>
                    <span className="text-[10px] font-mono bg-white/5 text-stone-400 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded font-mono">
                      {item.sourceBadge}
                    </span>
                  </div>

                  <p className="text-xs text-stone-400 leading-relaxed max-w-3xl">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
                      <Key size={12} className="text-[#eed29d]" />
                      <span className="text-stone-400 text-[10px]">مرجع سکرت سرور:</span>
                      <span className="font-mono text-[10px] text-[#eed29d]" dir="ltr">
                        {item.secretReference}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-stone-400 bg-white/5 p-2 rounded-lg border border-white/5 max-w-2xl mt-1">
                    <strong className="text-stone-300">پیش‌نیاز عملیاتی پروداکشن:</strong> {item.futureRequirement}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
                <Badge label={item.statusLabelFa} variant="warning" size="sm" />
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isTesting}
                  onClick={() => handleTestConnection(item)}
                >
                  {isTesting ? <RefreshCw size={12} className="ml-1 animate-spin" /> : <Terminal size={12} className="ml-1" />}
                  {isTesting ? 'در حال آزمون...' : 'آزمون شبیه‌سازی (Dry-Run)'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dry Run Result Modal */}
      {dryRunResult && (
        <Dialog
          isOpen={true}
          onClose={() => setDryRunResult(null)}
          title={dryRunResult.title}
        >
          <div className="space-y-4 text-xs" dir="rtl">
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 leading-relaxed">
              {dryRunResult.notice}
            </div>

            <div className="bg-[#0b0a09] border border-white/10 rounded-xl p-3.5 space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-stone-400">
                <span>وضعیت هندشیک:</span>
                <span className="text-emerald-400 font-bold">{dryRunResult.status}</span>
              </div>
              <div className="flex items-center justify-between text-stone-400">
                <span>تاخیر شبیه‌سازی شده:</span>
                <span className="text-[#eed29d]">{toFaDigits(dryRunResult.latencyMs)} میلی‌ثانیه</span>
              </div>
              <div className="flex items-center justify-between text-stone-400">
                <span>مرجع سرور:</span>
                <span className="text-stone-300" dir="ltr">{dryRunResult.targetRef}</span>
              </div>
              <div className="flex items-center justify-between text-stone-400">
                <span>زمان آزمون:</span>
                <span className="text-stone-300" dir="ltr">{dryRunResult.timestamp}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/10">
              <Button variant="brass" size="sm" onClick={() => setDryRunResult(null)}>
                بستن پنجره
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};
