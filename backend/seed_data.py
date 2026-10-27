"""
Seed the database with ONE coherent fictional Indian company ("Kaveri Technologies Pvt. Ltd.", Bengaluru, ~50 employees).

    python seed_data.py --yes            wipes every collection in the configured database, then loads the demo company
    python seed_data.py --yes --force    needed when DEBUG=False
    python seed_data.py --yes --allow-remote   needed for a mongodb+srv:// (cloud) database

Everything is cross-referenced like real data: every employee belongs to exactly one team and department, has a
manager, a user account, a bank account, a laptop, documents (real PDF files in media/), attendance for every working
day since they joined (minus approved leave and weekends), leave requests with the right manager, payslips, reviews,
objectives, trainings, survey answers, recognition... and former employees with completed exits. The generator is
seeded, so the same company is produced every time (dates are relative to today).

Demo logins: username = first.last (e.g. anjali.deshmukh), password = Kaveri#2026 for everyone.
Admins: anjali.deshmukh (CEO), priya.nair (HR Director). Managers/leads: e.g. rahul.mehta, sneha.kapoor, nandini.bhat.
Salaries are annual CTC in rupees; payslips follow Indian payroll (PF, ESI, professional tax, TDS).
"""
import argparse
import calendar
import datetime
import zoneinfo
import hashlib
import os
import random
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hr_backend.settings')

DEMO_PASSWORD = 'Kaveri#2026'
BUSINESS_UNITS = {'Engineering': 'Product & Technology', 'Product': 'Product & Technology', 'Design': 'Product & Technology',
                  'Sales': 'Go-to-Market', 'Marketing': 'Go-to-Market', 'Customer Support': 'Go-to-Market'}
COMPANY = 'Kaveri Technologies Pvt. Ltd.'
DOMAIN = 'kaveri-tech.example'
UTC = datetime.timezone.utc

# --------------------------------------------------------------------------------------------------- roster
# key, first, last, gender, position, department, team, app role, reports_to, tenure(years), salary, skills[(name, level 1-10)], perf
R = []


NAMES = {
    'ceo': ('Anjali', 'Deshmukh'), 'coo': ('Vikram', 'Malhotra'), 'ea': ('Meera', 'Kulkarni'), 'hrd': ('Priya', 'Nair'), 'hrbp': ('Kavya', 'Reddy'),
    'rec': ('Rohan', 'Gupta'), 'hrc': ('Ananya', 'Bose'), 'fin': ('Suresh', 'Iyer'), 'acc': ('Lakshmi', 'Narayanan'), 'pay': ('Raj', 'Patel'),
    'ap': ('Divya', 'Menon'), 'vpe': ('Rahul', 'Mehta'), 'sarah': ('Sneha', 'Kapoor'), 'diego': ('Karthik', 'Subramanian'), 'aisha': ('Aisha', 'Rahman'),
    'kevin': ('Harish', 'Naidu'), 'marcus': ('Manoj', 'Pillai'), 'olivia': ('Ishita', 'Sharma'), 'noah': ('Nikhil', 'Joshi'), 'zoe': ('Zoya', 'Khan'),
    'elena': ('Deepika', 'Rangan'), 'arjun': ('Arjun', 'Nair'), 'fiona': ('Farah', 'Siddiqui'), 'tariq': ('Tariq', 'Hussain'), 'tom': ('Tarun', 'Bhatia'),
    'isabella': ('Isha', 'Verma'), 'hiroshi': ('Himanshu', 'Saxena'), 'hop': ('Nandini', 'Bhat'), 'oliver': ('Omkar', 'Patil'), 'sofia': ('Shruti', 'Agarwal'),
    'jamal': ('Jatin', 'Arora'), 'emily': ('Ekta', 'Mishra'), 'sd': ('Vivek', 'Chauhan'), 'jess': ('Jyoti', 'Banerjee'), 'andre': ('Amit', 'Shah'),
    'sara': ('Sakshi', 'Dubey'), 'carlos': ('Chetan', 'Rao'), 'maya': ('Maya', 'Singh'), 'ben_h': ('Bhavesh', 'Thakkar'), 'mh': ('Fatima', 'Khan'),
    'ben_c': ('Binoy', 'Thomas'), 'nadia': ('Nisha', 'Pandey'), 'lucas': ('Lokesh', 'Yadav'), 'ch': ('Gayatri', 'Hegde'), 'ethan': ('Eshwar', 'Prasad'),
    'lily': ('Lavanya', 'Krishnan'), 'mohamed': ('Mohammed', 'Farooq'), 'chiara': ('Charu', 'Jain'), 'owen': ('Omar', 'Qureshi'),
}
CITY_OF = {'Seattle, WA': 'Bengaluru', 'Tacoma, WA': 'Hyderabad', 'Bellevue, WA': 'Pune', 'Redmond, WA': 'Chennai', None: 'Bengaluru'}


def inr_ctc(usd_like):
    """Annual CTC in rupees for the role level the original figure stood for (about 4.5 lakh at 62k, 24 lakh at 135k, 66 lakh at 210k)."""
    return float(round(450000 * (usd_like / 62000) ** 2.2, -4))


def person(key, first, last, gender, position, dept, team, role, boss, tenure, salary, skills, perf=None, city=None):
    first, last = NAMES.get(key, (first, last))
    salary, city = inr_ctc(salary), CITY_OF.get(city, 'Bengaluru')
    R.append(dict(key=key, first=first, last=last, gender=gender, position=position, dept=dept, team=team, role=role,
                  boss=boss, tenure=tenure, salary=salary, skills=skills, perf=perf, city=city))


# Executive
person('ceo', 'Alexandra', 'Reed', 'F', 'Chief Executive Officer', 'Executive', 'Leadership Team', 'Admin', None, 7.5, 210000,
       [('Strategic Planning', 9), ('Leadership', 9), ('Fundraising', 8), ('Negotiation', 8), ('Communication', 9)], 4.7, 'Seattle, WA')
person('coo', 'Daniel', 'Ortiz', 'M', 'Chief Operating Officer', 'Executive', 'Leadership Team', 'Manager', 'ceo', 6.2, 185000,
       [('Operations Management', 9), ('Leadership', 9), ('Budgeting', 8), ('Process Improvement', 8), ('Communication', 8)], 4.5, 'Seattle, WA')
person('ea', 'Mei', 'Tanaka', 'F', 'Executive Assistant', 'Executive', 'Leadership Team', 'Employee', 'ceo', 3.1, 62000,
       [('Scheduling', 9), ('Communication', 9), ('Microsoft Office', 8), ('Travel Planning', 8), ('Confidentiality', 9)], 4.3, 'Seattle, WA')
# Human Resources
person('hrd', 'Priya', 'Nair', 'F', 'Director of People & Culture', 'Human Resources', 'People Operations', 'Admin', 'ceo', 5.4, 135000,
       [('Employee Relations', 9), ('Recruitment', 8), ('Labor Law', 8), ('Leadership', 8), ('Conflict Resolution', 9), ('HRIS', 7)], 4.6, 'Seattle, WA')
person('hrbp', 'Hannah', 'Wright', 'F', 'HR Business Partner', 'Human Resources', 'People Operations', 'Manager', 'hrd', 3.8, 88000,
       [('Employee Relations', 8), ('Performance Management', 8), ('Coaching', 7), ('Communication', 8)], 4.2, 'Tacoma, WA')
person('rec', 'Leo', 'Costa', 'M', 'Talent Acquisition Specialist', 'Human Resources', 'People Operations', 'Employee', 'hrbp', 2.2, 72000,
       [('Recruitment', 8), ('Interviewing', 8), ('Sourcing', 7), ('ATS', 7), ('Communication', 8)], 3.9, 'Seattle, WA')
person('hrc', 'Ava', 'Johnson', 'F', 'HR Coordinator', 'Human Resources', 'People Operations', 'Employee', 'hrbp', 0.6, 54000,
       [('Onboarding', 7), ('HRIS', 6), ('Scheduling', 7), ('Communication', 7)], 3.8, 'Bellevue, WA')
# Finance
person('fin', "James", "O'Brien", 'M', 'Finance Controller', 'Finance', 'Accounting', 'Manager', 'coo', 5.9, 142000,
       [('Financial Reporting', 9), ('Budgeting', 9), ('Forecasting', 8), ('Leadership', 7), ('Excel', 9), ('Compliance', 8)], 4.4, 'Seattle, WA')
person('acc', 'Linda', 'Zhao', 'F', 'Senior Accountant', 'Finance', 'Accounting', 'Manager', 'fin', 4.3, 91000,
       [('Accounting', 9), ('Financial Reporting', 8), ('Excel', 9), ('Tax', 7), ('Auditing', 7)], 4.3, 'Seattle, WA')
person('pay', 'Raj', 'Patel', 'M', 'Payroll Specialist', 'Finance', 'Accounting', 'Employee', 'acc', 2.7, 68000,
       [('Payroll', 9), ('Excel', 8), ('Compliance', 7), ('Accuracy', 8), ('HRIS', 6)], 4.0, 'Redmond, WA')
person('ap', 'Chloe', 'Dubois', 'F', 'Accounts Payable Analyst', 'Finance', 'Accounting', 'Employee', 'acc', 1.4, 59000,
       [('Accounts Payable', 8), ('Excel', 7), ('Reconciliation', 7), ('Communication', 7)], 3.6, 'Seattle, WA')
# Engineering
person('vpe', 'Rahul', 'Mehta', 'M', 'VP of Engineering', 'Engineering', 'Platform Team', 'Manager', 'ceo', 6.8, 195000,
       [('Engineering Management', 9), ('System Design', 9), ('Leadership', 9), ('Python', 8), ('AWS', 8), ('Hiring', 8)], 4.6, 'Seattle, WA')
person('sarah', 'Sarah', 'Kim', 'F', 'Staff Software Engineer', 'Engineering', 'Platform Team', 'Manager', 'vpe', 5.1, 168000,
       [('Python', 9), ('Go', 8), ('Kubernetes', 8), ('AWS', 9), ('System Design', 9), ('Mentoring', 8)], 4.8, 'Seattle, WA')
person('diego', 'Diego', 'Alvarez', 'M', 'Senior Backend Engineer', 'Engineering', 'Platform Team', 'Employee', 'sarah', 3.6, 138000,
       [('Python', 8), ('PostgreSQL', 8), ('Docker', 8), ('AWS', 7), ('REST APIs', 8)], 4.2, 'Seattle, WA')
person('aisha', 'Aisha', 'Rahman', 'F', 'Backend Engineer', 'Engineering', 'Platform Team', 'Employee', 'sarah', 1.8, 112000,
       [('Python', 7), ('Django', 7), ('PostgreSQL', 6), ('Docker', 6), ('Git', 8)], 3.8, 'Bellevue, WA')
person('kevin', 'Kevin', 'Brooks', 'M', 'Site Reliability Engineer', 'Engineering', 'Platform Team', 'Employee', 'sarah', 2.9, 128000,
       [('Kubernetes', 8), ('Terraform', 8), ('AWS', 8), ('Linux', 8), ('Monitoring', 7)], 4.1, 'Seattle, WA')
person('marcus', 'Marcus', 'Lee', 'M', 'Engineering Manager, Web', 'Engineering', 'Web Applications', 'Manager', 'vpe', 4.7, 155000,
       [('React', 9), ('TypeScript', 8), ('Node.js', 8), ('System Design', 7), ('Mentoring', 8), ('Agile', 8)], 4.4, 'Seattle, WA')
person('olivia', 'Olivia', 'Bennett', 'F', 'Senior Frontend Engineer', 'Engineering', 'Web Applications', 'Employee', 'marcus', 3.2, 130000,
       [('React', 9), ('TypeScript', 8), ('CSS', 8), ('Testing', 7), ('Accessibility', 7)], 4.5, 'Seattle, WA')
person('noah', 'Noah', 'Fischer', 'M', 'Full Stack Engineer', 'Engineering', 'Web Applications', 'Employee', 'marcus', 2.1, 118000,
       [('JavaScript', 8), ('React', 7), ('Node.js', 7), ('SQL', 7), ('Git', 8)], 3.7, 'Tacoma, WA')
person('zoe', 'Zoe', 'Martins', 'F', 'Frontend Engineer', 'Engineering', 'Web Applications', 'Employee', 'marcus', 0.5, 98000,
       [('React', 7), ('JavaScript', 7), ('CSS', 7), ('Git', 6)], 3.9, 'Seattle, WA')
person('elena', 'Elena', 'Petrova', 'F', 'Lead Data Scientist', 'Engineering', 'Data & AI', 'Manager', 'vpe', 4.0, 158000,
       [('Python', 9), ('Machine Learning', 9), ('SQL', 8), ('Statistics', 9), ('TensorFlow', 7), ('Mentoring', 7)], 4.6, 'Seattle, WA')
person('arjun', 'Arjun', 'Nair', 'M', 'Data Engineer', 'Engineering', 'Data & AI', 'Employee', 'elena', 2.6, 122000,
       [('Python', 8), ('SQL', 9), ('Spark', 7), ('Airflow', 7), ('AWS', 7)], 4.1, 'Bellevue, WA')
person('fiona', 'Fiona', 'Gallagher', 'F', 'Machine Learning Engineer', 'Engineering', 'Data & AI', 'Employee', 'elena', 1.9, 128000,
       [('Python', 8), ('PyTorch', 7), ('Machine Learning', 8), ('MLOps', 6), ('SQL', 7)], 4.2, 'Seattle, WA')
person('tariq', 'Tariq', 'Hussain', 'M', 'Data Analyst', 'Engineering', 'Data & AI', 'Employee', 'elena', 1.1, 88000,
       [('SQL', 8), ('Tableau', 7), ('Excel', 8), ('Python', 5), ('Statistics', 6)], 3.1, 'Seattle, WA')
person('tom', 'Tom', 'Becker', 'M', 'QA Lead', 'Engineering', 'QA & DevOps', 'Manager', 'vpe', 4.4, 112000,
       [('Test Automation', 9), ('Selenium', 8), ('QA Strategy', 8), ('CI/CD', 7), ('Mentoring', 7)], 4.2, 'Seattle, WA')
