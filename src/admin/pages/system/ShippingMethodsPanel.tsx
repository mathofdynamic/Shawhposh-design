import { useEffect, useState, type FormEvent } from 'react';
import { Check, Clock3, Pencil, Plus, RotateCw, Save, Truck, X } from 'lucide-react';
import { ApiClientError } from '../../../api/client';
import {
  createAdminShippingMethod, listAdminShippingMethods, updateAdminShippingMethod,
  type AdminShippingMethod, type ShippingMethodInput,
} from '../../features/shippingApi';

type Draft = Omit<ShippingMethodInput, 'description' | 'fixedPriceTomans' | 'freeShippingThresholdTomans' | 'estimatedMinDays' | 'estimatedMaxDays'> & {
  description: string;
  fixedPriceTomans: string;
  freeShippingThresholdTomans: string;
  estimatedMinDays: string;
  estimatedMaxDays: string;
};

const newDraft = (): Draft => ({
  code: '', name: '', description: '', fixedPriceTomans: '', freeShippingThresholdTomans: '',
  estimatedMinDays: '', estimatedMaxDays: '', active: false, displayOrder: 0,
});

const fieldClass = 'w-full rounded-xl border border-white/10 bg-[#0e0d0c] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#ba8d3d] focus-visible:ring-2 focus-visible:ring-[#ba8d3d]/30';
const labelClass = 'block space-y-1.5 text-xs font-medium text-stone-300';

function numberValue(value: string, label: string, nullable = true) {
  const normalized = value.trim()
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[٬,\s]/g, '');
  if (!normalized && nullable) return null;
  if (!/^-?\d+$/.test(normalized)) throw new Error(`${label} را با عدد صحیح وارد کنید.`);
  const number = Number(normalized);
  if (!Number.isSafeInteger(number)) throw new Error(`${label} خارج از بازه مجاز است.`);
  return number;
}

function toDraft(method: AdminShippingMethod): Draft {
  return {
    code: method.code,
    name: method.name,
    description: method.description ?? '',
    fixedPriceTomans: method.fixedPriceTomans == null ? '' : String(method.fixedPriceTomans),
    freeShippingThresholdTomans: method.freeShippingThresholdTomans == null ? '' : String(method.freeShippingThresholdTomans),
    estimatedMinDays: method.estimatedMinDays == null ? '' : String(method.estimatedMinDays),
    estimatedMaxDays: method.estimatedMaxDays == null ? '' : String(method.estimatedMaxDays),
    active: method.active,
    displayOrder: method.displayOrder,
  };
}

function asInput(draft: Draft): ShippingMethodInput {
  const fixedPriceTomans = numberValue(draft.fixedPriceTomans, 'هزینه ثابت', !draft.active);
  const freeShippingThresholdTomans = numberValue(draft.freeShippingThresholdTomans, 'آستانه ارسال رایگان');
  const estimatedMinDays = numberValue(draft.estimatedMinDays, 'حداقل زمان تحویل');
  const estimatedMaxDays = numberValue(draft.estimatedMaxDays, 'حداکثر زمان تحویل');
  if (fixedPriceTomans !== null && fixedPriceTomans < 0) throw new Error('هزینه ثابت نمی‌تواند منفی باشد.');
  if (freeShippingThresholdTomans !== null && freeShippingThresholdTomans < 0) throw new Error('آستانه ارسال رایگان نمی‌تواند منفی باشد.');
  if ((estimatedMinDays === null) !== (estimatedMaxDays === null)) throw new Error('هر دو مقدار بازه تحویل را وارد کنید.');
  if (estimatedMinDays !== null && (estimatedMinDays < 1 || estimatedMaxDays! < estimatedMinDays || estimatedMaxDays! > 365)) {
    throw new Error('بازه تحویل معتبر نیست. حداکثر باید برابر یا بیشتر از حداقل و حداکثر ۳۶۵ روز باشد.');
  }
  if (draft.active && fixedPriceTomans === null) throw new Error('برای فعال‌کردن روش ارسال، هزینه ثابت را وارد کنید.');
  const displayOrder = numberValue(String(draft.displayOrder), 'ترتیب نمایش', false);
  if (displayOrder! < 0 || displayOrder! > 10_000) throw new Error('ترتیب نمایش خارج از بازه مجاز است.');
  return {
    code: draft.code.trim().toLowerCase(),
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    fixedPriceTomans,
    freeShippingThresholdTomans,
    estimatedMinDays,
    estimatedMaxDays,
    active: draft.active,
    displayOrder: displayOrder!,
  };
}

