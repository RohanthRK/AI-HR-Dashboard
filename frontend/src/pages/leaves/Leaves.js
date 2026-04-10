import React, { useState, useEffect, useCallback } from 'react';
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
  Chip,
  Grid,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Stack,
  TextField,
  useTheme
} from '@mui/material';
import { Link } from 'react-router-dom';
import leaveService from '../../services/leaveService';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../contexts/AuthContext';

const Leaves = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [error, setError] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom Approval/Rejection Dialog States
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '', leave: null, comments: '' });
  
  const { enqueueSnackbar } = useSnackbar();
  const { currentUser, hasRole } = useAuth();
  const isAdminOrManager = hasRole(['Admin', 'Manager']);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const promises = [
        leaveService.getMyLeaveBalance(),
        // Explicitly pass me=true to avoid Admin seeing everyone in history
        leaveService.getAllLeaveApplications({ me: 'true' }) 
      ];
      
      if (isAdminOrManager) {
        promises.push(leaveService.getPendingLeaveApplications());
      }
      
      const results = await Promise.all(promises);
      
      setLeaveBalance(results[0]);
      setLeaveRequests(results[1].leaves || []);
      
      if (isAdminOrManager) {
        setPendingApprovals(results[2].leaves || []);
      }
    } catch (err) {
      console.error('Error fetching leave data:', err);
      const msg = err.response?.data?.message || 'Failed to load leave data. Please try again.';
      setError(msg);
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      if (!silent) setLoading(false);
    }
  }, [enqueueSnackbar, isAdminOrManager]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleViewDetails = (leave) => {
    setSelectedLeave(leave);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedLeave(null);
  };

  const openConfirmDialog = (leave, type) => {
    setConfirmDialog({ open: true, type, leave, comments: '' });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({ open: false, type: '', leave: null, comments: '' });
  };

  const handleStatusUpdate = async () => {
    const { leave, type, comments } = confirmDialog;
    if (!leave) return;

    setIsSubmitting(true);
    try {
      if (type === 'approve') {
        await leaveService.approveLeaveApplication(leave._id, { status: 'Approved' });
        enqueueSnackbar('Leave request approved successfully!', { variant: 'success' });
      } else if (type === 'reject') {
        await leaveService.rejectLeaveApplication(leave._id, { status: 'Rejected', comments });
        enqueueSnackbar('Leave request rejected.', { variant: 'info' });
      } else if (type === 'cancel') {
        await leaveService.cancelLeaveApplication(leave._id);
        enqueueSnackbar('Leave request cancelled successfully', { variant: 'success' });
      }
      
      await fetchData(true);
      closeConfirmDialog();
      handleCloseDialog();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.message || `Failed to ${type} leave`, { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'cancelled': return 'default';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getProgressColor = (used, total) => {
    if (!total) return 'success';
    const percentage = (used / total) * 100;
    if (percentage < 50) return 'success';
    if (percentage < 75) return 'warning';
    return 'error';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
        <CircularProgress size={60} thickness={4} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" variant="filled" className="brutal-border">
          {error}
        </Alert>
        <Button variant="contained" onClick={fetchData} sx={{ mt: 2 }}>
          Retry
        </Button>
      </Box>
    );
  }

  const entitlements = leaveBalance?.entitlements || {};
  const used = leaveBalance?.used || {};
  const remaining = leaveBalance?.remaining || {};

  const balanceCards = [
    { type: 'Earned Leaves', used: used['Earned Leaves'] || 0, total: entitlements['Earned Leaves'] || 0, remaining: remaining['Earned Leaves'] || 0 },
    { type: 'LOP Leaves', used: used['LOP Leaves'] || 0, total: entitlements['LOP Leaves'] || 100, remaining: remaining['LOP Leaves'] || 0 }
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
          Leave Management
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          component={Link} 
          to="/leaves/request"
          className="brutal-shadow-hover"
          sx={{ backgroundColor: '#FFD700', color: '#000', border: '3px solid #000' }}
        >
          Request Leave
        </Button>
      </Box>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {balanceCards.map((card, index) => (
          <Grid item xs={12} md={6} key={index}>
            <Paper className="brutal-border brutal-shadow" sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 800 }}>
                {card.type}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                   Used: {card.used} days
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: card.remaining <= 0 ? 'error.main' : 'success.main' }}>
                  Remaining: {card.remaining} days
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(100, (card.used / (card.total || 1)) * 100)} 
                color={getProgressColor(card.used, card.total)}
                sx={{ height: 16, border: '2px solid #000', backgroundColor: theme.palette.mode === 'dark' ? '#444' : '#eee' }}
              />
            </Paper>
          </Grid>
        ))}
      </Grid>
      
      {isAdminOrManager && pendingApprovals.length > 0 && (
        <Box sx={{ mb: 6 }}>
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, textTransform: 'uppercase', color: 'primary.main' }}>
             Review Pending Approvals
          </Typography>
          <TableContainer component={Paper} className="brutal-border brutal-shadow" sx={{ border: '4px solid #000', bgcolor: 'background.paper' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#FFD700' : '#FFD700' }}>
                  <TableCell sx={{ fontWeight: 900, color: '#000', borderBottom: '3px solid #000' }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#000', borderBottom: '3px solid #000' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#000', borderBottom: '3px solid #000' }}>Period</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#000', borderBottom: '3px solid #000' }}>Days</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#000', borderBottom: '3px solid #000' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingApprovals.map((leave) => (
                  <TableRow key={leave._id} hover>
                    <TableCell sx={{ fontWeight: 700, borderBottom: '2px solid #000' }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>{leave.employee_name || leave.employee_id}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>{leave.department}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, borderBottom: '2px solid #000' }}>{leave.leave_type}</TableCell>
                    <TableCell sx={{ borderBottom: '2px solid #000' }}>{leave.start_date} to {leave.end_date}</TableCell>
                    <TableCell sx={{ fontWeight: 800, borderBottom: '2px solid #000' }}>{leave.days}</TableCell>
                    <TableCell align="center" sx={{ borderBottom: '2px solid #000' }}>
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="success"
                          onClick={() => openConfirmDialog(leave, 'approve')}
                          disabled={isSubmitting}
                          sx={{ border: '2px solid #000', fontWeight: 900, color: '#000', '&:hover': { backgroundColor: '#4caf50' } }}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="error"
                          onClick={() => openConfirmDialog(leave, 'reject')}
                          disabled={isSubmitting}
                          sx={{ border: '2px solid #000', fontWeight: 900, color: '#000', '&:hover': { backgroundColor: '#f44336' } }}
                        >
                          Reject
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={() => handleViewDetails(leave)}
                          sx={{ border: '2px solid #000', fontWeight: 900, color: '#000' }}
                        >
                          Details
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, textTransform: 'uppercase' }}>
        My Request History
      </Typography>
      
      {leaveRequests.length === 0 ? (
        <Paper className="brutal-border" sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            No leave requests found in your history.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} className="brutal-border brutal-shadow" sx={{ bgcolor: 'background.paper' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: theme.palette.mode === 'dark' ? '#333' : '#f4f4f0' }}>
                <TableCell sx={{ fontWeight: 900, borderBottom: '3px solid #000' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 900, borderBottom: '3px solid #000' }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 900, borderBottom: '3px solid #000' }}>End Date</TableCell>
                <TableCell sx={{ fontWeight: 900, borderBottom: '3px solid #000' }}>Days</TableCell>
                <TableCell sx={{ fontWeight: 900, borderBottom: '3px solid #000' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 900, borderBottom: '3px solid #000' }}>Request Date</TableCell>
                <TableCell sx={{ fontWeight: 900, borderBottom: '3px solid #000' }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaveRequests.map((leave) => (
                <TableRow key={leave._id} hover>
                  <TableCell sx={{ fontWeight: 700, borderBottom: '1px solid #ddd' }}>{leave.leave_type}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ddd' }}>{leave.start_date}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ddd' }}>{leave.end_date}</TableCell>
                  <TableCell sx={{ fontWeight: 800, borderBottom: '1px solid #ddd' }}>{leave.days}</TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ddd' }}>
                    <Chip 
                      label={leave.status} 
                      color={getStatusColor(leave.status)} 
                      size="small"
                      sx={{ fontWeight: 900, border: '2px solid #000' }}
                    />
                  </TableCell>
                  <TableCell sx={{ borderBottom: '1px solid #ddd' }}>{new Date(leave.requested_at).toLocaleDateString()}</TableCell>
                  <TableCell align="center" sx={{ borderBottom: '1px solid #ddd' }}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => handleViewDetails(leave)}
                      sx={{ border: '2px solid #000', fontWeight: 800 }}
                    >
                      View
                    </Button>
                    {leave.status === 'Pending' && (
                      <Button 
                        size="small" 
                        color="error" 
                        variant="contained" 
                        onClick={() => openConfirmDialog(leave, 'cancel')}
                        disabled={isSubmitting}
                        sx={{ ml: 1, backgroundColor: '#ff5252', color: '#000', border: '2px solid #000', '&:hover': { backgroundColor: '#ff1744' } }}
                      >
                        Cancel
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={closeConfirmDialog} PaperProps={{ className: 'brutal-border' }}>
        <DialogTitle sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
          Confirm {confirmDialog.type}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontWeight: 700, mb: 2 }}>
            Are you sure you want to {confirmDialog.type} this leave request for {confirmDialog.leave?.employee_name || 'yourself'}?
          </Typography>
          {confirmDialog.type === 'reject' && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Reason for Rejection"
              variant="outlined"
              value={confirmDialog.comments}
              onChange={(e) => setConfirmDialog(prev => ({ ...prev, comments: e.target.value }))}
              sx={{ mt: 1, '& .MuiOutlinedInput-root': { border: '2px solid #000', borderRadius: 0 } }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: theme.palette.mode === 'dark' ? '#333' : '#f5f5f5' }}>
          <Button onClick={closeConfirmDialog} variant="outlined" sx={{ border: '2px solid #000', fontWeight: 800, color: '#000' }}>
            Cancel
          </Button>
          <Button 
            onClick={handleStatusUpdate} 
            variant="contained" 
            color={confirmDialog.type === 'approve' ? 'success' : 'error'}
            disabled={isSubmitting}
            sx={{ border: '2px solid #000', fontWeight: 900, color: '#000' }}
          >
            Confirm {confirmDialog.type}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Leave Details Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth PaperProps={{ className: 'brutal-border', sx: { bgcolor: 'background.paper' } }}>
        {selectedLeave && (
          <>
            <DialogTitle sx={{ fontWeight: 900, textTransform: 'uppercase', pb: 1, bgcolor: theme.palette.mode === 'dark' ? '#333' : '#f5f5f5' }}>
              Leave Details - {selectedLeave.status}
            </DialogTitle>
            <Divider sx={{ borderBottomWidth: 3, borderColor: '#000' }} />
            <DialogContent>
              <Grid container spacing={3}>
                 <Grid item xs={12}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>EMPLOYEE</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>{selectedLeave.employee_name || selectedLeave.employee_id || 'ME'}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>TYPE</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>{selectedLeave.leave_type}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>DURATION</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>{selectedLeave.days} Days</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>PERIOD</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    {selectedLeave.start_date} to {selectedLeave.end_date}
                    {selectedLeave.is_half_day && ` (Half Day: ${selectedLeave.half_day_segment})`}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>REASON</Typography>
                  <Paper sx={{ p: 2, bgcolor: '#fefefe', border: '2px solid #000', borderRadius: 0 }}>
                    <Typography variant="body1">{selectedLeave.reason || 'No reason provided.'}</Typography>
                  </Paper>
                </Grid>
                {selectedLeave.comments && (
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ fontWeight: 900, color: 'text.secondary' }}>LEAD COMMENTS</Typography>
                    <Paper sx={{ p: 2, bgcolor: theme.palette.mode === 'dark' ? '#FFD700' : '#fff9c4', color: '#000', border: '2px solid #000', borderRadius: 0 }}>
                      <Typography variant="body1">{selectedLeave.comments}</Typography>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            </DialogContent>
            <Divider sx={{ borderBottomWidth: 3, borderColor: '#000' }} />
            <DialogActions sx={{ p: 2, bgcolor: theme.palette.mode === 'dark' ? '#333' : '#f5f5f5' }}>
              <Button onClick={handleCloseDialog} variant="outlined" sx={{ border: '2px solid #000', fontWeight: 800, color: '#000' }}>
                Close
              </Button>
              {selectedLeave.status === 'Pending' && selectedLeave.employee_id !== leaveBalance?.employee_id && (
                <Stack direction="row" spacing={1}>
                   <Button 
                    onClick={() => openConfirmDialog(selectedLeave, 'approve')}
                    color="success" 
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{ color: '#000', border: '2px solid #000', fontWeight: 900 }}
                  >
                    Approve
                  </Button>
                   <Button 
                    onClick={() => openConfirmDialog(selectedLeave, 'reject')}
                    color="error" 
                    variant="contained"
                    disabled={isSubmitting}
                    sx={{ color: '#000', border: '2px solid #000', fontWeight: 900 }}
                  >
                    Reject
                  </Button>
                </Stack>
              )}
              {selectedLeave.status === 'Pending' && selectedLeave.employee_id === leaveBalance?.employee_id && (
                <Button 
                  onClick={() => openConfirmDialog(selectedLeave, 'cancel')}
                  color="error" 
                  variant="contained"
                  disabled={isSubmitting}
                  sx={{ backgroundColor: '#ff5252', color: '#000', border: '2px solid #000', fontWeight: 900, '&:hover': { backgroundColor: '#ff1744' } }}
                >
                  Cancel Request
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default Leaves;