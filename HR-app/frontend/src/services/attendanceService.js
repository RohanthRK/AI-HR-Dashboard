import axios from 'axios';

const API_URL = 'http://localhost:8000/api/attendance';

// Create axios instance with default config
const attendanceAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to add JWT token to every request
attendanceAPI.interceptors.request.use(
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

// Service functions for attendance and time tracking
const attendanceService = {
  // Clock in function for the current user
  clockIn: async (location = null) => {
    try {
      const data = location ? { location } : {};
      const response = await attendanceAPI.post('/clock-in', data);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Clock out function for the current user
  clockOut: async (notes = '') => {
    try {
      const response = await attendanceAPI.post('/clock-out', { notes });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get current user's attendance status (clocked in or out)
  getStatus: async () => {
    try {
      const response = await attendanceAPI.get('/status');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get current user's attendance history
  getMyAttendance: async (params = {}) => {
    try {
      const response = await attendanceAPI.get('/me', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get current user's attendance for a specific date range
  getMyAttendanceByDateRange: async (startDate, endDate) => {
    try {
      const response = await attendanceAPI.get('/me', {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get current user's summary statistics
  getMyAttendanceSummary: async (month, year) => {
    try {
      const response = await attendanceAPI.get('/me/summary', {
        params: { month, year }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get employee attendance (admin/HR function)
  getEmployeeAttendance: async (employeeId, params = {}) => {
    try {
      const response = await attendanceAPI.get(`/${employeeId}`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get all employees' attendance for a specific date (admin/HR function)
  getDailyAttendance: async (date) => {
    try {
      const response = await attendanceAPI.get('/daily', {
        params: { date }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get all attendance records (admin/HR function)
  getAllAttendance: async (params = {}) => {
    try {
      const response = await attendanceAPI.get('/', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Manually record attendance (admin/HR function)
  recordAttendance: async (attendanceData) => {
    try {
      const response = await attendanceAPI.post('/', attendanceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update attendance record (admin/HR function)
  updateAttendance: async (attendanceId, attendanceData) => {
    try {
      const response = await attendanceAPI.put(`/${attendanceId}`, attendanceData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete attendance record (admin/HR function)
  deleteAttendance: async (attendanceId) => {
    try {
      const response = await attendanceAPI.delete(`/${attendanceId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Start tracking time for a specific task/project
  startTimeTracking: async (taskData) => {
    try {
      const response = await attendanceAPI.post('/time-tracking/start', taskData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Stop tracking time for a specific task/project
  stopTimeTracking: async (timeTrackingId, notes = '') => {
    try {
      const response = await attendanceAPI.post(`/time-tracking/${timeTrackingId}/stop`, { notes });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get current user's time tracking entries
  getMyTimeTracking: async (params = {}) => {
    try {
      const response = await attendanceAPI.get('/time-tracking/me', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get time tracking entries for a specific employee (admin/HR/manager function)
  getEmployeeTimeTracking: async (employeeId, params = {}) => {
    try {
      const response = await attendanceAPI.get(`/time-tracking/${employeeId}`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get all time tracking entries (admin/HR function)
  getAllTimeTracking: async (params = {}) => {
    try {
      const response = await attendanceAPI.get('/time-tracking', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get attendance reports (admin/HR function)
  getAttendanceReports: async (params = {}) => {
    try {
      const response = await attendanceAPI.get('/reports', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Generate attendance report for download (PDF/Excel) (admin/HR function)
  generateAttendanceReport: async (reportParams) => {
    try {
      const response = await attendanceAPI.post('/reports/generate', reportParams, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get overtime data (admin/HR/manager function)
  getOvertimeData: async (params = {}) => {
    try {
      const response = await attendanceAPI.get('/overtime', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Approve overtime request (admin/HR/manager function)
  approveOvertime: async (overtimeId) => {
    try {
      const response = await attendanceAPI.put(`/overtime/${overtimeId}/approve`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Reject overtime request (admin/HR/manager function)
  rejectOvertime: async (overtimeId, reason = '') => {
    try {
      const response = await attendanceAPI.put(`/overtime/${overtimeId}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get attendance settings (shift times, work days, etc.)
  getAttendanceSettings: async () => {
    try {
      const response = await attendanceAPI.get('/settings');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update attendance settings (admin/HR function)
  updateAttendanceSettings: async (settingsData) => {
    try {
      const response = await attendanceAPI.put('/settings', settingsData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get work schedule for current user
  getMyWorkSchedule: async () => {
    try {
      const response = await attendanceAPI.get('/schedule/me');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get work schedule for specific employee (admin/HR function)
  getEmployeeWorkSchedule: async (employeeId) => {
    try {
      const response = await attendanceAPI.get(`/schedule/${employeeId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update work schedule for employee (admin/HR function)
  updateWorkSchedule: async (employeeId, scheduleData) => {
    try {
      const response = await attendanceAPI.put(`/schedule/${employeeId}`, scheduleData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default attendanceService; 