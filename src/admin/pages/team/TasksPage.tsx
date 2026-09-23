import React from 'react';
import { CheckSquare, Clock, AlertCircle, User, Plus } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { StaffTask } from '../../domain/types';

export const TasksPage: React.FC = () => {
  const { state } = useAdminRepository();

  const columns: ColumnDef<StaffTask>[] = [
    {
      key: 'id',
      header: 'کد وظیفه',
      render: (row) => <span className="font-mono text-xs font-bold text-[#eed29d]">{row.id}</span>,
    },
    {
      key: 'title',
      header: 'عنوان اقدام و شرح وظیفه',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs">{row.title}</div>
          <div className="text-[10px] text-stone-400">{row.description}</div>
        </div>
      ),
    },
    {
      key: 'assignedStaffId',
      header: 'مسئول اجرا',
      render: (row) => {
        const staff = state.staff.find((s) => s.id === row.assignedStaffId);
        return <span className="text-xs text-stone-200">{staff ? staff.fullName : row.assignedStaffId}</span>;
      },
    },
    {
      key: 'priority',
      header: 'اولویت',
      render: (row) => (
        <Badge
          label={row.priority === 'urgent' ? 'فوری' : row.priority === 'high' ? 'بالا' : 'عادی'}
          variant={row.priority === 'urgent' ? 'critical' : row.priority === 'high' ? 'warning' : 'default'}
          size="sm"
        />
      ),
    },
    {
      key: 'status',
      header: 'وضعیت اجرا',
      render: (row) => (
        <Badge
          label={
            row.status === 'completed'
              ? 'تکمیل شده'
              : row.status === 'in_progress'
              ? 'در حال انجام'
              : 'معوق'
          }
          variant={row.status === 'completed' ? 'success' : 'warning'}
          size="sm"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="وظایف، اقدامات و پیگیری شیفت"
        description="تخصیص وظایف خط تولید، بررسی فایل‌های آتلیه، کالیبراسیون دستگاه‌ها و هماهنگی ارسال مرسولات."
        actions={
          <Button variant="brass" size="sm">
            <Plus size={13} className="ml-1" />
            تخصیص وظیفه جدید
          </Button>
        }
      />

      <Table
        data={state.tasks}
        columns={columns}
        keyExtractor={(t) => t.id}
      />
    </div>
  );
};
