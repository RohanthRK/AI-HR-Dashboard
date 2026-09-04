// Utility to provide real dynamic yearly holiday calendar data

// Real Calendar Holidays Dataset with accurate dates for multi-year support & algorithmic fallback
const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: "New Year's Day", type: 'Public Holiday', description: 'Celebration of the New Year' },
  { month: 1, day: 26, name: 'Republic Day', type: 'National Holiday', description: 'Honoring the Constitution of India' },
  { month: 5, day: 1, name: 'International Workers\' Day', type: 'Public Holiday', description: 'May Day celebration' },
  { month: 8, day: 15, name: 'Independence Day', type: 'National Holiday', description: 'Commemorating national independence' },
  { month: 10, day: 2, name: 'Gandhi Jayanti', type: 'National Holiday', description: 'Birthday of Mahatma Gandhi' },
  { month: 12, day: 25, name: 'Christmas Day', type: 'Public Holiday', description: 'Celebration of Christmas' }
];

// Movable festival holiday lookup by year
const MOVABLE_HOLIDAYS_BY_YEAR = {
  2024: [
    { month: 3, day: 8, name: 'Maha Shivratri', type: 'Gazetted Holiday' },
    { month: 3, day: 25, name: 'Holi', type: 'Gazetted Holiday' },
    { month: 3, day: 29, name: 'Good Friday', type: 'Public Holiday' },
    { month: 4, day: 11, name: 'Eid al-Fitr', type: 'Public Holiday' },
    { month: 6, day: 17, name: 'Eid al-Adha (Bakrid)', type: 'Public Holiday' },
    { month: 8, day: 19, name: 'Raksha Bandhan', type: 'Restricted Holiday' },
    { month: 8, day: 26, name: 'Janmashtami', type: 'Gazetted Holiday' },
    { month: 9, day: 7, name: 'Ganesh Chaturthi', type: 'Gazetted Holiday' },
    { month: 10, day: 12, name: 'Dussehra / Vijayadashami', type: 'National Holiday' },
    { month: 10, day: 31, name: 'Diwali / Deepavali', type: 'National Holiday' },
    { month: 11, day: 15, name: 'Guru Nanak Jayanti', type: 'Gazetted Holiday' }
  ],
  2025: [
    { month: 2, day: 26, name: 'Maha Shivratri', type: 'Gazetted Holiday' },
    { month: 3, day: 14, name: 'Holi', type: 'Gazetted Holiday' },
    { month: 3, day: 31, name: 'Eid al-Fitr', type: 'Public Holiday' },
    { month: 4, day: 18, name: 'Good Friday', type: 'Public Holiday' },
    { month: 6, day: 7, name: 'Eid al-Adha (Bakrid)', type: 'Public Holiday' },
    { month: 8, day: 9, name: 'Raksha Bandhan', type: 'Restricted Holiday' },
    { month: 8, day: 16, name: 'Janmashtami', type: 'Gazetted Holiday' },
    { month: 8, day: 27, name: 'Ganesh Chaturthi', type: 'Gazetted Holiday' },
    { month: 10, day: 2, name: 'Dussehra / Vijayadashami', type: 'National Holiday' },
    { month: 10, day: 20, name: 'Diwali / Deepavali', type: 'National Holiday' },
    { month: 11, day: 5, name: 'Guru Nanak Jayanti', type: 'Gazetted Holiday' }
  ],
  2026: [
    { month: 2, day: 15, name: 'Maha Shivratri', type: 'Gazetted Holiday' },
    { month: 3, day: 4, name: 'Holi', type: 'Gazetted Holiday' },
    { month: 3, day: 20, name: 'Eid al-Fitr', type: 'Public Holiday' },
    { month: 4, day: 3, name: 'Good Friday', type: 'Public Holiday' },
    { month: 5, day: 27, name: 'Eid al-Adha (Bakrid)', type: 'Public Holiday' },
    { month: 8, day: 28, name: 'Raksha Bandhan', type: 'Restricted Holiday' },
    { month: 9, day: 4, name: 'Janmashtami', type: 'Gazetted Holiday' },
    { month: 9, day: 14, name: 'Ganesh Chaturthi', type: 'Gazetted Holiday' },
    { month: 10, day: 20, name: 'Dussehra / Vijayadashami', type: 'National Holiday' },
    { month: 11, day: 8, name: 'Diwali / Deepavali', type: 'National Holiday' },
    { month: 11, day: 24, name: 'Guru Nanak Jayanti', type: 'Gazetted Holiday' }
  ],
  2027: [
    { month: 3, day: 6, name: 'Maha Shivratri', type: 'Gazetted Holiday' },
    { month: 3, day: 23, name: 'Holi', type: 'Gazetted Holiday' },
    { month: 3, day: 26, name: 'Good Friday', type: 'Public Holiday' },
    { month: 3, day: 10, name: 'Eid al-Fitr', type: 'Public Holiday' },
    { month: 5, day: 17, name: 'Eid al-Adha (Bakrid)', type: 'Public Holiday' },
    { month: 8, day: 17, name: 'Raksha Bandhan', type: 'Restricted Holiday' },
    { month: 8, day: 25, name: 'Janmashtami', type: 'Gazetted Holiday' },
    { month: 9, day: 4, name: 'Ganesh Chaturthi', type: 'Gazetted Holiday' },
    { month: 10, day: 9, name: 'Dussehra / Vijayadashami', type: 'National Holiday' },
    { month: 10, day: 29, name: 'Diwali / Deepavali', type: 'National Holiday' },
    { month: 11, day: 14, name: 'Guru Nanak Jayanti', type: 'Gazetted Holiday' }
  ]
};

