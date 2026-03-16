import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  TextField, 
  InputAdornment, 
  MenuItem,
  Select, 
  FormControl, 
  InputLabel,
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction,
  Button, 
  Typography, 
  Chip, 
  Box, 
  Paper,
  IconButton,
  Divider,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import aiService from '../../../services/aiService';

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

const TeamSelector = ({ onSelectTeam }) => {
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [departments, setDepartments] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load teams from API
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        // Get team data from API
        let data;
        try {
          data = await aiService.getTeamStats();
          console.log('Team stats from API:', data);
        } catch (apiError) {
          console.error('API call failed, using mock data:', apiError);
          data = mockTeamsData;
          console.log('Using mock data:', data);
        }
        
        // Flatten departments and teams for the team list
        const allTeams = [];
        const deptNames = ['All'];
        
        if (data?.departments) {
          console.log('Number of departments:', data.departments.length);
          
          data.departments.forEach(dept => {
            deptNames.push(dept.name);
            console.log('Department:', dept.name, 'with', dept.teams.length, 'teams');
            
            dept.teams.forEach(team => {
              console.log('Adding team:', team.name);
              allTeams.push({
                id: team.id,
                name: team.name,
                department: dept.name,
                description: `Team in the ${dept.name} department`,
                memberCount: team.employee_count,
                lastReview: null, // We don't have this data yet
                tags: [], // We don't have tags yet
                employees: team.employees
              });
            });
          });
        } else {
          console.error('No departments found in data');
        }
        
        console.log('Final departments list:', deptNames);
        console.log('Final teams list:', allTeams);
        
        setDepartments(deptNames);
        setTeams(allTeams);
        setFilteredTeams(allTeams);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching teams:', error);
        setError('Failed to load team data. Please try again later.');
        setLoading(false);
      }
    };
    
    fetchTeams();
  }, []);
  
  // Filter teams based on search term and department
  useEffect(() => {
    let results = teams;
    
    if (departmentFilter !== 'All') {
      results = results.filter(team => team.department === departmentFilter);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(team => 
        team.name.toLowerCase().includes(term) || 
        team.description.toLowerCase().includes(term) ||
        (team.tags && team.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }
    
    setFilteredTeams(results);
  }, [searchTerm, departmentFilter, teams]);
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleDepartmentChange = (e) => {
    setDepartmentFilter(e.target.value);
  };
  
  if (loading) {
    return (
      <Paper elevation={2} sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
        <CircularProgress size={40} sx={{ mr: 2 }} />
        <Typography>Loading teams...</Typography>
      </Paper>
    );
  }
  
  if (error) {
    return (
      <Paper elevation={2} sx={{ height: '100%', p: 3 }}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button variant="outlined" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Paper>
    );
  }
  
  return (
    <Paper elevation={2} sx={{ height: '100%' }}>
      <CardHeader 
        title="Select a Team to Review" 
        sx={{ bgcolor: 'background.default' }}
      />
      
      <CardContent>
        {/* Debug Info - REMOVED */}
        
        <Box mb={3}>
          <TextField
            fullWidth
            placeholder="Search teams..."
            value={searchTerm}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        
        <Box mb={3}>
          <FormControl fullWidth>
            <InputLabel id="department-filter-label">Department</InputLabel>
            <Select
              labelId="department-filter-label"
              id="department-filter"
              value={departmentFilter}
              label="Department"
              onChange={handleDepartmentChange}
            >
              {departments.map((dept, index) => (
                <MenuItem key={`${dept}-${index}`} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        {/* Hardcoded Teams for Testing */}
        {filteredTeams.length === 0 && (
          <Box mt={3} p={2} border="1px solid #eee" borderRadius={1}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Demo Teams:
            </Typography>
            <List>
              {mockTeamsData.departments.map(dept => 
                dept.teams.map((team, idx) => (
                  <ListItem key={`demo-${dept.name}-${idx}`} divider>
                    <Box width="100%">
                      <Box display="flex" justifyContent="space-between">
                        <Box>
                          <Typography variant="subtitle1">{team.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {dept.name} • {team.employee_count} members
                          </Typography>
                        </Box>
                        <Button 
                          variant="outlined" 
                          size="small"
                          onClick={() => onSelectTeam({
                            id: team.id,
                            name: team.name,
                            department: dept.name,
                            description: `Team in the ${dept.name} department`,
                            memberCount: team.employee_count,
                            employees: team.employees
                          })}
                        >
                          Select
                        </Button>
                      </Box>
                    </Box>
                  </ListItem>
                ))
              )}
            </List>
          </Box>
        )}
        
        {filteredTeams.length > 0 ? (
          <List sx={{ maxHeight: '70vh', overflow: 'auto' }}>
            {filteredTeams.map((team, index) => (
              <React.Fragment key={team.id || index}>
                <ListItem 
                  alignItems="flex-start" 
                  sx={{ 
                    py: 2,
                    borderLeft: '3px solid transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderLeftColor: 'primary.main',
                      bgcolor: 'rgba(25, 118, 210, 0.04)'
                    }
                  }}
                >
                  <Box width="100%">
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {team.name}
                        </Typography>
                        <Box display="flex" alignItems="center" mb={1} color="text.secondary">
                          <Typography variant="body2" mr={2}>
                            {team.department}
                          </Typography>
                          <Box display="flex" alignItems="center">
                            <PeopleIcon fontSize="small" sx={{ mr: 0.5 }} />
                            <Typography variant="body2">
                              {team.memberCount} members
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {team.description}
                        </Typography>
                        <Box mt={1}>
                          {team.tags && team.tags.map((tag, idx) => (
                            <Chip 
                              key={idx} 
                              label={tag} 
                              size="small" 
                              variant="outlined" 
                              sx={{ mr: 0.5, mb: 0.5 }} 
                            />
                          ))}
                        </Box>
                      </Box>
                      <Box ml={2}>
                        <Button 
                          variant="outlined" 
                          size="small" 
                          onClick={() => onSelectTeam(team)}
                        >
                          Select
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </ListItem>
                <Divider component="li" />
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box textAlign="center" py={4} color="text.secondary">
            <Typography variant="body1" gutterBottom>
              No teams found matching your criteria.
            </Typography>
            <Button 
              variant="outlined" 
              sx={{ mt: 2 }}
              onClick={() => {
                setSearchTerm('');
                setDepartmentFilter('All');
              }}
            >
              Reset Filters
            </Button>
          </Box>
        )}
      </CardContent>
    </Paper>
  );
};

export default TeamSelector; 