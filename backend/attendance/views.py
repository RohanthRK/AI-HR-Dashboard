"""
Views for attendance management
"""
import datetime
import json
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from functools import wraps # Import wraps for decorator

from hr_backend.db import attendance, employees, leaves
from utils.auth_utils import is_privileged, is_admin, owns_employee, forbidden, visible_refs, can_see_employee
from utils.api_utils import (
    serialize_document, 
    create_crud_endpoints
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
    if not is_admin(request):
        return forbidden()
    return attendance_crud['list_items'](request)

@csrf_exempt
@require_http_methods(["GET"])
def daily_attendance(request):
    """
    Attendance records for one day (?date=YYYY-MM-DD, default today).
    Admin/Manager/HR get everyone's records; other users only their own.
    Endpoint: GET /api/attendance/daily/
    """
    date_str = request.GET.get('date') or datetime.datetime.now(tz=datetime.timezone.utc).strftime('%Y-%m-%d')
    try:
        datetime.date.fromisoformat(date_str)
    except ValueError:
        return JsonResponse({'error': 'Invalid date', 'message': 'date must be YYYY-MM-DD'}, status=400)
    query = {'date': date_str}
    if is_privileged(request) and not is_admin(request):
        query = {'date': date_str, 'employee_id': {'$in': sorted(visible_refs(request) or [])}}
    if not is_privileged(request):
        mine = [str(getattr(request, 'employee_id', '') or '')]
        emp = employees.find_one({'employee_id': mine[0]}) or (
            employees.find_one({'_id': ObjectId(mine[0])}) if len(mine[0]) == 24 else None)
        if emp:
            mine += [str(emp['_id']), emp.get('employee_id', '')]
        query['employee_id'] = {'$in': [m for m in mine if m]}
    records = [serialize_document(r) for r in attendance.find(query)]
    return JsonResponse({'date': date_str, 'count': len(records), 'records': records})

@csrf_exempt
@require_http_methods(["GET"])
def get_attendance(request, attendance_id):
    """
    Get a single attendance record by ID
    Endpoint: GET /api/attendance/{attendance_id}
    """
    rec = attendance.find_one({'_id': ObjectId(attendance_id)}) if len(attendance_id) == 24 else None
    if not is_admin(request):
        if not rec or not (owns_employee(request, rec.get('employee_id'))
                           or (is_privileged(request) and can_see_employee(request, rec.get('employee_id')))):
            return forbidden()
    return attendance_crud['get_item'](request, attendance_id)

@csrf_exempt
@require_http_methods(["POST"])
def create_attendance(request):
    """
    Create a new attendance record (Manual entry by Admin/HR)
    Endpoint: POST /api/attendance/new/
    """
    if not is_admin(request):
        return forbidden()
    return attendance_crud['create_item'](request)

@csrf_exempt
@require_http_methods(["PUT"])
def update_attendance(request, attendance_id):
    """
    Update an attendance record (full update)
    Endpoint: PUT /api/attendance/{attendance_id}/update/
    """
    if not is_admin(request):
        return forbidden()
    return attendance_crud['update_item'](request, attendance_id)

@csrf_exempt
@require_http_methods(["PATCH"])
def partial_update_attendance(request, attendance_id):
    """
    Update an attendance record (partial update)
    Endpoint: PATCH /api/attendance/{attendance_id}/partial/
    """
    if not is_admin(request):
        return forbidden()
    return attendance_crud['partial_update_item'](request, attendance_id)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_attendance(request, attendance_id):
    """
    Delete an attendance record
    Endpoint: DELETE /api/attendance/{attendance_id}/delete/
    """
    if not is_admin(request):
        return forbidden()
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
    if not (owns_employee(request, employee_id) or (is_privileged(request) and can_see_employee(request, employee_id))):
        return forbidden()
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
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)

@csrf_exempt
@require_http_methods(["GET"])
def attendance_summary(request):
    """
    Get overall attendance summary (e.g., for dashboard)
    Endpoint: GET /api/attendance/summary/
    Requires Auth: Yes (Admin/HR role)
    """
    if not is_admin(request):
        return forbidden()
    today = datetime.datetime.now(tz=datetime.timezone.utc).strftime('%Y-%m-%d')
    active = employees.count_documents({'employment_status': {'$in': ['Active', None]}})
    present = len(attendance.distinct('employee_id', {'date': today}))
    on_leave = len(leaves.distinct('employee_id', {
        'status': 'Approved', 'start_date': {'$lte': today}, 'end_date': {'$gte': today}}))
    return JsonResponse({
        'date': today, 'active_employees': active, 'present': present, 'on_leave': on_leave,
        'absent': max(active - present - on_leave, 0),
    })


