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
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleIcon from '@mui/icons-material/People';

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
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        ...reviewData,
        team_id: team.id,
        review_date: new Date().toISOString(),
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
              <Typography variant="body2" color="text.secondary">
                Based on your current ratings
              </Typography>
            </Card>
          </Grid>
        </Grid>

        <Typography variant="h6" gutterBottom>
          Performance Metrics
        </Typography>
        <Grid container spacing={3} mb={4}>
          <Grid item md={6} xs={12}>
            <Box mb={2}>
              <Typography variant="subtitle1" gutterBottom>
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
                <Typography variant="caption" color="error">
                  {errors.collaboration}
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box mb={2}>
              <Typography variant="subtitle1" gutterBottom>
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
                <Typography variant="caption" color="error">
                  {errors.productivity}
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box mb={2}>
              <Typography variant="subtitle1" gutterBottom>
                Quality of Work
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
                <Typography variant="caption" color="error">
                  {errors.quality}
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box mb={2}>
              <Typography variant="subtitle1" gutterBottom>
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
                <Typography variant="caption" color="error">
                  {errors.innovation}
                </Typography>
              )}
            </Box>
          </Grid>
          <Grid item md={6} xs={12}>
            <Box mb={2}>
              <Typography variant="subtitle1" gutterBottom>
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
                <Typography variant="caption" color="error">
                  {errors.communication}
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>

        <Typography variant="h6" gutterBottom>
          Feedback
        </Typography>
        <Box mb={3}>
          <TextField
            fullWidth
            label="Overall Feedback"
            name="feedback"
            value={reviewData.feedback}
            onChange={handleInputChange}
            error={!!errors.feedback}
            helperText={errors.feedback}
            placeholder="Provide general feedback about the team's performance..."
            multiline
            rows={3}
            variant="outlined"
          />
        </Box>

        <Grid container spacing={3}>
          <Grid item md={6} xs={12}>
            <TextField
              fullWidth
              label="Key Strengths"
              name="strengths"
              value={reviewData.strengths}
              onChange={handleInputChange}
              placeholder="What does this team excel at?"
              multiline
              rows={3}
              variant="outlined"
            />
          </Grid>
          <Grid item md={6} xs={12}>
            <TextField
              fullWidth
              label="Areas for Improvement"
              name="areas_for_improvement"
              value={reviewData.areas_for_improvement}
              onChange={handleInputChange}
              placeholder="Where can this team improve?"
              multiline
              rows={3}
              variant="outlined"
            />
          </Grid>
        </Grid>

        <Box display="flex" justifyContent="flex-end" mt={4}>
          <Button 
            variant="outlined" 
            color="inherit" 
            onClick={onCancel} 
            disabled={isSubmitting}
            sx={{ mr: 2 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            type="submit"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </Box>
      </CardContent>
    </Paper>
  );
};

export default TeamReview; 