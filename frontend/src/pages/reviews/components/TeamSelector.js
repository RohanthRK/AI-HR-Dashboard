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
  Button,
  Typography,
  Chip,
  Box,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import SearchIcon from '@mui/icons-material/Search';

import PeopleIcon from '@mui/icons-material/People';

import aiService from '../../../services/aiService';

import teamService from '../../../services/teamService';

import employeeService from '../../../services/employeeService';

import { useAuth } from '../../../contexts/AuthContext';



const TeamSelector = ({ onSelectTeam }) => {
  const { currentUser } = useAuth();
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
        let allTeams = [];
        const deptNames = ['All'];

        // 1. Fetch real teams directly from MongoDB
        try {
          const dbTeams = await teamService.getAllTeams();
          const teamList = Array.isArray(dbTeams) ? dbTeams : (dbTeams.teams || []);
          teamList.forEach(dt => {
            const deptName = dt.department_name || dt.department || 'General';
            if (!deptNames.includes(deptName)) deptNames.push(deptName);
            
            allTeams.push({
              id: dt.id || dt._id,
              name: dt.name,
              department: deptName,
              description: dt.description || `Team in ${deptName}`,
              memberCount: dt.employees?.length || dt.members?.length || 0,
              lastReview: null,
              tags: [],
              employees: dt.employees || [],
              manager_id: dt.manager_id || dt.manager || ''
            });
          });
        } catch (dbErr) {
          console.warn('DB teams fetch fallback:', dbErr);
        }

        // 2. If no teams from DB, fallback to AI stats or mock
        if (allTeams.length === 0) {
          try {
            const data = await aiService.getTeamStats();
            if (data?.departments) {
              data.departments.forEach(dept => {
                if (!deptNames.includes(dept.name)) deptNames.push(dept.name);
                dept.teams?.forEach(team => {
                  allTeams.push({
                    id: team.id || team._id,
                    name: team.name,
                    department: dept.name,
                    description: team.description || `Team in the ${dept.name} department`,
                    memberCount: team.employee_count || team.members?.length || 0,
                    lastReview: null,
                    tags: [],
                    employees: team.employees || [],
                    manager_id: team.manager_id || ''
                  });
                });
              });
            }
          } catch (e) {
            console.warn('AI stats fallback failed:', e);
          }
        }

        // Auto-resolve current user profile details
        let userTeamName = (currentUser?.team || '').toLowerCase();
        let userTeamId = currentUser?.team_id ? String(currentUser.team_id) : '';
        let userDeptName = (currentUser?.department || '').toLowerCase();
        const myEmpId = currentUser?.employee_id || currentUser?.id;
        const myEmail = currentUser?.email || '';

        try {
          const allEmps = await employeeService.getAllEmployees();
          const me = (allEmps || []).find(e => 
            (myEmail && e.email?.toLowerCase() === myEmail.toLowerCase()) || 
            (myEmpId && (e.employee_id === myEmpId || e._id === myEmpId || e.id === myEmpId))
          );
          if (me) {
            if (me.team) userTeamName = me.team.toLowerCase();
            if (me.team_id) userTeamId = String(me.team_id);
            if (me.department) userDeptName = me.department.toLowerCase();
          }
        } catch (err) {
          console.warn('Auto-resolve employee team error:', err);
        }

        // Filter only the team the manager/admin belongs to or manages
        if (currentUser?.role === 'Manager') {
          const myTeams = allTeams.filter(team => {
            const tName = (team.name || '').toLowerCase();
            const tId = String(team.id || team._id || '');
            const tDept = (team.department || '').toLowerCase();
            
            const isManagerOfTeam = Boolean(team.manager_id && (
              team.manager_id === myEmpId || 
              team.manager_id === currentUser?.id ||
              team.manager_id === currentUser?.employee_id ||
              team.manager_id === currentUser?.employee_code
            ));
            
            const isMemberOfTeam = Array.isArray(team.employees) && team.employees.some(e => {
              if (typeof e === 'string') return (myEmail && e.toLowerCase() === myEmail.toLowerCase()) || (myEmpId && e === myEmpId);
              const eEmpId = e.employee_id;
              const eId = e.id || e._id;
              const eMail = e.email;
              return (myEmpId && (eId === myEmpId || eEmpId === myEmpId)) ||
                     (currentUser?.id && eId === currentUser?.id) ||
                     (myEmail && eMail && eMail.toLowerCase() === myEmail.toLowerCase());
            });
            
            const isNamedTeam = Boolean(
              (userTeamName && (tName === userTeamName || tName.includes(userTeamName) || userTeamName.includes(tName))) || 
              (userTeamId && (tId === userTeamId || tId.includes(userTeamId)))
            );

            const isMatchingDept = Boolean(userDeptName && tDept && (tDept === userDeptName || tDept.includes(userDeptName)));

            return isManagerOfTeam || isMemberOfTeam || isNamedTeam || isMatchingDept;
          });

          if (myTeams.length > 0) {
            allTeams = myTeams;
          } else if (currentUser?.team || userTeamName) {
            // Provide fallback team object for current user's team
            allTeams = [{
              id: userTeamId || 'my-team',
              name: currentUser?.team || userTeamName,
              department: currentUser?.department || 'General',
              description: `Team for ${currentUser?.team || userTeamName}`,
              memberCount: 1,
              lastReview: null,
              tags: [],
              employees: [],
              manager_id: myEmpId
            }];
          }
        }
        
        const visibleDepts = ['All', ...new Set(allTeams.map(t => t.department).filter(Boolean))];
        setDepartments(visibleDepts);
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
  }, [currentUser]);
  
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
        team.description?.toLowerCase().includes(term)
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
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
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