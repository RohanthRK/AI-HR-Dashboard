import os
import sys
import json
import datetime
from bson import ObjectId

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')
import django
django.setup()

from hr_backend.db import teams as teams_collection

def serialize_object_ids(obj):
    """Convert MongoDB ObjectId to string for JSON serialization"""
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, dict):
        return {k: serialize_object_ids(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [serialize_object_ids(v) for v in obj]
    return obj

print("Testing MongoDB connection...")

# Get all teams
teams = list(teams_collection.find())
print(f"Found {len(teams)} teams in the MongoDB collection")

if teams:
    # Print team details
    for i, team in enumerate(teams):
        serialized_team = serialize_object_ids(team)
        print(f"\nTeam {i+1}:")
        print(json.dumps(serialized_team, indent=2))
else:
    print("No teams found in MongoDB collection.")
    
print("\nTest completed!") 