import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Tab,
  Tabs,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Chip
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PsychologyIcon from '@mui/icons-material/Psychology';
import axios from 'axios';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import analyticsService from '../../services/analyticsService';

const AdvancedAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [timeRange, setTimeRange] = useState('quarter');
  const [department, setDepartment] = useState('all');
  const [analyticsData, setAnalyticsData] = useState(null);
  const [aiAnalytics, setAiAnalytics] = useState(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch dashboard analytics
        const dashboardData = await analyticsService.getDashboardAnalytics();

        // Fetch additional data based on selected filters
        const engagementData = await analyticsService.getEngagementMetrics();
        const attritionData = await analyticsService.getAttritionRisk();
        const turnoverData = await analyticsService.getTurnoverAnalytics({
          timeRange,
          department: department !== 'all' ? department : undefined
        });

        setAnalyticsData({
          dashboard: dashboardData,
          engagement: engagementData,
          attrition: attritionData,
          turnover: turnoverData
        });

        setError(null);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');

        // Load mock data for development/demo purposes
        setAnalyticsData(getMockData());
      }

      // Fetch AI Analytics
      setAiLoading(true);
      try {
        const aiResponse = await axios.get('/api/ai/advanced-analytics/');
        setAiAnalytics(aiResponse.data);
      } catch (aiErr) {
        console.error('Error fetching AI analytics:', aiErr);
      } finally {
        setAiLoading(false);
      }

      setLoading(false);
    };

    fetchData();
  }, [timeRange, department]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleTimeRangeChange = (event) => {
    setTimeRange(event.target.value);
  };

  const handleDepartmentChange = (event) => {
    setDepartment(event.target.value);
  };

  // Mock data for development/demo purposes
  const getMockData = () => {
    return {
      dashboard: {
        employeeCount: 105,
        newHires: 8,
        turnoverRate: 5.2,
        avgSatisfaction: 4.2
      },
      engagement: {
        engagementScore: 78,
        participationRate: 92,
        satisfactionTrend: [
          { month: 'Jan', score: 76 },
          { month: 'Feb', score: 75 },
          { month: 'Mar', score: 77 },
          { month: 'Apr', score: 78 },
          { month: 'May', score: 79 },
          { month: 'Jun', score: 78 }
        ],
        departmentEngagement: [
          { department: 'Engineering', score: 82 },
          { department: 'Sales', score: 76 },
          { department: 'Marketing', score: 79 },
          { department: 'HR', score: 85 },
          { department: 'Finance', score: 74 }
        ]
      },
      attrition: {
        riskEmployees: 12,
        riskPercentage: 11.4,
        riskByTenure: [
          { range: '0-1 years', percentage: 18 },
          { range: '1-2 years', percentage: 22 },
          { range: '2-5 years', percentage: 10 },
          { range: '5+ years', percentage: 5 }
        ],
        riskByDepartment: [
          { name: 'Engineering', value: 9 },
          { name: 'Sales', value: 15 },
          { name: 'Marketing', value: 12 },
          { name: 'HR', value: 6 },
          { name: 'Finance', value: 10 }
        ],
        keyFactors: [
          { factor: 'Compensation', impact: 85 },
          { factor: 'Career Growth', impact: 78 },
          { factor: 'Work-Life Balance', impact: 72 },
          { factor: 'Management', impact: 65 },
          { factor: 'Company Culture', impact: 60 }
        ]
      },
      turnover: {
        totalTurnover: 12,
        voluntaryTurnover: 8,
        involuntaryTurnover: 4,
        turnoverTrend: [
          { month: 'Jan', voluntary: 1, involuntary: 0 },
          { month: 'Feb', voluntary: 2, involuntary: 1 },
          { month: 'Mar', voluntary: 0, involuntary: 2 },
          { month: 'Apr', voluntary: 3, involuntary: 0 },
          { month: 'May', voluntary: 1, involuntary: 1 },
          { month: 'Jun', voluntary: 1, involuntary: 0 }
        ],
        turnoverByDepartment: [
          { department: 'Engineering', percentage: 8 },
          { department: 'Sales', percentage: 12 },
          { department: 'Marketing', percentage: 7 },
          { department: 'HR', percentage: 5 },
          { department: 'Finance', percentage: 9 }
        ],
        exitReasons: [
          { reason: 'Better Opportunity', count: 4 },
          { reason: 'Compensation', count: 3 },
          { reason: 'Work-Life Balance', count: 2 },
          { reason: 'Relocation', count: 2 },
          { reason: 'Performance', count: 1 }
        ]
      }
    };
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Custom colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Advanced Analytics
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Department</InputLabel>
            <Select
              value={department}
              label="Department"
              onChange={handleDepartmentChange}
            >
              <MenuItem value="all">All Departments</MenuItem>
              <MenuItem value="engineering">Engineering</MenuItem>
              <MenuItem value="sales">Sales</MenuItem>
              <MenuItem value="marketing">Marketing</MenuItem>
              <MenuItem value="hr">HR</MenuItem>
              <MenuItem value="finance">Finance</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={handleTimeRangeChange}
            >
              <MenuItem value="month">Last Month</MenuItem>
              <MenuItem value="quarter">Last Quarter</MenuItem>
              <MenuItem value="year">Last Year</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="analytics tabs">
          <Tab label="Overview" />
          <Tab label="Employee Engagement" />
          <Tab label="Attrition Analysis" />
          <Tab label="Turnover Metrics" />
        </Tabs>
      </Box>

      {/* Tab 1: Overview */}
      {tabValue === 0 && analyticsData && (
        <Grid container spacing={3}>
          {/* KPI Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Total Employees
              </Typography>
              <Typography variant="h3" color="primary">
                {analyticsData.dashboard.employeeCount}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                New Hires (Quarter)
              </Typography>
              <Typography variant="h3" color="primary">
                {analyticsData.dashboard.newHires}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Turnover Rate
              </Typography>
              <Typography variant="h3" color="primary">
                {analyticsData.dashboard.turnoverRate}%
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Avg. Satisfaction
              </Typography>
              <Typography variant="h3" color="primary">
                {analyticsData.dashboard.avgSatisfaction}/5
              </Typography>
            </Paper>
          </Grid>

          {/* AI Performance Predictions Section */}
          {aiAnalytics && aiAnalytics.performance_predictions && (
            <Grid item xs={12}>
              <Paper className="brutal-border brutal-shadow" sx={{ p: 3, mb: 1, backgroundColor: '#E0FF4F' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TrendingUpIcon sx={{ fontSize: 32, color: '#000' }} />
                  <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    AI Performance & Skills Forecast
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  {aiAnalytics.performance_predictions.map((pred, idx) => (
                    <Grid item xs={12} md={6} key={idx}>
                      <Box className="brutal-border" sx={{ p: 2, backgroundColor: '#fff', height: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{pred.department} Department</Typography>
                        <Typography variant="body1" sx={{ mt: 1, fontWeight: 700 }}>
                          Predicted Top Performers: <span style={{ color: '#4CAF50', fontSize: '1.2rem' }}>{pred.predicted_top_performers}</span>
                        </Typography>
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>TRENDING SKILLS:</Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {pred.skills_trending_up.map((skill, sIdx) => (
                              <Chip key={sIdx} label={skill} sx={{ fontWeight: 800, border: '2px solid #000', borderRadius: 0, backgroundColor: '#4ECDC4' }} />
                            ))}
                          </Box>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          )}

          {/* Department Engagement Comparison */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Department Engagement Comparison
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={analyticsData.engagement.departmentEngagement}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Engagement Score']} />
                  <Bar dataKey="score" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Satisfaction Trend */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Employee Satisfaction Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={analyticsData.engagement.satisfactionTrend}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[70, 90]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Satisfaction Score']} />
                  <Legend />
                  <Line type="monotone" dataKey="score" stroke="#2196f3" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: Employee Engagement */}
      {tabValue === 1 && analyticsData && (
        <Grid container spacing={3}>
          {/* Key Engagement Metrics */}
          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Overall Engagement Score
              </Typography>
              <Typography variant="h3" color="primary">
                {analyticsData.engagement.engagementScore}%
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Survey Participation Rate
              </Typography>
              <Typography variant="h3" color="primary">
                {analyticsData.engagement.participationRate}%
              </Typography>
            </Paper>
          </Grid>

          {/* AI Sentiment Analysis Section */}
          {aiAnalytics && aiAnalytics.sentiment_analysis && (
            <Grid item xs={12}>
              <Paper className="brutal-border brutal-shadow" sx={{ p: 3, mb: 1, backgroundColor: '#4ECDC4' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <PsychologyIcon sx={{ fontSize: 32, color: '#000' }} />
                  <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    AI Sentiment Analysis (From Internal Feedback)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box className="brutal-border" sx={{ p: 2, backgroundColor: '#fff' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Overall Sentiment Score: <span style={{ color: aiAnalytics.sentiment_analysis.overall_score > 70 ? '#4CAF50' : '#FF6B6B', fontSize: '1.2rem' }}>{aiAnalytics.sentiment_analysis.overall_score}/100</span> (Trend: {aiAnalytics.sentiment_analysis.trend})</Typography>
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 1 }}>KEY THEMES:</Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {aiAnalytics.sentiment_analysis.key_themes.map((theme, idx) => (
                      <Chip
                        key={idx}
                        icon={theme.sentiment === 'positive' ? <TrendingUpIcon /> : <WarningAmberIcon />}
                        label={`${theme.theme} (${theme.score})`}
                        sx={{
                          fontWeight: 800,
                          border: '2px solid #000',
                          borderRadius: 0,
                          backgroundColor: theme.sentiment === 'positive' ? '#E0FF4F' : '#FF6B6B',
                          color: '#000',
                          padding: 1
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Department Comparison */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Department Engagement Radar
              </Typography>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart outerRadius={150} data={analyticsData.engagement.departmentEngagement}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="department" />
                  <PolarRadiusAxis domain={[0, 100]} />
                  <Radar
                    name="Engagement Score"
                    dataKey="score"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Tooltip formatter={(value) => [`${value}%`, 'Engagement Score']} />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Attrition Analysis */}
      {tabValue === 2 && analyticsData && (
        <Grid container spacing={3}>
          {/* Attrition Key Metrics */}
          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Employees at Risk
              </Typography>
              <Typography variant="h3" color="error">
                {analyticsData.attrition.riskEmployees}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                ({analyticsData.attrition.riskPercentage}% of workforce)
              </Typography>
            </Paper>
          </Grid>

          {/* Risk by Tenure */}
          <Grid item xs={12} sm={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Attrition Risk by Tenure
              </Typography>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={analyticsData.attrition.riskByTenure}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis domain={[0, 25]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Risk Percentage']} />
                  <Bar dataKey="percentage" fill="#f44336" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* AI Flight Risk Detection */}
          {aiAnalytics && aiAnalytics.flight_risk && (
            <Grid item xs={12}>
              <Paper className="brutal-border brutal-shadow" sx={{ p: 3, mb: 1, backgroundColor: '#FF6B6B' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <SmartToyIcon sx={{ fontSize: 32, color: '#000' }} />
                  <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    AI Flight Risk Watchlist
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  {aiAnalytics.flight_risk.map((risk, idx) => (
                    <Grid item xs={12} md={6} key={idx}>
                      <Box className="brutal-border" sx={{ p: 2, backgroundColor: '#fff', height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>{risk.department}</Typography>
                          <Chip label={`${risk.risk_level} RISK`} size="small" sx={{ fontWeight: 800, border: '2px solid #000', borderRadius: 0, backgroundColor: risk.risk_level === 'High' ? '#FF5252' : '#FFD54F', color: '#000' }} />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          <strong>AI Diagnosis:</strong> {risk.reason}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          )}

          {/* Risk by Department */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Attrition Risk by Department
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.attrition.riskByDepartment}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {analyticsData.attrition.riskByDepartment.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} employees`, 'At Risk']} />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Key Attrition Factors */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Key Attrition Factors
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  layout="vertical"
                  data={analyticsData.attrition.keyFactors}
                  margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="factor" type="category" />
                  <Tooltip formatter={(value) => [`${value}%`, 'Impact on Attrition']} />
                  <Bar dataKey="impact" fill="#ff9800" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 4: Turnover Metrics */}
      {tabValue === 3 && analyticsData && (
        <Grid container spacing={3}>
          {/* Turnover Key Metrics */}
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Total Turnover
              </Typography>
              <Typography variant="h3" color="error">
                {analyticsData.turnover.totalTurnover}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Voluntary
              </Typography>
              <Typography variant="h3" color="primary">
                {analyticsData.turnover.voluntaryTurnover}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2, height: '100%', textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                Involuntary
              </Typography>
              <Typography variant="h3" color="secondary">
                {analyticsData.turnover.involuntaryTurnover}
              </Typography>
            </Paper>
          </Grid>

          {/* Turnover Trend */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Turnover Trend
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={analyticsData.turnover.turnoverTrend}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="voluntary" stackId="a" fill="#2196f3" />
                  <Bar dataKey="involuntary" stackId="a" fill="#f44336" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Exit Reasons */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Exit Reasons
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analyticsData.turnover.exitReasons}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ reason, percent }) => `${reason}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    nameKey="reason"
                  >
                    {analyticsData.turnover.exitReasons.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} employees`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>

          {/* Turnover by Department */}
          <Grid item xs={12}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                Turnover Rate by Department
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={analyticsData.turnover.turnoverByDepartment}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis domain={[0, 15]} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Turnover Rate']} />
                  <Bar dataKey="percentage" fill="#ff5722" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Action buttons */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            analyticsService.generateAnalyticsReport({
              tabValue,
              timeRange,
              department
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
              setError('Failed to generate report. Please try again later.');
            });
          }}
        >
          Export as PDF
        </Button>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            analyticsService.saveCustomDashboard({
              name: `Custom Dashboard ${new Date().toLocaleDateString()}`,
              filters: { tabValue, timeRange, department }
            }).then(() => {
              console.log('Dashboard saved');
              // You could show a success message here
            }).catch(err => {
              console.error('Error saving dashboard:', err);
              setError('Failed to save dashboard. Please try again later.');
            });
          }}
        >
          Save Dashboard
        </Button>
      </Box>

      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdvancedAnalytics; 