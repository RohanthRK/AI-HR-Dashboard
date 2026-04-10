import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/expenses`;

// Create axios instance with default config
const expenseAPI = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add interceptor to add JWT token to every request
expenseAPI.interceptors.request.use(
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

const expenseService = {
  // Get all expenses
  getAllExpenses: async () => {
    try {
      const response = await expenseAPI.get('/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Create new expense
  createExpense: async (expenseData) => {
    try {
      const response = await expenseAPI.post('/', expenseData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Get expense by ID
  getExpenseById: async (expenseId) => {
    try {
      const response = await expenseAPI.get(`/${expenseId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Update expense status (admin/manager)
  updateExpenseStatus: async (expenseId, statusData) => {
    try {
      const response = await expenseAPI.patch(`/${expenseId}/`, statusData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Delete expense
  deleteExpense: async (expenseId) => {
    try {
      const response = await expenseAPI.delete(`/${expenseId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default expenseService;
