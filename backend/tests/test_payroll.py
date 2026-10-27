"""Indian payroll: the salary maths, loss of pay, the pay-run workflow, adjustments, salary revisions and exports."""
import datetime
import json

from hr_backend.db import db, employees
from payroll import engine
from tests.test_api import ApiTestCase


class EngineTests(ApiTestCase):
    def test_monthly_structure_for_twelve_lakh(self):
        c = engine.compute(1200000)
        self.assertEqual((c['ctc_monthly'], c['basic'], c['hra'], c['special_allowance']), (100000, 40000, 20000, 38200))
        self.assertEqual(c['employer_pf'], 1800)                               # 12% of the Rs 15,000 PF wage ceiling
        self.assertEqual((c['provident_fund'], c['professional_tax'], c['tax']), (1800, 200, 0))   # under Rs 12 lakh taxable: rebate
        self.assertEqual(c['net_salary'], 98200 - 1800 - 200)
        self.assertEqual(c['earnings_total'] + c['employer_pf'], c['ctc_monthly'])        # CTC = gross + employer PF

    def test_new_regime_tax(self):
        self.assertEqual(engine.annual_tax_new_regime(1275000), 0)                # exactly at the rebate limit after the standard deduction
        self.assertEqual(engine.annual_tax_new_regime(2378400), 286884)
        self.assertEqual(engine.annual_tax_new_regime(1300000), 26000)         # marginal relief: only the income above Rs 12 lakh is taxed (plus cess)
        self.assertEqual(engine.annual_tax_new_regime(300000), 0)

    def test_esi_for_low_salaries_and_loss_of_pay(self):
        low = engine.compute(180000)
        self.assertGreater(low['esi'], 0)
        self.assertEqual(low['professional_tax'], 0)
        self.assertEqual(engine.compute(1200000)['esi'], 0)
        half = engine.compute(1200000, paid_ratio=0.5)
        self.assertEqual(half['basic'], 20000)
        self.assertLess(half['net_salary'], engine.compute(1200000)['net_salary'])

    def test_amount_formats(self):
        self.assertEqual(engine.inr(1234567.5), 'Rs. 12,34,567.50')
        self.assertEqual(engine.inr(100000), 'Rs. 1,00,000')
        self.assertEqual(engine.inr(-4500, '₹'), '-₹4,500')
        self.assertEqual(engine.rupees_in_words(1234567), 'Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Only')
        self.assertEqual(engine.rupees_in_words(0), 'Rupees Zero Only')


