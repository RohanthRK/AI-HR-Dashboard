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
  AlertTitle,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Rating,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Slider,
  Stack,
  LinearProgress,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormGroup,
  FormControlLabel,
  FormLabel,
  Container,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ExpandMore as ExpandMoreIcon,
  Star as StarIcon,
  Send as SendIcon,
  Psychology as PsychologyIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  NavigateNext as NavigateNextIcon,
  Info as InfoIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import axios from 'axios';
import PageHeader from '../../components/PageHeader';
import teamService from '../../services/teamService';

// Mock AI-generated reviews
const mockAIReviews = {
  '1': {
    summary: "John is an exceptional senior developer who consistently delivers high-quality code. His technical expertise and problem-solving abilities have been instrumental in the success of multiple projects this year.",
    strengths: [
      "Exceptional technical skills, particularly in system architecture and optimization",
      "Strong mentorship to junior developers with clear knowledge transfer",
      "Excellent problem solver who tackles complex issues methodically",
      "Reliable team player who consistently meets deadlines"
    ],
    areas_for_improvement: [
      "Could improve documentation practices for better knowledge sharing",
      "Sometimes takes on too many tasks simultaneously, affecting work-life balance",
      "Could benefit from more proactive communication with non-technical stakeholders"
    ],
    key_achievements: [
      "Successfully led the refactoring of the payment processing system, reducing errors by 45%",
      "Implemented CI/CD pipeline improvements that reduced deployment time by 35%",
      "Mentored 3 junior developers who are now contributing independently to projects"
    ],
    ratings: {
      technical_skills: 92,
      communication: 75,
      teamwork: 88,
      initiative: 85,
      reliability: 90,
      overall: 86
    },
    career_growth: {
      recommendation: "Consider for promotion to Lead Developer within the next 6-12 months",
      suggested_training: ["Advanced System Architecture", "Technical Leadership", "Effective Communication for Engineers"]
    }
  },
  '2': {
    summary: "Jane has demonstrated exceptional leadership as a Product Manager this year. Her strategic vision and stakeholder management skills have significantly contributed to successful product launches and team cohesion.",
    strengths: [
      "Excellent stakeholder management and communication skills",
      "Strong strategic vision and product roadmap development",
      "Effective at balancing business needs with technical constraints",
      "Great team leadership and cross-functional collaboration"
    ],
    areas_for_improvement: [
      "Could benefit from deeper technical knowledge in certain areas",
      "Occasionally sets overly ambitious deadlines that create team pressure",
      "Could improve data analysis skills for more evidence-based decision making"
    ],
    key_achievements: [
      "Successfully launched the redesigned customer portal with 97% positive user feedback",
      "Reduced feature delivery time by 20% through improved sprint planning",
      "Led cross-functional team through major product pivot with minimal disruption"
    ],
    ratings: {
      leadership: 90,
      communication: 95,
      strategic_thinking: 85,
      execution: 80,
      stakeholder_management: 90,
      overall: 88
    },
    career_growth: {
      recommendation: "Consider for promotion to Senior Product Manager in the next review cycle",
      suggested_training: ["Advanced Data Analytics", "Strategic Product Management", "Technical Foundations for Product Managers"]
    }
  }
}

// Team performance metrics 
const teamPerformanceMetrics = [
  {
    metric: 'Collaboration',
    description: 'How well team members work together and communicate',
    weight: 0.25
  },
  {
    metric: 'Quality',
    description: 'The standard of work produced by the team',
    weight: 0.20
  },
  {
    metric: 'Productivity',
    description: 'Team efficiency and output relative to resources',
    weight: 0.20
  },
  {
    metric: 'Innovation',
    description: 'New ideas and approaches generated by the team',
    weight: 0.15
  },
  {
    metric: 'Reliability',
    description: 'Meeting deadlines and fulfilling commitments',
    weight: 0.20
  }
];

// Performance criteria for different roles
const performanceCriteria = {
  'Engineering': ['Technical Skills', 'Problem Solving', 'Code Quality', 'Collaboration', 'Learning & Growth'],
  'Product': ['Strategic Thinking', 'Execution', 'Stakeholder Management', 'User Focus', 'Communication'],
  'Design': ['Design Thinking', 'User Experience', 'Visual Design', 'Collaboration', 'Innovation'],
  'Marketing': ['Campaign Performance', 'Creative Thinking', 'Market Analysis', 'Communication', 'Strategic Planning'],
  'Sales': ['Revenue Generation', 'Client Relationships', 'Product Knowledge', 'Communication', 'Target Achievement'],
};