@csrf_exempt
@require_http_methods(["GET"])
def team_attendance(request):
    """
    Who is in, away or missing on one day (?date=YYYY-MM-DD, default today). Admin / Manager / HR only.
    Endpoint: GET /api/attendance/team/
    """
    if not is_privileged(request):
        return forbidden()
    today = datetime.datetime.now(tz=datetime.timezone.utc).date()
    try:
        day = datetime.date.fromisoformat(request.GET.get('date') or today.isoformat())
    except ValueError:
        return JsonResponse({'error': 'Invalid date', 'message': 'date must be YYYY-MM-DD'}, status=400)
    iso = day.isoformat()
    if day.weekday() >= 5:
        return JsonResponse({'date': iso, 'non_working_day': True, 'summary': {'total': 0, 'present': 0, 'working': 0, 'on_leave': 0, 'absent': 0}, 'rows': []})

    staff = [e for e in employees.find({'employment_status': {'$ne': 'Terminated'}}) if e.get('active', True) is not False]
    scope = visible_refs(request)
    if scope is not None:                                   # managers see themselves and their reports
        staff = [e for e in staff if {str(e['_id']), e.get('employee_id', '')} & scope]
    records = {}
    for r in attendance.find({'date': iso}):
        records[str(r.get('employee_id'))] = r
    leave_by_code = {}
    for l in leaves.find({'status': 'Approved', 'start_date': {'$lte': iso}, 'end_date': {'$gte': iso}}):
        leave_by_code[str(l.get('employee_id'))] = l

    import zoneinfo
    from utils.app_settings import get_settings
    try:
        office = zoneinfo.ZoneInfo(get_settings()['general'].get('timezone') or 'UTC')
    except Exception:
        office = zoneinfo.ZoneInfo('UTC')
    rows, summary = [], {'present': 0, 'working': 0, 'on_leave': 0, 'absent': 0, 'late': 0}
    for e in staff:
        hired = str(e.get('hire_date') or '')[:10]
        if hired and hired > iso:
            continue
        rec = records.get(str(e['_id'])) or records.get(e.get('employee_id', ''))
        leave = leave_by_code.get(e.get('employee_id', ''))
        row = {'employee_id': str(e['_id']), 'employee_code': e.get('employee_id', ''),
               'name': f"{e.get('first_name', '')} {e.get('last_name', '')}".strip(), 'team': e.get('team', ''),
               'department': e.get('department', ''), 'position': e.get('position', ''),
               'clock_in': None, 'clock_out': None, 'hours': None, 'work_mode': '', 'leave_type': ''}
        if rec and rec.get('clock_in'):
            row.update({'clock_in': rec.get('clock_in'), 'clock_out': rec.get('clock_out'),
                        'hours': rec.get('total_hours'), 'work_mode': rec.get('work_mode', '')})
            try:       # late = first clock-in after 09:30 office time
                arrived = datetime.datetime.fromisoformat(str(rec['clock_in'])).astimezone(office)
                from attendance.worktime import company_rules
                row['late'] = (arrived.hour, arrived.minute) > company_rules()['late_after']
            except ValueError:
                row['late'] = False
            summary['late'] += 1 if row['late'] else 0
            if rec.get('clock_out'):
                row['status'] = 'Present'
                summary['present'] += 1
            elif day == today:
                row['status'] = 'Working'
                summary['working'] += 1
            else:
                row['status'] = 'Missing clock-out'
                summary['present'] += 1
        elif leave:
            row.update({'status': 'On leave', 'leave_type': leave.get('leave_type', 'Leave')})
            summary['on_leave'] += 1
        elif day > today:
            row['status'] = 'Upcoming'
        elif day == today:
            row['status'] = 'Not clocked in yet'
            summary['absent'] += 1
        else:
            row['status'] = 'Absent'
            summary['absent'] += 1
        rows.append(row)
    rows.sort(key=lambda r: (r['team'], r['name']))
    summary['total'] = len(rows)
    return JsonResponse({'date': iso, 'non_working_day': False, 'summary': summary, 'rows': rows})


