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

const TeamSelector = ({ onSelectTeam }) => {
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load teams from API
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoading(true);
        // Get team data from API
        const data = await aiService.getTeamStats();
        
        // Flatten departments and teams for the team list
        const allTeams = [];
        
        data.departments.forEach(dept => {
          dept.teams.forEach(team => {
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
  
  // Get unique departments for filter dropdown
  const departments = ['All', ...new Set(teams.map(team => team.department))];
  
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
              {departments.map(dept => (
                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        {filteredTeams.length > 0 ? (
          <List sx={{ maxHeight: '70vh', overflow: 'auto' }}>
            {filteredTeams.map(team => (
              <React.Fragment key={team.id}>
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