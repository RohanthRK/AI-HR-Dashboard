import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const analyticsService = {
  // Get dashboard analytics data
  getDashboardAnalytics: async () => {
    try {
      const response = await apiClient.get('/ai/dashboard/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee engagement metrics
  getEngagementMetrics: async () => {
    try {
      const response = await apiClient.get('/ai/engagement/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get attrition risk data
  getAttritionRisk: async () => {
    try {
      const response = await apiClient.get('/ai/attrition-risk/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get productivity metrics
  getProductivityMetrics: async (params = {}) => {
    try {
      const response = await apiClient.get('/productivity', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get performance metrics
  getPerformanceMetrics: async (params = {}) => {
    try {
      const response = await apiClient.get('/performance', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get attendance trends
  getAttendanceTrends: async (params = {}) => {
    try {
      const response = await apiClient.get('/attendance', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get leave patterns
  getLeaveTrends: async (params = {}) => {
    try {
      const response = await apiClient.get('/leave', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get turnover analytics
  getTurnoverAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/turnover', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get headcount analytics
  getHeadcountAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/headcount', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get diversity and inclusion metrics
  getDiversityMetrics: async (params = {}) => {
    try {
      const response = await apiClient.get('/diversity', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get training effectiveness metrics
  getTrainingMetrics: async (params = {}) => {
    try {
      const response = await apiClient.get('/training', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get recruitment analytics
  getRecruitmentAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/recruitment', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get compensation analytics
  getCompensationAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/compensation', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get department performance comparison
  getDepartmentComparison: async (params = {}) => {
    try {
      const response = await apiClient.get('/department-comparison', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get detailed employee analytics for a specific employee (admin/HR/manager function)
  getEmployeeAnalytics: async (employeeId, params = {}) => {
    try {
      const response = await apiClient.get(`/employee/${employeeId}`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get personal analytics (for current user)
  getMyAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/me', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get cost center analytics
  getCostCenterAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/cost-centers', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get benchmark analytics (comparison with industry standards)
  getBenchmarkAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/benchmarks', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get predicted attrition risk analysis
  getAttritionRiskAnalysis: async (params = {}) => {
    try {
      const response = await apiClient.get('/attrition-risk', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get detailed attrition risk for a specific employee (admin/HR/manager function)
  getEmployeeAttritionRisk: async (employeeId) => {
    try {
      const response = await apiClient.get(`/attrition-risk/${employeeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get performance prediction for employees
  getPerformancePrediction: async (params = {}) => {
    try {
      const response = await apiClient.get('/performance-prediction', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get custom analytics by providing specific parameters
  getCustomAnalytics: async (analysisParams) => {
    try {
      const response = await apiClient.post('/custom', analysisParams);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get sentiment analysis from survey results, reviews, etc.
  getSentimentAnalysis: async (params = {}) => {
    try {
      const response = await apiClient.get('/sentiment', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get AI-generated insights for HR dashboard
  getAIInsights: async () => {
    try {
      const response = await apiClient.get('/insights');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get AI-generated recommendations for specific areas
  getRecommendations: async (area) => {
    try {
      const response = await apiClient.get(`/recommendations/${area}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get anomaly detection results in HR data
  getAnomalyDetection: async (params = {}) => {
    try {
      const response = await apiClient.get('/anomalies', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get skills gap analysis
  getSkillsGapAnalysis: async (params = {}) => {
    try {
      const response = await apiClient.get('/skills-gap', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get succession planning analytics
  getSuccessionPlanningAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/succession-planning', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get team composition analysis and recommendations
  getTeamCompositionAnalysis: async (teamId) => {
    try {
      const response = await apiClient.get(`/team-composition/${teamId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get work environment analytics
  getWorkEnvironmentAnalytics: async (params = {}) => {
    try {
      const response = await apiClient.get('/work-environment', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate AI analytics report for download (PDF/Excel)
  generateAnalyticsReport: async (reportParams) => {
    try {
      const response = await apiClient.post('/reports/generate', reportParams, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Save custom analytics dashboard configuration
  saveCustomDashboard: async (dashboardConfig) => {
    try {
      const response = await apiClient.post('/dashboard/custom', dashboardConfig);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get saved custom dashboard configurations
  getCustomDashboards: async () => {
    try {
      const response = await apiClient.get('/dashboard/custom');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Configure analytics settings (admin function)
  updateAnalyticsSettings: async (settingsData) => {
    try {
      const response = await apiClient.put('/settings', settingsData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get current analytics settings
  getAnalyticsSettings: async () => {
    try {
      const response = await apiClient.get('/settings');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default analyticsService; 