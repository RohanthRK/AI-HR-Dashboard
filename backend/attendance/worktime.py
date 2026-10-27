"""
Working time: what each day of an employee's calendar is, and whether they put in the hours they are expected to.

A person's expected hours per day come from their own setting (part-timers, shorter shifts) or else the company default
(Settings > General > Working hours per day, 8 unless changed). A day counts as "short" when the hours worked are more than
15 minutes under the expectation. Half-day leave halves the expectation; weekends, company holidays and approved leave are
not expected working time. A first clock-in later than the "late after" time (default 09:30, company timezone) is late.
"""
import datetime
import zoneinfo

from utils.app_settings import get_settings
from utils.workdays import holiday_map

GRACE_HOURS = 0.25
DEFAULT_HOURS = 8.0


def company_rules():
    general = get_settings()['general']
    try:
        office = zoneinfo.ZoneInfo(general.get('timezone') or 'Asia/Kolkata')
    except Exception:
        office = zoneinfo.ZoneInfo('Asia/Kolkata')
    try:
        hh, mm = str(general.get('lateAfter') or '09:30').split(':')
        late_after = (int(hh), int(mm))
    except ValueError:
        late_after = (9, 30)
    hours = general.get('workHoursPerDay')
    return {'office': office, 'late_after': late_after, 'default_hours': float(hours) if hours else DEFAULT_HOURS, 'holidays': holiday_map()}


def expected_hours(emp, rules):
    try:
        own = float(emp.get('expected_hours') or 0)
    except (TypeError, ValueError):
        own = 0
    return own if own > 0 else rules['default_hours']


def _date(value):
    try:
        return datetime.date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def _parse(value):
    try:
        d = datetime.datetime.fromisoformat(str(value))
        return d if d.tzinfo else d.replace(tzinfo=datetime.timezone.utc)
    except (TypeError, ValueError):
        return None


def hours_of(record, now):
    """(hours worked, still clocked in) for one attendance record; an open session counts up to now."""
    total = float(record.get('total_hours') or 0)
    logs = record.get('logs') or []
    open_log = next((l for l in logs if l.get('clock_in') and not l.get('clock_out')), None)
    if open_log is None and not logs and record.get('clock_in') and not record.get('clock_out'):
        open_log = {'clock_in': record['clock_in']}
    if open_log:
        started = _parse(open_log['clock_in'])
        if started:
            total += max((now - started).total_seconds() / 3600, 0)
        return round(total, 2), True
    return round(total, 2), False


