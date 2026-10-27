"""
LLM access with several providers (Gemini and Groq) and automatic fallback.

Configuration (environment):
    GEMINI_API_KEY, GEMINI_MODEL   (default gemini-2.0-flash)
    GROQ_API_KEY,   GROQ_MODEL     (default llama-3.3-70b-versatile)
    LLM_PROVIDER_ORDER             comma separated, default "gemini,groq"

A provider that is not configured is skipped. When a provider hits a rate limit (HTTP 429 / quota errors) it is put
on a short cooldown and the next provider is tried, so a daily or per-minute limit on one does not stop the app.
`prefer="groq"` moves a provider to the front for one call (Groq is fast for short chat replies, Gemini has the
larger context window for long documents such as resumes).
"""
import os
import time

import requests

GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
DEFAULT_COOLDOWN = 60          # seconds a provider rests after a rate-limit response
REQUEST_TIMEOUT = 45

_cooldown_until = {}           # provider -> unix time
_last_error = {}               # provider -> short message (for the status endpoint)


class LLMNotConfigured(RuntimeError):
    """No provider has an API key."""


class LLMError(RuntimeError):
    """Every configured provider failed."""


class RateLimited(Exception):
    def __init__(self, retry_after=DEFAULT_COOLDOWN):
        super().__init__('rate limited')
        self.retry_after = retry_after


PLACEHOLDER_PREFIXES = ('your', 'changeme', 'xxx', '<', 'replace')


def _key(provider):
    """The API key, or '' when it is missing or still the placeholder from .env.example."""
    value = os.environ.get('GEMINI_API_KEY' if provider == 'gemini' else 'GROQ_API_KEY', '').strip()
    return '' if value.lower().startswith(PLACEHOLDER_PREFIXES) else value


def configured_providers():
    order = [p.strip().lower() for p in os.environ.get('LLM_PROVIDER_ORDER', 'gemini,groq').split(',') if p.strip()]
    ordered = [p for p in order if p in ('gemini', 'groq')]
    ordered += [p for p in ('gemini', 'groq') if p not in ordered]
    return [p for p in ordered if _key(p)]


def is_configured():
    return bool(configured_providers())


def status():
    now = time.time()
    return [{'provider': p, 'configured': bool(_key(p)),
             'model': ' -> '.join(gemini_models()) if p == 'gemini'
             else os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile'),
             'cooldown_seconds': max(int(_cooldown_until.get(p, 0) - now), 0),
             'last_error': _last_error.get(p, '')} for p in ('gemini', 'groq')]


# Google retires model names regularly (gemini-2.0-flash is already gone). `-latest` aliases follow the current model,
# and the chain below is tried in order when a model is retired (404) or overloaded (503).
GEMINI_TIMEOUT_MS = 15000
GEMINI_FALLBACK_MODELS = ('gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest')
MODEL_PENALTY_SECONDS = 300          # a model that timed out or was overloaded is skipped for a few minutes
_model_penalty = {}


def gemini_models():
    """The configured model first, then the fallbacks; models that failed very recently go to the back."""
    configured = os.environ.get('GEMINI_MODEL', '').strip()
    chain = list(dict.fromkeys(([configured] if configured else []) + list(GEMINI_FALLBACK_MODELS)))
    now = time.time()
    healthy = [m for m in chain if _model_penalty.get(m, 0) <= now]
    return healthy + [m for m in chain if m not in healthy]


def _call_gemini(prompt, json_output):
    from google import genai
    from google.genai import types
    from google.genai import errors as genai_errors

    client = genai.Client(api_key=_key('gemini'), http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_MS))
    def config_for(model):
        # HR text is short-form writing, not reasoning: skip the 2.5 models' "thinking" phase, which is most of their latency
        extra = {'thinking_config': types.ThinkingConfig(thinking_budget=0)} if model.startswith('gemini-2.5') else {}
        if json_output:
            extra['response_mime_type'] = 'application/json'
        return types.GenerateContentConfig(**extra) if extra else None
    last_error = None
    rate_limited = False
    for sweep in range(2):                       # a second pass after a short pause rides out brief overloads
        for model in gemini_models():
            try:
                response = client.models.generate_content(model=model, contents=prompt, config=config_for(model))
                text = (response.text or '').strip()
                if text:
                    return text
                last_error = ValueError(f'{model} returned an empty response')
            except genai_errors.APIError as e:
                code = getattr(e, 'code', None)
                if code == 429 or 'RESOURCE_EXHAUSTED' in str(e):
                    rate_limited = True          # quota: try the other models, but do not hammer on a second pass
                    last_error = RateLimited()
                else:
                    last_error = e               # 404 retired / 503 overloaded / 400 ... -> next model
                _model_penalty[model] = time.time() + MODEL_PENALTY_SECONDS
            except Exception as e:               # timeouts, connection resets
                last_error = e
                _model_penalty[model] = time.time() + MODEL_PENALTY_SECONDS
        if rate_limited or sweep == 1:
            break
        time.sleep(1.5)
    if rate_limited and isinstance(last_error, RateLimited):
        raise last_error
    raise last_error or RuntimeError('Gemini failed')


def _call_groq(prompt, json_output):
    payload = {
        'model': os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile'),
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.3,
    }
    if json_output:
        payload['response_format'] = {'type': 'json_object'}
        payload['messages'][0]['content'] += '\n\nRespond with a single valid JSON object only.'
    response = requests.post(GROQ_URL, json=payload, timeout=REQUEST_TIMEOUT,
                             headers={'Authorization': f"Bearer {_key('groq')}"})
    if response.status_code == 429:
        try:
            retry = int(float(response.headers.get('retry-after', DEFAULT_COOLDOWN)))
        except ValueError:
            retry = DEFAULT_COOLDOWN
        raise RateLimited(min(max(retry, 1), 300))
    response.raise_for_status()
    return (response.json()['choices'][0]['message']['content'] or '').strip()


_CALLERS = {'gemini': _call_gemini, 'groq': _call_groq}


def generate(prompt, json_output=False, prefer=None):
    """Return (text, provider_name). Raises LLMNotConfigured / LLMError."""
    providers = configured_providers()
    if not providers:
        raise LLMNotConfigured('Set GEMINI_API_KEY and/or GROQ_API_KEY')
    if prefer in providers:
        providers = [prefer] + [p for p in providers if p != prefer]
    now = time.time()
    # providers that are cooling down go last (they are still tried if nothing else works)
    providers.sort(key=lambda p: _cooldown_until.get(p, 0) > now)
    errors = []
    for provider in providers:
        try:
            text = _CALLERS[provider](prompt, json_output)
            if not text:
                raise ValueError('empty response')
            _last_error.pop(provider, None)
            return text, provider
        except RateLimited as e:
            _cooldown_until[provider] = time.time() + e.retry_after
            _last_error[provider] = f'rate limited, retry in {e.retry_after}s'
            errors.append(f'{provider}: rate limited')
        except Exception as e:  # network, auth, bad response ...
            _last_error[provider] = str(e)[:160]
            errors.append(f'{provider}: {str(e)[:100]}')
    raise LLMError('; '.join(errors))


def generate_text(prompt, json_output=False, prefer=None):
    return generate(prompt, json_output=json_output, prefer=prefer)[0]
