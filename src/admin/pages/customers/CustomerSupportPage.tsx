import React from 'react';
import { Headphones, MessageSquare, Clock, CheckCircle2, User } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button } from '../../components/ui';

interface SupportTicket {
  id: string;
  customerName: string;
  subject: string;
  category: string;
  priority: 'low' | 'normal' | 'urgent';
  status: 'open' | 'answered' | 'closed';
  updatedAt: string;
}

export const CustomerSupportPage: React.FC = () => {
  const tickets: SupportTicket[] = [
    {
      id: 'TCK-801',
      customerName: 'فرهاد مجیدی',
      subject: 'استعلام زمان تحویل سفارش تیشرت اورسایز با چاپ نستعلیق',
      category: 'پیگیری مرسوله',
      priority: 'normal',
      status: 'open',
      updatedAt: '۱۰ دقیقه پیش',
    },
    {
      id: 'TCK-802',
      customerName: 'سمیرا صادقی',
      subject: 'امکان تغییر رنگ پارچه از دودی به مشکی پیش از ارسال به خط چاپ',
      category: 'تغییر سفارش آتلیه',
      priority: 'urgent',
      status: 'open',
      updatedAt: '۳۵ دقیقه پیش',
    },
    {
      id: 'TCK-803',
      customerName: 'پویان گودرزی',
      subject: 'درخواست فاکتور رسمی جهت خرید سازمانی هودی کارکنان',
      category: 'امور مالی',
      priority: 'low',
      status: 'answered',
      updatedAt: '۲ ساعت پیش',
    },
  ];

  const columns: ColumnDef<SupportTicket>[] = [
    {
      key: 'id',
      header: 'کد تیکت',
      render: (row) => <span className="font-mono text-xs font-bold text-[#eed29d]">{row.id}</span>,
    },
    {
      key: 'customerName',
      header: 'خریدار',
      render: (row) => <span className="text-xs text-white font-bold">{row.customerName}</span>,
    },
    {
      key: 'subject',
      header: 'موضوع درخواست و مکاتبه',
      render: (row) => (
        <div>
          <div className="text-xs text-stone-200">{row.subject}</div>
          <div className="text-[10px] text-stone-400">{row.category}</div>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'اولویت',
      render: (row) => (
        <Badge
          label={row.priority === 'urgent' ? 'فوری' : row.priority === 'normal' ? 'عادی' : 'پایین'}
          variant={row.priority === 'urgent' ? 'critical' : 'default'}
          size="sm"
        />
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => (
        <Badge
          label={row.status === 'open' ? 'در انتظار پاسخ' : row.status === 'answered' ? 'پاسخ داده شد' : 'بسته'}
          variant={row.status === 'open' ? 'warning' : 'success'}
          size="sm"
        />
      ),
    },
    {
      key: 'actions',
      header: 'پاسخگویی',
      align: 'left',
      render: () => (
        <Button variant="secondary" size="sm">
          پاسخ فوری
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="پشتیبانی، تیکت‌ها و مکاتبات کارگاه"
        description="پاسخگویی به سوالات پیش از چاپ، تغییر سایز پیش از تثبیت حرارتی و پیگیری بارنامه‌ها."
      />

      <Table
        data={tickets}
        columns={columns}
        keyExtractor={(t) => t.id}
      />
    </div>
  );
};
