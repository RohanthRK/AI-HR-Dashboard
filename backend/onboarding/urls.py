from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_onboarding, name='onboarding'),
    path('start/', views.start, name='onboarding_start'),
    path('<str:onboarding_id>/tasks/<str:task_id>/', views.update_task, name='onboarding_task'),
]
