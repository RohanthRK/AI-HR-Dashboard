import React, { useState } from 'react';
import { 
  Paper, 
  Card,
  CardHeader, 
  CardContent, 
  TextField, 
  Button, 
  Grid, 
  Typography, 
  Box, 
  Chip, 
  CircularProgress,
  IconButton, 
  Avatar,
  Rating,
  Divider,
  FormHelperText
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

const TeamReview = ({ team, onSubmit, onCancel, isSubmitting }) => {
  const initialReviewData = {
    collaboration: 0,
    productivity: 0,
    quality: 0,
    innovation: 0,
    communication: 0,
    feedback: '',
    strengths: '',
    areas_for_improvement: '',
    reviewer: '',
    review_date: new Date(),
  };
  
  const [reviewData, setReviewData] = useState(initialReviewData);
  const [errors, setErrors] = useState({});

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
    const requiredMetrics = ['collaboration', 'productivity', 'quality', 'innovation', 'communication'];
    
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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        team_id: team.id,
        review_date: reviewData.review_date.toISOString(),
        feedback: reviewData.feedback,
        strengths: reviewData.strengths,
        areas_for_improvement: reviewData.areas_for_improvement,
        reviewer: reviewData.reviewer,
        scores: {
          collaboration: reviewData.collaboration,
          productivity: reviewData.productivity,
          quality: reviewData.quality,
          innovation: reviewData.innovation,
          communication: reviewData.communication
        }
      });
    }
  };

  // Calculate overall score
  const getOverallScore = () => {
    const metrics = ['collaboration', 'productivity', 'quality', 'innovation', 'communication'];
    const totalRatings = metrics.reduce((sum, metric) => sum + reviewData[metric], 0);
    return metrics.every(metric => reviewData[metric] > 0) 
      ? Math.round((totalRatings / (metrics.length * 5)) * 100) 
      : 0;
  };

  if (!team) {
    return null;
  }

  return (
    <Paper elevation={2} sx={{ height: '100%' }}>
      <CardHeader 
        title={
          <Box display="flex" alignItems="center">
            <IconButton 
              edge="start" 
              onClick={onCancel} 
              sx={{ mr: 1 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6">
              Review: {team.name}
            </Typography>
          </Box>
        }
        action={
          <Chip 
            label={team.department} 
            size="small" 
            color="default"
          />
        }
        sx={{ 
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider'
        }}
      />
      <CardContent component="form" onSubmit={handleSubmit}>
        <Grid container spacing={3} mb={4}>
          <Grid item md={8} xs={12}>
            <Box display="flex" mb={2}>
              <Avatar
                sx={{ 
                  bgcolor: 'primary.main',
                  width: 50,
                  height: 50,
                  mr: 2
                }}
              >
                {team.name.slice(0, 2).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="h6" gutterBottom>
                  {team.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {team.memberCount} Members • Last Review: {team.lastReview || 'N/A'}
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" paragraph>
              {team.description}
            </Typography>
            {team.tags && team.tags.length > 0 && (
              <Box>
                {team.tags.map((tag, index) => (
                  <Chip 
                    key={index} 
                    label={tag} 
                    size="small" 
                    variant="outlined" 
                    sx={{ mr: 0.5, mb: 0.5 }} 
                  />
                ))}
              </Box>
            )}
          </Grid>
          <Grid item md={4} xs={12}>
            <Card 
              variant="outlined" 
              sx={{ 
                bgcolor: 'background.default',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 2
              }}
            >
              <Typography variant="subtitle1" gutterBottom align="center">
                Overall Rating
              </Typography>
              <Box position="relative" display="inline-flex" mb={1}>
                <CircularProgress 
                  variant="determinate" 
                  value={getOverallScore()} 
                  size={100}
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
                    variant="h6"
                    component="div"
                    color="text.secondary"
                  >
                    {`${getOverallScore()}%`}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="text.secondary" align="center">
                Based on all performance metrics
              </Typography>
            </Card>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        <Typography variant="h6" gutterBottom>
          Team Performance Ratings
        </Typography>
        
        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={4} md={2.4}>
            <Box textAlign="center">
              <Typography variant="subtitle2" gutterBottom>
                Collaboration
              </Typography>
              <Rating 
                name="collaboration"
                value={reviewData.collaboration}
                onChange={(event, newValue) => {
                  handleRatingChange('collaboration', newValue);
                }}
                precision={1}
              />
              {errors.collaboration && (
                <FormHelperText error sx={{ textAlign: 'center' }}>{errors.collaboration}</FormHelperText>
              )}
            </Box>
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <Box textAlign="center">
              <Typography variant="subtitle2" gutterBottom>
                Productivity
              </Typography>
              <Rating 
                name="productivity"
                value={reviewData.productivity}
                onChange={(event, newValue) => {
                  handleRatingChange('productivity', newValue);
                }}
                precision={1}
              />
              {errors.productivity && (
                <FormHelperText error sx={{ textAlign: 'center' }}>{errors.productivity}</FormHelperText>
              )}
            </Box>
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <Box textAlign="center">
              <Typography variant="subtitle2" gutterBottom>
                Quality
              </Typography>
              <Rating 
                name="quality"
                value={reviewData.quality}
                onChange={(event, newValue) => {
                  handleRatingChange('quality', newValue);
                }}
                precision={1}
              />
              {errors.quality && (
                <FormHelperText error sx={{ textAlign: 'center' }}>{errors.quality}</FormHelperText>
              )}
            </Box>
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <Box textAlign="center">
              <Typography variant="subtitle2" gutterBottom>
                Innovation
              </Typography>
              <Rating 
                name="innovation"
                value={reviewData.innovation}
                onChange={(event, newValue) => {
                  handleRatingChange('innovation', newValue);
                }}
                precision={1}
              />
              {errors.innovation && (
                <FormHelperText error sx={{ textAlign: 'center' }}>{errors.innovation}</FormHelperText>
              )}
            </Box>
          </Grid>
          <Grid item xs={6} sm={4} md={2.4}>
            <Box textAlign="center">
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
              />
              {errors.communication && (
                <FormHelperText error sx={{ textAlign: 'center' }}>{errors.communication}</FormHelperText>
              )}
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
              label="Team Feedback"
              name="feedback"
              value={reviewData.feedback}
              onChange={handleInputChange}
              error={!!errors.feedback}
              helperText={errors.feedback || "Provide detailed feedback about the team's overall performance"}
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
              helperText="Highlight the team's key strengths and achievements"
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
              helperText="Suggest areas where the team can improve and develop"
            />
          </Grid>
        </Grid>
        
        <Box mt={4} display="flex" justifyContent="flex-end">
          <Button 
            variant="outlined" 
            onClick={onCancel} 
            sx={{ mr: 2 }}
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
      </CardContent>
    </Paper>
  );
};

export default TeamReview; 