# ------------------------------------------------------------------------------------------------ working time

def _employee_ref(ref):
    ref = str(ref or '')
    emp = employees.find_one({'employee_id': ref})
    if not emp and ObjectId.is_valid(ref):
        emp = employees.find_one({'_id': ObjectId(ref)})
    return emp


def _best_per_day(records):
    """{iso date: record}; if a person somehow has two records for a day the longer one wins."""
    out = {}
    for rec in records:
        if rec['date'] not in out or float(rec.get('total_hours') or 0) > float(out[rec['date']].get('total_hours') or 0):
            out[rec['date']] = rec
    return out


@csrf_exempt
@require_http_methods(["GET"])
def month_view(request):
    """
    GET /api/attendance/month/?month=2026-10[&employee_id=<id or code>]
    One employee's month, day by day (working day, holiday, leave, present, absent, hours against what is expected) plus totals.
    Your own by default; HR can open anyone's, managers their reports'.
    """
    from attendance import worktime
    today = datetime.datetime.now(tz=datetime.timezone.utc).date()
    try:
        first = datetime.datetime.strptime(request.GET.get('month') or today.strftime('%Y-%m'), '%Y-%m').date()
    except ValueError:
        return JsonResponse({'error': 'Invalid month', 'message': 'month must look like 2026-10'}, status=400)
    last = (first.replace(day=28) + datetime.timedelta(days=4)).replace(day=1) - datetime.timedelta(days=1)
    emp = _employee_ref(request.GET.get('employee_id') or getattr(request, 'employee_id', ''))
    if not emp:
        return JsonResponse({'error': 'Not found', 'message': 'Employee not found'}, status=404)
    if not (owns_employee(request, str(emp['_id'])) or can_see_employee(request, str(emp['_id']))):
        return forbidden()
    keys = [str(emp['_id']), emp.get('employee_id', '')]
    rules = worktime.company_rules()
    approved = list(leaves.find({'employee_id': {'$in': keys}, 'status': 'Approved', 'start_date': {'$lte': last.isoformat()}, 'end_date': {'$gte': first.isoformat()}}))
    records = _best_per_day(attendance.find({'employee_id': {'$in': keys}, 'date': {'$gte': first.isoformat(), '$lte': last.isoformat()}}))
    days = worktime.build_days(emp, first, last, records, approved, rules, today)
    return JsonResponse({
        'month': first.strftime('%Y-%m'), 'label': first.strftime('%B %Y'),
        'employee': {'id': str(emp['_id']), 'code': emp.get('employee_id', ''), 'name': f"{emp.get('first_name', '')} {emp.get('last_name', '')}".strip(),
                     'position': emp.get('position', ''), 'department': emp.get('department', '')},
        'expected_hours': worktime.expected_hours(emp, rules), 'own_expected_hours': emp.get('expected_hours'), 'default_hours': rules['default_hours'],
        'late_after': '%02d:%02d' % rules['late_after'], 'days': days, 'summary': worktime.summarize(days),
    })


