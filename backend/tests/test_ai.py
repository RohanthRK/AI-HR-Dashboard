"""AI features: prompts are grounded in real data and bad model output never breaks the endpoints."""
import json
from unittest import mock

from hr_backend.db import db, employees
from tests.test_api import ApiTestCase
from utils import llm


def fake(answer):
    """Patch the model call used by assistant.py; `answer` is a str, dict (JSON) or callable(prompt) -> str|dict."""
    def _generate(prompt, json_output=False, prefer=None):
        value = answer(prompt) if callable(answer) else answer
        return (json.dumps(value) if isinstance(value, (dict, list)) else value), 'gemini'
    return mock.patch('ai_analytics.assistant.generate', side_effect=_generate)


def configured():
    return mock.patch.multiple('ai_analytics.views', is_configured=lambda: True), \
        mock.patch('ai_analytics.assistant.is_configured', return_value=True)


class AiTestCase(ApiTestCase):
    def setUp(self):
        a, b = configured()
        a.start(); b.start()
        self.addCleanup(a.stop); self.addCleanup(b.stop)


class ParseJsonTests(ApiTestCase):
    def test_tolerates_fences_and_prose(self):
        from ai_analytics.assistant import parse_json
        self.assertEqual(parse_json('```json\n{"a": 1}\n```'), {'a': 1})
        self.assertEqual(parse_json('Sure! Here you go: {"a": [1, 2]} hope it helps'), {'a': [1, 2]})
        with self.assertRaises(ValueError):
            parse_json('no json at all')

    def test_ask_json_retries_once_then_fails_cleanly(self):
        from ai_analytics.assistant import ask_json
        calls = []

        def flaky(prompt, json_output=False, prefer=None):
            calls.append(prompt)
            return ('garbage' if len(calls) == 1 else '{"summary": "ok"}'), 'gemini'
        with mock.patch('ai_analytics.assistant.generate', side_effect=flaky):
            self.assertEqual(ask_json('p', required=('summary',))[0], {'summary': 'ok'})
        self.assertEqual(len(calls), 2)
        with mock.patch('ai_analytics.assistant.generate', return_value=('nope', 'gemini')):
            with self.assertRaises(llm.LLMError):
                ask_json('p')


class ChatbotAiTests(AiTestCase):
    def test_prompt_contains_only_the_askers_own_facts_and_history(self):
        db['Payroll'].insert_one({'employee_id': str(self.emp_emp), 'period': 'May 2026', 'date': '2026-05-31', 'net_salary': 4321.5,
                                  'gross_salary': 5000.0, 'tax': 500.0, 'status': 'Paid'})
        db['Payroll'].insert_one({'employee_id': str(self.admin_emp), 'period': 'May 2026', 'date': '2026-05-31', 'net_salary': 99999.0,
                                  'gross_salary': 120000.0, 'tax': 1.0, 'status': 'Paid'})
        seen = {}

        def answer(prompt):
            seen['prompt'] = prompt
            return 'Your net pay was 4,321.50.'
        with fake(answer):
            r = self.post('/api/ai/chatbot/', {'message': 'what was my last payslip?',
                                               'history': [{'from': 'user', 'text': 'hi'}, {'from': 'bot', 'text': 'hello!'}]}, **self.emp).json()
        self.assertEqual((r['reply'], r['source']), ('Your net pay was 4,321.50.', 'gemini'))
        prompt = seen['prompt']
        self.assertIn('Bob Worker', prompt)
        self.assertIn('4,321.50', prompt)
        self.assertNotIn('99,999', prompt)                       # a colleague's payslip never reaches the model
        self.assertIn('Employee: hi', prompt)
        self.assertIn('Assistant: hello!', prompt)
        self.assertIn('18 Earned Leave days', prompt)

    def test_model_failure_falls_back_to_rules(self):
        with mock.patch('ai_analytics.assistant.generate', side_effect=llm.LLMError('all providers down')):
            r = self.post('/api/ai/chatbot/', {'message': 'how many leave days left?'}, **self.emp).json()
        self.assertEqual(r['source'], 'fallback')
        self.assertIn('18', r['reply'])


