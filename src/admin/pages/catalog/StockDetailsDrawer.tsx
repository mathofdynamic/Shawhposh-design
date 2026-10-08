import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useCatalogAdmin } from '../../features/CatalogProvider';
import { useStaff } from '../../features/StaffAuth';
import { formatPersianDate, toFaDigits } from '../../utils/formatters';

export interface StockDetailsDrawerProps { sku: string | null; onClose: () => void; onStockUpdated?: () => void }

export const StockDetailsDrawer: React.FC<StockDetailsDrawerProps> = ({ sku, onClose, onStockUpdated }) => {
  const { state, recordStockAdjustment } = useCatalogAdmin();
  const staff = useStaff()?.staff;
  const variant = state.variants.find((item) => item.sku === sku);
  const product = variant ? state.products.find((item) => item.id === variant.productId) : undefined;
  const movements = useMemo(() => state.stockMovements.filter((movement) => movement.sku === sku), [sku, state.stockMovements]);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!sku) return null;
  if (!variant || !product) return <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-black/70"><section className="h-full w-full max-w-xl bg-[#131211] p-6 text-white"><button onClick={onClose} aria-label="Close">×</button><p className="mt-8">SKU not found in the current database snapshot.</p></section></div>;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const numericDelta = Number(delta);
    if (!Number.isSafeInteger(numericDelta) || numericDelta === 0 || !reason.trim()) {
      setError('Enter a non-zero whole-number adjustment and a reason.');
      return;
    }
    setSaving(true);
    const result = await recordStockAdjustment(variant.sku, numericDelta, staff?.id ?? '', reason.trim());
    setSaving(false);
    if (!result.success) { setError(result.error || 'Adjustment was rejected.'); return; }
    setDelta('');
    setReason('');
    onStockUpdated?.();
  };

  const available = variant.onHandStock - variant.reservedStock;
  return <div role="dialog" aria-modal="true" aria-labelledby="inventory-title" className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="flex h-full w-full max-w-xl flex-col overflow-y-auto border-r border-white/10 bg-[#131211] p-5 text-stone-100 shadow-2xl">
      <header className="flex items-start justify-between border-b border-white/10 pb-4">
        <div><p className="font-mono text-xs text-[#eed29d]">{variant.sku}</p><h2 id="inventory-title" className="mt-1 text-lg font-semibold">{product.name}</h2><p className="mt-1 text-sm text-stone-400">{variant.colorName} · {variant.size}</p></div>
        <button type="button" onClick={onClose} aria-label="Close inventory details" className="rounded-lg p-2 text-stone-300 hover:bg-white/10"><X size={18}/></button>
      </header>
      <dl className="grid grid-cols-3 gap-3 py-5 text-center">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><dt className="text-xs text-stone-400">On hand</dt><dd className="mt-1 text-xl">{toFaDigits(variant.onHandStock)}</dd></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><dt className="text-xs text-stone-400">Reserved</dt><dd className="mt-1 text-xl text-amber-300">{toFaDigits(variant.reservedStock)}</dd></div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3"><dt className="text-xs text-stone-400">Available</dt><dd className="mt-1 text-xl">{toFaDigits(available)}</dd></div>
      </dl>
      <form onSubmit={(event) => void submit(event)} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="font-semibold">Manual stock adjustment</h3>
        <p className="text-xs leading-relaxed text-stone-400">The server checks available stock and records the movement in the database.</p>
        <label className="block text-sm">Quantity change <span className="text-stone-500">(+/- whole units)</span><input inputMode="numeric" type="number" step="1" required value={delta} onChange={(event) => setDelta(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label>
        <label className="block text-sm">Reason<input required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 block w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2"/></label>
        {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
        <button disabled={saving || !staff} className="w-full rounded-lg bg-[#ba8d3d] px-4 py-2 font-semibold text-black disabled:opacity-50">{saving ? 'Saving…' : 'Save adjustment'}</button>
      </form>
      <section className="mt-6 space-y-3"><h3 className="font-semibold">Recorded stock movements</h3>{movements.length ? <ol className="space-y-2">{movements.map((movement) => <li key={movement.id} className="rounded-xl border border-white/10 p-3"><div className="flex justify-between gap-3 text-sm"><span className={movement.quantityChange > 0 ? 'text-emerald-300' : 'text-rose-300'}>{movement.quantityChange > 0 ? '+' : ''}{toFaDigits(movement.quantityChange)}</span><time className="text-stone-400">{formatPersianDate(movement.timestamp)}</time></div><p className="mt-1 text-sm">{movement.reason}</p><p className="mt-1 text-xs text-stone-500">{movement.actorName || '—'}</p></li>)}</ol> : <p className="rounded-xl border border-dashed border-white/15 p-5 text-center text-sm text-stone-400">No stock movements recorded.</p>}</section>
    </section>
  </div>;
};
