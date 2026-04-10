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
  Tabs,
  Tab,
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

// Tab Panel component
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`employee-tabpanel-${index}`}
      aria-labelledby={`employee-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>{children}</Box>
      )}
    </div>
  );
}

const EmployeeList = () => {
  // State management
  const [tabValue, setTabValue] = useState(0);
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
      result = result.filter(employee => (employee.department_name || employee.department) === selectedFilters.department);
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
        let valA = a[sortConfig.key] || '';
        let valB = b[sortConfig.key] || '';
        if (sortConfig.key === 'department') {
          valA = a.department_name || a.department || '';
          valB = b.department_name || b.department || '';
        }

        // Case insensitive string comparison
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
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

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          aria-label="employee views"
        >
          <Tab label="Directory" id="employee-tab-0" aria-controls="employee-tabpanel-0" sx={{ fontWeight: 800 }} />
          <Tab label="Org Chart" id="employee-tab-1" aria-controls="employee-tabpanel-1" sx={{ fontWeight: 800 }} />
          <Tab label="Documents" id="employee-tab-2" aria-controls="employee-tabpanel-2" sx={{ fontWeight: 800 }} />
        </Tabs>
      </Box>

      {/* Directory Tab */}
      <TabPanel value={tabValue} index={0}>
        <Paper elevation={0} className="brutal-border brutal-shadow" sx={{ mb: 3, p: 2 }}>
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
                      <TableCell>{employee.department_name || employee.department || 'Unknown'}</TableCell>
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
      </TabPanel>

      {/* Org Chart Tab */}
      <TabPanel value={tabValue} index={1}>
        <Paper className="brutal-border brutal-shadow" sx={{ p: 4, textAlign: 'center', backgroundColor: '#E1BEE7' }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 4 }}>Company Organization Chart</Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
            {/* CEO */}
            <Box className="brutal-border brutal-shadow-hover" sx={{ p: 2, backgroundColor: '#FFFFFF', width: 250, mb: 4, position: 'relative' }}>
              <Avatar sx={{ width: 60, height: 60, mx: 'auto', mb: 1, border: '3px solid #000' }}>C</Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Sarah Connor</Typography>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Chief Executive Officer</Typography>
              <Box sx={{ position: 'absolute', bottom: -35, left: '50%', width: 4, height: 32, backgroundColor: '#000', ml: '-2px' }} />
            </Box>

            {/* Connecting horizontal line */}
            <Box sx={{ width: '80%', maxWidth: 800, height: 4, backgroundColor: '#000', mb: 4, position: 'relative' }}>
              <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: 32, backgroundColor: '#000' }} />
              <Box sx={{ position: 'absolute', top: 0, left: '33%', width: 4, height: 32, backgroundColor: '#000' }} />
              <Box sx={{ position: 'absolute', top: 0, left: '66%', width: 4, height: 32, backgroundColor: '#000' }} />
              <Box sx={{ position: 'absolute', top: 0, right: 0, width: 4, height: 32, backgroundColor: '#000' }} />
            </Box>

            {/* Department Heads */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: 900 }}>
              <Box className="brutal-border brutal-shadow-hover" sx={{ p: 2, backgroundColor: '#B3E5FC', width: '22%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Lead Engineer</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Engineering</Typography>
              </Box>
              <Box className="brutal-border brutal-shadow-hover" sx={{ p: 2, backgroundColor: '#FFCC80', width: '22%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Lead Designer</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Design</Typography>
              </Box>
              <Box className="brutal-border brutal-shadow-hover" sx={{ p: 2, backgroundColor: '#A5D6A7', width: '22%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>HR Manager</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Human Resources</Typography>
              </Box>
              <Box className="brutal-border brutal-shadow-hover" sx={{ p: 2, backgroundColor: '#F48FB1', width: '22%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Sales Director</Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Sales</Typography>
              </Box>
            </Box>
          </Box>
        </Paper>
      </TabPanel>

      {/* Documents Tab */}
      <TabPanel value={tabValue} index={2}>
        <Paper className="brutal-border brutal-shadow" sx={{ p: 4, textAlign: 'center', backgroundColor: '#FFF59D' }}>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>Under Construction</Typography>
          <Typography variant="body1" sx={{ mt: 2, fontWeight: 700 }}>The Company Documents repository is coming soon.</Typography>
        </Paper>
      </TabPanel>

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