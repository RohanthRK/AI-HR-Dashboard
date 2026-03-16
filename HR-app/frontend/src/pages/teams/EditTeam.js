import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Typography, Box, Button, CircularProgress, Alert } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import TeamForm from '../../components/teams/TeamForm';
import aiService from '../../services/aiService';

const EditTeam = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [team, setTeam] = useState(null);
  
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        
        // Fetch team stats data from API
        const data = await aiService.getTeamStats();
        
        // Find the team with the matching ID
        let foundTeam = null;
        
        // Search through departments and teams
        for (const dept of data.departments) {
          const matchingTeam = dept.teams.find(team => team.id === id);
          if (matchingTeam) {
            // Format the team data to match our form requirements
            foundTeam = {
              id: matchingTeam.id,
              name: matchingTeam.name,
              department: dept.name,
              description: matchingTeam.description || `Team from ${dept.name} department`,
              leader: matchingTeam.employees.length > 0 ? {
                id: matchingTeam.employees[0].id,
                name: matchingTeam.employees[0].name,
                position: matchingTeam.employees[0].position || 'Team Lead',
                employee_id: `EMP${matchingTeam.employees[0].id.padStart(3, '0')}`
              } : null,
              members: matchingTeam.employees.map(employee => ({
                id: employee.id,
                name: employee.name,
                position: employee.position || 'Team Member',
                employee_id: `EMP${employee.id.padStart(3, '0')}`
              }))
            };
            break;
          }
        }
        
        if (foundTeam) {
          setTeam(foundTeam);
        } else {
          setError('Team not found');
        }
      } catch (err) {
        console.error('Error fetching team details:', err);
        setError('Failed to load team details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTeam();
  }, [id]);
  
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" my={8}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  if (error || !team) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          component={Link}
          to="/teams"
          sx={{ mb: 3 }}
        >
          Back to Teams
        </Button>
        <Alert severity="error" sx={{ my: 4 }}>
          {error || 'Team not found'}
        </Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          component={Link}
          to={`/teams/${id}`}
          sx={{ mr: 2 }}
        >
          Back to Team Details
        </Button>
        <Typography variant="h4" component="h1">
          Edit Team: {team.name}
        </Typography>
      </Box>
      
      <TeamForm team={team} isEdit={true} />
    </Container>
  );
};

export default EditTeam; 