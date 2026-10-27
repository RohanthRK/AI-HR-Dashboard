import React, { useState, useEffect } from 'react';

import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Alert,
  Rating,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Autocomplete,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Upload as UploadIcon,
  Close as CloseIcon,
  Send as SendIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  ViewList as ViewListIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

import axios from '../../services/api';



// Styled components
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const ResumeScreening = () => {
  // State for job requirements input
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [jobRequirements, setJobRequirements] = useState('');
  const [experience, setExperience] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [education, setEducation] = useState('');

  // State for candidate information
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');

  // The company's real openings and departments (nothing is hard-coded)
  const [openings, setOpenings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [openingId, setOpeningId] = useState('');

  // State for resume upload and processing
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // State for results
  const [screeningResults, setScreeningResults] = useState(null);
  const [detectedSkills, setDetectedSkills] = useState([]);
  const [matchingSkills, setMatchingSkills] = useState([]);
  const [missingSkills, setMissingSkills] = useState([]);

  // State for saved results view
  const [tabValue, setTabValue] = useState(0);
  const [savedResults, setSavedResults] = useState([]);
  useEffect(() => {
    axios.get('/api/ai/resume-screening/history/').then((res) => setSavedResults(res.data)).catch(() => {});
  }, []);
  const [resultsSaved, setResultsSaved] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useEffect(() => {
    axios.get('/api/recruitment/jobs/').then((res) => setOpenings(res.data.jobs || [])).catch(() => {});
    axios.get('/api/employees/departments/').then((res) => setDepartments((res.data.results || res.data || []).map((d) => d.name).filter(Boolean))).catch(() => {});
  }, []);

  // Choosing an opening fills in its requirements; they stay editable
  const chooseOpening = (id) => {
    setOpeningId(id);
    const job = openings.find((j) => j._id === id);
    if (!job) return;
    setDepartment(job.department || '');
    setJobTitle(job.title || '');
    setExperience(job.experience ? `${job.experience}+ years` : '');
    setEducation(job.education || '');
    setSelectedSkills((job.skills || '').split(',').map((x) => x.trim()).filter(Boolean));
    setJobRequirements(job.description || '');
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle resume file upload
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setResumeFile(file);
      // In a real app, you would upload to a server
      setResumeUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  // Clear the selected file
  const handleClearFile = () => {
    setResumeFile(null);
    if (resumeUrl) {
      URL.revokeObjectURL(resumeUrl);
      setResumeUrl('');
    }
  };

  // Handle multiple skills selection
  const handleSkillsChange = (event, newValues) => {
    setSelectedSkills(newValues);
  };

  // Combine all job requirements into a structured format
  const getFormattedRequirements = () => {
    return `
Job Title: ${jobTitle}
Department: ${department}
Experience Requirements: ${experience}
Required Skills: ${selectedSkills.join(', ')}
Education Requirements: ${education}
Additional Requirements: ${jobRequirements}
    `.trim();
  };

  // Open email dialog
  const handleOpenEmailDialog = () => {
    if (!screeningResults || !candidateEmail) {
      setSnackbarMessage('Candidate email is required to send an email');
      setSnackbarOpen(true);
      return;
    }

    const subject = `Job Application for ${jobTitle} Position`;
    const message = `Dear ${candidateName},\n\nThank you for applying to the ${jobTitle} position at our company. We have reviewed your resume and would like to inform you about the next steps in our hiring process.\n\nBest regards,\nHR Team`;

    setEmailSubject(subject);
    setEmailMessage(message);
    setIsEmailDialogOpen(true);
  };

  // Close email dialog
  const handleCloseEmailDialog = () => {
    setIsEmailDialogOpen(false);
  };

  // Open the user's own mail client with the drafted message (the app does not send email itself)
  const handleSendEmail = () => {
    window.location.href = `mailto:${encodeURIComponent(candidateEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage)}`;
    setSnackbarMessage('Opening your email client...');
    setSnackbarOpen(true);
    setIsEmailDialogOpen(false);
  };

  // Save screening results to the database
  const handleSaveResults = async () => {
    if (!screeningResults || !candidateName) {
      setSnackbarMessage('Candidate name is required to save results');
      setSnackbarOpen(true);
      return;
    }

    try {
      const res = await axios.post('/api/ai/resume-screening/history/', {
        candidateName,
        candidateEmail,
        jobTitle,
        department,
        score: screeningResults.score,
        detectedSkills,
        matchingSkills,
        missingSkills,
        overallMatch: screeningResults.match_details.overall_match
      });
      if (res.data.already_saved) {
        setSnackbarMessage('These results are already saved (see the Saved Results tab).');
      } else {
        setSavedResults((prev) => [res.data, ...prev]);
        setSnackbarMessage('Screening results saved successfully');
      }
      setResultsSaved(true);
    } catch (err) {
      setSnackbarMessage(err.response?.data?.error || 'Could not save the screening results');
    }
    setSnackbarOpen(true);
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  // Submit for AI analysis
  const handleSubmitForAnalysis = async () => {
    // Validate inputs
    if (!jobTitle || !department || !experience || selectedSkills.length === 0 || !education || !resumeFile) {
      setError('Please complete all required fields and upload a resume.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResultsSaved(false);

    try {
      const formData = new FormData();
      formData.append('jobTitle', jobTitle);
      formData.append('department', department);
      formData.append('experience', experience);
      formData.append('skills', selectedSkills.join(', '));
      formData.append('education', education);
      formData.append('jobRequirements', jobRequirements);
      formData.append('resume', resumeFile);

      const response = await axios.post('/api/ai/resume-screening/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;

      setDetectedSkills(data.detected_skills || []);
      setMatchingSkills(data.matching_skills || []);
      setMissingSkills(data.missing_skills || []);
      setScreeningResults(data.results);

    } catch (err) {
      setError('Failed to analyze resume. Please ensure the backend is running and the Gemini API key is configured.');
      console.error('Error analyzing resume:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        AI Resume Screening
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="resume screening tabs">
          <Tab label="New Screening" />
          <Tab label="Saved Results" />
        </Tabs>
      </Box>

      {tabValue === 0 ? (
        <>
          {/* Candidate Information Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Candidate Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Candidate Name"
                  fullWidth
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  margin="normal"
                  required
                  placeholder="Enter candidate's full name"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Candidate Email"
                  fullWidth
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  margin="normal"
                  required
                  placeholder="Enter candidate's email address"
                  type="email"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Job Requirements Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Job Requirements
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth margin="normal">
                  <InputLabel id="opening-label">Job opening</InputLabel>
                  <Select labelId="opening-label" label="Job opening" value={openingId} onChange={(e) => chooseOpening(e.target.value)}>
                    <MenuItem value=""><em>Describe a different role below</em></MenuItem>
                    {openings.map((j) => <MenuItem key={j._id} value={j._id}>{j.title}{j.department ? ` — ${j.department}` : ''}{j.status && j.status !== 'Open' ? ` (${j.status})` : ''}</MenuItem>)}
                  </Select>
                </FormControl>
                <Typography variant="caption" color="text.secondary">Pick one of your openings and its requirements fill in automatically. You can still change them.</Typography>
              </Grid>

              <Grid item xs={12} md={6}>
                <Autocomplete freeSolo options={departments} inputValue={department} onInputChange={(e, v) => setDepartment(v)}
                  renderInput={(params) => <TextField {...params} label="Department" margin="normal" required />} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField label="Job title" fullWidth required margin="normal" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField label="Experience required" fullWidth required margin="normal" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 3+ years" />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField label="Education required" fullWidth required margin="normal" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. B.E. / B.Tech in Computer Science" />
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  freeSolo
                  id="skills-selection"
                  options={[]}
                  value={selectedSkills}
                  onChange={handleSkillsChange}
                  renderInput={(params) => (
                    <TextField {...params} variant="outlined" label="Required skills" placeholder="Type a skill and press Enter" required fullWidth margin="normal" />
                  )}
                  ChipProps={{ size: 'small' }}
                />
                <Typography variant="caption" color="text.secondary">Add the skills the role needs (at least 3 works best)</Typography>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Additional Job Requirements"
                  fullWidth
                  value={jobRequirements}
                  onChange={(e) => setJobRequirements(e.target.value)}
                  margin="normal"
                  multiline
                  rows={4}
                  placeholder="Enter any additional job requirements, responsibilities, or qualifications..."
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Resume Upload Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Resume Upload
            </Typography>

            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Button
                component="label"
                variant="contained"
                startIcon={<UploadIcon />}
                disabled={isUploading}
                sx={{ mb: 2 }}
              >
                Upload Resume (PDF/DOCX)
                <VisuallyHiddenInput type="file" onChange={handleFileChange} accept=".pdf,.docx,.doc" />
              </Button>

              {isUploading && <CircularProgress size={24} sx={{ mt: 1 }} />}

              {resumeFile && (
                <Card variant="outlined" sx={{ width: '100%', mt: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1">
                        {resumeFile.name}
                      </Typography>
                      <IconButton size="small" onClick={handleClearFile}>
                        <CloseIcon />
                      </IconButton>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      {(resumeFile.size / 1024).toFixed(2)} KB
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          </Paper>

          {/* Analysis Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h5" gutterBottom>
              Analysis
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
            )}

            <Button
              variant="contained"
              color="primary"
              startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
              onClick={handleSubmitForAnalysis}
              disabled={isAnalyzing || !resumeFile || !jobTitle || !department || !experience || selectedSkills.length === 0 || !education}
              fullWidth
              sx={{ mt: 2 }}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Resume with AI'}
            </Button>
          </Paper>

          {/* Results Section */}
          {screeningResults && (
            <Paper sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">
                  Screening Results
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<EmailIcon />}
                    onClick={handleOpenEmailDialog}
                    sx={{ mr: 1 }}
                  >
                    Email Candidate
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveResults}
                    disabled={resultsSaved}
                  >
                    {resultsSaved ? 'Saved' : 'Save Results'}
                  </Button>
                </Box>
              </Box>

              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Overall Match</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Rating
                          value={screeningResults.score / 2}
                          precision={0.5}
                          readOnly
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="h4">
                          {screeningResults.score}/10
                        </Typography>
                      </Box>
                      <Typography variant="body1">
                        {screeningResults.summary}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Match Details</Typography>
                      <Stack spacing={1}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Skills Match</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgressWithLabel value={screeningResults.match_details.skills_match} />
                            </Box>
                          </Box>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Experience Match</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgressWithLabel value={screeningResults.match_details.experience_match} />
                            </Box>
                          </Box>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Education Match</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgressWithLabel value={screeningResults.match_details.education_match} />
                            </Box>
                          </Box>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">Overall Match</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ width: '100%', mr: 1 }}>
                              <LinearProgressWithLabel value={screeningResults.match_details.overall_match} />
                            </Box>
                          </Box>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Skills Detection Section */}
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Skills Analysis
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle2" gutterBottom>
                            Detected Skills in Resume
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {detectedSkills.map((skill) => (
                              <Chip
                                key={skill}
                                label={skill}
                                variant="outlined"
                                color="default"
                                size="small"
                              />
                            ))}
                          </Box>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle2" gutterBottom sx={{ color: 'success.main' }}>
                            Matching Required Skills
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {matchingSkills.map((skill) => (
                              <Chip
                                key={skill}
                                label={skill}
                                variant="outlined"
                                color="success"
                                size="small"
                              />
                            ))}
                          </Box>
                          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                            {matchingSkills.length} of {selectedSkills.length} required skills found
                          </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Typography variant="subtitle2" gutterBottom sx={{ color: 'error.main' }}>
                            Missing Required Skills
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {missingSkills.map((skill) => (
                              <Chip
                                key={skill}
                                label={skill}
                                variant="outlined"
                                color="error"
                                size="small"
                              />
                            ))}
                          </Box>
                          {missingSkills.length === 0 && (
                            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                              No missing required skills - great match!
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Strengths
                      </Typography>
                      <List dense>
                        {screeningResults.strengths.map((strength, index) => (
                          <ListItem key={index}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <CheckCircleIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={strength} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        <CancelIcon color="error" fontSize="small" sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Areas for Improvement
                      </Typography>
                      <List dense>
                        {screeningResults.gaps.map((gap, index) => (
                          <ListItem key={index}>
                            <ListItemIcon sx={{ minWidth: 28 }}>
                              <CancelIcon color="error" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={gap} />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>Recommendation</Typography>
                      <Typography variant="body1">
                        {screeningResults.recommendations}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* Email Dialog */}
          <Dialog open={isEmailDialogOpen} onClose={handleCloseEmailDialog} maxWidth="md" fullWidth>
            <DialogTitle>Send Email to Candidate</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Send an email to {candidateName} at {candidateEmail} with the screening results and next steps.
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                id="subject"
                label="Subject"
                type="text"
                fullWidth
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                margin="dense"
                id="message"
                label="Message"
                multiline
                rows={8}
                fullWidth
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseEmailDialog}>Cancel</Button>
              <Button onClick={handleSendEmail} variant="contained" startIcon={<SendIcon />}>
                Send Email
              </Button>
            </DialogActions>
          </Dialog>
        </>
      ) : (
        // Saved Results View
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Saved Screening Results
          </Typography>

          {savedResults.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No saved screening results found. Screen candidates and save results to see them here.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Candidate Name</TableCell>
                    <TableCell>Job Title</TableCell>
                    <TableCell>Department</TableCell>
                    <TableCell>Screening Date</TableCell>
                    <TableCell>Score</TableCell>
                    <TableCell>Skills Match</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {savedResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell>{result.candidateName}</TableCell>
                      <TableCell>{result.jobTitle}</TableCell>
                      <TableCell>{result.department}</TableCell>
                      <TableCell>{result.screeningDate}</TableCell>
                      <TableCell>
                        <Rating value={result.score / 2} precision={0.5} readOnly size="small" />
                        <Typography variant="caption" sx={{ ml: 1 }}>
                          {result.score}/10
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box sx={{ width: '100%', mr: 1 }}>
                            <LinearProgressWithLabel value={result.overallMatch} />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="primary" title="View Details">
                          <ViewListIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="primary" title="Email Candidate">
                          <EmailIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" color="error" title="Delete">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={snackbarMessage}
      />
    </Box>
  );
};

// Helper component for progress bars with labels
function LinearProgressWithLabel(props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
      <Box sx={{ width: '100%', mr: 1 }}>
        <LinearProgress variant="determinate" {...props} />
      </Box>
      <Box sx={{ minWidth: 35 }}>
        <Typography variant="body2" color="text.secondary">{`${Math.round(props.value)}%`}</Typography>
      </Box>
    </Box>
  );
}

// Import this component from MUI
function LinearProgress(props) {
  return (
    <Box
      sx={{
        height: 10,
        borderRadius: 5,
        bgcolor: 'background.paper',
        border: '1px solid #e0e0e0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          width: `${props.value}%`,
          height: '100%',
          borderRadius: 5,
          bgcolor: 'primary.main',
          position: 'absolute',
          transition: 'width .4s ease-in-out',
        }}
      />
    </Box>
  );
}

export default ResumeScreening; 