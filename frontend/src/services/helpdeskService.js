import { createApiClient } from './api';


const helpdeskAPI = createApiClient('/api/helpdesk');


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



  // Add comment to ticket
  addComment: async (ticketId, comment) => {
    try {
      const response = await helpdeskAPI.patch(`/${ticketId}/comment/`, { comment });
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


};

export default helpdeskService;
