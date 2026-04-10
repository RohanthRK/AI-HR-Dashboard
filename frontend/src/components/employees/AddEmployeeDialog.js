import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Typography,
  Box,
  IconButton,
  Divider,
  useTheme,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  alpha
} from '@mui/material';
import { 
  Close as CloseIcon, 
  CloudUpload as CloudUploadIcon,
  CalendarMonth as CalendarIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';

const AddEmployeeDialog = ({ open, onClose, onSave, departments = [], teams }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    gender: '',
    date_of_birth: '',
    department: '',
    team: '',
    position: '',
    hire_date: new Date().toISOString().split('T')[0],
    salary: '',
    employment_status: 'Active',
    employment_type: 'Full-time'
  });

  const [loading, setLoading] = useState(false);
  const [filteredTeams, setFilteredTeams] = useState([]);

  // Filter teams when department changes
  useEffect(() => {
    if (formData.department) {
      const selectedDept = departments.find(d => d.name === formData.department);
      if (selectedDept && selectedDept.teams) {
        setFilteredTeams(selectedDept.teams.map(t => t.name).filter(Boolean));
      } else {
        setFilteredTeams([]);
      }
    } else {
      setFilteredTeams([]);
    }
  }, [formData.department, departments]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Reset team if department changes
    if (name === 'department') {
      setFormData(prev => ({ ...prev, [name]: value, team: '' }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    // Basic validation
    if (!formData.first_name || !formData.last_name || !formData.email) {
      alert('Please fill in all mandatory fields (*)');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Error saving employee:', err);
    } finally {
      setLoading(false);
    }
  };

  const brutalBorder = '3px solid #000';
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 0,
      border: brutalBorder,
      bgcolor: isDark ? alpha('#fff', 0.05) : '#fff',
      '& fieldset': { border: 'none' },
      '&:hover fieldset': { border: 'none' },
      '&.Mui-focused fieldset': { border: 'none' },
    },
    '& .MuiInputLabel-root': {
      fontWeight: 900,
      color: isDark ? '#fcc419' : '#000',
      textTransform: 'uppercase',
      fontSize: '0.75rem',
      mt: -1
    },
    mb: 2
  };

  const labelSx = {
    fontWeight: 900,
    textTransform: 'uppercase',
    fontSize: '0.8rem',
    mb: 1,
    display: 'block',
    color: isDark ? '#fcc419' : '#000'
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 0,
          border: '4px solid #000',
          boxShadow: isDark ? '15px 15px 0px #fcc419' : '15px 15px 0px #000',
          overflow: 'hidden'
        }
      }}
    >
      {/* Header Banner */}
      <Box sx={{ 
        bgcolor: '#fcc419', 
        p: 3, 
        borderBottom: '4px solid #000',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h4" sx={{ fontWeight: 900, color: '#000', letterSpacing: -1 }}>
          ADD NEW EMPLOYEE
        </Typography>
        <IconButton onClick={onClose} sx={{ color: '#000', border: '2px solid #000', borderRadius: 0 }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 4, bgcolor: 'background.paper' }}>
        <Grid container spacing={4}>
          {/* PERSONAL INFORMATION SECTION */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase' }}>
              PERSONAL INFORMATION
            </Typography>
            <Divider sx={{ mb: 3, borderBottomWidth: 3, borderColor: '#000' }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography sx={labelSx}>First Name*</Typography>
            <TextField
              fullWidth
              name="first_name"
              placeholder="e.g. John"
              value={formData.first_name}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography sx={labelSx}>Last Name*</Typography>
            <TextField
              fullWidth
              name="last_name"
              placeholder="e.g. Doe"
              value={formData.last_name}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography sx={labelSx}>Email ID*</Typography>
            <TextField
              fullWidth
              name="email"
              placeholder="e.g. john.doe@email.com"
              value={formData.email}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography sx={labelSx}>Mobile</Typography>
            <TextField
              fullWidth
              name="phone"
              placeholder="e.g. +1 234 567 890"
              value={formData.phone}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography sx={labelSx}>Residential Address</Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              name="address"
              placeholder="Enter full address"
              value={formData.address}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography sx={labelSx}>Gender</Typography>
            <FormControl fullWidth sx={inputSx}>
              <Select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                displayEmpty
              >
                <MenuItem value="" disabled>Select Gender</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography sx={labelSx}>Date of Birth</Typography>
            <TextField
              fullWidth
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              sx={inputSx}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* EMPLOYMENT DETAILS SECTION */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase' }}>
              EMPLOYMENT DETAILS
            </Typography>
            <Divider sx={{ mb: 3, borderBottomWidth: 3, borderColor: '#000' }} />
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography sx={labelSx}>Department*</Typography>
            <FormControl fullWidth sx={inputSx}>
              <Select
                name="department"
                value={formData.department}
                onChange={handleChange}
                displayEmpty
              >
                <MenuItem value="" disabled>Select Department</MenuItem>
                {departments.map(dept => (
                  <MenuItem key={dept._id || dept.name} value={dept.name}>{dept.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography sx={labelSx}>Team</Typography>
            <FormControl fullWidth sx={inputSx}>
              <Select
                name="team"
                value={formData.team}
                onChange={handleChange}
                displayEmpty
              >
                <MenuItem value="" disabled>Select Team</MenuItem>
                {filteredTeams.map(teamName => (
                  <MenuItem key={teamName} value={teamName}>{teamName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Typography sx={labelSx}>Position*</Typography>
            <TextField
              fullWidth
              name="position"
              placeholder="e.g. UX Designer"
              value={formData.position}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography sx={labelSx}>Hire Date*</Typography>
            <TextField
              fullWidth
              type="date"
              name="hire_date"
              value={formData.hire_date}
              onChange={handleChange}
              sx={inputSx}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography sx={labelSx}>Salary (p.a)</Typography>
            <TextField
              fullWidth
              name="salary"
              placeholder="0.00"
              value={formData.salary}
              onChange={handleChange}
              sx={inputSx}
              InputProps={{
                startAdornment: <InputAdornment position="start"><MoneyIcon sx={{ color: '#000' }} /></InputAdornment>,
              }}
            />
          </Grid>

          {/* DOCUMENT UPLOAD SECTION */}
          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography sx={labelSx}>Upload Onboarding Documents</Typography>
            <Box sx={{ 
              border: '2px dashed #000', 
              bgcolor: isDark ? alpha('#fcc419', 0.1) : '#fff9db',
              p: 4, 
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { bgcolor: isDark ? alpha('#fcc419', 0.2) : '#fff5b8' }
            }}>
              <CloudUploadIcon sx={{ fontSize: 48, mb: 1, color: '#000' }} />
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#000' }}>
                Click or drag file to this area to upload
              </Typography>
              <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1 }}>
                Support for a single or bulk upload. Strictly prohibit from uploading company data or other band files.
              </Typography>
              <Button sx={{ mt: 2, fontWeight: 900, color: '#1976d2', textDecoration: 'underline' }}>
                Browse File
              </Button>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 4, bgcolor: 'background.paper', borderTop: '4px solid #000', gap: 2 }}>
        <Button 
          onClick={onClose} 
          sx={{ 
            fontWeight: 900, 
            color: '#000', 
            border: '3px solid #000', 
            borderRadius: 0,
            px: 4,
            py: 1,
            '&:hover': { bgcolor: alpha('#000', 0.05) }
          }}
        >
          CANCEL
        </Button>
        <Button 
          onClick={handleSave}
          disabled={loading}
          variant="contained"
          sx={{ 
            bgcolor: '#000', 
            color: '#fff', 
            fontWeight: 900, 
            borderRadius: 0,
            border: '3px solid #000',
            boxShadow: isDark ? '4px 4px 0px #fcc419' : '4px 4px 0px #666',
            px: 4,
            py: 1,
            '&:hover': { bgcolor: '#333' }
          }}
        >
          {loading ? 'ADDING...' : 'ADD EMPLOYEE'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddEmployeeDialog;
