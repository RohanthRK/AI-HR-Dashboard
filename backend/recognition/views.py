"""
Recognition & gamification: peer kudos with badges and points, a leaderboard, and achievement badges that are
earned automatically from real activity (training, goals, attendance, recognition received).

Collection: `Recognitions`.
"""
import datetime
from collections import Counter, defaultdict

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ai_analytics.insights import is_active
from hr_backend.db import db, employees
from utils.hr_common import body, current_employee, emp_name, employee_by_ref, error, now_iso, serialize
from utils.notify import notify, user_id_for_employee

recognitions = db['Recognitions']

BADGES = {
    'kudos': {'label': 'Great work', 'points': 10},
    'teamwork': {'label': 'Team player', 'points': 15},
    'mentor': {'label': 'Mentor', 'points': 15},
    'innovation': {'label': 'Innovator', 'points': 20},
    'above_beyond': {'label': 'Above and beyond', 'points': 25},
}
DAILY_GIVE_LIMIT = 5


def _names():
    return {str(e['_id']): emp_name(e) for e in employees.find()}


@csrf_exempt
@require_http_methods(["GET", "POST"])
def recognitions_handler(request):
    """
    GET  /api/recognition/ - latest 50 recognitions (everyone sees the public feed)
    POST /api/recognition/ {to, badge, message} - recognise a colleague
    """
    emp = current_employee(request)
    names = _names()
    if request.method == 'GET':
        try:
            limit = max(1, min(int(request.GET.get('limit', 50)), 300))
        except ValueError:
            limit = 50
        depts = {str(e['_id']): e.get('department', '') for e in employees.find({}, {'department': 1})}
        rows = recognitions.find().sort('created_at', -1).limit(limit)
        return JsonResponse({'success': True, 'badges': BADGES, 'recognitions': [
            {**serialize(r), 'from_name': names.get(r['from_employee_id'], ''), 'to_name': names.get(r['to_employee_id'], ''),
             'to_department': depts.get(r['to_employee_id'], '')}
            for r in rows]})

    if not emp:
        return error('Account is not linked to an employee profile')
    data = body(request)
    target = employee_by_ref(data.get('to'))
    badge = data.get('badge')
    message = str(data.get('message') or '').strip()
    if not target or not is_active(target):
        return error('Choose an active colleague', 404)
    if str(target['_id']) == str(emp['_id']):
        return error('You cannot recognise yourself')
    if badge not in BADGES:
        return error(f"badge must be one of {', '.join(BADGES)}")
    if len(message) < 3:
        return error('Add a short message saying why')
    since = (datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(days=1)).isoformat()
    if recognitions.count_documents({'from_employee_id': str(emp['_id']), 'created_at': {'$gte': since}}) >= DAILY_GIVE_LIMIT:
        return error(f'You can give at most {DAILY_GIVE_LIMIT} recognitions per day', 429)
    doc = {'from_employee_id': str(emp['_id']), 'to_employee_id': str(target['_id']), 'badge': badge,
           'message': message[:500], 'points': BADGES[badge]['points'], 'created_at': now_iso()}
    doc['_id'] = recognitions.insert_one(dict(doc)).inserted_id
    notify(user_id_for_employee(target['_id']), f"{emp_name(emp)} recognised you: {BADGES[badge]['label']}",
           message[:200], type='recognition')
    return JsonResponse({'success': True, 'recognition': {**serialize(doc), 'from_name': emp_name(emp), 'to_name': emp_name(target)}},
                        status=201)


@csrf_exempt
@require_http_methods(["GET"])
def leaderboard(request):
    """GET /api/recognition/leaderboard/?period=month|all - top 10 by points received."""
    query = {}
    if request.GET.get('period', 'month') == 'month':
        since = (datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(days=30)).isoformat()
        query['created_at'] = {'$gte': since}
    points, count = Counter(), Counter()
    givers = defaultdict(set)
    for r in recognitions.find(query):
        points[r['to_employee_id']] += r['points']
        count[r['to_employee_id']] += 1
        givers[r['to_employee_id']].add(r['from_employee_id'])
    names = _names()
    ranked = sorted(points.items(), key=lambda kv: (-kv[1], names.get(kv[0], '')))[:10]
    return JsonResponse({'success': True, 'leaderboard': [
        {'rank': i + 1, 'employee_id': eid, 'name': names.get(eid, ''), 'points': pts, 'recognitions': count[eid],
         'colleagues': len(givers[eid])} for i, (eid, pts) in enumerate(ranked)]})


def achievements_for(emp):
    """Badges earned automatically from activity (each with the evidence that earned it)."""
    eid = str(emp['_id'])
    keys = [eid, emp.get('employee_id')]
    earned = []
    completed = db['TrainingAssignments'].count_documents({'employee_id': eid, 'status': 'Completed'})
    if completed >= 3:
        earned.append({'id': 'learner', 'label': 'Lifelong learner', 'detail': f'{completed} trainings completed'})
    elif completed >= 1:
        earned.append({'id': 'student', 'label': 'First course done', 'detail': f'{completed} training completed'})
    done_goals = db['objectives'].count_documents({'employee_id': {'$in': keys}, '$or': [
        {'status': 'Completed'}, {'progress': {'$gte': 100}}]})
    if done_goals:
        earned.append({'id': 'goal_crusher', 'label': 'Goal crusher', 'detail': f'{done_goals} objective(s) completed'})
    since = (datetime.date.today() - datetime.timedelta(days=30)).isoformat()
    days = len(set(db['Attendance'].distinct('date', {'employee_id': {'$in': keys}, 'date': {'$gte': since}})))
    if days >= 15:
        earned.append({'id': 'reliable', 'label': 'Reliable', 'detail': f'{days} days present in the last 30'})
    received = recognitions.count_documents({'to_employee_id': eid})
    if received >= 3:
        earned.append({'id': 'team_favourite', 'label': 'Team favourite', 'detail': f'{received} recognitions received'})
    return earned


@csrf_exempt
@require_http_methods(["GET"])
def my_progress(request):
    """GET /api/recognition/me/ - my points, recognitions received and automatic badges."""
    emp = current_employee(request)
    if not emp:
        return error('Account is not linked to an employee profile')
    eid = str(emp['_id'])
    received = list(recognitions.find({'to_employee_id': eid}).sort('created_at', -1).limit(20))
    names = _names()
    return JsonResponse({
        'success': True, 'name': emp_name(emp),
        'points': sum(r['points'] for r in recognitions.find({'to_employee_id': eid})),
        'given': recognitions.count_documents({'from_employee_id': eid}),
        'received': [{**serialize(r), 'from_name': names.get(r['from_employee_id'], '')} for r in received],
        'achievements': achievements_for(emp),
    })
