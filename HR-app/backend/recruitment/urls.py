from django.urls import path
from . import views

urlpatterns = [
    path('jobs/', views.list_jobs, name='list_jobs'),
    path('jobs/<str:job_id>/candidates/', views.list_candidates_for_job, name='list_candidates_for_job'),
    path(
        'jobs/<str:job_id_str>/candidates/<str:candidate_id_str>/screen/',
        views.trigger_resume_screening,
        name='trigger_resume_screening'
    ),
]
