import React, { useState, useMemo } from 'react';
import { Users, Search, UserCheck, Eye, ShieldAlert } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, SearchInput, Pagination, MoneyDisplay } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { useAdminRouter } from '../../router';
import { Customer } from '../../domain/types';
import { toFaDigits, maskPhoneNumber } from '../../utils/formatters';

export const CustomerDirectoryPage: React.FC = () => {
  const { state } = useAdminRepository();
  const { navigate } = useAdminRouter();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    return state.customers.filter((c) => {
      const q = search.toLowerCase();
      return (
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });
  }, [state.customers, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns: ColumnDef<Customer>[] = [
    {
      key: 'id',
      header: 'کد مشتری',
      render: (row) => <span className="font-mono text-xs font-bold text-[#eed29d]">{row.id}</span>,
    },
    {
      key: 'fullName',
      header: 'نام و نام‌خانوادگی',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs">{row.fullName}</div>
          <div className="text-[10px] text-stone-400 font-fanum">شهر: {row.city}</div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'شماره تماس ماسک‌شده',
      render: (row) => (
        <span className="font-mono text-xs text-stone-300" dir="ltr">
          {maskPhoneNumber(row.phone)}
        </span>
      ),
    },
    {
      key: 'tag',
      header: 'سطح مشتری',
      render: (row) => (
        <Badge
          label={
            row.tag === 'vip'
              ? 'طلایی (VIP)'
              : row.tag === 'wholesale'
              ? 'عمده‌فروشی'
              : row.tag === 'new'
              ? 'مشتری جدید'
              : 'عادی'
          }
          variant={row.tag === 'vip' ? 'warning' : 'default'}
          size="sm"
        />
      ),
    },
    {
      key: 'totalOrdersCount',
      header: 'سفارشات قطعی',
      render: (row) => (
        <span className="font-fanum text-xs text-white">
          {toFaDigits(row.totalOrdersCount)} فاکتور
        </span>
      ),
    },
    {
      key: 'totalSpentTomans',
      header: 'مجموع خرید تجمعی',
      render: (row) => <MoneyDisplay amount={row.totalSpentTomans} size="sm" />,
    },
    {
      key: 'actions',
      header: 'پرونده',
      align: 'left',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/admin/customers/profiles')}
        >
          مشاهده پرونده
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="فهرست خریداران و باشگاه مشتریان"
        description="ساماندهی پایگاه مشتریان ثبت‌شده، رده‌های اعضای باشگاه مشتریان و تاریخچه خریدهای تجمعی با حفظ حریم خصوصی."
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#131211] p-3 rounded-2xl border border-white/10">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="جستجوی نام خریدار، شهر یا شماره تماس..."
          />
        </div>

        <div className="text-xs text-stone-400 font-fanum">
          مجموع مشتریان: {toFaDigits(state.customers.length)} نفر
        </div>
      </div>

      <Table
        data={pageItems}
        columns={columns}
        keyExtractor={(c) => c.id}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        totalItems={filtered.length}
        pageSize={pageSize}
      />
    </div>
  );
};