class ReviewAiTests(AiTestCase):
    def test_review_is_polished_but_ratings_stay_data_driven(self):
        db['objectives'].insert_one({'title': 'o', 'employee_id': str(self.emp_emp), 'progress': 90, 'status': 'Completed'})
        polished = {'summary': 'Bob delivers reliably.', 'strengths': ['Finishes objectives', 'Steady hours'],
                    'areas_for_improvement': ['Share progress earlier'], 'key_achievements': ['Completed 1 of 1 objectives'],
                    'career_recommendation': 'Consider a senior role.', 'suggested_training': ['Leadership Essentials']}
        with fake(polished) as gen:
            r = self.post('/api/ai/generate-review/', {'employee_id': str(self.emp_emp)}, **self.admin).json()
        self.assertEqual(r['summary'], 'Bob delivers reliably.')
        self.assertEqual(r['career_growth']['recommendation'], 'Consider a senior role.')
        self.assertEqual(r['ratings']['technical_skills'], 90)   # numbers come from the data, not the model
        self.assertEqual(r['source'], 'gemini')
        self.assertIn('"objective_progress' if False else 'average_progress_pct', gen.call_args.args[0])

    def test_unusable_model_output_keeps_the_data_draft(self):
        with fake('this is not json'):
            r = self.post('/api/ai/generate-review/', {'employee_id': str(self.emp_emp)}, **self.admin)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['source'], 'data')


class TeamReviewTests(AiTestCase):
    def setUp(self):
        super().setUp()
        self.team = db['Teams'].insert_one({'name': 'Alpha', 'department': 'Engineering', 'manager_id': str(self.admin_emp),
                                            'leader_id': str(self.admin_emp), 'members': [str(self.admin_emp), str(self.emp_emp)],
                                            'employees': []}).inserted_id
        db['Reviews'].insert_many([
            {'employee_id': str(self.admin_emp), 'average_score': 4.5, 'scores': {'performance': 5, 'teamwork': 4, 'initiative': 5}},
            {'employee_id': str(self.emp_emp), 'average_score': 3.5, 'scores': {'performance': 4, 'teamwork': 3, 'initiative': 3}}])
        db['objectives'].insert_one({'title': 'o', 'employee_id': str(self.emp_emp), 'progress': 60})

    def test_ratings_only_is_computed_from_data_without_calling_the_model(self):
        with mock.patch('ai_analytics.assistant.generate', side_effect=AssertionError('model must not be called')):
            r = self.post('/api/ai/generate-team-review/', {'team_id': str(self.team), 'ratings_only': True}, **self.admin).json()
        self.assertEqual(r['ratings']['quality'], 90)            # mean(5, 4) * 20
        self.assertEqual(r['ratings']['collaboration'], 70)      # mean(4, 3) * 20
        self.assertEqual(r['memberCount'], 2)

    def test_manager_ratings_override_and_notes_reach_the_prompt(self):
        out = {'summary': 'Alpha is strong.', 'strengths': ['Quality'], 'areas_for_improvement': ['Collaboration'],
               'achievements': ['Shipped billing'], 'goals': ['Raise collaboration by 5 points']}
        with fake(out) as gen:
            r = self.post('/api/ai/generate-team-review/', {'team_id': str(self.team), 'ratings': {'quality': 50},
                                                            'notes': {'achievements': 'Shipped billing'}}, **self.admin).json()
        self.assertEqual(r['ratings']['quality'], 50)
        self.assertEqual(r['summary'], 'Alpha is strong.')
        self.assertEqual(r['goals'], ['Raise collaboration by 5 points'])
        self.assertIn('Shipped billing', gen.call_args.args[0])
        self.assertEqual(self.post('/api/ai/generate-team-review/', {'team_id': str(self.team)}, **self.emp).status_code, 403)
        self.assertEqual(self.post('/api/ai/generate-team-review/', {'team_id': '0' * 24}, **self.admin).status_code, 404)


