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
  TableRow
} from '@mui/material';
import GetAppIcon from '@mui/icons-material/GetApp';
import VisibilityIcon from '@mui/icons-material/Visibility';

const Payroll = () => {
  const [loading, setLoading] = useState(true);
  
  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  // Mock data for payroll
  const mockPayslips = [
    { id: 1, period: 'January 2023', date: '2023-01-31', amount: '$3,500.00', status: 'Paid' },
    { id: 2, period: 'February 2023', date: '2023-02-28', amount: '$3,500.00', status: 'Paid' },
    { id: 3, period: 'March 2023', date: '2023-03-31', amount: '$3,750.00', status: 'Paid' },
  ];

  // Mock salary breakdown
  const salarySummary = {
    basicSalary: '$3,000.00',
    houseRentAllowance: '$500.00',
    transportAllowance: '$200.00',
    medicalAllowance: '$150.00',
    bonus: '$250.00',
    tax: '$400.00',
    providentFund: '$150.00',
    netSalary: '$3,550.00'
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
            <List>
              <ListItem>
                <ListItemText primary="Basic Salary" secondary={salarySummary.basicSalary} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="House Rent Allowance" secondary={salarySummary.houseRentAllowance} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="Transport Allowance" secondary={salarySummary.transportAllowance} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="Medical Allowance" secondary={salarySummary.medicalAllowance} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="Bonus" secondary={salarySummary.bonus} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="Tax Deduction" secondary={salarySummary.tax} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText primary="Provident Fund" secondary={salarySummary.providentFund} />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary={<Typography variant="subtitle1" fontWeight="bold">Net Salary</Typography>} 
                  secondary={<Typography variant="subtitle1" color="primary" fontWeight="bold">{salarySummary.netSalary}</Typography>} 
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
        
        {/* Current Month */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                  Current Month
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
                <Typography variant="body1">{salarySummary.netSalary}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
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
                  {mockPayslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell>{payslip.period}</TableCell>
                      <TableCell>{payslip.date}</TableCell>
                      <TableCell>{payslip.amount}</TableCell>
                      <TableCell>{payslip.status}</TableCell>
                      <TableCell>
                        <IconButton size="small" title="View Payslip">
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" title="Download PDF">
                          <GetAppIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
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