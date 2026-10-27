"""Working time: expected hours per person, short / late / missing clock-out days, the month view and the everyone overview."""
import datetime
import zoneinfo

from hr_backend.db import attendance, db, employees, leaves
from attendance import worktime
from tests.test_api import ApiTestCase

IST = zoneinfo.ZoneInfo('Asia/Kolkata')
RULES = {'office': IST, 'late_after': (9, 30), 'default_hours': 8.0, 'holidays': {'2026-09-08': 'Test Festival'}}
MON, TUE, WED, THU, FRI, SAT = (datetime.date(2026, 9, d) for d in (7, 8, 9, 10, 11, 12))
NOW = datetime.datetime(2026, 9, 14, 12, 0, tzinfo=datetime.timezone.utc)       # a Monday, after all the days above


def record(day, start='09:00', hours=8.0, closed=True):
    """An attendance record that starts at `start` IST on `day` and lasts `hours`."""
    begin = datetime.datetime.combine(day, datetime.time.fromisoformat(start), tzinfo=IST).astimezone(datetime.timezone.utc)
    end = begin + datetime.timedelta(hours=hours)
    log = {'clock_in': begin.isoformat(), 'clock_out': end.isoformat() if closed else None}
    return {'date': day.isoformat(), 'clock_in': log['clock_in'], 'clock_out': log['clock_out'], 'total_hours': hours if closed else 0, 'logs': [log], 'work_mode': 'Office'}


def days_for(emp, first, last, records=(), leave_list=(), today=None, now=NOW):
    return worktime.build_days(emp, first, last, {r['date']: r for r in records}, list(leave_list), RULES, today or NOW.date(), now)


class WorkTimeRuleTests(ApiTestCase):
    def one(self, emp, day, rec=None, leave=None):
        return days_for(emp, day, day, [rec] if rec else [], [leave] if leave else [])[0]

    def test_days_that_are_not_working_time(self):
        self.assertEqual(self.one({}, SAT)['kind'], 'weekend')
        holiday = self.one({}, TUE)
        self.assertEqual((holiday['kind'], holiday['holiday']), ('holiday', 'Test Festival'))
        self.assertEqual(self.one({}, WED, leave={'start_date': '2026-09-09', 'end_date': '2026-09-10', 'leave_type': 'Casual'})['kind'], 'leave')
        self.assertEqual(self.one({}, MON)['kind'], 'absent')                                         # a past working day with nothing recorded
        self.assertEqual(days_for({}, datetime.date(2026, 9, 15), datetime.date(2026, 9, 15))[0]['kind'], 'upcoming')

    def test_the_company_default_is_eight_hours_with_a_quarter_hour_grace(self):
        full = self.one({}, MON, record(MON, hours=8.0))
        self.assertEqual((full['target_met'], full['late'], full['expected']), (True, False, 8.0))
        near = self.one({}, MON, record(MON, hours=7.8))
        self.assertTrue(near['target_met'])                                                           # within 15 minutes
        short = self.one({}, MON, record(MON, hours=6.5))
        self.assertEqual((short['target_met'], short['short_by']), (False, 1.5))

    def test_a_person_can_have_their_own_hours(self):
        part_timer = {'expected_hours': 5}
        self.assertTrue(self.one(part_timer, MON, record(MON, hours=5.0))['target_met'])
        self.assertFalse(self.one({}, MON, record(MON, hours=5.0))['target_met'])                      # the same day is short for a full-timer
        self.assertEqual(self.one(part_timer, MON)['expected'], 5.0)

    def test_half_day_leave_halves_the_expectation(self):
        half = {'start_date': '2026-09-07', 'end_date': '2026-09-07', 'leave_type': 'Casual', 'is_half_day': True}
        day = self.one({}, MON, record(MON, hours=4.0), half)
        self.assertEqual((day['expected'], day['target_met']), (4.0, True))

    def test_late_uses_the_office_clock(self):
        self.assertTrue(self.one({}, MON, record(MON, start='10:15'))['late'])
        self.assertFalse(self.one({}, MON, record(MON, start='09:30'))['late'])                        # exactly at the limit is on time

    def test_open_and_forgotten_sessions(self):
        today = datetime.date(2026, 9, 14)
        began = NOW - datetime.timedelta(hours=3)
        live = {'date': today.isoformat(), 'clock_in': began.isoformat(), 'clock_out': None, 'total_hours': 0, 'logs': [{'clock_in': began.isoformat(), 'clock_out': None}]}
        mine = days_for({}, today, today, [live])[0]
        self.assertTrue(mine['open'])
        self.assertAlmostEqual(mine['hours'], 3.0, places=1)
        self.assertIsNone(mine['target_met'])                                                          # not judged until the day is over
        forgot = self.one({}, MON, record(MON, hours=8, closed=False))
        self.assertTrue(forgot['missing_clock_out'])
        self.assertIsNone(forgot['target_met'])

    def test_summary_and_flags(self):
        records = [record(MON, hours=8), record(WED, start='10:00', hours=6), record(THU, start='10:00', hours=8), record(FRI, start='10:00', hours=8, closed=False)]
        days = days_for({}, MON, SAT, records)
        s = worktime.summarize(days)
        self.assertEqual((s['working_days'], s['present_days'], s['holidays']), (4, 4, 1))
        self.assertEqual((s['short_days'], s['late_days'], s['missing_clock_out_days']), (1, 3, 1))
        self.assertEqual(s['hours'], 22.0)
        self.assertEqual(s['expected_hours'], 32.0)
        self.assertEqual(s['hours_pct'], 69)
        flags = worktime.flags(s)
        self.assertTrue(any('short' in f for f in flags) and any('clock-out' in f for f in flags) and any('late 3' in f for f in flags))


