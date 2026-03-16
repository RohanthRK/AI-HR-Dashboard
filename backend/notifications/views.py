from django.shortcuts import render
from django.http import JsonResponse

# Create your views here.
def list_notifications(request):
    """
    Endpoint to list notifications
    
    For now, returns an empty list as a placeholder
    """
    return JsonResponse([], safe=False)