class NarrativeAndPlanTests(AiTestCase):
    def test_briefing_is_staff_only_cached_and_503_without_ai(self):
        from ai_analytics import assistant
        assistant._narrative_cache.clear()
        out = {'headline': 'All good.', 'highlights': ['a'], 'risks': ['b'], 'actions': ['c']}
        self.assertEqual(self.c.get('/api/ai/insights-summary/', **self.emp).status_code, 403)
        with fake(out) as gen:
            first = self.c.get('/api/ai/insights-summary/', **self.admin).json()
            again = self.c.get('/api/ai/insights-summary/', **self.admin).json()
            self.assertEqual(gen.call_count, 1)                   # second call served from the cache
            self.c.get('/api/ai/insights-summary/?refresh=1', **self.admin)
            self.assertEqual(gen.call_count, 2)
        self.assertEqual((first['headline'], again['generated_at']), ('All good.', first['generated_at']))
        self.assertEqual(first['facts']['headcount'], 3)

    def test_briefing_without_provider(self):
        with mock.patch('ai_analytics.views.is_configured', return_value=False):
            self.assertEqual(self.c.get('/api/ai/insights-summary/', **self.admin).status_code, 503)

    def test_development_plan_only_uses_real_course_titles(self):
        db['Courses'].insert_one({'title': 'Rust Basics', 'skills': ['Rust'], 'mandatory': False})
        self.post('/api/recruitment/jobs/', {'title': 'Systems', 'department': 'Engineering', 'skills': 'Rust', 'status': 'Open'}, **self.admin)
        employees.update_one({'_id': self.emp_emp}, {'$set': {'department': 'Engineering'}})
        out = {'focus_areas': ['Rust'], 'plan': [{'when': 'Weeks 1-4', 'action': 'Take Rust Basics', 'outcome': 'Can write Rust'}],
               'recommended_courses': ['Rust Basics', 'Invented Course'], 'mentoring_suggestion': 'Pair with Ada.', 'success_measures': ['Ship a Rust PR']}
        with fake(out) as gen:
            r = self.post('/api/ai/development-plan/', {'employee_id': str(self.emp_emp)}, **self.emp).json()
        self.assertEqual(r['recommended_courses'], ['Rust Basics'])   # hallucinated titles are dropped
        self.assertIn('rust', r['skill_gaps'])
        self.assertIn('Rust Basics', gen.call_args.args[0])
        self.assertEqual(self.post('/api/ai/development-plan/', {'employee_id': str(self.admin_emp)}, **self.emp).status_code, 403)

    def test_development_plan_fallback_without_model(self):
        with mock.patch('ai_analytics.assistant.generate', side_effect=llm.LLMError('down')):
            r = self.post('/api/ai/development-plan/', {'employee_id': str(self.emp_emp)}, **self.emp)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['source'], 'data')

    def test_unrelated_openings_do_not_create_skill_gaps(self):
        # Bob is in Engineering; a Sales opening must not make him "need" sales skills
        employees.update_one({'_id': self.emp_emp}, {'$set': {'department': 'Engineering'}})
        self.post('/api/recruitment/jobs/', {'title': 'Account Exec', 'department': 'Sales', 'skills': 'Negotiation, HubSpot', 'status': 'Open'}, **self.admin)
        with mock.patch('ai_analytics.assistant.generate', side_effect=llm.LLMError('down')):
            r = self.post('/api/ai/development-plan/', {'employee_id': str(self.emp_emp)}, **self.emp).json()
        self.assertNotIn('negotiation', r['skill_gaps'])


