from django.shortcuts import render

# Create your views here.

"""
Views for leave management
"""
import json
import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from hr_backend.db import leaves, employees, notifications, teams as teams_collection, users as users_collection

@csrf_exempt
@require_http_methods(["POST"])
def request_leave(request):
    """
    Request a new leave
    Endpoint: POST /api/leaves/request
    """
    try:
        # Get user_id from JWT auth middleware
        user_id = request.user_id
        
        # Parse JSON data
        data = json.loads(request.body)
        employee_id = data.get('employee_id') or user_id
        leave_type = data.get('leave_type')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        reason = data.get('reason', '')
        is_half_day = data.get('is_half_day', False)
        half_day_segment = data.get('half_day_segment') # First Half, Second Half
        
        # Validate required fields
        if not leave_type or not start_date or not end_date:
            return JsonResponse({
                'error': 'Missing data',
                'message': 'Leave type, start date, and end date are required'
            }, status=400)
            
        # Robust employee lookup:
        # Step 1: Find the User document
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        if not user:
            return JsonResponse({'error': 'Unauthorized', 'message': 'User not found'}, status=401)
            
        # Step 2: Get the employee_id string (e.g., 'EMP001')
        target_employee_code = user.get('employee_id')
        
        # Step 3: Find the Employee document
        employee = employees.find_one({'employee_id': target_employee_code})
        if not employee:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Employee data for {target_employee_code} not found'
            }, status=404)
            
        # Calculate number of days
        try:
            start = datetime.date.fromisoformat(start_date)
            end = datetime.date.fromisoformat(end_date)
            
            if is_half_day:
                days = 0.5
                if start_date != end_date:
                    return JsonResponse({
                        'error': 'Invalid dates',
                        'message': 'Half day leave must start and end on the same day'
                    }, status=400)
                if not half_day_segment:
                    return JsonResponse({
                        'error': 'Missing data',
                        'message': 'Half day segment (First/Second Half) is required'
                    }, status=400)
            else:
                delta = end - start
                days = float(delta.days + 1)  # Include both start and end days
            
            if days <= 0:
                return JsonResponse({
                    'error': 'Invalid dates',
                    'message': 'End date must be after start date'
                }, status=400)
        except ValueError:
            return JsonResponse({
                'error': 'Invalid dates',
                'message': 'Dates must be in ISO format (YYYY-MM-DD)'
            }, status=400)
            
        # Check for overlapping leave requests
        overlapping = leaves.find_one({
            'employee_id': target_employee_code,
            'status': {'$in': ['Pending', 'Approved']},
            '$or': [
                {'start_date': {'$lte': end_date}, 'end_date': {'$gte': start_date}},
                {'start_date': {'$gte': start_date, '$lte': end_date}},
                {'end_date': {'$gte': start_date, '$lte': end_date}}
            ]
        })
        
        if overlapping:
            # If requesting a half day and overlapping is also a half day, check segments
            can_proceed = False
            if is_half_day and overlapping.get('is_half_day') and overlapping.get('start_date') == start_date:
                if overlapping.get('half_day_segment') != half_day_segment:
                    can_proceed = True
            
            if not can_proceed:
                return JsonResponse({
                    'error': 'Overlapping leave',
                    'message': 'You already have an approved or pending leave request for these dates'
                }, status=409)
            
        # Create leave request
        leave_data = {
            'employee_id': target_employee_code, # STRING ID
            'employee_name': f"{employee.get('first_name', '')} {employee.get('last_name', '')}".strip(),
            'leave_type': leave_type,
            'is_half_day': is_half_day,
            'half_day_segment': half_day_segment if is_half_day else None,
            'start_date': start_date,
            'end_date': end_date,
            'days': days,
            'reason': reason,
            'status': 'Pending',
            'requested_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'manager_id': employee.get('reporting_manager') or employee.get('manager_id'),
            'manager_name': employee.get('manager_name', 'System Admin'),
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc),
            'updated_at': datetime.datetime.now(tz=datetime.timezone.utc)
        }
        
        result = leaves.insert_one(leave_data)
        
        # Create notification for managers/leads
        manager_notification = {
            'type': 'leave_request',
            'user_id': None,  # For relevant managers/leads
            'role': 'Manager',
            'title': 'New Leave Request',
            'message': f"{employee.get('first_name')} {employee.get('last_name')} has requested {days} days of {leave_type} leave",
            'reference_id': str(result.inserted_id),
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'read': False
        }
        
        notifications.insert_one(manager_notification)
        
        return JsonResponse({
            'message': 'Leave request submitted successfully',
            'leave_id': str(result.inserted_id),
            'days': days,
            'status': 'Pending'
        }, status=201)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid request',
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_leave_requests(request, status=None):
    """
    Get leave requests with optional filtering
    Endpoint: GET /api/leaves/ or GET /api/leaves/pending
    """
    try:
        # Parse query parameters
        employee_id = request.GET.get('employee_id')
        leave_type = request.GET.get('leave_type')
        is_personal = request.GET.get('me') == 'true'
        
        # Build query filter
        query_filter = {}
        
        # Filter by status if provided
        if status:
            query_filter['status'] = status
            
        # 1. ENFORCE PERSONAL FILTERING IF 'me' PARAM IS PRESENT
        if is_personal or (not employee_id and not status and request.role != 'Employee'):
            # If explicit 'me' OR it's a default GET /api/leaves/ for a privileged user
            # We must resolve to their own employee_id for the history section
            curr_user = users_collection.find_one({"_id": ObjectId(request.user_id)})
            query_filter['employee_id'] = curr_user.get('employee_id') if curr_user else 'UNKNOWN'
            
        # 2. OTHERWISE, APPLY ROLE-BASED FILTERING
        elif employee_id:
            query_filter['employee_id'] = employee_id # String ID like EMP001
        elif request.role == 'Employee':
            # Basic fallback for regular employees
            curr_user = users_collection.find_one({"_id": ObjectId(request.user_id)})
            query_filter['employee_id'] = curr_user.get('employee_id') if curr_user else 'UNKNOWN'
        elif request.role == 'Manager':
            # Managers should see requests from their team members
            curr_user_id_str = str(request.user_id)
            managed_teams = list(teams_collection.find({'manager_id': curr_user_id_str}))
            team_member_ids = []
            for team in managed_teams:
                team_member_ids.extend(team.get('members', []))
            
            # If they manage teams, filter by those members
            if team_member_ids:
                query_filter['employee_id'] = {'$in': team_member_ids}
            else:
                # Fallback to manager_id in leave doc (if set)
                query_filter['manager_id'] = request.employee_id or curr_user_id_str
            
        # Get leave requests
        leave_requests = list(leaves.find(query_filter).sort('requested_at', -1))
        
        # Serialize for response
        response_data = []
        for leave in leave_requests:
            leave['_id'] = str(leave['_id'])
            leave['employee_id'] = str(leave['employee_id'])
            
            # Get employee details
            employee = employees.find_one({'employee_id': leave['employee_id']})
            if employee:
                leave['employee_name'] = f"{employee.get('first_name', '')} {employee.get('last_name', '')}"
                leave['department'] = employee.get('department', '')
                
            response_data.append(leave)
            
        return JsonResponse({
            'count': len(response_data),
            'leaves': response_data
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_leave(request, leave_id):
    """
    Get a single leave request by ID
    Endpoint: GET /api/leaves/{leave_id}
    """
    try:
        # Get leave request
        leave = leaves.find_one({'_id': ObjectId(leave_id)})
        
        if not leave:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Leave request with ID {leave_id} not found'
            }, status=404)
            
        # Check permissions
        if request.role == 'Employee' and str(leave['employee_id']) != request.user_id:
            return JsonResponse({
                'error': 'Permission denied',
                'message': 'You can only view your own leave requests'
            }, status=403)
            
        # Serialize for response
        leave['_id'] = str(leave['_id'])
        leave['employee_id'] = str(leave['employee_id'])
        
        # Get employee details
        employee = employees.find_one({'employee_id': leave['employee_id']})
        if employee:
            leave['employee_name'] = f"{employee.get('first_name', '')} {employee.get('last_name', '')}"
            leave['department'] = employee.get('department', '')
            
        return JsonResponse(leave)
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["PUT"])
def update_leave_status(request, leave_id, status=None):
    """
    Update leave request status (approve/reject)
    Endpoint: PUT /api/leaves/{leave_id}
    """
    try:
        # Get leave request
        leave = leaves.find_one({'_id': ObjectId(leave_id)})
        
        if not leave:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Leave request with ID {leave_id} not found'
            }, status=404)
            
        # Check permissions: Admin, Manager, OR Team Lead of the employee
        can_approve = False
        if request.role in ['Admin', 'Manager']:
            can_approve = True
        
        # If not authorized via role, check if they are the Team's Manager (Team Lead)
        if not can_approve:
            curr_user_id_str = str(request.user_id)
            applicant_employee_id = leave.get('employee_id')
            
            # Match against 'manager_id' in Teams collection (which stores user_id as string)
            team = teams_collection.find_one({
                'manager_id': curr_user_id_str,
                'members': applicant_employee_id
            })
            if team:
                can_approve = True
                    
        if not can_approve:
            return JsonResponse({
                'error': 'Permission denied',
                'message': 'Only managers, admins, or your Team Lead can approve/reject leave requests'
            }, status=403)
            
        # Parse JSON data
        try:
            if request.body:
                data = json.loads(request.body)
                status = status or data.get('status')
                comments = data.get('comments', '')
            else:
                comments = ''
        except json.JSONDecodeError:
            comments = ''
        
        # Use provided status from URL (kwargs) or request data
        if not status:
            return JsonResponse({
                'error': 'Missing status',
                'message': 'Status is required'
            }, status=400)
        
        # Validate status
        if not status or status not in ['Approved', 'Rejected', 'Cancelled']:
            return JsonResponse({
                'error': 'Invalid status',
                'message': 'Status must be Approved, Rejected, or Cancelled'
            }, status=400)
            
        if leave['status'] != 'Pending':
            return JsonResponse({
                'error': 'Invalid status change',
                'message': f'Leave request is already {leave["status"]}'
            }, status=400)
            
        # Update leave request
        update_data = {
            'status': status,
            'comments': comments,
            'reviewed_by': request.user_id,
            'reviewed_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat()
        }
        
        leaves.update_one(
            {'_id': ObjectId(leave_id)},
            {'$set': update_data}
        )
        
        # Create notification for employee
        employee_notification = {
            'type': 'leave_update',
            'user_id': str(leave['employee_id']),
            'title': f'Leave Request {status}',
            'message': f'Your {leave["leave_type"]} leave request has been {status.lower()}' + 
                      (f': {comments}' if comments else ''),
            'reference_id': leave_id,
            'created_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
            'read': False
        }
        
        notifications.insert_one(employee_notification)
        
        return JsonResponse({
            'message': f'Leave request {status.lower()} successfully',
            'status': status
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid request',
            'message': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_leave_balance(request, employee_id):
    """
    Get leave balance for an employee
    Endpoint: GET /api/leaves/balance/{employee_id}
    """
    try:
        # Resolve 'me' to the current user's employee_id string
        if employee_id == 'me':
            curr_user = users_collection.find_one({"_id": ObjectId(request.user_id)})
            if not curr_user:
                return JsonResponse({'error': 'Not found', 'message': 'User not found'}, status=404)
            employee_id = curr_user.get('employee_id')
            
        # Check if employee exists by employee_id string
        employee = employees.find_one({'employee_id': employee_id})
        
        if not employee:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Employee with ID {employee_id} not found'
            }, status=404)
            
        # The key for lookups is the employee_id string
        emp_code = employee.get('employee_id')
        
        # Get current year
        current_year = datetime.datetime.now(tz=datetime.timezone.utc).year
        year_start = f"{current_year}-01-01"
        year_end = f"{current_year}-12-31"
        
        # Get approved leaves for current year
        approved_leaves = list(leaves.find({
            'employee_id': emp_code,
            'status': 'Approved',
            'start_date': {'$gte': year_start, '$lte': year_end}
        }))
        
        # Get pending leaves
        pending_leaves = list(leaves.find({
            'employee_id': emp_code,
            'status': 'Pending'
        }))
        
        # Calculate used leaves by type
        used_leaves = {}
        for leave in approved_leaves:
            leave_type = leave['leave_type']
            if leave_type not in used_leaves:
                used_leaves[leave_type] = 0
            used_leaves[leave_type] += leave['days']
            
        # Calculate pending leaves by type
        pending = {}
        for leave in pending_leaves:
            leave_type = leave['leave_type']
            if leave_type not in pending:
                pending[leave_type] = 0
            pending[leave_type] += leave['days']
            
        # Default leave entitlements
        entitlements = {
            'Earned Leaves': 18,
            'LOP Leaves': 100 # Large number for loss of pay
        }
        
        # Calculate remaining leaves
        remaining = {}
        for leave_type, entitlement in entitlements.items():
            used = used_leaves.get(leave_type, 0)
            remaining[leave_type] = entitlement - used
            
        return JsonResponse({
            'employee_id': employee_id,
            'employee_name': f"{employee.get('first_name', '')} {employee.get('last_name', '')}",
            'year': current_year,
            'entitlements': entitlements,
            'used': used_leaves,
            'pending': pending,
            'remaining': remaining
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_leave_types(request):
    """
    Get available leave types
    Endpoint: GET /api/leaves/types
    """
    try:
        # Default leave types
        leave_types = [
            {'id': 'Earned Leaves', 'name': 'Earned Leaves', 'description': 'Paid vacation time'},
            {'id': 'LOP Leaves', 'name': 'LOP Leaves', 'description': 'Loss of Pay / Unpaid leave'}
        ]
        
        return JsonResponse({
            'leave_types': leave_types
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["DELETE", "PUT"])
def cancel_leave(request, leave_id):
    """
    Cancel a pending leave request
    Endpoint: DELETE /api/leaves/{leave_id}
    """
    try:
        # Get leave request
        leave = leaves.find_one({'_id': ObjectId(leave_id)})
        
        if not leave:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Leave request with ID {leave_id} not found'
            }, status=404)
            
        # Check permissions
        if request.role == 'Employee' and str(leave['employee_id']) != request.user_id:
            return JsonResponse({
                'error': 'Permission denied',
                'message': 'You can only cancel your own leave requests'
            }, status=403)
            
        if leave['status'] != 'Pending':
            return JsonResponse({
                'error': 'Invalid action',
                'message': f'Cannot cancel a leave request that is already {leave["status"]}'
            }, status=400)
            
        # Update leave request to Cancelled
        leaves.update_one(
            {'_id': ObjectId(leave_id)},
            {'$set': {
                'status': 'Cancelled',
                'cancelled_at': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
                'cancelled_by': request.user_id
            }}
        )
        
        return JsonResponse({
            'message': 'Leave request cancelled successfully'
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)
