from django.shortcuts import render
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.decorators import action, api_view
from django_filters.rest_framework import DjangoFilterBackend
from .models import Team, Project
from .serializers import (
    TeamSerializer, 
    TeamCreateUpdateSerializer,
    ProjectSerializer
)
from employees.models import Employee
from hr_backend.db import teams as teams_collection, employees as employees_collection
from bson.objectid import ObjectId
import json
from django.http import JsonResponse
from datetime import datetime
import traceback
from utils.api_utils import serialize_document

@api_view(['GET'])
def debug_teams(request):
    """
    Return all teams from MongoDB for debugging purposes
    """
    try:
        teams = list(teams_collection.find({}))
        serialized_teams = [serialize_document(team) for team in teams]
        return Response(serialized_teams, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TeamViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing Team instances.
    """
    queryset = Team.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['department']
    search_fields = ['name', 'description', 'department']
    ordering_fields = ['name', 'created_at', 'department']
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TeamCreateUpdateSerializer
        return TeamSerializer
    
    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        team = self.get_object()
        serializer = TeamSerializer(team)
        return Response(serializer.data['members'])
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        team = self.get_object()
        employee_id = request.data.get('employee_id')
        
        try:
            employee = Employee.objects.get(id=employee_id)
            team.add_member(employee)
            return Response({'status': 'Member added'}, status=status.HTTP_200_OK)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        team = self.get_object()
        employee_id = request.data.get('employee_id')
        
        try:
            employee = Employee.objects.get(id=employee_id)
            team.remove_member(employee)
            return Response({'status': 'Member removed'}, status=status.HTTP_200_OK)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    def set_leader(self, request, pk=None):
        team = self.get_object()
        employee_id = request.data.get('employee_id')
        
        if not employee_id:
            return Response({"error": "Employee ID is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            employee = Employee.objects.get(id=employee_id)
            team.leader = employee
            team.save()
            return Response({"success": f"{employee.user.get_full_name()} set as leader of {team.name}"})
        except Employee.DoesNotExist:
            return Response({"error": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        team = self.get_object()
        projects = team.projects.all()
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data)


@api_view(['POST'])
def mongodb_create(request):
    """
    Create a team in MongoDB with department and employee data
    
    Request:
        {
            "name": "Team name",
            "department": "Department name",
            "description": "Team description",
            "leader_id": "ID of leader",
            "employee_ids": ["ID1", "ID2"]
        }
    """
    try:
        data = request.data.copy()
        
        # Log the incoming request
        print(f"🔹 TEAMS: Creating team with data: {data}")
        
        # Validate required fields
        if not data.get('name'):
            return Response({'error': 'Team name is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        if not data.get('department'):
            return Response({'error': 'Department is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create a clean team document
        team_doc = {
            'name': data.get('name'),
            'department': data.get('department'),
            'description': data.get('description', f"Team in {data.get('department')} department"),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
            'employees': []
        }
        
        # Process employee IDs if provided
        employee_ids = data.get('employee_ids', [])
        leader_id = data.get('leader_id')
        
        # If leader_id is provided and not in employee_ids, add it
        if leader_id and leader_id not in employee_ids:
            employee_ids.append(leader_id)
        
        # Fetch employee details and add to team
        if employee_ids:
            for emp_id in employee_ids:
                try:
                    # Convert to ObjectId if needed
                    employee_oid = ObjectId(emp_id) if not isinstance(emp_id, ObjectId) else emp_id
                    employee = employees_collection.find_one({'_id': employee_oid})
                    
                    if employee:
                        # Add employee to team
                        employee_data = {
                            'id': str(employee['_id']),
                            'name': f"{employee.get('first_name', '')} {employee.get('last_name', '')}".strip(),
                            'position': employee.get('position', 'Team Member'),
                            'is_leader': str(emp_id) == str(leader_id)
                        }
                        team_doc['employees'].append(employee_data)
                        
                        # Update employee record to include this team
                        if 'teams' not in employee:
                            employee['teams'] = []
                        
                        # Check if employee is already in this team
                        team_exists = False
                        for team in employee.get('teams', []):
                            if team.get('name') == team_doc['name']:
                                team_exists = True
                                break
                            
                        if not team_exists:
                            employee['teams'].append({
                                'name': team_doc['name'],
                                'department': team_doc['department'],
                                'is_leader': str(emp_id) == str(leader_id)
                            })
                            employees_collection.update_one(
                                {'_id': employee_oid},
                                {'$set': {'teams': employee['teams']}}
                            )
                except Exception as emp_error:
                    print(f"❌ TEAMS: Error processing employee {emp_id}: {str(emp_error)}")
                    # Continue with other employees
        
        # Insert team into MongoDB
        print(f"🔹 TEAMS: Inserting team document: {team_doc}")
        result = teams_collection.insert_one(team_doc)
        team_id = str(result.inserted_id)
        
        # Prepare response with serialized document
        response_data = {
            'message': 'Team created successfully',
            'id': team_id,
            'team': {
                'id': team_id,
                **team_doc
            }
        }
        
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"❌ TEAMS: Error creating team: {str(e)}")
        traceback.print_exc()
        return Response({'error': f'Failed to create team: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
def mongodb_update(request, pk=None):
    """
    Update a team in MongoDB with department and employee data
    """
    try:
        if not pk:
            return Response({'error': 'Team ID is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Find the team
        team_id = ObjectId(pk)
        team = teams_collection.find_one({'_id': team_id})
        
        if not team:
            return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)
        
        data = request.data.copy()
        
        print(f"🔹 TEAMS: Updating team {pk} with data: {data}")
        
        # Create an update document
        new_name = data.get('name', team.get('name'))
        new_department = data.get('department', team.get('department'))
        update_doc = {
            'name': new_name,
            'department': new_department,
            'description': data.get('description', team.get('description')),
            'updated_at': datetime.now().isoformat(),
            'employees': []
        }
        
        # Collect old employee ids for comparison
        old_employee_ids = set(e.get('id', '') for e in team.get('employees', []))
        
        # Process new employee IDs
        employee_ids = data.get('employee_ids', [])
        leader_id = data.get('leader_id')
        
        if leader_id and leader_id not in employee_ids:
            employee_ids.append(leader_id)
        
        new_employee_ids = set(str(eid) for eid in employee_ids)
        
        # Un-assign employees no longer in this team
        removed_ids = old_employee_ids - new_employee_ids
        for removed_id in removed_ids:
            try:
                removed_oid = ObjectId(removed_id)
                employees_collection.update_one(
                    {'_id': removed_oid},
                    {'$set': {'team': '', 'team_id': ''}}
                )
                print(f"🔹 TEAMS: Cleared team from employee {removed_id}")
            except Exception as rm_err:
                print(f"❌ TEAMS: Error clearing team from employee {removed_id}: {rm_err}")

        # Fetch employee details and add to team
        if employee_ids:
            for emp_id in employee_ids:
                try:
                    employee_oid = ObjectId(emp_id) if not isinstance(emp_id, ObjectId) else emp_id
                    employee = employees_collection.find_one({'_id': employee_oid})
                    
                    if employee:
                        employee_data = {
                            'id': str(employee['_id']),
                            'name': f"{employee.get('first_name', '')} {employee.get('last_name', '')}".strip(),
                            'position': employee.get('position', 'Team Member'),
                            'email': employee.get('email', ''),
                            'phone': employee.get('phone', ''),
                            'hire_date': employee.get('hire_date', ''),
                            'employee_id': employee.get('employee_id', str(employee['_id'])),
                            'is_leader': str(emp_id) == str(leader_id)
                        }
                        update_doc['employees'].append(employee_data)
                        
                        # Update employee record with team info
                        employees_collection.update_one(
                            {'_id': employee_oid},
                            {'$set': {
                                'team': new_name,
                                'team_id': pk
                            }}
                        )
                except Exception as emp_error:
                    print(f"❌ TEAMS: Error processing employee {emp_id}: {str(emp_error)}")
        
        # Update team in MongoDB
        teams_collection.update_one({'_id': team_id}, {'$set': update_doc})
        
        # Get the updated team
        updated_team = teams_collection.find_one({'_id': team_id})
        serialized_team = serialize_document(updated_team)
        
        return Response({
            'message': 'Team updated successfully',
            'id': pk,
            'team': {
                'id': pk,
                **serialized_team
            }
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        print(f"❌ TEAMS: Error updating team: {str(e)}")
        traceback.print_exc()
        return Response({'error': f'Failed to update team: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing Project instances.
    """
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'team']
    search_fields = ['name', 'description', 'team__name']
    ordering_fields = ['name', 'start_date', 'status']
    
    @action(detail=False, methods=['get'])
    def by_team(self, request):
        team_id = request.query_params.get('team_id')
        if team_id:
            projects = Project.objects.filter(team_id=team_id)
            serializer = self.get_serializer(projects, many=True)
            return Response(serializer.data)
        return Response({'error': 'Team ID is required'}, status=status.HTTP_400_BAD_REQUEST) 