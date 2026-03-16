import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  TextField,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TablePagination,
  Snackbar,
  Alert
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import FilterListIcon from '@mui/icons-material/FilterList';
import employeeService from '../../services/employeeService';

const Directory = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [departmentCounts, setDepartmentCounts] = useState({});
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [newEmployee, setNewEmployee] = useState({
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    department_id: '',
    position: '',
    phone: '',
    address: '',
    employment_status: 'Active',
    employment_type: 'Full-time',
    hire_date: new Date().toISOString().split('T')[0], // Default to today
    salary: '',
    leave_balance: 20, // Default value
    team: '',
    team_id: '',
    manager_id: ''
  });
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  
  // Load employees from API
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    console.log('🔍 DIRECTORY PAGE: Starting API call to fetch employees...');
    const startTime = new Date().getTime();
    setLoading(true);
    try {
      // Get employees from API - pass pagination parameters with cache busting
      console.log('🔍 DIRECTORY PAGE: Calling employeeService.getAllEmployees()...');
      const response = await employeeService.getAllEmployees({
        limit: 20,  // Request 20 employees at once
        page: 1,
        _t: new Date().getTime() // Add timestamp to prevent caching
      });
      const endTime = new Date().getTime();
      console.log(`🔍 DIRECTORY PAGE: API call completed in ${endTime - startTime}ms`);
      console.log('🔍 DIRECTORY PAGE: Employees fetched:', response);
      console.log(`🔍 DIRECTORY PAGE: Received ${response ? response.length : 0} employees`);
      
      // Check response structure
      if (!response || !Array.isArray(response)) {
        console.error('❌ DIRECTORY PAGE: Invalid response format, expected array but got:', response);
        setNotification({
          open: true,
          message: 'Invalid employee data received. Please refresh the page.',
          severity: 'error'
        });
        return;
      }
      
      // Verify employee data has expected fields
      if (response.length > 0) {
        const firstEmployee = response[0];
        console.log('🔍 DIRECTORY PAGE: Sample employee data:', firstEmployee);
        
        // Check for essential fields
        if (!firstEmployee._id) {
          console.warn('⚠️ DIRECTORY PAGE: Employee data is missing _id field', firstEmployee);
        }
        if (!firstEmployee.email) {
          console.warn('⚠️ DIRECTORY PAGE: Employee data is missing email field', firstEmployee);
        }
      }
      
      setEmployees(response);
      setFilteredEmployees(response);
      
      // Calculate department counts for the summary cards
      const deptCounts = response.reduce((counts, emp) => {
        const dept = emp.department || 'Unknown';
        counts[dept] = (counts[dept] || 0) + 1;
        return counts;
      }, {});
      setDepartmentCounts(deptCounts);
    } catch (error) {
      console.error('❌ DIRECTORY PAGE: Error fetching employees:', error);
      console.error('❌ DIRECTORY PAGE: Error details:', error.response || error.message || error);
      setNotification({
        open: true,
        message: 'Failed to load employees. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
      console.log('🔍 DIRECTORY PAGE: Finished loading employees');
    }
  };

  // Filter employees based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredEmployees(employees);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = employees.filter(
      employee => 
        (employee.first_name && employee.first_name.toLowerCase().includes(query)) ||
        (employee.last_name && employee.last_name.toLowerCase().includes(query)) ||
        (employee.email && employee.email.toLowerCase().includes(query)) ||
        (employee.department && employee.department.toLowerCase().includes(query)) ||
        (employee.position && employee.position.toLowerCase().includes(query))
    );
    
    setFilteredEmployees(filtered);
    setPage(0); // Reset to first page when searching
  }, [searchQuery, employees]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleViewProfile = (employeeId) => {
    console.log("Navigating to employee profile with ID:", employeeId);
    navigate(`/employees/${employeeId}`);
  };

  const getStatusColor = (status) => {
    if (!status) return 'default';
    
    const normalizedStatus = status.toLowerCase();
    switch(normalizedStatus) {
      case 'active': return 'success';
      case 'on leave': return 'warning';
      case 'inactive': return 'error';
      default: return 'default';
    }
  };

  // Add Employee Dialog handlers
  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    // Reset form
    setNewEmployee({
      first_name: '',
      last_name: '',
      email: '',
      department: '',
      department_id: '',
      position: '',
      phone: '',
      address: '',
      employment_status: 'Active',
      employment_type: 'Full-time',
      hire_date: new Date().toISOString().split('T')[0], // Default to today
      salary: '',
      leave_balance: 20, // Default value
      team: '',
      team_id: '',
      manager_id: ''
    });
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee({
      ...newEmployee,
      [name]: value
    });
  };

  const handleAddEmployee = async () => {
    // Validate form
    const requiredFields = ['first_name', 'last_name', 'email'];
    const missingFields = requiredFields.filter(field => !newEmployee[field]);
    
    if (missingFields.length > 0) {
      setNotification({
        open: true,
        message: `Please fill in all required fields: ${missingFields.join(', ')}`,
        severity: 'error'
      });
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmployee.email)) {
      setNotification({
        open: true,
        message: 'Please enter a valid email address',
        severity: 'error'
      });
      return;
    }
    
    // Show loading state
    setLoading(true);
    
    try {
      console.log('🔍 DIRECTORY PAGE: Adding new employee:', newEmployee);
      
      // Add an employee_id if not provided
      const employeeToAdd = { 
        ...newEmployee,
        // Generate a simple employee ID if not provided
        employee_id: newEmployee.employee_id || `EMP${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`
      };
      
      console.log('🔍 DIRECTORY PAGE: Calling employeeService.createEmployee with:', employeeToAdd);
      
      // Call API to create employee
      const response = await employeeService.createEmployee(employeeToAdd);
      console.log('🔍 DIRECTORY PAGE: Employee added successfully, API response:', response);
      
      // Close dialog
      handleCloseDialog();
      
      console.log('🔍 DIRECTORY PAGE: Now refreshing employee list...');
      // Refresh the employee list from the server to get the properly created record
      await fetchEmployees();
      console.log('🔍 DIRECTORY PAGE: Employee list refreshed, employee count:', employees.length);
      
      // Verify if the newly created employee exists in the list
      const employeeExists = employees.some(emp => 
        emp._id === response._id || 
        (emp.email === employeeToAdd.email && emp.first_name === employeeToAdd.first_name)
      );
      console.log('🔍 DIRECTORY PAGE: New employee exists in list?', employeeExists);
      
      // If the employee wasn't found in the list, try another refresh after a short delay
      if (!employeeExists) {
        console.log('🔍 DIRECTORY PAGE: Employee not found in list, scheduling refresh...');
        setTimeout(() => {
          console.log('🔍 DIRECTORY PAGE: Performing delayed refresh...');
          fetchEmployees();
        }, 1000);
      }
      
      // Show success message
      setNotification({
        open: true,
        message: 'Employee added successfully!',
        severity: 'success'
      });
    } catch (error) {
      console.error('❌ DIRECTORY PAGE: Error adding employee:', error);
      
      // Get a meaningful error message
      let errorMessage = 'Failed to add employee. Please try again.';
      if (error.response && error.response.data && error.response.data.message) {
        errorMessage = `Failed to add employee: ${error.response.data.message}`;
      } else if (error.response && error.response.data && error.response.data.error) {
        errorMessage = `Failed to add employee: ${error.response.data.error}`;
      } else if (error.message) {
        errorMessage = `Failed to add employee: ${error.message}`;
      }
      
      setNotification({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Prepare department summary information from actual data
  const departmentSummary = Object.entries(departmentCounts).map(([name, count]) => ({
    name,
    count
  }));

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Get current page of employees
  const currentEmployees = filteredEmployees.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Employee Directory
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<PersonAddIcon />}
          onClick={handleOpenDialog}
        >
          Add Employee
        </Button>
      </Box>
      
      {/* Department summary cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {departmentSummary.map((dept) => (
          <Grid item xs={6} sm={4} md={2.4} key={dept.name}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 1 }}>
                <Typography variant="h6" component="div">
                  {dept.count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dept.name}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Search and Filters */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            variant="outlined"
            placeholder="Search employees..."
            size="small"
            fullWidth
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <IconButton sx={{ ml: 1 }}>
            <FilterListIcon />
          </IconButton>
        </Box>
      </Box>
      
      {/* Employee List */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentEmployees.map((employee) => (
                <TableRow key={employee._id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Avatar sx={{ mr: 2 }}>
                        {employee.first_name?.charAt(0) || ''}{employee.last_name?.charAt(0) || ''}
                      </Avatar>
                      {employee.first_name} {employee.last_name}
                    </Box>
                  </TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.department}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    <Chip 
                      label={employee.status || 'Active'} 
                      color={getStatusColor(employee.status)} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      size="small" 
                      onClick={() => handleViewProfile(employee._id)}
                      variant="outlined"
                    >
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredEmployees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No employees found matching your search criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 20, 50]}
          component="div"
          count={filteredEmployees.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Add Employee Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Add New Employee</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="First Name"
                name="first_name"
                value={newEmployee.first_name}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Last Name"
                name="last_name"
                value={newEmployee.last_name}
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
                value={newEmployee.email}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                name="phone"
                value={newEmployee.phone}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Department"
                name="department"
                value={newEmployee.department}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Position"
                name="position"
                value={newEmployee.position}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Hire Date"
                name="hire_date"
                type="date"
                value={newEmployee.hire_date}
                onChange={handleInputChange}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Salary"
                name="salary"
                type="number"
                value={newEmployee.salary}
                onChange={handleInputChange}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="employment-type-label">Employment Type</InputLabel>
                <Select
                  labelId="employment-type-label"
                  name="employment_type"
                  value={newEmployee.employment_type}
                  onChange={handleInputChange}
                  label="Employment Type"
                >
                  <MenuItem value="Full-time">Full-time</MenuItem>
                  <MenuItem value="Part-time">Part-time</MenuItem>
                  <MenuItem value="Contract">Contract</MenuItem>
                  <MenuItem value="Temporary">Temporary</MenuItem>
                  <MenuItem value="Intern">Intern</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel id="status-label">Status</InputLabel>
                <Select
                  labelId="status-label"
                  name="employment_status"
                  value={newEmployee.employment_status}
                  onChange={handleInputChange}
                  label="Status"
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="On Leave">On Leave</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Leave Balance"
                name="leave_balance"
                type="number"
                value={newEmployee.leave_balance}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Team"
                name="team"
                value={newEmployee.team}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Address"
                name="address"
                value={newEmployee.address}
                onChange={handleInputChange}
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAddEmployee} variant="contained">Add Employee</Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Directory; 