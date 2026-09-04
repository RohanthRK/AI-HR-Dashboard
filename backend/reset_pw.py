import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')
import django
django.setup()
from django.contrib.auth.hashers import make_password
from hr_backend.db import db
users = db['Users']
new_pw = make_password('Manager@123')
users.update_one({'username': 'malladi.narain'}, {'$set': {'password': new_pw}})
print('Password reset to Manager@123 for malladi.narain')
