import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  Avatar,
  Chip,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  useTheme,
  Grid,
  alpha
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

import employeeService from '../../services/employeeService';
import { useAuth } from '../../contexts/AuthContext';
import AddEmployeeDialog from '../../components/employees/AddEmployeeDialog';
import EmployeeAddEdit from '../../components/employees/EmployeeAddEdit';

const Directory = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser, isAdmin, isManager } = useAuth();
  const isAuthorizedToAdd = isAdmin() || isManager();

  const location = useLocation();
  
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Use search term from URL if present
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get('q') || queryParams.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const [allDeptsData, setAllDeptsData] = useState([]);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [availablePositions, setAvailablePositions] = useState([]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const data = await employeeService.getAllEmployees();
      setEmployees(data);
      setFilteredEmployees(data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setNotification({ open: true, message: 'Failed to load employees', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchFormOptions = async () => {
    try {
      const depts = await employeeService.getDepartmentsMongoDB();
      setAllDeptsData(depts);
      setAvailableDepartments(depts.map(d => d.name).filter(Boolean));
      
      let teamNames = [];
      depts.forEach(dept => {
        (dept.teams || []).forEach(t => t.name && teamNames.push(t.name));
      });
      
      if (teamNames.length === 0) {
        try {
          const teamRes = await fetch('http://localhost:8000/api/ai/team-stats/').then(r => r.json());
          if (teamRes.departments) {
            teamRes.departments.forEach(dept => {
              (dept.teams || []).forEach(t => t.name && teamNames.push(t.name));
            });
          }
        } catch (e) {
          console.warn('Team prefetch error:', e);
        }
      }

      setAvailableTeams([...new Set(teamNames)]);
      setAvailablePositions(['Software Engineer', 'Senior Developer', 'HR Manager', 'Product Manager', 'Designer', 'Accountant', 'Sales Rep']);
    } catch (err) {
      console.warn('Form options prefetch error:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchFormOptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filterDepartment, filterStatus, employees]);

  const applyFilters = () => {
    let results = employees;
    if (searchTerm) {
      results = results.filter(e => 
        e.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterDepartment !== 'All') {
      results = results.filter(e => e.department === filterDepartment);
    }
    if (filterStatus !== 'All') {
      results = results.filter(e => e.employment_status === filterStatus);
    }
    setFilteredEmployees(results);
  };

  const handleSaveEmployee = async (data) => {
    try {
      if (selectedEmployee) {
        await employeeService.updateEmployee(selectedEmployee._id, data);
        setNotification({ open: true, message: 'Employee updated successfully', severity: 'success' });
      } else {
        await employeeService.createEmployee(data);
        setNotification({ open: true, message: 'Employee added successfully', severity: 'success' });
      }
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err) {
      setNotification({ open: true, message: 'Operation failed', severity: 'error' });
    }
  };

  const handleViewProfile = (id) => navigate(`/employees/${id}`);

  return (
    <Box sx={{ p: 4, bgcolor: 'background.default', color: 'text.primary', minHeight: '100vh', width: '100%' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1 }}>
          EMPLOYEE DIRECTORY
        </Typography>
        {isAuthorizedToAdd && (
          <Button 
            variant="contained" 
            onClick={() => setIsAddDialogOpen(true)}
            sx={{ 
              bgcolor: '#000', color: '#fff', fontWeight: 'bold', border: '3px solid #000',
              boxShadow: '4px 4px 0px #fcc419', '&:hover': { bgcolor: '#333' }
            }}
          >
            + ADD NEW EMPLOYEE
          </Button>
        )}
      </Box>

      {/* Filters & Search */}
      <Paper className="brutal-border brutal-shadow" sx={{ p: 2, mb: 3, borderRadius: 0, bgcolor: 'background.paper' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth placeholder="Search by name or email..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
              variant="outlined"
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} label="Department">
                <MenuItem value="All">All Departments</MenuItem>
                {availableDepartments.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} label="Status">
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="On Leave">On Leave</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Directory Table */}
      <TableContainer component={Paper} className="brutal-border brutal-shadow" sx={{ borderRadius: 0, bgcolor: 'background.paper' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#000', fontWeight: '900', borderBottom: '3px solid #000', bgcolor: '#fcc419' }}>EMPLOYEE</TableCell>
              <TableCell sx={{ color: '#000', fontWeight: '900', borderBottom: '3px solid #000', bgcolor: '#fcc419' }}>DEPARTMENT</TableCell>
              <TableCell sx={{ color: '#000', fontWeight: '900', borderBottom: '3px solid #000', bgcolor: '#fcc419' }}>TEAM</TableCell>
              <TableCell sx={{ color: '#000', fontWeight: '900', borderBottom: '3px solid #000', bgcolor: '#fcc419' }}>STATUS</TableCell>
              <TableCell sx={{ color: '#000', fontWeight: '900', borderBottom: '3px solid #000', bgcolor: '#fcc419' }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center"><CircularProgress sx={{ my: 4 }} /></TableCell></TableRow>
            ) : filteredEmployees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((emp) => (
              <TableRow key={emp._id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#fcc419', color: '#000', border: '2px solid #000' }}>
                      {emp.first_name?.[0]}{emp.last_name?.[0]}
                    </Avatar>
                    <Box>
                      <Typography fontWeight="bold">{emp.first_name} {emp.last_name}</Typography>
                      <Typography variant="body2" color="text.secondary">{emp.email}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{emp.department || '-'}</TableCell>
                <TableCell>{emp.team || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={emp.employment_status || 'Active'} 
                    size="small"
                    sx={{ 
                      fontWeight: 'bold', border: '2px solid',
                      bgcolor: (emp.employment_status === 'Active' || !emp.employment_status) ? '#ebfbee' : '#fff4e6',
                      borderColor: (emp.employment_status === 'Active' || !emp.employment_status) ? '#2b8a3e' : '#e67700',
                      color: (emp.employment_status === 'Active' || !emp.employment_status) ? '#2b8a3e' : '#e67700'
                    }} 
                  />
                </TableCell>
                <TableCell>
                  <Button 
                    variant="contained" size="small" 
                    onClick={() => handleViewProfile(emp._id)}
                    sx={{ bgcolor: '#000', color: '#fff', fontWeight: 'bold' }}
                  >
                    VIEW
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[10, 20, 50]}
          component="div"
          count={filteredEmployees.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
        />
      </TableContainer>

      {/* Add Employee Dialog */}
      <AddEmployeeDialog 
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onSave={handleSaveEmployee}
        departments={allDeptsData}
      />

      <Snackbar open={notification.open} autoHideDuration={6000} onClose={() => setNotification({ ...notification, open: false })}>
        <Alert severity={notification.severity} variant="filled" sx={{ fontWeight: 900, border: '3px solid #000', borderRadius: 0 }}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Directory;