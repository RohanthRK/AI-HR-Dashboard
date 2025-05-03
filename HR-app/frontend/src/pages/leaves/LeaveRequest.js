import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  Grid,
  TextField,
  Button,
  MenuItem,
  FormControl,
  FormHelperText
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';

const LeaveRequest = () => {
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState({
    leaveType: '',
    startDate: null,
    endDate: null,
    reason: '',
    contactInfo: ''
  });
  const [errors, setErrors] = useState({});
  
  const leaveTypes = [
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'personal', label: 'Personal Leave' },
    { value: 'unpaid', label: 'Unpaid Leave' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value
    });
    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const handleDateChange = (name, date) => {
    setFormValues({
      ...formValues,
      [name]: date
    });
    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    let tempErrors = {};
    let formIsValid = true;
    
    if (!formValues.leaveType) {
      tempErrors.leaveType = 'Please select a leave type';
      formIsValid = false;
    }
    
    if (!formValues.startDate) {
      tempErrors.startDate = 'Please select a start date';
      formIsValid = false;
    }
    
    if (!formValues.endDate) {
      tempErrors.endDate = 'Please select an end date';
      formIsValid = false;
    }
    
    if (formValues.startDate && formValues.endDate && formValues.startDate > formValues.endDate) {
      tempErrors.endDate = 'End date cannot be before start date';
      formIsValid = false;
    }
    
    if (!formValues.reason || formValues.reason.trim().length < 5) {
      tempErrors.reason = 'Please provide a reason (minimum 5 characters)';
      formIsValid = false;
    }
    
    setErrors(tempErrors);
    return formIsValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Here you would submit the data to your API
      console.log('Form submitted:', formValues);
      
      // Show success and navigate back to leaves page
      alert('Leave request submitted successfully!');
      navigate('/leaves');
    }
  };

  const handleCancel = () => {
    navigate('/leaves');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom>
          Request Leave
        </Typography>
        
        <Paper sx={{ p: 3 }}>
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  select
                  fullWidth
                  label="Leave Type"
                  name="leaveType"
                  value={formValues.leaveType}
                  onChange={handleInputChange}
                  error={!!errors.leaveType}
                  helperText={errors.leaveType}
                  required
                >
                  {leaveTypes.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              
              <Grid item xs={12} md={6}>
                {/* Empty grid for alignment */}
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="Start Date"
                  value={formValues.startDate}
                  onChange={(date) => handleDateChange('startDate', date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: !!errors.startDate,
                      helperText: errors.startDate
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label="End Date"
                  value={formValues.endDate}
                  onChange={(date) => handleDateChange('endDate', date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: !!errors.endDate,
                      helperText: errors.endDate
                    }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Reason for Leave"
                  name="reason"
                  value={formValues.reason}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                  required
                  error={!!errors.reason}
                  helperText={errors.reason}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contact Information While on Leave (Optional)"
                  name="contactInfo"
                  value={formValues.contactInfo}
                  onChange={handleInputChange}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                  <Button variant="outlined" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" color="primary">
                    Submit Request
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default LeaveRequest; 