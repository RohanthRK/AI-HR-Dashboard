import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Chip, 
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  alpha
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import performanceService from '../../services/performanceService';
import employeeService from '../../services/employeeService';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { Autocomplete } from '@mui/material';

const PIPTab = () => {
  const [pips, setPips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedPip, setSelectedPip] = useState(null);
  const [statusFilter, setStatusFilter] = useState('In Progress');
  const { currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [newPip, setNewPip] = useState({
    employee_id: '',
    title: '',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    manager_notes: ''
  });

  const fetchPIPs = useCallback(async () => {
    setLoading(true);
    try {
      const [pipRes, empRes] = await Promise.all([
        performanceService.getPips(),
        employeeService.getAllEmployees()
      ]);
      setPips(pipRes.data || []);
      setEmployees(empRes || []);
    } catch (err) {
      setError('Failed to load performance plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPIPs();
  }, [fetchPIPs]);

  const handleCreatePip = async () => {
    try {
      await performanceService.createPip(newPip);
      enqueueSnackbar('PIP created successfully', { variant: 'success' });
      setOpenDialog(false);
      fetchPIPs();
    } catch (err) {
      enqueueSnackbar('Failed to create PIP', { variant: 'error' });
    }
  };

  const filteredPips = pips.filter(pip => pip.status === statusFilter);

  const isManager = ['Admin', 'Manager', 'HR'].includes(currentUser?.role);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            onClick={() => setStatusFilter('In Progress')}
            sx={{ 
              fontWeight: 900,
              border: '2px solid #000',
              borderRadius: 0,
              bgcolor: statusFilter === 'In Progress' ? '#000' : 'transparent',
              color: statusFilter === 'In Progress' ? '#fff' : '#000',
              '&:hover': { bgcolor: statusFilter === 'In Progress' ? '#222' : alpha('#000', 0.05) }
            }}
          >
            IN PROGRESS
          </Button>
          <Button 
            onClick={() => setStatusFilter('Completed')}
            sx={{ 
              fontWeight: 900,
              border: '2px solid #000',
              borderRadius: 0,
              bgcolor: statusFilter === 'Completed' ? '#000' : 'transparent',
              color: statusFilter === 'Completed' ? '#fff' : '#000',
              '&:hover': { bgcolor: statusFilter === 'Completed' ? '#222' : alpha('#000', 0.05) }
            }}
          >
            COMPLETED
          </Button>
          <Button 
            onClick={() => setStatusFilter('Cancelled')}
            sx={{ 
              fontWeight: 900,
              border: '2px solid #000',
              borderRadius: 0,
              bgcolor: statusFilter === 'Cancelled' ? '#000' : 'transparent',
              color: statusFilter === 'Cancelled' ? '#fff' : '#000',
              '&:hover': { bgcolor: statusFilter === 'Cancelled' ? '#222' : alpha('#000', 0.05) }
            }}
          >
            CANCELLED
          </Button>
        </Box>

        {isManager && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{
              bgcolor: '#fa5252',
              color: '#fff',
              fontWeight: 900,
              borderRadius: 0,
              border: '2px solid #000',
              boxShadow: '4px 4px 0px #000',
              '&:hover': { bgcolor: '#e03131', transform: 'translate(-2px, -2px)', boxShadow: '6px 6px 0px #000' }
            }}
          >
            INITIATE PIP
          </Button>
        )}
      </Box>

      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filteredPips.length === 0 ? (
        <Box sx={{ p: 4, border: '2px dashed #000', textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 800 }}>No {statusFilter.toLowerCase()} plans found.</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredPips.map((pip) => (
            <Grid item xs={12} key={pip._id}>
              <Paper sx={{ 
                p: 3, 
                border: '3px solid #000', 
                borderRadius: 0,
                bgcolor: pip.status === 'In Progress' ? alpha('#fa5252', 0.05) : 
                         pip.status === 'Completed' ? alpha('#40c057', 0.05) : alpha('#adb5bd', 0.1)
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {pip.status === 'In Progress' && <WarningAmberIcon sx={{ mr: 1, color: '#fa5252' }} />}
                  {pip.status === 'Completed' && <CheckCircleOutlineIcon sx={{ mr: 1, color: '#40c057' }} />}
                  <Typography variant="h6" sx={{ fontWeight: 900, flex: 1 }}>{pip.title}</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 800, whiteSpace: 'nowrap', ml: 2 }}>
                    {pip.start_date.split('T')[0]} - {pip.end_date ? pip.end_date.split('T')[0] : 'Ongoing'}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 2 }}>{pip.description}</Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={`Assigned to: ${pip.employee_id}`}
                      sx={{ borderRadius: 0, border: '1px solid #000', fontWeight: 700 }}
                    />
                    <Chip 
                      label={pip.status}
                      sx={{ 
                        borderRadius: 0, 
                        border: '1px solid #000', 
                        fontWeight: 700,
                        bgcolor: pip.status === 'In Progress' ? '#fa5252' : 
                                 pip.status === 'Completed' ? '#40c057' : '#adb5bd',
                        color: '#fff'
                      }}
                    />
                  </Box>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      setSelectedPip(pip);
                      setOpenDetails(true);
                    }}
                    sx={{ 
                      fontWeight: 900, 
                      bgcolor: '#000', 
                      color: '#fff', 
                      borderRadius: 0,
                      px: 2,
                      '&:hover': { bgcolor: '#222' }
                    }}
                  >
                    VIEW DETAILS
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Creation Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        PaperProps={{
          sx: { borderRadius: 0, border: '4px solid #000', boxShadow: '15px 15px 0px #000' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Initiate Performance Improvement Plan</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Autocomplete
              options={employees}
              getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.employee_id})`}
              onChange={(event, newValue) => {
                setNewPip({ ...newPip, employee_id: newValue ? newValue.employee_id : '' });
              }}
              renderInput={(params) => <TextField {...params} label="Select Employee" required />}
            />
            <TextField
              label="Plan Title"
              fullWidth
              value={newPip.title}
              onChange={(e) => setNewPip({...newPip, title: e.target.value})}
            />
            <TextField
              label="Description"
              multiline
              rows={3}
              fullWidth
              value={newPip.description}
              onChange={(e) => setNewPip({...newPip, description: e.target.value})}
            />
            <TextField
              label="End Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={newPip.end_date}
              onChange={(e) => setNewPip({...newPip, end_date: e.target.value})}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ fontWeight: 800, color: '#000' }}>Cancel</Button>
          <Button 
            onClick={handleCreatePip}
            variant="contained"
            sx={{ bgcolor: '#000', color: '#fff', fontWeight: 800, borderRadius: 0 }}
          >
            Create Plan
          </Button>
        </DialogActions>
      </Dialog>

      {/* Details/Edit Dialog */}
      <Dialog 
        open={openDetails} 
        onClose={() => setOpenDetails(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 0, border: '4px solid #000', boxShadow: '15px 15px 0px #000' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Update Performance Plan</DialogTitle>
        <DialogContent>
          {selectedPip && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Employee: {selectedPip.employee_id}
              </Typography>
              <TextField
                label="Status"
                select
                fullWidth
                value={selectedPip.status}
                onChange={(e) => setSelectedPip({ ...selectedPip, status: e.target.value })}
              >
                <MenuItem value="In Progress">In Progress</MenuItem>
                <MenuItem value="Completed">Completed</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </TextField>
              <TextField
                label="Manager Notes"
                multiline
                rows={4}
                fullWidth
                value={selectedPip.manager_notes || ''}
                onChange={(e) => setSelectedPip({ ...selectedPip, manager_notes: e.target.value })}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDetails(false)} sx={{ fontWeight: 800, color: '#000' }}>Cancel</Button>
          <Button 
            onClick={async () => {
              try {
                await performanceService.updatePip(selectedPip._id, selectedPip);
                enqueueSnackbar('PIP updated successfully', { variant: 'success' });
                setOpenDetails(false);
                fetchPIPs();
              } catch (err) {
                enqueueSnackbar('Failed to update PIP', { variant: 'error' });
              }
            }}
            variant="contained"
            sx={{ bgcolor: '#000', color: '#fff', fontWeight: 800, borderRadius: 0 }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PIPTab;
