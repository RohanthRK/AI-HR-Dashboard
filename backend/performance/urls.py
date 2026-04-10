from django.urls import path
from . import views

urlpatterns = [
    path('pips/', views.get_pips, name='get_pips'),
    path('pips/new/', views.create_pip, name='create_pip'),
    path('pips/<str:pip_id>/', views.pip_detail, name='pip_detail'),
]
