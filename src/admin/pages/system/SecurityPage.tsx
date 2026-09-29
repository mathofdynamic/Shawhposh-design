import React, { useState } from 'react';
import {
  Lock,
  Key,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Globe,
  Clock,
  UserCheck,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Badge, Switch, FormField, Input, Dialog, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { adminRepository } from '../../domain/repository';
import { toFaDigits } from '../../utils/formatters';

export const SecurityPage: React.FC = () => {
  const { state } = useAdminRepository();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'mfa' | 'sessions' | 'ip_allowlist' | 'radar'>('mfa');
  const [enforceMfaAll, setEnforceMfaAll] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5);
  const [ipAllowlistActive, setIpAllowlistActive] = useState(false);
  const [cidrList, setCidrList] = useState<string[]>([
    '192.168.1.0/24 (شبکه آتلیه کارگاه)',
    '10.0.4.0/24 (سرورهای داخلی)',
    '185.143.232.10/32 (آی‌پی استاتیک مدیریت)',
  ]);
  const [newCidr, setNewCidr] = useState('');

  // Handle adding new CIDR
  const handleAddCidr = () => {
    if (!newCidr.trim()) return;
    setCidrList((prev) => [...prev, newCidr.trim()]);
    setNewCidr('');
    adminRepository.addActivityLog({
      actorId: 'STF-01',
      actorName: 'علیرضا شمس',
      actorRole: 'super_admin',
      actionType: 'SECURITY_IP_ALLOWLIST_ADDED',
      description: `محدوده IP مجاز جدید اضافه شد: ${newCidr.trim()}`,
      entityType: 'rbac_permission',
      entityId: 'IP_FILTER',
    });
    addToast({
      title: 'محدوده IP ثبت شد',
      description: 'آدرس جدید به لیست مجاز شبکه اضافه گردید.',
      type: 'success',
    });
  };

  const handleRemoveCidr = (index: number) => {
    const target = cidrList[index];
    setCidrList((prev) => prev.filter((_, i) => i !== index));
    adminRepository.addActivityLog({
      actorId: 'STF-01',
      actorName: 'علیرضا شمس',
      actorRole: 'super_admin',
      actionType: 'SECURITY_IP_ALLOWLIST_REMOVED',
      description: `محدوده IP از لیست مجاز حذف شد: ${target}`,
      entityType: 'rbac_permission',
      entityId: 'IP_FILTER',
    });
  };

  const staffMfaList = [
    {
      id: 'STF-01',
      name: 'علیرضا شمس',
      roleFa: 'مدیر ارشد و بنیان‌گذار (Super Admin)',
      mfaStatus: 'enabled',
      method: 'اپلیکیشن Google Authenticator (TOTP)',
      lastMfaAuthFa: 'امروز، ۱۱:۵۰',
    },
    {
      id: 'STF-02',
      name: 'مهرداد کاویانی',
      roleFa: 'سرپرست آتلیه و طراح ارشد',
      mfaStatus: 'enabled',
      method: 'پیامک OTP امنیتی',
      lastMfaAuthFa: 'امروز، ۰۹:۱۵',
    },
    {
      id: 'STF-03',
      name: 'سارا نوری',
      roleFa: 'پشتیبانی، مالی و لجستیک',
      mfaStatus: 'enabled',
      method: 'اپلیکیشن Google Authenticator (TOTP)',
      lastMfaAuthFa: 'امروز، ۱۰:۴۰',
    },
    {
      id: 'STF-04',
      name: 'کامران امینی',
      roleFa: 'اپراتور ارشد خط تولید و چاپ DTG',
      mfaStatus: 'pending_setup',
      method: 'در انتظار فعال‌سازی پرسنلی',
      lastMfaAuthFa: 'هنوز تایید نشده',
    },
  ];

  const securityIncidents = [
    {
      id: 'INC-201',
      timestamp: '۱۴۰۵/۰۷/۰۲ - ۱۱:۳۵',
      type: 'تلاش ناموفق برای ورود',
      ip: '91.240.118.***',
      details: '۳ مرتبه ورود با رمز اشتباه برای کاربر support@shahpoosh.ir',
      severity: 'warning',
      actionTaken: 'کپچای تصویری فعال گردید',
    },
    {
      id: 'INC-202',
      timestamp: '۱۴۰۵/۰۷/۰۲ - ۱۰:۲۰',
      type: 'تایید هویت دو مرحله‌ای خارج از ساعت کاری',
      ip: '2.180.45.***',
      details: 'ورود موفق مدیر ارشد با کد TOTP',
      severity: 'info',
      actionTaken: 'مجاز - ثبت در لاگ امنیتی',
    },
    {
      id: 'INC-203',
      timestamp: '۱۴۰۵/۰۷/۰۱ - ۱۸:۰۰',
      type: 'درخواست صدور خروجی جدول تراکنش‌ها',
      ip: '192.168.1.15',
      details: 'درخواست Export داده‌ها توسط مدیر مالی با فیلتر امنیتی PII',
      severity: 'info',
      actionTaken: 'تایید مجوز دسترسی',
    },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <AdminPageHeader
        title="امنیت پرسنل، احراز هویت دومرحله‌ای و کنترل نشست‌ها"
        description="سیاست‌های حفاظت از حساب‌های همکاران، الزامات MFA، فیلترینگ IP و پایش هشدارهای امنیتی."
      />

      {/* Security Status Banner */}
      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-300">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={22} className="text-emerald-400 shrink-0" />
          <div>
            <strong className="text-white block font-bold">وضعیت امنیتی پنل مدیریت: حفاظت سطح عالی</strong>
            <span className="text-stone-400">
              الزام ورود دو مرحله‌ای برای نقش‌های دارای اختیارات حساس فعال بوده و تمامی تغییرات در دفتر حسابرسی ثبت می‌گردد.
            </span>
          </div>
        </div>
        <Badge label="MFA ENFORCED" variant="success" size="sm" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('mfa')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'mfa' ? 'bg-[#ba8d3d] text-stone-950' : 'bg-white/5 text-stone-400 hover:text-white'
          }`}
        >
          <Smartphone size={14} />
          <span>احراز هویت دو مرحله‌ای پرسنل</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'sessions' ? 'bg-[#ba8d3d] text-stone-950' : 'bg-white/5 text-stone-400 hover:text-white'
          }`}
        >
          <Clock size={14} />
          <span>سیاست‌های نشست و قفل حساب</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ip_allowlist')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ip_allowlist' ? 'bg-[#ba8d3d] text-stone-950' : 'bg-white/5 text-stone-400 hover:text-white'
          }`}
        >
          <Globe size={14} />
          <span>فیلتر و لیست مجاز IP</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('radar')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'radar' ? 'bg-[#ba8d3d] text-stone-950' : 'bg-white/5 text-stone-400 hover:text-white'
          }`}
        >
          <ShieldAlert size={14} />
          <span>پایش رویدادها و هشدارهای امنیتی</span>
        </button>
      </div>

      {/* Tab 1: Staff MFA */}
      {activeTab === 'mfa' && (
        <div className="space-y-4">
          <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">الزام عمومی ورود دو مرحله‌ای برای تمامی کاربران پنل</span>
              <span className="text-[11px] text-stone-400">کاربر بدون ثبت کلید TOTP یا شماره تایید شده امکان ورود نخواهد داشت</span>
            </div>
            <Switch
              checked={enforceMfaAll}
              onChange={(checked) => {
                setEnforceMfaAll(checked);
                addToast({
                  title: 'سیاست MFA به‌روزرسانی شد',
                  description: checked ? 'الزام ورود دومرحله‌ای فعال گردید.' : 'الزام غیرفعال شد.',
                  type: 'info',
                });
              }}
            />
          </div>

          <div className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/10 font-bold text-xs text-white">
              وضعیت احراز هویت دومرحله‌ای همکاران کارگاه شاه‌پوش
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-[#181615] text-stone-400 text-[11px] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">کد پرسنلی</th>
                    <th className="py-3 px-4">نام همکار</th>
                    <th className="py-3 px-4">نقش سیستمی</th>
                    <th className="py-3 px-4">روش ورود امن</th>
                    <th className="py-3 px-4">آخرین احراز هویت</th>
                    <th className="py-3 px-4 text-center">وضعیت MFA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {staffMfaList.map((member) => (
                    <tr key={member.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono text-stone-400 text-[11px]">{member.id}</td>
                      <td className="py-3 px-4 font-bold text-white">{member.name}</td>
                      <td className="py-3 px-4 text-stone-300">{member.roleFa}</td>
                      <td className="py-3 px-4 text-[#eed29d]">{member.method}</td>
                      <td className="py-3 px-4 text-stone-400 font-fanum">{member.lastMfaAuthFa}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge
                          label={member.mfaStatus === 'enabled' ? 'فعال و تاییدشده' : 'در انتظار راه‌اندازی'}
                          variant={member.mfaStatus === 'enabled' ? 'success' : 'warning'}
                          size="sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Sessions & Lockout */}
      {activeTab === 'sessions' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white">کنترل نشست‌های هم‌روند و قوانین انقضا</h3>
            <p className="text-xs text-stone-400 mt-0.5">تنظیم مدت زمان معتبر بودن توکن ورود و محدودیت ورود همزمان</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="مدت زمان خروج خودکار در صورت بی‌تحرکی (دقیقه)">
              <Input
                type="number"
                value={sessionTimeoutMinutes}
                onChange={(e) => setSessionTimeoutMinutes(Number(e.target.value))}
              />
            </FormField>

            <FormField label="حداکثر دفعات تلاش ناموفق قبل از قفل ۱۵ دقیقه‌ای حساب">
              <Input
                type="number"
                value={maxLoginAttempts}
                onChange={(e) => setMaxLoginAttempts(Number(e.target.value))}
              />
            </FormField>

            <div className="md:col-span-2 p-3.5 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">محدودیت نشست واحد (Single Session Policy)</span>
                <span className="text-[11px] text-stone-400">خروج خودکار از نشست‌های قبلی در صورت ورود از دستگاه جدید</span>
              </div>
              <Switch checked={true} onChange={() => {}} />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: IP Allowlist */}
      {activeTab === 'ip_allowlist' && (
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="border-b border-white/5 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">فیلترینگ و لیست مجاز آدرس‌های IP (CIDR Allowlist)</h3>
              <p className="text-xs text-stone-400 mt-0.5">محدود کردن دسترسی پنل مدیریت صرفاً به شبکه‌های معتبر کارگاه</p>
            </div>
            <Switch
              checked={ipAllowlistActive}
              onChange={(checked) => setIpAllowlistActive(checked)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                dir="ltr"
                value={newCidr}
                onChange={(e) => setNewCidr(e.target.value)}
                placeholder="مثال: 192.168.10.0/24 یا 2.180.45.10/32"
                className="flex-1 bg-[#1a1817] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#eed29d] font-mono focus:outline-none focus:border-[#ba8d3d]"
              />
              <Button variant="brass" size="sm" onClick={handleAddCidr}>
                <Plus size={13} className="ml-1" />
                افزودن رنج IP
              </Button>
            </div>

            <div className="space-y-2 pt-2">
              {cidrList.map((cidr, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  <span className="font-mono text-stone-200" dir="ltr">{cidr}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCidr(idx)}
                    className="text-stone-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Security Radar */}
      {activeTab === 'radar' && (
        <div className="space-y-4">
          <div className="text-xs text-stone-400 flex items-center justify-between">
            <span>رویدادهای امنیتی اخیر ثبت‌شده در رادار نظارت:</span>
            <span className="text-[11px] text-[#eed29d]">سیستم پایش بلادرنگ</span>
          </div>

          <div className="space-y-3">
            {securityIncidents.map((inc) => (
              <div
                key={inc.id}
                className="p-4 bg-[#131211] border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{inc.type}</span>
                    <span className="text-[10px] font-mono text-stone-400 font-fanum">{inc.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-stone-400">{inc.details}</p>
                  <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono" dir="ltr">
                    <span>IP: {inc.ip}</span>
                    <span>•</span>
                    <span className="text-[#eed29d]">اقدام: {inc.actionTaken}</span>
                  </div>
                </div>

                <Badge
                  label={inc.severity === 'warning' ? 'هشدار امنیتی' : 'ثبت عادی'}
                  variant={inc.severity === 'warning' ? 'warning' : 'success'}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
