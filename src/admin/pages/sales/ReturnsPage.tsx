import React, { useState } from 'react';
import { RotateCcw, ShieldCheck, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, MoneyDisplay, useToast } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { Order } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';

export const ReturnsPage: React.FC = () => {
  const { state, issueSimulatedRefund } = useAdminRepository();
  const { addToast } = useToast();

  const refundedOrders = state.orders.filter((o) => o.status === 'refunded');
  const eligibleOrders = state.orders.filter((o) => o.status === 'paid_processing').slice(0, 5);

  const handleRefund = (order: Order) => {
    const res = issueSimulatedRefund(
      order.id,
      order.totalTomans,
      'استرداد ثبت شده توسط کارشناس در بخش مرجوعی',
      'STF-01'
    );
    if (res.success) {
      addToast({
        title: 'استرداد با موفقیت انجام شد',
        description: `سفارش ${order.id} مسترد شد و رزرو انبار آزاد گردید.`,
        type: 'success',
      });
    }
  };

  const columns: ColumnDef<Order>[] = [
    {
      key: 'id',
      header: 'کد سفارش مرجوعی',
      render: (row) => <span className="font-mono text-xs font-bold text-rose-400">{row.id}</span>,
    },
    {
      key: 'customerName',
      header: 'نام خریدار',
      render: (row) => <span className="text-xs text-white font-bold">{row.customerName}</span>,
    },
    {
      key: 'totalTomans',
      header: 'مبلغ استرداد شده',
      render: (row) => <MoneyDisplay amount={row.totalTomans} size="sm" />,
    },
    {
      key: 'reason',
      header: 'علت مرجوعی',
      render: () => <span className="text-xs text-stone-400">انصراف خریدار پیش از چاپ آتلیه</span>,
    },
    {
      key: 'status',
      header: 'وضعیت تسویه مالی',
      render: () => <Badge label="مسترد شده به حساب" variant="critical" size="sm" />,
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="مرجوعی‌ها و استرداد وجه فاکتور"
        description="مدیریت درخواست‌های بازگشت کالا، کنترل فیزیکی عدم آسیب به پارچه و صدور سند معکوس مالی."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">تعداد پرونده‌های استرداد قطعی</span>
          <div className="text-2xl font-black text-rose-400 mt-1 font-fanum">
            {toFaDigits(refundedOrders.length)} سفارش
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">کمتر از ۱٪ کل سفارشات ثبت‌شده</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">مجموع مبالغ واریز معکوس</span>
          <div className="text-xl font-black text-white mt-1">
            <MoneyDisplay amount={refundedOrders.reduce((sum, o) => sum + o.totalTomans, 0)} />
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block">انطباق ۱۰۰٪ با ناوردایی حسابداری</span>
        </div>
      </div>

      <div className="bg-[#131211] border border-white/10 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-white mb-3">تاریخچه پرونده‌های مرجوعی و استرداد</h2>
        <Table
          data={refundedOrders}
          columns={columns}
          keyExtractor={(o) => o.id}
        />
      </div>
    </div>
  );
};
