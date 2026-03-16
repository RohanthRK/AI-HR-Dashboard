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
    
class JobMatchingView(APIView):
    """
    API View for job matching functionality
    """
    
    def get(self, request):
        try:
            # Placeholder data
            match_results = [
                {
                    'job_id': '1',
                    'employee_id': '1',
                    'match_score': 85,
                    'skill_match': 80,
                    'experience_match': 90,
                    'education_match': 90,
                    'overall_fit': 'Very Good',
                    'notes': 'Good skill match with sufficient experience.',
                    'job': {
                        'id': '1',
                        'title': 'Senior Developer',
                        'department': 'Engineering',
                        'location': 'New York',
                        'requiredSkills': ['JavaScript', 'React', 'Node.js'],
                        'requiredExperience': '5+ years',
                        'requiredEducation': "Bachelor's Degree",
                        'status': 'active'
                    },
                    'employee': {
                        'id': '1',
                        'name': 'John Doe',
                        'position': 'Developer',
                        'department': 'Engineering',
                        'skills': ['JavaScript', 'React', 'Node.js'],
                        'experience': 4,
                        'education': "Bachelor's Degree",
                        'performance': 4.2
                    }
                }
            ]
            
            return Response(match_results)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
                                "name": f"{e.get('first_name', '')} {e.get('last_name', '')}",
                                "position": e.get("position", ""),
                                "email": e.get("email", "")
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
                {"error": f"Error deleting team review: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 