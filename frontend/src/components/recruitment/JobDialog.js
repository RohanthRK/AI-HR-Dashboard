import React, { useEffect, useState } from 'react';
import {
  Alert, Autocomplete, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import api from '../../services/api';

const EMPTY = {
  title: '', department: '', location: 'Bengaluru (hybrid)', skills: '', experience: '', education: '', employment_type: 'Full-time',
  openings: 1, salary_min_lpa: '', salary_max_lpa: '', status: 'Open', description: '',
};
const LOCATIONS = ['Bengaluru (hybrid)', 'Bengaluru (on-site)', 'Hyderabad (hybrid)', 'Pune (hybrid)', 'Mumbai (on-site)', 'Chennai (on-site)', 'Gurugram (hybrid)', 'Noida (on-site)', 'Remote (India)'];
const TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];

/** Create or edit a job opening. Shared by the Recruitment and Job Matching pages. */
const JobDialog = ({ open, job, onClose, onSaved }) => {
  const [form, setForm] = useState(EMPTY);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setForm(job ? { ...EMPTY, ...Object.fromEntries(Object.entries(job).filter(([, v]) => v !== null && v !== undefined)) } : EMPTY);
    api.get('/api/employees/departments/').then((r) => setDepartments((r.data.results || r.data || []).map((d) => d.name).filter(Boolean))).catch(() => {});
  }, [open, job]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const generate = async () => {
    setWriting(true);
    try {
      const res = await api.post('/api/ai/generate-job-description/', form);
      set({ description: res.data.description });
    } catch (e) {
      setError(e.response?.data?.error || 'Could not write a description right now. You can type one instead.');
    }
    setWriting(false);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = job?._id ? await api.put(`/api/recruitment/jobs/${job._id}/`, form) : await api.post('/api/recruitment/jobs/', form);
      onSaved(res.data.job);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Could not save the job opening.');
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{job?._id ? 'Edit job opening' : 'New job opening'}</DialogTitle>
      <DialogContent sx={{ pt: '16px !important' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}><TextField fullWidth required label="Job title" value={form.title} onChange={(e) => set({ title: e.target.value })} /></Grid>
          <Grid item xs={12} md={4}>
            <Autocomplete freeSolo options={departments} inputValue={form.department} onInputChange={(e, v) => set({ department: v })}
              renderInput={(params) => <TextField {...params} label="Department" />} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete freeSolo options={LOCATIONS} inputValue={form.location} onInputChange={(e, v) => set({ location: v })}
              renderInput={(params) => <TextField {...params} label="Location" />} />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField select fullWidth label="Employment type" value={form.employment_type} onChange={(e) => set({ employment_type: e.target.value })}>
              {TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={6} md={3}><TextField fullWidth type="number" label="Positions" inputProps={{ min: 1 }} value={form.openings} onChange={(e) => set({ openings: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField fullWidth label="Required skills (comma separated)" placeholder="Python, Django, PostgreSQL" value={form.skills} onChange={(e) => set({ skills: e.target.value })} /></Grid>
          <Grid item xs={6} md={3}><TextField fullWidth label="Experience (years)" type="number" inputProps={{ min: 0 }} value={form.experience} onChange={(e) => set({ experience: e.target.value })} /></Grid>
          <Grid item xs={6} md={3}><TextField fullWidth label="Budget from (₹ LPA)" type="number" inputProps={{ min: 0 }} value={form.salary_min_lpa} onChange={(e) => set({ salary_min_lpa: e.target.value })} /></Grid>
          <Grid item xs={6} md={3}><TextField fullWidth label="Budget to (₹ LPA)" type="number" inputProps={{ min: 0 }} value={form.salary_max_lpa} onChange={(e) => set({ salary_max_lpa: e.target.value })} /></Grid>
          <Grid item xs={6} md={3}>
            <TextField select fullWidth label="Status" value={form.status} onChange={(e) => set({ status: e.target.value })}>
              {['Open', 'On hold', 'Closed'].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid item xs={12}><TextField fullWidth label="Education" placeholder="B.E. / B.Tech in CS or equivalent" value={form.education} onChange={(e) => set({ education: e.target.value })} /></Grid>
          <Grid item xs={12}><TextField fullWidth multiline minRows={4} label="Description" value={form.description} onChange={(e) => set({ description: e.target.value })} /></Grid>
        </Grid>
        <Button sx={{ mt: 1 }} onClick={generate} disabled={!form.title.trim() || writing} startIcon={writing ? <CircularProgress size={16} /> : null}>
          Write the description with AI
        </Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!form.title.trim() || busy} onClick={save}>{job?._id ? 'Save changes' : 'Create opening'}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default JobDialog;
