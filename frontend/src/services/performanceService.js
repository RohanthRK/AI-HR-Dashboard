import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/performance`;

const performanceAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

performanceAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const performanceService = {
  // PIP Endpoints
  getPips: async (params = {}) => {
    const response = await performanceAPI.get('/pips/', { params });
    return response.data;
  },

  createPip: async (pipData) => {
    const response = await performanceAPI.post('/pips/new/', pipData);
    return response.data;
  },

  updatePip: async (pipId, data) => {
    const response = await performanceAPI.patch(`/pips/${pipId}/`, data);
    return response.data;
  }
};

export default performanceService;
