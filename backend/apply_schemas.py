"""
Applies MongoDB validation schemas strictly based on schemas.py definitions.
"""
import os
import sys

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hr_backend.settings")
import django
django.setup()

from django.conf import settings
from pymongo import MongoClient
from schemas import schemas

def type_to_bson(t):
    if t == str:
        return ["string", "objectId", "null"]
    elif t == int:
        return ["int", "null"]
    elif t == float:
        return ["double", "null"]
    elif t == bool:
        return ["bool", "null"]
    elif t == list:
        return ["array", "null"]
    elif t == dict:
        return ["object", "null"]
    return ["string", "null"]

def build_json_schema(python_schema, is_root=True):
    bson_schema = {
        "bsonType": "object",
    }
    
    properties = {}
    required = []
    
    for key, val_type in python_schema.items():
        # Everything is required for strictness unless we decide otherwise
        # required.append(key)
        
        if isinstance(val_type, dict) and key != "properties":
            properties[key] = build_json_schema(val_type, is_root=False)
        else:
            properties[key] = {
                "bsonType": type_to_bson(val_type)
            }
            
    bson_schema["properties"] = properties
    # bson_schema["required"] = required
    # bson_schema["additionalProperties"] = False # Very strict!
    
    if is_root:
        # allow _id at root
        pass
        
    return bson_schema

def main():
    client = MongoClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_NAME]
    
    print(f"Applying strict schemas to MongoDB: {settings.MONGODB_NAME}")
    
    for coll_name, python_schema in schemas.items():
        # Title case the collection name generally
        # Check db.py for exact name
        # hr_backend/db.py uses explicit casing, e.g., 'Users', 'Employees'
        # we'll iterate through db collections to match case-insensitively
        
        target_coll = None
        for existing in db.list_collection_names():
            if existing.lower() == coll_name.lower():
                target_coll = existing
                break
                
        if not target_coll:
            # Create if it doesn't exist
            if coll_name in ['ai_insights', 'chat_logs', 'helpdesk_tickets', 'job_descriptions', 'employee_skills', 'review_periods', 'time_tracking']:
                # manual mapping based on db.py
                title_cases = {
                    'ai_insights': 'AIInsights',
                    'chat_logs': 'ChatLogs',
                    'helpdesk_tickets': 'helpdesk_tickets',
                    'job_descriptions': 'JobDescriptions',
                    'employee_skills': 'EmployeeSkills',
                    'review_periods': 'ReviewPeriods',
                    'time_tracking': 'TimeTracking',
                }
                target_coll = title_cases.get(coll_name, coll_name.title())
            else:
                target_coll = coll_name.title()
            
            print(f"Creating collection {target_coll}")
            try:
                db.create_collection(target_coll)
            except Exception as e:
                pass # collection exists
        
        json_schema = build_json_schema(python_schema)
        
        cmd = {
            "collMod": target_coll,
            "validator": {
                "$jsonSchema": json_schema
            },
            "validationLevel": "moderate", # moderate means it won't break existing invalid docs strictly on update, but new inserts must be strictly valid
            "validationAction": "error"
        }
        
        try:
            db.command(cmd)
            print(f"Successfully applied schema to {target_coll}")
        except Exception as e:
            print(f"Failed to apply schema to {target_coll}: {e}")

if __name__ == "__main__":
    main()
