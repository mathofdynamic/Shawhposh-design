import React, { useState } from 'react';
import { History, Shield, Filter, Search, Download } from 'lucide-react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { Table, ColumnDef, Badge, Button, SearchInput } from '../../components/ui';
import { useAdminRepository } from '../../domain/useAdminRepository';
import { ActivityLog } from '../../domain/types';
import { maskIpAddress } from '../../utils/formatters';

export const AuditPage: React.FC = () => {
  const { state } = useAdminRepository();
  const [search, setSearch] = useState('');

  const filteredLogs = state.activities.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.description.toLowerCase().includes(q) ||
      l.actionType.toLowerCase().includes(q) ||
      l.entityId.toLowerCase().includes(q)
    );
  });

  const columns: ColumnDef<ActivityLog>[] = [
    {
      key: 'id',
      header: 'شناسه رویداد',
      render: (row) => <span className="font-mono text-xs font-bold text-[#eed29d]">{row.id}</span>,
    },
    {
      key: 'timestamp',
      header: 'زمان ثبت',
      render: (row) => (
        <span className="font-mono text-[11px] text-stone-400 font-fanum">
          {new Date(row.timestamp).toLocaleTimeString('fa-IR')} · {new Date(row.timestamp).toLocaleDateString('fa-IR')}
        </span>
      ),
    },
    {
      key: 'actorName',
      header: 'کاربر مجری',
      render: (row) => (
        <div>
          <div className="font-bold text-white text-xs">{row.actorName}</div>
          <div className="text-[10px] text-stone-400 font-mono">نقش: {row.actorRole}</div>
        </div>
      ),
    },
    {
      key: 'actionType',
      header: 'نوع اقدام',
      render: (row) => (
        <span className="font-mono text-xs text-stone-300 bg-white/5 px-2 py-0.5 rounded border border-white/5">
          {row.actionType}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'شرح تغییرات و مستندات',
      render: (row) => <span className="text-xs text-stone-300">{row.description}</span>,
    },
    {
      key: 'entityId',
      header: 'موجودیت مرتبط',
      render: (row) => (
        <span className="font-mono text-[11px] text-[#eed29d]" dir="ltr">
          {row.entityType}:{row.entityId}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="دفتر کل وقایع و لاگ‌های امنیتی (Audit Trail)"
        description="ثبت غیرقابل دستکاری کلیه جهش‌ها، تایید یا رد طرح‌های آتلیه، تغییرات دستی انبار و استرداد وجوه."
      />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#131211] p-3 rounded-2xl border border-white/10">
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو در شرح تغییرات، نوع رویداد یا کد..."
          />
        </div>

        <div className="text-xs text-stone-400 font-fanum">
          تعداد رکوردهای لاگ: {filteredLogs.length} رویداد
        </div>
      </div>

      <Table
        data={filteredLogs}
        columns={columns}
        keyExtractor={(l) => l.id}
      />
    </div>
  );
};