class PayRunTests(ApiTestCase):
    def setUp(self):
        db['Payroll'].delete_many({})
        db['PayrollAdjustments'].delete_many({})
        db['Leaves'].delete_many({})

    def test_run_summary_and_checks(self):
        self.post('/api/payroll/generate/', {'period': 'July 2026'}, **self.admin)
        run = self.c.get('/api/payroll/run/?period=July%202026', **self.admin).json()
        self.assertEqual((run['status'], run['totals']['employees']), ('Draft', 2))
        self.assertEqual(run['totals']['net'], sum(s['net_salary'] for s in db['Payroll'].find({'period': 'July 2026'})))
        titles = {c['title'] for c in run['checks']}
        self.assertIn('Bank details missing', titles)
        self.assertIn('No salary recorded', titles)             # Cy has no CTC
        self.assertEqual(self.c.get('/api/payroll/run/', **self.emp).status_code, 403)
        self.assertEqual(self.c.get('/api/payroll/run/?period=nonsense', **self.admin).status_code, 400)

    def test_joiners_get_a_prorated_first_month(self):
        employees.update_one({'_id': self.emp_emp}, {'$set': {'hire_date': '2026-07-16'}})
        try:
            self.post('/api/payroll/generate/', {'period': 'July 2026'}, **self.admin)
            slip = db['Payroll'].find_one({'employee_code': 'EMP-B', 'period': 'July 2026'})
            self.assertLess(slip['paid_days'], slip['working_days'])
            self.assertLess(slip['basic'], engine.compute(60000)['basic'])
            self.post('/api/payroll/generate/', {'period': 'June 2026'}, **self.admin)
            self.assertIsNone(db['Payroll'].find_one({'employee_code': 'EMP-B', 'period': 'June 2026'}))      # not yet employed
        finally:
            employees.update_one({'_id': self.emp_emp}, {'$set': {'hire_date': '2026-06-01'}})

    def test_loss_of_pay_reduces_the_days_paid(self):
        db['Leaves'].insert_one({'employee_id': 'EMP-B', 'leave_type': 'LOP Leaves', 'status': 'Approved', 'start_date': '2026-07-06', 'end_date': '2026-07-07', 'days': 2})
        db['Leaves'].insert_one({'employee_id': 'EMP-B', 'leave_type': 'Earned Leaves', 'status': 'Approved', 'start_date': '2026-07-20', 'end_date': '2026-07-21', 'days': 2})
        self.post('/api/payroll/generate/', {'period': 'July 2026'}, **self.admin)
        slip = db['Payroll'].find_one({'employee_code': 'EMP-B', 'period': 'July 2026'})
        self.assertEqual((slip['lop_days'], slip['paid_days']), (2, slip['working_days'] - 2))          # paid leave does not reduce pay

    def test_adjustments_recalculate_and_lock_after_payment(self):
        self.post('/api/payroll/generate/', {'period': 'July 2026'}, **self.admin)
        before = db['Payroll'].find_one({'employee_code': 'EMP-B', 'period': 'July 2026'})['net_salary']
        body = {'employee_id': str(self.emp_emp), 'period': 'July 2026', 'kind': 'earning', 'name': 'Diwali bonus', 'amount': 5000}
        self.assertEqual(self.post('/api/payroll/adjustments/', body, **self.emp).status_code, 403)
        self.assertEqual(self.post('/api/payroll/adjustments/', dict(body, amount=-1), **self.admin).status_code, 400)
        made = self.post('/api/payroll/adjustments/', body, **self.admin)
        self.assertEqual(made.status_code, 201)
        slip = db['Payroll'].find_one({'employee_code': 'EMP-B', 'period': 'July 2026'})
        with_bonus = engine.compute(60000, earnings=[('Diwali bonus', 5000)])['net_salary']
        self.assertEqual(slip['net_salary'], with_bonus)
        self.assertEqual(slip['adjustments'][0]['name'], 'Diwali bonus')
        self.post('/api/payroll/generate/', {'period': 'July 2026'}, **self.admin)                   # recalculation keeps it
        self.assertEqual(db['Payroll'].find_one({'employee_code': 'EMP-B', 'period': 'July 2026'})['net_salary'], with_bonus)
        self.c.delete(f"/api/payroll/adjustments/{made.json()['adjustment']['_id']}/", **self.admin)
        self.assertEqual(db['Payroll'].find_one({'employee_code': 'EMP-B', 'period': 'July 2026'})['net_salary'], before)
        self.post('/api/payroll/release/', {'period': 'July 2026', 'force': True}, **self.admin)
        self.post('/api/payroll/mark-paid/', {'period': 'July 2026'}, **self.admin)
        self.assertEqual(self.post('/api/payroll/adjustments/', body, **self.admin).status_code, 409)       # paid months are locked
        skipped = self.post('/api/payroll/generate/', {'period': 'July 2026'}, **self.admin).json()
        self.assertEqual(skipped['updated'], 0)

    def test_exports(self):
        employees.update_one({'_id': self.emp_emp}, {'$set': {'bank_details': {'account_holder': 'Bob Worker', 'bank_name': 'HDFC Bank', 'account_number': '123456789012', 'ifsc': 'HDFC0001234'}}})
        self.post('/api/payroll/generate/', {'period': 'July 2026'}, **self.admin)
        draft_bank = self.c.get('/api/payroll/export/?period=July%202026&kind=bank', **self.admin).content.decode()
        self.assertNotIn('HDFC0001234', draft_bank)                                                        # drafts are not paid yet
        self.post('/api/payroll/release/', {'period': 'July 2026', 'force': True}, **self.admin)
        bank = self.c.get('/api/payroll/export/?period=July%202026&kind=bank', **self.admin).content.decode()
        self.assertIn('HDFC0001234', bank)
        self.assertIn(str(engine.compute(60000)['net_salary']), bank)
        statutory = self.c.get('/api/payroll/export/?period=July%202026&kind=statutory', **self.admin).content.decode()
        self.assertIn('TOTAL', statutory)
        employees.update_one({'_id': self.emp_emp}, {'$unset': {'bank_details': ''}})

    def test_salary_revision_history(self):
        url = f'/api/payroll/salary/{self.emp_emp}/'
        self.assertEqual(self.post(url, {'annual_ctc': 900000}, **self.emp).status_code, 403)
        self.assertEqual(self.post(url, {'annual_ctc': 0}, **self.admin).status_code, 400)
        out = self.post(url, {'annual_ctc': 900000, 'effective_from': '2026-07-01', 'reason': 'Annual appraisal'}, **self.admin).json()
        self.assertEqual(out['annual_ctc'], 900000)
        self.assertEqual(out['history'][0]['previous_ctc'], 60000)
        self.assertEqual(out['monthly']['basic'], engine.structure(900000)['basic'])
        self.assertEqual(self.c.get(url, **self.emp).status_code, 200)                                     # own salary is visible to the employee
        self.assertEqual(self.c.get(f'/api/payroll/salary/{self.admin_emp}/', **self.emp).status_code, 403)
        employees.update_one({'_id': self.emp_emp}, {'$set': {'salary': 60000}, '$unset': {'salary_history': ''}})
