"""
URL patterns for reviews app
"""
from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_reviews, name='list_reviews'),
    path('me/', views.get_my_performance_reviews, name='get_my_reviews'),
    path('assigned/me/', views.get_my_assigned_reviews, name='get_my_assigned_reviews'),
    path('<str:review_id>/', views.get_review_by_id, name='get_review_by_id'),
    path('<str:review_id>/submit/', views.submit_review, name='submit_review'),
]