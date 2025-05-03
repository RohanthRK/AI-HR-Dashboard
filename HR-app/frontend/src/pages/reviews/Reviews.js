import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  CircularProgress, 
  Tabs, 
  Tab, 
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Rating,
  Chip,
  Alert,
  AlertTitle,
  Snackbar,
  Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
import PageHeader from '../../components/PageHeader';
import { useNavigate } from 'react-router-dom';
import reviewService from '../../services/reviewService';
import employeeService from '../../services/employeeService';

const Reviews = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Mock data for when API fails
  const mockEmployees = [
    { id: '1', first_name: 'John', last_name: 'Doe', department: 'Engineering', position: 'Senior Developer', manager_id: '4' },
    { id: '2', first_name: 'Jane', last_name: 'Smith', department: 'Engineering', position: 'Developer', manager_id: '4' },
    { id: '3', first_name: 'Bob', last_name: 'Johnson', department: 'Marketing', position: 'Marketing Specialist', manager_id: '5' },
    { id: '4', first_name: 'Olivia', last_name: 'Smith', department: 'Engineering', position: 'Engineering Manager' },
    { id: '5', first_name: 'Michael', last_name: 'Brown', department: 'Marketing', position: 'Marketing Lead' },
    { id: '6', first_name: 'Sarah', last_name: 'Davis', department: 'HR', position: 'HR Manager' },
    { id: '7', first_name: 'David', last_name: 'Wilson', department: 'HR', position: 'HR Specialist', manager_id: '6' },
    { id: '8', first_name: 'Emma', last_name: 'Taylor', department: 'Finance', position: 'Finance Director' }
  ];
  
  const mockReviews = [
    { id: '101', employee_id: '1', status: 'Completed', rating: 4.5, review_date: '2023-05-15', reviewer: 'Olivia Smith' },
    { id: '102', employee_id: '2', status: 'Pending', review_date: '2023-06-01', reviewer: 'Olivia Smith' },
    { id: '103', employee_id: '3', status: 'In Progress', review_date: '2023-05-20', reviewer: 'Michael Brown' }
  ];

  // Fetch data function for reuse
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch employees first
      let employeeData = [];
      try {
        employeeData = await employeeService.getAllEmployees();
        console.log('Successfully loaded employees:', employeeData?.length || 0);
      } catch (empError) {
        console.error('Error fetching employees:', empError);
        employeeData = mockEmployees; // Use mock data if API fails
      }
      setEmployees(employeeData || []);
      
      // Fetch reviews
      let reviewData = [];
      try {
        reviewData = await reviewService.getAllReviews();
        console.log('Successfully loaded reviews data');
      } catch (revError) {
        console.error('Error fetching reviews:', revError);
        reviewData = mockReviews; // Use mock data if API fails
      }
      
      if (reviewData && reviewData.results) {
        setReviews(reviewData.results);
      } else if (reviewData && Array.isArray(reviewData)) {
        setReviews(reviewData);
      } else {
        console.warn('Unexpected review data format, using empty array');
        setReviews([]);
      }
    } catch (err) {
      console.error('General error in fetchData:', err);
      // Use mock data if all fails
      setEmployees(mockEmployees);
      setReviews(mockReviews);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return 'success';
      case 'Pending': return 'warning';
      case 'In Progress': return 'info';
      default: return 'default';
    }
  };
  
  const handleCreateReview = () => {
    navigate('/reviews/team-performance-review');
  };
  
  const handleViewReview = (reviewId) => {
    // Navigate to the review details page
    navigate(`/reviews/${reviewId}`);
  };
  
  const handleReviewEmployee = (employeeId) => {
    // Navigate to the employee review page with the specific employee ID
    navigate(`/reviews/employee/${employeeId}`);
  };
  
  const handleReviewTeam = (team) => {
    // Navigate to the team review page with the specific team data
    navigate('/reviews/team-performance-review', { 
      state: { selectedTeam: team }
    });
  };
  
  // Get employee name by ID
  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId || emp._id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown Employee';
  };

  // Helper function to get team members for a manager
  const getTeamMembers = (manager) => {
    if (!employees || employees.length === 0) return [];
    
    // First get direct reports (employees with this manager's id as manager_id)
    const directReports = employees.filter(emp => 
      emp.manager_id === manager.id || emp.manager_id === manager._id
    );
    
    // If there are no direct reports but the manager has a department,
    // consider employees in the same department (except other managers/leads)
    if (directReports.length === 0 && manager.department) {
      return employees.filter(emp => 
        emp.department === manager.department && 
        emp.id !== manager.id && 
        emp._id !== manager._id &&
        !emp.position?.toLowerCase().includes('manager') && 
        !emp.position?.toLowerCase().includes('lead') &&
        !emp.position?.toLowerCase().includes('director')
      );
    }
    
    return directReports;
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
      <PageHeader 
        title="Performance Reviews"
        subtitle="Manage and track employee performance reviews"
      />
      
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage('')}
        message={successMessage}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Performance Review Management
        </Typography>
        <Box>
          {loading ? (
            <CircularProgress size={24} sx={{ mr: 2 }} />
          ) : (
            <Button 
              variant="outlined" 
              sx={{ mr: 2 }}
              onClick={fetchData}
            >
              Refresh
            </Button>
          )}
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            onClick={handleCreateReview}
          >
            Create Review
          </Button>
        </Box>
      </Box>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="My Reviews" />
          <Tab label="Team Reviews" />
          <Tab label="All Employees" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {tabValue === 0 && (
            <>
              {reviews && reviews.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Review Period</TableCell>
                        <TableCell>Reviewer</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Rating</TableCell>
                        <TableCell>Completed Date</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reviews.map((review) => (
                        <TableRow key={review.id || review._id}>
                          <TableCell>{review.period || review.review_cycle || 'Current'}</TableCell>
                          <TableCell>{getEmployeeName(review.reviewer_id) || review.reviewer_name || 'System'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={review.status || 'Pending'} 
                              color={getStatusColor(review.status)} 
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>
                            {review.rating ? (
                              <Rating value={parseFloat(review.rating)} precision={0.5} readOnly />
                            ) : (
                              'Pending'
                            )}
                          </TableCell>
                          <TableCell>{review.completed_date || review.review_date || '-'}</TableCell>
                          <TableCell>
                            <Button 
                              size="small" 
                              variant="outlined"
                              onClick={() => handleViewReview(review.id || review._id)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    No reviews found. Create your first review by clicking the "Create Review" button.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    sx={{ mt: 2 }}
                    onClick={handleCreateReview}
                  >
                    Create New Review
                  </Button>
                </Box>
              )}
            </>
          )}
          
          {tabValue === 1 && (
            <Box>
              <Box display="flex" justifyContent="flex-end" mb={3}>
                <Button 
                  variant="contained" 
                  color="primary"
                  startIcon={<GroupsIcon />}
                  onClick={handleCreateReview}
                >
                  Create New Team Review
                </Button>
              </Box>
              
              {employees && employees.filter(emp => emp.position?.toLowerCase().includes('manager') || emp.position?.toLowerCase().includes('lead') || emp.position?.toLowerCase().includes('director')).length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Team Lead/Manager</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Team Members</TableCell>
                        <TableCell>Review Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {employees
                        .filter(emp => emp.position?.toLowerCase().includes('manager') || emp.position?.toLowerCase().includes('lead') || emp.position?.toLowerCase().includes('director'))
                        .map((manager) => {
                          // Get team members using our helper function
                          const teamMembers = getTeamMembers(manager);
                          
                          return (
                            <TableRow key={manager.id || manager._id}>
                              <TableCell>
                                <Box display="flex" alignItems="center">
                                  <Avatar 
                                    sx={{ 
                                      width: 32, 
                                      height: 32, 
                                      bgcolor: 'primary.main', 
                                      fontSize: '0.9rem',
                                      mr: 1
                                    }}
                                  >
                                    {manager.first_name?.charAt(0)}{manager.last_name?.charAt(0)}
                                  </Avatar>
                                  {manager.first_name} {manager.last_name}
                                </Box>
                              </TableCell>
                              <TableCell>{manager.department || 'Unknown'}</TableCell>
                              <TableCell>{teamMembers.length}</TableCell>
                              <TableCell>
                                <Chip 
                                  label="Ready for Review" 
                                  color="info" 
                                  size="small" 
                                />
                              </TableCell>
                              <TableCell>
                                <Button 
                                  size="small" 
                                  variant="outlined"
                                  onClick={() => handleReviewTeam({
                                    id: manager.id || manager._id,
                                    name: `${manager.department || 'Team'} (${manager.first_name} ${manager.last_name})`,
                                    department: manager.department,
                                    description: `Team led by ${manager.first_name} ${manager.last_name}`,
                                    memberCount: teamMembers.length,
                                    employees: teamMembers
                                  })}
                                >
                                  Review Team
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    No teams found. Team leaders and managers will appear here.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    sx={{ mt: 2 }}
                    onClick={handleCreateReview}
                  >
                    Create Team Review
                  </Button>
                </Box>
              )}
            </Box>
          )}
          
          {tabValue === 2 && (
            <Box>
              {employees && employees.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Department</TableCell>
                        <TableCell>Position</TableCell>
                        <TableCell>Review Status</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {employees.map((employee) => {
                        // Find reviews for this employee
                        const employeeReviews = reviews.filter(
                          rev => rev.employee_id === employee.id || rev.employee_id === employee._id
                        );
                        const hasCurrentReview = employeeReviews.some(rev => rev.status !== 'Completed');
                        
                        return (
                          <TableRow key={employee.id || employee._id}>
                            <TableCell>{employee.first_name} {employee.last_name}</TableCell>
                            <TableCell>{employee.department || 'Unknown'}</TableCell>
                            <TableCell>{employee.position || 'Unknown'}</TableCell>
                            <TableCell>
                              <Chip 
                                label={hasCurrentReview ? 'In Progress' : 'Ready for Review'} 
                                color={hasCurrentReview ? 'info' : 'success'} 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell>
                              <Button 
                                size="small" 
                                variant="outlined"
                                onClick={() => handleReviewEmployee(employee.id || employee._id)}
                              >
                                Review Employee
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary">
                    No employees found. Add employees to begin performance reviews.
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    sx={{ mt: 2 }}
                    onClick={() => navigate('/employees')}
                  >
                    Go to Employees
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Paper>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Performance Review Stats
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={4}>
          <Box>
            <Typography variant="body1">
              Total employees: <strong>{employees?.length || 0}</strong>
            </Typography>
            <Typography variant="body1">
              Total reviews: <strong>{reviews?.length || 0}</strong>
            </Typography>
          </Box>
          <Box>
            <Typography variant="body1">
              Completed reviews: <strong>{reviews?.filter(r => r.status === 'Completed')?.length || 0}</strong>
            </Typography>
            <Typography variant="body1">
              Pending reviews: <strong>{reviews?.filter(r => r.status !== 'Completed')?.length || 0}</strong>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Reviews; 