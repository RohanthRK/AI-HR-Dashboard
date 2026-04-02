from pymongo import MongoClient
from bson import ObjectId

client = MongoClient('mongodb://localhost:27017/')
db = client['hr_dashboard_db']

def fix_roles():
    # 1. Get correct Role IDs
    admin_role = db.Roles.find_one({'name': 'Admin'})
    manager_role = db.Roles.find_one({'name': 'Manager'})
    employee_role = db.Roles.find_one({'name': 'Employee'})
    
    if not admin_role or not manager_role or not employee_role:
        print("Missing Roles in DB! Please run seed_data.py first or fix roles manually.")
        return

    # 2. Update users
    # Admin
    db.Users.update_one(
        {'username': 'admin'},
        {'$set': {
            'role_id': str(admin_role['_id']),
            'role': 'Admin' # Explicitly set for easy read
        }}
    )
    print("Updated 'admin' user with Admin role")

    # Manager1
    db.Users.update_one(
        {'username': 'manager1'},
        {'$set': {
            'role_id': str(manager_role['_id']),
            'role': 'Manager'
        }}
    )
    print("Updated 'manager1' user with Manager role")

    # Employee1
    db.Users.update_one(
        {'username': 'employee1'},
        {'$set': {
            'role_id': str(employee_role['_id']),
            'role': 'Employee'
        }}
    )
    print("Updated 'employee1' user with Employee role")

    print("\nVerification:")
    for uname in ['admin', 'manager1', 'employee1']:
        u = db.Users.find_one({'username': uname})
        print(f"User {uname}: role={u.get('role')}, role_id={u.get('role_id')}")

if __name__ == "__main__":
    fix_roles()
