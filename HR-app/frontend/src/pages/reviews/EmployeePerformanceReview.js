import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Alert, 
  AlertTitle, 
  Box, 
  Card, 
  CardContent, 
  Avatar,
  Chip,
  Divider,
  CircularProgress,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Rating,
  FormHelperText,
  IconButton
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import WorkIcon from '@mui/icons-material/Work';
import PageHeader from '../../components/PageHeader';
import employeeService from '../../services/employeeService';
import reviewService from '../../services/reviewService';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

const EmployeePerformanceReview = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviewData, setReviewData] = useState({
    performance: 0,
    communication: 0,
    teamwork: 0,
    initiative: 0,
    adaptability: 0,
    feedback: '',
    strengths: '',
    areas_for_improvement: '',
    reviewer: '',
    review_date: new Date(),
  });
  const [errors, setErrors] = useState({});

  // Fetch employee data
  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        setLoading(true);
        // Try to get employee by ID
        const employeeData = await employeeService.getAllEmployees();
        const foundEmployee = employeeData.find(emp => emp.id === employeeId || emp._id === employeeId);
        
        if (foundEmployee) {
          setEmployee(foundEmployee);
        } else {
          setError('Employee not found. Please try again.');
        }
      } catch (err) {
        console.error('Error fetching employee data:', err);
        setError('Failed to load employee data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchEmployeeData();
    }
  }, [employeeId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setReviewData({
      ...reviewData,
      [name]: value,
    });
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null,
      });
    }
  };

  const handleRatingChange = (metric, value) => {
    setReviewData({
      ...reviewData,
      [metric]: value,
    });
    // Clear error for this field if it exists
    if (errors[metric]) {
      setErrors({
        ...errors,
        [metric]: null,
      });
    }
  };

  const handleDateChange = (date) => {
    setReviewData({
      ...reviewData,
      review_date: date,
    });
    if (errors.review_date) {
      setErrors({
        ...errors,
        review_date: null,
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredMetrics = ['performance', 'communication', 'teamwork', 'initiative', 'adaptability'];
    
    requiredMetrics.forEach(metric => {
      if (reviewData[metric] === 0) {
        newErrors[metric] = 'Please provide a rating';
      }
    });
    
    if (!reviewData.feedback.trim()) {
      newErrors.feedback = 'Please provide overall feedback';
    }
    
    if (!reviewData.reviewer.trim()) {
      newErrors.reviewer = 'Please provide reviewer name';
    }
    
    if (!reviewData.review_date) {
      newErrors.review_date = 'Please select a review date';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Format review data for submission
      const formattedReview = {
        ...reviewData,
        employee_id: employeeId,
        employee_name: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee',
        department: employee?.department || 'Unknown',
        position: employee?.position || 'Unknown',
        review_date: reviewData.review_date.toISOString()
      };
      
      console.log('Submitting review for employee:', formattedReview);
      
      // Submit review
      await reviewService.submitReview(employeeId, formattedReview);
      
      // Show success message
      setSubmitSuccess(true);
    } catch (error) {
      console.error('Error submitting employee review:', error);
      setSubmitError('Failed to submit employee review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate('/reviews');
  };

  // Calculate overall score
  const getOverallScore = () => {
    const metrics = ['performance', 'communication', 'teamwork', 'initiative', 'adaptability'];
    const totalRatings = metrics.reduce((sum, metric) => sum + reviewData[metric], 0);
    return metrics.every(metric => reviewData[metric] > 0) 
      ? Math.round((totalRatings / (metrics.length * 5)) * 100) 
      : 0;
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
          <Button 
            variant="outlined" 
            size="small" 
            sx={{ mt: 2 }}
            onClick={handleBack}
          >
            Back to Reviews
          </Button>
        </Alert>
      </Container>
    );
  }

  if (submitSuccess) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert 
          severity="success" 
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={handleBack}
            >
              Back to Reviews
            </Button>
          }
        >
          <AlertTitle>Success</AlertTitle>
          Employee review submitted successfully! The review has been saved.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <PageHeader 
        title="Employee Performance Review"
        subtitle="Evaluate individual employee performance and provide actionable feedback"
      />
      
      {submitError && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          onClose={() => setSubmitError(null)}
        >
          <AlertTitle>Error</AlertTitle>
          {submitError}
        </Alert>
      )}
      
      <Box mb={4}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          variant="outlined"
        >
          Back to Reviews
        </Button>
      </Box>
      
      {employee && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box display="flex" alignItems="center" mb={3}>
                <Avatar 
                  sx={{ 
                    width: 64, 
                    height: 64, 
                    bgcolor: 'primary.main',
                    fontSize: '1.5rem',
                    mr: 2
                  }}
                >
                  {employee.first_name?.charAt(0)}{employee.last_name?.charAt(0)}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {employee.first_name} {employee.last_name}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {employee.position || 'No position specified'}
                  </Typography>
                </Box>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Department
                </Typography>
                <Typography>
                  {employee.department || 'Not specified'}
                </Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Employee ID
                </Typography>
                <Typography>
                  {employee.employee_id || 'Not specified'}
                </Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Email
                </Typography>
                <Box display="flex" alignItems="center">
                  <EmailIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>
                    {employee.email || 'Not specified'}
                  </Typography>
                </Box>
              </Box>
              
              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Phone
                </Typography>
                <Box display="flex" alignItems="center">
                  <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography>
                    {employee.phone || 'Not specified'}
                  </Typography>
                </Box>
              </Box>
              
              <Box mb={2}>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Hire Date
                </Typography>
                <Typography>
                  {employee.hire_date || 'Not specified'}
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                  Employment Status
                </Typography>
                <Chip 
                  label={employee.status || 'Unknown'} 
                  color={employee.status === 'Active' ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Paper component="form" onSubmit={handleSubmitReview} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Performance Evaluation
              </Typography>
              
              <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Performance
                  </Typography>
                  <Rating 
                    name="performance"
                    value={reviewData.performance}
                    onChange={(event, newValue) => {
                      handleRatingChange('performance', newValue);
                    }}
                    precision={1}
                    size="large"
                  />
                  {errors.performance && (
                    <FormHelperText error>{errors.performance}</FormHelperText>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Communication
                  </Typography>
                  <Rating 
                    name="communication"
                    value={reviewData.communication}
                    onChange={(event, newValue) => {
                      handleRatingChange('communication', newValue);
                    }}
                    precision={1}
                    size="large"
                  />
                  {errors.communication && (
                    <FormHelperText error>{errors.communication}</FormHelperText>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Teamwork
                  </Typography>
                  <Rating 
                    name="teamwork"
                    value={reviewData.teamwork}
                    onChange={(event, newValue) => {
                      handleRatingChange('teamwork', newValue);
                    }}
                    precision={1}
                    size="large"
                  />
                  {errors.teamwork && (
                    <FormHelperText error>{errors.teamwork}</FormHelperText>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Initiative
                  </Typography>
                  <Rating 
                    name="initiative"
                    value={reviewData.initiative}
                    onChange={(event, newValue) => {
                      handleRatingChange('initiative', newValue);
                    }}
                    precision={1}
                    size="large"
                  />
                  {errors.initiative && (
                    <FormHelperText error>{errors.initiative}</FormHelperText>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom>
                    Adaptability
                  </Typography>
                  <Rating 
                    name="adaptability"
                    value={reviewData.adaptability}
                    onChange={(event, newValue) => {
                      handleRatingChange('adaptability', newValue);
                    }}
                    precision={1}
                    size="large"
                  />
                  {errors.adaptability && (
                    <FormHelperText error>{errors.adaptability}</FormHelperText>
                  )}
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%'
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom align="center">
                      Overall Score
                    </Typography>
                    <Box position="relative" display="inline-flex">
                      <CircularProgress 
                        variant="determinate" 
                        value={getOverallScore()} 
                        size={80}
                        color={getOverallScore() >= 80 ? 'success' : getOverallScore() >= 60 ? 'info' : 'warning'}
                      />
                      <Box
                        sx={{
                          top: 0,
                          left: 0,
                          bottom: 0,
                          right: 0,
                          position: 'absolute',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography
                          variant="body1"
                          component="div"
                          color="text.secondary"
                        >
                          {`${getOverallScore()}%`}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Reviewer Name"
                    name="reviewer"
                    value={reviewData.reviewer}
                    onChange={handleInputChange}
                    error={!!errors.reviewer}
                    helperText={errors.reviewer}
                    required
                    margin="normal"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Review Date"
                      value={reviewData.review_date}
                      onChange={handleDateChange}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          margin: 'normal',
                          error: !!errors.review_date,
                          helperText: errors.review_date
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField 
                    fullWidth
                    multiline
                    rows={4}
                    label="Overall Feedback"
                    name="feedback"
                    value={reviewData.feedback}
                    onChange={handleInputChange}
                    error={!!errors.feedback}
                    helperText={errors.feedback || 'Provide detailed feedback about the employee\'s overall performance'}
                    required
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField 
                    fullWidth
                    multiline
                    rows={3}
                    label="Key Strengths"
                    name="strengths"
                    value={reviewData.strengths}
                    onChange={handleInputChange}
                    helperText="Highlight the employee's key strengths and accomplishments"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField 
                    fullWidth
                    multiline
                    rows={3}
                    label="Areas for Improvement"
                    name="areas_for_improvement"
                    value={reviewData.areas_for_improvement}
                    onChange={handleInputChange}
                    helperText="Suggest areas where the employee can improve and develop"
                  />
                </Grid>
              </Grid>
              
              <Box mt={4} display="flex" justifyContent="flex-end">
                <Button 
                  variant="outlined" 
                  sx={{ mr: 2 }}
                  onClick={handleBack}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  variant="contained"
                  disabled={isSubmitting}
                  startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default EmployeePerformanceReview; 