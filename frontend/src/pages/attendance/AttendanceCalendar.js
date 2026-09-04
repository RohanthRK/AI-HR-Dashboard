import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Tooltip,
  alpha
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TodayIcon from '@mui/icons-material/Today';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import TimerIcon from '@mui/icons-material/Timer';
import HelpIcon from '@mui/icons-material/Help';
import CelebrationIcon from '@mui/icons-material/Celebration';
import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import attendanceService from '../../services/attendanceService';
import leaveService from '../../services/leaveService';
import { isHolidayDate } from '../../utils/holidayUtils';
import { useSnackbar } from 'notistack';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isToday,
  isSameDay,
  subMonths,
  addMonths,
  getDay
} from 'date-fns';

const AttendanceCalendar = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [leaveApplications, setLeaveApplications] = useState([]);
  const { enqueueSnackbar } = useSnackbar();

  // Function to fetch attendance and approved leave data for the current month
  const fetchMonthlyData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    
    try {
      const [attRes, leaveRes] = await Promise.allSettled([
        attendanceService.getMyAttendanceByDateRange(start, end),
        leaveService.getMyLeaveApplications()
      ]);

      if (attRes.status === 'fulfilled') {
        const val = attRes.value;
        setAttendanceData(Array.isArray(val) ? val : (val.results || []));
      }

      if (leaveRes.status === 'fulfilled') {
        const lVal = leaveRes.value;
        const leaves = Array.isArray(lVal) ? lVal : (lVal.results || lVal.leaves || []);
        // Only keep approved leaves
        setLeaveApplications(leaves.filter(l => (l.status || '').toLowerCase() === 'approved'));
      }
    } catch (err) {
      console.error('Failed to fetch attendance calendar data:', err);
      setError(err.message || 'Failed to load attendance data');
      enqueueSnackbar('Failed to load attendance calendar data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentMonth, enqueueSnackbar]);

  // Load attendance & leaves data when month changes
  useEffect(() => {
    fetchMonthlyData();
  }, [fetchMonthlyData]);

  // Navigation handlers
  const handlePreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  // Function to get attendance status for a specific day
  const getAttendanceForDay = (day) => {
    return attendanceData.find(record => 
      isSameDay(new Date(record.date), day)
    );
  };

  // Check if day falls within any approved leave range
  const getLeaveForDay = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return leaveApplications.find(leave => {
      const start = (leave.start_date || '').split('T')[0];
      const end = (leave.end_date || leave.start_date || '').split('T')[0];
      return dayStr >= start && dayStr <= end;
    });
  };

  // Function to render the status indicator for a day
  const renderStatusIndicator = (day) => {
    const record = getAttendanceForDay(day);
    const holiday = isHolidayDate(day);
    const approvedLeave = getLeaveForDay(day);
    const dayOfWeek = day.getDay(); // 0 is Sunday, 6 is Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // 1. Check if it is a Public/Company Holiday
    if (holiday) {
      return (
        <Tooltip title={`Holiday: ${holiday.name} (${holiday.type || 'Public Holiday'})`} arrow>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <CelebrationIcon sx={{ color: '#d9480f', fontSize: 24 }} />
            <Chip 
              label="HOLIDAY" 
              size="small" 
              sx={{ 
                height: '20px', 
                fontSize: '10px',
                fontWeight: 900,
                borderRadius: 0,
                border: '2px solid #000',
                bgcolor: '#fcc419',
                color: '#000',
                '& .MuiChip-label': { px: 0.5 }
              }} 
            />
          </Box>
        </Tooltip>
      );
    }

    // 2. Check if user has an approved leave for this date
    if (approvedLeave) {
      const leaveLabel = approvedLeave.leave_type || approvedLeave.type || 'Leave';
      return (
        <Tooltip title={`Approved Leave: ${leaveLabel}`} arrow>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <BeachAccessIcon sx={{ color: '#1976d2', fontSize: 24 }} />
            <Chip 
              label={leaveLabel.toUpperCase()} 
              size="small" 
              sx={{ 
                height: '20px', 
                fontSize: '10px',
                fontWeight: 900,
                borderRadius: 0,
                border: '2px solid #000',
                bgcolor: '#339af0',
                color: '#fff',
                '& .MuiChip-label': { px: 0.5 }
              }} 
            />
          </Box>
        </Tooltip>
      );
    }

    // 3. If an Attendance Record exists for this day
    if (record) {
      const status = (record.status || '').toLowerCase();

      if (status.includes('present') || status.includes('working') || status.includes('completed')) {
        const hasClockIn = !!record.clock_in;
        const hasClockOut = !!record.clock_out;
        
        if (hasClockIn && hasClockOut) {
          return (
            <Tooltip title={`Present: ${(record.total_hours || 8).toFixed(1)} hrs`} arrow>
              <CheckCircleIcon color="success" sx={{ fontSize: 26 }} />
            </Tooltip>
          );
        } else if (hasClockIn) {
          return (
            <Tooltip title="Clocked In (Active / Working)" arrow>
              <TimerIcon color="warning" sx={{ fontSize: 26 }} />
            </Tooltip>
          );
        } else {
          return (
            <Tooltip title="Present" arrow>
              <CheckCircleIcon color="success" sx={{ fontSize: 26 }} />
            </Tooltip>
          );
        }
      } 
      
      if (status.includes('absent')) {
        return (
          <Tooltip title="Absent" arrow>
            <CancelIcon color="error" sx={{ fontSize: 26 }} />
          </Tooltip>
        );
      }
      
      if (status.includes('leave')) {
        return (
          <Tooltip title={`Leave (${record.leave_type || 'Approved'})`} arrow>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <EventBusyIcon sx={{ color: '#1976d2', fontSize: 22 }} />
              <Chip 
                label="LEAVE" 
                size="small" 
                sx={{ 
                  height: '20px', 
                  fontSize: '10px',
                  fontWeight: 900,
                  borderRadius: 0,
                  border: '2px solid #000',
                  bgcolor: '#1976d2',
                  color: '#fff',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            </Box>
          </Tooltip>
        );
      }

      if (status.includes('holiday')) {
        return (
          <Tooltip title="Company Holiday" arrow>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
              <CelebrationIcon sx={{ color: '#d9480f', fontSize: 24 }} />
              <Chip 
                label="HOLIDAY" 
                size="small" 
                sx={{ 
                  height: '20px', 
                  fontSize: '10px',
                  fontWeight: 900,
                  borderRadius: 0,
                  border: '2px solid #000',
                  bgcolor: '#fcc419',
                  color: '#000',
                  '& .MuiChip-label': { px: 0.5 }
                }} 
              />
            </Box>
          </Tooltip>
        );
      }
    }

    // 4. If Weekend
    if (isWeekend) {
      return (
        <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, textTransform: 'uppercase' }}>
          Off Day
        </Typography>
      );
    }
    
    // 5. Default not recorded
    return <HelpIcon color="disabled" fontSize="small" />;
  };

  // Create calendar days for the current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get day names (Mon, Tue, etc.)
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Box sx={{ p: 3 }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.5px' }}
      >
        Attendance &amp; Schedule Calendar
      </Typography>
      
      <Paper elevation={0} sx={{ 
        p: 3, 
        mb: 3, 
        border: '4px solid #000', 
        borderRadius: 0, 
        boxShadow: '10px 10px 0px #000' 
      }}>
        {/* Calendar header with navigation */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          pb: 2,
          borderBottom: '3px solid #000'
        }}>
          <IconButton 
            onClick={handlePreviousMonth}
            sx={{ border: '2px solid #000', borderRadius: 0, bgcolor: '#fff', '&:hover': { bgcolor: '#fcc419' } }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
              {format(currentMonth, 'MMMM yyyy')}
            </Typography>
            <IconButton 
              onClick={handleCurrentMonth} 
              sx={{ border: '2px solid #000', borderRadius: 0, bgcolor: '#fcc419', '&:hover': { bgcolor: '#fab005' } }}
              title="Jump to Current Month"
            >
              <TodayIcon />
            </IconButton>
          </Box>
          
          <IconButton 
            onClick={handleNextMonth}
            sx={{ border: '2px solid #000', borderRadius: 0, bgcolor: '#fff', '&:hover': { bgcolor: '#fcc419' } }}
          >
            <ArrowForwardIcon />
          </IconButton>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', my: 8 }}>
            <CircularProgress sx={{ color: '#000', mb: 2 }} />
            <Typography sx={{ fontWeight: 800 }}>Loading Calendar Schedule...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ border: '2px solid #000', borderRadius: 0, fontWeight: 700 }}>{error}</Alert>
        ) : (
          <>
            {/* Calendar Grid Container */}
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              gap: 1.5 
            }}>
              {/* Weekday headers */}
              {weekdays.map(day => (
                <Box key={day} sx={{ 
                  textAlign: 'center', 
                  fontWeight: 900,
                  fontSize: '0.9rem',
                  textTransform: 'uppercase',
                  py: 1,
                  bgcolor: '#000',
                  color: '#fff',
                  border: '2px solid #000'
                }}>
                  {day}
                </Box>
              ))}

              {/* Padding for first week */}
              {Array.from({ length: getDay(monthStart) }).map((_, index) => (
                <Box key={`padding-${index}`} sx={{ 
                  height: '110px', 
                  opacity: 0, 
                  pointerEvents: 'none' 
                }} />
              ))}

              {/* Day cells */}
              {days.map(day => {
                const isCurrentDay = isToday(day);
                const holiday = isHolidayDate(day);
                const approvedLeave = getLeaveForDay(day);
                
                let cellBg = 'background.paper';
                if (isCurrentDay) cellBg = alpha('#fcc419', 0.25);
                else if (holiday) cellBg = '#fff9db';
                else if (approvedLeave) cellBg = '#e7f5ff';

                return (
                  <Paper 
                    key={day.toISOString()}
                    elevation={0}
                    sx={{ 
                      p: 1.5, 
                      height: '110px',
                      border: '3px solid #000',
                      borderRadius: 0,
                      backgroundColor: cellBg,
                      boxShadow: isCurrentDay ? '5px 5px 0px #000' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translate(-2px, -2px)',
                        boxShadow: '6px 6px 0px #000'
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography 
                        sx={{ 
                          fontWeight: 900,
                          fontSize: '1.05rem',
                          color: isCurrentDay ? '#000' : 'text.primary'
                        }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      {isCurrentDay && (
                        <Chip 
                          label="TODAY" 
                          size="small" 
                          sx={{ 
                            height: '16px', 
                            fontSize: '9px', 
                            fontWeight: 900, 
                            bgcolor: '#000', 
                            color: '#fff',
                            borderRadius: 0
                          }} 
                        />
                      )}
                    </Box>
                    
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center',
                      alignItems: 'center',
                      flex: 1
                    }}>
                      {renderStatusIndicator(day)}
                    </Box>
                  </Paper>
                );
              })}
            </Box>
            
            {/* Legend */}
            <Box sx={{ 
              mt: 4, 
              pt: 2.5, 
              borderTop: '3px solid #000', 
              display: 'flex', 
              gap: 2.5, 
              flexWrap: 'wrap', 
              alignItems: 'center' 
            }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase', mr: 1 }}>
                Legend:
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 800 }}>Present</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimerIcon color="warning" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 800 }}>Clocked In</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CancelIcon color="error" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 800 }}>Absent</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <BeachAccessIcon sx={{ color: '#1976d2', fontSize: 18, mr: 0.5 }} />
                <Chip label="LEAVE" size="small" sx={{ height: '18px', fontSize: '10px', fontWeight: 900, bgcolor: '#339af0', color: '#fff', mr: 0.5, borderRadius: 0 }} />
                <Typography variant="body2" sx={{ fontWeight: 800 }}>Approved Leave</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CelebrationIcon sx={{ color: '#d9480f', fontSize: 18, mr: 0.5 }} />
                <Chip label="HOLIDAY" size="small" sx={{ height: '18px', fontSize: '10px', fontWeight: 900, bgcolor: '#fcc419', color: '#000', mr: 0.5, borderRadius: 0 }} />
                <Typography variant="body2" sx={{ fontWeight: 800 }}>Public / Gazetted Holiday</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <HelpIcon color="disabled" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.secondary' }}>Not Recorded / Off Day</Typography>
              </Box>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default AttendanceCalendar;