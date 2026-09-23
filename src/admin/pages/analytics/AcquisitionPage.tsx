import React, { useState, useMemo } from 'react';
import {
  Share2,
  Compass,
  Search,
  Instagram,
  Globe,
  ExternalLink,
  Download,
  Info,
  TrendingUp,
  DollarSign,
  Filter,
  Layers,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { toFaDigits, formatTomans } from '../../utils/formatters';
import { downloadCsv } from '../../utils/exportCsv';
import { DateRangePreset } from '../../domain/types';

export const AcquisitionPage: React.FC = () => {
  const { getAcquisitionAnalytics } = useAdminRepository();

  const [timeframe, setTimeframe] = useState<DateRangePreset>('30d');
  const [selectedChannelCategory, setSelectedChannelCategory] = useState<string>('all');
  const [searchUtm, setSearchUtm] = useState<string>('');

  const acqData = useMemo(() => {
    return getAcquisitionAnalytics(timeframe);
  }, [getAcquisitionAnalytics, timeframe]);

  // Filtered UTM Campaigns
  const filteredCampaigns = useMemo(() => {
    return acqData.utmCampaigns.filter((c) => {
      if (selectedChannelCategory !== 'all' && c.source !== selectedChannelCategory) return false;
      if (searchUtm.trim()) {
        const q = searchUtm.toLowerCase();
        return (
          c.campaign.toLowerCase().includes(q) ||
          c.medium.toLowerCase().includes(q) ||
          c.source.toLowerCase().includes(q) ||
          c.content.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [acqData.utmCampaigns, selectedChannelCategory, searchUtm]);

  // Total Attributed Paid Revenue
  const totalAttributedRevenue = useMemo(() => {
    return acqData.channels.reduce((s, c) => s + c.revenueTomans, 0);
  }, [acqData.channels]);

  // CSV Export
  const handleExportCsv = () => {
    const headers = ['منبع (utm_source)', 'رسانه (utm_medium)', 'کمپین (utm_campaign)', 'محتوا (utm_content)', 'نشست‌ها', 'سفارشات', 'نرخ تبدیل (٪)', 'درآمد منسوب (تومان)'];
    const rows = acqData.utmCampaigns.map((c) => [
      c.source,
      c.medium,
      c.campaign,
      c.content,
      c.sessions,
      c.orders,
      c.conversionRatePercent,
      c.attributedRevenueTomans,
    ]);
    downloadCsv(`acquisition-utm-${timeframe}`, headers, rows);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Illustrative Notice & Attribution Definition */}
      <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-start gap-3 text-xs">
        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-stone-300 leading-relaxed">
          <strong className="text-blue-200 block font-semibold">
            مدل انتساب و داده‌های کمپین (Attribution Model):
          </strong>
          <span>
            کانال‌های جذب بر مبنای مدل انتساب آخرین تعامل (Last-Click Attribution) در ساختار داده‌های دترمینستیک کارگاه تحلیل شده‌اند. درآمد حاصله مستقیماً به تراکنش‌های پرداختی شاپرک که دارای شناسه رهگیری کمپین بوده‌اند متصل و تطبیق داده شده است.
          </span>
        </div>
      </div>

      {/* Header */}
      <AdminPageHeader
        title="کانال‌های جذب مشتری، ارجاع‌ها و پارامترهای UTM"
        description="ارزیابی بازدهی تبلیغات اینستاگرام، سئوی ارگانیک، ورودی‌های ترب و تبدیل بازدیدکنندگان به خریدار"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 text-xs text-stone-300"
          >
            <Download size={14} />
            <span>خروجی کمپین‌ها (CSV)</span>
          </Button>
        }
      />

      {/* Date Filter */}
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

        <div className="text-xs text-stone-400 font-fanum">
          مجموع فروش جذب‌شده: <strong className="text-white">{formatTomans(totalAttributedRevenue).fullWithUnit}</strong>
        </div>
      </div>

      {/* Primary Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {acqData.channels.map((chan) => (
          <div
            key={chan.channel}
            className="p-4 bg-[#131211] border border-white/10 rounded-2xl space-y-3 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{chan.label}</span>
                <span className="text-[10px] font-mono text-[#eed29d] bg-white/5 px-2 py-0.5 rounded">
                  {chan.channel}
                </span>
              </div>
              <div className="text-xl font-black text-white mt-3 font-fanum">
                {toFaDigits(chan.sessionsCount.toLocaleString())} نشست
              </div>
            </div>

            <div className="space-y-1.5 border-t border-white/5 pt-2 text-xs">
              <div className="flex items-center justify-between font-fanum">
                <span className="text-stone-400">نرخ تبدیل به خرید:</span>
                <span className="font-bold text-emerald-400">{toFaDigits(chan.conversionRatePercent)}٪</span>
              </div>
              <div className="flex items-center justify-between font-fanum">
                <span className="text-stone-400">فروش پرداخت‌شده:</span>
                <span className="text-stone-200 font-semibold">{formatTomans(chan.revenueTomans).fullWithUnit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Conversion by Source Chart */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <TrendingUp size={16} className="text-[#eed29d]" />
          <span>مقایسه سهم کانال‌ها در تولید فروش پرداخت‌شده (تومان)</span>
        </h3>

        <div className="space-y-3 pt-2">
          {acqData.channels.map((ch) => {
            const maxRev = Math.max(...acqData.channels.map((c) => c.revenueTomans), 1);
            const pct = Math.round((ch.revenueTomans / maxRev) * 100);

            return (
              <div key={ch.channel} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-200 font-medium">{ch.label}</span>
                  <div className="flex items-center gap-3 font-fanum">
                    <span className="text-stone-400">تبدیل: {toFaDigits(ch.conversionRatePercent)}٪</span>
                    <span className="font-bold text-[#eed29d]">{formatTomans(ch.revenueTomans).fullWithUnit}</span>
                  </div>
                </div>
                <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-[#ba8d3d] h-full rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* UTM Campaigns Table Section */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Share2 size={15} className="text-[#eed29d]" />
              <span>جدول تفصیلی کدهای رهگیری UTM و بازدهی کمپین‌ها</span>
            </h3>
            <span className="text-[11px] text-stone-400">
              تفکیک منبع، رسانه، نام کمپین و محتوای تبلیغاتی جهت سنجش دقیق بازگشت سرمایه تبلیغات
            </span>
          </div>

          {/* Search UTM & Filter Category */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                value={searchUtm}
                onChange={(e) => setSearchUtm(e.target.value)}
                placeholder="جستجو در کمپین..."
                className="pr-8 pl-3 py-1 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-stone-500 outline-none focus:border-[#ba8d3d]"
              />
            </div>

            <select
              value={selectedChannelCategory}
              onChange={(e) => setSelectedChannelCategory(e.target.value)}
              className="bg-black/50 border border-white/10 text-white rounded-xl px-2.5 py-1 text-xs outline-none focus:border-[#ba8d3d]"
            >
              <option value="all">همه مبادی (Sources)</option>
              <option value="instagram">Instagram</option>
              <option value="google">Google</option>
              <option value="direct">Direct</option>
              <option value="telegram">Telegram</option>
              <option value="torob">Torob</option>
              <option value="influencer_collab">Influencer</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto border border-white/5 rounded-xl">
          <table className="w-full text-xs text-right">
            <thead className="bg-white/5 text-stone-400 border-b border-white/10 font-bold">
              <tr>
                <th className="p-3">منبع و رسانه (Source / Medium)</th>
                <th className="p-3">کمپین و محتوا (Campaign / Content)</th>
                <th className="p-3">نشست‌ها</th>
                <th className="p-3">سفارشات</th>
                <th className="p-3">نرخ تبدیل</th>
                <th className="p-3">فروش منسوب (تومان)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-stone-300 font-fanum">
              {filteredCampaigns.map((camp, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="p-3">
                    <span className="font-mono text-[#eed29d] font-bold block">{camp.source}</span>
                    <span className="text-[10px] text-stone-400 font-mono">/ {camp.medium}</span>
                  </td>
                  <td className="p-3">
                    <div className="font-mono text-white text-xs font-semibold">{camp.campaign}</div>
                    <div className="text-[10px] text-stone-400 font-mono mt-0.5">{camp.content}</div>
                  </td>
                  <td className="p-3 text-stone-200">
                    {toFaDigits(camp.sessions.toLocaleString())}
                  </td>
                  <td className="p-3 font-bold text-white">
                    {toFaDigits(camp.orders)} فاکتور
                  </td>
                  <td className="p-3">
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {toFaDigits(camp.conversionRatePercent)}٪
                    </span>
                  </td>
                  <td className="p-3 font-bold text-stone-200">
                    {formatTomans(camp.attributedRevenueTomans).fullWithUnit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
