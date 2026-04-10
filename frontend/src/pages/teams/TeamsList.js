import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Avatar,
  Chip,
  Divider,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Badge,
  Button
} from '@mui/material';
import {
  Person as PersonIcon,
  Group as GroupIcon,
  Search as SearchIcon,
  Info as InfoIcon,
  MoreVert as MoreVertIcon,
  Business as BusinessIcon,
  Add as AddIcon
} from '@mui/icons-material';
import axios from 'axios';
import aiService from '../../services/aiService';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme, alpha } from '@mui/material/styles';

const TeamsList = () => {
  const theme = useTheme();
  const { currentUser, isAdmin, isManager } = useAuth();
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentDepartment, setCurrentDepartment] = useState('All');
  const [teamStats, setTeamStats] = useState(null);

  const isAdminOrManager = isAdmin() || isManager();
  
  // Fetch teams data
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        
        // Fetch real data from API
        const data = await aiService.getTeamStats();
        
        // Format teams from all departments into a flat list
        const allTeams = [];
        data.departments.forEach(dept => {
          dept.teams.forEach(team => {
            allTeams.push({
              id: team.id,
              name: team.name,
              department: dept.name,
              description: `Team from ${dept.name} department`,
              leader: team.employees.length > 0 ? {
                id: team.employees[0].id,
                name: team.employees[0].name,
                position: team.employees[0].position || 'Team Lead'
              } : {
                id: 0,
                name: 'Not Assigned',
                position: 'Team Lead'
              },
              members: team.employees.map(employee => ({
                id: employee.id,
                name: employee.name,
                position: employee.position || 'Team Member'
              })),
              members_count: team.employee_count,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          });
        });
        
        setTeams(allTeams);
        setFilteredTeams(allTeams);
        setTeamStats(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching teams:', err);
        setError('Failed to load teams. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchTeams();
  }, []);
  
  // Filter teams based on search term and department
  useEffect(() => {
    let results = teams;
    
    // Apply department filter
    if (currentDepartment !== 'All') {
      results = results.filter(team => team.department === currentDepartment);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(team => 
        team.name.toLowerCase().includes(term) ||
        team.description.toLowerCase().includes(term) ||
        team.department.toLowerCase().includes(term) ||
        (team.leader && team.leader.name.toLowerCase().includes(term)) ||
        team.members.some(member => member.name.toLowerCase().includes(term))
      );
    }
    
    setFilteredTeams(results);
  }, [searchTerm, currentDepartment, teams]);
  
  // Get unique departments from teams
  const departments = ['All', ...new Set(teams.map(team => team.department))];
  
  // Handle search input changes
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  
  // Handle department tab changes
  const handleDepartmentChange = (event, newValue) => {
    setCurrentDepartment(newValue);
  };
  
  // Group teams by department
  const getTeamsByDepartment = () => {
    const groupedTeams = {};
    
    filteredTeams.forEach(team => {
      if (!groupedTeams[team.department]) {
        groupedTeams[team.department] = [];
      }
      groupedTeams[team.department].push(team);
    });
    
    return groupedTeams;
  };
  
  const teamsByDepartment = getTeamsByDepartment();
  
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h3" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: -1 }}>
          Teams Directory
        </Typography>
        {isAdminOrManager && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            component={Link}
            to="/teams/create"
          >
            Create Team
          </Button>
        )}
      </Box>
      
      {/* Summary statistics */}
      {!loading && teamStats && (
        <Paper className="brutal-border brutal-shadow" sx={{ p: 4, mb: 6, borderRadius: 0, bgcolor: 'background.paper' }}>
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
                <Typography variant="h3" sx={{ fontWeight: 900, mb: 1, color: 'primary.main' }}>
                  {teamStats.total_teams}
                </Typography>
                <Typography variant="subtitle1">
                  Teams
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box textAlign="center">
                <Typography variant="h3" sx={{ fontWeight: 900, mb: 1, color: 'primary.main' }}>
                  {teamStats.total_employees}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                  Employees
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      <Box mb={6}>
        <Paper className="brutal-border brutal-shadow" sx={{ p: 3, borderRadius: 0, bgcolor: 'background.paper' }}>
          <TextField
            fullWidth
            placeholder="Search teams, members, or descriptions..."
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 4 }}
          />
          
          <Tabs
            value={currentDepartment}
            onChange={handleDepartmentChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              '& .MuiTab-root': { fontWeight: 800, textTransform: 'uppercase' }
            }}
          >
            {departments.map(dept => (
              <Tab
                key={dept}
                label={dept}
                value={dept}
                icon={dept !== 'All' ? <BusinessIcon /> : null}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Paper>
      </Box>
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={8}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ my: 4 }}>
          {error}
        </Alert>
      ) : filteredTeams.length === 0 ? (
        <Alert severity="info" sx={{ my: 4 }}>
          No teams found matching your search criteria.
        </Alert>
      ) : (
        currentDepartment === 'All' ? (
          // If showing all departments, group by department
          Object.entries(teamsByDepartment).map(([department, deptTeams]) => (
            <Box key={department} mb={4}>
              <Box display="flex" alignItems="center" mb={2}>
                <BusinessIcon sx={{ mr: 1 }} />
                <Typography variant="h5">{department}</Typography>
                <Chip 
                  label={`${deptTeams.length} ${deptTeams.length === 1 ? 'team' : 'teams'}`} 
                  size="small" 
                  sx={{ ml: 2 }}
                />
              </Box>
              
              <Grid container spacing={3}>
                {deptTeams.map(team => (
                  <Grid item xs={12} md={6} lg={4} key={team.id}>
                    <TeamCard team={team} />
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))
        ) : (
          // If showing a specific department, just list the teams
          <Grid container spacing={3}>
            {filteredTeams.map(team => (
              <Grid item xs={12} md={6} lg={4} key={team.id}>
                <TeamCard team={team} />
              </Grid>
            ))}
          </Grid>
        )
      )}
    </Container>
  );
};

