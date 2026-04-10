import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import employeeService from '../services/employeeService';
import teamService from '../services/teamService';
import { motion } from 'framer-motion';
import { BarChart, PieChart } from '@mui/x-charts';
import attendanceService from '../services/attendanceService';

// Material UI components
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  IconButton,
  CircularProgress,
  Button,
  Divider,
  Alert,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemIcon,
  Badge,
  Skeleton,
  Tooltip,
  useTheme,
  useMediaQuery,
  LinearProgress
} from '@mui/material';

// Icons
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TimelineIcon from '@mui/icons-material/Timeline';
import GroupsIcon from '@mui/icons-material/Groups';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WorkIcon from '@mui/icons-material/Work';
import AddIcon from '@mui/icons-material/Add';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import InsightsIcon from '@mui/icons-material/Insights';
import RateReviewIcon from '@mui/icons-material/RateReview';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SkillsAssessmentIcon from '@mui/icons-material/Psychology';
import CelebrationIcon from '@mui/icons-material/Celebration';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  }
};

const cardVariants = {
  hover: {
    scale: 1.03,
    boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.15)",
    transition: { duration: 0.3 }
  }
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalTeams: 0,
    attendanceToday: {
      present: 0,
      absent: 0,
      late: 0
    },
    pendingLeaves: 0,
    upcomingReviews: 0
  });

  const [recentActivities, setRecentActivities] = useState([]);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const { currentUser, hasRole, isManager } = useAuth();
  const navigate = useNavigate();
  
  // Attendance state
  const [attendanceStatus, setAttendanceStatus] = useState({
    is_clocked_in: false,
    last_check_in: null,
    loading: true
  });
  const [actionLoading, setActionLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isAdminOrManager = isManager();
  const API_URL = 'http://localhost:8000/api';

  useEffect(() => {
    // Simulate progress loading for better UX
    if (loading) {
      const timer = setInterval(() => {
        setLoadingProgress((prevProgress) => {
          const newProgress = prevProgress + 10;
          if (newProgress >= 100) {
            clearInterval(timer);
          }
          return Math.min(newProgress, 95); // Cap at 95% until real data loads
        });
      }, 300);

      return () => {
        clearInterval(timer);
      };
    } else {
      setLoadingProgress(100);
    }
  }, [loading]);

  useEffect(() => {
    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Employee count
        let employeeCount = 0;
        let employeeData = [];

        try {
          // First try getting employees from real API
          const employees = await employeeService.getAllEmployees();
          if (employees && employees.length > 0) {
            employeeCount = employees.length;
            employeeData = employees;
            console.log('Fetched real employee count:', employeeCount);
          } else {
            throw new Error('No employee data returned');
          }
        } catch (error) {
          console.log('Error fetching real employee data:', error);

          // Fallback to mock data
          employeeData = [
            { id: 'emp-1', name: 'John Doe', position: 'Team Lead', department: 'Engineering' },
            { id: 'emp-2', name: 'Jane Smith', position: 'Senior Developer', department: 'Engineering' },
            { id: 'emp-3', name: 'Bob Johnson', position: 'Developer', department: 'Engineering' },
            { id: 'emp-4', name: 'Alice Brown', position: 'Team Lead', department: 'Engineering' },
            { id: 'emp-5', name: 'Tom Wilson', position: 'Senior Developer', department: 'Engineering' },
            { id: 'emp-6', name: 'Sarah Davis', position: 'Design Lead', department: 'Design' },
            { id: 'emp-7', name: 'Mike Taylor', position: 'UX Designer', department: 'Design' }
          ];

          employeeCount = employeeData.length;
          console.log('Using mock employee data:', employeeCount);
        }

        // Team count
        let teamCount = 0;
        let teamData = [];

        try {
          // Try getting teams from real API first
          const teams = await teamService.getTeamsDebug();
          if (teams && teams.length > 0) {
            teamCount = teams.length;
            teamData = teams;
            console.log('Fetched real team count:', teamCount);
          } else {
            throw new Error('No team data returned');
          }
        } catch (error) {
          console.log('Error fetching real team data:', error);

          // Fallback to mock team data
          teamData = [
            { id: 'team-1', name: 'Frontend Team', department: 'Engineering', members_count: 3 },
            { id: 'team-2', name: 'Backend Team', department: 'Engineering', members_count: 2 },
            { id: 'team-3', name: 'UI/UX Team', department: 'Design', members_count: 2 }
          ];

          teamCount = teamData.length;
          console.log('Using mock team data:', teamCount);
        }

        // Generate recent activities based on real data when possible
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        // Format dates for display
        const todayFormatted = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const yesterdayFormatted = yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const lastWeekFormatted = lastWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Create more realistic activities using the real data when available
        const randomEmployee = employeeData[Math.floor(Math.random() * employeeData.length)];
        const randomTeam = teamData[Math.floor(Math.random() * teamData.length)];

        const activities = [
          {
            id: 1,
            title: 'New employee joined',
            description: `${randomEmployee?.name || 'Sarah Davis'} joined the ${randomEmployee?.department || 'Design'} team`,
            date: todayFormatted,
            icon: <PersonAddIcon color="primary" />
          },
          {
            id: 2,
            title: 'Team Performance Review completed',
            description: `${randomTeam?.name || 'UI/UX Team'} review was finalized`,
            date: todayFormatted,
            icon: <AssessmentIcon color="success" />
          },
          {
            id: 3,
            title: 'Project milestone reached',
            description: 'HR Dashboard phase 1 completed',
            date: yesterdayFormatted,
            icon: <CheckCircleIcon color="info" />
          },
          {
            id: 4,
            title: 'Leave request approved',
            description: `${randomEmployee?.name || 'John Doe'}'s vacation request was approved`,
            date: yesterdayFormatted,
            icon: <EventIcon color="warning" />
          },
          {
            id: 5,
            title: 'Talent Insights updated',
            description: 'New skills trends analysis is available',
            date: lastWeekFormatted,
            icon: <InsightsIcon color="secondary" />
          },
          {
            id: 6,
            title: 'Team building event',
            description: 'Upcoming: Virtual team building next Friday',
            date: todayFormatted,
            icon: <CelebrationIcon color="primary" />
          }
        ];

        setRecentActivities(activities);

        // Calculate attendance based on employee count
        const presentCount = Math.max(1, Math.floor(employeeCount * 0.8));
        const absentCount = Math.floor(employeeCount * 0.1);
        const lateCount = employeeCount - presentCount - absentCount;

        // Set stats based on user role with real counts
        if (isAdminOrManager) {
          setStats({
            totalEmployees: employeeCount,
            totalTeams: teamCount,
            attendanceToday: {
              present: presentCount,
              absent: absentCount,
              late: lateCount
            },
            pendingLeaves: Math.min(5, Math.ceil(employeeCount * 0.2)),
            upcomingReviews: Math.min(8, Math.ceil(employeeCount * 0.3))
          });
        } else {
          // Employee view
          setStats({
            totalEmployees: employeeCount,
            totalTeams: teamCount,
            attendanceToday: {
              present: 1,
              absent: 0,
              late: 0
            },
            pendingLeaves: 1,
            upcomingReviews: 1
          });
        }

        // Simulate network delay for better loading animation
        setTimeout(() => {
          setError(null);
          setLoading(false);
        }, 800);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');

        // Fallback stats to ensure UI doesn't break
        setStats({
          totalEmployees: 7,
          totalTeams: 3,
          attendanceToday: {
            present: 5,
            absent: 1,
            late: 1
          },
          pendingLeaves: 2,
          upcomingReviews: 3
        });

        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentUser, isAdminOrManager]);

  // Fetch attendance status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await attendanceService.getStatus();
        setAttendanceStatus({
          is_clocked_in: status.is_clocked_in,
          last_check_in: status.last_check_in,
          loading: false
        });
      } catch (err) {
        console.error('Error fetching attendance status:', err);
        setAttendanceStatus(prev => ({ ...prev, loading: false }));
      }
    };
    fetchStatus();
  }, []);

  const handleClockAction = async () => {
    try {
      setActionLoading(true);
      if (attendanceStatus.is_clocked_in) {
        await attendanceService.clockOut();
        setAttendanceStatus({
          is_clocked_in: false,
          last_check_in: null,
          loading: false
        });
      } else {
        const response = await attendanceService.clockIn();
        setAttendanceStatus({
          is_clocked_in: true,
          last_check_in: response.clock_in_time,
          loading: false
        });
      }
    } catch (err) {
      console.error('Clock action failed:', err);
      setError(err.response?.data?.message || 'Attendance action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Loading state with skeleton UI
  if (loading) {
    return (
      <Box sx={{ width: '100%' }}>
        <LinearProgress
          variant="determinate"
          value={loadingProgress}
          sx={{ height: 6, borderRadius: 3, mb: 4 }}
        />

        <Skeleton variant="text" sx={{ fontSize: '2rem', width: '180px', mb: 2 }} />

        <Skeleton
          variant="rounded"
          sx={{ width: '100%', height: 100, mb: 4, borderRadius: 2 }}
        />

        <Grid container spacing={3} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((item) => (
            <Grid item xs={12} sm={6} md={3} key={item}>
              <Skeleton
                variant="rounded"
                sx={{
                  width: '100%',
                  height: 200,
                  borderRadius: 4
                }}
                animation="wave"
              />
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Skeleton
              variant="rounded"
              sx={{ width: '100%', height: 400, borderRadius: 4 }}
              animation="wave"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton
              variant="rounded"
              sx={{ width: '100%', height: 400, borderRadius: 4 }}
              animation="wave"
            />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Page title */}
      <motion.div variants={itemVariants}>
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block',
            mb: 3
          }}
        >
          Welcome to HR Dashboard
        </Typography>
      </motion.div>

      {/* Error alert */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => window.location.reload()}>
                RETRY
              </Button>
            }
          >
            {error}
          </Alert>
        </motion.div>
      )}

      {/* Welcome message */}
      <motion.div variants={itemVariants}>
        <Paper
          className="brutal-border brutal-shadow"
          sx={{
            p: 3,
            mb: 4,
            backgroundColor: '#FFD700', // Brutalist yellow primary
            color: '#000000',
            position: 'relative',
            overflow: 'hidden'
          }}
          elevation={0}
        >
          <Box sx={{ position: 'relative', zIndex: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
              Welcome back, {currentUser?.username || currentUser?.name || 'User'}!
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mb: 1 }}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              You have {stats.pendingLeaves} pending approvals and {stats.upcomingReviews} upcoming reviews.
            </Typography>
          </Box>

          {/* Decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              bottom: -15,
              right: -15,
              width: 100,
              height: 100,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.1)'
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: -20,
              left: '50%',
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.1)'
            }}
          />
        </Paper>
      </motion.div>

      {/* Keka-Style Interactive Widgets */}
      <motion.div variants={itemVariants}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Web Clock-In Widget */}
          <Grid item xs={12} md={4}>
            <Paper
              className="brutal-border brutal-shadow-hover"
              sx={{
                p: 3,
                height: '100%',
                backgroundColor: '#BCAAA4', // Muted brown brute color
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              elevation={0}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 1 }}>
                  Time Today - {new Date().toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                </Typography>
                <Typography variant="overline" sx={{ fontWeight: 800 }}>Current Time</Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, mb: 2 }}>
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </Typography>
              </Box>
              <Button
                variant="contained"
                disabled={attendanceStatus.loading || actionLoading}
                onClick={handleClockAction}
                sx={{
                  backgroundColor: attendanceStatus.is_clocked_in ? '#FF5252' : '#FFFFFF',
                  color: attendanceStatus.is_clocked_in ? '#FFFFFF' : '#000000',
                  border: '3px solid #000000',
                  boxShadow: '4px 4px 0px #000000',
                  fontWeight: 900,
                  '&:hover': {
                    backgroundColor: attendanceStatus.is_clocked_in ? '#D32F2F' : '#E0E0E0',
                    transform: 'translate(2px, 2px)',
                    boxShadow: '2px 2px 0px #000000'
                  },
                  '&:disabled': {
                    backgroundColor: '#CCCCCC',
                    boxShadow: 'none',
                    transform: 'none'
                  }
                }}
              >
                {actionLoading ? 'Processing...' : (attendanceStatus.is_clocked_in ? 'Web Clock-Out' : 'Web Clock-In')}
              </Button>
            </Paper>
          </Grid>

          {/* Announcements/Holidays */}
          <Grid item xs={12} md={4}>
            <Paper
              className="brutal-border brutal-shadow-hover"
              sx={{
                p: 3,
                height: '100%',
                backgroundColor: '#CE93D8', // Light purple
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
              }}
              elevation={0}
            >
              <Box sx={{ position: 'relative', zIndex: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                    Holidays
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}>
                    View All
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
                  Holi
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  Wed, 04 March, 2026
                </Typography>
              </Box>
              <CelebrationIcon sx={{ position: 'absolute', right: -20, bottom: -20, fontSize: 120, opacity: 0.2, zIndex: 1 }} />
            </Paper>
          </Grid>

          {/* Leave Balances */}
          <Grid item xs={12} md={4}>
            <Paper
              className="brutal-border brutal-shadow-hover"
              sx={{
                p: 3,
                height: '100%',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              elevation={0}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 2 }}>
                Leave Balances
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    border: '8px solid #00E676',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>4.5</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>EARNED</Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    border: '8px solid #E0E0E0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>∞</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>LOP</Typography>
                </Box>
                <Box sx={{ ml: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography
                    variant="caption"
                    onClick={() => navigate('/leaves/request')}
                    sx={{ fontWeight: 800, color: '#1976D2', cursor: 'pointer', textAlign: 'right' }}
                  >
                    Request Leave
                  </Typography>
                  <Typography
                    variant="caption"
                    onClick={() => navigate('/leaves')}
                    sx={{ fontWeight: 800, color: '#1976D2', cursor: 'pointer', textAlign: 'right' }}
                  >
                    View All Balances
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </motion.div>

      {/* Stats cards */}
      <motion.div variants={itemVariants}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Employee count */}
          <Grid item xs={12} sm={6} md={3}>
            <motion.div whileHover="hover" variants={cardVariants}>
              <Card
                className="brutal-border brutal-shadow-hover"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                elevation={0}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '5px',
                    backgroundColor: theme.palette.primary.main
                  }}
                />
                <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#000000', color: '#FFFFFF', mr: 2, borderRadius: 0, border: '2px solid #000' }}>
                      <PeopleIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Employees</Typography>
                  </Box>
                  <Typography
                    variant="h3"
                    component="div"
                    sx={{
                      mb: 2,
                      color: theme.palette.primary.main,
                      fontWeight: 'bold'
                    }}
                  >
                    {stats.totalEmployees}
                  </Typography>
                  <Tooltip title="View employee directory">
                    <Button
                      size="medium"
                      variant="outlined"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => navigate('/employees')}
                      sx={{ mt: 'auto' }}
                      fullWidth
                    >
                      View Directory
                    </Button>
                  </Tooltip>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Teams count */}
          <Grid item xs={12} sm={6} md={3}>
            <motion.div whileHover="hover" variants={cardVariants}>
              <Card
                className="brutal-border brutal-shadow-hover"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                elevation={0}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '5px',
                    backgroundColor: theme.palette.secondary.main
                  }}
                />
                <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#000000', color: '#FFFFFF', mr: 2, borderRadius: 0, border: '2px solid #000' }}>
                      <GroupsIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Teams</Typography>
                  </Box>
                  <Typography
                    variant="h3"
                    component="div"
                    sx={{
                      mb: 2,
                      color: theme.palette.secondary.main,
                      fontWeight: 'bold'
                    }}
                  >
                    {stats.totalTeams}
                  </Typography>
                  <Tooltip title="View teams">
                    <Button
                      size="medium"
                      variant="outlined"
                      color="secondary"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => navigate('/teams')}
                      sx={{ mt: 'auto' }}
                      fullWidth
                    >
                      View Teams
                    </Button>
                  </Tooltip>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Attendance today */}
          <Grid item xs={12} sm={6} md={3}>
            <motion.div whileHover="hover" variants={cardVariants}>
              <Card
                className="brutal-border brutal-shadow-hover"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                elevation={0}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '5px',
                    backgroundColor: theme.palette.success.main
                  }}
                />
                <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#000000', color: '#FFFFFF', mr: 2, borderRadius: 0, border: '2px solid #000' }}>
                      <AccessTimeIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Attendance</Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1">Present:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: theme.palette.success.main }}>
                        {stats.attendanceToday.present}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1">Absent:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: theme.palette.error.main }}>
                        {stats.attendanceToday.absent}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body1">Late:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', color: theme.palette.warning.main }}>
                        {stats.attendanceToday.late}
                      </Typography>
                    </Box>
                  </Box>
                  <Tooltip title="Mark your attendance">
                    <Button
                      size="medium"
                      variant="outlined"
                      color="success"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => navigate('/attendance')}
                      sx={{ mt: 'auto' }}
                      fullWidth
                    >
                      Mark Attendance
                    </Button>
                  </Tooltip>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Pending leaves */}
          <Grid item xs={12} sm={6} md={3}>
            <motion.div whileHover="hover" variants={cardVariants}>
              <Card
                className="brutal-border brutal-shadow-hover"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                elevation={0}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '5px',
                    backgroundColor: theme.palette.warning.main
                  }}
                />
                <CardContent sx={{ flexGrow: 1, pt: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: '#000000', color: '#FFFFFF', mr: 2, borderRadius: 0, border: '2px solid #000' }}>
                      <EventBusyIcon />
                    </Avatar>
                    <Typography variant="h6" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>
                      {isAdminOrManager
                        ? 'Pending'
                        : 'My Leaves'
                      }
                    </Typography>
                  </Box>
                  <Typography
                    variant="h3"
                    component="div"
                    sx={{
                      mb: 2,
                      color: theme.palette.warning.main,
                      fontWeight: 'bold'
                    }}
                  >
                    {stats.pendingLeaves}
                  </Typography>
                  <Tooltip title={currentUser?.role === 'Admin' || currentUser?.role === 'Manager'
                    ? 'Review leave requests'
                    : 'Request time off'
                  }>
                    <Button
                      size="medium"
                      variant="outlined"
                      color="warning"
                      endIcon={<ArrowForwardIcon />}
                      onClick={() => currentUser?.role === 'Admin' || currentUser?.role === 'Manager'
                        ? navigate('/leaves/pending')
                        : navigate('/leaves')
                      }
                      sx={{ mt: 'auto' }}
                      fullWidth
                    >
                      {isAdminOrManager
                        ? 'Approve Leaves'
                        : 'Request Leave'
                      }
                    </Button>
                  </Tooltip>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      </motion.div>

      {/* Add charts section */}
      {isAdminOrManager && (
      <motion.div variants={itemVariants}>
        <Paper
          className="brutal-border brutal-shadow"
          sx={{
            p: 3,
            mb: 4
          }}
          elevation={0}
        >
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <TrendingUpIcon sx={{ mr: 1 }} />
            HR Analytics Overview
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Department Distribution</Typography>
              <Paper sx={{ p: 2, borderRadius: 2, height: 250 }} elevation={0} variant="outlined">
                <PieChart
                  series={[
                    {
                      data: [
                        { id: 0, value: 5, label: 'Engineering', color: theme.palette.primary.main },
                        { id: 1, value: 3, label: 'Design', color: theme.palette.secondary.main },
                        { id: 2, value: 2, label: 'Marketing', color: theme.palette.info.main },
                        { id: 3, value: 1, label: 'HR', color: theme.palette.success.main },
                      ],
                      innerRadius: 30,
                      outerRadius: 100,
                      paddingAngle: 2,
                      cornerRadius: 4,
                      startAngle: -90,
                      endAngle: 270,
                      cx: 120,
                      cy: 120,
                    },
                  ]}
                  width={400}
                  height={250}
                  slotProps={{
                    legend: { hidden: true },
                  }}
                />
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 1 }}>Monthly Recruitment</Typography>
              <Paper sx={{ p: 2, borderRadius: 2, height: 250 }} elevation={0} variant="outlined">
                <BarChart
                  xAxis={[{
                    scaleType: 'band',
                    data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    tickLabelStyle: {
                      fontSize: 12,
                    },
                  }]}
                  series={[
                    {
                      data: [4, 3, 5, 7, 4, 6],
                      color: theme.palette.primary.main,
                      label: 'New Hires'
                    },
                  ]}
                  height={250}
                  margin={{ top: 10, bottom: 30, left: 40, right: 10 }}
                />
              </Paper>
            </Grid>
          </Grid>
        </Paper>
      </motion.div>
      )}

      {/* Recent activities and Quick Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={isAdminOrManager ? 6 : 12}>
          <motion.div variants={itemVariants}>
            <Card sx={{ borderRadius: 3 }} elevation={2}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccessTimeIcon sx={{ mr: 1 }} />
                    Recent Activities
                  </Box>
                }
                action={
                  <IconButton aria-label="settings">
                    <MoreVertIcon />
                  </IconButton>
                }
                sx={{ pb: 1 }}
              />
              <Divider />
              <CardContent sx={{ maxHeight: 350, overflow: 'auto', p: 0 }}>
                <List sx={{ pt: 0 }}>
                  {recentActivities.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 + 0.3 }}
                    >
                      <ListItem
                        alignItems="flex-start"
                        sx={{
                          py: 2,
                          transition: 'all 0.2s',
                          '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.03)',
                            transform: 'translateX(5px)'
                          }
                        }}
                      >
                        <ListItemIcon>
                          <Avatar
                            sx={{
                              bgcolor: 'transparent',
                              color: 'inherit'
                            }}
                          >
                            {activity.icon}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography sx={{ fontWeight: 500 }}>
                              {activity.title}
                            </Typography>
                          }
                          secondary={
                            <React.Fragment>
                              <Typography
                                component="span"
                                variant="body2"
                                sx={{ display: 'block', mb: 0.5 }}
                              >
                                {activity.description}
                              </Typography>
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{
                                  display: 'inline-block',
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                                  color: 'text.secondary'
                                }}
                              >
                                {activity.date}
                              </Typography>
                            </React.Fragment>
                          }
                        />
                      </ListItem>
                      {index < recentActivities.length - 1 && (
                        <Divider component="li" variant="inset" />
                      )}
                    </motion.div>
                  ))}
                </List>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
        <Grid item xs={12} md={6}>
          <motion.div variants={itemVariants}>
            <Card sx={{ borderRadius: 3 }} elevation={2}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AutoAwesomeIcon sx={{ mr: 1 }} />
                    Quick Actions
                  </Box>
                }
                action={
                  <IconButton aria-label="settings">
                    <MoreVertIcon />
                  </IconButton>
                }
                sx={{ pb: 1 }}
              />
              <Divider />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<AccessTimeIcon />}
                        onClick={() => navigate('/attendance')}
                        sx={{
                          mb: 2,
                          py: 1.2,
                          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)'
                        }}
                        color="success"
                      >
                        Clock In/Out
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<NotificationsIcon />}
                        onClick={() => navigate('/dashboard/notifications')}
                        sx={{ mb: 2, py: 1.2 }}
                      >
                        Notifications
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<PeopleIcon />}
                        onClick={() => navigate('/employees')}
                        sx={{ mb: 2, py: 1.2 }}
                      >
                        Employee Directory
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<RateReviewIcon />}
                        onClick={() => navigate('/reviews/team-performance-review')}
                        sx={{ mb: 2, py: 1.2 }}
                      >
                        Team Reviews
                      </Button>
                    </motion.div>
                  </Grid>

                  <Grid item xs={6}>
                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="contained"
                        color="secondary"
                        fullWidth
                        startIcon={<EventIcon />}
                        onClick={() => navigate('/leaves/request')}
                        sx={{
                          mb: 2,
                          py: 1.2,
                          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        Request Leave
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outlined"
                        color="secondary"
                        fullWidth
                        startIcon={<WorkIcon />}
                        onClick={() => navigate('/payroll')}
                        sx={{ mb: 2, py: 1.2 }}
                      >
                        View Payslips
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outlined"
                        color="primary"
                        fullWidth
                        startIcon={<InsightsIcon />}
                        onClick={() => navigate('/tools/talent-insights')}
                        sx={{ mb: 2, py: 1.2 }}
                      >
                        Talent Insights
                      </Button>
                    </motion.div>

                    {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          variant="outlined"
                          color="error"
                          fullWidth
                          startIcon={<PersonAddIcon />}
                          onClick={() => navigate('/employees/add')}
                          sx={{ mb: 2, py: 1.2 }}
                        >
                          Add Employee
                        </Button>
                      </motion.div>
                    )}
                  </Grid>
                </Grid>

                {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager') && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          variant="contained"
                          color="info"
                          onClick={() => navigate('/analytics/dashboard')}
                          startIcon={<TimelineIcon />}
                          size="large"
                          sx={{
                            py: 1.5,
                            px: 3,
                            borderRadius: 2,
                            background: `linear-gradient(45deg, ${theme.palette.info.main}, ${theme.palette.info.dark})`,
                            boxShadow: '0 8px 16px rgba(33, 150, 243, 0.3)'
                          }}
                        >
                          HR Analytics Dashboard
                        </Button>
                      </motion.div>
                    </Box>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        )}
      </Grid>
    </motion.div>
  );
};

export default Dashboard;

