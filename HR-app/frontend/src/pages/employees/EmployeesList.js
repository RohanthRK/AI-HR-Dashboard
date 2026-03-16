import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Button,
  Card,
  MenuItem,
  IconButton,
  InputAdornment,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  Snackbar,
  Alert,
  Paper,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Clear as ClearIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { employeeService } from '../../services/employeeService';
import EmployeeCard from '../../components/employees/EmployeeCard';
import EmployeeAddEdit from '../../components/employees/EmployeeAddEdit';

const EmployeesList = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortOption, setSortOption] = useState('name_asc');
  const [departments, setDepartments] = useState([]);
  
  // Dialog states
  const [openAddEdit, setOpenAddEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  // Initial data load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [employeesData, departmentsData] = await Promise.all([
          employeeService.getAllEmployees({ limit: 1000 }), // Set a high limit to get all employees
          employeeService.getDepartments()
        ]);
        setEmployees(employeesData);
        setFilteredEmployees(employeesData);
        setDepartments(departmentsData);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load employees data');
        setIsLoading(false);
        console.error('Error fetching employees:', err);
      }
    };

    fetchData();
  }, []);

  // Filter and sort employees when dependencies change
  useEffect(() => {
    let result = [...employees];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        employee => 
          employee.name.toLowerCase().includes(query) ||
          employee.email.toLowerCase().includes(query) ||
          employee.role.toLowerCase().includes(query) ||
          employee.employee_id.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(employee => employee.status === statusFilter);
    }

    // Apply department filter
    if (departmentFilter !== 'all') {
      result = result.filter(employee => employee.department === departmentFilter);
    }

    // Apply sorting
    const [field, direction] = sortOption.split('_');
    result = result.sort((a, b) => {
      if (field === 'name') {
        return direction === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (field === 'date') {
        return direction === 'asc'
          ? new Date(a.joining_date) - new Date(b.joining_date)
          : new Date(b.joining_date) - new Date(a.joining_date);
      }
      return 0;
    });

    setFilteredEmployees(result);
  }, [employees, searchQuery, statusFilter, departmentFilter, sortOption]);

  // Handle add/edit dialog
  const handleOpenAddEdit = (employee = null) => {
    setSelectedEmployee(employee);
    setOpenAddEdit(true);
  };

  const handleCloseAddEdit = () => {
    setOpenAddEdit(false);
    setSelectedEmployee(null);
  };

  // Handle delete dialog
  const handleOpenDelete = (employee) => {
    setSelectedEmployee(employee);
    setOpenDelete(true);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
    setSelectedEmployee(null);
  };

  // Handle save employee (create or update)
  const handleSaveEmployee = async (employeeData) => {
    try {
      setIsLoading(true);
      if (selectedEmployee) {
        // Update existing employee
        await employeeService.updateEmployee(selectedEmployee.id, employeeData);
        setNotification({
          open: true,
          message: 'Employee updated successfully',
          severity: 'success'
        });
      } else {
        // Create new employee
        await employeeService.createEmployee(employeeData);
        setNotification({
          open: true,
          message: 'Employee created successfully',
          severity: 'success'
        });
      }
      // Refresh employee list
      const updatedEmployees = await employeeService.getAllEmployees();
      setEmployees(updatedEmployees);
      handleCloseAddEdit();
    } catch (err) {
      setNotification({
        open: true,
        message: `Failed to ${selectedEmployee ? 'update' : 'create'} employee: ${err.message}`,
        severity: 'error'
      });
      console.error('Error saving employee:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete employee
  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return;
    
    try {
      setIsLoading(true);
      await employeeService.deleteEmployee(selectedEmployee.id);
      
      // Update local state
      setEmployees(employees.filter(emp => emp.id !== selectedEmployee.id));
      setNotification({
        open: true,
        message: 'Employee deleted successfully',
        severity: 'success'
      });
      handleCloseDelete();
    } catch (err) {
      setNotification({
        open: true,
        message: `Failed to delete employee: ${err.message}`,
        severity: 'error'
      });
      console.error('Error deleting employee:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setSortOption('name_asc');
  };

  // Handle notification close
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Employees
        </Typography>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenAddEdit()}
        >
          Add Employee
        </Button>
      </Box>

      {/* Filters and Search Section */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <TextField
            placeholder="Search employees..."
            variant="outlined"
            size="small"
            fullWidth
            sx={{ maxWidth: 300 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterIcon sx={{ mr: 1, color: 'action.active' }} />
              <TextField
                select
                label="Status"
                size="small"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="On Leave">On Leave</MenuItem>
              </TextField>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FilterIcon sx={{ mr: 1, color: 'action.active' }} />
              <TextField
                select
                label="Department"
                size="small"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="all">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SortIcon sx={{ mr: 1, color: 'action.active' }} />
              <TextField
                select
                label="Sort By"
                size="small"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="name_asc">Name (A-Z)</MenuItem>
                <MenuItem value="name_desc">Name (Z-A)</MenuItem>
                <MenuItem value="date_asc">Joining Date (Oldest)</MenuItem>
                <MenuItem value="date_desc">Joining Date (Newest)</MenuItem>
              </TextField>
            </Box>
            
            <IconButton 
              color="primary" 
              onClick={handleResetFilters}
              title="Reset filters"
            >
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {filteredEmployees.length} employees found
            {filteredEmployees.length !== employees.length && 
              ` (filtered from ${employees.length})`}
          </Typography>
        </Box>
      </Paper>

      {/* Employees Grid */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}
      
      {!isLoading && !error && filteredEmployees.length === 0 && (
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No employees found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchQuery || statusFilter !== 'all' || departmentFilter !== 'all' 
              ? 'Try changing your search criteria or filters' 
              : 'Click the "Add Employee" button to create your first employee'}
          </Typography>
        </Card>
      )}
      
      {!isLoading && !error && filteredEmployees.length > 0 && (
        <Grid container spacing={3}>
          {filteredEmployees.map((employee) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={employee.id}>
              <EmployeeCard
                employee={employee}
                onEdit={() => handleOpenAddEdit(employee)}
                onDelete={() => handleOpenDelete(employee)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Employee Dialog */}
      <Dialog 
        open={openAddEdit} 
        onClose={handleCloseAddEdit}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>
          {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
        </DialogTitle>
        <DialogContent dividers>
          <EmployeeAddEdit
            employee={selectedEmployee}
            departments={departments}
            onSave={handleSaveEmployee}
            onCancel={handleCloseAddEdit}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDelete}
        onClose={handleCloseDelete}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete employee "{selectedEmployee?.name}"? 
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>Cancel</Button>
          <Button 
            onClick={handleDeleteEmployee} 
            color="error" 
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default EmployeesList; 