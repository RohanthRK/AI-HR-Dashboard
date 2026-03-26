from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_objectives, name='get_objectives'),
    path('new/', views.create_objective, name='create_objective'),
    path('<str:objective_id>/', views.objective_detail, name='objective_detail'),
    path('<str:objective_id>/progress/', views.update_progress, name='update_progress'),
]
