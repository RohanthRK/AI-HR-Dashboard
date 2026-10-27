"""
Teams (MongoDB `Teams` collection).

A team belongs to a department and has a manager, an optional leader and members. Rules kept here:
  * an employee is in exactly one team, so adding them to a team takes them out of their previous one;
  * `employees` (rich member cards), `members` (ids) and each employee's `team` / `team_id` always agree;
  * only administrators create teams; a team's own manager or leader may edit it (administrators may edit any).
"""
import datetime

from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from hr_backend.db import teams as teams_collection, employees as employees_collection, departments as departments_collection
from utils.api_utils import serialize_document
from utils.auth_utils import is_admin, is_privileged, forbidden
from utils.hr_common import body


def _now():
    return datetime.datetime.now(tz=datetime.timezone.utc).isoformat()


def _oid(value):
    try:
        return ObjectId(str(value))
    except Exception:
        return None


def _employee_card(emp, leader_id, manager_id):
    return {
        'id': str(emp['_id']),
        'name': f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
        'position': emp.get('position', 'Team Member'),
        'email': emp.get('email', ''),
        'phone': emp.get('phone', ''),
        'hire_date': emp.get('hire_date', ''),
        'employee_id': emp.get('employee_id', str(emp['_id'])),
        'is_leader': str(emp['_id']) == str(leader_id or ''),
        'is_manager': str(emp['_id']) == str(manager_id or ''),
    }


def _apply_members(team_id, name, department, member_ids, leader_id, manager_id):
    """
    Make `member_ids` the team's membership everywhere: the team document, the members' own records, and the
    teams they were in before. Returns the member cards. Unknown ids are ignored.
    """
    wanted = []
    for ref in member_ids:
        emp = employees_collection.find_one({'_id': _oid(ref)}) if _oid(ref) else None
        if emp and str(emp['_id']) not in [str(w['_id']) for w in wanted]:
            wanted.append(emp)
    wanted_ids = {str(e['_id']) for e in wanted}

    # leave the old team(s)
    for other in teams_collection.find({'_id': {'$ne': team_id}, 'members': {'$in': list(wanted_ids)}}):
        keep = [m for m in other.get('members', []) if str(m) not in wanted_ids]
        teams_collection.update_one({'_id': other['_id']}, {'$set': {
            'members': keep,
            'employees': [c for c in other.get('employees', []) if str(c.get('id')) not in wanted_ids],
            'updated_at': _now()}})
    # people who were in this team and no longer are
    current = teams_collection.find_one({'_id': team_id}) or {}
    for gone in {str(m) for m in current.get('members', [])} - wanted_ids:
        employees_collection.update_one({'_id': _oid(gone)}, {'$set': {'team': '', 'team_id': '', 'teams': []}})

    cards = [_employee_card(e, leader_id, manager_id) for e in wanted]
    for emp, card in zip(wanted, cards):
        employees_collection.update_one({'_id': emp['_id']}, {'$set': {
            'team': name, 'team_id': str(team_id),
            'teams': [{'name': name, 'department': department, 'is_leader': card['is_leader'], 'is_manager': card['is_manager']}]}})
    return cards


def _requester(request):
    ref = str(getattr(request, 'employee_id', '') or '')
    return employees_collection.find_one({'_id': _oid(ref)}) or employees_collection.find_one({'employee_id': ref}) if ref else None


def _clean(data, existing=None):
    """Validated team fields from a request body; returns (fields, error message)."""
    existing = existing or {}
    name = str(data.get('name', existing.get('name', '')) or '').strip()
    department = str(data.get('department', existing.get('department', '')) or '').strip()
    if not name:
        return None, 'Team name is required'
    if not department:
        return None, 'Department is required'
    if len(name) > 80:
        return None, 'Team name is too long'
    clash = teams_collection.find_one({'name': {'$regex': '^' + __import__('re').escape(name) + '$', '$options': 'i'},
                                       '_id': {'$ne': existing.get('_id')}})
    if clash:
        return None, f"A team called '{name}' already exists"
    dept_doc = departments_collection.find_one({'name': department})
    ids = data.get('employee_ids', None)
    if ids is None:
        ids = [str(m) for m in existing.get('members', [])]
    if isinstance(ids, str):
        ids = [ids]
    if not isinstance(ids, list):
        return None, 'employee_ids must be a list'
    leader = data.get('leader_id', existing.get('leader_id')) or None
    manager = data.get('manager_id', existing.get('manager_id')) or None
    for ref in (leader, manager):
        if ref and not employees_collection.find_one({'_id': _oid(ref)}):
            return None, 'The chosen leader or manager does not exist'
    members = list(dict.fromkeys([str(i) for i in ids] + [str(x) for x in (leader, manager) if x]))
    return {
        'name': name, 'department': department, 'department_id': str(dept_doc['_id']) if dept_doc else existing.get('department_id', ''),
        'description': str(data.get('description', existing.get('description', '')) or '').strip()[:500] or f'{name} in the {department} department',
        'leader_id': str(leader) if leader else None, 'manager_id': str(manager) if manager else None, 'members': members,
    }, None


@csrf_exempt
@require_http_methods(['GET'])
def mongodb_list(request):
    """GET /api/teams/mongodb_list/ - every team (any signed-in user; this is the company directory)."""
    return JsonResponse([serialize_document(t) for t in teams_collection.find({})], safe=False)


@csrf_exempt
@require_http_methods(['POST'])
def mongodb_create(request):
    """POST /api/teams/teams/mongodb_create/ {name, department, description?, leader_id?, manager_id?, employee_ids?} (Admin)."""
    if not is_admin(request):
        return forbidden('Only administrators create teams.')
    data = body(request)
    fields, error = _clean(data)
    if error:
        return JsonResponse({'error': error}, status=400)
    team = {**fields, 'employees': [], 'is_active': True, 'created_at': _now(), 'updated_at': _now()}
    members = team.pop('members')
    team_id = teams_collection.insert_one(team).inserted_id
    cards = _apply_members(team_id, team['name'], team['department'], members, team['leader_id'], team['manager_id'])
    teams_collection.update_one({'_id': team_id}, {'$set': {'employees': cards, 'members': [c['id'] for c in cards]}})
    return JsonResponse({'message': 'Team created successfully', 'id': str(team_id),
                         'team': serialize_document(teams_collection.find_one({'_id': team_id}))}, status=201)


@csrf_exempt
@require_http_methods(['PUT'])
def mongodb_update(request, pk=None):
    """PUT /api/teams/teams/<id>/mongodb_update/ - Admin, or the team's own manager / leader."""
    team_id = _oid(pk)
    team = teams_collection.find_one({'_id': team_id}) if team_id else None
    if not team:
        return JsonResponse({'error': 'Team not found'}, status=404)
    if not is_admin(request):
        me = _requester(request)
        owner = {str(team.get('manager_id') or ''), str(team.get('leader_id') or '')}
        if not (is_privileged(request) and me and str(me['_id']) in owner):
            return forbidden('Only administrators or this team\'s manager or leader can edit it.')
    fields, error = _clean(body(request), team)
    if error:
        return JsonResponse({'error': error}, status=400)
    members = fields.pop('members')
    cards = _apply_members(team_id, fields['name'], fields['department'], members, fields['leader_id'], fields['manager_id'])
    teams_collection.update_one({'_id': team_id}, {'$set': {**fields, 'employees': cards, 'members': [c['id'] for c in cards], 'updated_at': _now()}})
    updated = serialize_document(teams_collection.find_one({'_id': team_id}))
    return JsonResponse({'message': 'Team updated successfully', 'id': pk, 'team': {'id': pk, **updated}})
