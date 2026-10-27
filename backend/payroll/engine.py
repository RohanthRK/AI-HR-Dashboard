"""
Indian payroll arithmetic (pure functions: no database access, so it is easy to test).

An employee's `salary` is the annual CTC (cost to company) in rupees. A monthly payslip is built like this:

  CTC / 12                      monthly cost to the company
  - employer PF (and ESI)       statutory employer contributions, part of the CTC
  = monthly gross               paid out as Basic + HRA + Special allowance
  x paid-days ratio             loss-of-pay days, joining and leaving mid-month reduce what is paid

  Deductions: employee PF, ESI (low salaries only), professional tax and TDS (income tax, new tax regime).

Everything is rounded to whole rupees, as on a printed Indian payslip.
"""
import calendar
import datetime

ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen',
        'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

# New tax regime, FY 2025-26: (upper limit of the slab, rate)
NEW_REGIME_SLABS = [(400000, 0.0), (800000, 0.05), (1200000, 0.10), (1600000, 0.15), (2000000, 0.20), (2400000, 0.25), (float('inf'), 0.30)]
STANDARD_DEDUCTION = 75000
REBATE_LIMIT = 1200000          # section 87A: no tax up to this taxable income
CESS = 0.04

DEFAULT_RATES = {
    'basicPct': 40.0,             # basic as a share of the monthly CTC
    'hraPct': 50.0,               # HRA as a share of basic
    'pfPct': 12.0,                # employee (and employer) provident fund, % of PF wage
    'pfWageCeiling': 15000,       # PF wage is basic, capped at this amount per month
    'esiThreshold': 21000,        # ESI applies when the monthly gross is at or below this
    'ptAmount': 200,              # professional tax per month ...
    'ptThreshold': 25000,         # ... for a monthly gross at or above this
    'tdsEnabled': True,
    'payOvertime': False,
    'overtimeMultiplier': 1.5,
}


def _words_below_hundred(n):
    return ONES[n] if n < 20 else TENS[n // 10] + (' ' + ONES[n % 10] if n % 10 else '')


def _words_below_thousand(n):
    out = ''
    if n >= 100:
        out = ONES[n // 100] + ' Hundred'
        n %= 100
        if n:
            out += ' '
    return out + (_words_below_hundred(n) if n else '')


def rupees_in_words(amount):
    """1,23,456 -> 'Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six Only' (Indian numbering)."""
    rupees = int(round(float(amount or 0)))
    if rupees <= 0:
        return 'Rupees Zero Only'
    parts = []
    for size, name in ((10_000_000, 'Crore'), (100_000, 'Lakh'), (1_000, 'Thousand')):
        if rupees >= size:
            parts.append(_words_below_hundred(rupees // size) + ' ' + name)
            rupees %= size
    if rupees:
        parts.append(_words_below_thousand(rupees))
    return 'Rupees ' + ' '.join(parts) + ' Only'


def inr(amount, symbol='Rs. '):
    """12345678.5 -> 'Rs. 1,23,45,678.50' (lakh/crore grouping; paise only when present)."""
    value = round(float(amount or 0), 2)
    sign = '-' if value < 0 else ''
    whole, _, paise = f'{abs(value):.2f}'.partition('.')
    head, tail = whole[:-3], whole[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    text = ','.join(groups + [tail]) if groups else tail
    return f"{sign}{symbol}{text}{'.' + paise if paise != '00' else ''}"


def annual_tax_new_regime(annual_gross):
    """Income tax for a year under the new regime (standard deduction, 87A rebate with marginal relief, 4% cess)."""
    taxable = max(float(annual_gross) - STANDARD_DEDUCTION, 0)
    tax, lower = 0.0, 0.0
    for upper, rate in NEW_REGIME_SLABS:
        if taxable > lower:
            tax += (min(taxable, upper) - lower) * rate
        lower = upper
    if taxable <= REBATE_LIMIT:
        tax = 0.0
    else:
        tax = min(tax, taxable - REBATE_LIMIT)       # marginal relief just above the rebate limit
    return round(tax * (1 + CESS))


def month_bounds(period):
    """'October 2026' -> (date(2026, 10, 1), date(2026, 10, 31))."""
    first = datetime.datetime.strptime(period, '%B %Y').date()
    return first, first.replace(day=calendar.monthrange(first.year, first.month)[1])


def structure(annual_ctc, rates=None):
    """The full-month salary structure for an annual CTC (before any loss of pay)."""
    r = {**DEFAULT_RATES, **(rates or {})}
    ctc_m = float(annual_ctc or 0) / 12
    basic = ctc_m * r['basicPct'] / 100
    employer_pf = r['pfPct'] / 100 * min(basic, r['pfWageCeiling'])
    gross = ctc_m - employer_pf
    employer_esi = 0.0
    if gross <= r['esiThreshold']:                    # ESI: employer pays 3.25% of gross on top of the gross
        gross = gross / 1.0325
        employer_esi = gross * 0.0325
        basic = min(basic, gross)
    hra = min(basic * r['hraPct'] / 100, gross - basic)
    special = max(gross - basic - hra, 0)
    return {'ctc_monthly': round(ctc_m), 'basic': round(basic), 'hra': round(hra), 'special_allowance': round(special),
            'gross': round(basic) + round(hra) + round(special), 'employer_pf': round(employer_pf), 'employer_esi': round(employer_esi),
            'esi_applies': employer_esi > 0}


def compute(annual_ctc, rates=None, paid_ratio=1.0, overtime_pay=0.0, earnings=(), deductions=()):
    """
    One month's payslip numbers. `earnings` / `deductions` are (name, amount) pairs for recurring pay items and one-off
    adjustments. Returns a dict with every component in whole rupees.
    """
    r = {**DEFAULT_RATES, **(rates or {})}
    s = structure(annual_ctc, r)
    ratio = max(min(float(paid_ratio), 1.0), 0.0)
    basic, hra, special = round(s['basic'] * ratio), round(s['hra'] * ratio), round(s['special_allowance'] * ratio)
    fixed_gross = basic + hra + special
    extra_earnings = round(sum(a for _, a in earnings))
    overtime = round(overtime_pay)
    gross = fixed_gross + extra_earnings + overtime

    pf_wage = min(basic, r['pfWageCeiling'])
    pf = round(r['pfPct'] / 100 * pf_wage)
    esi = round(gross * 0.0075) if s['esi_applies'] else 0
    pt = r['ptAmount'] if gross >= r['ptThreshold'] else 0
    tds = round(annual_tax_new_regime(s['gross'] * 12) / 12) if r['tdsEnabled'] else 0
    other = round(sum(a for _, a in deductions))
    total_deductions = pf + esi + pt + tds + other
    return {
        **s, 'basic': basic, 'hra': hra, 'special_allowance': special, 'fixed_gross': fixed_gross,
        'earnings_total': gross, 'extra_earnings': extra_earnings, 'overtime_pay': overtime,
        'provident_fund': pf, 'esi': esi, 'professional_tax': pt, 'tax': tds, 'other_deductions': other,
        'total_deductions': total_deductions, 'net_salary': gross - total_deductions,
        'employer_pf': round(r['pfPct'] / 100 * pf_wage), 'employer_esi': round(gross * 0.0325) if s['esi_applies'] else 0,
    }
