"""
Outbound webhook events for external systems (HRIS, payroll, Slack automations, ...).

Admins register endpoints under Settings -> Integrations. Each delivery is a JSON POST
    {"id": "<uuid>", "event": "leave.approved", "timestamp": "...", "data": {...}}
signed with HMAC-SHA256 of the raw body using the endpoint's secret:
    X-HR-Signature: sha256=<hex>
Delivery is best-effort in a background thread (synchronous when NOTIFY_SYNC is set, as in the tests); the result of
the last attempt is stored on the webhook.

Events: employee.created, employee.terminated, leave.requested, leave.approved, leave.rejected, payroll.generated,
candidate.applied.
"""
import datetime
import hashlib
import hmac
import ipaddress
import json
import logging
import os
import socket
import threading
import uuid
from urllib.parse import urlparse

import requests

from hr_backend.db import db

logger = logging.getLogger(__name__)
webhooks = db['Webhooks']

EVENTS = ('employee.created', 'employee.terminated', 'leave.requested', 'leave.approved', 'leave.rejected',
          'payroll.generated', 'candidate.applied')


def host_is_public(url):
    """Reject non-http(s) URLs and hosts that resolve to private / loopback / link-local addresses (SSRF guard)."""
    parsed = urlparse(url)
    if parsed.scheme not in ('https', 'http') or not parsed.hostname:
        return False
    if os.environ.get('ALLOW_PRIVATE_WEBHOOKS'):
        return True
    try:
        for info in socket.getaddrinfo(parsed.hostname, parsed.port or (443 if parsed.scheme == 'https' else 80)):
            ip = ipaddress.ip_address(info[4][0])
            if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                return False
    except (socket.gaierror, ValueError):
        return False
    return True


def sign(secret, raw_body):
    return 'sha256=' + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()


def _send(hook, event, data):
    payload = {'id': str(uuid.uuid4()), 'event': event,
               'timestamp': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(), 'data': data}
    raw = json.dumps(payload, default=str).encode()
    status = ''
    try:
        if not host_is_public(hook['url']):
            raise ValueError('target host is not public')
        resp = requests.post(hook['url'], data=raw, timeout=10, headers={
            'Content-Type': 'application/json', 'X-HR-Event': event,
            'X-HR-Signature': sign(hook.get('secret', ''), raw)})
        status = f'HTTP {resp.status_code}'
        ok = resp.status_code < 300
    except Exception as e:
        status, ok = f'error: {str(e)[:100]}', False
        logger.warning('Webhook %s failed: %s', hook.get('url'), e)
    webhooks.update_one({'_id': hook['_id']}, {'$set': {
        'last_delivery': {'event': event, 'status': status, 'ok': ok, 'at': payload['timestamp']}}})
    return ok


def emit(event, data):
    """Queue an event for every active webhook subscribed to it. Never raises."""
    try:
        hooks = [h for h in webhooks.find({'active': True}) if event in h.get('events', []) or '*' in h.get('events', [])]
        for hook in hooks:
            if os.environ.get('NOTIFY_SYNC'):
                _send(hook, event, data)
            else:
                threading.Thread(target=_send, args=(hook, event, data), daemon=True).start()
    except Exception as e:
        logger.warning('emit(%s) failed: %s', event, e)
