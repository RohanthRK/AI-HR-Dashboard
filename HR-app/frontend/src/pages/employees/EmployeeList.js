import React, { useState, useEffect, useContext } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  IconButton, 
  TextField, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  TablePagination,
  Tooltip,
  MenuItem,
  Menu,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  LinearProgress,
  Grid,
  Avatar,
  Chip,
  InputAdornment
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  MoreVert as MoreVertIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { employeeService } from '../../services/employeeService';
import { AuthContext } from '../../contexts/AuthContext';
import EmployeeAddEdit from '../../components/employees/EmployeeAddEdit';

const EmployeeList = () => {
  // State management
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [searchQuery, setSearchQuery] = useState('');
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    department: '',
    role: '',
    status: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [openAddEditDialog, setOpenAddEditDialog] = useState(false);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [actionMenuAnchorEl, setActionMenuAnchorEl] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  // Hooks
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { userRole } = useContext(AuthContext);
  const canManageEmployees = ['admin', 'hr_manager'].includes(userRole);

  // Load employees and other data on component mount
  useEffect(() => {
    // Network test
    const testApiConnection = async () => {
      try {
        console.log('Testing API connectivity...');
        const apiRoot = 'http://localhost:8000/api/';
        const endpoints = [
          '',  // API root
          'employees/',
          'employees/debug/'
        ];
        
        for (const endpoint of endpoints) {
          const startTime = Date.now();
          try {
            const response = await fetch(apiRoot + endpoint, {
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              method: 'GET',
              mode: 'cors',
              cache: 'no-cache'
            });
            
            const endTime = Date.now();
            console.log(`Endpoint ${apiRoot + endpoint}: ${response.status} (${endTime - startTime}ms)`);
            
            if (response.ok) {
              const data = await response.json();
              console.log(`Success! Data:`, data);
            } else {
              console.log(`Error! Status: ${response.status}`);
              try {
                const errorData = await response.text();
                console.log(`Error text: ${errorData.substring(0, 200)}...`);
              } catch (e) {
                console.log('Could not read error response body');
              }
            }
          } catch (e) {
            console.log(`Network error for ${apiRoot + endpoint}: ${e.message}`);
          }
        }
      } catch (error) {
        console.error('Connection test failed:', error);
      }
    };
    
    testApiConnection();
    fetchEmployeeData();
    fetchDepartmentsAndRoles();
  }, []);

  // Apply filters and search whenever employees or filters change
  useEffect(() => {
    let result = [...employees];

    // Apply search filter
    if (searchQuery) {
      const lowerCaseQuery = searchQuery.toLowerCase();
      result = result.filter(
        employee => 
          employee.name.toLowerCase().includes(lowerCaseQuery) ||
          employee.email.toLowerCase().includes(lowerCaseQuery) ||
          employee.employee_id.toLowerCase().includes(lowerCaseQuery)
      );
    }

    // Apply category filters
    if (selectedFilters.department) {
      result = result.filter(employee => employee.department === selectedFilters.department);
    }

    if (selectedFilters.role) {
      result = result.filter(employee => employee.role === selectedFilters.role);
    }

    if (selectedFilters.status) {
      result = result.filter(employee => employee.status === selectedFilters.status);
    }

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredEmployees(result);
  }, [employees, searchQuery, selectedFilters, sortConfig]);

  // Fetch employees data
  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      // Request all employees with a high limit
      const data = await employeeService.getAllEmployees({
        limit: 100,  // Request up to 100 employees
        page: 1
      });
      console.log(`Employee data from API: ${data.length} employees loaded`);
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (error) {
      console.error('Error fetching employees:', error);
      enqueueSnackbar('Failed to load employees', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments and roles for filtering
  const fetchDepartmentsAndRoles = async () => {
    try {
      const [deptData, roleData] = await Promise.all([
        employeeService.getDepartments(),
        employeeService.getRoles()
      ]);
      setDepartments(deptData);
      setRoles(roleData);
    } catch (error) {
      console.error('Error fetching filter data:', error);
    }
  };

  // Handle dialog open/close for adding/editing employees
  const handleOpenAddEditDialog = (employee = null) => {
    setCurrentEmployee(employee);
    setOpenAddEditDialog(true);
    setActionMenuAnchorEl(null);
  };

  const handleCloseAddEditDialog = () => {
    setOpenAddEditDialog(false);
    setCurrentEmployee(null);
  };

  // Handle employee save after add/edit
  const handleSaveEmployee = async (employeeData) => {
    setLoading(true);
    try {
      if (currentEmployee) {
        await employeeService.updateEmployee(currentEmployee._id, employeeData);
        enqueueSnackbar('Employee updated successfully', { variant: 'success' });
      } else {
        await employeeService.createEmployee(employeeData);
        enqueueSnackbar('Employee added successfully', { variant: 'success' });
      }
      fetchEmployeeData();
    } catch (error) {
      console.error('Error saving employee:', error);
      enqueueSnackbar(error.message || 'Failed to save employee', { variant: 'error' });
    } finally {
      setLoading(false);
      handleCloseAddEditDialog();
    }
  };

  // Handle employee delete
  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
    setActionMenuAnchorEl(null);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;
    
    setLoading(true);
    try {
      await employeeService.deleteEmployee(employeeToDelete._id);
      enqueueSnackbar('Employee deleted successfully', { variant: 'success' });
      fetchEmployeeData();
    } catch (error) {
      console.error('Error deleting employee:', error);
      enqueueSnackbar('Failed to delete employee', { variant: 'error' });
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  // Actions menu handlers
  const handleActionsClick = (event, employeeId) => {
    setActionMenuAnchorEl(event.currentTarget);
    setSelectedEmployeeId(employeeId);
  };

  const handleActionsClose = () => {
    setActionMenuAnchorEl(null);
    setSelectedEmployeeId(null);
  };

  // Filter menu handlers
  const handleFilterClick = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterChange = (filterType, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleClearFilters = () => {
    setSelectedFilters({
      department: '',
      role: '',
      status: ''
    });
    setFilterAnchorEl(null);
  };

  // Sort menu handlers
  const handleSortClick = (event) => {
    setSortAnchorEl(event.currentTarget);
  };

  const handleSortClose = () => {
    setSortAnchorEl(null);
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
    setSortAnchorEl(null);
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    const value = parseInt(event.target.value, 10);
    // Check if "All" was selected (value -1 often represents "All")
    if (value === -1) {
      setRowsPerPage(filteredEmployees.length);
    } else {
      setRowsPerPage(value);
    }
    setPage(0);
  };

  // View employee profile
  const handleViewProfile = (id) => {
    navigate(`/employees/${id}`);
    setActionMenuAnchorEl(null);
  };

  // Calculate displayed rows based on pagination
  const displayedEmployees = filteredEmployees.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Status chip color based on employee status
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'on leave': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Employee Directory
        </Typography>
        {canManageEmployees && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={() => handleOpenAddEditDialog()}
          >
            Add Employee
          </Button>
        )}
      </Box>

      <Paper elevation={3} sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by name, email or ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={handleFilterClick}
              fullWidth
              sx={{ height: '56px' }}
            >
              Filters
              {Object.values(selectedFilters).some(v => v !== '') && (
                <Chip 
                  size="small" 
                  label={Object.values(selectedFilters).filter(v => v !== '').length}
                  color="primary"
                  sx={{ ml: 1 }}
                />
              )}
            </Button>
          </Grid>
          <Grid item xs={6} md={3}>
            <Button
              variant="outlined"
              startIcon={<SortIcon />}
              onClick={handleSortClick}
              fullWidth
              sx={{ height: '56px' }}
            >
              Sort By: {sortConfig.key.charAt(0).toUpperCase() + sortConfig.key.slice(1)}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Filter Menu */}
      <Menu
        anchorEl={filterAnchorEl}
        open={Boolean(filterAnchorEl)}
        onClose={handleFilterClose}
      >
        <Box sx={{ p: 2, width: 300 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>Department</Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={selectedFilters.department}
            onChange={(e) => handleFilterChange('department', e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            <MenuItem value="">All Departments</MenuItem>
            {departments.map((dept) => (
              <MenuItem key={dept.id} value={dept.name}>
                {dept.name}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="subtitle1" sx={{ mb: 2 }}>Role</Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={selectedFilters.role}
            onChange={(e) => handleFilterChange('role', e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            <MenuItem value="">All Roles</MenuItem>
            {roles.map((role) => (
              <MenuItem key={role.id} value={role.name}>
                {role.name}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="subtitle1" sx={{ mb: 2 }}>Status</Typography>
          <TextField
            select
            fullWidth
            size="small"
            value={selectedFilters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="Active">Active</MenuItem>
            <MenuItem value="Inactive">Inactive</MenuItem>
            <MenuItem value="On Leave">On Leave</MenuItem>
          </TextField>

          <Button 
            variant="contained" 
            color="primary"
            fullWidth
            onClick={handleFilterClose}
            sx={{ mt: 2 }}
          >
            Apply Filters
          </Button>
          <Button 
            variant="text" 
            onClick={handleClearFilters}
            fullWidth
            sx={{ mt: 1 }}
          >
            Clear All Filters
          </Button>
        </Box>
      </Menu>

      {/* Sort Menu */}
      <Menu
        anchorEl={sortAnchorEl}
        open={Boolean(sortAnchorEl)}
        onClose={handleSortClose}
      >
        <MenuItem onClick={() => handleSort('name')}>
          Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </MenuItem>
        <MenuItem onClick={() => handleSort('department')}>
          Department {sortConfig.key === 'department' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </MenuItem>
        <MenuItem onClick={() => handleSort('role')}>
          Role {sortConfig.key === 'role' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </MenuItem>
        <MenuItem onClick={() => handleSort('date_joined')}>
          Date Joined {sortConfig.key === 'date_joined' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
        </MenuItem>
      </Menu>

      {/* Actions Menu */}
      <Menu
        anchorEl={actionMenuAnchorEl}
        open={Boolean(actionMenuAnchorEl)}
        onClose={handleActionsClose}
      >
        <MenuItem onClick={() => handleViewProfile(selectedEmployeeId)}>
          View Profile
        </MenuItem>
        {canManageEmployees && (
          <>
            <MenuItem onClick={() => {
              const employee = employees.find(e => e._id === selectedEmployeeId);
              handleOpenAddEditDialog(employee);
            }}>
              Edit
            </MenuItem>
            {userRole === 'admin' && (
              <MenuItem onClick={() => {
                const employee = employees.find(e => e._id === selectedEmployeeId);
                handleDeleteClick(employee);
              }}>
                Delete
              </MenuItem>
            )}
          </>
        )}
      </Menu>

      {/* Employee Table */}
      <TableContainer component={Paper} sx={{ mt: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Employee ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Position</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <LinearProgress />
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredEmployees.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No employees found
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              filteredEmployees
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((employee) => (
                  <TableRow key={employee._id} hover>
                    <TableCell>{employee.employee_id}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar 
                          src={`/api/employees/${employee._id}/avatar`} 
                          alt={employee.name}
                          sx={{ mr: 2 }}
                        />
                        {employee.name}
                      </Box>
                    </TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>
                      <Chip 
                        label={employee.status?.charAt(0).toUpperCase() + employee.status?.slice(1)} 
                        color={getStatusColor(employee.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="View Profile">
                        <IconButton
                          onClick={() => handleViewProfile(employee._id)}
                          size="small"
                        >
                          <PersonAddIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {canManageEmployees && (
                        <>
                          <Tooltip title="Edit">
                            <IconButton 
                              onClick={() => handleOpenAddEditDialog(employee)}
                              size="small"
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              onClick={() => handleDeleteClick(employee)}
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
        
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100, { label: 'All', value: -1 }]}
          component="div"
          count={filteredEmployees.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Add/Edit Employee Dialog */}
      {openAddEditDialog && (
        <EmployeeAddEdit
          open={openAddEditDialog}
          employee={currentEmployee}
          onClose={handleCloseAddEditDialog}
          onSave={handleSaveEmployee}
          departments={departments}
          roles={roles}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Employee</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete {employeeToDelete?.name}? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            autoFocus
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmployeeList; 