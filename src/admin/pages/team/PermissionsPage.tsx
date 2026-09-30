import React from 'react';
import { ShieldCheck, Lock, CheckCircle2, XCircle, Info } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';

export const PermissionsPage: React.FC = () => {
  const roles = [
    { key: 'super_admin', label: 'مدیر ارشد' },
    { key: 'studio_designer', label: 'آتلیه طراحی' },
    { key: 'production_lead', label: 'سرپرست چاپ' },
    { key: 'inventory_manager', label: 'مسئول انبار' },
    { key: 'finance_auditor', label: 'حسابرس مالی' },
    { key: 'support_agent', label: 'پشتیبانی' },
  ];

  const permissionsMatrix = [
    { section: 'داشبورد و شاخص‌های کلیدی', allowed: ['super_admin', 'studio_designer', 'production_lead', 'inventory_manager', 'finance_auditor', 'support_agent'] },
    { section: 'سفارش‌ها و تغییر وضعیت فاکتور', allowed: ['super_admin', 'production_lead', 'finance_auditor', 'support_agent'] },
    { section: 'استرداد وجه و لغو مالی (Refunds)', allowed: ['super_admin', 'finance_auditor'] },
    { section: 'تایید / رد آرت‌ورک و فایل مشتری', allowed: ['super_admin', 'studio_designer'] },
    { section: 'کنترل پرینترها و دمای پرس DTG', allowed: ['super_admin', 'production_lead'] },
    { section: 'تغییر دستی موجودی فیزیکی انبار', allowed: ['super_admin', 'inventory_manager'] },
    { section: 'مدیریت پرسنل و دسترسی‌ها (RBAC)', allowed: ['super_admin'] },
    { section: 'مرورگر پایگاه‌داده و لاگ‌های امنیتی', allowed: ['super_admin', 'finance_auditor'] },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="دسترسی‌ها"
        description="تفکیک وظایف و سطوح دسترسی هر نقش شغلی در کارگاه جهت حفظ امنیت اطلاعات مالی و حریم خصوصی مشتریان."
      />

      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-amber-400 shrink-0" />
          <span>
            <strong>نکته امنیتی:</strong> سوییچر نقش در منوی حساب کاربری فعال است و جهت آزمون سطوح اختیارات پرسنل کاربرد دارد.
          </span>
        </div>
      </div>

      <div className="bg-[#131211] border border-white/10 rounded-xl overflow-x-auto">
        <table className="w-full text-xs sm:text-[13px] text-right border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="p-4 text-stone-300 font-bold">بخش و قابلیت اجرایی</th>
              {roles.map((r) => (
                <th key={r.key} className="p-4 text-stone-300 font-bold text-center whitespace-nowrap">
                  {r.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-fanum">
            {permissionsMatrix.map((item, i) => (
              <tr key={i} className="hover:bg-white/5">
                <td className="p-4 font-semibold text-white">{item.section}</td>
                {roles.map((r) => {
                  const hasAccess = item.allowed.includes(r.key);
                  return (
                    <td key={r.key} className="p-4 text-center">
                      {hasAccess ? (
                        <CheckCircle2 size={16} className="text-emerald-400 mx-auto" />
                      ) : (
                        <XCircle size={16} className="text-stone-600 mx-auto" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
