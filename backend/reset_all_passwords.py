from pymongo import MongoClient
import hashlib

client = MongoClient('mongodb://localhost:27017/')
db = client['hr_dashboard_db']

def reset_all():
    users_to_reset = {
        'admin': 'admin123',
        'manager1': 'manager123',
        'employee1': 'employee123'
    }
    
    for username, password in users_to_reset.items():
        h = hashlib.sha256(password.encode()).hexdigest()
        res = db.Users.update_one(
            {'username': username},
            {
                '$set': {'password': h, 'active': True},
                '$unset': {'password_hash': ''}
            }
        )
        print(f"User {username}: Modified {res.modified_count}, Reset to {password}")

if __name__ == "__main__":
    reset_all()
