"""
Script to update admin password in the database
"""
from pymongo import MongoClient
from django.contrib.auth.hashers import make_password
import os
import sys
import django

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')
django.setup()

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['hr_dashboard_db']
users = db['Users']

# Create hashed passwords
admin_password_hash = make_password('admin123')
manager_password_hash = make_password('manager123')
employee_password_hash = make_password('employee1')

# Update admin password
admin_result = users.update_one({'username': 'admin'}, {'$set': {'password_hash': admin_password_hash}})
print(f"Updated {admin_result.modified_count} admin user(s)")

# Update HR manager password
manager_result = users.update_one({'username': 'hrmanager'}, {'$set': {'password_hash': manager_password_hash}})
print(f"Updated {manager_result.modified_count} manager user(s)")

# Update employee1 password
employee_result = users.update_one({'username': 'employee1'}, {'$set': {'password_hash': employee_password_hash}})
print(f"Updated {employee_result.modified_count} employee user(s)")

print("Password update completed successfully") 