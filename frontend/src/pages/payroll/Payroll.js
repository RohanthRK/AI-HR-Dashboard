import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import axios from 'axios';
import Chip from '@mui/material/Chip';

const Payroll = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [historyRes, summaryRes] = await Promise.all([
          axios.get('/api/payroll/me/'),
          axios.get('/api/payroll/summary/')
        ]);
        setHistory(historyRes.data.results || []);
        setSummary(summaryRes.data.summary || null);
      } catch (error) {
        console.error("Error fetching payroll data:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchAiInsights = async () => {
      try {
        const response = await axios.get('/api/ai/payroll-anomalies/');
        setAiInsights(response.data);
      } catch (error) {
        console.error("Error fetching AI Insights:", error);
      } finally {
        setAiInsightsLoading(false);
      }
    };

    fetchData();
    fetchAiInsights();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Payroll
      </Typography>

      <Grid container spacing={3}>
        {/* Salary Summary */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Salary Summary
            </Typography>
            {summary ? (
              <List>
                <ListItem>
                  <ListItemText primary="Basic Salary" secondary={summary.basicSalary} />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="House Rent Allowance" secondary={summary.houseRentAllowance} />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="Transport Allowance" secondary={summary.transportAllowance} />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="Medical Allowance" secondary={summary.medicalAllowance} />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="Bonus" secondary={summary.bonus} />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="Tax Deduction" secondary={summary.tax} />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText primary="Provident Fund" secondary={summary.providentFund} />
                </ListItem>
                <Divider />
                <ListItem>
                  <ListItemText
                    primary={<Typography variant="subtitle1" fontWeight="bold">Net Salary</Typography>}
                    secondary={<Typography variant="subtitle1" color="primary" fontWeight="bold">{summary.netSalary}</Typography>}
                  />
                </ListItem>
              </List>
            ) : (
              <Alert severity="warning">No salary summary available. Please contact HR.</Alert>
            )}
          </Paper>
        </Grid>

        {/* Current Month */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Current Month Cycle
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                  {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Typography variant="body1">Processing</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Expected Payment Date</Typography>
                <Typography variant="body1">31st {new Date().toLocaleString('default', { month: 'long' })}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Expected Amount</Typography>
                <Typography variant="body1">{summary?.netSalary || 'N/A'}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ... AI Insights ... */}

        {/* Payslip History */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Payslip History
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Period</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.length > 0 ? history.map((payslip) => (
                    <TableRow key={payslip._id}>
                      <TableCell>{payslip.period}</TableCell>
                      <TableCell>{payslip.date}</TableCell>
                      <TableCell>${payslip.net_salary?.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip label={payslip.status} size="small" color={payslip.status === 'Paid' ? 'success' : 'warning'} />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" title="View Payslip">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" title="Download PDF">
                          <GetAppIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No payslip records found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="outlined" startIcon={<GetAppIcon />}>
                Download All
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Payroll; 