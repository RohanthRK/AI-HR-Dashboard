import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  IconButton,
  Grid,
  Chip,
  Tooltip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TodayIcon from '@mui/icons-material/Today';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import TimerIcon from '@mui/icons-material/Timer';
import HelpIcon from '@mui/icons-material/Help';
import attendanceService from '../../services/attendanceService';
import { useSnackbar } from 'notistack';
import { 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isToday,
  isSameDay,
  subMonths,
  addMonths
} from 'date-fns';

const AttendanceCalendar = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const { enqueueSnackbar } = useSnackbar();

  // Function to fetch attendance data for the current month
  const fetchMonthlyAttendance = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    
    try {
      const response = await attendanceService.getMyAttendanceByDateRange(start, end);
      setAttendanceData(response.results || []);
    } catch (err) {
      console.error('Failed to fetch attendance data:', err);
      setError(err.message || 'Failed to load attendance data');
      enqueueSnackbar('Failed to load attendance calendar data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentMonth, enqueueSnackbar]);

  // Load attendance data when component mounts or month changes
  useEffect(() => {
    fetchMonthlyAttendance();
  }, [fetchMonthlyAttendance]);

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

  // Function to render the status indicator for a day
  const renderStatusIndicator = (day) => {
    const record = getAttendanceForDay(day);
    
    if (!record) {
      // No record for this day
      return <HelpIcon color="disabled" fontSize="small" />;
    }

    // Determine status based on record properties
    const status = record.status?.toLowerCase() || '';
    
    if (status.includes('present')) {
      const hasClockIn = !!record.clock_in;
      const hasClockOut = !!record.clock_out;
      
      if (hasClockIn && hasClockOut) {
        // Fully present
        return (
          <Tooltip title={`Present: ${record.total_hours?.toFixed(1) || 0} hrs`}>
            <CheckCircleIcon color="success" fontSize="small" />
          </Tooltip>
        );
      } else if (hasClockIn) {
        // Clocked in but not out
        return (
          <Tooltip title="Clocked in (not out)">
            <TimerIcon color="warning" fontSize="small" />
          </Tooltip>
        );
      }
    } 
    
    if (status.includes('absent')) {
      return (
        <Tooltip title="Absent">
          <CancelIcon color="error" fontSize="small" />
        </Tooltip>
      );
    }
    
    if (status.includes('leave') || status.includes('holiday')) {
      return (
        <Tooltip title={status}>
          <Chip 
            label={status.charAt(0).toUpperCase()} 
            size="small" 
            color="info" 
            sx={{ height: '18px', minWidth: '18px', fontSize: '10px' }}
          />
        </Tooltip>
      );
    }
    
    // Default unknown status
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
      <Typography variant="h4" gutterBottom>
        Attendance Calendar
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        {/* Calendar header with navigation */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2 
        }}>
          <IconButton onClick={handlePreviousMonth}>
            <ArrowBackIcon />
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="h5">
              {format(currentMonth, 'MMMM yyyy')}
            </Typography>
            <IconButton onClick={handleCurrentMonth} sx={{ ml: 1 }}>
              <TodayIcon color="primary" />
            </IconButton>
          </Box>
          
          <IconButton onClick={handleNextMonth}>
            <ArrowForwardIcon />
          </IconButton>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <>
            {/* Weekday headers */}
            <Grid container spacing={1} sx={{ mb: 1 }}>
              {weekdays.map(day => (
                <Grid item xs={12/7} key={day}>
                  <Box sx={{ 
                    textAlign: 'center', 
                    fontWeight: 'bold',
                    p: 1
                  }}>
                    {day}
                  </Box>
                </Grid>
              ))}
            </Grid>
            
            {/* Calendar days */}
            <Grid container spacing={1}>
              {days.map(day => {
                const inCurrentMonth = isSameMonth(day, currentMonth);
                const isCurrentDay = isToday(day);
                
                return (
                  <Grid item xs={12/7} key={day.toISOString()}>
                    <Paper 
                      elevation={isCurrentDay ? 3 : 1}
                      sx={{ 
                        p: 1, 
                        height: '80px',
                        backgroundColor: isCurrentDay ? 'rgba(25, 118, 210, 0.08)' : 'white',
                        opacity: inCurrentMonth ? 1 : 0.5,
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative'
                      }}
                    >
                      <Typography 
                        align="center" 
                        sx={{ 
                          fontWeight: isCurrentDay ? 'bold' : 'normal',
                        }}
                      >
                        {format(day, 'd')}
                      </Typography>
                      
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center',
                        alignItems: 'center',
                        flex: 1
                      }}>
                        {renderStatusIndicator(day)}
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
            
            {/* Legend */}
            <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CheckCircleIcon color="success" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption">Present</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TimerIcon color="warning" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption">Clocked In</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CancelIcon color="error" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption">Absent</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chip label="L" size="small" color="info" 
                  sx={{ height: '18px', minWidth: '18px', fontSize: '10px', mr: 0.5 }} />
                <Typography variant="caption">Leave/Holiday</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <HelpIcon color="disabled" fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption">Not Recorded</Typography>
              </Box>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default AttendanceCalendar; 