class AttendanceOverviewApiTests(ApiTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        db['Settings'].delete_many({})

    def setUp(self):
        attendance.delete_many({})
        leaves.delete_many({})
        employees.update_many({}, {'$unset': {'expected_hours': ''}})
        self.bob = str(self.emp_emp)
        attendance.insert_many([dict(record(MON, hours=8), employee_id=self.bob), dict(record(WED, hours=5), employee_id=self.bob)])

    def test_month_view_for_yourself_and_privacy(self):
        mine = self.c.get('/api/attendance/month/?month=2026-09', **self.emp)
        self.assertEqual(mine.status_code, 200, mine.content)
        body = mine.json()
        self.assertEqual((body['label'], len(body['days']), body['expected_hours']), ('September 2026', 30, 8.0))
        self.assertEqual(body['summary']['present_days'], 2)
        self.assertEqual(body['summary']['short_days'], 1)
        self.assertEqual(self.c.get(f'/api/attendance/month/?month=2026-09&employee_id={self.admin_emp}', **self.emp).status_code, 403)   # not someone else's
        self.assertEqual(self.c.get(f'/api/attendance/month/?month=2026-09&employee_id={self.bob}', **self.admin).status_code, 200)
        self.assertEqual(self.c.get('/api/attendance/month/?month=nope', **self.emp).status_code, 400)

    def test_overview_is_for_hr_and_managers_only(self):
        self.assertEqual(self.c.get('/api/attendance/overview/', **self.emp).status_code, 403)
        everyone = self.c.get('/api/attendance/overview/?from=2026-09-07&to=2026-09-11', **self.admin)
        self.assertEqual(everyone.status_code, 200, everyone.content)
        rows = {r['employee_code']: r for r in everyone.json()['rows']}
        self.assertTrue({'EMP-A', 'EMP-B', 'EMP-C'} <= set(rows))
        bob = rows['EMP-B']
        self.assertEqual((bob['present_days'], bob['short_days'], bob['hours']), (2, 1, 13.0))
        self.assertEqual(bob['status'], 'Needs attention')
        self.assertTrue(bob['flags'])
        self.assertEqual(self.c.get('/api/attendance/overview/?from=2026-09-11&to=2026-09-07', **self.admin).status_code, 400)
        self.assertEqual(self.c.get('/api/attendance/overview/?from=2026-01-01&to=2026-12-31', **self.admin).status_code, 400)

    def test_single_day_overview_gives_a_status_per_person(self):
        rows = {r['employee_code']: r for r in self.c.get('/api/attendance/overview/?from=2026-09-09&to=2026-09-09', **self.admin).json()['rows']}
        self.assertEqual(rows['EMP-B']['status'], 'Short on hours')
        self.assertEqual(rows['EMP-A']['status'], 'Absent')

    def test_hr_sets_hours_per_person_and_it_changes_the_verdict(self):
        url = f'/api/attendance/expected-hours/{self.bob}/'
        self.assertEqual(self.put(url, {'hours': 5}, **self.emp).status_code, 403)                     # employees cannot lower their own target
        for bad in (0, 17, 'lots'):
            self.assertEqual(self.put(url, {'hours': bad}, **self.admin).status_code, 400)
        self.assertEqual(self.put(url, {'hours': 5}, **self.admin).json()['expected_hours'], 5.0)
        row = next(r for r in self.c.get('/api/attendance/overview/?from=2026-09-09&to=2026-09-09', **self.admin).json()['rows'] if r['employee_code'] == 'EMP-B')
        self.assertEqual((row['status'], row['expected_per_day'], row['custom_hours']), ('Present', 5.0, True))
        self.assertIsNone(self.put(url, {'hours': None}, **self.admin).json()['expected_hours'])
        self.assertIsNone(employees.find_one({'_id': self.emp_emp}).get('expected_hours'))

    def test_company_hours_and_late_time_are_settings(self):
        self.assertEqual(self.put('/api/settings/', {'general': {'workHoursPerDay': 6}}, **self.admin).status_code, 200)
        body = self.c.get('/api/attendance/month/?month=2026-09', **self.emp).json()
        self.assertEqual(body['expected_hours'], 6.0)
        self.assertEqual(body['summary']['short_days'], 1)                                              # 5h against 6h is still an hour short
        for bad in ({'workHoursPerDay': 0}, {'workHoursPerDay': 30}, {'lateAfter': '9.30'}, {'lateAfter': '25:00'}):
            self.assertEqual(self.put('/api/settings/', {'general': bad}, **self.admin).status_code, 400, bad)
        self.assertEqual(self.put('/api/settings/', {'general': {'lateAfter': '10:00', 'workHoursPerDay': 8}}, **self.admin).status_code, 200)
        db['Settings'].delete_many({})
