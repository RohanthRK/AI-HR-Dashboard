"""
Engagement / pulse / exit surveys.

Collections: `Surveys`, `SurveyResponses`.
Anonymous surveys never store who answered: a one-way hash prevents double submissions, and results stay
hidden until at least MIN_RESPONSES people have answered.
"""
import hashlib
import re
from collections import Counter, defaultdict

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from ai_analytics.insights import THEMES, sentiment_score
from hr_backend.db import db
from utils.auth_utils import forbidden, is_privileged
from utils.hr_common import body, current_employee, error, now_iso, oid, serialize

surveys = db['Surveys']
responses = db['SurveyResponses']

MIN_RESPONSES = 3
SURVEY_TYPES = ('engagement', 'pulse', 'exit')
QUESTION_TYPES = ('rating', 'text', 'choice')

DEFAULT_EXIT_QUESTIONS = [
    {'id': 'q1', 'type': 'rating', 'text': 'Overall, how was your experience working here? (1-5)'},
    {'id': 'q2', 'type': 'rating', 'text': 'How supportive was your manager? (1-5)'},
    {'id': 'q3', 'type': 'choice', 'text': 'Main reason for leaving',
     'options': ['Compensation', 'Career growth', 'Management', 'Work-life balance', 'Relocation', 'Other']},
    {'id': 'q4', 'type': 'text', 'text': 'What could we have done better?'},
]


TEMPLATES = [
    {'id': 'engagement', 'title': 'Employee engagement', 'type': 'engagement', 'anonymous': True, 'questions': [
        {'type': 'rating', 'text': 'I am proud to work for this company. (1-5)'},
        {'type': 'rating', 'text': 'I would recommend this company as a great place to work. (1-5)'},
        {'type': 'rating', 'text': 'My work gives me a sense of purpose. (1-5)'},
        {'type': 'rating', 'text': 'I see a clear path for growth here. (1-5)'},
        {'type': 'text', 'text': 'What is one thing we should change?'}]},
    {'id': 'pulse', 'title': 'Weekly pulse', 'type': 'pulse', 'anonymous': True, 'questions': [
        {'type': 'rating', 'text': 'How was your week? (1-5)'},
        {'type': 'rating', 'text': 'How manageable was your workload? (1-5)'},
        {'type': 'text', 'text': 'Anything blocking you?'}]},
    {'id': 'manager', 'title': 'Manager feedback', 'type': 'engagement', 'anonymous': True, 'questions': [
        {'type': 'rating', 'text': 'My manager gives me clear direction. (1-5)'},
        {'type': 'rating', 'text': 'My manager recognises good work. (1-5)'},
        {'type': 'rating', 'text': 'I can raise concerns with my manager. (1-5)'},
        {'type': 'text', 'text': 'How could your manager support you better?'}]},
    {'id': 'onboarding', 'title': 'Onboarding experience', 'type': 'pulse', 'anonymous': False, 'questions': [
        {'type': 'rating', 'text': 'I had what I needed on day one. (1-5)'},
        {'type': 'rating', 'text': 'I understand my role and goals. (1-5)'},
        {'type': 'choice', 'text': 'Which part of onboarding was most useful?',
         'options': ['Meeting the team', 'Training', 'Documentation', 'Manager support', 'None']},
        {'type': 'text', 'text': 'What would have made your first weeks easier?'}]},
]


@csrf_exempt
@require_http_methods(["GET"])
def templates(request):
    """GET /api/feedback/templates/ - ready-made surveys to start from (Admin/Manager/HR)."""
    if not is_privileged(request):
        return forbidden()
    return JsonResponse({'success': True, 'templates': TEMPLATES})


def _respondent_key(survey, emp):
    return hashlib.sha256(f"{survey['_id']}:{emp['_id']}".encode()).hexdigest()


def _clean_questions(raw):
    questions = []
    for i, q in enumerate(raw or [], start=1):
        text = (q.get('text') or '').strip() if isinstance(q, dict) else ''
        qtype = q.get('type') if isinstance(q, dict) else None
        if not text or qtype not in QUESTION_TYPES:
            return None
        item = {'id': q.get('id') or f'q{i}', 'type': qtype, 'text': text}
        if qtype == 'choice':
            options = [str(o).strip() for o in q.get('options', []) if str(o).strip()]
            if len(options) < 2:
                return None
            item['options'] = options
        questions.append(item)
    return questions or None


