from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from employees.models import Employee
from attendance.models import Attendance
from leaves.models import Leave
from reviews.models import PerformanceReview
from django.utils import timezone
from datetime import timedelta
import json
from django.db.models import Avg, Count, Q
import random  # Only for generating sample data
from jobs.models import JobOpening
from hr_backend.db import employees as employees_collection, departments as departments_collection, teams
from bson.objectid import ObjectId
import os
import json
import PyPDF2
import docx
import google.generativeai as genai

# Configure Gemini AI
genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
def get_gemini_model():
    return genai.GenerativeModel('gemini-1.5-flash')


class DashboardAnalyticsView(APIView):
    """
    API View for dashboard analytics
    Authentication disabled - returns admin dashboard data for all users
    """
    
    def get(self, request):
        # With authentication removed, always return admin dashboard
        return self.get_admin_dashboard(request)
    
    def get_admin_dashboard(self, request):
        # Get current date and last month date
        today = timezone.now().date()
        last_month = today - timedelta(days=30)
        
        # Employee stats
        total_employees = Employee.objects.count()
        active_employees = Employee.objects.filter(status='active').count()
        new_hires = Employee.objects.filter(
            joining_date__gte=last_month
        ).count()
        
        # Attendance stats
        today_attendance = Attendance.objects.filter(
            date=today
        ).count()
        
        attendance_rate = 0
        if active_employees > 0:
            attendance_rate = (today_attendance / active_employees) * 100
        
        # Leave stats
        pending_leaves = Leave.objects.filter(
            status='pending'
        ).count()
        
        # Performance stats
        upcoming_reviews = PerformanceReview.objects.filter(
            due_date__range=[today, today + timedelta(days=14)]
        ).count()
        
        data = {
            'employees': {
                'total': total_employees,
                'active': active_employees,
                'new_hires': new_hires,
            },
            'attendance': {
                'today': today_attendance,
                'rate': round(attendance_rate, 2)
            },
            'leaves': {
                'pending': pending_leaves
            },
            'performance': {
                'upcoming_reviews': upcoming_reviews
            }
        }
        
        return Response(data)

class EngagementMetricsView(APIView):
    """
    API View for employee engagement metrics
    """
    
    def get(self, request):
        # Implement engagement metrics logic here
        # This would typically use data from surveys, activity tracking, etc.
        
        # Placeholder data
        data = {
            'engagement_score': 7.8,
            'trend': '+0.5',
            'participation_rate': 85,
            'by_department': [
                {'name': 'Engineering', 'score': 8.2},
                {'name': 'Marketing', 'score': 7.5},
                {'name': 'Sales', 'score': 7.9},
                {'name': 'HR', 'score': 8.4}
            ]
        }
        
        return Response(data)

class AttritionRiskView(APIView):
    """
    API View for attrition risk prediction
    """
    
    def get(self, request):
        # Implement attrition risk prediction logic
        # This would use machine learning models in a real implementation
        
        # Placeholder data
        data = {
            'high_risk_count': 5,
            'medium_risk_count': 12,
            'top_factors': [
                'Salary below market rate',
                'High workload',
                'Limited growth opportunities'
            ],
            'risk_by_department': [
                {'name': 'Engineering', 'high_risk': 2, 'medium_risk': 4, 'low_risk': 14},
                {'name': 'Marketing', 'high_risk': 1, 'medium_risk': 3, 'low_risk': 8},
                {'name': 'Sales', 'high_risk': 2, 'medium_risk': 3, 'low_risk': 10},
                {'name': 'HR', 'high_risk': 0, 'medium_risk': 2, 'low_risk': 6}
            ]
        }
        
        return Response(data)

