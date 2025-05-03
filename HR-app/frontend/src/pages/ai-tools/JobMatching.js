import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Divider,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
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
  IconButton,
  Tooltip,
  Rating
} from '@mui/material';
import {
  Search as SearchIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  MoreVert as MoreVertIcon,
  FilterList as FilterListIcon,
  Sort as SortIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import aiService from '../../services/aiService';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import employeeService from '../../services/employeeService';

// Keep mock data as fallback in case the API fails
const mockEmployees = [
  {
    id: 'emp001',
    name: 'John Doe',
    position: 'Senior Developer',
    department: 'Engineering',
    skills: ['JavaScript', 'React', 'Node.js', 'TypeScript', 'AWS'],
    experience: 6,
    education: 'MS Computer Science',
    availability: 'Available',
    photo: 'https://mui.com/static/images/avatar/1.jpg'
  },
  {
    id: 'emp002',
    name: 'Jane Smith',
    position: 'UX Designer',
    department: 'Product',
    skills: ['UI Design', 'User Research', 'Figma', 'Sketch', 'Prototyping'],
    experience: 4,
    education: 'BFA Design',
    availability: 'Available in 2 weeks',
    photo: 'https://mui.com/static/images/avatar/2.jpg'
  },
  {
    id: 'emp003',
    name: 'Michael Brown',
    position: 'Product Manager',
    department: 'Product',
    skills: ['Product Strategy', 'Agile', 'User Stories', 'Market Research', 'Data Analysis'],
    experience: 7,
    education: 'MBA',
    availability: 'On project until June',
    photo: 'https://mui.com/static/images/avatar/3.jpg'
  },
  {
    id: 'emp004',
    name: 'Emily Wilson',
    position: 'DevOps Engineer',
    department: 'Engineering',
    skills: ['Docker', 'Kubernetes', 'CI/CD', 'AWS', 'Terraform'],
    experience: 5,
    education: 'BS Computer Engineering',
    availability: 'Available',
    photo: 'https://mui.com/static/images/avatar/4.jpg'
  },
  {
    id: 'emp005',
    name: 'Robert Garcia',
    position: 'Data Scientist',
    department: 'Analytics',
    skills: ['Python', 'Machine Learning', 'SQL', 'Data Visualization', 'Statistics'],
    experience: 3,
    education: 'PhD Data Science',
    availability: 'Available in 1 week',
    photo: 'https://mui.com/static/images/avatar/5.jpg'
  }
];

const mockJobs = [
  {
    id: 'job001',
    title: 'Frontend Developer',
    department: 'Engineering',
    location: 'San Francisco, CA',
    requiredSkills: ['JavaScript', 'React', 'CSS', 'HTML'],
    requiredExperience: '3+ years',
    requiredEducation: 'BS Computer Science or equivalent',
    status: 'Open'
  },
  {
    id: 'job002',
    title: 'UX/UI Designer',
    department: 'Product',
    location: 'New York, NY',
    requiredSkills: ['UI Design', 'User Research', 'Figma', 'Prototyping'],
    requiredExperience: '2+ years',
    requiredEducation: 'Design degree or equivalent',
    status: 'Open'
  },
  {
    id: 'job003',
    title: 'Data Engineer',
    department: 'Analytics',
    location: 'Remote',
    requiredSkills: ['Python', 'SQL', 'ETL', 'Data Modeling'],
    requiredExperience: '4+ years',
    requiredEducation: 'BS in Computer Science or related field',
    status: 'Open'
  }
];

const mockMatches = [
  {
    job_id: 'job001',
    employee_id: 'emp001',
    match_score: 95,
    skill_match: 90,
    experience_match: 100,
    education_match: 95,
    overall_fit: 'Excellent',
    notes: 'Perfect match for the position. Has all required skills plus additional experience with TypeScript and AWS.',
    employee_name: 'John Doe',
    position: 'Senior Developer',
    department: 'Engineering',
    job_title: 'Frontend Developer',
    matching_skills: ['JavaScript', 'React'],
    required_skills: ['JavaScript', 'React', 'CSS', 'HTML'],
    experience: '6 years',
    suitability: 95
  },
  {
    job_id: 'job001',
    employee_id: 'emp004',
    match_score: 75,
    skill_match: 60,
    experience_match: 90,
    education_match: 80,
    overall_fit: 'Good',
    notes: 'Good technical background but missing some frontend specific skills. Would need training on React.',
    employee_name: 'Emily Wilson',
    position: 'DevOps Engineer',
    department: 'Engineering',
    job_title: 'Frontend Developer',
    matching_skills: ['JavaScript'],
    required_skills: ['JavaScript', 'React', 'CSS', 'HTML'],
    experience: '5 years',
    suitability: 75
  },
  {
    job_id: 'job002',
    employee_id: 'emp002',
    match_score: 98,
    skill_match: 100,
    experience_match: 95,
    education_match: 100,
    overall_fit: 'Excellent',
    notes: 'Ideal candidate with exactly the right skill set and experience.',
    employee_name: 'Jane Smith',
    position: 'UX Designer',
    department: 'Product',
    job_title: 'UX/UI Designer',
    matching_skills: ['UI Design', 'User Research', 'Figma', 'Prototyping'],
    required_skills: ['UI Design', 'User Research', 'Figma', 'Prototyping'],
    experience: '4 years',
    suitability: 98
  },
  {
    job_id: 'job003',
    employee_id: 'emp005',
    match_score: 85,
    skill_match: 80,
    experience_match: 90,
    education_match: 100,
    overall_fit: 'Very Good',
    notes: 'Strong data science background. Some additional training on ETL processes would be beneficial.',
    employee_name: 'Robert Garcia',
    position: 'Data Scientist',
    department: 'Analytics',
    job_title: 'Data Engineer',
    matching_skills: ['Python', 'SQL'],
    required_skills: ['Python', 'SQL', 'ETL', 'Data Modeling'],
    experience: '3 years',
    suitability: 85
  }
];

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
      // Call the actual API endpoint for job matching
      console.log(`Finding matches for job ID: ${selectedJob}`);
      
      let response;
      try {
        // Try POST request first as shown in component
        response = await axios.post('/api/ai/job-matching/', {
          job_id: selectedJob
        });
        console.log('Job matching POST response:', response);
      } catch (postError) {
        console.warn('POST request failed, trying GET request instead:', postError);
        // If POST fails, try GET with query params as shown in backend
        response = await axios.get(`/api/ai/job-matching/?job_id=${selectedJob}`);
        console.log('Job matching GET response:', response);
      }
      
      let matchesData = [];
      
      if (response.data) {
        // Try different possible response structures
        if (Array.isArray(response.data)) {
          matchesData = response.data;
        } else if (response.data.matches && Array.isArray(response.data.matches)) {
          matchesData = response.data.matches;
        } else {
          // Look for any array in the response
          for (const key in response.data) {
            if (Array.isArray(response.data[key])) {
              matchesData = response.data[key];
              break;
            }
          }
        }
      }
      
      if (matchesData.length > 0) {
        // Enrich match data with employee information if it's missing
        const enrichedMatches = matchesData.map(match => {
          // If the match doesn't have complete employee information, try to find it
          if ((!match.employee_name && !match.employee?.name) || 
              (!match.position && !match.employee?.position)) {
            const employeeId = match.employee_id;
            const employee = employees.find(emp => emp.id?.toString() === employeeId?.toString());
            
            if (employee) {
              console.log('Enriching match with employee data:', employee);
              return {
                ...match,
                employee_name: employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
                position: employee.position || 'DATA Yet to be added',
                department: match.department || employee.department || 'DATA Yet to be added'
              };
            }
          }
          return match;
        });
        
        setMatchResults(enrichedMatches);
        setTabValue(1); // Switch to results tab
        toast.success(`Found ${enrichedMatches.length} potential matches`);
      } else {
        console.warn('No matches found in API response, using mock data filtered by selected job');
        // Filter mock data to match selected job
        const mockMatched = mockMatches.filter(match => match.job_id === selectedJob);
        if (mockMatched.length > 0) {
          setMatchResults(mockMatched);
          setTabValue(1);
          toast.info(`Found ${mockMatched.length} potential matches (from mock data)`);
        } else {
          setMatchResults([]);
          toast.info('No matches found for the selected criteria');
        }
      }
    } catch (error) {
      console.error('Error finding matches:', error);
      toast.error('Failed to find matches. Using mock data as fallback.');
      
      // Filter mock data to match selected job as fallback
      const mockMatched = mockMatches.filter(match => match.job_id === selectedJob);
      if (mockMatched.length > 0) {
        setMatchResults(mockMatched);
        setTabValue(1);
      } else {
        setMatchResults([]);
      }
    } finally {
      setIsMatching(false);
    }
  };
  
  // Load jobs and employees data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      console.log('Loading initial data...');
      
      // Flag to track if we're using mock data
      let usingMockData = false;
      
      try {
        // Try to load job openings from the API
        let jobsData = [];
        try {
          const jobsResponse = await axios.get('/api/jobs/');
          console.log('Jobs API response:', jobsResponse);
          
          if (jobsResponse.data && Array.isArray(jobsResponse.data)) {
            jobsData = jobsResponse.data;
          } else if (jobsResponse.data && typeof jobsResponse.data === 'object') {
            jobsData = jobsResponse.data.results || [];
          }
        } catch (jobsError) {
          console.error('Error loading jobs:', jobsError);
          usingMockData = true;
          jobsData = mockJobs;
        }
        
        // If no jobs were returned from API, use mock data
        if (jobsData.length === 0) {
          console.warn('No job data in API response, using mock data');
          jobsData = mockJobs;
          usingMockData = true;
        }
        
        setJobs(jobsData);
        console.log(`Loaded ${jobsData.length} jobs`);
        
        // Try to load employee data
        let employeeData = [];
        try {
          // Use the dedicated service function which handles fallbacks and mapping
          employeeData = await employeeService.getAllEmployees({
            // You might want to pass specific params if needed, e.g., limit
            _t: new Date().getTime() // Keep cache busting
          });
          console.log('Employees service response:', employeeData);

          // Service already returns an array or empty array on failure,
          // so direct assignment is sufficient. Error handling is inside the service.

        } catch (employeeServiceError) {
          // Catch errors specifically from the service call itself (e.g., network error before API call)
          // The service internally handles API errors and returns [] in those cases.
          console.error('Error calling employee service:', employeeServiceError);
          usingMockData = true;
          employeeData = mockEmployees; // Fallback to mock if service call fails entirely
        }
        
        // If the service returned an empty array (meaning all API attempts failed), use mock data
        if (employeeData.length === 0) {
          console.warn('Employee service returned no data, using mock data');
          employeeData = mockEmployees;
          usingMockData = true; // Ensure flag is set if service returns empty
        }
        
        setEmployees(employeeData);
        console.log(`Loaded ${employeeData.length} employees`);
        
        // Try to get job matches data
        let matchesData = [];
        try {
        const initialMatches = await aiService.getJobMatches();
        console.log('Initial Matches Data:', initialMatches);
          
          if (Array.isArray(initialMatches) && initialMatches.length > 0) {
            matchesData = initialMatches;
          } else if (initialMatches && Array.isArray(initialMatches.matches)) {
            matchesData = initialMatches.matches;
          } else if (initialMatches && typeof initialMatches === 'object') {
            // Extract matches from response object if it exists
            for (const key in initialMatches) {
              if (Array.isArray(initialMatches[key])) {
                matchesData = initialMatches[key];
                break;
              }
            }
          }
        } catch (matchError) {
          console.error('Error fetching matches:', matchError);
          usingMockData = true;
          matchesData = mockMatches;
        }
        
        // If no matches were returned or matches are empty, use mock data
        if (matchesData.length === 0) {
          console.warn('No matches in API response, using mock data');
          matchesData = mockMatches;
          usingMockData = true;
        }
        
        // Enrich match data with employee information if needed
        if (!usingMockData) {
          matchesData = matchesData.map(match => {
            const employeeId = match.employee_id;
            const employee = employeeData.find(emp => emp.id?.toString() === employeeId?.toString());
            
            if (employee) {
              return {
                ...match,
                employee_name: employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
                position: employee.position || 'DATA Yet to be added',
                department: match.department || employee.department || 'DATA Yet to be added'
              };
            }
            return match;
          });
        }
        
        setMatchResults(matchesData);
        
        // Set error message if we're using mock data
        if (usingMockData) {
          setError('Failed to load data from server. Using mock data as fallback.');
        }
        
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data from server. Using mock data as fallback.');
        
        // Use mock data as fallback
        setJobs(mockJobs);
        setEmployees(mockEmployees);
        setMatchResults(mockMatches);
      } finally {
        setIsLoading(false);
        console.log('Finished loading data.');
      }
    };
    
    loadData();
  }, []);
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        AI Job Matching
      </Typography>
      
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
                              <Avatar sx={{ mr: 1 }}>
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
                                  const hasSkill = match.matching_skills && match.matching_skills.includes(skill);
                                  return (
                                    <Chip 
                                      key={idx} 
                                      label={skill} 
                                      size="small"
                                      color={hasSkill ? 'success' : 'default'}
                                      icon={hasSkill ? <CheckCircleIcon /> : undefined}
                                    />
                                  );
                                })}
                                {(!match.required_skills || (Array.isArray(match.required_skills) && match.required_skills.length === 0)) && 
                                  match.job?.requiredSkills && match.job.requiredSkills.map((skill, idx) => {
                                    // For backend format
                                    const hasSkill = match.employee?.skills && match.employee.skills.includes(skill);
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
