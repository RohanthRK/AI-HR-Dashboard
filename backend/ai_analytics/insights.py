"""
Data-driven HR analytics computed from the MongoDB collections.

These are transparent, rule-based heuristics (no trained model). Every score is
derived from real documents (Employees, Attendance, Leaves, Reviews, Objectives,
pips, Departments, Payroll, ...). Where there is not enough data a field is
returned as None / empty instead of a made-up number.
"""
from payroll.engine import inr
import calendar
import datetime
import re
import statistics
from collections import Counter, defaultdict
from utils.hr_common import LEAVE_ENTITLEMENTS

from hr_backend.db import db


POSITIVE_WORDS = {
    'excellent', 'great', 'good', 'strong', 'outstanding', 'improved', 'improving', 'proactive',
    'reliable', 'helpful', 'collaborative', 'positive', 'exceeds', 'success', 'successful',
    'thanks', 'resolved', 'happy', 'impressive', 'leadership', 'initiative',
}
NEGATIVE_WORDS = {
    'poor', 'weak', 'late', 'missed', 'declining', 'delay', 'delayed', 'issue', 'problem',
    'complaint', 'unhappy', 'stress', 'stressed', 'burnout', 'overworked', 'conflict',
    'lacking', 'needs', 'below', 'failed', 'unresolved', 'frustrated',
}
THEMES = {
    'Work-Life Balance': {'balance', 'overtime', 'burnout', 'overworked', 'stress', 'leave', 'workload'},
    'Management & Communication': {'manager', 'management', 'communication', 'feedback', 'leadership', 'team'},
    'Compensation & Benefits': {'salary', 'pay', 'payroll', 'bonus', 'compensation', 'expense', 'reimbursement'},
    'Tools & Equipment': {'laptop', 'software', 'access', 'vpn', 'equipment', 'asset', 'hardware'},
    'Growth & Skills': {'skills', 'training', 'growth', 'learning', 'promotion', 'career'},
}


# --------------------------------------------------------------------------- helpers

def skill_name(skill):
    if isinstance(skill, dict):
        return str(skill.get('name') or skill.get('skill') or '').strip()
    return str(skill).strip()


def skill_list(emp):
    return [n for n in (skill_name(s) for s in (emp.get('skills') or [])) if n]


def emp_keys(emp):
    return {str(emp['_id']), str(emp.get('employee_id', ''))} - {''}


def full_name(emp):
    name = f"{emp.get('first_name') or ''} {emp.get('last_name') or ''}".strip()
    return name or emp.get('email') or str(emp.get('employee_id') or emp['_id'])


