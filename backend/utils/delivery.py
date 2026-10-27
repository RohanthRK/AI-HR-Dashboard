"""
Optional delivery of notifications outside the app: e-mail (SMTP) and a Slack / Microsoft Teams incoming webhook.

Environment:
    EMAIL_HOST, EMAIL_PORT (587), EMAIL_USER, EMAIL_PASSWORD, EMAIL_FROM, EMAIL_USE_TLS (true)
    NOTIFY_WEBHOOK_URL    Slack or Teams incoming-webhook URL (receives {"text": "..."})

Delivery is best-effort and runs in a background thread so it never slows or breaks the request.
An admin switches each channel on in Settings -> Notifications.
"""
import logging
import os
import smtplib
import threading
from email.message import EmailMessage

import requests

from hr_backend.db import users

logger = logging.getLogger(__name__)


def email_configured():
    return bool(os.environ.get('EMAIL_HOST') and os.environ.get('EMAIL_FROM'))


def webhook_configured():
    return bool(os.environ.get('NOTIFY_WEBHOOK_URL'))


def integrations():
    return {'emailConfigured': email_configured(), 'webhookConfigured': webhook_configured()}


def send_email(to_address, subject, body):
    msg = EmailMessage()
    msg['From'] = os.environ['EMAIL_FROM']
    msg['To'] = to_address
    msg['Subject'] = subject
    msg.set_content(body)
    with smtplib.SMTP(os.environ['EMAIL_HOST'], int(os.environ.get('EMAIL_PORT', 587)), timeout=15) as smtp:
        if os.environ.get('EMAIL_USE_TLS', 'true').lower() in ('true', '1', 'yes'):
            smtp.starttls()
        if os.environ.get('EMAIL_USER'):
            smtp.login(os.environ['EMAIL_USER'], os.environ.get('EMAIL_PASSWORD', ''))
        smtp.send_message(msg)


def send_webhook(text):
    requests.post(os.environ['NOTIFY_WEBHOOK_URL'], json={'text': text}, timeout=10).raise_for_status()


def _deliver(user_id, title, message, email_on, webhook_on):
    try:
        if email_on and email_configured():
            from bson import ObjectId
            user = users.find_one({'_id': ObjectId(str(user_id))}) or {}
            if user.get('email'):
                send_email(user['email'], title, message)
        if webhook_on and webhook_configured():
            who = ''
            from bson import ObjectId
            user = users.find_one({'_id': ObjectId(str(user_id))}) or {}
            who = f" ({user.get('username')})" if user.get('username') else ''
            send_webhook(f"*{title}*{who}\n{message}")
    except Exception as e:  # never let a delivery failure surface to the user
        logger.warning('Notification delivery failed: %s', e)


def deliver(user_id, title, message, email_on, webhook_on):
    """Fire-and-forget (synchronous when NOTIFY_SYNC is set, which the tests use)."""
    if not (email_on or webhook_on):
        return
    if os.environ.get('NOTIFY_SYNC'):
        _deliver(user_id, title, message, email_on, webhook_on)
    else:
        threading.Thread(target=_deliver, args=(user_id, title, message, email_on, webhook_on), daemon=True).start()
