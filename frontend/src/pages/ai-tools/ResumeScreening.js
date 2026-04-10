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
  Divider,
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
  Checkbox,
  FormGroup,
  FormControlLabel,
  OutlinedInput,
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
import {
  Upload as UploadIcon,
  Close as CloseIcon,
  Send as SendIcon,
  Person as PersonIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  Save as SaveIcon,
  CloudUpload as CloudUploadIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  ViewList as ViewListIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';


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

// Department-specific data mapping
const departmentData = {
  Engineering: {
    jobTitles: [
      'Software Engineer',
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'DevOps Engineer',
      'QA Engineer',
      'Data Engineer',
      'Machine Learning Engineer',
      'Engineering Manager'
    ],
    experienceOptions: [
      'Entry Level (0-2 years)',
      'Mid Level (3-5 years)',
      'Senior Level (5-8 years)',
      'Lead Level (8+ years)'
    ],
    skillsOptions: [
      'JavaScript', 'TypeScript', 'React', 'Angular', 'Vue.js',
      'Node.js', 'Python', 'Java', 'C#', '.NET',
      'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes',
      'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL',
      'CI/CD', 'Git', 'Agile Methodologies', 'TDD',
      'Machine Learning', 'AI', 'Data Analysis',
      'REST APIs', 'GraphQL', 'Microservices Architecture'
    ],
    educationOptions: [
      'Bachelor\'s in Computer Science',
      'Bachelor\'s in Software Engineering',
      'Bachelor\'s in IT',
      'Master\'s in Computer Science',
      'PhD in Computer Science',
      'Bootcamp Graduate',
      'Self-taught (with portfolio)'
    ]
  },
  Product: {
    jobTitles: [
      'Product Manager',
      'Product Owner',
      'Associate Product Manager',
      'Senior Product Manager',
      'Director of Product',
      'Product Analyst',
      'Product Marketing Manager'
    ],
    experienceOptions: [
      'Entry Level (0-2 years)',
      'Mid Level (3-5 years)',
      'Senior Level (5-8 years)',
      'Executive Level (8+ years)'
    ],
    skillsOptions: [
      'Product Strategy', 'Roadmap Planning', 'User Research',
      'Market Research', 'Competitive Analysis', 'A/B Testing',
      'Data Analysis', 'SQL', 'Product Analytics Tools',
      'Wireframing', 'Prototyping', 'Figma', 'Sketch',
      'Agile', 'Scrum', 'Jira', 'Product Lifecycle Management',
      'User Stories', 'Stakeholder Management', 'Prioritization',
      'Requirements Gathering', 'Go-to-market Strategy'
    ],
    educationOptions: [
      'Bachelor\'s in Business',
      'Bachelor\'s in Computer Science',
      'Bachelor\'s in Marketing',
      'MBA',
      'Master\'s in Product Management',
      'Product Management Certification'
    ]
  },
  Marketing: {
    jobTitles: [
      'Marketing Specialist',
      'Digital Marketing Manager',
      'Content Marketing Manager',
      'SEO Specialist',
      'Social Media Manager',
      'Growth Marketer',
      'Marketing Analytics Manager',
      'Brand Manager'
    ],
    experienceOptions: [
      'Entry Level (0-2 years)',
      'Mid Level (3-5 years)',
      'Senior Level (5-8 years)',
      'Director Level (8+ years)'
    ],
    skillsOptions: [
      'Content Creation', 'Copywriting', 'SEO', 'SEM',
      'Social Media Management', 'Google Analytics',
      'Facebook Ads', 'Google Ads', 'Email Marketing',
      'Marketing Automation', 'HubSpot', 'Marketo',
      'A/B Testing', 'Conversion Rate Optimization',
      'Brand Strategy', 'Campaign Management',
      'Adobe Creative Suite', 'Video Production',
      'Marketing Analytics', 'Customer Segmentation'
    ],
    educationOptions: [
      'Bachelor\'s in Marketing',
      'Bachelor\'s in Communications',
      'Bachelor\'s in Business',
      'MBA',
      'Digital Marketing Certification',
      'Content Marketing Certification'
    ]
  },
  Sales: {
    jobTitles: [
      'Sales Representative',
      'Account Executive',
      'Sales Manager',
      'Business Development Representative',
      'Sales Director',
      'Account Manager',
      'Sales Operations Manager'
    ],
    experienceOptions: [
      'Entry Level (0-2 years)',
      'Mid Level (3-5 years)',
      'Senior Level (5-8 years)',
      'Executive Level (8+ years)'
    ],
    skillsOptions: [
      'B2B Sales', 'B2C Sales', 'Sales Strategy',
      'Account Management', 'Lead Generation',
      'Negotiation', 'Cold Calling', 'Relationship Building',
      'CRM Systems', 'Salesforce', 'HubSpot CRM',
      'Pipeline Management', 'Forecasting',
      'Solution Selling', 'Consultative Selling',
      'Sales Presentations', 'Contract Negotiations',
      'Closing Techniques', 'Territory Management'
    ],
    educationOptions: [
      'Bachelor\'s in Business',
      'Bachelor\'s in Marketing',
      'Bachelor\'s in Communications',
      'MBA',
      'Sales Training Certification',
      'High School Diploma with Sales Experience'
    ]
  },
  'Customer Support': {
    jobTitles: [
      'Customer Support Specialist',
      'Customer Success Manager',
      'Technical Support Engineer',
      'Support Team Lead',
      'Customer Experience Manager',
      'Help Desk Specialist'
    ],
    experienceOptions: [
      'Entry Level (0-2 years)',
      'Mid Level (3-5 years)',
      'Senior Level (5+ years)'
    ],
    skillsOptions: [
      'Customer Service', 'Technical Troubleshooting',
      'Helpdesk Software', 'Zendesk', 'Intercom',
      'CRM Tools', 'Problem Solving', 'Communication',
      'Active Listening', 'Conflict Resolution',
      'Documentation', 'Knowledge Base Management',
      'Customer Onboarding', 'Retention Strategies',
      'SLAs Management', 'Customer Satisfaction Metrics'
    ],
    educationOptions: [
      'Bachelor\'s in Business',
      'Bachelor\'s in Communications',
      'Associate\'s Degree',
      'High School Diploma',
      'Customer Service Certification',
      'Technical Support Certification'
    ]
  },
  Finance: {
    jobTitles: [
      'Financial Analyst',
      'Accountant',
      'Financial Controller',
      'Finance Manager',
      'Financial Planning Analyst',
      'Payroll Specialist',
      'Finance Director'
    ],
    experienceOptions: [
      'Entry Level (0-2 years)',
      'Mid Level (3-5 years)',
      'Senior Level (5-8 years)',
      'Director Level (8+ years)'
    ],
    skillsOptions: [
      'Financial Analysis', 'Budgeting', 'Forecasting',
      'Financial Modeling', 'Excel Advanced', 'QuickBooks',
      'SAP', 'Oracle Financials', 'GAAP',
      'Financial Reporting', 'Variance Analysis',
      'Cost Accounting', 'Risk Assessment',
      'Taxation', 'Auditing', 'Cash Flow Management',
      'ERP Systems', 'Financial Statement Analysis'
    ],
    educationOptions: [
      'Bachelor\'s in Finance',
      'Bachelor\'s in Accounting',
      'Bachelor\'s in Economics',
      'MBA',
      'CPA Certification',
      'CFA Certification',
      'Master\'s in Finance'
    ]
  },
  'Human Resources': {
    jobTitles: [
      'HR Coordinator',
      'HR Generalist',
      'Recruiter',
      'HR Manager',
      'Talent Acquisition Specialist',
      'Compensation and Benefits Specialist',
      'Learning and Development Specialist',
      'HRIS Analyst'
    ],
    experienceOptions: [
      'Entry Level (0-2 years)',
      'Mid Level (3-5 years)',
      'Senior Level (5-8 years)',
      'Director Level (8+ years)'
    ],
    skillsOptions: [
      'Recruiting', 'Onboarding', 'Employee Relations',
      'Performance Management', 'Benefits Administration',
      'Compensation Planning', 'HRIS Systems', 'Workday',
      'ATS Systems', 'Compliance', 'Employment Law',
      'Training & Development', 'Conflict Resolution',
      'Diversity & Inclusion', 'Employee Engagement',
      'Succession Planning', 'Talent Management',
      'HR Analytics', 'Change Management'
    ],
    educationOptions: [
      'Bachelor\'s in Human Resources',
      'Bachelor\'s in Business Administration',
      'Bachelor\'s in Psychology',
      'MBA',
      'Master\'s in HR Management',
      'PHR/SPHR Certification',
      'SHRM-CP/SHRM-SCP Certification'
    ]
  },
  Legal: {
    jobTitles: [
      'Legal Counsel',
      'Paralegal',
      'Compliance Officer',
      'Contract Manager',
      'Legal Operations Manager',
      'IP Specialist',
      'Privacy Officer'
    ],
    experienceOptions: [
      'Entry Level (1-3 years)',
      'Mid Level (4-6 years)',
      'Senior Level (7-10 years)',
      'Director Level (10+ years)'
    ],
    skillsOptions: [
      'Contract Review', 'Legal Research', 'Compliance',
      'Regulatory Affairs', 'Intellectual Property',
      'Corporate Law', 'Employment Law',
      'Litigation Management', 'Legal Writing',
      'Due Diligence', 'Risk Management',
      'Legal Documentation', 'eDiscovery',
      'Contract Management Systems', 'Legal Project Management'
    ],
    educationOptions: [
      'Juris Doctor (JD)',
      'Bachelor\'s in Law',
      'Bachelor\'s in Paralegal Studies',
      'Bachelor\'s in Business with Legal Focus',
      'Master of Laws (LLM)',
      'Legal Certifications',
      'Bar Admission'
    ]
  },
  Operations: {
    jobTitles: [
      'Operations Manager',
      'Operations Analyst',
      'Business Operations Specialist',
      'Project Manager',
      'Process Improvement Manager',
      'Logistics Coordinator',
      'Supply Chain Manager'
    ],
    experienceOptions: [
      'Entry Level (0-2 years)',
      'Mid Level (3-5 years)',
      'Senior Level (5-8 years)',
      'Director Level (8+ years)'
    ],
    skillsOptions: [
      'Process Optimization', 'Project Management',
      'Operations Analysis', 'Resource Planning',
      'Supply Chain Management', 'Vendor Management',
      'Lean Six Sigma', 'Process Mapping',
      'KPI Tracking', 'Business Process Management',
      'MS Office Suite', 'ERP Systems',
      'Risk Assessment', 'Quality Control',
      'Workflow Design', 'Cost Reduction Strategies',
      'Cross-functional Coordination', 'Change Management'
    ],
    educationOptions: [
      'Bachelor\'s in Operations Management',
      'Bachelor\'s in Supply Chain Management',
      'Bachelor\'s in Business Administration',
      'MBA',
      'PMP Certification',
      'Six Sigma Certification',
      'Master\'s in Operations Management'
    ]
  }
};

// Mock database for saved screening results
const mockScreeningDatabase = [
  {
    id: "scr-001",
    candidateName: "John Smith",
    candidateEmail: "john.smith@example.com",
    jobTitle: "Software Engineer",
    department: "Engineering",
    screeningDate: "2023-05-10",
    score: 8.5,
    detectedSkills: ["JavaScript", "React", "Node.js", "TypeScript", "MongoDB", "Git"],
    matchingSkills: ["JavaScript", "React", "Node.js"],
    missingSkills: ["GraphQL", "AWS"],
    overallMatch: 85
  },
  {
    id: "scr-002",
    candidateName: "Sarah Johnson",
    candidateEmail: "sarah.j@example.com",
    jobTitle: "Product Manager",
    department: "Product",
    screeningDate: "2023-05-15",
    score: 7.8,
    detectedSkills: ["Product Strategy", "Roadmap Planning", "User Research", "Agile", "Jira"],
    matchingSkills: ["Product Strategy", "User Research", "Agile"],
    missingSkills: ["SQL", "A/B Testing"],
    overallMatch: 78
  }
];

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

  // State for department-specific options
  const [availableJobTitles, setAvailableJobTitles] = useState([]);
  const [availableExperience, setAvailableExperience] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [availableEducation, setAvailableEducation] = useState([]);

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
  const [savedResults, setSavedResults] = useState(mockScreeningDatabase);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Mock departments
  const departments = [
    'Engineering',
    'Product',
    'Marketing',
    'Sales',
    'Customer Support',
    'Finance',
    'Human Resources',
    'Legal',
    'Operations',
  ];

  // Update available options when department changes
  useEffect(() => {
    if (department && departmentData[department]) {
      const data = departmentData[department];
      setAvailableJobTitles(data.jobTitles || []);
      setAvailableExperience(data.experienceOptions || []);
      setAvailableSkills(data.skillsOptions || []);
      setAvailableEducation(data.educationOptions || []);

      // Reset selection when department changes
      setJobTitle('');
      setExperience('');
      setSelectedSkills([]);
      setEducation('');
    } else {
      setAvailableJobTitles([]);
      setAvailableExperience([]);
      setAvailableSkills([]);
      setAvailableEducation([]);
    }
  }, [department]);

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

  // Send email
  const handleSendEmail = () => {
    // In a real app, you would make an API call to send an email
    console.log('Sending email to:', candidateEmail);
    console.log('Subject:', emailSubject);
    console.log('Message:', emailMessage);

    // Show success message
    setSnackbarMessage(`Email sent to ${candidateEmail}`);
    setSnackbarOpen(true);

    // Close dialog
    setIsEmailDialogOpen(false);
  };

  // Save screening results to database
  const handleSaveResults = () => {
    if (!screeningResults || !candidateName) {
      setSnackbarMessage('Candidate name is required to save results');
      setSnackbarOpen(true);
      return;
    }

    // Create a new saved result object
    const newResult = {
      id: `scr-${(savedResults.length + 1).toString().padStart(3, '0')}`,
      candidateName,
      candidateEmail,
      jobTitle,
      department,
      screeningDate: new Date().toISOString().split('T')[0],
      score: screeningResults.score,
      detectedSkills,
      matchingSkills,
      missingSkills,
      overallMatch: screeningResults.match_details.overall_match
    };

    // In a real app, you would make an API call to save to a database
    const updatedResults = [...savedResults, newResult];
    setSavedResults(updatedResults);

    // Show success message
    setSnackbarMessage('Screening results saved successfully');
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
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" required>
                  <InputLabel id="department-label">Department</InputLabel>
                  <Select
                    labelId="department-label"
                    value={department}
                    label="Department"
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" required disabled={!department}>
                  <InputLabel id="job-title-label">Job Title</InputLabel>
                  <Select
                    labelId="job-title-label"
                    value={jobTitle}
                    label="Job Title"
                    onChange={(e) => setJobTitle(e.target.value)}
                  >
                    {availableJobTitles.map((title) => (
                      <MenuItem key={title} value={title}>{title}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" required disabled={!department}>
                  <InputLabel id="experience-label">Experience Requirements</InputLabel>
                  <Select
                    labelId="experience-label"
                    value={experience}
                    label="Experience Requirements"
                    onChange={(e) => setExperience(e.target.value)}
                  >
                    {availableExperience.map((exp) => (
                      <MenuItem key={exp} value={exp}>{exp}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal" required disabled={!department}>
                  <InputLabel id="education-label">Education Requirements</InputLabel>
                  <Select
                    labelId="education-label"
                    value={education}
                    label="Education Requirements"
                    onChange={(e) => setEducation(e.target.value)}
                  >
                    {availableEducation.map((edu) => (
                      <MenuItem key={edu} value={edu}>{edu}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Autocomplete
                  multiple
                  id="skills-selection"
                  options={availableSkills}
                  value={selectedSkills}
                  onChange={handleSkillsChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      label="Required Skills"
                      placeholder="Select skills"
                      required
                      fullWidth
                      margin="normal"
                    />
                  )}
                  disabled={!department}
                  ChipProps={{ size: 'small' }}
                />
                <Typography variant="caption" color="text.secondary">
                  Select at least 3 required skills for the position
                </Typography>
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
                  >
                    Save Results
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