import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Avatar,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Tab,
  Tabs,
  Alert,
  Stack,
  List,
  ListItem,
  ListItemText,
  useTheme,
  alpha,
  IconButton
} from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Badge as BadgeIcon,
  ChevronRight as ChevronRightIcon,
  Edit as EditIcon,
  SentimentVerySatisfied as SkillIcon,
  People as PeopleIcon,
  MoreHoriz as MoreIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material';

import employeeService from '../../services/employeeService';
import { useAuth } from '../../contexts/AuthContext';
import ProfileEditModal from '../../components/employees/ProfileEditModal';

const EmployeeProfile = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const theme = useTheme();
  const isOwner = (currentUser?.employee_id && (id === currentUser.employee_id || employee?.employee_id === currentUser.employee_id)) || (currentUser?.id === id);

  const fetchEmployeeData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await employeeService.getEmployeeById(id);
      setEmployee(data);
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError('Failed to load employee profile');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', bgcolor: 'background.default' }}>
      <CircularProgress sx={{ color: '#fcc419' }} />
    </Box>
  );

  if (error || !employee) return (
    <Box sx={{ p: 4, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Alert severity="error" variant="filled" sx={{ border: '4px solid #000', borderRadius: 0, fontWeight: 900 }}>
        {error || 'Employee not found'}
      </Alert>
    </Box>
  );

  const initials = `${employee.first_name?.[0] || ''}${employee.last_name?.[0] || ''}`.toUpperCase();

  const brutalBorder = theme.palette.mode === 'light' ? '4px solid #000' : '4px solid #fff';
  const brutalBoxShadow = theme.palette.mode === 'light' ? '10px 10px 0px #000' : '10px 10px 0px #fcc419';

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary', pb: 8 }}>
      {/* 1. HERO BANNER SECTION (Neo-Brutalism style) */}
      <Box sx={{ 
        position: 'relative', 
        height: '240px', 
        width: '100%', 
        overflow: 'hidden',
        borderBottom: brutalBorder,
        background: theme.palette.mode === 'light' 
            ? 'linear-gradient(135deg, #fdfcfb 0%, #fcc419 100%)' 
            : 'linear-gradient(135deg, #0f2027 0%, #1a1a1a 100%)',
        display: 'flex',
        alignItems: 'center',
        px: { xs: 4, md: 10 }
      }}>
        {/* Dynamic Greeting Text Overlaying Banner */}
        <Box sx={{ zIndex: 1, position: 'relative' }}>
          <Typography variant="overline" sx={{ color: '#fcc419', fontWeight: 900, mb: -1, display: 'block', fontSize: '1rem', letterSpacing: 3 }}>
            EMPLOYEE HUB
          </Typography>
          <Typography variant="h1" sx={{ 
            fontWeight: 900, 
            color: '#fff', 
            fontSize: { xs: '2.5rem', md: '4.5rem' },
            letterSpacing: -2,
            textTransform: 'uppercase',
            textShadow: '8px 8px 0px #000',
            lineHeight: 0.9
          }}>
            WELCOME, <br/>{employee.first_name || 'USER'} {employee.last_name?.[0]}.
          </Typography>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 800, mt: 2, opacity: 0.8, textTransform: 'uppercase', letterSpacing: 2 }}>
            {employee.department || 'GENERAL'} • DASHBOARD
          </Typography>
        </Box>
        
        {/* Decorative Grid Pattern */}
        <Box sx={{ 
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'radial-gradient(#000 1px, transparent 0)',
          backgroundSize: '40px 40px',
          opacity: 0.1,
          zIndex: 0
        }} />
      </Box>

      {/* 2. PROFILE HEADER BAR */}
      <Box sx={{ px: { xs: 2, md: 6 }, mt: -10, position: 'relative', zIndex: 2 }}>
        <Grid container spacing={4} alignItems="flex-end">
          <Grid item>
            <Avatar 
              sx={{ 
                width: 150, 
                height: 150, 
                border: brutalBorder, 
                bgcolor: '#fcc419', 
                color: '#000',
                fontSize: '4rem', 
                fontWeight: 900,
                boxShadow: brutalBoxShadow,
                borderRadius: 0
              }}
            >
              {initials}
            </Avatar>
          </Grid>
          <Grid item xs sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h2" sx={{ fontWeight: 900, letterSpacing: -2, textTransform: 'uppercase', color: 'text.primary', textShadow: theme.palette.mode === 'light' ? '2px 2px 0px rgba(0,0,0,0.1)' : '4px 4px 0px #000' }}>
                {employee.first_name} {employee.last_name}
              </Typography>
              <Chip 
                label="IN" 
                sx={{ bgcolor: '#fcc419', color: '#000', fontWeight: 900, border: '2px solid #000', borderRadius: 0, height: 28 }} 
              />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
              <BadgeIcon sx={{ fontSize: 24, color: '#fcc419' }} />
              <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
                {employee.position}
              </Typography>
            </Stack>
          </Grid>
          {isOwner && (
            <Grid item sx={{ mb: 4 }}>
              <Button 
                variant="contained" 
                startIcon={<EditIcon />}
                onClick={() => setIsEditModalOpen(true)}
                sx={{ 
                    bgcolor: 'background.paper', 
                    color: 'text.primary',
                    border: brutalBorder,
                    boxShadow: `4px 4px 0px ${theme.palette.mode === 'light' ? '#000' : '#fcc419'}`,
                    borderRadius: 0,
                    fontWeight: 900,
                    px: 3,
                    '&:hover': { bgcolor: 'background.paper', opacity: 0.9, boxShadow: '2px 2px 0px #000' }
                }}
              >
                EDIT PROFILE
              </Button>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* 3. CONTACT INFO BAR (Brutal style) */}
      <Box sx={{ mt: 6, px: { xs: 2, md: 6 } }}>
        <Paper sx={{ bgcolor: 'background.paper', color: 'text.primary', border: brutalBorder, boxShadow: brutalBoxShadow, borderRadius: 0, p: 3 }}>
          <Grid container spacing={4}>
            <Grid item>
              <Stack direction="row" spacing={2} alignItems="center">
                <EmailIcon sx={{ color: '#fcc419' }} />
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>Email Address</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>{employee.email || 'Not Added'}</Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item>
              <Stack direction="row" spacing={2} alignItems="center">
                <PhoneIcon sx={{ color: '#fcc419' }} />
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>Phone Number</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>{employee.phone || 'Not Added'}</Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item>
              <Stack direction="row" spacing={2} alignItems="center">
                <LocationIcon sx={{ color: '#fcc419' }} />
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>Location</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>{employee.location || 'Not Added'}</Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item>
              <Stack direction="row" spacing={2} alignItems="center">
                <BadgeIcon sx={{ color: '#fcc419' }} />
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>Employee ID</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>{employee.employee_id || 'Not Added'}</Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item>
              <Stack direction="row" spacing={2} alignItems="center">
                <PeopleIcon sx={{ color: '#fcc419' }} />
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>Gender</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>{employee.gender || 'Not Added'}</Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item>
              <Stack direction="row" spacing={2} alignItems="center">
                <CalendarIcon sx={{ color: '#fcc419' }} />
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 800, textTransform: 'uppercase', display: 'block' }}>DOB</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>{employee.date_of_birth || 'Not Added'}</Typography>
                </Box>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Box>

      {/* 4. BUSINESS & ORG INFO */}
      <Box sx={{ px: { xs: 2, md: 6 }, py: 6 }}>
        <Grid container spacing={10}>
          <Grid item>
            <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, display: 'block', mb: 1 }}>Business Unit</Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>{employee.business_unit || 'Not Added'}</Typography>
          </Grid>
          <Grid item>
            <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, display: 'block', mb: 1 }}>Department</Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>{employee.department || 'Not Added'}</Typography>
          </Grid>
          <Grid item>
            <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 2, display: 'block', mb: 1 }}>Reporting Manager</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ width: 40, height: 40, bgcolor: '#fcc419', color: '#000', fontWeight: 900, border: '2px solid #000', borderRadius: 0 }}>{employee.manager_name?.[0] || 'M'}</Avatar>
              <Typography 
                component={Link} 
                to={employee.manager_id_str ? `/employees/${employee.manager_id_str}` : '#'} 
                variant="h5" 
                sx={{ color: 'text.primary', fontWeight: 900, textDecoration: 'none', borderBottom: '3px solid #fcc419', '&:hover': { bgcolor: alpha('#fcc419', 0.1) } }}
              >
                {employee.manager_name || 'Not Added'}
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      {/* 5. CONTENT TABS */}
      <Box sx={{ px: { xs: 2, md: 6 }, mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, v) => setActiveTab(v)}
          sx={{ 
            minHeight: 60,
            '& .MuiTab-root': { color: 'text.secondary', opacity: theme.palette.mode === 'light' ? 0.6 : 0.85, fontWeight: 900, fontSize: '1.2rem', letterSpacing: 1, mr: 6, px: 0 },
            '& .Mui-selected': { color: '#fcc419 !important', opacity: 1 },
            '& .MuiTabs-indicator': { backgroundColor: '#fcc419', height: 6 }
          }}
        >
          <Tab label="ABOUT" />
          <Tab label="PERFORMANCE" />
          <Tab label="LEAVES" />
        </Tabs>
      </Box>

      {/* 6. MAIN CONTENT AREA (Tab Conditional Rendering) */}
      <Box sx={{ px: { xs: 2, md: 6 } }}>
        {activeTab === 0 && (
          <Grid container spacing={6}>
            {/* LEFT COLUMN - ABOUT & EMERGENCY */}
            <Grid item xs={12} md={7}>
              <Stack spacing={6}>
                {/* About Sections */}
                <Paper sx={{ bgcolor: 'background.paper', color: 'text.primary', border: brutalBorder, boxShadow: brutalBoxShadow, borderRadius: 0, p: 4, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: -15, left: 20, bgcolor: '#fcc419', color: '#000', px: 2, py: 0.5, border: brutalBorder, fontWeight: 900 }}>SUMMARY</Box>
                  <Stack spacing={5} sx={{ mt: 2 }}>
                    <Grid container spacing={4}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase' }}>Gender</Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.1rem' }}>{employee.gender || 'Not Added'}</Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase' }}>Date of Birth</Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.1rem' }}>{employee.date_of_birth || 'Not Added'}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="h5" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase' }}>Residential Address</Typography>
                        <Typography variant="body1" sx={{ color: 'text.secondary', fontSize: '1.1rem' }}>{employee.address || 'Not Added'}</Typography>
                      </Grid>
                    </Grid>
                    <Divider sx={{ borderBottomWidth: 2, borderColor: alpha('#000', 0.1) }} />
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, textTransform: 'uppercase' }}>About Me</Typography>
                      <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8, fontSize: '1.1rem' }}>
                        {employee.about_me || '- No response added yet -'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, textTransform: 'uppercase' }}>What I love about my job?</Typography>
                      <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8, fontSize: '1.1rem' }}>
                        {employee.love_about_job || '- No response added yet -'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, textTransform: 'uppercase' }}>My interests and hobbies</Typography>
                      <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.8, fontSize: '1.1rem' }}>
                        {employee.interests_hobbies || '- No response added yet -'}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                {/* Emergency Contact */}
                <Paper sx={{ bgcolor: theme.palette.mode === 'light' ? '#fff9f9' : '#1a1212', color: 'text.primary', border: brutalBorder, boxShadow: brutalBoxShadow, borderRadius: 0, p: 4, position: 'relative' }}>
                  <Box sx={{ position: 'absolute', top: -15, left: 20, bgcolor: '#ff6b6b', color: '#000', px: 2, py: 0.5, border: brutalBorder, fontWeight: 900 }}>EMERGENCY CONTACT</Box>
                  <Grid container spacing={4} sx={{ mt: 2 }}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 900, display: 'block', mb: 1, textTransform: 'uppercase' }}>Contact Person</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{employee.emergency_contact_name || 'Not Added'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 900, display: 'block', mb: 1, textTransform: 'uppercase' }}>Relationship</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{employee.emergency_contact_relationship || 'Not Added'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 900, display: 'block', mb: 1, textTransform: 'uppercase' }}>Contact No.</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#fcc419' }}>{employee.emergency_contact_phone || 'Not Added'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.7, fontWeight: 900, display: 'block', mb: 1, textTransform: 'uppercase' }}>Personal Email</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#fcc419', wordBreak: 'break-all' }}>{employee.personal_email || 'Not Added'}</Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Stack>
            </Grid>

            {/* RIGHT COLUMN - SKILLS & TEAM */}
            <Grid item xs={12} md={5}>
              <Stack spacing={6}>
                {/* Skills Card */}
                <Paper sx={{ 
                  bgcolor: 'background.paper', 
                  color: 'text.primary',
                  border: brutalBorder, 
                  boxShadow: brutalBoxShadow,
                  borderRadius: 0, 
                  p: 6, 
                  textAlign: 'center',
                  position: 'relative'
                }}>
                  <Box sx={{ position: 'absolute', top: -15, left: 20, bgcolor: '#4db6ac', color: '#000', px: 2, py: 0.5, border: brutalBorder, fontWeight: 900 }}>SKILLS</Box>
                  <SkillIcon sx={{ fontSize: 80, color: '#fcc419', mb: 1, mt: 2 }} />
                  <Typography variant="h4" sx={{ fontWeight: 900, mb: 3, textTransform: 'uppercase' }}>Skill Set</Typography>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, justifyContent: 'center', mb: 4 }}>
                    {(!employee.skills || employee.skills.length === 0) ? (
                      <Typography variant="body1" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                        No skills added yet. Showcase your technical and creative expertise!
                      </Typography>
                    ) : (
                      employee.skills.map((skill) => (
                        <Chip
                          key={skill}
                          label={skill}
                          sx={{
                            fontWeight: 800,
                            borderRadius: 0,
                            border: '2px solid #000',
                            bgcolor: theme.palette.mode === 'dark' ? alpha('#fcc419', 0.1) : '#fff',
                            color: theme.palette.mode === 'dark' ? '#fcc419' : '#000',
                            px: 1,
                            height: 35
                          }}
                        />
                      ))
                    )}
                  </Box>

                  {isOwner && (
                    <Button 
                        component={Link}
                        to="/performance?tab=skills"
                        variant="contained" 
                        sx={{ 
                            bgcolor: '#fcc419', 
                            color: '#000', 
                            border: brutalBorder,
                            boxShadow: `4px 4px 0px ${theme.palette.mode === 'light' ? '#000' : '#fff'}`,
                            fontWeight: 900,
                            px: 4,
                            '&:hover': { bgcolor: '#eebd15' }
                        }}
                    >
                      MANAGE SKILLS
                    </Button>
                  )}
                </Paper>

                {/* Reporting Team Card */}
                <Paper sx={{ bgcolor: 'background.paper', color: 'text.primary', border: brutalBorder, boxShadow: brutalBoxShadow, borderRadius: 0, overflow: 'hidden' }}>
                  <Box sx={{ p: 3, bgcolor: '#fcc419', color: '#000', borderBottom: brutalBorder, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                      Reporting Team ({employee.reporting_team_count || 0})
                    </Typography>
                    <IconButton size="small" sx={{ color: '#000' }}><MoreIcon /></IconButton>
                  </Box>
                  <List sx={{ p: 0 }}>
                    {(employee.reporting_team || []).map((member, index) => (
                      <React.Fragment key={member.id}>
                        <ListItem 
                          component={Link}
                          to={`/employees/${member.id}`}
                          sx={{ 
                            py: 3, 
                            px: 3,
                            color: 'inherit', 
                            textDecoration: 'none',
                            borderBottom: '2px solid rgba(255,255,255,0.05)',
                            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.05) }
                          }}
                        >
                          <Avatar sx={{ 
                              mr: 3, 
                              width: 50, 
                              height: 50,
                              bgcolor: (index % 2 === 0 ? '#5c6bc0' : '#26a69a'), 
                              fontWeight: 900,
                              border: '2px solid #000',
                              borderRadius: 0
                          }}>
                            {member.initials}
                          </Avatar>
                          <ListItemText 
                            primary={member.name} 
                            secondary={member.position} 
                            primaryTypographyProps={{ sx: { fontWeight: 900, fontSize: '1.2rem', textTransform: 'uppercase' } }}
                            secondaryTypographyProps={{ sx: { color: '#fcc419', fontWeight: 700, fontSize: '0.85rem', mt: 0.5 } }}
                          />
                          <ChevronRightIcon sx={{ fontSize: 30, opacity: 0.3 }} />
                        </ListItem>
                      </React.Fragment>
                    ))}
                    {(!employee.reporting_team || employee.reporting_team.length === 0) && (
                      <Box sx={{ p: 8, textAlign: 'center' }}>
                        <PeopleIcon sx={{ fontSize: 60, color: 'text.secondary', opacity: 0.1, mb: 2 }} />
                        <Typography variant="h6" sx={{ color: 'text.secondary', opacity: 0.3, fontWeight: 900, textTransform: 'uppercase' }}>No Direct Reports</Typography>
                      </Box>
                    )}
                  </List>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        )}

        {activeTab === 1 && (
          <Box sx={{ py: 4 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 4, bgcolor: '#fcc419', color: '#000', border: brutalBorder, boxShadow: brutalBoxShadow, borderRadius: 0, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>OVERALL RATING</Typography>
                  <Typography variant="h1" sx={{ fontWeight: 900 }}>4.8</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800, opacity: 0.8 }}>Exceeding Expectations</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={8}>
                <Stack spacing={3}>
                  {['Quarterly OKRs', 'Ongoing Goals', 'Peer Feedback'].map((title) => (
                    <Paper key={title} sx={{ p: 3, bgcolor: 'background.paper', border: brutalBorder, boxShadow: brutalBoxShadow, borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="h5" sx={{ fontWeight: 900 }}>{title}</Typography>
                      <Button variant="contained" sx={{ bgcolor: '#000', color: '#fff', borderRadius: 0, fontWeight: 900 }}>VIEW DETAILS</Button>
                    </Paper>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Box>
        )}

        {activeTab === 2 && (
          <Box sx={{ py: 4 }}>
            <Grid container spacing={4}>
              {[
                { label: 'Annual Leave', balance: 12, total: 20, color: '#fcc419' },
                { label: 'Sick Leave', balance: 5, total: 10, color: '#ff6b6b' },
                { label: 'Casual Leave', balance: 6, total: 10, color: '#4db6ac' }
              ].map((item) => (
                <Grid item xs={12} md={4} key={item.label}>
                  <Paper sx={{ p: 4, bgcolor: 'background.paper', border: brutalBorder, boxShadow: brutalBoxShadow, borderRadius: 0, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, textTransform: 'uppercase' }}>{item.label}</Typography>
                    <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
                      <CircularProgress variant="determinate" value={(item.balance / item.total) * 100} size={120} thickness={10} sx={{ color: item.color }} />
                      <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 900 }}>{item.balance}</Typography>
                      </Box>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 800, color: 'text.secondary' }}>{item.balance} / {item.total} Days Left</Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Box>

      {/* 7. EDIT MODAL */}
      <ProfileEditModal 
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employee={employee}
        onSaveSuccess={() => fetchEmployeeData()}
      />
    </Box>
  );
};

export default EmployeeProfile;