def build_days(emp, first, last, records, leaves, rules, today=None, now=None):
    """
    One entry per calendar day from `first` to `last`.
    `records`: {iso date: attendance record}; `leaves`: approved leaves of this employee (dicts with start_date, end_date, leave_type, is_half_day).
    kind: weekend | holiday | leave | present | absent | pending (today, not in yet) | upcoming | outside (before joining or after leaving)
    """
    now = now or datetime.datetime.now(tz=datetime.timezone.utc)
    today = today or now.date()
    expect = expected_hours(emp, rules)
    hired, left = _date(emp.get('hire_date')), _date(emp.get('termination_date'))
    days = []
    day = first
    while day <= last:
        iso = day.isoformat()
        entry = {'date': iso, 'weekday': day.strftime('%a'), 'kind': '', 'hours': 0.0, 'expected': 0.0, 'clock_in': None, 'clock_out': None, 'work_mode': '',
                 'late': False, 'target_met': None, 'short_by': 0.0, 'open': False, 'missing_clock_out': False, 'leave_type': '', 'holiday': '', 'half_day': False, 'logs': []}
        rec = records.get(iso)
        leave = next((l for l in leaves if str(l.get('start_date'))[:10] <= iso <= str(l.get('end_date'))[:10]), None)
        if (hired and day < hired) or (left and day > left):
            entry['kind'] = 'outside'
        elif rec and rec.get('clock_in'):
            hours, is_open = hours_of(rec, now)
            logs = rec.get('logs') or [{'clock_in': rec.get('clock_in'), 'clock_out': rec.get('clock_out')}]
            first_in = _parse(logs[0].get('clock_in') or rec.get('clock_in'))
            off_day = day.weekday() >= 5 or iso in rules['holidays']
            half = bool(leave and leave.get('is_half_day'))
            need = 0.0 if off_day else (expect / 2 if half else expect)
            entry.update({'kind': 'present', 'hours': hours, 'expected': round(need, 2), 'clock_in': rec.get('clock_in'), 'clock_out': rec.get('clock_out'), 'work_mode': rec.get('work_mode', ''),
                          'open': is_open and day == today, 'logs': [{'clock_in': l.get('clock_in'), 'clock_out': l.get('clock_out')} for l in logs], 'half_day': half})
            if first_in and not off_day:
                arrived = first_in.astimezone(rules['office'])
                entry['late'] = (arrived.hour, arrived.minute) > rules['late_after']
            entry['missing_clock_out'] = (is_open and day < today) or (not is_open and not rec.get('clock_out') and day < today and not logs[-1].get('clock_out'))
            if entry['missing_clock_out']:
                entry['hours'] = round(float(rec.get('total_hours') or 0), 2)
            if not entry['open'] and not entry['missing_clock_out']:
                entry['target_met'] = hours >= need - GRACE_HOURS
                entry['short_by'] = round(max(need - hours, 0), 2) if not entry['target_met'] else 0.0
            if off_day:
                entry['kind'] = 'present'
                entry['note'] = 'Worked on a day off'
        elif day.weekday() >= 5:
            entry['kind'] = 'weekend'
        elif iso in rules['holidays']:
            entry.update({'kind': 'holiday', 'holiday': rules['holidays'][iso]})
        elif leave:
            entry.update({'kind': 'leave', 'leave_type': leave.get('leave_type', 'Leave'), 'half_day': bool(leave.get('is_half_day'))})
        elif day > today:
            entry['kind'] = 'upcoming'
        elif day == today:
            entry.update({'kind': 'pending', 'expected': round(expect, 2)})
        else:
            entry.update({'kind': 'absent', 'expected': round(expect, 2)})
        days.append(entry)
        day += datetime.timedelta(days=1)
    return days


def summarize(days):
    """Totals for a run of days from build_days."""
    s = {'working_days': 0, 'present_days': 0, 'absent_days': 0, 'leave_days': 0.0, 'late_days': 0, 'short_days': 0, 'missing_clock_out_days': 0,
         'hours': 0.0, 'expected_hours': 0.0, 'overtime_hours': 0.0, 'holidays': 0}
    for d in days:
        if d['kind'] == 'holiday':
            s['holidays'] += 1
        elif d['kind'] == 'leave':
            s['leave_days'] += 0.5 if d['half_day'] else 1
        elif d['kind'] == 'absent':
            s['absent_days'] += 1
            s['working_days'] += 1
            s['expected_hours'] += d['expected']
        elif d['kind'] == 'present':
            if d['expected']:               # work on a weekend or holiday adds hours but is not a "day present"
                s['present_days'] += 1
                s['working_days'] += 1
                s['expected_hours'] += d['expected']
            s['hours'] += d['hours']
            s['late_days'] += 1 if d['late'] else 0
            s['short_days'] += 1 if d['target_met'] is False else 0
            s['missing_clock_out_days'] += 1 if d['missing_clock_out'] else 0
            s['overtime_hours'] += max(d['hours'] - d['expected'], 0) if d['target_met'] is not None and d['expected'] else 0
        elif d['kind'] == 'pending':
            pass
    s['avg_hours'] = round(s['hours'] / s['present_days'], 2) if s['present_days'] else 0.0
    s['hours_pct'] = round(s['hours'] / s['expected_hours'] * 100) if s['expected_hours'] else None
    for key in ('hours', 'expected_hours', 'overtime_hours'):
        s[key] = round(s[key], 2)
    return s


def flags(summary):
    """Plain-language reasons an employee needs a look over the period."""
    out = []
    if summary['absent_days']:
        out.append(f"{summary['absent_days']} day(s) with no attendance")
    if summary['short_days']:
        out.append(f"{summary['short_days']} day(s) short on hours")
    if summary['missing_clock_out_days']:
        out.append(f"{summary['missing_clock_out_days']} day(s) without a clock-out")
    if summary['late_days'] >= 3:
        out.append(f"late {summary['late_days']} times")
    return out
