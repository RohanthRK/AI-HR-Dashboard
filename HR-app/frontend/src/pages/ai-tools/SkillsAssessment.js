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
  ListItemIcon,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Autocomplete,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  IconButton,
  Badge,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  School as SchoolIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as AssignmentIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  AddCircle as AddCircleIcon,
  WorkOutline as WorkOutlineIcon,
  Search as SearchIcon,
  TipsAndUpdates as TipsAndUpdatesIcon,
  Star as StarIcon,
  Info as InfoIcon,
  Lightbulb as LightbulbIcon,
} from '@mui/icons-material';
import aiService from '../../services/aiService';

// Mock skills data
const skillCategories = [
  {
    id: 'tech',
    name: 'Technical Skills',
    skills: [
      { id: 'js', name: 'JavaScript', description: 'JavaScript programming language' },
      { id: 'react', name: 'React', description: 'React.js library for UI development' },
      { id: 'node', name: 'Node.js', description: 'Server-side JavaScript runtime' },
      { id: 'python', name: 'Python', description: 'Python programming language' },
      { id: 'java', name: 'Java', description: 'Java programming language' },
      { id: 'aws', name: 'AWS', description: 'Amazon Web Services cloud platform' },
      { id: 'docker', name: 'Docker', description: 'Containerization platform' },
      { id: 'kubernetes', name: 'Kubernetes', description: 'Container orchestration system' },
      { id: 'sql', name: 'SQL', description: 'Structured Query Language for databases' },
    ]
  },
  {
    id: 'soft',
    name: 'Soft Skills',
    skills: [
      { id: 'comm', name: 'Communication', description: 'Effective verbal and written communication' },
      { id: 'teamwork', name: 'Teamwork', description: 'Collaborating effectively in a team' },
      { id: 'problem', name: 'Problem Solving', description: 'Analytical approach to solving complex problems' },
      { id: 'leadership', name: 'Leadership', description: 'Guiding and inspiring a team' },
      { id: 'time', name: 'Time Management', description: 'Effective prioritization and time allocation' },
    ]
  },
  {
    id: 'design',
    name: 'Design Skills',
    skills: [
      { id: 'ui', name: 'UI Design', description: 'User interface design principles and tools' },
      { id: 'ux', name: 'UX Design', description: 'User experience research and design' },
      { id: 'figma', name: 'Figma', description: 'Collaborative interface design tool' },
      { id: 'photoshop', name: 'Photoshop', description: 'Image editing and design software' },
    ]
  },
];

// Mock job roles and required skills
const jobRoles = [
  {
    id: 'frontend',
    title: 'Frontend Developer',
    requiredSkills: ['js', 'react', 'ui'],
    recommendedSkills: ['node', 'aws', 'ux'],
    description: 'Builds user interfaces and client-side functionality for web applications.'
  },
  {
    id: 'backend',
    title: 'Backend Developer',
    requiredSkills: ['js', 'node', 'sql'],
    recommendedSkills: ['python', 'aws', 'docker'],
    description: 'Develops server-side logic and database integrations for web applications.'
  },
  {
    id: 'fullstack',
    title: 'Full Stack Developer',
    requiredSkills: ['js', 'react', 'node', 'sql'],
    recommendedSkills: ['aws', 'docker', 'kubernetes'],
    description: 'Develops both client and server-side components of web applications.'
  },
  {
    id: 'uxdesigner',
    title: 'UX Designer',
    requiredSkills: ['ui', 'ux', 'figma'],
    recommendedSkills: ['comm', 'problem', 'photoshop'],
    description: 'Designs user experiences for digital products and services.'
  },
  {
    id: 'projectmgr',
    title: 'Project Manager',
    requiredSkills: ['comm', 'leadership', 'time'],
    recommendedSkills: ['teamwork', 'problem'],
    description: 'Oversees and coordinates software development projects from inception to delivery.'
  },
];

