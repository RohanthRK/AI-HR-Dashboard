import { createApiClient } from './api';


const assetAPI = createApiClient('/api/assets');


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



  // Update asset status/details (admin)
  updateAsset: async (assetId, assetData) => {
    try {
      const response = await assetAPI.put(`/${assetId}/`, assetData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add comment/note to asset (admin)
  addComment: async (assetId, comment) => {
    try {
      const response = await assetAPI.patch(`/${assetId}/comment/`, { comment });
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
