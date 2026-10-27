import { formatDate } from '../../utils/format';
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
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  TextField,
  InputAdornment,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import PageHeader from '../../components/PageHeader';
import SharedReviews from '../../components/reviews/SharedReviews';

import reviewService from '../../services/reviewService';

import { useAuth } from '../../contexts/AuthContext';

import SearchIcon from '@mui/icons-material/Search';

import AssessmentIcon from '@mui/icons-material/Assessment';


const MyPerformanceReports = ({ isComponent = false }) => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Details Dialog State
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await reviewService.getMyPerformanceReviews();
      const results = response.results || response || [];
      
      setReviews(Array.isArray(results) ? results : []);
    } catch (err) {
      console.error('Error fetching performance reports:', err);
      setError('Failed to load your performance reports. Please try again later.');
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
      case 'success': return 'success';
      case 'pending': return 'warning';
      default: return 'info';
    }
  };

  const getReviewScore = (review) => {
    if (review.performance || review.rating) {
      return parseFloat(review.performance || review.rating);
    }
    if (review.scores && typeof review.scores === 'object') {
      const values = Object.values(review.scores).filter(v => typeof v === 'number');
      if (values.length > 0) return values.reduce((a, b) => a + b, 0) / values.length;
    }
    return null;
  };

  const handleViewReview = (review) => {
    setSelectedReview(review);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedReview(null);
  };

  const filteredReviews = reviews.filter(r => {
    const reviewer = (r.reviewer_name || r.reviewer || 'Manager').toLowerCase();
    const period = (r.period || '').toLowerCase();
    return reviewer.includes(searchTerm.toLowerCase()) || period.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ py: isComponent ? 0 : 4, width: '100%' }}>
      {!isComponent && <PageHeader title="My Performance Reports" subtitle="Evaluations and feedback provided to you" />}
      
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Feedback Dashboard</Typography>
        <TextField 
          size="small" 
          placeholder="Search by period or reviewer..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ width: 300 }}
        />
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <SharedReviews />

      {filteredReviews.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', border: '4px solid #000' }}>
          <AssessmentIcon sx={{ fontSize: 60, mb: 2, color: 'text.disabled' }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>No performance reports found yet.</Typography>
          <Typography color="textSecondary">When your manager completes a review for you, it will appear here.</Typography>
        </Paper>
      ) : (
        <Paper sx={{ border: '4px solid #000', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'background.default' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900 }}>Recipient</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Level</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Reviewer</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Period</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Overall Score</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 900 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReviews.map((review, idx) => {
                  const score = getReviewScore(review);
                  return (
                    <TableRow key={review.id || review._id || idx}>
                      <TableCell sx={{ fontWeight: 800 }}>{review.subject_name || 'Me'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={review.type || 'Individual'} 
                          size="small"
                          variant="outlined"
                          sx={{ 
                            fontWeight: 900, 
                            border: '2px solid #000', 
                            borderRadius: 0,
                            bgcolor: review.type === 'Team' ? 'secondary.light' : 'transparent'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{review.reviewer_name || review.reviewer || 'HR Manager'}</TableCell>
                      <TableCell>{review.period || 'Annual Review'}</TableCell>
                      <TableCell>
                        {review.review_date || review.submission_date || review.created_at ? formatDate(review.review_date || review.submission_date || review.created_at) : '—'}
                      </TableCell>
                      <TableCell>
                        {score !== null ? (
                          <Box display="flex" alignItems="center">
                            <Rating value={score} precision={0.1} readOnly size="small" />
                            <Typography variant="caption" sx={{ ml: 1, fontWeight: 700 }}>({score.toFixed(1)})</Typography>
                          </Box>
                        ) : 'Not Rated'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={review.status || 'Completed'} 
                          color={getStatusColor(review.status || 'Completed')}
                          size="small"
                          sx={{ fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell>
                        <Button variant="outlined" size="small" sx={{ fontWeight: 800 }} onClick={() => handleViewReview(review)}>
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { border: '4px solid #000', borderRadius: 0 } }}
      >
        <DialogTitle sx={{ bgcolor: 'secondary.main', color: '#fff' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" sx={{ fontWeight: 900 }}>PERFORMANCE EVALUATION DETAILS</Typography>
            {selectedReview && (
              <Chip 
                label={selectedReview.subject_name || 'Me'} 
                sx={{ bgcolor: '#fff', color: '#000', fontWeight: 900, border: '2px solid #000' }} 
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedReview && (
            <Grid container spacing={4}>
              <Grid item xs={12} md={5}>
                <Box mb={4}>
                  <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 700 }}>REVIEWER</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>{selectedReview.reviewer_name || selectedReview.reviewer || 'Manager'}</Typography>
                </Box>
                <Box mb={4}>
                  <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 700 }}>RATING</Typography>
                  <Box display="flex" alignItems="center" mt={1}>
                    <Rating value={getReviewScore(selectedReview)} precision={0.1} readOnly size="large" />
                    <Typography variant="h5" sx={{ ml: 2, fontWeight: 900 }}>{getReviewScore(selectedReview)?.toFixed(1)}</Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 3 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>COMPETENCIES</Typography>
                <List dense>
                  {(() => {
                    const isTeam = selectedReview.type === 'Team';
                    const metrics = isTeam 
                      ? ['productivity', 'communication', 'collaboration', 'innovation', 'quality'] 
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
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>MANAGER FEEDBACK</Typography>
                  <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderLeft: '5px solid #000' }}>
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>{selectedReview.feedback || selectedReview.comments || 'No comments provided.'}</Typography>
                  </Box>
                </Box>
                {selectedReview.strengths && (
                  <Box mb={4}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: 'success.main' }}>TOP STRENGTHS</Typography>
                    <Typography>{selectedReview.strengths}</Typography>
                  </Box>
                )}
                {selectedReview.areas_for_improvement && (
                  <Box mb={4}>
                    <Typography variant="h6" sx={{ fontWeight: 800, mb: 1, color: 'warning.main' }}>DEVELOPMENT AREAS</Typography>
                    <Typography>{selectedReview.areas_for_improvement}</Typography>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDetails} variant="contained" sx={{ fontWeight: 900 }}>CLOSE</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MyPerformanceReports;
