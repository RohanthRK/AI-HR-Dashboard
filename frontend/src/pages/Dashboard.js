import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import employeeService from '../services/employeeService';
import teamService from '../services/teamService';
import attendanceService from '../services/attendanceService';
import leaveService from '../services/leaveService';
import reviewService from '../services/reviewService';
import { motion } from 'framer-motion';
import { BarChart, PieChart } from '@mui/x-charts';

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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Tooltip,
  useTheme,
  LinearProgress
} from '@mui/material';

// Icons
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TimelineIcon from '@mui/icons-material/Timeline';
import GroupsIcon from '@mui/icons-material/Groups';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AssessmentIcon from '@mui/icons-material/Assessment';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WorkIcon from '@mui/icons-material/Work';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import InsightsIcon from '@mui/icons-material/Insights';
import RateReviewIcon from '@mui/icons-material/RateReview';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CelebrationIcon from '@mui/icons-material/Celebration';
import RefreshIcon from '@mui/icons-material/Refresh';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 100 }
  }
};

const cardVariants = {
  hover: {
    scale: 1.02,
    transition: { duration: 0.2 }
  }
};

// Known Standard Public Holidays
const COMPANY_HOLIDAYS = [
  { name: "New Year's Day", date: '2026-01-01' },
  { name: 'Republic Day', date: '2026-01-26' },
  { name: 'Maha Shivratri', date: '2026-02-15' },
  { name: 'Holi', date: '2026-03-04' },
  { name: 'Good Friday', date: '2026-04-03' },
  { name: 'Eid al-Fitr', date: '2026-03-20' },
  { name: 'May Day', date: '2026-05-01' },
  { name: 'Independence Day', date: '2026-08-15' },
  { name: 'Ganesh Chaturthi', date: '2026-09-14' },
  { name: 'Gandhi Jayanti', date: '2026-10-02' },
  { name: 'Dussehra', date: '2026-10-20' },
  { name: 'Diwali', date: '2026-11-08' },
  { name: 'Christmas', date: '2026-12-25' }
];

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real Data States
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({ earned: 18, totalRemaining: 18 });
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
  const [attendanceStatus, setAttendanceStatus] = useState({
    is_clocked_in: false,
    last_check_in: null,
    loading: true
  });
  const [actionLoading, setActionLoading] = useState(false);

  const { currentUser, isManager } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isAdminOrManager = isManager();

  // Realtime Live Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute Next Upcoming Holiday Dynamically
  const nextHoliday = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const upcoming = COMPANY_HOLIDAYS
      .filter(h => h.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))[0];

    if (upcoming) {
      const hDate = new Date(upcoming.date + 'T00:00:00');
      return {
        name: upcoming.name,
        dateFormatted: hDate.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      };
    }
    return { name: 'New Year', dateFormatted: 'Fri, 01 Jan, 2027' };
  }, []);

  // Fetch all real-time data from MongoDB via backend endpoints
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Parallel fetch of all core domains
      const [
        empDataRes,
        teamDataRes,
        attStatusRes,
        dailyAttRes,
        leaveBalRes,
        allLeavesRes,
        reviewsRes
      ] = await Promise.allSettled([
        employeeService.getAllEmployees(),
        teamService.getAllTeams(),
        attendanceService.getStatus(),
        attendanceService.getDailyAttendance(todayStr),
        leaveService.getMyLeaveBalance(),
        isAdminOrManager ? leaveService.getAllLeaveApplications() : leaveService.getMyLeaveApplications(),
        isAdminOrManager ? reviewService.getMyAssignedReviews() : reviewService.getMyPerformanceReviews()
      ]);

      // Process Employees
      const empList = empDataRes.status === 'fulfilled' && Array.isArray(empDataRes.value) ? empDataRes.value : [];
      setEmployees(empList);

      // Process Teams
      let teamList = [];
      if (teamDataRes.status === 'fulfilled') {
        const val = teamDataRes.value;
        teamList = Array.isArray(val) ? val : (val?.teams || val?.results || []);
      }
      setTeams(teamList);

      // Process User Attendance Status
      if (attStatusRes.status === 'fulfilled' && attStatusRes.value) {
        setAttendanceStatus({
          is_clocked_in: Boolean(attStatusRes.value.is_clocked_in),
          last_check_in: attStatusRes.value.last_check_in,
          loading: false
        });
      } else {
        setAttendanceStatus(prev => ({ ...prev, loading: false }));
      }

      // Process Today's Attendance Stats
      let presentCount = 0;
      let lateCount = 0;
      if (dailyAttRes.status === 'fulfilled' && dailyAttRes.value) {
        const dRecords = Array.isArray(dailyAttRes.value) 
          ? dailyAttRes.value 
          : (dailyAttRes.value.records || dailyAttRes.value.results || []);

        dRecords.forEach(rec => {
          const isPresent = rec.clock_in || rec.status === 'Present' || rec.status === 'Working' || rec.status === 'Completed';
          if (isPresent) presentCount++;
          if (rec.status === 'Late' || (rec.clock_in && new Date(rec.clock_in).getHours() >= 10)) lateCount++;
        });
      }
      // If user is clocked in and not yet reflected in daily records
      if (attStatusRes.status === 'fulfilled' && attStatusRes.value?.is_clocked_in && presentCount === 0) {
        presentCount = 1;
      }
      const absentCount = Math.max(0, empList.length - presentCount);

      // Process Leaves
      let pendingLeavesCount = 0;
      let leaveRecords = [];
      if (allLeavesRes.status === 'fulfilled') {
        const lVal = allLeavesRes.value;
        leaveRecords = Array.isArray(lVal) ? lVal : (lVal?.results || lVal?.leaves || []);
        pendingLeavesCount = leaveRecords.filter(l => (l.status || '').toLowerCase() === 'pending').length;
      }

      // Process Leave Balance
      if (leaveBalRes.status === 'fulfilled' && leaveBalRes.value) {
        const bVal = leaveBalRes.value;
        const earnedBal = bVal.balances?.['Earned Leave']?.remaining ?? 
                         bVal.balances?.['Annual Leave']?.remaining ?? 
                         bVal.total_remaining ?? 18;
        setLeaveBalance({
          earned: earnedBal,
          totalRemaining: bVal.total_remaining ?? earnedBal
        });
      }

      // Process Reviews
      let upcomingReviewsCount = 0;
      let reviewRecords = [];
      if (reviewsRes.status === 'fulfilled') {
        const rVal = reviewsRes.value;
        reviewRecords = Array.isArray(rVal) ? rVal : (rVal?.results || []);
        upcomingReviewsCount = reviewRecords.filter(r => (r.status || '').toLowerCase() !== 'completed' && !r.submission_date).length;
      }

      // Compile Stats
      setStats({
        totalEmployees: empList.length,
        totalTeams: teamList.length,
        attendanceToday: {
          present: presentCount,
          absent: absentCount,
          late: lateCount
        },
        pendingLeaves: pendingLeavesCount,
        upcomingReviews: upcomingReviewsCount
      });

      // Build Real Recent Activity Log from live records
      const activities = [];

      // 1. Newest Employees (Hires)
      const sortedHires = [...empList]
        .filter(e => e.hire_date || e.created_at)
        .sort((a, b) => new Date(b.hire_date || b.created_at) - new Date(a.hire_date || a.created_at))
        .slice(0, 3);

      sortedHires.forEach((emp, i) => {
        const dateStr = emp.hire_date || emp.created_at;
        activities.push({
          id: `hire-${emp._id || emp.id || i}`,
          title: 'Employee Joined',
          description: `${emp.first_name} ${emp.last_name} joined the ${emp.department || 'General'} team`,
          date: dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent',
          icon: <PersonAddIcon color="primary" />
        });
      });

      // 2. Recent Leave Requests
      const recentLeaves = [...leaveRecords]
        .sort((a, b) => new Date(b.created_at || b.start_date || 0) - new Date(a.created_at || a.start_date || 0))
        .slice(0, 2);

      recentLeaves.forEach((lv, i) => {
        const dateStr = lv.created_at || lv.start_date;
        activities.push({
          id: `leave-${lv._id || lv.id || i}`,
          title: `Leave Request ${lv.status || 'Submitted'}`,
          description: `${lv.employee_name || 'Employee'} requested ${lv.leave_type || 'Annual'} leave (${lv.days || 1} day(s))`,
          date: dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent',
          icon: <EventIcon color="warning" />
        });
      });

      // 3. Recent Performance Reviews
      const recentRevs = [...reviewRecords]
        .filter(r => r.submission_date || r.review_date || r.created_at)
        .sort((a, b) => new Date(b.submission_date || b.review_date || 0) - new Date(a.submission_date || a.review_date || 0))
        .slice(0, 2);

      recentRevs.forEach((rev, i) => {
        const dateStr = rev.submission_date || rev.review_date || rev.created_at;
        activities.push({
          id: `rev-${rev._id || rev.id || i}`,
          title: `${rev.type || 'Performance'} Review Updated`,
          description: `Review for ${rev.subject_name || rev.employee_name || 'Team member'} was recorded`,
          date: dateStr ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent',
          icon: <AssessmentIcon color="success" />
        });
      });

      if (activities.length === 0) {
        activities.push({
          id: 'welcome',
          title: 'System Initialized',
          description: 'All organization employee and operational data synchronized successfully.',
          date: 'Today',
          icon: <CheckCircleIcon color="info" />
        });
      }

      setRecentActivities(activities);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentUser]);

  // Real-time Clock-In / Clock-Out Handler
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
          last_check_in: response.clock_in_time || new Date().toISOString(),
          loading: false
        });
      }
      // Refresh counts after clock action
      fetchDashboardData();
    } catch (err) {
      console.error('Clock action failed:', err);
      setError(err.response?.data?.message || 'Attendance action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Real Dynamic Department Distribution Data
  const departmentPieData = useMemo(() => {
    if (!employees || employees.length === 0) {
      return [{ id: 0, value: 1, label: 'General', color: '#000000' }];
    }
    const counts = {};
    employees.forEach(emp => {
      const dept = emp.department || 'Other';
      counts[dept] = (counts[dept] || 0) + 1;
    });
    const colors = ['#fcc419', '#339af0', '#51cf66', '#ff6b6b', '#cc5de8', '#20c997', '#ff922b', '#845ef7'];
    return Object.entries(counts).map(([dept, count], idx) => ({
      id: idx,
      value: count,
      label: dept,
      color: colors[idx % colors.length]
    }));
  }, [employees]);

  // Real Dynamic Monthly Recruitment Data
  const monthlyRecruitmentData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const last6 = [];
    for (let i = 5; i >= 0; i--) {
      const mIdx = (currentMonthIdx - i + 12) % 12;
      last6.push(monthNames[mIdx]);
    }

    const counts = last6.map(() => 0);
    employees.forEach(emp => {
      const dStr = emp.hire_date || emp.created_at;
      if (dStr) {
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) {
          const mName = monthNames[d.getMonth()];
          const idx = last6.indexOf(mName);
          if (idx >= 0) counts[idx]++;
        }
      }
    });

    return {
      labels: last6,
      values: counts
    };
  }, [employees]);

  if (loading) {
    return (
      <Box sx={{ width: '100%', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={60} thickness={5} sx={{ color: '#000', mb: 3 }} />
        <Typography variant="h6" sx={{ fontWeight: 900 }}>Loading Realtime Dashboard Data...</Typography>
      </Box>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Page Title & Refresh */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '-0.5px'
          }}
        >
          Overview Dashboard
        </Typography>
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={fetchDashboardData}
          sx={{
            bgcolor: '#000',
            color: '#fff',
            fontWeight: 900,
            border: '2px solid #000',
            borderRadius: 0,
            boxShadow: '3px 3px 0px #fcc419',
            '&:hover': { bgcolor: '#222', transform: 'translate(-2px, -2px)', boxShadow: '5px 5px 0px #fcc419' }
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, border: '3px solid #000', borderRadius: 0, fontWeight: 800 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Welcome Banner */}
      <motion.div variants={itemVariants}>
        <Paper
          sx={{
            p: 3,
            mb: 4,
            bgcolor: '#fcc419',
            color: '#000',
            border: '4px solid #000',
            borderRadius: 0,
            boxShadow: '6px 6px 0px #000'
          }}
          elevation={0}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, mb: 0.5, textTransform: 'uppercase' }}>
              Welcome back, {currentUser?.first_name || currentUser?.username || 'User'}!
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 800, mb: 1 }}>
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Live Status: {stats.pendingLeaves} pending leave approval(s) &bull; {stats.upcomingReviews} active review task(s).
            </Typography>
          </Box>
        </Paper>
      </motion.div>

      {/* Interactive Widgets */}
      <motion.div variants={itemVariants}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Live Web Clock-In Widget */}
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                height: '100%',
                bgcolor: '#e9ecef',
                border: '3px solid #000',
                borderRadius: 0,
                boxShadow: '4px 4px 0px #000',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              elevation={0}
            >
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase', mb: 1 }}>
                  Live Time Tracker
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>CURRENT TIME</Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, my: 1, fontFamily: 'monospace' }}>
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Status: {attendanceStatus.is_clocked_in ? '🟢 CLOCKED IN' : '🔴 CLOCKED OUT'}
                </Typography>
              </Box>
              <Button
                variant="contained"
                disabled={attendanceStatus.loading || actionLoading}
                onClick={handleClockAction}
                sx={{
                  mt: 2,
                  bgcolor: attendanceStatus.is_clocked_in ? '#fa5252' : '#000',
                  color: '#fff',
                  border: '2px solid #000',
                  borderRadius: 0,
                  boxShadow: '3px 3px 0px #000',
                  fontWeight: 900,
                  '&:hover': {
                    bgcolor: attendanceStatus.is_clocked_in ? '#e03131' : '#222',
                    transform: 'translate(-2px, -2px)',
                    boxShadow: '5px 5px 0px #000'
                  }
                }}
              >
                {actionLoading ? 'Processing...' : (attendanceStatus.is_clocked_in ? 'Web Clock-Out' : 'Web Clock-In')}
              </Button>
            </Paper>
          </Grid>

          {/* Real Holiday Widget */}
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                height: '100%',
                bgcolor: '#eebefa',
                border: '3px solid #000',
                borderRadius: 0,
                boxShadow: '4px 4px 0px #000',
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
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    Upcoming Holiday
                  </Typography>
                  <CelebrationIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
                  {nextHoliday.name}
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                  {nextHoliday.dateFormatted}
                </Typography>
              </Box>
            </Paper>
          </Grid>

          {/* Real Leave Balance Widget */}
          <Grid item xs={12} md={4}>
            <Paper
              sx={{
                p: 3,
                height: '100%',
                bgcolor: '#d3f9d8',
                border: '3px solid #000',
                borderRadius: 0,
                boxShadow: '4px 4px 0px #000',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              elevation={0}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase', mb: 1 }}>
                My Leave Balance
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, my: 1 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{
                    width: 65,
                    height: 65,
                    borderRadius: '50%',
                    border: '5px solid #2b8a3e',
                    bgcolor: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 0.5
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{leaveBalance.earned}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>AVAILABLE</Typography>
                </Box>
                <Box sx={{ ml: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Typography
                    variant="body2"
                    onClick={() => navigate('/leaves/request')}
                    sx={{ fontWeight: 800, color: '#000', textDecoration: 'underline', cursor: 'pointer', textAlign: 'right' }}
                  >
                    Request Leave &rarr;
                  </Typography>
                  <Typography
                    variant="body2"
                    onClick={() => navigate('/leaves')}
                    sx={{ fontWeight: 800, color: '#000', textDecoration: 'underline', cursor: 'pointer', textAlign: 'right' }}
                  >
                    View All Balances &rarr;
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </motion.div>

      {/* Core Stats Cards */}
      <motion.div variants={itemVariants}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* Total Real Employees */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                border: '3px solid #000',
                borderRadius: 0,
                boxShadow: '4px 4px 0px #000'
              }}
              elevation={0}
            >
              <CardContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: '#000', color: '#fff', mr: 2, borderRadius: 0, border: '2px solid #000' }}>
                    <PeopleIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Employees</Typography>
                </Box>
                <Typography variant="h3" sx={{ mb: 2, color: '#000', fontWeight: 900 }}>
                  {stats.totalEmployees}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/employees')}
                  sx={{ fontWeight: 800, border: '2px solid #000', color: '#000', borderRadius: 0 }}
                  fullWidth
                >
                  View Directory
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Total Real Teams */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                border: '3px solid #000',
                borderRadius: 0,
                boxShadow: '4px 4px 0px #000'
              }}
              elevation={0}
            >
              <CardContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: '#000', color: '#fff', mr: 2, borderRadius: 0, border: '2px solid #000' }}>
                    <GroupsIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Teams</Typography>
                </Box>
                <Typography variant="h3" sx={{ mb: 2, color: '#000', fontWeight: 900 }}>
                  {stats.totalTeams}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/teams')}
                  sx={{ fontWeight: 800, border: '2px solid #000', color: '#000', borderRadius: 0 }}
                  fullWidth
                >
                  View Teams
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Today's Real Attendance */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                border: '3px solid #000',
                borderRadius: 0,
                boxShadow: '4px 4px 0px #000'
              }}
              elevation={0}
            >
              <CardContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: '#000', color: '#fff', mr: 2, borderRadius: 0, border: '2px solid #000' }}>
                    <AccessTimeIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Attendance</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Present:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 900, color: '#2b8a3e' }}>{stats.attendanceToday.present}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Absent:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 900, color: '#c92a2a' }}>{stats.attendanceToday.absent}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Late:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 900, color: '#e67700' }}>{stats.attendanceToday.late}</Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/attendance')}
                  sx={{ fontWeight: 800, border: '2px solid #000', color: '#000', borderRadius: 0 }}
                  fullWidth
                >
                  Mark Attendance
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Real Pending Leaves */}
          <Grid item xs={12} sm={6} md={3}>
            <Card
              sx={{
                height: '100%',
                border: '3px solid #000',
                borderRadius: 0,
                boxShadow: '4px 4px 0px #000'
              }}
              elevation={0}
            >
              <CardContent sx={{ pt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: '#000', color: '#fff', mr: 2, borderRadius: 0, border: '2px solid #000' }}>
                    <EventBusyIcon />
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    {isAdminOrManager ? 'Pending Leaves' : 'My Leaves'}
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ mb: 2, color: '#000', fontWeight: 900 }}>
                  {stats.pendingLeaves}
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => isAdminOrManager ? navigate('/leaves/pending') : navigate('/leaves')}
                  sx={{ fontWeight: 800, border: '2px solid #000', color: '#000', borderRadius: 0 }}
                  fullWidth
                >
                  {isAdminOrManager ? 'Approve Leaves' : 'View Leaves'}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>

      {/* Real Charts Section (for Admin/Manager) */}
      {isAdminOrManager && (
        <motion.div variants={itemVariants}>
          <Paper
            sx={{
              p: 3,
              mb: 4,
              border: '3px solid #000',
              borderRadius: 0,
              boxShadow: '6px 6px 0px #000'
            }}
            elevation={0}
          >
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 900, display: 'flex', alignItems: 'center', textTransform: 'uppercase' }}>
              <TrendingUpIcon sx={{ mr: 1 }} />
              Live Organization Analytics
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase' }}>
                  Real Department Distribution
                </Typography>
                <Paper sx={{ p: 2, border: '2px solid #000', borderRadius: 0, height: 260, display: 'flex', justifyContent: 'center', alignItems: 'center' }} elevation={0}>
                  <PieChart
                    series={[
                      {
                        data: departmentPieData,
                        innerRadius: 35,
                        outerRadius: 95,
                        paddingAngle: 2,
                        cornerRadius: 0
                      }
                    ]}
                    width={380}
                    height={240}
                  />
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, textTransform: 'uppercase' }}>
                  Recruitment &amp; Hires (Recent Months)
                </Typography>
                <Paper sx={{ p: 2, border: '2px solid #000', borderRadius: 0, height: 260 }} elevation={0}>
                  <BarChart
                    xAxis={[{
                      scaleType: 'band',
                      data: monthlyRecruitmentData.labels,
                      tickLabelStyle: { fontSize: 12, fontWeight: 700 }
                    }]}
                    series={[
                      {
                        data: monthlyRecruitmentData.values,
                        color: '#000',
                        label: 'Hires'
                      }
                    ]}
                    height={230}
                    margin={{ top: 10, bottom: 30, left: 30, right: 10 }}
                  />
                </Paper>
              </Grid>
            </Grid>
          </Paper>
        </motion.div>
      )}

      {/* Recent Activities & Quick Actions */}
      <Grid container spacing={3}>
        {/* Real Live Activity Feed */}
        <Grid item xs={12} md={isAdminOrManager ? 6 : 12}>
          <motion.div variants={itemVariants}>
            <Card sx={{ border: '3px solid #000', borderRadius: 0, boxShadow: '4px 4px 0px #000' }} elevation={0}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccessTimeIcon sx={{ mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Recent Activity Feed</Typography>
                  </Box>
                }
                sx={{ borderBottom: '2px solid #000', bgcolor: '#f8f9fa' }}
              />
              <CardContent sx={{ maxHeight: 380, overflow: 'auto', p: 0 }}>
                <List sx={{ pt: 0 }}>
                  {recentActivities.map((activity, index) => (
                    <React.Fragment key={activity.id}>
                      <ListItem alignItems="flex-start" sx={{ py: 2 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {activity.icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem' }}>
                              {activity.title}
                            </Typography>
                          }
                          secondary={
                            <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                              <Typography component="span" variant="body2" sx={{ display: 'block', fontWeight: 600 }}>
                                {activity.description}
                              </Typography>
                              <Typography component="span" variant="caption" sx={{ fontWeight: 800, color: 'text.secondary' }}>
                                {activity.date}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < recentActivities.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Quick Actions */}
        {isAdminOrManager && (
          <Grid item xs={12} md={6}>
            <motion.div variants={itemVariants}>
              <Card sx={{ border: '3px solid #000', borderRadius: 0, boxShadow: '4px 4px 0px #000' }} elevation={0}>
                <CardHeader
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <AutoAwesomeIcon sx={{ mr: 1 }} />
                      <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Quick Actions</Typography>
                    </Box>
                  }
                  sx={{ borderBottom: '2px solid #000', bgcolor: '#f8f9fa' }}
                />
                <CardContent sx={{ p: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<AccessTimeIcon />}
                        onClick={() => navigate('/attendance')}
                        sx={{ mb: 2, py: 1.2, fontWeight: 900, bgcolor: '#000', color: '#fff', border: '2px solid #000', borderRadius: 0 }}
                      >
                        Attendance
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<PeopleIcon />}
                        onClick={() => navigate('/employees')}
                        sx={{ mb: 2, py: 1.2, fontWeight: 800, border: '2px solid #000', color: '#000', borderRadius: 0 }}
                      >
                        Directory
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<RateReviewIcon />}
                        onClick={() => navigate('/reviews/team-performance-review')}
                        sx={{ mb: 2, py: 1.2, fontWeight: 800, border: '2px solid #000', color: '#000', borderRadius: 0 }}
                      >
                        Team Reviews
                      </Button>
                    </Grid>
                    <Grid item xs={6}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<EventIcon />}
                        onClick={() => navigate('/leaves/pending')}
                        sx={{ mb: 2, py: 1.2, fontWeight: 900, bgcolor: '#fcc419', color: '#000', border: '2px solid #000', borderRadius: 0 }}
                      >
                        Approve Leaves
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<WorkIcon />}
                        onClick={() => navigate('/payroll')}
                        sx={{ mb: 2, py: 1.2, fontWeight: 800, border: '2px solid #000', color: '#000', borderRadius: 0 }}
                      >
                        Payroll
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<InsightsIcon />}
                        onClick={() => navigate('/tools/talent-insights')}
                        sx={{ mb: 2, py: 1.2, fontWeight: 800, border: '2px solid #000', color: '#000', borderRadius: 0 }}
                      >
                        AI Insights
                      </Button>
                    </Grid>
                  </Grid>
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
