import os
import sys
import django
import json
from datetime import datetime

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')
django.setup()

from hr_backend.db import reviews
from reviews.views import submit_review
from rest_framework.test import APIRequestFactory

def verify_submission():
    factory = APIRequestFactory()
    # Test data with nested scores
    test_data = {
        'scores': {
            'performance': 5,
            'communication': 4,
            'teamwork': 5,
            'initiative': 4,
            'adaptability': 5
        },
        'feedback': 'Automated verification test for nested scores',
        'strengths': 'Reliability, Speed',
        'areas_for_improvement': 'None'
    }
    
    # Create mock request
    request = factory.put('/api/reviews/EMP002/submit/', test_data, format='json')
    request.employee_id = 'EMP001'
    request.user_id = '69cceebc1c88ec0077c3803d'
    request.user_info = {'username': 'manager1'}
    
    # Call the view directly
    response = submit_review(request, 'EMP002')
    print(f"SUBMIT STATUS: {response.status_code}")
    
    # Verify the document in the DB
    doc = reviews.find_one({'employee_id': 'EMP002', 'reviewer_id': 'EMP001'})
    if doc:
        print("DOCUMENT FOUND IN DB")
        print(f"AVG SCORE: {doc.get('average_score')}")
        print(f"SCORES: {doc.get('scores')}")
        print(f"SUCCESS: {'Correct' if doc.get('average_score') == 4.6 else 'Incorrect score'}")
    else:
        print("DOCUMENT NOT FOUND")

if __name__ == "__main__":
    verify_submission()
