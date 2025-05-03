import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/recruitment';

// Create axios instance with default config
const recruitmentAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to add JWT token to every request (if needed)
recruitmentAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Assuming token is stored in localStorage
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const recruitmentService = {
  // Function to list job openings (Placeholder)
  getJobs: async (params = {}) => {
    try {
      // Replace with actual endpoint if implemented
      // const response = await recruitmentAPI.get('/jobs/', { params });
      console.warn("getJobs service function is a placeholder.");
      // Return dummy data for now
      return { results: [], count: 0 }; 
    } catch (error) {
      console.error("Error fetching jobs:", error);
      throw error;
    }
  },

  // Function to list candidates for a job (Placeholder)
  getCandidatesForJob: async (jobId, params = {}) => {
    try {
      // Replace with actual endpoint if implemented
      // const response = await recruitmentAPI.get(`/jobs/${jobId}/candidates/`, { params });
      console.warn(`getCandidatesForJob service function for job ${jobId} is a placeholder.`);
      // Return dummy data for now
      return { results: [], count: 0 };
    } catch (error) {
      console.error(`Error fetching candidates for job ${jobId}:`, error);
      throw error;
    }
  },

  // Function to trigger AI resume screening
  triggerAiResumeScreening: async (jobId, candidateId) => {
    try {
      const response = await recruitmentAPI.post(`/jobs/${jobId}/candidates/${candidateId}/screen/`);
      console.log("AI Screening Trigger Response:", response.data);
      return response.data; // Contains { message: '...', job_id: '...', candidate_id: '...' }
    } catch (error) {
      console.error(`Error triggering AI screening for job ${jobId}, candidate ${candidateId}:`, error.response?.data || error.message);
      throw error; // Re-throw the error to be handled by the component
    }
  },

  // TODO: Add functions for creating jobs, adding candidates, etc.
};

export default recruitmentService; 