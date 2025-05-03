"""
Check the MongoDB database and print out the collections and their document counts.
"""
import os
import sys
from pymongo import MongoClient
import json
from bson import ObjectId

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hr_backend.settings")
import django
django.setup()

from django.conf import settings

class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super().default(obj)

def main():
    # Connect to MongoDB
    try:
        client = MongoClient(settings.MONGODB_URI)
        db = client[settings.MONGODB_NAME]
        print(f"Successfully connected to MongoDB at {settings.MONGODB_URI}")
        print(f"Database: {settings.MONGODB_NAME}")
        
        # Print collections
        collections = db.list_collection_names()
        print(f"\nFound {len(collections)} collections:")
        for collection in collections:
            count = db[collection].count_documents({})
            print(f"- {collection}: {count} documents")
        
        # Print employees if they exist
        if "Employees" in collections:
            employees = list(db.Employees.find({}).limit(5))
            if employees:
                print("\nSample employees:")
                for emp in employees:
                    print(json.dumps(emp, cls=JSONEncoder, indent=2))
            else:
                print("\nNo employees found in the Employees collection.")
                
        # Print departments if they exist
        if "Departments" in collections:
            departments = list(db.Departments.find({}))
            if departments:
                print("\nDepartments:")
                for dept in departments:
                    print(json.dumps(dept, cls=JSONEncoder, indent=2))
            else:
                print("\nNo departments found in the Departments collection.")
                
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 