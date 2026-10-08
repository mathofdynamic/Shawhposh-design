import React, { useMemo, useState } from 'react';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';
import { SearchInput, Table, type ColumnDef } from '../../components/ui';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import type { StockMovement } from '../../domain/types';
import { formatPersianDate } from '../../utils/formatters';
import { useAdminRouter } from '../../router';

export const StockMovementsPage: React.FC = () => {
  const { state } = useCatalogAdmin();
  const { navigate } = useAdminRouter();
  const [search, setSearch] = useState('');
  const movements = useMemo(() => state.stockMovements.filter((movement) => {
    const query = search.trim().toLocaleLowerCase();
    return !query || movement.sku.toLocaleLowerCase().includes(query) ||
      movement.reason.toLocaleLowerCase().includes(query) ||
      (movement.actorName ?? '').toLocaleLowerCase().includes(query);
  }), [search, state.stockMovements]);

  const columns: ColumnDef<StockMovement>[] = [
    { key: 'date', header: 'Recorded', render: (movement) => <time>{formatPersianDate(movement.timestamp)}</time> },
    { key: 'sku', header: 'SKU', render: (movement) => <span className="font-mono text-[#eed29d]">{movement.sku}</span> },
    { key: 'type', header: 'Movement', render: (movement) => movement.type },
    { key: 'quantity', header: 'Change', align: 'center', render: (movement) => <span className={movement.quantityChange > 0 ? 'text-emerald-300' : 'text-rose-300'}>{movement.quantityChange > 0 ? '+' : ''}{movement.quantityChange}</span> },
    { key: 'balance', header: 'On hand', align: 'center', render: (movement) => `${movement.previousOnHand} → ${movement.newOnHand}` },
    { key: 'reason', header: 'Reason', render: (movement) => movement.reason },
    { key: 'actor', header: 'Recorded by', render: (movement) => movement.actorName || '—' },
  ];

  return <div className="mx-auto max-w-7xl space-y-5">
    <AdminPageHeader title="Stock movements" description="Append-only stock movement records from the production database." actions={<button type="button" onClick={() => navigate('/admin/catalog/inventory')} className="rounded-xl border border-white/15 px-4 py-2 text-sm hover:bg-white/5">Inventory</button>} />
    <div className="rounded-2xl border border-white/10 bg-[#141211] p-4"><SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search SKU, reason, or staff"/></div>
    <Table data={movements} columns={columns} keyExtractor={(movement) => movement.id} mobileScrollHint emptyMessage={search ? 'No matching stock movements.' : 'No stock movements have been recorded.'}/>
  </div>;
};
