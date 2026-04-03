from django.urls import path
from . import views

urlpatterns = [
    path('', views.handle_tickets, name='handle_tickets'),
    path('<str:ticket_id>/', views.handle_ticket_detail, name='handle_ticket_detail'),
    path('<str:ticket_id>/comment/', views.handle_ticket_detail, name='handle_ticket_comment'),
]
