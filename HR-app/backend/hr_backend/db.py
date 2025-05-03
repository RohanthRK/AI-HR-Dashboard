"""
MongoDB connection utility for the HR Dashboard application.
"""
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
import os
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

# Get MongoDB connection details from settings or environment variables
MONGODB_URI = getattr(settings, 'MONGODB_URI', os.environ.get('MONGODB_URI', 'mongodb://localhost:27017/'))
MONGODB_NAME = getattr(settings, 'MONGODB_NAME', os.environ.get('MONGODB_NAME', 'hr_dashboard_db'))

# Connect to MongoDB
client = MongoClient(MONGODB_URI)
db = client[MONGODB_NAME]

# Define collection references
users = db['Users']
roles = db['Roles']
employees = db['Employees']
departments = db['Departments']
teams = db['Teams']
attendance = db['Attendance']
leaves = db['Leaves']
reviews = db['Reviews']
payroll = db['Payroll']
projects = db['Projects']
tasks = db['Tasks']
training = db['Training']
benefits = db['Benefits']
performance = db['Performance']
feedback = db['Feedback']
notifications = db['Notifications']
reports = db['Reports']
chat = db['Chat']
jobs = db['Jobs']
skills = db['Skills']
recruitment = db['Recruitment']
time_tracking = db['TimeTracking']
documents = db['Documents']
review_periods = db['ReviewPeriods']
exports = db['Exports']
ai_insights = db['AIInsights']
chat_logs = db['ChatLogs']
candidates = db['Candidates']
team_reviews = db['TeamReviews']
settings_collection = db['Settings']

# Get existing indexes
def safe_create_index(collection, index_key, **kwargs):
    try:
        # Check if index already exists
        existing_indexes = collection.index_information()
        index_name = f"{index_key}_1" if isinstance(index_key, str) else "_".join([f"{k}_{v}" for k, v in index_key])
        
        if index_name in existing_indexes:
            logger.info(f"Index {index_name} already exists on {collection.name}")
            return
            
        # Create the index
        collection.create_index(index_key, **kwargs)
        logger.info(f"Created index {index_name} on {collection.name}")
    except Exception as e:
        logger.error(f"Error creating index on {collection.name}: {e}")

# Create indexes safely
try:
    # Users collection indexes
    safe_create_index(users, "username", unique=True)
    safe_create_index(users, "email", unique=True)
    
    # Employees collection indexes
    safe_create_index(employees, "employee_id")
    safe_create_index(employees, "email", unique=True)
    
    # Department collection indexes
    safe_create_index(departments, "department_id")
    
    # Teams collection indexes
    safe_create_index(teams, "name")
    safe_create_index(teams, "department")
    safe_create_index(teams, "leader_id")
    
    # Attendance and leave indexes
    safe_create_index(attendance, [("employee_id", 1), ("date", 1)], unique=True)
    safe_create_index(leaves, [("employee_id", 1), ("start_date", 1)])
    safe_create_index(leaves, [("employee_id", 1), ("status", 1)])
    
    # Task and project indexes
    safe_create_index(tasks, [("employee_id", 1), ("status", 1)])
    safe_create_index(tasks, [("project_id", 1), ("status", 1)])
    safe_create_index(projects, "name", unique=True)
    
    # Notification indexes
    safe_create_index(notifications, [("user_id", 1), ("read", 1)])
    
    # Other useful indexes
    safe_create_index(time_tracking, [("employee_id", 1), ("date", 1)])
    safe_create_index(time_tracking, [("task_id", 1), ("date", 1)])
    safe_create_index(benefits, "employee_id")
    safe_create_index(training, [("employee_id", 1), ("status", 1)])
    safe_create_index(performance, [("employee_id", 1), ("review_period_id", 1)])
    safe_create_index(feedback, [("sender_id", 1), ("recipient_id", 1), ("date", 1)])
    safe_create_index(reports, [("employee_id", 1), ("date", 1)])
    safe_create_index(chat, [("employee_id", 1), ("date", 1)])
    safe_create_index(jobs, [("employee_id", 1), ("status", 1)])
    safe_create_index(skills, [("employee_id", 1), ("skill_id", 1)])
    safe_create_index(recruitment, [("employee_id", 1), ("status", 1)])
    
except Exception as e:
    logger.error(f"Error setting up MongoDB indexes: {e}")
    # Allow the application to continue even if indexes can't be created 