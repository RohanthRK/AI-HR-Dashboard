import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  InputAdornment, LinearProgress, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../services/api';
import authService from '../../services/authService';
import { formatDate } from '../../utils/format';

const SELF_REASONS = ['Compensation', 'Career growth', 'Management', 'Work-life balance', 'Relocation', 'Higher studies', 'Personal', 'Other'];
const HR_REASONS = ['Performance', 'Retirement', 'End of contract', 'Compensation', 'Career growth', 'Management', 'Work-life balance', 'Relocation', 'Higher studies', 'Personal', 'Other'];
const EXIT_TYPES = ['Resignation', 'Termination', 'Retirement', 'End of contract'];
const COLORS = { Pending: 'warning', Approved: 'info', Rejected: 'error', Completed: 'success', Withdrawn: 'default' };
const STATUSES = ['Pending', 'Approved', 'Completed', 'Rejected', 'Withdrawn'];

const Stat = ({ label, value, hint }) => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>{label}</Typography>
    <Typography variant="h4">{value}</Typography>
    {hint && <Typography variant="body2" color="text.secondary">{hint}</Typography>}
  </Paper>
);

const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Offboarding = () => {
  const isStaff = authService.isAdmin();   // HR decides; managers only read their reports' requests
  const [requests, setRequests] = useState([]);
  const [notice, setNotice] = useState(60);
  const [stats, setStats] = useState(null);
  const [people, setPeople] = useState([]);
  const [message, setMessage] = useState(null);
  const [dialog, setDialog] = useState(null);                 // 'self' | 'hr'
  const [form, setForm] = useState({ last_working_day: '', reason_category: 'Career growth', reason: '', exit_type: 'Resignation', employee: null });
  const [openId, setOpenId] = useState(null);
  const [f, setF] = useState({ q: '', status: 'all', department: 'all', reason: 'all' });

  const fail = (e, fallback) => setMessage({ severity: 'error', text: e.response?.data?.error || fallback });

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/offboarding/');
      setRequests(res.data.requests);
      setNotice(res.data.notice_period_days || 60);
      if (isStaff) {
        const [a, e] = await Promise.all([api.get('/api/offboarding/analytics/'), api.get('/api/employees/', { params: { limit: 500, status: 'Active' } })]);
        setStats(a.data);
        setPeople(e.data.results || []);
      }
    } catch (e) { fail(e, 'Could not load requests.'); }
  }, [isStaff]);

  useEffect(() => { load(); }, [load]);

  const openDialog = (kind) => {
    setForm({ last_working_day: addDays(notice), reason_category: kind === 'hr' ? 'Performance' : 'Career growth', reason: '', exit_type: kind === 'hr' ? 'Termination' : 'Resignation', employee: null });
    setDialog(kind);
  };

  const submit = async () => {
    try {
      const payload = { last_working_day: form.last_working_day, reason_category: form.reason_category, reason: form.reason, exit_type: form.exit_type };
      if (dialog === 'hr') payload.employee_id = form.employee?._id;
      await api.post('/api/offboarding/', payload);
      setDialog(null);
      setMessage({ severity: 'success', text: dialog === 'hr' ? 'Exit recorded. Approve it to start the exit checklist.' : 'Your resignation request was submitted.' });
      load();
    } catch (e) { fail(e, 'Could not submit the request.'); }
  };

  const decide = async (request, status) => {
    try {
      await api.put(`/api/offboarding/${request._id}/`, { status });
      load();
    } catch (e) { fail(e, 'Could not update the request.'); }
  };

  const tick = async (request, item) => {
    try {
      await api.put(`/api/offboarding/${request._id}/checklist/${item.id}/`, { done: !item.done });
      load();
    } catch (e) { fail(e, 'Could not update the checklist.'); }
  };

  const departments = useMemo(() => [...new Set(requests.map((r) => r.department).filter(Boolean))].sort(), [requests]);
  const reasons = useMemo(() => [...new Set(requests.map((r) => r.reason_category).filter(Boolean))].sort(), [requests]);
  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return requests.filter((r) =>
      (f.status === 'all' || r.status === f.status) && (f.department === 'all' || r.department === f.department) &&
      (f.reason === 'all' || r.reason_category === f.reason) &&
      (!q || `${r.employee_name} ${r.employee_code} ${r.position} ${r.department} ${r.reason}`.toLowerCase().includes(q)));
  }, [requests, f]);
  const set = (patch) => setF((x) => ({ ...x, ...patch }));
  const statusCount = (s) => requests.filter((r) => r.status === s).length;
  const open = requests.find((r) => r._id === openId);

  const rowActions = (r) => (
    <>
      {isStaff && r.status === 'Pending' && <>
        <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); decide(r, 'Approved'); }}>Approve</Button>
        <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); decide(r, 'Rejected'); }}>Reject</Button>
      </>}
      {isStaff && r.status === 'Approved' && <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); setOpenId(r._id); }}>Checklist</Button>}
      {!isStaff && r.status === 'Pending' && <Button size="small" onClick={(e) => { e.stopPropagation(); decide(r, 'Withdrawn'); }}>Withdraw</Button>}
    </>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" component="h1">Exit Management</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {isStaff && <Button variant="contained" onClick={() => openDialog('hr')}>Record an exit</Button>}
          <Button variant="outlined" color="warning" onClick={() => openDialog('self')}>Submit my resignation</Button>
        </Box>
      </Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      {isStaff && stats && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}><Stat label="Waiting for a decision" value={stats.open_requests} hint="pending requests" /></Grid>
            <Grid item xs={6} md={3}><Stat label="Exits (12 months)" value={stats.exits_12m ?? stats.total_exits} hint={`${stats.total_exits} in total`} /></Grid>
            <Grid item xs={6} md={3}><Stat label="Attrition (12 months)" value={stats.turnover_rate_12m != null ? `${stats.turnover_rate_12m}%` : '-'} hint="exits ÷ average headcount" /></Grid>
            <Grid item xs={6} md={3}><Stat label="Average tenure at exit" value={stats.avg_tenure_years != null ? `${stats.avg_tenure_years} yrs` : '-'}
              hint={stats.exit_survey && !stats.exit_survey.hidden && stats.exit_survey.engagement_score != null ? `Exit interviews: ${stats.exit_survey.engagement_score}/5` : ''} /></Grid>
          </Grid>
          {Object.keys(stats.reasons).length > 0 && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>WHY PEOPLE LEAVE</Typography>
              {Object.entries(stats.reasons).map(([reason, count]) => <Chip key={reason} sx={{ mr: 1, mb: 0.5 }} label={`${reason}: ${count}`} />)}
            </Paper>
          )}
        </>
      )}

      <Paper sx={{ p: 2, mb: 2, display: 'grid', gap: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" placeholder="Search name, ID, role or reason" value={f.q} onChange={(e) => set({ q: e.target.value })}
            inputProps={{ 'aria-label': 'Search exit requests' }} sx={{ flex: 1, minWidth: 240 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
          {departments.length > 1 && (
            <Select size="small" value={f.department} onChange={(e) => set({ department: e.target.value })} SelectDisplayProps={{ 'aria-label': 'Filter by department' }}>
              <MenuItem value="all">All departments</MenuItem>
              {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
          )}
          <Select size="small" value={f.reason} onChange={(e) => set({ reason: e.target.value })} SelectDisplayProps={{ 'aria-label': 'Filter by reason' }}>
            <MenuItem value="all">All reasons</MenuItem>
            {reasons.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </Select>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          <Chip clickable color={f.status === 'all' ? 'primary' : 'default'} label={`All (${requests.length})`} onClick={() => set({ status: 'all' })} />
          {STATUSES.map((s) => <Chip key={s} clickable color={f.status === s ? 'primary' : 'default'} label={`${s} (${statusCount(s)})`} onClick={() => set({ status: s })} />)}
        </Box>
      </Paper>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>Employee</TableCell><TableCell>Department</TableCell><TableCell>Type</TableCell><TableCell>Last working day</TableCell><TableCell>Reason</TableCell><TableCell>Status</TableCell><TableCell align="right">Action</TableCell></TableRow>
          </TableHead>
          <TableBody>
            {shown.length === 0 && <TableRow><TableCell colSpan={7}>{requests.length ? 'Nothing matches these filters.' : 'No exit requests.'}</TableCell></TableRow>}
            {shown.map((r) => (
              <TableRow key={r._id} hover sx={{ cursor: 'pointer' }} onClick={() => setOpenId(r._id)}>
                <TableCell><b>{r.employee_name}</b><Typography variant="caption" display="block" color="text.secondary">{[r.employee_code, r.position].filter(Boolean).join(' · ')}</Typography></TableCell>
                <TableCell>{r.department || '-'}</TableCell>
                <TableCell>{r.exit_type || 'Resignation'}</TableCell>
                <TableCell>{formatDate(r.last_working_day)}</TableCell>
                <TableCell>{r.reason_category}</TableCell>
                <TableCell><Chip size="small" color={COLORS[r.status]} label={r.status} /></TableCell>
                <TableCell align="right">{rowActions(r)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!open} onClose={() => setOpenId(null)} fullWidth maxWidth="sm">
        {open && (
          <>
            <DialogTitle>
              {open.employee_name} <Chip size="small" color={COLORS[open.status]} label={open.status} sx={{ ml: 1 }} />
            </DialogTitle>
            <DialogContent>
              <Typography color="text.secondary" gutterBottom>{[open.employee_code, open.position, open.department].filter(Boolean).join(' · ')}</Typography>
              <Typography>{open.exit_type || 'Resignation'} · last working day <b>{formatDate(open.last_working_day)}</b></Typography>
              <Typography>Reason: {open.reason_category}{open.reason ? ` — ${open.reason}` : ''}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Requested {formatDate(open.requested_at)}{open.tenure_years_at_request != null ? ` · ${open.tenure_years_at_request} years of service` : ''}</Typography>
              {open.status === 'Approved' && open.checklist?.length > 0 && (
                <>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>EXIT CHECKLIST ({open.checklist.filter((c) => c.done).length}/{open.checklist.length})</Typography>
                  <LinearProgress aria-label="Exit checklist progress" variant="determinate" value={(open.checklist.filter((c) => c.done).length / open.checklist.length) * 100} sx={{ my: 1 }} />
                  {open.checklist.map((item) => (
                    <Box key={item.id}>
                      <FormControlLabel label={item.task} control={<Checkbox checked={item.done} disabled={!isStaff} onChange={() => tick(open, item)} />} />
                    </Box>
                  ))}
                </>
              )}
              {open.status === 'Pending' && <Alert severity="info">{isStaff ? 'Approve to start the exit checklist.' : 'Waiting for HR to approve.'}</Alert>}
            </DialogContent>
            <DialogActions>
              {isStaff && open.status === 'Pending' && <>
                <Button variant="contained" onClick={() => decide(open, 'Approved')}>Approve</Button>
                <Button color="error" onClick={() => { decide(open, 'Rejected'); setOpenId(null); }}>Reject</Button>
              </>}
              {isStaff && open.status === 'Approved' && (
                <Button variant="contained" disabled={open.checklist?.some((c) => !c.done)} onClick={() => { decide(open, 'Completed'); setOpenId(null); }}>Complete exit</Button>
              )}
              {!isStaff && open.status === 'Pending' && <Button onClick={() => { decide(open, 'Withdrawn'); setOpenId(null); }}>Withdraw</Button>}
              <Button onClick={() => setOpenId(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <Dialog open={!!dialog} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle>{dialog === 'hr' ? 'Record an exit' : 'Submit my resignation'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {dialog === 'hr' && (
            <>
              <Autocomplete options={people} value={form.employee} onChange={(e, v) => setForm({ ...form, employee: v })}
                getOptionLabel={(p) => `${`${p.first_name || ''} ${p.last_name || ''}`.trim()} (${p.employee_id})${p.department ? ` · ${p.department}` : ''}`}
                isOptionEqualToValue={(a, b) => a._id === b._id} renderInput={(params) => <TextField {...params} label="Employee" />} />
              <TextField select label="Exit type" value={form.exit_type} onChange={(e) => setForm({ ...form, exit_type: e.target.value })}>
                {EXIT_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </>
          )}
          <TextField label="Last working day" type="date" InputLabelProps={{ shrink: true }} value={form.last_working_day}
            helperText={`The usual notice period is ${notice} days.`} onChange={(e) => setForm({ ...form, last_working_day: e.target.value })} />
          <TextField select label="Main reason" value={form.reason_category} onChange={(e) => setForm({ ...form, reason_category: e.target.value })}>
            {(dialog === 'hr' ? HR_REASONS : SELF_REASONS).map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
          <TextField label="Details (optional)" multiline minRows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(null)}>Cancel</Button>
          <Button variant="contained" color="warning" disabled={!form.last_working_day || (dialog === 'hr' && !form.employee)} onClick={submit}>Submit</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Offboarding;
