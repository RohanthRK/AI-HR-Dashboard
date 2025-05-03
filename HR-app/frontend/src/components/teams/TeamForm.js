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
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import aiService from '../../services/aiService';
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
        
        // Fetch team stats to get departments and employees
        const teamStats = await aiService.getTeamStats();
        
        // Extract departments
        const deptList = teamStats.departments.map(dept => dept.name);
        setDepartments(deptList);
        
        // Extract all employees from all teams
        const employeesList = [];
        teamStats.departments.forEach(dept => {
          dept.teams.forEach(team => {
            team.employees.forEach(employee => {
              // Only add if not already in the list (avoid duplicates)
              if (!employeesList.some(e => e.id === employee.id)) {
                employeesList.push({
                  id: employee.id,
                  name: employee.name,
                  position: employee.position || 'Team Member',
                  employee_id: `EMP${employee.id.padStart(3, '0')}`
                });
              }
            });
          });
        });
        
        setEmployees(employeesList);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data. Please try again.');
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
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        {isEdit ? 'Edit Team' : 'Create New Team'}
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
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Department</InputLabel>
              <Select
                name="department"
                value={formData.department}
                onChange={handleChange}
                label="Department"
              >
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept}>
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
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box display="flex" alignItems="center">
                    <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.position} • {option.employee_id}
                      </Typography>
                    </Box>
                  </Box>
                </li>
              )}
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
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={option.name}
                    size="small"
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderOption={(props, option) => (
                <li {...props}>
                  <Box display="flex" alignItems="center">
                    <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                    <Box>
                      <Typography variant="body2">{option.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.position} • {option.employee_id}
                      </Typography>
                    </Box>
                  </Box>
                </li>
              )}
            />
          </Grid>
          
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" gap={2} mt={2}>
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : isEdit ? 'Update Team' : 'Create Team'}
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default TeamForm; 