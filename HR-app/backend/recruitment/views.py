from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from bson import ObjectId
import logging

from hr_backend.db import recruitment
# Import the Celery task
from .tasks import screen_candidate_resume
# Import authentication utilities if needed (assuming development mode for now)
# from utils.auth_utils import jwt_required, get_user_id

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["GET"])
def list_jobs(request):
    # TODO: Implement actual listing of jobs
    logger.info("Request received for listing jobs (placeholder).")
    return JsonResponse({"message": "Job list placeholder"})

@csrf_exempt
@require_http_methods(["GET"])
def list_candidates_for_job(request, job_id):
    # TODO: Implement actual listing of candidates for a specific job
    logger.info(f"Request received for listing candidates for job {job_id} (placeholder).")
    return JsonResponse({"message": f"Candidate list for job {job_id} placeholder"})

@csrf_exempt
@require_http_methods(["POST"])
def trigger_resume_screening(request, job_id_str, candidate_id_str):
    """
    API endpoint to trigger the AI resume screening task for a specific candidate.
    Endpoint: POST /api/recruitment/jobs/{job_id}/candidates/{candidate_id}/screen/
    Requires Auth: Yes (e.g., Admin/HR role)
    """
    # TODO: Add permission check (Admin/HR role)
    logger.info(f"Received request to screen resume for job {job_id_str}, candidate {candidate_id_str}")
    
    try:
        # Validate ObjectIds
        job_oid = ObjectId(job_id_str)
        candidate_oid = ObjectId(candidate_id_str)

        # Check if candidate exists within the job
        job = recruitment.find_one(
            { "_id": job_oid, "candidates.candidate_id": candidate_oid }
        )
        
        if not job:
             logger.warning(f"Candidate {candidate_id_str} not found in job {job_id_str} for screening trigger.")
             return JsonResponse({'error': 'Not Found', 'message': 'Job or Candidate within Job not found.'}, status=404)

        # Optional: Check current screening status to prevent re-queuing?
        # candidate_data = next((c for c in job['candidates'] if c['candidate_id'] == candidate_oid), None)
        # current_status = candidate_data.get('ai_screening_status')
        # if current_status in ['queued', 'screening']:
        #     return JsonResponse({'message': 'Screening already in progress or queued.'}, status=202)

        # Update status to "queued"
        recruitment.update_one(
            { "_id": job_oid, "candidates.candidate_id": candidate_oid },
            { "$set": { "candidates.$.ai_screening_status": "queued" } }
        )
        
        # Trigger the Celery task
        logger.info(f"Triggering Celery task screen_candidate_resume for job {job_id_str}, candidate {candidate_id_str}")
        screen_candidate_resume.delay(job_id_str, candidate_id_str)
        
        return JsonResponse({
            'message': 'Resume screening task queued successfully.',
            'job_id': job_id_str,
            'candidate_id': candidate_id_str
        }, status=202) # 202 Accepted: Request accepted, processing will occur

    except ValueError:
        logger.error(f"Invalid ObjectId format provided: job={job_id_str} or candidate={candidate_id_str}")
        return JsonResponse({'error': 'Invalid ID format'}, status=400)
    except Exception as e:
        logger.exception(f"Error triggering resume screening for job {job_id_str}, candidate {candidate_id_str}: {e}")
        return JsonResponse({'error': 'Server error', 'message': str(e)}, status=500)
