import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Autocomplete,
  Button,
  Chip,
  Alert,
  CircularProgress,
  alpha,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import aiService from '../../services/aiService';
import employeeService from '../../services/employeeService';
import axios from '../../services/api';


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
    manager: null,
    members: []
  });
  
  // Load initial data
  useEffect(() => {
    const fetchDepartmentsAndEmployees = async () => {
      try {
        setLoading(true);
        
        const [allEmployees, teamStats] = await Promise.all([
          employeeService.getAllEmployees(),
          aiService.getTeamStats()
        ]);
        
        
        const deptList = teamStats.departments.map(dept => dept.name);
        setDepartments(deptList);
        
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
    
    if (isEdit && team) {
      setFormData({
        name: team.name || '',
        department: team.department || '',
        description: team.description || '',
        leader: team.leader || null,
        manager: team.manager || null,
        members: team.members || []
      });
    }
  }, [isEdit, team]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const handleLeaderChange = (event, newValue) => {
    setFormData({ ...formData, leader: newValue });
  };
  
  const handleManagerChange = (event, newValue) => {
    setFormData({ ...formData, manager: newValue });
  };
  
  const handleMembersChange = (event, newValue) => {
    setFormData({ ...formData, members: newValue });
  };
  
  const validate = () => {
    if (!formData.name) { setError('Team name is required'); return false; }
    if (!formData.department) { setError('Department is required'); return false; }
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    try {
      setSubmitting(true);
      setError(null);
      
      const apiData = {
        name: formData.name,
        department: formData.department,
        description: formData.description || `Team in ${formData.department} department`,
        leader_id: formData.leader?.id || null,
        manager_id: formData.manager?.id || null,
        employee_ids: formData.members.map(member => member.id)
      };
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Your session has expired or you are not logged in. Please log in again.');
        return;
      }
      
      if (isEdit && team) {
        await axios.put(`/api/teams/teams/${team.id}/mongodb_update/`, apiData);
      } else {
        await axios.post('/api/teams/teams/mongodb_create/', apiData);
      }
      
      setSuccessMessage(isEdit ? 'Team updated successfully!' : 'Team created successfully!');
      setTimeout(() => { navigate('/teams'); }, 1500);
      
    } catch (err) {
      console.error('Error saving team:', err);
      if (err.response) {
        setError(`Failed to save team: ${err.response.data.error || err.message}`);
      } else {
        setError('Failed to save team. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleCancel = () => {
    navigate(isEdit && team ? `/teams/${team.id}` : '/teams');
  };

  // Shared input styling
  const inputSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 0, border: '3px solid #000', bgcolor: '#fff' },
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
    '& .MuiInputBase-input': { fontWeight: 700, px: 2, py: 1.5, fontSize: '0.95rem' }
  };

  const autocompleteSx = {
    '& .MuiOutlinedInput-root': { borderRadius: 0, border: '3px solid #000', bgcolor: '#fff', pr: '9px !important' },
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
    '& .MuiInputBase-input': { fontWeight: 700, px: 1.5, fontSize: '0.95rem' }
  };

  const labelSx = {
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: '0.7rem',
    display: 'block',
    mb: 1,
    color: 'text.secondary'
  };

  const paperSlotProps = (accentColor) => ({
    paper: {
      sx: {
        border: '3px solid #000',
        borderRadius: 0,
        boxShadow: '6px 6px 0px #000',
        mt: 0.5,
        minWidth: 340,
        '& .MuiAutocomplete-option': {
          fontWeight: 700,
          fontSize: '0.9rem',
          py: 1.5,
          whiteSpace: 'nowrap',
          borderBottom: '1px solid #eee',
          '&[aria-selected="true"]': { bgcolor: alpha(accentColor, 0.25) },
          '&.Mui-focused': { bgcolor: alpha(accentColor, 0.12) },
          '&:hover': { bgcolor: alpha(accentColor, 0.12) }
        }
      }
    },
    popper: {
      sx: { minWidth: 340 }
    }
  });
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={8}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper elevation={0} sx={{ p: { xs: 3, md: 5 }, border: '4px solid #000', boxShadow: '15px 15px 0px #fcc419', borderRadius: 0 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 4, textTransform: 'uppercase', letterSpacing: -1 }}>
        {isEdit ? 'EDIT TEAM' : 'CREATE NEW TEAM'}
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 3 }}>{successMessage}</Alert>}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>

          {/* Row 1: Team Name + Department */}
          <Grid item xs={12} md={6}>
            <Typography sx={labelSx}>Team Name *</Typography>
            <TextField
              fullWidth
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g. Customer Support Alpha"
              variant="outlined"
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography sx={labelSx}>Department *</Typography>
            <FormControl fullWidth required>
              <Select
                name="department"
                value={formData.department}
                onChange={handleChange}
                displayEmpty
                sx={{
                  borderRadius: 0,
                  border: '3px solid #000',
                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                  bgcolor: '#fff',
                  fontWeight: 700,
                  '& .MuiSelect-select': { py: 1.5, px: 2, fontSize: '0.95rem' }
                }}
                MenuProps={{
                  PaperProps: {
                    sx: { border: '3px solid #000', borderRadius: 0, boxShadow: '6px 6px 0px #000', mt: 0.5,
                      '& .MuiMenuItem-root': { fontWeight: 700, fontSize: '0.9rem', py: 1.5, borderBottom: '1px solid #eee' }
                    }
                  }
                }}
              >
                <MenuItem value="" disabled sx={{ color: 'text.disabled' }}>Select a department...</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Row 2: Description — ALWAYS FULL WIDTH */}
          <Grid item xs={12}>
            <Typography sx={labelSx}>Description</Typography>
            <TextField
              fullWidth
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={4}
              placeholder="Describe the team's responsibilities and goals..."
              variant="outlined"
              sx={{
                ...inputSx,
                '& .MuiInputBase-input': { fontWeight: 600, px: 2, py: 1.5, fontSize: '1rem' }
              }}
            />
          </Grid>

          {/* Row 3: Team Leader — DEDICATED FULL WIDTH ROW */}
          <Grid item xs={12}>
            <Typography sx={labelSx}>Team Leader (Search & Select)</Typography>
            <Autocomplete
              fullWidth
              options={employees}
              getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
              value={formData.leader}
              onChange={handleLeaderChange}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              slotProps={paperSlotProps('#fcc419')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type to search for an employee..."
                  variant="outlined"
                  sx={{
                    ...autocompleteSx,
                    '& .MuiOutlinedInput-root': {
                      ...autocompleteSx['& .MuiOutlinedInput-root'],
                      minHeight: 60,
                      px: 2
                    }
                  }}
                />
              )}
            />
          </Grid>

          {/* Row 4: Team Manager — DEDICATED FULL WIDTH ROW */}
          <Grid item xs={12}>
            <Typography sx={labelSx}>Team Manager (Search & Select)</Typography>
            <Autocomplete
              fullWidth
              options={employees}
              getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
              value={formData.manager}
              onChange={handleManagerChange}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              slotProps={paperSlotProps('#74c0fc')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Type to search for a manager..."
                  variant="outlined"
                  sx={{
                    ...autocompleteSx,
                    '& .MuiOutlinedInput-root': {
                      ...autocompleteSx['& .MuiOutlinedInput-root'],
                      minHeight: 60,
                      px: 2
                    }
                  }}
                />
              )}
            />
          </Grid>

          {/* Row 4: Team Members — full width */}
          <Grid item xs={12}>
            <Typography sx={labelSx}>Team Members</Typography>
            <Autocomplete
              multiple
              fullWidth
              options={employees}
              getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
              value={formData.members}
              onChange={handleMembersChange}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              slotProps={paperSlotProps('#fcc419')}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    key={option.id}
                    label={`${option.name} (${option.employee_id})`}
                    size="small"
                    sx={{
                      borderRadius: 0,
                      border: '2px solid #000',
                      fontWeight: 900,
                      bgcolor: '#fcc419',
                      color: 'text.primary',
                      m: 0.3,
                      '& .MuiChip-deleteIcon': { color: '#000', '&:hover': { color: '#555' } }
                    }}
                    {...getTagProps({ index })}
                  />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={formData.members.length === 0 ? 'Search and add team members...' : ''}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 0,
                      border: '3px solid #000',
                      bgcolor: '#fff',
                      flexWrap: 'wrap',
                      gap: 0.3,
                      p: '6px'
                    },
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    '& .MuiInputBase-input': { fontWeight: 700, fontSize: '0.95rem', minWidth: '200px', px: 1 }
                  }}
                />
              )}
            />
          </Grid>

          {/* Row 5: Action Buttons */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="flex-end" gap={2} mt={4} flexWrap="wrap">
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
                  py: 1.5,
                  fontSize: '0.9rem',
                  letterSpacing: 1,
                  '&:hover': { border: '3px solid #000', bgcolor: alpha('#000', 0.06) }
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
                  bgcolor: '#111',
                  color: '#fff',
                  fontWeight: 900,
                  border: '3px solid #000',
                  boxShadow: '5px 5px 0px #fcc419',
                  px: 4,
                  py: 1.5,
                  fontSize: '0.9rem',
                  letterSpacing: 1,
                  '&:hover': { bgcolor: '#333', boxShadow: '3px 3px 0px #fcc419' },
                  '&.Mui-disabled': { bgcolor: '#999', color: '#ccc', border: '3px solid #999', boxShadow: 'none' }
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