import React from 'react';
import { Settings, Save, Shield, Sliders } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, FormField, Input, Switch, useToast } from '../../components/ui';

export const SettingsPage: React.FC = () => {
  const { addToast } = useToast();

  const handleSave = () => {
    addToast({
      title: 'تنظیمات ذخیره شد',
      description: 'پیکربندی عملیاتی کارگاه با موفقیت در سیستم اعمال گردید.',
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="تنظیمات کلی فروشگاه و کارگاه"
        description="پیکربندی پارامترهای مالیاتی، هزینه ارسال مرسولات، سقف سفارش روزانه خط چاپ و سیاست‌های گارانتی."
        actions={
          <Button variant="brass" size="sm" onClick={handleSave}>
            <Save size={13} className="ml-1" />
            ذخیره تنظیمات
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">تنظیمات ارسال و بسته‌بندی</h2>

          <FormField label="هزینه ثابت ارسال با پست پیشتاز (تومان)">
            <Input defaultValue="۴۵,۰۰۰" />
          </FormField>

          <FormField label="حداقل خرید برای ارسال رایگان (تومان)">
            <Input defaultValue="۱,۵۰۰,۰۰۰" />
          </FormField>

          <FormField label="سقف تیراژ سفارش روزانه خط چاپ DTG">
            <Input defaultValue="۱۲۰ عدد در روز" />
          </FormField>
        </div>

        <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">سیاست‌های آتلیه و اعتبارسنجی طرح‌ها</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <span className="text-xs font-bold text-white block">بررسی خودکار رزولوشن فایل‌ها (DPI)</span>
                <span className="text-[10px] text-stone-400">هشدار در صورتی که رزولوشن فایل کمتر از ۳۰۰ باشد</span>
              </div>
              <Switch checked={true} onChange={() => {}} />
            </div>

            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
              <div>
                <span className="text-xs font-bold text-white block">ارسال خودکار پیامک وضعیت بارنامه</span>
                <span className="text-[10px] text-stone-400">ارسال پیامک حاوی کد رهگیری تیپاکس به خریدار</span>
              </div>
              <Switch checked={true} onChange={() => {}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
