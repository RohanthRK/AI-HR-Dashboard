from pymongo import MongoClient
import json

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['hr_dashboard_db']

# Count total employees
employee_count = db.Employees.count_documents({})
print(f"Found {employee_count} total employees in the database")

# Print sample data
employees = list(db.Employees.find())
if employees:
    print("\nSample employee data (first 3 records):")
    for employee in employees[:3]:  # Print first 3
        # Convert ObjectId to string for JSON serialization
        employee['_id'] = str(employee['_id'])
        if 'department_id' in employee and employee['department_id']:
            employee['department_id'] = str(employee['department_id'])
        if 'user_id' in employee and employee['user_id']:
            employee['user_id'] = str(employee['user_id'])
        print(json.dumps(employee, indent=2))

# Check for departments
departments = list(db.Departments.find())
print(f"\nFound {len(departments)} departments in the database")

# Print sample data
if departments:
    print("\nSample department data:")
    for dept in departments[:3]:  # Print first 3
        dept['_id'] = str(dept['_id'])
        print(json.dumps(dept, indent=2))
else:
    print("No departments found") 