"""
Script to initialize MongoDB database with sample data
"""
from pymongo import MongoClient
import datetime
import random
import string
import uuid
from bson import ObjectId
import hashlib

# Connection parameters
mongo_uri = 'mongodb://localhost:27017/'
db_name = 'hr_dashboard_db'

# Helper functions
def random_date(start_date, end_date):
    """Generate a random date between start_date and end_date"""
    days_between = (end_date - start_date).days
    random_days = random.randrange(days_between)
    return start_date + datetime.timedelta(days=random_days)

def random_string(length=10):
    """Generate a random string of fixed length"""
    letters = string.ascii_lowercase
    return ''.join(random.choice(letters) for i in range(length))

def generate_employee_id():
    """Generate a unique employee ID"""
    return f"EMP{random.randint(1000, 9999)}"

def generate_email(first_name, last_name):
    """Generate an email based on name"""
    return f"{first_name.lower()}.{last_name.lower()}@example.com"

def generate_username(first_name, last_name, existing_usernames):
    """Generate a unique username based on name"""
    base_username = f"{first_name.lower()}{last_name.lower()}"
    username = base_username
    
    # If username already exists, add a number to make it unique
    counter = 1
    while username in existing_usernames:
        username = f"{base_username}{counter}"
        counter += 1
    
    existing_usernames.add(username)
    return username

def hash_password(password):
    """Create a simple password hash"""
    # This is a simplified hash function for demonstration purposes
    # In production, use a proper password hashing library like bcrypt
    return hashlib.sha256(password.encode()).hexdigest()

