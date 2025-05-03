import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Pagination,
  CircularProgress,
  Divider,
  Card,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import EmployeeCard from './EmployeeCard';
import EmployeeAddEdit from './EmployeeAddEdit';
import { employeeService } from '../../services/employeeService';
import { useSnackbar } from 'notistack';

const EmployeeList = () => {
  // State management
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [page, setPage] = useState(1);
  const [employeesPerPage] = useState(1000);
  const { enqueueSnackbar } = useSnackbar();
  
  // Fetch employees and reference data on component mount
  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchRoles();
  }, []);
  
  // Filter employees when filter criteria change
  useEffect(() => {
    filterEmployees();
  }, [employees, searchTerm, departmentFilter, statusFilter, roleFilter]);
  
  // Fetch employees from API
  const fetchEmployees = async () => {
    setLoading(true);
    try {
      console.log('🔍 EMPLOYEE LIST: Fetching employees from API...');
      // Add cache busting parameter to ensure fresh data
      const data = await employeeService.getAllEmployees({
        _t: new Date().getTime(),
        cache: 'no-cache'
      });
      console.log('🔍 EMPLOYEE LIST: Received employee data:', data);
      console.log(`🔍 EMPLOYEE LIST: Found ${data.length} employees`);
      
      // Check if data has expected format
      if (!Array.isArray(data)) {
        console.error('❌ EMPLOYEE LIST: Employee data is not an array:', data);
        enqueueSnackbar('Invalid employee data format received', { variant: 'error' });
        setEmployees([]);
        setLoading(false);
        return;
      }
      
      // Log all employee data for debugging
      console.log('🔍 EMPLOYEE LIST: All employee data:', JSON.stringify(data));
      
      // Ensure all required fields are present
      if (data.length > 0) {
        const sampleEmployee = data[0];
        console.log('🔍 EMPLOYEE LIST: Sample employee data:', sampleEmployee);
        
        // Check if key fields are available
        if (!sampleEmployee.id && !sampleEmployee._id) {
          console.warn('⚠️ EMPLOYEE LIST: Employee data missing ID field');
        }
        
        if (!sampleEmployee.name && !(sampleEmployee.first_name || sampleEmployee.last_name)) {
          console.warn('⚠️ EMPLOYEE LIST: Employee data missing name fields');
        }
      }
      
      setEmployees(data);
      // Apply filters when data changes
      filterEmployees(data);
    } catch (error) {
      console.error('❌ EMPLOYEE LIST: Error fetching employees:', error);
      console.error('❌ EMPLOYEE LIST: Error details:', error.response?.data || error.message || error);
      enqueueSnackbar(`Error fetching employees: ${error.message}`, { variant: 'error' });
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch departments for filter dropdown
  const fetchDepartments = async () => {
    try {
      const data = await employeeService.getDepartments();
      setDepartments(data);
    } catch (error) {
      enqueueSnackbar(`Error fetching departments: ${error.message}`, { variant: 'error' });
    }
  };
  
  // Fetch roles for filter dropdown
  const fetchRoles = async () => {
    try {
      const data = await employeeService.getRoles();
      setRoles(data);
    } catch (error) {
      enqueueSnackbar(`Error fetching roles: ${error.message}`, { variant: 'error' });
    }
  };
  
  // Filter employees based on search and dropdown filters
  const filterEmployees = (employeeData = employees) => {
    let filtered = [...employeeData];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        emp => 
          emp.name?.toLowerCase().includes(term) || 
          (emp.first_name && emp.first_name.toLowerCase().includes(term)) ||
          (emp.last_name && emp.last_name.toLowerCase().includes(term)) ||
          emp.email?.toLowerCase().includes(term) ||
          emp.employee_id?.toLowerCase().includes(term)
      );
    }
    
    // Apply department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(emp => emp.department === departmentFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(emp => emp.status === statusFilter);
    }
    
    // Apply role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(emp => emp.role === roleFilter);
    }
    
    setFilteredEmployees(filtered);
  };
  
  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('all');
    setStatusFilter('all');
    setRoleFilter('all');
  };
  
  // Handle dialog open for adding new employee
  const handleAddEmployee = () => {
    setCurrentEmployee(null);
    setDialogOpen(true);
  };
  
  // Handle dialog open for editing employee
  const handleEditEmployee = (employee) => {
    setCurrentEmployee(employee);
    setDialogOpen(true);
  };
  
  // Handle saving employee (create or update)
  const handleSaveEmployee = async (employeeData) => {
    setLoading(true);
    try {
      console.log('🔍 EMPLOYEE LIST: Saving employee data:', employeeData);
      
      if (currentEmployee) {
        // Update existing employee
        console.log(`🔍 EMPLOYEE LIST: Updating employee with ID ${currentEmployee.id || currentEmployee._id}`);
        await employeeService.updateEmployee(currentEmployee.id || currentEmployee._id, employeeData);
        enqueueSnackbar('Employee updated successfully', { variant: 'success' });
      } else {
        // Create new employee
        console.log('🔍 EMPLOYEE LIST: Creating new employee');
        const newEmployee = await employeeService.createEmployee(employeeData);
        console.log('🔍 EMPLOYEE LIST: Created employee:', newEmployee);
        enqueueSnackbar('Employee created successfully', { variant: 'success' });
      }
      
      setDialogOpen(false);
      console.log('🔍 EMPLOYEE LIST: Refreshing employee list');
      
      // Add delay to ensure backend has processed the changes
      setTimeout(() => {
        fetchEmployees(); // Refresh employees list
      }, 500);
      
    } catch (error) {
      console.error('❌ EMPLOYEE LIST: Error saving employee:', error);
      console.error('❌ EMPLOYEE LIST: Error details:', error.response?.data || error.message || error);
      enqueueSnackbar(`Error saving employee: ${error.message}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle employee deletion
  const handleDeleteEmployee = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      setLoading(true);
      try {
        await employeeService.deleteEmployee(id);
        fetchEmployees(); // Refresh employees list
        enqueueSnackbar('Employee deleted successfully', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar(`Error deleting employee: ${error.message}`, { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };
  
  // Handle pagination change
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  // Get employees for current page
  const indexOfLastEmployee = page * employeesPerPage;
  const indexOfFirstEmployee = indexOfLastEmployee - employeesPerPage;
  const currentEmployees = filteredEmployees.slice(indexOfFirstEmployee, indexOfLastEmployee);
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Employees
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddEmployee}
        >
          Add Employee
        </Button>
      </Box>
      
      <Card sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search by name, email or ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            size="small"
          />
          
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Department</InputLabel>
              <Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                label="Department"
              >
                <MenuItem value="all">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.name}>
                    {dept.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="On Leave">On Leave</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                label="Role"
              >
                <MenuItem value="all">All Roles</MenuItem>
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.name}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="body2" color="textSecondary">
              Showing {filteredEmployees.length} of {employees.length} employees
            </Typography>
          </Box>
          
          <Box>
            <Tooltip title="Reset Filters">
              <IconButton size="small" onClick={handleResetFilters}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Card>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : currentEmployees.length === 0 ? (
        <Box sx={{ textAlign: 'center', my: 4, p: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h6">No employees found</Typography>
          <Typography variant="body2" color="textSecondary">
            Try adjusting your search or filter criteria
          </Typography>
        </Box>
      ) : (
        <>
          <Grid container spacing={3}>
            {currentEmployees.map((employee) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={employee.id}>
                <EmployeeCard
                  employee={employee}
                  onEdit={handleEditEmployee}
                  onDelete={handleDeleteEmployee}
                  onViewDetails={(id) => console.log('View details for', id)}
                />
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Pagination
              count={Math.ceil(filteredEmployees.length / employeesPerPage)}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </>
      )}
      
      {/* Employee Add/Edit Dialog */}
      <EmployeeAddEdit
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveEmployee}
        employee={currentEmployee}
        departments={departments}
        roles={roles}
      />
    </Box>
  );
};

export default EmployeeList; 