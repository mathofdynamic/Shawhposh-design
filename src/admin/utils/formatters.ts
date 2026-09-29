/**
 * Formatting and RTL/LTR utilities for Shawhposh Admin
 * Keeps presented Persian numbers beautiful while keeping internal form/API inputs clean and valid.
 */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Converts Western digits to Persian digits for strictly presentation purposes
 */
export function toFaDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);
}

/**
 * Reverts Persian digits back to standard ASCII digits for form processing and mathematical operations
 */
export function toEnDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
}

/**
 * Formats an amount into localized Persian currency string with "تومان"
 */
export function formatTomans(amount: number): { formatted: string; fullWithUnit: string; raw: number } {
  const parts = Math.round(amount).toLocaleString('fa-IR');
  return {
    formatted: parts,
    fullWithUnit: `${parts} تومان`,
    raw: amount,
  };
}

/**
 * Formats a numeric price into a localized Persian string, e.g. "۲۵۰,۰۰۰ تومان" or "۲۵۰,۰۰۰"
 */
export function formatPriceTomans(amount: number | null | undefined, withUnit = true): string {
  if (amount === null || amount === undefined || isNaN(amount)) return withUnit ? '۰ تومان' : '۰';
  const rounded = Math.round(amount);
  const parts = Math.abs(rounded).toLocaleString('fa-IR');
  const sign = rounded < 0 ? '− ' : '';
  return withUnit ? `${sign}${parts} تومان` : `${sign}${parts}`;
}

/**
 * Formats positive, negative, and zero financial adjustments (e.g., discounts, refunds, penalties, adjustments)
 * with explicit mathematical signs, accessible labels and semantic colors.
 */
export function formatFinancialAdjustment(
  amount: number | null | undefined,
  withUnit = true
): {
  formatted: string;
  isPositive: boolean;
  isNegative: boolean;
  isZero: boolean;
  colorClass: string;
  accessibleLabel: string;
} {
  if (amount === null || amount === undefined || isNaN(amount) || Math.round(amount) === 0) {
    return {
      formatted: withUnit ? '۰ تومان' : '۰',
      isPositive: false,
      isNegative: false,
      isZero: true,
      colorClass: 'text-stone-400',
      accessibleLabel: 'بدون تعدیل (صفر)',
    };
  }

  const rounded = Math.round(amount);
  const absParts = Math.abs(rounded).toLocaleString('fa-IR');
  const unitSuffix = withUnit ? ' تومان' : '';

  if (rounded < 0) {
    return {
      formatted: `− ${absParts}${unitSuffix}`,
      isPositive: false,
      isNegative: true,
      isZero: false,
      colorClass: 'text-rose-400',
      accessibleLabel: `کسر مبلغ: منفی ${absParts}${unitSuffix}`,
    };
  }

  return {
    formatted: `+ ${absParts}${unitSuffix}`,
    isPositive: true,
    isNegative: false,
    isZero: false,
    colorClass: 'text-emerald-400',
    accessibleLabel: `افزایش مبلغ: مثبت ${absParts}${unitSuffix}`,
  };
}

/**
 * Formats an ISO string, Date object or timestamp into a readable Persian date
 * e.g. "۵ مهر ۱۴۰۳"
 */
export function formatPersianDate(
  dateInput: string | Date | number | null | undefined,
  options?: { includeTime?: boolean; format?: 'short' | 'long' }
): string {
  if (!dateInput) return '-';
  try {
    const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return '-';

    if (options?.format === 'short') {
      const year = new Intl.DateTimeFormat('fa-IR', { year: 'numeric' }).format(d);
      const month = new Intl.DateTimeFormat('fa-IR', { month: '2-digit' }).format(d);
      const day = new Intl.DateTimeFormat('fa-IR', { day: '2-digit' }).format(d);
      return `${year}/${month}/${day}`;
    }

    const dateStr = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);

    if (options?.includeTime) {
      const timeStr = new Intl.DateTimeFormat('fa-IR', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
      return `${dateStr}، ${timeStr}`;
    }

    return dateStr;
  } catch {
    return String(dateInput);
  }
}


/**
 * Masks customer phone number for privacy compliance in operational tables
 * e.g., '09123456789' -> '۰۹۱۲***۶۷۸۹'
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 7) return phone || '---';
  const clean = phone.trim();
  const start = clean.slice(0, 4);
  const end = clean.slice(-4);
  return toFaDigits(`${start}***${end}`);
}

/**
 * Masks customer email for privacy compliance in tables
 * e.g., 'client1005@gmail.com' -> 'cl***05@gmail.com'
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || '---';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0] || '*'}***@${domain}`;
  const start = local.slice(0, 2);
  const end = local.slice(-2);
  return `${start}***${end}@${domain}`;
}

/**
 * Masks raw IP address for privacy/audit log views
 * e.g., '192.168.1.104' -> '192.168.***.***'
 */
export function maskIpAddress(ip: string): string {
  if (!ip) return '0.0.0.0';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return ip;
}

/**
 * Formats ISO string into a rich Persian date and time representation
 */
export function formatPersianDateTime(isoString: string): {
  date: string;
  time: string;
  relative: string;
  iso: string;
} {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) {
      return { date: 'نامعتبر', time: '--:--', relative: '-', iso: isoString };
    }

    const dateStr = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);

    const timeStr = new Intl.DateTimeFormat('fa-IR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);

    // Relative calculation (in hours/days)
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let relative = '';
    if (diffMins < 5) relative = 'همین چند لحظه پیش';
    else if (diffMins < 60) relative = `${toFaDigits(diffMins)} دقیقه پیش`;
    else if (diffHours < 24) relative = `${toFaDigits(diffHours)} ساعت پیش`;
    else if (diffDays < 30) relative = `${toFaDigits(diffDays)} روز پیش`;
    else relative = dateStr;

    return {
      date: dateStr,
      time: timeStr,
      relative,
      iso: d.toISOString(),
    };
  } catch {
    return { date: 'نامعتبر', time: '--:--', relative: '-', iso: isoString };
  }
}
