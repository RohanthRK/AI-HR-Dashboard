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
  FormHelperText,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  FormLabel,
  CircularProgress
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format } from 'date-fns';
import leaveService from '../../services/leaveService';
import { useSnackbar } from 'notistack';

const LeaveRequest = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    leaveType: '',
    startDate: null,
    endDate: null,
    isHalfDay: false,
    halfDaySegment: 'First Half',
    reason: '',
    contactInfo: ''
  });
  const [errors, setErrors] = useState({});
  
  const leaveTypes = [
    { value: 'Earned Leaves', label: 'Earned Leaves' },
    { value: 'LOP Leaves', label: 'LOP Leaves' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    setFormValues(prev => {
      const newValues = { ...prev, [name]: val };
      
      // If half day is checked, sync end date with start date
      if (name === 'isHalfDay' && val && prev.startDate) {
        newValues.endDate = prev.startDate;
      }
      
      return newValues;
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
    setFormValues(prev => {
      const newValues = { ...prev, [name]: date };
      
      // Sync end date if half day
      if (name === 'startDate' && prev.isHalfDay) {
        newValues.endDate = date;
      }
      
      return newValues;
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
    
    if (!formValues.isHalfDay && !formValues.endDate) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setLoading(true);
      try {
        const payload = {
          leave_type: formValues.leaveType,
          start_date: format(formValues.startDate, 'yyyy-MM-dd'),
          end_date: format(formValues.isHalfDay ? formValues.startDate : formValues.endDate, 'yyyy-MM-dd'),
          is_half_day: formValues.isHalfDay,
          half_day_segment: formValues.isHalfDay ? formValues.halfDaySegment : null,
          reason: formValues.reason
        };
        
        await leaveService.applyForLeave(payload);
        enqueueSnackbar('Leave request submitted successfully!', { variant: 'success' });
        navigate('/leaves');
      } catch (error) {
        console.error('Error submitting leave:', error);
        enqueueSnackbar(error.response?.data?.message || 'Failed to submit leave request', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancel = () => {
    navigate('/leaves');
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
          Request Leave
        </Typography>
        
        <Paper sx={{ p: 4, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
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
                 <FormControlLabel
                  control={
                    <Checkbox 
                      checked={formValues.isHalfDay} 
                      onChange={handleInputChange} 
                      name="isHalfDay" 
                    />
                  }
                  label="Half Day Leave"
                  sx={{ mt: 1 }}
                />
              </Grid>

              {formValues.isHalfDay && (
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Segment</FormLabel>
                    <RadioGroup
                      row
                      name="halfDaySegment"
                      value={formValues.halfDaySegment}
                      onChange={handleInputChange}
                    >
                      <FormControlLabel value="First Half" control={<Radio />} label="First Half (Morning)" />
                      <FormControlLabel value="Second Half" control={<Radio />} label="Second Half (Afternoon)" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
              )}
              
              <Grid item xs={12} md={6}>
                <DatePicker
                  label={formValues.isHalfDay ? "Date" : "Start Date"}
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
                  value={formValues.isHalfDay ? formValues.startDate : formValues.endDate}
                  onChange={(date) => handleDateChange('endDate', date)}
                  disabled={formValues.isHalfDay}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: !formValues.isHalfDay,
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
                  placeholder="Please explain why you need this leave..."
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                  <Button variant="outlined" onClick={handleCancel} disabled={loading}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    variant="contained" 
                    color="primary" 
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : null}
                  >
                    {loading ? 'Submitting...' : 'Submit Request'}
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