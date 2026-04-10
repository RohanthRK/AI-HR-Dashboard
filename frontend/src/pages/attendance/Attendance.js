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
  Tab,
  Grid
} from '@mui/material';
import attendanceService from '../../services/attendanceService';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { useTheme } from '@mui/material/styles';
import AttendanceCalendar from './AttendanceCalendar';
import ViewListIcon from '@mui/icons-material/ViewList';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axios from 'axios';

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
  const theme = useTheme();
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

  // AI Anomalies states
  const [aiInsightsLoading, setAiInsightsLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState(null);

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

  // Fetch AI Anomalies
  const fetchAiInsights = useCallback(async () => {
    setAiInsightsLoading(true);
    try {
      const response = await axios.get('/api/ai/attendance-anomalies/');
      setAiInsights(response.data);
    } catch (error) {
      console.error("Error fetching AI Insights:", error);
      // Suppress showing error snackbar for AI as it's secondary
    } finally {
      setAiInsightsLoading(false);
    }
  }, []);

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
    fetchAiInsights();
  }, [fetchStatus, fetchHistory, fetchAiInsights, page, rowsPerPage]); // Rerun if page/rowsPerPage changes

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
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '--:--';
      return format(date, 'HH:mm:ss');
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // If it's already a full ISO string, parse directly
      // If it's just YYYY-MM-DD, append time info for consistent parsing
      const parsingString = dateString.length <= 10 ? `${dateString}T12:00:00` : dateString;
      const date = new Date(parsingString);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, 'MMM dd, yyyy');
    } catch {
      return 'N/A';
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
      <Paper className="brutal-border brutal-shadow" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 800 }}>
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
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Clocked in at: {format(new Date(lastCheckInTime), 'MMM dd, yyyy HH:mm:ss')}
              </Typography>
            )}
            <Box sx={{ mt: 2 }}>
              <Button
                className={!clockedIn ? "brutal-shadow-hover" : ""}
                variant="contained"
                color="primary"
                sx={{ mr: 2, fontWeight: 800, border: '2px solid #000' }}
                disabled={clockedIn || isSubmitting}
                onClick={handleClockIn}
              >
                {isSubmitting && clockedIn === false ? <CircularProgress size={24} /> : 'Clock In'}
              </Button>
              <Button
                className={clockedIn ? "brutal-shadow-hover" : ""}
                variant="contained"
                sx={{ fontWeight: 800, border: '2px solid #000', backgroundColor: '#FF5252', color: '#000', '&:hover': { backgroundColor: '#FF1744' } }}
                disabled={!clockedIn || isSubmitting}
                onClick={handleClockOut}
              >
                {isSubmitting && clockedIn === true ? <CircularProgress size={24} /> : 'Clock Out'}
              </Button>
            </Box>
          </>
        )}
      </Paper>

      {/* --- Weekly Stats & Timeline Section --- */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Stats Panel */}
        <Grid item xs={12} md={4}>
          <Paper className="brutal-border brutal-shadow-hover" sx={{ p: 3, height: '100%', backgroundColor: theme.palette.mode === 'light' ? '#FFF9C4' : '#fcc419', color: '#000' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Weekly Stats</Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Avg. Working Hours / Day</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                {attendanceHistory.length > 0 
                  ? (attendanceHistory.reduce((acc, curr) => acc + (curr.total_hours || 0), 0) / attendanceHistory.length).toFixed(1) + 'h'
                  : '0h'}
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Total Days Recorded</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>{totalRecords}</Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Total Hours (This Period)</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#1b5e20' }}>
                {attendanceHistory.reduce((acc, curr) => acc + (curr.total_hours || 0), 0).toFixed(1)}h
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Weekly Timeline */}
        <Grid item xs={12} md={8}>
          <Paper className="brutal-border brutal-shadow-hover" sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Recent Activity Timeline</Typography>

            {attendanceHistory.slice(0, 5).map((record, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography sx={{ width: 80, fontWeight: 700 }}>{formatDate(record.date).split(',')[0]}</Typography>
                <Box sx={{ flexGrow: 1, mx: 2, height: 24, backgroundColor: '#E0E0E0', border: '2px solid #000', position: 'relative' }}>
                  <Box 
                    sx={{ 
                      width: `${Math.min((record.total_hours || 0) / 9 * 100, 100)}%`, 
                      height: '100%', 
                      backgroundColor: record.status === 'present' ? '#4CAF50' : '#FFD54F', 
                      borderRight: (record.total_hours > 0) ? '2px solid #000' : 'none' 
                    }} 
                  />
                  <Typography sx={{ position: 'absolute', top: 2, left: 10, fontSize: '0.75rem', fontWeight: 800, color: '#000' }}>
                    {record.total_hours ? `${record.total_hours.toFixed(1)}h` : record.status}
                  </Typography>
                </Box>
              </Box>
            ))}
            
            {attendanceHistory.length === 0 && (
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', textAlign: 'center', mt: 4 }}>
                No recent activity to display.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* --- AI Insights Section --- */}
      {aiInsights && (
        <Paper className="brutal-border brutal-shadow" sx={{ p: 3, mb: 3, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SmartToyIcon sx={{ color: '#FF6B6B', fontSize: 32 }} />
            <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
              AI Attendance Insights
            </Typography>
          </Box>
          <Grid container spacing={3}>
            {/* Prediction */}
            <Grid item xs={12} md={4}>
              <Box className="brutal-border" sx={{ p: 2, height: '100%', backgroundColor: '#4ECDC4', color: '#000' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>AI FORECAST</Typography>
                <Typography variant="body1" sx={{ mt: 1, fontWeight: 700 }}>{aiInsights.prediction}</Typography>
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>HEALTH SCORE:</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>{aiInsights.overall_health_score}/100</Typography>
                </Box>
              </Box>
            </Grid>
            {/* Anomalies List */}
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {aiInsights.anomalies.map((anomaly, idx) => (
                  <Box key={idx} className="brutal-border" sx={{ p: 2, backgroundColor: anomaly.severity === 'high' ? '#FF6B6B' : '#FFD166', color: '#000', display: 'flex', gap: 2 }}>
                    <WarningAmberIcon sx={{ fontSize: 40 }} />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>{anomaly.type}</Typography>
                        <Chip label={anomaly.date} size="small" sx={{ fontWeight: 800, border: '2px solid #000', borderRadius: 0, backgroundColor: '#fff' }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>{anomaly.description}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>SUGGESTED ACTION: {anomaly.suggestion}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

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
                        <TableCell align="right">
                          {row.logs && row.logs.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              {row.logs.map((log, i) => (
                                <Typography key={i} variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                                  {formatTime(log.clock_in)}
                                </Typography>
                              ))}
                            </Box>
                          ) : formatTime(row.clock_in)}
                        </TableCell>
                        <TableCell align="right">
                          {row.logs && row.logs.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              {row.logs.map((log, i) => (
                                <Typography key={i} variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                                  {log.clock_out ? formatTime(log.clock_out) : '--:--'}
                                </Typography>
                              ))}
                            </Box>
                          ) : formatTime(row.clock_out)}
                        </TableCell>
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