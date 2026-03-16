import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Alert, 
  AlertTitle, 
  Box, 
  Card, 
  CardContent, 
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Button
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import TeamSelector from './components/TeamSelector';
import TeamReview from './components/TeamReview';
import PageHeader from '../../components/PageHeader';
import aiService from '../../services/aiService';
import teamService from '../../services/teamService';

const TeamPerformanceReview = () => {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  // Fetch team statistics
  useEffect(() => {
    const fetchTeamStats = async () => {
      try {
        setLoading(true);
        const data = await aiService.getTeamStats();
        setTeamStats(data);
        console.log('Team stats:', data);
        
        // If we have departments, select the first one by default
        if (data.departments && data.departments.length > 0) {
          setSelectedDepartment(data.departments[0]);
        }
      } catch (err) {
        console.error('Error fetching team stats:', err);
        setError('Failed to load team statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamStats();
  }, []);

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    // Reset any previous submission states
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  const handleSubmitReview = async (reviewData) => {
    if (!selectedTeam) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Use teamService to save the review
      console.log('Submitting review for team:', selectedTeam.name, reviewData);
      
      await teamService.createTeamReview({
        ...reviewData,
        team_name: selectedTeam.name,
        team_department: selectedTeam.department,
        reviewer_name: 'Admin', // In a real app, this would come from the authenticated user
        review_date: new Date().toISOString()
      });
      
      // Show success message
      setSubmitSuccess(true);
      setSelectedTeam(null);
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader 
        title="Team Performance Review"
        subtitle="Evaluate team performance across key metrics and provide actionable feedback"
      />

      {submitSuccess && (
        <Alert 
          severity="success" 
          onClose={() => setSubmitSuccess(false)}
          sx={{ mb: 4 }}
        >
          <AlertTitle>Success</AlertTitle>
          Team review submitted successfully! The team will receive your feedback.
        </Alert>
      )}

      {submitError && (
        <Alert 
          severity="error" 
          onClose={() => setSubmitError(null)}
          sx={{ mb: 4 }}
        >
          <AlertTitle>Error</AlertTitle>
          {submitError}
        </Alert>
      )}

      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{ mb: 4 }}
        >
          <AlertTitle>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={10}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Loading team data...
          </Typography>
        </Box>
      ) : (
        <>
          {/* Summary statistics */}
          {teamStats && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {teamStats.total_departments}
                    </Typography>
                    <Typography variant="subtitle1">
                      Departments
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {teamStats.total_teams}
                    </Typography>
                    <Typography variant="subtitle1">
                      Teams
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box textAlign="center">
                    <Typography variant="h4" color="primary">
                      {teamStats.total_employees}
                    </Typography>
                    <Typography variant="subtitle1">
                      Employees
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Team Selector and Review */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={selectedTeam ? 5 : 12} lg={selectedTeam ? 4 : 12}>
          <TeamSelector onSelectTeam={handleTeamSelect} />
        </Grid>
        
        {selectedTeam && (
          <Grid item xs={12} md={7} lg={8}>
            <TeamReview 
              team={selectedTeam}
              onSubmit={handleSubmitReview}
              onCancel={handleCancelReview}
              isSubmitting={isSubmitting}
            />
          </Grid>
        )}

      {!selectedTeam && !submitSuccess && (
              <Grid item xs={12}>
        <Paper 
          elevation={0} 
          sx={{ 
                    mt: 2, 
            p: 5, 
            bgcolor: 'background.default', 
                    textAlign: 'center',
                    width: '100%'
          }}
        >
          <Typography variant="h5" gutterBottom>
            Select a team from the list to begin your review
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your feedback helps teams improve their performance and collaboration
          </Typography>
        </Paper>
              </Grid>
            )}
          </Grid>
        </>
      )}
    </Container>
  );
};

export default TeamPerformanceReview; 