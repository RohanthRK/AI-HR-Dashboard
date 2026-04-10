import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Tabs, 
  Tab, 
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const LeaveRequests = () => {
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  
  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Mock data for leave requests
  const mockLeaveRequests = [
    { id: 1, type: 'Vacation', startDate: '2023-12-20', endDate: '2023-12-25', status: 'Approved' },
    { id: 2, type: 'Sick Leave', startDate: '2024-01-05', endDate: '2024-01-07', status: 'Pending' },
    { id: 3, type: 'Personal', startDate: '2024-02-10', endDate: '2024-02-10', status: 'Rejected' },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return 'success';
      case 'Pending': return 'warning';
      case 'Rejected': return 'error';
      default: return 'default';
    }
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
        <Button variant="contained" startIcon={<AddIcon />}>
          New Request
        </Button>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="My Requests" />
          <Tab label="Team Requests" />
          <Tab label="Department Calendar" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Start Date</TableCell>
                    <TableCell>End Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockLeaveRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.type}</TableCell>
                      <TableCell>{request.startDate}</TableCell>
                      <TableCell>{request.endDate}</TableCell>
                      <TableCell>
                        <Chip 
                          label={request.status} 
                          color={getStatusColor(request.status)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="small">View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          
          {tabValue === 1 && (
            <Typography>
              Team requests will be displayed here for managers and HR personnel.
            </Typography>
          )}
          
          {tabValue === 2 && (
            <Typography>
              Department leave calendar will be displayed here to visualize team availability.
            </Typography>
          )}
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Leave Balance
        </Typography>
        <Typography variant="body1">
          Vacation: 15 days remaining
        </Typography>
        <Typography variant="body1">
          Sick Leave: 7 days remaining
        </Typography>
        <Typography variant="body1">
          Personal: 3 days remaining
        </Typography>
      </Paper>
    </Box>
  );
};

export default LeaveRequests; 