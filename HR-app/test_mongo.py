import pymongo
from bson import ObjectId
import datetime

# Connect to MongoDB
client = pymongo.MongoClient("mongodb://localhost:27017/")
db = client["hr_dashboard_db"]

# Get collections
teams_collection = db["Teams"]
employees_collection = db["Employees"]

# Get some employees for the team
employees = list(employees_collection.find().limit(3))
if not employees:
    print("No employees found in the database")
    exit(1)

# Create a test team directly in MongoDB
team_data = {
    "_id": ObjectId(),
    "name": "Test Team via Direct MongoDB",
    "department": "Engineering",
    "description": "This is a test team created directly in MongoDB",
    "leader_id": str(employees[0]["_id"]),
    "members": [str(emp["_id"]) for emp in employees],
    "created_at": datetime.datetime.now().isoformat(),
    "updated_at": datetime.datetime.now().isoformat()
}

# Insert the team
print("Inserting test team directly into MongoDB...")
result = teams_collection.insert_one(team_data)
print(f"Team inserted with ID: {result.inserted_id}")

# Verify the team was inserted
team = teams_collection.find_one({"_id": result.inserted_id})
if team:
    print(f"Team successfully inserted and retrieved: {team['name']}")
else:
    print("Failed to retrieve the inserted team")

# Count and list all teams
teams_count = teams_collection.count_documents({})
print(f"Total teams in database: {teams_count}")

print("\nAll teams in database:")
for team in teams_collection.find():
    print(f" - {team['name']} (ID: {team['_id']}, Department: {team.get('department', 'None')})") 