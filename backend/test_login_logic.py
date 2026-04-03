import os
import sys
import django
import json
from django.conf import settings
from django.contrib.auth.hashers import check_password

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')
django.setup()

from hr_backend.db import users, roles

def verify_full_login_logic(username, password):
    print(f"Verifying full login logic for {username}...")
    
    # 1. Find user in MongoDB
    try:
        user = users.find_one({'username': username})
        if not user:
            print("USER NOT FOUND")
            return
        print(f"USER FOUND: {user['username']}")
    except Exception as e:
        print(f"DB Error finding user: {e}")
        return

    # 2. Check password
    try:
        stored_password = user.get('password') or user.get('password_hash')
        print(f"Stored password starts with: {stored_password[:20]}...")
        
        is_valid = check_password(password, stored_password)
        print(f"Django check_password result: {is_valid}")
        
    except Exception as e:
        print(f"Error checking password: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_full_login_logic('manager1', 'manager123')
