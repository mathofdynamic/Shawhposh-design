import React from 'react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import ShippingMethodsPanel from './ShippingMethodsPanel';
import PaymentMethodsPanel from './PaymentMethodsPanel';

export const SettingsPage: React.FC = () => (
  <section dir="rtl" className="space-y-5">
    <AdminPageHeader title="تنظیمات ارسال" description="هزینه و وضعیت روش‌های ارسال از پایگاه داده خوانده می‌شود. روش تازه تا زمان تأیید مالک غیرفعال می‌ماند." />
    <ShippingMethodsPanel />
    <PaymentMethodsPanel />
  </section>
);
