import React, { useState, useEffect } from 'react';
import { 
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
  Button, 
  Typography, 
  Chip, 
  Box, 
  Paper,
  CircularProgress,
  Grid
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
        let data;
        try {
          data = await aiService.getTeamStats();
        } catch (apiError) {
          console.error('API call failed, using mock data:', apiError);
          data = mockTeamsData;
        }
        
        const allTeams = [];
        const deptNames = ['All'];
        
        if (data?.departments) {
          data.departments.forEach(dept => {
            deptNames.push(dept.name);
            dept.teams.forEach(team => {
              allTeams.push({
                id: team.id,
                name: team.name,
                department: dept.name,
                description: `Team in the ${dept.name} department`,
                memberCount: team.employee_count,
                lastReview: null,
                tags: [],
                employees: team.employees
              });
            });
          });
        }
        
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
        team.description.toLowerCase().includes(term)
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
      <Paper elevation={0} sx={{ border: '4px solid #000', borderRadius: 0, p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <CircularProgress size={40} sx={{ mr: 2 }} />
        <Typography>Loading teams...</Typography>
      </Paper>
    );
  }
  
  return (
    <Paper elevation={0} sx={{ border: '4px solid #000', borderRadius: 0, boxShadow: '8px 8px 0px #000', width: '100%' }}>
      <CardHeader 
        title={<Typography variant="h5" sx={{ fontWeight: 900 }}>Select a Team to Review</Typography>} 
        sx={{ bgcolor: '#eee', borderBottom: '4px solid #000' }}
      />
      
      <CardContent>
        <Box sx={{ display: 'flex', gap: 2, mb: 4, flexDirection: { xs: 'column', md: 'row' } }}>
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
              sx: { borderRadius: 0, border: '2px solid #000', fontWeight: 700 }
            }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="department-filter-label" sx={{ fontWeight: 700 }}>Department</InputLabel>
            <Select
              labelId="department-filter-label"
              id="department-filter"
              value={departmentFilter}
              label="Department"
              onChange={handleDepartmentChange}
              sx={{ borderRadius: 0, border: '2px solid #000', fontWeight: 700 }}
            >
              {departments.map((dept, index) => (
                <MenuItem key={`${dept}-${index}`} value={dept}>
                  {dept}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        
        {filteredTeams.length > 0 ? (
          <Grid container spacing={3}>
            {filteredTeams.map((team, index) => (
              <Grid item xs={12} sm={6} key={team.id || index}>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '3px solid #000', 
                    borderRadius: 0,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      bgcolor: '#f5f5f5',
                      transform: 'translate(-2px, -2px)',
                      boxShadow: '4px 4px 0px #000'
                    }
                  }}
                >
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>
                        {team.name}
                      </Typography>
                      <Chip 
                        label={team.department} 
                        size="small"
                        sx={{ borderRadius: 0, fontWeight: 800, border: '2px solid #000', bgcolor: '#fff' }}
                      />
                    </Box>
                    <Box display="flex" alignItems="center" mb={2} color="text.secondary">
                      <PeopleIcon fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {team.memberCount} members
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                      {team.description}
                    </Typography>
                  </Box>
                  <Button 
                    variant="contained" 
                    fullWidth
                    sx={{ 
                      bgcolor: '#000', 
                      color: '#fff', 
                      borderRadius: 0, 
                      fontWeight: 900,
                      border: '2px solid #000',
                      '&:hover': { bgcolor: '#333' }
                    }}
                    onClick={() => onSelectTeam(team)}
                  >
                    Select Team
                  </Button>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box textAlign="center" py={4} bgcolor="#f8f9fa" border="2px dashed #000">
            <Typography variant="h6" sx={{ fontWeight: 800 }}>No teams found</Typography>
            <Button 
              variant="text" 
              sx={{ mt: 1, fontWeight: 900, textDecoration: 'underline' }}
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