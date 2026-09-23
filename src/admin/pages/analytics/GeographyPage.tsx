import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Globe,
  Navigation,
  Download,
  Info,
  Truck,
  Clock,
  TrendingUp,
  ShieldCheck,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { toFaDigits, formatTomans } from '../../utils/formatters';
import { downloadCsv } from '../../utils/exportCsv';
import { DateRangePreset } from '../../domain/types';

export const GeographyPage: React.FC = () => {
  const { getGeographyAnalytics } = useAdminRepository();

  const [timeframe, setTimeframe] = useState<DateRangePreset>('30d');
  const [selectedCarrierFilter, setSelectedCarrierFilter] = useState<string>('all');

  const geoData = useMemo(() => {
    return getGeographyAnalytics(timeframe);
  }, [getGeographyAnalytics, timeframe]);

  // Filtered provinces
  const filteredProvinces = useMemo(() => {
    if (selectedCarrierFilter === 'all') return geoData.provinces;
    return geoData.provinces.filter((p) => p.preferredCarrier.includes(selectedCarrierFilter));
  }, [geoData.provinces, selectedCarrierFilter]);

  // CSV Export
  const handleExportCsv = () => {
    const headers = ['استان', 'شهرهای تحت پوشش', 'تعداد سفارشات', 'سهم درصدی (٪)', 'درآمد حاصله (تومان)', 'زمان تحویل (روز)', 'ناوگان پستی'];
    const rows = geoData.provinces.map((p) => [
      p.province,
      p.majorHub,
      p.ordersCount,
      p.percentageShare,
      p.revenueTomans,
      p.averageLeadDays,
      p.preferredCarrier,
    ]);
    downloadCsv(`geography-analytics-${timeframe}`, headers, rows);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Geolocation Caveat & Disclaimer Banner */}
      <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-start gap-3 text-xs">
        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-stone-300 leading-relaxed">
          <strong className="text-blue-200 block font-semibold">
            اطلاعیه تقریب و عدم ردیابی مکانی بلادرنگ:
          </strong>
          <span>
            تحلیل جغرافیایی سفارشات بر اساس آدرس‌های ثبت‌شده پستی در فاکتورها و تخمین تجمیعی منطقه‌ای تنظیم شده است. این سامانه هیچ‌گونه ردیابی بلادرنگ یا شناسایی مختصات جغرافیایی GPS از مرورگر یا دستگاه مشتریان انجام نمی‌دهد.
          </span>
        </div>
      </div>

      {/* Header */}
      <AdminPageHeader
        title="توزیع استانی و جغرافیایی سفارش‌ها"
        description="تفکیک مبادی خرید، حجم فروش استانی، زمان تحویل مرسولات پستی و سهم مناطق مختلف کشور"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 text-xs text-stone-300"
          >
            <Download size={14} />
            <span>خروجی اکسل (CSV)</span>
          </Button>
        }
      />

      {/* Date Filter */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-stone-400 ml-2">بازه زمانی:</span>
          {[
            { id: 'today', label: 'امروز' },
            { id: '7d', label: '۷ روز گذشته' },
            { id: '30d', label: '۳۰ روز گذشته' },
            { id: '90d', label: '۹۰ روز گذشته' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setTimeframe(preset.id as DateRangePreset)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors cursor-pointer ${
                timeframe === preset.id
                  ? 'bg-[#eed29d] text-stone-950 font-bold'
                  : 'bg-white/5 text-stone-400 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Carrier Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-400">فیلتر ناوگان:</span>
          <select
            value={selectedCarrierFilter}
            onChange={(e) => setSelectedCarrierFilter(e.target.value)}
            className="bg-black/50 border border-white/10 text-white rounded-xl px-2.5 py-1 text-xs outline-none focus:border-[#ba8d3d]"
          >
            <option value="all">همه روش‌های ارسال</option>
            <option value="پیک">پیک اختصاصی تهران</option>
            <option value="تیپاکس">تیپاکس اکسپرس</option>
            <option value="پیشتاز">پست پیشتاز</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>تعداد استان‌های فعال</span>
            <Globe size={16} className="text-[#eed29d]" />
          </div>
          <div className="text-2xl font-black text-white font-fanum">
            {toFaDigits(geoData.coveredProvincesCount)} استان
          </div>
          <span className="text-[11px] text-stone-500 block">پوشش کامل سراسر کشور</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>قطب اصلی فروش</span>
            <MapPin size={16} className="text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-fanum">
            {geoData.leadProvince}
          </div>
          <span className="text-[11px] text-stone-500 block">بالاترین حجم سفارشات آتلیه</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>میانگین زمان رسیدن مرسوله</span>
            <Clock size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-fanum">
            {toFaDigits(geoData.averageNationalLeadDays)} روز کاری
          </div>
          <span className="text-[11px] text-stone-500 block">از زمان تحویل به باربری</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-400">
            <span>کل سفارشات بازه</span>
            <Truck size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-fanum">
            {toFaDigits(geoData.totalOrders)} فاکتور
          </div>
          <span className="text-[11px] text-stone-500 block">فروش: {formatTomans(geoData.totalRevenue).fullWithUnit}</span>
        </div>
      </div>

      {/* Visual Provincial Distribution Bars */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp size={16} className="text-[#eed29d]" />
          <span>توزیع بصری سهم استان‌ها از سفارشات پوشاک و چاپ شاه‌پوش</span>
        </h3>

        <div className="space-y-3 pt-1">
          {geoData.provinces.map((prov) => (
            <div key={prov.province} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{prov.province}</span>
                  <span className="text-[11px] text-stone-400">({prov.majorHub})</span>
                </div>
                <div className="flex items-center gap-3 text-stone-300 font-fanum">
                  <span>{toFaDigits(prov.ordersCount)} سفارش</span>
                  <span className="font-bold text-[#eed29d]">{toFaDigits(prov.percentageShare)}٪</span>
                </div>
              </div>

              <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    prov.isUnknownOrProxy ? 'bg-stone-500' : 'bg-[#ba8d3d]'
                  }`}
                  style={{ width: `${Math.max(2, prov.percentageShare)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Geographic Aggregate Table */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white flex items-center gap-2">
            <FileSpreadsheet size={15} className="text-[#eed29d]" />
            <span>جدول جامع توزیع جغرافیایی، درآمد و ناوگان حمل و نقل</span>
          </h3>
          <span className="text-[11px] text-stone-400 font-fanum">
            {toFaDigits(filteredProvinces.length)} منطقه پستی
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-white/5 text-stone-400 border-b border-white/10 font-bold">
              <tr>
                <th className="p-3.5">استان و مرکز توزیع</th>
                <th className="p-3.5">تعداد سفارشات</th>
                <th className="p-3.5">سهم از کل فروش</th>
                <th className="p-3.5">درآمد ناخالص (تومان)</th>
                <th className="p-3.5">زمان تحویل به مشتری</th>
                <th className="p-3.5">روش ارسال غالب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-stone-300 font-fanum">
              {filteredProvinces.map((prov) => (
                <tr
                  key={prov.province}
                  className={`hover:bg-white/5 transition-colors ${
                    prov.isUnknownOrProxy ? 'bg-stone-900/40 text-stone-400' : ''
                  }`}
                >
                  <td className="p-3.5">
                    <div className="font-bold text-white text-xs">{prov.province}</div>
                    <div className="text-[10px] text-stone-400 mt-0.5">{prov.majorHub}</div>
                  </td>
                  <td className="p-3.5 font-bold text-white">
                    {toFaDigits(prov.ordersCount)} سفارش
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-[#eed29d]">{toFaDigits(prov.percentageShare)}٪</span>
                  </td>
                  <td className="p-3.5 text-stone-200">
                    {formatTomans(prov.revenueTomans).fullWithUnit}
                  </td>
                  <td className="p-3.5">
                    <span className="text-emerald-400 font-bold">{toFaDigits(prov.averageLeadDays)} روز</span>
                  </td>
                  <td className="p-3.5">
                    <span className="text-stone-300 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                      {prov.preferredCarrier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Fallback explanation box */}
        <div className="p-3.5 bg-black/30 border-t border-white/5 flex items-center gap-2 text-[11px] text-stone-400">
          <AlertCircle size={14} className="text-stone-500 shrink-0" />
          <span>
            سفارشات رده «نامشخص / پروکسی و مسیریابی امن» ناشی از ثبت سفارش از طریق فیلترشکن است که آدرس فیزیکی مقصد فاکتور به درستی ثبت گردیده و بدون تاخیر ارسال می‌شود.
          </span>
        </div>
      </div>
    </div>
  );
};
