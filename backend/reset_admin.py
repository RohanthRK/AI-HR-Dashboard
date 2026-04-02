from pymongo import MongoClient
import hashlib

client = MongoClient('mongodb://localhost:27017/')
db = client['hr_dashboard_db']

def reset():
    h = hashlib.sha256('admin123'.encode()).hexdigest()
    res = db.Users.update_one(
        {'username': 'admin'},
        {
            '$set': {'password': h, 'active': True},
            '$unset': {'password_hash': ''}
        }
    )
    print(f"Modified: {res.modified_count}")
    if res.matched_count > 0:
        print("Admin password reset to: admin123")
    else:
        print("Admin user not found!")

if __name__ == "__main__":
    reset()
