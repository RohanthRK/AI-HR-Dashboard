from django.urls import path
from . import views

urlpatterns = [
    path('', views.requests_handler, name='offboarding'),
    path('analytics/', views.analytics, name='offboarding_analytics'),
    path('<str:request_id>/', views.decide, name='offboarding_decide'),
    path('<str:request_id>/checklist/<str:item_id>/', views.toggle_checklist, name='offboarding_checklist'),
]
