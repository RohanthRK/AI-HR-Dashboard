import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

// Create context
const AuthContext = createContext();

// Custom hook for using auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from local storage
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr && token) {
      try {
        const user = JSON.parse(userStr);
        // Normalize role to Title Case for internal consistency
        if (user.role) {
          const role = user.role.toLowerCase();
          if (role === 'administrator' || role === 'admin') user.role = 'Admin';
          else user.role = role.charAt(0).toUpperCase() + role.slice(1);
        }
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to parse user from local storage', e);
        logout();
      }
    }
    setLoading(false);
  }, [token]);

  // Login handler
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      const data = await authService.login({ username, password });
      const user = data.user;
      // Normalize role
      if (user.role) {
        const role = user.role.toLowerCase();
        if (role === 'administrator' || role === 'admin') user.role = 'Admin';
        else user.role = role.charAt(0).toUpperCase() + role.slice(1);
      }
      setCurrentUser(user);
      setToken(data.token);
      return user;
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to login';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Register handler
  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      return await authService.register(userData);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to register';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = () => {
    authService.logout();
    setCurrentUser(null);
    setToken(null);
  };

  // Role checking helpers
  const hasRole = (role) => {
    if (!currentUser) return false;
    
    // Normalize user role to Title Case for consistency
    const userRole = currentUser.role?.charAt(0).toUpperCase() + currentUser.role?.slice(1).toLowerCase();
    
    if (userRole === 'Admin') return true; // Admin has all permissions

    // If role is an array, check if user has any of the roles
    if (Array.isArray(role)) {
      return role.some(r => {
        const targetRole = r?.charAt(0).toUpperCase() + r?.slice(1).toLowerCase();
        return userRole === targetRole;
      });
    }

    // Single role string check
    const targetRole = role?.charAt(0).toUpperCase() + role?.slice(1).toLowerCase();
    return userRole === targetRole;
  };

  const isAdmin = () => hasRole('Admin');
  const isHR = () => hasRole('HR');
  const isManager = () => hasRole(['Manager', 'Admin', 'HR', 'Owner']);

  const value = {
    currentUser,
    token,
    loading,
    error,
    login,
    register,
    logout,
    hasRole,
    isAuthenticated: !!token,
    isHR,
    isAdmin,
    isManager
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};