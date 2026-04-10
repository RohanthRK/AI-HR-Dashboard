import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  alpha,
  Avatar
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import aiService from '../../services/aiService';
import employeeService from '../../services/employeeService';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const TeamForm = ({ team = null, isEdit = false }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    description: '',
    leader: null,
    members: []
  });
  
  // Load initial data
  useEffect(() => {
    const fetchDepartmentsAndEmployees = async () => {
      try {
        setLoading(true);
        console.log('Fetching all employees for team selection...');
        
        // Fetch all employees and department stats in parallel
        const [allEmployees, teamStats] = await Promise.all([
          employeeService.getAllEmployees(),
          aiService.getTeamStats()
        ]);
        
        console.log(`Successfully fetched ${allEmployees.length} employees`);
        
        // Extract departments from teamStats
        const deptList = teamStats.departments.map(dept => dept.name);
        setDepartments(deptList);
        
        // Use the full employee list from employeeService
        const employeesList = allEmployees.map(employee => ({
          id: employee._id || employee.id,
          name: employee.name || `${employee.first_name} ${employee.last_name}`,
          position: employee.position || 'Team Member',
          employee_id: employee.employee_id || `EMP${String(employee.id).padStart(3, '0')}`
        }));
        
        setEmployees(employeesList);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data for TeamForm:', err);
        setError('Failed to load employee list. Please ensure the backend is running.');
        setLoading(false);
      }
    };
    
    fetchDepartmentsAndEmployees();
    
    // If editing, populate form with team data
    if (isEdit && team) {
      setFormData({
        name: team.name || '',
        department: team.department || '',
        description: team.description || '',
        leader: team.leader || null,
        members: team.members || []
      });
    }
  }, [isEdit, team]);
  
  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Handle leader selection
  const handleLeaderChange = (event, newValue) => {
    setFormData({
      ...formData,
      leader: newValue
    });
  };
  
  // Handle members selection
  const handleMembersChange = (event, newValue) => {
    setFormData({
      ...formData,
      members: newValue
    });
  };
  
  // Form validation
  const validate = () => {
    if (!formData.name) {
      setError('Team name is required');
      return false;
    }
    if (!formData.department) {
      setError('Department is required');
      return false;
    }
    
    return true;
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Prepare data for API
      const apiData = {
        name: formData.name,
        department: formData.department,
        description: formData.description || `Team in ${formData.department} department`,
        leader_id: formData.leader?.id || null,
        employee_ids: formData.members.map(member => member.id)
      };
      
      console.log('Submitting team data:', apiData);
      
      // Submit to the teams API
      if (isEdit && team) {
        const updateUrl = `${API_URL}/teams/teams/${team.id}/mongodb_update/`;
        console.log('Updating team with URL:', updateUrl);
        await axios.put(updateUrl, apiData);
      } else {
        const createUrl = `${API_URL}/teams/teams/mongodb_create/`;
        console.log('Creating team with URL:', createUrl);
        await axios.post(createUrl, apiData);
      }
      
      // Show success message
      setSuccessMessage(isEdit ? 'Team updated successfully!' : 'Team created successfully!');
      
      // Navigate after a delay
      setTimeout(() => {
        navigate('/teams');
      }, 1500);
      
    } catch (err) {
      console.error('Error saving team:', err);
      if (err.response) {
        console.error('Error status:', err.response.status);
        console.error('Error data:', err.response.data);
        setError(`Failed to save team: ${err.response.data.error || err.message}`);
      } else {
      setError('Failed to save team. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    navigate(isEdit && team ? `/teams/${team.id}` : '/teams');
  };
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={8}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper elevation={0} sx={{ p: 6, border: '4px solid #000', boxShadow: '15px 15px 0px #fcc419', borderRadius: 0 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 4, textTransform: 'uppercase', letterSpacing: -1 }}>
        {isEdit ? 'EDIT TEAM' : 'CREATE NEW TEAM'}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Team Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              sx={{ 
                '& .MuiOutlinedInput-root': { borderRadius: 0, border: '3px solid #000', bgcolor: '#fff' },
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiInputLabel-root': { fontWeight: 900, color: 'text.primary', textTransform: 'uppercase' }
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel sx={{ fontWeight: 900, color: 'text.primary', textTransform: 'uppercase' }}>Department</InputLabel>
              <Select
                name="department"
                value={formData.department}
                onChange={handleChange}
                label="Department"
                sx={{ 
                  borderRadius: 0, 
                  border: '3px solid #000',
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  bgcolor: '#fff',
                  fontWeight: 900
                }}
              >
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept} sx={{ fontWeight: 800 }}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
              sx={{ 
                '& .MuiOutlinedInput-root': { borderRadius: 0, border: '3px solid #000', bgcolor: '#fff' },
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                '& .MuiInputLabel-root': { fontWeight: 900, color: 'text.primary', textTransform: 'uppercase' }
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={employees}
              getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
              value={formData.leader}
              onChange={handleLeaderChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Team Leader"
                  variant="outlined"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { borderRadius: 0, border: '3px solid #000', bgcolor: '#fff' },
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    '& .MuiInputLabel-root': { fontWeight: 900, color: 'text.primary', textTransform: 'uppercase' }
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} style={{ padding: '8px 16px', borderBottom: '1px solid #eee' }}>
                  <Box display="flex" alignItems="center" sx={{ width: '100%', py: 1 }}>
                    <Avatar sx={{ 
                      mr: 2, 
                      width: 40, 
                      height: 40, 
                      bgcolor: '#fcc419', 
                      color: 'text.primary', 
                      fontWeight: 900, 
                      border: '2px solid #000',
                      borderRadius: 0
                    }}>
                      {option.name?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 900, color: 'text.primary', textTransform: 'uppercase', lineHeight: 1 }}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mt: 0.5 }}>
                        {option.position} • {option.employee_id}
                      </Typography>
                    </Box>
                  </Box>
                </li>
              )}
              ListboxProps={{
                sx: { 
                  p: 0, 
                  '& .MuiAutocomplete-option': { 
                    '&[aria-selected="true"]': { bgcolor: alpha('#fcc419', 0.2) },
                    '&.Mui-focused': { bgcolor: alpha('#fcc419', 0.1) },
                    '&:hover': { bgcolor: alpha('#fcc419', 0.1) }
                  },
                  border: '3px solid #000',
                  borderRadius: 0,
                  mt: 1,
                  boxShadow: '8px 8px 0px #000'
                }
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Autocomplete
              multiple
              options={employees}
              getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
              value={formData.members}
              onChange={handleMembersChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Team Members"
                  variant="outlined"
                  sx={{ 
                    '& .MuiOutlinedInput-root': { borderRadius: 0, border: '3px solid #000', bgcolor: '#fff' },
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    '& .MuiInputLabel-root': { fontWeight: 900, color: 'text.primary', textTransform: 'uppercase' }
                  }}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    size="small"
                    sx={{ borderRadius: 0, border: '2px solid #000', fontWeight: 900, bgcolor: '#fcc419', color: 'text.primary' }}
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderOption={(props, option) => (
                <li {...props} style={{ padding: '8px 16px', borderBottom: '1px solid #eee' }}>
                  <Box display="flex" alignItems="center" sx={{ width: '100%', py: 1 }}>
                    <Avatar sx={{ 
                      mr: 2, 
                      width: 40, 
                      height: 40, 
                      bgcolor: '#fcc419', 
                      color: 'text.primary', 
                      fontWeight: 900, 
                      border: '2px solid #000',
                      borderRadius: 0
                    }}>
                      {option.name?.[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 900, color: 'text.primary', textTransform: 'uppercase', lineHeight: 1 }}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: 'block', mt: 0.5 }}>
                        {option.position} • {option.employee_id}
                      </Typography>
                    </Box>
                  </Box>
                </li>
              )}
              ListboxProps={{
                sx: { 
                  p: 0, 
                  '& .MuiAutocomplete-option': { 
                    '&[aria-selected="true"]': { bgcolor: alpha('#fcc419', 0.2) },
                    '&.Mui-focused': { bgcolor: alpha('#fcc419', 0.1) },
                    '&:hover': { bgcolor: alpha('#fcc419', 0.1) }
                  },
                  border: '3px solid #000',
                  borderRadius: 0,
                  mt: 1,
                  boxShadow: '8px 8px 0px #000'
                }
              }}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" gap={3} mt={4}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
                sx={{ 
                  borderRadius: 0, 
                  border: '3px solid #000', 
                  color: 'text.primary', 
                  fontWeight: 900,
                  px: 4,
                  py: 1,
                  '&:hover': { border: '3px solid #000', bgcolor: alpha('#000', 0.05) }
                }}
              >
                CANCEL
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={submitting}
                sx={{ 
                  borderRadius: 0, 
                  bgcolor: 'text.primary', 
                  color: '#fff', 
                  fontWeight: 900,
                  border: '3px solid #000',
                  boxShadow: '4px 4px 0px #fcc419',
                  px: 4,
                  py: 1,
                  '&:hover': { bgcolor: '#333' }
                }}
              >
                {submitting ? 'SAVING...' : isEdit ? 'UPDATE TEAM' : 'CREATE TEAM'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default TeamForm; 