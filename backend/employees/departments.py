"""
Defines the departments available in the organization.
This module provides utility functions to work with departments.
"""

# List of all departments in the organization
DEPARTMENTS = [
    'Engineering',
    'Product',
    'Marketing',
    'Sales',
    'Customer Support',
    'Human Resources',
    'Finance',
    'Operations',
    'Legal',
    'Research & Development',
    'Design',
    'Administration',
    'Quality Assurance'
]

def get_all_departments():
    """Returns the list of all departments"""
    return DEPARTMENTS

def is_valid_department(department):
    """Checks if a given department name is valid"""
    return department in DEPARTMENTS

def get_department_choices():
    """Returns departments formatted as choices for Django model fields"""
    return [(dept, dept) for dept in DEPARTMENTS] 