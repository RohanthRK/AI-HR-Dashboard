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
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import StarIcon from '@mui/icons-material/Star';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

const MyReviews = ({ isComponent = false }) => {
  const navigate = useNavigate();
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
      
      // Fetch employees to get names
      const employeeData = await employeeService.getAllEmployees();
      setEmployees(employeeData || []);
      
      // Fetch reviews GIVEN BY ME
      const reviewData = await reviewService.getMyAssignedReviews();
      
      if (reviewData && reviewData.results) {
        setReviews(reviewData.results);
      } else if (Array.isArray(reviewData)) {
        setReviews(reviewData);
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.error('Error fetching my assigned reviews:', err);
      setError('Failed to load your reviews. Please try again later.');
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

  const getTargetName = (review) => {
    if (review.type === 'Team') {
      return review.team_name || review.employee_name || 'Unnamed Team';
    }
    
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

  // Logic to filter Individual Reviews
  const filteredInd = reviews.filter(r => r.type === 'Individual' || !r.type).filter(r => {
    const name = getTargetName(r).toLowerCase();
    const matchesSearch = name.includes(searchInd.toLowerCase());
    const isCompleted = r.status === 'Completed' || r.status === 'success';
    const rStatus = isCompleted ? 'Completed' : (r.status || 'Pending');
    const matchesStatus = statusInd === 'All' || rStatus === statusInd;
    return matchesSearch && matchesStatus;
  });

  // Logic to filter Team Reviews
  const filteredTeam = reviews.filter(r => r.type === 'Team').filter(r => {
    const name = getTargetName(r).toLowerCase();
    const matchesSearch = name.includes(searchTeam.toLowerCase());
    const isCompleted = r.status === 'Completed' || r.status === 'success';
    const rStatus = isCompleted ? 'Completed' : (r.status || 'Pending');
    const matchesStatus = statusTeam === 'All' || rStatus === statusTeam;
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

  const ReviewTable = ({ data, typeLabel }) => (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Target ({typeLabel})</TableCell>
            <TableCell>Review Period/Date</TableCell>
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
                  <Typography sx={{ fontWeight: 600 }}>{getTargetName(review)}</Typography>
                </TableCell>
                <TableCell>
                  {review.type === 'Individual' || !review.type ? (review.period || 'Current Period') : (review.review_date ? new Date(review.review_date).toLocaleDateString() : 'Recent')}
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
                    {(review.type === 'Team' && !isCompleted) ? 'Manage Team' : 'View Details'}
                  </Button>
                </TableCell>
              </TableRow>
            );
          }) : (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
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
      {!isComponent && <PageHeader title="My Reviews" subtitle="Performance reviews conducted by you" />}
      
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Reviews Dashboard</Typography>
        <Button variant="outlined" startIcon={<FilterListIcon />} onClick={fetchData}>Refresh Data</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}><AlertTitle>Error</AlertTitle>{error}</Alert>}

      <Grid container spacing={4}>
        {/* Individual Reviews Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 0, overflow: 'hidden', border: '4px solid #000' }}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: '4px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box display="flex" alignItems="center">
                <PersonIcon sx={{ mr: 1 }} color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>INDIVIDUAL PERFORMANCE REVIEWS</Typography>
              </Box>
              <Box display="flex" gap={2} alignItems="center">
                <TextField 
                  size="small" 
                  placeholder="Search Employee..." 
                  value={searchInd}
                  onChange={(e) => setSearchInd(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                  sx={{ width: 250 }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={statusInd} label="Status" onChange={(e) => setStatusInd(e.target.value)}>
                    <MenuItem value="All">All</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <ReviewTable data={filteredInd} typeLabel="Employee" />
          </Paper>
        </Grid>

        {/* Team Reviews Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 0, overflow: 'hidden', border: '4px solid #000' }}>
            <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: '4px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box display="flex" alignItems="center">
                <GroupsIcon sx={{ mr: 1 }} color="info" />
                <Typography variant="h6" sx={{ fontWeight: 900 }}>TEAM PERFORMANCE REVIEWS</Typography>
              </Box>
              <Box display="flex" gap={2} alignItems="center">
                <TextField 
                  size="small" 
                  placeholder="Search Team..." 
                  value={searchTeam}
                  onChange={(e) => setSearchTeam(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
                  sx={{ width: 250 }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={statusTeam} label="Status" onChange={(e) => setStatusTeam(e.target.value)}>
                    <MenuItem value="All">All</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
            <ReviewTable data={filteredTeam} typeLabel="Team" />
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
                  <Typography variant="subtitle2" color="textSecondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>Target</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900 }}>{getTargetName(selectedReview)}</Typography>
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
