import React, { useState, useEffect } from 'react';

import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Autocomplete,
  IconButton,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import DeleteIcon from '@mui/icons-material/Delete';

import ChatIcon from '@mui/icons-material/Chat';

import HistoryIcon from '@mui/icons-material/History';

import SendIcon from '@mui/icons-material/Send';

import assetService from '../../services/assetService';

import authService from '../../services/authService';

import employeeService from '../../services/employeeService';

import { useAuth } from '../../contexts/AuthContext';


const Assets = () => {
    const { currentUser } = useAuth();
    const [assets, setAssets] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    
    // Asset details / conversation modal state
    const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [reassignTo, setReassignTo] = useState(null);
    const [reassignStatus, setReassignStatus] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const [newAsset, setNewAsset] = useState({
        name: '',
        type: 'Hardware',
        serialNumber: '',
        assignedTo: ''
    });

    const isAdmin = authService.isAdmin() || currentUser?.role === 'Admin';

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const response = await assetService.getAllAssets();
            if (response.success || response.status === 'success') {
                setAssets(response.assets || response.data || []);
            }
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const data = await employeeService.getAllEmployees();
            setEmployees(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
        }
    };

    useEffect(() => {
        fetchAssets();
        fetchEmployees();
    }, []);

    const handleCreateAsset = async () => {
        try {
            setLoading(true);
            const dataToSend = { ...newAsset };
            if (!dataToSend.assignedTo) {
                dataToSend.status = 'Available';
            } else {
                dataToSend.status = 'Assigned';
            }

            const response = await assetService.createAsset(dataToSend);
            if (response.success || response.status === 'success') {
                setOpenDialog(false);
                setNewAsset({ name: '', type: 'Hardware', serialNumber: '', assignedTo: '' });
                fetchAssets();
            }
        } catch (error) {
            console.error('Error creating asset:', error);
            setLoading(false);
        }
    };

    const handleDeleteAsset = async (id) => {
        if (!window.confirm('Delete this asset from inventory?')) return;
        try {
            await assetService.deleteAsset(id);
            fetchAssets();
        } catch (error) {
            console.error('Error deleting asset:', error);
        }
    };

    const handleOpenHistory = (asset) => {
        setSelectedAsset(asset);
        setReassignTo(null);
        setReassignStatus(asset.status || 'Available');
        setNewComment('');
        setOpenHistoryDialog(true);
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || !selectedAsset) return;
        try {
            setActionLoading(true);
            const res = await assetService.addComment(selectedAsset._id, newComment.trim());
            if (res.success && res.asset) {
                setSelectedAsset(res.asset);
                setNewComment('');
                fetchAssets();
            }
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateAssignment = async () => {
        if (!selectedAsset) return;
        try {
            setActionLoading(true);
            const updatePayload = {
                status: reassignStatus
            };
            if (reassignTo !== null) {
                updatePayload.assignedTo = reassignTo ? `${reassignTo.first_name} ${reassignTo.last_name} (${reassignTo.employee_id})` : '';
                if (!updatePayload.assignedTo) {
                    updatePayload.status = 'Available';
                } else if (reassignStatus === 'Available') {
                    updatePayload.status = 'Assigned';
                }
            }

            const res = await assetService.updateAsset(selectedAsset._id, updatePayload);
            if (res.success && res.asset) {
                setSelectedAsset(res.asset);
                setReassignTo(null);
                fetchAssets();
            }
        } catch (error) {
            console.error('Error updating asset assignment:', error);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    {isAdmin ? 'Asset Management' : 'My Assets'}
                </Typography>
                {isAdmin && (
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<AddIcon />}
                        onClick={() => setOpenDialog(true)}
                        className="brutal-shadow-hover"
                    >
                        Register New Asset
                    </Button>
                )}
            </Box>

            <Paper className="brutal-border brutal-shadow" sx={{ p: 0, bgcolor: 'background.paper' }} elevation={0}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress color="secondary" />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Asset Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Serial Number</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Assigned To</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {assets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            No assets in inventory yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    assets.map((asset) => (
                                        <TableRow key={asset._id}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>{asset.name}</TableCell>
                                            <TableCell>{asset.type}</TableCell>
                                            <TableCell sx={{ fontFamily: 'monospace' }}>{asset.serialNumber || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={asset.status}
                                                    size="small"
                                                    color={asset.status === 'Available' ? 'success' : asset.status === 'Assigned' ? 'info' : 'warning'}
                                                    sx={{ fontWeight: 'bold' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {asset.assignedTo ? (asset.assignedToName ? `${asset.assignedToName} (${asset.assignedToCode})` : asset.assignedTo) : <Typography variant="caption" color="text.secondary">Unassigned</Typography>}
                                            </TableCell>
                                            <TableCell sx={{ textAlign: 'center' }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                                    <Tooltip title="View Details & Transfer History">
                                                        <IconButton 
                                                            onClick={() => handleOpenHistory(asset)}
                                                            color="primary"
                                                            size="small"
                                                            sx={{ border: '1px solid #000' }}
                                                        >
                                                            <HistoryIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                    {isAdmin && (
                                                        <Tooltip title="Admin: Delete Asset">
                                                            <IconButton 
                                                                onClick={() => handleDeleteAsset(asset._id)}
                                                                color="error"
                                                                size="small"
                                                                sx={{ border: '1px solid #000' }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Register New Asset Dialog */}
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ className: 'brutal-border brutal-shadow', elevation: 0 }}
            >
                <DialogTitle sx={{ fontWeight: 800, textTransform: 'uppercase', borderBottom: '2px solid #000' }}>
                    Register New Asset
                </DialogTitle>
                <DialogContent sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        fullWidth
                        label="Asset Name / Model"
                        variant="outlined"
                        value={newAsset.name}
                        onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                        placeholder="e.g. MacBook Pro 16, Dell XPS, Dell Monitor"
                    />
                    <FormControl fullWidth>
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={newAsset.type}
                            label="Type"
                            onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                        >
                            <MenuItem value="Hardware">Hardware (Laptop / Monitor / Workstation)</MenuItem>
                            <MenuItem value="Software">Software License</MenuItem>
                            <MenuItem value="Accessory">Accessory (Keyboard / Mouse / Headset)</MenuItem>
                            <MenuItem value="Mobile">Mobile Device / Tablet</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Serial Number (Optional)"
                        variant="outlined"
                        value={newAsset.serialNumber}
                        onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                        placeholder="e.g. SN-849204910"
                    />
                    
                    {/* Employee Autocomplete Selector */}
                    <Autocomplete
                        options={employees}
                        getOptionLabel={(option) => 
                            typeof option === 'string' ? option : `${option.first_name || ''} ${option.last_name || ''} (${option.employee_id || option.email || ''})`.trim()
                        }
                        onChange={(event, newValue) => {
                            if (newValue) {
                                const empStr = `${newValue.first_name} ${newValue.last_name} (${newValue.employee_id || newValue.email})`.trim();
                                setNewAsset({ ...newAsset, assignedTo: empStr });
                            } else {
                                setNewAsset({ ...newAsset, assignedTo: '' });
                            }
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Assign To Employee (Optional)"
                                placeholder="Search by employee name or ID"
                                helperText="Leave empty if asset is unassigned and currently in inventory"
                            />
                        )}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '2px solid #000' }}>
                    <Button onClick={() => setOpenDialog(false)} color="inherit" sx={{ border: '2px solid #000' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateAsset}
                        variant="contained"
                        color="secondary"
                        disabled={!newAsset.name || loading}
                        className="brutal-shadow-hover"
                    >
                        Add to Inventory
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Asset Details & History / Internal Conversation Timeline Dialog */}
            <Dialog
                open={openHistoryDialog}
                onClose={() => setOpenHistoryDialog(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{ className: 'brutal-border brutal-shadow', elevation: 0 }}
            >
                <DialogTitle sx={{ fontWeight: 900, textTransform: 'uppercase', borderBottom: '3px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Asset Details & Custody Timeline</span>
                    {selectedAsset && (
                        <Chip 
                            label={selectedAsset.status} 
                            color={selectedAsset.status === 'Available' ? 'success' : selectedAsset.status === 'Assigned' ? 'info' : 'warning'}
                            sx={{ fontWeight: 800 }}
                        />
                    )}
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    {selectedAsset && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {/* Asset Summary Info */}
                            <Paper sx={{ p: 2, border: '2px solid #000', bgcolor: 'action.hover' }}>
                                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
                                    <Typography variant="body2"><strong>Asset Name:</strong> {selectedAsset.name}</Typography>
                                    <Typography variant="body2"><strong>Type:</strong> {selectedAsset.type}</Typography>
                                    <Typography variant="body2"><strong>Serial Number:</strong> {selectedAsset.serialNumber || 'N/A'}</Typography>
                                    <Typography variant="body2"><strong>Current Custodian:</strong> {selectedAsset.assignedTo || 'Unassigned (In Inventory)'}</Typography>
                                </Box>
                            </Paper>

                            {/* Admin Transfer / Status Management */}
                            {isAdmin && (
                                <Paper sx={{ p: 2, border: '2px dashed #000', bgcolor: '#fff' }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1.5, textTransform: 'uppercase' }}>
                                        Admin Actions: Reassign Custody / Change Status
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center' }}>
                                        <Box sx={{ flex: 1, width: '100%' }}>
                                            <Autocomplete
                                                options={employees}
                                                getOptionLabel={(option) => 
                                                    typeof option === 'string' ? option : `${option.first_name || ''} ${option.last_name || ''} (${option.employee_id || ''})`.trim()
                                                }
                                                value={reassignTo}
                                                onChange={(e, val) => setReassignTo(val)}
                                                renderInput={(params) => (
                                                    <TextField {...params} size="small" label="Reassign to Employee" placeholder="Select new custodian" />
                                                )}
                                            />
                                        </Box>
                                        <FormControl size="small" sx={{ minWidth: 150, width: { xs: '100%', sm: 'auto' } }}>
                                            <InputLabel>Status</InputLabel>
                                            <Select
                                                value={reassignStatus}
                                                label="Status"
                                                onChange={(e) => setReassignStatus(e.target.value)}
                                            >
                                                <MenuItem value="Available">Available</MenuItem>
                                                <MenuItem value="Assigned">Assigned</MenuItem>
                                                <MenuItem value="Under Repair">Under Repair</MenuItem>
                                                <MenuItem value="Retired">Retired</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <Button
                                            variant="contained"
                                            sx={{ bgcolor: '#000', color: '#fff', fontWeight: 800, height: 40, whiteSpace: 'nowrap' }}
                                            onClick={handleUpdateAssignment}
                                            disabled={actionLoading}
                                        >
                                            Apply Changes
                                        </Button>
                                    </Box>
                                </Paper>
                            )}

                            {/* Custody History & Conversation Log */}
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1.5, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ChatIcon fontSize="small" /> Custody History & Conversation Log
                                </Typography>

                                <Box sx={{ 
                                    maxHeight: 280, 
                                    overflowY: 'auto', 
                                    p: 1.5, 
                                    bgcolor: '#f8f9fa', 
                                    border: '2px solid #000',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1.5
                                }}>
                                    {selectedAsset.history && selectedAsset.history.length > 0 ? (
                                        selectedAsset.history.map((entry, idx) => (
                                            <Paper 
                                                key={idx} 
                                                sx={{ 
                                                    p: 1.5, 
                                                    border: '1px solid #dee2e6', 
                                                    borderLeft: `5px solid ${entry.is_system ? '#000' : '#40c057'}`,
                                                    bgcolor: '#fff' 
                                                }}
                                            >
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                                                        {entry.author || 'System'} {entry.is_system ? '(System Log)' : '(Admin Note)'}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary">
                                                        {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Recent'}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" sx={{ fontWeight: entry.is_system ? 600 : 400 }}>
                                                    {entry.text}
                                                </Typography>
                                                {entry.assignedTo && (
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                                        Assigned Custodian: <strong>{entry.assignedTo}</strong>
                                                    </Typography>
                                                )}
                                            </Paper>
                                        ))
                                    ) : (
                                        <Typography variant="body2" sx={{ p: 2, fontStyle: 'italic', color: 'text.secondary', textAlign: 'center' }}>
                                            No history or updates logged yet.
                                        </Typography>
                                    )}
                                </Box>
                            </Box>

                            {/* Message / Update input - ADMIN ONLY */}
                            {isAdmin ? (
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={2}
                                        label="Post internal note / update"
                                        placeholder="Enter details regarding this asset's status, condition, or custody..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        size="small"
                                    />
                                    <Button
                                        variant="contained"
                                        color="secondary"
                                        onClick={handleAddComment}
                                        disabled={!newComment.trim() || actionLoading}
                                        sx={{ height: 60, minWidth: 100, fontWeight: 900 }}
                                        startIcon={<SendIcon />}
                                    >
                                        Post
                                    </Button>
                                </Box>
                            ) : (
                                <Paper sx={{ p: 1.5, bgcolor: 'action.hover', border: '1px dashed #adb5bd', textAlign: 'center' }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                                        Read-only history timeline. Only administrators can post notes or reassign assets.
                                    </Typography>
                                </Paper>
                            )}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '2px solid #000' }}>
                    <Button onClick={() => setOpenHistoryDialog(false)} color="inherit" sx={{ border: '2px solid #000', fontWeight: 800 }}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Assets;
