import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import employeeService from '../../services/employeeService';

const EmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editedEmployee, setEditedEmployee] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [error, setError] = useState(null);
  
  // Load employee data based on ID
  useEffect(() => {
    const fetchEmployee = async () => {
      setLoading(true);
      setError(null);
      console.log(`Fetching employee with ID: ${id}`);
      
      try {
        // Try to fetch from API
        const response = await employeeService.getEmployeeById(id);
        console.log('Employee data received:', response);
        
        if (response) {
          // Ensure all required fields exist
          const employeeData = {
            _id: response._id || id,
            first_name: response.first_name || '',
            last_name: response.last_name || '',
            email: response.email || '',
            phone: response.phone || '',
            department: response.department_name || response.department || '',
            position: response.position || '',
            hire_date: response.hire_date || '',
            address: response.address || '',
            employment_status: response.employment_status || response.status || 'Active',
            employee_id: response.employee_id || '',
            manager_id: response.manager_id || '',
            department_id: response.department_id || ''
          };
          
          setEmployee(employeeData);
          setEditedEmployee({...employeeData}); // Copy for editing
        } else {
          console.error('No data received for employee');
          setError('No employee data found');
        }
      } catch (error) {
        console.error('Error fetching employee:', error);
        setError(error.message || 'Error loading employee data');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchEmployee();
    } else {
      console.error('No employee ID provided');
      setError('No employee ID provided');
      setLoading(false);
    }
  }, [id]);

  // Navigation back to directory
  const handleBackToDirectory = () => {
    navigate('/app/employees');
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Edit Profile handlers
  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    // Reset edited employee to original
    setEditedEmployee({...employee});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedEmployee({
      ...editedEmployee,
      [name]: value
    });
  };

  const handleSaveChanges = async () => {
    // Validate form
    if (!editedEmployee.first_name || !editedEmployee.last_name || !editedEmployee.email) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      // Call API to update employee
      const result = await employeeService.updateEmployee(employee._id, editedEmployee);
      console.log('Update result:', result);
      
      // Update local state
      setEmployee(editedEmployee);
      setEditDialogOpen(false);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Failed to update profile. Please try again.');
    }
  };

  // Delete employee handlers
  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteEmployee = async () => {
    try {
      // Call API to delete employee
      await employeeService.deleteEmployee(employee._id);
      
      alert('Employee deleted successfully!');
      navigate('/app/employees');
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee. Please try again.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <Typography variant="h5" color="error" gutterBottom>
          Error: {error}
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleBackToDirectory}
          sx={{ mt: 2 }}
        >
          Back to Directory
        </Button>
      </Box>
    );
  }

  if (!employee) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <Typography variant="h5" gutterBottom>
          Employee not found
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleBackToDirectory}
          sx={{ mt: 2 }}
        >
          Back to Directory
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Employee Profile
        </Typography>
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleEditClick}
            sx={{ mr: 2 }}
          >
            Edit Profile
          </Button>
          <Button 
            variant="outlined" 
            color="error" 
            onClick={handleDeleteClick}
          >
            Delete Employee
          </Button>
        </Box>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Avatar
                sx={{ width: 120, height: 120, mb: 2 }}
                alt={`${employee.first_name} ${employee.last_name}`}
                src="/static/avatar.jpg"
              >
                {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
              </Avatar>
              <Typography variant="h5">
                {employee.first_name} {employee.last_name}
              </Typography>
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {employee.position}
              </Typography>
              <Chip 
                label={employee.employment_status} 
                color={employee.employment_status === 'Active' ? 'success' : 
                       employee.employment_status === 'On Leave' ? 'warning' : 'error'} 
                sx={{ mt: 1 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={8}>
          <Card>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="General Info" />
              <Tab label="Employment" />
              <Tab label="Documents" />
            </Tabs>
            
            <CardContent>
              {tabValue === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight="bold">Email</Typography>
                    <Typography variant="body1">{employee.email}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight="bold">Phone</Typography>
                    <Typography variant="body1">{employee.phone}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" fontWeight="bold">Address</Typography>
                    <Typography variant="body1">{employee.address}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight="bold">Employee ID</Typography>
                    <Typography variant="body1">{employee.employee_id}</Typography>
                  </Grid>
                </Grid>
              )}
              
              {tabValue === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight="bold">Department</Typography>
                    <Typography variant="body1">{employee.department}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight="bold">Position</Typography>
                    <Typography variant="body1">{employee.position}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight="bold">Hire Date</Typography>
                    <Typography variant="body1">{employee.hire_date}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle1" fontWeight="bold">Status</Typography>
                    <Typography variant="body1">{employee.employment_status}</Typography>
                  </Grid>
                </Grid>
              )}
              
              {tabValue === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body1">No documents available.</Typography>
                    <Button variant="contained" sx={{ mt: 2 }}>
                      Upload Document
                    </Button>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={handleEditClose}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Edit Employee Profile</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={editedEmployee?.first_name || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={editedEmployee?.last_name || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={editedEmployee?.email || ''}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={editedEmployee?.phone || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={editedEmployee?.address || ''}
                onChange={handleInputChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                name="department"
                value={editedEmployee?.department || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Position"
                name="position"
                value={editedEmployee?.position || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Employee ID"
                name="employee_id"
                value={editedEmployee?.employee_id || ''}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="employment_status"
                  value={editedEmployee?.employment_status || 'Active'}
                  onChange={handleInputChange}
                  label="Status"
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="On Leave">On Leave</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button onClick={handleSaveChanges} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteClose}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {employee.first_name} {employee.last_name}? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteClose}>Cancel</Button>
          <Button onClick={handleDeleteEmployee} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeProfile; 