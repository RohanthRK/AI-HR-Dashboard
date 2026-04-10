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
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Tooltip,
  IconButton,
  Grid
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import leaveService from '../../services/leaveService';
import { useSnackbar } from 'notistack';

const PendingLeaves = () => {
  const [loading, setLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [action, setAction] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { enqueueSnackbar } = useSnackbar();

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    try {
      const response = await leaveService.getPendingLeaveApplications();
      // The API returns { count, leaves }
      setPendingLeaves(response.leaves || []);
    } catch (error) {
      console.error('Error fetching pending leaves:', error);
      enqueueSnackbar('Failed to load pending leave requests', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleViewDetails = (leave) => {
    setSelectedLeave(leave);
    setDialogOpen(true);
    setAction('view');
  };

  const handleApproveClick = (leave) => {
    setSelectedLeave(leave);
    setAction('approve');
    setDialogOpen(true);
  };

  const handleRejectClick = (leave) => {
    setSelectedLeave(leave);
    setRejectionReason('');
    setAction('reject');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedLeave(null);
    setRejectionReason('');
  };

  const handleApproveConfirm = async () => {
    setIsSubmitting(true);
    try {
      await leaveService.approveLeaveApplication(selectedLeave._id, { status: 'Approved' });
      enqueueSnackbar(`Leave request for ${selectedLeave.employee_name} has been approved.`, { variant: 'success' });
      setPendingLeaves(prev => prev.filter(l => l._id !== selectedLeave._id));
      handleCloseDialog();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to approve leave', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectConfirm = async () => {
    setIsSubmitting(true);
    try {
      await leaveService.rejectLeaveApplication(selectedLeave._id, { 
        status: 'Rejected',
        comments: rejectionReason 
      });
      enqueueSnackbar(`Leave request for ${selectedLeave.employee_name} has been rejected.`, { variant: 'success' });
      setPendingLeaves(prev => prev.filter(l => l._id !== selectedLeave._id));
      handleCloseDialog();
    } catch (error) {
      enqueueSnackbar(error.response?.data?.message || 'Failed to reject leave', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
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
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
        Pending Leave Requests
      </Typography>
      
      {pendingLeaves.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
          <Box sx={{ opacity: 0.5, mb: 2 }}>
            <InfoIcon sx={{ fontSize: 48 }} />
          </Box>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Pending Leave Requests
          </Typography>
          <Typography variant="body2" color="text.secondary">
            When employees submit leave applications, they will appear here for your review and approval.
          </Typography>
        </Paper>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ backgroundColor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Employee</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Period</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Days</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Request Date</TableCell>
                  <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingLeaves.map((leave) => (
                  <TableRow key={leave._id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{leave.employee_name}</Typography>
                      <Typography variant="caption" color="text.secondary">Dept: {leave.department || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={leave.leave_type} 
                        size="small" 
                        color={leave.leave_type === 'Earned Leaves' ? 'primary' : 'warning'} 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {leave.start_date} {leave.is_half_day && <Chip label={leave.half_day_segment} size="mini" sx={{ height: 16, fontSize: '0.65rem' }} />}
                      {!leave.is_half_day && leave.start_date !== leave.end_date && ` to ${leave.end_date}`}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{leave.days}</Typography>
                    </TableCell>
                    <TableCell>{new Date(leave.requested_at).toLocaleDateString()}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Button 
                          size="small" 
                          variant="outlined"
                          onClick={() => handleViewDetails(leave)}
                        >
                          Details
                        </Button>
                        <Button 
                          size="small" 
                          variant="contained"
                          color="success" 
                          onClick={() => handleApproveClick(leave)}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="small" 
                          variant="contained"
                          color="error"
                          onClick={() => handleRejectClick(leave)}
                        >
                          Reject
                        </Button>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
      
      {/* View/Approve/Reject Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        {action === 'view' && selectedLeave && (
          <>
            <DialogTitle sx={{ pb: 1 }}>Leave Request Details</DialogTitle>
            <DialogContent>
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Employee</Typography>
                  <Typography variant="body1">{selectedLeave.employee_name}</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">Leave Type</Typography>
                  <Typography variant="body1">{selectedLeave.leave_type}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Period</Typography>
                  <Typography variant="body1">
                    {selectedLeave.start_date} to {selectedLeave.end_date} 
                    {selectedLeave.is_half_day ? ` (${selectedLeave.half_day_segment})` : ` (${selectedLeave.days} days)`}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Reason</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">{selectedLeave.reason || 'No reason provided'}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDialog} variant="outlined">Close</Button>
              <Button color="success" variant="contained" onClick={() => handleApproveClick(selectedLeave)}>Approve</Button>
              <Button color="error" variant="contained" onClick={() => handleRejectClick(selectedLeave)}>Reject</Button>
            </DialogActions>
          </>
        )}
        
        {action === 'approve' && selectedLeave && (
          <>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to approve the leave request for <strong>{selectedLeave.employee_name}</strong>?
              </DialogContentText>
              <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1, color: 'success.contrastText' }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {selectedLeave.leave_type}: {selectedLeave.start_date} ({selectedLeave.days} days)
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDialog} disabled={isSubmitting}>Cancel</Button>
              <Button 
                onClick={handleApproveConfirm} 
                color="success" 
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting && <CircularProgress size={16} />}
              >
                Confirm Approval
              </Button>
            </DialogActions>
          </>
        )}
        
        {action === 'reject' && selectedLeave && (
          <>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Please provide a reason for rejecting the leave request for <strong>{selectedLeave.employee_name}</strong>.
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                label="Rejection Reason"
                fullWidth
                multiline
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                sx={{ mt: 2 }}
                placeholder="Required for rejection..."
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDialog} disabled={isSubmitting}>Cancel</Button>
              <Button 
                onClick={handleRejectConfirm} 
                color="error"
                variant="contained"
                disabled={!rejectionReason.trim() || isSubmitting}
                startIcon={isSubmitting && <CircularProgress size={16} />}
              >
                Confirm Rejection
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default PendingLeaves; 