import React from 'react';
import { Shield, UserCheck, Plus, Mail } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { StaffMember } from '../../domain/types';

export const AdministratorsPage: React.FC = () => {
  const { state } = useAdminRepository();

  const columns: ColumnDef<StaffMember>[] = [
    {
      key: 'id',
      header: 'کد پرسنلی',
      render: (row) => <span className="font-mono text-xs font-bold text-[#eed29d]">{row.id}</span>,
    },
    {
      key: 'fullName',
      header: 'نام و نام‌خانوادگی',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs">{row.fullName}</div>
          <div className="text-[10px] text-stone-400 font-mono">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'نقش و سمت سازمانی',
      render: (row) => {
        const roleLabels: Record<string, string> = {
          super_admin: 'مدیر ارشد کارگاه',
          designer_reviewer: 'طراح و ناظر آتلیه چاپ',
          production_operator: 'اپراتور ارشد پرینتر DTG',
          support_finance: 'پشتیبانی، مالی و لجستیک',
        };
        return (
          <Badge
            label={roleLabels[row.role] || row.role}
            variant={row.role === 'super_admin' ? 'warning' : 'default'}
            size="sm"
          />
        );
      },
    },
    {
      key: 'status',
      header: 'وضعیت شیفت / ورود',
      render: (row) => (
        <Badge
          label={row.isOnline ? 'آنلاین / حاضر در کارگاه' : 'آفلاین'}
          variant={row.isOnline ? 'success' : 'default'}
          size="sm"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="مدیران، سرپرستان و پرسنل کارگاه"
        description="فهرست پرسنل مجاز، نقش‌های سازمانی و شبیه‌سازی نشست‌های دسترسی در کارگاه شاه‌پوش."
        actions={
          <Button variant="brass" size="sm">
            <Plus size={13} className="ml-1" />
            افزودن عضو جدید
          </Button>
        }
      />

      <Table
        data={state.staff}
        columns={columns}
        keyExtractor={(s) => s.id}
      />
    </div>
  );
};
