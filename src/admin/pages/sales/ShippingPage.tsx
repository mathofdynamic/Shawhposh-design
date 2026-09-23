import React from 'react';
import { Truck, Package, MapPin, CheckCircle, Clock } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { Shipment } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

export const ShippingPage: React.FC = () => {
  const { state } = useAdminRepository();

  const columns: ColumnDef<Shipment>[] = [
    {
      key: 'id',
      header: 'کد مرسوله',
      render: (row) => <span className="font-mono text-xs font-bold text-[#eed29d]">{row.id}</span>,
    },
    {
      key: 'orderId',
      header: 'کد سفارش',
      render: (row) => <span className="font-mono text-xs text-white">{row.orderId}</span>,
    },
    {
      key: 'carrier',
      header: 'ناوگان حمل',
      render: (row) => (
        <span className="text-xs text-stone-300">
          {row.carrier === 'tipax'
            ? 'تیپاکس (اکسپرس)'
            : row.carrier === 'post_pishtaz'
            ? 'پست پیشتاز'
            : row.carrier === 'courier_tehran'
            ? 'پیک اختصاصی تهران'
            : 'چاپار اکسپرس'}
        </span>
      ),
    },
    {
      key: 'trackingCode',
      header: 'بارنامه / کد رهگیری',
      render: (row) => (
        <span className="font-mono text-xs text-stone-400">
          {row.trackingCode || 'در انتظار بارنامه'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت ارسال',
      render: (row) => (
        <Badge
          label={
            row.status === 'delivered'
              ? 'تحویل شده'
              : row.status === 'in_transit'
              ? 'در راه مقصد'
              : 'آماده‌سازی مرسوله'
          }
          variant={row.status === 'delivered' ? 'success' : 'warning'}
          size="sm"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="ارسال مرسولات و صدور بارنامه"
        description="ساماندهی مرسولات پستی، بارنامه‌های تیپاکس و بسته‌بندی‌های لوکس جعبه مشکی شاه‌پوش با شناسنامه اصالت."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">بسته‌های ارسال شده</span>
          <div className="text-2xl font-black text-white mt-1 font-fanum">
            {toFaDigits(state.shipments.filter((s) => s.status === 'delivered').length)} بسته
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block">تحویل موفق در سراسر کشور</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">مرسولات در مسیر حمل</span>
          <div className="text-2xl font-black text-white mt-1 font-fanum">
            {toFaDigits(state.shipments.filter((s) => s.status === 'in_transit').length)} مرسوله
          </div>
          <span className="text-[10px] text-amber-400 mt-1 block">دارای کد رهگیری فعال</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">آماده‌سازی و بسته‌بندی</span>
          <div className="text-2xl font-black text-white mt-1 font-fanum">
            {toFaDigits(state.shipments.filter((s) => s.status === 'label_created').length)} سفارش
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">قرارگیری در جعبه‌های لوکس مشکی</span>
        </div>
      </div>

      <Table
        data={state.shipments}
        columns={columns}
        keyExtractor={(s) => s.id}
      />
    </div>
  );
};
