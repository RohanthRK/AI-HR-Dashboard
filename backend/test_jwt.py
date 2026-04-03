import os
import sys
import django
import json
import datetime
import jwt
from django.conf import settings

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')
django.setup()

def test_login_logic():
    print("Testing login logic components...")
    
    # 1. Test JWT expiration calculation
    try:
        expiry = datetime.datetime.now(tz=datetime.timezone.utc) + settings.JWT_EXPIRATION_DELTA
        print(f"Expiry calculated: {expiry}")
    except Exception as e:
        print(f"Error calculating expiry: {e}")
        return

    # 2. Test JWT encoding
    try:
        payload = {
            'user_id': '69ba7d6ddeb452f900d65f99',
            'username': 'manager1',
            'role': 'Manager',
            'exp': expiry
        }
        token = jwt.encode(
            payload,
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM
        )
        print(f"Token encoded successfully. Type: {type(token)}")
    except Exception as e:
        print(f"Error encoding JWT: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_login_logic()
