import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button
} from '@mui/material';

const AttendanceReport = () => {
  const { employeeId, year, month } = useParams();
  const [loading, setLoading] = useState(true);
  
  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Mock attendance data
  const attendanceData = {
    employee: {
      id: employeeId,
      name: 'John Doe',
    },
    period: `${month}/${year}`,
    daysPresent: 21,
    daysAbsent: 2,
    daysLeave: 1,
    workHours: 168,
    regularHours: 160,
    overtimeHours: 8,
    dailyRecords: [
      { date: '2023-03-01', status: 'Present', checkIn: '09:00', checkOut: '17:30', hours: 8.5 },
      { date: '2023-03-02', status: 'Present', checkIn: '08:45', checkOut: '17:15', hours: 8.5 },
      { date: '2023-03-03', status: 'Present', checkIn: '09:15', checkOut: '18:00', hours: 8.75 },
      { date: '2023-03-04', status: 'Weekend', checkIn: null, checkOut: null, hours: 0 },
      { date: '2023-03-05', status: 'Weekend', checkIn: null, checkOut: null, hours: 0 },
      { date: '2023-03-06', status: 'Present', checkIn: '09:00', checkOut: '17:30', hours: 8.5 },
      { date: '2023-03-07', status: 'Present', checkIn: '08:50', checkOut: '17:20', hours: 8.5 },
      { date: '2023-03-08', status: 'Absent', checkIn: null, checkOut: null, hours: 0 },
      { date: '2023-03-09', status: 'Present', checkIn: '09:05', checkOut: '17:45', hours: 8.67 },
      { date: '2023-03-10', status: 'Present', checkIn: '09:00', checkOut: '17:30', hours: 8.5 },
    ],
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Attendance Report
        </Typography>
        <Button variant="contained" color="primary">
          Export Report
        </Button>
      </Box>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Employee
            </Typography>
            <Typography variant="body1" gutterBottom>
              {attendanceData.employee.name}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Period
            </Typography>
            <Typography variant="body1" gutterBottom>
              {attendanceData.period}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Days Present
            </Typography>
            <Typography variant="body1" gutterBottom>
              {attendanceData.daysPresent}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Days Absent
            </Typography>
            <Typography variant="body1" gutterBottom>
              {attendanceData.daysAbsent}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Leave Days
            </Typography>
            <Typography variant="body1" gutterBottom>
              {attendanceData.daysLeave}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Total Work Hours
            </Typography>
            <Typography variant="body1" gutterBottom>
              {attendanceData.workHours}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Regular Hours
            </Typography>
            <Typography variant="body1" gutterBottom>
              {attendanceData.regularHours}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Overtime Hours
            </Typography>
            <Typography variant="body1" gutterBottom>
              {attendanceData.overtimeHours}
            </Typography>
          </Grid>
        </Grid>
      </Paper>
      
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Check In</TableCell>
                <TableCell>Check Out</TableCell>
                <TableCell>Hours</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendanceData.dailyRecords.map((record, index) => (
                <TableRow key={index}>
                  <TableCell>{record.date}</TableCell>
                  <TableCell>{record.status}</TableCell>
                  <TableCell>{record.checkIn || '-'}</TableCell>
                  <TableCell>{record.checkOut || '-'}</TableCell>
                  <TableCell>{record.hours}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default AttendanceReport; 