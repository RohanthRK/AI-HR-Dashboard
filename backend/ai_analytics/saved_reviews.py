"""
Saved AI performance reviews (Collection `SavedReviews`).

A manager / HR generates a review on the AI Performance Review page and can then
  * save it as a Draft (kept in "Saved reviews", visible only to staff who may see that employee or team), and
  * deliver it, which shows it to the employee (or the team's members) under Performance and sends a notification.

Saving the same generated review twice does not create a second copy.
"""
import datetime
import hashlib
import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from hr_backend.db import db, employees, teams
from utils.auth_utils import can_see_employee, forbidden, is_admin, is_privileged
from utils.hr_common import body, current_employee, emp_name, employee_by_ref, error, now_iso, oid, serialize
from utils.notify import notify, user_id_for_employee

saved = db['SavedReviews']
KINDS = ('employee', 'team')


def _summary(doc):
    """List row: everything except the (large) review body."""
    out = serialize({k: v for k, v in doc.items() if k not in ('review', 'content_hash', 'member_ids')})
    out['has_comment'] = bool(doc.get('comment'))
    return out


def _requester_owns_team(request, team):
    me = current_employee(request)
    return bool(me) and str(me['_id']) in {str(team.get('manager_id') or ''), str(team.get('leader_id') or '')}


def _may_manage(request, doc):
    """Admin: everything. Manager: what they created, plus reviews of people they manage / teams they run."""
    if is_admin(request):
        return True
    if not is_privileged(request):
        return False
    if doc.get('created_by') == str(getattr(request, 'user_id', '')):
        return True
    if doc['kind'] == 'employee':
        return can_see_employee(request, doc['subject_id'])
    team = teams.find_one({'_id': oid(doc['subject_id'])})
    return bool(team) and _requester_owns_team(request, team)


def _deliver(doc, comment=None):
    update = {'status': 'Delivered', 'delivered_at': now_iso()}
    if comment is not None:
        update['comment'] = str(comment).strip()[:2000]
    saved.update_one({'_id': doc['_id']}, {'$set': update})
    targets = [doc['subject_id']] if doc['kind'] == 'employee' else list(doc.get('member_ids', []))
    for ref in targets:
        notify(user_id_for_employee(ref), 'Your performance review is ready',
               f"{doc['title']} has been shared with you. Open Performance to read it.", type='review')
    return saved.find_one({'_id': doc['_id']})


