import React, { useEffect, useState } from 'react';
import { Activity, Database, RefreshCw } from 'lucide-react';
import { api } from '../../../api/client';
import { AdminPageHeader } from '../../components/shell/AdminPageHeader';

interface HealthResponse { status: string; version: string; database: string; timestamp: string }

export const HealthPage: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    void api<HealthResponse>('/health').then(value => { if (active) setHealth(value); })
      .catch(() => { if (active) { setHealth(null); setError('وضعیت سرویس دریافت نشد.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  return <section dir="rtl" className="space-y-5">
    <AdminPageHeader title="وضعیت سامانه" description="این اطلاعات مستقیماً از endpoint سلامت API دریافت می‌شود." actions={<button type="button" onClick={() => setRefresh(value => value + 1)} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-stone-300 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />بررسی دوباره</button>} />
    {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/5 p-4 text-sm text-rose-200">{error} <button type="button" onClick={() => setRefresh(value => value + 1)} className="mr-2 underline">تلاش دوباره</button></div>}
    {loading && !health ? <div role="status" className="rounded-2xl border border-white/10 bg-[#131211] p-6 text-sm text-stone-400">در حال بررسی…</div> : health && <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-[#131211] p-5"><div className="flex items-center gap-2 text-xs text-stone-400"><Activity size={15} />سرویس API</div><p className="mt-4 text-lg font-bold text-emerald-300">{health.status === 'ok' ? 'در دسترس' : 'در دسترس نیست'}</p><p className="mt-2 text-xs text-stone-500">نسخه {health.version}</p></div>
      <div className="rounded-2xl border border-white/10 bg-[#131211] p-5"><div className="flex items-center gap-2 text-xs text-stone-400"><Database size={15} />پایگاه داده</div><p className={`mt-4 text-lg font-bold ${health.database === 'connected' ? 'text-emerald-300' : 'text-rose-300'}`}>{health.database === 'connected' ? 'متصل' : 'قطع'}</p><p className="mt-2 text-xs text-stone-500">آخرین بررسی: {new Date(health.timestamp).toLocaleString('fa-IR')}</p></div>
    </div>}
  </section>;
};
