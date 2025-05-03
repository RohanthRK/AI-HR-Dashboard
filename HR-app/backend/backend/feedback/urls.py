from django.urls import path
from . import views

urlpatterns = [
    # List all items
    path('', views.list_items, name='list_items'), 
    
    # Create new item
    path('new/', views.create_item, name='create_item'),
    
    # Get specific item
    path('<str:item_id>/', views.get_item, name='get_item'),
    
    # Update item
    path('<str:item_id>/update/', views.update_item, name='update_item'),
    
    # Partial update
    path('<str:item_id>/partial/', views.partial_update_item, name='partial_update_item'),
    
    # Delete item
    path('<str:item_id>/delete/', views.delete_item, name='delete_item'),
]