function errorMessage(error: unknown) {
  return error instanceof ApiClientError || error instanceof Error ? error.message : 'ذخیره روش ارسال انجام نشد.';
}

export default function ShippingMethodsPanel() {
  const [methods, setMethods] = useState<AdminShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingId, setSavingId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    setLoading(true);
    setError('');
    try { setMethods((await listAdminShippingMethods()).shippingMethods); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, []);

  const startNew = () => {
    setEditingId(null);
    setIsFormOpen(true);
    setDraft(newDraft());
    setError('');
    setNotice('');
  };

  const startEdit = (method: AdminShippingMethod) => {
    setEditingId(method.id);
    setIsFormOpen(true);
    setDraft(toDraft(method));
    setError('');
    setNotice('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const input = asInput(draft);
      if (!input.code || !/^[a-z0-9][a-z0-9_-]{1,47}$/.test(input.code)) throw new Error('شناسه لاتین را با حداقل دو حرف یا عدد و بدون فاصله وارد کنید.');
      if (input.name.length < 2 || input.name.length > 100) throw new Error('نام روش ارسال باید بین ۲ تا ۱۰۰ نویسه باشد.');
      if (input.fixedPriceTomans !== null && input.fixedPriceTomans > 1_000_000_000) throw new Error('هزینه ثابت بیش از حد مجاز است.');
      if (input.freeShippingThresholdTomans !== null && input.freeShippingThresholdTomans > 1_000_000_000) throw new Error('آستانه ارسال رایگان بیش از حد مجاز است.');
      if ((input.estimatedMinDays ?? 0) > 365) throw new Error('زمان تحویل نمی‌تواند بیشتر از ۳۶۵ روز باشد.');
      const result = editingId
        ? await updateAdminShippingMethod(editingId, input)
        : await createAdminShippingMethod(input);
      setMethods(current => (editingId
        ? current.map(method => method.id === editingId ? result.shippingMethod : method)
        : [...current, result.shippingMethod])
        .sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.localeCompare(b.createdAt)));
      setNotice(editingId ? 'روش ارسال به‌روزرسانی شد.' : 'روش ارسال ثبت شد.');
      setEditingId(null);
      setIsFormOpen(false);
      setDraft(newDraft());
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setSaving(false); }
  };

  const toggleActive = async (method: AdminShippingMethod) => {
    setSavingId(method.id);
    setError('');
    setNotice('');
    try {
      const result = await updateAdminShippingMethod(method.id, asInput({ ...toDraft(method), active: !method.active }));
      setMethods(current => current.map(item => item.id === method.id ? result.shippingMethod : item)
        .sort((a, b) => a.displayOrder - b.displayOrder || a.createdAt.localeCompare(b.createdAt)));
      setNotice(result.shippingMethod.active ? 'روش ارسال فعال شد و در محاسبه سفارش‌های جدید استفاده می‌شود.' : 'روش ارسال غیرفعال شد؛ سفارش‌های قبلی بدون تغییر می‌مانند.');
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setSavingId(''); }
  };

  return (
    <section dir="rtl" className="space-y-5 rounded-2xl border border-white/10 bg-[#131211] p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Truck size={16} className="text-[#eed29d]" />روش‌های ارسال سفارش</h3>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-stone-400">هزینه و روش‌های فعال مستقیماً برای سفارش‌های جدید اعمال می‌شوند. مبلغ و نام روش در سفارش ثبت‌شده ثابت می‌ماند.</p>
        </div>
        <button type="button" onClick={startNew} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#ba8d3d] px-4 py-2 text-xs font-bold text-stone-950 transition-colors hover:bg-[#d3aa5d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eed29d]">
          <Plus size={15} /> روش جدید
        </button>
      </header>

      {notice && <div role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">{notice}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}

      {isFormOpen && <form onSubmit={save} className="space-y-4 rounded-xl border border-[#ba8d3d]/25 bg-[#0e0d0c] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-xs font-bold text-white">{editingId ? 'ویرایش روش ارسال' : 'ثبت روش ارسال'}</h4>
          <button type="button" aria-label="بستن فرم" onClick={() => { setIsFormOpen(false); setEditingId(null); setError(''); }} className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d]"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className={labelClass}>شناسه لاتین
            <input required minLength={2} maxLength={48} dir="ltr" value={draft.code} onChange={event => setDraft(value => ({ ...value, code: event.target.value }))} className={fieldClass} placeholder="standard-delivery" />
          </label>
          <label className={labelClass}>نام روش ارسال
            <input required minLength={2} maxLength={100} value={draft.name} onChange={event => setDraft(value => ({ ...value, name: event.target.value }))} className={fieldClass} placeholder="ارسال استاندارد" />
          </label>
          <label className={labelClass}>هزینه ثابت (تومان)
            <input inputMode="numeric" dir="ltr" value={draft.fixedPriceTomans} onChange={event => setDraft(value => ({ ...value, fixedPriceTomans: event.target.value }))} className={fieldClass} placeholder="برای پیش‌نویس خالی بماند" />
          </label>
          <label className={labelClass}>آستانه ارسال رایگان (اختیاری)
            <input inputMode="numeric" dir="ltr" value={draft.freeShippingThresholdTomans} onChange={event => setDraft(value => ({ ...value, freeShippingThresholdTomans: event.target.value }))} className={fieldClass} placeholder="بدون آستانه" />
          </label>
          <label className={labelClass}>حداقل زمان تحویل (روز)
            <input inputMode="numeric" dir="ltr" value={draft.estimatedMinDays} onChange={event => setDraft(value => ({ ...value, estimatedMinDays: event.target.value }))} className={fieldClass} placeholder="اختیاری" />
          </label>
          <label className={labelClass}>حداکثر زمان تحویل (روز)
            <input inputMode="numeric" dir="ltr" value={draft.estimatedMaxDays} onChange={event => setDraft(value => ({ ...value, estimatedMaxDays: event.target.value }))} className={fieldClass} placeholder="اختیاری" />
          </label>
          <label className={`${labelClass} sm:col-span-2 lg:col-span-2`}>توضیح برای مشتری (اختیاری)
            <input maxLength={500} value={draft.description ?? ''} onChange={event => setDraft(value => ({ ...value, description: event.target.value }))} className={fieldClass} />
          </label>
          <label className={labelClass}>ترتیب نمایش
            <input inputMode="numeric" dir="ltr" value={draft.displayOrder} onChange={event => setDraft(value => ({ ...value, displayOrder: Number(event.target.value) }))} className={fieldClass} />
          </label>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3 text-xs text-stone-300">
          <input type="checkbox" checked={draft.active} onChange={event => setDraft(value => ({ ...value, active: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-[#ba8d3d]" />
          <span><strong className="block text-white">فعال‌کردن برای سفارش‌های جدید</strong><span className="mt-1 block text-[11px] leading-5 text-stone-400">پس از ذخیره، این روش و هزینه آن بلافاصله در پرداخت سفارش نمایش داده می‌شود.</span></span>
        </label>
        <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
          <button type="submit" disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#ba8d3d] px-4 py-2 text-xs font-bold text-stone-950 transition-colors hover:bg-[#d3aa5d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#eed29d] disabled:cursor-wait disabled:opacity-50">
            <Save size={14} />{saving ? 'در حال ذخیره…' : 'ذخیره روش'}
          </button>
          <button type="button" disabled={saving} onClick={() => { setIsFormOpen(false); setEditingId(null); setError(''); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs text-stone-300 transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d] disabled:opacity-50">انصراف</button>
        </div>
      </form>}

      {loading ? <p role="status" className="py-7 text-center text-xs text-stone-400">در حال دریافت روش‌های ارسال…</p> : error && methods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-rose-400/20 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-stone-200">فهرست روش‌های ارسال دریافت نشد.</p>
          <button type="button" onClick={() => void refresh()} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs text-stone-300 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d]"><RotateCw size={12} />تلاش دوباره</button>
        </div>
      ) : methods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-stone-200">هنوز روش ارسالی ثبت نشده است.</p>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-6 text-stone-400">تا وقتی یک روش را با هزینه تأییدشده فعال نکنید، ثبت سفارش برای مشتریان غیرفعال می‌ماند.</p>
        </div>
      ) : <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {methods.map(method => <article key={method.id} className="rounded-xl border border-white/10 bg-[#0e0d0c] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold text-white">{method.name}</h4>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${method.active ? 'bg-emerald-400/10 text-emerald-200' : 'bg-white/5 text-stone-400'}`}>{method.active ? 'فعال' : 'غیرفعال'}</span>
              </div>
              <p dir="ltr" className="mt-1 text-right font-mono text-[10px] text-stone-500">{method.code}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button type="button" disabled={savingId === method.id} onClick={() => startEdit(method)} aria-label={`ویرایش ${method.name}`} className="rounded-lg p-2 text-stone-400 transition-colors hover:bg-white/5 hover:text-[#eed29d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d]"><Pencil size={15} /></button>
              <button type="button" disabled={savingId === method.id || (!method.active && method.fixedPriceTomans === null)} onClick={() => void toggleActive(method)} className="min-h-9 rounded-lg border border-white/10 px-3 text-[11px] text-stone-300 transition-colors hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d] disabled:cursor-not-allowed disabled:opacity-45">
                {savingId === method.id ? 'در حال ذخیره…' : method.active ? 'غیرفعال‌کردن' : 'فعال‌کردن'}
              </button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/5 pt-3 text-xs sm:grid-cols-3">
            <div><span className="block text-[10px] text-stone-500">هزینه ثابت</span><strong className="mt-1 block text-stone-200">{method.fixedPriceTomans == null ? 'ثبت نشده' : `${method.fixedPriceTomans.toLocaleString('fa-IR')} تومان`}</strong></div>
            <div><span className="block text-[10px] text-stone-500">ارسال رایگان از</span><strong className="mt-1 block text-stone-200">{method.freeShippingThresholdTomans == null ? 'بدون آستانه' : `${method.freeShippingThresholdTomans.toLocaleString('fa-IR')} تومان`}</strong></div>
            <div className="col-span-2 sm:col-span-1"><span className="block text-[10px] text-stone-500">زمان تحویل</span><strong className="mt-1 inline-flex items-center gap-1.5 text-stone-200"><Clock3 size={12} />{method.estimatedMinDays == null ? 'اعلام نشده' : `${method.estimatedMinDays} تا ${method.estimatedMaxDays} روز کاری`}</strong></div>
          </div>
          {method.description && <p className="mt-3 border-t border-white/5 pt-3 text-xs leading-5 text-stone-400">{method.description}</p>}
        </article>)}
      </div>}

      <p className="flex items-start gap-2 border-t border-white/5 pt-4 text-[11px] leading-5 text-stone-500"><Check size={13} className="mt-0.5 shrink-0 text-[#ba8d3d]" />بازنشانی تنظیمات نمایشی، روش‌های ارسال ذخیره‌شده را تغییر نمی‌دهد. برای تغییر مبلغ یا فعال‌بودن، همین بخش را ویرایش کنید.</p>
      <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-[11px] text-stone-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ba8d3d] disabled:opacity-40"><RotateCw size={12} />به‌روزرسانی فهرست</button>
    </section>
  );
}
