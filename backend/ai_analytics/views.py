import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from django.utils import timezone
from hr_backend.db import db, employees as employees_collection, departments as departments_collection, teams, chat_logs
from . import insights, assistant
from utils.app_settings import get_settings
import re
from utils.auth_utils import is_privileged, is_admin, owns_employee, can_see_employee
from bson.objectid import ObjectId
from pypdf import PdfReader
import docx
from utils.llm import generate, is_configured, status as llm_status, LLMNotConfigured, LLMError


class StaffOnlyMixin:
    """Company-wide people analytics are limited to Admin / Manager / HR."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not is_privileged(request):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Admin, Manager or HR role required.')


class AdminOnlyMixin:
    """Per-person risk, pay and attendance analysis is for HR / administrators."""

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not is_admin(request):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Administrator role required.')


class DashboardAnalyticsView(APIView):
    """Headline KPIs computed from MongoDB."""

    def get(self, request):
        try:
            return Response(insights.dashboard_stats())
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EngagementMetricsView(StaffOnlyMixin, APIView):
    """Engagement proxy computed from attendance and OKR data."""

    def get(self, request):
        try:
            return Response(insights.engagement_metrics())
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AttritionRiskView(AdminOnlyMixin, APIView):
    """Rule-based attrition risk overview."""

    def get(self, request):
        try:
            return Response(insights.attrition_overview())
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TeamInsightsView(StaffOnlyMixin, APIView):
    """Team strengths / gaps from employee skills."""

    def get(self, request):
        try:
            return Response(insights.team_insights())
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SkillsTrendsView(StaffOnlyMixin, APIView):
    """Skills trends vs. industry demand."""

    def get(self, request):
        try:
            return Response(insights.skills_trends())
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GrowthOpportunitiesView(AdminOnlyMixin, APIView):
    """High-potential employees and development plans."""

    def get(self, request):
        try:
            return Response(insights.growth_opportunities())
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class EmployeeInsightsView(APIView):
    """Individual employee insights."""

    def get(self, request, employee_id=None):
        try:
            if not (owns_employee(request, employee_id) or (is_privileged(request) and can_see_employee(request, employee_id))):
                return Response({"error": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)
            data = insights.employee_insights(employee_id)
            if data is not None and not is_privileged(request):
                data.pop('attritionRisk', None)  # employees don't see their own flight-risk score
            if data is None:
                return Response({"error": "Employee not found"}, status=status.HTTP_404_NOT_FOUND)
            return Response(data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AIEmployeesListView(AdminOnlyMixin, APIView):
    """Employees with computed performance / growth / attrition attributes."""

    def get(self, request):
        try:
            return Response(insights.employees_overview())
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResumeScreeningView(StaffOnlyMixin, APIView):
    """
    API View for AI-powered resume screening using Gemini
    """
    def post(self, request):
        try:
            # Handle standard fields
            job_title = request.data.get('jobTitle', '')
            department = request.data.get('department', '')
            experience = request.data.get('experience', '')
            skills = request.data.get('skills', '')
            education = request.data.get('education', '')
            requirements = request.data.get('jobRequirements', '')
            
            # Handle File Upload
            resume_file = request.FILES.get('resume')
            if not resume_file:
                return Response({'error': 'No resume file provided'}, status=status.HTTP_400_BAD_REQUEST)
                
            # Extract Text from File
            resume_text = ""
            filename = resume_file.name.lower()
            
            if filename.endswith('.pdf'):
                pdf_reader = PdfReader(resume_file)
                for page in pdf_reader.pages:
                    resume_text += page.extract_text() + "\n"
            elif filename.endswith('.docx'):
                doc = docx.Document(resume_file)
                for para in doc.paragraphs:
                    resume_text += para.text + "\n"
            else:
                # Fallback purely to string decoding
                resume_text = resume_file.read().decode('utf-8', errors='ignore')
                
            if not resume_text.strip():
                return Response({'error': 'Could not extract text from the resume'}, status=status.HTTP_400_BAD_REQUEST)

            # Construct Gemini Prompt
            prompt = f"""
            You are an expert technical HR Recruiter. Analyze the following resume against the job requirements and return a structured JSON response.
            
            JOB REQUIREMENTS:
            - Job Title: {job_title}
            - Department: {department}
            - Experience: {experience}
            - Education: {education}
            - Required Skills: {skills}
            - Additional Requirements: {requirements}
            
            RESUME TEXT:
            {resume_text}
            
            Analyze the resume and return ONLY a valid JSON object matching this exact schema:
            {{
                "detected_skills": ["list", "of", "all", "technical/soft", "skills", "found"],
                "score": 8, // out of 10
                "summary": "Short 1-2 sentence summary of candidate fit",
                "match_details": {{
                    "skills_match": 85, // 0-100 percentage
                    "experience_match": 90, // 0-100 percentage
                    "education_match": 100, // 0-100 percentage
                    "overall_match": 90 // 0-100 percentage
                }},
                "strengths": ["string", "string"], // 2-4 points
                "gaps": ["string"], // Any missing required skills or experience gaps
                "recommendations": "Should we interview this candidate? Why?"
            }}
            """
            
            response_text, _provider = generate(prompt, json_output=True, prefer='gemini')
            
            ai_data = assistant.parse_json(response_text)
            
            required_skills_list = [s.strip() for s in skills.split(',') if s.strip()] if isinstance(skills, str) else skills
            detected_skills = ai_data.get('detected_skills', [])
            
            matching_skills = [s for s in required_skills_list if any(d.lower() in s.lower() or s.lower() in d.lower() for d in detected_skills)]
            missing_skills = [s for s in required_skills_list if s not in matching_skills]

            result_payload = {
                "detected_skills": detected_skills,
                "matching_skills": matching_skills,
                "missing_skills": missing_skills,
                "results": {
                    "score": ai_data.get('score', 0),
                    "summary": ai_data.get('summary', ''),
                    "match_details": ai_data.get('match_details', {}),
                    "strengths": ai_data.get('strengths', []),
                    "gaps": ai_data.get('gaps', []),
                    "recommendations": ai_data.get('recommendations', '')
                }
            }
            return Response(result_payload, status=status.HTTP_200_OK)
            
        except LLMNotConfigured:
            return Response({'error': 'AI resume screening is not configured. Set GEMINI_API_KEY and/or GROQ_API_KEY on the server.'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except LLMError as e:
            return Response({'error': f'All AI providers failed or are rate limited: {e}'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class JobMatchingView(APIView):
    """
    Rank employees against a job opening from the recruitment board (`jobs` collection).
    Scoring is skill overlap between the job's required skills and each employee's skills.
    """

    def post(self, request):
        job_id = request.data.get('job_id')
        if not job_id:
            return Response({'error': 'job_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            data = insights.job_matches(job_id)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        if data and is_configured():
            try:
                job_title = (insights.db['jobs'].find_one({'_id': ObjectId(str(job_id))}) or {}).get('title', 'this role')
                notes = assistant.explain_matches(job_title, data)
                for m in data:
                    if m['employee_id'] in notes:
                        m['notes'] = notes[m['employee_id']]
                        m['notes_source'] = 'ai'
            except Exception as e:
                logging.getLogger(__name__).warning('Ignored error in %s: %s', __name__, e)
        return Response(data, status=status.HTTP_200_OK)

    def get(self, request):
        job_id = request.GET.get('job_id')
        if not job_id:
            return Response([], status=status.HTTP_200_OK)
        request.data['job_id'] = job_id
        return self.post(request)


class LLMStatusView(StaffOnlyMixin, APIView):
    """Which AI providers are configured, their models, cooldowns and last error."""

    def get(self, request):
        return Response({'providers': llm_status(), 'any_configured': is_configured()})


class JobDescriptionView(StaffOnlyMixin, APIView):
    """POST {title, department, skills, experience} -> job description text (Gemini, or a template without a key)."""

    def post(self, request):
        title = (request.data.get('title') or '').strip()
        if not title:
            return Response({'error': 'title is required'}, status=status.HTTP_400_BAD_REQUEST)
        department = (request.data.get('department') or '').strip()
        raw = request.data.get('skills') or []
        skills = [x.strip() for x in (raw.split(',') if isinstance(raw, str) else raw) if str(x).strip()]
        experience = (request.data.get('experience') or '').strip()
        if is_configured():
            try:
                prompt = (f"Write a concise, inclusive job description in markdown for the role '{title}'"
                          f"{' in the ' + department + ' department' if department else ''}. "
                          f"Required skills: {', '.join(skills) or 'not specified'}. Experience: {experience or 'not specified'}. "
                          "Sections: About the role, Responsibilities, Requirements, Nice to have. No invented benefits or salary.")
                text, provider = generate(prompt)
                return Response({'description': text, 'source': provider})
            except Exception as e:
                logging.getLogger(__name__).warning('Ignored error in %s: %s', __name__, e)
        lines = [f"## {title}" + (f" - {department}" if department else ""), "",
                 "### About the role",
                 f"We are looking for a {title} to join our{' ' + department if department else ''} team.", "",
                 "### Responsibilities",
                 "- Deliver high-quality work and collaborate closely with the team",
                 "- Take ownership of tasks from planning to delivery",
                 "- Share knowledge and contribute to continuous improvement", "",
                 "### Requirements"]
        lines += [f"- Experience with {s}" for s in skills] or ["- Relevant experience for the role"]
        if experience:
            lines.append(f"- {experience} of relevant experience")
        return Response({'description': "\n".join(lines), 'source': 'template'})


class ScreeningHistoryView(StaffOnlyMixin, APIView):
    """Saved resume-screening results. GET lists them, POST saves one, DELETE ?id= removes one."""

    FIELDS = ('candidateName', 'candidateEmail', 'jobTitle', 'department', 'score', 'detectedSkills',
              'matchingSkills', 'missingSkills', 'overallMatch')

    def get(self, request):
        rows = db['ScreeningResults'].find().sort('screeningDate', -1).limit(200)
        return Response([{**{k: r.get(k) for k in self.FIELDS}, 'id': str(r['_id']),
                          'screeningDate': r.get('screeningDate')} for r in rows])

    def post(self, request):
        data = request.data
        if not (data.get('candidateName') or '').strip():
            return Response({'error': 'candidateName is required'}, status=status.HTTP_400_BAD_REQUEST)
        doc = {k: data.get(k) for k in self.FIELDS}
        same = db['ScreeningResults'].find_one({
            'candidateName': doc['candidateName'], 'candidateEmail': doc['candidateEmail'], 'jobTitle': doc['jobTitle'],
            'department': doc['department'], 'score': doc['score']})
        if same:                      # saving the same screening twice must not create a second row
            return Response({**{k: same.get(k) for k in self.FIELDS}, 'id': str(same['_id']),
                             'screeningDate': same.get('screeningDate'), 'already_saved': True})
        doc['screeningDate'] = timezone.now().strftime('%Y-%m-%d')
        doc['saved_by'] = str(getattr(request, 'user_id', ''))
        doc['_id'] = db['ScreeningResults'].insert_one(dict(doc)).inserted_id
        doc['id'] = str(doc.pop('_id'))
        return Response(doc, status=status.HTTP_201_CREATED)

    def delete(self, request):
        try:
            result = db['ScreeningResults'].delete_one({'_id': ObjectId(request.GET.get('id', ''))})
        except Exception:
            return Response({'error': 'Invalid id'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'deleted': result.deleted_count})


class HrAnalyticsView(AdminOnlyMixin, APIView):
    """GET -> the full HR analytics report (workforce, hiring, attendance, performance, pay, engagement). HR / administrators only."""

    def get(self, request):
        from . import hr_analytics
        return Response(hr_analytics.build())


class GenerateTeamReviewView(StaffOnlyMixin, APIView):
    """POST {team_id, ratings?, notes?} -> team review grounded in the members' real data (manager input overrides)."""

    def post(self, request):
        team_id = request.data.get('team_id')
        if not team_id:
            return Response({'error': 'team_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        review = assistant.team_review(team_id, request.data.get('ratings'), request.data.get('notes'),
                                       ratings_only=bool(request.data.get('ratings_only')))
        if review is None:
            return Response({'error': 'Team not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(review)


class InsightsSummaryView(AdminOnlyMixin, APIView):
    """GET -> written briefing of the live people analytics (AI; cached for 10 minutes). ?refresh=1 forces a new one."""

    def get(self, request):
        if not is_configured():
            return Response({'error': 'No AI provider is configured (set GEMINI_API_KEY or GROQ_API_KEY).'},
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            return Response(assistant.insights_narrative(force=request.GET.get('refresh') == '1'))
        except LLMError as e:
            return Response({'error': f'AI providers unavailable: {e}'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class DevelopmentPlanView(APIView):
    """POST {employee_id} -> 90-day development plan (the employee themself or Admin/Manager/HR)."""

    def post(self, request):
        employee_id = request.data.get('employee_id')
        if not employee_id:
            return Response({'error': 'employee_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not (owns_employee(request, employee_id) or (is_privileged(request) and can_see_employee(request, employee_id))):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        plan = assistant.development_plan(employee_id)
        if plan is None:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(plan)


class GenerateReviewView(APIView):
    """Draft a performance review from the employee's real data; Gemini rewrites the summary when configured."""

    def post(self, request):
        employee_id = request.data.get('employee_id')
        if not employee_id:
            return Response({'error': 'employee_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not (owns_employee(request, employee_id) or (is_privileged(request) and can_see_employee(request, employee_id))):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        review = insights.generate_review(employee_id)
        if review is None:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)
        if is_configured():
            try:
                review = assistant.polish_review(review, insights.review_facts(employee_id))
            except Exception:
                logging.getLogger(__name__).warning('AI review polish failed; returning the data-driven draft', exc_info=True)
        return Response(review)


class HRChatbotView(APIView):
    """HR assistant: an LLM that knows the asking employee's own data and the company FAQ; rule-based when no model answers."""

    def post(self, request):
        message = (request.data.get('message') or '').strip()
        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

        employee_ref = getattr(request, 'employee_id', None)
        reply, source = None, 'fallback'
        if is_configured():
            try:
                history = request.data.get('history')
                reply, source = assistant.chat_reply(request, message, history if isinstance(history, list) else None)
            except Exception as e:
                logging.getLogger(__name__).warning('Ignored error in %s: %s', __name__, e)
        if not reply:
            leave = None
            try:
                leave = insights.leave_summary_for(employee_ref) if employee_ref else None
            except Exception:
                pass
            reply = self._fallback(message, leave)
            if reply.startswith('I can help with'):
                reply = self._faq_answer(message) or reply

        try:
            chat_logs.insert_one({
                'user_id': str(getattr(request, 'user_id', '')), 'employee_id': str(employee_ref or ''),
                'message': message, 'reply': reply, 'source': source,
                'created_at': timezone.now().isoformat(),
            })
        except Exception:
            pass
        return Response({'reply': reply, 'source': source}, status=status.HTTP_200_OK)

    @staticmethod
    def _faq_answer(message):
        words = set(re.findall(r"[a-z']{3,}", message.lower()))
        best, best_score = None, 0
        for item in get_settings()['knowledge']['faq']:
            overlap = len(words & set(re.findall(r"[a-z']{3,}", item['q'].lower())))
            if overlap > best_score:
                best, best_score = item, overlap
        return best['a'] if best and best_score >= 2 else None

    @staticmethod
    def _fallback(message, leave):
        m = message.lower()
        if 'leave' in m and any(w in m for w in ('balance', 'left', 'remaining', 'how many')):
            if leave:
                return (f"You have **{leave['remaining']:g}** of {leave['entitlement']} leave days remaining "
                        f"({leave['used']:g} used, {leave['pending']:g} pending approval).")
            return "I couldn't find a leave balance because your account isn't linked to an employee profile."
        if 'leave' in m:
            return "Open **Leaves → Request Leave** to apply. Managers approve requests from **Pending Leaves**."
        if 'payslip' in m or 'salary' in m or 'payroll' in m:
            return "Your payslips are under **Payroll**. Contact HR if a payslip is missing."
        if 'attendance' in m or 'clock' in m:
            return "Use **Attendance** to clock in/out and see your calendar of past days."
        if 'expense' in m or 'reimburse' in m:
            return "Submit claims under **Expenses**; a manager or admin will approve or reject them."
        if 'ticket' in m or 'help' in m or 'support' in m:
            return "Raise a request under **Helpdesk** and HR will update its status."
        return ("I can help with leave balance, payslips, attendance, expenses and helpdesk questions. "
                "(The AI model is not configured, so answers are limited - set GEMINI_API_KEY or GROQ_API_KEY for full answers.)")


@api_view(['POST'])
def find_employees_by_skills(request):
    """Find employees having the given skills, ranked by suitability percentage."""
    skills = request.data.get('skills', [])
    if not skills:
        return Response({'error': 'No skills provided'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        return Response(insights.find_employees_by_skills(skills))
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TeamStatsView(APIView):
    """
    API View for team statistics
    """
    
    def get(self, request):
        try:
            # Get all teams first
            all_teams = list(teams.find())
            
            # Get all employees
            # former employees stay in the database but are not part of any team's current headcount
            all_employees = [e for e in employees_collection.find() if insights.is_active(e)]
            
            # Get all formally registered departments
            all_departments = list(departments_collection.find())
            
            # Identify all unique department names from teams to ensure no orphans are lost
            team_dep_names = set(t.get("department") for t in all_teams if t.get("department"))
            formal_dep_names = set(d.get("name") for d in all_departments if d.get("name"))
            
            # We want to iterate over all formal departments + any extra ones found in teams
            all_dep_names = sorted(list(formal_dep_names.union(team_dep_names)))
            
            departments_data = []
            
            for dept_name in all_dep_names:
                # Find formal department info if it exists
                formal_dept = next((d for d in all_departments if d.get("name") == dept_name), None)
                dept_id = str(formal_dept["_id"]) if formal_dept else dept_name
                
                # Get teams in this department
                dept_teams = [t for t in all_teams if t.get("department") == dept_name or str(t.get("department_id", "")) == str(dept_id)]
                
                # Get employees in this department
                dept_employees = [e for e in all_employees if e.get("department") == dept_name or str(e.get("department_id", "")) == str(dept_id)]
                
                # Get team data for this department
                teams_data = []
                for team in dept_teams:
                    team_id = team["_id"]
                    
                    # Get employees in this team
                    team_employees = [e for e in all_employees if str(e.get("team_id", "")) == str(team_id) or e.get("team") == team.get("name")]
                    
                    # Resolve leader and manager info
                    leader_info = None
                    manager_info = None
                    
                    if team.get("leader_id"):
                        leader_emp = next((e for e in all_employees if str(e["_id"]) == str(team.get("leader_id"))), None)
                        if leader_emp:
                            leader_info = {
                                "id": str(leader_emp["_id"]),
                                "name": f"{leader_emp.get('first_name', '')} {leader_emp.get('last_name', '')}".strip(),
                                "position": leader_emp.get("position", "Team Lead")
                            }
                    
                    if team.get("manager_id"):
                        manager_emp = next((e for e in all_employees if str(e["_id"]) == str(team.get("manager_id"))), None)
                        if manager_emp:
                            manager_info = {
                                "id": str(manager_emp["_id"]),
                                "name": f"{manager_emp.get('first_name', '')} {manager_emp.get('last_name', '')}".strip(),
                                "position": manager_emp.get("position", "Team Manager")
                            }

                    # Add team info
                    teams_data.append({
                        "id": str(team_id),
                        "name": team.get("name", "Unnamed Team"),
                        "description": team.get("description", ""),
                        "created_at": team.get("created_at"),
                        "leader_id": team.get("leader_id"),
                        "manager_id": team.get("manager_id"),
                        "leader": leader_info,
                        "manager": manager_info,
                        "employee_count": len(team_employees),
                        "employees": [
                            {
                                "id": str(e["_id"]),
                                "name": f"{e.get('first_name', '')} {e.get('last_name', '')}".strip(),
                                "position": e.get("position", ""),
                                "email": e.get("email", ""),
                                "phone": e.get("phone", ""),
                                "hire_date": e.get("hire_date", ""),
                                "employee_id": e.get("employee_id", str(e["_id"])),
                                "is_leader": str(e["_id"]) == str(team.get("leader_id")),
                                "is_manager": str(e["_id"]) == str(team.get("manager_id"))
                            } for e in team_employees
                        ]
                    })
                
                # Add department info
                departments_data.append({
                    "id": str(dept_id),
                    "name": dept_name,
                    "description": formal_dept.get("description", f"{dept_name} department") if formal_dept else f"{dept_name} department",
                    "employee_count": len(dept_employees),
                    "team_count": len(dept_teams),
                    "teams": teams_data
                })
            
            # Return the statistics
            return Response({
                "departments": departments_data,
                "total_departments": len(all_dep_names),
                "total_teams": len(all_teams),
                "total_employees": len(all_employees)
            })
            
        except Exception as e:
            return Response(
                {"error": f"Error generating team statistics: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
class TeamReviewsView(APIView):
    """
    API View for team review management
    """
    
    def get(self, request):
        """Get all team reviews with optional filtering"""
        if not is_privileged(request):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        try:
            # Import the team_reviews collection from db
            from hr_backend.db import team_reviews
            
            query = {}
            team_id = request.query_params.get('team_id')
            if team_id:
                query = {'$or': [{'team_id': team_id}, {'team_name': team_id}]}
                
            # Get team reviews sorted newest first
            all_reviews = list(team_reviews.find(query).sort('created_at', -1))
            
            # Format the reviews
            formatted_reviews = []
            for review in all_reviews:
                review['id'] = str(review['_id'])
                review.pop('_id', None)
                formatted_reviews.append(review)
            
            return Response(formatted_reviews)
            
        except Exception as e:
            return Response(
                {"error": f"Error retrieving team reviews: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Create a new team review"""
        if not is_privileged(request):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        try:
            # Import the team_reviews collection from db
            from hr_backend.db import team_reviews, teams as teams_collection
            
            # Get the review data
            review_data = request.data
            
            # Validate the required fields
            if not review_data.get('team_id'):
                return Response(
                    {"error": "Team ID is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if team exists
            team_id = review_data.get('team_id')
            try:
                team_oid = ObjectId(team_id)
                team = teams_collection.find_one({"_id": team_oid})
                if not team:
                    return Response(
                        {"error": f"Team with ID {team_id} not found"},
                        status=status.HTTP_404_NOT_FOUND
                    )
            except:
                return Response(
                    {"error": "Invalid team ID format"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Add created_at and updated_at timestamps
            review_data['created_at'] = timezone.now().isoformat()
            review_data['updated_at'] = timezone.now().isoformat()
            review_data['status'] = 'Completed'
            
            # Set reviewer info from auth with fallback
            reviewer_id = getattr(request, 'employee_id', None)
            reviewer_name = getattr(request, 'user_info', {}).get('username', 'System')
            
            # Use Employees collection from db
            from hr_backend.db import employees as employees_collection
            
            # Find the actual employee to get their full name
            emp_doc = None
            if hasattr(request, 'user_id') and request.user_id:
                try:
                    emp_doc = employees_collection.find_one({'user_id': ObjectId(request.user_id)})
                except:
                    emp_doc = employees_collection.find_one({'user_id': str(request.user_id)})
            
            if not emp_doc and reviewer_id:
                emp_doc = employees_collection.find_one({'$or': [{'employee_id': reviewer_id}, {'_id': reviewer_id}]})
                
            if emp_doc:
                reviewer_id = emp_doc.get('employee_id') or str(emp_doc['_id'])
                reviewer_name = f"{emp_doc.get('first_name', '')} {emp_doc.get('last_name', '')}".strip() or reviewer_name
            
            review_data['reviewer_id'] = reviewer_id
            review_data['reviewer_name'] = reviewer_name
            
            # Create the review
            result = team_reviews.insert_one(review_data)
            
            # Return the created review
            created_review = team_reviews.find_one({"_id": result.inserted_id})
            created_review['id'] = str(created_review['_id'])
            created_review.pop('_id', None)
            
            return Response(created_review, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"Error creating team review: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class TeamReviewDetailView(APIView):
    """
    API View for specific team review management
    """
    
    def get(self, request, team_id):
        """Get reviews for a specific team"""
        if not is_privileged(request):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        try:
            # Import the team_reviews collection from db
            from hr_backend.db import team_reviews
            
            # Get all reviews for the specified team
            team_reviews_list = list(team_reviews.find({"team_id": team_id}))
            
            # Format the reviews
            formatted_reviews = []
            for review in team_reviews_list:
                review['id'] = str(review['_id'])
                review.pop('_id', None)
                formatted_reviews.append(review)
            
            return Response(formatted_reviews)
            
        except Exception as e:
            return Response(
                {"error": f"Error retrieving team reviews: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def put(self, request, team_id):
        """Update a specific team review"""
        if not is_privileged(request):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        try:
            # Import the team_reviews collection from db
            from hr_backend.db import team_reviews
            
            # Get the review data
            review_data = request.data
            
            # Validate the review ID
            if not review_data.get('id'):
                return Response(
                    {"error": "Review ID is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update the review
            review_id = review_data.get('id')
            
            try:
                review_oid = ObjectId(review_id)
            except:
                return Response(
                    {"error": "Invalid review ID format"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if review exists and belongs to the specified team
            existing_review = team_reviews.find_one({"_id": review_oid})
            if not existing_review:
                return Response(
                    {"error": f"Review with ID {review_id} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            if existing_review.get('team_id') != team_id:
                return Response(
                    {"error": f"Review with ID {review_id} does not belong to team {team_id}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
            # Remove id from data to be updated
            update_data = review_data.copy()
            update_data.pop('id', None)
            
            # Update timestamp
            update_data['updated_at'] = timezone.now().isoformat()
            
            # Update the review
            team_reviews.update_one({"_id": review_oid}, {"$set": update_data})
            
            # Return the updated review
            updated_review = team_reviews.find_one({"_id": review_oid})
            updated_review['id'] = str(updated_review['_id'])
            updated_review.pop('_id', None)
            
            return Response(updated_review)
            
        except Exception as e:
            return Response(
                {"error": f"Error updating team review: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def delete(self, request, team_id):
        """Delete a specific team review"""
        if not is_privileged(request):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        try:
            # Import the team_reviews collection from db
            from hr_backend.db import team_reviews
            
            # Get the review ID
            review_id = request.query_params.get('review_id')
            
            if not review_id:
                return Response(
                    {"error": "Review ID is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                review_oid = ObjectId(review_id)
            except:
                return Response(
                    {"error": "Invalid review ID format"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if review exists and belongs to the specified team
            existing_review = team_reviews.find_one({"_id": review_oid})
            if not existing_review:
                return Response(
                    {"error": f"Review with ID {review_id} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            if existing_review.get('team_id') != team_id:
                return Response(
                    {"error": f"Review with ID {review_id} does not belong to team {team_id}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Delete the review
            team_reviews.delete_one({"_id": review_oid})
            
            return Response({"message": f"Review with ID {review_id} deleted successfully"})
        
        except Exception as e:
            return Response({"error": f"Error deleting team review: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AttendanceAnomalyView(AdminOnlyMixin, APIView):
    """Attendance anomalies detected from the last 30 days of records."""

    def get(self, request):
        try:
            return Response(insights.attendance_anomalies())
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PayrollAnomalyView(AdminOnlyMixin, APIView):
    """Pre-run payroll checks."""

    def get(self, request):
        try:
            return Response(insights.payroll_anomalies())
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdvancedAnalyticsAIView(AdminOnlyMixin, APIView):
    """Flight risk, sentiment and performance predictions."""

    def get(self, request):
        try:
            return Response(insights.advanced_analytics())
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
