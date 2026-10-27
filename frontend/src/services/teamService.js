import api from './api';

// Teams, departments and team reviews. Teams are created and edited from the team form (components/teams/TeamForm.js).
const teamService = {
  getAllTeams: async () => (await api.get('/api/teams/mongodb_list/')).data,

  getAllDepartments: async () => (await api.get('/api/employees/departments/mongodb/')).data,

  getTeamReviews: async () => (await api.get('/api/ai/team-reviews/')).data,

  getTeamReviewsByTeamId: async (teamId) => (await api.get(`/api/ai/team-reviews/${teamId}/`)).data,

  createTeamReview: async (reviewData) => (await api.post('/api/ai/team-reviews/', reviewData)).data,

  updateTeamReview: async (teamId, reviewData) => (await api.put(`/api/ai/team-reviews/${teamId}/`, reviewData)).data,

  deleteTeamReview: async (teamId, reviewId) => (await api.delete(`/api/ai/team-reviews/${teamId}/`, { params: { review_id: reviewId } })).data,
};

export default teamService;