def ensure_exit_survey():
    """The standing exit interview, created on first use."""
    doc = surveys.find_one({'type': 'exit'})
    if not doc:
        doc = {'title': 'Exit Interview', 'type': 'exit', 'anonymous': False, 'status': 'Open',
               'questions': DEFAULT_EXIT_QUESTIONS, 'created_at': now_iso(), 'created_by': 'system'}
        doc['_id'] = surveys.insert_one(dict(doc)).inserted_id
    return doc


def _visible_to(request, survey, emp):
    if is_privileged(request):
        return True
    if survey.get('type') == 'exit':
        return bool(emp) and db['Offboarding'].find_one(
            {'employee_id': str(emp['_id']), 'status': {'$in': ['Approved', 'Completed']}}) is not None
    return survey.get('status') == 'Open'


@csrf_exempt
@require_http_methods(["GET", "POST"])
def surveys_handler(request):
    emp = current_employee(request)
    if request.method == 'POST':
        if not is_privileged(request):
            return forbidden()
        data = body(request)
        questions = _clean_questions(data.get('questions'))
        if not (data.get('title') or '').strip() or not questions or data.get('type', 'engagement') not in SURVEY_TYPES:
            return error('Need a title, a valid type and at least one valid question')
        doc = {'title': data['title'].strip(), 'type': data.get('type', 'engagement'),
               'anonymous': bool(data.get('anonymous', True)), 'status': 'Open', 'questions': questions,
               'created_at': now_iso(), 'created_by': str(getattr(request, 'user_id', ''))}
        doc['_id'] = surveys.insert_one(dict(doc)).inserted_id
        return JsonResponse({'success': True, 'survey': serialize(doc)}, status=201)

    result = []
    for s in surveys.find().sort('created_at', -1):
        if not _visible_to(request, s, emp):
            continue
        item = serialize(s)
        item['response_count'] = responses.count_documents({'survey_id': str(s['_id'])})
        item['responded'] = bool(emp) and responses.find_one(
            {'survey_id': str(s['_id']), 'respondent': _respondent_key(s, emp)}) is not None
        result.append(item)
    return JsonResponse({'success': True, 'surveys': result})


@csrf_exempt
@require_http_methods(["GET"])
def survey_detail(request, survey_id):
    s = surveys.find_one({'_id': oid(survey_id)}) if oid(survey_id) else None
    if not s:
        return error('Survey not found', 404)
    if not _visible_to(request, s, current_employee(request)):
        return forbidden()
    return JsonResponse({'success': True, 'survey': serialize(s)})


@csrf_exempt
@require_http_methods(["POST"])
def respond(request, survey_id):
    """POST /api/feedback/surveys/<id>/respond/ {answers: {question_id: value}}"""
    s = surveys.find_one({'_id': oid(survey_id)}) if oid(survey_id) else None
    if not s:
        return error('Survey not found', 404)
    emp = current_employee(request)
    if not emp:
        return error('Account is not linked to an employee profile')
    if s.get('status') != 'Open':
        return error('This survey is closed')
    if not _visible_to(request, s, emp):
        return forbidden()
    key = _respondent_key(s, emp)
    if responses.find_one({'survey_id': str(s['_id']), 'respondent': key}):
        return error('You have already responded', 409)
    answers = body(request).get('answers') or {}
    clean = {}
    for q in s['questions']:
        value = answers.get(q['id'])
        if value in (None, ''):
            continue
        if q['type'] == 'rating':
            try:
                value = int(value)
            except (TypeError, ValueError):
                return error(f"Answer to '{q['text']}' must be a number")
            if not 1 <= value <= 5:
                return error('Ratings must be between 1 and 5')
        elif q['type'] == 'choice':
            if value not in q['options']:
                return error(f"Invalid choice for '{q['text']}'")
        else:
            value = str(value).strip()[:2000]
        clean[q['id']] = value
    if not clean:
        return error('No answers provided')
    doc = {'survey_id': str(s['_id']), 'respondent': key, 'answers': clean, 'submitted_at': now_iso()}
    if not s.get('anonymous', True):
        doc['employee_id'] = str(emp['_id'])
    responses.insert_one(doc)
    return JsonResponse({'success': True}, status=201)


