import { createApiClient } from './api';


const attendanceAPI = createApiClient('/api/attendance/');


// Service functions for attendance and time tracking
const attendanceService = {
  // Clock in function for the current user
  clockIn: async (location = null) => {
    const data = location ? { location } : {};
    const response = await attendanceAPI.post('clock-in/', data);
    return response.data;
  },

  // Clock out function for the current user
  clockOut: async (notes = '') => {
    const response = await attendanceAPI.post('clock-out/', { notes });
    return response.data;
  },

  // Get current user's attendance status (clocked in or out)
  getStatus: async () => {
    const response = await attendanceAPI.get('status/');
    return response.data;
  },

  // Get current user's attendance history
  getMyAttendance: async (params = {}) => {
    const response = await attendanceAPI.get('me/', { params });
    return response.data;
  },

  // Get current user's attendance for a specific date range
  getMyAttendanceByDateRange: async (startDate, endDate) => {
    const response = await attendanceAPI.get('me/', { params: { startDate, endDate } });
    return response.data;
  },

  // One person's month, day by day, with hours against what is expected (yours when employeeId is omitted)
  getMonth: async (month, employeeId) => {
    const response = await attendanceAPI.get('month/', { params: { month, ...(employeeId ? { employee_id: employeeId } : {}) } });
    return response.data;
  },

  // Everyone's (or the team's) attendance for a period
  getOverview: async (from, to) => {
    const response = await attendanceAPI.get('overview/', { params: { from, to } });
    return response.data;
  },

  // HR: hours per working day expected from one person (null = company default)
  setExpectedHours: async (employeeId, hours) => {
    const response = await attendanceAPI.put(`expected-hours/${employeeId}/`, { hours });
    return response.data;
  },
};

export default attendanceService;
