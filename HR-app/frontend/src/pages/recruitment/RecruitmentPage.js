import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  Chip,
  Divider,
  IconButton
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy'; // AI icon
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useSnackbar } from 'notistack';
import recruitmentService from '../../services/recruitmentService';

// --- Mock Data (Replace with API calls) --- 
const MOCK_JOB_ID = "60d5ec49e77c7b001f8e8d8a"; // Example ObjectId
const MOCK_CANDIDATES = [
  {
    candidate_id: "60d5ec94e77c7b001f8e8d8b", 
    name: "Alice Applicant", 
    status: "applied", 
    resume_url: "https://example.com/resume_alice.pdf", // Needs a real URL for testing
    ai_screening_status: null, 
    ai_screening_score: null, 
    ai_screening_summary: null
  },
  {
    candidate_id: "60d5ecb0e77c7b001f8e8d8c", 
    name: "Bob Builder", 
    status: "applied", 
    resume_url: "https://example.com/resume_bob.docx", // Needs a real URL for testing
    ai_screening_status: "screened", 
    ai_screening_score: 8, 
    ai_screening_summary: "Good match for required skills in Python and cloud platforms."
  },
  {
    candidate_id: "60d5eccfe77c7b001f8e8d8d", 
    name: "Charlie Chaplin", 
    status: "applied", 
    resume_url: "invalid_url", // Example of bad URL
    ai_screening_status: "error", 
    ai_screening_score: null, 
    ai_screening_summary: "Failed to download or parse resume."
  },
];
// --- End Mock Data --- 

const RecruitmentPage = () => {
  const [jobId, setJobId] = useState(MOCK_JOB_ID);
  const [candidates, setCandidates] = useState(MOCK_CANDIDATES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screeningStatus, setScreeningStatus] = useState({}); // Track screening button loading state { [candidate_id]: true/false }
  const { enqueueSnackbar } = useSnackbar();

  // TODO: Replace useEffect with actual data fetching for jobs and candidates
  useEffect(() => {
    // Simulating loading initially
    setLoading(true);
    // Fetch job list, then candidates for a selected job
    // e.g., recruitmentService.getJobs().then(...)
    // e.g., recruitmentService.getCandidatesForJob(selectedJobId).then(...)
    setTimeout(() => {
        setCandidates(MOCK_CANDIDATES); // Use mock data for now
        setLoading(false);
    }, 1000);
  }, []); // Fetch once on mount

  const handleScreenResume = useCallback(async (candidateId) => {
    setScreeningStatus(prev => ({ ...prev, [candidateId]: true }));
    try {
      const result = await recruitmentService.triggerAiResumeScreening(jobId, candidateId);
      enqueueSnackbar(result.message || 'Screening task queued!', { variant: 'info' });
      
      // Optimistically update status to 'queued' locally
      setCandidates(prevCandidates => prevCandidates.map(c => 
        c.candidate_id === candidateId ? { ...c, ai_screening_status: 'queued' } : c
      ));
      
      // TODO: Implement polling or WebSocket to get final screening results automatically
      // For now, user would need to refresh later to see "screened" or "error" status.

    } catch (err) {
      console.error("Screening trigger failed:", err);
      enqueueSnackbar(`Failed to queue screening: ${err.response?.data?.message || err.message}`, { variant: 'error' });
    } finally {
      setScreeningStatus(prev => ({ ...prev, [candidateId]: false }));
    }
  }, [jobId, enqueueSnackbar]);

  const getStatusChip = (status, summary) => {
    let color = 'default';
    let icon = null;
    let label = status || 'Not Screened';

    switch (status) {
      case 'queued':
        color = 'warning';
        icon = <HourglassEmptyIcon fontSize="small" />;
        label = 'Queued';
        break;
      case 'screening':
        color = 'info';
        icon = <CircularProgress size={16} sx={{ mr: 0.5 }} />;
        label = 'Screening...';
        break;
      case 'screened':
        color = 'success';
        icon = <CheckCircleIcon fontSize="small" />;
        label = 'Screened';
        break;
      case 'error':
        color = 'error';
        icon = <ErrorIcon fontSize="small" />;
        label = 'Error';
        break;
      default:
        icon = null; // No icon for 'Not Screened'
    }

    const chip = <Chip icon={icon} label={label} color={color} size="small" variant="outlined" />;
    
    // Add tooltip for error or screened status with summary
    if (status === 'error' || (status === 'screened' && summary)) {
      return <Tooltip title={summary || 'An error occurred'} arrow>{chip}</Tooltip>;
    }
    return chip;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Recruitment - Job ID: {jobId}
      </Typography>
      
      {/* TODO: Add Job details section here */} 

      <Paper sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Candidates</Typography>
        <List disablePadding>
          {candidates.map((candidate, index) => (
            <React.Fragment key={candidate.candidate_id}>
              <ListItem
                secondaryAction={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                     {getStatusChip(candidate.ai_screening_status, candidate.ai_screening_summary)}
                     {candidate.ai_screening_score !== null && (
                       <Chip label={`Score: ${candidate.ai_screening_score}/10`} size="small" />
                     )}
                    <Tooltip title="Screen Resume with AI">
                      {/* Disable button if screening not possible or in progress */}
                      <IconButton
                        edge="end"
                        aria-label="screen resume"
                        onClick={() => handleScreenResume(candidate.candidate_id)}
                        disabled={!candidate.resume_url || screeningStatus[candidate.candidate_id] || ['.pdf', '.docx'].every(ext => !candidate.resume_url?.toLowerCase().endsWith(ext)) || ['queued', 'screening', 'screened'].includes(candidate.ai_screening_status)}
                        color="primary"
                      >
                        {screeningStatus[candidate.candidate_id] ? <CircularProgress size={20} /> : <SmartToyIcon />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemText 
                  primary={candidate.name} 
                  secondary={`Status: ${candidate.status} | Resume: ${candidate.resume_url ? candidate.resume_url.substring(candidate.resume_url.lastIndexOf('/') + 1) : 'N/A'}`}
                />
              </ListItem>
              {index < candidates.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
        {candidates.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            No candidates found for this job.
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default RecruitmentPage; 