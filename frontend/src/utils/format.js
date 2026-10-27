// Shared display formatting so every page shows dates, times and money the same way (Indian conventions:
// day-first dates, rupees with lakh/crore grouping, times in the company's timezone, IST by default).
const LOCALE = 'en-IN';

const toDate = (value) => {
  if (!value) return null;
  // Date-only strings are calendar dates: parse as local so they never shift a day.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDate = (value, fallback = '-') => {
  const d = toDate(value);
  return d ? d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' }) : fallback;
};

export const formatDateRange = (start, end) => {
  const a = toDate(start);
  const b = toDate(end);
  if (!a) return '-';
  if (!b || a.getTime() === b.getTime()) return formatDate(start);
  const sameYear = a.getFullYear() === b.getFullYear();
  const left = a.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
  return `${left} – ${formatDate(end)}`;
};

// Times are shown in the company's timezone (Settings > General), not the viewer's, so everyone sees the same clock times.
let companyTimeZone = 'Asia/Kolkata';
export const setCompanyTimeZone = (tz) => {
  try {
    if (tz) {
      new Intl.DateTimeFormat(LOCALE, { timeZone: tz });
      companyTimeZone = tz;
    }
  } catch {
    companyTimeZone = 'Asia/Kolkata';
  }
};

export const formatTime = (value, fallback = '-') => {
  const d = toDate(value);
  return d ? d.toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: companyTimeZone }).toUpperCase() : fallback;
};

// "26 Oct 2026, 7:45 PM" in the company timezone
export const formatDateTime = (value, fallback = '-') => {
  const d = toDate(value);
  if (!d) return fallback;
  const date = d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', timeZone: companyTimeZone });
  return `${date}, ${formatTime(value)}`;
};

// "just now", "5 min ago", "3 h ago", "yesterday", then the date
export const timeAgo = (value, fallback = '') => {
  const d = toDate(value);
  if (!d) return fallback;
  const minutes = Math.round((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)} h ago`;
  if (minutes < 60 * 48) return 'yesterday';
  if (minutes < 60 * 24 * 7) return `${Math.round(minutes / (60 * 24))} days ago`;
  return formatDate(value);
};

// ₹12,34,567.50 (paise only when there are some)
export const formatMoney = (value) => {
  const n = Number(value);
  if (value === null || value === '' || value === undefined || !Number.isFinite(n)) return '-';
  const whole = Number.isInteger(n);
  return n.toLocaleString(LOCALE, { style: 'currency', currency: 'INR', minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
};

// ₹4.2 L, ₹1.8 Cr - for charts and tiles where the full figure is too long
export const formatMoneyShort = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const trim = (x) => String(Number(x.toFixed(2)));
  if (abs >= 1e7) return `${sign}₹${trim(abs / 1e7)} Cr`;
  if (abs >= 1e5) return `${sign}₹${trim(abs / 1e5)} L`;
  if (abs >= 1e3) return `${sign}₹${trim(abs / 1e3)} K`;
  return `${sign}₹${trim(abs)}`;
};
