import React from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import TeamForm from '../../components/teams/TeamForm';

const CreateTeam = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          component={Link}
          to="/teams"
          sx={{ mr: 2 }}
        >
          Back to Teams
        </Button>
        <Typography variant="h4" component="h1">
          Create New Team
        </Typography>
      </Box>
      
      <TeamForm />
    </Container>
  );
};

export default CreateTeam; 