// Mock organization's skill needs
const organizationSkillNeeds = [
  { id: 'react', count: 12, filled: 8, gap: 4 },
  { id: 'aws', count: 10, filled: 4, gap: 6 },
  { id: 'python', count: 8, filled: 7, gap: 1 },
  { id: 'kubernetes', count: 6, filled: 2, gap: 4 },
  { id: 'leadership', count: 5, filled: 3, gap: 2 },
];

// Flattened skills lookup
const allSkills = skillCategories.flatMap(category => category.skills);

const SkillsAssessment = () => {
  // State for job role selection
  const [selectedRole, setSelectedRole] = useState('');
  const [roleDetails, setRoleDetails] = useState(null);
  
  // State for skill selection and assessment
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState([]);
  
  // State for assessment results
  const [assessmentResults, setAssessmentResults] = useState(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [error, setError] = useState(null);
  
  // Add state for employees with matching skills
  const [matchingEmployees, setMatchingEmployees] = useState([]);
  const [isSearchingEmployees, setIsSearchingEmployees] = useState(false);
  
  // Add state for success message
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Handle job role selection
  const handleRoleChange = (event) => {
    const roleId = event.target.value;
    setSelectedRole(roleId);
    
    if (roleId) {
      const role = jobRoles.find(r => r.id === roleId);
      setRoleDetails(role);
      
      // Update selected skills based on the role's required skills
      if (role) {
        const roleSkills = role.requiredSkills.map(skillId => 
          allSkills.find(skill => skill.id === skillId)
        ).filter(Boolean);
        
        setSelectedSkills(roleSkills);
        setSelectedSkillIds(roleSkills.map(skill => skill.id));
      }
    } else {
      setRoleDetails(null);
      setSelectedSkills([]);
      setSelectedSkillIds([]);
    }
  };
  
  // Handle skill selection
  const handleSkillSelection = (event, values) => {
    setSelectedSkills(values);
    setSelectedSkillIds(values.map(skill => skill.id));
  };
  
  // Run AI assessment of skills against job roles
  const handleRunAssessment = async () => {
    if (selectedSkillIds.length === 0) {
      setError('Please select at least one skill to assess.');
      return;
    }
    
    setIsAssessing(true);
    setError(null);
    
    try {
      // In a real app, you'd call your backend API here
      // For demo purposes, we'll simulate a response
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate assessment results based on selected skills and role
      const roleMatches = jobRoles.map(role => {
        const requiredSkillsCount = role.requiredSkills.length;
        const matchedRequiredSkills = role.requiredSkills.filter(skillId => 
          selectedSkillIds.includes(skillId)
        );
        const requiredSkillsPercentage = requiredSkillsCount > 0 
          ? Math.round((matchedRequiredSkills.length / requiredSkillsCount) * 100) 
          : 0;
        
        const recommendedSkillsCount = role.recommendedSkills.length;
        const matchedRecommendedSkills = role.recommendedSkills.filter(skillId => 
          selectedSkillIds.includes(skillId)
        );
        const recommendedSkillsPercentage = recommendedSkillsCount > 0
          ? Math.round((matchedRecommendedSkills.length / recommendedSkillsCount) * 100)
          : 0;
        
        // Calculate overall match percentage
        const overallMatch = Math.round(
          (requiredSkillsPercentage * 0.7) + (recommendedSkillsPercentage * 0.3)
        );
        
        // Missing skills
        const missingRequiredSkills = role.requiredSkills
          .filter(skillId => !selectedSkillIds.includes(skillId))
          .map(skillId => allSkills.find(skill => skill.id === skillId))
          .filter(Boolean);
        
        const missingRecommendedSkills = role.recommendedSkills
          .filter(skillId => !selectedSkillIds.includes(skillId))
          .map(skillId => allSkills.find(skill => skill.id === skillId))
          .filter(Boolean);
        
        return {
          roleId: role.id,
          roleTitle: role.title,
          requiredSkillsPercentage,
          recommendedSkillsPercentage,
          overallMatch,
          matchedRequiredSkills: matchedRequiredSkills.map(id => 
            allSkills.find(skill => skill.id === id)
          ).filter(Boolean),
          matchedRecommendedSkills: matchedRecommendedSkills.map(id => 
            allSkills.find(skill => skill.id === id)
          ).filter(Boolean),
          missingRequiredSkills,
          missingRecommendedSkills
        };
      }).sort((a, b) => b.overallMatch - a.overallMatch);
      
      // Organization needs analysis
      const organizationNeeds = organizationSkillNeeds
        .filter(need => need.gap > 0)
        .map(need => {
          const skill = allSkills.find(s => s.id === need.id);
          const isSelected = selectedSkillIds.includes(need.id);
          return {
            ...need,
            skill,
            isSelected
          };
        })
        .sort((a, b) => b.gap - a.gap);
      
      // Career growth suggestions
      const topRoleMatch = roleMatches[0];
      let growthSuggestions = [];
      
      if (topRoleMatch && topRoleMatch.overallMatch >= 70) {
        // If there's a good match, suggest related career paths
        const relatedRoles = jobRoles
          .filter(role => role.id !== topRoleMatch.roleId)
          .filter(role => {
            // Roles that share at least 50% of the skills
            const sharedSkills = role.requiredSkills.filter(skill => 
              topRoleMatch.matchedRequiredSkills.some(s => s.id === skill) ||
              topRoleMatch.matchedRecommendedSkills.some(s => s.id === skill)
            );
            return sharedSkills.length / role.requiredSkills.length >= 0.5;
          })
          .map(role => ({
            roleId: role.id,
            roleTitle: role.title,
            additionalSkillsNeeded: role.requiredSkills
              .filter(skillId => !selectedSkillIds.includes(skillId))
              .map(skillId => allSkills.find(s => s.id === skillId))
              .filter(Boolean)
          }));
        
        growthSuggestions = relatedRoles;
      }
      
      setAssessmentResults({
        roleMatches,
        organizationNeeds,
        growthSuggestions,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      setError('Error generating skills assessment. Please try again.');
      console.error('Error in skills assessment:', err);
    } finally {
      setIsAssessing(false);
    }
  };
  
  // Add new function to find employees with selected skills
  const handleFindEmployees = async () => {
    if (selectedSkillIds.length === 0) {
      setError('Please select at least one skill to find matching employees.');
      return;
    }
    
    setIsSearchingEmployees(true);
    setError(null);
    
    try {
      // Convert skills from objects to strings if needed
      const skillsToSend = selectedSkills.map(skill => skill.name || skill);
      console.log('Searching for employees with skills:', skillsToSend);
      
      // Call the API to find employees with these skills
      const results = await aiService.findEmployeesBySkills(skillsToSend);
      console.log('Found employees:', results);
      
      setMatchingEmployees(results);
      
      if (results.length === 0) {
        setError('No employees found with the selected skills.');
      } else {
        // Display success message with the count
        const count = results.length;
        const skillsList = skillsToSend.join(', ');
        setSuccessMessage(`Found ${count} employee${count !== 1 ? 's' : ''} with skills in: ${skillsList}`);
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 5000);
      }
    } catch (err) {
      console.error('Error finding employees:', err);
      setError('Error finding employees with these skills. Please try again.');
      setMatchingEmployees([]);
    } finally {
      setIsSearchingEmployees(false);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        AI Skills Assessment
      </Typography>
      
      {/* Job Role Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Select Job Role (Optional)
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Choose a job role to assess skills against, or skip to manually select skills.
        </Typography>
        
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="role-select-label">Job Role</InputLabel>
          <Select
            labelId="role-select-label"
            value={selectedRole}
            label="Job Role"
            onChange={handleRoleChange}
          >
            <MenuItem value="">
              <em>Select a job role (optional)</em>
            </MenuItem>
            {jobRoles.map((role) => (
              <MenuItem key={role.id} value={role.id}>
                {role.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        
        {roleDetails && (
          <Card variant="outlined" sx={{ mt: 2 }}>
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <WorkOutlineIcon />
                </Avatar>
              }
              title={roleDetails.title}
              subheader={roleDetails.description}
            />
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>Required Skills:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                {roleDetails.requiredSkills.map(skillId => {
                  const skill = allSkills.find(s => s.id === skillId);
                  return skill ? (
                    <Chip 
                      key={skill.id} 
                      label={skill.name} 
                      color="primary" 
                      size="small" 
                    />
                  ) : null;
                })}
              </Box>
              
              <Typography variant="subtitle2" gutterBottom>Recommended Skills:</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {roleDetails.recommendedSkills.map(skillId => {
                  const skill = allSkills.find(s => s.id === skillId);
                  return skill ? (
                    <Chip 
                      key={skill.id} 
                      label={skill.name} 
                      variant="outlined"
                      color="primary"
                      size="small" 
                    />
                  ) : null;
                })}
              </Box>
            </CardContent>
          </Card>
        )}
      </Paper>
      
      {/* Skills Selection */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Select Skills
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Choose the skills to include in your assessment. You can select multiple skills to find matching employees or job roles.
        </Typography>
        
        <Autocomplete
          multiple
          id="skills-selection"
          options={allSkills}
          value={selectedSkills}
          onChange={handleSkillSelection}
          getOptionLabel={(option) => option.name}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Selected Skills"
              placeholder="Add a skill"
            />
          )}
          renderOption={(props, option) => (
            <li {...props}>
              <Tooltip title={option.description} arrow>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <SchoolIcon fontSize="small" sx={{ mr: 1, color: 'action.active' }} />
                  {option.name}
                </Box>
              </Tooltip>
            </li>
          )}
          renderTags={(selected, getTagProps) =>
            selected.map((option, index) => (
              <Chip
                {...getTagProps({ index })}
                key={option.id}
                label={option.name}
                color="primary"
                variant={roleDetails?.requiredSkills.includes(option.id) ? "filled" : "outlined"}
              />
            ))
          }
          sx={{ mb: 3 }}
        />
        
        {/* Add buttons for Skills Assessment and Finding Employees */}
        <Box sx={{ display: 'flex', gap: 2, mt: 3, mb: 4 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={isAssessing ? <CircularProgress size={20} color="inherit" /> : <AssignmentIcon />}
            onClick={handleRunAssessment}
            disabled={isAssessing || selectedSkillIds.length === 0}
          >
            {isAssessing ? 'Assessing...' : 'Match Skills to Job Roles'}
          </Button>
          
          <Button
            variant="contained"
            color="secondary"
            startIcon={isSearchingEmployees ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
            onClick={handleFindEmployees}
            disabled={isSearchingEmployees || selectedSkillIds.length === 0}
          >
            {isSearchingEmployees ? 'Searching...' : 'Find Matching Employees'}
          </Button>
        </Box>
        
        {/* Display error message if any */}
        {error && (
          <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {/* Display success message if any */}
        {successMessage && (
          <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
            {successMessage}
          </Alert>
        )}
        
        {/* Browse by category */}
        <Typography variant="subtitle1" gutterBottom sx={{ mt: 4 }}>
          Browse Skills by Category
        </Typography>
        
        <Grid container spacing={3}>
          {skillCategories.map((category) => (
            <Grid item xs={12} md={4} key={category.id}>
              <Card variant="outlined">
                <CardHeader
                  title={category.name}
                  titleTypographyProps={{ variant: 'subtitle1' }}
                />
                <CardContent>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {category.skills.map((skill) => (
                      <Chip
                        key={skill.id}
                        label={skill.name}
                        clickable
                        onClick={() => {
                          if (selectedSkillIds.includes(skill.id)) {
                            setSelectedSkills(selectedSkills.filter(s => s.id !== skill.id));
                            setSelectedSkillIds(selectedSkillIds.filter(id => id !== skill.id));
                          } else {
                            setSelectedSkills([...selectedSkills, skill]);
                            setSelectedSkillIds([...selectedSkillIds, skill.id]);
                          }
                        }}
                        color={selectedSkillIds.includes(skill.id) ? "primary" : "default"}
                        variant={selectedSkillIds.includes(skill.id) ? "filled" : "outlined"}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>
      
      {/* Employees with Matching Skills Section - New Section */}
      {matchingEmployees.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            Employees with Selected Skills
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Below are employees who have the skills you selected, sorted by suitability percentage.
          </Typography>
          
          <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Position</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Matching Skills</TableCell>
                  <TableCell align="center">Skill Match</TableCell>
                  <TableCell align="center">Exp. Match</TableCell>
                  <TableCell align="center">Overall Fit</TableCell>
                  <TableCell align="right">Suitability</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {matchingEmployees.map((employee) => (
                  <TableRow key={employee.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
                          {employee.name.charAt(0)}
                        </Avatar>
                        <Typography variant="body2">{employee.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {employee.matching_skills.map((skill, index) => (
                          <Chip 
                            key={index} 
                            label={skill} 
                            size="small" 
                            color="primary" 
                            variant="outlined" 
                          />
                        ))}
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${employee.skill_match || Math.round(employee.suitability * 0.9)}%`}
                        color={
                          (employee.skill_match || Math.round(employee.suitability * 0.9)) >= 90 ? 'success' :
                          (employee.skill_match || Math.round(employee.suitability * 0.9)) >= 70 ? 'primary' :
                          (employee.skill_match || Math.round(employee.suitability * 0.9)) >= 50 ? 'info' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${employee.experience_match || Math.round(employee.suitability * 0.7)}%`}
                        color={
                          (employee.experience_match || Math.round(employee.suitability * 0.7)) >= 90 ? 'success' :
                          (employee.experience_match || Math.round(employee.suitability * 0.7)) >= 70 ? 'primary' :
                          (employee.experience_match || Math.round(employee.suitability * 0.7)) >= 50 ? 'info' : 'default'
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {employee.overall_fit || 
                        (employee.suitability >= 90 ? 'Excellent' :
                        employee.suitability >= 80 ? 'Very Good' :
                        employee.suitability >= 70 ? 'Good' :
                        employee.suitability >= 50 ? 'Fair' : 'Poor')}
                    </TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${employee.suitability}%`}
                        color={
                          employee.suitability >= 90 ? 'success' :
                          employee.suitability >= 70 ? 'primary' :
                          employee.suitability >= 50 ? 'info' : 'default'
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      
      {/* Assessment Results */}
      {assessmentResults && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Assessment Results
          </Typography>
          
          {/* Job Role Matches */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Job Role Matches
          </Typography>
          
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Job Role</TableCell>
                  <TableCell align="center">Match %</TableCell>
                  <TableCell align="center">Required Skills</TableCell>
                  <TableCell>Missing Skills</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {assessmentResults.roleMatches.map((match) => (
                  <TableRow key={match.roleId} sx={{ 
                    '&:nth-of-type(1)': { bgcolor: 'action.hover' }
                  }}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {match.overallMatch >= 80 && (
                          <Tooltip title="Excellent Match">
                            <Badge color="success" badgeContent="★" sx={{ mr: 1 }}>
                              <WorkOutlineIcon />
                            </Badge>
                          </Tooltip>
                        )}
                        {match.overallMatch < 80 && match.overallMatch >= 60 && (
                          <WorkOutlineIcon sx={{ mr: 1 }} />
                        )}
                        {match.overallMatch < 60 && (
                          <WorkOutlineIcon sx={{ mr: 1, color: 'text.secondary' }} />
                        )}
                        <Typography
                          variant={match === assessmentResults.roleMatches[0] ? 'subtitle2' : 'body2'}
                          color={match.overallMatch < 40 ? 'text.secondary' : 'text.primary'}
                        >
                          {match.roleTitle}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${match.overallMatch}%`}
                        color={
                          match.overallMatch >= 80 ? 'success' :
                          match.overallMatch >= 60 ? 'primary' :
                          match.overallMatch >= 40 ? 'default' : 'default'
                        }
                        variant={match.overallMatch >= 60 ? 'filled' : 'outlined'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${match.requiredSkillsPercentage}%`}
                        color={
                          match.requiredSkillsPercentage >= 90 ? 'success' :
                          match.requiredSkillsPercentage >= 70 ? 'primary' :
                          match.requiredSkillsPercentage >= 50 ? 'warning' : 'error'
                        }
                        variant={match.requiredSkillsPercentage >= 70 ? 'filled' : 'outlined'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {match.missingRequiredSkills.length > 0 ? (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {match.missingRequiredSkills.map(skill => (
                            <Chip
                              key={skill.id}
                              label={skill.name}
                              size="small"
                              color="primary"
                              variant="outlined"
                              icon={<AddCircleIcon />}
                              sx={{ mr: 0.5 }}
                            />
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="success.main">
                          <CheckCircleIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                          All required skills met
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Organization Needs Analysis */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Organization's Skill Needs
          </Typography>
          
          {assessmentResults.organizationNeeds.length > 0 ? (
            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" paragraph color="text.secondary">
                The following skills are currently in demand at the organization:
              </Typography>
              
              <Grid container spacing={2}>
                {assessmentResults.organizationNeeds.map((need) => (
                  <Grid item xs={12} sm={6} md={4} key={need.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle1">
                            {need.skill.name}
                          </Typography>
                          {need.isSelected ? (
                            <Tooltip title="You have this skill">
                              <CheckCircleIcon color="success" />
                            </Tooltip>
                          ) : (
                            <Tooltip title="Skill gap opportunity">
                              <LightbulbIcon color="warning" />
                            </Tooltip>
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {need.skill.description}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5 }}>
                          <Tooltip title="Demand level">
                            <Chip 
                              label={need.gap > 3 ? "High Demand" : need.gap > 1 ? "Medium Demand" : "In Demand"} 
                              color={need.gap > 3 ? "warning" : need.gap > 1 ? "info" : "default"}
                              size="small"
                              variant="outlined"
                              icon={<InfoIcon fontSize="small" />}
                            />
                          </Tooltip>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ) : (
            <Alert severity="info" sx={{ mb: 4 }}>
              No significant skill gaps identified in the organization at this time.
            </Alert>
          )}
          
          {/* Career Growth Suggestions */}
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
            Career Growth Suggestions
          </Typography>
          
          {assessmentResults.growthSuggestions.length > 0 ? (
            <Box>
              <Typography variant="body2" paragraph color="text.secondary">
                Based on your current skills, here are potential career paths:
              </Typography>
              
              <List sx={{ width: '100%' }}>
                {assessmentResults.growthSuggestions.map((suggestion) => (
                  <Card variant="outlined" sx={{ mb: 2 }} key={suggestion.roleId}>
                    <CardHeader
                      avatar={
                        <Avatar sx={{ bgcolor: 'info.light' }}>
                          <TipsAndUpdatesIcon />
                        </Avatar>
                      }
                      title={`Career Path: ${suggestion.roleTitle}`}
                      subheader="Potential growth opportunity"
                    />
                    <CardContent>
                      <Typography variant="body2" gutterBottom>
                        Additional skills needed:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {suggestion.additionalSkillsNeeded.map(skill => (
                          <Chip
                            key={skill.id}
                            label={skill.name}
                            size="small"
                            color="info"
                            icon={<SchoolIcon fontSize="small" />}
                            sx={{ mr: 0.5, mb: 0.5 }}
                          />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </List>
            </Box>
          ) : (
            <Alert severity="info">
              Complete your assessment with a job role selection to receive career growth suggestions.
            </Alert>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default SkillsAssessment; 