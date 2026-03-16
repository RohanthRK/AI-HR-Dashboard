import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from bson import ObjectId
import logging

from hr_backend.db import recruitment, db
from .tasks import screen_candidate_resume

logger = logging.getLogger(__name__)

# Keka Parity ATS collections
jobs_collection = db["jobs"]
candidates_collection = db["candidates"]

@csrf_exempt
def handle_kanban_jobs(request):
    """
    GET: List all tracked ATS jobs
    POST: Create a new job requisition
    """
    if request.method == 'GET':
        jobs = list(jobs_collection.find({}))
        for job in jobs:
            job['_id'] = str(job['_id'])
        return JsonResponse({'success': True, 'jobs': jobs})
        
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            data['status'] = data.get('status', 'Open')
            data['createdAt'] = datetime.utcnow().isoformat()
            
            result = jobs_collection.insert_one(data)
            data['_id'] = str(result.inserted_id)
            
            return JsonResponse({'success': True, 'job': data}, status=201)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
            
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)


@csrf_exempt
def handle_kanban_candidates(request, job_id=None):
    """
    GET: List all candidates for a specific job pipeline
    POST: Add a new candidate (drag & drop entry)
    """
    if request.method == 'GET':
        query = {}
        if job_id:
            query['job_id'] = job_id
            
        candidates = list(candidates_collection.find(query))
        for cand in candidates:
            cand['_id'] = str(cand['_id'])
        return JsonResponse({'success': True, 'candidates': candidates})
        
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            data['job_id'] = job_id or data.get('job_id')
            # Keka default stages: Sourced, Applied, Interview, Offered, Hired, Rejected
            data['stage'] = data.get('stage', 'Applied')
            data['appliedAt'] = datetime.utcnow().isoformat()
            
            result = candidates_collection.insert_one(data)
            data['_id'] = str(result.inserted_id)
            
            return JsonResponse({'success': True, 'candidate': data}, status=201)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
            
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)


@csrf_exempt
def update_candidate_stage(request, candidate_id):
    """
    PUT/PATCH: Move candidate across Kanban stages
    """
    if request.method in ['PUT', 'PATCH']:
        try:
            obj_id = ObjectId(candidate_id)
            data = json.loads(request.body)
            new_stage = data.get('stage')
            
            if not new_stage:
                return JsonResponse({'success': False, 'error': 'Stage is required'}, status=400)
                
            result = candidates_collection.update_one(
                {'_id': obj_id},
                {'$set': {
                    'stage': new_stage,
                    'updatedAt': datetime.utcnow().isoformat()
                }}
            )
            
            if result.modified_count:
                updated_cand = candidates_collection.find_one({'_id': obj_id})
                updated_cand['_id'] = str(updated_cand['_id'])
                return JsonResponse({'success': True, 'candidate': updated_cand})
                
            return JsonResponse({'success': False, 'error': 'Candidate not found or no changes made'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
            
    return JsonResponse({'success': False, 'error': 'Method not allowed'}, status=405)

# --- Legacy AI Resume Screening Endpoints (Preserved) ---

@csrf_exempt
@require_http_methods(["GET"])
def list_jobs(request):
    logger.info("Request received for listing jobs (placeholder).")
    return JsonResponse({"message": "Job list placeholder"})

@csrf_exempt
@require_http_methods(["GET"])
def list_candidates_for_job(request, job_id):
    logger.info(f"Request received for listing candidates for job {job_id} (placeholder).")
    return JsonResponse({"message": f"Candidate list for job {job_id} placeholder"})

@csrf_exempt
@require_http_methods(["POST"])
def trigger_resume_screening(request, job_id_str, candidate_id_str):
    logger.info(f"Received request to screen resume for job {job_id_str}, candidate {candidate_id_str}")
    try:
        job_oid = ObjectId(job_id_str)
        candidate_oid = ObjectId(candidate_id_str)

        job = recruitment.find_one({ "_id": job_oid, "candidates.candidate_id": candidate_oid })
        if not job:
             return JsonResponse({'error': 'Not Found', 'message': 'Job or Candidate within Job not found.'}, status=404)

        recruitment.update_one(
            { "_id": job_oid, "candidates.candidate_id": candidate_oid },
            { "$set": { "candidates.$.ai_screening_status": "queued" } }
        )
        
        screen_candidate_resume.delay(job_id_str, candidate_id_str)
        return JsonResponse({
            'message': 'Resume screening task queued successfully.',
            'job_id': job_id_str,
            'candidate_id': candidate_id_str
        }, status=202)
    except ValueError:
        return JsonResponse({'error': 'Invalid ID format'}, status=400)
    except Exception as e:
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)
