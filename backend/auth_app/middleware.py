"""
Authentication completely disabled for development
"""

class JWTAuthMiddleware:
    """
    Middleware that does nothing - authentication completely disabled
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # No authentication - just pass through all requests
        return self.get_response(request) 