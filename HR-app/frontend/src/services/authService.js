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
  // Login user - automatically succeeds
  login: async (credentials) => {
    // No actual API call needed - simulate successful login
    const mockResponse = {
      token: 'mock-token',
      user: {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin'
      }
    };
    
    // Store fake authentication data
    localStorage.setItem('token', mockResponse.token);
    localStorage.setItem('user', JSON.stringify(mockResponse.user));
    
    return mockResponse;
  },

  // Logout user - clears local storage
  logout: async () => {
    localStorage.clear();
    return { success: true };
  },

  // Register user - automatically succeeds
  register: async (userData) => {
    return {
      success: true,
      message: 'User registered successfully',
      user_id: '1'
    };
  },

  // Get current user - always return admin
  getCurrentUser: () => {
    // Always return admin user
    return {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin'
    };
  },

  // Check if user is authenticated - always return true
  isAuthenticated: () => {
    return true;
  },

  // Check if user is admin - always return true
  isAdmin: () => {
    return true;
  },

  // Check if user is HR - always return true
  isHR: () => {
    return true;
  },

  // Check if user is manager - always return true
  isManager: () => {
    return true;
  },

  // Get permissions for current user - return all permissions
  getMyPermissions: async () => {
    return {
      permissions: [
        'admin',
        'manage_users',
        'manage_employees',
        'manage_attendance',
        'manage_leaves',
        'manage_reviews',
        'manage_payroll',
        'manage_teams'
      ]
    };
  },

  // Get user roles - return mock roles
  getRoles: async () => {
    return {
      roles: [
        { _id: '1', name: 'Admin', permissions: ['admin', 'manage_users', 'manage_employees'] },
        { _id: '2', name: 'HR', permissions: ['manage_employees', 'manage_attendance'] },
        { _id: '3', name: 'Manager', permissions: ['manage_team', 'approve_leaves'] },
        { _id: '4', name: 'Employee', permissions: ['view_profile', 'submit_leaves'] }
      ]
    };
  },

  // Mock successful operations
  createRole: async (roleData) => {
    return { success: true, message: 'Role created successfully', role_id: '5' };
  },
  
  updateRole: async (roleId, roleData) => {
    return { success: true, message: 'Role updated successfully' };
  },
  
  deleteRole: async (roleId) => {
    return { success: true, message: 'Role deleted successfully' };
  },
  
  changePassword: async (passwordData) => {
    return { success: true, message: 'Password changed successfully' };
  },
  
  requestPasswordReset: async (email) => {
    return { success: true, message: 'Password reset link sent successfully' };
  },
  
  resetPassword: async (token, newPassword) => {
    return { success: true, message: 'Password reset successfully' };
  }
};

export default authService; 