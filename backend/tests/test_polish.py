"""Endpoints added while polishing the UI: team attendance, leave entitlements, names on records, analytics detail."""
import datetime

from hr_backend.db import db, employees
from tests.test_api import ApiTestCase


def weekday_ago(n):
    """The n-th most recent weekday before today (ISO string)."""
    day = datetime.datetime.now(tz=datetime.timezone.utc).date()
    while n:
        day -= datetime.timedelta(days=1)
        if day.weekday() < 5:
            n -= 1
    return day.isoformat()


class TeamAttendanceTests(ApiTestCase):
    def test_statuses_for_a_past_day(self):
        day = weekday_ago(2)
        db['Attendance'].delete_many({})
        db['Leaves'].delete_many({})
        db['Attendance'].insert_one({'employee_id': str(self.admin_emp), 'date': day, 'clock_in': f'{day}T16:00:00+00:00',
                                     'clock_out': f'{day}T23:30:00+00:00', 'total_hours': 7.5, 'work_mode': 'office'})
        db['Leaves'].insert_one({'employee_id': 'EMP-B', 'status': 'Approved', 'leave_type': 'Sick Leaves', 'start_date': day, 'end_date': day, 'days': 1})
        rows = {r['name']: r for r in self.c.get(f'/api/attendance/team/?date={day}', **self.admin).json()['rows']}
        self.assertEqual(rows['Ada Admin']['status'], 'Present')
        self.assertIn('late', rows['Ada Admin'])
        self.assertEqual(rows['Bob Worker']['status'], 'On leave')
        self.assertEqual(rows['Bob Worker']['leave_type'], 'Sick Leaves')
        self.assertEqual(rows['Cy Other']['status'], 'Absent')

    def test_employees_cannot_see_it_and_weekends_are_empty(self):
        self.assertEqual(self.c.get('/api/attendance/team/', **self.emp).status_code, 403)
        day = datetime.date(2026, 10, 24)          # a Saturday
        body = self.c.get(f'/api/attendance/team/?date={day}', **self.admin).json()
        self.assertTrue(body['non_working_day'])
        self.assertEqual(body['rows'], [])
        self.assertEqual(self.c.get('/api/attendance/team/?date=nonsense', **self.admin).status_code, 400)


class LeaveEntitlementTests(ApiTestCase):
    def test_balance_has_sick_and_unlimited_unpaid(self):
        db['Leaves'].delete_many({})
        db['Leaves'].insert_one({'employee_id': 'EMP-B', 'status': 'Approved', 'leave_type': 'Sick Leaves', 'days': 2,
                                 'start_date': f'{datetime.date.today().year}-01-12', 'end_date': f'{datetime.date.today().year}-01-13'})
        bal = self.c.get(f'/api/leaves/balance/{self.emp_emp}/', **self.emp).json()
        self.assertEqual(bal['entitlements'], {'Earned Leaves': 18, 'Sick Leaves': 10, 'LOP Leaves': None})
        self.assertEqual(bal['remaining']['Sick Leaves'], 8)
        self.assertIsNone(bal['remaining']['LOP Leaves'])
        types = [t['id'] for t in self.c.get('/api/leaves/types/', **self.emp).json()['leave_types']]
        self.assertIn('Sick Leaves', types)


class RecordNameTests(ApiTestCase):
    def test_expenses_and_tickets_carry_names(self):
        db['expenses'].delete_many({})
        db['helpdesk_tickets'].delete_many({})
        db['expenses'].insert_one({'employee_id': str(self.emp_emp), 'amount': 10, 'description': 'Taxi', 'status': 'Pending', 'submittedAt': '2026-10-01'})
        db['helpdesk_tickets'].insert_one({'employee_id': str(self.emp_emp), 'title': 'VPN down', 'status': 'Open', 'createdAt': '2026-10-01'})
        expense = self.c.get('/api/expenses/', **self.admin).json()['expenses'][0]
        self.assertEqual((expense['title'], expense['employee_name']), ('Taxi', 'Bob Worker'))
        ticket = self.c.get('/api/helpdesk/', **self.admin).json()['tickets'][0]
        self.assertEqual((ticket['subject'], ticket['employee_name']), ('VPN down', 'Bob Worker'))

    def test_assets_show_holder_name_for_both_assignment_formats(self):
        db['assets'].delete_many({})
        db['assets'].insert_many([{'name': 'Laptop', 'assignedTo': 'EMP-B', 'status': 'Assigned'},
                                  {'name': 'Phone', 'assignedTo': 'Bob Worker (EMP-B)', 'status': 'Assigned'}])
        assets = self.c.get('/api/assets/', **self.admin).json()['assets']
        self.assertEqual({a['assignedToName'] for a in assets}, {'Bob Worker'})
        mine = self.c.get('/api/assets/', **self.emp).json()['assets']          # the employee sees both
        self.assertEqual(len(mine), 2)


