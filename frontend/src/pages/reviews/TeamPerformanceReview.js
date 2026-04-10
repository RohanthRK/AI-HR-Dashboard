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
  Divider,
  CircularProgress,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import TeamSelector from './components/TeamSelector';
import TeamReview from './components/TeamReview';
import PageHeader from '../../components/PageHeader';
import aiService from '../../services/aiService';
import teamService from '../../services/teamService';
import { useLocation, useNavigate } from 'react-router-dom';

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
    }
  ]
};

const TeamPerformanceReview = ({ isComponent = false }) => {
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
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [customTeam, setCustomTeam] = useState({
    name: '',
    department: '',
    description: '',
    memberCount: 0
  });

  // Fetch team statistics
  useEffect(() => {    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        let statsData;
        try {
          statsData = await aiService.getTeamStats();
        } catch (apiError) {
          console.error('Stats API call failed:', apiError);
          statsData = mockTeamsData;
        }
        
        setTeamStats({
          total_departments: statsData.total_departments || statsData.departments?.length || 0,
          total_teams: statsData.total_teams || 
            statsData.departments?.reduce((sum, dept) => sum + dept.teams.length, 0) || 0,
          total_employees: statsData.total_employees || 
            statsData.departments?.reduce((sum, dept) => 
              sum + dept.teams.reduce((teamSum, team) => teamSum + (team.employee_count || 0), 0), 0) || 0
        });

      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('Failed to load team data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
    setSubmitSuccess(false);
    setSubmitError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      await teamService.createTeamReview({
        ...reviewData,
        team_name: selectedTeam.name,
        team_department: selectedTeam.department,
      });
      
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
    <Box sx={{ py: isComponent ? 0 : 4, width: '100%', display: 'flex', flexDirection: 'column' }}>
      {!isComponent && (
        <PageHeader 
          title="Team Performance Review"
          subtitle="Evaluate team performance across key metrics and provide actionable feedback"
        />
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
          {/* Statistics Bar - FULL WIDTH */}
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

          {/* Team Evaluation Section */}
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
                  {!selectedTeam && (
                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                      <Button 
                        variant="contained" 
                        onClick={handleOpenCreateDialog} 
                        startIcon={<GroupsIcon />}
                        sx={{ 
                          bgcolor: '#000', 
                          color: '#fff', 
                          fontWeight: 900,
                          borderRadius: 0,
                          px: 6,
                          py: 1.5,
                          border: '2px solid #000',
                          '&:hover': { bgcolor: '#333' }
                        }}
                      >
                        Create Custom Team for Review
                      </Button>
                    </Box>
                  )}
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
        </>
      )}

      {/* Dialog for custom team */}
      <Dialog 
        open={openCreateDialog} 
        onClose={handleCloseCreateDialog}
        PaperProps={{ sx: { border: '4px solid #000', borderRadius: 0, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Create Custom Team for Review</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus margin="dense" name="name" label="Team Name" fullWidth required
            value={customTeam.name} onChange={handleCustomTeamChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense" name="department" label="Department" fullWidth
            value={customTeam.department} onChange={handleCustomTeamChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense" name="description" label="Description" fullWidth multiline rows={2}
            value={customTeam.description} onChange={handleCustomTeamChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense" name="memberCount" label="Expected Size" type="number" fullWidth
            value={customTeam.memberCount} onChange={handleCustomTeamChange}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseCreateDialog} sx={{ fontWeight: 800, color: '#000' }}>Cancel</Button>
          <Button 
            onClick={handleCreateCustomTeam} 
            variant="contained" 
            sx={{ bgcolor: '#000', color: '#fff', fontWeight: 900, borderRadius: 0, border: '2px solid #000' }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeamPerformanceReview;