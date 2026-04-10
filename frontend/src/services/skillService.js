import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/skills`;

const skillAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

skillAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const skillService = {
  // Get all master skills
  getMasterSkills: async () => {
    const response = await skillAPI.get('/');
    return response.data;
  },

  // Get skills for a specific employee
  getEmployeeSkills: async (employeeId) => {
    const response = await skillAPI.get(`/employee/${employeeId}/`);
    return response.data;
  },

  // Update skills for an employee
  updateSkills: async (employeeId, skills) => {
    const response = await skillAPI.put(`/employee/${employeeId}/update/`, { skills });
    return response.data;
  }
};

export default skillService;
