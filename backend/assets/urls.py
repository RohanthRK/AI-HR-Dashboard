from django.urls import path
from . import views

urlpatterns = [
    path('', views.handle_assets, name='handle_assets'),
    path('<str:asset_id>/', views.handle_asset_detail, name='handle_asset_detail'),
]
