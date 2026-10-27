"""
Run the API test-suite against a throw-away MongoDB database.

    python run_tests.py            # uses mongodb://localhost:27017/
    TEST_MONGODB_URI=... python run_tests.py

The database name is randomised and dropped afterwards, so real data is never touched.
"""
import os
import sys
import uuid

os.environ['MONGODB_URI'] = os.environ.get('TEST_MONGODB_URI', 'mongodb://localhost:27017/')
os.environ['MONGODB_NAME'] = 'hr_test_' + uuid.uuid4().hex[:8]
# Tests must never call real services, whatever is in .env (python-dotenv does not override variables that exist,
# even empty ones, so blank them here before Django loads the settings).
for _name in ('GEMINI_API_KEY', 'GROQ_API_KEY', 'EMAIL_HOST', 'EMAIL_FROM', 'NOTIFY_WEBHOOK_URL', 'GOOGLE_CLIENT_ID',
              'GOOGLE_CLIENT_SECRET', 'MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'):
    os.environ[_name] = ''
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')

if __name__ == '__main__':
    import django
    from django.core.management import execute_from_command_line
    django.setup()
    from hr_backend.db import db
    try:
        execute_from_command_line([sys.argv[0], 'test', 'tests', '-v', '2'] + sys.argv[1:])
    finally:
        db.client.drop_database(os.environ['MONGODB_NAME'])
