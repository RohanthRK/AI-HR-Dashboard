import axios from 'axios';

const API_URL = 'http://localhost:8000/api/reviews';

// Mock data for development/fallback
const mockReviews = [
  { 
    _id: '1',
    id: '1',
    period: 'Q1 2023', 
    reviewer_name: 'Jane Smith',
    reviewer_id: '101',
    employee_id: '201',
    status: 'Completed', 
    rating: 4.5,
    review_date: '2023-03-15'
  },
  { 
    _id: '2',
    id: '2',
    period: 'Q2 2023', 
    reviewer_name: 'John Doe',
    reviewer_id: '102',
    employee_id: '202',
    status: 'Pending', 
    rating: null,
    review_date: null
  },
  { 
    _id: '3',
    id: '3',
    period: 'Q3 2023', 
    reviewer_name: 'Michael Johnson',
    reviewer_id: '103',
    employee_id: '203',
    status: 'In Progress', 
    rating: null,
    review_date: null
  },
];

// Create axios instance with default config
const reviewAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to add JWT token to every request
reviewAPI.interceptors.request.use(
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

// Service functions for performance reviews
const reviewService = {
  // Get review cycles
  getReviewCycles: async (params = {}) => {
    try {
      const response = await reviewAPI.get('/cycles', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get active review cycle
  getActiveReviewCycle: async () => {
    try {
      const response = await reviewAPI.get('/cycles/active');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new review cycle (admin/HR function)
  createReviewCycle: async (cycleData) => {
    try {
      const response = await reviewAPI.post('/cycles', cycleData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update review cycle (admin/HR function)
  updateReviewCycle: async (cycleId, cycleData) => {
    try {
      const response = await reviewAPI.put(`/cycles/${cycleId}`, cycleData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete review cycle (admin/HR function)
  deleteReviewCycle: async (cycleId) => {
    try {
      const response = await reviewAPI.delete(`/cycles/${cycleId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get review templates (admin/HR function)
  getReviewTemplates: async () => {
    try {
      const response = await reviewAPI.get('/templates');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get review template by ID (admin/HR function)
  getReviewTemplateById: async (templateId) => {
    try {
      const response = await reviewAPI.get(`/templates/${templateId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create review template (admin/HR function)
  createReviewTemplate: async (templateData) => {
    try {
      const response = await reviewAPI.post('/templates', templateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update review template (admin/HR function)
  updateReviewTemplate: async (templateId, templateData) => {
    try {
      const response = await reviewAPI.put(`/templates/${templateId}`, templateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete review template (admin/HR function)
  deleteReviewTemplate: async (templateId) => {
    try {
      const response = await reviewAPI.delete(`/templates/${templateId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get reviews assigned to me to complete
  getMyAssignedReviews: async (params = {}) => {
    try {
      const response = await reviewAPI.get('/assigned/me', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get my performance reviews (reviews about me)
  getMyPerformanceReviews: async (params = {}) => {
    try {
      try {
        const response = await reviewAPI.get('/me', { params });
        return response.data;
      } catch (apiError) {
        console.warn('API call for my reviews failed, using mock data:', apiError.message);
        // Return mock reviews
        return mockReviews;
      }
    } catch (error) {
      console.error('Error in getMyPerformanceReviews:', error);
      // Return mock data as fallback
      return mockReviews;
    }
  },

  // Get review details by ID
  getReviewById: async (reviewId) => {
    try {
      try {
        const response = await reviewAPI.get(`/${reviewId}`);
        return response.data;
      } catch (apiError) {
        console.warn(`API call for review ${reviewId} failed, using mock data:`, apiError.message);
        // Return a mock review for the given ID
        return mockReviews.find(r => r.id === reviewId || r._id === reviewId) || {
          _id: reviewId,
          id: reviewId,
          period: 'Current',
          reviewer_name: 'System',
          status: 'Pending',
          rating: null,
          review_date: null
        };
      }
    } catch (error) {
      console.error('Error in getReviewById:', error);
      // Return a basic mock review as fallback
      return {
        _id: reviewId,
        id: reviewId,
        period: 'Current',
        reviewer_name: 'System',
        status: 'Pending',
        rating: null,
        review_date: null
      };
    }
  },

  // Submit/update review
  submitReview: async (reviewId, reviewData) => {
    try {
      const response = await reviewAPI.put(`/${reviewId}/submit/`, reviewData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Save review draft
  saveReviewDraft: async (reviewId, draftData) => {
    try {
      const response = await reviewAPI.put(`/${reviewId}/draft/`, draftData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Assign reviews to employees (admin/HR function)
  assignReviews: async (assignmentData) => {
    try {
      const response = await reviewAPI.post('/assign', assignmentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get all reviews (admin/HR function)
  getAllReviews: async (params = {}) => {
    try {
      console.log('Attempting to fetch reviews from API');
      try {
        const response = await reviewAPI.get('/', { params });
        console.log('API response successful:', response.data);
        return response.data;
      } catch (apiError) {
        console.warn('API call failed, using mock data:', apiError.message);
        // Return mock data when API fails
        return mockReviews;
      }
    } catch (error) {
      console.error('Error in getAllReviews:', error);
      // Return mock data as a fallback
      return mockReviews;
    }
  },

  // Get pending reviews (admin/HR function)
  getPendingReviews: async (params = {}) => {
    try {
      const response = await reviewAPI.get('/pending', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get completed reviews (admin/HR function)
  getCompletedReviews: async (params = {}) => {
    try {
      const response = await reviewAPI.get('/completed', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get reviews for a specific employee (admin/HR/manager function)
  getEmployeeReviews: async (employeeId, params = {}) => {
    try {
      const response = await reviewAPI.get(`/employee/${employeeId}`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Finalize review (admin/HR function)
  finalizeReview: async (reviewId, finalizeData = {}) => {
    try {
      const response = await reviewAPI.put(`/${reviewId}/finalize`, finalizeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get review status
  getReviewStatus: async (reviewId) => {
    try {
      const response = await reviewAPI.get(`/${reviewId}/status`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get review statistics (admin/HR function)
  getReviewStatistics: async (cycleId, params = {}) => {
    try {
      const response = await reviewAPI.get(`/statistics/${cycleId}`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add reviewer to an existing review (admin/HR function)
  addReviewer: async (reviewId, reviewerData) => {
    try {
      const response = await reviewAPI.post(`/${reviewId}/reviewers`, reviewerData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Remove reviewer from an existing review (admin/HR function)
  removeReviewer: async (reviewId, reviewerId) => {
    try {
      const response = await reviewAPI.delete(`/${reviewId}/reviewers/${reviewerId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get review competencies/skills
  getReviewCompetencies: async () => {
    try {
      const response = await reviewAPI.get('/competencies');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new competency/skill (admin/HR function)
  createCompetency: async (competencyData) => {
    try {
      const response = await reviewAPI.post('/competencies', competencyData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update competency/skill (admin/HR function)
  updateCompetency: async (competencyId, competencyData) => {
    try {
      const response = await reviewAPI.put(`/competencies/${competencyId}`, competencyData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete competency/skill (admin/HR function)
  deleteCompetency: async (competencyId) => {
    try {
      const response = await reviewAPI.delete(`/competencies/${competencyId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get calibration sessions (admin/HR/manager function)
  getCalibrationSessions: async (params = {}) => {
    try {
      const response = await reviewAPI.get('/calibration', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create calibration session (admin/HR function)
  createCalibrationSession: async (sessionData) => {
    try {
      const response = await reviewAPI.post('/calibration', sessionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update calibration session (admin/HR function)
  updateCalibrationSession: async (sessionId, sessionData) => {
    try {
      const response = await reviewAPI.put(`/calibration/${sessionId}`, sessionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete calibration session (admin/HR function)
  deleteCalibrationSession: async (sessionId) => {
    try {
      const response = await reviewAPI.delete(`/calibration/${sessionId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate review reports (admin/HR function)
  generateReviewReport: async (reportParams) => {
    try {
      const response = await reviewAPI.post('/reports/generate', reportParams, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee performance over time (admin/HR/manager function)
  getEmployeePerformanceHistory: async (employeeId, params = {}) => {
    try {
      const response = await reviewAPI.get(`/history/${employeeId}`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Set review goals
  setReviewGoals: async (reviewId, goalsData) => {
    try {
      const response = await reviewAPI.put(`/${reviewId}/goals`, goalsData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get review goals
  getReviewGoals: async (reviewId) => {
    try {
      const response = await reviewAPI.get(`/${reviewId}/goals`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Acknowledge review (employee)
  acknowledgeReview: async (reviewId, acknowledgementData = {}) => {
    try {
      const response = await reviewAPI.put(`/${reviewId}/acknowledge`, acknowledgementData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get review feedback from AI system
  getAIFeedbackSuggestions: async (reviewData) => {
    try {
      const response = await reviewAPI.post('/ai-suggestions', reviewData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default reviewService; 