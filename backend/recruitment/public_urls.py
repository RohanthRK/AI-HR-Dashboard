from django.urls import path
from . import public

urlpatterns = [
    path('jobs/', public.public_jobs, name='public_jobs'),
    path('jobs/<str:job_id>/', public.public_job, name='public_job'),
    path('resume-parse/', public.parse_resume, name='public_resume_parse'),
    path('apply/', public.apply, name='public_apply'),
    path('chat/', public.chat, name='public_chat'),
]
