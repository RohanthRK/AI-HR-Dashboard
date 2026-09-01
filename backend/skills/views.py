from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from bson import ObjectId
import json
from hr_backend.db import db, employees as employees_collection, skills as skills_collection

DEFAULT_MASTER_SKILLS = [
    {"name": "JavaScript", "category": "Frontend", "proficiency": 8},
    {"name": "React", "category": "Frontend", "proficiency": 8},
    {"name": "TypeScript", "category": "Frontend", "proficiency": 8},
    {"name": "Node.js", "category": "Backend", "proficiency": 8},
    {"name": "Python", "category": "Backend", "proficiency": 8},
    {"name": "Django", "category": "Backend", "proficiency": 8},
    {"name": "HTML/CSS", "category": "Frontend", "proficiency": 8},
    {"name": "SQL & Databases", "category": "Database", "proficiency": 8},
    {"name": "MongoDB", "category": "Database", "proficiency": 8},
    {"name": "Git & GitHub", "category": "DevOps", "proficiency": 8},
    {"name": "Docker & Containers", "category": "DevOps", "proficiency": 8},
    {"name": "AWS Cloud", "category": "Cloud", "proficiency": 8},
    {"name": "UI/UX Design", "category": "Design", "proficiency": 8},
    {"name": "Project Management", "category": "Leadership", "proficiency": 8},
    {"name": "Agile / Scrum", "category": "Process", "proficiency": 8},
    {"name": "Leadership", "category": "Soft Skills", "proficiency": 8},
    {"name": "Problem Solving", "category": "Soft Skills", "proficiency": 8},
    {"name": "Communication", "category": "Soft Skills", "proficiency": 8},
    {"name": "Data Analysis", "category": "Analytics", "proficiency": 8},
    {"name": "Machine Learning / AI", "category": "AI", "proficiency": 8}
]

def find_employee_by_any_id(employee_id):
    """Helper to find employee by employee_id or ObjectId"""
    if not employee_id:
        return None
    # 1. Try by employee_id string
    emp = employees_collection.find_one({"employee_id": str(employee_id)})
    if emp:
        return emp
    # 2. Try by ObjectId
    try:
        emp = employees_collection.find_one({"_id": ObjectId(str(employee_id))})
        if emp:
            return emp
    except Exception:
        pass
    # 3. Try by string _id
    emp = employees_collection.find_one({"_id": str(employee_id)})
    if emp:
        return emp
    # 4. Try by email if passed
    if "@" in str(employee_id):
        emp = employees_collection.find_one({"email": str(employee_id)})
        if emp:
            return emp
    return None

@csrf_exempt
@require_http_methods(["GET"])
def list_items(request):
    """
    Get all master skills from the skills collection or fallback to defaults
    """
    try:
        skills_list = list(skills_collection.find({}, {'_id': 0}))
        if not skills_list:
            # Seed default master skills if empty
            try:
                skills_collection.insert_many([dict(s) for s in DEFAULT_MASTER_SKILLS])
                skills_list = list(skills_collection.find({}, {'_id': 0}))
            except Exception:
                skills_list = DEFAULT_MASTER_SKILLS
        return JsonResponse({"skills": skills_list})
    except Exception as e:
        return JsonResponse({"skills": DEFAULT_MASTER_SKILLS})

@api_view(['GET'])
def get_employee_skills(request, employee_id):
    """
    Get skills for a specific employee
    """
    try:
        employee = find_employee_by_any_id(employee_id)
        
        if not employee:
            return Response(
                {"error": f"Employee with ID {employee_id} not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

        employee_skills = employee.get('skills', [])
        
        # Normalize skills into objects with name and proficiency (default 8)
        normalized = []
        for s in employee_skills:
            if isinstance(s, str):
                normalized.append({"name": s, "proficiency": 8})
            elif isinstance(s, dict):
                name = s.get('name') or s.get('skill') or ''
                if name:
                    prof = s.get('proficiency')
                    if prof is None:
                        prof = 8
                    normalized.append({"name": name, "proficiency": int(prof)})
        
        return Response({
            "employee_id": employee.get('employee_id', str(employee.get('_id', ''))),
            "name": f"{employee.get('first_name', '')} {employee.get('last_name', '')}".strip(),
            "skills": normalized
        })
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST', 'PUT'])
def update_employee_skills(request, employee_id):
    """
    Update skills for a specific employee
    """
    try:
        skills = request.data.get('skills', [])
        
        employee = find_employee_by_any_id(employee_id)
        
        if not employee:
            return Response(
                {"error": f"Employee with ID {employee_id} not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Normalize skills list before saving (default proficiency = 8)
        normalized = []
        for s in skills:
            if isinstance(s, str):
                if s.strip():
                    normalized.append({"name": s.strip(), "proficiency": 8})
            elif isinstance(s, dict):
                name = (s.get('name') or s.get('skill') or '').strip()
                if name:
                    prof = s.get('proficiency')
                    if prof is None:
                        prof = 8
                    try:
                        prof = int(prof)
                    except (ValueError, TypeError):
                        prof = 8
                    normalized.append({"name": name, "proficiency": prof})
        
        # Update the employee record
        employees_collection.update_one(
            {"_id": employee["_id"]},
            {"$set": {"skills": normalized}}
        )
        
        return Response({
            "message": f"Skills updated successfully",
            "employee_id": employee.get('employee_id', str(employee["_id"])),
            "skills": normalized
        })
            
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
