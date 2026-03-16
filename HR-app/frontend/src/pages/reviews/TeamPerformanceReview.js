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
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import TeamSelector from './components/TeamSelector';
import TeamReview from './components/TeamReview';
import PageHeader from '../../components/PageHeader';
import aiService from '../../services/aiService';
import teamService from '../../services/teamService';
import { useLocation, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// Mock data in case API fails
const mockTeamsData = {
  total_departments: 5,
  total_teams: 8,
  total_employees: 42,
  departments: [
    {
      id: 1,
      name: "Engineering",
      teams: [
        {
          id: 101,
          name: "Frontend",
          employee_count: 6,
          employees: ["John Doe", "Jane Smith", "Bob Johnson"]
        },
        {
          id: 102,
          name: "Backend",
          employee_count: 5,
          employees: ["Alice Brown", "Tom Wilson"]
        }
      ]
    },
    {
      id: 2,
      name: "Design",
      teams: [
        {
          id: 201,
          name: "UI/UX",
          employee_count: 4,
          employees: ["Sarah Davis", "Mike Taylor"]
        }
      ]
    },
    {
      id: 3,
      name: "Marketing",
      teams: [
        {
          id: 301,
          name: "Digital Marketing",
          employee_count: 3,
          employees: ["Chris Lee", "Emma White"]
        },
        {
          id: 302,
          name: "Social Media",
          employee_count: 2,
          employees: ["David Green"]
        }
      ]
    }
  ]
};

const TeamPerformanceReview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const passedTeam = location.state?.selectedTeam || null;
  
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
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [customTeam, setCustomTeam] = useState({
    name: '',
    department: '',
    description: '',
    memberCount: 0
  });

  // Fetch team statistics
  useEffect(() => {
    // If we already have a selected team from navigation, skip fetching team stats
    if (passedTeam) {
      setLoading(false);
      return;
    }
    
    const fetchTeamStats = async () => {
      try {
        setLoading(true);
        let data;
        try {
          data = await aiService.getTeamStats();
          console.log('Team stats:', data);
        } catch (apiError) {
          console.error('API call failed:', apiError);
          // Use mock data if API fails
          data = mockTeamsData;
        }
        
        setTeamStats({
          total_departments: data.total_departments || data.departments?.length || 0,
          total_teams: data.total_teams || 
            data.departments?.reduce((sum, dept) => sum + dept.teams.length, 0) || 0,
          total_employees: data.total_employees || 
            data.departments?.reduce((sum, dept) => 
              sum + dept.teams.reduce((teamSum, team) => teamSum + (team.employee_count || 0), 0), 0) || 0
        });
        
        // If we have departments, select the first one by default
        if (data.departments && data.departments.length > 0) {
          setSelectedDepartment(data.departments[0]);
        }
      } catch (err) {
        console.error('Error in fetchTeamStats:', err);
        setError('Failed to load team statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamStats();
  }, [passedTeam]);

  const handleTeamSelect = (team) => {
    console.log('Team selected:', team);
    setSelectedTeam(team);
    // Reset any previous submission states
    setSubmitSuccess(false);
    setSubmitError(null);
  };

  const handleOpenCreateDialog = () => {
    setOpenCreateDialog(true);
  };

  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
  };

  const handleCustomTeamChange = (e) => {
    const { name, value } = e.target;
    setCustomTeam({
      ...customTeam,
      [name]: value
    });
  };

  const handleCreateCustomTeam = () => {
    if (!customTeam.name) return;
    
    const newTeam = {
      id: 'custom-' + Date.now(),
      name: customTeam.name,
      department: customTeam.department || 'Custom',
      description: customTeam.description || `Custom team ${customTeam.name}`,
      memberCount: parseInt(customTeam.memberCount) || 0
    };
    
    setSelectedTeam(newTeam);
    setOpenCreateDialog(false);
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

  // Add a back button handler
  const handleBack = () => {
    navigate('/reviews');
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader 
        title="Team Performance Review"
        subtitle="Evaluate team performance across key metrics and provide actionable feedback"
      />

      {/* Add a back button if team was passed in */}
      {passedTeam && (
        <Box mb={3}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={handleBack}
            variant="outlined"
          >
            Back to Reviews
          </Button>
        </Box>
      )}

      {/* Custom Team Creation Dialog */}
      <Dialog open={openCreateDialog} onClose={handleCloseCreateDialog}>
        <DialogTitle>Create Custom Team for Review</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Team Name"
            type="text"
            fullWidth
            required
            value={customTeam.name}
            onChange={handleCustomTeamChange}
          />
          <TextField
            margin="dense"
            name="department"
            label="Department"
            type="text"
            fullWidth
            value={customTeam.department}
            onChange={handleCustomTeamChange}
          />
          <TextField
            margin="dense"
            name="description"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={2}
            value={customTeam.description}
            onChange={handleCustomTeamChange}
          />
          <TextField
            margin="dense"
            name="memberCount"
            label="Number of Members (approximate)"
            type="number"
            fullWidth
            value={customTeam.memberCount}
            onChange={handleCustomTeamChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCreateDialog}>Cancel</Button>
          <Button 
            onClick={handleCreateCustomTeam} 
            color="primary"
            disabled={!customTeam.name}
          >
            Create Team
          </Button>
        </DialogActions>
      </Dialog>

      {submitSuccess && (
        <Alert 
          severity="success" 
          onClose={() => setSubmitSuccess(false)}
          sx={{ mb: 4 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={handleBack}
            >
              Back to Reviews
            </Button>
          }
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

          {/* Team Selector and Review */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={selectedTeam ? 5 : 12} lg={selectedTeam ? 4 : 12}>
              <TeamSelector onSelectTeam={handleTeamSelect} />
              {!selectedTeam && (
                <Box mt={2} display="flex" justifyContent="center">
                  <Button
                    variant="outlined"
                    color="primary"
                    onClick={handleOpenCreateDialog}
                  >
                    Create Custom Team
                  </Button>
                </Box>
              )}
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
                    Select a team from the list or create a custom team to begin your review
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