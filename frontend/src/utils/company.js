// Company-wide display settings from Settings > General: name, timezone and holidays (the same holiday list the
// server uses to count leave days). Loaded once after sign-in and updated when an administrator saves.
import { useSyncExternalStore } from 'react';
import { setCompanyTimeZone } from './format';

let holidays = [];
let companyName = '';
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());

export const setCompanyGeneral = (general = {}) => {
  holidays = Array.isArray(general.holidays) ? [...general.holidays].sort((a, b) => a.date.localeCompare(b.date)) : [];
  companyName = general.companyName || '';
  setCompanyTimeZone(general.timezone);
  notify();
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useCompanyName = () => useSyncExternalStore(subscribe, () => companyName);

/** Re-renders the component when the holiday list loads or changes. */
export const useCompanyHolidays = () => useSyncExternalStore(subscribe, () => holidays);

/** Local calendar date as YYYY-MM-DD (never shifted through UTC). */
export const toIsoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const isHolidayDate = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const iso = toIsoDate(d);
  return holidays.find((h) => h.date === iso) || null;
};

export const getUpcomingHoliday = (from = new Date()) => {
  const today = toIsoDate(from);
  return holidays.find((h) => h.date >= today) || null;
};

/** Monday-Friday days between two dates (inclusive) that are not company holidays. */
export const countWorkdays = (start, end) => {
  if (!start || !end) return 0;
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return 0;
  let n = 0;
  for (let d = new Date(a.getFullYear(), a.getMonth(), a.getDate()); d <= b; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0 && d.getDay() !== 6 && !isHolidayDate(d)) n += 1;
  }
  return n;
};
