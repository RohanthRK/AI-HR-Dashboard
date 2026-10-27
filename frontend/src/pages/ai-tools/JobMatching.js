import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Divider,
  Chip,
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Rating,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Search as SearchIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import axios from '../../services/api';

import { toast } from 'react-hot-toast';

import employeeService from '../../services/employeeService';
import JobDialog from '../../components/recruitment/JobDialog';


const JobMatching = () => {
  // State for job selection
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedJobDetails, setSelectedJobDetails] = useState(null);

  // State for employee selection
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState(null);

  // State for matching results
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState([]);
  const [error, setError] = useState(null);

  // State for job and employee data
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State for tabs
  const [tabValue, setTabValue] = useState(0);
  const [jobDialogOpen, setJobDialogOpen] = useState(false);

  const mapJob = (job) => ({
    id: job._id,
    title: job.title,
    department: job.department || 'N/A',
    location: job.location || 'Not specified',
    requiredSkills: (typeof job.skills === 'string' ? job.skills.split(',') : job.skills || [])
      .map((skill) => skill.trim()).filter(Boolean),
    requiredExperience: job.experience ? (/^\d+(\.\d+)?$/.test(String(job.experience)) ? `${job.experience}+ years` : job.experience) : 'Not specified',
    requiredEducation: job.education || 'Not specified',
    status: job.status,
  });

  // A new opening was created here: add it to the list and select it
  const handleJobSaved = (job) => {
    const mapped = mapJob(job);
    setJobs((prev) => [mapped, ...prev.filter((j) => j.id !== mapped.id)]);
    setSelectedJob(mapped.id);
    setSelectedJobDetails(mapped);
    setMatchResults([]);
    toast.success(`Opening “${job.title}” created. Click Find Matches to see who fits.`);
  };

  // Handle job selection
  const handleJobChange = (event) => {
    const jobId = event.target.value;
    setSelectedJob(jobId);
    setSelectedJobDetails(Array.isArray(jobs) ? jobs.find(job => job.id === jobId) || null : null);
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Submit for AI matching
  const handleFindMatches = async () => {
    if (!selectedJob) {
      toast.error('Please select a job to find matches');
      return;
    }

    setIsMatching(true);
    try {
      const response = await axios.post('/api/ai/job-matching/', { job_id: selectedJob });
      const matches = Array.isArray(response.data) ? response.data : [];
      setMatchResults(matches);
      if (matches.length > 0) {
        setTabValue(1); // Switch to results tab
        toast.success(`Found ${matches.length} potential matches`);
      } else {
        toast('No employees match the required skills of this job');
      }
    } catch (error) {
      console.error('Error finding matches:', error);
      setMatchResults([]);
      toast.error(error.response?.data?.error || 'Failed to find matches.');
    } finally {
      setIsMatching(false);
    }
  };

  // Load job openings (recruitment board) and employees on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const jobsResponse = await axios.get('/api/recruitment/jobs/');
        const jobsData = (jobsResponse.data.jobs || []).map(mapJob);
        setJobs(jobsData);
        if (jobsData.length > 0) {
          setSelectedJob(jobsData[0].id);
          setSelectedJobDetails(jobsData[0]);
        }
        const employeeData = await employeeService.getAllEmployees({ _t: new Date().getTime() });
        setEmployees(Array.isArray(employeeData) ? employeeData : []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Could not load job openings from the server.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Typography variant="h4" component="h1">
          AI Job Matching
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" component={RouterLink} to="/recruitment">Manage openings &amp; candidates</Button>
          <Button variant="contained" onClick={() => setJobDialogOpen(true)}>+ New job opening</Button>
        </Box>
      </Box>
      <JobDialog open={jobDialogOpen} onClose={() => setJobDialogOpen(false)} onSaved={handleJobSaved} />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Search and Filters Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Find Perfect Matches
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={10}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="job-select-label">Select Job Opening</InputLabel>
                  <Select
                    labelId="job-select-label"
                    value={selectedJob}
                    label="Select Job Opening"
                    onChange={handleJobChange}
                  >
                    <MenuItem value="">
                      <em>Any job opening</em>
                    </MenuItem>
                    {Array.isArray(jobs) && jobs.map((job) => (
                      <MenuItem key={job.id} value={job.id}>
                        {job.title} ({job.department})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isMatching ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                  onClick={handleFindMatches}
                  disabled={isMatching}
                  sx={{ mt: 2 }}
                  fullWidth
                >
                  {isMatching ? 'Finding Matches...' : 'Find Matches'}
                </Button>
              </Grid>
            </Grid>

            {/* Display selected job details */}
            {selectedJobDetails && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />

                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardHeader
                    avatar={<Avatar><WorkIcon /></Avatar>}
                    title={selectedJobDetails.title}
                    subheader={`${selectedJobDetails.department} • ${selectedJobDetails.location}`}
                  />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2">Required Skills:</Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          {selectedJobDetails.requiredSkills.map((skill, index) => (
                            <Chip key={index} label={skill} size="small" />
                          ))}
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Experience:</Typography>
                        <Typography variant="body2">{selectedJobDetails.requiredExperience}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2">Education:</Typography>
                        <Typography variant="body2">{selectedJobDetails.requiredEducation}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Paper>

          {/* Results Section */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="match results tabs">
                <Tab label="Match Results" id="tab-0" />
                <Tab label="Detailed Analysis" id="tab-1" />
              </Tabs>
            </Box>

            {error && (
              <Alert severity="info" sx={{ mt: 2 }}>{error}</Alert>
            )}

            {isMatching && (
              <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {/* Tab 1: Match Results List */}
            <TabPanel value={tabValue} index={0}>
              {!isLoading && matchResults.length > 0 && (
                <TableContainer>
                  <Table sx={{ minWidth: 650 }} aria-label="match results table">
                    <TableHead>
                      <TableRow>
                        <TableCell>Job Title</TableCell>
                        <TableCell>Employee</TableCell>
                        <TableCell align="center">Match Score</TableCell>
                        <TableCell align="center">Skills</TableCell>
                        <TableCell align="center">Experience</TableCell>
                        <TableCell align="center">Suitability</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {matchResults.map((match, index) => (
                        <TableRow
                          key={`match-${index}-${match.employee_id || index}`}
                          sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                          hover
                        >
                          <TableCell component="th" scope="row">
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
                                <WorkIcon />
                              </Avatar>
                              <Box>
                                <Typography variant="body2">
                                  {match.job?.title || match.job_title || match.title || 'DATA Yet to be added'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {match.job?.department || match.department || 'DATA Yet to be added'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Avatar sx={{ mr: 1, bgcolor: '#000', color: '#E0FF4F', border: '2px solid #000' }}>
                                <PersonIcon />
                              </Avatar>
                              <Box>
                                <Typography variant="body2">
                                  {match.employee?.name || match.employee_name || 'DATA Yet to be added'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {match.employee?.position || match.position || 'DATA Yet to be added'}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 'bold',
                                  color: (match.match_score || match.suitability) >= 90 ? 'success.main' :
                                    (match.match_score || match.suitability) >= 75 ? 'primary.main' : 'text.primary'
                                }}
                              >
                                {match.match_score || match.suitability || 'DATA Yet to be added'}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            {match.skill_match ? `${match.skill_match}%` :
                              match.matching_skills ? `${match.matching_skills.length} / ${match.required_skills.length}` :
                                'DATA Yet to be added'}
                          </TableCell>
                          <TableCell align="center">
                            {match.experience_match ? `${match.experience_match}%` :
                              match.experience || 'DATA Yet to be added'}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={
                                (match.overall_fit) || (
                                  (match.match_score || match.suitability) >= 90 ? 'Excellent' :
                                    (match.match_score || match.suitability) >= 80 ? 'Very Good' :
                                      (match.match_score || match.suitability) >= 70 ? 'Good' :
                                        (match.match_score || match.suitability) >= 60 ? 'Fair' : 'DATA Yet to be added'
                                )
                              }
                              color={
                                (match.match_score || match.suitability) >= 90 ? 'success' :
                                  (match.match_score || match.suitability) >= 80 ? 'primary' :
                                    (match.match_score || match.suitability) >= 70 ? 'info' :
                                      (match.match_score || match.suitability) >= 60 ? 'warning' : 'default'
                              }
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            {/* Tab 2: Detailed Analysis */}
            <TabPanel value={tabValue} index={1}>
              {!isLoading && matchResults.length > 0 && (
                <Grid container spacing={3}>
                  {matchResults.map((match, index) => (
                    <Grid item xs={12} key={`detail-${index}-${match.employee_id || index}`}>
                      <Card variant="outlined">
                        <CardHeader
                          title={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="h6">
                                {match.employee?.name || match.employee_name || 'DATA Yet to be added'} • {match.job?.title || match.job_title || match.title || 'DATA Yet to be added'}
                              </Typography>
                              <Chip
                                label={`${match.match_score || match.suitability || 'DATA Yet to be added'}% Match`}
                                color={
                                  (match.match_score || match.suitability) >= 90 ? 'success' :
                                    (match.match_score || match.suitability) >= 80 ? 'primary' :
                                      (match.match_score || match.suitability) >= 70 ? 'info' :
                                        (match.match_score || match.suitability) >= 60 ? 'warning' : 'default'
                                }
                                size="small"
                                sx={{ ml: 2 }}
                              />
                            </Box>
                          }
                          action={
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Rating
                                value={(match.match_score || match.suitability) ? (match.match_score || match.suitability) / 20 : 0}
                                readOnly
                                precision={0.5}
                                emptyIcon={<StarBorderIcon fontSize="inherit" />}
                                icon={<StarIcon fontSize="inherit" />}
                              />
                            </Box>
                          }
                        />
                        <Divider />
                        <CardContent>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <Typography variant="subtitle2" gutterBottom>Matching Skills</Typography>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {match.required_skills && match.required_skills.map((skill, idx) => {
                                  const skillName = typeof skill === 'string' ? skill : (skill?.name || '');
                                  const hasSkill = match.matching_skills && match.matching_skills.some(s => (typeof s === 'string' ? s : s.name) === skillName);
                                  return (
                                    <Chip
                                      key={idx}
                                      label={skillName}
                                      size="small"
                                      color={hasSkill ? 'success' : 'default'}
                                      icon={hasSkill ? <CheckCircleIcon /> : undefined}
                                    />
                                  );
                                })}
                                {(!match.required_skills || (Array.isArray(match.required_skills) && match.required_skills.length === 0)) &&
                                  match.job?.requiredSkills && match.job.requiredSkills.map((skill, idx) => {
                                    // For backend format
                                    const hasSkill = match.employee?.skills && match.employee.skills.some(s => (typeof s === 'string' ? s : s.name) === skill);
                                    return (
                                      <Chip
                                        key={idx}
                                        label={skill}
                                        size="small"
                                        color={hasSkill ? 'success' : 'default'}
                                        icon={hasSkill ? <CheckCircleIcon /> : undefined}
                                      />
                                    );
                                  })
                                }
                                {(!match.required_skills || (Array.isArray(match.required_skills) && match.required_skills.length === 0)) &&
                                  !match.job?.requiredSkills && (
                                    <Typography variant="body2">DATA Yet to be added</Typography>
                                  )}
                              </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Typography variant="subtitle2" gutterBottom>Experience</Typography>
                              <Typography variant="body2">
                                {match.experience_match ? `${match.experience_match}% match` :
                                  match.experience || 'DATA Yet to be added'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Typography variant="subtitle2" gutterBottom>Department</Typography>
                              <Typography variant="body2">
                                {match.job?.department || match.department || 'DATA Yet to be added'}
                              </Typography>
                            </Grid>
                            <Grid item xs={12}>
                              <Typography variant="subtitle1" gutterBottom>Suitability Assessment</Typography>
                              <Typography variant="body2">
                                {match.notes || (
                                  <>
                                    <strong>Employee:</strong> {match.employee?.name || match.employee_name || 'DATA Yet to be added'}<br />
                                    <strong>Position:</strong> {match.employee?.position || match.position || 'DATA Yet to be added'}<br />
                                    <strong>Department:</strong> {match.job?.department || match.department || 'DATA Yet to be added'}<br />
                                    <strong>Match Score:</strong> {match.match_score || match.suitability || 'DATA Yet to be added'}%<br />
                                    <strong>Assessment:</strong> This candidate is a {
                                      (match.match_score || match.suitability) >= 90 ? 'excellent' :
                                        (match.match_score || match.suitability) >= 80 ? 'very good' :
                                          (match.match_score || match.suitability) >= 70 ? 'good' :
                                            (match.match_score || match.suitability) >= 60 ? 'fair' : 'basic'
                                    } match for the position of {match.job?.title || match.job_title || 'this job'}.
                                  </>
                                )}
                              </Typography>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </TabPanel>
          </Paper>
        </>
      )}
    </Box>
  );
};

// TabPanel component for tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default JobMatching; 