person('isabella', 'Isabella', 'Rossi', 'F', 'QA Engineer', 'Engineering', 'QA & DevOps', 'Employee', 'tom', 2.3, 86000,
       [('Test Automation', 7), ('Selenium', 7), ('API Testing', 7), ('Jira', 8)], 4.0, 'Bellevue, WA')
person('hiroshi', 'Hiroshi', 'Sato', 'M', 'DevOps Engineer', 'Engineering', 'QA & DevOps', 'Employee', 'tom', 1.5, 108000,
       [('CI/CD', 8), ('Docker', 8), ('Terraform', 6), ('Linux', 7), ('GitHub Actions', 7)], 3.9, 'Seattle, WA')
# Product & Design
person('hop', 'Nina', 'Alvarez', 'F', 'Head of Product', 'Product & Design', 'Product & Design', 'Manager', 'ceo', 5.3, 160000,
       [('Product Strategy', 9), ('Roadmapping', 9), ('User Research', 8), ('Leadership', 8), ('Data Analysis', 7)], 4.5, 'Seattle, WA')
person('oliver', 'Oliver', 'Grant', 'M', 'Senior Product Designer', 'Product & Design', 'Product & Design', 'Manager', 'hop', 3.5, 115000,
       [('Figma', 9), ('UX Design', 9), ('Prototyping', 8), ('Design Systems', 8), ('User Research', 7)], 4.4, 'Seattle, WA')
person('sofia', 'Sofia', 'Lindqvist', 'F', 'Product Manager', 'Product & Design', 'Product & Design', 'Employee', 'oliver', 2.4, 120000,
       [('Product Management', 8), ('Agile', 8), ('Jira', 8), ('Stakeholder Management', 7), ('SQL', 5)], 4.1, 'Seattle, WA')
person('jamal', 'Jamal', 'Washington', 'M', 'UX Researcher', 'Product & Design', 'Product & Design', 'Employee', 'oliver', 1.3, 92000,
       [('User Research', 8), ('Usability Testing', 8), ('Interviewing', 7), ('Figma', 6), ('Analytics', 6)], 3.8, 'Tacoma, WA')
person('emily', 'Emily', 'Chen', 'F', 'Business Analyst', 'Product & Design', 'Product & Design', 'Employee', 'oliver', 0.4, 82000,
       [('Requirements Analysis', 7), ('SQL', 6), ('Excel', 7), ('Communication', 7), ('Jira', 6)], 3.7, 'Redmond, WA')
# Sales
person('sd', 'Victor', 'Hale', 'M', 'Sales Director', 'Sales', 'Enterprise Sales', 'Manager', 'ceo', 5.6, 150000,
       [('Sales Strategy', 9), ('Negotiation', 9), ('Leadership', 8), ('CRM', 8), ('Forecasting', 8)], 4.4, 'Seattle, WA')
person('jess', 'Jessica', 'Morgan', 'F', 'Senior Account Executive', 'Sales', 'Enterprise Sales', 'Manager', 'sd', 4.1, 105000,
       [('Enterprise Sales', 9), ('Negotiation', 8), ('Salesforce', 8), ('Presentations', 8), ('Account Management', 8)], 4.5, 'Seattle, WA')
person('andre', 'Andre', 'Williams', 'M', 'Account Executive', 'Sales', 'Enterprise Sales', 'Employee', 'jess', 2.0, 85000,
       [('Sales', 7), ('Salesforce', 7), ('Prospecting', 7), ('Negotiation', 6), ('Presentations', 7)], 3.8, 'Tacoma, WA')
person('sara', 'Sara', 'Lindgren', 'F', 'Sales Development Representative', 'Sales', 'Enterprise Sales', 'Employee', 'jess', 0.7, 62000,
       [('Cold Outreach', 7), ('Salesforce', 6), ('Prospecting', 7), ('Communication', 8)], 3.6, 'Seattle, WA')
person('carlos', 'Carlos', 'Ruiz', 'M', 'Sales Team Lead', 'Sales', 'SMB Sales', 'Manager', 'sd', 3.4, 92000,
       [('SMB Sales', 8), ('CRM', 8), ('Coaching', 7), ('Negotiation', 7), ('Pipeline Management', 8)], 4.0, 'Bellevue, WA')
person('maya', 'Maya', 'Singh', 'F', 'Account Executive', 'Sales', 'SMB Sales', 'Employee', 'carlos', 1.7, 76000,
       [('Sales', 7), ('HubSpot', 7), ('Demo Delivery', 7), ('Prospecting', 6)], 4.1, 'Seattle, WA')
person('ben_h', 'Ben', 'Hartley', 'M', 'Inside Sales Representative', 'Sales', 'SMB Sales', 'Employee', 'carlos', 1.0, 64000,
       [('Cold Calling', 7), ('HubSpot', 6), ('Communication', 7), ('Objection Handling', 5)], 2.5, 'Seattle, WA')
# Marketing
person('mh', 'Fatima', 'Khan', 'F', 'Head of Marketing', 'Marketing', 'Growth Marketing', 'Manager', 'ceo', 4.8, 138000,
       [('Marketing Strategy', 9), ('Branding', 8), ('Leadership', 8), ('Analytics', 7), ('Budgeting', 7)], 4.4, 'Seattle, WA')
person('ben_c', 'Ben', 'Carter', 'M', 'Growth Marketing Manager', 'Marketing', 'Growth Marketing', 'Manager', 'mh', 3.3, 98000,
       [('Growth Marketing', 9), ('SEO', 8), ('Google Analytics', 8), ('Paid Ads', 8), ('A/B Testing', 7)], 4.2, 'Seattle, WA')
person('nadia', 'Nadia', 'Popescu', 'F', 'Content Strategist', 'Marketing', 'Growth Marketing', 'Employee', 'ben_c', 2.5, 78000,
       [('Content Writing', 9), ('SEO', 7), ('Editing', 8), ('Social Media', 7), ('Storytelling', 8)], 4.3, 'Tacoma, WA')
person('lucas', 'Lucas', 'Moreau', 'M', 'Digital Marketing Specialist', 'Marketing', 'Growth Marketing', 'Employee', 'ben_c', 1.2, 70000,
       [('Paid Ads', 7), ('Email Marketing', 7), ('Google Analytics', 6), ('Canva', 7)], 3.7, 'Seattle, WA')
# Customer Support
person('ch', 'Grace', 'Mensah', 'F', 'Head of Customer Support', 'Customer Support', 'Customer Support', 'Manager', 'coo', 4.9, 118000,
       [('Customer Success', 9), ('Support Operations', 8), ('Leadership', 8), ('Zendesk', 8), ('Coaching', 8)], 4.5, 'Seattle, WA')
person('ethan', 'Ethan', 'Park', 'M', 'Support Team Lead', 'Customer Support', 'Customer Support', 'Manager', 'ch', 3.0, 76000,
       [('Customer Support', 9), ('Zendesk', 8), ('Coaching', 7), ('Escalation Management', 8), ('Communication', 9)], 4.3, 'Seattle, WA')
person('lily', 'Lily', 'Anderson', 'F', 'Customer Support Specialist', 'Customer Support', 'Customer Support', 'Employee', 'ethan', 2.1, 56000,
       [('Customer Support', 8), ('Zendesk', 7), ('Empathy', 9), ('Communication', 8)], 4.2, 'Seattle, WA')
person('mohamed', 'Mohamed', 'Farouk', 'M', 'Customer Support Specialist', 'Customer Support', 'Customer Support', 'Employee', 'ethan', 1.6, 55000,
       [('Customer Support', 7), ('Zendesk', 6), ('Communication', 7), ('Empathy', 6)], 2.8, 'Bellevue, WA')
person('chiara', 'Chiara', 'Bianchi', 'F', 'Customer Support Specialist', 'Customer Support', 'Customer Support', 'Employee', 'ethan', 0.25, 52000,
       [('Customer Support', 6), ('Zendesk', 5), ('Empathy', 8), ('Communication', 8)], 3.7, 'Seattle, WA')
person('owen', 'Owen', 'Murphy', 'M', 'Technical Support Engineer', 'Customer Support', 'Customer Support', 'Employee', 'ethan', 1.9, 68000,
       [('Technical Support', 8), ('SQL', 6), ('APIs', 6), ('Zendesk', 7), ('Troubleshooting', 8)], 4.0, 'Seattle, WA')

# Former employees: (first, last, gender, position, dept, team, boss, tenure at exit, leave date offset (days ago), reason, perf, salary, skills)
FORMER = [
    ('Bharat', 'Chopra', 'M', 'Customer Support Specialist', 'Customer Support', 'Customer Support', 'ethan', 1.4, 215, 'Compensation', 3.0, 49000, ['Customer Support', 'Zendesk', 'Communication']),
    ('Neha', 'Kulkarni', 'F', 'Frontend Engineer', 'Engineering', 'Web Applications', 'marcus', 2.2, 330, 'Career growth', 4.0, 112000, ['React', 'JavaScript', 'CSS']),
    ('Rajesh', 'Iyengar', 'M', 'Account Executive', 'Sales', 'SMB Sales', 'carlos', 0.9, 160, 'Management', 2.6, 70000, ['Sales', 'HubSpot', 'Prospecting']),
    ('Sonali', 'Das', 'F', 'Marketing Specialist', 'Marketing', 'Growth Marketing', 'ben_c', 1.1, 290, 'Work-life balance', 3.4, 64000, ['Email Marketing', 'Canva', 'Social Media']),
    ('Dhruv', 'Vohra', 'M', 'Backend Engineer', 'Engineering', 'Platform Team', 'sarah', 3.0, 350, 'Career growth', 4.3, 126000, ['Python', 'PostgreSQL', 'Docker']),
    ('Alka', 'Gill', 'F', 'HR Coordinator', 'Human Resources', 'People Operations', 'hrbp', 0.8, 255, 'Relocation', 3.5, 50000, ['Onboarding', 'HRIS', 'Scheduling']),
    ('Pranav', 'Nambiar', 'M', 'Data Analyst', 'Engineering', 'Data & AI', 'elena', 1.6, 120, 'Compensation', 3.2, 80000, ['SQL', 'Excel', 'Tableau']),
    ('Ishani', 'Tripathi', 'F', 'Customer Support Specialist', 'Customer Support', 'Customer Support', 'ethan', 0.7, 60, 'Work-life balance', 2.9, 50000, ['Customer Support', 'Zendesk', 'Empathy']),
]

SKILL_CATEGORIES = {
    'Technical': ['Python', 'Go', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Django', 'SQL', 'PostgreSQL', 'Spark', 'Airflow', 'Docker',
                  'Kubernetes', 'Terraform', 'AWS', 'Linux', 'CI/CD', 'GitHub Actions', 'Monitoring', 'Git', 'REST APIs', 'CSS', 'Testing',
                  'Test Automation', 'Selenium', 'API Testing', 'Machine Learning', 'PyTorch', 'TensorFlow', 'MLOps', 'Statistics', 'Tableau',
                  'System Design', 'Accessibility', 'Troubleshooting', 'Technical Support', 'APIs'],
    'Business': ['Strategic Planning', 'Operations Management', 'Budgeting', 'Forecasting', 'Financial Reporting', 'Accounting', 'Tax',
                 'Auditing', 'Payroll', 'Accounts Payable', 'Reconciliation', 'Compliance', 'Process Improvement', 'Fundraising',
                 'Product Strategy', 'Roadmapping', 'Product Management', 'Requirements Analysis', 'Data Analysis', 'Analytics',
                 'Excel', 'Microsoft Office', 'Jira', 'Agile', 'Marketing Strategy', 'Branding', 'Growth Marketing', 'SEO', 'Google Analytics',
                 'Paid Ads', 'A/B Testing', 'Email Marketing', 'Content Writing', 'Editing', 'Social Media', 'Storytelling', 'Canva'],
    'Sales & Support': ['Sales', 'Sales Strategy', 'Enterprise Sales', 'SMB Sales', 'Salesforce', 'HubSpot', 'CRM', 'Prospecting', 'Cold Outreach',
                        'Cold Calling', 'Negotiation', 'Presentations', 'Account Management', 'Demo Delivery', 'Pipeline Management',
                        'Objection Handling', 'Customer Support', 'Customer Success', 'Zendesk', 'Support Operations', 'Escalation Management', 'Empathy'],
    'Design & Research': ['Figma', 'UX Design', 'Prototyping', 'Design Systems', 'User Research', 'Usability Testing', 'Interviewing'],
    'People & Leadership': ['Leadership', 'Mentoring', 'Coaching', 'Communication', 'Hiring', 'Employee Relations', 'Recruitment', 'Sourcing', 'ATS',
                            'Labor Law', 'Conflict Resolution', 'HRIS', 'Onboarding', 'Performance Management', 'Engineering Management',
                            'Stakeholder Management', 'Scheduling', 'Travel Planning', 'Confidentiality', 'Accuracy', 'QA Strategy'],
}

CITY_STREETS = {
    'Bengaluru': ['4th Cross, Indiranagar', '5th Block, Koramangala', '3rd Block, Jayanagar', 'Sector 2, HSR Layout', 'Whitefield Main Road', 'MG Road'],
    'Hyderabad': ['Road No. 12, Banjara Hills', 'Gachibowli Main Road', 'Madhapur Lane 4', 'Jubilee Hills Road No. 36', 'Kondapur Main Road'],
    'Pune': ['Kothrud Main Road', 'Baner Road', 'Koregaon Park Lane 5', 'Viman Nagar Road', 'Aundh Gaon'],
    'Chennai': ['2nd Avenue, Anna Nagar', 'Adyar Main Road', 'T. Nagar Usman Road', 'Velachery Main Road', 'OMR, Thoraipakkam'],
}
PIN_PREFIX = {'Bengaluru': '5600', 'Hyderabad': '5000', 'Pune': '4110', 'Chennai': '6000'}
BANKS = {'HDFC Bank': 'HDFC0', 'ICICI Bank': 'ICIC0', 'State Bank of India': 'SBIN0', 'Axis Bank': 'UTIB0', 'Kotak Mahindra Bank': 'KKBK0'}
from utils.workdays import DEFAULT_HOLIDAYS  # noqa: E402  (company holidays; the same list the app uses for leave days)

