import React, { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import authService from '../../services/authService';

const MIN_LENGTH = 8;

/** Lets signed-in users change their own password. */
const ChangePasswordDialog = ({ open, onClose }) => {
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setForm({ current: '', next: '', confirm: '' });
    setError(null);
    setDone(false);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (form.next.length < MIN_LENGTH) return setError(`The new password must be at least ${MIN_LENGTH} characters.`);
    if (form.next !== form.confirm) return setError('The new password and its confirmation do not match.');
    if (form.next === form.current) return setError('Choose a password different from the current one.');
    setBusy(true);
    try {
      await authService.changePassword({ current_password: form.current, new_password: form.next });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not change the password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const field = (name, label, autoComplete) => (
    <TextField
      fullWidth
      required
      margin="normal"
      type="password"
      label={label}
      autoComplete={autoComplete}
      value={form[name]}
      onChange={(e) => setForm({ ...form, [name]: e.target.value })}
      disabled={busy || done}
    />
  );

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <form onSubmit={submit}>
        <DialogTitle sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Change password</DialogTitle>
        <DialogContent>
          {done ? (
            <Alert severity="success">Your password was changed. Use it the next time you sign in.</Alert>
          ) : (
            <>
              {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
              {field('current', 'Current password', 'current-password')}
              {field('next', 'New password', 'new-password')}
              {field('confirm', 'Confirm new password', 'new-password')}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={close}>{done ? 'Close' : 'Cancel'}</Button>
          {!done && <Button type="submit" variant="contained" disabled={busy || !form.current || !form.next || !form.confirm}>{busy ? 'Saving...' : 'Change password'}</Button>}
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ChangePasswordDialog;
