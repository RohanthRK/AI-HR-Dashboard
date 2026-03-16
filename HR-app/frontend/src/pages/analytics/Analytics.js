import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import TimelineIcon from '@mui/icons-material/Timeline';
import analyticsService from '../../services/analyticsService';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  
  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  // Mock data for charts
  const attendanceData = [
    { month: 'Jan', present: 21, absent: 2, leave: 1 },
    { month: 'Feb', present: 19, absent: 1, leave: 0 },
    { month: 'Mar', present: 22, absent: 0, leave: 0 },
    { month: 'Apr', present: 20, absent: 2, leave: 0 },
    { month: 'May', present: 21, absent: 1, leave: 1 },
    { month: 'Jun', present: 20, absent: 0, leave: 2 },
  ];

  const departmentHeadcountData = [
    { name: 'Engineering', value: 42 },
    { name: 'Sales', value: 28 },
    { name: 'Marketing', value: 15 },
    { name: 'HR', value: 8 },
    { name: 'Finance', value: 12 },
  ];

  const employeeGrowthData = [
    { month: 'Jan', count: 95 },
    { month: 'Feb', count: 98 },
    { month: 'Mar', count: 102 },
    { month: 'Apr', count: 105 },
    { month: 'May', count: 105 },
    { month: 'Jun', count: 110 },
  ];

  const departmentSalaryData = [
    { department: 'Engineering', avgSalary: 85000 },
    { department: 'Sales', avgSalary: 75000 },
    { department: 'Marketing', avgSalary: 70000 },
    { department: 'HR', avgSalary: 65000 },
    { department: 'Finance', avgSalary: 80000 },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // AI Insights mock data
  const aiInsights = [
    "Employee turnover rate has decreased by 5% compared to last quarter.",
    "Engineering department shows highest growth rate at 12% this year.",
    "Employees with 3+ years tenure show 25% higher productivity metrics.",
    "Remote work has increased by 15% with no negative impact on deliverables."
  ];

  // Handle generating report
  const handleGenerateReport = () => {
    analyticsService.generateAnalyticsReport({
      timeRange,
      reportType: 'dashboard',
      charts: ['attendance', 'department_headcount', 'employee_growth', 'department_salary']
    }).then(blob => {
      // Create a link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    }).catch(err => {
      console.error('Error generating report:', err);
      setError('Failed to generate report. Please try again.');
    });
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
          Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<TimelineIcon />}
            onClick={() => navigate('/analytics/advanced')}
          >
            Advanced Analytics
          </Button>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={handleTimeRangeChange}
            >
              <MenuItem value="week">Last Week</MenuItem>
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="quarter">Last Quarter</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        {/* Attendance Analysis */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Attendance Analysis
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={attendanceData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" stackId="a" fill="#4caf50" />
                <Bar dataKey="absent" stackId="a" fill="#f44336" />
                <Bar dataKey="leave" stackId="a" fill="#ff9800" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Department Headcount */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Department Headcount
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={departmentHeadcountData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {departmentHeadcountData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} employees`, 'Headcount']} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Employee Growth */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Employee Growth Trend
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={employeeGrowthData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#2196f3" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* Average Salary by Department */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Average Salary by Department
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={departmentSalaryData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Avg. Salary']} />
                <Bar dataKey="avgSalary" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        
        {/* AI Insights */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              AI-Powered Insights
            </Typography>
            <Grid container spacing={2}>
              {aiInsights.map((insight, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="body1">
                        {insight}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleGenerateReport}
              >
                Generate Custom Report
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Show error message if there is an error */}
      {error && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default Analytics; 