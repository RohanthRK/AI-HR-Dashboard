import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import attendanceService from '../../services/attendanceService';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns'; // For formatting dates/times
import AttendanceCalendar from './AttendanceCalendar';
import ViewListIcon from '@mui/icons-material/ViewList';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

// Tab Panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`attendance-tabpanel-${index}`}
      aria-labelledby={`attendance-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>{children}</Box>
      )}
    </div>
  );
}

const Attendance = () => {
  // Status states
  const [statusLoading, setStatusLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [lastCheckInTime, setLastCheckInTime] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false); 

  // History states
  const [historyLoading, setHistoryLoading] = useState(true);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [historyError, setHistoryError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  
  // Tab state
  const [tabValue, setTabValue] = useState(0);

  const { enqueueSnackbar } = useSnackbar();

  // Fetch current attendance status
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const statusData = await attendanceService.getStatus();
      setClockedIn(statusData.is_clocked_in);
      setLastCheckInTime(statusData.last_check_in);
    } catch (error) {
      console.error("Error fetching attendance status:", error);
      enqueueSnackbar(`Failed to load attendance status: ${error.message}`, { variant: 'error' });
      setClockedIn(false);
      setLastCheckInTime(null);
    } finally {
      setStatusLoading(false);
    }
  }, [enqueueSnackbar]);

  // Fetch attendance history
  const fetchHistory = useCallback(async (currentPage, currentRowsPerPage) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const params = { 
        page: currentPage + 1, // API is 1-based index
        limit: currentRowsPerPage 
      };
      const historyData = await attendanceService.getMyAttendance(params);
      setAttendanceHistory(historyData.results || []);
      setTotalRecords(historyData.count || 0);
    } catch (error) {
      console.error("Error fetching attendance history:", error);
      setHistoryError(`Failed to load attendance history: ${error.message}`);
      enqueueSnackbar(`Failed to load attendance history: ${error.message}`, { variant: 'error' });
      setAttendanceHistory([]);
      setTotalRecords(0);
    } finally {
      setHistoryLoading(false);
    }
  }, [enqueueSnackbar]);

  // Load status and initial history on component mount
  useEffect(() => {
    fetchStatus();
    fetchHistory(page, rowsPerPage);
  }, [fetchStatus, fetchHistory, page, rowsPerPage]); // Rerun if page/rowsPerPage changes

  // Handlers for Clock In/Out (slightly modified to refresh status/history)
  const handleClockIn = async () => {
    setIsSubmitting(true);
    try {
      const response = await attendanceService.clockIn();
      setClockedIn(true);
      setLastCheckInTime(response.clock_in_time || new Date().toISOString());
      enqueueSnackbar('Successfully clocked in!', { variant: 'success' });
      fetchHistory(page, rowsPerPage); // Refresh history
    } catch (error) {
      console.error("Error clocking in:", error);
      enqueueSnackbar(`Clock in failed: ${error.response?.data?.message || error.message || 'Unknown error'}`, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    setIsSubmitting(true);
    try {
      await attendanceService.clockOut();
      setClockedIn(false);
      setLastCheckInTime(null); 
      enqueueSnackbar('Successfully clocked out!', { variant: 'success' });
      fetchHistory(page, rowsPerPage); // Refresh history
    } catch (error) {
      console.error("Error clocking out:", error);
      enqueueSnackbar(`Clock out failed: ${error.response?.data?.message || error.message || 'Unknown error'}`, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to first page
  };

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const formatTime = (isoString) => {
    if (!isoString) return '--:--';
    try {
      return format(new Date(isoString), 'HH:mm:ss');
    } catch {
      return 'Invalid Time';
    }
  };

  const formatDate = (isoString) => {
      if (!isoString) return 'N/A';
      try {
        // Assuming date is stored as YYYY-MM-DD
        return format(new Date(isoString + 'T00:00:00Z'), 'MMM dd, yyyy'); // Add time/TZ info for parsing
      } catch {
        return 'Invalid Date';
      }
    };

   const getStatusChip = (status) => {
        let color = 'default';
        let label = status || 'N/A';

        if (!status) return <Chip label="N/A" size="small" />;

        status = status.toLowerCase();

        if (status.includes('present')) color = 'success';
        else if (status.includes('absent')) color = 'error';
        else if (status.includes('late')) color = 'warning';
        else if (status.includes('leave')) color = 'info';
        else if (status.includes('half')) color = 'secondary';

        return <Chip label={label} color={color} size="small" variant="outlined" />;
    };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Attendance
      </Typography>
      
      {/* --- Clock In/Out Section --- */} 
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Today's Status
        </Typography>
        {statusLoading ? (
          <CircularProgress size={24} />
        ) : (
          <>
            <Typography variant="body1" gutterBottom>
              Current status: <strong>{clockedIn ? 'Clocked In' : 'Clocked Out'}</strong>
            </Typography>
            {clockedIn && lastCheckInTime && (
              <Typography variant="body2" color="text.secondary">
                Clocked in at: {new Date(lastCheckInTime).toLocaleString()}
              </Typography>
            )}
            <Box sx={{ mt: 2 }}>
              <Button 
                variant="contained" 
                color="primary" 
                sx={{ mr: 2 }}
                disabled={clockedIn || isSubmitting}
                onClick={handleClockIn}
              >
                {isSubmitting && clockedIn === false ? <CircularProgress size={24} /> : 'Clock In'}
              </Button>
              <Button 
                variant="contained" 
                color="secondary"
                disabled={!clockedIn || isSubmitting}
                onClick={handleClockOut}
              >
                {isSubmitting && clockedIn === true ? <CircularProgress size={24} /> : 'Clock Out'}
              </Button>
            </Box>
          </>
        )}
      </Paper>
      
      {/* --- Tab Navigation --- */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          aria-label="attendance views"
        >
          <Tab 
            icon={<ViewListIcon />} 
            label="List View" 
            iconPosition="start"
            id="attendance-tab-0" 
            aria-controls="attendance-tabpanel-0" 
          />
          <Tab 
            icon={<CalendarMonthIcon />} 
            label="Calendar View" 
            iconPosition="start"
            id="attendance-tab-1" 
            aria-controls="attendance-tabpanel-1" 
          />
        </Tabs>
      </Box>
      
      {/* --- List View Tab --- */}
      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            My Attendance History
          </Typography>
          
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
               <CircularProgress />
            </Box>
          ) : historyError ? (
            <Alert severity="error" sx={{ mt: 2 }}>{historyError}</Alert>
          ) : attendanceHistory.length === 0 ? (
             <Alert severity="info" sx={{ mt: 2 }}>No attendance records found.</Alert>
          ) : (
            <>
              <TableContainer>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="right">Clock In</TableCell>
                      <TableCell align="right">Clock Out</TableCell>
                      <TableCell align="right">Hours</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {attendanceHistory.map((row) => (
                      <TableRow hover key={row._id || row.date}>
                        <TableCell component="th" scope="row">
                          {formatDate(row.date)}
                        </TableCell>
                        <TableCell align="center">{getStatusChip(row.status)}</TableCell>
                        <TableCell align="right">{formatTime(row.clock_in)}</TableCell>
                        <TableCell align="right">{formatTime(row.clock_out)}</TableCell>
                        <TableCell align="right">{row.total_hours?.toFixed(2) ?? '--'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={totalRecords}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </>
          )}
        </Paper>
      </TabPanel>
      
      {/* --- Calendar View Tab --- */}
      <TabPanel value={tabValue} index={1}>
        <AttendanceCalendar />
      </TabPanel>
    </Box>
  );
};

export default Attendance; 