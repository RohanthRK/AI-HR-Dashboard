"""
Utilities for AI-powered features, including resume screening.
"""

import requests
import io
import docx
from PyPDF2 import PdfReader
import google.generativeai as genai
import os
from dotenv import load_dotenv
import logging
import json

# Load environment variables
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        logger.info("Gemini API configured successfully.")
    except Exception as e:
        logger.error(f"Error configuring Gemini API: {e}")
else:
    logger.warning("GEMINI_API_KEY not found in environment variables.")

# --- Resume Parsing --- 

def parse_pdf(file_path):
    """Parses text content from a PDF file."""
    try:
        reader = PdfReader(file_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        logger.info(f"Successfully parsed PDF: {file_path}")
        return text
    except Exception as e:
        logger.error(f"Error parsing PDF {file_path}: {e}")
        raise

def parse_docx(file_path):
    """Parses text content from a DOCX file."""
    try:
        doc = Document(file_path)
        text = "\n".join([para.text for para in doc.paragraphs])
        logger.info(f"Successfully parsed DOCX: {file_path}")
        return text
    except Exception as e:
        logger.error(f"Error parsing DOCX {file_path}: {e}")
        raise

def download_and_parse_resume(resume_url):
    """Downloads a resume file and parses its text content."""
    try:
        logger.info(f"Attempting to download resume from: {resume_url}")
        response = requests.get(resume_url, stream=True, timeout=30) # Added timeout
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)

        # Determine file type from URL or Content-Type header
        content_type = response.headers.get('content-type', '').lower()
        file_extension = os.path.splitext(resume_url)[1].lower()
        
        # Define a temporary file path
        # Using MEDIA_ROOT as a base, consider a dedicated temp dir
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_resumes')
        os.makedirs(temp_dir, exist_ok=True)
        temp_file_path = os.path.join(temp_dir, os.path.basename(resume_url) or "temp_resume")

        # Ensure the temp file has the correct extension if possible
        if not os.path.splitext(temp_file_path)[1]:
            if '.pdf' in file_extension or 'application/pdf' in content_type:
                 temp_file_path += '.pdf'
            elif '.docx' in file_extension or 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' in content_type:
                 temp_file_path += '.docx'
            # Add more types if needed (e.g., .doc, .txt)
            else:
                logger.warning(f"Unknown resume file type for {resume_url}. Skipping parsing.")
                return None # Cannot determine file type reliably

        logger.info(f"Downloading resume to temporary file: {temp_file_path}")
        with open(temp_file_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        logger.info(f"Successfully downloaded resume: {temp_file_path}")

        # Parse based on determined extension
        file_ext_final = os.path.splitext(temp_file_path)[1].lower()
        text = None
        if file_ext_final == '.pdf':
            text = parse_pdf(temp_file_path)
        elif file_ext_final == '.docx':
            text = parse_docx(temp_file_path)
        else:
            logger.warning(f"Unsupported resume file type: {file_ext_final}")

        # Clean up the temporary file
        try:
            os.remove(temp_file_path)
            logger.info(f"Removed temporary file: {temp_file_path}")
        except OSError as e:
            logger.error(f"Error removing temporary file {temp_file_path}: {e}")
            
        return text

    except requests.exceptions.RequestException as e:
        logger.error(f"Error downloading resume from {resume_url}: {e}")
        return None # Return None if download fails
    except Exception as e:
        logger.error(f"Error processing resume {resume_url}: {e}")
        # Clean up temp file even if parsing fails
        if 'temp_file_path' in locals() and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
                logger.info(f"Removed temporary file after error: {temp_file_path}")
            except OSError as rm_e:
                logger.error(f"Error removing temporary file {temp_file_path} after error: {rm_e}")
        return None # Return None on parsing errors

# --- Gemini AI Interaction --- 

def screen_resume_with_ai(resume_text, job_requirements):
    """Uses Gemini to screen resume text against job requirements."""
    if not resume_text or not job_requirements:
        logger.warning("Resume text or job requirements missing for AI screening.")
        return None

    try:
        model = genai.GenerativeModel('gemini-1.5-flash') # Or another suitable model
        
        prompt = f"""
        Analyze the following resume text based on the job requirements provided. 
        Provide a suitability score from 1 (not suitable) to 10 (highly suitable) and a brief justification (2-3 sentences). 
        Focus only on the match between the resume and the requirements.

        Job Requirements:
        --- Start Requirements ---
        {job_requirements}
        --- End Requirements ---

        Resume Text:
        --- Start Resume ---
        {resume_text}
        --- End Resume ---

        Output Format (JSON):
        {{
          "score": <integer_score_1_to_10>,
          "summary": "<brief_justification_string>"
        }}
        """

        logger.info("Sending request to Gemini API for resume screening...")
        response = model.generate_content(prompt)
        
        # Attempt to parse the JSON response from Gemini
        try:
            # Clean potential markdown/formatting artifacts
            cleaned_response = response.text.strip().replace('```json\n', '').replace('\n```', '').strip()
            result = json.loads(cleaned_response)
            logger.info(f"Successfully received and parsed AI screening result: {result}")
            # Basic validation
            if isinstance(result.get('score'), int) and isinstance(result.get('summary'), str):
                 return result
            else:
                 logger.error(f"AI response format incorrect: {result}")
                 return None
        except json.JSONDecodeError as json_e:
             logger.error(f"Failed to decode JSON response from AI: {json_e}. Response text: {response.text}")
             return None
        except Exception as parse_e:
             logger.error(f"Error parsing AI response: {parse_e}. Response text: {response.text}")
             return None

    except Exception as e:
        logger.error(f"Error during Gemini API call for resume screening: {e}")
        return None 