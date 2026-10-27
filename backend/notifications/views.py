"""
In-app notifications (Notifications collection). Each one is addressed to a Users._id (`user_id`) and carries a type,
a link to the page it is about and a category (see utils/notify.py).
"""
from bson import ObjectId
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from hr_backend.db import notifications
from utils.notify import CATEGORIES, TYPE_META, meta_for

UNREAD = {'$nin': [True, 'True', 'true']}


def _serialize(doc):
    doc['_id'] = str(doc['_id'])
    # legacy documents stored the flag as a string
    doc['read'] = doc.get('read') in (True, 'True', 'true', 1)
    doc['timestamp'] = doc.get('created_at', '')
    meta = meta_for(doc.get('type'))
    doc['category'] = meta['category']
    doc['link'] = doc.get('link') or meta['link']
    return doc


def _own_filter(request, extra=None):
    query = {'user_id': str(getattr(request, 'user_id', ''))}
    if extra:
        query.update(extra)
    return query


def _oid(notification_id):
    try:
        return ObjectId(notification_id)
    except Exception:
        return None


@csrf_exempt
@require_http_methods(["GET"])
def list_notifications(request):
    """
    GET /api/notifications/?unread=true&category=Leave&limit=50&before=<created_at of the last one you have>
    The current user's notifications, newest first (a plain list).
    """
    try:
        limit = max(1, min(int(request.GET.get('limit', 50)), 100))
    except ValueError:
        limit = 50
    extra = {}
    if request.GET.get('unread') == 'true':
        extra['read'] = UNREAD
    category = request.GET.get('category')
    if category in CATEGORIES:
        extra['type'] = {'$in': [t for t, m in TYPE_META.items() if m['category'] == category]}
    if request.GET.get('before'):
        extra['created_at'] = {'$lt': request.GET['before']}
    docs = notifications.find(_own_filter(request, extra)).sort('created_at', -1).limit(limit)
    return JsonResponse([_serialize(d) for d in docs], safe=False)


@csrf_exempt
@require_http_methods(["GET"])
def unread_count(request):
    """GET /api/notifications/count/ - cheap enough to poll every half minute."""
    query = _own_filter(request, {'read': UNREAD})
    newest = notifications.find_one(query, sort=[('created_at', -1)], projection={'created_at': 1})
    return JsonResponse({'unread': notifications.count_documents(query), 'latest': (newest or {}).get('created_at')})


@csrf_exempt
@require_http_methods(["PUT", "POST"])
def mark_all_read(request):
    """PUT /api/notifications/read-all/"""
    result = notifications.update_many(_own_filter(request, {'read': UNREAD}), {'$set': {'read': True}})
    return JsonResponse({'success': True, 'updated': result.modified_count})


@csrf_exempt
@require_http_methods(["PUT", "POST"])
def mark_read(request, notification_id):
    """PUT /api/notifications/<id>/read/"""
    oid = _oid(notification_id)
    if oid is None:
        return JsonResponse({'error': 'Invalid notification id'}, status=400)
    result = notifications.update_one(_own_filter(request, {'_id': oid}), {'$set': {'read': True}})
    if result.matched_count == 0:
        return JsonResponse({'error': 'Notification not found'}, status=404)
    return JsonResponse({'success': True})


@csrf_exempt
@require_http_methods(["DELETE"])
def clear_read(request):
    """DELETE /api/notifications/clear/ - remove every notification of mine that has been read."""
    result = notifications.delete_many(_own_filter(request, {'read': {'$in': [True, 'True', 'true']}}))
    return JsonResponse({'success': True, 'deleted': result.deleted_count})


@csrf_exempt
@require_http_methods(["DELETE"])
def delete_notification(request, notification_id):
    """DELETE /api/notifications/<id>/"""
    oid = _oid(notification_id)
    if oid is None:
        return JsonResponse({'error': 'Invalid notification id'}, status=400)
    result = notifications.delete_one(_own_filter(request, {'_id': oid}))
    if result.deleted_count == 0:
        return JsonResponse({'error': 'Notification not found'}, status=404)
    return JsonResponse({'success': True})
