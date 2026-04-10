import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper, 
  Container,
  useTheme,
  alpha
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import RateReviewIcon from '@mui/icons-material/RateReview';
import PsychologicalIcon from '@mui/icons-material/Psychology';

// Tab Components (to be created)
import OKRTab from './OKRTab';
import PIPTab from './PIPTab';
import ReviewsTab from './ReviewsTab';
import SkillsTab from './SkillsTab';

const Performance = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'okrs';

  const tabMap = {
    'okrs': 0,
    'pip': 1,
    'reviews': 2,
    'skills': 3
  };

  const reverseTabMap = {
    0: 'okrs',
    1: 'pip',
    2: 'reviews',
    3: 'skills'
  };

  const tabValue = tabMap[currentTab] !== undefined ? tabMap[currentTab] : 0;
  
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleTabChange = (event, newValue) => {
    setSearchParams({ tab: reverseTabMap[newValue] });
  };

  const tabStyle = {
    fontWeight: 900,
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    minHeight: '60px',
    borderRadius: 0,
    border: '2px solid #000',
    mr: 2,
    transition: 'all 0.2s ease',
    '&.Mui-selected': {
      bgcolor: '#fcc419',
      color: '#000',
      boxShadow: '4px 4px 0px #000',
      transform: 'translate(-2px, -2px)',
    },
    '&:hover': {
      bgcolor: alpha('#fcc419', 0.1),
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 900, 
            mb: 1,
            textShadow: isDark ? '3px 3px 0px #000' : 'none'
          }}
        >
          Performance Hub
        </Typography>
        <Typography 
          variant="subtitle1" 
          color="text.secondary"
          sx={{ fontWeight: 600 }}
        >
          Manage OKRs, Personal Improvement Plans, Reviews, and Skills.
        </Typography>
      </Box>

      <Box sx={{ borderBottom: 0, mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons={false}
          TabIndicatorProps={{ style: { display: 'none' } }}
          sx={{ minHeight: '80px' }}
        >
          <Tab 
            icon={<TrackChangesIcon />} 
            iconPosition="start" 
            label="OKRs" 
            sx={tabStyle} 
          />
          <Tab 
            icon={<TrendingUpIcon />} 
            iconPosition="start" 
            label="PIP Plan" 
            sx={tabStyle} 
          />
          <Tab 
            icon={<RateReviewIcon />} 
            iconPosition="start" 
            label="Reviews" 
            sx={tabStyle} 
          />
          <Tab 
            icon={<PsychologicalIcon />} 
            iconPosition="start" 
            label="Skills" 
            sx={tabStyle} 
          />
        </Tabs>
      </Box>

      <Paper 
        elevation={0} 
        sx={{ 
          p: 4, 
          border: '4px solid #000', 
          borderRadius: 0, 
          boxShadow: isDark ? '15px 15px 0px #444' : '15px 15px 0px #000',
          minHeight: '600px',
          bgcolor: 'background.paper'
        }}
      >
        {tabValue === 0 && <OKRTab />}
        {tabValue === 1 && <PIPTab />}
        {tabValue === 2 && <ReviewsTab />}
        {tabValue === 3 && <SkillsTab />}
      </Paper>
    </Container>
  );
};

export default Performance;
