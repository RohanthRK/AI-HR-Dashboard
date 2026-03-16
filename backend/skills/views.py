from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
import json
from hr_backend.db import db, employees as employees_collection, skills as skills_collection

@csrf_exempt
@require_http_methods(["GET"])
def list_items(request):
    # Get all skills from the skills collection
    try:
        skills_list = list(skills_collection.find({}, {'_id': 0}))
        return JsonResponse({"skills": skills_list})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@api_view(['GET'])
def get_employee_skills(request, employee_id):
    """
    Get skills for a specific employee
    """
    try:
        # Find the employee
        employee = employees_collection.find_one({"employee_id": employee_id})
        
        if not employee:
            return Response(
                {"error": f"Employee with ID {employee_id} not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

        # Get skills for this employee
        employee_skills = employee.get('skills', [])
        
        return Response({
            "employee_id": employee_id,
            "name": f"{employee.get('first_name', '')} {employee.get('last_name', '')}",
            "skills": employee_skills
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
        
        if not skills:
            return Response(
                {"error": "No skills provided"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find the employee
        employee = employees_collection.find_one({"employee_id": employee_id})
        
        if not employee:
            return Response(
                {"error": f"Employee with ID {employee_id} not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update the employee's skills
        result = employees_collection.update_one(
            {"employee_id": employee_id},
            {"$set": {"skills": skills}}
        )
        
        if result.modified_count > 0:
            return Response({
                "message": f"Skills updated successfully for employee {employee_id}",
                "employee_id": employee_id,
                "skills": skills
            })
        else:
            return Response({
                "message": "No changes made to employee skills",
                "employee_id": employee_id,
                "skills": skills
            })
            
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