class AnalyticsDetailTests(ApiTestCase):
    def test_offboarding_analytics_by_department_and_rate(self):
        db['Offboarding'].delete_many({})
        db['Offboarding'].insert_one({'employee_id': str(self.other_emp), 'department_id': str(self.dept), 'status': 'Completed',
                                      'reason_category': 'Compensation', 'last_working_day': datetime.date.today().isoformat(),
                                      'requested_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()})
        # a completed exit also ends the employment (that is what 'Complete exit' does), and the rate counts those leavers
        employees.update_one({'_id': self.other_emp}, {'$set': {'hire_date': '2025-01-01', 'employment_status': 'Terminated',
                                                                 'termination_date': datetime.date.today().isoformat()}})
        body = self.c.get('/api/offboarding/analytics/', **self.admin).json()
        employees.update_one({'_id': self.other_emp}, {'$set': {'employment_status': 'Active', 'termination_date': ''}})
        eng = next(d for d in body['by_department'] if d['department'] == 'Engineering' or d['exits'])
        self.assertEqual(eng['exits'], 1)
        self.assertEqual(body['exits_12m'], 1)
        self.assertGreater(body['turnover_rate_12m'], 0)
        analytics = self.c.get('/api/ai/hr-analytics/', **self.admin).json()['workforce']
        self.assertEqual(analytics['left_12m'], 0)                                   # restored: both pages read the same employee records

    def test_attrition_and_engagement_have_the_detail_the_page_needs(self):
        attr = self.c.get('/api/ai/attrition-risk/', **self.admin).json()
        self.assertEqual([b['range'] for b in attr['risk_by_tenure']][:4], ['Under 1 year', '1-3 years', '3-5 years', '5+ years'])
        self.assertEqual(sum(b['high_risk'] + b['medium_risk'] + b['low_risk'] for b in attr['risk_by_tenure']),
                         attr['high_risk_count'] + attr['medium_risk_count'] + attr['low_risk_count'])
        eng = self.c.get('/api/ai/engagement/', **self.admin).json()
        self.assertIn('history', eng)

    def test_headcount_trend_drops_after_a_departure(self):
        employees.update_one({'_id': self.other_emp}, {'$set': {'hire_date': '2025-01-01', 'employment_status': 'Terminated',
                                                                 'termination_date': '2026-03-31'}})
        trend = self.c.get('/api/ai/hr-analytics/', **self.admin).json()['workforce']['trend']
        by_month = {g['month']: g['headcount'] for g in trend}
        self.assertEqual(len(by_month), 12)
        self.assertEqual(sum(g['left'] for g in trend), 1)
        self.assertGreater(by_month['Feb 2026'], by_month['Apr 2026'])
        employees.update_one({'_id': self.other_emp}, {'$set': {'employment_status': 'Active', 'termination_date': ''}})

    def test_payroll_summary_includes_pay_items(self):
        employees.update_one({'_id': self.emp_emp}, {'$set': {'pay_items': [{'id': 'x', 'kind': 'deduction', 'name': 'Health insurance', 'amount': 85.0}]}})
        body = self.c.get('/api/payroll/summary/', **self.emp).json()['summary']
        self.assertEqual(body['pay_items'][0]['name'], 'Health insurance')
        employees.update_one({'_id': self.emp_emp}, {'$set': {'pay_items': []}})
