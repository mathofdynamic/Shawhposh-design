import React from 'react';
import { Sparkles, Tag, Calendar, Percent, Plus } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button } from '../../components/ui';
import { toFaDigits } from '../../utils/formatters';

interface CampaignItem {
  id: string;
  name: string;
  code: string;
  discountPct: number;
  usageCount: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'scheduled' | 'expired';
}

export const CampaignsPage: React.FC = () => {
  const campaigns: CampaignItem[] = [
    {
      id: 'CMP-01',
      name: 'جشنواره افتتاحیه کلکسیون پاییزه شاه‌نشین',
      code: 'SHAHPOSH-FALL',
      discountPct: 15,
      usageCount: 84,
      startDate: '۱۴۰۵/۰۷/۰۱',
      endDate: '۱۴۰۵/۰۷/۱۵',
      status: 'active',
    },
    {
      id: 'CMP-02',
      name: 'تخفیف ویژه سفارش اول طراح آنلاین',
      code: 'MYFIRST-POD',
      discountPct: 10,
      usageCount: 165,
      startDate: '۱۴۰۵/۰۶/۰۱',
      endDate: '۱۴۰۵/۰۸/۳۰',
      status: 'active',
    },
    {
      id: 'CMP-03',
      name: 'کمپین تخفیف هودی‌های گرم زمستانه',
      code: 'WINTER-WARM',
      discountPct: 20,
      usageCount: 0,
      startDate: '۱۴۰۵/۰۸/۱۵',
      endDate: '۱۴۰۵/۰۹/۳۰',
      status: 'scheduled',
    },
  ];

  const columns: ColumnDef<CampaignItem>[] = [
    {
      key: 'name',
      header: 'عنوان کمپین و مناسبت',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs">{row.name}</div>
          <div className="text-[10px] text-stone-400 font-mono mt-0.5">{row.id}</div>
        </div>
      ),
    },
    {
      key: 'code',
      header: 'کد تخفیف (کوپن)',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[#eed29d] bg-white/5 px-2 py-0.5 rounded border border-white/10">
          {row.code}
        </span>
      ),
    },
    {
      key: 'discountPct',
      header: 'درصد تخفیف',
      render: (row) => <span className="text-xs font-fanum text-white font-bold">{toFaDigits(row.discountPct)}٪</span>,
    },
    {
      key: 'usageCount',
      header: 'دفعات استفاده',
      render: (row) => <span className="text-xs font-fanum text-stone-300">{toFaDigits(row.usageCount)} بار</span>,
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => (
        <Badge
          label={row.status === 'active' ? 'در حال اجرا' : row.status === 'scheduled' ? 'زمان‌بندی شده' : 'پایان یافته'}
          variant={row.status === 'active' ? 'success' : 'default'}
          size="sm"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="کمپین‌های بازاریابی و کدهای تخفیف"
        description="مدیریت کدهای تخفیف جشنواره‌ای، پروموشن‌های خرید اول و تخفیف‌های فصلی کلکسیون‌های جدید."
        actions={
          <Button variant="brass" size="sm">
            <Plus size={13} className="ml-1" />
            تعریف کوپن جدید
          </Button>
        }
      />

      <Table
        data={campaigns}
        columns={columns}
        keyExtractor={(c) => c.id}
      />
    </div>
  );
};
