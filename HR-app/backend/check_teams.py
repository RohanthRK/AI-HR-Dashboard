from hr_backend.db import employees, teams, departments
from pprint import pprint
from bson import ObjectId

# Count entities
print(f"Total employees: {employees.count_documents({})}")
print(f"Total teams: {teams.count_documents({})}")
print(f"Total departments: {departments.count_documents({})}")

# Check employees with team_id
employees_with_team = employees.count_documents({"team_id": {"$exists": True}})
print(f"Employees with team_id: {employees_with_team}")

# Check teams data
print("\n=== Teams ===")
team_list = list(teams.find())
for team in team_list:
    members_count = employees.count_documents({"team_id": team["_id"]})
    print(f"Team: {team.get('name')} | Members: {members_count} | Department: {team.get('department')}")

# Check departments
print("\n=== Departments ===")
department_list = list(departments.find())
for dept in department_list:
    print(f"Department: {dept.get('name')}")
    dept_teams = teams.count_documents({"department_id": dept["_id"]})
    dept_employees = employees.count_documents({"department_id": dept["_id"]})
    print(f"  Teams: {dept_teams} | Employees: {dept_employees}") 