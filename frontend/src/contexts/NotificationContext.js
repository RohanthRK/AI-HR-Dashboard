import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);

const PAGE = 30;
const POLL_MS = 30 * 1000;

/**
 * Notifications for the signed-in user.
 *  - the unread count is polled every 30 seconds (a cheap call) and the list is reloaded only when something new arrived,
 *    when the tab becomes visible again, or when you ask for it;
 *  - `incoming` holds notifications that arrived while you were using the app, so the layout can pop a toast for them.
 */
export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [incoming, setIncoming] = useState([]);
  const { isAuthenticated, currentUser } = useAuth();
  const seen = useRef(null);            // ids already shown; null until the first load so old items never pop up as "new"
  const latest = useRef(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/notifications/', { params: { limit: PAGE } });
      const list = Array.isArray(res.data) ? res.data : [];
      if (seen.current === null) {
        seen.current = new Set(list.map((n) => n._id));
      } else {
        const fresh = list.filter((n) => !n.read && !seen.current.has(n._id));
        fresh.forEach((n) => seen.current.add(n._id));
        if (fresh.length) setIncoming((current) => [...current, ...fresh]);
      }
      setNotifications(list);
      setHasMore(list.length === PAGE);
      setUnreadCount(list.filter((n) => !n.read).length);
      latest.current = (list.find((n) => !n.read) || {}).created_at ?? null;     // what the next cheap check compares against
      setError(null);
      return list;
    } catch (e) {
      setError('Could not load your notifications.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkForNew = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/notifications/count/');
      setUnreadCount(data.unread);
      if (data.latest !== latest.current) {
        latest.current = data.latest;
        await refresh();
      }
    } catch (e) { /* offline: the layout already says so */ }
  }, [refresh]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser) {
      setNotifications([]); setUnreadCount(0); setIncoming([]); setHasMore(false);
      seen.current = null; latest.current = null;
      return undefined;
    }
    refresh();
    const timer = setInterval(checkForNew, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') checkForNew(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); };
  }, [isAuthenticated, currentUser, refresh, checkForNew]);

  const loadMore = useCallback(async () => {
    const last = notifications[notifications.length - 1];
    if (!last) return;
    try {
      const res = await axios.get('/api/notifications/', { params: { limit: PAGE, before: last.created_at } });
      const more = Array.isArray(res.data) ? res.data : [];
      more.forEach((n) => seen.current && seen.current.add(n._id));
      setNotifications((current) => [...current, ...more]);
      setHasMore(more.length === PAGE);
    } catch (e) { setError('Could not load more notifications.'); }
  }, [notifications]);

  const markAsRead = useCallback(async (id) => {
    setNotifications((current) => current.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((count) => Math.max(0, count - 1));
    try { await axios.put(`/api/notifications/${id}/read/`); } catch (e) { refresh(); }
  }, [refresh]);

  const markAllAsRead = useCallback(async () => {
    setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try { await axios.put('/api/notifications/read-all/'); } catch (e) { refresh(); }
  }, [refresh]);

  const deleteNotification = useCallback(async (id) => {
    setNotifications((current) => {
      const gone = current.find((n) => n._id === id);
      if (gone && !gone.read) setUnreadCount((count) => Math.max(0, count - 1));
      return current.filter((n) => n._id !== id);
    });
    try { await axios.delete(`/api/notifications/${id}/`); } catch (e) { refresh(); }
  }, [refresh]);

  const clearRead = useCallback(async () => {
    setNotifications((current) => current.filter((n) => !n.read));
    try { await axios.delete('/api/notifications/clear/'); } catch (e) { refresh(); }
  }, [refresh]);

  const dismissIncoming = useCallback(() => setIncoming([]), []);

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, loading, error, hasMore, incoming,
      fetchNotifications: refresh, loadMore, markAsRead, markAllAsRead, deleteNotification, clearRead, dismissIncoming,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
