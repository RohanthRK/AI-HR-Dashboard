from hr_backend.db import users, employees
import json
from bson.objectid import ObjectId

u = users.find_one({'username': 'employee1'})
if u:
    print(f"User found: {u.get('username')}, ID: {u['_id']}")
    e = employees.find_one({'user_id': str(u['_id'])})
    if e:
        print(f"Employee linked: {e.get('first_name')} {e.get('last_name')}, ID: {e['_id']}")
        # Update user with employee_id if missing
        if 'employee_id' not in u:
            users.update_one({'_id': u['_id']}, {'$set': {'employee_id': str(e['_id'])}})
            print("Linked user to employee record.")
    else:
        print("No employee record found for this user_id.")
        # Check by name?
        e_by_name = employees.find_one({'first_name': 'John', 'last_name': 'Smith'})
        if e_by_name:
             print(f"Found employee by name: {e_by_name.get('first_name')} {e_by_name.get('last_name')}, ID: {e_by_name['_id']}")
             users.update_one({'_id': u['_id']}, {'$set': {'employee_id': str(e_by_name['_id'])}})
             employees.update_one({'_id': e_by_name['_id']}, {'$set': {'user_id': str(u['_id'])}})
             print("Force-linked user and employee.")
else:
    print("User employee1 not found.")
