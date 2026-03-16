"""
Script to delete MongoDB database and initialize a fresh database
"""
from pymongo import MongoClient

# Connection parameters
mongo_uri = 'mongodb://localhost:27017/'
db_name = 'hr_dashboard_db'

try:
    # Connect to MongoDB
    client = MongoClient(mongo_uri)
    
    # Drop the database
    client.drop_database(db_name)
    
    print(f"Database '{db_name}' has been deleted successfully.")
    
    # Initialize the fresh database with required collections
    db = client[db_name]
    
    # Create all necessary collections
    collections = [
        "Users", 
        "Roles", 
        "Departments", 
        "Employees", 
        "Documents", 
        "Attendance", 
        "Leaves", 
        "ReviewPeriods", 
        "Reviews", 
        "Payroll", 
        "Exports", 
        "Notifications", 
        "AIInsights", 
        "ChatLogs", 
        "JobDescriptions", 
        "EmployeeSkills", 
        "Candidates", 
        "Settings",
        "Projects",
        "Tasks",
        "TimeTracking",
        "Benefits",
        "Training",
        "Performance",
        "Feedback",
        "Teams"
    ]
    
    for collection_name in collections:
        db.create_collection(collection_name)
        print(f"Created collection: {collection_name}")
    
    # Create indexes for better performance
    db.Users.create_index("username", unique=True)
    db.Employees.create_index("email", unique=True)
    db.Attendance.create_index([("employee_id", 1), ("date", 1)])
    db.Leaves.create_index([("employee_id", 1), ("status", 1)])
    db.Notifications.create_index([("user_id", 1), ("read", 1)])
    db.Tasks.create_index([("employee_id", 1), ("status", 1)])
    db.Projects.create_index("name", unique=True)
    
    print("Database initialization completed successfully.")
    
except Exception as e:
    print(f"An error occurred: {str(e)}") 