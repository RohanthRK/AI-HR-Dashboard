"""Multi-provider LLM layer: ordering, fallback on rate limits, cooldown, and use by the API."""
import os
import unittest
from unittest import mock

from tests.test_api import ApiTestCase
from utils import llm


class LLMProviderTests(unittest.TestCase):
    def setUp(self):
        self.env = mock.patch.dict(os.environ, {'GEMINI_API_KEY': 'g', 'GROQ_API_KEY': 'q'}, clear=False)
        self.env.start()
        os.environ.pop('LLM_PROVIDER_ORDER', None)
        llm._cooldown_until.clear()
        llm._last_error.clear()

    def tearDown(self):
        self.env.stop()
        llm._cooldown_until.clear()

    def callers(self, gemini, groq):
        return mock.patch.dict(llm._CALLERS, {'gemini': gemini, 'groq': groq})

    def test_default_order_and_prefer(self):
        calls = []
        with self.callers(lambda p, j: calls.append('gemini') or 'G', lambda p, j: calls.append('groq') or 'Q'):
            self.assertEqual(llm.generate('x'), ('G', 'gemini'))
            self.assertEqual(llm.generate('x', prefer='groq'), ('Q', 'groq'))
        self.assertEqual(calls, ['gemini', 'groq'])

    def test_rate_limit_falls_back_and_sets_cooldown(self):
        def limited(prompt, json_output):
            raise llm.RateLimited(30)
        with self.callers(limited, lambda p, j: 'from groq'):
            self.assertEqual(llm.generate('x'), ('from groq', 'groq'))
            status = {s['provider']: s for s in llm.status()}
            self.assertGreater(status['gemini']['cooldown_seconds'], 0)
            self.assertIn('rate limited', status['gemini']['last_error'])
        # while gemini cools down, groq is tried first
        calls = []
        with self.callers(lambda p, j: calls.append('gemini') or 'G', lambda p, j: calls.append('groq') or 'Q'):
            self.assertEqual(llm.generate('x')[1], 'groq')
        self.assertEqual(calls, ['groq'])

    def test_errors_fall_back_and_all_failing_raises(self):
        def boom(prompt, json_output):
            raise RuntimeError('network down')
        with self.callers(boom, lambda p, j: 'ok'):
            self.assertEqual(llm.generate('x')[1], 'groq')
        with self.callers(boom, boom):
            with self.assertRaises(llm.LLMError):
                llm.generate('x')

    def test_single_provider_and_none(self):
        with mock.patch.dict(os.environ, {'GEMINI_API_KEY': ''}):
            self.assertEqual(llm.configured_providers(), ['groq'])
        with mock.patch.dict(os.environ, {'GEMINI_API_KEY': '', 'GROQ_API_KEY': ''}):
            self.assertFalse(llm.is_configured())
            with self.assertRaises(llm.LLMNotConfigured):
                llm.generate('x')

    def test_custom_order(self):
        with mock.patch.dict(os.environ, {'LLM_PROVIDER_ORDER': 'groq,gemini'}):
            self.assertEqual(llm.configured_providers(), ['groq', 'gemini'])

    def test_groq_http_call_shape(self):
        class Resp:
            status_code = 200
            headers = {}
            def raise_for_status(self): pass
            def json(self): return {'choices': [{'message': {'content': ' hello '}}]}
        with mock.patch('utils.llm.requests.post', return_value=Resp()) as post:
            self.assertEqual(llm._call_groq('hi', True), 'hello')
            body = post.call_args.kwargs['json']
            self.assertEqual(body['response_format'], {'type': 'json_object'})
            self.assertEqual(post.call_args.kwargs['headers']['Authorization'], 'Bearer q')

        class Limited(Resp):
            status_code = 429
            headers = {'retry-after': '12'}
        with mock.patch('utils.llm.requests.post', return_value=Limited()):
            with self.assertRaises(llm.RateLimited) as ctx:
                llm._call_groq('hi', False)
            self.assertEqual(ctx.exception.retry_after, 12)


class LLMApiTests(ApiTestCase):
    def test_chatbot_uses_groq_then_falls_back(self):
        with mock.patch.dict(os.environ, {'GEMINI_API_KEY': 'g', 'GROQ_API_KEY': 'q'}):
            llm._cooldown_until.clear()
            def limited(prompt, json_output):
                raise llm.RateLimited(5)
            with mock.patch.dict(llm._CALLERS, {'groq': limited, 'gemini': lambda p, j: 'gemini answer'}):
                r = self.post('/api/ai/chatbot/', {'message': 'hello there'}, **self.emp).json()
            self.assertEqual((r['reply'], r['source']), ('gemini answer', 'gemini'))
            llm._cooldown_until.clear()

    def test_provider_status_endpoint_is_staff_only(self):
        self.assertEqual(self.c.get('/api/ai/providers/', **self.emp).status_code, 403)
        data = self.c.get('/api/ai/providers/', **self.admin).json()
        self.assertEqual([p['provider'] for p in data['providers']], ['gemini', 'groq'])

    def test_resume_screening_503_when_nothing_configured(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        with mock.patch.dict(os.environ, {'GEMINI_API_KEY': '', 'GROQ_API_KEY': ''}):
            r = self.c.post('/api/ai/resume-screening/', {'jobTitle': 'Dev', 'skills': 'Go',
                            'resume': SimpleUploadedFile('cv.txt', b'I know Go')}, **self.admin)
        self.assertEqual(r.status_code, 503)


class ResumeParsingTests(ApiTestCase):
    def test_pdf_and_docx_text_reach_the_model(self):
        import io
        import json as _json
        from django.core.files.uploadedfile import SimpleUploadedFile
        from reportlab.pdfgen import canvas
        from docx import Document

        buf = io.BytesIO()
        pdf = canvas.Canvas(buf)
        pdf.drawString(72, 750, 'Jane Doe - Senior Python engineer with PostgreSQL experience')
        pdf.save()
        doc = io.BytesIO()
        d = Document()
        d.add_paragraph('John Roe - Kubernetes and Terraform specialist')
        d.save(doc)

        reply = _json.dumps({'detected_skills': ['Python'], 'score': 8, 'summary': 'ok', 'match_details': {'overall_match': 80},
                             'strengths': [], 'gaps': [], 'recommendations': 'yes'})
        for name, content, needle in (('cv.pdf', buf.getvalue(), 'Senior Python engineer'),
                                      ('cv.docx', doc.getvalue(), 'Kubernetes and Terraform')):
            with mock.patch('ai_analytics.views.generate', return_value=(reply, 'groq')) as gen:
                r = self.c.post('/api/ai/resume-screening/', {'jobTitle': 'Dev', 'skills': 'Python',
                                                              'resume': SimpleUploadedFile(name, content)}, **self.admin)
            self.assertEqual(r.status_code, 200, (name, r.content))
            self.assertIn(needle, gen.call_args.args[0])
            self.assertEqual(r.json()['matching_skills'], ['Python'])
