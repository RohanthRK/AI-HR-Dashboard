from django.urls import path
from .views import list_urls

urlpatterns = [
    path('', list_urls, name='list_urls'),
] 