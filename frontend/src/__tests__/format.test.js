import { formatDate, formatDateRange, formatMoney, formatMoneyShort, formatTime, setCompanyTimeZone } from '../utils/format';

describe('display formatting', () => {
  it('formats calendar dates without shifting the day', () => {
    expect(formatDate('2026-11-30')).toBe('30 Nov 2026');
    expect(formatDate('')).toBe('-');
    expect(formatDate('nonsense', 'n/a')).toBe('n/a');
  });

  it('formats ranges compactly', () => {
    expect(formatDateRange('2026-11-30', '2026-12-03')).toBe('30 Nov – 3 Dec 2026');
    expect(formatDateRange('2026-11-09', '2026-11-09')).toBe('9 Nov 2026');
    expect(formatDateRange('2026-12-30', '2027-01-02')).toBe('30 Dec 2026 – 2 Jan 2027');
  });

  it('shows clock times in the company timezone', () => {
    setCompanyTimeZone('America/Los_Angeles');
    expect(formatTime('2026-10-26T16:30:00+00:00')).toBe('9:30 AM');
    setCompanyTimeZone('Asia/Kolkata');
    expect(formatTime('2026-10-26T16:30:00+00:00')).toBe('10:00 PM');
    setCompanyTimeZone('Not/AZone');                     // an invalid zone must not break rendering
    expect(formatTime('2026-10-26T16:30:00+00:00')).toMatch(/AM|PM/);
  });

  it('formats rupees the Indian way', () => {
    expect(formatMoney(9912.5)).toBe('₹9,912.50');
    expect(formatMoney(1234567)).toBe('₹12,34,567');
    expect(formatMoney('x')).toBe('-');
    expect(formatMoneyShort(1250000)).toBe('₹12.5 L');
    expect(formatMoneyShort(34000000)).toBe('₹3.4 Cr');
  });
});
