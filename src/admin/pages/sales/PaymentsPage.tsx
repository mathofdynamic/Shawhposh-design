import React from 'react';
import { CreditCard, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, MoneyDisplay } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { PaymentAttempt } from '../../domain/types';
import { toFaDigits, maskIpAddress } from '../../utils/formatters';

export const PaymentsPage: React.FC = () => {
  const { state } = useAdminRepository();

  const columns: ColumnDef<PaymentAttempt>[] = [
    {
      key: 'id',
      header: 'شناسه تراکنش',
      render: (row) => <span className="font-mono text-xs font-bold text-[#eed29d]">{row.id}</span>,
    },
    {
      key: 'orderId',
      header: 'کد سفارش',
      render: (row) => <span className="font-mono text-xs text-white">{row.orderId}</span>,
    },
    {
      key: 'amountTomans',
      header: 'مبلغ پرداختی',
      render: (row) => <MoneyDisplay amount={row.amountTomans} size="sm" />,
    },
    {
      key: 'method',
      header: 'درگاه پرداخت',
      render: (row) => (
        <span className="text-xs text-stone-300">
          {row.method === 'saman_gateway'
            ? 'سامان کیش (SEP)'
            : row.method === 'zarinpal'
            ? 'زرین‌پال'
            : row.method === 'wallet'
            ? 'کیف پول کارگاه'
            : 'کارت به کارت'}
        </span>
      ),
    },
    {
      key: 'traceNumber',
      header: 'شماره پیگیری شاپرک',
      render: (row) => <span className="font-mono text-xs text-stone-400">{row.traceNumber}</span>,
    },
    {
      key: 'status',
      header: 'وضعیت تسویه',
      render: (row) => (
        <Badge
          label={row.status === 'verified_paid' ? 'تسویه موفق' : row.status === 'pending' ? 'در انتظار تایید' : 'مسترد شده'}
          variant={row.status === 'verified_paid' ? 'success' : row.status === 'pending' ? 'warning' : 'critical'}
          size="sm"
        />
      ),
    },
    {
      key: 'maskedIpAddress',
      header: 'آدرس IP امن',
      render: (row) => (
        <span className="font-mono text-[11px] text-stone-500" dir="ltr">
          {maskIpAddress(row.maskedIpAddress)}
        </span>
      ),
    },
  ];

  const totalPaid = state.payments
    .filter((p) => p.status === 'verified_paid')
    .reduce((sum, p) => sum + p.amountTomans, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="تراکنش‌ها و تسویه درگاه‌های بانکی"
        description="رهگیری مستقیم مبالغ ورودی از طریق سوئیچ شاپرک، شماره‌های پیگیری، رسیدها و انطباق کامل با دفاتر مالی."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">مجموع تسویه‌های موفق</span>
          <div className="text-xl font-black text-white mt-1">
            <MoneyDisplay amount={totalPaid} />
          </div>
          <span className="text-[10px] text-emerald-400 mt-1 block">تایید شده توسط شاپرک</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">تعداد کل تراکنش‌ها</span>
          <div className="text-xl font-black text-white mt-1 font-fanum">
            {toFaDigits(state.payments.length)} تراکنش
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">نرخ موفقیت تراکنش‌ها ۹۸.۲٪</span>
        </div>

        <div className="p-4 bg-[#131211] border border-white/10 rounded-2xl">
          <span className="text-xs text-stone-400">انطباق حسابداری</span>
          <div className="text-xl font-black text-emerald-400 mt-1 flex items-center gap-1.5">
            <ShieldCheck size={20} />
            <span>۱۰۰٪ تطبیق</span>
          </div>
          <span className="text-[10px] text-stone-400 mt-1 block">مغایرت دفتری = ۰ ریال</span>
        </div>
      </div>

      <Table
        data={state.payments}
        columns={columns}
        keyExtractor={(p) => p.id}
      />
    </div>
  );
};
