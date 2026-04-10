import axios from 'axios';

const API_URL = 'http://localhost:8000/api/leaves/';

// Create axios instance with default config
const leaveAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to add JWT token to every request
leaveAPI.interceptors.request.use(
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

// Service functions for leave management
const leaveService = {
  // Get leave types (vacation, sick, personal, etc.)
  getLeaveTypes: async () => {
    try {
      const response = await leaveAPI.get('types/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get leave balance for current user
  getMyLeaveBalance: async () => {
    try {
      const response = await leaveAPI.get('balance/me/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get leave balance for a specific employee (admin/HR function)
  getEmployeeLeaveBalance: async (employeeId) => {
    try {
      const response = await leaveAPI.get(`balance/${employeeId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get leave balances for all employees (admin/HR function)
  getAllLeaveBalances: async (params = {}) => {
    try {
      const response = await leaveAPI.get('balance/', { params });
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

  // Get leave applications for a specific employee (admin/HR/manager function)
  getEmployeeLeaveApplications: async (employeeId, params = {}) => {
    try {
      const response = await leaveAPI.get(`${employeeId}/`, { params });
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

  // Get leave application details by ID
  getLeaveApplicationById: async (leaveId) => {
    try {
      const response = await leaveAPI.get(`${leaveId}/details/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update leave application (only if pending)
  updateLeaveApplication: async (leaveId, leaveData) => {
    try {
      const response = await leaveAPI.put(`${leaveId}/`, leaveData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add/update leave policy (admin/HR function)
  updateLeavePolicy: async (policyData) => {
    try {
      const response = await leaveAPI.put('policy/', policyData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get leave policies (admin/HR function)
  getLeavePolicies: async () => {
    try {
      const response = await leaveAPI.get('policy/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get specific leave policy by ID or type (admin/HR function)
  getLeavePolicy: async (policyId) => {
    try {
      const response = await leaveAPI.get(`policy/${policyId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Adjust leave balance (admin/HR function)
  adjustLeaveBalance: async (employeeId, adjustmentData) => {
    try {
      const response = await leaveAPI.post(`balance/${employeeId}/adjust/`, adjustmentData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get company holidays
  getHolidays: async (year) => {
    try {
      const params = year ? { year } : {};
      const response = await leaveAPI.get('holidays/', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add/update holiday (admin/HR function)
  updateHoliday: async (holidayId, holidayData) => {
    try {
      const response = await leaveAPI.put(`/holidays/${holidayId}/`, holidayData);
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

  // Delete holiday (admin/HR function)
  deleteHoliday: async (holidayId) => {
    try {
      const response = await leaveAPI.delete(`holidays/${holidayId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get leave calendar (all approved leaves for planning)
  getLeaveCalendar: async (params = {}) => {
    try {
      const response = await leaveAPI.get('calendar/', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get department leave calendar (leaves for a specific department)
  getDepartmentLeaveCalendar: async (departmentId, params = {}) => {
    try {
      const response = await leaveAPI.get(`calendar/department/${departmentId}/`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get leave reports (admin/HR function)
  getLeaveReports: async (params = {}) => {
    try {
      const response = await leaveAPI.get('reports/', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate leave report for download (PDF/Excel) (admin/HR function)
  generateLeaveReport: async (reportParams) => {
    try {
      const response = await leaveAPI.post('reports/generate/', reportParams, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Check if leave dates are available (no conflicts)
  checkLeaveAvailability: async (checkData) => {
    try {
      const response = await leaveAPI.post('check-availability/', checkData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create leave type (admin/HR function)
  createLeaveType: async (leaveTypeData) => {
    try {
      const response = await leaveAPI.post('types/', leaveTypeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update leave type (admin/HR function)
  updateLeaveType: async (typeId, leaveTypeData) => {
    try {
      const response = await leaveAPI.put(`types/${typeId}/`, leaveTypeData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete leave type (admin/HR function)
  deleteLeaveType: async (typeId) => {
    try {
      const response = await leaveAPI.delete(`types/${typeId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default leaveService; 