@csrf_exempt
@require_http_methods(["PUT"])
def close_survey(request, survey_id):
    if not is_privileged(request):
        return forbidden()
    _id = oid(survey_id)
    if not _id or not surveys.find_one({'_id': _id}):
        return error('Survey not found', 404)
    status = 'Open' if body(request).get('status') == 'Open' else 'Closed'
    surveys.update_one({'_id': _id}, {'$set': {'status': status}})
    return JsonResponse({'success': True, 'status': status})


def survey_results(s):
    rows = list(responses.find({'survey_id': str(s['_id'])}))
    out = {'survey_id': str(s['_id']), 'title': s['title'], 'type': s['type'], 'response_count': len(rows),
           'questions': [], 'text_themes': [], 'sentiment': None, 'hidden': False}
    if s.get('anonymous', True) and len(rows) < MIN_RESPONSES:
        out['hidden'] = True
        out['message'] = f'Results are hidden until at least {MIN_RESPONSES} people respond (protects anonymity).'
        return out
    texts = []
    for q in s['questions']:
        vals = [r['answers'][q['id']] for r in rows if q['id'] in r['answers']]
        item = {'id': q['id'], 'text': q['text'], 'type': q['type'], 'answered': len(vals)}
        if q['type'] == 'rating':
            item['average'] = round(sum(vals) / len(vals), 2) if vals else None
            item['distribution'] = {str(i): vals.count(i) for i in range(1, 6)}
        elif q['type'] == 'choice':
            item['counts'] = dict(Counter(vals))
        else:
            item['answers'] = [{'text': v, 'sentiment': sentiment_score(v)} for v in vals]
            texts.extend(vals)
        out['questions'].append(item)
    scores = [x for x in (sentiment_score(t) for t in texts) if x is not None]
    out['sentiment'] = round((sum(scores) / len(scores) + 1) * 50) if scores else None
    themes = defaultdict(lambda: {'mentions': 0, 'negative': 0})
    for t in texts:
        words = set(re.findall(r"[a-z']+", t.lower()))
        for theme, keywords in THEMES.items():
            if words & keywords:
                themes[theme]['mentions'] += 1
                if (sentiment_score(t) or 0) < 0:
                    themes[theme]['negative'] += 1
    out['text_themes'] = sorted(({'theme': k, **v} for k, v in themes.items()), key=lambda x: -x['negative'] or -x['mentions'])
    ratings = [q['average'] for q in out['questions'] if q['type'] == 'rating' and q['average'] is not None]
    out['engagement_score'] = round(sum(ratings) / len(ratings), 2) if ratings else None
    return out


@csrf_exempt
@require_http_methods(["POST"])
def summarize(request, survey_id):
    """POST /api/feedback/surveys/<id>/summary/ - AI summary of the answers (never for hidden anonymous results)."""
    if not is_privileged(request):
        return forbidden()
    s = surveys.find_one({'_id': oid(survey_id)}) if oid(survey_id) else None
    if not s:
        return error('Survey not found', 404)
    res = survey_results(s)
    if res['hidden']:
        return error(res['message'], 409)
    from ai_analytics import assistant
    from utils.llm import LLMError, LLMNotConfigured
    try:
        summary = assistant.survey_summary(s, res)
    except LLMNotConfigured:
        return error('No AI provider is configured (set GEMINI_API_KEY or GROQ_API_KEY).', 503)
    except LLMError as e:
        return error(f'AI providers unavailable: {e}', 503)
    if summary is None:
        return error('There are no answers to summarise yet.', 409)
    return JsonResponse({'success': True, 'summary': summary})


@csrf_exempt
@require_http_methods(["GET"])
def results(request, survey_id):
    if not is_privileged(request):
        return forbidden()
    s = surveys.find_one({'_id': oid(survey_id)}) if oid(survey_id) else None
    if not s:
        return error('Survey not found', 404)
    return JsonResponse({'success': True, 'results': survey_results(s)})
