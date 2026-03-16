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
from hr_backend.db import employees as employees_collection, departments as departments_collection
from bson.objectid import ObjectId

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
            # This would ideally come from external industry data or your own research
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
            
            # Identify high-potential employees
            high_potential_employees = []
            leadership_pipeline = []
            development_plans = []
            
            for employee in all_employees:
                # Extract employee data
                employee_id = str(employee.get('_id'))
                first_name = employee.get('first_name', '')
                last_name = employee.get('last_name', '')
                name = f"{first_name} {last_name}"
                position = employee.get('position', '')
                department = employee.get('department', '')
                skills = employee.get('skills', [])
                hire_date = employee.get('hire_date', '')
                
                # Calculate tenure in years (rough estimation for demo)
                tenure = 0
                if hire_date:
                    try:
                        from datetime import datetime
                        hire_datetime = datetime.strptime(hire_date, '%Y-%m-%d')
                        current_date = datetime.now()
                        tenure = (current_date - hire_datetime).days / 365
                    except:
                        # Default to random tenure if date parsing fails
                        tenure = random.uniform(0.5, 5.0)
                else:
                    # Generate random tenure
                    tenure = random.uniform(0.5, 5.0)
                
                # Calculate a performance score based on skills, position, and tenure
                # In a real application, this would use actual performance review data
                leadership_indicators = ['leadership', 'management', 'communication', 'strategy', 'team']
                leadership_score = 0
                for skill in skills:
                    if any(indicator in skill.lower() for indicator in leadership_indicators):
                        leadership_score += 1
                
                # Position weight (senior positions get higher scores)
                position_score = 0
                if 'senior' in position.lower() or 'lead' in position.lower():
                    position_score = 2
                elif 'manager' in position.lower() or 'director' in position.lower():
                    position_score = 3
                
                # Tenure weight (more experience gets higher scores)
                tenure_score = min(int(tenure), 4)
                
                # Calculate performance score
                performance_score = (leadership_score * 0.4) + (position_score * 0.4) + (tenure_score * 0.2)
                performance_score = min(max(performance_score * 1.0, 3.0), 5.0)  # Scale between 3.0-5.0
                performance_score = round(performance_score, 1)
                
                # Identify high-potential employees (performance score >= 4.0)
                if performance_score >= 4.0:
                    high_potential_employees.append({
                        'id': employee_id,
                        'name': name,
                        'position': position,
                        'department': department,
                        'performance': performance_score,
                        'growthPotential': 'High',
                        'avatar': None  # No avatars in MongoDB data
                    })
                
                # Identify leadership pipeline candidates
                if 'senior' in position.lower() and performance_score >= 4.3:
                    leadership_pipeline.append({
                        'employeeId': employee_id,
                        'name': name,
                        'recommendation': 'Ready for Team Lead role within 6-12 months'
                    })
                elif ('lead' in position.lower() or 'manager' in position.lower()) and performance_score >= 4.5:
                    leadership_pipeline.append({
                        'employeeId': employee_id,
                        'name': name,
                        'recommendation': 'Consider for Director-level position in the next performance cycle'
                    })
                elif performance_score >= 4.8:
                    leadership_pipeline.append({
                        'employeeId': employee_id,
                        'name': name,
                        'recommendation': 'Exceptional performer with strong leadership potential'
                    })
                
                # Create development plans based on skills and leadership potential
                if performance_score >= 4.0:
                    plan_type = ''
                    if leadership_score >= 2:
                        plan_type = 'Leadership Development'
                        focus_areas = ['Strategic Planning', 'Team Management', 'Decision Making']
                    else:
                        plan_type = 'Technical Excellence'
                        # Identify relevant technical focus areas based on existing skills
                        tech_areas = ['Cloud Architecture', 'Advanced Programming', 'Systems Design']
                        if any('data' in skill.lower() for skill in skills):
                            tech_areas = ['Data Science', 'Machine Learning', 'Big Data']
                        elif any('design' in skill.lower() for skill in skills):
                            tech_areas = ['Advanced UX', 'Design Systems', 'User Research']
                        focus_areas = tech_areas
                    
                    development_plans.append({
                        'employeeId': employee_id,
                        'name': name,
                        'planType': plan_type,
                        'focusAreas': focus_areas,
                        'timeline': '6 months',
                        'mentor': 'To be assigned'
                    })
            
            # Ensure we have at least some results (for demo purposes)
            if not high_potential_employees and all_employees:
                # Take random employees and mark them as high-potential
                for _ in range(min(3, len(all_employees))):
                    employee = random.choice(all_employees)
                    employee_id = str(employee.get('_id'))
                    name = f"{employee.get('first_name', '')} {employee.get('last_name', '')}"
                    position = employee.get('position', 'Employee')
                    department = employee.get('department', 'General')
                    
                    high_potential_employees.append({
                        'id': employee_id,
                        'name': name,
                        'position': position,
                        'department': department,
                        'performance': round(random.uniform(4.0, 5.0), 1),
                        'growthPotential': 'High',
                        'avatar': None
                    })
            
            if not leadership_pipeline and high_potential_employees:
                # Use some high-potential employees for leadership pipeline
                for emp in high_potential_employees[:min(3, len(high_potential_employees))]:
                    leadership_pipeline.append({
                        'employeeId': emp['id'],
                        'name': emp['name'],
                        'recommendation': 'Shows leadership potential, consider for development program'
                    })
            
            if not development_plans and high_potential_employees:
                # Create basic development plans for high-potential employees
                for emp in high_potential_employees[:min(3, len(high_potential_employees))]:
                    development_plans.append({
                        'employeeId': emp['id'],
                        'name': emp['name'],
                        'planType': 'Career Advancement',
                        'focusAreas': ['Leadership', 'Technical Excellence', 'Communication'],
                        'timeline': '6 months',
                        'mentor': 'To be assigned'
                    })
            
            growth_opportunities = {
                'highPotentialEmployees': high_potential_employees,
                'leadershipPipeline': leadership_pipeline,
                'developmentPlans': development_plans
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

            # Extract employee data
            first_name = employee.get('first_name', '')
            last_name = employee.get('last_name', '')
            name = f"{first_name} {last_name}"
            position = employee.get('position', '')
            department = employee.get('department', '')
            skills = employee.get('skills', [])
            hire_date = employee.get('hire_date', '')
            
            # Calculate performance and growth potential based on skills and position
            leadership_indicators = ['leadership', 'management', 'communication', 'strategy', 'team']
            leadership_score = 0
            for skill in skills:
                if any(indicator in skill.lower() for indicator in leadership_indicators):
                    leadership_score += 1
            
            # Position weight (senior positions get higher scores)
            position_score = 0
            if 'senior' in position.lower() or 'lead' in position.lower():
                position_score = 2
            elif 'manager' in position.lower() or 'director' in position.lower():
                position_score = 3
            
            # Calculate tenure
            tenure = 0
            if hire_date:
                try:
                    from datetime import datetime
                    hire_datetime = datetime.strptime(hire_date, '%Y-%m-%d')
                    current_date = datetime.now()
                    tenure = (current_date - hire_datetime).days / 365
                except:
                    # Default to random tenure if date parsing fails
                    tenure = random.uniform(0.5, 5.0)
            else:
                # Generate random tenure
                tenure = random.uniform(0.5, 5.0)
            
            # Tenure weight
            tenure_score = min(int(tenure), 4)
            
            # Calculate performance score
            performance_score = (leadership_score * 0.4) + (position_score * 0.4) + (tenure_score * 0.2)
            performance_score = min(max(performance_score * 1.0, 3.0), 5.0)  # Scale between 3.0-5.0
            performance_score = round(performance_score, 1)
            
            # Determine growth potential based on performance score
            growth_potential = 'Medium'
            if performance_score >= 4.5:
                growth_potential = 'High'
            elif performance_score < 3.5:
                growth_potential = 'Developing'
            
            # Generate personalized recommendations
            # First recommendation is skill-based
            skill_recommendation = {
                'title': 'Skill Development',
                'description': f"Based on {name}'s profile and current skills, recommend focusing on "
            }
            
            if leadership_score >= 2:
                skill_recommendation['description'] += "advanced leadership skills like strategic planning and executive communication."
            elif any('data' in skill.lower() for skill in skills):
                skill_recommendation['description'] += "advanced data analysis techniques and machine learning applications."
            elif any('design' in skill.lower() for skill in skills):
                skill_recommendation['description'] += "advanced UX methodologies and design systems architecture."
            elif any('dev' in skill.lower() for skill in skills or 'program' in skill.lower() for skill in skills):
                skill_recommendation['description'] += "cloud architecture and microservices design patterns."
            else:
                skill_recommendation['description'] += "emerging technologies in their field to maintain competitive expertise."
            
            # Second recommendation is career-path based
            career_recommendation = {
                'title': 'Career Path',
                'description': ''
            }
            
            if growth_potential == 'High':
                if 'senior' in position.lower():
                    career_recommendation['description'] = "Consider for leadership track with team management responsibilities in the next 6-12 months."
                elif 'lead' in position.lower() or 'manager' in position.lower():
                    career_recommendation['description'] = "Ready for increased strategic responsibilities; consider for director-level pathway."
                else:
                    career_recommendation['description'] = "Strong performer with advancement potential; consider for senior-level position."
            else:
                career_recommendation['description'] = "Focus on technical specialization and expert-level skill development before moving to leadership track."
            
            # Third recommendation is project-based
            project_recommendation = {
                'title': 'Growth Projects',
                'description': f"Assign to cross-functional projects that leverage {name}'s strengths in "
            }
            
            if skills:
                project_recommendation['description'] += f"{', '.join(skills[:2])} while developing expertise in complementary areas."
            else:
                project_recommendation['description'] += "their core competencies while developing expertise in complementary areas."
            
            employee_insights = {
                'skills': skills,
                'performance': performance_score,
                'growthPotential': growth_potential,
                'recommendations': [
                    skill_recommendation,
                    career_recommendation,
                    project_recommendation
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
            
            # Transform employee data for the response
            employees_data = []
            
            for employee in all_employees:
                employee_id = str(employee.get('_id'))
                first_name = employee.get('first_name', '')
                last_name = employee.get('last_name', '')
                name = f"{first_name} {last_name}"
                position = employee.get('position', '')
                department = employee.get('department', '')
                skills = employee.get('skills', [])
                
                # Calculate a growth potential indicator
                performance_score = self.calculate_growth_potential_mongo(employee, skills)
                
                # Only include necessary data for the list view
                employees_data.append({
                    'id': employee_id,
                    'name': name,
                    'position': position,
                    'department': department,
                    'skills': skills[:5],  # Limit skills to top 5 for UI
                    'performance': performance_score,
                    'growthPotential': 'High' if performance_score >= 4.5 else 'Medium' if performance_score >= 3.5 else 'Developing'
                })
            
            return Response(employees_data)
            
        except Exception as e:
            return Response(
                {"error": f"Error retrieving AI-enhanced employees: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def calculate_growth_potential_mongo(self, employee, skills):
        """
        Calculate a growth potential score for an employee
        """
        # Extract employee details
        position = employee.get('position', '').lower()
        hire_date = employee.get('hire_date', '')
        
        # Calculate basic metrics
        leadership_indicators = ['leadership', 'management', 'communication', 'strategy', 'team']
        leadership_score = 0
        for skill in skills:
            if any(indicator in skill.lower() for indicator in leadership_indicators):
                leadership_score += 1
        
        # Position weight
        position_score = 0
        if 'senior' in position or 'lead' in position:
            position_score = 2
        elif 'manager' in position or 'director' in position:
            position_score = 3
        
        # Calculate tenure
        tenure = 0
        if hire_date:
            try:
                from datetime import datetime
                hire_datetime = datetime.strptime(hire_date, '%Y-%m-%d')
                current_date = datetime.now()
                tenure = (current_date - hire_datetime).days / 365
            except:
                # Default to random tenure if date parsing fails
                tenure = random.uniform(0.5, 5.0)
        else:
            # Generate random tenure
            tenure = random.uniform(0.5, 5.0)
        
        # Tenure weight
        tenure_score = min(int(tenure), 4)
        
        # Calculate performance score
        performance_score = (leadership_score * 0.4) + (position_score * 0.4) + (tenure_score * 0.2)
        performance_score = min(max(performance_score * 1.0, 3.0), 5.0)  # Scale between 3.0-5.0
        
        return round(performance_score, 1)

class JobMatchingView(APIView):
    """
    API View for job matching functionality
    """
    
    def get(self, request):
        """
        Get job matches based on criteria.
        Can filter by job_id, employee_id, or both for specific match.
        If no filters provided, returns all top matches.
        """
        # Get query parameters
        job_id = request.query_params.get('job_id')
        employee_id = request.query_params.get('employee_id')
        
        try:
            # Get job openings
            if job_id:
                jobs = [JobOpening.objects.get(id=job_id)]
            else:
                jobs = JobOpening.objects.filter(status='active')
            
            # Get employees
            if employee_id:
                employees = [Employee.objects.get(id=employee_id)]
            else:
                # If no specific employee is requested, get all employees
                # Removed role-based filtering as authentication is bypassed
                employees = Employee.objects.all()
            
            # Calculate job matches
            match_results = []
            
            for job in jobs:
                for employee in employees:
                    # Skip inappropriate combinations if specific filters were provided
                    if (job_id and employee_id) and (str(job.id) != job_id or str(employee.id) != employee_id):
                        continue
                    
                    # Calculate match score between employee and job
                    match_score = self.calculate_match_score(employee, job)
                    
                    # Only include matches with score above threshold (e.g., 50%)
                    if match_score['overall_score'] >= 50:
                        match_results.append({
                            'job_id': job.id,
                            'employee_id': employee.id,
                            'match_score': match_score['overall_score'],
                            'skill_match': match_score['skill_match'],
                            'experience_match': match_score['experience_match'],
                            'education_match': match_score['education_match'],
                            'overall_fit': self.get_fit_label(match_score['overall_score']),
                            'notes': match_score['notes'],
                            'job': {
                                'id': job.id,
                                'title': job.title,
                                'department': job.department.name if job.department else 'Unassigned',
                                'location': job.location,
                                'requiredSkills': job.required_skills.split(',') if job.required_skills else [],
                                'requiredExperience': job.required_experience,
                                'requiredEducation': job.required_education,
                                'status': job.status
                            },
                            'employee': {
                                'id': employee.id,
                                'name': f"{employee.user.first_name} {employee.user.last_name}",
                                'position': employee.position,
                                'department': employee.department,
                                'skills': self.get_employee_skills(employee),
                                'experience': hasattr(employee, 'experience') and employee.experience or random.randint(1, 10),
                                'education': hasattr(employee, 'education') and employee.education or 'Bachelor\'s Degree',
                                'avatar': employee.profile_picture.url if hasattr(employee, 'profile_picture') and employee.profile_picture else None,
                                'performance': hasattr(employee, 'average_performance') and employee.average_performance or 4.0
                            }
                        })
            
            # Sort match results by match score (descending)
            match_results.sort(key=lambda x: x['match_score'], reverse=True)
            
            return Response(match_results)
            
        except JobOpening.DoesNotExist:
            return Response(
                {'error': 'Job opening not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Employee.DoesNotExist:
            return Response(
                {'error': 'Employee not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def calculate_match_score(self, employee, job):
        """
        Calculate match score between employee and job
        In a real app, this would use ML models and analyze multiple factors
        """
        # Get employee skills
        employee_skills = self.get_employee_skills(employee)
        
        # Get job required skills
        job_skills = job.required_skills.split(',') if job.required_skills else []
        
        # Calculate skill match percentage
        if job_skills:
            matching_skills = [skill for skill in employee_skills if skill in job_skills]
            skill_match = round((len(matching_skills) / len(job_skills)) * 100)
        else:
            skill_match = 100
        
        # Calculate experience match
        required_experience = 0
        if job.required_experience:
            # Try to extract years from strings like "3+ years"
            import re
            experience_match = re.search(r'(\d+)', job.required_experience)
            if experience_match:
                required_experience = int(experience_match.group(1))
        
        employee_experience = employee.experience or 0
        
        if required_experience > 0:
            experience_match = min(100, round((employee_experience / required_experience) * 100))
        else:
            experience_match = 100
        
        # Calculate education match (simplified)
        education_match = 80  # Default value
        
        # Improve this with actual education level comparison
        if job.required_education and employee.education:
            if job.required_education.lower() in employee.education.lower():
                education_match = 100
        
        # Calculate overall score (weighted average)
        overall_score = round(
            (skill_match * 0.5) +
            (experience_match * 0.3) +
            (education_match * 0.2)
        )
        
        # Generate notes
        notes = self.generate_match_notes(employee, job, skill_match, experience_match, overall_score)
        
        return {
            'overall_score': overall_score,
            'skill_match': skill_match,
            'experience_match': experience_match,
            'education_match': education_match,
            'notes': notes
        }
    
    def get_employee_skills(self, employee):
        """
        Get employee skills
        In a real app, this would come from a skills table
        """
        # This is a sample implementation similar to AIEmployeesListView
        # Try to return skills based on the employee's position
        position = employee.position.lower() if employee.position else ''
        
        # Developer skills
        if 'developer' in position or 'engineer' in position:
            return ['JavaScript', 'React', 'Node.js', 'Python', 'AWS'] if random.random() > 0.5 else ['Java', 'Spring', 'SQL', 'Docker', 'Kubernetes']
        
        # Designer skills
        elif 'designer' in position or 'ux' in position:
            return ['UI Design', 'User Research', 'Figma', 'Sketch', 'Prototyping']
        
        # Marketing skills
        elif 'market' in position:
            return ['Content Marketing', 'SEO', 'Social Media', 'Analytics', 'Email Marketing']
        
        # Product management skills
        elif 'product' in position:
            return ['Product Strategy', 'Agile', 'User Stories', 'Market Research', 'Data Analysis']
        
        # HR skills
        elif 'hr' in position or 'human resources' in position:
            return ['Recruitment', 'Employee Relations', 'Training', 'Compliance', 'Benefits Administration']
        
        # Default skills for other positions
        else:
            skill_sets = [
                ['Project Management', 'Communication', 'Team Leadership', 'Problem Solving', 'Strategic Planning'],
                ['Data Analysis', 'Reporting', 'Excel', 'Presentation', 'Research'],
                ['Customer Service', 'Negotiation', 'Sales', 'Client Management', 'Relationship Building']
            ]
            return random.choice(skill_sets)
    
    def get_fit_label(self, score):
        """Convert numeric score to descriptive label"""
        if score >= 90:
            return 'Excellent'
        elif score >= 80:
            return 'Very Good'
        elif score >= 70:
            return 'Good'
        elif score >= 50:
            return 'Fair'
        else:
            return 'Poor'
    
    def generate_match_notes(self, employee, job, skill_match, experience_match, overall_score):
        """Generate insightful notes about the match"""
        notes = []
        
        # Skill match commentary
        if skill_match >= 90:
            notes.append(f"Perfect skill match for the position.")
        elif skill_match >= 70:
            notes.append(f"Good skill match with most required skills.")
        else:
            notes.append(f"Missing some key skills for this role.")
        
        # Experience match commentary
        if experience_match >= 100:
            notes.append(f"Exceeds the required experience level.")
        elif experience_match >= 80:
            notes.append(f"Has sufficient experience for the role.")
        else:
            notes.append(f"Less experienced than ideal for this position.")
        
        # Overall recommendation
        if overall_score >= 90:
            notes.append(f"Highly recommended candidate for this position.")
        elif overall_score >= 75:
            notes.append(f"Good candidate worth considering for this role.")
        elif overall_score >= 60:
            notes.append(f"Potential candidate with some training required.")
        else:
            notes.append(f"Not an ideal match for this particular position.")
            
        return " ".join(notes)

@api_view(['POST'])
def find_employees_by_skills(request):
    """
    Find employees who have the specified skills with suitability percentage
    """
    try:
        from hr_backend.db import employees as employees_collection
        
        skills = request.data.get('skills', [])
        
        if not skills:
            return Response(
                {'error': 'No skills provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find employees from MongoDB with these skills
        all_employees = list(employees_collection.find())
        results = []
        
        for employee in all_employees:
            # Get employee skills from the MongoDB document
            emp_skills = employee.get('skills', [])
            
            # Calculate how many of the requested skills the employee has
            matching_skills = [skill for skill in emp_skills if skill in skills]
            
            if matching_skills:
                # Calculate suitability percentage
                suitability = round((len(matching_skills) / len(skills)) * 100)
                
                # Include this employee in results if they have at least one matching skill
                results.append({
                    'id': str(employee.get('_id')),
                    'employee_id': employee.get('employee_id', ''),
                    'name': f"{employee.get('first_name', '')} {employee.get('last_name', '')}",
                    'position': employee.get('position', ''),
                    'matching_skills': matching_skills,
                    'suitability': suitability,
                    'department': employee.get('department', 'Unknown')
                })
        
        # Sort results by suitability (highest first)
        results.sort(key=lambda x: x['suitability'], reverse=True)
        
        return Response(results)
    
    except Exception as e:
        print(f"Error in find_employees_by_skills: {e}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
