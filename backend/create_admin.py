"""
Bootstrap a fresh database: creates the Admin / Manager / Employee roles (if missing) and an administrator account
with a linked employee profile. Safe to re-run; it never touches existing users unless --reset-password is given.

    python create_admin.py --username admin --email admin@company.com            (prompts for the password)
    python create_admin.py --username admin --email admin@company.com --password "a long passphrase"
    docker compose exec backend python create_admin.py --username admin --email admin@company.com

The password must be at least 8 characters.
"""
import argparse
import datetime
import getpass
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')


def create_admin(username, email, password, first_name='System', last_name='Administrator', reset_password=False):
    """Returns a short status string. Importable so tests can call it directly."""
    import django
    django.setup()
    from django.contrib.auth.hashers import make_password
    from hr_backend.db import employees, roles, users

    if len(password) < 8:
        raise ValueError('The password must be at least 8 characters.')
    ids = {}
    for name, perms in (('Admin', ['*']), ('Manager', []), ('Employee', [])):
        doc = roles.find_one({'name': name})
        if not doc:
            doc = {'name': name, 'permissions': perms, 'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()}
            doc['_id'] = roles.insert_one(dict(doc)).inserted_id
        ids[name] = str(doc['_id'])

    existing = users.find_one({'username': username})
    if existing:
        if not reset_password:
            return f"User '{username}' already exists (use --reset-password to change the password)."
        users.update_one({'_id': existing['_id']}, {'$set': {'password': make_password(password), 'role_id': ids['Admin'], 'active': True},
                                                    '$unset': {'password_hash': ''}})
        return f"Password reset and Admin role ensured for '{username}'."

    now = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
    user_id = users.insert_one({'username': username, 'email': email.lower(), 'password': make_password(password),
                                'role_id': ids['Admin'], 'active': True, 'created_at': now}).inserted_id
    code = 'EMP-ADMIN'
    n = 1
    while employees.find_one({'employee_id': code}):
        n += 1
        code = f'EMP-ADMIN{n}'
    emp_id = employees.insert_one({'employee_id': code, 'first_name': first_name, 'last_name': last_name, 'email': email.lower(),
                                   'position': 'Administrator', 'employment_status': 'Active', 'skills': [], 'documents': [],
                                   'hire_date': now[:10], 'user_id': str(user_id), 'created_at': now}).inserted_id
    users.update_one({'_id': user_id}, {'$set': {'employee_id': str(emp_id)}})
    return f"Created administrator '{username}' (employee {code})."


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--username', required=True)
    parser.add_argument('--email', required=True)
    parser.add_argument('--password')
    parser.add_argument('--first-name', default='System')
    parser.add_argument('--last-name', default='Administrator')
    parser.add_argument('--reset-password', action='store_true')
    args = parser.parse_args()
    password = args.password or getpass.getpass('Password: ')
    try:
        print(create_admin(args.username, args.email, password, args.first_name, args.last_name, args.reset_password))
    except ValueError as e:
        sys.exit(str(e))
