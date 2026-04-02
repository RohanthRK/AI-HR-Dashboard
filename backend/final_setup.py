from hr_backend.db import users, teams, employees
from django.contrib.auth.hashers import make_password
from bson import ObjectId

def setup():
    # 1. Clean up
    users.delete_many({'username': {'$in': ['manager1', 'employee1', 'admin']}})
    employees.delete_many({'$or': [
        {'email': {'$in': ['manager1@example.com', 'employee1@example.com', 'admin@example.com']}},
        {'employee_id': {'$in': ['EMP000', 'EMP001', 'EMP002']}}
    ]})
    
    # 2. Create Admin
    admin_uid = ObjectId()
    admin_eid = 'EMP000'
    users.insert_one({
        '_id': admin_uid,
        'username': 'admin',
        'password': make_password('password123'),
        'role': 'Admin',
        'email': 'admin@example.com',
        'employee_id': admin_eid,
        'active': True
    })
    employees.insert_one({
        'employee_id': admin_eid,
        'first_name': 'Admin',
        'last_name': 'User',
        'email': 'admin@example.com',
        'department': 'HR'
    })
    print("Created admin")

    # 3. Create Manager (Team Lead)
    manager_uid = ObjectId()
    manager_eid = 'EMP001'
    users.insert_one({
        '_id': manager_uid,
        'username': 'manager1',
        'password': make_password('password123'),
        'role': 'Manager',
        'email': 'manager1@example.com',
        'employee_id': manager_eid,
        'active': True
    })
    employees.insert_one({
        'employee_id': manager_eid,
        'first_name': 'Manager',
        'last_name': 'One',
        'email': 'manager1@example.com',
        'department': 'Engineering'
    })
    print(f"Created manager1: UID={manager_uid}, EID={manager_eid}")

    # 4. Create Employee
    employee_uid = ObjectId()
    employee_eid = 'EMP002'
    users.insert_one({
        '_id': employee_uid,
        'username': 'employee1',
        'password': make_password('password123'),
        'role': 'Employee',
        'email': 'employee1@example.com',
        'employee_id': employee_eid,
        'active': True
    })
    employees.insert_one({
        'employee_id': employee_eid,
        'first_name': 'Employee',
        'last_name': 'One',
        'email': 'employee1@example.com',
        'department': 'Engineering'
    })
    print(f"Created employee1: UID={employee_uid}, EID={employee_eid}")

    # 5. Setup Team
    teams.update_one(
        {'name': 'Engineering Team'},
        {'$set': {
            'manager_id': str(employee_uid), # Wait, manager1 should be lead
            'manager_id': str(manager_uid),
            'members': [str(employee_eid)]
        }},
        upsert=True
    )
    print("Setup Engineering Team")

if __name__ == '__main__':
    setup()
