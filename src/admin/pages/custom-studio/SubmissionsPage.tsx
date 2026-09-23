import React from 'react';
import { UploadCloud, Eye, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router';
import { CustomDesign } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

export const SubmissionsPage: React.FC = () => {
  const { state } = useAdminRepository();
  const { navigate } = useAdminRouter();

  const columns: ColumnDef<CustomDesign>[] = [
    {
      key: 'preview',
      header: 'پیش‌نمایش',
      render: (row) => (
        <img
          src={row.previewUrl}
          alt={row.title}
          className="w-12 h-12 object-contain bg-black rounded-lg border border-white/10"
        />
      ),
    },
    {
      key: 'id',
      header: 'شناسه آرت‌ورک',
      render: (row) => <span className="font-mono text-xs font-bold text-[#eed29d]">{row.id}</span>,
    },
    {
      key: 'title',
      header: 'عنوان طرح',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs">{row.title}</div>
          <div className="text-[10px] text-stone-400 font-mono">سفارش: {row.orderId}</div>
        </div>
      ),
    },
    {
      key: 'printZone',
      header: 'محل چاپ روی لباس',
      render: (row) => (
        <span className="text-xs text-stone-300">
          {row.printZone === 'front_chest'
            ? 'سینه مرکزی (A3)'
            : row.printZone === 'back_full'
            ? 'پشت کامل'
            : 'سینه چپ / یقه'}
        </span>
      ),
    },
    {
      key: 'tech',
      header: 'رزولوشن / مشخصات فایل',
      render: (row) => (
        <span className="text-xs font-mono text-stone-400" dir="ltr">
          {toFaDigits(row.resolutionDpi)} DPI · {row.dimensionsMm}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت بررسی',
      render: (row) => (
        <Badge
          label={
            row.status === 'approved'
              ? 'تایید شده'
              : row.status === 'under_review'
              ? 'در صف داوری'
              : 'رد شده'
          }
          variant={
            row.status === 'approved' ? 'success' : row.status === 'under_review' ? 'warning' : 'critical'
          }
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      header: 'اقدام',
      align: 'left',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/admin/custom-studio/approval')}
        >
          ورود به میز داوری
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="درخواست‌های دریافتی از طراح آنلاین"
        description="فهرست کلیه طرح‌های آپلود شده و فایل‌های گرافیکی ثبت‌شده توسط خریداران در طراح سه‌بعدی تیشرت."
      />

      <Table
        data={state.customDesigns}
        columns={columns}
        keyExtractor={(d) => d.id}
      />
    </div>
  );
};
