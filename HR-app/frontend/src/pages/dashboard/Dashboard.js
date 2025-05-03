import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import EventIcon from '@mui/icons-material/Event';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  
  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Mock data for dashboard cards
  const dashboardStats = {
    employeesPresent: 42,
    totalEmployees: 50,
    leaveRequests: 3,
    pendingApprovals: 2,
    upcomingEvents: [
      { id: 1, title: 'Team Meeting', date: 'Today, 2:00 PM' },
      { id: 2, title: 'Project Deadline', date: 'Tomorrow, 5:00 PM' },
      { id: 3, title: 'Company Party', date: 'Dec 20, 6:00 PM' }
    ],
    recentActivities: [
      { id: 1, user: 'John Doe', action: 'clocked in', time: '08:45 AM' },
      { id: 2, user: 'Jane Smith', action: 'requested leave', time: '09:30 AM' },
      { id: 3, user: 'Mark Johnson', action: 'clocked out', time: '05:15 PM' }
    ]
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        {/* Summary Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" gutterBottom>
                Attendance
              </Typography>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <PeopleAltIcon />
              </Avatar>
            </Box>
            <Typography component="div" variant="h4">
              {dashboardStats.employeesPresent}/{dashboardStats.totalEmployees}
            </Typography>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              Employees Present Today
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" gutterBottom>
                Leave Requests
              </Typography>
              <Avatar sx={{ bgcolor: 'warning.main' }}>
                <EventIcon />
              </Avatar>
            </Box>
            <Typography component="div" variant="h4">
              {dashboardStats.leaveRequests}
            </Typography>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              Pending Leave Requests
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" gutterBottom>
                Approvals
              </Typography>
              <Avatar sx={{ bgcolor: 'success.main' }}>
                <AssignmentIcon />
              </Avatar>
            </Box>
            <Typography component="div" variant="h4">
              {dashboardStats.pendingApprovals}
            </Typography>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              Items Awaiting Approval
            </Typography>
          </Paper>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: 140 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography color="text.secondary" gutterBottom>
                Time
              </Typography>
              <Avatar sx={{ bgcolor: 'info.main' }}>
                <AccessTimeIcon />
              </Avatar>
            </Box>
            <Typography component="div" variant="h4">
              {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Typography>
            <Typography color="text.secondary" sx={{ flex: 1 }}>
              Current Time
            </Typography>
          </Paper>
        </Grid>
        
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Recent Activity"
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <Divider />
            <CardContent>
              <List>
                {dashboardStats.recentActivities.map((activity) => (
                  <React.Fragment key={activity.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemAvatar>
                        <Avatar alt={activity.user} src={`/static/images/avatar/${activity.id}.jpg`} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={activity.user}
                        secondary={
                          <React.Fragment>
                            <Typography
                              sx={{ display: 'inline' }}
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {activity.action}
                            </Typography>
                            {` — ${activity.time}`}
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Upcoming Events */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardHeader
              title="Upcoming Events"
              action={
                <IconButton aria-label="settings">
                  <MoreVertIcon />
                </IconButton>
              }
            />
            <Divider />
            <CardContent>
              <List>
                {dashboardStats.upcomingEvents.map((event) => (
                  <React.Fragment key={event.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <EventIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={event.title}
                        secondary={event.date}
                      />
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Analytics Placeholder */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Analytics Overview
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Data visualization will be implemented here to show attendance trends, leave patterns, and other HR metrics.
            </Typography>
            <Box
              sx={{
                bgcolor: 'background.paper',
                height: 200,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed grey',
              }}
            >
              <Typography variant="body1" color="text.secondary">
                Analytics Charts Coming Soon
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 