// Team Card Component
const TeamCard = ({ team }) => {
  const theme = useTheme();
  return (
    <Card className="brutal-border brutal-shadow-hover" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 0, position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, bgcolor: 'primary.main' }} />
      <CardHeader
        title={
          <Link to={`/teams/${team.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <Typography variant="h6" sx={{ 
              '&:hover': { 
                color: 'primary.main',
                textDecoration: 'underline'
              }
            }}>
              {team.name}
            </Typography>
          </Link>
        }
        subheader={
          <Box display="flex" alignItems="center" mt={0.5}>
            <Chip 
              label={team.department} 
              size="small" 
              sx={{ 
                fontWeight: 800,
                border: '2px solid',
                borderColor: 'primary.main',
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                borderRadius: 0
              }} 
            />
            <Typography variant="body2" sx={{ ml: 1, fontWeight: 700, color: 'text.secondary' }}>
              {team.members_count} members
            </Typography>
          </Box>
        }
        action={
          <Tooltip title="Team Details">
            <IconButton component={Link} to={`/teams/${team.id}`}>
              <InfoIcon />
            </IconButton>
          </Tooltip>
        }
      />
      
      <Divider />
      
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="text.secondary" paragraph>
          {team.description}
        </Typography>
        
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            Team Lead:
          </Typography>
          <Box display="flex" alignItems="center">
            <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
              {team.leader?.name.charAt(0) || '?'}
            </Avatar>
            <Typography variant="body2">
              {team.leader?.name || 'Not Assigned'} • {team.leader?.position || 'Team Lead'}
            </Typography>
          </Box>
        </Box>
        
        <Typography variant="subtitle2" gutterBottom>
          Team Members:
        </Typography>
        <List dense>
          {team.members.slice(0, 3).map(member => (
            <ListItem key={member.id} disablePadding sx={{ py: 0.5 }}>
              <ListItemAvatar sx={{ minWidth: 36 }}>
                <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                  {member.name.charAt(0)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText 
                primary={member.name}
                secondary={member.position}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
        
        {team.members.length > 3 && (
          <Typography variant="caption" color="text.secondary">
            +{team.members.length - 3} more members
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamsList; 