from hr_backend.db import users, teams
import hashlib
from bson import ObjectId

def fix():
    # Hash for password123
    h = hashlib.sha256('password123'.encode()).hexdigest()
    
    # Update users
    usernames = ['employee1', 'manager1', 'admin']
    for uname in usernames:
        users.update_one({'username': uname}, {'$set': {'password': h}, '$unset': {'password_hash': ''}})
        print(f"Updated {uname} with hash {h}")

    # Ensure roles are set correct enough for login
    users.update_one({'username': 'employee1'}, {'$set': {'role': 'Employee'}})
    users.update_one({'username': 'manager1'}, {'$set': {'role': 'Manager'}})
    users.update_one({'username': 'admin'}, {'$set': {'role': 'Admin'}})

    # Setup Team
    m = users.find_one({'username': 'manager1'})
    e = users.find_one({'username': 'employee1'})
    
    if m and e:
        m_id = str(m['_id'])
        e_id = str(e['employee_id'])
        teams.update_one(
            {'name': 'Engineering Team'}, 
            {'$set': {'manager_id': m_id, 'members': [e_id]}},
            upsert=True
        )
        print(f"Set Engineering Team: Lead={m_id}, Member={e_id}")

if __name__ == '__main__':
    fix()
