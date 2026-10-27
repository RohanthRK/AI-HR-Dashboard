import { createApiClient } from './api';


const skillAPI = createApiClient('/api/skills');


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
