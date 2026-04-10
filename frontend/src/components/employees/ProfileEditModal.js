import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Typography,
  Box,
  IconButton,
  Divider,
  useTheme
} from '@mui/material';
import { Close as CloseIcon, Save as SaveIcon } from '@mui/icons-material';
import employeeService from '../../services/employeeService';

const ProfileEditModal = ({ open, onClose, employee, onSaveSuccess }) => {
  const theme = useTheme();
  const [formData, setFormData] = useState({
    about_me: '',
    love_about_job: '',
    interests_hobbies: '',
    phone: '',
    location: '',
    personal_email: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (employee) {
      // Correctly extract from nested structure if it exists
      const ec = employee.emergency_contact || {};
      setFormData({
        about_me: employee.about_me || '',
        love_about_job: employee.love_about_job || '',
        interests_hobbies: employee.interests_hobbies || '',
        phone: employee.phone || '',
        location: employee.location || '',
        // These fields are inside emergency_contact in the backend doc
        personal_email: ec.personal_email || employee.personal_email || '',
        emergency_contact_name: ec.name || employee.emergency_contact_name || '',
        emergency_contact_relationship: ec.relationship || employee.emergency_contact_relationship || '',
        emergency_contact_phone: ec.phone || employee.emergency_contact_phone || ''
      });
    }
  }, [employee]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      // Correctly nest fields back for the backend as expected
      const payload = {
        about_me: formData.about_me,
        love_about_job: formData.love_about_job,
        interests_hobbies: formData.interests_hobbies,
        phone: formData.phone,
        location: formData.location,
        emergency_contact: {
          name: formData.emergency_contact_name,
          relationship: formData.emergency_contact_relationship,
          phone: formData.emergency_contact_phone,
          personal_email: formData.personal_email
        }
      };
      
      // Use partial update endpoint
      await employeeService.partialUpdateEmployee(employee._id, payload);
      onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const brutalBorder = '4px solid #000';
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 0,
      border: brutalBorder,
      bgcolor: 'background.paper',
      '& fieldset': { border: 'none' },
      '&:hover fieldset': { border: 'none' },
      '&.Mui-focused fieldset': { border: 'none' },
    },
    '& .MuiInputLabel-root': {
      fontWeight: 900,
      color: theme.palette.mode === 'light' ? '#000' : '#fcc419',
      textTransform: 'uppercase'
    }
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
          border: brutalBorder,
          boxShadow: theme.palette.mode === 'light' ? '20px 20px 0px #000' : '20px 20px 0px #fcc419',
          overflow: 'visible'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#fcc419', 
        color: '#000', 
        fontWeight: 900, 
        borderBottom: brutalBorder, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>EDIT YOUR PROFILE</Typography>
        <IconButton onClick={onClose} sx={{ color: '#000' }}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4, mt: 2 }}>
        {error && (
          <Box sx={{ mb: 3, p: 2, bgcolor: '#ff6b6b', color: '#000', border: brutalBorder, fontWeight: 900 }}>
            {error}
          </Box>
        )}

        <Grid container spacing={4}>
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase', color: '#fcc419' }}>Personal Summary</Typography>
            <Divider sx={{ mb: 3, borderBottomWidth: 4, borderColor: '#000' }} />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="About Me (Bio)"
              name="about_me"
              value={formData.about_me}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="What I love about my job"
              name="love_about_job"
              value={formData.love_about_job}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Interests & Hobbies"
              name="interests_hobbies"
              value={formData.interests_hobbies}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase', color: '#fcc419' }}>Contact Details</Typography>
            <Divider sx={{ mb: 3, borderBottomWidth: 4, borderColor: '#000' }} />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Personal Email"
              name="personal_email"
              value={formData.personal_email}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>

          <Grid item xs={12} sx={{ mt: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase', color: '#ff6b6b' }}>Emergency Contact</Typography>
            <Divider sx={{ mb: 3, borderBottomWidth: 4, borderColor: '#000' }} />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Contact Name"
              name="emergency_contact_name"
              value={formData.emergency_contact_name}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Relationship"
              name="emergency_contact_relationship"
              value={formData.emergency_contact_relationship}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Contact Phone"
              name="emergency_contact_phone"
              value={formData.emergency_contact_phone}
              onChange={handleChange}
              sx={inputSx}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 4, bgcolor: 'background.default', borderTop: brutalBorder }}>
        <Button 
          onClick={onClose} 
          sx={{ fontWeight: 900, color: 'text.secondary', border: '2px solid transparent', borderRadius: 0 }}
        >
          CANCEL
        </Button>
        <Button 
          onClick={handleSave}
          disabled={loading}
          variant="contained"
          startIcon={<SaveIcon />}
          sx={{ 
            bgcolor: '#000', 
            color: '#fff', 
            fontWeight: 900, 
            borderRadius: 0,
            border: brutalBorder,
            boxShadow: `4px 4px 0px ${theme.palette.mode === 'light' ? '#666' : '#fcc419'}`,
            px: 4,
            '&:hover': { bgcolor: '#333' }
          }}
        >
          {loading ? 'SAVING...' : 'SAVE CHANGES'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileEditModal;
