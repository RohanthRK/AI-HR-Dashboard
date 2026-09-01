import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, TextField,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, Select, MenuItem,
    FormControl, InputLabel, CircularProgress, Divider
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import expenseService from '../../services/expenseService';
import authService from '../../services/authService';
import { IconButton, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CommentIcon from '@mui/icons-material/Comment';
import { useSnackbar } from 'notistack';

const Expenses = () => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [openCommentDialog, setOpenCommentDialog] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [newExpense, setNewExpense] = useState({
        title: '',
        amount: '',
        category: 'Travel',
        description: ''
    });
    const { enqueueSnackbar } = useSnackbar();

    const user = authService.getCurrentUser();
    const isAdmin = authService.isAdmin();

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const response = await expenseService.getAllExpenses();
            if (response.success || response.status === 'success') {
                setExpenses(response.expenses || response.data || []);
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleCreateExpense = async () => {
        try {
            setLoading(true);
            // Backend automatically tags employee_id/user_id from JWT
            const response = await expenseService.createExpense({
                ...newExpense,
                amount: parseFloat(newExpense.amount) || 0
            });
            if (response.success || response.status === 'success') {
                setOpenDialog(false);
                setNewExpense({ title: '', amount: '', category: 'Travel', description: '' });
                enqueueSnackbar('Expense claim submitted successfully', { variant: 'success' });
                fetchExpenses();
            }
        } catch (error) {
            console.error('Error creating expense:', error);
            enqueueSnackbar('Failed to submit expense claim', { variant: 'error' });
            setLoading(false);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm('Delete this expense?')) return;
        try {
            await expenseService.deleteExpense(id);
            fetchExpenses();
        } catch (error) {
            console.error('Error deleting expense:', error);
        }
    };

    const handleAddComment = async () => {
        if (!selectedExpense || !newComment.trim()) return;

        try {
            const response = await expenseService.addComment(selectedExpense._id, newComment);
            if (response.success || response.status === 'success') {
                setNewComment('');
                setSelectedExpense(response.expense || response.data);
                enqueueSnackbar('Comment posted', { variant: 'success' });
                fetchExpenses(); // Refresh background list
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
                    My Expenses
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenDialog(true)}
                    className="brutal-shadow-hover"
                >
                    Claim Expense
                </Button>
            </Box>

            <Paper className="brutal-border brutal-shadow" sx={{ p: 0, bgcolor: 'background.paper' }} elevation={0}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer>
                        <Table>
                            <TableHead>
                                <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Date Submitted</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                            No expenses claimed yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((expense) => (
                                        <TableRow key={expense._id}>
                                            <TableCell>{expense.title}</TableCell>
                                            <TableCell><Chip label={expense.category} size="small" variant="outlined" /></TableCell>
                                            <TableCell>${expense.amount ? parseFloat(expense.amount).toFixed(2) : '0.00'}</TableCell>
                                            <TableCell>{expense.submittedAt ? new Date(expense.submittedAt).toLocaleDateString() : 'N/A'}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={expense.status}
                                                    size="small"
                                                    color={expense.status === 'Approved' ? 'success' : expense.status === 'Rejected' ? 'error' : 'warning'}
                                                    sx={{ fontWeight: 'bold' }}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Tooltip title="View Details & Comments">
                                                        <IconButton
                                                            onClick={() => {
                                                                setSelectedExpense(expense);
                                                                setOpenCommentDialog(true);
                                                            }}
                                                            color="primary"
                                                            size="small"
                                                            sx={{
                                                                border: '2px solid #000',
                                                                borderRadius: '0',
                                                                bgcolor: 'action.hover',
                                                                '&:hover': { bgcolor: 'action.selected' }
                                                            }}
                                                        >
                                                            <CommentIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Delete Claim">
                                                        <IconButton 
                                                            onClick={() => handleDeleteExpense(expense._id)}
                                                            color="error"
                                                            size="small"
                                                            disabled={expense.status === 'Approved'}
                                                            sx={{
                                                                border: '2px solid #000',
                                                                borderRadius: '0',
                                                                bgcolor: 'action.hover',
                                                                '&:hover': { bgcolor: 'action.selected' }
                                                            }}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
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

            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                PaperProps={{ className: 'brutal-border brutal-shadow', elevation: 0 }}
            >
                <DialogTitle sx={{ fontWeight: 800, textTransform: 'uppercase', borderBottom: '2px solid #000' }}>
                    New Expense Claim
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <TextField
                        fullWidth
                        label="Expense Title"
                        variant="outlined"
                        margin="normal"
                        value={newExpense.title}
                        onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Category</InputLabel>
                        <Select
                            value={newExpense.category}
                            label="Category"
                            onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                        >
                            <MenuItem value="Travel">Travel</MenuItem>
                            <MenuItem value="Meals">Meals</MenuItem>
                            <MenuItem value="Supplies">Supplies</MenuItem>
                            <MenuItem value="Training">Training</MenuItem>
                            <MenuItem value="Other">Other</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Amount ($)"
                        type="number"
                        variant="outlined"
                        margin="normal"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        multiline
                        rows={3}
                        variant="outlined"
                        margin="normal"
                        value={newExpense.description}
                        onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2, borderTop: '2px solid #000' }}>
                    <Button onClick={() => setOpenDialog(false)} color="inherit" sx={{ border: '2px solid #000' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleCreateExpense}
                        variant="contained"
                        color="primary"
                        disabled={!newExpense.title || !newExpense.amount}
                        className="brutal-shadow-hover"
                    >
                        Submit Claim
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Expense Details & Comments Dialog */}
            <Dialog
                open={openCommentDialog}
                onClose={() => setOpenCommentDialog(false)}
                PaperProps={{ className: 'brutal-border brutal-shadow', elevation: 0, sx: { bgcolor: 'background.paper' } }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ fontWeight: 800, textTransform: 'uppercase', borderBottom: '2px solid #000', bgcolor: 'action.hover' }}>
                    Expense Details & Comments
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Title:</Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>{selectedExpense?.title}</Typography>
                        
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Category & Amount:</Typography>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                            <Chip label={selectedExpense?.category} size="small" variant="outlined" sx={{ mr: 1 }} /> 
                            <strong>${selectedExpense?.amount ? parseFloat(selectedExpense.amount).toFixed(2) : '0.00'}</strong>
                        </Typography>

                        {selectedExpense?.description && (
                            <>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Description:</Typography>
                                <Typography variant="body2" sx={{ mb: 2, p: 2, bgcolor: 'action.hover', border: '1px solid #ddd' }}>
                                    {selectedExpense.description}
                                </Typography>
                            </>
                        )}

                        {/* Status update logic with role check */}
                        <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                            <InputLabel>Expense Status</InputLabel>
                            <Select
                                value={selectedExpense?.status || 'Pending'}
                                label="Expense Status"
                                disabled={!isAdmin}
                                onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    try {
                                        const response = await expenseService.updateExpenseStatus(selectedExpense._id, { status: newStatus });
                                        if (response.success || response.status === 'success') {
                                            setSelectedExpense(response.expense || response.data);
                                            enqueueSnackbar(`Status updated to ${newStatus}`, { variant: 'success' });
                                            fetchExpenses();
                                        }
                                    } catch (err) {
                                        enqueueSnackbar('Only Admin can change the status', { variant: 'error' });
                                    }
                                }}
                            >
                                <MenuItem value="Pending">Pending</MenuItem>
                                <MenuItem value="Approved">Approved</MenuItem>
                                <MenuItem value="Rejected">Rejected</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>

                    <Divider sx={{ mb: 2, borderBottomWidth: 3, borderColor: '#000' }} />
                    
                    <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, textTransform: 'uppercase' }}>Updates & Feed</Typography>
                    {selectedExpense?.comments && selectedExpense.comments.length > 0 ? (
                        <Box sx={{ mb: 3, maxHeight: '200px', overflowY: 'auto', p: 1 }}>
                            {selectedExpense.comments.map((c, i) => (
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

export default Expenses;
