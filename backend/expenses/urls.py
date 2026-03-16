from django.urls import path
from . import views

urlpatterns = [
    path('', views.handle_expenses, name='handle_expenses'),
    path('<str:expense_id>', views.handle_expense_detail, name='handle_expense_detail'),
]