HOLIDAYS = {h['date'] for h in DEFAULT_HOLIDAYS}

OBJECTIVES = {
    'Engineering': [
        ('Improve service reliability', 'Reduce production incidents and mean time to recovery for owned services.', ['Cut P1 incidents by 30%', 'Add alerting for the top 10 failure modes', 'Run two game-day exercises']),
        ('Raise automated test coverage', 'Make releases safer by growing meaningful automated coverage.', ['Reach 80% coverage on core modules', 'Add contract tests for public APIs', 'Remove flaky tests']),
        ('Ship the Q4 roadmap items on time', 'Deliver committed roadmap work with predictable quality.', ['Deliver milestone 1', 'Deliver milestone 2', 'Write launch documentation']),
        ('Grow technical skills', 'Invest in learning that benefits the team.', ['Complete one advanced course', 'Give an internal tech talk']),
    ],
    'Product & Design': [
        ('Validate the next product bet', 'Use research to decide what to build next.', ['Interview 12 customers', 'Synthesize findings', 'Present recommendation to leadership']),
        ('Improve onboarding conversion', 'Make the first-week experience clearer.', ['Map the current journey', 'Ship two experiments', 'Lift activation by 8%']),
    ],
    'Sales': [
        ('Hit the quarterly revenue target', 'Own pipeline creation and closing for the quarter.', ['Build 3x pipeline coverage', 'Close committed deals', 'Update forecast weekly']),
        ('Expand existing accounts', 'Grow revenue within current customers.', ['Hold QBRs with top accounts', 'Land two expansion deals']),
    ],
    'Marketing': [
        ('Grow qualified inbound leads', 'Increase marketing-qualified leads while holding cost per lead.', ['Publish 12 SEO articles', 'Launch two campaigns', 'Reduce CPL by 10%']),
        ('Strengthen the brand voice', 'Consistent messaging across channels.', ['Finalize messaging guide', 'Train the sales team']),
    ],
    'Customer Support': [
        ('Improve customer satisfaction', 'Raise CSAT through faster, clearer replies.', ['Reach 92% CSAT', 'Cut first-response time to 2h', 'Update 15 help-center articles']),
        ('Reduce escalations', 'Resolve more issues at first contact.', ['Document top escalation causes', 'Shadow engineering twice']),
    ],
    'Human Resources': [
        ('Improve time-to-hire', 'Speed up hiring without lowering the bar.', ['Standardize interview kits', 'Reduce time-to-offer to 25 days']),
        ('Strengthen onboarding', 'A smooth first 90 days for every new hire.', ['Refresh the onboarding checklist', 'Collect feedback from every new hire']),
    ],
    'Finance': [
        ('Accelerate the monthly close', 'Close the books faster with fewer adjustments.', ['Close in 5 working days', 'Automate two reconciliations']),
        ('Strengthen financial controls', 'Reduce audit findings.', ['Document key controls', 'Complete the quarterly review']),
    ],
    'Executive': [
        ('Execute the annual company plan', 'Keep the company on its yearly objectives.', ['Run quarterly business reviews', 'Review KPI dashboard monthly']),
        ('Strengthen company culture', 'Keep engagement high as the company grows.', ['Run the engagement survey', 'Act on the top three themes']),
    ],
}

COURSES = [
    ('Information Security Awareness', 'Phishing, passwords and safe handling of company data. Required every year.', [], True, 2),
    ('POSH Awareness (Prevention of Sexual Harassment)', 'The POSH Act, the Internal Committee and how to raise concerns. Required every year by law.', [], True, 1.5),
    ('Data Privacy Essentials (DPDP Act)', 'Handling personal data lawfully under the Digital Personal Data Protection Act.', [], True, 2),
    ('Advanced Python for Engineers', 'Typing, async, packaging and testing patterns.', ['Python', 'Testing'], False, 12),
    ('Kubernetes in Production', 'Deploying and operating services on Kubernetes.', ['Kubernetes', 'Monitoring'], False, 16),
    ('Leadership Essentials', 'Feedback, delegation and running effective one-to-ones.', ['Leadership', 'Coaching'], False, 10),
    ('SQL for Analysts', 'Joins, window functions and query tuning.', ['SQL', 'Data Analysis'], False, 8),
    ('Consultative Selling', 'Discovery, objection handling and value selling.', ['Negotiation', 'Presentations', 'Sales'], False, 6),
    ('Customer Empathy & De-escalation', 'Handling difficult conversations with calm and clarity.', ['Empathy', 'Escalation Management'], False, 4),
    ('Excel for Finance Teams', 'Modelling, pivot tables and reconciliations.', ['Excel', 'Reconciliation'], False, 6),
    ('Accessible Web Design', 'Designing and building to WCAG standards.', ['Accessibility', 'CSS'], False, 5),
    ('Machine Learning in Practice', 'From notebook to production.', ['Machine Learning', 'MLOps'], False, 20),
]


# --------------------------------------------------------------------------------------------------- helpers
def business_days(start, end):
    d, out = start, []
    while d <= end:
        if d.weekday() < 5 and d.isoformat() not in HOLIDAYS:
            out.append(d)
        d += datetime.timedelta(days=1)
    return out


COMPANY_TZ = zoneinfo.ZoneInfo('Asia/Kolkata')      # the company's office (see Settings > General > Timezone)


