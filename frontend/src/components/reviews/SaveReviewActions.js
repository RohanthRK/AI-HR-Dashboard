import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import SendIcon from '@mui/icons-material/Send';
import api from '../../services/api';

/**
 * "Save review" and "Send to employee / team" for a freshly generated AI review.
 * Saving twice does nothing new; sending asks for an optional note and then shows the result.
 */
const SaveReviewActions = ({ kind, subjectId, review, onOpenSaved }) => {
  const [state, setState] = useState({ id: null, status: null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [comment, setComment] = useState('');

  // A different review means a fresh save state
  useEffect(() => { setState({ id: null, status: null }); setMessage(null); }, [review, subjectId]);

  const call = async (deliver) => {
    setBusy(true);
    setMessage(null);
    try {
      let res;
      if (state.id) res = await api.put(`/api/ai/saved-reviews/${state.id}/`, { deliver: true, comment });
      else res = await api.post('/api/ai/saved-reviews/', { kind, subject_id: subjectId, review, deliver, comment });
      const doc = res.data.review;
      setState({ id: doc._id, status: doc.status });
      setMessage({
        severity: 'success',
        text: doc.status === 'Delivered'
          ? `Sent. ${kind === 'team' ? 'The team members were' : 'The employee was'} notified and can read it under Performance.`
          : (res.data.already_saved ? 'This review was already saved.' : 'Saved as a draft. You can find it under “Saved reviews”.'),
      });
      setSendOpen(false);
    } catch (e) {
      setMessage({ severity: 'error', text: e.response?.data?.error || e.response?.data?.message || 'Could not save the review.' });
    }
    setBusy(false);
  };

  const delivered = state.status === 'Delivered';
  return (
    <Box sx={{ mt: 2 }}>
      {message && (
        <Alert severity={message.severity} sx={{ mb: 2 }} action={message.severity === 'success' && onOpenSaved ? <Button color="inherit" size="small" onClick={onOpenSaved}>Open saved reviews</Button> : null}>
          {message.text}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<SaveIcon />} disabled={busy || !!state.id} onClick={() => call(false)}>
          {state.id ? 'Saved' : 'Save as draft'}
        </Button>
        <Button variant="contained" startIcon={<SendIcon />} disabled={busy || delivered} onClick={() => setSendOpen(true)}>
          {delivered ? 'Sent' : `Send to ${kind === 'team' ? 'team' : 'employee'}`}
        </Button>
      </Box>
      <Dialog open={sendOpen} onClose={() => setSendOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Send this review</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {kind === 'team' ? 'Every member of the team' : 'The employee'} will get a notification and can read the review under Performance. You can add a personal note.
          </DialogContentText>
          <TextField fullWidth multiline minRows={3} label="Note to share with the review (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSendOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={busy} onClick={() => call(true)}>Send</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SaveReviewActions;
