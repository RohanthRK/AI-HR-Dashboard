"""
URL patterns for the ai_analytics app
"""
from django.urls import path
from .views import (
    DashboardAnalyticsView, 
    EngagementMetricsView, 
    AttritionRiskView,
    TeamInsightsView,
    SkillsTrendsView,
    GrowthOpportunitiesView,
    EmployeeInsightsView,
    AIEmployeesListView,
    JobMatchingView,
    ResumeScreeningView,
    HRChatbotView,
    AttendanceAnomalyView,
    PayrollAnomalyView,
    AdvancedAnalyticsAIView,
    TeamStatsView,
    find_employees_by_skills,
    TeamReviewsView,
    TeamReviewDetailView
)

urlpatterns = [
    path('dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
    path('engagement/', EngagementMetricsView.as_view(), name='engagement-metrics'),
    path('attrition-risk/', AttritionRiskView.as_view(), name='attrition-risk'),
    # Talent Insights API endpoints
    path('talent-insights/team/', TeamInsightsView.as_view(), name='team-insights'),
    path('talent-insights/skills/', SkillsTrendsView.as_view(), name='skills-trends'),
    path('talent-insights/growth/', GrowthOpportunitiesView.as_view(), name='growth-opportunities'),
    path('talent-insights/employee/<str:employee_id>/', EmployeeInsightsView.as_view(), name='employee-insights'),
    path('talent-insights/employees/', AIEmployeesListView.as_view(), name='ai-employees-list'),
    path('job-matching/', JobMatchingView.as_view(), name='job-matching'),
    path('resume-screening/', ResumeScreeningView.as_view(), name='resume-screening'),
    path('chatbot/', HRChatbotView.as_view(), name='chatbot'),
    path('attendance-anomalies/', AttendanceAnomalyView.as_view(), name='attendance-anomalies'),
    path('payroll-anomalies/', PayrollAnomalyView.as_view(), name='payroll-anomalies'),
    path('advanced-analytics/', AdvancedAnalyticsAIView.as_view(), name='advanced-analytics'),
    path('find-employees-by-skills/', find_employees_by_skills, name='find-employees-by-skills'),
    path('team-stats/', TeamStatsView.as_view(), name='team-stats'),
    path('team-reviews/', TeamReviewsView.as_view(), name='team-reviews'),
    path('team-reviews/<str:team_id>/', TeamReviewDetailView.as_view(), name='team-review-detail'),
]