from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeamViewSet, ProjectViewSet, mongodb_create, mongodb_update, debug_teams

router = DefaultRouter()
router.register(r'teams', TeamViewSet)
router.register(r'projects', ProjectViewSet)

urlpatterns = [
    path('debug/', debug_teams, name='debug_teams'),
    path('teams/mongodb_create/', mongodb_create, name='mongodb_create_team'),
    path('teams/<str:pk>/mongodb_update/', mongodb_update, name='mongodb_update_team'),
    path('', include(router.urls)),
]