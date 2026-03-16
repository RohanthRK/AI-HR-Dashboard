"""
URL patterns for ai_insights app
"""
from django.urls import path
from . import views

urlpatterns = [
    # ai_insights CRUD
    path('', views.list_ai_insights, name='list_ai_insights'),  # GET
    path('new/', views.create_ai_insight, name='create_ai_insight'),  # POST
    path('<str:ai_insight_id>/', views.get_ai_insight, name='get_ai_insight'),  # GET
    path('<str:ai_insight_id>/update/', views.update_ai_insight, name='update_ai_insight'),  # PUT
    path('<str:ai_insight_id>/partial/', views.partial_update_ai_insight, name='partial_update_ai_insight'),  # PATCH
    path('<str:ai_insight_id>/delete/', views.delete_ai_insight, name='delete_ai_insight'),  # DELETE
]
