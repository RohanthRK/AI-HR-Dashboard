import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simplified interceptor without authentication
apiClient.interceptors.request.use(
  (config) => {
    // No authentication required
    return config;
  },
  (error) => Promise.reject(error)
);

const aiService = {
  // Get list of employees with AI-enhanced attributes
  getAIEmployees: async () => {
    try {
      console.log('Making API call to /ai/talent-insights/employees/');
      const response = await apiClient.get('/ai/talent-insights/employees/');
      console.log('API call successful, response:', response);
      return response.data;
    } catch (error) {
      console.error('Error in getAIEmployees:', error);
      throw error;
    }
  },
  
  // Get job openings
  getJobOpenings: async () => {
    try {
      const response = await apiClient.get('/recruitment/jobs/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get job matching results
  getJobMatches: async (params = {}) => {
    try {
      const response = await apiClient.get('/ai/job-matching/', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get job matching for specific job and/or employee
  findJobMatches: async (jobId = null, employeeId = null) => {
    try {
      const params = {};
      if (jobId) params.job_id = jobId;
      if (employeeId) params.employee_id = employeeId;
      
      const response = await apiClient.get('/ai/job-matching/', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get skills assessment data
  getSkillsAssessment: async (employeeId) => {
    try {
      const response = await apiClient.get(`/ai/skills-assessment/${employeeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get talent insights for a specific employee
  getEmployeeInsights: async (employeeId) => {
    try {
      const response = await apiClient.get(`/ai/talent-insights/employee/${employeeId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get team insights
  getTeamInsights: async () => {
    try {
      const response = await apiClient.get('/ai/talent-insights/team/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get skills trends
  getSkillsTrends: async () => {
    try {
      const response = await apiClient.get('/ai/talent-insights/skills/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Get growth opportunities
  getGrowthOpportunities: async () => {
    try {
      const response = await apiClient.get('/ai/talent-insights/growth/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Find employees by their skills with suitability percentage
  findEmployeesBySkills: async (skills) => {
    try {
      console.log('Making API call to find employees by skills:', skills);
      const response = await apiClient.post('/ai/find-employees-by-skills/', { skills });
      console.log('API call successful, found employees:', response.data);
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
  getTeamStats: async () => {
    try {
      console.log('Making API call to /ai/team-stats/');
      const response = await apiClient.get('/ai/team-stats/');
      console.log('API call successful, response:', response.data);
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