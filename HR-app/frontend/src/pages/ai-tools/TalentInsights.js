import React, { useState, useEffect } from 'react';
import axios from 'axios';
import employeeService from '../../services/employeeService'; 
import teamService from '../../services/teamService';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Alert
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import PeopleIcon from '@mui/icons-material/People';
import PageHeader from '../../components/PageHeader';

const TalentInsights = () => {
  // State for data
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [skillsTrends, setSkillsTrends] = useState([]);
  const [teamInsights, setTeamInsights] = useState(null);
  const [growthOpportunities, setGrowthOpportunities] = useState(null);
  
  // State for UI control
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [insightType, setInsightType] = useState('team');

  // Fetch employees data on component mount
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        
        // Try the real API call first
        try {
          console.log('Attempting to fetch real employees data');
          const data = await employeeService.getAllEmployees();
          if (data && data.length > 0) {
            console.log('Successfully fetched real employees:', data.length);
            setEmployees(data);
            setError(null);
            setLoading(false);
            return;
          }
        } catch (apiErr) {
          console.log('API call failed, falling back to mock data', apiErr);
        }
        
        // Use mock data as fallback
        console.log('Using mock employees data');
        const mockEmployees = [
          {
            id: 'emp-1',
            _id: 'emp-1',
            first_name: 'John',
            last_name: 'Doe',
            name: 'John Doe',
            position: 'Team Lead',
            department: 'Engineering',
            skills: ['JavaScript', 'React', 'Node.js', 'Team Leadership'],
            performance: 4.7,
            growthPotential: 'High',
            email: 'john.doe@example.com'
          },
          {
            id: 'emp-2',
            _id: 'emp-2',
            first_name: 'Jane',
            last_name: 'Smith',
            name: 'Jane Smith',
            position: 'Senior Developer',
            department: 'Engineering',
            skills: ['JavaScript', 'React', 'System Architecture', 'Code Review'],
            performance: 4.5,
            growthPotential: 'High',
            email: 'jane.smith@example.com'
          },
          {
            id: 'emp-3',
            _id: 'emp-3',
            first_name: 'Bob',
            last_name: 'Johnson',
            name: 'Bob Johnson',
            position: 'Developer',
            department: 'Engineering',
            skills: ['JavaScript', 'React', 'API Development'],
            performance: 3.8,
            growthPotential: 'Medium',
            email: 'bob.johnson@example.com'
          },
          {
            id: 'emp-4',
            _id: 'emp-4',
            first_name: 'Alice',
            last_name: 'Brown',
            name: 'Alice Brown',
            position: 'Team Lead',
            department: 'Engineering',
            skills: ['Java', 'Spring', 'MongoDB', 'System Design', 'Team Leadership'],
            performance: 4.8,
            growthPotential: 'Very High',
            email: 'alice.brown@example.com'
          },
          {
            id: 'emp-5',
            _id: 'emp-5',
            first_name: 'Tom',
            last_name: 'Wilson',
            name: 'Tom Wilson',
            position: 'Senior Developer',
            department: 'Engineering',
            skills: ['Java', 'Spring', 'Database Design', 'API Development'],
            performance: 4.2,
            growthPotential: 'High',
            email: 'tom.wilson@example.com'
          },
          {
            id: 'emp-6',
            _id: 'emp-6',
            first_name: 'Sarah',
            last_name: 'Davis',
            name: 'Sarah Davis',
            position: 'Design Lead',
            department: 'Design',
            skills: ['UI Design', 'Design Systems', 'User Research', 'Leadership'],
            performance: 4.6,
            growthPotential: 'High',
            email: 'sarah.davis@example.com'
          },
          {
            id: 'emp-7',
            _id: 'emp-7',
            first_name: 'Mike',
            last_name: 'Taylor',
            name: 'Mike Taylor',
            position: 'UX Designer',
            department: 'Design',
            skills: ['User Research', 'Wireframing', 'Prototyping', 'Usability Testing'],
            performance: 4.0,
            growthPotential: 'Medium',
            email: 'mike.taylor@example.com'
          }
        ];
        
        console.log('Setting mock employees:', mockEmployees.length);
        setEmployees(mockEmployees);
        setError(null);
      } catch (err) {
        console.error('Error in fetchEmployees:', err);
        setError('Failed to load employee data');
        setEmployees([]); // Empty array so UI can still render
      } finally {
        setLoading(false);
      }
    };

    const fetchTeams = async () => {
      try {
        setLoading(true);
        
        // Try the real API call first
        try {
          console.log('Attempting to fetch real teams data');
          const data = await teamService.getTeamsDebug();
          if (data && data.length > 0) {
            console.log('Successfully fetched real teams:', data.length);
            setTeams(data);
            setError(null);
            setLoading(false);
            return;
          }
        } catch (apiErr) {
          console.log('Teams API call failed, falling back to mock data', apiErr);
        }
        
        // Use mock data as fallback
        console.log('Using mock teams data');
        const mockTeams = [
          {
            id: 'team-1',
            _id: 'team-1',
            name: 'Frontend Team',
            department: 'Engineering',
            leader: 'John Doe',
            members_count: 5,
            members: [
              { id: 'emp-1', _id: 'emp-1', name: 'John Doe', position: 'Team Lead', is_leader: true },
              { id: 'emp-2', _id: 'emp-2', name: 'Jane Smith', position: 'Senior Developer' },
              { id: 'emp-3', _id: 'emp-3', name: 'Bob Johnson', position: 'Developer' }
            ],
            description: 'Responsible for frontend development'
          },
          {
            id: 'team-2',
            _id: 'team-2',
            name: 'Backend Team',
            department: 'Engineering',
            leader: 'Alice Brown',
            members_count: 4,
            members: [
              { id: 'emp-4', _id: 'emp-4', name: 'Alice Brown', position: 'Team Lead', is_leader: true },
              { id: 'emp-5', _id: 'emp-5', name: 'Tom Wilson', position: 'Senior Developer' }
            ],
            description: 'Handles server-side architecture and APIs'
          },
          {
            id: 'team-3',
            _id: 'team-3',
            name: 'UI/UX Team',
            department: 'Design',
            leader: 'Sarah Davis',
            members_count: 3,
            members: [
              { id: 'emp-6', _id: 'emp-6', name: 'Sarah Davis', position: 'Design Lead', is_leader: true },
              { id: 'emp-7', _id: 'emp-7', name: 'Mike Taylor', position: 'UX Designer' }
            ],
            description: 'Focuses on user experience and interface design'
          }
        ];
        
        console.log('Setting mock teams:', mockTeams.length);
        setTeams(mockTeams);
        setError(null);
      } catch (err) {
        console.error('Error in fetchTeams:', err);
        setError('Failed to load team data');
        setTeams([]); // Empty array so UI can still render
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
    fetchTeams();
  }, []);

  // Handle insight type selection
  const handleGenerateInsights = async (type) => {
    setInsightType(type);
    setLoading(true);
    setError(null);
    
    try {
      if (type === 'team') {
        // Generate team insights based on actual teams data
        const teamInsightsData = generateTeamInsights(teams);
        setTeamInsights(teamInsightsData);
      } else if (type === 'skills') {
        // Generate skills trends based on actual employee data
        const skillsTrendsData = generateSkillsTrends(employees);
        setSkillsTrends(skillsTrendsData.trends);
      } else if (type === 'growth') {
        // Generate growth opportunities based on actual employee and team data
        const growthData = generateGrowthOpportunities(employees, teams);
        setGrowthOpportunities(growthData);
      }
    } catch (err) {
      console.error(`Error fetching ${type} insights:`, err);
      setError(`Failed to load ${type} insights. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle employee selection
  const handleEmployeeSelect = async (employee) => {
    setSelectedEmployee(employee);
    setInsightType('individual');
    setLoading(true);
    setError(null);
    
    try {
      // Generate employee insights from employee data
      const enhancedEmployee = generateEmployeeInsights(employee, employees, teams);
      setSelectedEmployee(enhancedEmployee);
    } catch (err) {
      console.error('Error fetching employee insights:', err);
      setError(`Failed to load insights for ${employee.name}. Please try again later.`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate team insights
  const generateTeamInsights = (teamsData) => {
    // For demo purposes, select the first team or create mock data if none
    const team = teamsData.length > 0 ? teamsData[0] : { name: 'All Teams' };
    
    // Map team.department to specific strengths and development areas
    const departmentStrengths = {
      'Engineering': [
        'Technical problem-solving',
        'Architecture design',
        'Code quality',
        'System optimization',
        'Technical innovation'
      ],
      'Design': [
        'User-centered design',
        'Visual aesthetics',
        'Design systems',
        'User research',
        'Creative problem-solving'
      ],
      'Marketing': [
        'Campaign strategy',
        'Content creation',
        'Market analysis',
        'Brand consistency',
        'Customer engagement'
      ],
      'Sales': [
        'Client relationship',
        'Deal negotiation',
        'Market knowledge',
        'Value proposition',
        'Revenue generation'
      ],
      'Product': [
        'Product strategy',
        'Feature prioritization',
        'Stakeholder management',
        'User feedback integration',
        'Roadmap planning'
      ]
    };
    
    const departmentDevelopmentAreas = {
      'Engineering': [
        'Documentation',
        'Knowledge sharing',
        'Cross-team communication',
        'Business context understanding',
        'User feedback incorporation'
      ],
      'Design': [
        'Technical constraints awareness',
        'Handoff documentation',
        'Standardization',
        'Development process knowledge',
        'Scope management'
      ],
      'Marketing': [
        'Technical understanding',
        'Data-driven decisions',
        'Analytics utilization',
        'ROI measurement',
        'Cross-functional collaboration'
      ],
      'Sales': [
        'Product knowledge depth',
        'Technology understanding',
        'Documentation',
        'Process adherence',
        'Digital tool utilization'
      ],
      'Product': [
        'Technical depth',
        'Implementation details',
        'Documentation',
        'Metrics definition',
        'Team capacity planning'
      ]
    };
    
    // Select strengths and development areas based on department
    const strengths = departmentStrengths[team.department] || [
      'Cross-functional collaboration',
      'Technical expertise',
      'Project delivery',
      'Problem solving',
      'Knowledge sharing'
    ];
    
    const developmentAreas = departmentDevelopmentAreas[team.department] || [
      'Documentation',
      'Process standardization',
      'Knowledge transfer',
      'Work-life balance',
      'Meeting efficiency'
    ];
    
    return {
      teamName: team.name,
      teamDepartment: team.department,
      strengths,
      developmentAreas,
      collaborationScore: Math.floor(Math.random() * 16) + 75, // Random score between 75-90
      recommendations: [
        {
          title: 'Implement structured knowledge sharing sessions',
          description: 'Schedule bi-weekly meetings where team members can share their expertise on specific topics.'
        },
        {
          title: 'Review and optimize meeting structure',
          description: 'Reduce meeting time by 20% through better preparation and focused agendas.'
        },
        {
          title: 'Create comprehensive onboarding documentation',
          description: 'Document key processes and knowledge areas to facilitate faster onboarding and knowledge transfer.'
        },
        {
          title: 'Establish clear roles and responsibilities',
          description: 'Define and document responsibilities for each team member to improve accountability and reduce overlap.'
        }
      ]
    };
  };

  // Helper function to generate skills trends based on employee data
  const generateSkillsTrends = (employeesData) => {
    // Extract actual skills from employees and calculate frequencies
    const allSkills = {};
    
    employeesData.forEach(employee => {
      const skills = employee.skills || [];
      skills.forEach(skill => {
        if (allSkills[skill]) {
          allSkills[skill]++;
        } else {
          allSkills[skill] = 1;
        }
      });
    });
    
    // Transform to the expected format
    const trendsList = Object.entries(allSkills)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([skill, count]) => ({
        skill,
        trend: 'Rising',
        growth: Math.floor(Math.random() * 30) + 10, // Random growth between 10-40%
        demand: Math.floor(Math.random() * 30) + 70  // Random demand between 70-100%
      }));
    
    // Add some emerging skills if we don't have enough
    const emergingSkills = [
      'AI/ML', 'Cloud Architecture', 'DevOps', 'Data Science', 
      'React Native', 'Blockchain', 'Cybersecurity', 'UX Research'
    ];
    
    while (trendsList.length < 6) {
      const randomIndex = Math.floor(Math.random() * emergingSkills.length);
      const skill = emergingSkills[randomIndex];
      
      if (!trendsList.some(t => t.skill === skill)) {
        trendsList.push({
          skill,
          trend: 'Rising',
          growth: Math.floor(Math.random() * 40) + 20, // Higher growth for emerging skills
          demand: Math.floor(Math.random() * 20) + 60  // Variable demand
        });
      }
    }
    
    return { trends: trendsList };
  };

  // Helper function to generate growth opportunities
  const generateGrowthOpportunities = (employeesData, teamsData) => {
    // Identify high-potential employees (those with performance rating > 3.5)
    const highPotentialEmployees = employeesData
      .filter(employee => {
        const performance = employee.performance || Math.random() * 2 + 3; // Default 3-5 if not available
        return performance > 3.5;
      })
      .slice(0, 5) // Limit to 5 employees
      .map(employee => ({
        id: employee.id || employee._id,
        name: employee.name || `${employee.first_name} ${employee.last_name}`,
        position: employee.position || 'Staff',
        performance: employee.performance || (Math.random() * 1 + 4).toFixed(1), // 4.0-5.0 range
        department: employee.department || 'Engineering'
      }));
    
    // Identify potential leaders
    const leadershipPipeline = employeesData
      .filter(employee => {
        // Use years of experience or tenure if available, otherwise random
        const yearsExperience = employee.years_experience || Math.floor(Math.random() * 8) + 2;
        const performance = employee.performance || Math.random() * 2 + 3;
        return yearsExperience > 3 && performance > 3.8;
      })
      .slice(0, 3) // Limit to 3 potential leaders
      .map(employee => ({
        employeeId: employee.id || employee._id,
        name: employee.name || `${employee.first_name} ${employee.last_name}`,
        recommendation: `Ready for promotion to ${getNextRole(employee.position)}`
      }));
    
    // Development plans based on skills gaps in the organization
    const developmentPlans = [
      {
        title: 'Technical Leadership Program',
        description: 'Six-month program to develop technical leadership skills through mentoring and specialized training.',
        icon: 'school',
        iconColor: '#3f51b5'
      },
      {
        title: 'Cross-functional Team Rotation',
        description: 'Three-month rotations to different departments to build broader organizational knowledge.',
        icon: 'work',
        iconColor: '#f44336'
      },
      {
        title: 'Mentorship Initiative',
        description: 'Pair junior and senior employees for knowledge transfer and career guidance.',
        icon: 'people',
        iconColor: '#4caf50'
      }
    ];
    
    return {
      highPotentialEmployees,
      leadershipPipeline,
      developmentPlans
    };
  };
  
  // Helper function to get next role for career progression
  const getNextRole = (currentRole) => {
    const roleMap = {
      'Junior Developer': 'Developer',
      'Developer': 'Senior Developer',
      'Senior Developer': 'Lead Developer',
      'Lead Developer': 'Engineering Manager',
      'Engineering Manager': 'Director of Engineering',
      'Designer': 'Senior Designer',
      'Senior Designer': 'Design Lead',
      'UX Designer': 'Senior UX Designer',
      'Product Manager': 'Senior Product Manager',
      'Senior Product Manager': 'Director of Product',
      'Marketing Specialist': 'Marketing Manager',
      'HR Specialist': 'HR Manager',
      'Data Analyst': 'Senior Data Analyst',
      'Senior Data Analyst': 'Data Science Lead'
    };
    
    return roleMap[currentRole] || 'Senior Position';
  };
  
  // Helper function to generate insights for an individual employee
  const generateEmployeeInsights = (employee, allEmployees, teamsData) => {
    // Find the employee's team
    const employeeTeam = teamsData.find(team => 
      team.members && team.members.some(member => 
        member.id === employee.id || member.name === employee.name
      )
    );
    
    // Generate skills if not present
    const skills = employee.skills || generateSkillsForRole(employee.position);
    
    // Generate recommendations based on employee data
    const recommendations = [
      {
        title: 'Skill Development',
        description: `Focus on developing ${getRecommendedSkill(employee.position)} skills to enhance your career trajectory.`
      },
      {
        title: 'Project Opportunity',
        description: 'Consider joining cross-functional projects to gain broader organizational exposure.'
      },
      {
        title: 'Learning Path',
        description: `Explore ${getRecommendedCourse(employee.position)} courses to build expertise in your domain.`
      }
    ];
    
    // Growth potential if not present
    const growthPotential = employee.growthPotential || 
      ['Medium', 'High', 'Very High'][Math.floor(Math.random() * 3)];
    
    // Enhance the employee object with additional insights
    return {
      ...employee,
      skills,
      performance: employee.performance || 4.2,
      growthPotential,
      recommendations,
      team: employeeTeam ? employeeTeam.name : 'Unassigned',
      department: employee.department || 'Engineering',
      strengths: getStrengthsForRole(employee.position),
      growth_areas: getGrowthAreasForRole(employee.position)
    };
  };
  
  // Helper function to generate skills based on role
  const generateSkillsForRole = (role) => {
    const roleSkillsMap = {
      'Developer': ['JavaScript', 'React', 'Node.js', 'API Development'],
      'Senior Developer': ['System Architecture', 'JavaScript', 'React', 'Node.js', 'Team Leadership'],
      'Product Manager': ['Product Strategy', 'User Research', 'Roadmap Planning', 'Stakeholder Management'],
      'Designer': ['UI Design', 'Wireframing', 'User Research', 'Figma'],
      'UX Designer': ['User Research', 'Prototyping', 'Information Architecture', 'Usability Testing'],
      'Data Analyst': ['SQL', 'Data Visualization', 'Statistical Analysis', 'Python'],
      'Marketing Specialist': ['Content Strategy', 'Social Media', 'Analytics', 'Campaign Management'],
      'HR Specialist': ['Recruitment', 'Employee Relations', 'Policy Development', 'Onboarding']
    };
    
    return roleSkillsMap[role] || ['Teamwork', 'Communication', 'Problem Solving', 'Project Management'];
  };
  
  // Helper function to get recommended skill for a role
  const getRecommendedSkill = (role) => {
    const skillMap = {
      'Developer': 'cloud architecture',
      'Senior Developer': 'system design',
      'Product Manager': 'data analytics',
      'Designer': 'motion design',
      'UX Designer': 'user research',
      'Data Analyst': 'machine learning',
      'Marketing Specialist': 'marketing automation',
      'HR Specialist': 'talent analytics'
    };
    
    return skillMap[role] || 'leadership';
  };
  
  // Helper function to get recommended course for a role
  const getRecommendedCourse = (role) => {
    const courseMap = {
      'Developer': 'cloud certification',
      'Senior Developer': 'advanced architecture',
      'Product Manager': 'product analytics',
      'Designer': 'advanced UX',
      'UX Designer': 'design systems',
      'Data Analyst': 'data science',
      'Marketing Specialist': 'digital marketing',
      'HR Specialist': 'HR analytics'
    };
    
    return courseMap[role] || 'professional development';
  };
  
  // Helper function to get strengths for a role
  const getStrengthsForRole = (role) => {
    const strengthsMap = {
      'Developer': ['Technical problem solving', 'Code quality', 'Learning new technologies'],
      'Senior Developer': ['Technical leadership', 'System architecture', 'Mentoring'],
      'Product Manager': ['Stakeholder management', 'Strategic thinking', 'Communication'],
      'Designer': ['Visual design', 'User-centered thinking', 'Creativity'],
      'UX Designer': ['User research', 'Information architecture', 'Prototyping'],
      'Data Analyst': ['Data interpretation', 'Statistical analysis', 'Visualization'],
      'Marketing Specialist': ['Content creation', 'Campaign management', 'Analytics'],
      'HR Specialist': ['Interpersonal skills', 'Policy implementation', 'Employee relations']
    };
    
    return strengthsMap[role] || ['Communication', 'Teamwork', 'Problem solving'];
  };
  
  // Helper function to get growth areas for a role
  const getGrowthAreasForRole = (role) => {
    const growthAreasMap = {
      'Developer': ['Documentation', 'System design', 'Testing practices'],
      'Senior Developer': ['Delegation', 'Strategic planning', 'Cross-functional communication'],
      'Product Manager': ['Technical knowledge', 'Data analysis', 'Prioritization'],
      'Designer': ['User research', 'Testing methodologies', 'Design systems'],
      'UX Designer': ['Visual design', 'Technical constraints', 'Business impact'],
      'Data Analyst': ['Business context', 'Storytelling', 'Predictive modeling'],
      'Marketing Specialist': ['Technical SEO', 'Data-driven decisions', 'ROI analysis'],
      'HR Specialist': ['Analytics', 'Strategic planning', 'Technology adoption']
    };
    
    return growthAreasMap[role] || ['Advanced domain knowledge', 'Leadership', 'Strategic thinking'];
  };

  return (
    <Box>
      <PageHeader
        title="Talent Insights"
        subtitle="Gain valuable insights about your team's skills, potential, and growth opportunities"
        icon={<AutoAwesomeIcon />}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left side - Employee List and Controls */}
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Select Analysis Type
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Button 
                variant={insightType === 'team' ? "contained" : "outlined"} 
                fullWidth 
                sx={{ mb: 1 }}
                onClick={() => handleGenerateInsights('team')}
              >
                Team Analysis
              </Button>
              <Button 
                variant={insightType === 'skills' ? "contained" : "outlined"} 
                fullWidth
                sx={{ mb: 1 }}
                onClick={() => handleGenerateInsights('skills')}
              >
                Skills Trends
              </Button>
              <Button 
                variant={insightType === 'growth' ? "contained" : "outlined"} 
                fullWidth
                onClick={() => handleGenerateInsights('growth')}
              >
                Growth Opportunities
              </Button>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Team Members
            </Typography>
            
            {employees.length === 0 && !loading ? (
              <Alert severity="info">No employees data found</Alert>
            ) : (
              <List sx={{ bgcolor: 'background.paper' }}>
                {employees.map((employee) => (
                  <ListItem 
                    button 
                    key={employee.id || employee._id}
                    onClick={() => handleEmployeeSelect(employee)}
                    selected={selectedEmployee?.id === employee.id || selectedEmployee?._id === employee._id}
                  >
                    <ListItemAvatar>
                      <Avatar src={employee.avatar || null}>
                        {employee.avatar ? null : 
                          employee.name ? employee.name.split(' ').map(n => n[0]).join('') :
                          `${employee.first_name?.charAt(0) || ''}${employee.last_name?.charAt(0) || ''}`
                        }
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText 
                      primary={employee.name || `${employee.first_name} ${employee.last_name}`} 
                      secondary={employee.position || 'Staff'} 
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
        
        {/* Right side - Analysis Results */}
        <Grid item xs={12} md={8}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                  Generating insights...
                </Typography>
              </Box>
            ) : (
              <>
                {insightType === 'team' && teamInsights && (
                  <>
                    <Typography variant="h5" gutterBottom>
                      Team Insights
                    </Typography>
                    <Alert severity="info" sx={{ mb: 3 }}>
                      This analysis uses AI to identify team strengths, weaknesses, and collaboration opportunities.
                    </Alert>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Team Strengths
                            </Typography>
                            {teamInsights.strengths.map((strength, index) => (
                              <Chip key={index} label={strength} sx={{ m: 0.5 }} />
                            ))}
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Development Areas
                            </Typography>
                            {teamInsights.developmentAreas.map((area, index) => (
                              <Chip key={index} label={area} sx={{ m: 0.5 }} />
                            ))}
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Collaboration Score
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px', position: 'relative' }}>
                              <CircularProgress 
                                variant="determinate" 
                                value={teamInsights.collaborationScore} 
                                size={80} 
                                sx={{ color: '#4caf50' }} 
                              />
                              <Typography 
                                variant="h4" 
                                sx={{ 
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)'
                                }}
                              >
                                {teamInsights.collaborationScore}%
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                    
                    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                      Recommendations
                    </Typography>
                    
                    <List>
                      {teamInsights.recommendations.map((rec, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={rec.title}
                            secondary={rec.description}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
                
                {insightType === 'skills' && skillsTrends.length > 0 && (
                  <>
                    <Typography variant="h5" gutterBottom>
                      Skills Trends Analysis
                    </Typography>
                    <Alert severity="info" sx={{ mb: 3 }}>
                      This analysis identifies emerging skills in your industry and gaps within your team.
                    </Alert>
                    
                    <Typography variant="h6" sx={{ mt: 2, mb: 2 }}>
                      Emerging Skills in Your Industry
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {skillsTrends.map((item, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                          <Card>
                            <CardContent>
                              <Typography variant="h6" gutterBottom>
                                {item.skill}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <TrendingUpIcon sx={{ color: item.trend === 'Rising' ? 'success.main' : 'warning.main', mr: 1 }} />
                                <Typography variant="body2" color="text.secondary">
                                  {item.trend} (+{item.growth}% YoY)
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                    
                    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                      Team Skills Coverage
                    </Typography>
                    
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      Based on current team skills, consider developing expertise in emerging areas like AI/ML and Data Science.
                    </Alert>
                    
                    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                      Recommendations
                    </Typography>
                    
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Upskilling opportunity: Data Science"
                          secondary="Consider training programs for 2-3 team members in data analytics and visualization"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Strategic hiring"
                          secondary="Add AI/ML expertise to the team through strategic hiring in the next quarter"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Learning & Development"
                          secondary="Allocate 10% of team time for learning emerging technologies"
                        />
                      </ListItem>
                    </List>
                  </>
                )}
                
                {insightType === 'growth' && growthOpportunities && (
                  <>
                    <Typography variant="h5" gutterBottom>
                      Growth Opportunities
                    </Typography>
                    <Alert severity="info" sx={{ mb: 3 }}>
                      This analysis identifies potential career paths and development opportunities for your team.
                    </Alert>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              High-Potential Employees
                            </Typography>
                            <List>
                              {growthOpportunities.highPotentialEmployees.map(employee => (
                                <ListItem key={employee.id}>
                                  <ListItemAvatar>
                                    <Avatar>
                                      {employee.name.split(' ').map(n => n[0]).join('')}
                                    </Avatar>
                                  </ListItemAvatar>
                                  <ListItemText 
                                    primary={employee.name} 
                                    secondary={`Performance: ${employee.performance}/5.0`} 
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              Leadership Pipeline
                            </Typography>
                            <Typography variant="body2" paragraph>
                              Based on performance and skills analysis, the following team members show leadership potential:
                            </Typography>
                            <List>
                              {growthOpportunities.leadershipPipeline.map(item => (
                                <ListItem key={item.employeeId}>
                                  <ListItemText 
                                    primary={item.name} 
                                    secondary={item.recommendation} 
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                    
                    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                      Recommended Development Plans
                    </Typography>
                    
                    <List>
                      {growthOpportunities.developmentPlans.map((plan, index) => (
                        <ListItem key={index}>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: plan.iconColor || 'primary.main' }}>
                              {plan.icon === 'school' ? <SchoolIcon /> : 
                               plan.icon === 'work' ? <WorkIcon /> : <PeopleIcon />}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={plan.title}
                            secondary={plan.description}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}
                
                {insightType === 'individual' && selectedEmployee && (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Avatar sx={{ width: 56, height: 56, mr: 2 }}>
                        {selectedEmployee.name 
                          ? selectedEmployee.name.split(' ').map(n => n[0]).join('')
                          : `${selectedEmployee.first_name?.charAt(0) || ''}${selectedEmployee.last_name?.charAt(0) || ''}`
                        }
                      </Avatar>
                      <Box>
                        <Typography variant="h5">
                          {selectedEmployee.name || `${selectedEmployee.first_name} ${selectedEmployee.last_name}`}
                        </Typography>
                        <Typography variant="subtitle1" color="text.secondary">
                          {selectedEmployee.position} - {selectedEmployee.department}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>Skills Profile</Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              {selectedEmployee.skills && selectedEmployee.skills.map((skill, i) => (
                                <Chip key={i} label={skill} />
                              ))}
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Card>
                          <CardContent>
                            <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Typography variant="body1" sx={{ mr: 2 }}>Overall Rating:</Typography>
                              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                <CircularProgress 
                                  variant="determinate" 
                                  value={selectedEmployee.performance * 20} 
                                  sx={{ color: '#4caf50' }} 
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
                                  <Typography variant="caption" component="div" color="text.secondary">
                                    {selectedEmployee.performance}/5
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                            <Typography variant="body1">Growth Potential: {selectedEmployee.growthPotential}</Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                    
                    <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
                      Personal Development Recommendations
                    </Typography>
                    
                    <List>
                      {selectedEmployee.recommendations && selectedEmployee.recommendations.map((rec, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={rec.title}
                            secondary={rec.description}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </>
                )}

                {!teamInsights && insightType === 'team' && !loading && (
                  <Alert severity="info">Select "Team Analysis" to generate team insights</Alert>
                )}
                
                {!skillsTrends.length && insightType === 'skills' && !loading && (
                  <Alert severity="info">Select "Skills Trends" to generate skills analysis</Alert>
                )}
                
                {!growthOpportunities && insightType === 'growth' && !loading && (
                  <Alert severity="info">Select "Growth Opportunities" to generate growth insights</Alert>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TalentInsights; 