class TeamInsightsView(APIView):
    """
    API View for team insights analysis
    """
    
    def get(self, request):
        try:
            # Get all employees from MongoDB
            all_employees = list(employees_collection.find())
            
            if not all_employees:
                return Response(
                    {"error": "No employees found in the database"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Extract and analyze all skills across employees
            all_skills = []
            departmental_skills = {}
            departments = set()
            
            for employee in all_employees:
                skills = employee.get('skills', [])
                department = employee.get('department', 'Unknown')
                all_skills.extend(skills)
                departments.add(department)
                
                if department not in departmental_skills:
                    departmental_skills[department] = []
                departmental_skills[department].extend(skills)
            
            # Find most common skills (team strengths)
            skill_frequency = {}
            for skill in all_skills:
                if skill in skill_frequency:
                    skill_frequency[skill] += 1
                else:
                    skill_frequency[skill] = 1
            
            # Sort skills by frequency
            sorted_skills = sorted(skill_frequency.items(), key=lambda x: x[1], reverse=True)
            
            # Top skills are strengths
            strengths = [skill for skill, count in sorted_skills[:5]]
            
            # Identify skills gaps by department
            emerging_skills = [
                "Data Science", "Artificial Intelligence", "Machine Learning", 
                "Cloud Computing", "DevOps", "Cybersecurity", "Blockchain"
            ]
            
            # Find skills that are underrepresented
            skill_coverage = {}
            for skill in emerging_skills:
                coverage = skill_frequency.get(skill, 0) / len(all_employees) if len(all_employees) > 0 else 0
                skill_coverage[skill] = coverage
            
            # Low coverage skills are development areas
            development_areas = [skill for skill, coverage in skill_coverage.items() 
                                 if coverage < 0.2 and skill not in strengths][:5]
            
            # Calculate collaboration score by analyzing department diversity, skill overlap
            # A simple heuristic for this example
            department_counts = {}
            for dept in departments:
                department_counts[dept] = sum(1 for emp in all_employees if emp.get('department') == dept)
            
            dept_balance = 1 - (max(department_counts.values()) / len(all_employees) if len(all_employees) > 0 else 0)
            skill_diversity = len(set(all_skills)) / (len(all_skills) if all_skills else 1)
            
            collaboration_score = int(((dept_balance * 0.4) + (skill_diversity * 0.6)) * 100)
            collaboration_score = min(max(collaboration_score, 65), 95)  # Keep it reasonable
            
            # Generate recommendations based on analysis
            recommendations = [
                {
                    'title': f"Training in {development_areas[0] if development_areas else 'Emerging Technologies'}",
                    'description': f"Organize training sessions to develop team skills in {', '.join(development_areas[:2]) if development_areas else 'emerging technologies'}"
                },
                {
                    'title': "Cross-functional Projects",
                    'description': "Create projects that require collaboration across departments to enhance team cohesion and knowledge sharing"
                },
                {
                    'title': "Skills Exchange Program",
                    'description': f"Implement a mentoring program where experts in {', '.join(strengths[:2]) if strengths else 'key areas'} share knowledge with other team members"
                }
            ]
            
            team_insights = {
                'strengths': strengths[:5] if strengths else ["Technical Skills", "Communication", "Problem Solving"],
                'developmentAreas': development_areas[:5] if development_areas else ["Data Analysis", "AI/ML", "Cloud Technologies"],
                'collaborationScore': collaboration_score,
                'recommendations': recommendations
            }
            
            return Response(team_insights)
        except Exception as e:
            return Response(
                {"error": f"Error generating team insights: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SkillsTrendsView(APIView):
    """
    API View for skills trends analysis
    """
    
    def get(self, request):
        try:
            # Get all employees from MongoDB
            all_employees = list(employees_collection.find())
            
            if not all_employees:
                return Response(
                    {"error": "No employees found in the database"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Extract all skills across employees
            all_skills = []
            for employee in all_employees:
                skills = employee.get('skills', [])
                all_skills.extend(skills)
            
            # Count skills frequency
            skill_frequency = {}
            for skill in all_skills:
                if skill in skill_frequency:
                    skill_frequency[skill] += 1
                else:
                    skill_frequency[skill] = 1
            
            # Define emerging skills with growth rates
            emerging_skills_data = {
                'Data Science': {'trend': 'Rising', 'growth': 45},
                'Cloud Computing': {'trend': 'Rising', 'growth': 38},
                'Artificial Intelligence': {'trend': 'Rising', 'growth': 52},
                'DevOps': {'trend': 'Rising', 'growth': 40},
                'Cybersecurity': {'trend': 'Rising', 'growth': 35},
                'React': {'trend': 'Rising', 'growth': 30},
                'UI/UX Design': {'trend': 'Stable', 'growth': 15},
                'Python': {'trend': 'Rising', 'growth': 28},
                'GraphQL': {'trend': 'Rising', 'growth': 25},
                'Kubernetes': {'trend': 'Rising', 'growth': 42},
                'Digital Marketing': {'trend': 'Stable', 'growth': 18},
                'Machine Learning': {'trend': 'Rising', 'growth': 48},
                'Node.js': {'trend': 'Stable', 'growth': 20},
                'Agile Development': {'trend': 'Stable', 'growth': 12},
                'Blockchain': {'trend': 'Rising', 'growth': 32}
            }
            
            # Identify top skills in the team
            sorted_skills = sorted(skill_frequency.items(), key=lambda x: x[1], reverse=True)
            top_team_skills = [skill for skill, _ in sorted_skills[:5]]
            
            # Format emerging skills for response
            trends = []
            for skill, data in emerging_skills_data.items():
                trends.append({
                    'skill': skill,
                    'trend': data['trend'],
                    'growth': data['growth'],
                })
            
            # Prioritize the emerging skills that are also present in the team
            for i, trend in enumerate(trends):
                if trend['skill'] in top_team_skills:
                    # Move to front if it's a team skill
                    trends.insert(0, trends.pop(i))
            
            # Cap to top 6 trends for display
            trends = trends[:6]
            
            # Identify gaps - emerging skills not well-represented in the team
            gap_areas = []
            for skill, data in emerging_skills_data.items():
                if skill not in top_team_skills and data['trend'] == 'Rising' and data['growth'] > 25:
                    gap_areas.append(skill)
            
            # Recommendations based on gaps
            recommendations = []
            if gap_areas:
                recommendations.append({
                    'title': f"Upskilling opportunity: {gap_areas[0] if gap_areas else 'Emerging Technologies'}",
                    'description': f"Consider training programs for team members in {', '.join(gap_areas[:2])}"
                })
            
            recommendations.append({
                'title': "Strategic hiring",
                'description': f"Add expertise in {', '.join(gap_areas[:2]) if gap_areas else 'emerging technologies'} through strategic hiring"
            })
            
            recommendations.append({
                'title': "Learning & Development",
                'description': "Allocate 10% of team time for learning emerging technologies and staying current"
            })
            
            skills_trends = {
                'trends': trends,
                'teamCoverage': {
                    'strongAreas': top_team_skills[:3],
                    'gapAreas': gap_areas[:3]
                },
                'recommendations': recommendations
            }
            
            return Response(skills_trends)
        except Exception as e:
            return Response(
                {"error": f"Error generating skills trends: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GrowthOpportunitiesView(APIView):
    """
    API View for growth opportunities analysis
    """
    
    def get(self, request):
        try:
            # Get all employees from MongoDB
            all_employees = list(employees_collection.find())
            
            if not all_employees:
                return Response(
                    {"error": "No employees found in the database"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Placeholder data
            growth_opportunities = {
                'highPotentialEmployees': [
                    {
                        'id': '1',
                        'name': 'John Doe',
                        'position': 'Senior Developer',
                        'department': 'Engineering',
                        'performance': 4.5,
                        'growthPotential': 'High'
                    }
                ],
                'leadershipPipeline': [
                    {
                        'employeeId': '1',
                        'name': 'John Doe',
                        'recommendation': 'Consider for Team Lead role'
                    }
                ],
                'developmentPlans': [
                    {
                        'employeeId': '1',
                        'name': 'John Doe',
                        'planType': 'Leadership Development',
                        'focusAreas': ['Strategic Planning', 'Team Management'],
                        'timeline': '6 months',
                        'mentor': 'To be assigned'
                    }
                ]
            }
            
            return Response(growth_opportunities)
        except Exception as e:
            return Response(
                {"error": f"Error generating growth opportunities: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class EmployeeInsightsView(APIView):
    """
    API View for individual employee insights
    """
    
    def get(self, request, employee_id):
        try:
            # Get the requested employee from MongoDB
            employee = employees_collection.find_one({"_id": ObjectId(employee_id)})
            
            if not employee:
                return Response(
                    {"error": "Employee not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Placeholder data
            employee_insights = {
                'skills': ['JavaScript', 'React', 'Node.js'],
                'performance': 4.2,
                'growthPotential': 'High',
                'recommendations': [
                    {
                        'title': 'Skill Development',
                        'description': 'Focus on advanced leadership skills.'
                    },
                    {
                        'title': 'Career Path',
                        'description': 'Consider for leadership track.'
                    },
                    {
                        'title': 'Growth Projects',
                        'description': 'Assign to cross-functional projects.'
                    }
                ]
            }
            
            return Response(employee_insights)
        except Exception as e:
            return Response(
                {"error": f"Error generating employee insights: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
class AIEmployeesListView(APIView):
    """
    API View to list employees with AI-enhanced attributes
    """
    
    def get(self, request):
        try:
            # Get employees from MongoDB
            all_employees = list(employees_collection.find())
            
            if not all_employees:
                return Response(
                    {"error": "No employees found in the database"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Placeholder data
            employees_data = [
                {
                    'id': str(employee.get('_id')),
                    'name': f"{employee.get('first_name', '')} {employee.get('last_name', '')}",
                    'position': employee.get('position', ''),
                    'department': employee.get('department', ''),
                    'skills': employee.get('skills', [])[:5],
                    'performance': 4.0,
                    'growthPotential': 'Medium'
                } for employee in all_employees[:10]  # Limit to first 10 employees
            ]
            
            return Response(employees_data)
        except Exception as e:
            return Response(
                {"error": f"Error retrieving AI-enhanced employees: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
class ResumeScreeningView(APIView):
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
                pdf_reader = PyPDF2.PdfReader(resume_file)
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
            
            model = get_gemini_model()
            response = model.generate_content(prompt)
            
            # Parse JSON returned by Gemini
            # Handle markdown code blocks if gemini returns them
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "", 1)
            if response_text.endswith("```"):
                # find the last ``` and remove it
                response_text = response_text[::-1].replace("```", "", 1)[::-1]
                
            ai_data = json.loads(response_text.strip())
            
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
            
        except Exception as e:
            import traceback
            print("Error in Resume Screening:", traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class JobMatchingView(APIView):
    """
    API View for job matching functionality using Gemini AI
    """
    
    def post(self, request):
        try:
            job_id = request.data.get('job_id')
            if not job_id:
                return Response({'error': 'job_id is required'}, status=status.HTTP_400_BAD_REQUEST)
                
            # Fetch Job
            try:
                job = JobOpening.objects.get(id=job_id)
            except JobOpening.DoesNotExist:
                return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
                
            # Fetch Employees
            employees_cursor = employees_collection.find()
            employees = list(employees_cursor)
            if not employees:
                return Response({'error': 'No employees to match'}, status=status.HTTP_404_NOT_FOUND)
                
            job_desc = f"Title: {job.title}\nDepartment: {job.department.name if job.department else 'N/A'}\nExperience: {job.required_experience}\nSkills: {job.required_skills}"
            
            employees_desc = []
            valid_emp_ids = []
            
            for emp in employees:
                # The frontend expects to match either emp.id or emp.employee_id
                emp_id = str(emp.get('_id'))
                valid_emp_ids.append(emp_id)
                emp_skills = ", ".join(emp.get('skills', []))
                
                # Default position to avoid KeyError
                position = emp.get('position', 'Unknown')
                
                employees_desc.append(f"ID: {emp_id} | Name: {emp.get('first_name')} {emp.get('last_name')} | Position: {position} | Skills: {emp_skills}")
                
            employees_text = "\n".join(employees_desc)
            
            prompt = f"""
            You are an expert HR AI. Below is a job opening and a list of employees. Score the top 3 best matching employees for this job.
            
            JOB OPENING:
            {job_desc}
            
            EMPLOYEES:
            {employees_text}
            
            Respond with ONLY a valid JSON array of objects representing the matches, like this:
            [
              {{
                "job_id": "{job_id}",
                "employee_id": "the_matching_employee_id",
                "match_score": 90, // 0-100 overall
                "skill_match": 85, // 0-100
                "experience_match": 95, 
                "education_match": 90,
                "overall_fit": "Excellent", // "Excellent", "Very Good", "Good", "Fair"
                "notes": "Brief explanation of why this employee is a good fit",
                "matching_skills": ["list", "of", "matching", "skills"]
              }}
            ]
            """
            
            model = get_gemini_model()
            response = model.generate_content(prompt)
            
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "", 1)
            if response_text.endswith("```"):
                response_text = response_text[::-1].replace("```", "", 1)[::-1]
                
            match_results = json.loads(response_text.strip())
            
            # Filter matches to ensure they have valid employee IDs
            valid_matches = [m for m in match_results if str(m.get('employee_id')) in valid_emp_ids]
            
            return Response(valid_matches, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            print("Error in JobMatchingView:", traceback.format_exc())
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def get(self, request):
        # Fallback to post if they used GET with query param
        request.data['job_id'] = request.GET.get('job_id')
        return self.post(request)

class HRChatbotView(APIView):
    """
    API View for the Universal AI HR Chatbot using Gemini
    """
    def post(self, request):
        try:
            message = request.data.get('message', '')
            if not message:
                return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
                
            prompt = f"""
            You are a highly capable AI HR Assistant for an enterprise application. 
            Your job is to answer employee questions about Onboarding, Attendance, Payroll, Leave Policies, and general HR queries.
            You must be helpful, direct, and clear. If asked about features (like "How do I check attendance?"), 
            instruct them to use the Neo-Brutalist sidebar navigation or the Alt+K global search shortcut.
            
            Employee Question: {message}
            
            Provide a helpful, concise response in markdown format.
            """
            
            model = get_gemini_model()
            response = model.generate_content(prompt)
            
            return Response({'reply': response.text.strip()}, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            print("Error in HRChatbotView:", traceback.format_exc())
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
def find_employees_by_skills(request):
    """
    Find employees who have the specified skills with suitability percentage
    """
    try:
        skills = request.data.get('skills', [])
        
        if not skills:
            return Response(
                {'error': 'No skills provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Placeholder data
        results = [
            {
                'id': '1',
                'employee_id': 'EMP001',
                'name': 'John Doe',
                'position': 'Senior Developer',
                'matching_skills': ['JavaScript', 'React'],
                'suitability': 80,
                'department': 'Engineering'
            }
        ]
        
        return Response(results)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class TeamStatsView(APIView):
    """
    API View for team statistics
    """
    
    def get(self, request):
        try:
            # Get all departments
            all_departments = list(departments_collection.find())
            
            # Get all teams
            all_teams = list(teams.find())
            
            # Get all employees
            all_employees = list(employees_collection.find())
            
            # Organize departments with team and employee counts
            departments_data = []
            for dept in all_departments:
                dept_id = dept["_id"]
                dept_name = dept.get("name", "Unknown")
                
                # Get teams in this department
                dept_teams = [t for t in all_teams if str(t.get("department_id", "")) == str(dept_id) or t.get("department") == dept_name]
                
                # Get employees directly in this department
                dept_employees = [e for e in all_employees if str(e.get("department_id", "")) == str(dept_id) or e.get("department") == dept_name]
                
                # Get team data for this department
                teams_data = []
                for team in dept_teams:
                    team_id = team["_id"]
                    
                    # Get employees in this team
                    team_employees = [e for e in all_employees if str(e.get("team_id", "")) == str(team_id) or e.get("team") == team.get("name")]
                    
                    # Add team info
                    teams_data.append({
                        "id": str(team_id),
                        "name": team.get("name", "Unnamed Team"),
                        "employee_count": len(team_employees),
                        "employees": [
                            {
                                "id": str(e["_id"]),
                                "name": f"{e.get('first_name', '')} {e.get('last_name', '')}".strip(),
                                "position": e.get("position", ""),
                                "email": e.get("email", ""),
                                "phone": e.get("phone", ""),
                                "hire_date": e.get("hire_date", ""),
                                "employee_id": e.get("employee_id", str(e["_id"]))
                            } for e in team_employees
                        ]
                    })
                
                # Add department info
                departments_data.append({
                    "id": str(dept_id),
                    "name": dept_name,
                    "employee_count": len(dept_employees),
                    "team_count": len(dept_teams),
                    "teams": teams_data
                })
            
            # Return the statistics
            return Response({
                "departments": departments_data,
                "total_departments": len(all_departments),
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
        """Get all team reviews"""
        try:
            # Import the team_reviews collection from db
            from hr_backend.db import team_reviews
            
            # Get all team reviews
            all_reviews = list(team_reviews.find())
            
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
            return Response(
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AttendanceAnomalyView(APIView):
    """
    API View to detect patterns and anomalies in attendance data using AI
    """
    def get(self, request):
        try:
            # Placeholder data representing Gemini's anomaly analysis of the last 30 days
            anomalies = [
                {
                    "date": "2023-10-24",
                    "type": "Late Clock-in",
                    "severity": "high",
                    "description": "Clock-in was 2 hours later than the 30-day moving average.",
                    "suggestion": "Check with employee regarding recurring Tuesday delays."
                },
                {
                    "date": "2023-10-25",
                    "type": "Short Shift",
                    "severity": "medium",
                    "description": "Total hours worked was 5.5h instead of 8h.",
                    "suggestion": "Verify if half-day leave was approved."
                }
            ]
            
            prediction = "Based on recent patterns, there is a 75% chance of absenteeism this upcoming Friday for the Engineering team."
            
            return Response({
                "anomalies": anomalies,
                "prediction": prediction,
                "overall_health_score": 82
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class PayrollAnomalyView(APIView):
    """
    API View to detect potential errors in the current payroll cycle using AI
    """
    def get(self, request):
        try:
            # Placeholder data for payroll error prediction
            anomalies = [
                {
                    "type": "Unusual Overtime Spike",
                    "severity": "high",
                    "description": "Engineering department shows a 300% increase in overtime claims compared to last month.",
                    "suggestion": "Review overtime logs before finalizing payroll."
                },
                {
                    "type": "Missing Tax ID",
                    "severity": "critical",
                    "description": "2 new hires are missing their tax identification details.",
                    "suggestion": "Reach out to John Doe and Jane Smith immediately."
                }
            ]
            
            forecast = "Next month's payroll is projected to increase by 4.2% due to scheduled performance bonuses."
            
            return Response({
                "anomalies": anomalies,
                "forecast": forecast,
                "confidence_score": 94
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class AdvancedAnalyticsAIView(APIView):
    """
    API View to return AI-driven insights for Performance, Engagement, and Flight Risk
    """
    def get(self, request):
        try:
            # Placeholder data representing Gemini's analysis of HR trends
            return Response({
                "flight_risk": [
                    {"department": "Engineering", "risk_level": "High", "reason": "Below-average compensation compared to market, low recent engagement survey scores."},
                    {"department": "Sales", "risk_level": "Medium", "reason": "Recent changes in commission structure affecting morale."}
                ],
                "sentiment_analysis": {
                    "overall_score": 78,
                    "trend": "upward",
                    "key_themes": [
                        {"theme": "Work-Life Balance", "sentiment": "positive", "score": 85},
                        {"theme": "Recent Management Changes", "sentiment": "negative", "score": 45},
                        {"theme": "New Office Perks", "sentiment": "positive", "score": 90}
                    ]
                },
                "performance_predictions": [
                    {"department": "Marketing", "predicted_top_performers": 5, "skills_trending_up": ["SEO", "Content Strategy", "Data Analytics"]},
                    {"department": "Engineering", "predicted_top_performers": 12, "skills_trending_up": ["React", "Python", "Cloud Architecture"]}
                ]
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
