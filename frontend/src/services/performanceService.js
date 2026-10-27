import { createApiClient } from './api';


const performanceAPI = createApiClient('/api/performance');


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
