import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  ToggleButtonGroup, 
  ToggleButton,
  Paper
} from '@mui/material';
import MyReviews from '../reviews/MyReviews';
import TeamPerformanceReview from '../reviews/TeamPerformanceReview';
import Reviews from '../reviews/Reviews';
import { useAuth } from '../../contexts/AuthContext';

const ReviewsTab = () => {
  const { currentUser } = useAuth();
  const [view, setView] = useState('my');
  
  const isManager = ['Admin', 'Manager', 'HR'].includes(currentUser?.role);

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>Performance Reviews</Typography>
        
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={handleViewChange}
          sx={{ 
            '& .MuiToggleButton-root': {
              fontWeight: 800,
              px: 2,
              border: '2px solid #000',
              borderRadius: 0,
              '&.Mui-selected': {
                bgcolor: '#000',
                color: '#fff',
                '&:hover': { bgcolor: '#222' }
              }
            }
          }}
        >
          <ToggleButton value="my">MY REVIEWS</ToggleButton>
          {isManager && <ToggleButton value="team">TEAM REVIEWS</ToggleButton>}
          {isManager && <ToggleButton value="admin">INDIVIDUAL REVIEWS</ToggleButton>}
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ mt: 2 }}>
        {view === 'my' && <MyReviews isComponent={true} />}
        {view === 'team' && <TeamPerformanceReview isComponent={true} />}
        {view === 'admin' && <Reviews isComponent={true} />}
      </Box>
    </Box>
  );
};

export default ReviewsTab;