def iso_at(day, hour, minute):
    """A wall-clock time at the company's office, stored as UTC."""
    moment = datetime.datetime(day.year, day.month, day.day, hour, minute, tzinfo=COMPANY_TZ).astimezone(UTC)
    now = datetime.datetime.now(tz=UTC).replace(microsecond=0)
    return min(moment, now - datetime.timedelta(minutes=5)).isoformat()   # nothing in the seed happens in the future


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--yes', action='store_true', help='confirm that ALL data in the configured database may be deleted')
    parser.add_argument('--force', action='store_true', help='allow seeding when DEBUG=False')
    parser.add_argument('--allow-remote', action='store_true', help='allow a mongodb+srv:// (cloud) database')
    args = parser.parse_args(argv)

    import django
    django.setup()
    from django.conf import settings
    uri, name = settings.MONGODB_URI, settings.MONGODB_NAME
    if not settings.DEBUG and not args.force:
        sys.exit('Refusing to seed demo data while DEBUG is False (use --force if you really mean it).')
    if 'mongodb+srv' in uri and not args.allow_remote:
        sys.exit('The configured database is a cloud (mongodb+srv) cluster. Re-run with --allow-remote to wipe and seed it.')
    if not args.yes:
        sys.exit(f"This DELETES ALL DATA in database '{name}' and loads the demo company. Re-run with --yes to confirm.")

    from django.contrib.auth.hashers import make_password
    from bson import ObjectId
    from hr_backend.db import db
    print(f"Seeding database '{name}' ({'local' if 'localhost' in uri or '127.0.0.1' in uri else 'remote'}) ...")

    rng = random.Random(20261025)
    now = datetime.datetime.now(tz=UTC)
    today = now.date()

    # ------------------------------------------------------------------ wipe
    # Drop every collection (this also removes stale JSON-schema validators and indexes from earlier versions of
    # the project), then rebuild exactly the indexes the app uses.
    for coll in db.list_collection_names():
        db.drop_collection(coll)
    from hr_backend.db import ensure_indexes
    ensure_indexes()
    media_docs = os.path.join(settings.MEDIA_ROOT, 'documents')
    shutil.rmtree(media_docs, ignore_errors=True)
    print('  wiped the database and the uploaded-documents folder; indexes rebuilt')

    def ts(days_ago=0, hour=10, minute=0):
        d = today - datetime.timedelta(days=days_ago)
        return iso_at(d, hour, minute)

    # ------------------------------------------------------------------ roles, departments
    role_ids = {}
    for rname, perms in (('Admin', ['*']), ('Manager', ['team:manage', 'leaves:approve', 'reviews:write']), ('Employee', ['self:read', 'self:write'])):
        role_ids[rname] = str(db['Roles'].insert_one({'name': rname, 'permissions': perms, 'created_at': ts(900)}).inserted_id)

    dept_desc = {
        'Executive': 'Company leadership and executive office',
        'Human Resources': 'Recruiting, people operations, culture and compliance',
        'Finance': 'Accounting, payroll, budgeting and financial reporting',
        'Engineering': 'Builds and runs the Kaveri platform',
        'Product & Design': 'Product strategy, research and design',
        'Sales': 'Enterprise and SMB revenue',
        'Marketing': 'Brand, content and demand generation',
        'Customer Support': 'Helps customers succeed after they buy',
    }
    dept_ids = {d: str(db['Departments'].insert_one({'name': d, 'description': desc, 'created_at': ts(900)}).inserted_id)
                for d, desc in dept_desc.items()}

    # ------------------------------------------------------------------ employees
    lookup = {p['key']: p for p in R}
    emp_ids, user_ids = {}, {}
    counter = 1000
    pdfs = []   # (employee key, path) filled later

    def make_employee(p, former=False, exit_days_ago=None, tenure=None):
        nonlocal counter
        counter += 1
        code = f'EMP-{counter}'
        tenure_years = tenure if tenure is not None else p['tenure']
        hire = today - datetime.timedelta(days=int(tenure_years * 365.25))
        if former:
            hire = today - datetime.timedelta(days=exit_days_ago + int(tenure_years * 365.25))
        first, last = p['first'], p['last']
        username = f"{first}.{last}".lower().replace("'", '').replace(' ', '')
        email = f'{username}@{DOMAIN}'
        age = rng.randint(24, 52) if 'Head' not in p['position'] else rng.randint(36, 54)
        dob = datetime.date(today.year - age, rng.randint(1, 12), rng.randint(1, 28))
        city = p.get('city') or 'Bengaluru'
        pan = ''.join(rng.choice('ABCDEFGHJKLMNPRSTUVWXYZ') for _ in range(3)) + 'P' + (last[:1].upper() or 'S') + f'{rng.randint(1000, 9999)}' + rng.choice('ABCDEFGHJKLMNPRSTUVWXYZ')
        doc = {
            'employee_id': code, 'first_name': first, 'last_name': last, 'email': email,
            'phone': f"+91 9{rng.randint(1000, 9999)} {rng.randint(10000, 99999)}",
            'location': f'{city} office', 'business_unit': BUSINESS_UNITS.get(p['dept'], 'Corporate'),
            'address': f"{rng.randint(1, 120)}, {rng.choice(CITY_STREETS[city])}, {city} - {PIN_PREFIX[city]}{rng.randint(10, 99)}",
            'tax_id': pan, 'uan': f'{rng.randint(10 ** 11, 10 ** 12 - 1)}',
            'emergency_contact': {'name': f"{rng.choice(['Ramesh', 'Sunita', 'Anil', 'Geeta', 'Mahesh', 'Kavita', 'Sanjay'])} {last}",
                                  'phone': f"+91 9{rng.randint(1000, 9999)} {rng.randint(10000, 99999)}",
                                  'relationship': rng.choice(['Spouse', 'Parent', 'Sibling', 'Spouse'])},
            'date_of_birth': dob.isoformat(), 'gender': 'Female' if p['gender'] == 'F' else 'Male',
            'marital_status': rng.choice(['Single', 'Married', 'Married', 'Single']),
            'position': p['position'], 'salary': float(p['salary']), 'employment_type': 'Full-time',
            'employment_status': 'Terminated' if former else 'Active',
            'skills': [{'name': n, 'proficiency': lv} for n, lv in p['skills']],
            'documents': [], 'profile_image': '',
            'role': {'Admin': 'Admin', 'Manager': 'Manager', 'Employee': 'Employee'}[p['role']],
            'department_id': dept_ids[p['dept']], 'department': p['dept'], 'team': p['team'],
            'hire_date': hire.isoformat(), 'termination_date': (today - datetime.timedelta(days=exit_days_ago)).isoformat() if former else '',
            'created_at': iso_at(hire, 9, 0), 'updated_at': ts(rng.randint(1, 40)), 'active': not former,
        }
        eid = db['Employees'].insert_one(doc).inserted_id
        uid = db['Users'].insert_one({
            'username': username, 'email': email, 'password': make_password(DEMO_PASSWORD), 'role_id': role_ids[p['role']],
            'employee_id': str(eid), 'active': not former, 'created_at': iso_at(hire, 9, 0)}).inserted_id
        db['Employees'].update_one({'_id': eid}, {'$set': {'user_id': str(uid)}})
        return eid, uid, code, hire

    meta = {}   # key -> dict(code, hire, uid, eid)
    for p in R:
        eid, uid, code, hire = make_employee(p)
        emp_ids[p['key']], user_ids[p['key']] = str(eid), str(uid)
        meta[p['key']] = {'code': code, 'hire': hire, 'eid': str(eid), 'uid': str(uid), 'p': p}
    # managers (employee _id of the direct manager)
    for p in R:
        if p['boss']:
            db['Employees'].update_one({'_id': ObjectId(emp_ids[p['key']])}, {'$set': {'manager_id': emp_ids[p['boss']]}})
        else:
            db['Employees'].update_one({'_id': ObjectId(emp_ids[p['key']])}, {'$set': {'manager_id': ''}})

    # former employees
    former_meta = []
    for i, (first, last, g, pos, dept, team, boss, ten, left_ago, reason, perf, salary, skills) in enumerate(FORMER):
        p = dict(key=f'former{i}', first=first, last=last, gender=g, position=pos, dept=dept, team=team, role='Employee', boss=boss,
                 tenure=ten, salary=inr_ctc(salary), skills=[(s, rng.randint(5, 8)) for s in skills], perf=perf, city='Bengaluru')
        eid, uid, code, hire = make_employee(p, former=True, exit_days_ago=left_ago, tenure=ten)
        db['Employees'].update_one({'_id': eid}, {'$set': {'manager_id': emp_ids[boss]}})
        former_meta.append({'eid': str(eid), 'uid': str(uid), 'code': code, 'hire': hire, 'p': p, 'left_ago': left_ago, 'reason': reason, 'boss': boss})
        meta[p['key']] = {'code': code, 'hire': hire, 'eid': str(eid), 'uid': str(uid), 'p': p}
    print(f"  {len(R)} active employees + {len(FORMER)} former employees, with user accounts")

    # ------------------------------------------------------------------ teams
    TEAMS = [
        ('Leadership Team', 'Executive', 'ceo', 'coo', 'Sets company direction and keeps the business on plan'),
        ('People Operations', 'Human Resources', 'hrd', 'hrbp', 'Recruiting, onboarding, employee relations and culture'),
        ('Accounting', 'Finance', 'fin', 'acc', 'Bookkeeping, payroll, payables and month-end close'),
        ('Platform Team', 'Engineering', 'vpe', 'sarah', 'Core services, infrastructure and reliability'),
        ('Web Applications', 'Engineering', 'vpe', 'marcus', 'Customer-facing web apps and the design system implementation'),
        ('Data & AI', 'Engineering', 'vpe', 'elena', 'Data pipelines, analytics and machine-learning features'),
        ('QA & DevOps', 'Engineering', 'vpe', 'tom', 'Quality engineering, CI/CD and release tooling'),
        ('Product & Design', 'Product & Design', 'hop', 'oliver', 'Discovery, product management and UX design'),
        ('Enterprise Sales', 'Sales', 'sd', 'jess', 'Large-account sales and expansion'),
        ('SMB Sales', 'Sales', 'sd', 'carlos', 'High-velocity sales to small and mid-size businesses'),
        ('Growth Marketing', 'Marketing', 'mh', 'ben_c', 'Content, SEO, paid and lifecycle marketing'),
        ('Customer Support', 'Customer Support', 'ch', 'ethan', 'Customer help, troubleshooting and success'),
    ]
    team_ids = {}
    for tname, dept, mgr, lead, desc in TEAMS:
        members = [m for m in R if m['team'] == tname]
        emp_list = [{'id': emp_ids[m['key']], 'name': f"{m['first']} {m['last']}", 'position': m['position'],
                     'is_leader': m['key'] == lead, 'is_manager': m['key'] == mgr} for m in members]
        if mgr not in [m['key'] for m in members]:       # a department head manages several teams without being a member of each
            pass
        doc = {'name': tname, 'description': desc, 'department_id': dept_ids[dept], 'department': dept,
               'manager_id': emp_ids[mgr], 'leader_id': emp_ids[lead], 'employees': emp_list,
               'members': [emp_ids[m['key']] for m in members],
               'created_at': ts(800), 'updated_at': ts(rng.randint(5, 60)), 'is_active': True}
        tid = str(db['Teams'].insert_one(doc).inserted_id)
        team_ids[tname] = tid
        for m in members:
            db['Employees'].update_one({'_id': ObjectId(emp_ids[m['key']])}, {'$set': {
                'team_id': tid, 'teams': [{'name': tname, 'department': dept, 'is_leader': m['key'] == lead, 'is_manager': m['key'] == mgr}]}})
    for fm in former_meta:
        db['Employees'].update_one({'_id': ObjectId(fm['eid'])}, {'$set': {'team_id': team_ids[fm['p']['team']]}})
    assert all(db['Employees'].find_one({'_id': ObjectId(e)}).get('team_id') for e in emp_ids.values()), 'every employee needs a team'
    print(f"  {len(TEAMS)} teams (every employee is in exactly one)")

    # projects each team is working on
    PROJECTS = [
        ('Platform Team', 'Zero-downtime database migration', 'Move the primary database to a managed cluster with no customer-visible downtime.', 'In Progress', 'High', 85000, 52000, -70, 40),
        ('Platform Team', 'Service observability rollout', 'Tracing, dashboards and alerting for every core service.', 'Completed', 'Medium', 30000, 28400, -200, -45),
        ('Web Applications', 'Customer dashboard redesign', 'New navigation and accessible components for the customer dashboard.', 'In Progress', 'High', 70000, 31000, -50, 60),
        ('Web Applications', 'Design-system v2', 'Shared component library used by every web app.', 'Planning', 'Medium', 40000, 0, 14, 120),
        ('Data & AI', 'Churn-scoring pipeline', 'Daily churn probabilities for account managers.', 'In Progress', 'High', 60000, 26500, -60, 45),
        ('Data & AI', 'Feature store', 'Reusable, documented features for ML models.', 'On Hold', 'Low', 25000, 6000, -90, 100),
        ('QA & DevOps', 'Release pipeline v3', 'Cut release time below twenty minutes with automated gates.', 'In Progress', 'High', 35000, 21000, -80, 30),
        ('Product & Design', 'Onboarding experience experiments', 'Two activation experiments for the first week.', 'In Progress', 'Medium', 20000, 8000, -30, 45),
        ('Enterprise Sales', 'Strategic accounts programme', 'Executive sponsorship and QBRs for the top 20 accounts.', 'In Progress', 'High', 45000, 22000, -100, 70),
        ('SMB Sales', 'Referral programme launch', 'Customer referral incentives and tracking.', 'Planning', 'Medium', 15000, 0, 10, 90),
        ('Growth Marketing', 'Webinar series', 'Monthly customer webinars with lead capture.', 'In Progress', 'Medium', 18000, 9500, -45, 120),
        ('Growth Marketing', 'SEO content refresh', 'Refresh the 40 highest-traffic articles.', 'Completed', 'Low', 12000, 11200, -150, -20),
        ('Customer Support', 'Self-service help centre', 'Rewrite the top 60 help articles and add search.', 'In Progress', 'High', 22000, 9000, -40, 65),
        ('People Operations', 'Manager training programme', 'Eight-week programme for first-time managers.', 'In Progress', 'Medium', 28000, 12000, -35, 80),
        ('Accounting', 'Expense automation', 'Automate expense approval and reimbursement.', 'Planning', 'Medium', 24000, 0, 21, 110),
        ('Leadership Team', 'FY27 planning', 'Annual plan, budget and hiring roadmap.', 'In Progress', 'High', 0, 0, -20, 55),
    ]
    team_lead = {t[0]: t[3] for t in TEAMS}
    for tname, pname, pdesc, pstatus, prio, budget, spent, start_off, end_off in PROJECTS:
        db['Projects'].insert_one({
            'name': pname, 'description': pdesc, 'status': pstatus, 'priority': prio, 'budget': budget * 100, 'budget_spent': spent * 100,
            'start_date': (today + datetime.timedelta(days=start_off)).isoformat(), 'end_date': (today + datetime.timedelta(days=end_off)).isoformat(),
            'team_id': ObjectId(team_ids[tname]), 'manager_id': ObjectId(emp_ids[team_lead[tname]]),
            'created_at': ts(max(-start_off, 1)), 'updated_at': ts(rng.randint(1, 15))})
    print(f'  {len(PROJECTS)} projects')

    # master skills
    cat_of = {s: c for c, items in SKILL_CATEGORIES.items() for s in items}
    all_skill_names = sorted({n for m in R for n, _ in m['skills']})
    db['Skills'].insert_many([{'name': n, 'category': cat_of.get(n, 'General'), 'proficiency': 5} for n in all_skill_names])

    # ------------------------------------------------------------------ settings
    db['Settings'].insert_one({'_key': 'app',
        'general': {'companyName': COMPANY, 'timezone': 'Asia/Kolkata', 'holidays': DEFAULT_HOLIDAYS},
        'knowledge': {
            'faq': [
                {'q': 'How many leave days do I get?', 'a': 'Full-time employees receive 18 Earned Leave days and 10 Sick Leave days per year. Unused days do not carry over. Loss-of-pay leave is unlimited but reduces your salary for those days.'},
                {'q': 'How do I request time off?', 'a': 'Open Leave Management > Request Leave, pick the dates and submit. Your manager is notified and decides within two working days.'},
                {'q': 'When am I paid?', 'a': 'Salaries are credited on the last working day of each month. Your payslip appears under Payroll once HR releases the month.'},
                {'q': 'What is the remote work policy?', 'a': 'Hybrid: three days a week in your city office (Bengaluru, Hyderabad, Pune or Chennai), two remote. Managers can approve exceptions.'},
                {'q': 'How do I submit an expense?', 'a': 'Use Expenses > New claim with the category, amount and a short description. Claims over ₹5,000 need a bill or receipt attached to the ticket.'},
                {'q': 'Who do I contact for IT problems?', 'a': 'Raise a Helpdesk ticket with category IT. Urgent outages: message #it-help on Slack.'},
                {'q': 'What should I do in my first week?', 'a': 'Complete your profile, upload your Aadhaar, PAN, offer letter and certificates, add your bank details, finish the mandatory trainings and meet your team lead.'},
            ],
            'requiredDocuments': ['Offer letter', 'Aadhaar card', 'PAN card', 'Educational certificates'],
            'employeeTasks': ['Complete your profile', 'Read the employee handbook', 'Set up your workstation and accounts with IT', 'Meet your manager and team'],
            'hrTasks': ['Create accounts and email', 'Assign laptop and assets', 'Schedule orientation', 'Add to payroll and PF (UAN)'],
        }})

    # ------------------------------------------------------------------ documents (real PDF files)
    from reportlab.lib.pagesizes import A4
    from payroll.engine import inr
    from reportlab.pdfgen import canvas

    def make_pdf(path, title, lines):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        c = canvas.Canvas(path, pagesize=A4)
        c.setFont('Helvetica-Bold', 16)
        c.drawString(72, 780, title)
        c.setFont('Helvetica', 11)
        y = 750
        for line in lines:
            c.drawString(72, y, line)
            y -= 18
        c.setFont('Helvetica-Oblique', 9)
        c.drawString(72, 60, f'{COMPANY} - confidential - generated demo document')
        c.save()

    expiring = {'sara': 38, 'hiroshi': 52}      # professional certifications that expire soon (compliance alerts)
    still_collecting = {'zoe', 'emily', 'sara', 'chiara', 'hrc'}   # recent joiners whose paperwork is not complete yet
    n_docs = 0
    for key, m in meta.items():
        p, eid = m['p'], m['eid']
        fm = key.startswith('former')
        folder = os.path.join(media_docs, eid)
        full = f"{p['first']} {p['last']}"
        docs_for = [
            ('Offer letter', 'contract', 'offer-letter.pdf',
             [f'Employee: {full} ({m["code"]})', f'Designation: {p["position"]}, {p["dept"]}', f'Date of joining: {m["hire"]}',
              f'Annual CTC: {inr(p["salary"])}', 'Employment type: Full-time, permanent']),
            ('Aadhaar card', 'identity', 'aadhaar.pdf', [f'Employee: {full}', 'Document: Aadhaar card (verified by HR)', f'Verified on: {m["hire"]}']),
            ('PAN card', 'identity', 'pan.pdf', [f'Employee: {full}', 'Document: PAN card (verified by HR)', f'Verified on: {m["hire"]}']),
            ('Educational certificates', 'education', 'certificates.pdf', [f'Employee: {full}', 'Degree and mark sheets (verified by HR)', f'Verified on: {m["hire"]}']),
        ]
        if key in still_collecting:                       # paperwork still pending: the compliance page flags the missing ones
            docs_for = docs_for[:2] if key in ('zoe', 'chiara') else [d for d in docs_for if d[0] != 'Educational certificates']
        for title, category, fname, lines in docs_for:
            path = os.path.join(folder, fname)
            make_pdf(path, f'{title} - {full}', lines)
            db['Documents'].insert_one({
                'employee_id': ObjectId(eid), 'name': title, 'description': f'{title} for {full}',
                'file_path': os.path.relpath(path, settings.MEDIA_ROOT), 'file_type': 'application/pdf',
                'file_size': os.path.getsize(path), 'upload_date': iso_at(m['hire'], 11, 0), 'uploaded_by': user_ids['hrd'],
                'is_confidential': True, 'tags': [category], 'category': category, 'expires_on': ''})
            n_docs += 1
        if key in expiring:
            path = os.path.join(folder, 'certification.pdf')
            expires = today + datetime.timedelta(days=expiring[key])
            make_pdf(path, f'Professional certification - {full}', [f'Employee: {full}', f'Valid until: {expires}'])
            db['Documents'].insert_one({
                'employee_id': ObjectId(eid), 'name': 'Professional certification', 'description': 'Certification that must be renewed',
                'file_path': os.path.relpath(path, settings.MEDIA_ROOT), 'file_type': 'application/pdf',
                'file_size': os.path.getsize(path), 'upload_date': iso_at(m['hire'], 11, 30), 'uploaded_by': user_ids['hrd'],
                'is_confidential': True, 'tags': ['certification'], 'category': 'certification', 'expires_on': expires.isoformat()})
            n_docs += 1
    print(f'  {n_docs} documents with real PDF files in media/')

    # ------------------------------------------------------------------ leaves (before attendance: attendance skips leave days)
    def manager_user(key):
        boss = lookup[key]['boss']
        return (user_ids[boss], f"{lookup[boss]['first']} {lookup[boss]['last']}") if boss else (user_ids['hrd'], 'Priya Nair')

    leave_days_by_emp = {k: set() for k in meta}
    leave_docs = []
    SICK_REASONS = ['Flu', 'Migraine', 'Stomach bug', 'Doctor-advised rest', 'Dental surgery recovery', 'Fever']
    reasons = ['Family vacation', 'Medical appointment', 'Personal errands', 'Visiting family', 'Long weekend trip', 'Moving house',
               'Wedding to attend', 'Rest and recovery', 'Child care', 'Dental treatment']

    def add_leave(key, start, end, status, half=False, ltype='Earned Leaves', reason=None, requested_days_before=10):
        days = business_days(start, end)
        if not days:
            return
        m = meta[key]
        mgr_uid, mgr_name = manager_user(key)
        n = 0.5 if half else float(len(days))
        doc = {
            'employee_id': m['code'], 'employee_name': f"{m['p']['first']} {m['p']['last']}", 'leave_type': ltype,
            'is_half_day': half, 'half_day_segment': rng.choice(['First Half', 'Second Half']) if half else None,
            'start_date': days[0].isoformat(), 'end_date': days[-1].isoformat(), 'days': n,
            'reason': reason or rng.choice(reasons), 'status': status,
            'requested_at': iso_at(days[0] - datetime.timedelta(days=requested_days_before), 10, rng.randint(0, 59)),
            'manager_id': mgr_uid, 'manager_name': mgr_name,
            'created_at': now - datetime.timedelta(days=(today - days[0]).days + requested_days_before),
            'updated_at': now,
        }
        if status in ('Approved', 'Rejected'):
            doc.update({'comments': 'Enjoy your time off!' if status == 'Approved' else 'Sorry - the team is short-staffed that week, please pick other dates.',
                        'reviewed_by': mgr_uid, 'reviewed_at': iso_at(days[0] - datetime.timedelta(days=requested_days_before - 2), 15, 0)})
        leave_docs.append(doc)
        if status == 'Approved':
            leave_days_by_emp[key] |= set(days)

    for key, m in meta.items():
        if key.startswith('former'):
            continue
        hire = m['hire']
        window_start = max(hire + datetime.timedelta(days=45), today - datetime.timedelta(days=300))
        window_days = (today - datetime.timedelta(days=14) - window_start).days
        if window_days < 30:
            continue
        for _ in range(rng.choice([1, 2, 2, 3, 3, 4])):
            start = window_start + datetime.timedelta(days=rng.randint(0, window_days - 5))
            length = rng.choice([1, 1, 2, 3, 3, 5, 5])
            end = start + datetime.timedelta(days=length - 1)
            if any(d in leave_days_by_emp[key] for d in business_days(start, end)):
                continue
            if length <= 3 and rng.random() < 0.25:
                add_leave(key, start, end, 'Approved', half=(length == 1 and rng.random() < 0.4), ltype='Sick Leaves',
                          reason=rng.choice(SICK_REASONS), requested_days_before=0)
            else:
                add_leave(key, start, end, 'Approved', half=(length == 1 and rng.random() < 0.3))
    # rejected, pending and upcoming-approved requests
    for key, (off, length, status, reason) in {
        'ben_h': (14, 3, 'Pending', 'Family event out of state'),
        'noah': (21, 5, 'Pending', 'Holiday trip'),
        'lily': (9, 2, 'Pending', 'Moving apartments'),
        'aisha': (35, 4, 'Pending', 'Sister\'s wedding'),
        'maya': (16, 1, 'Pending', 'Medical appointment'),
        'kevin': (60, 10, 'Approved', 'Annual vacation abroad'),
        'olivia': (28, 3, 'Approved', 'Long weekend trip'),
        'nadia': (12, 1, 'Rejected', 'Personal errands'),
        'tariq': (-5, 2, 'Rejected', 'Moving house'),
    }.items():
        start = today + datetime.timedelta(days=abs(off))
        while start.weekday() >= 5:
            start += datetime.timedelta(days=1)
        if off < 0:      # recently decided rejected request in the past 2 weeks
            start = today - datetime.timedelta(days=abs(off) + 3)
            while start.weekday() >= 5:
                start += datetime.timedelta(days=1)
        add_leave(key, start, start + datetime.timedelta(days=length - 1), status, reason=reason, requested_days_before=6)
    if leave_docs:
        db['Leaves'].insert_many(leave_docs)
    n_approved = sum(1 for d in leave_docs if d['status'] == 'Approved')
    print(f"  {len(leave_docs)} leave requests ({n_approved} approved, {sum(1 for d in leave_docs if d['status'] == 'Pending')} pending)")

    # ------------------------------------------------------------------ attendance
    late_streak = {'tariq', 'ben_h'}                 # genuinely late a few times -> anomaly detection has something real to find
    missing_out = {'mohamed': 9, 'noah': 17}         # forgot to clock out on this many days ago
    n_att = 0
    att_docs = []
    for key, m in meta.items():
        p = m['p']
        former = key.startswith('former')
        if former:
            continue
        start = max(m['hire'], today - datetime.timedelta(days=100))
        for day in business_days(start, today - datetime.timedelta(days=1)):
            if day in leave_days_by_emp[key]:
                continue
            if rng.random() < 0.015:                         # occasional unrecorded sick day
                continue
            wfh_day = day.weekday() in (2, 4) and rng.random() < 0.5
            base = 8 * 60 + 45 if p['dept'] not in ('Customer Support',) else 8 * 60
            jitter = int(rng.gauss(0, 14))
            in_min = clamp(base + jitter, 7 * 60 + 15, 10 * 60)
            if key in late_streak and rng.random() < 0.35:
                in_min = 10 * 60 + rng.randint(5, 55)
            work = clamp(int(rng.gauss(8.4 * 60, 35)), 6 * 60 + 30, 10 * 60 + 20)
            lunch = rng.randint(30, 60)
            out_min = in_min + work + lunch
            gap_start = in_min + 4 * 60 + rng.randint(0, 40)
            first_seg = gap_start - in_min
            logs = [{'clock_in': iso_at(day, in_min // 60, in_min % 60), 'clock_out': iso_at(day, gap_start // 60, gap_start % 60)},
                    {'clock_in': iso_at(day, (gap_start + lunch) // 60, (gap_start + lunch) % 60),
                     'clock_out': iso_at(day, out_min // 60, out_min % 60)}]
            total = round((first_seg + (out_min - gap_start - lunch)) / 60, 2)
            doc = {'employee_id': m['eid'], 'date': day.isoformat(), 'clock_in': logs[0]['clock_in'], 'clock_out': logs[-1]['clock_out'],
                   'status': 'present', 'total_hours': total, 'logs': logs, 'work_mode': 'remote' if wfh_day else 'office',
                   'created_at': logs[0]['clock_in'], 'updated_at': logs[-1]['clock_out']}
            if key in missing_out and (today - day).days == missing_out[key]:
                doc['clock_out'] = None
                doc['logs'] = [{'clock_in': logs[0]['clock_in'], 'clock_out': None}]
                doc['total_hours'] = 0.0
            att_docs.append(doc)
        # today: people who are in already (weekday only), not on leave
        if today.weekday() < 5 and today not in leave_days_by_emp[key] and rng.random() < 0.9:
            in_min = clamp(8 * 60 + 40 + int(rng.gauss(0, 15)), 7 * 60 + 30, 9 * 60 + 45)
            if now.hour * 60 + now.minute > in_min:
                ci = iso_at(today, in_min // 60, in_min % 60)
                att_docs.append({'employee_id': m['eid'], 'date': today.isoformat(), 'clock_in': ci, 'clock_out': None, 'status': 'present',
                                 'total_hours': 0.0, 'logs': [{'clock_in': ci, 'clock_out': None}], 'work_mode': 'office',
                                 'created_at': ci, 'updated_at': ci})
    db['Attendance'].insert_many(att_docs)
    print(f'  {len(att_docs)} attendance records (weekends, holidays and approved leave excluded)')

    # ------------------------------------------------------------------ leave-derived balances on the employee
    year = str(today.year)
    for key, m in meta.items():
        used = sum(d['days'] for d in leave_docs if d['employee_id'] == m['code'] and d['status'] == 'Approved'
                   and d['leave_type'] == 'Earned Leaves' and d['start_date'].startswith(year))
        db['Employees'].update_one({'_id': ObjectId(m['eid'])}, {'$set': {'leave_balance': {'earned_leaves': 18, 'used': used, 'remaining': 18 - used}}})

    # ------------------------------------------------------------------ pay items, bank details, payroll
    from payroll import views as payroll_views
    from utils.app_settings import get_settings
    from utils.workdays import holiday_map
    for key, m in meta.items():
        p = m['p']
        items = [{'id': str(ObjectId()), 'kind': 'deduction', 'name': 'Wellness programme contribution', 'amount': 500.0}]
        if p['dept'] in ('Engineering', 'Product & Design', 'Marketing'):
            items.append({'id': str(ObjectId()), 'kind': 'benefit', 'name': 'Internet reimbursement', 'amount': 1000.0})
        if p['dept'] == 'Sales':
            items.append({'id': str(ObjectId()), 'kind': 'benefit', 'name': 'Phone allowance', 'amount': 1500.0})
        if p['role'] == 'Manager':
            items.append({'id': str(ObjectId()), 'kind': 'benefit', 'name': 'Management allowance', 'amount': 8000.0})
        bank = rng.choice(list(BANKS))
        db['Employees'].update_one({'_id': ObjectId(m['eid'])}, {'$set': {
            'pay_items': items,
            'bank_details': {'account_holder': f"{p['first']} {p['last']}", 'bank_name': bank, 'branch': f"{p['city']} main branch",
                             'account_number': str(rng.randint(10 ** 10, 10 ** 14 - 1)), 'ifsc': BANKS[bank] + f'{rng.randint(100000, 999999)}'}}})
    # two recent joiners have not handed in their PAN yet (the pay run's pre-release checks point at them)
    for key in ('zoe', 'chiara'):
        db['Employees'].update_one({'_id': ObjectId(meta[key]['eid'])}, {'$unset': {'tax_id': ''}})
    rates, holidays = get_settings()['payroll'], holiday_map()
    n_slips = 0
    first_of_month = today.replace(day=1)
    for back in range(6, 0, -1):
        month_index = first_of_month.year * 12 + first_of_month.month - 1 - back
        y, mo = divmod(month_index, 12)
        mo += 1
        period = datetime.date(y, mo, 1).strftime('%B %Y')
        pay_date = datetime.date(y, mo, calendar.monthrange(y, mo)[1])
        for key, m in meta.items():
            emp = db['Employees'].find_one({'_id': ObjectId(m['eid'])})
            slip = payroll_views.build_payslip(emp, period, rates, holidays)
            if not slip:
                continue
            slip.update({'date': pay_date.isoformat(), 'status': 'Paid', 'created_at': iso_at(pay_date, 12, 0)})
            db['Payroll'].insert_one(slip)
            n_slips += 1
    print(f'  {n_slips} payslips for the last 6 months (all Paid)')

    # ------------------------------------------------------------------ reviews
    db['ReviewPeriods'].insert_many([
        {'name': 'H1 2026 Performance Review', 'start_date': '2026-01-01', 'end_date': '2026-06-30', 'status': 'Completed', 'type': 'Half-yearly'},
        {'name': 'H2 2026 Performance Review', 'start_date': '2026-07-01', 'end_date': '2026-12-31', 'status': 'Open', 'type': 'Half-yearly'},
    ])
    metric_text = {
        'performance': ('consistently delivers high-quality work', 'needs to improve the consistency of delivery against commitments'),
        'communication': ('communicates clearly and keeps stakeholders informed', 'should communicate progress and blockers earlier'),
        'teamwork': ('is a dependable, collaborative teammate', 'could collaborate more actively with neighbouring teams'),
        'initiative': ('takes ownership and proposes improvements unprompted', 'should take more initiative on open problems'),
        'adaptability': ('adapts quickly to changing priorities', 'would benefit from adapting faster when priorities change'),
    }
    n_reviews = 0
    for key, m in meta.items():
        p = m['p']
        if key.startswith('former') or p['boss'] is None:
            continue
        if (today - m['hire']).days < 150:
            continue
        reviewer_key = p['boss']
        reviewer = lookup[reviewer_key]
        latent = p['perf']
        scores = {k: int(clamp(round(latent + rng.gauss(0, 0.45)), 1, 5)) for k in metric_text}
        avg = round(sum(scores.values()) / len(scores), 2)
        best = max(scores, key=scores.get)
        worst = min(scores, key=scores.get)
        name = p['first']
        when = datetime.date(2026, 7, rng.randint(6, 18))
        db['Reviews'].insert_one({
            'employee_id': m['eid'], 'employee_name': f"{p['first']} {p['last']}",
            'reviewer_id': meta[reviewer_key]['code'], 'reviewer_name': f"{reviewer['first']} {reviewer['last']}",
            'scores': scores, 'average_score': avg, 'status': 'Completed', 'type': 'Individual', 'period': 'H1 2026 Performance Review',
            'strengths': f"{name} {metric_text[best][0]}. Strongest area: {best} ({scores[best]}/5).",
            'areas_for_improvement': (f"{name} {metric_text[worst][1]}." if scores[worst] < 5 else f"Keep stretching: take on a larger scope in {worst}."),
            'comments': f"Overall {name} is {'an outstanding contributor' if avg >= 4.3 else 'a solid contributor' if avg >= 3.5 else 'meeting some but not all expectations'} "
                        f"in the {p['team']} team this half (average {avg}/5).",
            'feedback': '', 'submission_date': iso_at(when, 14, 0), 'review_date': iso_at(when, 14, 0), 'last_updated': iso_at(when, 14, 0)})
        n_reviews += 1
    for r in db['Reviews'].find({'feedback': ''}):
        db['Reviews'].update_one({'_id': r['_id']}, {'$set': {'feedback': r['comments']}})

    # team reviews (one per team, written by the team's manager)
    for tname, dept, mgr, lead, desc in TEAMS:
        members = [m for m in R if m['team'] == tname]
        avg_perf = sum(m['perf'] for m in members) / len(members)
        ratings = {k: int(clamp(round(avg_perf * 20 + rng.gauss(0, 4)), 40, 98)) for k in ('collaboration', 'quality', 'productivity', 'innovation', 'reliability')}
        overall = round(sum(ratings.values()) / len(ratings))
        low = min(ratings, key=ratings.get)
        high = max(ratings, key=ratings.get)
        db['TeamReviews'].insert_one({
            'team_id': team_ids[tname], 'team_name': tname, 'teamName': tname, 'department': dept, 'memberCount': len(members),
            'period': 'H1 2026 Performance Review',
            'summary': f"{tname} performed {'strongly' if overall >= 80 else 'solidly' if overall >= 70 else 'below expectations'} in H1 2026 with an overall score of {overall}/100, "
                       f"led by {lookup[lead]['first']} {lookup[lead]['last']}.",
            'strengths': [f"Highest-rated area: {high} ({ratings[high]}/100)", f"{len(members)} people with an average individual rating of {avg_perf:.1f}/5"],
            'areas_for_improvement': [f"Lowest-rated area: {low} ({ratings[low]}/100)"],
            'achievements': [f"Delivered the H1 commitments for {dept}"], 'goals': [f"Raise {low} by 5 points in H2"],
            'ratings': ratings, 'overallScore': overall, 'status': 'Completed',
            'reviewer_id': meta[mgr]['code'], 'reviewer_name': f"{lookup[mgr]['first']} {lookup[mgr]['last']}",
            'created_at': ts(105), 'updated_at': ts(105)})
    print(f'  {n_reviews} individual reviews and {len(TEAMS)} team reviews')

    # ------------------------------------------------------------------ objectives (OKRs)
    n_obj = 0
    for key, m in meta.items():
        p = m['p']
        if key.startswith('former'):
            continue
        pool = OBJECTIVES.get(p['dept'], OBJECTIVES['Executive'])
        picks = rng.sample(pool, k=min(len(pool), 3 if p['role'] == 'Manager' else 2))
        for title, desc, krs in picks:
            quarter_end = datetime.date(today.year, 12, 31)
            latent = p['perf']
            base = clamp(int(latent * 17 + rng.gauss(0, 12)), 5, 100)
            done_n = round(len(krs) * base / 100)
            progress = int(round(done_n / len(krs) * 100)) if rng.random() < 0.7 else int(base)
            progress = max(progress, 5 if done_n == 0 else progress)
            points, kr_docs = progress * len(krs), []
            for k in krs:                                  # key-result progress adds up to the objective's progress
                got = min(100, points)
                points -= got
                kr_docs.append({'title': k, 'progress': int(got), 'completed': got >= 100})
            status = 'Completed' if progress >= 100 else ('Behind' if progress < 25 and latent < 3.3 else 'At Risk' if progress < 40 else 'On Track')
            db['objectives'].insert_one({
                'title': title, 'description': desc, 'scope': 'individual', 'employee_id': m['eid'], 'target_date': quarter_end.isoformat(),
                'progress': progress, 'status': status,
                'key_results': kr_docs,
                'created_at': ts(rng.randint(60, 110)), 'updated_at': ts(rng.randint(1, 20))})
            n_obj += 1
    # team and department OKRs, owned by the team lead / department head
    TEAM_OKRS = {
        'Leadership Team': ('Execute the annual company plan', ['Run quarterly business reviews', 'Review the KPI dashboard monthly', 'Close the FY27 budget']),
        'People Operations': ('Make hiring and onboarding smooth', ['Cut time-to-hire to 35 days', 'Onboarding satisfaction above 4.5', 'Launch the manager-training programme']),
        'Accounting': ('Close the books faster', ['Month-end close in 5 working days', 'Automate vendor payments', 'Zero payroll corrections']),
        'Platform Team': ('Improve platform reliability', ['99.95% uptime for core services', 'Cut P1 incidents by 30%', 'Run two game-day exercises']),
        'Web Applications': ('Ship the redesigned customer dashboard', ['Deliver the new navigation', 'Reach 90 Lighthouse accessibility score', 'Migrate the last legacy pages']),
        'Data & AI': ('Launch the first ML-powered feature', ['Ship the churn-scoring pipeline', 'Document the feature store', 'Reach 85% precision in review']),
        'QA & DevOps': ('Make releases boring', ['Cut release time to under 20 minutes', 'Reach 80% automated test coverage', 'Remove flaky tests']),
        'Product & Design': ('Validate the next product bet', ['Interview 12 customers', 'Synthesize findings', 'Present the recommendation']),
        'Enterprise Sales': ('Close the Q4 enterprise pipeline', ['Build 3x pipeline coverage', 'Close committed deals', 'Update the forecast weekly']),
        'SMB Sales': ('Grow SMB bookings 20%', ['Lift demo-to-close rate to 25%', 'Launch the referral programme', 'Shorten the sales cycle to 21 days']),
        'Growth Marketing': ('Double qualified inbound leads', ['Publish 24 SEO articles', 'Launch the webinar series', 'Cut cost per lead by 15%']),
        'Customer Support': ('Delight customers faster', ['First response under 2 hours', 'CSAT above 4.6', 'Cut ticket backlog below 40']),
    }
    DEPT_OKRS = {
        'Executive': ('Hit the FY26 operating plan', ['Revenue within 5% of plan', 'Keep attrition under 12%', 'Hire the planned 10 roles']),
        'Human Resources': ('Build a great place to work', ['Engagement score above 8', 'Complete mandatory training for 100% of staff', 'Reduce regretted attrition']),
        'Finance': ('Strong financial controls', ['Pass the annual audit with no findings', 'Forecast accuracy within 3%', 'Automate expense approvals']),
        'Engineering': ('Predictable, high-quality delivery', ['Deliver the Q4 roadmap on time', 'Cut customer-reported bugs by 25%', 'Lift deploy frequency to daily']),
        'Product & Design': ('Ship what customers need', ['Launch two validated features', 'Raise NPS by 8 points', 'Complete the design-system v2']),
        'Sales': ('Reach the annual revenue target', ['Hit quarterly quota in 3 of 4 quarters', 'Raise average deal size 10%', 'Keep net retention above 105%']),
        'Marketing': ('Make the brand known', ['Grow organic traffic 40%', 'Launch the customer-stories hub', 'Hit the MQL target']),
        'Customer Support': ('Support that customers recommend', ['CSAT above 4.6', 'First response under 2 hours', 'Self-service resolves 30% of questions']),
    }

    def scoped_okr(scope, title, krs, owner, **extra):
        base = clamp(int(owner['p']['perf'] * 15 + rng.gauss(0, 10)), 15, 95)
        points, kr_docs = base * len(krs), []
        for k in krs:
            got = min(100, points)
            points -= got
            kr_docs.append({'title': k, 'progress': int(got), 'completed': got >= 100})
        progress = int(round(sum(k['progress'] for k in kr_docs) / len(kr_docs)))
        status = 'On Track' if progress >= 50 else 'At Risk' if progress >= 30 else 'Behind'
        db['objectives'].insert_one({
            'title': title, 'description': '', 'scope': scope, 'employee_id': owner['eid'], 'target_date': f'{today.year}-12-31',
            'progress': progress, 'status': status, 'key_results': kr_docs, **extra,
            'created_at': ts(rng.randint(60, 110)), 'updated_at': ts(rng.randint(1, 20))})

    for tname, dept, mgr, lead, _desc in TEAMS:
        title, krs = TEAM_OKRS[tname]
        scoped_okr('team', title, krs, meta[lead], team_id=team_ids[tname], team_name=tname)
        n_obj += 1
    DEPT_HEAD = {'Executive': 'ceo', 'Human Resources': 'hrd', 'Finance': 'fin', 'Engineering': 'vpe', 'Product & Design': 'hop',
                 'Sales': 'sd', 'Marketing': 'mh', 'Customer Support': 'ch'}
    for dname, (title, krs) in DEPT_OKRS.items():
        scoped_okr('department', title, krs, meta[DEPT_HEAD[dname]], department_id=dept_ids[dname], department_name=dname)
        n_obj += 1
    print(f'  {n_obj} objectives with key results')

    # ------------------------------------------------------------------ PIPs
    def pip(key, status, start_ago, length_days, goals, note):
        m, p = meta[key], meta[key]['p']
        start = today - datetime.timedelta(days=start_ago)
        boss = p['boss']
        db['pips'].insert_one({
            'title': f"Performance improvement plan - {p['first']} {p['last']}",
            'description': note, 'employee_id': m['eid'], 'assigned_by': meta[boss]['code'],
            'start_date': iso_at(start, 10, 0), 'end_date': (start + datetime.timedelta(days=length_days)).isoformat(), 'status': status,
            'goals': [{'title': g, 'completed': i < (len(goals) if status == 'Completed' else 0)} for i, g in enumerate(goals)],
            'notes': [{'text': note, 'author': f"{lookup[boss]['first']} {lookup[boss]['last']}", 'timestamp': iso_at(start, 10, 0), 'role': 'manager'}],
            'created_at': iso_at(start, 10, 0), 'updated_at': ts(rng.randint(1, 7))})
    pip('ben_h', 'In Progress', 28, 60, ['Reach 80% of weekly call target', 'Complete the objection-handling course', 'Weekly pipeline review with team lead'],
        'Quota attainment has been below 60% for two quarters. Agreed a 60-day plan with weekly check-ins.')
    pip('mohamed', 'In Progress', 14, 45, ['Reply to tickets within the 2-hour target', 'Raise CSAT above 85%', 'Shadow two senior agents per week'],
        'First-response time and CSAT are below team targets. Coaching sessions scheduled twice a week.')
    pip('tariq', 'Completed', 120, 60, ['Deliver the weekly KPI report without rework', 'Complete SQL for Analysts', 'Peer review all dashboards'],
        'Reports required frequent corrections. Plan completed successfully; quality is now within expectations.')

    # ------------------------------------------------------------------ training
    course_ids = {}
    for title, desc, skills, mandatory, hours in COURSES:
        course_ids[title] = str(db['Courses'].insert_one({
            'title': title, 'description': desc, 'skills': skills, 'mandatory': mandatory, 'duration_hours': hours,
            'url': '', 'created_at': ts(400)}).inserted_id)
    dept_courses = {
        'Engineering': ['Advanced Python for Engineers', 'Kubernetes in Production'],
        'Sales': ['Consultative Selling'], 'Customer Support': ['Customer Empathy & De-escalation'],
        'Finance': ['Excel for Finance Teams'], 'Product & Design': ['Accessible Web Design'],
    }
    n_assign = 0
    assigned_mandatory_due = (today + datetime.timedelta(days=21)).isoformat()
    for key, m in meta.items():
        p = m['p']
        if key.startswith('former'):
            continue
        todo = [c[0] for c in COURSES if c[3]] + dept_courses.get(p['dept'], [])
        if key in ('elena', 'fiona', 'arjun'):
            todo.append('Machine Learning in Practice')
        if key in ('tariq',):
            todo.append('SQL for Analysts')
        if p['role'] == 'Manager' and key not in ('ceo',):
            todo.append('Leadership Essentials')
        for title in dict.fromkeys(todo):
            course = next(c for c in COURSES if c[0] == title)
            mandatory = course[3]
            tenure_days = (today - m['hire']).days
            assigned_ago = min(tenure_days, rng.randint(50, 200)) if tenure_days > 50 else tenure_days
            r = rng.random()
            if mandatory:
                due = assigned_mandatory_due if tenure_days < 120 else (today + datetime.timedelta(days=rng.randint(-40, 30))).isoformat()
                status = 'Completed' if (r < 0.88 and tenure_days > 21) else ('In Progress' if r < 0.95 else 'Assigned')
            else:
                due = (today + datetime.timedelta(days=rng.randint(15, 60))).isoformat()
                status = 'Completed' if r < 0.55 else ('In Progress' if r < 0.8 else 'Assigned')
            doc = {'course_id': course_ids[title], 'employee_id': m['eid'], 'employee_name': f"{p['first']} {p['last']}",
                   'course_title': title, 'mandatory': mandatory, 'status': status, 'due_date': due,
                   'assigned_at': ts(assigned_ago), 'assigned_by': user_ids['hrd']}
            if status == 'Completed':
                doc['completed_at'] = ts(max(assigned_ago - rng.randint(5, 25), 1))
                have = {s['name'] for s in db['Employees'].find_one({'_id': ObjectId(m['eid'])})['skills']}
                gained = [s for s in course[2] if s not in have]
                if gained:                          # completing a course adds its skills, as the app does
                    db['Employees'].update_one({'_id': ObjectId(m['eid'])}, {'$push': {'skills': {'$each': [{'name': s, 'proficiency': 5} for s in gained]}}})
                    doc['skills_gained'] = gained
            db['TrainingAssignments'].insert_one(doc)
            n_assign += 1
    print(f'  {len(COURSES)} courses, {n_assign} assignments')

    # ------------------------------------------------------------------ expenses
    n_exp = 0
    exp_templates = {
        'Engineering': [('Software', 'Annual JetBrains license', 149), ('Training', 'Conference ticket - PyCon India', 450), ('Travel', 'Flight to customer site visit', 380), ('Equipment', 'Ergonomic keyboard', 129)],
        'Sales': [('Travel', 'Flight and hotel for client meeting', 420), ('Meals', 'Client lunch', 96), ('Travel', 'Ola/Uber to customer demo', 12), ('Software', 'Sales Navigator subscription', 99)],
        'Marketing': [('Software', 'Canva Pro subscription', 120), ('Events', 'Trade-show booth supplies', 640), ('Meals', 'Team offsite lunch', 210)],
        'Customer Support': [('Training', 'Customer success workshop', 300), ('Equipment', 'Noise-cancelling headset', 89)],
        'Finance': [('Training', 'CA continuing professional education', 275), ('Software', 'Excel add-in license', 79)],
        'Human Resources': [('Recruiting', 'Job board posting', 350), ('Events', 'Onboarding lunch', 140)],
        'Product & Design': [('Software', 'Figma plugin license', 60), ('Research', 'Participant incentives for interviews', 300)],
        'Executive': [('Travel', 'Investor meeting travel', 1450), ('Meals', 'Board dinner', 380)],
    }
    exp_people = [k for k in meta if not k.startswith('former')]
    rng.shuffle(exp_people)
    for key in exp_people[:26]:
        m, p = meta[key], meta[key]['p']
        cat, desc, amount = rng.choice(exp_templates.get(p['dept'], exp_templates['Executive']))
        amount = int(round(amount * 70 / 50) * 50)       # the template figures are rough US dollars; claims are in rupees
        days_ago = rng.randint(2, 70)
        status = rng.choices(['Approved', 'Pending', 'Rejected'], weights=[6, 3, 1])[0] if days_ago > 6 else 'Pending'
        boss_key = p['boss'] or 'hrd'
        comments = []
        if status != 'Pending':
            comments.append({'text': f'Status changed from Pending to {status}', 'createdAt': ts(days_ago - 2), 'author': lookup[boss_key]['first'].lower(), 'is_system': True})
            if status == 'Rejected':
                comments.append({'text': 'Please attach a receipt and resubmit.', 'createdAt': ts(days_ago - 2), 'author': lookup[boss_key]['first'].lower(), 'is_system': False})
        db['expenses'].insert_one({
            'employee_id': m['eid'], 'user_id': m['uid'], 'amount': float(amount), 'date': (today - datetime.timedelta(days=days_ago)).isoformat(),
            'category': cat, 'description': desc, 'status': status, 'submittedAt': ts(days_ago), 'updatedAt': ts(max(days_ago - 2, 0)), 'comments': comments})
        n_exp += 1
    print(f'  {n_exp} expense claims')

    # ------------------------------------------------------------------ assets
    n_assets = 0
    serial = 5000
    for key, m in meta.items():
        p = m['p']
        if key.startswith('former'):
            continue
        items = [('MacBook Pro 14"' if p['dept'] in ('Engineering', 'Product & Design', 'Marketing') else 'Dell Latitude 7440', 'Laptop',
                  199900 if p['dept'] in ('Engineering', 'Product & Design', 'Marketing') else 94500)]
        if p['dept'] == 'Engineering' and p['role'] != 'Manager':
            items.append(('Dell UltraSharp 27" Monitor', 'Monitor', 32500))
        if p['dept'] == 'Sales' or p['role'] == 'Manager':
            items.append(('iPhone 15', 'Phone', 69900))
        for name, kind, cost in items:
            serial += 1
            bought = m['hire'] - datetime.timedelta(days=rng.randint(3, 14))
            db['assets'].insert_one({
                'name': name, 'type': kind, 'serialNumber': f'KT-{kind[:3].upper()}-{serial}', 'cost': cost,
                'purchaseDate': bought.isoformat(), 'assignedTo': m['code'], 'status': 'Assigned', 'createdAt': iso_at(bought, 9, 0),
                'history': [{'text': f'Asset registered in inventory as Available', 'createdAt': iso_at(bought, 9, 0), 'author': 'priya.nair', 'is_system': True, 'assignedTo': 'Unassigned'},
                            {'text': f"Asset reassigned from Unassigned to {m['code']}", 'createdAt': iso_at(m['hire'], 9, 30), 'author': 'priya.nair', 'is_system': True, 'assignedTo': m['code']}]})
            n_assets += 1
    for i in range(4):
        serial += 1
        db['assets'].insert_one({'name': 'Dell Latitude 7440', 'type': 'Laptop', 'serialNumber': f'KT-LAP-{serial}', 'cost': 92000,
                                 'purchaseDate': (today - datetime.timedelta(days=30 + i * 9)).isoformat(), 'assignedTo': '', 'status': 'Available',
                                 'createdAt': ts(30 + i * 9),
                                 'history': [{'text': 'Asset registered in inventory as Available', 'createdAt': ts(30 + i * 9), 'author': 'priya.nair', 'is_system': True, 'assignedTo': 'Unassigned'}]})
        n_assets += 1
    print(f'  {n_assets} assets (every employee has a laptop; spare stock available)')

    # ------------------------------------------------------------------ helpdesk
    tickets = [
        ('ben_h', 'IT', 'High', 'Open', 'VPN disconnects every few minutes', 'My VPN drops several times an hour when working from home, which interrupts calls with customers.', 3),
        ('zoe', 'IT', 'Medium', 'In Progress', 'Need access to the staging environment', 'I started this month and still cannot log in to the staging cluster.', 6),
        ('lily', 'HR', 'Low', 'Resolved', 'Update my emergency contact', 'I would like to change the emergency contact on my profile.', 20),
        ('diego', 'IT', 'Medium', 'Resolved', 'Laptop battery drains quickly', 'Battery lasts under two hours since the last update.', 25),
        ('maya', 'Payroll', 'Medium', 'Resolved', 'Question about my last payslip', 'The health-insurance deduction looks different from the previous month.', 18),
        ('sara', 'HR', 'High', 'In Progress', 'Work authorization renewal', 'My work permit expires soon and I need the renewal paperwork started.', 10),
        ('owen', 'IT', 'Low', 'Open', 'Request a second monitor', 'Would like a second monitor to handle tickets and logs side by side.', 4),
        ('nadia', 'Facilities', 'Low', 'Resolved', 'Desk is wobbly', 'My standing desk wobbles at full height.', 30),
        ('kevin', 'IT', 'Urgent', 'Resolved', 'Production access token expired', 'Rotation job did not renew my token; blocked from on-call duties.', 14),
        ('chiara', 'HR', 'Medium', 'Open', 'Benefits enrollment deadline', 'When is the deadline to enroll in the dental plan?', 1),
    ]
    n_t = 0
    for key, cat, prio, status, title, desc, days_ago in tickets:
        m = meta[key]
        comments = []
        if status in ('In Progress', 'Resolved'):
            comments.append({'text': 'Thanks for reporting this - we are looking into it.', 'createdAt': ts(max(days_ago - 1, 0)), 'author': 'priya.nair' if cat in ('HR', 'Payroll') else 'tarun.bhatia'})
        if status == 'Resolved':
            comments.append({'text': 'This has been resolved. Please reopen the ticket if the problem comes back.', 'createdAt': ts(max(days_ago - 3, 0)), 'author': 'priya.nair' if cat in ('HR', 'Payroll') else 'tarun.bhatia'})
        db['helpdesk_tickets'].insert_one({
            'title': title, 'description': desc, 'category': cat, 'priority': prio, 'status': status, 'employee_id': m['eid'], 'user_id': m['uid'],
            'createdAt': ts(days_ago), 'updatedAt': ts(max(days_ago - 3, 0)), 'comments': comments})
        n_t += 1
    print(f'  {n_t} helpdesk tickets')

    # ------------------------------------------------------------------ onboarding (everyone hired in the last year)
    knowledge = db['Settings'].find_one({'_key': 'app'})['knowledge']
    mandatory_titles = [c[0] for c in COURSES if c[3]]
    n_onb = 0
    for key, m in meta.items():
        if key.startswith('former') or (today - m['hire']).days > 365:
            continue
        p = m['p']
        age = (today - m['hire']).days
        tasks, n = [], 0
        for t in knowledge['employeeTasks']:
            n += 1
            tasks.append({'id': n, 'title': t, 'owner': 'employee', 'done': age > 14 or n <= 2, 'auto': None})
        for d in knowledge['requiredDocuments']:
            n += 1
            tasks.append({'id': n, 'title': f'Upload document: {d}', 'owner': 'employee', 'done': True, 'auto': {'type': 'document', 'name': d}})
        for title in mandatory_titles:
            n += 1
            a = db['TrainingAssignments'].find_one({'employee_id': m['eid'], 'course_title': title})
            tasks.append({'id': n, 'title': f'Complete training: {title}', 'owner': 'employee', 'done': bool(a and a['status'] == 'Completed'),
                          'auto': {'type': 'course', 'course_id': course_ids[title]}})
        for t in knowledge['hrTasks']:
            n += 1
            tasks.append({'id': n, 'title': t, 'owner': 'hr', 'done': True, 'auto': None})
        done_all = all(t['done'] for t in tasks)
        db['Onboarding'].insert_one({'employee_id': m['eid'], 'employee_name': f"{p['first']} {p['last']}", 'position': p['position'],
                                     'tasks': tasks, 'started_at': iso_at(m['hire'], 9, 0),
                                     'completed_at': iso_at(m['hire'] + datetime.timedelta(days=21), 9, 0) if done_all else None})
        n_onb += 1
    print(f'  {n_onb} onboarding checklists (recent hires are still in progress)')

    # ------------------------------------------------------------------ surveys
    def survey(title, stype, anonymous, status, created_ago, questions, respondents, ratings_mean, comments_pool):
        sid = str(db['Surveys'].insert_one({'title': title, 'type': stype, 'anonymous': anonymous, 'status': status, 'questions': questions,
                                            'created_at': ts(created_ago), 'created_by': user_ids['hrd']}).inserted_id)
        for key in respondents:
            m = meta[key]
            answers = {}
            mood = ratings_mean + (m['p']['perf'] - 3.8) * 0.5 + rng.gauss(0, 0.5)
            for q in questions:
                if q['type'] == 'rating':
                    answers[q['id']] = int(clamp(round(mood + rng.gauss(0, 0.6)), 1, 5))
                elif q['type'] == 'text' and rng.random() < 0.7:
                    answers[q['id']] = rng.choice(comments_pool['positive'] if mood >= 3.7 else comments_pool['negative'])
                elif q['type'] == 'choice':
                    answers[q['id']] = rng.choice(q['options'])
            resp = {'survey_id': sid, 'respondent': hashlib.sha256(f"{sid}:{m['eid']}".encode()).hexdigest(), 'answers': answers,
                    'submitted_at': ts(max(created_ago - rng.randint(0, 9), 0), rng.randint(9, 17), rng.randint(0, 59))}
            if not anonymous:
                resp['employee_id'] = m['eid']
            db['SurveyResponses'].insert_one(resp)
        return sid

    eng_q = [
        {'id': 'q1', 'type': 'rating', 'text': 'I am proud to work for Kaveri. (1-5)'},
        {'id': 'q2', 'type': 'rating', 'text': 'I would recommend Kaveri as a great place to work. (1-5)'},
        {'id': 'q3', 'type': 'rating', 'text': 'I see a clear path for growth here. (1-5)'},
        {'id': 'q4', 'type': 'rating', 'text': 'My workload is manageable. (1-5)'},
        {'id': 'q5', 'type': 'text', 'text': 'What is one thing we should change?'},
    ]
    comments = {
        'positive': ['Great team and supportive managers, I would not change much.', 'I like the hybrid setup and the learning budget.',
                     'Good communication from leadership; keep the monthly all-hands.', 'Clear goals and good tools. Thanks for the recognition program.'],
        'negative': ['Workload is stressful before releases, we need more people on the team.', 'Pay is below market for my role and growth paths are unclear.',
                     'Too many meetings and priorities change every week, causing overtime.', 'My manager rarely gives feedback and communication is poor.'],
    }
    active_keys = [k for k in meta if not k.startswith('former')]
    q2_resp = [k for k in active_keys if (today - meta[k]['hire']).days > 150 and rng.random() < 0.85]
    survey('Q2 2026 Engagement Survey', 'engagement', True, 'Closed', 120, eng_q, q2_resp, 3.9, comments)
    pulse_q = [
        {'id': 'q1', 'type': 'rating', 'text': 'How was your week? (1-5)'},
        {'id': 'q2', 'type': 'rating', 'text': 'How manageable was your workload? (1-5)'},
        {'id': 'q3', 'type': 'text', 'text': 'Anything blocking you?'},
    ]
    pulse_resp = [k for k in active_keys if rng.random() < 0.55]
    survey('October Pulse', 'pulse', True, 'Open', 8, pulse_q, pulse_resp, 3.8, comments)
    # exit interview + completed exits
    exit_questions = [
        {'id': 'q1', 'type': 'rating', 'text': 'Overall, how was your experience working here? (1-5)'},
        {'id': 'q2', 'type': 'rating', 'text': 'How supportive was your manager? (1-5)'},
        {'id': 'q3', 'type': 'choice', 'text': 'Main reason for leaving', 'options': ['Compensation', 'Career growth', 'Management', 'Work-life balance', 'Relocation', 'Other']},
        {'id': 'q4', 'type': 'text', 'text': 'What could we have done better?'},
    ]
    exit_sid = str(db['Surveys'].insert_one({'title': 'Exit Interview', 'type': 'exit', 'anonymous': False, 'status': 'Open', 'questions': exit_questions,
                                             'created_at': ts(500), 'created_by': 'system'}).inserted_id)
    exit_comments = {
        'Compensation': 'Pay did not keep up with market offers I received; a clearer raise process would help.',
        'Career growth': 'I wanted a senior title and a bigger scope; the path to promotion was not clear.',
        'Management': 'Feedback was infrequent and priorities changed without explanation.',
        'Work-life balance': 'Frequent after-hours work during peak periods; more staffing would have helped.',
        'Relocation': 'Moving to another city for family reasons. I enjoyed the team.',
    }
    from offboarding.views import DEFAULT_CHECKLIST as checklist_tasks
    for fm in former_meta:
        p = fm['p']
        leave_day = today - datetime.timedelta(days=fm['left_ago'])
        db['Offboarding'].insert_one({
            'employee_id': fm['eid'], 'employee_name': f"{p['first']} {p['last']}", 'department_id': dept_ids[p['dept']], 'department': p['dept'],
            'employee_code': fm['code'], 'exit_type': 'Resignation', 'notice_period_days': 60, 'position': p['position'],
            'last_working_day': leave_day.isoformat(), 'reason_category': fm['reason'], 'reason': exit_comments[fm['reason']],
            'status': 'Completed', 'checklist': [{'id': i + 1, 'task': t, 'done': True} for i, t in enumerate(checklist_tasks)],
            'requested_at': iso_at(leave_day - datetime.timedelta(days=35), 10, 0), 'decided_at': iso_at(leave_day - datetime.timedelta(days=30), 10, 0),
            'decided_by': user_ids['hrd'], 'tenure_years_at_request': round((leave_day - fm['hire']).days / 365.25, 1)})
        score = int(clamp(round(p['perf'] - 0.2 + rng.gauss(0, 0.6)), 1, 5))
        db['SurveyResponses'].insert_one({
            'survey_id': exit_sid, 'respondent': hashlib.sha256(f"{exit_sid}:{fm['eid']}".encode()).hexdigest(), 'employee_id': fm['eid'],
            'answers': {'q1': score, 'q2': int(clamp(score + (1 if fm['reason'] != 'Management' else -1), 1, 5)), 'q3': fm['reason'], 'q4': exit_comments[fm['reason']]},
            'submitted_at': iso_at(leave_day - datetime.timedelta(days=5), 11, 0)})
    # one current resignation waiting for a decision
    cand = meta['hiroshi']
    db['Offboarding'].insert_one({
        'employee_id': cand['eid'], 'employee_name': f"{cand['p']['first']} {cand['p']['last']}", 'department_id': dept_ids['Engineering'],
        'department': 'Engineering', 'employee_code': cand['code'], 'exit_type': 'Resignation', 'notice_period_days': 60,
        'position': cand['p']['position'], 'last_working_day': (today + datetime.timedelta(days=24)).isoformat(), 'reason_category': 'Career growth',
        'reason': 'Accepted a platform-engineering role with a larger scope.', 'status': 'Pending', 'checklist': [],
        'requested_at': ts(2), 'tenure_years_at_request': round((today - cand['hire']).days / 365.25, 1)})
    print(f'  3 surveys ({len(q2_resp)} + {len(pulse_resp)} anonymous answers), {len(FORMER)} completed exits + 1 pending resignation')

    # ------------------------------------------------------------------ recruitment
    # (title, department, location, skills, experience, education, status, description, positions, budget from-to in LPA)
    jobs = [
        ('Senior Backend Engineer', 'Engineering', 'Bengaluru (hybrid)', 'Python, PostgreSQL, AWS, Docker', '5', 'B.E. / B.Tech in CS or equivalent', 'Open',
         'Join the Platform Team to design and operate the services that power Kaveri. You will own APIs end to end, mentor engineers and improve reliability.', 2, (28, 40)),
        ('Product Designer', 'Product & Design', 'Remote (India)', 'Figma, UX Design, Prototyping, Design Systems', '3', 'B.Des / M.Des or related', 'Open',
         'Shape the customer experience of our web applications with research-driven design and a growing design system.', 1, (14, 22)),
        ('Account Executive, SMB', 'Sales', 'Pune (hybrid)', 'Sales, HubSpot, Prospecting, Negotiation', '2', 'Graduate in any stream (MBA preferred)', 'Open',
         'Own the full sales cycle with small and mid-size businesses, replacing a departing team member.', 1, (8, 12)),
        ('Customer Support Specialist', 'Customer Support', 'Hyderabad (on-site)', 'Customer Support, Zendesk, Empathy, Communication', '1', 'Graduate in any stream', 'Open',
         'Be the voice of Kaveri for our customers; help them succeed with clear, kind and fast answers.', 3, (4, 6)),
        ('Data Analyst', 'Engineering', 'Bengaluru (hybrid)', 'SQL, Tableau, Excel, Statistics', '2', 'B.E. / B.Sc in a quantitative field', 'Closed',
         'Backfill for a departing analyst - position filled in September.', 1, (9, 14)),
    ]
    job_ids = {}
    for title, dept, loc, skills, exp, edu, status, desc, openings, (lo, hi) in jobs:
        job_ids[title] = str(db['jobs'].insert_one({'title': title, 'department': dept, 'location': loc, 'skills': skills, 'experience': exp,
                                                    'education': edu, 'status': status, 'description': desc, 'employment_type': 'Full-time', 'openings': openings,
                                                    'salary_min_lpa': lo, 'salary_max_lpa': hi, 'createdAt': ts(rng.randint(10, 50))}).inserted_id)
    # (job, name, skills, experience, stage, source, city, current company, current title, notice days, current LPA, expected LPA, education)
    candidates = [
        ('Senior Backend Engineer', 'Venkatesh Raman', 'Python, PostgreSQL, AWS, Docker, Kubernetes', '7', 'Interview', 'LinkedIn', 'Bengaluru', 'Flipkart', 'Senior Software Engineer', 60, 34, 42, 'B.Tech, NIT Trichy'),
        ('Senior Backend Engineer', 'Danish Ansari', 'Python, Django, PostgreSQL, Redis', '5', 'Screening', 'Referral', 'Pune', 'Persistent Systems', 'Software Engineer II', 30, 22, 30, 'B.E., Pune University'),
        ('Senior Backend Engineer', 'Lalitha Srinivasan', 'Java, Spring, SQL, AWS', '6', 'Applied', 'Naukri', 'Chennai', 'Zoho', 'Lead Developer', 45, 26, 34, 'B.Tech, Anna University'),
        ('Senior Backend Engineer', 'Ibrahim Sheikh', 'Python, Go, Docker, Kubernetes, AWS', '8', 'Offered', 'Referral', 'Hyderabad', 'Amazon', 'SDE II', 90, 40, 46, 'B.Tech, IIIT Hyderabad'),
        ('Product Designer', 'Charulata Menon', 'Figma, UX Design, Prototyping, Design Systems, User Research', '4', 'Interview', 'LinkedIn', 'Bengaluru', 'Swiggy', 'Product Designer', 60, 18, 24, 'M.Des, IDC IIT Bombay'),
        ('Product Designer', 'Akash Bansal', 'Figma, Prototyping, Photoshop', '2', 'Screening', 'Careers page', 'Noida', 'Freelance', 'UI Designer', 15, 9, 13, 'B.Des, NID'),
        ('Product Designer', 'Hema Gopalan', 'UX Design, Figma, Design Systems', '5', 'Applied', 'Naukri', 'Chennai', 'Freshworks', 'Senior UX Designer', 60, 17, 22, 'B.Arch'),
        ('Account Executive, SMB', 'Mohit Kapadia', 'Sales, HubSpot, Prospecting, Negotiation', '3', 'Interview', 'Careers page', 'Pune', 'Zoho', 'Sales Executive', 30, 8, 11, 'MBA, SIBM Pune'),
        ('Account Executive, SMB', 'Tanvi Joshi', 'Sales, Prospecting, Cold Calling', '1', 'Applied', 'Naukri', 'Mumbai', 'Byju\'s', 'Business Development Associate', 30, 5, 8, 'BBA'),
        ('Account Executive, SMB', 'Gaurav Saxena', 'Sales, HubSpot, Demo Delivery, Negotiation', '4', 'Screening', 'Referral', 'Pune', 'Freshworks', 'Account Executive', 60, 9, 12, 'MBA, Symbiosis'),
        ('Customer Support Specialist', 'Rukmini Devi', 'Customer Support, Zendesk, Empathy, Communication', '2', 'Interview', 'Careers page', 'Hyderabad', 'Amazon', 'Customer Service Associate', 30, 4, 5.5, 'B.Com'),
        ('Customer Support Specialist', 'Lakshay Walia', 'Communication, Empathy', '0', 'Applied', 'Campus', 'Hyderabad', '', '', 0, 0, 4, 'B.Sc'),
        ('Customer Support Specialist', 'Amrita Oberoi', 'Customer Support, Communication, Zendesk', '1', 'Rejected', 'Naukri', 'Hyderabad', 'Teleperformance', 'Support Executive', 15, 3.5, 5, 'B.A.'),
        ('Data Analyst', 'Nikhil Rao', 'SQL, Tableau, Excel, Statistics', '3', 'Hired', 'Referral', 'Bengaluru', 'Mu Sigma', 'Analyst', 30, 8, 11, 'B.Sc Statistics'),
    ]
    for job, name, skills, exp, stage, source, city, company, title, notice, cur, exp_ctc, edu in candidates:
        slug = name.lower().replace(' ', '.').replace('-', '').replace("'", '')
        db['candidates'].insert_one({'job_id': job_ids[job], 'name': name, 'email': f'{slug}@mail.example', 'phone': f"+91 9{rng.randint(1000, 9999)} {rng.randint(10000, 99999)}",
                                     'location': city, 'current_company': company, 'current_title': title, 'skills': skills, 'experience': exp, 'education': edu,
                                     'notice_period_days': notice, 'current_ctc_lpa': cur or None, 'expected_ctc_lpa': exp_ctc,
                                     'notes': f'Applied via {source}.', 'stage': stage, 'source': source, 'appliedAt': ts(rng.randint(2, 30))})
    print(f'  {len(jobs)} job openings, {len(candidates)} candidates')

    # ------------------------------------------------------------------ recognition
    badges = {'kudos': 10, 'teamwork': 15, 'mentor': 15, 'innovation': 20, 'above_beyond': 25}
    msgs = {
        'kudos': ['Thanks for jumping in and unblocking me today - really appreciated.', 'You turned a stressful afternoon around, thank you.',
                  'Always quick to help - thank you for making time.', 'Thank you for covering for me last week.'],
        'teamwork': ['Great collaboration this month - handoffs were painless.', 'You kept everyone aligned through a messy project. Thank you.',
                     'Thanks for sharing the credit and the work.', 'Working with you on this made it easy.'],
        'mentor': ['Thank you for patiently walking me through how things work here.', 'Your feedback on my draft made it far better.',
                   'I learned more in one session with you than in a month on my own.'],
        'innovation': ['The process improvement you proposed saves the team hours every week.', 'Great idea to simplify that workflow - it is already paying off.',
                       'Your prototype changed how we think about the problem.'],
        'above_beyond': ['You went well beyond the call of duty this quarter.', 'You stayed late to get this over the line and it made a real difference.',
                         'Thank you for stepping up when we were short-staffed.'],
    }
    dept_msgs = {
        'Engineering': {'kudos': ['Thanks for unblocking my pull request so quickly.', 'Appreciate the fast review and the useful comments.'],
                        'mentor': ['Thank you for walking me through the codebase this week.'],
                        'innovation': ['The automation you built for deployments saves the whole team hours every week.']},
        'Customer Support': {'above_beyond': ['You stayed late to help a customer and it made a real difference.'],
                             'kudos': ['Thank you for taking over that escalated ticket.']},
        'Sales': {'teamwork': ['Great teamwork on the proposal - the customer loved it.'], 'above_beyond': ['You rescued that renewal with a late-night call. Thank you.']},
        'Marketing': {'innovation': ['The new campaign format doubled our click-through rate.']},
        'Human Resources': {'kudos': ['Thanks for turning around the offer letter so fast.']},
        'Finance': {'kudos': ['Thank you for fixing the reconciliation before month-end.']},
        'Product & Design': {'innovation': ['Your prototype helped us decide in a day what would have taken weeks.']},
    }
    n_rec = 0
    for _ in range(34):
        giver, receiver = rng.sample(active_keys, 2)
        # recognise colleagues in your own department most of the time
        peers = [k for k in active_keys if meta[k]['p']['dept'] == meta[giver]['p']['dept'] and k != giver]
        if peers and rng.random() < 0.7:
            receiver = rng.choice(peers)
        badge = rng.choice(list(badges))
        message = rng.choice(msgs[badge] + dept_msgs.get(meta[receiver]['p']['dept'], {}).get(badge, []))
        db['Recognitions'].insert_one({'from_employee_id': meta[giver]['eid'], 'to_employee_id': meta[receiver]['eid'], 'badge': badge,
                                       'message': message, 'points': badges[badge], 'created_at': ts(rng.randint(0, 40), rng.randint(9, 17), rng.randint(0, 59))})
        n_rec += 1
    print(f'  {n_rec} recognitions')

    # ------------------------------------------------------------------ notifications
    n_not = 0
    for d in leave_docs:
        if d['status'] == 'Pending':
            emp_key = next(k for k, m in meta.items() if m['code'] == d['employee_id'])
            db['Notifications'].insert_one({'type': 'leave_request', 'user_id': d['manager_id'], 'title': 'New Leave Request',
                                            'message': f"{d['employee_name']} has requested {d['days']:g} days of {d['leave_type']} leave",
                                            'reference_id': '', 'created_at': d['requested_at'], 'read': False})
            n_not += 1
        elif d['status'] in ('Approved', 'Rejected') and d['start_date'] >= (today - datetime.timedelta(days=45)).isoformat():
            emp_key = next(k for k, m in meta.items() if m['code'] == d['employee_id'])
            db['Notifications'].insert_one({'type': 'leave_update', 'user_id': meta[emp_key]['uid'], 'title': f"Leave Request {d['status']}",
                                            'message': f"Your {d['leave_type']} leave request has been {d['status'].lower()}: {d['comments']}",
                                            'reference_id': '', 'created_at': d['reviewed_at'], 'read': rng.random() < 0.6})
            n_not += 1
    for a in db['TrainingAssignments'].find({'status': {'$in': ['Assigned', 'In Progress']}, 'mandatory': True}):
        uid = db['Employees'].find_one({'_id': ObjectId(a['employee_id'])})['user_id']
        db['Notifications'].insert_one({'type': 'training_assigned', 'user_id': uid, 'title': 'Training reminder',
                                        'message': f"{a['course_title']} - due {a['due_date']}", 'reference_id': str(a['_id']),
                                        'created_at': ts(rng.randint(1, 10)), 'read': False})
        n_not += 1
    for r in db['Recognitions'].find().sort('created_at', -1).limit(12):
        rec = db['Employees'].find_one({'_id': ObjectId(r['to_employee_id'])})
        giver = db['Employees'].find_one({'_id': ObjectId(r['from_employee_id'])})
        db['Notifications'].insert_one({'type': 'recognition', 'user_id': rec['user_id'], 'title': f"{giver['first_name']} {giver['last_name']} recognised you",
                                        'message': r['message'], 'reference_id': '', 'created_at': r['created_at'], 'read': rng.random() < 0.5})
        n_not += 1
    db['Notifications'].insert_one({'type': 'offboarding', 'user_id': user_ids['hrd'], 'title': 'Resignation submitted',
                                    'message': f"{meta['hiroshi']['p']['first']} {meta['hiroshi']['p']['last']} submitted a resignation.", 'reference_id': '',
                                    'created_at': ts(2), 'read': False})
    db['Notifications'].insert_one({'type': 'offboarding', 'user_id': user_ids['vpe'], 'title': 'Resignation submitted',
                                    'message': f"{meta['hiroshi']['p']['first']} {meta['hiroshi']['p']['last']} submitted a resignation.", 'reference_id': '',
                                    'created_at': ts(2), 'read': False})
    n_not += 2
    print(f'  {n_not} notifications')

    # ------------------------------------------------------------------ final integrity report
    emps = list(db['Employees'].find())
    active = [e for e in emps if e['employment_status'] == 'Active']
    from check_data import check
    problems = check(db, settings.MEDIA_ROOT)
    print('\nIntegrity check:', f'OK - {len(active)} active employees; every reference, rule and file verified' if not problems else problems)
    print('\nCollections:')
    for c in sorted(db.list_collection_names()):
        n = db[c].count_documents({})
        if n:
            print(f'  {c:22} {n}')
    print(f"\nDemo logins: <first.last> / {DEMO_PASSWORD}  e.g. anjali.deshmukh (Admin), priya.nair (Admin/HR), rahul.mehta (Manager), sneha.kapoor (Manager), karthik.subramanian (Employee)")


if __name__ == '__main__':
    main()
