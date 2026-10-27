"""
Skill catalogue (skill categories and job-role requirements) used by the Skills Assessment page.
Stored in the `SkillCatalog` collection; the defaults below are written on first read.
"""
import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from hr_backend.db import db

catalog_collection = db['SkillCatalog']

DEFAULT_CATEGORIES = [
    {'id': 'tech', 'name': 'Technical Skills', 'skills': [
        {'id': 'js', 'name': 'JavaScript', 'description': 'JavaScript programming language'},
        {'id': 'react', 'name': 'React', 'description': 'React.js library for UI development'},
        {'id': 'node', 'name': 'Node.js', 'description': 'Server-side JavaScript runtime'},
        {'id': 'python', 'name': 'Python', 'description': 'Python programming language'},
        {'id': 'java', 'name': 'Java', 'description': 'Java programming language'},
        {'id': 'aws', 'name': 'AWS', 'description': 'Amazon Web Services cloud platform'},
        {'id': 'docker', 'name': 'Docker', 'description': 'Containerization platform'},
        {'id': 'kubernetes', 'name': 'Kubernetes', 'description': 'Container orchestration system'},
        {'id': 'sql', 'name': 'SQL', 'description': 'Structured Query Language for databases'},
    ]},
    {'id': 'soft', 'name': 'Soft Skills', 'skills': [
        {'id': 'comm', 'name': 'Communication', 'description': 'Effective verbal and written communication'},
        {'id': 'teamwork', 'name': 'Teamwork', 'description': 'Collaborating effectively in a team'},
        {'id': 'problem', 'name': 'Problem Solving', 'description': 'Analytical approach to solving complex problems'},
        {'id': 'leadership', 'name': 'Leadership', 'description': 'Guiding and inspiring a team'},
        {'id': 'time', 'name': 'Time Management', 'description': 'Effective prioritization and time allocation'},
    ]},
    {'id': 'design', 'name': 'Design Skills', 'skills': [
        {'id': 'ui', 'name': 'UI Design', 'description': 'User interface design principles and tools'},
        {'id': 'ux', 'name': 'UX Design', 'description': 'User experience research and design'},
        {'id': 'figma', 'name': 'Figma', 'description': 'Collaborative interface design tool'},
        {'id': 'photoshop', 'name': 'Photoshop', 'description': 'Image editing and design software'},
    ]},
]

DEFAULT_ROLES = [
    {'id': 'frontend', 'title': 'Frontend Developer', 'requiredSkills': ['js', 'react', 'ui'],
     'recommendedSkills': ['node', 'aws', 'ux'],
     'description': 'Builds user interfaces and client-side functionality for web applications.'},
    {'id': 'backend', 'title': 'Backend Developer', 'requiredSkills': ['js', 'node', 'sql'],
     'recommendedSkills': ['python', 'aws', 'docker'],
     'description': 'Develops server-side logic and database integrations for web applications.'},
    {'id': 'fullstack', 'title': 'Full Stack Developer', 'requiredSkills': ['js', 'react', 'node', 'sql'],
     'recommendedSkills': ['aws', 'docker', 'kubernetes'],
     'description': 'Develops both client and server-side components of web applications.'},
    {'id': 'uxdesigner', 'title': 'UX Designer', 'requiredSkills': ['ui', 'ux', 'figma'],
     'recommendedSkills': ['comm', 'problem', 'photoshop'],
     'description': 'Designs user experiences for digital products and services.'},
    {'id': 'projectmgr', 'title': 'Project Manager', 'requiredSkills': ['comm', 'leadership', 'time'],
     'recommendedSkills': ['teamwork', 'problem'],
     'description': 'Oversees and coordinates software development projects from inception to delivery.'},
]

KEY = 'catalog'


def load_catalog():
    doc = catalog_collection.find_one({'_key': KEY})
    if not doc:
        doc = {'_key': KEY, 'categories': DEFAULT_CATEGORIES, 'roles': DEFAULT_ROLES}
        catalog_collection.insert_one(dict(doc))
    return doc['categories'], doc['roles']


def organization_needs(categories, roles):
    """Per skill: employees who have it vs. open recruitment-board jobs that require it."""
    from ai_analytics.insights import skill_list, is_active
    employees = [e for e in db['Employees'].find() if is_active(e)]
    have = {}
    for e in employees:
        for name in {s.lower() for s in skill_list(e)}:
            have[name] = have.get(name, 0) + 1
    open_jobs = [j for j in db['jobs'].find() if str(j.get('status', 'Open')).lower() == 'open']
    needs = []
    for category in categories:
        for skill in category['skills']:
            wanted = skill['name'].lower()
            demand = 0
            for job in open_jobs:
                raw = job.get('skills') or job.get('required_skills') or []
                names = [x.strip().lower() for x in (raw.split(',') if isinstance(raw, str) else raw)]
                if wanted in names:
                    demand += 1
            if demand:
                filled = have.get(wanted, 0)
                needs.append({'id': skill['id'], 'count': filled + demand, 'filled': filled, 'gap': demand})
    return needs


def _valid(categories, roles):
    if not isinstance(categories, list) or not isinstance(roles, list):
        return False
    ids = set()
    for c in categories:
        if not isinstance(c, dict) or not c.get('name') or not isinstance(c.get('skills'), list):
            return False
        for s in c['skills']:
            if not isinstance(s, dict) or not s.get('id') or not s.get('name'):
                return False
            ids.add(s['id'])
    for r in roles:
        if not isinstance(r, dict) or not r.get('id') or not r.get('title'):
            return False
        if not set(r.get('requiredSkills', []) + r.get('recommendedSkills', [])) <= ids:
            return False
    return True


@csrf_exempt
@require_http_methods(["GET", "PUT"])
def catalog_handler(request):
    """GET /api/skills/catalog/ (any user) - PUT /api/skills/catalog/ (Admin) replaces categories and roles."""
    if request.method == 'PUT':
        if getattr(request, 'role', '') != 'Admin':
            return JsonResponse({'error': 'Forbidden', 'message': 'Admin role required'}, status=403)
        try:
            body = json.loads(request.body or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)
        categories, roles = body.get('categories'), body.get('roles')
        if not _valid(categories, roles):
            return JsonResponse({'error': 'Invalid catalogue',
                                 'message': 'Each skill needs id+name; roles may only reference known skill ids'}, status=400)
        catalog_collection.update_one({'_key': KEY}, {'$set': {'categories': categories, 'roles': roles}}, upsert=True)
    categories, roles = load_catalog()
    return JsonResponse({'categories': categories, 'roles': roles,
                         'organizationNeeds': organization_needs(categories, roles)})
