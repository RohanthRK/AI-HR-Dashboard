from django.shortcuts import render
from django.http import JsonResponse
from django.urls import get_resolver

# Create your views here.

def list_urls(request):
    """
    List all URLs in the project
    """
    resolver = get_resolver()
    
    def get_pattern_str(pattern):
        if hasattr(pattern, "pattern"):
            return str(pattern.pattern)
        else:
            return str(pattern)
            
    def extract_urls(patterns, namespace=None, prefix=''):
        urls = []
        for pattern in patterns:
            if hasattr(pattern, 'url_patterns'):
                urls.extend(extract_urls(
                    pattern.url_patterns,
                    namespace=pattern.namespace or namespace,
                    prefix=prefix + get_pattern_str(pattern)
                ))
            else:
                url_name = '%s:%s' % (namespace, pattern.name) if namespace and pattern.name else pattern.name or ''
                url_pattern = prefix + get_pattern_str(pattern)
                if hasattr(pattern, 'callback') and pattern.callback:
                    callback_name = pattern.callback.__name__ if pattern.callback.__name__ != "wrapper" else pattern.callback.__module__ + "." + pattern.callback.__qualname__ 
                    view_name = pattern.callback.__module__ + "." + callback_name
                else:
                    view_name = ""
                urls.append({
                    'name': url_name,
                    'pattern': url_pattern,
                    'view': view_name,
                })
        return urls
            
    all_urls = extract_urls(resolver.url_patterns)
    filtered_urls = [url for url in all_urls if 'mongodb' in url['pattern']]
    
    return JsonResponse({
        'all_urls': all_urls,
        'mongodb_urls': filtered_urls
    })