@csrf_exempt
@require_http_methods(["GET"])
def overview(request):
    """
    GET /api/attendance/overview/?from=2026-10-01&to=2026-10-27 (default: this month so far; at most 93 days)
    Everyone's attendance for a period: hours worked against hours expected, absent / short / late days and plain-language flags.
    HR sees the whole company, managers their team.
    """
    if not is_privileged(request):
        return forbidden()
    from attendance import worktime
    today = datetime.datetime.now(tz=datetime.timezone.utc).date()
    try:
        first = datetime.date.fromisoformat(request.GET.get('from') or today.replace(day=1).isoformat())
        last = datetime.date.fromisoformat(request.GET.get('to') or today.isoformat())
    except ValueError:
        return JsonResponse({'error': 'Invalid date', 'message': 'from and to must be YYYY-MM-DD'}, status=400)
    if last < first or (last - first).days > 92:
        return JsonResponse({'error': 'Invalid range', 'message': 'Choose a period of at most 93 days, ending after it starts.'}, status=400)
    rules = worktime.company_rules()
    scope = visible_refs(request)
    staff = [e for e in employees.find({'employment_status': {'$ne': 'Terminated'}}) if e.get('active', True) is not False]
    if scope is not None:
        staff = [e for e in staff if {str(e['_id']), e.get('employee_id', '')} & scope]
    by_emp = {}
    for rec in attendance.find({'date': {'$gte': first.isoformat(), '$lte': last.isoformat()}}):
        by_emp.setdefault(str(rec.get('employee_id')), []).append(rec)
    leave_by_emp = {}
    for l in leaves.find({'status': 'Approved', 'start_date': {'$lte': last.isoformat()}, 'end_date': {'$gte': first.isoformat()}}):
        leave_by_emp.setdefault(str(l.get('employee_id')), []).append(l)

    single = first == last
    day_status = {'present': 'Present', 'absent': 'Absent', 'leave': 'On leave', 'pending': 'Not in yet', 'holiday': 'Holiday', 'weekend': 'Weekend', 'upcoming': 'Upcoming', 'outside': '-'}
    rows = []
    for e in staff:
        keys = [str(e['_id']), e.get('employee_id', '')]
        records = _best_per_day([r for k in keys for r in by_emp.get(k, [])])
        mine = [l for k in keys for l in leave_by_emp.get(k, [])]
        days = worktime.build_days(e, first, last, records, mine, rules, today)
        s = worktime.summarize(days)
        row = {'employee_id': str(e['_id']), 'employee_code': e.get('employee_id', ''), 'name': f"{e.get('first_name', '')} {e.get('last_name', '')}".strip(),
               'position': e.get('position', ''), 'department': e.get('department', ''), 'team': e.get('team', ''),
               'expected_per_day': worktime.expected_hours(e, rules), 'custom_hours': bool(e.get('expected_hours')), **s, 'flags': worktime.flags(s)}
        if single:
            d = days[0]
            row['day'] = d
            if d['kind'] == 'present':
                row['status'] = 'Working now' if d['open'] else ('No clock-out' if d['missing_clock_out'] else ('Short on hours' if d['target_met'] is False else 'Present'))
            else:
                row['status'] = day_status[d['kind']]
        else:
            row['status'] = 'No working days' if not s['working_days'] else ('Needs attention' if row['flags'] else 'On track')
        rows.append(row)
    expected = sum(r['expected_hours'] for r in rows)
    worked = sum(r['hours'] for r in rows)
    totals = {'employees': len(rows), 'hours': round(worked, 1), 'expected_hours': round(expected, 1), 'hours_pct': round(worked / expected * 100) if expected else None,
              'absent_days': sum(r['absent_days'] for r in rows), 'short_days': sum(r['short_days'] for r in rows), 'late_days': sum(r['late_days'] for r in rows),
              'missing_clock_out_days': sum(r['missing_clock_out_days'] for r in rows), 'leave_days': round(sum(r['leave_days'] for r in rows), 1),
              'need_attention': sum(1 for r in rows if r['status'] in ('Needs attention', 'Absent', 'Short on hours', 'No clock-out'))}
    return JsonResponse({'from': first.isoformat(), 'to': last.isoformat(), 'default_hours': rules['default_hours'], 'late_after': '%02d:%02d' % rules['late_after'],
                         'single_day': single, 'totals': totals, 'rows': rows})


@csrf_exempt
@require_http_methods(["PUT"])
def set_expected_hours(request, employee_id):
    """PUT /api/attendance/expected-hours/<employee>/ {hours: 6 | null} (HR). null goes back to the company default."""
    if not is_admin(request):
        return forbidden()
    emp = _employee_ref(employee_id)
    if not emp:
        return JsonResponse({'error': 'Not found', 'message': 'Employee not found'}, status=404)
    try:
        data = json.loads(request.body or '{}')
    except ValueError:
        data = {}
    hours = data.get('hours') if isinstance(data, dict) else None
    if hours in (None, ''):
        employees.update_one({'_id': emp['_id']}, {'$unset': {'expected_hours': ''}})
        return JsonResponse({'success': True, 'expected_hours': None})
    try:
        hours = round(float(hours), 2)
    except (TypeError, ValueError):
        return JsonResponse({'error': 'Invalid hours', 'message': 'Hours must be a number'}, status=400)
    if not 1 <= hours <= 16:
        return JsonResponse({'error': 'Invalid hours', 'message': 'Expected hours must be between 1 and 16 a day'}, status=400)
    employees.update_one({'_id': emp['_id']}, {'$set': {'expected_hours': hours}})
    return JsonResponse({'success': True, 'expected_hours': hours})
