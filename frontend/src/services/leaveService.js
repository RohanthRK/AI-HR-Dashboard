import { createApiClient } from './api';


const leaveAPI = createApiClient('/api/leaves/');


// Service functions for leave management
const leaveService = {


  // Get leave balance for current user
  getMyLeaveBalance: async () => {
    try {
      const response = await leaveAPI.get('balance/me/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },





  // Apply for leave
  applyForLeave: async (leaveData) => {
    try {
      const response = await leaveAPI.post('apply/', leaveData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Cancel leave application
  cancelLeaveApplication: async (leaveId) => {
    try {
      const response = await leaveAPI.put(`${leaveId}/cancel/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get my leave applications
  getMyLeaveApplications: async (params = {}) => {
    try {
      const response = await leaveAPI.get('me/', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },



  // Get all leave applications (admin/HR function)
  getAllLeaveApplications: async (params = {}) => {
    try {
      const response = await leaveAPI.get('', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get pending leave applications to be approved (admin/HR/manager function)
  getPendingLeaveApplications: async (params = {}) => {
    try {
      const response = await leaveAPI.get('pending/', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Approve leave application (admin/HR/manager function)
  approveLeaveApplication: async (leaveId, approvalData = {}) => {
    try {
      const response = await leaveAPI.put(`${leaveId}/approve/`, approvalData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Reject leave application (admin/HR/manager function)
  rejectLeaveApplication: async (leaveId, rejectionData) => {
    try {
      const response = await leaveAPI.put(`${leaveId}/reject/`, rejectionData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

















  // Add new holiday (admin/HR function)
  addHoliday: async (holidayData) => {
    try {
      const response = await leaveAPI.post('holidays/', holidayData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },


















};

export default leaveService; 