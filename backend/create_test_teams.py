import os
import sys
import json
import datetime
from bson import ObjectId

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')
import django
django.setup()

from hr_backend.db import teams as teams_collection, employees as employees_collection

print("Creating test teams in MongoDB...")

# Get existing employees
employees = list(employees_collection.find())
employee_ids = [str(emp['_id']) for emp in employees]

if not employee_ids:
    print("No employees found in database. Please add employees first.")
    sys.exit(1)

# Sample team data
test_teams = [
    {
        "_id": ObjectId(),
        "name": "Development Team",
        "department": "Engineering",
        "description": "Responsible for building and maintaining our core products",
        "leader_id": employee_ids[0] if len(employee_ids) > 0 else None,
        "members": employee_ids[:3] if len(employee_ids) >= 3 else employee_ids,
        "created_at": datetime.datetime.now().isoformat(),
        "updated_at": datetime.datetime.now().isoformat()
    },
    {
        "_id": ObjectId(),
        "name": "Sales Team",
        "department": "Sales",
        "description": "Handles customer acquisition and account management",
        "leader_id": employee_ids[3] if len(employee_ids) > 3 else None,
        "members": employee_ids[3:6] if len(employee_ids) >= 6 else employee_ids,
        "created_at": datetime.datetime.now().isoformat(),
        "updated_at": datetime.datetime.now().isoformat()
    },
    {
        "_id": ObjectId(),
        "name": "HR Team",
        "department": "HR",
        "description": "Manages employee relations and recruitment",
        "leader_id": employee_ids[6] if len(employee_ids) > 6 else None,
        "members": employee_ids[6:9] if len(employee_ids) >= 9 else employee_ids,
        "created_at": datetime.datetime.now().isoformat(),
        "updated_at": datetime.datetime.now().isoformat()
    }
]

# First delete any existing teams
delete_result = teams_collection.delete_many({})
print(f"Deleted {delete_result.deleted_count} existing teams")

# Insert the test teams
result = teams_collection.insert_many(test_teams)
print(f"Created {len(result.inserted_ids)} test teams with IDs:")
for i, team_id in enumerate(result.inserted_ids):
    print(f"{i+1}. {team_id} - {test_teams[i]['name']}")

print("Test teams created successfully!") 