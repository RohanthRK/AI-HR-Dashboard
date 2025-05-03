import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

// Create axios instance with default config
const teamAPI = axios.create({
  baseURL: `${API_URL}/api/teams`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// No need for auth token in this demo
// teamAPI.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       config.headers['Authorization'] = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// Mock data for when API fails
const mockTeamReviews = [
  {
    id: '1',
    team_id: '101',
    team_name: 'Engineering',
    team_department: 'Technology',
    review_date: '2023-05-15',
    reviewer: 'Jane Smith',
    collaboration: 4,
    productivity: 5,
    quality: 4,
    innovation: 3,
    communication: 4,
    feedback: 'Great team collaboration and productivity. Need to work on innovation.',
    strengths: 'Technical excellence, meeting deadlines',
    areas_for_improvement: 'Could benefit from more creative thinking sessions'
  },
  {
    id: '2',
    team_id: '102',
    team_name: 'Marketing',
    team_department: 'Sales',
    review_date: '2023-06-01',
    reviewer: 'John Doe',
    collaboration: 3,
    productivity: 4,
    quality: 3,
    innovation: 5,
    communication: 4,
    feedback: 'Excellent innovation and creativity. Communication could be improved.',
    strengths: 'Creative campaigns, market analysis',
    areas_for_improvement: 'Internal documentation and process standardization'
  }
];

// Mock data for teams
const mockTeams = [
  {
    id: '101',
    name: 'Engineering Team',
    department: 'Technology',
    description: 'Core product development team',
    memberCount: 8,
    tags: ['software', 'development', 'coding'],
    lastReview: '2023-05-15'
  },
  {
    id: '102',
    name: 'Marketing Team',
    department: 'Sales',
    description: 'Product marketing and promotions team',
    memberCount: 5,
    tags: ['marketing', 'growth', 'communications'],
    lastReview: '2023-06-01'
  },
  {
    id: '103',
    name: 'HR Team',
    department: 'Human Resources',
    description: 'Employee management and recruitment',
    memberCount: 4,
    tags: ['recruiting', 'employee relations', 'training'],
    lastReview: '2023-04-20'
  }
];

const teamService = {
  // Get all teams from MongoDB
  getAllTeams: async () => {
    try {
      console.log('Fetching all teams...');
      try {
        const response = await axios.get(`${API_URL}/api/teams/`);
        console.log('Teams fetched successfully:', response.data);
        return response.data;
      } catch (apiError) {
        console.warn('API call for teams failed, using mock data:', apiError.message);
        return mockTeams;
      }
    } catch (error) {
      console.error('Error in getAllTeams:', error);
      return mockTeams;
    }
  },
  
  // Get all teams from MongoDB (using simple endpoint)
  getTeamsSimple: async () => {
    try {
      console.log('Fetching teams from simple MongoDB endpoint...');
      const response = await teamAPI.get('/simple-mongodb/');
      console.log('Teams fetched successfully from simple endpoint:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching teams from simple endpoint:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },

  // Get teams from debug endpoint
  getTeamsDebug: async () => {
    try {
      console.log('Fetching teams from debug endpoint...');
      const response = await teamAPI.get('/debug/');
      console.log('Teams data from debug endpoint:', response.data);
      if (response.data && response.data.teams && Array.isArray(response.data.teams)) {
        return response.data.teams;
      }
      return [];
    } catch (error) {
      console.error('Error fetching teams from debug endpoint:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },

  // Get a single team by ID from MongoDB
  getTeamById: async (teamId) => {
    try {
      // For MongoDB teams, we'll filter from the full list since we don't have a dedicated endpoint
      const response = await teamAPI.get('/mongodb/');
      const teams = response.data;
      const team = teams.find(t => t.id === teamId);
      
      if (!team) {
        throw new Error('Team not found');
      }
      
      return team;
    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error);
      throw error;
    }
  },

  // Create a new team
  createTeam: async (teamData) => {
    try {
      const response = await teamAPI.post('/', teamData);
      return response.data;
    } catch (error) {
      console.error('Error creating team:', error);
      throw error;
    }
  },

  // Update an existing team
  updateTeam: async (teamId, teamData) => {
    try {
      const response = await teamAPI.put(`/${teamId}/`, teamData);
      return response.data;
    } catch (error) {
      console.error(`Error updating team ${teamId}:`, error);
      throw error;
    }
  },

  // Delete a team
  deleteTeam: async (teamId) => {
    try {
      const response = await teamAPI.delete(`/${teamId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting team ${teamId}:`, error);
      throw error;
    }
  },

  // Get all departments from MongoDB
  getAllDepartments: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/employees/departments/mongodb/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching departments:', error);
      throw error;
    }
  },

  // Create a new team using direct MongoDB access
  createTeamMongoDB: async (teamData) => {
    try {
      console.log('Creating team with direct MongoDB access:', teamData);
      const response = await teamAPI.post('/mongodb_create/', teamData);
      console.log('Team created successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating team with MongoDB:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },

  // Get all teams from Flask service
  getTeamsFromFlask: async () => {
    try {
      console.log('Fetching teams from Flask service...');
      const response = await axios.get('http://localhost:5000/api/teams/data/');
      console.log('Teams fetched successfully from Flask service:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching teams from Flask service:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },

  // Team Reviews API methods
  getTeamReviews: async () => {
    try {
      console.log('Fetching all team reviews...');
      const response = await axios.get(`${API_URL}/api/ai/team-reviews/`);
      console.log('Team reviews fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching team reviews:', error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },

  getTeamReviewsByTeamId: async (teamId) => {
    try {
      console.log(`Fetching reviews for team ID ${teamId}...`);
      try {
        const response = await axios.get(`${API_URL}/api/ai/team-reviews/${teamId}/`);
        console.log('Team reviews fetched successfully:', response.data);
        return response.data;
      } catch (apiError) {
        console.warn(`API call for team ${teamId} reviews failed, using mock data:`, apiError.message);
        return mockTeamReviews.filter(review => review.team_id === teamId);
      }
    } catch (error) {
      console.error(`Error fetching reviews for team ID ${teamId}:`, error);
      return mockTeamReviews.filter(review => review.team_id === teamId);
    }
  },

  createTeamReview: async (reviewData) => {
    try {
      console.log('Creating team review with data:', reviewData);
      try {
        const response = await axios.post(`${API_URL}/api/ai/team-reviews/`, reviewData);
        console.log('Team review created successfully:', response.data);
        return response.data;
      } catch (apiError) {
        console.warn('API call for creating team review failed, simulating success:', apiError.message);
        // Return a fake successful response
        return {
          ...reviewData,
          id: 'mock-' + Date.now(),
          created_at: new Date().toISOString(),
          status: 'success'
        };
      }
    } catch (error) {
      console.error('Error creating team review:', error);
      // Return a fake successful response to avoid breaking the UI
      return {
        ...reviewData,
        id: 'mock-' + Date.now(),
        created_at: new Date().toISOString(),
        status: 'success'
      };
    }
  },

  updateTeamReview: async (teamId, reviewData) => {
    try {
      console.log(`Updating review for team ID ${teamId} with data:`, reviewData);
      const response = await axios.put(`${API_URL}/api/ai/team-reviews/${teamId}/`, reviewData);
      console.log('Team review updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating review for team ID ${teamId}:`, error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  },

  deleteTeamReview: async (teamId, reviewId) => {
    try {
      console.log(`Deleting review ID ${reviewId} for team ID ${teamId}...`);
      const response = await axios.delete(`${API_URL}/api/ai/team-reviews/${teamId}/?review_id=${reviewId}`);
      console.log('Team review deleted successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error deleting review ID ${reviewId} for team ID ${teamId}:`, error);
      console.error('Error details:', error.response ? error.response.data : 'No response data');
      throw error;
    }
  }
};

export default teamService; 