@csrf_exempt
@require_http_methods(["GET", "POST"])
def saved_reviews(request):
    """
    GET  /api/ai/saved-reviews/?kind=&status= - saved reviews I may manage (staff)
    POST /api/ai/saved-reviews/ {kind: employee|team, subject_id, review, deliver?, comment?} - save (and optionally deliver)
    """
    if not is_privileged(request):
        return forbidden('Only managers and HR can use saved reviews.')
    if request.method == 'GET':
        query = {k: request.GET[k] for k in ('kind', 'status') if request.GET.get(k)}
        rows = [d for d in saved.find(query).sort('created_at', -1).limit(500) if _may_manage(request, d)]
        return JsonResponse({'success': True, 'reviews': [_summary(d) for d in rows]})

    data = body(request)
    kind = data.get('kind')
    review = data.get('review')
    if kind not in KINDS or not isinstance(review, dict) or not review:
        return error("kind must be 'employee' or 'team' and review must be the generated review")
    me = current_employee(request)
    base = {'kind': kind, 'subject_id': str(data.get('subject_id') or ''), 'review': review}
    if kind == 'employee':
        subject = employee_by_ref(base['subject_id'])
        if not subject:
            return error('Employee not found', 404)
        if not can_see_employee(request, str(subject['_id'])):
            return forbidden('You can only review the people who report to you.')
        base.update({'subject_id': str(subject['_id']), 'subject_name': emp_name(subject), 'department': subject.get('department', ''),
                     'team_name': subject.get('team', ''), 'title': f"Performance review — {emp_name(subject)}"})
        overall = (review.get('ratings') or {}).get('overall')
    else:
        team = teams.find_one({'_id': oid(base['subject_id'])})
        if not team:
            return error('Team not found', 404)
        if not (is_admin(request) or _requester_owns_team(request, team)):
            return forbidden("Only administrators or the team's manager or leader can save a team review.")
        base.update({'subject_id': str(team['_id']), 'subject_name': team['name'], 'department': team.get('department', ''),
                     'team_name': team['name'], 'member_ids': [str(m) for m in team.get('members', [])],
                     'title': f"Team review — {team['name']}"})
        overall = review.get('overallScore') or (review.get('ratings') or {}).get('overall')
    digest = hashlib.sha1(json.dumps(review, sort_keys=True, default=str).encode()).hexdigest()
    mine = str(getattr(request, 'user_id', ''))
    same = saved.find_one({'kind': kind, 'subject_id': base['subject_id'], 'content_hash': digest, 'created_by': mine})
    if same:
        doc, already = same, True
    else:
        doc = {**base, 'overall': overall, 'status': 'Draft', 'content_hash': digest, 'created_by': mine,
               'created_by_name': emp_name(me) if me else '', 'created_at': now_iso(),
               'period': datetime.date.today().strftime('%B %Y'), 'comment': ''}
        doc['_id'] = saved.insert_one(dict(doc)).inserted_id
        already = False
    if data.get('deliver') and doc.get('status') != 'Delivered':
        doc = _deliver(doc, data.get('comment'))
    return JsonResponse({'success': True, 'already_saved': already, 'review': serialize(doc)}, status=200 if already else 201)


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def saved_review_detail(request, review_id):
    """
    GET    - the full review (staff who may manage it; the employee once it is delivered)
    PUT    {deliver: true, comment?} or {comment} - deliver it to the employee / team, or edit the note to them
    DELETE - remove a saved review (staff who may manage it)
    """
    doc = saved.find_one({'_id': oid(review_id)}) if oid(review_id) else None
    if not doc:
        return error('Review not found', 404)
    if request.method == 'GET':
        me = current_employee(request)
        mine = bool(me) and doc.get('status') == 'Delivered' and (
            (doc['kind'] == 'employee' and doc['subject_id'] == str(me['_id'])) or
            (doc['kind'] == 'team' and str(me['_id']) in doc.get('member_ids', [])))
        if not (mine or _may_manage(request, doc)):
            return forbidden()
        return JsonResponse({'success': True, 'review': serialize({k: v for k, v in doc.items() if k not in ('content_hash', 'member_ids')})})
    if not _may_manage(request, doc):
        return forbidden()
    if request.method == 'DELETE':
        saved.delete_one({'_id': doc['_id']})
        return JsonResponse({'success': True})
    data = body(request)
    if data.get('deliver'):
        doc = _deliver(doc, data.get('comment'))
    elif 'comment' in data:
        saved.update_one({'_id': doc['_id']}, {'$set': {'comment': str(data['comment']).strip()[:2000]}})
        doc = saved.find_one({'_id': doc['_id']})
    return JsonResponse({'success': True, 'review': _summary(doc)})


@csrf_exempt
@require_http_methods(["GET"])
def my_delivered_reviews(request):
    """GET /api/ai/my-reviews/ - reviews that were delivered to me (my own, and my team's)."""
    me = current_employee(request)
    if not me:
        return JsonResponse({'success': True, 'reviews': []})
    mine = str(me['_id'])
    rows = saved.find({'status': 'Delivered', '$or': [{'kind': 'employee', 'subject_id': mine}, {'kind': 'team', 'member_ids': mine}]}).sort('delivered_at', -1)
    return JsonResponse({'success': True, 'reviews': [serialize({k: v for k, v in d.items() if k not in ('content_hash', 'member_ids')}) for d in rows]})
