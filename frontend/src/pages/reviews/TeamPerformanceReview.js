import { formatDate } from '../../utils/format';
import React, { useState, useEffect } from 'react';

import {
  Paper,
  Typography,
  Alert,
  AlertTitle,
  Box,
  Divider,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  List,
  ListItem,
  ListItemText,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import GroupsIcon from '@mui/icons-material/Groups';

import AssessmentIcon from '@mui/icons-material/Assessment';

import HistoryEduIcon from '@mui/icons-material/HistoryEdu';

import TeamSelector from './components/TeamSelector';

import TeamReview from './components/TeamReview';

import PageHeader from '../../components/PageHeader';

import aiService from '../../services/aiService';

import teamService from '../../services/teamService';

import employeeService from '../../services/employeeService';

import { useAuth } from '../../contexts/AuthContext';

import { useLocation, useNavigate } from 'react-router-dom';



const TeamPerformanceReview = ({ isComponent = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const passedTeam = location.state?.selectedTeam || null;
  const { currentUser } = useAuth();
  
  const [selectedTeam, setSelectedTeam] = useState(passedTeam);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [teamStats, setTeamStats] = useState({
    total_departments: 0,
    total_teams: 0,
    total_employees: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Past Reviews State
  const [pastReviews, setPastReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const canReview = ['Admin', 'Manager', 'HR'].includes(currentUser?.role);

  const fetchReviews = async () => {
    try {
      let data = await teamService.getTeamReviews();
      const allList = Array.isArray(data) ? data : (data?.results || []);
      
      // Auto-resolve current user's team if needed
      let myTeamName = (currentUser?.team || '').toLowerCase();
      let myTeamId = currentUser?.team_id ? String(currentUser.team_id) : '';

      if (!myTeamName && !myTeamId) {
        try {
          const allEmps = await employeeService.getAllEmployees();
          const me = (allEmps || []).find(e => 
            (currentUser?.email && e.email?.toLowerCase() === currentUser.email.toLowerCase()) || 
            (currentUser?.employee_id && (e.employee_id === currentUser.employee_id || e._id === currentUser.employee_id || e.id === currentUser.employee_id))
          );
          if (me) {
            if (me.team) myTeamName = me.team.toLowerCase();
            if (me.team_id) myTeamId = String(me.team_id);
          }
        } catch (eErr) {
          console.warn('Could not auto-resolve profile for past reviews:', eErr);
        }
      }

      // Filter to reviews for the user's team (unless Admin)
      let filtered = allList;
      if (currentUser?.role !== 'Admin' && (myTeamName || myTeamId)) {
        filtered = allList.filter(r => {
          const rTeamName = (r.team_name || '').toLowerCase();
          const rTeamId = String(r.team_id || '');
          return (myTeamName && rTeamName === myTeamName) || (myTeamId && rTeamId === myTeamId);
        });
      }

      setPastReviews(filtered);
    } catch (err) {
      console.warn('Could not fetch past team reviews:', err);
    }
  };

  useEffect(() => {    
    const fetchData = async () => {
      try {
        setLoading(true);
        let statsData;
        try {
          statsData = await aiService.getTeamStats();
        } catch (apiError) {
          console.error('Stats API call failed:', apiError);
          statsData = { departments: [] };
          setError('Could not load team statistics from the server.');
        }
        
        setTeamStats({
          total_departments: statsData.total_departments || statsData.departments?.length || 0,
          total_teams: statsData.total_teams || 
            statsData.departments?.reduce((sum, dept) => sum + dept.teams.length, 0) || 0,
          total_employees: statsData.total_employees || 
            statsData.departments?.reduce((sum, dept) => 
              sum + dept.teams.reduce((teamSum, team) => teamSum + (team.employee_count || 0), 0), 0) || 0
        });

        await fetchReviews();
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('Failed to load team data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    setSubmitSuccess(false);
    setSubmitError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitReview = async (reviewData) => {
    if (!selectedTeam) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await teamService.createTeamReview({
        ...reviewData,
        team_name: selectedTeam.name,
        team_department: selectedTeam.department,
      });
      
      setSubmitSuccess(true);
      setSelectedTeam(null);
      await fetchReviews();
    } catch (error) {
      console.error('Error submitting team review:', error);
      setSubmitError('Failed to submit team review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelReview = () => {
    setSelectedTeam(null);
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  const calculateReviewScore = (review) => {
    const metrics = ['collaboration', 'productivity', 'quality', 'innovation', 'communication'];
    const scores = review.scores || review;
    const values = metrics.map(m => scores[m]).filter(v => typeof v === 'number');
    if (values.length > 0) {
      return values.reduce((a, b) => a + b, 0) / values.length;
    }
    return null;
  };

  return (
    <Box sx={{ py: isComponent ? 0 : 4, width: '100%', display: 'flex', flexDirection: 'column' }}>
      {!isComponent && (
        <PageHeader 
          title="Team Performance Review"
          subtitle="Evaluate team performance across key metrics and provide actionable feedback"
        />
      )}

      {(error || submitError) && (
        <Alert severity="error" onClose={() => { setError(null); setSubmitError(null); }} sx={{ mb: 3, borderRadius: 0, border: '3px solid #000' }}>
          {submitError || error}
        </Alert>
      )}

      {submitSuccess && (
        <Alert severity="success" onClose={() => setSubmitSuccess(false)} sx={{ mb: 4, variant: 'filled', borderRadius: 0, border: '3px solid #000' }}>
          <AlertTitle sx={{ fontWeight: 900 }}>Success</AlertTitle>
          Team review submitted successfully!
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress color="inherit" thickness={6} />
        </Box>
      ) : (
        <>
          {/* Statistics Bar */}
          <Paper sx={{ p: 0, mb: 6, bgcolor: '#fcc419', border: '4px solid #000', borderRadius: 0, boxShadow: '8px 8px 0px #000', width: '100%' }}>
            <Grid container spacing={2} sx={{ px: 2 }}>
              <Grid item xs={12} sm={4} sx={{ py: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h2" sx={{ fontWeight: 900 }}>{teamStats.total_departments}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Departments</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4} sx={{ py: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h2" sx={{ fontWeight: 900 }}>{teamStats.total_teams}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Teams</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={4} sx={{ py: 3 }}>
                <Box textAlign="center">
                  <Typography variant="h2" sx={{ fontWeight: 900 }}>{teamStats.total_employees}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Employees</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Team Evaluation Form (for Managers & Admins) */}
          {canReview && (
            <Box sx={{ mb: 6, width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, borderBottom: '4px solid #000', pb: 1 }}>
                <GroupsIcon sx={{ mr: 1, fontSize: '2rem' }} />
                <Typography variant="h4" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                  Team Evaluation
                </Typography>
              </Box>
              
              <Grid container spacing={4}>
                <Grid item xs={12} md={selectedTeam ? 5 : 12}>
                  <Box sx={{ width: '100%' }}>
                    <TeamSelector onSelectTeam={handleTeamSelect} />
                  </Box>
                </Grid>
                
                {selectedTeam && (
                  <Grid item xs={12} md={7}>
                    <TeamReview 
                      team={selectedTeam}
                      onSubmit={handleSubmitReview}
                      onCancel={handleCancelReview}
                      isSubmitting={isSubmitting}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {/* Past Team Reviews Section */}
          <Box sx={{ mb: 6, width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, borderBottom: '4px solid #000', pb: 1 }}>
              <HistoryEduIcon sx={{ mr: 1, fontSize: '2rem' }} />
              <Typography variant="h4" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                {canReview ? "Submitted Team Reviews" : "My Team's Performance Reviews"}
              </Typography>
            </Box>

            {pastReviews.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', border: '3px dashed #000', borderRadius: 0, bgcolor: '#f9f9f9' }}>
                <AssessmentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 800 }}>No team reviews recorded yet</Typography>
                <Typography variant="body2" color="textSecondary">
                  {canReview ? "Select your team above to complete their performance evaluation." : "When a review is submitted for your team, it will appear here."}
                </Typography>
              </Paper>
            ) : (
              <Paper sx={{ border: '4px solid #000', borderRadius: 0, boxShadow: '8px 8px 0px #000', overflow: 'hidden' }}>
                <TableContainer>
                  <Table>
                    <TableHead sx={{ bgcolor: '#eee' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 900 }}>Team Name</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Department</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Reviewer</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Score</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pastReviews.map((review, idx) => {
                        const score = calculateReviewScore(review);
                        return (
                          <TableRow key={review.id || review._id || idx} sx={{ '&:hover': { bgcolor: '#fafafa' } }}>
                            <TableCell sx={{ fontWeight: 800 }}>{review.team_name || 'Team'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={review.team_department || 'General'} 
                                size="small" 
                                sx={{ borderRadius: 0, fontWeight: 700, border: '1px solid #000' }} 
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700 }}>{review.reviewer || review.reviewer_name || 'Manager'}</TableCell>
                            <TableCell>
                              {review.review_date || review.created_at ? formatDate(review.review_date || review.created_at) : 'Recent'}
                            </TableCell>
                            <TableCell>
                              {score !== null ? (
                                <Box display="flex" alignItems="center">
                                  <Rating value={score} precision={0.1} readOnly size="small" />
                                  <Typography variant="caption" sx={{ ml: 1, fontWeight: 700 }}>({score.toFixed(1)})</Typography>
                                </Box>
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={review.status || 'Completed'} 
                                size="small" 
                                sx={{ bgcolor: '#40c057', color: '#000', fontWeight: 800, borderRadius: 0 }} 
                              />
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="outlined" 
                                size="small"
                                sx={{ 
                                  fontWeight: 800, 
                                  borderRadius: 0, 
                                  border: '2px solid #000', 
                                  color: '#000',
                                  '&:hover': { bgcolor: '#000', color: '#fff' }
                                }}
                                onClick={() => {
                                  setSelectedReview(review);
                                  setDetailsOpen(true);
                                }}
                              >
                                View Review
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}
          </Box>
        </>
      )}

      {/* Review Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { border: '4px solid #000', borderRadius: 0 } }}
      >
        <DialogTitle sx={{ bgcolor: '#fcc419', borderBottom: '3px solid #000', pb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
              Team Evaluation: {selectedReview?.team_name}
            </Typography>
            <Chip 
              label={selectedReview?.team_department || 'Team'} 
              sx={{ bgcolor: '#fff', fontWeight: 900, border: '2px solid #000' }} 
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          {selectedReview && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={5}>
                <Box mb={3}>
                  <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 700 }}>REVIEWER</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{selectedReview.reviewer || selectedReview.reviewer_name || 'Manager'}</Typography>
                </Box>
                <Box mb={3}>
                  <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 700 }}>OVERALL RATING</Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Rating value={calculateReviewScore(selectedReview)} precision={0.1} readOnly size="large" />
                    <Typography variant="h5" sx={{ ml: 2, fontWeight: 900 }}>{calculateReviewScore(selectedReview)?.toFixed(1)} / 5.0</Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, textTransform: 'uppercase' }}>Competency Scores</Typography>
                <List dense>
                  {['collaboration', 'productivity', 'quality', 'innovation', 'communication'].map((metric) => {
                    const scoreSrc = selectedReview.scores || selectedReview;
                    const val = scoreSrc[metric] || 0;
                    return (
                      <ListItem key={metric} sx={{ px: 0 }}>
                        <ListItemText 
                          primary={<Typography sx={{ textTransform: 'capitalize', fontWeight: 700 }}>{metric}</Typography>}
                          secondary={<Rating value={val} size="small" readOnly />}
                        />
                        <Typography sx={{ fontWeight: 900 }}>{val} / 5</Typography>
                      </ListItem>
                    );
                  })}
                </List>
              </Grid>
              <Grid item xs={12} md={7}>
                <Box mb={3}>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase' }}>Feedback</Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9', border: '2px solid #ddd', borderRadius: 0 }}>
                    <Typography>{selectedReview.feedback || 'No feedback provided.'}</Typography>
                  </Paper>
                </Box>
                {selectedReview.strengths && (
                  <Box mb={3}>
                    <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, color: 'success.main', textTransform: 'uppercase' }}>Key Strengths</Typography>
                    <Typography>{selectedReview.strengths}</Typography>
                  </Box>
                )}
                {selectedReview.areas_for_improvement && (
                  <Box mb={3}>
                    <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, color: 'warning.main', textTransform: 'uppercase' }}>Areas For Improvement</Typography>
                    <Typography>{selectedReview.areas_for_improvement}</Typography>
                  </Box>
                )}
                <Box mt={3} pt={2} borderTop="1px solid #ddd">
                  <Typography variant="caption" color="textSecondary">REVIEW DATE: </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>
                    {selectedReview.review_date || selectedReview.created_at ? formatDate(selectedReview.review_date || selectedReview.created_at) : 'N/A'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '2px solid #000' }}>
          <Button 
            onClick={() => setDetailsOpen(false)} 
            variant="contained" 
            sx={{ bgcolor: '#000', color: '#fff', fontWeight: 900, borderRadius: 0, px: 4 }}
          >
            CLOSE
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamPerformanceReview;