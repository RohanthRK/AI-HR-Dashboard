import React, { useState, useEffect } from 'react';
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
  Avatar,
  Chip,
  Alert,
  AlertTitle,
  Snackbar,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Container,
  Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import PageHeader from '../../components/PageHeader';
import { useNavigate } from 'react-router-dom';
import reviewService from '../../services/reviewService';
import employeeService from '../../services/employeeService';
import { useAuth } from '../../contexts/AuthContext';

const Reviews = ({ isComponent = false }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [departments, setDepartments] = useState(['All']);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch employees
      let employeeData = await employeeService.getAllEmployees();
      employeeData = employeeData || [];

      // If Manager, filter to only the team people they manage or are part of
      if (currentUser?.role === 'Manager') {
        const userTeam = (currentUser.team || '').toLowerCase();
        const userTeamId = currentUser.team_id ? String(currentUser.team_id) : '';
        const myEmpId = currentUser.employee_id || currentUser.id;
        const myUsername = currentUser.username;

        employeeData = employeeData.filter(emp => {
          const isSelf = (myEmpId && (emp.employee_id === myEmpId || emp._id === myEmpId || emp.id === myEmpId)) ||
                         (currentUser?.email && emp.email?.toLowerCase() === currentUser.email.toLowerCase());
          if (isSelf) return false;

          const empTeam = (emp.team || '').toLowerCase();
          const empTeamId = emp.team_id ? String(emp.team_id) : '';
          const empManager = emp.manager || emp.manager_id || '';

          const isDirectReport = empManager === myEmpId || empManager === myUsername || (currentUser.first_name && empManager.includes(currentUser.first_name));
          const isSameTeam = (userTeam && empTeam === userTeam) || (userTeamId && empTeamId === userTeamId);
          
          return isDirectReport || isSameTeam;
        });
      }

      setEmployees(employeeData);
      
      // Extract unique departments
      const deptNames = ['All', ...new Set(employeeData.map(emp => emp.department).filter(Boolean))];
      setDepartments(deptNames);
      
      // Fetch reviews
      const reviewData = await reviewService.getAllReviews();
      if (reviewData && reviewData.results) {
        setReviews(reviewData.results);
      } else if (Array.isArray(reviewData)) {
        setReviews(reviewData);
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error('Error in fetchData:', err);
      setError('Failed to load performance review data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  // Handle Search and Filter
  useEffect(() => {
    let results = employees;

    if (departmentFilter !== 'All') {
      results = results.filter(emp => emp.department === departmentFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(emp => 
        (emp.first_name + ' ' + emp.last_name).toLowerCase().includes(term) || 
        emp.employee_id?.toLowerCase().includes(term) ||
        emp.position?.toLowerCase().includes(term)
      );
    }

    setFilteredEmployees(results);
  }, [searchTerm, departmentFilter, employees]);

  const handleReviewEmployee = (employeeId) => {
    navigate(`/reviews/employee/${employeeId}`);
  };

  return (
    <Box sx={{ py: isComponent ? 0 : 4, width: '100%' }}>
      {!isComponent && (
        <PageHeader 
          title="Employee Performance Review"
          subtitle="Manage and evaluate individual employee performance across the organization"
        />
      )}
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        message={successMessage}
      />
      
      <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.main', border: '3px solid #000', boxShadow: '4px 4px 0px #000' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Box textAlign="center">
              <Typography variant="h3" sx={{ fontWeight: 900, color: '#000' }}>{employees.length}</Typography>
              <Typography variant="h6" sx={{ color: '#000', textTransform: 'uppercase', fontWeight: 700 }}>Total Employees</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box textAlign="center">
              <Typography variant="h3" sx={{ fontWeight: 900, color: '#000' }}>
                {reviews.filter(r => r.status === 'Completed' || r.submission_date || r.average_score).length}
              </Typography>
              <Typography variant="h6" sx={{ color: '#000', textTransform: 'uppercase', fontWeight: 700 }}>Completed Reviews</Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Box textAlign="center">
              <Typography variant="h3" sx={{ fontWeight: 900, color: '#000' }}>
                {Math.max(0, employees.length - reviews.filter(r => r.status === 'Completed' || r.submission_date || r.average_score).length)}
              </Typography>
              <Typography variant="h6" sx={{ color: '#000', textTransform: 'uppercase', fontWeight: 700 }}>Pending Reviews</Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ mb: 4, p: 3, bgcolor: '#fff', border: '3px solid #000', boxShadow: '4px 4px 0px #000' }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search employees by name, ID or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#000' }} />
                  </InputAdornment>
                ),
                sx: { fontWeight: 600, border: '2px solid #000', borderRadius: 0 }
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel id="dept-filter-label" sx={{ fontWeight: 700, color: '#000' }}>Department</InputLabel>
              <Select
                labelId="dept-filter-label"
                value={departmentFilter}
                label="Department"
                onChange={(e) => setDepartmentFilter(e.target.value)}
                sx={{ fontWeight: 600, border: '2px solid #000', borderRadius: 0 }}
              >
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept} sx={{ fontWeight: 600 }}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
                variant="contained" 
                color="secondary" 
                onClick={fetchData} 
                sx={{ 
                    fontWeight: 900, 
                    border: '3px solid #000', 
                    borderRadius: 0, 
                    boxShadow: '3px 3px 0px #000',
                    '&:hover': { boxShadow: 'none', transform: 'translate(2px, 2px)' }
                }}
            >
              Refresh Data
            </Button>
          </Grid>
        </Grid>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, border: '3px solid #000', borderRadius: 0 }}>
          <AlertTitle sx={{ fontWeight: 900 }}>Error</AlertTitle>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={10}>
          <CircularProgress size={60} thickness={5} />
        </Box>
      ) : (
        <Paper sx={{ mb: 4, border: '3px solid #000', borderRadius: 0, overflow: 'hidden', boxShadow: '6px 6px 0px #000' }}>
          {filteredEmployees.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: '#f0f0f0', borderBottom: '3px solid #000' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Employee</TableCell>
                    <TableCell sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Department</TableCell>
                    <TableCell sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Position</TableCell>
                    <TableCell sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Review Status</TableCell>
                    <TableCell sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmployees.map((employee) => {
                    const employeeReviews = reviews.filter(
                      rev => rev.employee_id === employee.id || rev.employee_id === employee._id || rev.employee_id === employee.employee_id
                    );
                    const isCompleted = employeeReviews.some(rev => rev.status === 'Completed' || rev.submission_date || rev.average_score != null);
                    const isInProgress = !isCompleted && employeeReviews.some(rev => rev.status === 'In Progress');
                    
                    return (
                      <TableRow key={employee.id || employee._id} sx={{ '&:hover': { bgcolor: '#f9f9f9' } }}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ width: 40, height: 40, fontSize: '1rem', mr: 2, bgcolor: 'primary.main', color: '#000', fontWeight: 900, border: '2px solid #000' }}>
                              {employee.first_name?.[0]}{employee.last_name?.[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 800 }}>
                                {employee.first_name} {employee.last_name}
                              </Typography>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                {employee.employee_id}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{employee.department || '—'}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{employee.position || '—'}</TableCell>
                        <TableCell>
                          <Chip 
                            label={isCompleted ? 'Completed' : (isInProgress ? 'In Progress' : 'Ready for Review')} 
                            color={isCompleted ? 'success' : (isInProgress ? 'info' : 'warning')} 
                            size="small" 
                            variant="filled"
                            sx={{ fontWeight: 900, border: '2px solid #000', borderRadius: 0 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="small" 
                            variant={isCompleted ? 'outlined' : 'contained'}
                            color="primary"
                            onClick={() => handleReviewEmployee(employee.id || employee._id || employee.employee_id)}
                            sx={{ fontWeight: 900, border: '2px solid #000', borderRadius: 0, boxShadow: isCompleted ? 'none' : '2px 2px 0px #000' }}
                          >
                            {isCompleted ? 'View Review' : 'Complete Review'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Box textAlign="center" py={8} color="text.secondary">
              <Typography variant="h5" sx={{ fontWeight: 900 }}>No employees found</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>Try adjusting your search or department filter</Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default Reviews;