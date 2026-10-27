import { createApiClient } from './api';




const reviewAPI = createApiClient('/api/reviews');


// Service functions for performance reviews
const reviewService = {




















  // Get reviews assigned to me to complete
  getMyAssignedReviews: async (params = {}) => {
    try {
      const response = await reviewAPI.get('/assigned/me/', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get my performance reviews (reviews about me)
  getMyPerformanceReviews: async (params = {}) => {
    try {
      const response = await reviewAPI.get('/me/', { params });
      return response.data;
    } catch (error) {
      console.error('Error in getMyPerformanceReviews:', error);
      return { results: [], count: 0 };
    }
  },

  // Get review details by ID
  getReviewById: async (reviewId) => {
    try {
      const response = await reviewAPI.get(`/${reviewId}/`);
      return response.data;
    } catch (error) {
      console.error('Error in getReviewById:', error);
      throw error;
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





  // Get all reviews (admin/HR function)
  getAllReviews: async (params = {}) => {
    try {
      const response = await reviewAPI.get('/', { params });
      return response.data;
    } catch (error) {
      console.error('Error in getAllReviews:', error);
      throw error;
    }
  },












































};

export default reviewService; 