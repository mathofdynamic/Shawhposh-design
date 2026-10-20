import { useEffect, useState, type FormEvent } from 'react';
import { CreditCard, RefreshCw, Save, ShieldCheck, WalletCards } from 'lucide-react';
import { ApiClientError } from '../../../api/client';
import { loadPaymentSettings, saveBalePaymentSettings, saveCardPaymentSettings, type AdminPaymentSettings } from '../../features/paymentsApi';

const field = 'w-full rounded-xl border border-white/10 bg-[#0e0d0c] px-3.5 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#ba8d3d] focus-visible:ring-2 focus-visible:ring-[#ba8d3d]/30';
const label = 'block space-y-1.5 text-xs font-medium text-stone-300';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-stone-300 transition-colors hover:border-[#ba8d3d]/40 hover:text-[#eed29d] disabled:cursor-not-allowed disabled:opacity-50';

type CardDraft = { enabled: boolean; bankName: string; cardholderName: string; cardNumber: string; accountIban: string; instructions: string; manualReviewMessage: string; manualReviewHoldHours: string };
const emptyCard: CardDraft = { enabled: false, bankName: '', cardholderName: '', cardNumber: '', accountIban: '', instructions: '', manualReviewMessage: '', manualReviewHoldHours: '' };
const errorText = (error: unknown) => error instanceof ApiClientError || error instanceof Error ? error.message : 'ذخیره تنظیمات پرداخت انجام نشد.';

export default function PaymentMethodsPanel() {
  const [settings, setSettings] = useState<AdminPaymentSettings | null>(null);
  const [draft, setDraft] = useState<CardDraft>(emptyCard);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = async () => {
    setLoading(true); setError('');
    try {
      const next = await loadPaymentSettings();
      setSettings(next);
      const card = next.methods.card_to_card;
      setDraft({ enabled: card.enabled, bankName: card.bankName ?? '', cardholderName: card.cardholderName ?? '', cardNumber: card.cardNumber ?? '',
        accountIban: card.accountIban ?? '', instructions: card.instructions ?? '', manualReviewMessage: card.manualReviewMessage ?? '',
        manualReviewHoldHours: card.manualReviewHoldHours == null ? '' : String(card.manualReviewHoldHours) });
    } catch (failure) { setError(errorText(failure)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const saveCard = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const hold = draft.manualReviewHoldHours.trim() ? Number(draft.manualReviewHoldHours) : null;
      const next = await saveCardPaymentSettings({ enabled: draft.enabled, bankName: draft.bankName || null, cardholderName: draft.cardholderName || null,
        cardNumber: draft.cardNumber, accountIban: draft.accountIban || null, instructions: draft.instructions || null,
        manualReviewMessage: draft.manualReviewMessage || null, manualReviewHoldHours: hold });
      setSettings(next); setNotice('تنظیمات کارت‌به‌کارت ذخیره شد.');
      const card = next.methods.card_to_card;
      setDraft({ enabled: card.enabled, bankName: card.bankName ?? '', cardholderName: card.cardholderName ?? '', cardNumber: card.cardNumber ?? '',
        accountIban: card.accountIban ?? '', instructions: card.instructions ?? '', manualReviewMessage: card.manualReviewMessage ?? '',
        manualReviewHoldHours: card.manualReviewHoldHours == null ? '' : String(card.manualReviewHoldHours) });
    } catch (failure) { setError(errorText(failure)); }
    finally { setSaving(false); }
  };

  const toggleBale = async () => {
    if (!settings) return;
    setSaving(true); setError(''); setNotice('');
    try { setSettings(await saveBalePaymentSettings(!settings.methods.bale_wallet.enabled)); setNotice('وضعیت کیف پول بله ذخیره شد.'); }
    catch (failure) { setError(errorText(failure)); }
    finally { setSaving(false); }
  };

  const update = <K extends keyof CardDraft>(key: K, value: CardDraft[K]) => setDraft(current => ({ ...current, [key]: value }));
  return <section dir="rtl" className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-base font-bold text-white"><CreditCard size={17} className="text-[#eed29d]" /> روش‌های پرداخت</h2><p className="mt-1 text-xs leading-6 text-stone-500">روش‌ها تا زمان ثبت پیکربندی واقعی غیرفعال می‌مانند. اطلاعات بله فقط از محیط امن سرور خوانده می‌شود.</p></div><button type="button" disabled={loading || saving} onClick={() => void refresh()} className={secondaryButton}><RefreshCw size={14} /> تازه‌سازی</button></header>
    {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}{notice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
    {loading ? <p role="status" className="rounded-2xl border border-white/[0.08] bg-[#131211] p-8 text-center text-sm text-stone-400">در حال دریافت تنظیمات پرداخت…</p> : !settings ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-[#131211] p-5"><p className="text-sm text-stone-300">تنظیمات دریافت نشد؛ تا زمان دریافت اطلاعات معتبر، امکان ذخیره وجود ندارد.</p><button type="button" onClick={() => void refresh()} className={secondaryButton}><RefreshCw size={14} /> تلاش دوباره</button></div> : <div className="grid gap-5 xl:grid-cols-2">
      <form onSubmit={saveCard} className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#131211] p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-bold text-white">کارت‌به‌کارت با بررسی دستی</h3><p className="mt-1 text-[11px] leading-5 text-stone-500">تأیید رسید فقط پس از تطبیق واریز با گردش یا اعلان بانکی انجام می‌شود.</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] ${settings?.methods.card_to_card.enabled ? 'bg-emerald-400/10 text-emerald-200' : 'bg-stone-700/50 text-stone-400'}`}>{settings?.methods.card_to_card.enabled ? 'فعال' : 'غیرفعال'}</span></div>
        <label className={label}>نام بانک<input value={draft.bankName} onChange={event => update('bankName', event.target.value)} maxLength={100} className={field} /></label>
        <label className={label}>نام صاحب کارت<input value={draft.cardholderName} onChange={event => update('cardholderName', event.target.value)} maxLength={120} className={field} /></label>
        <label className={label}>شماره کارت<input value={draft.cardNumber} onChange={event => update('cardNumber', event.target.value)} inputMode="numeric" autoComplete="off" dir="ltr" maxLength={40} className={`${field} text-left font-mono`} placeholder="شماره کارت واقعی را وارد کنید" /></label>
        <label className={label}>شماره شبا (اختیاری)<input value={draft.accountIban} onChange={event => update('accountIban', event.target.value)} dir="ltr" maxLength={40} className={`${field} text-left font-mono`} /></label>
        <label className={label}>راهنمای پرداخت<textarea value={draft.instructions} onChange={event => update('instructions', event.target.value)} maxLength={1200} rows={3} className={`${field} resize-y`} /></label>
        <label className={label}>پیام بررسی رسید (اختیاری)<input value={draft.manualReviewMessage} onChange={event => update('manualReviewMessage', event.target.value)} maxLength={500} className={field} /></label>
        <label className={label}>مهلت نگهداری موجودی هنگام بررسی (ساعت)<input required type="number" min={1} max={72} value={draft.manualReviewHoldHours} onChange={event => update('manualReviewHoldHours', event.target.value)} className={field} /></label>
        <label className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-3 text-xs text-stone-300"><input type="checkbox" checked={draft.enabled} onChange={event => update('enabled', event.target.checked)} className="accent-[#ba8d3d]" /> فعال‌کردن پس از ثبت اطلاعات واقعی و معتبر</label>
        <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ba8d3d] px-4 py-3 text-xs font-bold text-[#0e0d0c] transition-colors hover:bg-[#cda34f] disabled:opacity-50"><Save size={15} /> {saving ? 'در حال ذخیره…' : 'ذخیره کارت‌به‌کارت'}</button>
      </form>
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-[#131211] p-4 sm:p-6">
        <div className="flex items-start gap-3"><WalletCards size={19} className="mt-0.5 text-[#eed29d]" /><div><h3 className="text-sm font-bold text-white">کیف پول بله</h3><p className="mt-1 text-[11px] leading-5 text-stone-500">توکن ربات و توکن پرداخت فقط از متغیرهای محیطی سرور خوانده می‌شوند و در پنل نمایش داده نمی‌شوند.</p></div></div>
        <div className="rounded-xl border border-white/[0.06] bg-[#0e0d0c] p-4 text-xs leading-6 text-stone-300"><p>وضعیت امن سرور: <strong className={settings?.methods.bale_wallet.configured ? 'text-emerald-200' : 'text-amber-200'}>{settings?.methods.bale_wallet.configured ? 'اعتبارنامه‌ها تنظیم شده‌اند' : 'اعتبارنامه‌ها تنظیم نشده‌اند'}</strong></p><p>نام کاربری ربات: <span dir="ltr" className="font-mono">{settings?.methods.bale_wallet.botUsername ? `@${settings.methods.bale_wallet.botUsername}` : '—'}</span></p>{!settings?.methods.bale_wallet.configured && <p className="mt-2 text-amber-100">پیش از فعال‌سازی، توکن ربات، توکن ارائه‌دهنده پرداخت و کلید وب‌هوک را امن روی سرور تنظیم کنید.</p>}</div>
        <label className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-3 text-xs text-stone-300"><input type="checkbox" checked={Boolean(settings?.methods.bale_wallet.enabled)} disabled={!settings?.methods.bale_wallet.configured || saving} onChange={() => void toggleBale()} className="accent-[#ba8d3d]" /> فعال‌کردن کیف پول بله</label>
        <p className="flex items-start gap-2 text-[10px] leading-5 text-stone-500"><ShieldCheck size={14} className="mt-0.5 shrink-0" /> هیچ پرداختی تا دریافت تأیید سرور از نتیجه استعلام رسمی بله، موفق تلقی نمی‌شود. توکن آزمایشی فقط در محیط آزمون استفاده شود.</p>
      </div>
    </div>}
  </section>;
}
