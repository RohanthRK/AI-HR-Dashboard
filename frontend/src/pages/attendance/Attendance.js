import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Alert, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Chip, Tabs, Tab, Dialog, DialogContent, DialogTitle, IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewListIcon from '@mui/icons-material/ViewList';
import GroupsIcon from '@mui/icons-material/Groups';
import { useSnackbar } from 'notistack';
import attendanceService from '../../services/attendanceService';
import authService from '../../services/authService';
import { formatTime, formatDate } from '../../utils/format';
import MonthCalendar from '../../components/attendance/MonthCalendar';
import AttendanceOverview from '../../components/attendance/AttendanceOverview';

const statusChip = (status) => {
  if (!status) return <Chip label="-" size="small" />;
  const s = status.toLowerCase();
  const color = s.includes('present') ? 'success' : s.includes('absent') ? 'error' : s.includes('late') ? 'warning' : s.includes('leave') ? 'info' : 'default';
  return <Chip label={status} color={color} size="small" variant="outlined" />;
};

const Attendance = () => {
  const role = authService.getCurrentUser()?.role;
  const isAdmin = role === 'Admin' || role === 'HR';
  const canSeeOthers = isAdmin || role === 'Manager';
  const { enqueueSnackbar } = useSnackbar();

  const [statusLoading, setStatusLoading] = useState(true);
  const [clockedIn, setClockedIn] = useState(false);
  const [since, setSince] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);              // bumps when you clock in or out so the calendar redraws

  const [tab, setTab] = useState('calendar');
  const [person, setPerson] = useState(null);             // someone opened from the overview

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const status = await attendanceService.getStatus();
      setClockedIn(status.is_clocked_in);
      setSince(status.last_check_in);
    } catch (error) {
      enqueueSnackbar(`Failed to load attendance status: ${error.message}`, { variant: 'error' });
      setClockedIn(false);
      setSince(null);
    } finally {
      setStatusLoading(false);
    }
  }, [enqueueSnackbar]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await attendanceService.getMyAttendance({ page: page + 1, limit: rowsPerPage });
      setHistory(res.results || []);
      setTotal(res.count || 0);
    } catch (error) {
      setHistoryError(`Failed to load attendance history: ${error.message}`);
      setHistory([]);
      setTotal(0);
    } finally {
      setHistoryLoading(false);
    }
  }, [page, rowsPerPage]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);
  useEffect(() => { if (tab === 'history') fetchHistory(); }, [tab, fetchHistory, refresh]);

  const clock = async (direction) => {
    setBusy(true);
    try {
      if (direction === 'in') {
        const res = await attendanceService.clockIn();
        setClockedIn(true);
        setSince(res.clock_in_time || new Date().toISOString());
        enqueueSnackbar('Clocked in', { variant: 'success' });
      } else {
        await attendanceService.clockOut();
        setClockedIn(false);
        setSince(null);
        enqueueSnackbar('Clocked out', { variant: 'success' });
      }
      setRefresh((n) => n + 1);
    } catch (error) {
      enqueueSnackbar(`Clock ${direction} failed: ${error.response?.data?.message || error.message || 'Unknown error'}`, { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 1.5 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 900 }}>Attendance</Typography>
        <Paper className="brutal-border" sx={{ ml: { md: 'auto' }, px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {statusLoading ? <CircularProgress size={20} /> : (
            <Typography variant="body1">
              {clockedIn ? <>Clocked in{since ? <> since <strong>{formatTime(since)}</strong></> : null}</> : 'Not clocked in'}
            </Typography>
          )}
          <Button variant="contained" disabled={clockedIn || busy || statusLoading} onClick={() => clock('in')} sx={{ fontWeight: 800, border: '2px solid #000' }}>Clock in</Button>
          <Button
            variant="contained" disabled={!clockedIn || busy || statusLoading} onClick={() => clock('out')}
            sx={{ fontWeight: 800, border: '2px solid #000', bgcolor: '#FF5252', color: '#000', '&:hover': { bgcolor: '#FF1744' } }}
          >
            Clock out
          </Button>
        </Paper>
      </Box>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} aria-label="attendance views" sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5, minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}>
        <Tab value="calendar" icon={<CalendarMonthIcon />} iconPosition="start" label="My calendar" />
        <Tab value="history" icon={<ViewListIcon />} iconPosition="start" label="My history" />
        {canSeeOthers && <Tab value="everyone" icon={<GroupsIcon />} iconPosition="start" label={isAdmin ? 'Everyone' : 'My team'} />}
      </Tabs>

      {tab === 'calendar' && <MonthCalendar key={refresh} />}

      {tab === 'history' && (
        <Paper sx={{ p: 2 }}>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>
          ) : historyError ? (
            <Alert severity="error">{historyError}</Alert>
          ) : history.length === 0 ? (
            <Alert severity="info">No attendance records found.</Alert>
          ) : (
            <>
              <TableContainer>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="center">Status</TableCell>
                      <TableCell align="right">Clock in</TableCell>
                      <TableCell align="right">Clock out</TableCell>
                      <TableCell align="right">Hours</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((row) => (
                      <TableRow hover key={row._id || row.date}>
                        <TableCell>{formatDate(row.date)}</TableCell>
                        <TableCell align="center">{statusChip(row.status)}</TableCell>
                        <TableCell align="right">
                          {(row.logs?.length ? row.logs : [{ clock_in: row.clock_in }]).map((log, i) => <Typography key={i} variant="body2" sx={{ fontWeight: 600 }}>{formatTime(log.clock_in, '--:--')}</Typography>)}
                        </TableCell>
                        <TableCell align="right">
                          {(row.logs?.length ? row.logs : [{ clock_out: row.clock_out }]).map((log, i) => <Typography key={i} variant="body2" sx={{ fontWeight: 600 }}>{formatTime(log.clock_out, '--:--')}</Typography>)}
                        </TableCell>
                        <TableCell align="right">{row.total_hours?.toFixed(2) ?? '--'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div" count={total} page={page} onPageChange={(e, p) => setPage(p)}
                rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                rowsPerPageOptions={[5, 10, 25, 50]}
              />
            </>
          )}
        </Paper>
      )}

      {tab === 'everyone' && canSeeOthers && <AttendanceOverview canEditHours={isAdmin} onOpenPerson={setPerson} />}

      <Dialog open={!!person} onClose={() => setPerson(null)} fullWidth maxWidth="lg">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', fontWeight: 900 }}>
          Attendance calendar
          <IconButton aria-label="Close" onClick={() => setPerson(null)} sx={{ ml: 'auto' }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {person && <MonthCalendar employeeId={person.employee_id} canEditHours={isAdmin} />}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Attendance;
