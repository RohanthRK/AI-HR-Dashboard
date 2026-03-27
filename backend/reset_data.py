"""
Specialized reset script to clear HR data but preserve the Admin user.
Usage: python reset_data.py
"""
import os
import datetime
from pymongo import MongoClient
from bson import ObjectId

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hr_backend.settings")
import django
django.setup()

from django.conf import settings

def main():
    # Connect to MongoDB
    client = MongoClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_NAME]
    
    print(f"Connecting to database: {settings.MONGODB_NAME}")
    
    # 1. Clear HR-specific collections (all records)
    hr_collections = [
        'Employees', 'Departments', 'Teams', 'Documents',
        'Attendance', 'Leaves', 'ReviewPeriods', 'Reviews', 'Payroll',
        'Exports', 'Notifications', 'AIInsights', 'ChatLogs', 'JobDescriptions',
        'EmployeeSkills', 'Candidates', 'Settings', 'expenses', 'assets', 'helpdesk_tickets', 'objectives'
    ]
    
    for coll in hr_collections:
        count = db[coll].count_documents({})
        db[coll].delete_many({})
        print(f"Cleared {coll} collection ({count} records deleted)")
    
    # 2. Handle Users and Roles (Preserve Admin)
    # We'll assume the 'admin' user is the one with username 'admin' or ID 000000000000000000000001
    admin_id = "000000000000000000000001"
    
    # Delete all users EXCEPT the one with that ID or the one named 'admin'
    delete_result = db.Users.delete_many({
        "_id": {"$ne": ObjectId(admin_id) if ObjectId.is_valid(admin_id) else admin_id},
        "username": {"$ne": "admin"}
    })
    print(f"Cleared Users EXCEPT Admin ({delete_result.deleted_count} users deleted)")
    
    # 3. Re-seed default Departments and Teams
    print("Re-seeding default Departments and Teams...")
    
    depts_data = [
        {'name': 'Executive', 'description': 'Company leadership'},
        {'name': 'Engineering', 'description': 'Software and infrastructure'},
        {'name': 'HR', 'description': 'Human Resources'},
        {'name': 'Finance', 'description': 'Finance and accounting'},
        {'name': 'Marketing', 'description': 'Marketing and sales support'},
        {'name': 'Sales', 'description': 'Business development'},
        {'name': 'Customer Support', 'description': 'Customer service'}
    ]
    
    for dept in depts_data:
        dept['_id'] = ObjectId()
        dept['created_at'] = datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
    
    db.Departments.insert_many(depts_data)
    
    teams_data = []
    for dept in depts_data:
        teams_data.append({
            'name': f"{dept['name']} Team",
            'department_id': str(dept['_id']),
            'department': dept['name'],
            'is_active': True,
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        })
    
    db.Teams.insert_many(teams_data)
    print(f"Created {len(depts_data)} Departments and {len(teams_data)} Teams.")
    
    print("Data reset and seeding complete.")

if __name__ == "__main__":
    main()
