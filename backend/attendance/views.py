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

from hr_backend.db import attendance, employees, leaves
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

def _merge_attendance_with_leaves(employee_id, start_date=None, end_date=None, status_filter=None):
    """
    Helper to merge attendance records with approved leaves and calculate absentees.
    """
    query_filter = {'employee_id': employee_id}
    if status_filter:
        query_filter['status'] = status_filter
        
    # Get attendance records
    attendance_records = list(attendance.find(query_filter).sort('date', 1))
    
    # Also fetch approved leaves - fetch all approved for simplicity and filter in python
    leave_query = {
        'employee_id': employee_id,
        'status': {'$in': ['Approved', 'approved', 'Approved ', ' approved']}
    }
    
    leave_records = list(leaves.find(leave_query))
    
    # Fetch employee for hire date
    employee = employees.find_one({'employee_id': employee_id})
    if not employee:
        try:
            employee = employees.find_one({'_id': ObjectId(employee_id)})
        except:
            pass
            
    hire_date = employee.get('hire_date') if employee else None
    
    results = []
    attendance_map = {rec['date']: serialize_document(rec) for rec in attendance_records}
    
    if start_date and end_date:
        d1 = datetime.date.fromisoformat(start_date)
        d2 = datetime.date.fromisoformat(end_date)
        today = datetime.date.today()
        
        curr = d1
        while curr <= d2:
            date_str = curr.isoformat()
            
            if date_str in attendance_map:
                results.append(attendance_map[date_str])
            else:
                is_on_leave = False
                leave_type = "Leave"
                for leave in leave_records:
                    l_start = leave.get('start_date')
                    l_end = leave.get('end_date')
                    if l_start and l_end and l_start <= date_str <= l_end:
                        is_on_leave = True
                        leave_type = leave.get('leave_type', 'Leave')
                        break
                
                if is_on_leave:
                    results.append({
                        'date': date_str,
                        'status': f'leave ({leave_type})',
                        'is_virtual': True
                    })
                elif curr < today:
                    is_after_hire = True
                    if hire_date:
                        try:
                            h_date = datetime.date.fromisoformat(hire_date)
                            if curr < h_date:
                                is_after_hire = False
                        except: pass
                    
                    if is_after_hire and curr.weekday() < 5:
                        results.append({
                            'date': date_str,
                            'status': 'absent',
                            'is_virtual': True
                        })
            curr += datetime.timedelta(days=1)
    else:
        results = [serialize_document(rec) for rec in attendance_records]
        
    results.sort(key=lambda x: x['date'], reverse=True)
    return results

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
@require_user_id
def get_user_attendance_status(request):
    """
    Get the current clock-in status for the authenticated user.
    Endpoint: GET /api/attendance/status/
    """
    try:
        employee_id_str = request.employee_id
        
        if not employee_id_str:
            return JsonResponse({'is_clocked_in': False, 'last_check_in': None})
        
        # Check if employee exists in database first
        employee_id = employee_id_str
        
        # Get current date and time
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        today = now.date().isoformat()
        
        # Check for today's record
        today_record = attendance.find_one({
            'employee_id': employee_id, # Use string ID directly
            'date': today
        })
        
        is_clocked_in = False
        last_check_in = None
        
        if today_record:
            # Look at the latest segment in 'logs' if it exists
            logs = today_record.get('logs', [])
            if logs:
                latest_log = logs[-1]
                if latest_log.get('clock_in') and not latest_log.get('clock_out'):
                    is_clocked_in = True
                    last_check_in = latest_log.get('clock_in')
            elif today_record.get('clock_in') and not today_record.get('clock_out'):
                # Fallback for old record format
                is_clocked_in = True
                last_check_in = today_record.get('clock_in')
            
        return JsonResponse({
            'is_clocked_in': is_clocked_in,
            'last_check_in': last_check_in,
            'current_server_time': now.isoformat()
        })
            
    except Exception as e:
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@require_user_id
def clock_in(request):
    """
    Clock in the authenticated employee.
    Endpoint: POST /api/attendance/clock-in/
    """
    try:
        employee_id_str = request.employee_id
        if not employee_id_str:
            return JsonResponse({'error': 'Not linked', 'message': 'User is not linked to an employee profile'}, status=400)
        
        employee_id = employee_id_str
            
        # Get current date and time
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        today = now.date().isoformat()
        
        # Check for today's record
        existing_record = attendance.find_one({
            'employee_id': employee_id, # Use string ID directly
            'date': today
        })
        
        # Check if currently clocked in
        currently_in = False
        if existing_record:
            logs = existing_record.get('logs', [])
            if logs:
                if logs[-1].get('clock_in') and not logs[-1].get('clock_out'):
                    currently_in = True
            elif existing_record.get('clock_in') and not existing_record.get('clock_out'):
                currently_in = True
        
        if currently_in:
            return JsonResponse({
                'error': 'Already clocked in',
                'message': 'You have already clocked in and not yet clocked out.'
            }, status=400)
        
        # New log entry
        new_segment = {
            'clock_in': now.isoformat(),
            'clock_out': None
        }

        # Create or update attendance record
        if existing_record:
            # Add new segment to logs
            attendance.update_one(
                {'_id': existing_record['_id']},
                {
                    '$push': {'logs': new_segment},
                    '$set': {
                        'clock_out': None, # Ensure top-level is 'in'
                        'updated_at': now.isoformat()
                    }
                }
            )
            record_id = str(existing_record['_id'])
        else:
            new_record = {
                'employee_id': employee_id, # Use string ID directly
                'date': today,
                'clock_in': now.isoformat(), # First clock-in of the day
                'clock_out': None,
                'status': 'present',
                'total_hours': 0.0,
                'logs': [new_segment],
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
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["POST"])
@require_user_id
def clock_out(request):
    """
    Clock out the authenticated employee.
    Endpoint: POST /api/attendance/clock-out/
    """
    try:
        employee_id_str = request.employee_id
        if not employee_id_str:
            return JsonResponse({'error': 'Not linked', 'message': 'User is not linked to an employee profile'}, status=400)
            
        employee_id = employee_id_str
        
        now = datetime.datetime.now(tz=datetime.timezone.utc)
        today = now.date().isoformat()
        
        # Find today's record
        existing_record = attendance.find_one({
            'employee_id': employee_id, # Use string ID directly
            'date': today
        })

        if not existing_record:
            return JsonResponse({'error': 'Not clocked in', 'message': 'No attendance record found for today.'}, status=400)

        logs = existing_record.get('logs', [])
        
        # Find the segment to close
        segment_index = -1
        if logs:
            # Check the last segment
            if logs[-1].get('clock_in') and not logs[-1].get('clock_out'):
                segment_index = len(logs) - 1
        elif existing_record.get('clock_in') and not existing_record.get('clock_out'):
            # Legacy format - migrate to logs and close
            logs = [{'clock_in': existing_record['clock_in'], 'clock_out': None}]
            segment_index = 0

        if segment_index == -1:
            return JsonResponse({
                'error': 'Not clocked in',
                'message': 'You are not currently clocked in or already clocked out.'
            }, status=400)
            
        # Update logs segment
        logs[segment_index]['clock_out'] = now.isoformat()
        
        # Recalculate total hours based on all segments
        total_seconds = 0
        for log in logs:
            if log.get('clock_in') and log.get('clock_out'):
                c_in = datetime.datetime.fromisoformat(log['clock_in'])
                c_out = datetime.datetime.fromisoformat(log['clock_out'])
                total_seconds += (c_out - c_in).total_seconds()
        
        current_total_hours = total_seconds / 3600

        # Update attendance record
        attendance.update_one(
            {'_id': existing_record['_id']},
            {'$set': {
                'logs': logs,
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
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
@require_user_id
def get_my_attendance(request):
    """
    Get attendance records for the authenticated user.
    Endpoint: GET /api/attendance/me/
    """
    try:
        employee_id_str = request.employee_id
        if not employee_id_str:
            return JsonResponse({'results': [], 'count': 0})

        employee_id = employee_id_str

        # Parse query parameters (handle both camelCase from frontend and snake_case)
        start_date = request.GET.get('start_date') or request.GET.get('startDate')
        end_date = request.GET.get('end_date') or request.GET.get('endDate')
        status = request.GET.get('status')

        results = _merge_attendance_with_leaves(employee_id, start_date, end_date, status)
        
        return JsonResponse({
            'results': results,
            'count': len(results)
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
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
        # Supports lookup by either internal _id (if provided) or business employee_id
        employee = None
        if len(employee_id) == 24: # Potential ObjectId hex string
            try:
                employee = employees.find_one({'_id': ObjectId(employee_id)})
            except:
                pass
        
        if not employee:
            employee = employees.find_one({'employee_id': employee_id})
            
        if not employee:
            return JsonResponse({'error': 'Not found', 'message': f'Employee with ID {employee_id} not found'}, status=404)

        # Parse query parameters
        start_date = request.GET.get('start_date') or request.GET.get('startDate')
        end_date = request.GET.get('end_date') or request.GET.get('endDate')
        status = request.GET.get('status')
        
        results = _merge_attendance_with_leaves(employee_id, start_date, end_date, status)

        return JsonResponse({
            'results': results,
            'count': len(results)
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
        # Supports lookup by either internal _id (if provided) or business employee_id
        employee = None
        if len(employee_id) == 24: # Potential ObjectId hex string
            try:
                employee = employees.find_one({'_id': ObjectId(employee_id)})
            except:
                pass
        
        if not employee:
            employee = employees.find_one({'employee_id': employee_id})
            
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
        # Use simple string identifier as stored in the collection
        monthly_records = list(attendance.find({
            'employee_id': employee_id,
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
            'employee_id': employee_id,
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
        # Supports lookup by either internal _id (if provided) or business employee_id
        employee = None
        if len(employee_id) == 24: # Potential ObjectId hex string
            try:
                employee = employees.find_one({'_id': ObjectId(employee_id)})
            except:
                pass
        
        if not employee:
            employee = employees.find_one({'employee_id': employee_id})

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
        
        results = _merge_attendance_with_leaves(employee_id, month_start, month_end)
        
        # Calculate total hours
        total_hours = sum(record.get('total_hours', 0) for record in results 
                        if record.get('total_hours') is not None)
        
        return JsonResponse({
            'employee_id': employee_id,
            'employee_name': f"{employee.get('first_name', '')} {employee.get('last_name', '')}",
            'year': year,
            'month': month,
            'records': results,
            'total_days': len(results),
            'total_hours': round(total_hours, 2)
        })
        
    except Exception as e:
        return JsonResponse({
            'error': 'Server error',
            'message': str(e)
        }, status=500)
