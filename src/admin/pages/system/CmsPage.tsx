import React from 'react';
import { Layout, Image, Edit3, Save } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, FormField, Input } from '../../components/ui';

export const CmsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="مدیریت محتوای ویترین فروشگاه (CMS)"
        description="ویرایش بنرهای سربرگ، شعارهای برند شاه‌پوش، متن‌های راهنمای شستشو و پیام‌های اطلاعیه بالای سایت."
        actions={
          <Button variant="brass" size="sm">
            <Save size={13} className="ml-1" />
            ذخیره تغییرات ویترین
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">تیتر و پیام سربرگ هیرو (Hero Section)</h2>

          <FormField label="عنوان اصلی ویترین">
            <Input defaultValue="شاه‌پوش · جامهٔ اصیل ایرانی با امضای شما" />
          </FormField>

          <FormField label="زیرعنوان و توضیح مفهومی">
            <Input defaultValue="طراحی آنلاین روی سوپرپنبه ۲۴۰ گرم، چاپ مستقیم ماندگار Brother GTX، بسته‌بندی در جعبه‌های هاردباکس مشکی." />
          </FormField>

          <FormField label="متن دکمه فراخوان (CTA)">
            <Input defaultValue="ورود به آتلیه طراحی تیشرت" />
          </FormField>
        </div>

        <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-bold text-white">نوار اطلاعیه بالای سایت (Announcement Bar)</h2>

          <FormField label="پیام نوار بالای صفحه">
            <Input defaultValue="ارسال رایگان سفارش‌های بالای ۱.۵ میلیون تومان با پست پیشتاز به تمام شهرهای ایران" />
          </FormField>

          <FormField label="لینک مرتبط">
            <Input defaultValue="/collections/shahneshin" />
          </FormField>
        </div>
      </div>
    </div>
  );
};
