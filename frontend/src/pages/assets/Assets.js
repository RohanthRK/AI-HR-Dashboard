import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, TextField,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, FormControl,
    InputLabel, Select, MenuItem, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import assetService from '../../services/assetService';
import authService from '../../services/authService';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const Assets = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [newAsset, setNewAsset] = useState({
        name: '',
        type: 'Hardware',
        serialNumber: '',
        assignedTo: ''
    });

    const isAdmin = authService.isAdmin();

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

    useEffect(() => {
        fetchAssets();
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

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    Asset Management
                </Typography>
                <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                    className="brutal-shadow-hover"
                >
                    Add Asset
                </Button>
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
                                    {isAdmin && <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {assets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={isAdmin ? 6 : 5} align="center" sx={{ py: 3 }}>
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
                                                    color={asset.status === 'Available' ? 'success' : 'info'}
                                                    sx={{ fontWeight: 'bold' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {asset.assignedTo || <Typography variant="caption" color="text.secondary">Unassigned</Typography>}
                                            </TableCell>
                                            {isAdmin && (
                                                <TableCell>
                                                    <Tooltip title="Admin: Delete Asset">
                                                        <IconButton 
                                                            onClick={() => handleDeleteAsset(asset._id)}
                                                            color="error"
                                                            size="small"
                                                            disabled={!isAdmin}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                PaperProps={{ className: 'brutal-border brutal-shadow', elevation: 0 }}
            >
                <DialogTitle sx={{ fontWeight: 800, textTransform: 'uppercase', borderBottom: '2px solid #000' }}>
                    Register New Asset
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        label="Asset Name/Model"
                        variant="outlined"
                        margin="normal"
                        value={newAsset.name}
                        onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={newAsset.type}
                            label="Type"
                            onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                        >
                            <MenuItem value="Hardware">Hardware (Laptop/Monitor)</MenuItem>
                            <MenuItem value="Software">Software License</MenuItem>
                            <MenuItem value="Accessory">Accessory (Keyboard/Mouse)</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Serial Number (Optional)"
                        variant="outlined"
                        margin="normal"
                        value={newAsset.serialNumber}
                        onChange={(e) => setNewAsset({ ...newAsset, serialNumber: e.target.value })}
                    />
                    <TextField
                        fullWidth
                        label="Assign To (Employee ID or Email)"
                        placeholder="Leave blank if unassigned"
                        variant="outlined"
                        margin="normal"
                        value={newAsset.assignedTo}
                        onChange={(e) => setNewAsset({ ...newAsset, assignedTo: e.target.value })}
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
                        disabled={!newAsset.name}
                        className="brutal-shadow-hover"
                    >
                        Add to Inventory
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Assets;
