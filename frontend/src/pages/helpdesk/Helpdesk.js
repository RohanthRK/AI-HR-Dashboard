import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, TextField,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, FormControl,
    InputLabel, Select, MenuItem, CircularProgress,
    IconButton, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CommentIcon from '@mui/icons-material/Comment';
import helpdeskService from '../../services/helpdeskService';
import { useSnackbar } from 'notistack';

const Helpdesk = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openCommentDialog, setOpenCommentDialog] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [newComment, setNewComment] = useState('');
    const { enqueueSnackbar } = useSnackbar();

    const [newTicket, setNewTicket] = useState({
        subject: '',
        category: 'IT Support',
        priority: 'Medium',
        description: ''
    });

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const response = await helpdeskService.getAllTickets();
            if (response.success || response.status === 'success') {
                setTickets(response.tickets || response.data || []);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
            enqueueSnackbar('Failed to load support tickets', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const handleCreateTicket = async () => {
        try {
            setLoading(true);
            const response = await helpdeskService.createTicket(newTicket);
            if (response.success || response.status === 'success') {
                setOpenDialog(false);
                setNewTicket({ subject: '', category: 'IT Support', priority: 'Medium', description: '' });
                enqueueSnackbar('Support ticket raised successfully!', { variant: 'success' });
                fetchTickets();
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
            enqueueSnackbar('Failed to raise ticket', { variant: 'error' });
            setLoading(false);
        }
    };

    const handleAddComment = async () => {
        if (!selectedTicket || !newComment.trim()) return;

        try {
            const response = await helpdeskService.addComment(selectedTicket._id, newComment);
            if (response.success || response.status === 'success') {
                setNewComment('');
                // Update the local selected ticket state to show the new comment immediately
                setSelectedTicket(response.ticket || response.data);
                enqueueSnackbar('Comment posted', { variant: 'success' });
                fetchTickets(); // Refresh background list
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            enqueueSnackbar('Failed to add comment', { variant: 'error' });
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                    IT & HR Helpdesk
                </Typography>
                <Button
                    variant="contained"
                    color="warning"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                    className="brutal-shadow-hover"
                    sx={{ color: '#000', fontWeight: 'bold' }}
                >
                    Raise Ticket
                </Button>
            </Box>

            <Paper className="brutal-border brutal-shadow" sx={{ p: 0, bgcolor: 'background.paper' }} elevation={0}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress color="warning" />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Subject</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {tickets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            No support tickets found. Everything is running smoothly!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    tickets.map((ticket) => (
                                        <TableRow key={ticket._id}>
                                            <TableCell sx={{ fontWeight: 'bold' }}>{ticket.subject}</TableCell>
                                            <TableCell>{ticket.category}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={ticket.priority}
                                                    size="small"
                                                    color={ticket.priority === 'High' ? 'error' : ticket.priority === 'Medium' ? 'warning' : 'info'}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={ticket.status}
                                                    size="small"
                                                    variant="outlined"
                                                    sx={{ fontWeight: 'bold', border: '2px solid #000' }}
                                                />
                                            </TableCell>
                                            <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <IconButton
                                                    onClick={() => {
                                                        setSelectedTicket(ticket);
                                                        setOpenCommentDialog(true);
                                                    }}
                                                    sx={{
                                                        border: '2px solid #000',
                                                        borderRadius: '0',
                                                        bgcolor: 'action.hover',
                                                        '&:hover': { bgcolor: 'action.selected' }
                                                    }}
                                                >
                                                    <CommentIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* New Ticket Dialog */}
            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                PaperProps={{ className: 'brutal-border brutal-shadow', elevation: 0 }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ fontWeight: 800, textTransform: 'uppercase', borderBottom: '2px solid #000', backgroundColor: '#FFB800' }}>
                    Raise Support Ticket
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        label="Subject"
                        variant="outlined"
                        margin="normal"
                        value={newTicket.subject}
                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={newTicket.category}
                            label="Category"
                            onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                        >
                            <MenuItem value="IT Support">IT Support (Hardware/Software)</MenuItem>
                            <MenuItem value="HR Query">HR Query (Policies/Payroll)</MenuItem>
                            <MenuItem value="Facilities">Facilities/Admin</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Priority</InputLabel>
                        <Select
                            value={newTicket.priority}
                            label="Priority"
                            onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                        >
                            <MenuItem value="Low">Low</MenuItem>
                            <MenuItem value="Medium">Medium</MenuItem>
                            <MenuItem value="High">High (Urgent)</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Detailed Description"
                        multiline
                        rows={4}
                        variant="outlined"
                        margin="normal"
                        placeholder="Please provide as much context as possible..."
                        value={newTicket.description}
                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '2px solid #000' }}>
                    <Button onClick={() => setOpenDialog(false)} color="inherit" sx={{ border: '2px solid #000' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateTicket}
                        variant="contained"
                        color="warning"
                        sx={{ color: '#000', fontWeight: 'bold' }}
                        disabled={!newTicket.subject || !newTicket.description}
                        className="brutal-shadow-hover"
                    >
                        Submit Ticket
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Add Comment Dialog */}
            <Dialog
                open={openCommentDialog}
                onClose={() => setOpenCommentDialog(false)}
                PaperProps={{ className: 'brutal-border brutal-shadow', elevation: 0, sx: { bgcolor: 'background.paper' } }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ fontWeight: 800, textTransform: 'uppercase', borderBottom: '2px solid #000', bgcolor: 'action.hover' }}>
                    Ticket Details & Updates
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Subject:</Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>{selectedTicket?.subject}</Typography>
                        
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Description:</Typography>
                        <Typography variant="body2" sx={{ mb: 2, p: 2, bgcolor: 'action.hover', border: '1px solid #ddd' }}>
                            {selectedTicket?.description}
                        </Typography>

                        {/* Status update logic with role check */}
                        <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                            <InputLabel>Ticket Status</InputLabel>
                            <Select
                                value={selectedTicket?.status || 'Open'}
                                label="Ticket Status"
                                onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    try {
                                        const response = await helpdeskService.updateTicket(selectedTicket._id, { status: newStatus });
                                        if (response.success) {
                                            setSelectedTicket(response.ticket);
                                            enqueueSnackbar(`Status updated to ${newStatus}`, { variant: 'success' });
                                            fetchTickets();
                                        }
                                    } catch (err) {
                                        enqueueSnackbar('Only IT/HR or Admin can change status', { variant: 'error' });
                                    }
                                }}
                            >
                                <MenuItem value="Open">Open</MenuItem>
                                <MenuItem value="In Progress">In Progress</MenuItem>
                                <MenuItem value="Resolved">Resolved</MenuItem>
                                <MenuItem value="Closed">Closed</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Divider sx={{ mb: 2, borderBottomWidth: 3, borderColor: '#000' }} />
                    
                    <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase' }}>Updates & Feed</Typography>
                    {selectedTicket?.comments && selectedTicket.comments.length > 0 ? (
                        <Box sx={{ mb: 3, maxHeight: '200px', overflowY: 'auto', p: 1 }}>
                            {selectedTicket.comments.map((c, i) => (
                                <Paper key={i} sx={{ p: 2, mb: 1, bgcolor: 'action.hover', border: '2px solid #000', borderRadius: 0 }} elevation={0}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 900 }}>{c.author || 'User'}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(c.createdAt).toLocaleString()}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2">{c.text}</Typography>
                                </Paper>
                            ))}
                        </Box>
                    ) : (
                        <Typography variant="body2" sx={{ mb: 3, fontStyle: 'italic', color: 'text.secondary' }}>
                            No comments yet.
                        </Typography>
                    )}

                    <TextField
                        fullWidth
                        label="Add a comment or update"
                        multiline
                        rows={2}
                        variant="outlined"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '2px solid #000' }}>
                    <Button onClick={() => setOpenCommentDialog(false)} color="inherit" sx={{ border: '2px solid #000' }}>
                        Close
                    </Button>
                    <Button
                        onClick={handleAddComment}
                        variant="contained"
                        color="primary"
                        disabled={!newComment.trim()}
                        className="brutal-shadow-hover"
                    >
                        Post Comment
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Helpdesk;
