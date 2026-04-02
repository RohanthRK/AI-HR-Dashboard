from pymongo import MongoClient
from bson import ObjectId

client = MongoClient('mongodb://localhost:27017/')
db = client['hr_dashboard_db']

def setup():
    # 1. Find Admin user
    admin_user = db.Users.find_one({'username': 'admin'})
    if not admin_user:
        print("Admin user not found")
        return

    admin_user_id = str(admin_user['_id'])
    
    # 2. Update Admin employee profile
    result = db.Employees.update_one(
        {'employee_id': 'EMP000'},
        {'$set': {
            'department': 'Engineering',
            'position': 'Engineering Director',
            'manager_id': None # Admin is top-level
        }}
    )
    print(f"Updated Admin employee: {result.modified_count}")

    # 3. Create/Update Engineering Leadership Team
    team_name = 'Engineering Leadership'
    # Check if team already exists
    existing_team = db.Teams.find_one({'name': team_name})
    
    team_data = {
        'name': team_name,
        'department_id': 'Engineering',
        'manager_id': admin_user_id,
        'members': ['EMP001'] # manager1
    }
    
    if existing_team:
        db.Teams.update_one({'_id': existing_team['_id']}, {'$set': team_data})
        print("Updated Engineering Leadership Team")
    else:
        db.Teams.insert_one(team_data)
        print("Created Engineering Leadership Team")

    print("\nVerification:")
    print(f"Manager1 (EMP001) is now in team '{team_name}'")
    print(f"Team Lead is Admin (EMP000), UserID: {admin_user_id}")

if __name__ == "__main__":
    setup()