// TeamReview component for reviewing team performance
const TeamReview = ({ team, onClose, onStepChange }) => {
  const [teamRatings, setTeamRatings] = useState({
    collaboration: 70,
    quality: 70,
    productivity: 70,
    innovation: 70,
    reliability: 70
  });
  
  const [teamNotes, setTeamNotes] = useState({
    achievements: '',
    strengths: '',
    improvements: '',
    goals: ''
  });
  
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedReview, setGeneratedReview] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reviewStep, setReviewStep] = useState(1); // 1 for ratings, 2 for notes
  
  // Use team members data from the team object
  useEffect(() => {
    if (team && team.members) {
      console.log('Setting team members from team object:', team.members);
      setTeamMembers(team.members);
    } else if (team && team.id) {
      // If team.members is not available, try to fetch them
      const fetchTeamMembers = async () => {
      try {
        setLoading(true);
          console.log('Fetching team members for team ID:', team.id);
          const response = await axios.get(`http://localhost:8000/api/teams/${team.id}/`);
          
          if (response.data && response.data.employees) {
            console.log('Fetched team members:', response.data.employees);
            setTeamMembers(response.data.employees);
          } else {
            console.log('No team members found in API response');
            setTeamMembers([]);
          }
      } catch (err) {
        console.error('Error fetching team members:', err);
        setError('Failed to load team members. Please try again later.');
          setTeamMembers([]);
      } finally {
        setLoading(false);
      }
    };
    
      fetchTeamMembers();
    } else {
      console.log('No team members data available');
      setTeamMembers([]);
    }
  }, [team]);
  
  // Handle rating changes
  const handleRatingChange = (metric) => (event, newValue) => {
    setTeamRatings({
      ...teamRatings,
      [metric]: newValue
    });
  };
  
  // Handle notes changes
  const handleNotesChange = (field) => (event) => {
    setTeamNotes({
      ...teamNotes,
      [field]: event.target.value
    });
  };
  
  // Navigate to the next step
  const handleNext = () => {
    setReviewStep(2);
    // Update parent component's stepper
    if (onStepChange) {
      onStepChange(2); // Move to Notes step (index 2) in main stepper
    }
  };
  
  // Navigate to the previous step
  const handlePrevious = () => {
    setReviewStep(1);
    // Update parent component's stepper
    if (onStepChange) {
      onStepChange(1); // Move back to Team Ratings step (index 1)
    }
  };
  
  // Generate team review
  const handleGenerateReview = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // In a real application, call an API endpoint to generate the review
      // For demo purposes, we'll create a simulated review
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Calculate weighted average for overall score
      let overallScore = 0;
      let totalWeight = 0;
      
      teamPerformanceMetrics.forEach(metric => {
        const metricKey = metric.metric.toLowerCase();
        overallScore += teamRatings[metricKey] * metric.weight;
        totalWeight += metric.weight;
      });
      
      overallScore = Math.round(overallScore / totalWeight);
      
      // Use team notes if they exist or generate based on ratings
      const strengths = teamNotes.strengths 
        ? teamNotes.strengths.split('\n').filter(s => s.trim()) 
        : Object.entries(teamRatings)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
            .map(([metric, rating]) => {
          let strength = '';
          switch(metric) {
            case 'collaboration':
              strength = "Strong team collaboration and effective communication";
              break;
            case 'quality':
              strength = "Consistent delivery of high-quality work products";
              break;
            case 'productivity':
              strength = "Excellent productivity and efficient use of resources";
              break;
            case 'innovation':
              strength = "Creative problem-solving and innovative approaches";
              break;
            case 'reliability':
              strength = "Dependable performance and consistent meeting of deadlines";
              break;
            default:
              strength = "Excellent performance in " + metric;
          }
              return strength;
            });
      
      // Generate team improvement areas based on lowest ratings or use notes
      const improvementAreas = teamNotes.improvements
        ? teamNotes.improvements.split('\n').filter(s => s.trim())
        : Object.entries(teamRatings)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 2)
            .map(([metric, rating]) => {
          let improvement = '';
          switch(metric) {
            case 'collaboration':
              improvement = "Enhance cross-functional communication and collaboration";
              break;
            case 'quality':
              improvement = "Implement more rigorous quality assurance processes";
              break;
            case 'productivity':
              improvement = "Optimize workflows to improve overall productivity";
              break;
            case 'innovation':
              improvement = "Encourage more creative thinking and innovation";
              break;
            case 'reliability':
              improvement = "Improve consistency in meeting deadlines and commitments";
              break;
            default:
              improvement = "Focus on improving " + metric;
          }
              return improvement;
            });
      
      // Use achievements from notes or generate generic ones
      const achievements = teamNotes.achievements
        ? teamNotes.achievements.split('\n').filter(a => a.trim())
        : [
            `Successfully completed ${team.department} projects within deadlines`,
            `Improved ${Object.entries(teamRatings).sort((a, b) => b[1] - a[1])[0][0]} metrics by focusing on team development`,
            `Achieved high levels of stakeholder satisfaction with deliverables`
          ];
          
      // Use goals from notes or generate generic ones
      const goals = teamNotes.goals
        ? teamNotes.goals.split('\n').filter(g => g.trim())
        : [
            "Implement regular team retrospectives to continuously improve processes",
            `Focus on enhancing ${Object.entries(teamRatings).sort((a, b) => a[1] - b[1])[0][0]} through targeted training and development`,
            "Establish clear performance metrics and goals for the upcoming quarter"
          ];
      
      // Create the review object
      const review = {
        teamName: team.name,
        department: team.department,
        memberCount: teamMembers.length,
        summary: `Team ${team.name} has ${overallScore >= 80 ? 'demonstrated strong' : 'shown satisfactory'} performance in ${team.department} operations. ${overallScore >= 80 ? 'Their collaborative approach and quality of work have contributed significantly to organizational success.' : 'There are opportunities for improvement in certain areas to enhance overall effectiveness.'}`,
        strengths: strengths,
        areas_for_improvement: improvementAreas,
        achievements: achievements,
        goals: goals,
        ratings: {
          ...teamRatings,
          overall: overallScore
        }
      };
      
      setGeneratedReview(review);
      // Update parent stepper to Review step when review is generated
      if (onStepChange) {
        onStepChange(3); // Move to Review step (index 3) in main stepper
      }
    } catch (err) {
      setError('Error generating team review. Please try again.');
      console.error('Error generating review:', err);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">
            Team Review: {team.name}
          </Typography>
          <Button 
            variant="outlined" 
            size="small"
            onClick={onClose}
          >
            Back to Team Selection
          </Button>
        </Box>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Department: {team.department} | Members: {team.members_count || teamMembers.length || '0'}
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
            <CircularProgress size={24} sx={{ mr: 1 }} />
            <Typography variant="body2">Loading team data...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            {/* Team Members List */}
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
              Team Members
            </Typography>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <List dense>
                {teamMembers.length > 0 ? (
                  teamMembers.map((member, index) => (
                    <ListItem key={member.id || index} divider={index < teamMembers.length - 1}>
                    <ListItemAvatar>
                      <Avatar>
                          <PersonIcon />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={member.name} 
                        secondary={member.position || (member.is_leader ? 'Team Leader' : 'Team Member')}
                      />
                      {member.is_leader && (
                        <Chip 
                          size="small" 
                          label="Leader" 
                          color="primary" 
                          sx={{ ml: 1 }}
                        />
                      )}
                  </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemIcon>
                      <InfoIcon color="info" />
                    </ListItemIcon>
                    <ListItemText primary="No team members found" />
                  </ListItem>
                )}
              </List>
            </Card>
            
            {!generatedReview ? (
              <>
                {reviewStep === 1 ? (
                  <>
                    {/* Team Performance Metrics */}
                    <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                      Team Performance Metrics
                    </Typography>
                    <Grid container spacing={3}>
                      {teamPerformanceMetrics.map((metric) => (
                        <Grid item xs={12} key={metric.metric}>
                          <Typography gutterBottom>
                            {metric.metric} <Typography component="span" color="text.secondary" variant="body2">({metric.description})</Typography>
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Box sx={{ flexGrow: 1, mr: 2 }}>
                          <Slider
                                value={teamRatings[metric.metric.toLowerCase()]}
                                onChange={handleRatingChange(metric.metric.toLowerCase())}
                                aria-labelledby={`${metric.metric.toLowerCase()}-slider`}
                            valueLabelDisplay="auto"
                                step={1}
                            min={0}
                            max={100}
                          />
                  </Box>
                            <Typography variant="body2" color="text.secondary">
                              {teamRatings[metric.metric.toLowerCase()]}%
                            </Typography>
                        </Box>
                        </Grid>
                      ))}
                    </Grid>
                
                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleNext}
                      >
                        Next: Add Notes
                      </Button>
                    </Box>
                  </>
                ) : (
                  <>
                    {/* Team Review Notes */}
                    <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                      Review Notes
                    </Typography>
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Key Achievements"
                          multiline
                          rows={4}
                          value={teamNotes.achievements}
                          onChange={handleNotesChange('achievements')}
                          placeholder="List key team achievements during the review period..."
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Team Strengths"
                          multiline
                          rows={4}
                          value={teamNotes.strengths}
                          onChange={handleNotesChange('strengths')}
                          placeholder="List the team's key strengths..."
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Areas for Improvement"
                          multiline
                          rows={4}
                          value={teamNotes.improvements}
                          onChange={handleNotesChange('improvements')}
                          placeholder="List areas where the team can improve..."
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="Goals for Next Period"
                          multiline
                          rows={4}
                          value={teamNotes.goals}
                          onChange={handleNotesChange('goals')}
                          placeholder="List goals for the team's next review period..."
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>
                
                    {/* Generate Review Button */}
                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <Button
                        variant="outlined"
                        onClick={handlePrevious}
                      >
                        Back to Ratings
                      </Button>
                      <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={handleGenerateReview}
                        startIcon={<PsychologyIcon />}
                        disabled={isGenerating}
                      >
                        {isGenerating ? 'Generating Review...' : 'Generate Team Review'}
                      </Button>
                      {isGenerating && <CircularProgress size={24} sx={{ ml: 2 }} />}
                    </Box>
                  </>
                )}
              </>
            ) : (
              /* Generated Review Display */
              <Box sx={{ mt: 3 }}>
                <Alert severity="success" sx={{ mb: 3 }}>
                  <AlertTitle>Review Generated</AlertTitle>
                  Your team review has been generated successfully.
                </Alert>
                
                <Card variant="outlined" sx={{ mb: 4 }}>
                  <CardHeader
                    title={`Team Performance Review: ${generatedReview.teamName}`}
                    subheader={`Department: ${generatedReview.department} | Team Size: ${generatedReview.memberCount}`}
                  />
                  <Divider />
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Summary
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {generatedReview.summary}
                    </Typography>
                    
                    <Grid container spacing={3} sx={{ mt: 1 }}>
                      {/* Team Ratings */}
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>
                          Team Performance Ratings
                        </Typography>
                        
                        <Box sx={{ mb: 3 }}>
                          {Object.entries(generatedReview.ratings).map(([metric, value]) => (
                            <Box key={metric} sx={{ mb: 1.5 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="body2">
                                  {metric === 'overall' ? 'Overall Score' : metric.charAt(0).toUpperCase() + metric.slice(1)}
                                </Typography>
                                <Typography variant="body2" fontWeight="medium">
                                  {value}%
                                </Typography>
                              </Box>
                          <LinearProgress 
                            variant="determinate" 
                                value={value}
                                color={metric === 'overall' ? 'primary' : 'secondary'}
                            sx={{ 
                                  height: metric === 'overall' ? 10 : 6,
                                  borderRadius: 1,
                                  backgroundColor: 'rgba(0,0,0,0.08)'
                            }}
                          />
                        </Box>
                          ))}
                        </Box>
                      </Grid>
                
                      {/* Strengths and Improvements */}
                  <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom>
                          Key Strengths
                        </Typography>
                        <List dense>
                          {generatedReview.strengths.map((strength, index) => (
                            <ListItem key={index} divider={index < generatedReview.strengths.length - 1}>
                              <ListItemIcon>
                                <TrendingUpIcon color="success" />
                              </ListItemIcon>
                              <ListItemText primary={strength} />
                            </ListItem>
                          ))}
                        </List>
                        
                        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                          Areas for Improvement
                        </Typography>
                        <List dense>
                          {generatedReview.areas_for_improvement.map((improvement, index) => (
                            <ListItem key={index} divider={index < generatedReview.areas_for_improvement.length - 1}>
                              <ListItemIcon>
                                <TrendingDownIcon color="error" />
                              </ListItemIcon>
                              <ListItemText primary={improvement} />
                            </ListItem>
                          ))}
                        </List>
                  </Grid>
                  
                      {/* Achievements and Goals */}
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        
                        <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom>
                              Key Achievements
                            </Typography>
                        <List dense>
                              {generatedReview.achievements.map((achievement, index) => (
                                <ListItem key={index} divider={index < generatedReview.achievements.length - 1}>
                                  <ListItemIcon>
                                    <CheckCircleIcon color="primary" />
                              </ListItemIcon>
                                  <ListItemText primary={achievement} />
                            </ListItem>
                          ))}
                        </List>
                  </Grid>
                  
                          <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom>
                              Goals for Next Period
                            </Typography>
                        <List dense>
                              {generatedReview.goals.map((goal, index) => (
                                <ListItem key={index} divider={index < generatedReview.goals.length - 1}>
                                  <ListItemIcon>
                                    <AssignmentIcon color="info" />
                              </ListItemIcon>
                                  <ListItemText primary={goal} />
                            </ListItem>
                          ))}
                        </List>
                  </Grid>
                </Grid>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setGeneratedReview(null);
                      setReviewStep(1);
                      if (onStepChange) {
                        onStepChange(0); // Go all the way back to Select Team
                      }
                    }}
                    startIcon={<ArrowBackIcon />}
                  >
                    Back to Team Selection
                  </Button>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                  >
                    Save Review
                  </Button>
                </Box>
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

const PerformanceReview = () => {
  // State for employees data
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  
  // State for employee selection
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employeeDetails, setEmployeeDetails] = useState(null);
  
  // State for review input
  const [activeStep, setActiveStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiReview, setAiReview] = useState(null);
  const [error, setError] = useState(null);
  
  // State for performance ratings (using 1-100 scale)
  const [performanceRatings, setPerformanceRatings] = useState({
    technical_skills: 70,
    communication: 70,
    teamwork: 70,
    initiative: 70,
    reliability: 70,
  });
  
  // State for performance rating weights
  const [performanceWeights, setPerformanceWeights] = useState({
    technical_skills: 20,
    communication: 20,
    teamwork: 20,
    initiative: 20,
    reliability: 20,
  });
  
  // State for review notes
  const [reviewNotes, setReviewNotes] = useState({
    achievements: '',
    strengths: '',
    improvements: '',
    goals: '',
    feedback: '',
  });

  // State for team review mode
  const [teamReviewMode, setTeamReviewMode] = useState(false);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [teamDetails, setTeamDetails] = useState(null);
  
  // Fetch employees on component mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoadingEmployees(true);
        setError(null); // Reset error
        console.log('Fetching real employees for Performance Review...');
        
        // Use employeeService instead of aiService to get real employees
        const employeesResponse = await axios.get('http://localhost:8000/api/employees/debug/');
        
        if (employeesResponse.data && employeesResponse.data.employees && Array.isArray(employeesResponse.data.employees)) {
          console.log('Fetched employees data:', employeesResponse.data.employees);
          
          // Map MongoDB employee fields to required format
          const mappedEmployees = employeesResponse.data.employees.map(employee => ({
            id: employee._id,
            name: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
            department: employee.department || 'Unknown',
            position: employee.position || 'Employee',
            skills: employee.skills || ['Technical Skills'],
            performance: employee.performance || 4,
            growthPotential: employee.growth_potential || 'Medium',
            // Add other required fields with defaults
            email: employee.email || '',
            phone: employee.phone || '',
            status: employee.status || 'Active'
          }));
          
          setEmployees(mappedEmployees);
        } else {
          console.error('API did not return an array:', employeesResponse.data);
          setError('Received invalid data format for employees.');
          setEmployees([]); // Set to empty array if data is invalid
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
        setError('Failed to load employees data. Please try again later.');
        setEmployees([]); // Set to empty array on error
      } finally {
         setLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, []);
  
  // Handle employee selection
  const handleEmployeeChange = (event) => {
    const empId = event.target.value;
    setSelectedEmployee(empId);
    setEmployeeDetails(employees.find(emp => emp.id.toString() === empId) || null);
    setAiReview(null); // Reset AI review when changing employee
  };
  
  // Handle slider changes for performance ratings
  const handleRatingChange = (criterion) => (event, newValue) => {
    setPerformanceRatings({
      ...performanceRatings,
      [criterion]: newValue,
    });
  };
  
  // Handle slider changes for weights
  const handleWeightChange = (criterion) => (event, newValue) => {
    setPerformanceWeights({
      ...performanceWeights,
      [criterion]: newValue,
    });
  };
  
  // Handle text input changes for weights
  const handleWeightInputChange = (criterion) => (event) => {
    const value = Math.min(100, Math.max(0, Number(event.target.value) || 0));
    setPerformanceWeights({
      ...performanceWeights,
      [criterion]: value,
    });
  };
  
  // Handle text input changes for review notes
  const handleNotesChange = (field) => (event) => {
    setReviewNotes({
      ...reviewNotes,
      [field]: event.target.value,
    });
  };
  
  // Handle step navigation
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  const handleReset = () => {
    setActiveStep(0);
    setAiReview(null);
  };
  
  // Generate AI review
  const handleGenerateReview = async () => {
    if (!selectedEmployee) {
      setError('Please select an employee first.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      // In a real app, you would make an API call to your backend
      // For demonstration, we'll generate a review for any employee
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get mock AI review for the selected employee or generate one
      let existingReview = mockAIReviews[selectedEmployee];
      
      if (existingReview) {
        // Apply weights to the existing review ratings
        const weightedRatings = {};
        let weightedOverall = 0;
        let totalWeight = 0;
        
        // Calculate weighted ratings for each criterion
        for (const [criterion, rating] of Object.entries(existingReview.ratings)) {
          if (criterion !== 'overall') {
            const weight = performanceWeights[criterion] || 0;
            totalWeight += weight;
            weightedOverall += (rating * weight / 100);
            weightedRatings[criterion] = rating;
          }
        }
        
        // If weights don't sum to 0, calculate weighted overall
        if (totalWeight > 0) {
          weightedRatings.overall = weightedOverall;
        } else {
          weightedRatings.overall = existingReview.ratings.overall;
        }
        
        // Create a new review object with the weighted ratings
        existingReview = {
          ...existingReview,
          ratings: weightedRatings
        };
        
        setAiReview(existingReview);
      } else {
        // Generate an AI review for employees not in our mockAIReviews
        const employee = employees.find(emp => emp.id.toString() === selectedEmployee);
        
        if (employee) {
          // Generate a review based on employee data
          const generatedReview = {
            summary: `${employee.name} has demonstrated ${employee.growthPotential === 'High' ? 'exceptional' : 'solid'} performance as a ${employee.position}. ${employee.growthPotential === 'High' ? 'Their expertise and dedication have significantly contributed to team success.' : 'They have consistently met expectations and delivered quality work.'}`,
            strengths: [
              `Strong ${employee.skills[0]} skills with consistent application to projects`,
              `Effective ${employee.skills.length > 1 ? employee.skills[1] : 'technical'} implementation that improved team productivity`,
              `Good collaborative approach when working with cross-functional teams`,
              `Reliable delivery of assignments within deadlines`
            ],
            areas_for_improvement: [
              "Documentation practices could be more thorough and consistent",
              "Can improve proactive communication with stakeholders",
              "Could benefit from deeper knowledge in emerging technologies"
            ],
            key_achievements: [
              `Successfully implemented ${employee.skills[0]} solutions that improved efficiency`,
              `Contributed significantly to the ${employee.department} objectives`,
              `Demonstrated leadership in ${employee.skills.length > 2 ? employee.skills[2] : 'project'} initiatives`
            ],
            ratings: {
              technical_skills: Math.min(100, employee.performance * 20),
              communication: Math.min(100, employee.performance * 18 + (Math.random() * 4)),
              teamwork: Math.min(100, employee.performance * 19 + (Math.random() * 3)),
              initiative: Math.min(100, employee.performance * 17 + (Math.random() * 5)),
              reliability: Math.min(100, employee.performance * 20 + (Math.random() * 2)),
            },
            career_growth: {
              recommendation: employee.growthPotential === 'High' ? 
                `Consider for promotion to Senior ${employee.position} within the next 6-12 months` : 
                `Continue development in current role with increased responsibilities`,
              suggested_training: [
                employee.skills[0],
                "Leadership Development",
                "Advanced Communication"
              ]
            }
          };
          
          // Generate weighted overall score based on user-defined weights
          let weightedOverall = 0;
          let totalWeight = 0;
          
          // Calculate weighted overall score
          for (const [criterion, rating] of Object.entries(generatedReview.ratings)) {
            const weight = performanceWeights[criterion] || 0;
            totalWeight += weight;
            weightedOverall += (rating * weight / 100);
          }
          
          // If weights don't sum to 0, use the weighted overall, otherwise use default calculation
          if (totalWeight > 0) {
            generatedReview.ratings.overall = weightedOverall;
          } else {
            generatedReview.ratings.overall = Math.min(100, employee.performance * 20);
          }
          
          setAiReview(generatedReview);
        } else {
          setError('Employee data not found. Please select another employee or try again later.');
          setIsGenerating(false);
          return;
        }
      }
      
      // Move to the next step (review results)
      setActiveStep(3);
    } catch (err) {
      setError('Error generating AI review. Please try again.');
      console.error('Error generating review:', err);
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Format rating value as percentage
  const formatRating = (value) => {
    return `${value}%`;
  };

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        setLoadingTeams(true);
        
        console.log('Using hardcoded mock team data directly');
        
        // Mock team data that will be used immediately
        const mockTeams = [
          {
            id: 'team-1',
            name: 'Frontend Team',
            department: 'Engineering',
            leader: 'John Doe',
            members_count: 5,
            members: [
              { id: 'emp-1', name: 'John Doe', position: 'Team Lead' },
              { id: 'emp-2', name: 'Jane Smith', position: 'Senior Developer' },
              { id: 'emp-3', name: 'Bob Johnson', position: 'Developer' }
            ],
            description: 'Responsible for all frontend development'
          },
          {
            id: 'team-2',
            name: 'Backend Team',
            department: 'Engineering',
            leader: 'Alice Brown',
            members_count: 4,
            members: [
              { id: 'emp-4', name: 'Alice Brown', position: 'Team Lead' },
              { id: 'emp-5', name: 'Tom Wilson', position: 'Senior Developer' }
            ],
            description: 'Handles server-side architecture and APIs'
          },
          {
            id: 'team-3',
            name: 'UI/UX Team',
            department: 'Design',
            leader: 'Sarah Davis',
            members_count: 3,
            members: [
              { id: 'emp-6', name: 'Sarah Davis', position: 'Design Lead' },
              { id: 'emp-7', name: 'Mike Taylor', position: 'UX Designer' }
            ],
            description: 'Focuses on user experience and interface design'
          },
          {
            id: 'team-4',
            name: 'Digital Marketing',
            department: 'Marketing',
            leader: 'Chris Lee',
            members_count: 2,
            members: [
              { id: 'emp-8', name: 'Chris Lee', position: 'Marketing Lead' },
              { id: 'emp-9', name: 'Emma White', position: 'Content Specialist' }
            ],
            description: 'Handles digital marketing campaigns and strategy'
          },
          {
            id: 'team-5',
            name: 'Product Team',
            department: 'Product',
            leader: 'Michael Johnson',
            members_count: 4,
            members: [
              { id: 'emp-10', name: 'Michael Johnson', position: 'Product Manager' },
              { id: 'emp-11', name: 'Emily Davis', position: 'Product Owner' }
            ],
            description: 'Manages product roadmap and feature development'
          },
          {
            id: 'team-6',
            name: 'DevOps Team',
            department: 'Engineering',
            leader: 'Ryan Wilson',
            members_count: 3,
            members: [
              { id: 'emp-12', name: 'Ryan Wilson', position: 'DevOps Lead' },
              { id: 'emp-13', name: 'Jessica Moore', position: 'Cloud Engineer' }
            ],
            description: 'Handles infrastructure and deployment automation'
          }
        ];
        
        console.log('Setting mock teams:', mockTeams);
        setTeams(mockTeams);
        
      } catch (err) {
        console.error('Error in fetchTeams:', err);
        
        // Fallback mock data if even the direct assignment fails
        setTeams([
          { id: 'team-fallback-1', name: 'Development Team', department: 'Engineering', leader: 'Team Lead', members_count: 5 },
          { id: 'team-fallback-2', name: 'Design Team', department: 'Design', leader: 'Design Lead', members_count: 3 }
        ]);
        
        setError('Failed to load team data. Using sample teams instead.');
      } finally {
        setLoadingTeams(false);
      }
    };
    
    fetchTeams();
  }, []);
  
  // Handle team selection
  const handleTeamChange = (event) => {
    const teamId = event.target.value;
    setSelectedTeam(teamId);
    setTeamDetails(teams.find(team => team.id === teamId) || null);
  };
  
  // Toggle between individual and team reviews
  const toggleReviewMode = () => {
    setTeamReviewMode(!teamReviewMode);
    // Reset selections when switching modes
    if (!teamReviewMode) {
      setSelectedEmployee('');
      setEmployeeDetails(null);
      setAiReview(null);
    } else {
      setSelectedTeam('');
      setTeamDetails(null);
    }
    setActiveStep(0);
  };

  // Handle step change from TeamReview component
  const handleTeamReviewStepChange = (step) => {
    setActiveStep(step);
  };

  return (
    <Box>
      <PageHeader
        title="AI-Powered Performance Review"
        subtitle="Generate comprehensive performance reviews for employees and teams using AI"
      />

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Typography variant="h5">Performance Review Generator</Typography>
          <FormGroup sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
            <FormControlLabel 
              control={
                <Switch 
                  checked={teamReviewMode} 
                  onChange={toggleReviewMode}
                />
              }
              label={teamReviewMode ? "Team Review" : "Individual Review"}
            />
          </FormGroup>
        </Box>

        <Typography variant="body2" color="text.secondary" paragraph>
          {teamReviewMode 
            ? "Generate comprehensive performance reviews for teams based on key metrics and your notes."
            : "Generate comprehensive performance reviews for employees based on their ratings and your notes."}
        </Typography>

        <Stepper sx={{ mb: 4 }} activeStep={activeStep}>
          <Step 
            onClick={() => setActiveStep(0)} 
            sx={{ cursor: 'pointer' }}
          >
            <StepLabel>{teamReviewMode ? "Select Team" : "Select Employee"}</StepLabel>
          </Step>
          <Step 
            onClick={() => setActiveStep(1)} 
            sx={{ cursor: 'pointer' }}
          >
            <StepLabel>{teamReviewMode ? "Team Ratings" : "Performance Ratings"}</StepLabel>
          </Step>
          <Step 
            onClick={() => setActiveStep(2)} 
            sx={{ cursor: 'pointer' }}
          >
            <StepLabel>Notes</StepLabel>
          </Step>
          <Step 
            onClick={() => setActiveStep(3)} 
            sx={{ cursor: 'pointer' }}
          >
            <StepLabel>Review</StepLabel>
          </Step>
        </Stepper>

        <Box p={2}>
          {teamReviewMode ? (
            // Team review content
            <>
              {activeStep === 0 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>Select Team</Typography>
                  
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="team-select-label">Team</InputLabel>
                    <Select
                      labelId="team-select-label"
                      id="team-select"
                      value={selectedTeam}
                      label="Team"
                      onChange={handleTeamChange}
                      disabled={loadingTeams}
                    >
                      <MenuItem value="">
                        <em>Select Team</em>
                      </MenuItem>
                      {teams.map((team) => (
                        <MenuItem key={team.id} value={team.id}>
                          {team.name} - {team.department}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {teamDetails && (
                    <Box mt={3}>
                      <Typography variant="subtitle1" gutterBottom>Team Details</Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Department:</strong> {teamDetails.department}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Team Leader:</strong> {teamDetails.leader}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Members:</strong> {teamDetails.members_count}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box display="flex" justifyContent="flex-end" mt={4}>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(1)}
                      disabled={!selectedTeam}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}

              {activeStep === 1 && (
                <TeamReview 
                  team={teamDetails}
                  onClose={() => setActiveStep(0)}
                  onStepChange={handleTeamReviewStepChange}
                />
              )}
              
              {/* Handle sub-steps inside TeamReview */}
              {activeStep > 1 && activeStep <= 3 && (
                <TeamReview 
                  team={teamDetails}
                  onClose={() => setActiveStep(0)}
                  onStepChange={handleTeamReviewStepChange}
                />
              )}
            </>
          ) : (
            // Individual review content
            <>
              {activeStep === 0 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>Select Employee</Typography>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="employee-select-label">Employee</InputLabel>
                    <Select
                      labelId="employee-select-label"
                      id="employee-select"
                      value={selectedEmployee}
                      label="Employee"
                      onChange={handleEmployeeChange}
                      disabled={loadingEmployees}
                    >
                      <MenuItem value="">
                        <em>Select Employee</em>
                      </MenuItem>
                      {employees.map((employee) => (
                        <MenuItem key={employee.id} value={employee.id}>
                          {employee.name} - {employee.position}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {employeeDetails && (
                    <Box mt={3}>
                      <Typography variant="subtitle1" gutterBottom>Employee Details</Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Position:</strong> {employeeDetails.position}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Department:</strong> {employeeDetails.department}
                      </Typography>
                      <Typography variant="body2" gutterBottom>
                        <strong>Hire Date:</strong> {new Date(employeeDetails.hire_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                  
                  <Box display="flex" justifyContent="flex-end" mt={4}>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(1)}
                      disabled={!selectedEmployee}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}

              {activeStep === 1 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>Performance Ratings</Typography>
                  <Box mb={4}>
                    {Object.entries(performanceRatings).map(([key, value]) => (
                      <Box key={key} mb={3}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                            {key.replace(/_/g, ' ')}
                          </Typography>
                          <Typography variant="body2">{value}</Typography>
                        </Box>
                        <Slider
                          min={1}
                          max={100}
                          step={1}
                          value={value}
                          onChange={handleRatingChange(key)}
                          valueLabelDisplay="auto"
                          aria-labelledby={`${key}-slider`}
                        />
                      </Box>
                    ))}
                  </Box>
                  
                  <Box display="flex" justify-content="space-between" mt={4}>
                    <Button
                      variant="outlined"
                      onClick={() => setActiveStep(0)}
                    >
                      Back
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(2)}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}

              {activeStep === 2 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>Performance Notes</Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Add detailed notes about the employee's performance to generate a more personalized review.
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Key Achievements"
                        placeholder="Describe major accomplishments and projects completed"
                        value={reviewNotes.achievements}
                        onChange={handleNotesChange('achievements')}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Strengths"
                        placeholder="Notable strengths and positive attributes"
                        value={reviewNotes.strengths}
                        onChange={handleNotesChange('strengths')}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Areas for Improvement"
                        placeholder="Skills or behaviors that could be improved"
                        value={reviewNotes.improvements}
                        onChange={handleNotesChange('improvements')}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Goals for Next Period"
                        placeholder="Specific goals and expectations for the next review period"
                        value={reviewNotes.goals}
                        onChange={handleNotesChange('goals')}
                      />
                    </Grid>
                  </Grid>
                  
                  <Box display="flex" justify-content="space-between" mt={4}>
                    <Button
                      variant="outlined"
                      onClick={() => setActiveStep(1)}
                    >
                      Back
                    </Button>
                    <Button
                      variant="contained"
                      onClick={() => setActiveStep(3)}
                    >
                      Next
                    </Button>
                  </Box>
                </Box>
              )}

              {activeStep === 3 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>Generate Review</Typography>
                  
                  {!aiReview && !isGenerating ? (
                    <>
                      <Alert severity="info" sx={{ mb: 3 }}>
                        Review your inputs and generate a comprehensive performance review. The AI will analyze the ratings and notes to create a balanced assessment.
                      </Alert>
                      
                      <Box textAlign="center" mt={4}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="large"
                          onClick={handleGenerateReview}
                          startIcon={<PsychologyIcon />}
                        >
                          Generate AI Review
                        </Button>
                      </Box>
                    </>
                  ) : isGenerating ? (
                    <Box textAlign="center" mt={4}>
                      <CircularProgress />
                      <Typography variant="body1" sx={{ mt: 2 }}>
                        Analyzing performance data and generating review...
                      </Typography>
                    </Box>
                  ) : (
                    <Box mt={3}>
                      <Alert severity="success" sx={{ mb: 3 }}>
                        <AlertTitle>Review Generated Successfully</AlertTitle>
                        Here is the AI-generated performance review for {employeeDetails?.name}. You can edit it further before finalizing.
                      </Alert>
                      
                      <Card variant="outlined" sx={{ mb: 3 }}>
                        <CardHeader
                          title="Performance Summary"
                          subheader={`Generated on ${new Date().toLocaleDateString()}`}
                        />
                        <CardContent>
                          <Typography variant="body1" paragraph>
                            {aiReview.summary}
                          </Typography>
                        </CardContent>
                      </Card>
                      
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ height: '100%' }}>
                            <CardHeader
                              title="Strengths"
                              titleTypographyProps={{ variant: 'h6' }}
                            />
                            <CardContent>
                              <List>
                                {aiReview.strengths.map((strength, idx) => (
                                  <ListItem key={idx}>
                                    <ListItemIcon>
                                      <CheckCircleIcon color="success" />
                                    </ListItemIcon>
                                    <ListItemText primary={strength} />
                                  </ListItem>
                                ))}
                              </List>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ height: '100%' }}>
                            <CardHeader
                              title="Areas for Improvement"
                              titleTypographyProps={{ variant: 'h6' }}
                            />
                            <CardContent>
                              <List>
                                {aiReview.areas_for_improvement.map((area, idx) => (
                                  <ListItem key={idx}>
                                    <ListItemIcon>
                                      <ArrowUpwardIcon color="primary" />
                                    </ListItemIcon>
                                    <ListItemText primary={area} />
                                  </ListItem>
                                ))}
                              </List>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Card variant="outlined">
                            <CardHeader
                              title="Key Achievements"
                              titleTypographyProps={{ variant: 'h6' }}
                            />
                            <CardContent>
                              <List>
                                {aiReview.key_achievements.map((achievement, idx) => (
                                  <ListItem key={idx}>
                                    <ListItemIcon>
                                      <StarIcon color="warning" />
                                    </ListItemIcon>
                                    <ListItemText primary={achievement} />
                                  </ListItem>
                                ))}
                              </List>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined">
                            <CardHeader
                              title="Performance Ratings"
                              titleTypographyProps={{ variant: 'h6' }}
                            />
                            <CardContent>
                              {Object.entries(aiReview.ratings).map(([key, value]) => (
                                key !== 'overall' && (
                                  <Box key={key} mb={2}>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                        {key.replace(/_/g, ' ')}
                                      </Typography>
                                      <Typography variant="body2" fontWeight="bold">
                                        {value}/100
                                      </Typography>
                                    </Box>
                                    <LinearProgress
                                      variant="determinate"
                                      value={value}
                                      color={value >= 80 ? 'success' : value >= 60 ? 'info' : 'warning'}
                                    />
                                  </Box>
                                )
                              ))}
                              <Box mt={3} display="flex" justifyContent="center" alignItems="center" flexDirection="column">
                                <Typography variant="subtitle1" gutterBottom>
                                  Overall Performance
                                </Typography>
                                <Box position="relative" display="inline-flex">
                                  <CircularProgress
                                    variant="determinate"
                                    value={aiReview.ratings.overall}
                                    size={80}
                                    thickness={4}
                                    color={aiReview.ratings.overall >= 80 ? 'success' : aiReview.ratings.overall >= 60 ? 'info' : 'warning'}
                                  />
                                  <Box
                                    sx={{
                                      top: 0,
                                      left: 0,
                                      bottom: 0,
                                      right: 0,
                                      position: 'absolute',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <Typography
                                      variant="subtitle1"
                                      component="div"
                                      color="text.secondary"
                                    >
                                      {`${aiReview.ratings.overall}%`}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                        
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined">
                            <CardHeader
                              title="Career Development"
                              titleTypographyProps={{ variant: 'h6' }}
                            />
                            <CardContent>
                              <Typography variant="subtitle2" gutterBottom>
                                Recommendation
                              </Typography>
                              <Typography variant="body2" paragraph>
                                {aiReview.career_growth.recommendation}
                              </Typography>
                              
                              <Typography variant="subtitle2" gutterBottom>
                                Suggested Training / Development
                              </Typography>
                              <List dense>
                                {aiReview.career_growth.suggested_training.map((training, idx) => (
                                  <ListItem key={idx}>
                                    <ListItemIcon>
                                      <AssignmentIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary={training} />
                                  </ListItem>
                                ))}
                              </List>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                      
                      <Box display="flex" justify-content="space-between" mt={4}>
                        <Button
                          variant="outlined"
                          onClick={() => setActiveStep(0)}
                          startIcon={<ArrowBackIcon />}
                        >
                          Back to Employee Selection
                        </Button>
                        <Box>
                          <Button
                            variant="outlined"
                            color="secondary"
                            sx={{ mr: 2 }}
                            onClick={() => {
                              // Show success message
                              alert("Review saved successfully!");
                            }}
                          >
                            Save Review
                          </Button>
                          <Button
                            variant="contained"
                            onClick={() => {
                              // Show success message
                              alert("Review delivered successfully!");
                            }}
                          >
                            Deliver to Employee
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

export default PerformanceReview; 