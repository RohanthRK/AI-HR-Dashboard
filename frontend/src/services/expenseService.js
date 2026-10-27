import { createApiClient } from './api';


const expenseAPI = createApiClient('/api/expenses');


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



  // Update expense status (admin/manager)
  updateExpenseStatus: async (expenseId, statusData) => {
    try {
      const response = await expenseAPI.patch(`/${expenseId}/`, statusData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Add comment to expense claim
  addComment: async (expenseId, comment) => {
    try {
      const response = await expenseAPI.patch(`/${expenseId}/comment/`, { comment });
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
