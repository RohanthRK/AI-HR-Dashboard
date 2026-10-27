"""
URL patterns for the ai_analytics app
"""
from django.urls import path
from .views import (
    HrAnalyticsView,
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
    GenerateReviewView,
    GenerateTeamReviewView,
    InsightsSummaryView,
    DevelopmentPlanView,
    ScreeningHistoryView,
    JobDescriptionView,
    LLMStatusView,
    AttendanceAnomalyView,
    PayrollAnomalyView,
    AdvancedAnalyticsAIView,
    TeamStatsView,
    find_employees_by_skills,
    TeamReviewsView,
    TeamReviewDetailView
)

from . import saved_reviews as saved_reviews_views

urlpatterns = [
    path('saved-reviews/', saved_reviews_views.saved_reviews, name='saved-reviews'),
    path('saved-reviews/<str:review_id>/', saved_reviews_views.saved_review_detail, name='saved-review-detail'),
    path('my-reviews/', saved_reviews_views.my_delivered_reviews, name='my-delivered-reviews'),
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
    path('providers/', LLMStatusView.as_view(), name='llm-providers'),
    path('generate-job-description/', JobDescriptionView.as_view(), name='generate-job-description'),
    path('resume-screening/history/', ScreeningHistoryView.as_view(), name='resume-screening-history'),
    path('hr-analytics/', HrAnalyticsView.as_view(), name='hr-analytics'),
    path('generate-team-review/', GenerateTeamReviewView.as_view(), name='generate-team-review'),
    path('insights-summary/', InsightsSummaryView.as_view(), name='insights-summary'),
    path('development-plan/', DevelopmentPlanView.as_view(), name='development-plan'),
    path('generate-review/', GenerateReviewView.as_view(), name='generate-review'),
    path('chatbot/', HRChatbotView.as_view(), name='chatbot'),
    path('attendance-anomalies/', AttendanceAnomalyView.as_view(), name='attendance-anomalies'),
    path('payroll-anomalies/', PayrollAnomalyView.as_view(), name='payroll-anomalies'),
    path('advanced-analytics/', AdvancedAnalyticsAIView.as_view(), name='advanced-analytics'),
    path('find-employees-by-skills/', find_employees_by_skills, name='find-employees-by-skills'),
    path('team-stats/', TeamStatsView.as_view(), name='team-stats'),
    path('team-reviews/', TeamReviewsView.as_view(), name='team-reviews'),
    path('team-reviews/<str:team_id>/', TeamReviewDetailView.as_view(), name='team-review-detail'),
]