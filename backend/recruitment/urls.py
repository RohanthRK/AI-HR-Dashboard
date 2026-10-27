from django.urls import path
from . import views

urlpatterns = [
    path('jobs/', views.handle_kanban_jobs, name='handle_kanban_jobs'),
    path('jobs/<str:job_id>/', views.job_detail, name='job_detail'),
    path('jobs/<str:job_id>/candidates/', views.handle_kanban_candidates, name='handle_kanban_candidates'),
    path('jobs/<str:job_id>/candidates/parse/', views.import_preview, name='candidate_import_preview'),
    path('jobs/<str:job_id>/resumes/', views.upload_resumes, name='upload_resumes'),
    path('jobs/<str:job_id>/candidates/bulk/', views.import_confirm, name='candidate_import_confirm'),
    path('jobs/<str:job_id>/predictions/', views.predict_candidates_view, name='predict_candidates'),
    path('candidates/', views.handle_kanban_candidates, name='handle_all_candidates'),
    path('candidates/<str:candidate_id>/', views.candidate_detail, name='candidate_detail'),
    path('candidates/<str:candidate_id>/resume/', views.candidate_resume, name='candidate_resume'),
    path('candidates/<str:candidate_id>/stage/', views.update_candidate_stage, name='update_candidate_stage'),
]
