import { createApiClient } from './api';


const objectiveAPI = createApiClient('/api/objectives');


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



  // Update objective
  updateObjective: async (objectiveId, objectiveData) => {
    try {
      const response = await objectiveAPI.put(`/${objectiveId}/`, objectiveData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },




};

export default objectiveService;
