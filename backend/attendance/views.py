"""
Views for attendance management
"""
import json
import datetime
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from functools import wraps # Import wraps for decorator

from hr_backend.db import attendance, employees
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints,
    validate_required_fields
)

# Define required fields for attendance creation
ATTENDANCE_REQUIRED_FIELDS = ['employee_id', 'date']

# Define searchable fields for attendance
ATTENDANCE_SEARCHABLE_FIELDS = ['employee_id', 'date', 'status']

# Create standard CRUD endpoints
attendance_crud = create_crud_endpoints(
    collection=attendance,
    required_fields=ATTENDANCE_REQUIRED_FIELDS,
    search_fields=ATTENDANCE_SEARCHABLE_FIELDS
)

# --- Simple Decorator to Check for user_id --- 
# This replaces the need for utils.auth_utils for now, using the ID from middleware
def require_user_id(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not hasattr(request, 'user_id') or not request.user_id:
            return JsonResponse({'error': 'Authentication required', 'message': 'User ID not found on request.'}, status=401)
        try:
            # Validate that the user_id is a valid ObjectId format if needed
            # ObjectId(request.user_id)
            pass
        except Exception:
             return JsonResponse({'error': 'Invalid authentication', 'message': 'Invalid User ID format.'}, status=401)
        return view_func(request, *args, **kwargs)
    return _wrapped_view

@csrf_exempt
@require_http_methods(["GET"])
def list_attendance(request):
    """
    List attendance records with optional filtering
    Endpoint: GET /api/attendance/
    """
    # TODO: Add permission check (Admin/HR only)
    return attendance_crud['list_items'](request)

@csrf_exempt
@require_http_methods(["GET"])
def get_attendance(request, attendance_id):
    """
    Get a single attendance record by ID
    Endpoint: GET /api/attendance/{attendance_id}
    """
    # TODO: Add permission check (Admin/HR or owner)
    return attendance_crud['get_item'](request, attendance_id)

@csrf_exempt
@require_http_methods(["POST"])
def create_attendance(request):
    """
    Create a new attendance record (Manual entry by Admin/HR)
    Endpoint: POST /api/attendance/new/
    """
    # TODO: Add permission check (Admin/HR only)
    return attendance_crud['create_item'](request)

@csrf_exempt
@require_http_methods(["PUT"])
def update_attendance(request, attendance_id):
    """
    Update an attendance record (full update)
    Endpoint: PUT /api/attendance/{attendance_id}/update/
    """
    # TODO: Add permission check (Admin/HR only)
    return attendance_crud['update_item'](request, attendance_id)

@csrf_exempt
@require_http_methods(["PATCH"])
def partial_update_attendance(request, attendance_id):
    """
    Update an attendance record (partial update)
    Endpoint: PATCH /api/attendance/{attendance_id}/partial/
    """
    # TODO: Add permission check (Admin/HR only)
    return attendance_crud['partial_update_item'](request, attendance_id)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_attendance(request, attendance_id):
    """
    Delete an attendance record
    Endpoint: DELETE /api/attendance/{attendance_id}/delete/
    """
    # TODO: Add permission check (Admin/HR only)
    return attendance_crud['delete_item'](request, attendance_id)

@csrf_exempt
@require_http_methods(["GET"])
@require_user_id # Use the simple decorator
def get_user_attendance_status(request):
    """
    Get the current clock-in status for the authenticated user.
    Endpoint: GET /api/attendance/status/
    Requires Auth: Yes (via middleware attaching user_id)
    """
    try:
        employee_id_str = request.user_id # Get ID from middleware
        
        # Debug logging - add this
        print(f"Getting attendance status for user_id: {employee_id_str}")
        
        # Check if employee exists in database first
        employee = employees.find_one({"_id": ObjectId(employee_id_str)})
        if not employee:
            # For development, create a mock response
            print(f"Warning: Employee with ID {employee_id_str} not found, returning mock data")
            return JsonResponse({
                'is_clocked_in': False,
                'last_check_in': None,
                'current_server_time': datetime.datetime.now(tz=datetime.timezone.utc).isoformat(),
                'debug_info': f"Employee ID {employee_id_str} not found"
            })
        
        # Get current date and time
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        today = now.date().isoformat()
        
        # Check for today's record
        today_record = attendance.find_one({
            'employee_id': ObjectId(employee_id_str),
            'date': today
        })
        
        is_clocked_in = False
        last_check_in = None
        
        if today_record and today_record.get('clock_in') and not today_record.get('clock_out'):
            is_clocked_in = True
            last_check_in = today_record.get('clock_in')
            
        return JsonResponse({
            'is_clocked_in': is_clocked_in,
            'last_check_in': last_check_in,
            'current_server_time': now.isoformat()
        })
            
    except Exception as e:
        print(f"Error in get_user_attendance_status: {e}")
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@require_user_id # Use the simple decorator
def clock_in(request):
    """
    Clock in the authenticated employee.
    Endpoint: POST /api/attendance/clock-in/
    Requires Auth: Yes (via middleware attaching user_id)
    """
    try:
        employee_id_str = request.user_id # Get ID from middleware
        
        employee_id = ObjectId(employee_id_str)
            
        # Get current date and time
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        today = now.date().isoformat()
        
        # Check if already clocked in today
        existing_record = attendance.find_one({
            'employee_id': employee_id,
            'date': today
        })
        
        if existing_record and existing_record.get('clock_in') and not existing_record.get('clock_out'):
            return JsonResponse({
                'error': 'Already clocked in',
                'message': 'You have already clocked in today'
            }, status=400)
        
        # Create or update attendance record
        if existing_record:
            # Update existing record (e.g., if they clocked out and are clocking back in on the same day)
            attendance.update_one(
                {'_id': existing_record['_id']},
                {'$set': {
                    'clock_in': now.isoformat(),
                    'status': 'present',
                    'clock_out': None, # Ensure clock_out is nullified if re-clocking in
                    'total_hours': existing_record.get('total_hours', 0), # Keep previous hours if re-clocking in
                    'updated_at': now.isoformat()
                }}
            )
            record_id = str(existing_record['_id'])
        else:
            # Create new record
            new_record = {
                'employee_id': employee_id,
                'date': today,
                'clock_in': now.isoformat(),
                'status': 'present',
                'total_hours': 0,
                'created_at': now.isoformat(),
                'updated_at': now.isoformat()
            }
            result = attendance.insert_one(new_record)
            record_id = str(result.inserted_id)
            
        return JsonResponse({
            'message': 'Clock-in successful',
            'attendance_id': record_id,
            'clock_in_time': now.isoformat()
        }, status=200)
        
    except Exception as e:
        print(f"Error in clock_in: {e}")
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@require_user_id # Use the simple decorator
def clock_out(request):
    """
    Clock out the authenticated employee.
    Endpoint: POST /api/attendance/clock-out/
    Requires Auth: Yes (via middleware attaching user_id)
    """
    try:
        employee_id_str = request.user_id # Get ID from middleware
        
        employee_id = ObjectId(employee_id_str)
        
        # Get current date and time
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        today = now.date().isoformat()
        
        # Find the latest clock-in record for today that hasn't been clocked out
        existing_record = attendance.find_one({
            'employee_id': employee_id,
            'date': today,
            'clock_in': {'$ne': None},
            'clock_out': None 
        })
        
        if not existing_record:
            return JsonResponse({
                'error': 'Not clocked in',
                'message': 'You are not currently clocked in for today'
            }, status=400)
            
        # Calculate total hours for this segment
        clock_in_time = datetime.datetime.fromisoformat(existing_record['clock_in'])
        hours_this_segment = (now - clock_in_time).total_seconds() / 3600
        
        # Get previous total hours if re-clocking in/out on the same day
        previous_total_hours = existing_record.get('total_hours', 0)
        current_total_hours = previous_total_hours + hours_this_segment

        # Update attendance record
        attendance.update_one(
            {'_id': existing_record['_id']},
            {'$set': {
                'clock_out': now.isoformat(),
                'total_hours': round(current_total_hours, 2),
                'updated_at': now.isoformat()
            }}
        )
            
        return JsonResponse({
            'message': 'Clock-out successful',
            'attendance_id': str(existing_record['_id']),
            'clock_out_time': now.isoformat(),
            'total_hours_today': round(current_total_hours, 2)
        }, status=200)
        
    except Exception as e:
        print(f"Error in clock_out: {e}")
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
@require_user_id # Use the simple decorator
def get_my_attendance(request):
    """
    Get attendance records for the authenticated user.
    Endpoint: GET /api/attendance/me/
    Requires Auth: Yes (via middleware attaching user_id)
    """
    try:
        employee_id_str = request.user_id # Get ID from middleware
        
        # Debug logging - add this
        print(f"Getting attendance history for user_id: {employee_id_str}")
        
        # Check if employee exists in database first
        employee = employees.find_one({"_id": ObjectId(employee_id_str)})
        if not employee:
            # For development, create a mock response
            print(f"Warning: Employee with ID {employee_id_str} not found, returning mock data")
            return JsonResponse({
                'results': [],
                'count': 0,
                'page': 1,
                'limit': 10,
                'pages': 0,
                'has_next': False,
                'has_prev': False,
                'debug_info': f"Employee ID {employee_id_str} not found"
            })

        employee_id = ObjectId(employee_id_str)

        # Parse query parameters (start_date, end_date, etc.)
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        status = request.GET.get('status')
        limit = int(request.GET.get('limit', 100))
        page = int(request.GET.get('page', 1))
        skip = (page - 1) * limit

        # Build query filter
        query_filter = {'employee_id': employee_id}
        
        if start_date and end_date:
            query_filter['date'] = {'$gte': start_date, '$lte': end_date}
        elif start_date:
            query_filter['date'] = {'$gte': start_date}
        elif end_date:
            query_filter['date'] = {'$lte': end_date}
            
        if status:
            query_filter['status'] = status
            
        # Get attendance records from database with pagination
        total_count = attendance.count_documents(query_filter)
        records = list(attendance.find(query_filter).sort('date', -1).skip(skip).limit(limit))
        
        # Serialize for response
        response_data = [serialize_document(rec) for rec in records]
        
        # Calculate pagination metadata
        total_pages = (total_count + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1
        
        return JsonResponse({
            'results': response_data,
            'count': total_count,
            'page': page,
            'limit': limit,
            'pages': total_pages,
            'has_next': has_next,
            'has_prev': has_prev
        })

    except Exception as e:
        print(f"Error in get_my_attendance: {e}")
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def employee_attendance(request, employee_id):
    """
    Get attendance records for a specific employee (Admin/HR view).
    Endpoint: GET /api/attendance/employee/{employee_id}/
    Requires Auth: Yes (Admin/HR role)
    """
    # TODO: Add permission check (Admin/HR only)
    try:
        # Check if employee exists
        try:
            emp_obj_id = ObjectId(employee_id)
            employee = employees.find_one({'_id': emp_obj_id})
            if not employee:
                return JsonResponse({'error': 'Not found', 'message': f'Employee with ID {employee_id} not found'}, status=404)
        except Exception:
             return JsonResponse({'error': 'Invalid ID', 'message': f'Invalid employee ID format: {employee_id}'}, status=400)

        # Parse query parameters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        status = request.GET.get('status')
        limit = int(request.GET.get('limit', 100))
        page = int(request.GET.get('page', 1))
        skip = (page - 1) * limit
        
        # Build query filter
        query_filter = {'employee_id': emp_obj_id}
        
        if start_date and end_date:
            query_filter['date'] = {'$gte': start_date, '$lte': end_date}
        elif start_date:
            query_filter['date'] = {'$gte': start_date}
        elif end_date:
            query_filter['date'] = {'$lte': end_date}
            
        if status:
            query_filter['status'] = status
            
        # Get attendance records from database with pagination
        total_count = attendance.count_documents(query_filter)
        records = list(attendance.find(query_filter).sort('date', -1).skip(skip).limit(limit))
        
        # Serialize for response
        response_data = [serialize_document(rec) for rec in records]

        # Calculate pagination metadata
        total_pages = (total_count + limit - 1) // limit
        has_next = page < total_pages
        has_prev = page > 1

        return JsonResponse({
            'results': response_data,
            'count': total_count,
            'page': page,
            'limit': limit,
            'pages': total_pages,
            'has_next': has_next,
            'has_prev': has_prev
        })
        
    except Exception as e:
        print(f"Error in employee_attendance: {e}")
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def attendance_summary(request):
    """
    Get overall attendance summary (e.g., for dashboard)
    Endpoint: GET /api/attendance/summary/
    Requires Auth: Yes (Admin/HR role)
    """
    # TODO: Implement summary logic (e.g., count present, absent, late today)
    # TODO: Add permission check (Admin/HR only)
    return JsonResponse({'message': 'Attendance summary endpoint not fully implemented.'}, status=501)

@csrf_exempt
@require_http_methods(["GET"])
def get_attendance_summary(request, employee_id):
    """
    Get summary of attendance for an employee
    Endpoint: GET /api/attendance/summary/{employee_id}
    """
    # TODO: Add permission check (Admin/HR or employee self)
    try:
        # Check if employee exists
        employee = employees.find_one({'_id': ObjectId(employee_id)})
        if not employee:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Employee with ID {employee_id} not found'
            }, status=404)
            
        # Get current month start and end dates
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        month_start = datetime.date(now.year, now.month, 1).isoformat()
        
        if now.month == 12:
            next_month = 1
            next_year = now.year + 1
        else:
            next_month = now.month + 1
            next_year = now.year
            
        month_end = (datetime.date(next_year, next_month, 1) - datetime.timedelta(days=1)).isoformat()
        
        # Get attendance records for current month
        monthly_records = list(attendance.find({
            'employee_id': ObjectId(employee_id),
            'date': {'$gte': month_start, '$lte': month_end}
        }))
        
        # Calculate statistics
        total_days = len(monthly_records)
        present_days = sum(1 for record in monthly_records if record.get('clock_in') and record.get('clock_out'))
        absent_days = sum(1 for record in monthly_records if not record.get('clock_in'))
        half_days = sum(1 for record in monthly_records 
                      if record.get('clock_in') and record.get('total_hours', 0) < 4)
                      
        total_hours = sum(record.get('total_hours', 0) for record in monthly_records 
                        if record.get('total_hours') is not None)
                        
        # Get today's record if exists
        today = now.date().isoformat()
        today_record = attendance.find_one({
            'employee_id': ObjectId(employee_id),
            'date': today
        })
        
        today_status = 'Not Recorded'
        if today_record:
            if today_record.get('clock_in') and today_record.get('clock_out'):
                today_status = 'Present (Completed)'
            elif today_record.get('clock_in'):
                today_status = 'Present (Working)'
            else:
                today_status = 'Absent'
                
        return JsonResponse({
            'employee_id': employee_id,
            'employee_name': f"{employee.get('first_name', '')} {employee.get('last_name', '')}",
            'summary': {
                'month': f"{now.year}-{now.month:02d}",
                'total_days': total_days,
                'present_days': present_days,
                'absent_days': absent_days,
                'half_days': half_days,
                'total_hours': round(total_hours, 2),
                'attendance_percentage': round((present_days / max(total_days, 1)) * 100, 2)
            },
            'today': {
                'date': today,
                'status': today_status,
                'clock_in': today_record.get('clock_in') if today_record else None,
                'clock_out': today_record.get('clock_out') if today_record else None
            }
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def get_monthly_report(request, employee_id, year, month):
    """
    Get detailed monthly attendance report for an employee
    Endpoint: GET /api/attendance/report/{employee_id}/{year}/{month}
    """
    # TODO: Add permission check (Admin/HR or employee self)
    try:
        # Check if employee exists
        employee = employees.find_one({'_id': ObjectId(employee_id)})
        if not employee:
            return JsonResponse({
                'error': 'Not found',
                'message': f'Employee with ID {employee_id} not found'
            }, status=404)
            
        # Convert year and month to integers
        year = int(year)
        month = int(month)
        
        # Get month start and end dates
        month_start = datetime.date(year, month, 1).isoformat()
        
        if month == 12:
            next_month = 1
            next_year = year + 1
        else:
            next_month = month + 1
            next_year = year
            
        month_end = (datetime.date(next_year, next_month, 1) - datetime.timedelta(days=1)).isoformat()
        
        # Get attendance records for the month
        monthly_records = list(attendance.find({
            'employee_id': ObjectId(employee_id),
            'date': {'$gte': month_start, '$lte': month_end}
        }).sort('date', 1))
        
        # Serialize for response
        records = []
        for record in monthly_records:
            # Convert ObjectId to string for JSON serialization
            record['_id'] = str(record['_id'])
            record['employee_id'] = str(record['employee_id'])
            # Ensure datetime objects are serialized (handled by serialize_document)
            records.append(serialize_document(record))
            
        # Calculate total hours
        total_hours = sum(record.get('total_hours', 0) for record in records 
                        if record.get('total_hours') is not None)
        
        return JsonResponse({
            'employee_id': employee_id,
            'employee_name': f"{employee.get('first_name', '')} {employee.get('last_name', '')}",
            'year': year,
            'month': month,
            'records': records,
            'total_days': len(records),
            'total_hours': round(total_hours, 2)
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)
