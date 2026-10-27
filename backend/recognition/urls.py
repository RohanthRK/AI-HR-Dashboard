from django.urls import path
from . import views

urlpatterns = [
    path('', views.recognitions_handler, name='recognitions'),
    path('leaderboard/', views.leaderboard, name='recognition_leaderboard'),
    path('me/', views.my_progress, name='recognition_me'),
]
