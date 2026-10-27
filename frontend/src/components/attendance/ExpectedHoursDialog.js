import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Alert } from '@mui/material';
import { useSnackbar } from 'notistack';
import attendanceService from '../../services/attendanceService';

/** HR sets how many hours a person is expected to work on a working day (blank = the company default). */
const ExpectedHoursDialog = ({ employee, current, defaultHours, onClose, onSaved }) => {
  const [value, setValue] = useState(current ? String(current) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const save = async () => {
    const hours = value.trim() === '' ? null : Number(value);
    if (hours !== null && (!Number.isFinite(hours) || hours < 1 || hours > 16)) {
      setError('Enter hours between 1 and 16, or leave it blank for the company default.');
      return;
    }
    setSaving(true);
    try {
      await attendanceService.setExpectedHours(employee.id, hours);
      enqueueSnackbar(hours === null ? `${employee.name} now follows the company default` : `${employee.name} is now expected to work ${hours} hours a day`, { variant: 'success' });
      onSaved();
    } catch (e) {
      setError(e.response?.data?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 900 }}>Expected hours for {employee.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          How many hours a day this person should work (part-time or shorter shifts). Leave blank to follow the company default of {defaultHours} hours.
          A day counts as short when they work more than 15 minutes under it.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          autoFocus fullWidth type="number" label="Hours per working day" value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          placeholder={String(defaultHours)} inputProps={{ min: 1, max: 16, step: 0.5 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpectedHoursDialog;
