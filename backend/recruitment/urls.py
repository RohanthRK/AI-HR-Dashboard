from django.urls import path
from . import views

urlpatterns = [
    path('jobs/', views.handle_kanban_jobs, name='handle_kanban_jobs'),
    path('jobs/<str:job_id>/candidates/', views.handle_kanban_candidates, name='handle_kanban_candidates'),
    path('candidates/', views.handle_kanban_candidates, name='handle_all_candidates'),
    path('candidates/<str:candidate_id>/stage/', views.update_candidate_stage, name='update_candidate_stage'),

    # AI Feature Routes
    path('jobs/placeholder/', views.list_jobs, name='list_jobs'),
    path('jobs/<str:job_id>/candidates/placeholder/', views.list_candidates_for_job, name='list_candidates_for_job'),
    path(
        'jobs/<str:job_id_str>/candidates/<str:candidate_id_str>/screen/',
        views.trigger_resume_screening,
        name='trigger_resume_screening'
    ),
]
