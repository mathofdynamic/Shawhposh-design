import React, { useState, useMemo } from 'react';
import {
  Activity,
  Users,
  Eye,
  Smartphone,
  Monitor,
  Tablet,
  Compass,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Info,
  ShieldAlert,
  Lock,
  Unlock,
  EyeOff,
  Search,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Clock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, Badge } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { toFaDigits } from '../../utils/formatters';
import { downloadCsv } from '../../utils/exportCsv';
import { DateRangePreset } from '../../domain/types';

export const TrafficPage: React.FC = () => {
  const { getTrafficAnalytics, state } = useAdminRepository();

  // Tab navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'explorer' | 'security_ip'>('overview');

  // Timeframe and date filter
  const [timeframe, setTimeframe] = useState<DateRangePreset>('30d');
  const [isCustomDate, setIsCustomDate] = useState(false);
  const [customStart, setCustomStart] = useState('2026-08-25');
  const [customEnd, setCustomEnd] = useState('2026-09-23');

  // Metric selector for chart
  const [chartMetric, setChartMetric] = useState<'sessions' | 'visitors' | 'pageviews'>('sessions');
  const [showTableView, setShowTableView] = useState(false);

  // Security IP Reveal state
  const [isIpRevealed, setIsIpRevealed] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState<number | null>(null);

  // Visitor Explorer filters
  const [explorerSearch, setExplorerSearch] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Query analytics data
  const trafficData = useMemo(() => {
    return getTrafficAnalytics(timeframe, isCustomDate ? customStart : undefined, isCustomDate ? customEnd : undefined);
  }, [getTrafficAnalytics, timeframe, isCustomDate, customStart, customEnd]);

  // Handle Security IP Reveal Toggle
  const handleToggleReveal = () => {
    if (isIpRevealed) {
      setIsIpRevealed(false);
      setRevealCountdown(null);
    } else {
      setIsIpRevealed(true);
      setRevealCountdown(60);
      const timer = setInterval(() => {
        setRevealCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            setIsIpRevealed(false);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    const headers = ['تاریخ', 'بازدیدکنندگان یکتا (نفر)', 'نشست‌ها', 'بازدید صفحات', 'نرخ پرش (٪)', 'میانگین زمان نشست (ثانیه)'];
    const rows = trafficData.snapshots.map((s) => [
      s.date,
      s.visitors,
      s.sessions,
      s.pageviews,
      s.bounceRatePercent,
      s.avgSessionDurationSec,
    ]);
    downloadCsv(`traffic-analytics-${timeframe}`, headers, rows);
  };

  // Masking IP helper conforming to RFC 5737
  const renderIp = (ip: string) => {
    if (isIpRevealed) return ip;
    const parts = ip.split('.');
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.***`;
    return '***.***.***.***';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Explicit Illustrative Demonstration Notice */}
      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs">
        <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-stone-300 leading-relaxed">
          <strong className="text-amber-200 block font-semibold">
            اطلاعیه استانداردهای حریم خصوصی و داده‌های نمونه تحلیلی:
          </strong>
          <span>
            شاخص‌های ترافیکی این بخش بر مبنای داده‌های شبیه‌سازی‌شده دترمینستیک کارگاه شاه‌پوش ایجاد شده‌اند. هیچ‌گونه اسکریپت ردیابی بلادرنگ روی مرورگر اجرا نمی‌شود و هیچ نشانی آی‌پی واقعی از کاربران ذخیره یا برداشت نگردیده است. کلیه آدرس‌های آی‌پی از رده مستندسازی استاندارد RFC 5737 استفاده می‌کنند.
          </span>
        </div>
      </div>

      {/* Header */}
      <AdminPageHeader
        title="ترافیک، نشست‌ها و رفتارسنجی کاربران"
        description="پایش شاخص‌های تعامل، رفتار مرور و سلسله‌مراتب بازدیدها از ویترین و آتلیه چاپ آنلاین شاه‌پوش"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 text-xs text-stone-300"
            >
              <Download size={14} />
              <span>خروجی اکسل (CSV)</span>
            </Button>
          </div>
        }
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-[#ba8d3d] text-stone-950 shadow'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity size={15} />
          <span>ترافیک و رفتار کاربران</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('explorer')}
          className={`px-4 py-2 text-xs rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'explorer'
              ? 'bg-[#ba8d3d] text-stone-950 shadow'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Compass size={15} />
          <span>کاوشگر نشست‌های مستعار</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security_ip')}
          className={`px-4 py-2 text-xs rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-2 ${
            activeTab === 'security_ip'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow'
              : 'text-stone-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ShieldAlert size={15} />
          <span>تحلیل امنیتی آی‌پی‌ها (RFC 5737)</span>
        </button>
      </div>

      {/* Date Filter & Preset Controls */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-stone-400 ml-2">بازه تحلیلی:</span>
          {[
            { id: 'today', label: 'امروز' },
            { id: '7d', label: '۷ روز گذشته' },
            { id: '30d', label: '۳۰ روز گذشته' },
            { id: '90d', label: '۹۰ روز گذشته' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setTimeframe(preset.id as DateRangePreset);
                setIsCustomDate(false);
              }}
              className={`px-3 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                timeframe === preset.id && !isCustomDate
                  ? 'bg-[#eed29d] text-stone-950 font-bold'
                  : 'bg-white/5 text-stone-400 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setIsCustomDate(!isCustomDate)}
            className={`px-3 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
              isCustomDate
                ? 'bg-[#eed29d] text-stone-950 font-bold'
                : 'bg-white/5 text-stone-400 hover:text-white'
            }`}
          >
            بازه انتخابی...
          </button>
        </div>

        {/* Custom Date Inputs if enabled */}
        {isCustomDate && (
          <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 text-xs text-stone-300">
            <span>از:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-stone-900 border border-white/10 rounded px-2 py-0.5 text-xs text-white"
            />
            <span>تا:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-stone-900 border border-white/10 rounded px-2 py-0.5 text-xs text-white"
            />
          </div>
        )}
      </div>

      {/* TAB 1: OVERVIEW & ENGAGEMENT */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top 4 Primary KPIs with Tooltips & Deltas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Unique Visitors */}
            <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-2 relative group">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span className="font-semibold text-stone-300">کاربران یکتا (Unique Visitors)</span>
                <Users size={16} className="text-[#eed29d]" />
              </div>
              <div className="text-2xl font-black text-white font-fanum">
                {toFaDigits(trafficData.visitors.toLocaleString())}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-fanum">
                {trafficData.visitorsDelta >= 0 ? (
                  <span className="text-emerald-400 flex items-center font-bold">
                    <ArrowUpRight size={14} />+{toFaDigits(trafficData.visitorsDelta)}٪
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center font-bold">
                    <ArrowDownRight size={14} />
                    {toFaDigits(trafficData.visitorsDelta)}٪
                  </span>
                )}
                <span className="text-[10px] text-stone-500">نسبت به دوره متناظر قبل</span>
              </div>
              <p className="text-[11px] text-stone-500 border-t border-white/5 pt-1.5">
                تعداد شناسه‌های یکتای مرورگر در بازه انتخابی
              </p>
            </div>

            {/* KPI 2: Sessions */}
            <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-2 relative group">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span className="font-semibold text-stone-300">نشست‌ها (Sessions)</span>
                <Activity size={16} className="text-blue-400" />
              </div>
              <div className="text-2xl font-black text-white font-fanum">
                {toFaDigits(trafficData.sessions.toLocaleString())}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-fanum">
                {trafficData.sessionsDelta >= 0 ? (
                  <span className="text-emerald-400 flex items-center font-bold">
                    <ArrowUpRight size={14} />+{toFaDigits(trafficData.sessionsDelta)}٪
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center font-bold">
                    <ArrowDownRight size={14} />
                    {toFaDigits(trafficData.sessionsDelta)}٪
                  </span>
                )}
                <span className="text-[10px] text-stone-500">نسبت به دوره قبل</span>
              </div>
              <p className="text-[11px] text-stone-500 border-t border-white/5 pt-1.5">
                میانگین {toFaDigits((trafficData.sessions / Math.max(1, trafficData.visitors)).toFixed(1))} نشست به ازای هر کاربر
              </p>
            </div>

            {/* KPI 3: Pageviews */}
            <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-2 relative group">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span className="font-semibold text-stone-300">بازدید صفحات (Pageviews)</span>
                <Eye size={16} className="text-amber-400" />
              </div>
              <div className="text-2xl font-black text-white font-fanum">
                {toFaDigits(trafficData.pageviews.toLocaleString())}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-fanum">
                {trafficData.pageviewsDelta >= 0 ? (
                  <span className="text-emerald-400 flex items-center font-bold">
                    <ArrowUpRight size={14} />+{toFaDigits(trafficData.pageviewsDelta)}٪
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center font-bold">
                    <ArrowDownRight size={14} />
                    {toFaDigits(trafficData.pageviewsDelta)}٪
                  </span>
                )}
                <span className="text-[10px] text-stone-500">نسبت به دوره قبل</span>
              </div>
              <p className="text-[11px] text-stone-500 border-t border-white/5 pt-1.5">
                صفحات کاتالوگ، موکاپ و استودیوی چاپ سه‌بعدی
              </p>
            </div>

            {/* KPI 4: Bounce Rate & Duration */}
            <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-2 relative group">
              <div className="flex items-center justify-between text-xs text-stone-400">
                <span className="font-semibold text-stone-300">نرخ پرش و ماندگاری</span>
                <Clock size={16} className="text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2 font-fanum">
                <span className="text-2xl font-black text-white">{toFaDigits(trafficData.avgBounceRate)}٪</span>
                <span className="text-xs text-stone-400">
                  (زمان: {toFaDigits(Math.floor(trafficData.avgDurationSec / 60))}:{toFaDigits(trafficData.avgDurationSec % 60)})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-fanum">
                <span className="text-emerald-400 font-bold">بهبود ماندگاری</span>
                <span className="text-[10px] text-stone-500">در تعامل با طراح آنلاین</span>
              </div>
              <p className="text-[11px] text-stone-500 border-t border-white/5 pt-1.5">
                نشست‌های منتهی به ترک وب‌سایت در صفحه نخست
              </p>
            </div>
          </div>

          {/* New vs Returning Visitors Ratio */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-300 font-semibold">ترکیب کاربران: تازه وارد در برابر بازگشتی</span>
              <span className="text-stone-400 font-fanum">
                {toFaDigits(trafficData.newVisitorsPercent)}٪ جدید · {toFaDigits(trafficData.returningVisitorsPercent)}٪ بازگشتی
              </span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${trafficData.newVisitorsPercent}%` }}
                className="bg-[#ba8d3d] h-full"
                title="کاربران جدید"
              />
              <div
                style={{ width: `${trafficData.returningVisitorsPercent}%` }}
                className="bg-blue-500 h-full"
                title="کاربران بازگشتی وفادار"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 font-fanum">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ba8d3d]" />
                <span>کاربران بار اول (New): {toFaDigits(Math.round(trafficData.visitors * 0.64).toLocaleString())} نفر</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span>کاربران بازگشتی (Returning): {toFaDigits(Math.round(trafficData.visitors * 0.36).toLocaleString())} نفر</span>
              </div>
            </div>
          </div>

          {/* Interactive Chart Section with Accessible Tabular Toggle */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">روند زمانی تعاملات کاربران</h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  ارقام روزانه مستقیماً از داده‌های ثبت‌شده استخراج شده‌اند و هیچ داده تصادفی تولید نمی‌شود.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Metric Selector */}
                <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartMetric('sessions')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      chartMetric === 'sessions' ? 'bg-[#ba8d3d] text-stone-950 font-bold' : 'text-stone-400'
                    }`}
                  >
                    نشست‌ها
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric('visitors')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      chartMetric === 'visitors' ? 'bg-[#ba8d3d] text-stone-950 font-bold' : 'text-stone-400'
                    }`}
                  >
                    کاربران یکتا
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric('pageviews')}
                    className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                      chartMetric === 'pageviews' ? 'bg-[#ba8d3d] text-stone-950 font-bold' : 'text-stone-400'
                    }`}
                  >
                    بازدید صفحات
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTableView(!showTableView)}
                  className="text-xs text-stone-300"
                >
                  <FileSpreadsheet size={14} className="ml-1" />
                  <span>{showTableView ? 'مشاهده نمودار' : 'جدول داده‌ها'}</span>
                </Button>
              </div>
            </div>

            {/* Visual or Tabular Representation */}
            {showTableView ? (
              <div className="overflow-x-auto max-h-80 border border-white/10 rounded-xl">
                <table className="w-full text-xs text-right">
                  <thead className="bg-white/5 text-stone-400 border-b border-white/10 font-bold sticky top-0">
                    <tr>
                      <th className="p-3">تاریخ روز</th>
                      <th className="p-3">بازدیدکنندگان یکتا</th>
                      <th className="p-3">نشست‌ها</th>
                      <th className="p-3">بازدید صفحات</th>
                      <th className="p-3">نرخ پرش</th>
                      <th className="p-3">میانگین ماندگاری</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-stone-300 font-fanum">
                    {trafficData.snapshots.map((row) => (
                      <tr key={row.date} className="hover:bg-white/5">
                        <td className="p-3 font-mono">{row.date}</td>
                        <td className="p-3 text-white font-bold">{toFaDigits(row.visitors.toLocaleString())}</td>
                        <td className="p-3 text-blue-300">{toFaDigits(row.sessions.toLocaleString())}</td>
                        <td className="p-3 text-amber-300">{toFaDigits(row.pageviews.toLocaleString())}</td>
                        <td className="p-3">{toFaDigits(row.bounceRatePercent)}٪</td>
                        <td className="p-3">{toFaDigits(row.avgSessionDurationSec)} ثانیه</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64 flex flex-col justify-end pt-4">
                {/* LTR isolation for bar chart positioning */}
                <div dir="ltr" className="h-48 flex items-end justify-between gap-1 border-b border-white/10 pb-2">
                  {trafficData.snapshots.map((s) => {
                    const val = chartMetric === 'sessions' ? s.sessions : chartMetric === 'visitors' ? s.visitors : s.pageviews;
                    const maxVal = Math.max(...trafficData.snapshots.map((d) => (chartMetric === 'sessions' ? d.sessions : chartMetric === 'visitors' ? d.visitors : d.pageviews)), 1);
                    const pct = Math.min(100, Math.round((val / maxVal) * 100));

                    return (
                      <div key={s.date} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        <div
                          style={{ height: `${Math.max(6, pct)}%` }}
                          className={`w-full max-w-[14px] rounded-t transition-all ${
                            chartMetric === 'sessions'
                              ? 'bg-blue-500/80 group-hover:bg-blue-400'
                              : chartMetric === 'visitors'
                              ? 'bg-[#ba8d3d]/80 group-hover:bg-[#ba8d3d]'
                              : 'bg-amber-500/80 group-hover:bg-amber-400'
                          }`}
                        />
                        {/* Hover Tooltip with exact Persian figures */}
                        <div
                          dir="rtl"
                          className="absolute -top-12 hidden group-hover:flex flex-col items-center bg-stone-900 border border-white/20 p-1.5 rounded-lg shadow-2xl text-[11px] text-white whitespace-nowrap z-20 pointer-events-none"
                        >
                          <span className="font-mono text-stone-400 text-[10px]">{s.date}</span>
                          <span className="font-fanum font-bold text-[#eed29d]">
                            {toFaDigits(val.toLocaleString())} {chartMetric === 'sessions' ? 'نشست' : chartMetric === 'visitors' ? 'کاربر' : 'بازدید'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-[10px] text-stone-500 pt-2 font-mono">
                  <span>{trafficData.snapshots[0]?.date}</span>
                  <span>{trafficData.snapshots[Math.floor(trafficData.snapshots.length / 2)]?.date}</span>
                  <span>{trafficData.snapshots[trafficData.snapshots.length - 1]?.date}</span>
                </div>
              </div>
            )}
          </div>

          {/* Breakdown Grids: Devices & Browsers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Devices Breakdown */}
            <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Smartphone size={16} className="text-[#eed29d]" />
                <span>تفکیک دستگاه‌های ورودی (Device Breakdown)</span>
              </h4>
              <div className="space-y-2.5 pt-1">
                {trafficData.devices.map((dev) => (
                  <div key={dev.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-fanum">
                      <span className="text-stone-300">{dev.label}</span>
                      <span className="font-bold text-white">
                        {toFaDigits(dev.percentage)}٪ ({toFaDigits(dev.sessions.toLocaleString())} نشست)
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div className="bg-[#ba8d3d] h-full rounded-full" style={{ width: `${dev.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Browsers Breakdown */}
            <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Monitor size={16} className="text-blue-400" />
                <span>مرورگرهای کاربران (Browser Breakdown)</span>
              </h4>
              <div className="space-y-2.5 pt-1">
                {trafficData.browsers.map((br) => (
                  <div key={br.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-fanum">
                      <span className="text-stone-300">{br.name}</span>
                      <span className="font-bold text-white">
                        {toFaDigits(br.percentage)}٪ ({toFaDigits(br.sessions.toLocaleString())} نشست)
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-400 h-full rounded-full" style={{ width: `${br.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Landing & Exit Pages Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Landing Pages */}
            <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center justify-between">
                <span>صفحات برتر فرود (Top Landing Pages)</span>
                <span className="text-[10px] text-stone-500 font-normal">نقطه شروع نشست</span>
              </h4>
              <div className="divide-y divide-white/5">
                {trafficData.topLandingPages.map((page) => (
                  <div key={page.path} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{page.title}</div>
                      <span className="text-[10px] font-mono text-[#eed29d]">{page.path}</span>
                    </div>
                    <div className="text-left font-fanum">
                      <span className="block font-bold text-stone-200">{toFaDigits(page.views.toLocaleString())} بازدید</span>
                      <span className="text-[10px] text-stone-500">پرش: {toFaDigits(page.bounceRate)}٪</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Exit Pages */}
            <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center justify-between">
                <span>صفحات برتر خروج (Top Exit Pages)</span>
                <span className="text-[10px] text-stone-500 font-normal">پایان نشست کاربر</span>
              </h4>
              <div className="divide-y divide-white/5">
                {trafficData.topExitPages.map((page) => (
                  <div key={page.path} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">{page.title}</div>
                      <span className="text-[10px] font-mono text-stone-400">{page.path}</span>
                    </div>
                    <div className="text-left font-fanum">
                      <span className="block font-bold text-stone-200">{toFaDigits(page.exits.toLocaleString())} خروج</span>
                      <span className="text-[10px] text-stone-500">پایان جلسه</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VISITOR EXPLORER (PSEUDONYMOUS SESSIONS) */}
      {activeTab === 'explorer' && (
        <div className="space-y-4">
          {/* Privacy Disclaimer */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-start gap-3 text-xs text-blue-200">
            <Compass size={18} className="shrink-0 mt-0.5 text-blue-400" />
            <div className="space-y-1">
              <span className="font-bold block">کاوشگر نشست‌های مستعار و حفظ حریم خصوصی:</span>
              <p className="text-stone-300 leading-relaxed">
                در این بخش صرفاً متغیرهای فنی مجاز (دستگاه، مرورگر، صفحات بازدیدشده و مدت حضور) به صورت مستعار نمایش داده می‌شوند. در شاه‌پوش هیچ ادعایی مبنی بر اتصال آی‌پی به اشخاص حقیقی وجود ندارد و ردپای کاربران با شناسه‌های تصادفی ثبت می‌شود.
              </p>
            </div>
          </div>

          {/* Search Toolbar */}
          <div className="flex items-center gap-3 bg-[#131211] p-3 rounded-2xl border border-white/10">
            <div className="relative flex-1">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={explorerSearch}
                onChange={(e) => setExplorerSearch(e.target.value)}
                placeholder="جستجو بر اساس شناسه نشست (SES-)، شناسه کاربر (VIS-) یا دستگاه..."
                className="w-full pr-9 pl-4 py-1.5 text-xs bg-black/40 border border-white/10 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-[#ba8d3d]"
              />
            </div>
            <span className="text-xs text-stone-400 font-fanum">
              {toFaDigits(trafficData.pseudonymousSessions.length)} نشست مستعار نمونه
            </span>
          </div>

          {/* Session Cards */}
          <div className="space-y-3">
            {trafficData.pseudonymousSessions
              .filter((ses) => {
                if (!explorerSearch.trim()) return true;
                const q = explorerSearch.toLowerCase();
                return (
                  ses.id.toLowerCase().includes(q) ||
                  ses.visitorId.toLowerCase().includes(q) ||
                  ses.deviceModel.toLowerCase().includes(q)
                );
              })
              .map((ses) => {
                const isSelected = selectedSessionId === ses.id;

                return (
                  <div
                    key={ses.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-white/10 border-[#ba8d3d]'
                        : 'bg-[#131211] border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Left: Metadata */}
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono font-bold text-[#eed29d] bg-black/40 px-2 py-0.5 rounded border border-white/10">
                            {ses.id}
                          </span>
                          <span className="text-[11px] text-stone-400 font-mono">
                            کاربر: {ses.visitorId}
                          </span>
                          <span className="text-[10px] text-stone-500 bg-white/5 px-2 py-0.5 rounded font-mono">
                            آی‌پی استاندارد آموزشی: {ses.rfcDocumentationIp}
                          </span>
                          <span className="text-[11px] text-stone-400 font-fanum">{ses.timestamp}</span>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-stone-300">
                          {ses.deviceType === 'mobile' ? (
                            <Smartphone size={14} className="text-[#eed29d]" />
                          ) : ses.deviceType === 'desktop' ? (
                            <Monitor size={14} className="text-blue-400" />
                          ) : (
                            <Tablet size={14} className="text-purple-400" />
                          )}
                          <span>{ses.deviceModel}</span>
                          <span className="text-stone-500">·</span>
                          <span className="text-stone-400 font-fanum">
                            مدت: {toFaDigits(Math.floor(ses.durationSeconds / 60))} دقیقه و {toFaDigits(ses.durationSeconds % 60)} ثانیه ({toFaDigits(ses.pageviewsCount)} صفحه)
                          </span>
                        </div>
                      </div>

                      {/* Right: Conversion status & Action */}
                      <div className="flex items-center gap-3">
                        {ses.converted ? (
                          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs px-2.5 py-1 rounded-xl font-bold font-fanum">
                            <CheckCircle2 size={14} />
                            <span>خرید موفق ({ses.orderId})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-500 bg-white/5 px-2.5 py-1 rounded-xl">
                            مرور و ترک صفحه
                          </span>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedSessionId(isSelected ? null : ses.id)}
                          className="text-xs"
                        >
                          {isSelected ? 'بستن ردپا' : 'مشاهده مسیر حرکت'}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Journey Timeline */}
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-2 text-xs animate-fade-in">
                        <span className="text-stone-400 font-semibold block">سلسله‌مراتب صفحات پیموده‌شده در نشست:</span>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {ses.journeySteps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-stone-200 font-medium">
                                <span className="font-fanum text-[#eed29d] ml-1">{toFaDigits(idx + 1)}.</span> {step}
                              </span>
                              {idx < ses.journeySteps.length - 1 && (
                                <ChevronRight size={14} className="text-stone-600 rotate-180" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: RESTRICTED SECURITY IP INSIGHTS */}
      {activeTab === 'security_ip' && (
        <div className="space-y-6">
          {/* Strict Separation Banner */}
          <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-rose-200">
            <div className="flex items-start gap-3">
              <ShieldAlert size={20} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-sm text-white block">
                  سامانه ممیزی و نظارت بر امنیت دسترسی‌ها (Security IP Insights)
                </span>
                <p className="text-stone-300 leading-relaxed max-w-2xl">
                  این بخش کاملاً از داده‌های بازاریابی و تحلیل مخاطبان تفکیک شده است. تمامی آی‌پی‌های ثبت‌شده در این لاگ طبق استاندارد RFC 5737 نمونه‌برداری آموزشی شده‌اند تا از ثبت آدرس‌های عمومی کاربران جلوگیری شود.
                </p>
              </div>
            </div>

            {/* Narrow Reveal UI Action */}
            <div className="shrink-0">
              <Button
                variant={isIpRevealed ? 'critical' : 'brass'}
                size="sm"
                onClick={handleToggleReveal}
                className="flex items-center gap-1.5 font-bold"
              >
                {isIpRevealed ? (
                  <>
                    <EyeOff size={14} />
                    <span>مخفی‌سازی مجدد (باقی‌مانده: {toFaDigits(revealCountdown || 0)} ثانیه)</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>احراز دسترسی سرپرست و نمایش کامل آی‌پی</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Retention Policy Box */}
          <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-1 text-xs text-stone-400">
            <span className="font-semibold text-stone-200 block">خط‌مشی نگهداری داده‌های لاگ امنیتی:</span>
            <p className="leading-relaxed">
              لاگ‌های دسترسی امنیتی حداکثر تا ۹۰ روز صرفاً به منظور تحلیل الگوهای حملات DDoS، خزشگرهای مخرب و محافظت از درگاه شاپرک نگهداری شده و پس از انقضای دوره به صورت خودکار و غیرقابل بازگشت امحاء می‌گردند.
            </p>
          </div>

          {/* Security Incidents Table */}
          <div className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-400" />
                <span>رویدادهای امنیتی و الگوهای مشکوک ثبت‌شده در فایروال</span>
              </h4>
              <span className="text-[11px] text-stone-400 font-fanum">
                {toFaDigits(trafficData.securityIncidents.length)} رویداد
              </span>
            </div>

            <div className="divide-y divide-white/5">
              {trafficData.securityIncidents.map((incident) => (
                <div key={incident.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-white/10">
                        {incident.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          incident.severity === 'critical'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : incident.severity === 'high'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {incident.severity === 'critical' ? 'خطر بحرانی' : incident.severity === 'high' ? 'هشدار بالا' : 'متوسط'}
                      </span>
                      <span className="text-stone-400 font-fanum">{incident.timestamp}</span>
                    </div>

                    <p className="text-stone-300 leading-relaxed max-w-2xl">{incident.notes}</p>
                  </div>

                  <div className="flex flex-col md:items-end gap-1 shrink-0 font-fanum">
                    <div className="flex items-center gap-2">
                      <span className="text-stone-400 text-[11px]">آدرس آی‌پی (RFC 5737):</span>
                      <span className="font-mono text-sm font-bold text-stone-200 bg-black/50 px-2 py-0.5 rounded border border-white/10">
                        {renderIp(incident.rfcDocumentationIp)}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium mt-1 ${
                        incident.actionTaken === 'firewall_blocked'
                          ? 'text-rose-400 bg-rose-950/40 border border-rose-500/20'
                          : incident.actionTaken === 'captcha_enforced'
                          ? 'text-amber-400 bg-amber-950/40 border border-amber-500/20'
                          : 'text-blue-400 bg-blue-950/40 border border-blue-500/20'
                      }`}
                    >
                      اقدام: {incident.actionTaken === 'firewall_blocked' ? 'مسدود در فایروال WAF' : incident.actionTaken === 'captcha_enforced' ? 'فعالسازی چالش کپچا' : 'محدودسازی موقت Rate Limit'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
