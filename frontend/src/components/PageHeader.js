import React from 'react';
import { Box, Typography } from '@mui/material';

const PageHeader = ({ title, subtitle }) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h4" component="h1">{title}</Typography>
      {subtitle && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{subtitle}</Typography>}
    </Box>
  );
};

export default PageHeader; 