"""Working-day arithmetic shared by leave requests, attendance and the seed data. Holidays are company settings."""
import datetime


# National holidays fall on the same date every year
FIXED_HOLIDAYS = [((1, 26), 'Republic Day'), ((5, 1), 'May Day'), ((8, 15), 'Independence Day'), ((10, 2), 'Gandhi Jayanti'), ((12, 25), 'Christmas Day')]

# Festival dates follow the lunar calendar and change every year; these are the commonly observed dates, and HR should
# confirm them each year in Settings > General > Holidays.
FESTIVALS = {
    2025: [('2025-03-14', 'Holi'), ('2025-03-31', 'Eid-ul-Fitr'), ('2025-04-18', 'Good Friday'), ('2025-08-27', 'Ganesh Chaturthi'),
           ('2025-10-02', 'Dussehra'), ('2025-10-21', 'Diwali')],
    2026: [('2026-03-04', 'Holi'), ('2026-03-21', 'Eid-ul-Fitr'), ('2026-04-03', 'Good Friday'), ('2026-05-27', 'Bakrid (Eid-ul-Adha)'),
           ('2026-09-14', 'Ganesh Chaturthi'), ('2026-10-20', 'Dussehra'), ('2026-11-09', 'Diwali (Govardhan Puja)')],
    2027: [('2027-03-10', 'Eid-ul-Fitr'), ('2027-03-22', 'Holi'), ('2027-03-26', 'Good Friday'), ('2027-05-17', 'Bakrid (Eid-ul-Adha)'),
           ('2027-09-04', 'Ganesh Chaturthi'), ('2027-10-09', 'Dussehra'), ('2027-10-29', 'Diwali')],
}


def india_holidays(year):
    names = {}
    for day, name in [(datetime.date(year, m, d), name) for (m, d), name in FIXED_HOLIDAYS] + [(datetime.date.fromisoformat(d), name) for d, name in FESTIVALS.get(year, [])]:
        names.setdefault(day, []).append(name)             # two holidays on one day are one day off: "Gandhi Jayanti / Dussehra"
    return [{'date': d.isoformat(), 'name': ' / '.join(n)} for d, n in sorted(names.items())]


DEFAULT_HOLIDAYS = [h for y in range(2025, 2029) for h in india_holidays(y)]


def holiday_map():
    """{iso date: name} from Settings > General > Holidays."""
    from utils.app_settings import get_settings
    return {h['date']: h['name'] for h in get_settings()['general'].get('holidays', [])}


def workdays(start, end, holidays=None):
    """Mon-Fri dates between start and end (inclusive) that are not company holidays."""
    holidays = holiday_map() if holidays is None else holidays
    out, d = [], start
    while d <= end:
        if d.weekday() < 5 and d.isoformat() not in holidays:
            out.append(d)
        d += datetime.timedelta(days=1)
    return out
