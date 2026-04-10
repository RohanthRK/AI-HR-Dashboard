import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Paper, 
  Typography, 
  Box, 
  CircularProgress, 
  Card, 
  CardContent, 
  Divider,
  Button,
  Chip,
  Avatar,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import analyticsService from '../../services/analyticsService';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const AnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [attritionData, setAttritionData] = useState(null);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, engagement, attrition] = await Promise.all([
        analyticsService.getDashboardAnalytics(),
        analyticsService.getEngagementMetrics(),
        analyticsService.getAttritionRisk()
      ]);
      
      setDashboardData(dashboard);
      setEngagementData(engagement);
      setAttritionData(attrition);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const renderPerformanceDistribution = () => {
    if (!dashboardData || !dashboardData.performance) return null;
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={dashboardData.performance}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {dashboardData.performance.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend />
          <RechartsTooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderDepartmentHeadcount = () => {
    if (!dashboardData || !dashboardData.departments) return null;
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={dashboardData.departments}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          <Bar dataKey="headcount" fill="#8884d8" name="Headcount" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderEngagementTrends = () => {
    if (!engagementData || !engagementData.trends) return null;
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={engagementData.trends}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <RechartsTooltip />
          <Legend />
          <Line type="monotone" dataKey="score" stroke="#8884d8" activeDot={{ r: 8 }} name="Engagement Score" />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  const renderAttritionRisk = () => {
    if (!attritionData || !attritionData.riskDistribution) return null;
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={attritionData.riskDistribution}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="risk"
            label={({ risk, percent }) => `${risk}: ${(percent * 100).toFixed(0)}%`}
          >
            <Cell fill="#4caf50" /> {/* Low risk */}
            <Cell fill="#ff9800" /> {/* Medium risk */}
            <Cell fill="#f44336" /> {/* High risk */}
          </Pie>
          <Legend />
          <RechartsTooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  const renderHighRiskEmployees = () => {
    if (!attritionData || !attritionData.highRiskEmployees || attritionData.highRiskEmployees.length === 0) {
      return (
        <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic', mt: 2 }}>
          No high-risk employees detected.
        </Typography>
      );
    }
    
    return (
      <Box sx={{ mt: 2 }}>
        {attritionData.highRiskEmployees.map((employee, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar sx={{ mr: 1, width: 32, height: 32 }}>{employee.name.charAt(0)}</Avatar>
            <Typography variant="body2">{employee.name}</Typography>
            <Chip 
              label={`${employee.riskScore}%`} 
              size="small" 
              color="error" 
              sx={{ ml: 'auto' }} 
            />
          </Box>
        ))}
      </Box>
    );
  };

  const renderOverviewCards = () => {
    if (!dashboardData || !dashboardData.overview) return null;
    
    const { overview } = dashboardData;
    
    return (
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Employees
              </Typography>
              <Typography variant="h4">
                {overview.totalEmployees}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUpIcon color="success" sx={{ mr: 0.5 }} />
                <Typography variant="body2" color="success.main">
                  {overview.employeeGrowth}% from last month
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg. Engagement
              </Typography>
              <Typography variant="h4">
                {overview.avgEngagement}%
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {overview.engagementTrend > 0 ? (
                  <>
                    <TrendingUpIcon color="success" sx={{ mr: 0.5 }} />
                    <Typography variant="body2" color="success.main">
                      {overview.engagementTrend}% increase
                    </Typography>
                  </>
                ) : (
                  <>
                    <TrendingDownIcon color="error" sx={{ mr: 0.5 }} />
                    <Typography variant="body2" color="error.main">
                      {Math.abs(overview.engagementTrend)}% decrease
                    </Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Turnover Rate
              </Typography>
              <Typography variant="h4">
                {overview.turnoverRate}%
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {overview.turnoverTrend < 0 ? (
                  <>
                    <TrendingDownIcon color="success" sx={{ mr: 0.5 }} />
                    <Typography variant="body2" color="success.main">
                      {Math.abs(overview.turnoverTrend)}% decrease
                    </Typography>
                  </>
                ) : (
                  <>
                    <TrendingUpIcon color="error" sx={{ mr: 0.5 }} />
                    <Typography variant="body2" color="error.main">
                      {overview.turnoverTrend}% increase
                    </Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg. Performance
              </Typography>
              <Typography variant="h4">
                {overview.avgPerformance}/5
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {overview.performanceTrend > 0 ? (
                  <>
                    <TrendingUpIcon color="success" sx={{ mr: 0.5 }} />
                    <Typography variant="body2" color="success.main">
                      {overview.performanceTrend}% increase
                    </Typography>
                  </>
                ) : (
                  <>
                    <TrendingDownIcon color="error" sx={{ mr: 0.5 }} />
                    <Typography variant="body2" color="error.main">
                      {Math.abs(overview.performanceTrend)}% decrease
                    </Typography>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography color="error" gutterBottom>{error}</Typography>
        <Button 
          variant="contained" 
          startIcon={<RefreshIcon />} 
          onClick={fetchAnalyticsData}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">HR Analytics Dashboard</Typography>
        <Tooltip title="Refresh data">
          <IconButton onClick={fetchAnalyticsData}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {renderOverviewCards()}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Performance Distribution</Typography>
            <Divider sx={{ my: 1 }} />
            {renderPerformanceDistribution()}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Department Headcount</Typography>
            <Divider sx={{ my: 1 }} />
            {renderDepartmentHeadcount()}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">Engagement Trends</Typography>
            <Divider sx={{ my: 1 }} />
            {renderEngagementTrends()}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">
              Attrition Risk
              <Tooltip title="Employees at risk of leaving the organization">
                <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', color: 'text.secondary' }} />
              </Tooltip>
            </Typography>
            <Divider sx={{ my: 1 }} />
            {renderAttritionRisk()}
            
            {attritionData && attritionData.highRiskEmployees && attritionData.highRiskEmployees.length > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                  <WarningIcon color="error" sx={{ mr: 1 }} />
                  <Typography variant="subtitle2">High Risk Employees</Typography>
                </Box>
                {renderHighRiskEmployees()}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard; 