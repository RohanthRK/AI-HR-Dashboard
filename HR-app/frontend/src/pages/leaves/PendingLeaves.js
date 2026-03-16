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
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField
} from '@mui/material';

const PendingLeaves = () => {
  const [loading, setLoading] = useState(true);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [action, setAction] = useState('');
  
  // Simulate loading data
  useEffect(() => {
    const timer = setTimeout(() => {
      // Mock data
      setPendingLeaves([
        { 
          id: 1, 
          employeeName: 'John Doe',
          employeeId: '1001',
          type: 'Annual Leave', 
          startDate: '2023-06-15', 
          endDate: '2023-06-19', 
          days: 5,
          reason: 'Family vacation',
          requestDate: '2023-05-20'
        },
        { 
          id: 2, 
          employeeName: 'Alice Johnson',
          employeeId: '1002',
          type: 'Sick Leave', 
          startDate: '2023-06-05', 
          endDate: '2023-06-07', 
          days: 3,
          reason: 'Medical appointment and recovery',
          requestDate: '2023-06-04'
        },
        { 
          id: 3, 
          employeeName: 'Bob Smith',
          employeeId: '1003',
          type: 'Personal Leave', 
          startDate: '2023-06-10', 
          endDate: '2023-06-10', 
          days: 1,
          reason: 'Personal matters',
          requestDate: '2023-06-01'
        },
      ]);
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleViewDetails = (leaveId) => {
    // In a real app, fetch details from API
    const leave = pendingLeaves.find(leave => leave.id === leaveId);
    setSelectedLeave(leave);
    setDialogOpen(true);
    setAction('view');
  };

  const handleApproveClick = (leaveId) => {
    const leave = pendingLeaves.find(leave => leave.id === leaveId);
    setSelectedLeave(leave);
    setAction('approve');
    setDialogOpen(true);
  };

  const handleRejectClick = (leaveId) => {
    const leave = pendingLeaves.find(leave => leave.id === leaveId);
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

  const handleApproveConfirm = () => {
    // In a real app, send approval to API
    console.log(`Approved leave request ${selectedLeave.id}`);
    
    // Remove from pending list
    setPendingLeaves(pendingLeaves.filter(leave => leave.id !== selectedLeave.id));
    handleCloseDialog();
    
    // Show success message
    alert(`Leave request for ${selectedLeave.employeeName} has been approved.`);
  };

  const handleRejectConfirm = () => {
    // In a real app, send rejection with reason to API
    console.log(`Rejected leave request ${selectedLeave.id} with reason: ${rejectionReason}`);
    
    // Remove from pending list
    setPendingLeaves(pendingLeaves.filter(leave => leave.id !== selectedLeave.id));
    handleCloseDialog();
    
    // Show success message
    alert(`Leave request for ${selectedLeave.employeeName} has been rejected.`);
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
      <Typography variant="h4" component="h1" gutterBottom>
        Pending Leave Requests
      </Typography>
      
      {pendingLeaves.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">
            No pending leave requests to review.
          </Typography>
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Employee</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Start Date</TableCell>
                  <TableCell>End Date</TableCell>
                  <TableCell>Days</TableCell>
                  <TableCell>Request Date</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingLeaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>{leave.employeeName}</TableCell>
                    <TableCell>{leave.type}</TableCell>
                    <TableCell>{leave.startDate}</TableCell>
                    <TableCell>{leave.endDate}</TableCell>
                    <TableCell>{leave.days}</TableCell>
                    <TableCell>{leave.requestDate}</TableCell>
                    <TableCell>
                      <Button 
                        size="small" 
                        onClick={() => handleViewDetails(leave.id)}
                      >
                        Details
                      </Button>
                      <Button 
                        size="small" 
                        color="success" 
                        onClick={() => handleApproveClick(leave.id)}
                      >
                        Approve
                      </Button>
                      <Button 
                        size="small" 
                        color="error"
                        onClick={() => handleRejectClick(leave.id)}
                      >
                        Reject
                      </Button>
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
            <DialogTitle>Leave Request Details</DialogTitle>
            <DialogContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Employee</Typography>
                <Typography variant="body1">{selectedLeave.employeeName} (ID: {selectedLeave.employeeId})</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Leave Type</Typography>
                <Typography variant="body1">{selectedLeave.type}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Period</Typography>
                <Typography variant="body1">{selectedLeave.startDate} to {selectedLeave.endDate} ({selectedLeave.days} days)</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Reason</Typography>
                <Typography variant="body1">{selectedLeave.reason}</Typography>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">Request Date</Typography>
                <Typography variant="body1">{selectedLeave.requestDate}</Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Close</Button>
              <Button color="success" onClick={() => handleApproveClick(selectedLeave.id)}>Approve</Button>
              <Button color="error" onClick={() => handleRejectClick(selectedLeave.id)}>Reject</Button>
            </DialogActions>
          </>
        )}
        
        {action === 'approve' && selectedLeave && (
          <>
            <DialogTitle>Approve Leave Request</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to approve the leave request for {selectedLeave.employeeName}?
              </DialogContentText>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  {selectedLeave.type}: {selectedLeave.startDate} to {selectedLeave.endDate} ({selectedLeave.days} days)
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button onClick={handleApproveConfirm} color="success">Approve</Button>
            </DialogActions>
          </>
        )}
        
        {action === 'reject' && selectedLeave && (
          <>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Please provide a reason for rejecting the leave request for {selectedLeave.employeeName}.
              </DialogContentText>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  {selectedLeave.type}: {selectedLeave.startDate} to {selectedLeave.endDate} ({selectedLeave.days} days)
                </Typography>
              </Box>
              <TextField
                autoFocus
                margin="dense"
                label="Rejection Reason"
                fullWidth
                multiline
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Cancel</Button>
              <Button 
                onClick={handleRejectConfirm} 
                color="error"
                disabled={!rejectionReason.trim()}
              >
                Reject
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default PendingLeaves; 