def parse_dt(value):
    if isinstance(value, datetime.datetime):
        return value if value.tzinfo else value.replace(tzinfo=datetime.timezone.utc)
    if isinstance(value, str) and value:
        try:
            dt = datetime.datetime.fromisoformat(value.replace('Z', '+00:00'))
            return dt if dt.tzinfo else dt.replace(tzinfo=datetime.timezone.utc)
        except ValueError:
            try:
                return datetime.datetime.strptime(value[:10], '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc)
            except ValueError:
                return None
    return None


def to_float(value, default=None):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def attrition_12m(employees, today=None):
    """(rate in %, leavers) over the last 12 months: leavers divided by the average of the headcount a year ago and now."""
    today = (today or datetime.date.today())
    year_ago = today - datetime.timedelta(days=365)

    def on_roll(e, day):
        hired = parse_dt(e.get('hire_date'))
        left = parse_dt(e.get('termination_date'))
        return bool(hired) and hired.date() <= day and not (left and left.date() <= day)

    leavers = sum(1 for e in employees if parse_dt(e.get('termination_date')) and year_ago < parse_dt(e['termination_date']).date() <= today)
    average = (sum(1 for e in employees if on_roll(e, year_ago)) + sum(1 for e in employees if on_roll(e, today))) / 2
    return (round(leavers / average * 100, 1) if average else 0.0), leavers


def is_active(emp):
    status = str(emp.get('employment_status') or emp.get('status') or 'Active').lower()
    return status == 'active' and emp.get('active', True) not in (False, 'False', 'false')


def tenure_years(emp, now=None):
    now = now or datetime.datetime.now(tz=datetime.timezone.utc)
    hired = parse_dt(emp.get('hire_date') or emp.get('joining_date'))
    return max((now - hired).days / 365.25, 0) if hired else None


def attendance_hours(rec):
    hours = to_float(rec.get('hours_worked'))
    if hours is None:
        hours = to_float(rec.get('total_hours'))
    if hours is None:
        cin, cout = parse_dt(rec.get('clock_in')), parse_dt(rec.get('clock_out'))
        if cin and cout and cout > cin:
            hours = (cout - cin).total_seconds() / 3600
    return hours


def sentiment_score(text):
    """Lexicon sentiment in [-1, 1]; None when no signal words are present."""
    words = re.findall(r"[a-z']+", (text or '').lower())
    pos = sum(w in POSITIVE_WORDS for w in words)
    neg = sum(w in NEGATIVE_WORDS for w in words)
    return None if pos + neg == 0 else (pos - neg) / (pos + neg)



# --------------------------------------------------------------------------- trained attrition model

MIN_EXITS = 8        # completed exits (Offboarding) and still-active employees needed before a model is trained
FEATURE_NAMES = ['tenure (years)', 'performance score', 'average daily hours', 'leave days (90d)',
                 'salary vs department median', 'active improvement plan']


class LogisticModel:
    """Tiny L2-regularised logistic regression (pure Python, batch gradient descent) on standardised features."""

    def __init__(self, rows, labels, iterations=400, rate=0.3, l2=0.05):
        n, d = len(rows), len(rows[0])
        self.mean = [sum(r[j] for r in rows) / n for j in range(d)]
        self.std = [max((sum((r[j] - self.mean[j]) ** 2 for r in rows) / n) ** 0.5, 1e-6) for j in range(d)]
        xs = [self._scale(r) for r in rows]
        self.w, self.b = [0.0] * d, 0.0
        for _ in range(iterations):
            gw, gb = [0.0] * d, 0.0
            for x, y in zip(xs, labels):
                err = self._sigmoid(sum(wj * xj for wj, xj in zip(self.w, x)) + self.b) - y
                gb += err
                for j in range(d):
                    gw[j] += err * x[j]
            self.w = [wj - rate * (gw[j] / n + l2 * wj) for j, wj in enumerate(self.w)]
            self.b -= rate * gb / n
        preds = [1 if self.predict_scaled(x) >= 0.5 else 0 for x in xs]
        self.accuracy = round(sum(p == y for p, y in zip(preds, labels)) / n, 2)

    @staticmethod
    def _sigmoid(z):
        z = max(min(z, 30), -30)
        return 1 / (1 + 2.718281828459045 ** (-z))

    def _scale(self, row):
        return [(v - m) / s for v, m, s in zip(row, self.mean, self.std)]

    def predict_scaled(self, x):
        return self._sigmoid(sum(wj * xj for wj, xj in zip(self.w, x)) + self.b)

    def predict(self, row):
        return self.predict_scaled(self._scale(row))

    def drivers(self, row, top=2):
        """Features pushing this employee's risk up the most."""
        x = self._scale(row)
        contribution = sorted(((wj * xj, name) for wj, xj, name in zip(self.w, x, FEATURE_NAMES)), reverse=True)
        return [name for c, name in contribution[:top] if c > 0.15]

# --------------------------------------------------------------------------- context

class Context:
    """Snapshot of the collections needed by the analytics, loaded once per request."""

    def __init__(self, attendance_days=90):
        self.now = datetime.datetime.now(tz=datetime.timezone.utc)
        self.employees = list(db['Employees'].find())
        self.active = [e for e in self.employees if is_active(e)]
        self.departments = {str(d['_id']): d.get('name', '') for d in db['Departments'].find()}
        since = (self.now - datetime.timedelta(days=attendance_days)).strftime('%Y-%m-%d')
        self.attendance = list(db['Attendance'].find({'date': {'$gte': since}}))
        self.leaves = list(db['Leaves'].find())
        self.reviews = list(db['Reviews'].find())
        self.objectives = list(db['objectives'].find())
        self.pips = list(db['pips'].find())
        self.tickets = list(db['helpdesk_tickets'].find())
        self.expenses = list(db['expenses'].find())
        self.payroll = list(db['Payroll'].find())
        self._by_key = {}
        for e in self.employees:
            for k in emp_keys(e):
                self._by_key[k] = e

    def employee_for(self, ref):
        return self._by_key.get(str(ref))

    def dept(self, emp):
        return emp.get('department') or self.departments.get(str(emp.get('department_id', '')), '') or 'Unassigned'

    def records_for(self, emp, records, field='employee_id'):
        keys = emp_keys(emp)
        return [r for r in records if str(r.get(field, '')) in keys]

    # --- per-employee metrics -------------------------------------------------
    def performance(self, emp):
        """Average review score (0-5); falls back to objective progress scaled to 0-5; else None."""
        scores = [to_float(r.get('average_score')) for r in self.records_for(emp, self.reviews)]
        scores = [s for s in scores if s is not None]
        if scores:
            return round(sum(scores) / len(scores), 2)
        progress = [to_float(o.get('progress')) for o in self.records_for(emp, self.objectives)]
        progress = [p for p in progress if p is not None]
        if progress:
            return round(sum(progress) / len(progress) / 20, 2)
        return None

    def leave_days(self, emp, since_days=None, status='Approved'):
        total = 0.0
        cutoff = self.now - datetime.timedelta(days=since_days) if since_days else None
        for lv in self.records_for(emp, self.leaves):
            if lv.get('status') != status:
                continue
            start = parse_dt(lv.get('start_date'))
            if cutoff and (not start or start < cutoff):
                continue
            total += to_float(lv.get('days'), 0) or 0
        return total

    def features(self, emp):
        """Numeric features for the trained model (None parts are imputed later)."""
        end = parse_dt(emp.get('termination_date')) or self.now
        hired = parse_dt(emp.get('hire_date') or emp.get('joining_date'))
        tenure = max((end - hired).days / 365.25, 0) if hired else None
        att = [h for h in (attendance_hours(r) for r in self.records_for(emp, self.attendance)) if h and h > 0.5]
        peers = [to_float(e.get('salary')) for e in self.employees if self.dept(e) == self.dept(emp)]
        peers = [p for p in peers if p]
        salary = to_float(emp.get('salary'))
        ratio = salary / statistics.median(peers) if salary and len(peers) >= 2 else None
        pip = 1.0 if self.records_for(emp, [p for p in self.pips if str(p.get('status', '')).lower() not in ('completed', 'closed')]) else 0.0
        return [tenure, self.performance(emp), (sum(att) / len(att)) if att else None, self.leave_days(emp, since_days=90), ratio, pip]

    def attrition_model(self):
        """Train once per request from recorded exits (Offboarding) vs. active employees; None when data is too thin."""
        if hasattr(self, '_attrition_model'):
            return self._attrition_model
        self._attrition_model = None
        left_ids = {str(o['employee_id']) for o in db['Offboarding'].find({'status': {'$in': ['Approved', 'Completed']}})}
        left = [e for e in self.employees if str(e['_id']) in left_ids]
        stayed = [e for e in self.employees if is_active(e) and str(e['_id']) not in left_ids]
        if len(left) < MIN_EXITS or len(stayed) < MIN_EXITS:
            return None
        raw = [self.features(e) for e in left + stayed]
        labels = [1] * len(left) + [0] * len(stayed)
        cols = list(zip(*raw))
        fill = [(sum(v for v in col if v is not None) / max(sum(v is not None for v in col), 1)) for col in cols]
        rows = [[fill[j] if v is None else v for j, v in enumerate(r)] for r in raw]
        model = LogisticModel(rows, labels)
        model.fill = fill
        model.exits, model.stayers = len(left), len(stayed)
        self._attrition_model = model
        return model

    def model_info(self):
        m = self.attrition_model()
        if not m:
            return {'type': 'rules', 'note': f'A model is trained automatically once {MIN_EXITS}+ exits are recorded in Exit Management.'}
        return {'type': 'trained', 'exits': m.exits, 'stayers': m.stayers, 'training_accuracy': m.accuracy,
                'algorithm': 'logistic regression'}

    def attrition(self, emp):
        """Attrition risk: returns (score 0-100, level, [reasons]). Uses the trained model when enough exits exist."""
        model = self.attrition_model()
        if model:
            row = [model.fill[j] if v is None else v for j, v in enumerate(self.features(emp))]
            prob = model.predict(row)
            level = 'High' if prob >= 0.6 else 'Medium' if prob >= 0.3 else 'Low'
            drivers = model.drivers(row)
            reasons = [f'Model-estimated probability {round(prob * 100)}%'] + [f'Driver: {d}' for d in drivers]
            return round(prob * 100), level, reasons
        return self.rule_attrition(emp)

    def rule_attrition(self, emp):
        """Rule-based attrition risk: returns (score 0-100, level, [reasons])."""
        score, reasons = 0, []
        tenure = tenure_years(emp, self.now)
        if tenure is not None and tenure < 1:
            score += 15
            reasons.append('Less than one year of tenure')
        perf = self.performance(emp)
        if perf is not None and perf < 3:
            score += 25
            reasons.append(f'Low performance score ({perf}/5)')
        if self.records_for(emp, [p for p in self.pips if str(p.get('status', '')).lower() not in ('completed', 'closed')]):
            score += 20
            reasons.append('Active performance improvement plan')
        recent_leave = self.leave_days(emp, since_days=90)
        if recent_leave > 10:
            score += 15
            reasons.append(f'{recent_leave:g} leave days in the last 90 days')
        att = self.records_for(emp, self.attendance)
        hours = [h for h in (attendance_hours(r) for r in att) if h is not None and h > 0.5]
        if hours and sum(hours) / len(hours) < 6:
            score += 15
            reasons.append('Average daily hours below 6')
        elif hours and sum(hours) / len(hours) > 10:
            score += 15
            reasons.append('Average daily hours above 10 (burnout risk)')
        peers = [to_float(e.get('salary')) for e in self.active if self.dept(e) == self.dept(emp)]
        peers = [p for p in peers if p]
        salary = to_float(emp.get('salary'))
        if salary and len(peers) >= 3 and salary < 0.85 * statistics.median(peers):
            score += 15
            reasons.append('Salary more than 15% below department median')
        score = min(score, 100)
        level = 'High' if score >= 50 else 'Medium' if score >= 25 else 'Low'
        return score, level, reasons

    def growth_potential(self, emp):
        perf = self.performance(emp)
        if perf is None:
            return 'Unknown'
        skills = len(skill_list(emp))
        if perf >= 4 and skills >= 3:
            return 'High'
        if perf >= 3:
            return 'Medium'
        return 'Low'


# --------------------------------------------------------------------------- analytics

def dashboard_stats():
    ctx = Context(attendance_days=1)
    today = ctx.now.strftime('%Y-%m-%d')
    month_ago = ctx.now - datetime.timedelta(days=30)
    present_today = {str(a.get('employee_id')) for a in ctx.attendance if a.get('date') == today}
    new_hires = sum(1 for e in ctx.employees if (parse_dt(e.get('hire_date')) or month_ago) > month_ago and (parse_dt(e.get('hire_date')) is not None))
    return {
        'employees': {'total': len(ctx.employees), 'active': len(ctx.active), 'new_hires': new_hires},
        'attendance': {
            'today': len(present_today),
            'rate': round(len(present_today) / len(ctx.active) * 100, 2) if ctx.active else 0,
        },
        'leaves': {'pending': sum(1 for l in ctx.leaves if l.get('status') == 'Pending')},
        'performance': {'upcoming_reviews': db['ReviewPeriods'].count_documents({'end_date': {'$gte': today}})},
    }


def engagement_metrics():
    """Engagement proxy (0-10) from attendance regularity, objective progress and leave usage."""
    ctx = Context()
    by_dept = defaultdict(list)
    all_scores = []
    working_days = max(len({a.get('date') for a in ctx.attendance}), 1)
    for emp in ctx.active:
        days_present = len({a.get('date') for a in ctx.records_for(emp, ctx.attendance)})
        attendance_part = min(days_present / working_days, 1) * 10
        progress = [to_float(o.get('progress')) for o in ctx.records_for(emp, ctx.objectives)]
        progress = [p for p in progress if p is not None]
        objective_part = (sum(progress) / len(progress) / 10) if progress else None
        parts = [attendance_part] + ([objective_part] if objective_part is not None else [])
        score = round(sum(parts) / len(parts), 1)
        by_dept[ctx.dept(emp)].append(score)
        all_scores.append(score)
    participating = sum(1 for e in ctx.active if ctx.records_for(e, ctx.attendance))
    proxy = round(sum(all_scores) / len(all_scores), 1) if all_scores else None
    survey = latest_survey_score()
    return {
        'engagement_score': survey['score10'] if survey else proxy,
        'survey': survey,
        'trend': survey['trend'] if survey else None,
        'participation_rate': round(participating / len(ctx.active) * 100) if ctx.active else 0,
        'by_department': [{'name': d, 'score': round(sum(v) / len(v), 1)} for d, v in sorted(by_dept.items())],
        'history': survey_score_history(),
        'basis': ('Latest engagement survey (average rating x2).' if survey else
                  'Proxy from attendance regularity and OKR progress - run an engagement survey for a real score.'),
    }


TENURE_BUCKETS = [('Under 1 year', 0, 1), ('1-3 years', 1, 3), ('3-5 years', 3, 5), ('5+ years', 5, 1000)]


def attrition_overview():
    ctx = Context()
    counts = Counter()
    by_dept = defaultdict(lambda: Counter())
    factors = Counter()
    by_tenure = {label: Counter() for label, _, _ in TENURE_BUCKETS}
    by_tenure['Unknown'] = Counter()          # no hire date recorded
    for emp in ctx.active:
        score, level, reasons = ctx.attrition(emp)
        counts[level] += 1
        by_dept[ctx.dept(emp)][level] += 1
        factors.update(reasons)
        years = tenure_years(emp, ctx.now)
        if years is None:
            by_tenure['Unknown'][level] += 1
        for label, low, high in TENURE_BUCKETS:
            if years is not None and low <= years < high:
                by_tenure[label][level] += 1
    return {
        'high_risk_count': counts['High'],
        'medium_risk_count': counts['Medium'],
        'low_risk_count': counts['Low'],
        'top_factors': [f for f, _ in factors.most_common(3)],
        'model': ctx.model_info(),
        'risk_by_department': [
            {'name': d, 'high_risk': c['High'], 'medium_risk': c['Medium'], 'low_risk': c['Low']}
            for d, c in sorted(by_dept.items())
        ],
        'risk_by_tenure': [
            {'range': label, 'high_risk': c['High'], 'medium_risk': c['Medium'], 'low_risk': c['Low']}
            for label, c in by_tenure.items() if label != 'Unknown' or sum(c.values())
        ],
    }


def team_insights():
    ctx = Context()
    skill_freq = Counter(s for e in ctx.active for s in skill_list(e))
    strengths = [s for s, _ in skill_freq.most_common(5)]
    emerging = ['Data Science', 'Artificial Intelligence', 'Machine Learning', 'Cloud Computing',
                'DevOps', 'Cybersecurity', 'Kubernetes']
    n = max(len(ctx.active), 1)
    gaps = [s for s in emerging if skill_freq.get(s, 0) / n < 0.2][:5]
    dept_counts = Counter(ctx.dept(e) for e in ctx.active)
    balance = 1 - (max(dept_counts.values()) / n) if dept_counts else 0
    diversity = len(skill_freq) / max(sum(skill_freq.values()), 1)
    collaboration = round((balance * 0.4 + diversity * 0.6) * 100)
    recs = [
        {'title': f"Training in {gaps[0] if gaps else 'emerging technologies'}",
         'description': f"Run upskilling sessions in {', '.join(gaps[:2]) if gaps else 'emerging technologies'}; fewer than 20% of employees list these skills."},
        {'title': 'Cross-functional projects',
         'description': 'Staff projects across departments to improve collaboration and knowledge sharing.'},
        {'title': 'Skills exchange program',
         'description': f"Pair experts in {', '.join(strengths[:2]) if strengths else 'key areas'} with colleagues who want to learn them."},
    ]
    return {'strengths': strengths, 'developmentAreas': gaps, 'collaborationScore': collaboration, 'recommendations': recs}


# Industry demand reference data (static, not derived from this company's data)
EMERGING_SKILLS = {
    'Artificial Intelligence': ('Rising', 52), 'Machine Learning': ('Rising', 48), 'Data Science': ('Rising', 45),
    'Kubernetes': ('Rising', 42), 'DevOps': ('Rising', 40), 'Cloud Computing': ('Rising', 38),
    'Cybersecurity': ('Rising', 35), 'Blockchain': ('Rising', 32), 'React': ('Rising', 30),
    'Python': ('Rising', 28), 'GraphQL': ('Rising', 25), 'Node.js': ('Stable', 20),
    'Digital Marketing': ('Stable', 18), 'UI/UX Design': ('Stable', 15), 'Agile Development': ('Stable', 12),
}


def skills_trends():
    ctx = Context()
    freq = Counter(s for e in ctx.active for s in skill_list(e))
    top = [s for s, _ in freq.most_common(5)]
    trends = [{'skill': s, 'trend': t, 'growth': g, 'teamCount': freq.get(s, 0)} for s, (t, g) in EMERGING_SKILLS.items()]
    trends.sort(key=lambda t: (t['teamCount'] == 0, -t['growth']))
    gaps = [s for s, (t, g) in EMERGING_SKILLS.items() if freq.get(s, 0) == 0 and t == 'Rising' and g > 25]
    recs = []
    if gaps:
        recs.append({'title': f'Upskilling opportunity: {gaps[0]}',
                     'description': f"No employee currently lists {', '.join(gaps[:2])}; consider training programs."})
        recs.append({'title': 'Strategic hiring', 'description': f"Add expertise in {', '.join(gaps[:2])} through hiring."})
    recs.append({'title': 'Learning & Development', 'description': 'Allocate protected time for learning emerging technologies.'})
    return {
        'trends': trends[:6],
        'teamCoverage': {'strongAreas': top[:3], 'gapAreas': gaps[:3]},
        'recommendations': recs,
    }


def _ranked_employees(ctx):
    rows = []
    for emp in ctx.active:
        perf = ctx.performance(emp)
        rows.append((emp, perf, ctx.growth_potential(emp)))
    return rows


def growth_opportunities():
    ctx = Context()
    rows = _ranked_employees(ctx)
    high = [(e, p, g) for e, p, g in rows if g == 'High']
    high.sort(key=lambda r: -(r[1] or 0))
    high_potential = [{'id': str(e['_id']), 'name': full_name(e), 'position': e.get('position', ''),
                       'department': ctx.dept(e), 'performance': p, 'growthPotential': g} for e, p, g in high]
    pipeline = [{'employeeId': str(e['_id']), 'name': full_name(e),
                 'recommendation': f"Strong performance ({p}/5) with {len(skill_list(e))} skills — consider for a lead role"}
                for e, p, g in high if (tenure_years(e) or 0) >= 0.5][:5]
    plans = []
    skill_universe = Counter(s for e in ctx.active for s in skill_list(e))
    for e, p, g in high[:5]:
        own = set(skill_list(e))
        focus = [s for s, _ in skill_universe.most_common() if s not in own][:2] or ['Strategic Planning', 'Team Management']
        plans.append({'employeeId': str(e['_id']), 'name': full_name(e), 'planType': 'Leadership Development',
                      'focusAreas': focus, 'timeline': '6 months', 'mentor': 'To be assigned'})
    rising = [{'id': str(e['_id']), 'name': full_name(e), 'performance': p,
               'tenureYears': round(tenure_years(e, ctx.now) or 0, 1)}
              for e, p, g in rows if p is not None and p >= 4 and (tenure_years(e, ctx.now) or 0) < 1.5]
    support = []
    for e in ctx.active:
        score, level, reasons = ctx.attrition(e)
        perf = ctx.performance(e)
        if level != 'Low' or (perf is not None and perf < 3):
            support.append({'id': str(e['_id']), 'name': full_name(e), 'level': level, 'reasons': reasons})
    return {'highPotentialEmployees': high_potential, 'leadershipPipeline': pipeline, 'developmentPlans': plans,
            'risingStars': rising, 'needsSupport': support}


def employee_insights(emp_ref):
    ctx = Context()
    emp = ctx.employee_for(emp_ref)
    if not emp:
        return None
    perf = ctx.performance(emp)
    score, level, reasons = ctx.attrition(emp)
    growth = ctx.growth_potential(emp)
    skills = skill_list(emp)
    all_skills = Counter(s for e in ctx.active for s in skill_list(e))
    missing = [s for s, _ in all_skills.most_common() if s not in skills][:3]
    recs = []
    if missing:
        recs.append({'title': 'Skill development', 'description': f"Common skills in the company this employee lacks: {', '.join(missing)}."})
    if growth == 'High':
        recs.append({'title': 'Career path', 'description': 'High performer — consider for the leadership track.'})
    if level != 'Low':
        recs.append({'title': 'Retention', 'description': f"{level} attrition risk: " + '; '.join(reasons)})
    if not recs:
        recs.append({'title': 'Check-in', 'description': 'No flags raised; continue regular one-to-ones.'})
    return {'skills': skills, 'performance': perf, 'growthPotential': growth,
            'attritionRisk': {'score': score, 'level': level, 'reasons': reasons}, 'recommendations': recs}


def employees_overview(limit=50):
    ctx = Context()
    out = []
    for emp in ctx.active[:limit]:
        score, level, _ = ctx.attrition(emp)
        out.append({
            'id': str(emp['_id']), 'name': full_name(emp), 'position': emp.get('position', ''),
            'department': ctx.dept(emp), 'skills': skill_list(emp)[:5],
            'performance': ctx.performance(emp), 'growthPotential': ctx.growth_potential(emp),
            'attritionRisk': level,
        })
    return out


def attendance_anomalies():
    ctx = Context(attendance_days=30)
    anomalies = []
    by_emp = defaultdict(list)
    for rec in ctx.attendance:
        by_emp[str(rec.get('employee_id'))].append(rec)
    today = ctx.now.strftime('%Y-%m-%d')
    weekday_counts = Counter()
    for key, recs in by_emp.items():
        emp = ctx.employee_for(key)
        name = full_name(emp) if emp else key
        [h for h in (attendance_hours(r) for r in recs) if h]
        for r in recs:
            cin = parse_dt(r.get('clock_in'))
            if cin:
                weekday_counts[cin.strftime('%A')] += 1
            h = attendance_hours(r)
            if r.get('clock_in') and not r.get('clock_out') and r.get('date') != today:
                anomalies.append({'date': r.get('date'), 'type': 'Missing Clock-out', 'severity': 'medium', 'employee': name,
                                  'description': f'{name} clocked in on {r.get("date")} but never clocked out.',
                                  'suggestion': 'Ask the employee to submit a correction.'})
            elif h is not None and 0 < h < 4 and r.get('clock_out') and r.get('date') != today:
                anomalies.append({'date': r.get('date'), 'type': 'Short Shift', 'severity': 'medium', 'employee': name,
                                  'description': f'{name} worked only {h:.1f}h on {r.get("date")}.',
                                  'suggestion': 'Verify whether a half-day leave was approved.'})
            elif h and h > 12:
                anomalies.append({'date': r.get('date'), 'type': 'Excessive Hours', 'severity': 'high', 'employee': name,
                                  'description': f'{name} logged {h:.1f}h on {r.get("date")}.',
                                  'suggestion': 'Check for clock-out errors or burnout risk.'})
        starts = [(parse_dt(r['clock_in']).hour + parse_dt(r['clock_in']).minute / 60, r.get('date')) for r in recs if parse_dt(r.get('clock_in'))]
        if len(starts) >= 5:
            mean = statistics.mean(s for s, _ in starts)
            sd = statistics.pstdev(s for s, _ in starts)
            for s, d in starts:
                if sd > 0 and s - mean > max(2 * sd, 1.5):
                    anomalies.append({'date': d, 'type': 'Late Clock-in', 'severity': 'high', 'employee': name,
                                      'description': f'{name} clocked in {s - mean:.1f}h later than their 30-day average.',
                                      'suggestion': 'Check with the employee about the delay.'})
    anomalies.sort(key=lambda a: (a['date'] or ''), reverse=True)
    prediction = None
    if weekday_counts:
        weekdays = {d: c for d, c in weekday_counts.items() if d not in ('Saturday', 'Sunday')}
        if weekdays:
            low = min(weekdays, key=weekdays.get)
            prediction = f'{low} has historically had the lowest attendance over the last 30 days ({weekdays[low]} check-ins); expect more absences.'
    flagged = len(anomalies)
    total = max(len(ctx.attendance), 1)
    return {'anomalies': anomalies[:25], 'prediction': prediction,
            'overall_health_score': max(0, round(100 - flagged / total * 100))}


def payroll_anomalies():
    ctx = Context()
    anomalies = []
    salaries = [(e, to_float(e.get('salary'))) for e in ctx.active]
    valid = [s for _, s in salaries if s]
    median = statistics.median(valid) if valid else None
    for e, s in salaries:
        if not s:
            anomalies.append({'type': 'Missing Salary', 'severity': 'critical', 'employee': full_name(e),
                              'description': f'{full_name(e)} has no salary recorded.',
                              'suggestion': 'Update the salary before running payroll.'})
        elif median and s > 3 * median:
            anomalies.append({'type': 'Salary Outlier', 'severity': 'medium', 'employee': full_name(e),
                              'description': f'{full_name(e)} earns more than 3x the company median.',
                              'suggestion': 'Confirm the figure is correct.'})
    month = ctx.now.strftime('%B %Y')
    last_day = calendar.monthrange(ctx.now.year, ctx.now.month)[1]
    if ctx.payroll and ctx.now.day >= 20:
        paid = {str(p.get('employee_id')) for p in ctx.payroll if p.get('period') == month}
        missing = [full_name(e) for e in ctx.active if to_float(e.get('salary')) and not (emp_keys(e) & paid)]
        if missing:
            anomalies.append({'type': 'Payroll Not Generated', 'severity': 'medium',
                              'description': f'Payslips for {month} have not been generated yet for {len(missing)} employees; the pay date is {month.split()[0]} {last_day}.',
                              'suggestion': "Generate this month's payslips from the Payroll page before the pay date."})
    pending = [x for x in ctx.expenses if x.get('status') == 'Pending']
    if pending:
        total = sum(to_float(x.get('amount'), 0) for x in pending)
        anomalies.append({'type': 'Pending Reimbursements', 'severity': 'low',
                          'description': f'{len(pending)} expense claims totalling {inr(total, '₹')} are awaiting approval.',
                          'suggestion': 'Approve or reject before the payroll cut-off.'})
    monthly = sum(valid) / 12
    return {'anomalies': anomalies,
            'forecast': f'Projected monthly cost to company: {inr(monthly, '₹')} across {len(valid)} salaried employees.' if valid else None,
            'confidence_score': round(len(valid) / len(ctx.active) * 100) if ctx.active else 0}


def advanced_analytics():
    ctx = Context()
    by_dept = defaultdict(list)
    for e in ctx.active:
        score, level, reasons = ctx.attrition(e)
        by_dept[ctx.dept(e)].append((score, level, reasons))
    flight = []
    for d, rows in sorted(by_dept.items()):
        avg = sum(r[0] for r in rows) / len(rows)
        level = 'High' if avg >= 40 else 'Medium' if avg >= 20 else 'Low'
        reasons = Counter(x for r in rows for x in r[2]).most_common(2)
        flight.append({'department': d, 'risk_level': level,
                       'reason': '; '.join(r for r, _ in reasons) or 'No risk factors detected'})
    # Sentiment from free-text review comments and helpdesk tickets (lexicon-based)
    texts = [(r.get('comments') or '') + ' ' + (r.get('feedback') or '') for r in ctx.reviews]
    texts += [(t.get('title') or '') + ' ' + (t.get('description') or '') for t in ctx.tickets]
    scores = [s for s in (sentiment_score(t) for t in texts) if s is not None]
    themes = []
    for theme, words in THEMES.items():
        hits = [sentiment_score(t) for t in texts if words & set(re.findall(r"[a-z']+", t.lower()))]
        if hits:
            avg = sum(x for x in hits if x is not None) / max(len([x for x in hits if x is not None]), 1)
            themes.append({'theme': theme, 'sentiment': 'positive' if avg > 0.2 else 'negative' if avg < -0.2 else 'neutral',
                           'score': round((avg + 1) * 50), 'mentions': len(hits)})
    overall = round((sum(scores) / len(scores) + 1) * 50) if scores else None
    predictions = []
    for d in sorted(by_dept):
        members = [e for e in ctx.active if ctx.dept(e) == d]
        top = [e for e in members if (ctx.performance(e) or 0) >= 4]
        skills = [s for s, _ in Counter(s for e in members for s in skill_list(e)).most_common(3)]
        predictions.append({'department': d, 'predicted_top_performers': len(top), 'skills_trending_up': skills})
    return {
        'flight_risk': flight,
        'sentiment_analysis': {'overall_score': overall, 'trend': None, 'key_themes': themes,
                               'basis': f'Lexicon sentiment over {len(texts)} review/ticket texts.'},
        'performance_predictions': predictions,
    }


def find_employees_by_skills(wanted):
    ctx = Context()
    wanted_l = [w.strip().lower() for w in wanted if str(w).strip()]
    if not wanted_l:
        return []
    results = []
    for emp in ctx.active:
        own = {s.lower(): s for s in skill_list(emp)}
        matched = [own[w] for w in wanted_l if w in own]
        if matched:
            results.append({
                'id': str(emp['_id']), 'employee_id': emp.get('employee_id', ''), 'name': full_name(emp),
                'position': emp.get('position', ''), 'department': ctx.dept(emp),
                'matching_skills': matched, 'suitability': round(len(matched) / len(wanted_l) * 100),
            })
    results.sort(key=lambda r: -r['suitability'])
    return results


def leave_summary_for(emp_ref):
    ctx = Context(attendance_days=1)
    emp = ctx.employee_for(emp_ref)
    if not emp:
        return None
    year = str(ctx.now.year)
    mine = ctx.records_for(emp, ctx.leaves)

    def days(kind, status, this_year=True):
        return sum(to_float(l.get('days'), 0) for l in mine if l.get('leave_type') == kind and l.get('status') == status
                   and (not this_year or str(l.get('start_date', '')).startswith(year)))
    out = {'name': full_name(emp)}
    for kind, key in (('Earned Leaves', ''), ('Sick Leaves', 'sick_')):
        entitlement = LEAVE_ENTITLEMENTS[kind]
        used, pending = days(kind, 'Approved'), days(kind, 'Pending', this_year=False)
        out.update({f'{key}entitlement': entitlement, f'{key}used': used, f'{key}pending': pending,
                    f'{key}remaining': entitlement - used - pending})
    return out


def job_matches(job_id, limit=10):
    """Rank active employees against a recruitment-board job by required-skill overlap."""
    from bson import ObjectId
    try:
        job = db['jobs'].find_one({'_id': ObjectId(str(job_id))})
    except Exception:
        job = None
    if not job:
        raise ValueError('Job not found')
    raw = job.get('skills') or job.get('required_skills') or []
    required = [r.strip() for r in (raw.split(',') if isinstance(raw, str) else raw) if str(r).strip()]
    ctx = Context(attendance_days=1)
    results = []
    for emp in ctx.active:
        own = {s.lower(): s for s in skill_list(emp)}
        matched = [r for r in required if r.lower() in own]
        score = round(len(matched) / len(required) * 100) if required else 0
        if required and not matched:
            continue
        fit = 'Excellent' if score >= 90 else 'Very Good' if score >= 75 else 'Good' if score >= 50 else 'Fair'
        missing = [r for r in required if r not in matched]
        results.append({
            'job_id': str(job['_id']), 'employee_id': str(emp['_id']), 'employee_name': full_name(emp),
            'position': emp.get('position', ''), 'department': ctx.dept(emp),
            'match_score': score, 'skill_match': score, 'overall_fit': fit,
            'matching_skills': matched, 'required_skills': required,
            'notes': f"Has {len(matched)} of {len(required)} required skills"
                     + (f"; missing: {', '.join(missing)}" if missing else ''),
        })
    results.sort(key=lambda r: -r['match_score'])
    return results[:limit]


def review_facts(emp_ref):
    """Collect the evidence a performance review is based on. Returns None for an unknown employee."""
    ctx = Context(attendance_days=180)
    emp = ctx.employee_for(emp_ref)
    if not emp:
        return None
    att = ctx.records_for(emp, ctx.attendance)
    hours = [h for h in (attendance_hours(r) for r in att) if h and h > 0.5]
    objectives = ctx.records_for(emp, ctx.objectives)
    progress = [p for p in (to_float(o.get('progress')) for o in objectives) if p is not None]
    reviews = ctx.records_for(emp, ctx.reviews)
    scores = {}
    for r in reviews:
        for k, v in (r.get('scores') or {}).items():
            v = to_float(v)
            if v is not None:
                scores.setdefault(k, []).append(v)
    score, level, reasons = ctx.attrition(emp)
    return {
        'employee': emp, 'name': full_name(emp), 'position': emp.get('position', ''), 'department': ctx.dept(emp),
        'tenure_years': round(tenure_years(emp, ctx.now) or 0, 1), 'skills': skill_list(emp),
        'performance': ctx.performance(emp), 'review_count': len(reviews),
        'review_scores': {k: round(sum(v) / len(v), 2) for k, v in scores.items()},
        'objectives_total': len(objectives),
        'objectives_completed': sum(1 for o in objectives if str(o.get('status', '')).lower() == 'completed'),
        'objective_progress': round(sum(progress) / len(progress)) if progress else None,
        'days_present': len({r.get('date') for r in att}),
        'avg_hours': round(sum(hours) / len(hours), 1) if hours else None,
        'leave_days_90': ctx.leave_days(emp, since_days=90),
        'attrition_level': level, 'attrition_reasons': reasons,
        'growth_potential': ctx.growth_potential(emp),
    }


def generate_review(emp_ref):
    """Evidence-based review draft (structure used by the AI Tools review page)."""
    f = review_facts(emp_ref)
    if f is None:
        return None
    perf = f['performance']
    base = (perf * 20) if perf is not None else 60  # neutral when there is no data
    scores = f['review_scores']

    def rating(key, fallback):
        return round(min(100, max(0, (scores[key] * 20) if key in scores else fallback)))

    ratings = {
        'technical_skills': rating('performance', base),
        'communication': rating('communication', base),
        'teamwork': rating('teamwork', base),
        'initiative': rating('initiative', base),
        'reliability': round(min(100, base + (5 if f['avg_hours'] and 7 <= f['avg_hours'] <= 9.5 else 0))),
    }
    strengths, improve, achievements = [], [], []
    if f['skills']:
        strengths.append(f"Skills on record: {', '.join(f['skills'][:5])}")
    for k, v in sorted(scores.items(), key=lambda kv: -kv[1])[:2]:
        if v >= 4:
            strengths.append(f"Rated {v}/5 for {k} in past reviews")
    if f['objective_progress'] is not None and f['objective_progress'] >= 70:
        strengths.append(f"Objectives are {f['objective_progress']}% complete on average")
    if f['avg_hours'] and 7 <= f['avg_hours'] <= 9.5:
        strengths.append(f"Consistent working hours (avg {f['avg_hours']}h/day)")
    for k, v in sorted(scores.items(), key=lambda kv: kv[1])[:2]:
        if v < 3.5:
            improve.append(f"{k.replace('_', ' ').title()} scored {v}/5 in past reviews")
    if f['objective_progress'] is not None and f['objective_progress'] < 50:
        improve.append(f"Objective progress is only {f['objective_progress']}%")
    if f['avg_hours'] and f['avg_hours'] > 10:
        improve.append(f"Long average workday ({f['avg_hours']}h) - watch for burnout")
    if f['leave_days_90'] > 10:
        improve.append(f"{f['leave_days_90']:g} leave days in the last 90 days - check workload and wellbeing")
    if f['objectives_completed']:
        achievements.append(f"Completed {f['objectives_completed']} of {f['objectives_total']} objectives")
    if f['review_count']:
        achievements.append(f"{f['review_count']} prior review(s) on record (average score {perf}/5)")
    if not (strengths or improve):
        improve.append('Not enough performance data yet - schedule a review conversation to gather feedback')
    limited = perf is None
    summary = (f"{f['name']} ({f['position'] or 'employee'}, {f['department']}) has {f['tenure_years']} years of tenure. "
               + ("There is limited performance data, so ratings are neutral placeholders." if limited
                  else f"Overall performance score is {perf}/5 based on reviews and objectives."))
    growth = f['growth_potential']
    return {
        'summary': summary, 'strengths': strengths, 'areas_for_improvement': improve,
        'key_achievements': achievements, 'ratings': ratings,
        'career_growth': {
            'recommendation': ('Consider for a senior or lead role' if growth == 'High'
                               else 'Continue development in the current role' if growth in ('Medium', 'Unknown')
                               else 'Set a focused improvement plan with the manager'),
            'suggested_training': f['skills'][:1] + ['Leadership Development', 'Advanced Communication'],
        },
        'data_quality': 'limited' if limited else 'ok', 'source': 'data',
    }


def latest_survey_score(min_responses=3):
    """Average rating (scaled to 0-10) of the two most recent engagement/pulse surveys with enough responses."""
    scores = []
    for s in db['Surveys'].find({'type': {'$in': ['engagement', 'pulse']}}).sort('created_at', -1):
        rows = list(db['SurveyResponses'].find({'survey_id': str(s['_id'])}))
        if len(rows) < min_responses:
            continue
        rating_ids = [q['id'] for q in s['questions'] if q['type'] == 'rating']
        vals = [r['answers'][q] for r in rows for q in rating_ids if q in r['answers']]
        if vals:
            scores.append((s['title'], round(sum(vals) / len(vals) * 2, 1), len(rows)))
        if len(scores) == 2:
            break
    if not scores:
        return None
    trend = None
    if len(scores) == 2:
        diff = round(scores[0][1] - scores[1][1], 1)
        trend = f'{diff:+}'
    return {'title': scores[0][0], 'score10': scores[0][1], 'responses': scores[0][2], 'trend': trend}


def survey_score_history(min_responses=3):
    """Every engagement/pulse survey with enough responses, oldest first: [{title, date, score10, responses}]."""
    out = []
    for s in db['Surveys'].find({'type': {'$in': ['engagement', 'pulse']}}).sort('created_at', 1):
        rows = list(db['SurveyResponses'].find({'survey_id': str(s['_id'])}))
        rating_ids = [q['id'] for q in s['questions'] if q['type'] == 'rating']
        vals = [r['answers'][q] for r in rows for q in rating_ids if q in r['answers']]
        if len(rows) >= min_responses and vals:
            out.append({'title': s['title'], 'date': str(s.get('created_at', ''))[:10],
                        'score10': round(sum(vals) / len(vals) * 2, 1), 'responses': len(rows)})
    return out


def _years(value):
    """First number found in text like '3+ years' / 4 -> 3.0; None if there is none."""
    if value in (None, ''):
        return None
    match = re.search(r'\d+(?:\.\d+)?', str(value))
    return float(match.group()) if match else None


def predict_candidates(job_id):
    """
    Transparent fit score (0-100) for each candidate of a recruitment-board job:
      60 %  required-skill coverage
      25 %  experience versus the job's requirement (full marks when none is stated)
      15 %  overlap with the skills of current top performers (score >= 4), i.e. the profile that has succeeded here
    The result is a ranking aid, not a trained prediction model.
    """
    from bson import ObjectId
    try:
        job = db['jobs'].find_one({'_id': ObjectId(str(job_id))})
    except Exception:
        job = None
    if not job:
        raise ValueError('Job not found')
    raw = job.get('skills') or []
    required = [r.strip() for r in (raw.split(',') if isinstance(raw, str) else raw) if str(r).strip()]
    needed_years = _years(job.get('experience'))
    ctx = Context(attendance_days=1)
    top_skills = Counter()
    top_count = 0
    for emp in ctx.active:
        perf = ctx.performance(emp)
        if perf is not None and perf >= 4:
            top_count += 1
            top_skills.update(s.lower() for s in set(skill_list(emp)))
    results = []
    for cand in db['candidates'].find({'job_id': str(job['_id'])}):
        raw_c = cand.get('skills') or []
        have = {s.strip().lower(): s.strip() for s in (raw_c.split(',') if isinstance(raw_c, str) else raw_c) if str(s).strip()}
        matched = [r for r in required if r.lower() in have]
        skill_part = len(matched) / len(required) if required else 0.5
        years = _years(cand.get('experience'))
        if needed_years is None:
            exp_part, exp_note = 1.0, None
        elif years is None:
            exp_part, exp_note = 0.5, 'experience not provided'
        else:
            exp_part = min(years / needed_years, 1.0) if needed_years else 1.0
            exp_note = f'{years:g} of {needed_years:g} years'
        if top_count and have:
            overlap = sum(1 for s in have if top_skills.get(s, 0) >= max(1, top_count // 2)) / len(have)
        else:
            overlap = 0.0
        score = round((skill_part * 0.6 + exp_part * 0.25 + overlap * 0.15) * 100)
        reasons = [f'{len(matched)} of {len(required)} required skills'] if required else ['no required skills listed']
        if exp_note:
            reasons.append(exp_note)
        if overlap:
            reasons.append(f'{round(overlap * 100)}% of skills match top performers here')
        results.append({'candidate_id': str(cand['_id']), 'name': cand.get('name', ''), 'score': score,
                        'likelihood': 'High' if score >= 75 else 'Medium' if score >= 50 else 'Low',
                        'matching_skills': matched, 'reasons': reasons})
    results.sort(key=lambda r: -r['score'])
    return results
