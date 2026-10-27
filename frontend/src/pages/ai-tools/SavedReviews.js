import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, MenuItem, Paper, Select, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../services/api';
import ReviewViewer from '../../components/reviews/ReviewViewer';
import { formatDate } from '../../utils/format';

/** Every AI performance review that was saved or sent, with search, filters, reading, sending and deleting. */
const SavedReviews = () => {
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState(null);
  const [f, setF] = useState({ q: '', kind: 'all', status: 'all', department: 'all' });
  const [open, setOpen] = useState(null);
  const [comment, setComment] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/ai/saved-reviews/');
      setRows(res.data.reviews);
    } catch (e) {
      setMessage({ severity: 'error', text: e.response?.data?.message || 'Could not load saved reviews.' });
    }
    setLoaded(true);
  }, []);
  useEffect(() => { load(); }, [load]);

  const view = async (row) => {
    try {
      const res = await api.get(`/api/ai/saved-reviews/${row._id}/`);
      setComment(res.data.review.comment || '');
      setOpen(res.data.review);
    } catch (e) { setMessage({ severity: 'error', text: 'Could not open the review.' }); }
  };

  const send = async (id) => {
    try {
      await api.put(`/api/ai/saved-reviews/${id}/`, { deliver: true, comment });
      setMessage({ severity: 'success', text: 'Sent. The employee was notified.' });
      setOpen(null);
      load();
    } catch (e) { setMessage({ severity: 'error', text: e.response?.data?.error || 'Could not send the review.' }); }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete “${row.title}”? ${row.status === 'Delivered' ? 'The employee will no longer see it.' : ''}`)) return;
    try {
      await api.delete(`/api/ai/saved-reviews/${row._id}/`);
      setOpen(null);
      load();
    } catch (e) { setMessage({ severity: 'error', text: 'Could not delete the review.' }); }
  };

  const departments = useMemo(() => [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(), [rows]);
  const shown = rows.filter((r) => (f.kind === 'all' || r.kind === f.kind) && (f.status === 'all' || r.status === f.status) &&
    (f.department === 'all' || r.department === f.department) && (!f.q.trim() || `${r.subject_name} ${r.department} ${r.created_by_name}`.toLowerCase().includes(f.q.trim().toLowerCase())));
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  return (
    <Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search employee, team or author" value={f.q} onChange={(e) => set({ q: e.target.value })} sx={{ flex: 1, minWidth: 220 }}
          inputProps={{ 'aria-label': 'Search saved reviews' }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
        <Select size="small" value={f.kind} onChange={(e) => set({ kind: e.target.value })} SelectDisplayProps={{ 'aria-label': 'Filter by type' }}>
          <MenuItem value="all">Employees and teams</MenuItem><MenuItem value="employee">Employees</MenuItem><MenuItem value="team">Teams</MenuItem>
        </Select>
        <Select size="small" value={f.status} onChange={(e) => set({ status: e.target.value })} SelectDisplayProps={{ 'aria-label': 'Filter by status' }}>
          <MenuItem value="all">Drafts and sent</MenuItem><MenuItem value="Draft">Drafts</MenuItem><MenuItem value="Delivered">Sent</MenuItem>
        </Select>
        {departments.length > 1 && (
          <Select size="small" value={f.department} onChange={(e) => set({ department: e.target.value })} SelectDisplayProps={{ 'aria-label': 'Filter by department' }}>
            <MenuItem value="all">All departments</MenuItem>
            {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </Select>
        )}
      </Paper>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>Review</TableCell><TableCell>Department</TableCell><TableCell>Period</TableCell><TableCell>Score</TableCell><TableCell>Status</TableCell><TableCell>Saved by</TableCell><TableCell>Saved on</TableCell><TableCell align="right">Action</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {loaded && shown.length === 0 && (
              <TableRow><TableCell colSpan={8}>{rows.length ? 'Nothing matches these filters.' : 'No saved reviews yet. Generate a review and press “Save as draft” or “Send”.'}</TableCell></TableRow>
            )}
            {shown.map((r) => (
              <TableRow key={r._id} hover sx={{ cursor: 'pointer' }} onClick={() => view(r)}>
                <TableCell><b>{r.subject_name}</b><Typography variant="caption" display="block" color="text.secondary">{r.kind === 'team' ? 'Team review' : 'Individual review'}</Typography></TableCell>
                <TableCell>{r.department || '-'}</TableCell>
                <TableCell>{r.period}</TableCell>
                <TableCell>{r.overall != null ? (r.overall > 5 ? `${Math.round(r.overall)}/100` : `${Number(r.overall).toFixed(1)}/5`) : '-'}</TableCell>
                <TableCell><Chip size="small" color={r.status === 'Delivered' ? 'success' : 'default'} label={r.status === 'Delivered' ? `Sent ${formatDate(r.delivered_at)}` : 'Draft'} /></TableCell>
                <TableCell>{r.created_by_name || '-'}</TableCell>
                <TableCell>{formatDate(r.created_at)}</TableCell>
                <TableCell align="right"><Button size="small" onClick={(e) => { e.stopPropagation(); view(r); }}>Open</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!open} onClose={() => setOpen(null)} fullWidth maxWidth="md">
        {open && (
          <>
            <DialogTitle>{open.title} <Chip size="small" sx={{ ml: 1 }} color={open.status === 'Delivered' ? 'success' : 'default'} label={open.status === 'Delivered' ? 'Sent' : 'Draft'} /></DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{[open.department, open.period, open.created_by_name && `by ${open.created_by_name}`].filter(Boolean).join(' · ')}</Typography>
              <ReviewViewer review={open.review} />
              {open.status !== 'Delivered' && (
                <TextField fullWidth multiline minRows={2} sx={{ mt: 2 }} label="Note to share with the review (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
              )}
            </DialogContent>
            <DialogActions>
              <Button color="error" onClick={() => remove(open)}>Delete</Button>
              <Button onClick={() => setOpen(null)}>Close</Button>
              {open.status !== 'Delivered' && <Button variant="contained" onClick={() => send(open._id)}>Send to {open.kind === 'team' ? 'team' : 'employee'}</Button>}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default SavedReviews;
