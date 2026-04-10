import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/helpdesk`;

// Create axios instance with default config
const helpdeskAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to add JWT token to every request
helpdeskAPI.interceptors.request.use(
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

const helpdeskService = {
  // Get all tickets (filtered by department/role on backend)
  getAllTickets: async () => {
    try {
      const response = await helpdeskAPI.get('/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new ticket
  createTicket: async (ticketData) => {
    try {
      const response = await helpdeskAPI.post('/', ticketData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get ticket by ID
  getTicketById: async (ticketId) => {
    try {
      const response = await helpdeskAPI.get(`/${ticketId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add comment to ticket
  addComment: async (ticketId, comment) => {
    try {
      const response = await helpdeskAPI.patch(`/${ticketId}/comment`, { comment });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update ticket status (IT/Admin)
  updateTicket: async (ticketId, ticketData) => {
    try {
      const response = await helpdeskAPI.patch(`/${ticketId}/`, ticketData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete ticket (Admin)
  deleteTicket: async (ticketId) => {
    try {
      const response = await helpdeskAPI.delete(`/${ticketId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default helpdeskService;
