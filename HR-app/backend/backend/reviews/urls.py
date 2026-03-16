"""
URL patterns for reviews app
"""
from django.urls import path
from . import views

urlpatterns = [
    # reviews CRUD
    path('', views.list_reviews, name='list_reviews'),  # GET
    path('new/', views.create_review, name='create_review'),  # POST
    path('<str:review_id>/', views.get_review, name='get_review'),  # GET
    path('<str:review_id>/update/', views.update_review, name='update_review'),  # PUT
    path('<str:review_id>/partial/', views.partial_update_review, name='partial_update_review'),  # PATCH
    path('<str:review_id>/delete/', views.delete_review, name='delete_review'),  # DELETE
]
