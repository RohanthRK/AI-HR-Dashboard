import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, FormControlLabel, InputAdornment, LinearProgress, List, ListItemButton,
  ListItemText, MenuItem, Paper, Select, TextField, Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../services/api';
import authService from '../../services/authService';
import { formatDate } from '../../utils/format';

const stateOf = (row) => (row.progress === 100 ? 'Completed' : row.progress === 0 ? 'Not started' : 'In progress');
const STATE_COLOR = { Completed: 'success', 'In progress': 'info', 'Not started': 'default' };

const Section = ({ title, tasks, canEdit, onToggle }) => (tasks.length ? (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle2" sx={{ textTransform: 'uppercase', fontWeight: 800, mb: 0.5 }}>{title} ({tasks.filter((t) => t.done).length}/{tasks.length})</Typography>
    {tasks.map((task) => (
      <Box key={task.id}>
        <FormControlLabel
          control={<Checkbox checked={task.done} disabled={!canEdit(task) || !!task.auto} onChange={() => onToggle(task)} />}
          label={<>{task.title}{task.auto && <Chip size="small" sx={{ ml: 1 }} variant="outlined" label="ticks automatically" />}</>} />
      </Box>
    ))}
  </Box>
) : null);

const Onboarding = () => {
  const isStaff = authService.isAdmin();
  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [newHire, setNewHire] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [message, setMessage] = useState(null);
  const [q, setQ] = useState('');
  const [state, setState] = useState('all');
  const [department, setDepartment] = useState('all');

  const me = useMemo(() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch (e) { return {}; } }, []);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/onboarding/');
      setRows(res.data.onboardings);
      if (isStaff) {
        const e = await api.get('/api/employees/', { params: { limit: 500 } });
        setEmployees(e.data.results || []);
      }
    } catch (e) { setMessage({ severity: 'error', text: 'Could not load onboarding.' }); }
  }, [isStaff]);

  useEffect(() => { load(); }, [load]);

  const start = async () => {
    try {
      const res = await api.post('/api/onboarding/start/', { employee_id: newHire._id });
      setOpenId(res.data.onboarding._id);
      setNewHire(null);
      setMessage({ severity: 'success', text: 'Checklist created.' });
      load();
    } catch (e) { setMessage({ severity: 'error', text: e.response?.data?.error || 'Could not start onboarding.' }); }
  };

  const toggle = async (row, task) => {
    try {
      await api.put(`/api/onboarding/${row._id}/tasks/${task.id}/`, { done: !task.done });
      load();
    } catch (e) { setMessage({ severity: 'error', text: 'You cannot change this task.' }); }
  };

  const departments = useMemo(() => [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(), [rows]);
  const withChecklist = useMemo(() => new Set(rows.map((r) => String(r.employee_id))), [rows]);
  const withoutChecklist = employees.filter((e) => !withChecklist.has(String(e._id)));

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const order = { 'In progress': 0, 'Not started': 1, Completed: 2 };
    return rows
      .filter((r) => (state === 'all' || stateOf(r) === state) && (department === 'all' || r.department === department) &&
        (!needle || `${r.employee_name} ${r.employee_code} ${r.position} ${r.department}`.toLowerCase().includes(needle)))
      .sort((a, b) => order[stateOf(a)] - order[stateOf(b)] || String(b.hire_date).localeCompare(String(a.hire_date)));
  }, [rows, q, state, department]);

  const single = !isStaff && rows.length === 1;
  const open = rows.find((r) => r._id === openId) || (single ? rows[0] : null);
  const counts = { all: rows.length, ...Object.fromEntries(['In progress', 'Not started', 'Completed'].map((s) => [s, rows.filter((r) => stateOf(r) === s).length])) };

  const canEdit = (row) => (task) => isStaff || (task.owner === 'employee' && String(me.employee_id) === String(row.employee_id));
  const group = (row) => {
    const t = row.tasks;
    return {
      hr: t.filter((x) => x.owner === 'hr'),
      docs: t.filter((x) => x.auto?.type === 'document'),
      training: t.filter((x) => x.auto?.type === 'course'),
      emp: t.filter((x) => x.owner === 'employee' && !x.auto),
    };
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>Onboarding</Typography>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Grid container spacing={3}>
        {!single && (
          <Grid item xs={12} md={5} lg={4}>
            {isStaff && (
              <Paper sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>START A NEW CHECKLIST</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Autocomplete size="small" fullWidth options={withoutChecklist} value={newHire} onChange={(e, v) => setNewHire(v)}
                    getOptionLabel={(e) => `${`${e.first_name || ''} ${e.last_name || ''}`.trim()} (${e.employee_id})`} isOptionEqualToValue={(a, b) => a._id === b._id}
                    noOptionsText="Everyone already has a checklist"
                    renderInput={(params) => <TextField {...params} label="Choose employee" />} />
                  <Button variant="contained" disabled={!newHire} onClick={start}>Start</Button>
                </Box>
              </Paper>
            )}
            <Paper>
              <Box sx={{ p: 2, pb: 1, display: 'grid', gap: 1.5 }}>
                <TextField size="small" placeholder="Search name, ID or role" value={q} onChange={(e) => setQ(e.target.value)} inputProps={{ 'aria-label': 'Search onboarding' }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {['all', 'In progress', 'Not started', 'Completed'].map((s) => (
                    <Chip key={s} size="small" clickable color={state === s ? 'primary' : 'default'} onClick={() => setState(s)}
                      label={`${s === 'all' ? 'All' : s} (${counts[s]})`} />
                  ))}
                </Box>
                {departments.length > 1 && (
                  <Select size="small" value={department} onChange={(e) => setDepartment(e.target.value)} SelectDisplayProps={{ 'aria-label': 'Filter by department' }}>
                    <MenuItem value="all">All departments</MenuItem>
                    {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                  </Select>
                )}
              </Box>
              <List sx={{ maxHeight: '60vh', overflow: 'auto' }}>
                {shown.length === 0 && <Box sx={{ p: 2 }}><Typography color="text.secondary">{rows.length ? 'Nobody matches these filters.' : 'No onboarding checklists yet. New employees get one automatically.'}</Typography></Box>}
                {shown.map((row) => (
                  <ListItemButton key={row._id} selected={open?._id === row._id} onClick={() => setOpenId(row._id)} divider>
                    <ListItemText
                      primary={row.employee_name}
                      secondary={`${row.position || ''}${row.department ? ` · ${row.department}` : ''}${row.hire_date ? ` · joined ${formatDate(row.hire_date)}` : ''}`} />
                    <Chip size="small" color={STATE_COLOR[stateOf(row)]} label={`${row.progress}%`} />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          </Grid>
        )}

        <Grid item xs={12} md={single ? 12 : 7} lg={single ? 12 : 8}>
          {!open && <Alert severity="info">Select an employee on the left to see their onboarding checklist.</Alert>}
          {open && (() => {
            const g = group(open);
            const edit = canEdit(open);
            const toggleTask = (task) => toggle(open, task);
            return (
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="h5">{open.employee_name}</Typography>
                    <Typography color="text.secondary">
                      {[open.position, open.department, open.employee_code].filter(Boolean).join(' · ')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {open.hire_date ? `Joined ${formatDate(open.hire_date)}` : ''}{open.manager_name ? ` · Reports to ${open.manager_name}` : ''}
                    </Typography>
                  </Box>
                  <Chip color={STATE_COLOR[stateOf(open)]} label={stateOf(open)} />
                </Box>
                <LinearProgress aria-label="Onboarding progress" variant="determinate" value={open.progress} sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {open.tasks.filter((t) => t.done).length} of {open.tasks.length} tasks done ({open.progress}%)
                </Typography>
                <Section title="HR tasks" tasks={g.hr} canEdit={edit} onToggle={toggleTask} />
                <Section title="Employee tasks" tasks={g.emp} canEdit={edit} onToggle={toggleTask} />
                <Section title="Documents to upload" tasks={g.docs} canEdit={edit} onToggle={toggleTask} />
                <Section title="Mandatory training" tasks={g.training} canEdit={edit} onToggle={toggleTask} />
              </Paper>
            );
          })()}
        </Grid>
      </Grid>
    </Box>
  );
};

export default Onboarding;
