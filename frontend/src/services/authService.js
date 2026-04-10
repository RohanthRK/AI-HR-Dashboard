import axios from 'axios';

const API_URL = 'http://localhost:8000/api/auth';

// Create axios instance with default config
const authAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// No authentication interceptors needed

// Service functions for authentication
const authService = {
  // Login user via API
  login: async (credentials) => {
    try {
      const response = await authAPI.post('/login/', credentials);
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Logout user - clears local storage
  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { success: true };
  },

  // Register user via API (Admin only)
  register: async (userData) => {
    try {
      const response = await authAPI.post('/register/', userData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get current user from storage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  // Check if user is admin
  isAdmin: () => {
    const user = authService.getCurrentUser();
    return user && (user.role === 'Admin' || user.role === 'admin');
  },

  // Check if user is HR
  isHR: () => {
    const user = authService.getCurrentUser();
    return user && (user.role === 'HR' || user.role === 'hr' || user.role === 'Admin' || user.role === 'admin');
  },

  // Check if user is manager
  isManager: () => {
    const user = authService.getCurrentUser();
    return user && (user.role === 'Manager' || user.role === 'manager' || user.role === 'Admin' || user.role === 'admin');
  },

  // Get permissions for current user
  getMyPermissions: async () => {
    try {
      const response = await authAPI.get('/my-permissions/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (error) {
      // Fallback for missing endpoint
      return { 
        permissions: [
          'view_dashboard', 'view_employees', 'view_attendance', 
          'view_leaves', 'view_payroll', 'view_teams'
        ]
      };
    }
  },

  // Get user roles from API
  getRoles: async () => {
    try {
      const response = await authAPI.get('/roles/', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createRole: async (roleData) => {
    try {
      const response = await authAPI.post('/roles/', roleData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateRole: async (roleId, roleData) => {
    try {
      const response = await authAPI.put(`/roles/${roleId}/`, roleData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteRole: async (roleId) => {
    try {
      const response = await authAPI.delete(`/roles/${roleId}/`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  changePassword: async (passwordData) => {
    try {
      const response = await authAPI.post('/change-password/', passwordData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  requestPasswordReset: async (email) => {
    try {
      const response = await authAPI.post('/request-password-reset/', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  resetPassword: async (token, newPassword) => {
    try {
      const response = await authAPI.post('/reset-password/', { token, newPassword });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default authService; 