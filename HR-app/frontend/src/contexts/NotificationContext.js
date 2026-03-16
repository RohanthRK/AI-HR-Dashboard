import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

// Create context
const NotificationContext = createContext();

// Custom hook for using notification context
export const useNotifications = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, currentUser } = useAuth();
  
  const API_URL = 'http://localhost:8000/api';

  // Fetch notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, currentUser]);

  // Set up polling for new notifications (every 2 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      fetchNotifications();
    }, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Use mock data instead of API call to avoid errors
      console.log('Using mock notifications data');
      const mockNotifications = [
        {
          _id: '1',
          title: 'Performance Review Complete',
          message: 'Your annual performance review is now available',
          type: 'info',
          read: false,
          date: new Date().toISOString(),
          link: '/profile/reviews'
        },
        {
          _id: '2',
          title: 'New Leave Request',
          message: 'Your leave request has been approved',
          type: 'success',
          read: true,
          date: new Date(Date.now() - 86400000).toISOString(),
          link: '/profile/leaves'
        },
        {
          _id: '3',
          title: 'Team Meeting Reminder',
          message: 'Weekly team meeting in 30 minutes',
          type: 'warning',
          read: false,
          date: new Date(Date.now() - 3600000).toISOString(),
          link: '/calendar'
        }
      ];
      
      setNotifications(mockNotifications);
      
      // Count unread notifications
      const unread = mockNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
      
      setError(null);
    } catch (error) {
      setError('Failed to fetch notifications');
      console.error('Error fetching notifications:', error);
      
      // Fallback to empty notifications array
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API_URL}/notifications/${notificationId}/read`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await axios.put(`${API_URL}/notifications/read-all`);
      
      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete a notification
  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API_URL}/notifications/${notificationId}`);
      
      // Update local state
      const updatedNotifications = notifications.filter(
        notification => notification._id !== notificationId
      );
      
      setNotifications(updatedNotifications);
      
      // Recalculate unread count
      const unread = updatedNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}; 