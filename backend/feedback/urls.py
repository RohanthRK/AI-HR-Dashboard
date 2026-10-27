from django.urls import path
from . import views

urlpatterns = [
    path('templates/', views.templates, name='survey_templates'),
    path('surveys/', views.surveys_handler, name='surveys'),
    path('surveys/<str:survey_id>/', views.survey_detail, name='survey_detail'),
    path('surveys/<str:survey_id>/respond/', views.respond, name='survey_respond'),
    path('surveys/<str:survey_id>/close/', views.close_survey, name='survey_close'),
    path('surveys/<str:survey_id>/results/', views.results, name='survey_results'),
    path('surveys/<str:survey_id>/summary/', views.summarize, name='survey_summary'),
]