try:
    # Connect to MongoDB
    client = MongoClient(mongo_uri)
    db = client[db_name]
    
    print(f"Connected to database: {db_name}")
    
    # Drop existing collections to start fresh
    collections = ["Users", "Roles", "Departments", "Employees", "Attendance", 
                  "Leaves", "Projects", "Tasks", "Reviews", "Payroll", 
                  "Benefits", "Training", "Skills", "Notifications", 
                  "Reports", "Chat", "Teams"]
    
    for collection in collections:
        try:
            db.drop_collection(collection)
            print(f"Dropped collection: {collection}")
        except Exception as e:
            print(f"Could not drop collection {collection}: {e}")
    
    # Create roles
    roles = [
        {
            "_id": ObjectId(),
            "name": "Admin",
            "description": "Administrator with full access",
            "permissions": ["admin", "manage_users", "manage_employees", "manage_attendance", "manage_leaves", "manage_reviews", "manage_payroll"],
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat()
        },
        {
            "_id": ObjectId(),
            "name": "HR Manager",
            "description": "Human Resources Manager",
            "permissions": ["manage_employees", "manage_attendance", "manage_leaves", "manage_reviews", "view_payroll"],
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat()
        },
        {
            "_id": ObjectId(),
            "name": "Department Manager",
            "description": "Department Manager",
            "permissions": ["manage_department_employees", "approve_leaves", "conduct_reviews"],
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat()
        },
        {
            "_id": ObjectId(),
            "name": "Employee",
            "description": "Regular employee",
            "permissions": ["view_profile", "submit_leaves", "view_attendance"],
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat()
        }
    ]
    
    # Insert roles
    db.Roles.insert_many(roles)
    print(f"Inserted {len(roles)} roles")
    
    # Create departments
    departments = [
        {
            "_id": ObjectId(),
            "name": "Human Resources",
            "description": "HR department responsible for recruitment and employee management",
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat(),
            "is_active": True
        },
        {
            "_id": ObjectId(),
            "name": "Engineering",
            "description": "Software development and engineering",
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat(),
            "is_active": True
        },
        {
            "_id": ObjectId(),
            "name": "Marketing",
            "description": "Marketing and communications",
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat(),
            "is_active": True
        },
        {
            "_id": ObjectId(),
            "name": "Finance",
            "description": "Financial operations and accounting",
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat(),
            "is_active": True
        },
        {
            "_id": ObjectId(),
            "name": "Sales",
            "description": "Sales and business development",
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat(),
            "is_active": True
        }
    ]
    
    # Insert departments
    db.Departments.insert_many(departments)
    print(f"Inserted {len(departments)} departments")
    
    # Create users and employees
    users = []
    employees = []
    existing_usernames = set()
    existing_emails = set()
    
    # Sample data
    first_names = ["John", "Jane", "Michael", "Sarah", "David", "Lisa", "Robert", "Emily", "Daniel", "Olivia"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Wilson", "Martinez"]
    positions = ["Manager", "Senior Developer", "Junior Developer", "HR Specialist", "Accountant", "Marketing Specialist", "Sales Representative"]
    
    admin_role = roles[0]["_id"]
    hr_role = roles[1]["_id"]
    manager_role = roles[2]["_id"]
    employee_role = roles[3]["_id"]
    
    # Create 20 users and employees
    for i in range(20):
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)
        email = generate_email(first_name, last_name)
        
        # Ensure email is unique
        while email in existing_emails:
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            email = generate_email(first_name, last_name)
        
        existing_emails.add(email)
        
        department_id = random.choice(departments)["_id"]
        
        # Assign roles based on position
        if i == 0:
            role_id = admin_role
            position = "CEO"
        elif i == 1:
            role_id = hr_role
            position = "HR Manager"
        elif i < 5:
            role_id = manager_role
            position = "Department Manager"
        else:
            role_id = employee_role
            position = random.choice(positions)
        
        # Create user with unique username
        user_id = ObjectId()
        username = generate_username(first_name, last_name, existing_usernames)
        
        user = {
            "_id": user_id,
            "username": username,
            "email": email,
            "password_hash": hash_password("password123"),  # Simple default password
            "first_name": first_name,
            "last_name": last_name,
            "role_id": str(role_id),
            "is_active": True,
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat()
        }
        users.append(user)
        
        # Create employee
        employee_id = generate_employee_id()
        hire_date = random_date(datetime.date(2020, 1, 1), datetime.date.today())
        
        employee = {
            "_id": ObjectId(),
            "employee_id": employee_id,
            "user_id": str(user_id),
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "phone": f"+1{random.randint(2000000000, 9999999999)}",
            "address": f"{random.randint(100, 999)} Main St, Anytown, AN {random.randint(10000, 99999)}",
            "department_id": str(department_id),
            "department": next(dept["name"] for dept in departments if dept["_id"] == department_id),
            "position": position,
            "hire_date": hire_date.isoformat(),
            "salary": random.randint(50000, 150000),
            "employment_type": random.choice(["Full-time", "Part-time", "Contract"]),
            "employment_status": "active",
            "leave_balance": {
                "annual": random.randint(10, 25),
                "sick": random.randint(5, 10),
                "personal": random.randint(2, 5)
            },
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat()
        }
        
        # Assign manager for non-managers
        if i >= 5:
            manager_index = random.randint(2, 4)  # Assign to one of the managers
            employee["manager_id"] = str(employees[manager_index]["_id"])
        
        employees.append(employee)
    
    # Insert users and employees
    db.Users.insert_many(users)
    print(f"Inserted {len(users)} users")
    
    db.Employees.insert_many(employees)
    print(f"Inserted {len(employees)} employees")
    
    # Add default admin account for easy access
    default_admin = {
        "_id": ObjectId(),
        "username": "admin",
        "email": "admin@example.com",
        "password_hash": hash_password("admin123"),  # Use the password from README
        "first_name": "Admin",
        "last_name": "User",
        "role_id": str(admin_role),
        "is_active": True,
        "created_at": datetime.datetime.now().isoformat(),
        "updated_at": datetime.datetime.now().isoformat()
    }
    
    db.Users.insert_one(default_admin)
    print("Inserted default admin user")
    
    # Add default HR Manager account
    default_hr = {
        "_id": ObjectId(),
        "username": "hrmanager",
        "email": "hrmanager@example.com",
        "password_hash": hash_password("manager123"),  # Use the password from README
        "first_name": "HR",
        "last_name": "Manager",
        "role_id": str(hr_role),
        "is_active": True,
        "created_at": datetime.datetime.now().isoformat(),
        "updated_at": datetime.datetime.now().isoformat()
    }
    
    db.Users.insert_one(default_hr)
    print("Inserted default HR Manager user")
    
    # Add default Employee account
    default_employee = {
        "_id": ObjectId(),
        "username": "employee1",
        "email": "employee1@example.com",
        "password_hash": hash_password("employee1"),  # Use the password from README
        "first_name": "Regular",
        "last_name": "Employee",
        "role_id": str(employee_role),
        "is_active": True,
        "created_at": datetime.datetime.now().isoformat(),
        "updated_at": datetime.datetime.now().isoformat()
    }
    
    db.Users.insert_one(default_employee)
    print("Inserted default Employee user")

    # Create indexes for performance and constraints
    db.Users.create_index("username", unique=True)
    db.Users.create_index("email", unique=True)
    db.Employees.create_index("email", unique=True)
    db.Employees.create_index("employee_id", unique=True)
    print("Created database indexes")
    
    # Create attendance records
    attendance_records = []
    
    # Generate attendance for the last 30 days
    today = datetime.date.today()
    for employee in employees:
        for day_offset in range(30):
            date = today - datetime.timedelta(days=day_offset)
            
            # Skip weekends
            if date.weekday() >= 5:
                continue
                
            # 90% chance of attendance
            if random.random() < 0.9:
                clock_in_time = datetime.datetime.combine(
                    date, 
                    datetime.time(hour=random.randint(8, 9), minute=random.randint(0, 59))
                )
                
                clock_out_time = datetime.datetime.combine(
                    date,
                    datetime.time(hour=random.randint(17, 18), minute=random.randint(0, 59))
                )
                
                total_hours = (clock_out_time - clock_in_time).total_seconds() / 3600
                
                attendance_record = {
                    "_id": ObjectId(),
                    "employee_id": str(employee["_id"]),
                    "date": date.isoformat(),
                    "clock_in": clock_in_time.isoformat(),
                    "clock_out": clock_out_time.isoformat(),
                    "total_hours": round(total_hours, 2),
                    "status": "present",
                    "is_approved": True,
                    "created_at": datetime.datetime.now().isoformat(),
                    "updated_at": datetime.datetime.now().isoformat()
                }
                attendance_records.append(attendance_record)
            else:
                # Absent
                attendance_record = {
                    "_id": ObjectId(),
                    "employee_id": str(employee["_id"]),
                    "date": date.isoformat(),
                    "status": "absent",
                    "created_at": datetime.datetime.now().isoformat(),
                    "updated_at": datetime.datetime.now().isoformat()
                }
                attendance_records.append(attendance_record)
    
    # Insert attendance records
    if attendance_records:
        db.Attendance.insert_many(attendance_records)
        print(f"Inserted {len(attendance_records)} attendance records")
    
    # Create leave records
    leave_records = []
    
    leave_types = ["Annual", "Sick", "Personal", "Maternity", "Paternity"]
    leave_statuses = ["Pending", "Approved", "Rejected"]
    
    for employee in employees:
        # Generate 2-4 leave records per employee
        for _ in range(random.randint(2, 4)):
            start_date = random_date(datetime.date(2023, 1, 1), datetime.date.today())
            duration = random.randint(1, 5)
            end_date = start_date + datetime.timedelta(days=duration - 1)
            
            leave_type = random.choice(leave_types)
            leave_status = random.choice(leave_statuses)
            
            requested_on = (start_date - datetime.timedelta(days=random.randint(5, 20))).isoformat()
            
            leave_record = {
                "_id": ObjectId(),
                "employee_id": str(employee["_id"]),
                "leave_type": leave_type,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "total_days": duration,
                "reason": f"{leave_type} leave for {duration} days",
                "status": leave_status,
                "requested_on": requested_on,
                "created_at": datetime.datetime.now().isoformat(),
                "updated_at": datetime.datetime.now().isoformat()
            }
            
            # Add reviewer information for processed leaves
            if leave_status in ["Approved", "Rejected"]:
                # Random manager
                manager_index = random.randint(2, 4)
                leave_record["reviewed_by"] = str(employees[manager_index]["_id"])
                leave_record["reviewed_on"] = (start_date - datetime.timedelta(days=random.randint(1, 4))).isoformat()
                leave_record["review_notes"] = "Leave request processed by manager"
            
            leave_records.append(leave_record)
    
    # Insert leave records
    if leave_records:
        db.Leaves.insert_many(leave_records)
        print(f"Inserted {len(leave_records)} leave records")
    
    # Create projects
    projects = []
    
    project_names = [
        "Website Redesign", 
        "Mobile App Development", 
        "ERP Implementation", 
        "Marketing Campaign", 
        "HR System Upgrade",
        "Financial Reporting Tool",
        "Customer Support Portal",
        "Sales Dashboard"
    ]
    
    project_statuses = ["Not Started", "In Progress", "On Hold", "Completed"]
    project_priorities = ["Low", "Medium", "High"]
    
    for i, name in enumerate(project_names):
        start_date = random_date(datetime.date(2023, 1, 1), datetime.date.today())
        end_date = start_date + datetime.timedelta(days=random.randint(30, 180))
        
        # Assign manager from management team
        manager_index = random.randint(2, 4)
        
        project = {
            "_id": ObjectId(),
            "name": name,
            "description": f"Project for {name}",
            "manager_id": str(employees[manager_index]["_id"]),
            "team_members": [],
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": random.choice(project_statuses),
            "priority": random.choice(project_priorities),
            "budget": random.randint(10000, 100000),
            "actual_cost": 0,
            "progress": random.randint(0, 100),
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat()
        }
        
        # Assign 3-6 team members
        team_size = random.randint(3, 6)
        for _ in range(team_size):
            employee_index = random.randint(5, len(employees) - 1)  # Assign regular employees
            team_member_id = str(employees[employee_index]["_id"])
            if team_member_id not in project["team_members"]:
                project["team_members"].append(team_member_id)
        
        projects.append(project)
    
    # Insert projects
    if projects:
        db.Projects.insert_many(projects)
        print(f"Inserted {len(projects)} projects")
    
    # Create teams
    teams = []
    
    team_names = [
        "Frontend Development",
        "Backend Development",
        "Product Management",
        "Marketing Team",
        "Customer Support"
    ]
    
    for i, name in enumerate(team_names):
        # Assign department based on team name
        if "Frontend" in name or "Backend" in name:
            department_id = departments[1]["_id"]  # Engineering
            department_name = "Engineering"
        elif "Product" in name:
            department_id = departments[2]["_id"]  # Marketing (closest we have to Product)
            department_name = "Marketing"
        elif "Marketing" in name:
            department_id = departments[2]["_id"]  # Marketing
            department_name = "Marketing"
        else:
            department_id = departments[0]["_id"]  # HR as default
            department_name = "Human Resources"
        
        # Assign leader from management team or first employees
        leader_index = min(i, 4)  # Use first 5 employees as potential leaders
        
        # Get 3-6 team members
        team_size = random.randint(3, 6)
        team_members = []
        
        # Always add the leader to the team
        team_members.append(str(employees[leader_index]["_id"]))
        
        # Add more random members
        for _ in range(team_size - 1):
            employee_index = random.randint(0, len(employees) - 1)
            member_id = str(employees[employee_index]["_id"])
            if member_id not in team_members:
                team_members.append(member_id)
        
        team = {
            "_id": ObjectId(),
            "name": name,
            "department": department_name,
            "description": f"Team responsible for {name} activities",
            "leader_id": str(employees[leader_index]["_id"]),
            "members": team_members,
            "created_at": datetime.datetime.now().isoformat(),
            "updated_at": datetime.datetime.now().isoformat()
        }
        
        teams.append(team)
    
    # Insert teams
    if teams:
        db.Teams.insert_many(teams)
        print(f"Inserted {len(teams)} teams")
        
        # Update employees to assign teams and ensure departments are assigned
        for team in teams:
            department_name = team["department"]
            # Update all team members to have the same department as their team
            for member_id in team["members"]:
                db.Employees.update_one(
                    {"_id": ObjectId(member_id)},
                    {"$set": {
                        "department_id": str(next(dept["_id"] for dept in departments if dept["name"] == department_name)),
                        "department": department_name
                    }}
                )
    
    # Create tasks
    tasks = []
    
    task_statuses = ["To Do", "In Progress", "Under Review", "Completed"]
    task_priorities = ["Low", "Medium", "High"]
    
    for project in projects:
        # Create 5-10 tasks per project
        for _ in range(random.randint(5, 10)):
            title = f"Task for {project['name']}"
            
            start_date = datetime.date.fromisoformat(project["start_date"])
            end_date = datetime.date.fromisoformat(project["end_date"])
            task_start = random_date(start_date, end_date - datetime.timedelta(days=14))
            task_due = task_start + datetime.timedelta(days=random.randint(7, 30))
            
            # Make sure task due date is before project end date
            if task_due > end_date:
                task_due = end_date
            
            # Assign task to a team member
            if project["team_members"]:
                assigned_to = random.choice(project["team_members"])
            else:
                # Fallback to any employee
                employee_index = random.randint(5, len(employees) - 1)
                assigned_to = str(employees[employee_index]["_id"])
            
            task = {
                "_id": ObjectId(),
                "title": title,
                "description": f"Description for {title}",
                "project_id": str(project["_id"]),
                "assigned_to": assigned_to,
                "assigned_by": project["manager_id"],
                "start_date": task_start.isoformat(),
                "due_date": task_due.isoformat(),
                "status": random.choice(task_statuses),
                "priority": random.choice(task_priorities),
                "estimated_hours": random.randint(5, 40),
                "actual_hours": 0,
                "progress": random.randint(0, 100),
                "created_at": datetime.datetime.now().isoformat(),
                "updated_at": datetime.datetime.now().isoformat()
            }
            
            # If task is completed, add completion date
            if task["status"] == "Completed":
                completed_date = random_date(task_start, task_due)
                task["completed_date"] = completed_date.isoformat()
                task["actual_hours"] = round(task["estimated_hours"] * random.uniform(0.8, 1.2), 1)
            
            tasks.append(task)
    
    # Insert tasks
    if tasks:
        db.Tasks.insert_many(tasks)
        print(f"Inserted {len(tasks)} tasks")
    
    print("Database initialization with sample data completed successfully!")
    
except Exception as e:
    print(f"An error occurred: {str(e)}") 