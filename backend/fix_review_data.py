import os
import sys
import django
from datetime import datetime

# Set up Django environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')
django.setup()

from hr_backend.db import team_reviews

def fix_team_review_status():
    # Find all team reviews by manager1 (EMP001) that lack a Completed status
    cursor = team_reviews.find({'reviewer_id': 'EMP001'})
    count = 0
    for doc in cursor:
        if doc.get('status') != 'Completed':
            team_reviews.update_one(
                {'_id': doc['_id']},
                {'$set': {'status': 'Completed'}}
            )
            count += 1
    
    print(f"Successfully fixed {count} team reviews for manager1.")

if __name__ == "__main__":
    fix_team_review_status()
