"""
Single sign-on with Google and Microsoft (OpenID Connect authorization-code flow).

Only people who already have an account can sign in: the verified e-mail address from the identity provider is
matched against Users.email. Nothing is auto-provisioned, so SSO never grants access an admin has not given.

Environment:
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
    MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT (default "common")
    SSO_BACKEND_URL    public base URL of this API, used for the redirect URI (default: the request's own host)
    FRONTEND_URL       where to send the browser afterwards (default http://localhost:3000)
Redirect URI to register with each provider:  <SSO_BACKEND_URL>/api/auth/sso/<google|microsoft>/callback/
"""
import datetime
import json
import os
import secrets
from urllib.parse import quote, urlencode

import jwt
import requests
from django.conf import settings
from django.http import HttpResponseRedirect, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from hr_backend.db import users

STATE_MINUTES = 10


def _provider_config(name):
    if name == 'google':
        cid, secret = os.environ.get('GOOGLE_CLIENT_ID'), os.environ.get('GOOGLE_CLIENT_SECRET')
        if not (cid and secret):
            return None
        return {'id': 'google', 'name': 'Google', 'client_id': cid, 'client_secret': secret,
                'authorize': 'https://accounts.google.com/o/oauth2/v2/auth',
                'token': 'https://oauth2.googleapis.com/token',
                'userinfo': 'https://openidconnect.googleapis.com/v1/userinfo'}
    if name == 'microsoft':
        cid, secret = os.environ.get('MICROSOFT_CLIENT_ID'), os.environ.get('MICROSOFT_CLIENT_SECRET')
        if not (cid and secret):
            return None
        tenant = os.environ.get('MICROSOFT_TENANT', 'common')
        base = f'https://login.microsoftonline.com/{tenant}/oauth2/v2.0'
        return {'id': 'microsoft', 'name': 'Microsoft', 'client_id': cid, 'client_secret': secret,
                'authorize': f'{base}/authorize', 'token': f'{base}/token',
                'userinfo': 'https://graph.microsoft.com/oidc/userinfo'}
    return None


def _redirect_uri(request, provider):
    base = os.environ.get('SSO_BACKEND_URL') or request.build_absolute_uri('/').rstrip('/')
    return f"{base.rstrip('/')}/api/auth/sso/{provider}/callback/"


def _frontend(path=''):
    return os.environ.get('FRONTEND_URL', 'http://localhost:3000').rstrip('/') + path


def _fail(code):
    return HttpResponseRedirect(_frontend(f'/login?sso_error={quote(code)}'))


@csrf_exempt
@require_http_methods(["GET"])
def providers(request):
    return JsonResponse({'providers': [{'id': p['id'], 'name': p['name']}
                                       for p in map(_provider_config, ('google', 'microsoft')) if p]})


@csrf_exempt
@require_http_methods(["GET"])
def sso_login(request, provider):
    config = _provider_config(provider)
    if not config:
        return _fail('provider_not_configured')
    state = jwt.encode({'p': provider, 'n': secrets.token_urlsafe(8),
                        'exp': datetime.datetime.now(tz=datetime.timezone.utc) + datetime.timedelta(minutes=STATE_MINUTES)},
                       settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    params = {'client_id': config['client_id'], 'redirect_uri': _redirect_uri(request, provider), 'response_type': 'code',
              'scope': 'openid email profile', 'state': state}
    if provider == 'google':
        params['prompt'] = 'select_account'
    return HttpResponseRedirect(f"{config['authorize']}?{urlencode(params)}")


@csrf_exempt
@require_http_methods(["GET"])
def sso_callback(request, provider):
    from .views import build_session  # local import: views imports nothing from here

    config = _provider_config(provider)
    if not config:
        return _fail('provider_not_configured')
    if request.GET.get('error'):
        return _fail('cancelled')
    try:
        state = jwt.decode(request.GET.get('state', ''), settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        if state.get('p') != provider:
            raise ValueError('provider mismatch')
    except Exception:
        return _fail('invalid_state')
    code = request.GET.get('code')
    if not code:
        return _fail('missing_code')
    try:
        token_resp = requests.post(config['token'], timeout=15, data={
            'grant_type': 'authorization_code', 'code': code, 'client_id': config['client_id'],
            'client_secret': config['client_secret'], 'redirect_uri': _redirect_uri(request, provider)})
        token_resp.raise_for_status()
        access_token = token_resp.json()['access_token']
        info_resp = requests.get(config['userinfo'], timeout=15, headers={'Authorization': f'Bearer {access_token}'})
        info_resp.raise_for_status()
        info = info_resp.json()
    except Exception:
        return _fail('provider_error')

    email = str(info.get('email') or info.get('preferred_username') or '').strip().lower()
    if not email or info.get('email_verified') is False:
        return _fail('email_not_verified')
    user = users.find_one({'email': {'$regex': f'^{__import__("re").escape(email)}$', '$options': 'i'}})
    if not user or user.get('active') is False:
        return _fail('no_account')

    token, user_info = build_session(user)
    fragment = urlencode({'sso_token': token, 'sso_user': json.dumps(user_info)})
    return HttpResponseRedirect(_frontend(f'/login#{fragment}'))
