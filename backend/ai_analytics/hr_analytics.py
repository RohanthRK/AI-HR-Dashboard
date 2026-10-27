"""
HR analytics report for the Analytics page (HR / administrators): everything an HR head looks at, computed live from the
database. Sections: workforce, hiring, attendance and leave, performance and learning, pay and cost, engagement and risk.
Each section also carries a few plain-language findings so the numbers are easy to act on.
"""
import datetime
import statistics
from collections import Counter, defaultdict

from hr_backend.db import db
from payroll import engine
from utils.workdays import holiday_map, workdays

from .insights import Context, attendance_hours, attrition_12m, parse_dt, to_float, skill_list, survey_score_history, tenure_years

MONTHS = 12
MIN_GROUP = 3                 # never show an average for fewer than this many people (privacy and sense)
RISK_ORDER = {'High': 0, 'Medium': 1, 'Low': 2}


def _pct(part, whole, digits=1):
    return round(part / whole * 100, digits) if whole else 0.0


def _avg(values, digits=1):
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values), digits) if values else None


def _month_start(date, back):
    index = date.year * 12 + date.month - 1 - back
    return datetime.date(index // 12, index % 12 + 1, 1)


def _month_end(first):
    return (datetime.date(first.year + (first.month == 12), first.month % 12 + 1, 1) - datetime.timedelta(days=1))


def _months(today, count=MONTHS):
    return [(_month_start(today, i), _month_end(_month_start(today, i))) for i in range(count - 1, -1, -1)]


def _label(first):
    return first.strftime('%b %Y')


def _date(value):
    d = parse_dt(value)
    return d.date() if d else None


def _buckets(values, edges, labels):
    counts = [0] * len(labels)
    for v in values:
        for i, edge in enumerate(edges):
            if v < edge:
                counts[i] += 1
                break
        else:
            counts[-1] += 1
    return [{'name': n, 'value': c} for n, c in zip(labels, counts)]


def _counter_rows(counter, limit=None):
    rows = [{'name': k or 'Not recorded', 'value': v} for k, v in counter.most_common(limit)]
    return rows


# --------------------------------------------------------------------------------------------- sections

def _workforce(ctx, today):
    active = ctx.active
    employees = ctx.employees
    year_ago = today - datetime.timedelta(days=365)
    month_first = today.replace(day=1)

    def on_roll(e, day):
        hired, left = _date(e.get('hire_date')), _date(e.get('termination_date'))
        return bool(hired) and hired <= day and not (left and left <= day)

    trend = []
    for first, last in _months(today):
        trend.append({'month': _label(first), 'headcount': sum(1 for e in employees if on_roll(e, last)),
                      'joined': sum(1 for e in employees if _date(e.get('hire_date')) and first <= _date(e.get('hire_date')) <= last),
                      'left': sum(1 for e in employees if _date(e.get('termination_date')) and first <= _date(e.get('termination_date')) <= last)})
    joined_12 = sum(t['joined'] for t in trend)
    attrition, left_12 = attrition_12m(employees, today)

    dept = Counter(ctx.dept(e) for e in active)
    gender = Counter((e.get('gender') or 'Not recorded') for e in active)
    ages = [(today - _date(e['date_of_birth'])).days / 365.25 for e in active if _date(e.get('date_of_birth'))]
    tenures = [t for t in (tenure_years(e, ctx.now) for e in active) if t is not None]
    managers = Counter(str(e.get('manager_id')) for e in active if e.get('manager_id'))
    leaver_tenures = [t for t in (tenure_years(e, ctx.now) for e in employees if _date(e.get('termination_date')) and _date(e.get('termination_date')) >= year_ago) if t is not None]
    by_dept_left = Counter(ctx.dept(e) for e in employees if _date(e.get('termination_date')) and _date(e.get('termination_date')) >= year_ago)
    attrition_by_dept = [{'name': d, 'value': _pct(by_dept_left.get(d, 0), dept.get(d, 0) + by_dept_left.get(d, 0))} for d in sorted(set(dept) | set(by_dept_left))]

    women = gender.get('Female', 0)
    insights = [
        f"{len(active)} people are active; {joined_12} joined and {left_12} left in the last 12 months, so headcount changed by {joined_12 - left_12:+d}.",
        f"Attrition over 12 months is {attrition}% (leavers ÷ average headcount)." + (" This is above the 12-15% range usually seen as healthy." if attrition > 15 else ""),
    ]
    if attrition_by_dept:
        worst = max(attrition_by_dept, key=lambda x: x['value'])
        if worst['value'] > 0:
            insights.append(f"{worst['name']} has the highest attrition ({worst['value']}%).")
    if gender and len(active):
        insights.append(f"Women are {_pct(women, len(active), 0):g}% of the workforce.")
    if tenures:
        insights.append(f"Average tenure is {round(sum(tenures) / len(tenures), 1)} years; {sum(1 for t in tenures if t < 1)} people have been here under a year.")
    return {
        'active': len(active), 'joined_12m': joined_12, 'left_12m': left_12, 'attrition_pct': attrition,
        'joined_this_month': sum(1 for e in employees if _date(e.get('hire_date')) and _date(e.get('hire_date')) >= month_first),
        'avg_tenure_years': _avg(tenures), 'avg_age': _avg(ages, 0), 'avg_span': _avg(list(managers.values())),
        'avg_tenure_at_exit': _avg(leaver_tenures),
        'trend': trend, 'by_department': _counter_rows(dept), 'by_gender': _counter_rows(gender),
        'by_type': _counter_rows(Counter(e.get('employment_type') or 'Not recorded' for e in active)),
        'by_location': _counter_rows(Counter(e.get('location') or 'Not recorded' for e in active), 8),
        'tenure_bands': _buckets(tenures, [1, 3, 5, 10], ['Under 1 yr', '1-3 yrs', '3-5 yrs', '5-10 yrs', '10+ yrs']),
        'age_bands': _buckets(ages, [25, 30, 35, 45, 55], ['Under 25', '25-29', '30-34', '35-44', '45-54', '55+']) if ages else [],
        'attrition_by_department': attrition_by_dept, 'insights': insights,
    }


def _hiring(ctx):
    jobs = list(db['jobs'].find())
    cands = list(db['candidates'].find())
    open_jobs = [j for j in jobs if str(j.get('status', 'Open')).lower() == 'open']
    stages = ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected']
    stage_counts = Counter((c.get('stage') or 'Applied') for c in cands)
    hired_days = []
    for c in cands:
        if c.get('stage') == 'Hired' and parse_dt(c.get('appliedAt')) and parse_dt(c.get('updatedAt')):
            hired_days.append((parse_dt(c['updatedAt']) - parse_dt(c['appliedAt'])).days)
    per_job = []
    for j in jobs:
        mine = [c for c in cands if c.get('job_id') == str(j['_id'])]
        per_job.append({'title': j.get('title', ''), 'department': j.get('department', ''), 'status': j.get('status', 'Open'),
                        'candidates': len(mine), 'in_process': sum(1 for c in mine if c.get('stage') not in ('Hired', 'Rejected')),
                        'hired': sum(1 for c in mine if c.get('stage') == 'Hired'), 'openings': j.get('openings') or 1})
    per_job.sort(key=lambda r: (r['status'] != 'Open', -r['candidates']))
    active_pipeline = sum(1 for c in cands if c.get('stage') not in ('Hired', 'Rejected'))
    insights = [f"{len(open_jobs)} opening(s) are open with {active_pipeline} candidate(s) in process."]
    if stage_counts.get('Offered'):
        insights.append(f"{stage_counts['Offered']} offer(s) are out and waiting for an answer.")
    sources = Counter((c.get('source') or 'Not recorded') for c in cands)
    if len(cands) >= 5 and sources:
        top = sources.most_common(1)[0]
        insights.append(f"{top[0]} brings the most candidates ({top[1]} of {len(cands)}).")
    if hired_days:
        insights.append(f"Hired candidates took {round(sum(hired_days) / len(hired_days))} days on average from application to hire.")
    return {'open_jobs': len(open_jobs), 'candidates': len(cands), 'in_process': active_pipeline, 'offers': stage_counts.get('Offered', 0),
            'hired': stage_counts.get('Hired', 0), 'avg_days_to_hire': round(sum(hired_days) / len(hired_days)) if hired_days else None,
            'funnel': [{'name': s, 'value': stage_counts.get(s, 0)} for s in stages], 'by_source': _counter_rows(sources),
            'jobs': per_job, 'insights': insights}


def _attendance(ctx, today):
    holidays = holiday_map()
    active = ctx.active
    present_by_week = defaultdict(set)
    hours_all = []
    modes = Counter()
    present_30 = set()
    cutoff_30 = (today - datetime.timedelta(days=30)).isoformat()
    for rec in ctx.attendance:
        d = _date(rec.get('date'))
        if not d:
            continue
        present_by_week[d - datetime.timedelta(days=d.weekday())].add((str(rec.get('employee_id')), d))
        h = attendance_hours(rec)
        if h and h > 0.5 and rec.get('date', '') >= cutoff_30:
            hours_all.append(h)
        if rec.get('date', '') >= cutoff_30:
            modes[(rec.get('work_mode') or 'office').title()] += 1
            present_30.add((str(rec.get('employee_id')), rec['date']))
    approved = [l for l in ctx.leaves if l.get('status') == 'Approved']

    def leave_person_days(start, end):
        window = set(workdays(start, end, holidays))
        total = 0
        for l in approved:
            a, b = _date(l.get('start_date')), _date(l.get('end_date'))
            if not a or not b:
                continue
            day = max(a, start)
            while day <= min(b, end):
                if day in window:
                    total += 1
                day += datetime.timedelta(days=1)
        return total

    weekly = []
    this_monday = today - datetime.timedelta(days=today.weekday())
    for i in range(11, -1, -1):
        monday = this_monday - datetime.timedelta(weeks=i)
        end = min(monday + datetime.timedelta(days=4), today)
        expected = len(workdays(monday, end, holidays)) * len(active)
        on_leave = leave_person_days(monday, end)
        present = len(present_by_week.get(monday, set()))
        weekly.append({'week': monday.strftime('%d %b'), 'rate': _pct(present, max(expected - on_leave, 1)) if expected else None, 'present': present, 'on_leave': on_leave})
    recent = [w['rate'] for w in weekly[-4:] if w['rate'] is not None]

    # leave this financial year (April-March)
    fy_start = datetime.date(today.year if today.month >= 4 else today.year - 1, 4, 1)
    by_type, by_dept_days = Counter(), Counter()
    for l in approved:
        a = _date(l.get('start_date'))
        if a and a >= fy_start:
            days = to_float(l.get('days'), 0) or 0
            by_type[l.get('leave_type') or 'Other'] += days
            emp = ctx.employee_for(l.get('employee_id'))
            if emp:
                by_dept_days[ctx.dept(emp)] += days
    dept_heads = Counter(ctx.dept(e) for e in active)
    pending = sum(1 for l in ctx.leaves if l.get('status') == 'Pending')
    lop_by_person = Counter()
    for l in approved:
        if l.get('leave_type') == 'LOP Leaves' and (_date(l.get('start_date')) or datetime.date.min) >= fy_start:
            lop_by_person[l.get('employee_id')] += to_float(l.get('days'), 0) or 0
    insights = []
    if recent:
        insights.append(f"Attendance over the last four weeks averaged {round(sum(recent) / len(recent))}% of people expected at work (leave and holidays excluded).")
    if hours_all:
        insights.append(f"People work {round(sum(hours_all) / len(hours_all), 1)} hours on days they are in; {sum(1 for h in hours_all if h > 10)} long days (over 10 h) in the last 30 days.")
    if by_type:
        top = by_type.most_common(1)[0]
        insights.append(f"{round(sum(by_type.values()))} leave days taken this financial year; {top[0]} is the most used ({round(top[1])} days).")
    if pending:
        insights.append(f"{pending} leave request(s) are waiting for approval.")
    return {
        'rate_4w': round(sum(recent) / len(recent), 1) if recent else None, 'avg_hours': _avg(hours_all), 'pending_leaves': pending,
        'leave_days_fy': round(sum(by_type.values()), 1), 'weekly': weekly, 'modes': _counter_rows(modes),
        'leave_by_type': [{'name': k, 'value': round(v, 1)} for k, v in by_type.most_common()],
        'leave_per_head_by_department': [{'name': d, 'value': round(by_dept_days.get(d, 0) / n, 1)} for d, n in sorted(dept_heads.items())],
        'lop_days_fy': round(sum(lop_by_person.values()), 1), 'insights': insights,
    }


def _performance(ctx):
    active = ctx.active
    scores = {str(e['_id']): ctx.performance(e) for e in active}
    rated = [s for s in scores.values() if s is not None]
    dist = _buckets([round(s) for s in rated], [2, 3, 4, 5], ['1 or below', '2', '3', '4', '5'])
    by_dept = defaultdict(list)
    for e in active:
        if scores[str(e['_id'])] is not None:
            by_dept[ctx.dept(e)].append(scores[str(e['_id'])])
    dept_scores = [{'name': d, 'value': _avg(v, 2)} for d, v in sorted(by_dept.items()) if len(v) >= MIN_GROUP]
    okr = defaultdict(list)
    for o in ctx.objectives:
        emp = ctx.employee_for(o.get('employee_id'))
        p = to_float(o.get('progress'))
        if emp and p is not None and o.get('level', 'individual') == 'individual':
            okr[ctx.dept(emp)].append(p)
    okr_rows = [{'name': d, 'value': round(sum(v) / len(v))} for d, v in sorted(okr.items()) if len(v) >= MIN_GROUP]
    open_pips = [p for p in ctx.pips if str(p.get('status', '')).lower() not in ('completed', 'closed')]

    assignments = list(db['TrainingAssignments'].find())
    done = sum(1 for a in assignments if a.get('status') == 'Completed')
    today_s = ctx.now.strftime('%Y-%m-%d')
    overdue = sum(1 for a in assignments if a.get('status') != 'Completed' and a.get('due_date') and a['due_date'] < today_s)
    by_course = defaultdict(lambda: [0, 0])
    for a in assignments:
        row = by_course[a.get('course_title', '')]
        row[0] += 1
        row[1] += a.get('status') == 'Completed'
    course_rows = [{'name': c, 'value': _pct(d, n, 0), 'assigned': n, 'completed': d} for c, (n, d) in sorted(by_course.items(), key=lambda kv: -kv[1][0])][:8]
    skill_counts = Counter(s.lower() for e in active for s in set(skill_list(e)))
    top_skills = [{'name': k.title() if k.islower() else k, 'value': v} for k, v in skill_counts.most_common(10)]
    insights = []
    if rated:
        insights.append(f"The average rating is {round(sum(rated) / len(rated), 2)} out of 5; {sum(1 for s in rated if s >= 4)} people are rated 4 or higher and {sum(1 for s in rated if s < 3)} below 3.")
    if open_pips:
        insights.append(f"{len(open_pips)} performance improvement plan(s) are open.")
    if assignments:
        insights.append(f"Training completion is {_pct(done, len(assignments), 0):g}% ({done} of {len(assignments)}); {overdue} assignment(s) are overdue.")
    return {'avg_rating': _avg(rated, 2), 'rated_people': len(rated), 'open_pips': len(open_pips), 'training_completion_pct': _pct(done, len(assignments), 0),
            'training_overdue': overdue, 'distribution': dist, 'by_department': dept_scores, 'okr_by_department': okr_rows,
            'training_by_course': course_rows, 'top_skills': top_skills, 'insights': insights}


def _pay(ctx, today):
    slips = [p for p in ctx.payroll if p.get('status') != 'Draft']
    by_period = defaultdict(lambda: {'gross': 0, 'net': 0, 'employer': 0, 'tds': 0, 'pf': 0, 'people': 0, 'date': ''})
    for p in slips:
        row = by_period[p.get('period', '')]
        row['gross'] += p.get('gross_salary', 0) or 0
        row['net'] += p.get('net_salary', 0) or 0
        row['employer'] += (p.get('gross_salary', 0) or 0) + (p.get('employer_pf', 0) or 0) + (p.get('employer_esi', 0) or 0)
        row['tds'] += p.get('tax', 0) or 0
        row['pf'] += (p.get('provident_fund', 0) or 0) + (p.get('employer_pf', 0) or 0)
        row['people'] += 1
        row['date'] = max(row['date'], p.get('date', ''))
    trend = [{'month': period, **{k: v for k, v in row.items() if k != 'date'}} for period, row in sorted(by_period.items(), key=lambda kv: kv[1]['date'])][-MONTHS:]
    latest = trend[-1] if trend else None
    latest_period = latest['month'] if latest else None
    dept_cost = Counter()
    for p in slips:
        if p.get('period') == latest_period:
            emp = ctx.employee_for(p.get('employee_id'))
            dept_cost[ctx.dept(emp) if emp else 'Unassigned'] += p.get('gross_salary', 0) or 0
    ctcs = [(e, to_float(e.get('salary'))) for e in ctx.active]
    ctcs = [(e, s) for e, s in ctcs if s]
    by_dept = defaultdict(list)
    for e, s in ctcs:
        by_dept[ctx.dept(e)].append(s)
    avg_dept = [{'name': d, 'value': round(sum(v) / len(v))} for d, v in sorted(by_dept.items()) if len(v) >= MIN_GROUP]
    bands = _buckets([s for _, s in ctcs], [600000, 1200000, 2400000, 4800000], ['Under ₹6 L', '₹6-12 L', '₹12-24 L', '₹24-48 L', '₹48 L+'])
    by_gender = defaultdict(list)
    for e, s in ctcs:
        by_gender[e.get('gender') or 'Not recorded'].append(s)
    gender_pay = [{'name': g, 'value': round(sum(v) / len(v)), 'people': len(v)} for g, v in by_gender.items() if len(v) >= MIN_GROUP and g != 'Not recorded']
    pay_ratio = None
    if {'Female', 'Male'} <= {g['name'] for g in gender_pay}:
        f = next(g['value'] for g in gender_pay if g['name'] == 'Female')
        m = next(g['value'] for g in gender_pay if g['name'] == 'Male')
        pay_ratio = round(f / m * 100)
    revisions = 0
    year_ago = (today - datetime.timedelta(days=365)).isoformat()
    for e in ctx.employees:
        revisions += sum(1 for h in e.get('salary_history', []) if str(h.get('effective_from', '')) >= year_ago)
    total_ctc = sum(s for _, s in ctcs)
    missing_salary = sum(1 for e in ctx.active if not to_float(e.get('salary')))
    insights = []
    if ctcs:
        insights.append(f"The annual CTC bill is {engine.inr(total_ctc, '₹')} across {len(ctcs)} people; the median CTC is {engine.inr(statistics.median(s for _, s in ctcs), '₹')}.")
    if latest:
        insights.append(f"{latest['month']}: payroll cost the company {engine.inr(latest['employer'], '₹')} ({latest['people']} payslips) and {engine.inr(latest['net'], '₹')} reached employees' banks.")
    if len(trend) >= 2 and trend[-2]['employer']:
        change = round((trend[-1]['employer'] - trend[-2]['employer']) / trend[-2]['employer'] * 100, 1)
        insights.append(f"Monthly payroll cost moved {change:+g}% against the previous month." if abs(change) >= 0.1 else "Monthly payroll cost is unchanged from the previous month.")
    if pay_ratio:
        insights.append(f"On average women earn {pay_ratio}% of what men earn here; look at levels and roles before drawing conclusions.")
    if missing_salary:
        insights.append(f"{missing_salary} active employee(s) have no salary recorded, so they cannot be paid.")
    return {'annual_ctc': round(total_ctc), 'median_ctc': round(statistics.median(s for _, s in ctcs)) if ctcs else None,
            'latest_month': latest, 'trend': trend, 'cost_by_department': [{'name': d, 'value': round(v)} for d, v in dept_cost.most_common()],
            'avg_ctc_by_department': avg_dept, 'ctc_bands': bands, 'gender_pay': gender_pay, 'gender_pay_ratio': pay_ratio,
            'revisions_12m': revisions, 'missing_salary': missing_salary, 'insights': insights}


def _engagement(ctx, today):
    risk = []
    for e in ctx.active:
        score, level, reasons = ctx.attrition(e)
        risk.append({'name': f"{e.get('first_name', '')} {e.get('last_name', '')}".strip(), 'department': ctx.dept(e), 'level': level,
                     'score': score, 'reasons': reasons[:3]})
    risk.sort(key=lambda r: (RISK_ORDER[r['level']], -r['score']))
    risk_counts = Counter(r['level'] for r in risk)
    exits = list(db['Offboarding'].find({'status': {'$in': ['Approved', 'Completed']}}))
    reasons = Counter(x.get('reason_category') or 'Other' for x in exits)
    tickets = ctx.tickets
    open_tickets = [t for t in tickets if str(t.get('status', '')).lower() not in ('resolved', 'closed')]
    by_cat = Counter(t.get('category') or 'Other' for t in tickets)
    survey = survey_score_history()
    since = (today - datetime.timedelta(days=180)).isoformat()
    recog = Counter()
    for r in db['Recognitions'].find({'created_at': {'$gte': since}}):
        recog[str(r.get('created_at', ''))[:7]] += 1
    recognition = [{'month': datetime.date.fromisoformat(k + '-01').strftime('%b %Y'), 'value': v} for k, v in sorted(recog.items())]
    spend = defaultdict(float)
    spend_cat = Counter()
    for x in ctx.expenses:
        if x.get('status') in ('Approved', 'Reimbursed', 'Paid'):
            spend_cat[x.get('category') or 'Other'] += to_float(x.get('amount'), 0) or 0
            spend[str(x.get('date') or x.get('created_at') or '')[:7]] += to_float(x.get('amount'), 0) or 0
    insights = []
    if risk:
        insights.append(f"{risk_counts.get('High', 0)} people are at high risk of leaving and {risk_counts.get('Medium', 0)} at medium risk. The score uses tenure, ratings, workload, leave and pay against peers.")
    if reasons:
        top = reasons.most_common(1)[0]
        insights.append(f"The most common reason for leaving is {top[0].lower()} ({top[1]} of {len(exits)}).")
    if survey:
        insights.append(f"The latest engagement survey scored {survey[-1]['score10']}/10 with {survey[-1]['responses']} responses.")
    if open_tickets:
        insights.append(f"{len(open_tickets)} helpdesk ticket(s) are still open.")
    return {
        'risk_counts': {k: risk_counts.get(k, 0) for k in ('High', 'Medium', 'Low')}, 'at_risk': [r for r in risk if r['level'] != 'Low'][:10],
        'exit_reasons': _counter_rows(reasons), 'survey_history': survey, 'open_tickets': len(open_tickets), 'tickets_by_category': _counter_rows(by_cat),
        'recognition_by_month': recognition, 'expense_by_category': [{'name': k, 'value': round(v)} for k, v in spend_cat.most_common(8)],
        'expense_total': round(sum(spend_cat.values())), 'insights': insights, 'model': ctx.model_info(),
    }


def build():
    ctx = Context(attendance_days=100)
    today = ctx.now.date()
    sections = {
        'workforce': _workforce(ctx, today), 'hiring': _hiring(ctx), 'attendance': _attendance(ctx, today),
        'performance': _performance(ctx), 'pay': _pay(ctx, today), 'engagement': _engagement(ctx, today),
    }
    return {'generated_at': ctx.now.isoformat(), **sections}
