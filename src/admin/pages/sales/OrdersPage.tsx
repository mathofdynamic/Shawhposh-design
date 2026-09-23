import React, { useState, useMemo } from 'react';
import { ShoppingBag, Eye, RotateCcw, Filter, Download, Plus, CheckCircle2 } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import {
  Table,
  ColumnDef,
  Badge,
  Button,
  SearchInput,
  Pagination,
  MoneyDisplay,
  useToast,
} from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { Order, OrderStatus } from '../../domain/types';
import { toFaDigits } from '../../utils/formatters';
import { OrderInspectionDrawer } from '../../components/orders/OrderInspectionDrawer';

export const OrdersPage: React.FC = () => {
  const { getOrders, approveCustomDesign, issueSimulatedRefund } = useAdminRepository();
  const { addToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const orderQueryResult = useMemo(() => {
    return getOrders({
      search,
      status: statusFilter === 'all' ? undefined : (statusFilter as OrderStatus),
      page: currentPage,
      pageSize,
    });
  }, [getOrders, search, statusFilter, currentPage, pageSize]);

  const handleRefund = (order: Order) => {
    const res = issueSimulatedRefund(
      order.id,
      order.totalTomans,
      'استرداد فاکتور از طریق پنل سفارشات',
      'STF-01'
    );
    if (res.success) {
      addToast({
        title: 'استرداد وجه ثبت شد',
        description: `مبلغ ${toFaDigits(order.totalTomans.toLocaleString())} تومان استرداد گردید و موجودی رزرو به انبار بازگشت.`,
        type: 'success',
      });
    }
  };

  const columns: ColumnDef<Order>[] = [
    {
      key: 'id',
      header: 'شناسه سفارش',
      render: (row) => (
        <span className="font-mono font-bold text-[#eed29d] text-xs">{row.id}</span>
      ),
    },
    {
      key: 'customerName',
      header: 'نام خریدار',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs">{row.customerName}</div>
          <div className="text-[10px] text-stone-400">{row.city}</div>
        </div>
      ),
    },
    {
      key: 'items',
      header: 'تعداد اقلام',
      render: (row) => (
        <span className="text-xs font-fanum text-stone-300">
          {toFaDigits(row.items.reduce((acc, it) => acc + it.quantity, 0))} عدد
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت سفارش',
      render: (row) => {
        const labels: Record<OrderStatus, string> = {
          pending_payment: 'معلق پرداخت',
          paid_processing: 'تاییدشده / در صف',
          in_production: 'خط چاپ DTG',
          quality_check: 'کنترل کیفیت',
          ready_to_ship: 'آماده بسته‌بندی/ارسال',
          shipped: 'ارسال شده',
          delivered: 'تحویل مشتری',
          cancelled: 'لغو شده',
          refunded: 'مسترد شده',
        };
        const variants: Record<OrderStatus, any> = {
          pending_payment: 'warning',
          paid_processing: 'default',
          in_production: 'warning',
          quality_check: 'warning',
          ready_to_ship: 'success',
          shipped: 'success',
          delivered: 'success',
          cancelled: 'critical',
          refunded: 'critical',
        };
        return <Badge label={labels[row.status] || row.status} variant={variants[row.status] || 'default'} size="sm" />;
      },
    },
    {
      key: 'totalTomans',
      header: 'مبلغ فاکتور',
      render: (row) => <MoneyDisplay amount={row.totalTomans} size="sm" />,
    },
    {
      key: 'createdAt',
      header: 'تاریخ ثبت',
      render: (row) => (
        <span className="text-[11px] text-stone-400 font-fanum">
          {new Date(row.createdAt).toLocaleDateString('fa-IR')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'عملیات',
      align: 'left',
      render: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedOrderId(row.id);
          }}
          className="text-xs"
        >
          <Eye size={13} className="ml-1" />
          شناسنامه
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="مدیریت و پردازش سفارش‌ها"
        description="فهرست کامل سفارشات فروشگاه، رهگیری مراحل چاپ اختصاصی آتلیه، وضعیت درگاه شاپرک و صدور بارنامه."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                addToast({
                  title: 'خروجی اکسل آماده شد',
                  description: 'فایل فاکتورهای فیلترشده در صف دانلود قرار گرفت.',
                  type: 'info',
                });
              }}
            >
              <Download size={13} className="ml-1" />
              خروجی CSV
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#131211] p-3 rounded-2xl border border-white/10">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="جستجوی کد فاکتور، نام خریدار یا شهر..."
          />
        </div>

        {/* Status segment filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'همه' },
            { id: 'paid_processing', label: 'تاییدشده' },
            { id: 'in_production', label: 'خط چاپ' },
            { id: 'shipped', label: 'ارسال شده' },
            { id: 'refunded', label: 'مرجوعی' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-[#ba8d3d] text-stone-950'
                  : 'text-stone-400 hover:text-white bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Table
        data={orderQueryResult.orders}
        columns={columns}
        keyExtractor={(item) => item.id}
        onRowClick={(item) => setSelectedOrderId(item.id)}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={orderQueryResult.pagination.totalPages}
        onPageChange={setCurrentPage}
        totalItems={orderQueryResult.pagination.totalCount}
        pageSize={pageSize}
      />

      {/* Order Details Drawer */}
      <OrderInspectionDrawer
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onApproveDesign={(dId) => {
          approveCustomDesign(dId, 'STF-02');
          addToast({ title: 'طرح تایید شد', description: 'به خط DTG منتقل گردید.', type: 'success' });
        }}
        onRefundOrder={handleRefund}
      />
    </div>
  );
};
