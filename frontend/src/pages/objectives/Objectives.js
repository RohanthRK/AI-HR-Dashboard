import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, TextField,
    Grid, Card, CardContent, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, LinearProgress, Slider,
    IconButton, CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import objectiveService from '../../services/objectiveService';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from 'notistack';

const Objectives = () => {
    const [objectives, setObjectives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        target_date: ''
    });

    const { currentUser } = useAuth();
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        fetchObjectives();
    }, [currentUser]);

    const fetchObjectives = async () => {
        try {
            setLoading(true);
            if (!currentUser?.id) return;
            const response = await objectiveService.getAllObjectives(currentUser.id);
            if (response.status === 'success' || response.success) {
                setObjectives(response.data || response.objectives || []);
            }
        } catch (error) {
            console.error('Error fetching objectives:', error);
            enqueueSnackbar('Failed to load objectives', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                employee_id: currentUser?.id
            };

            const response = await objectiveService.createObjective(payload);
            if (response.status === 'success' || response.success) {
                enqueueSnackbar('Objective created successfully', { variant: 'success' });
                setOpenDialog(false);
                fetchObjectives();
                setFormData({ title: '', description: '', target_date: '' });
            }
        } catch (error) {
            console.error('Error creating objective:', error);
            enqueueSnackbar('Failed to create objective', { variant: 'error' });
        }
    };

    const handleProgressChange = async (id, newValue) => {
        try {
            // Optimistic update
            const updatedObjectives = objectives.map(obj =>
                obj._id === id ? { ...obj, progress: newValue } : obj
            );
            setObjectives(updatedObjectives);

            // Status logic
            let status = 'On Track';
            if (newValue === 100) status = 'Completed';
            else if (newValue < 30) status = 'At Risk';

            await objectiveService.updateProgress(id, {
                progress: newValue,
                status: status
            });
        } catch (error) {
            console.error('Error updating progress:', error);
            enqueueSnackbar('Failed to update progress', { variant: 'error' });
            fetchObjectives(); // Revert on failure
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this objective?')) return;
        try {
            await objectiveService.deleteObjective(id);
            enqueueSnackbar('Objective deleted', { variant: 'success' });
            fetchObjectives();
        } catch (error) {
            console.error('Error deleting objective:', error);
            enqueueSnackbar('Failed to delete objective', { variant: 'error' });
        }
    };

    const getStatusColor = (status) => {
        if (status === 'Completed') return '#4CAF50'; // Green
        if (status === 'At Risk') return '#F44336'; // Red
        return '#2196F3'; // Blue
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    Performance OKRs
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                    className="brutal-shadow-hover"
                    sx={{ border: '3px solid #000', fontWeight: 900 }}
                >
                    New Objective
                </Button>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                    <CircularProgress />
                </Box>
            ) : objectives.length === 0 ? (
                <Paper className="brutal-border" sx={{ p: 5, textAlign: 'center', backgroundColor: '#F5F5F5' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>No Objectives Found</Typography>
                    <Typography variant="body1" sx={{ mt: 1 }}>Set your first goal to start tracking progress.</Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {objectives.map((obj) => (
                        <Grid item xs={12} md={6} lg={4} key={obj._id}>
                            <Card className="brutal-border brutal-shadow-hover" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 900, flex: 1 }}>{obj.title}</Typography>
                                        <IconButton size="small" onClick={() => handleDelete(obj._id)} sx={{ ml: 1, color: 'text.secondary' }}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                                        {obj.description || 'No description provided.'}
                                    </Typography>

                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Chip
                                            label={obj.status}
                                            size="small"
                                            sx={{
                                                fontWeight: 800,
                                                border: '2px solid #000',
                                                backgroundColor: getStatusColor(obj.status),
                                                color: '#FFF'
                                            }}
                                        />
                                        <Typography variant="caption" sx={{ fontWeight: 800 }}>
                                            Target: {obj.target_date || 'N/A'}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ mt: 3, mb: 1, p: 2, border: '2px solid #000', backgroundColor: '#FAFAFA' }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
                                            Progress: {obj.progress}%
                                        </Typography>
                                        <Slider
                                            value={obj.progress}
                                            onChange={(e, val) => handleProgressChange(obj._id, val)}
                                            onChangeCommitted={(e, val) => handleProgressChange(obj._id, val)}
                                            step={5}
                                            marks
                                            min={0}
                                            max={100}
                                            sx={{
                                                color: getStatusColor(obj.status),
                                                '& .MuiSlider-thumb': {
                                                    border: '2px solid #000',
                                                    width: 20,
                                                    height: 20,
                                                },
                                                '& .MuiSlider-track': {
                                                    border: '2px solid #000',
                                                    height: 8,
                                                },
                                                '& .MuiSlider-rail': {
                                                    border: '2px solid #000',
                                                    height: 8,
                                                    backgroundColor: '#E0E0E0',
                                                }
                                            }}
                                        />
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Add Objective Dialog */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth PaperProps={{ className: 'brutal-border', sx: { border: '4px solid #000' } }}>
                <DialogTitle sx={{ fontWeight: 900, borderBottom: '2px solid #000' }}>Create New Objective</DialogTitle>
                <form onSubmit={handleSubmit}>
                    <DialogContent sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <TextField
                                label="Objective Title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                required
                                fullWidth
                                InputProps={{ sx: { fontWeight: 600 } }}
                            />
                            <TextField
                                label="Description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                multiline
                                rows={3}
                                fullWidth
                            />
                            <TextField
                                label="Target Date"
                                name="target_date"
                                type="date"
                                value={formData.target_date}
                                onChange={handleInputChange}
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                            />
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 3, borderTop: '2px solid #000' }}>
                        <Button onClick={() => setOpenDialog(false)} sx={{ fontWeight: 800, color: 'text.secondary' }}>Cancel</Button>
                        <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 800, border: '2px solid #000' }}>
                            Create Objective
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default Objectives;
