import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/objectives`;

// Create axios instance with default config
const objectiveAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to add JWT token to every request
objectiveAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const objectiveService = {
  // Get all objectives (with optional filtering by scope, team, etc.)
  getAllObjectives: async (params = {}) => {
    try {
      const response = await objectiveAPI.get('/', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new objective
  createObjective: async (objectiveData) => {
    try {
      // Standardizing on 'new/' to match backend 'objectives/urls.py'
      const response = await objectiveAPI.post('/new/', objectiveData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get objective by ID
  getObjectiveById: async (objectiveId) => {
    try {
      const response = await objectiveAPI.get(`/${objectiveId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update objective
  updateObjective: async (objectiveId, objectiveData) => {
    try {
      const response = await objectiveAPI.put(`/${objectiveId}/`, objectiveData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update objective progress
  updateProgress: async (objectiveId, progressData) => {
    try {
      const response = await objectiveAPI.patch(`/${objectiveId}/progress/`, progressData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete objective
  deleteObjective: async (objectiveId) => {
    try {
      const response = await objectiveAPI.delete(`/${objectiveId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default objectiveService;
