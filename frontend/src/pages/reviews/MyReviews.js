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
  Rating,
  Chip,
  Alert,
  AlertTitle,
  Snackbar,
  Container,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  InputAdornment,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import PageHeader from '../../components/PageHeader';
import { useNavigate } from 'react-router-dom';
import reviewService from '../../services/reviewService';
import employeeService from '../../services/employeeService';
import { useAuth } from '../../contexts/AuthContext';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';

const MyReviews = ({ isComponent = false }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Filtering & Search states
  const [searchInd, setSearchInd] = useState('');
  const [searchTeam, setSearchTeam] = useState('');
  const [statusInd, setStatusInd] = useState('All');
  const [statusTeam, setStatusTeam] = useState('All');

  // Details Dialog State
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const isManager = ['Admin', 'Manager', 'HR'].includes(currentUser?.role);
      
      // 1. Fetch employees to get names
      const employeeData = await employeeService.getAllEmployees();
      setEmployees(employeeData || []);
      
      // 2. Fetch assigned reviews (Reviews I need to DO)
      const fetchAssigned = isManager ? reviewService.getMyAssignedReviews() : Promise.resolve({ results: [] });
      
      const [assignedData] = await Promise.all([fetchAssigned]);
      
      let combinedReviews = [];
      
      // Process Assigned Reviews (Reviews I need to DO)
      if (isManager && assignedData && (assignedData.results || Array.isArray(assignedData))) {
        const results = assignedData.results || assignedData;
        const processed = results.map(r => ({
          ...r,
          subType: r.type === 'Team' ? 'Team Review' : 'Assigned Review',
          isPersonal: false
        }));
        combinedReviews = [...combinedReviews, ...processed];
      }
      
      setReviews(combinedReviews);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getStatusColor = (status) => {
    if (!status) return 'warning';
    const s = status.toLowerCase();
    switch(s) {
      case 'completed': return 'success';
      case 'pending': return 'warning';
      case 'in progress': return 'info';
      case 'success': return 'success';
      default: return 'default';
    }
  };

  const getDisplayName = (review) => {
    if (review.isPersonal) {
      return review.reviewer_name || review.reviewer || 'HR Manager';
    }

    if (review.type === 'Team') {
      return review.team_name || review.employee_name || 'Unnamed Team';
    }
    
    // Check if employee name is directly on the review (populated by backend now)
    if (review.employee_name) return review.employee_name;
    
    const employeeId = review.employee_id;
    const employee = employees.find(emp => emp.id === employeeId || emp._id === employeeId || emp.employee_id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : review.employee_name || employeeId || 'Unknown Employee';
  };

  const getReviewScore = (review) => {
    if (review.performance || review.rating) {
      return parseFloat(review.performance || review.rating);
    }
    if (review.scores && typeof review.scores === 'object') {
      const values = Object.values(review.scores).filter(v => typeof v === 'number');
      if (values.length > 0) {
        return values.reduce((a, b) => a + b, 0) / values.length;
      }
    }
    if (review.type === 'Team') {
      const metrics = ['collaboration', 'productivity', 'quality', 'innovation', 'communication'];
      const values = metrics.map(m => review[m]).filter(v => typeof v === 'number');
      if (values.length === 0 && review.scores) {
        const nestedValues = Object.values(review.scores).filter(v => typeof v === 'number');
        if (nestedValues.length > 0) return nestedValues.reduce((a, b) => a + b, 0) / nestedValues.length;
      }
      if (values.length > 0) return values.reduce((a, b) => a + b, 0) / values.length;
    }
    return null;
  };

  const handleCreateReview = () => navigate('/reviews');

  const handleViewReview = (review) => {
    const isCompleted = review.status === 'Completed' || review.status === 'success';
    if (review.type === 'Team') {
      if (isCompleted) {
        setSelectedReview(review);
        setDetailsOpen(true);
      } else {
        navigate('/reviews/team-performance-review');
      }
    } else {
      setSelectedReview(review);
      setDetailsOpen(true);
    }
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedReview(null);
  };

  // Logic to filter all relevant reviews
  const filteredReviews = reviews.filter(r => {
    const name = getDisplayName(r).toLowerCase();
    const typeLabel = r.subType.toLowerCase();
    const matchesSearch = name.includes(searchInd.toLowerCase()) || typeLabel.includes(searchInd.toLowerCase());
    const isCompleted = r.status === 'Completed' || r.status === 'success';
    const rStatus = isCompleted ? 'Completed' : (r.status || 'Pending');
    const matchesStatus = statusInd === 'All' || rStatus === statusInd;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  const ReviewTable = ({ data }) => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name / Target</TableCell>
            <TableCell>Review Type</TableCell>
            <TableCell>Period / Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Avg. Score</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length > 0 ? data.map((review, idx) => {
            const score = getReviewScore(review);
            const isCompleted = review.status === 'Completed' || review.status === 'success';
            const statusLabel = isCompleted ? 'Completed' : (review.status || 'Pending');
            return (
              <TableRow key={review.id || review._id || idx}>
                <TableCell>
                  <Box display="flex" alignItems="center">
                    {review.isPersonal ? <PersonIcon sx={{ mr: 1, fontSize: 'small' }} /> : <AssignmentIndIcon sx={{ mr: 1, fontSize: 'small' }} />}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{getDisplayName(review)}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {review.isPersonal ? 'Reviewer' : (review.type === 'Team' ? 'Team Member' : 'Target')}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={review.subType} 
                    variant="outlined"
                    size="small"
                    sx={{ fontWeight: 900, fontSize: '0.65rem' }}
                    color={review.isPersonal ? 'info' : 'secondary'}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {review.isPersonal 
                      ? (review.review_date || review.submission_date ? new Date(review.review_date || review.submission_date).toLocaleDateString() : 'Recent')
                      : (review.review_date || review.submission_date ? new Date(review.review_date || review.submission_date).toLocaleDateString() : (review.period || 'Current'))}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={statusLabel} 
                    color={getStatusColor(statusLabel)} 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  {score !== null ? (
                    <Box display="flex" alignItems="center">
                      <Rating value={score} precision={0.1} readOnly size="small" />
                      <Typography variant="caption" sx={{ ml: 1, fontWeight: 700 }}>({score.toFixed(1)})</Typography>
                    </Box>
                  ) : '—'}
                </TableCell>
                <TableCell>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    sx={{ fontWeight: 800 }}
                    onClick={() => handleViewReview(review)}
                  >
                    {(review.isPersonal) ? 'View Results' : (review.type === 'Team' && !isCompleted ? 'Manage Team' : 'Complete Review')}
                  </Button>
                </TableCell>
              </TableRow>
            );
          }) : (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                <Typography color="textSecondary">No reviews found matching your search.</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ py: isComponent ? 0 : 4, width: '100%' }}>
      {!isComponent && <PageHeader title="Review Tasks" subtitle="Performance evaluation assignments" />}
      
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Assigned Review Tasks</Typography>
        <Button variant="outlined" startIcon={<FilterListIcon />} onClick={fetchData}>Refresh Data</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}><AlertTitle>Error</AlertTitle>{error}</Alert>}

      <Grid container spacing={4}>
        <Grid item xs={12}>
          <Paper sx={{ p: 0, overflow: 'hidden', border: '4px solid #000' }}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: '4px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box display="flex" alignItems="center">
                <AssessmentIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>ALL PERFORMANCE TASKS & REPORTS</Typography>
              </Box>
              <Box display="flex" gap={2} alignItems="center">
                <TextField 
                  size="small" 
                  placeholder="Search by name or type..." 
                  value={searchInd}
                  onChange={(e) => setSearchInd(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                  sx={{ width: 300 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Filter Status</InputLabel>
                  <Select value={statusInd} label="Filter Status" onChange={(e) => setStatusInd(e.target.value)}>
                    <MenuItem value="All">All Statuses</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <ReviewTable data={filteredReviews} />
          </Paper>
        </Grid>
      </Grid>


      {/* Review Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        scroll="paper"
        PaperProps={{ sx: { border: '4px solid #000', borderRadius: 0 } }}
      >
        <DialogTitle sx={{ bgcolor: 'primary.main', pb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Evaluation Details</Typography>
            <Chip 
              icon={selectedReview?.type === 'Team' ? <GroupsIcon /> : <PersonIcon />} 
              label={selectedReview?.type || 'Review'} 
              sx={{ bgcolor: '#fff', fontWeight: 900 }}
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedReview && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={5}>
                <Box mb={4}>
                  <Typography variant="subtitle2" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>
                    {selectedReview.isPersonal ? 'Reviewer' : 'Target'}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>{getDisplayName(selectedReview)}</Typography>
                </Box>
                <Box mb={4}>
                  <Typography variant="subtitle2" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>Overall Rating</Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Rating value={getReviewScore(selectedReview)} precision={0.1} readOnly size="large" />
                    <Typography variant="h5" sx={{ ml: 2, fontWeight: 900 }}>{getReviewScore(selectedReview)?.toFixed(1)} / 5.0</Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>METRICS BREAKDOWN</Typography>
                <List dense>
                  {(() => {
                    const metrics = selectedReview.type === 'Team' 
                      ? ['collaboration', 'productivity', 'quality', 'innovation', 'communication']
                      : ['performance', 'communication', 'teamwork', 'initiative', 'adaptability'];
                    const scoreSrc = selectedReview.scores || selectedReview;
                    return metrics.map((m) => (
                      <ListItem key={m} sx={{ px: 0 }}>
                        <ListItemText 
                          primary={<Typography sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{m}</Typography>}
                          secondary={<Rating value={scoreSrc[m] || 0} size="small" readOnly />}
                        />
                        <Typography sx={{ fontWeight: 800 }}>{scoreSrc[m] || 0}</Typography>
                      </ListItem>
                    ));
                  })()}
                </List>
              </Grid>
              <Grid item xs={12} md={7}>
                <Box mb={4}>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>FEEDBACK</Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f9f9f9', border: '2px solid #eee' }}>
                    <Typography>{selectedReview.feedback || 'No feedback provided.'}</Typography>
                  </Paper>
                </Box>
                {selectedReview.strengths && (
                  <Box mb={4}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: 'success.main' }}>STRENGTHS</Typography>
                    <Typography>{selectedReview.strengths}</Typography>
                  </Box>
                )}
                {selectedReview.areas_for_improvement && (
                  <Box mb={4}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: 'warning.main' }}>AREAS FOR IMPROVEMENT</Typography>
                    <Typography>{selectedReview.areas_for_improvement}</Typography>
                  </Box>
                )}
                <Box mt={4} pt={2} borderTop="1px solid #ddd">
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">REVIEWER</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{selectedReview.reviewer || selectedReview.reviewer_name || 'HR Manager'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="textSecondary">SUBMISSION DATE</Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {selectedReview.submission_date || selectedReview.created_at ? new Date(selectedReview.submission_date || selectedReview.created_at).toLocaleDateString() : 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDetails} variant="contained" sx={{ fontWeight: 900, px: 4 }}>CLOSE</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyReviews;
