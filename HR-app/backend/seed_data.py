"""
Seed script to populate MongoDB with initial data for development
Run with: python seed_data.py
"""
import os
import sys
import datetime
import hashlib
from pymongo import MongoClient
from bson import ObjectId

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hr_backend.settings")
import django
django.setup()

from django.conf import settings

def hash_password(password):
    """Hash a password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def main():
    """Main function to seed the database"""
    # Connect to MongoDB
    client = MongoClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_NAME]
    
    # Clear existing data
    if input("This will clear all existing data. Continue? (y/n): ").lower() != 'y':
        print("Operation cancelled.")
        return
        
    collections = [
        'Users', 'Roles', 'Departments', 'Employees', 'Documents',
        'Attendance', 'Leaves', 'ReviewPeriods', 'Reviews', 'Payroll',
        'Exports', 'Notifications', 'AIInsights', 'ChatLogs', 'JobDescriptions',
        'EmployeeSkills', 'Candidates', 'Settings'
    ]
    
    for collection_name in collections:
        db[collection_name].delete_many({})
        print(f"Cleared {collection_name} collection")
    
    # Create roles
    roles_data = [
        {
            '_id': ObjectId(),
            'name': 'Admin',
            'permissions': {
                'users': ['read', 'write', 'delete'],
                'employees': ['read', 'write', 'delete'],
                'attendance': ['read', 'write', 'delete'],
                'leaves': ['read', 'write', 'delete'],
                'payroll': ['read', 'write', 'delete'],
                'settings': ['read', 'write']
            },
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        },
        {
            '_id': ObjectId(),
            'name': 'Manager',
            'permissions': {
                'users': ['read'],
                'employees': ['read', 'write'],
                'attendance': ['read', 'write'],
                'leaves': ['read', 'write'],
                'payroll': ['read'],
                'settings': ['read']
            },
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        },
        {
            '_id': ObjectId(),
            'name': 'Employee',
            'permissions': {
                'employees': ['read'],
                'attendance': ['read', 'write'],
                'leaves': ['read', 'write'],
                'payroll': ['read']
            },
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        }
    ]
    
    db.Roles.insert_many(roles_data)
    print(f"Created {len(roles_data)} roles")
    
    # Create departments
    departments_data = [
        {
            '_id': ObjectId(),
            'name': 'Executive',
            'description': 'Company leadership and executive team',
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        },
        {
            '_id': ObjectId(),
            'name': 'Human Resources',
            'description': 'HR department handling personnel matters',
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        },
        {
            '_id': ObjectId(),
            'name': 'Finance',
            'description': 'Finance and accounting department',
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        },
        {
            '_id': ObjectId(),
            'name': 'Engineering',
            'description': 'Software development and IT operations',
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        },
        {
            '_id': ObjectId(),
            'name': 'Marketing',
            'description': 'Marketing and communications',
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        },
        {
            '_id': ObjectId(),
            'name': 'Sales',
            'description': 'Sales and business development',
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        },
        {
            '_id': ObjectId(),
            'name': 'Customer Support',
            'description': 'Customer service and support',
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        }
    ]
    
    db.Departments.insert_many(departments_data)
    print(f"Created {len(departments_data)} departments")
    
    # Create users
    admin_role = db.Roles.find_one({'name': 'Admin'})
    manager_role = db.Roles.find_one({'name': 'Manager'})
    employee_role = db.Roles.find_one({'name': 'Employee'})
    
    users_data = [
        {
            '_id': ObjectId(),
            'username': 'admin',
            'password': hash_password('admin123'),
            'email': 'admin@example.com',
            'role_id': str(admin_role['_id']),
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'active': True
        },
        {
            '_id': ObjectId(),
            'username': 'hrmanager',
            'password': hash_password('manager123'),
            'email': 'hr@example.com',
            'role_id': str(manager_role['_id']),
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'active': True
        }
    ]
    
    # Add employees (1 per department)
    for i, dept in enumerate(departments_data):
        users_data.append({
            '_id': ObjectId(),
            'username': f'employee{i+1}',
            'password': hash_password(f'employee{i+1}'),
            'email': f'employee{i+1}@example.com',
            'role_id': str(employee_role['_id']),
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'active': True
        })
    
    db.Users.insert_many(users_data)
    print(f"Created {len(users_data)} users")
    
    # Create employees
    employees_data = []
    
    # Admin employee
    admin_user = users_data[0]
    employees_data.append({
        '_id': ObjectId(),
        'first_name': 'Admin',
        'last_name': 'User',
        'email': admin_user['email'],
        'phone': '123-456-7890',
        'address': '123 Admin St, Admin City',
        'role': 'Admin',
        'department_id': departments_data[0]['_id'],  # Executive
        'hire_date': (datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(days=365)).isoformat(),
        'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
        'user_id': admin_user['_id'],
        'active': True
    })
    
    # HR Manager employee
    hr_user = users_data[1]
    employees_data.append({
        '_id': ObjectId(),
        'first_name': 'HR',
        'last_name': 'Manager',
        'email': hr_user['email'],
        'phone': '123-456-7891',
        'address': '456 HR St, HR City',
        'role': 'Manager',
        'department_id': departments_data[1]['_id'],  # HR
        'hire_date': (datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(days=300)).isoformat(),
        'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
        'user_id': hr_user['_id'],
        'active': True
    })
    
    # Regular employees
    first_names = ['John', 'Jane', 'Robert', 'Emily', 'Michael', 'Sarah', 'David']
    last_names = ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller']
    
    for i, dept in enumerate(departments_data):
        user = users_data[i+2]  # Skip admin and HR manager
        employees_data.append({
            '_id': ObjectId(),
            'first_name': first_names[i],
            'last_name': last_names[i],
            'email': user['email'],
            'phone': f'123-456-{7892+i}',
            'address': f'{i+1} Employee St, Employee City',
            'role': 'Employee',
            'department_id': dept['_id'],
            'hire_date': (datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(days=200-i*10)).isoformat(),
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'user_id': user['_id'],
            'active': True
        })
    
    db.Employees.insert_many(employees_data)
    print(f"Created {len(employees_data)} employees")
    
    # Create attendance records (past 30 days for all employees)
    attendance_data = []
    
    # Get today's date
    today = datetime.datetime.now(tz=datetime.timezone.utc).date()
    
    for employee in employees_data:
        for day in range(30):
            # Skip weekends (5 = Saturday, 6 = Sunday)
            date = today - datetime.timedelta(days=day)
            if date.weekday() >= 5:
                continue
                
            # Random attendance pattern (some absences)
            if day % 10 == 0:
                # Absent every 10th day
                continue
                
            # Clock in around 9 AM
            random_minutes = (day * 7) % 30  # Pseudo-random minutes between 0-29
            clock_in_time = datetime.datetime.combine(
                date, 
                datetime.time(9, random_minutes),
                tzinfo=datetime.timezone.utc
            )
            
            # Clock out around 5-6 PM
            random_hours = 8 + (day % 3)  # 8-10 hours worked
            clock_out_time = clock_in_time + datetime.timedelta(hours=random_hours)
            
            attendance_data.append({
                'employee_id': employee['_id'],
                'date': date.isoformat(),
                'clock_in': clock_in_time.isoformat(),
                'clock_in_location': {
                    'latitude': 40.7128,
                    'longitude': -74.0060
                },
                'clock_in_ip': '192.168.1.100',
                'clock_out': clock_out_time.isoformat(),
                'clock_out_location': {
                    'latitude': 40.7128,
                    'longitude': -74.0060
                },
                'clock_out_ip': '192.168.1.100',
                'hours_worked': random_hours
            })
    
    if attendance_data:
        db.Attendance.insert_many(attendance_data)
        print(f"Created {len(attendance_data)} attendance records")
    
    # Create some leave requests
    leaves_data = []
    
    leave_types = ['Annual', 'Sick', 'Personal']
    statuses = ['Approved', 'Rejected', 'Pending']
    
    for i, employee in enumerate(employees_data):
        # Past approved leave
        past_start = (today - datetime.timedelta(days=60)).isoformat()
        past_end = (today - datetime.timedelta(days=56)).isoformat()
        
        leaves_data.append({
            'employee_id': employee['_id'],
            'leave_type': leave_types[i % len(leave_types)],
            'start_date': past_start,
            'end_date': past_end,
            'days': 5,
            'reason': 'Vacation',
            'status': 'Approved',
            'requested_at': (datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(days=75)).isoformat(),
            'requested_by': str(employee['user_id']),
            'reviewed_by': str(users_data[1]['_id']), # HR Manager
            'reviewed_at': (datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(days=70)).isoformat()
        })
        
        # Future pending leave
        future_start = (today + datetime.timedelta(days=30)).isoformat()
        future_end = (today + datetime.timedelta(days=34)).isoformat()
        
        leaves_data.append({
            'employee_id': employee['_id'],
            'leave_type': leave_types[(i+1) % len(leave_types)],
            'start_date': future_start,
            'end_date': future_end,
            'days': 5,
            'reason': 'Family event',
            'status': statuses[i % len(statuses)],
            'requested_at': (datetime.datetime.now(tz=datetime.timezone.utc) - datetime.timedelta(days=5)).isoformat(),
            'requested_by': str(employee['user_id'])
        })
    
    db.Leaves.insert_many(leaves_data)
    print(f"Created {len(leaves_data)} leave requests")
    
    # Create some notifications
    notifications_data = []
    
    for i, employee in enumerate(employees_data):
        # System notification
        notifications_data.append({
            'type': 'system',
            'user_id': str(employee['user_id']),
            'title': 'Welcome to HR Dashboard',
            'message': 'Welcome to the new HR Dashboard system. Please update your profile.',
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'read': False
        })
        
        # Task notification
        if i < 3:  # Only for first few employees
            notifications_data.append({
                'type': 'task',
                'user_id': str(employee['user_id']),
                'title': 'Complete Your Profile',
                'message': 'Please complete your employee profile by uploading required documents.',
                'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
                'read': i == 0  # First employee has read it
            })
    
    db.Notifications.insert_many(notifications_data)
    print(f"Created {len(notifications_data)} notifications")
    
    print("Database seeded successfully!")

if __name__ == "__main__":
    main() 