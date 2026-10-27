import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert, Box, Button, Chip, InputAdornment, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../services/api';
import { formatDate } from '../../utils/format';

const Stat = ({ label, value, hint, color }) => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>{label}</Typography>
    <Typography variant="h4" sx={{ color }}>{value}</Typography>
    {hint && <Typography variant="body2" color="text.secondary">{hint}</Typography>}
  </Paper>
);

const KIND_LABEL = { document: 'Document', training: 'Training' };

const Compliance = () => {
  const [data, setData] = useState({ alerts: [], total: 0, critical: 0 });
  const [headcount, setHeadcount] = useState(0);
  const [message, setMessage] = useState(null);
  const [view, setView] = useState(0);
  const [f, setF] = useState({ q: '', kind: 'all', severity: 'all', department: 'all' });

  const load = useCallback(async () => {
    try {
      const [res, emps] = await Promise.all([
        api.get('/api/reports/compliance/'),
        api.get('/api/employees/', { params: { limit: 1, status: 'Active' } }).catch(() => ({ data: {} })),
      ]);
      setData(res.data);
      setHeadcount(emps.data.total || emps.data.count || 0);
    } catch (e) {
      setMessage({ severity: 'error', text: 'Could not load compliance alerts.' });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remind = async (employeeId) => {
    try {
      const res = await api.post('/api/reports/compliance/notify/', employeeId ? { employee_id: employeeId } : {});
      setMessage({ severity: 'success', text: `Sent ${res.data.sent} reminder(s).` });
    } catch (e) {
      setMessage({ severity: 'error', text: 'Could not send reminders.' });
    }
  };

  const departments = useMemo(() => [...new Set(data.alerts.map((a) => a.department).filter(Boolean))].sort(), [data.alerts]);
  const shown = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return data.alerts.filter((a) =>
      (f.kind === 'all' || a.kind === f.kind) && (f.severity === 'all' || a.severity === f.severity) &&
      (f.department === 'all' || a.department === f.department) &&
      (!q || `${a.employee} ${a.employee_code} ${a.item} ${a.message}`.toLowerCase().includes(q)));
  }, [data.alerts, f]);

  const people = useMemo(() => {
    const by = {};
    shown.forEach((a) => {
      const row = by[a.employee_id] || (by[a.employee_id] = { id: a.employee_id, name: a.employee, code: a.employee_code, department: a.department, items: [], critical: 0 });
      row.items.push(a);
      if (a.severity === 'critical') row.critical += 1;
    });
    return Object.values(by).sort((a, b) => b.critical - a.critical || b.items.length - a.items.length);
  }, [shown]);

  const affected = new Set(data.alerts.map((a) => a.employee_id)).size;
  const compliantPct = headcount ? Math.round(((headcount - affected) / headcount) * 100) : null;
  const set = (patch) => setF((x) => ({ ...x, ...patch }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" component="h1">Compliance</Typography>
        <Button variant="contained" disabled={shown.length === 0} onClick={() => remind()}>Remind everyone listed</Button>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        What needs attention: documents that have expired or expire within 60 days, required documents that were never uploaded, and mandatory trainings that are unassigned or overdue.
      </Typography>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} md={3}><Stat label="Open issues" value={data.total} hint="across all employees" /></Grid>
        <Grid item xs={6} md={3}><Stat label="Critical" value={data.critical} hint="expired or overdue" color={data.critical ? 'error.main' : undefined} /></Grid>
        <Grid item xs={6} md={3}><Stat label="Employees affected" value={affected} hint={headcount ? `of ${headcount} active` : ''} /></Grid>
        <Grid item xs={6} md={3}><Stat label="Fully compliant" value={compliantPct === null ? '-' : `${compliantPct}%`} hint="no open issues" color={compliantPct === 100 ? 'success.main' : undefined} /></Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField size="small" placeholder="Search employee, ID or item" value={f.q} onChange={(e) => set({ q: e.target.value })}
          inputProps={{ 'aria-label': 'Search compliance issues' }} sx={{ flex: 1, minWidth: 240 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
        <Select size="small" value={f.kind} onChange={(e) => set({ kind: e.target.value })} SelectDisplayProps={{ 'aria-label': 'Filter by type' }}>
          <MenuItem value="all">All types</MenuItem><MenuItem value="document">Documents</MenuItem><MenuItem value="training">Trainings</MenuItem>
        </Select>
        <Select size="small" value={f.severity} onChange={(e) => set({ severity: e.target.value })} SelectDisplayProps={{ 'aria-label': 'Filter by severity' }}>
          <MenuItem value="all">All severities</MenuItem><MenuItem value="critical">Critical</MenuItem><MenuItem value="warning">Warning</MenuItem>
        </Select>
        <Select size="small" value={f.department} onChange={(e) => set({ department: e.target.value })} SelectDisplayProps={{ 'aria-label': 'Filter by department' }}>
          <MenuItem value="all">All departments</MenuItem>
          {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </Select>
      </Paper>

      <Tabs value={view} onChange={(e, v) => setView(v)} sx={{ mb: 1 }}>
        <Tab label={`By employee (${people.length})`} />
        <Tab label={`All issues (${shown.length})`} />
      </Tabs>

      {view === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Employee</TableCell><TableCell>Department</TableCell><TableCell>Open issues</TableCell><TableCell align="right">Action</TableCell></TableRow></TableHead>
            <TableBody>
              {people.length === 0 && <TableRow><TableCell colSpan={4}>{data.total ? 'Nothing matches these filters.' : 'No compliance issues found. Everything is up to date.'}</TableCell></TableRow>}
              {people.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell><b>{p.name}</b><Typography variant="caption" display="block" color="text.secondary">{p.code}</Typography></TableCell>
                  <TableCell>{p.department || '-'}</TableCell>
                  <TableCell>
                    {p.items.map((a, i) => (
                      <Chip key={i} size="small" sx={{ mr: 0.5, mb: 0.5 }} color={a.severity === 'critical' ? 'error' : 'warning'} variant="outlined"
                        label={`${a.item}${a.date ? ` · ${formatDate(a.date)}` : ''}`} title={a.message} />
                    ))}
                  </TableCell>
                  <TableCell align="right"><Button size="small" onClick={() => remind(p.id)}>Send reminder</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {view === 1 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Employee</TableCell><TableCell>Type</TableCell><TableCell>Item</TableCell><TableCell>Date</TableCell><TableCell>Severity</TableCell><TableCell>Details</TableCell></TableRow></TableHead>
            <TableBody>
              {shown.length === 0 && <TableRow><TableCell colSpan={6}>{data.total ? 'Nothing matches these filters.' : 'No compliance issues found.'}</TableCell></TableRow>}
              {shown.map((a, i) => (
                <TableRow key={i} hover>
                  <TableCell>{a.employee}<Typography variant="caption" display="block" color="text.secondary">{a.department}</Typography></TableCell>
                  <TableCell>{KIND_LABEL[a.kind] || a.kind}</TableCell>
                  <TableCell>{a.item}</TableCell>
                  <TableCell>{a.date ? formatDate(a.date) : '-'}</TableCell>
                  <TableCell><Chip size="small" color={a.severity === 'critical' ? 'error' : 'warning'} label={a.severity} /></TableCell>
                  <TableCell>{a.message}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default Compliance;
