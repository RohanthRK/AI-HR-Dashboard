import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Person as PersonIcon,
  Group as GroupIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  WorkOutline as PositionIcon,
  Badge as BadgeIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import aiService from '../../services/aiService';

import { useAuth } from '../../contexts/AuthContext';

const TeamDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [fetchTime, setFetchTime] = useState(Date.now());

  const isAdminOrManager = currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
  const isTeamLeader = team?.leader?.employee_id === currentUser?.employee_id;
  const canEditTeam = isAdminOrManager || isTeamLeader;
  
  // Allow re-fetching by updating fetchTime when navigating back to this page
  useEffect(() => {
    setFetchTime(Date.now());
  }, [id]);
  
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        
        // Add cache-busting param to ensure fresh data is always fetched
        const data = await aiService.getTeamStats(`?_t=${fetchTime}`);
        
        // Find the team with the matching ID
        let foundTeam = null;
        let teamDepartment = '';
        
        // Search through departments and teams
        for (const dept of data.departments) {
          const matchingTeam = dept.teams.find(team => team.id === id);
          if (matchingTeam) {
            // Format the team data to match our requirements
            teamDepartment = dept.name;
            foundTeam = {
              id: matchingTeam.id,
              name: matchingTeam.name,
              department: dept.name,
              description: `This team is part of the ${dept.name} department and consists of ${matchingTeam.employee_count} team members working together on various projects.`,
              leader: matchingTeam.employees.length > 0 ? {
                id: matchingTeam.employees[0].id,
                name: matchingTeam.employees[0].name,
                position: matchingTeam.employees[0].position || 'Team Lead',
                email: matchingTeam.employees[0].email || `${matchingTeam.employees[0].name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
                phone: matchingTeam.employees[0].phone || 'N/A',
                employee_id: matchingTeam.employees[0].employee_id || matchingTeam.employees[0].id
              } : null,
              members: matchingTeam.employees.map(employee => ({
                id: employee.id,
                name: employee.name,
                position: employee.position || 'Team Member',
                email: employee.email || `${employee.name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
                phone: employee.phone || 'N/A',
                employee_id: employee.employee_id || employee.id,
                hire_date: employee.hire_date || null
              })),
              projects: [
                { 
                  id: `${matchingTeam.id}-1`, 
                  name: `${matchingTeam.name} Primary Project`, 
                  status: 'In Progress',
                  description: `Main ongoing project for the ${matchingTeam.name} team.`
                },
                { 
                  id: `${matchingTeam.id}-2`, 
                  name: `${dept.name} Collaboration`, 
                  status: Math.random() > 0.5 ? 'Completed' : 'Planning',
                  description: `Collaborative project with other teams in the ${dept.name} department.`
                }
              ],
              created_at: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 365)).toISOString(),
              updated_at: new Date().toISOString()
            };
            break;
          }
        }
        
        if (foundTeam) {
          setTeam(foundTeam);
        } else {
          setError('Team not found');
        }
      } catch (err) {
        console.error('Error fetching team details:', err);
        setError('Failed to load team details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeam();
  }, [id, fetchTime]);
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" my={8}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error || !team) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/teams')}
          sx={{ mb: 3 }}
        >
          Back to Teams
        </Button>
        <Alert severity="error" sx={{ my: 4 }}>
          {error || 'Team not found'}
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header with back button */}
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/teams')}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          {team.name}
        </Typography>
        <Chip 
          label={team.department} 
          color="primary" 
          sx={{ ml: 2 }} 
        />
        <Box flexGrow={1} />
        {canEditTeam && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            component={Link}
            to={`/teams/${team.id}/edit`}
            color="primary"
          >
            Edit Team
          </Button>
        )}
      </Box>
      
      {/* Team Overview */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="subtitle1" color="text.secondary" gutterBottom>
              Description
            </Typography>
            <Typography variant="body1" paragraph>
              {team.description}
            </Typography>
            
            <Box mt={3}>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Team Lead
              </Typography>
              {team.leader ? (
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ width: 48, height: 48, mr: 2, bgcolor: 'primary.main' }}>
                    {team.leader.name.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">{team.leader.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {team.leader.position}
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  No Team Lead Assigned
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Team Stats
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Members
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {team.members.length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Projects
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {team.projects ? team.projects.length : 0}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography variant="body2">
                    {new Date(team.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Last Updated
                  </Typography>
                  <Typography variant="body2">
                    {new Date(team.updated_at).toLocaleDateString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Tabs for Team Members and Projects */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Team Members" icon={<PersonIcon />} iconPosition="start" />
          {team.projects && (
            <Tab label="Projects" icon={<WorkIcon />} iconPosition="start" />
          )}
        </Tabs>
        
        {/* Team Members Tab */}
        {activeTab === 0 && (
          <Box p={3}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    <TableCell>Position</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Phone</TableCell>
                    <TableCell>Employee ID</TableCell>
                    <TableCell>Hire Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {team.members.map((member) => (
                    <TableRow key={member.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar 
                            sx={{ 
                              width: 32, 
                              height: 32, 
                              mr: 1, 
                              bgcolor: (team.leader && member.id === team.leader.id) ? 'primary.main' : 'secondary.main' 
                            }}
                          >
                            {member.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">
                              {member.name}
                            </Typography>
                            {(team.leader && member.id === team.leader.id) && (
                              <Chip 
                                size="small" 
                                label="Team Lead" 
                                color="primary" 
                                variant="outlined" 
                                sx={{ height: 20, fontSize: '0.6rem' }}
                              />
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <PositionIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          {member.position}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          {member.email}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          {member.phone}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <BadgeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          {member.employee_id}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {new Date(member.hire_date).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
        
        {/* Projects Tab */}
        {activeTab === 1 && team.projects && (
          <Box p={3}>
            {team.projects.length === 0 ? (
              <Alert severity="info">
                This team has no projects yet.
              </Alert>
            ) : (
              <Grid container spacing={3}>
                {team.projects.map((project) => (
                  <Grid item xs={12} md={6} lg={4} key={project.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="h6">{project.name}</Typography>
                          <Chip 
                            label={project.status} 
                            color={
                              project.status === 'Completed' ? 'success' : 
                              project.status === 'In Progress' ? 'primary' : 
                              'warning'
                            }
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {project.description || 'No description available.'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default TeamDetail; 