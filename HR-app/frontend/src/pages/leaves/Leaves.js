import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import { Link } from 'react-router-dom';

const Leaves = () => {
  const [loading, setLoading] = useState(true);
  
  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Mock data for leave balance
  const leaveBalance = {
    annual: { total: 20, used: 5, remaining: 15 },
    sick: { total: 12, used: 3, remaining: 9 },
    personal: { total: 5, used: 1, remaining: 4 },
  };

  // Mock data for leave requests
  const leaveRequests = [
    { 
      id: 1, 
      type: 'Annual Leave', 
      startDate: '2023-05-15', 
      endDate: '2023-05-19', 
      days: 5,
      status: 'Approved',
      approvedBy: 'Jane Smith',
      requestDate: '2023-04-20'
    },
    { 
      id: 2, 
      type: 'Sick Leave', 
      startDate: '2023-03-10', 
      endDate: '2023-03-12', 
      days: 3,
      status: 'Approved',
      approvedBy: 'Jane Smith',
      requestDate: '2023-03-10'
    },
    { 
      id: 3, 
      type: 'Personal Leave', 
      startDate: '2023-07-01', 
      endDate: '2023-07-01', 
      days: 1,
      status: 'Pending',
      approvedBy: null,
      requestDate: '2023-06-15'
    },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return 'success';
      case 'Rejected': return 'error';
      case 'Pending': return 'warning';
      default: return 'default';
    }
  };

  const getProgressColor = (used, total) => {
    const percentage = (used / total) * 100;
    if (percentage < 50) return 'success';
    if (percentage < 75) return 'warning';
    return 'error';
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Leave Management
        </Typography>
        <Button 
          variant="contained" 
          component={Link} 
          to="/leaves/request"
        >
          Request Leave
        </Button>
      </Box>
      
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Annual Leave
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Used: {leaveBalance.annual.used} days
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Remaining: {leaveBalance.annual.remaining} days
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(leaveBalance.annual.used / leaveBalance.annual.total) * 100} 
                color={getProgressColor(leaveBalance.annual.used, leaveBalance.annual.total)}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Sick Leave
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Used: {leaveBalance.sick.used} days
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Remaining: {leaveBalance.sick.remaining} days
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(leaveBalance.sick.used / leaveBalance.sick.total) * 100} 
                color={getProgressColor(leaveBalance.sick.used, leaveBalance.sick.total)}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Personal Leave
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Used: {leaveBalance.personal.used} days
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Remaining: {leaveBalance.personal.remaining} days
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(leaveBalance.personal.used / leaveBalance.personal.total) * 100} 
                color={getProgressColor(leaveBalance.personal.used, leaveBalance.personal.total)}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>End Date</TableCell>
                <TableCell>Days</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Request Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveRequests.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>{leave.type}</TableCell>
                  <TableCell>{leave.startDate}</TableCell>
                  <TableCell>{leave.endDate}</TableCell>
                  <TableCell>{leave.days}</TableCell>
                  <TableCell>
                    <Chip 
                      label={leave.status} 
                      color={getStatusColor(leave.status)} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>{leave.requestDate}</TableCell>
                  <TableCell>
                    <Button size="small" color="primary">View</Button>
                    {leave.status === 'Pending' && (
                      <Button size="small" color="error">Cancel</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Leaves; 