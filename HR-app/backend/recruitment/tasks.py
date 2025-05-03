"""
Celery tasks for the recruitment app.
"""
import logging
from bson import ObjectId
from celery import shared_task
from hr_backend.db import recruitment # Use your actual db connection
from utils.ai_tools import download_and_parse_resume, screen_resume_with_ai

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def screen_candidate_resume(self, job_id_str, candidate_id_str):
    """Celery task to parse and screen a candidate's resume using AI."""
    logger.info(f"Starting resume screening task for job {job_id_str}, candidate {candidate_id_str}")
    
    try:
        job_oid = ObjectId(job_id_str)
        candidate_oid = ObjectId(candidate_id_str)
    except Exception as e:
        logger.error(f"Invalid ObjectId format: job={job_id_str}, candidate={candidate_id_str}. Error: {e}")
        # Cannot retry if IDs are invalid
        return f"Invalid ObjectId format"

    # Update status to "screening"
    recruitment.update_one(
        { "_id": job_oid, "candidates.candidate_id": candidate_oid },
        { "$set": { "candidates.$.ai_screening_status": "screening" } }
    )

    try:
        # Fetch job and candidate data
        job = recruitment.find_one({"_id": job_oid})
        if not job:
            logger.error(f"Job {job_id_str} not found.")
            return f"Job {job_id_str} not found."

        candidate = next((c for c in job.get('candidates', []) if c.get('candidate_id') == candidate_oid), None)
        if not candidate:
             logger.error(f"Candidate {candidate_id_str} not found in job {job_id_str}.")
             # Update status to error
             recruitment.update_one(
                { "_id": job_oid, "candidates.candidate_id": candidate_oid },
                { "$set": { "candidates.$.ai_screening_status": "error", "candidates.$.ai_screening_summary": "Candidate data not found in job." } }
             )
             return f"Candidate {candidate_id_str} not found in job {job_id_str}."

        resume_url = candidate.get('resume_url')
        job_requirements = job.get('requirements')

        if not resume_url or not job_requirements:
            logger.warning(f"Missing resume_url or job_requirements for candidate {candidate_id_str} in job {job_id_str}.")
            recruitment.update_one(
                { "_id": job_oid, "candidates.candidate_id": candidate_oid },
                { "$set": { "candidates.$.ai_screening_status": "error", "candidates.$.ai_screening_summary": "Missing resume URL or job requirements." } }
            )
            return "Missing resume URL or job requirements."

        # Download and parse resume
        logger.info(f"Parsing resume from URL: {resume_url}")
        resume_text = download_and_parse_resume(resume_url)

        if not resume_text:
            logger.error(f"Failed to parse resume for candidate {candidate_id_str} from {resume_url}.")
            recruitment.update_one(
                { "_id": job_oid, "candidates.candidate_id": candidate_oid },
                { "$set": { "candidates.$.ai_screening_status": "error", "candidates.$.ai_screening_summary": "Failed to download or parse resume." } }
            )
            return "Failed to parse resume."
        
        logger.info(f"Resume parsed successfully (length: {len(resume_text)}). Sending to AI for screening.")
        
        # Screen with AI
        ai_result = screen_resume_with_ai(resume_text, job_requirements)

        if ai_result and 'score' in ai_result and 'summary' in ai_result:
            logger.info(f"AI screening successful for candidate {candidate_id_str}. Score: {ai_result['score']}")
            # Update candidate with AI results
            recruitment.update_one(
                { "_id": job_oid, "candidates.candidate_id": candidate_oid },
                { "$set": {
                    "candidates.$.ai_screening_status": "screened",
                    "candidates.$.ai_screening_score": ai_result['score'],
                    "candidates.$.ai_screening_summary": ai_result['summary']
                  }}
            )
            return f"Screening complete. Score: {ai_result['score']}"
        else:
            logger.error(f"AI screening failed or returned invalid format for candidate {candidate_id_str}.")
            recruitment.update_one(
                { "_id": job_oid, "candidates.candidate_id": candidate_oid },
                { "$set": { "candidates.$.ai_screening_status": "error", "candidates.$.ai_screening_summary": "AI screening failed or returned invalid format." } }
            )
            # Optionally retry if it was a temporary API issue
            # raise self.retry(exc=Exception("AI screening failed"))
            return "AI screening failed."

    except Exception as exc:
        logger.exception(f"Error during resume screening task for job {job_id_str}, candidate {candidate_id_str}: {exc}")
        # Update status to error
        try:
             recruitment.update_one(
                 { "_id": job_oid, "candidates.candidate_id": candidate_oid },
                 { "$set": { "candidates.$.ai_screening_status": "error", "candidates.$.ai_screening_summary": f"Task failed: {exc}" } }
             )
        except Exception as db_exc:
             logger.error(f"Failed to update candidate status to error after task failure: {db_exc}")
        
        # Retry the task based on max_retries
        raise self.retry(exc=exc) 