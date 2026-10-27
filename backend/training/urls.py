from django.urls import path
from . import views

urlpatterns = [
    path('courses/', views.courses_handler, name='training_courses'),
    path('courses/<str:course_id>/', views.course_detail, name='training_course_detail'),
    path('assign/', views.assign, name='training_assign'),
    path('mine/', views.my_assignments, name='training_mine'),
    path('assignments/', views.all_assignments, name='training_assignments'),
    path('assignments/<str:assignment_id>/', views.assignment_detail, name='training_assignment_detail'),
    path('recommendations/', views.recommendations, name='training_recommendations'),
]
