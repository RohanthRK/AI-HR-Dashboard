import { createApiClient } from './api';


const apiClient = createApiClient('/api');


const aiService = {
  // Get list of employees with AI-enhanced attributes
  getAIEmployees: async () => {
    try {
      const response = await apiClient.get('/ai/talent-insights/employees/');
      return response.data;
    } catch (error) {
      console.error('Error in getAIEmployees:', error);
      throw error;
    }
  },
  

  

  

  

  

  

  

  

  
  // Find employees by their skills with suitability percentage
  findEmployeesBySkills: async (skills) => {
    try {
      const response = await apiClient.post('/ai/find-employees-by-skills/', { skills });
      return response.data;
    } catch (error) {
      console.error('Error in findEmployeesBySkills:', error);
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
      }
      throw error;
    }
  },
  
  // Get team statistics
  getTeamStats: async (cacheBust = '') => {
    try {
      const response = await apiClient.get(`/ai/team-stats/${cacheBust}`);
      return response.data;
    } catch (error) {
      console.error('Error in getTeamStats:', error);
      if (error.response) {
        console.error('Error status:', error.response.status);
        console.error('Error data:', error.response.data);
      }
      throw error;
    }
  }
};

export default aiService; 