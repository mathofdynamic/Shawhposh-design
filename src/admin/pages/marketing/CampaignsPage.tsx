import React, { useState, useMemo } from 'react';
import {
  Share2,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  Edit3,
  ExternalLink,
  DollarSign,
  Calendar,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  Tag,
  Eye,
  ShoppingBag,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Button, SearchInput, Badge, FormField, Input, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { MarketingCampaign } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

export const CampaignsPage: React.FC = () => {
  const { getMarketingCampaigns, createMarketingCampaign, updateMarketingCampaign, getDiscounts } =
    useAdminRepository();
  const { addToast } = useToast();

  const campaigns = getMarketingCampaigns();
  const discounts = getDiscounts();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'scheduled' | 'completed' | 'paused'>('all');
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<MarketingCampaign>>({
    name: '',
    utmSource: 'instagram',
    utmMedium: 'influencer_story',
    utmCampaign: 'autumn_drop',
    utmContent: '',
    utmTerm: '',
    targetUrl: 'https://shahpoosh.ir/collections/shahneshin',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'active',
    adSpendCostTomans: undefined,
    hasInstrumentedCost: false,
    linkedDiscountCode: '',
    notes: '',
  });

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrlId(id);
    setTimeout(() => setCopiedUrlId(null), 2000);
  };

  // Generate UTM URL in real time
  const generatedUtmUrl = useMemo(() => {
    const base = formData.targetUrl?.trim() || 'https://shahpoosh.ir';
    try {
      const url = new URL(base.startsWith('http') ? base : `https://${base}`);
      if (formData.utmSource) url.searchParams.set('utm_source', formData.utmSource);
      if (formData.utmMedium) url.searchParams.set('utm_medium', formData.utmMedium);
      if (formData.utmCampaign) url.searchParams.set('utm_campaign', formData.utmCampaign);
      if (formData.utmContent) url.searchParams.set('utm_content', formData.utmContent);
      if (formData.utmTerm) url.searchParams.set('utm_term', formData.utmTerm);
      return url.toString();
    } catch {
      return `${base}?utm_source=${formData.utmSource || ''}&utm_campaign=${formData.utmCampaign || ''}`;
    }
  }, [
    formData.targetUrl,
    formData.utmSource,
    formData.utmMedium,
    formData.utmCampaign,
    formData.utmContent,
    formData.utmTerm,
  ]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.utmCampaign.toLowerCase().includes(search.toLowerCase()) ||
        c.utmSource.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [campaigns, search, statusFilter]);

  const handleOpenCreate = () => {
    setEditingCampaignId(null);
    setFormData({
      name: '',
      utmSource: 'instagram',
      utmMedium: 'influencer_story',
      utmCampaign: 'autumn_drop',
      utmContent: '',
      utmTerm: '',
      targetUrl: 'https://shahpoosh.ir/collections/shahneshin',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'active',
      adSpendCostTomans: undefined,
      hasInstrumentedCost: false,
      linkedDiscountCode: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (camp: MarketingCampaign) => {
    setEditingCampaignId(camp.id);
    setFormData({
      ...camp,
      startDate: camp.startDate ? camp.startDate.split('T')[0] : '',
      endDate: camp.endDate ? camp.endDate.split('T')[0] : '',
    });
    setIsModalOpen(true);
  };

  const handleSaveCampaign = () => {
    if (!formData.name?.trim()) {
      addToast({
        title: 'عنوان کمپین الزامی است',
        description: 'لطفاً نام یا شناسه توصیفی کمپین تبلیغاتی را وارد کنید.',
        type: 'error',
      });
      return;
    }
    if (!formData.utmSource?.trim() || !formData.utmCampaign?.trim()) {
      addToast({
        title: 'پارامترهای ناقص UTM',
        description: 'پارامترهای UTM Source و UTM Campaign الزامی هستند.',
        type: 'error',
      });
      return;
    }

    const payload = {
      name: formData.name.trim(),
      utmSource: formData.utmSource.trim().toLowerCase(),
      utmMedium: formData.utmMedium?.trim().toLowerCase() || 'referral',
      utmCampaign: formData.utmCampaign.trim().toLowerCase(),
      utmContent: formData.utmContent?.trim(),
      utmTerm: formData.utmTerm?.trim(),
      targetUrl: generatedUtmUrl,
      startDate: formData.startDate ? `${formData.startDate}T00:00:00.000Z` : '',
      endDate: formData.endDate ? `${formData.endDate}T23:59:59.000Z` : '',
      status: formData.status || 'active',
      adSpendCostTomans:
        formData.hasInstrumentedCost && formData.adSpendCostTomans
          ? Number(formData.adSpendCostTomans)
          : undefined,
      hasInstrumentedCost: Boolean(formData.hasInstrumentedCost),
      linkedDiscountCode: formData.linkedDiscountCode?.trim() || undefined,
      notes: formData.notes?.trim() || '',
    };

    if (editingCampaignId) {
      updateMarketingCampaign(editingCampaignId, payload, 'سهراب اخوان (مدیر فروش)');
    } else {
      createMarketingCampaign(payload, 'سهراب اخوان (مدیر فروش)');
    }

    setIsModalOpen(false);
  };

  // Aggregated KPI Stats
  const totalVisits = campaigns.reduce((sum, c) => sum + (c.trackedVisits || 0), 0);
  const totalOrders = campaigns.reduce((sum, c) => sum + (c.trackedOrders || 0), 0);
  const totalRevenue = campaigns.reduce((sum, c) => sum + (c.attributedRevenueTomans || 0), 0);
  const totalSpend = campaigns.reduce(
    (sum, c) => sum + (c.hasInstrumentedCost && c.adSpendCostTomans ? c.adSpendCostTomans : 0),
    0
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="کمپین‌های بازاریابی، پارامترهای UTM و انتساب درآمد"
        description="ردیابی کانال‌های ورودی تبلیغات، ساخت خودکار لینک‌های دارای برچسب UTM، سنجش دقیق هزینه واقعی و انتساب سفارش‌ها بدون ارقام ساختگی."
        actions={
          <Button variant="brass" size="sm" onClick={handleOpenCreate}>
            <Plus size={13} className="ml-1" />
            تعریف کمپین جدید
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">بازدیدهای ردیابی‌شده کل</div>
            <div className="text-xl font-bold text-white font-fanum mt-1">
              {toFaDigits(totalVisits.toLocaleString())} کلیک
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Eye size={20} />
          </div>
        </div>

        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">سفارشات قطعی منتسب</div>
            <div className="text-xl font-bold text-white font-fanum mt-1">
              {toFaDigits(totalOrders.toLocaleString())} سفارش
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShoppingBag size={20} />
          </div>
        </div>

        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">درآمد منتسب به کمپین‌ها</div>
            <div className="text-xl font-bold text-[#eed29d] font-fanum mt-1">
              {toFaDigits(totalRevenue.toLocaleString())} تومان
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#ba8d3d]/10 border border-[#ba8d3d]/20 flex items-center justify-center text-[#eed29d]">
            <TrendingUp size={20} />
          </div>
        </div>

        <div className="bg-[#131211] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-stone-400">هزینه تبلیغاتی ثبت‌شده</div>
            <div className="text-xl font-bold text-stone-300 font-fanum mt-1">
              {toFaDigits(totalSpend.toLocaleString())} تومان
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-stone-800 border border-white/10 flex items-center justify-center text-stone-400">
            <DollarSign size={20} />
          </div>
        </div>
      </div>

      {/* Honest Attribution Disclosure Notice */}
      <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/10 flex items-start gap-3">
        <AlertCircle size={18} className="text-[#eed29d] shrink-0 mt-0.5" />
        <div className="text-xs text-stone-300 leading-relaxed">
          <span className="font-bold text-white">پروتکل صداقت در سنجش بازدهی تبلیغات (ROAS Guardrail):</span> شاخص ROAS تنها در صورتی محاسبه و اعلام می‌شود که هزینه مستقیم آگهی (Ad Spend) در پایگاه داده ثبت و تایید شده باشد. در کمپین‌های ارگانیک، پست‌های بدون هزینه ثبت‌شده یا کانال‌های تلگرامی رایگان، از درج ارقام ساختگی ROAS خودداری می‌شود.
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#131211] border border-white/10 rounded-2xl p-4">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس عنوان، UTM Campaign یا منبع..."
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-stone-300"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="active">در حال اجرا</option>
            <option value="scheduled">زمان‌بندی‌شده</option>
            <option value="completed">پایان‌یافته</option>
            <option value="paused">متوقف‌شده</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-[#131211] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-stone-400">
                <th className="py-3 px-4 font-normal">عنوان کمپین و منبع</th>
                <th className="py-3 px-4 font-normal">پارامترهای UTM</th>
                <th className="py-3 px-4 font-normal">لینک اختصاصی و کوپن</th>
                <th className="py-3 px-4 font-normal">بازدید / سفارشات</th>
                <th className="py-3 px-4 font-normal">درآمد منتسب</th>
                <th className="py-3 px-4 font-normal">هزینه تبلیغات / ROAS</th>
                <th className="py-3 px-4 font-normal">وضعیت</th>
                <th className="py-3 px-4 font-normal text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-stone-500">
                    هیچ کمپینی با این فیلترها یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((camp) => {
                  const roas =
                    camp.hasInstrumentedCost && camp.adSpendCostTomans && camp.adSpendCostTomans > 0
                      ? (camp.attributedRevenueTomans / camp.adSpendCostTomans).toFixed(1)
                      : null;

                  return (
                    <tr key={camp.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-white">{camp.name}</div>
                        <div className="text-[10px] text-stone-400 font-mono mt-0.5 flex items-center gap-2">
                          <span>{camp.id}</span>
                          <span>•</span>
                          <span className="text-[#eed29d]">{camp.utmSource}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-stone-300">
                        <div>
                          <span className="text-stone-500">campaign:</span> {camp.utmCampaign}
                        </div>
                        {camp.utmMedium && (
                          <div>
                            <span className="text-stone-500">medium:</span> {camp.utmMedium}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyUrl(camp.targetUrl, camp.id)}
                            className="bg-[#1c1a17] border border-white/10 hover:border-white/20 text-stone-300 px-2 py-1 rounded text-[11px] flex items-center gap-1.5"
                            title="کپی لینک اختصاصی UTM"
                          >
                            {copiedUrlId === camp.id ? (
                              <Check size={12} className="text-emerald-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                            <span>کپی لینک</span>
                          </button>

                          {camp.linkedDiscountCode && (
                            <span className="bg-[#ba8d3d]/10 border border-[#ba8d3d]/20 text-[#eed29d] px-2 py-0.5 rounded text-[10px] font-mono">
                              {camp.linkedDiscountCode}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-fanum">
                        <div className="text-white font-bold">
                          {toFaDigits(camp.trackedOrders)} سفارش
                        </div>
                        <div className="text-[10px] text-stone-400">
                          از {toFaDigits(camp.trackedVisits.toLocaleString())} کلیک
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-fanum">
                        <div className="text-emerald-400 font-bold">
                          {toFaDigits(camp.attributedRevenueTomans.toLocaleString())} ت
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-fanum">
                        {camp.hasInstrumentedCost && camp.adSpendCostTomans ? (
                          <div>
                            <div className="text-stone-300">
                              {toFaDigits(camp.adSpendCostTomans.toLocaleString())} ت
                            </div>
                            {roas && (
                              <div className="text-[10px] text-[#eed29d] font-bold">
                                بازدهی: {toFaDigits(roas)}x
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-stone-500 italic">
                            ثبت‌نشده (فاقد ROAS فرضی)
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            camp.status === 'active'
                              ? 'success'
                              : camp.status === 'completed'
                              ? 'neutral'
                              : 'info'
                          }
                        >
                          {camp.status === 'active'
                            ? 'در حال اجرا'
                            : camp.status === 'completed'
                            ? 'پایان‌یافته'
                            : 'زمان‌بندی‌شده'}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenEdit(camp)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-white/5"
                          title="ویرایش کمپین"
                        >
                          <Edit3 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131211] border border-white/10 rounded-3xl max-w-2xl w-full p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white">
                {editingCampaignId ? 'ویرایش کمپین بازاریابی' : 'تعریف کمپین و ساخت لینک UTM'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-white text-xs"
              >
                انصراف
              </button>
            </div>

            <div className="space-y-4">
              <FormField label="نام کمپین بازاریابی">
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: کمپین استوری اینستاگرام - دراپ پاییزه شاه‌نشین"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FormField label="منبع ترافیک (utm_source)">
                    <Input
                      value={formData.utmSource}
                      onChange={(e) => setFormData({ ...formData, utmSource: e.target.value })}
                      placeholder="instagram, google, telegram..."
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="رسانه تبلیغاتی (utm_medium)">
                    <Input
                      value={formData.utmMedium}
                      onChange={(e) => setFormData({ ...formData, utmMedium: e.target.value })}
                      placeholder="cpc, influencer_story, banner..."
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="شناسه کمپین (utm_campaign)">
                    <Input
                      value={formData.utmCampaign}
                      onChange={(e) => setFormData({ ...formData, utmCampaign: e.target.value })}
                      placeholder="shahneshin_fall, hoodie_drop..."
                    />
                  </FormField>
                </div>

                <div>
                  <FormField label="محتوا یا نسخه خلاقیت (utm_content)">
                    <Input
                      value={formData.utmContent}
                      onChange={(e) => setFormData({ ...formData, utmContent: e.target.value })}
                      placeholder="unboxing_video, banner_top..."
                    />
                  </FormField>
                </div>
              </div>

              <FormField label="آدرس صفحه مقصد در فروشگاه">
                <Input
                  value={formData.targetUrl}
                  onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                  placeholder="https://shahpoosh.ir/collections/shahneshin"
                />
              </FormField>

              {/* Generated Live UTM Preview */}
              <div className="p-3.5 rounded-xl bg-[#0c0b0a] border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span className="flex items-center gap-1.5">
                    <LinkIcon size={12} className="text-[#eed29d]" />
                    <span>پیش‌نمایش لینک کامل ردیابی (UTM Tagged URL):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedUtmUrl);
                      addToast({
                        title: 'لینک کپی شد',
                        description: 'آدرس رهگیری کمپین در کلیپ‌بورد کپی شد.',
                        type: 'info',
                      });
                    }}
                    className="text-[#eed29d] hover:underline text-[11px]"
                  >
                    کپی لینک
                  </button>
                </div>
                <div className="font-mono text-[11px] text-stone-300 break-all p-2 bg-[#181614] rounded-lg border border-white/5" dir="ltr">
                  {generatedUtmUrl}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FormField label="کد تخفیف مرتبط (اختیاری)">
                    <select
                      value={formData.linkedDiscountCode}
                      onChange={(e) => setFormData({ ...formData, linkedDiscountCode: e.target.value })}
                      className="w-full bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="">-- بدون کوپن اختصاصی --</option>
                      {discounts.map((d) => (
                        <option key={d.id} value={d.code || d.id}>
                          {d.code ? `[${d.code}]` : ''} {d.title}
                        </option>
                      ))}
                    </select>
                  </FormField>
                </div>

                <div>
                  <FormField label="وضعیت اجرای کمپین">
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-[#1c1a17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    >
                      <option value="active">در حال اجرا (Active)</option>
                      <option value="scheduled">زمان‌بندی‌شده (Scheduled)</option>
                      <option value="paused">متوقف‌شده (Paused)</option>
                      <option value="completed">پایان‌یافته (Completed)</option>
                    </select>
                  </FormField>
                </div>
              </div>

              {/* Honest Cost Instrumentation toggle */}
              <div className="p-4 rounded-xl bg-[#1c1a17] border border-white/5 space-y-3">
                <label className="flex items-center gap-2 text-xs text-stone-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasInstrumentedCost}
                    onChange={(e) => setFormData({ ...formData, hasInstrumentedCost: e.target.checked })}
                    className="rounded accent-[#ba8d3d]"
                  />
                  <span className="font-bold">ثبت هزینه مستقیم تبلیغات (Ad Spend)</span>
                </label>

                {formData.hasInstrumentedCost && (
                  <FormField label="مبلغ کل هزینه پرداخت‌شده به ناشر/اینفلوئنسر (تومان)">
                    <Input
                      type="number"
                      value={formData.adSpendCostTomans || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, adSpendCostTomans: Number(e.target.value) || undefined })
                      }
                      placeholder="مثال: ۱۸۵۰۰۰۰۰"
                    />
                  </FormField>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                انصراف
              </Button>
              <Button variant="brass" size="sm" onClick={handleSaveCampaign}>
                {editingCampaignId ? 'به‌روزرسانی کمپین' : 'ثبت و ساخت کمپین'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
