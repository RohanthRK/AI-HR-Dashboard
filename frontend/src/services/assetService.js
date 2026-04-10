import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/assets`;

// Create axios instance with default config
const assetAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to add JWT token to every request
assetAPI.interceptors.request.use(
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

const assetService = {
  // Get all assets
  getAllAssets: async () => {
    try {
      const response = await assetAPI.get('/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new asset
  createAsset: async (assetData) => {
    try {
      const response = await assetAPI.post('/', assetData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get asset by ID
  getAssetById: async (assetId) => {
    try {
      const response = await assetAPI.get(`/${assetId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update asset status (admin/manager)
  updateAsset: async (assetId, assetData) => {
    try {
      const response = await assetAPI.put(`/${assetId}/`, assetData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete asset
  deleteAsset: async (assetId) => {
    try {
      const response = await assetAPI.delete(`/${assetId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default assetService;