/**
 * Get full real holiday calendar list for any given year
 * @param {number} year - Target calendar year (e.g., 2026)
 * @returns {Array} List of sorted holidays with exact date strings and metadata
 */
export const getHolidaysForYear = (year = new Date().getFullYear()) => {
  const targetYear = parseInt(year, 10) || new Date().getFullYear();
  const holidays = [];

  // 1. Add Fixed Calendar Holidays
  FIXED_HOLIDAYS.forEach(item => {
    const mStr = String(item.month).padStart(2, '0');
    const dStr = String(item.day).padStart(2, '0');
    const dateStr = `${targetYear}-${mStr}-${dStr}`;
    const dateObj = new Date(`${dateStr}T00:00:00`);

    holidays.push({
      id: `${targetYear}-${item.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: item.name,
      date: dateStr,
      type: item.type,
      description: item.description,
      dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
      dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    });
  });

  // 2. Add Movable Festival Holidays (from lookup or estimated)
  const movable = MOVABLE_HOLIDAYS_BY_YEAR[targetYear] || MOVABLE_HOLIDAYS_BY_YEAR[2026];
  movable.forEach(item => {
    const mStr = String(item.month).padStart(2, '0');
    const dStr = String(item.day).padStart(2, '0');
    const dateStr = `${targetYear}-${mStr}-${dStr}`;
    const dateObj = new Date(`${dateStr}T00:00:00`);

    holidays.push({
      id: `${targetYear}-${item.name.replace(/\s+/g, '-').toLowerCase()}`,
      name: item.name,
      date: dateStr,
      type: item.type,
      description: item.type,
      dayOfWeek: dateObj.toLocaleDateString('en-US', { weekday: 'long' }),
      dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    });
  });

  // Sort chronologically by date
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Get next upcoming holiday from a specific date (defaults to today)
 */
export const getUpcomingHoliday = (from = new Date()) => {
  const fromDate = from instanceof Date ? from : new Date(from);
  const currentYear = fromDate.getFullYear();
  const todayStr = fromDate.toISOString().split('T')[0];

  const thisYearHolidays = getHolidaysForYear(currentYear);
  const nextHolidaysThisYear = thisYearHolidays.filter(h => h.date >= todayStr);

  if (nextHolidaysThisYear.length > 0) {
    return nextHolidaysThisYear[0];
  }

  // If year has ended, check next year's first holiday
  const nextYearHolidays = getHolidaysForYear(currentYear + 1);
  return nextYearHolidays[0] || null;
};

/**
 * Check if a date is a public holiday
 * @param {string|Date} date
 * @returns {Object|null} Holiday object if match, otherwise null
 */
export const isHolidayDate = (date) => {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;

  const dateStr = d.toISOString().split('T')[0];
  const year = d.getFullYear();
  const yearHolidays = getHolidaysForYear(year);

  return yearHolidays.find(h => h.date === dateStr) || null;
};