class SurveySummaryTests(AiTestCase):
    def test_summary_requires_enough_responses_and_staff(self):
        s = self.post('/api/feedback/surveys/', {'title': 'Pulse', 'type': 'pulse', 'anonymous': True, 'questions': [
            {'id': 'a', 'type': 'rating', 'text': 'Happy?'}, {'id': 'b', 'type': 'text', 'text': 'Comments'}]}, **self.admin).json()['survey']
        summary_url = f"/api/feedback/surveys/{s['_id']}/summary/"
        self.assertEqual(self.post(summary_url, {}, **self.emp).status_code, 403)
        self.assertEqual(self.post(summary_url, {}, **self.admin).status_code, 409)           # < 3 responses: stays hidden
        for i in range(3):
            db['SurveyResponses'].insert_one({'survey_id': s['_id'], 'respondent': f'r{i}', 'answers': {'a': 4, 'b': 'Workload is stressful'}})
        out = {'summary': 'Mostly positive; workload is a concern.', 'themes': [{'theme': 'Workload', 'sentiment': 'negative', 'evidence': 'stress'}],
               'recommended_actions': ['Review staffing']}
        seen = {}
        with fake(lambda p: seen.setdefault('p', p) and out):
            r = self.post(summary_url, {}, **self.admin).json()['summary']
        self.assertEqual(r['themes'][0]['theme'], 'Workload')
        self.assertIn('Workload is stressful', seen['p'])
        with mock.patch('ai_analytics.assistant.generate', side_effect=llm.LLMNotConfigured('none')):
            self.assertEqual(self.post(summary_url, {}, **self.admin).status_code, 503)


class JobMatchNotesTests(AiTestCase):
    def test_notes_come_from_the_model_for_listed_employees_only(self):
        job = self.post('/api/recruitment/jobs/', {'title': 'Backend', 'skills': 'Python, SQL'}, **self.admin).json()['job']
        ada = str(self.admin_emp)
        with fake({'notes': {ada: 'Ada covers both skills.', 'someone-else': 'ignored'}}):
            r = self.post('/api/ai/job-matching/', {'job_id': job['_id']}, **self.admin).json()
        by_id = {m['employee_id']: m for m in r}
        self.assertEqual(by_id[ada]['notes'], 'Ada covers both skills.')
        self.assertEqual(by_id[ada]['notes_source'], 'ai')
        self.assertTrue(all(m['employee_id'] != 'someone-else' for m in r))
        with mock.patch('ai_analytics.assistant.generate', side_effect=llm.LLMError('down')):
            r2 = self.post('/api/ai/job-matching/', {'job_id': job['_id']}, **self.admin).json()
        self.assertIn('required skills', r2[0]['notes'])                                  # deterministic note kept


class GeminiModelChainTests(ApiTestCase):
    def test_retired_and_overloaded_models_fall_through_the_chain(self):
        import os
        from google.genai import errors
        with mock.patch.dict(os.environ, {'GEMINI_API_KEY': 'k', 'GEMINI_MODEL': 'gemini-2.0-flash'}):
            self.assertEqual(llm.gemini_models()[0], 'gemini-2.0-flash')
            tried = []

            class Client:
                def __init__(self, **kw):
                    self.models = self

                def generate_content(self, model, contents, config=None):
                    tried.append(model)
                    if model == 'gemini-2.0-flash':
                        raise errors.ClientError(404, {'error': {'message': 'no longer available'}}, None)
                    if model == 'gemini-2.5-flash':
                        raise errors.ServerError(503, {'error': {'message': 'overloaded'}}, None)
                    return mock.Mock(text='answer from ' + model)
            llm._model_penalty.clear()
            with mock.patch('google.genai.Client', Client):
                self.assertEqual(llm._call_gemini('hi', False), 'answer from gemini-2.5-flash-lite')
                self.assertEqual(tried, ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'])
                # the failing models are remembered: the next request goes straight to the one that works
                tried.clear()
                self.assertEqual(llm._call_gemini('again', False), 'answer from gemini-2.5-flash-lite')
                self.assertEqual(tried[0], 'gemini-2.5-flash-lite')
            llm._model_penalty.clear()

    def test_placeholder_keys_count_as_unconfigured(self):
        import os
        with mock.patch.dict(os.environ, {'GEMINI_API_KEY': 'your_gemini_api_key', 'GROQ_API_KEY': 'your_groq_api_key'}):
            self.assertFalse(llm.is_configured())
        with mock.patch.dict(os.environ, {'GEMINI_API_KEY': 'AIzaSyReal', 'GROQ_API_KEY': ''}):
            self.assertEqual(llm.configured_providers(), ['gemini'])
