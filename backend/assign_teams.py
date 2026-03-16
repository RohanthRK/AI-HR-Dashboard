from hr_backend.db import employees, teams, departments
from bson import ObjectId
import random

print("=== Assigning teams to employees ===")

# First, let's create teams for each department if they don't exist
department_list = list(departments.find())
department_teams = {}

for dept in department_list:
    dept_id = dept["_id"]
    dept_name = dept["name"]
    
    # Look for existing teams in this department
    existing_teams = list(teams.find({"department": dept_name}))
    
    # If no teams for this department, create default ones
    if not existing_teams:
        # Create Engineering team for Engineering department
        if dept_name == "Engineering":
            teams_to_create = [
                {"name": "Frontend Team", "department": dept_name, "department_id": dept_id},
                {"name": "Backend Team", "department": dept_name, "department_id": dept_id},
                {"name": "DevOps Team", "department": dept_name, "department_id": dept_id}
            ]
        # Create default teams for other departments
        else:
            teams_to_create = [
                {"name": f"{dept_name} Team", "department": dept_name, "department_id": dept_id}
            ]
            
        # Insert the teams
        for team_data in teams_to_create:
            print(f"Creating team: {team_data['name']}")
            team_data["created_at"] = team_data["updated_at"] = "2023-05-15T00:00:00Z"
            result = teams.insert_one(team_data)
            print(f"  Team created with ID: {result.inserted_id}")
            
    # Store teams by department for later assignment
    department_teams[dept_name] = list(teams.find({"department": dept_name}))
    print(f"Department: {dept_name} has {len(department_teams[dept_name])} teams")

# Now assign teams to employees
total_employees = employees.count_documents({})
updated_count = 0

employee_list = list(employees.find())
for employee in employee_list:
    employee_id = employee["_id"]
    department = employee.get("department")
    
    # Skip if already has team_id
    if employee.get("team_id"):
        continue
        
    # Find appropriate teams for this employee's department
    available_teams = department_teams.get(department, [])
    
    if available_teams:
        # Randomly assign to one of the teams in their department
        selected_team = random.choice(available_teams)
        team_id = selected_team["_id"]
        team_name = selected_team["name"]
        
        # Update employee with team_id and team_name
        employees.update_one(
            {"_id": employee_id},
            {"$set": {
                "team_id": team_id,
                "team": team_name
            }}
        )
        updated_count += 1
        print(f"Assigned {employee.get('first_name')} {employee.get('last_name')} to {team_name}")
    else:
        print(f"⚠️ No teams found for department: {department} - Employee: {employee.get('first_name')} {employee.get('last_name')}")

print(f"\nCompleted: Updated {updated_count} out of {total_employees} employees")

# Verify results
employees_with_team = employees.count_documents({"team_id": {"$exists": True}})
print(f"Employees with team_id: {employees_with_team}")

# Show team sizes
print("\n=== Team sizes ===")
all_teams = list(teams.find())
for team in all_teams:
    members_count = employees.count_documents({"team_id": team["_id"]})
    print(f"Team: {team.get('name')} | Members: {members_count}") 