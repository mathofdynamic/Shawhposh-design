import React from 'react';
import { Cpu, CheckCircle2, RefreshCw, Key, Globe } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Badge, Button } from '../../components/ui';

export const IntegrationsPage: React.FC = () => {
  const integrations = [
    {
      name: 'سامان کیش (SEP) - درگاه پرداخت الکترونیک',
      category: 'درگاه شاپرک بانکی',
      status: 'connected',
      details: 'پروتکل امن شاپرک با تایید دو مرحله‌ای و تطبیق مستقیم با فاکتور',
    },
    {
      name: 'وب‌سرویس پیامکی کاوه‌نگار (Kavenegar SMS)',
      category: 'اطلاع‌رسانی پیامکی',
      status: 'connected',
      details: 'ارسال پیامک‌های تایید سفارش، صدور بارنامه و کد تحویل مرسوله',
    },
    {
      name: 'رابط پرینترهای مستقیم Brother GTX Industrial Bridge',
      category: 'اتوماسیون صنعتی کارگاه',
      status: 'connected',
      details: 'ارسال مستقیم فایل‌های برداری تاییدشده به بافر حافظه پرینترهای DTG',
    },
    {
      name: 'سامانه رهگیری ناوگان تیپاکس (Tipax API)',
      category: 'لجستیک و حمل‌ونقل',
      status: 'connected',
      details: 'استعلام لحظه‌ای بارنامه‌ها و تحویل به گیرنده',
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="یکپارچه‌سازی و وب‌سرویس‌های خارجی"
        description="وضعیت اتصال سوئیچ درگاه‌های بانکی، وب‌سرویس پیامک، درایورهای پرینتر نساجی و وب‌هوک‌های لجستیک."
      />

      <div className="space-y-4">
        {integrations.map((item, i) => (
          <div
            key={i}
            className="p-5 bg-[#131211] border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">{item.name}</span>
                <span className="text-[10px] text-stone-400 font-mono bg-white/5 px-2 py-0.5 rounded">
                  {item.category}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">{item.details}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Badge label="متصل و فعال" variant="success" size="sm" />
              <Button variant="secondary" size="sm">
                تست ارتباط
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
