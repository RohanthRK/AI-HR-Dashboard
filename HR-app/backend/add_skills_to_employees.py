"""
Script to add random skills to employee records in the MongoDB database
"""
import os
import sys
import random
from pymongo import MongoClient

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hr_backend.settings")
import django
django.setup()

from django.conf import settings

# Technical skills with categories
TECHNICAL_SKILLS = {
    'Programming': [
        'JavaScript', 'Python', 'Java', 'C#', 'TypeScript', 'PHP', 'C++', 'Ruby', 'Go', 'Swift',
        'Kotlin', 'Rust', 'Scala', 'Perl', 'Dart'
    ],
    'Web Development': [
        'HTML', 'CSS', 'React', 'Angular', 'Vue.js', 'Node.js', 'Express.js', 'Django',
        'Flask', 'Spring Boot', 'ASP.NET Core', 'Laravel', 'Ruby on Rails', 'jQuery',
        'Bootstrap', 'Tailwind CSS', 'Redux', 'GraphQL', 'REST API'
    ],
    'Database': [
        'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'SQLite', 'Oracle', 'Microsoft SQL Server',
        'Redis', 'Firebase', 'Cassandra', 'Elasticsearch', 'DynamoDB'
    ],
    'DevOps': [
        'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Jenkins', 'Git', 'GitHub',
        'GitLab', 'CI/CD', 'Terraform', 'Ansible', 'Prometheus', 'Linux', 'Bash'
    ],
    'Mobile': [
        'iOS', 'Android', 'React Native', 'Flutter', 'Xamarin', 'Swift', 'Kotlin',
        'Mobile UI Design', 'App Store Optimization', 'Push Notifications'
    ],
}

# Soft skills
SOFT_SKILLS = [
    'Communication', 'Leadership', 'Teamwork', 'Problem Solving', 'Critical Thinking',
    'Time Management', 'Adaptability', 'Creativity', 'Emotional Intelligence', 'Conflict Resolution',
    'Decision Making', 'Negotiation', 'Presentation', 'Customer Service', 'Project Management'
]

# Domain-specific skills by department
DEPARTMENT_SKILLS = {
    'Engineering': [
        'System Architecture', 'API Design', 'Code Review', 'Unit Testing', 'Integration Testing',
        'Performance Optimization', 'Security', 'Scalability', 'Microservices', 'Database Design'
    ],
    'Finance': [
        'Financial Analysis', 'Budgeting', 'Forecasting', 'Accounting', 'Financial Reporting',
        'Tax Planning', 'Risk Management', 'Investment Analysis', 'QuickBooks', 'Excel'
    ],
    'Human Resources': [
        'Recruitment', 'Employee Relations', 'Benefits Administration', 'Payroll Processing',
        'Performance Management', 'Training & Development', 'HR Policies', 'Compliance',
        'HRIS Systems', 'Talent Management'
    ],
    'Marketing': [
        'Social Media Marketing', 'Content Marketing', 'SEO', 'Email Marketing', 'Google Analytics',
        'Market Research', 'Branding', 'Copywriting', 'Advertising', 'Campaign Management',
        'Adobe Creative Suite', 'Video Production'
    ],
    'Sales': [
        'Negotiation', 'Relationship Building', 'Closing Techniques', 'CRM Software', 'Prospecting',
        'Product Knowledge', 'Territory Management', 'Sales Presentation', 'Cold Calling',
        'Customer Retention', 'Account Management'
    ],
    'Customer Support': [
        'Zendesk', 'Intercom', 'Freshdesk', 'Ticketing Systems', 'Live Chat', 'Technical Troubleshooting',
        'Customer Satisfaction', 'Call Center Operations', 'Support Documentation', 'Knowledge Base Management'
    ],
    'Executive': [
        'Strategic Planning', 'Business Development', 'Corporate Governance', 'Financial Management',
        'Executive Leadership', 'Board Relations', 'Public Speaking', 'Stakeholder Management',
        'Mergers & Acquisitions', 'Crisis Management'
    ],
}

def get_skills_for_employee(employee):
    """Generate appropriate skills for an employee based on department and position"""
    skills = []
    position = employee.get('position', '').lower()
    department = employee.get('department', '')
    
    # Add technical skills based on position
    if 'developer' in position or 'engineer' in position or 'technical' in position:
        # Choose 3-5 programming languages
        skills.extend(random.sample(TECHNICAL_SKILLS['Programming'], random.randint(2, 4)))
        # Choose 3-5 web development skills
        skills.extend(random.sample(TECHNICAL_SKILLS['Web Development'], random.randint(3, 5)))
        # Choose 1-3 database skills
        skills.extend(random.sample(TECHNICAL_SKILLS['Database'], random.randint(1, 3)))
        # Choose 2-4 DevOps skills
        skills.extend(random.sample(TECHNICAL_SKILLS['DevOps'], random.randint(1, 3)))
    
    # Add mobile skills for mobile developers
    if 'mobile' in position or 'ios' in position or 'android' in position:
        skills.extend(random.sample(TECHNICAL_SKILLS['Mobile'], random.randint(2, 4)))
    
    # Add soft skills (everyone gets these)
    skills.extend(random.sample(SOFT_SKILLS, random.randint(3, 6)))
    
    # Add department-specific skills if department matches
    for dept, dept_skills in DEPARTMENT_SKILLS.items():
        if dept.lower() in department.lower():
            skills.extend(random.sample(dept_skills, random.randint(3, 5)))
            break
    
    # Add some randomness for uniqueness
    if random.random() > 0.5:
        # Pick a random category and add a few skills
        random_category = random.choice(list(TECHNICAL_SKILLS.keys()))
        skills.extend(random.sample(TECHNICAL_SKILLS[random_category], random.randint(1, 2)))
    
    # Remove duplicates
    return list(set(skills))

def main():
    try:
        # Connect to MongoDB
        client = MongoClient(settings.MONGODB_URI)
        db = client[settings.MONGODB_NAME]
        
        # Get all employees
        employees = list(db.Employees.find())
        print(f"Found {len(employees)} employees in the database")
        
        if not employees:
            print("No employees found in the database.")
            return 1
        
        updated_count = 0
        
        # Confirm before updating
        answer = input(f"This will add skills to {len(employees)} employees. Continue? (y/n): ")
        if answer.lower() != 'y':
            print("Operation cancelled.")
            return 0
        
        # Add skills to each employee
        for employee in employees:
            # Generate skills for this employee
            skills = get_skills_for_employee(employee)
            
            # Update the employee record
            result = db.Employees.update_one(
                {"_id": employee["_id"]},
                {"$set": {"skills": skills}}
            )
            
            if result.modified_count > 0:
                updated_count += 1
                # Print update
                print(f"Added {len(skills)} skills to {employee.get('first_name')} {employee.get('last_name')}")
                print(f"  Skills: {', '.join(skills[:5])}{'...' if len(skills) > 5 else ''}")
        
        print(f"\nSuccessfully updated {updated_count} out of {len(employees)} employees with skills")
        return 0
    
    except Exception as e:
        print(f"Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 