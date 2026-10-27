import React, { useEffect, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import api from '../../services/api';
import ReviewViewer from './ReviewViewer';
import { formatDate } from '../../utils/format';

/** Performance reviews that a manager sent to the signed-in employee (renders nothing when there are none). */
const SharedReviews = () => {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);

  useEffect(() => { api.get('/api/ai/my-reviews/').then((r) => setRows(r.data.reviews || [])).catch(() => {}); }, []);

  const view = async (row) => {
    try {
      const res = await api.get(`/api/ai/saved-reviews/${row._id}/`);
      setOpen(res.data.review);
    } catch (e) { /* the list stays as it is */ }
  };

  if (!rows.length) return null;
  return (
    <Paper sx={{ mb: 3, border: '4px solid #000' }}>
      <Typography variant="h6" sx={{ p: 2, pb: 0, fontWeight: 900, textTransform: 'uppercase' }}>Reviews shared with you</Typography>
      <List>
        {rows.map((r) => (
          <ListItem key={r._id} divider secondaryAction={<Button size="small" variant="contained" onClick={() => view(r)}>Read</Button>}>
            <ListItemText primary={<>{r.title} <Chip size="small" sx={{ ml: 1 }} label={r.period} /></>}
              secondary={`Shared ${formatDate(r.delivered_at)}${r.created_by_name ? ` by ${r.created_by_name}` : ''}`} />
          </ListItem>
        ))}
      </List>
      <Dialog open={!!open} onClose={() => setOpen(null)} fullWidth maxWidth="md">
        {open && (
          <>
            <DialogTitle>{open.title}</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 1 }}><ReviewViewer review={open.review} comment={open.comment} /></Box>
            </DialogContent>
            <DialogActions><Button onClick={() => setOpen(null)}>Close</Button></DialogActions>
          </>
        )}
      </Dialog>
    </Paper>
  );
};

export default SharedReviews;
