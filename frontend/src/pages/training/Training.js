import { formatDate } from '../../utils/format';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, InputAdornment, List, ListItem,
  ListItemText, MenuItem, Paper, Select, Switch, Tab, Tabs, TextField, Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import api from '../../services/api';
import authService from '../../services/authService';

const STATUS_COLORS = { Assigned: 'default', 'In Progress': 'info', Completed: 'success' };

const Training = () => {
  const isStaff = authService.isManager() || authService.isHR();
  const [tab, setTab] = useState(0);
  const [mine, setMine] = useState([]);
  const [recs, setRecs] = useState({ skill_gaps: [], recommendations: [] });
  const [courses, setCourses] = useState([]);
  const [all, setAll] = useState([]);
  const [message, setMessage] = useState(null);
  const [courseDialog, setCourseDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', skills: '', mandatory: false, duration_hours: '' });
  const [due, setDue] = useState('');
  const [target, setTarget] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ q: '', status: 'all', course: 'all', department: 'all', overdue: false });
  const [myStatus, setMyStatus] = useState('all');
  const [catalogueQuery, setCatalogueQuery] = useState('');

  const fail = (e, fallback) => setMessage({ severity: 'error', text: e.response?.data?.error || fallback });

  const load = useCallback(async () => {
    try {
      const [m, r, c] = await Promise.all([
        api.get('/api/training/mine/').catch(() => ({ data: { assignments: [] } })),
        api.get('/api/training/recommendations/').catch(() => ({ data: { skill_gaps: [], recommendations: [] } })),
        api.get('/api/training/courses/'),
      ]);
      setMine(m.data.assignments);
      setRecs(r.data);
      setCourses(c.data.courses);
      if (isStaff) {
        const a = await api.get('/api/training/assignments/');
        setAll(a.data.assignments);
        api.get('/api/employees/departments/').then((d) => setDepartments((d.data.results || d.data || []).map((x) => x.name).filter(Boolean))).catch(() => {});
      }
    } catch (e) {
      fail(e, 'Could not load training data.');
    }
  }, [isStaff]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (assignment, status) => {
    try {
      await api.put(`/api/training/assignments/${assignment._id}/`, { status });
      load();
    } catch (e) { fail(e, 'Could not update the training.'); }
  };

  const createCourse = async () => {
    try {
      await api.post('/api/training/courses/', form);
      setCourseDialog(false);
      setForm({ title: '', description: '', skills: '', mandatory: false, duration_hours: '' });
      load();
    } catch (e) { fail(e, 'Could not create the course.'); }
  };

  const assignToAll = async (course) => {
    try {
      const scope = target === 'all' ? { all: true } : { department: target };
      const res = await api.post('/api/training/assign/', { course_id: course._id, ...scope, due_date: due });
      setMessage({ severity: 'success', text: `Assigned to ${res.data.created} employee(s); ${res.data.skipped} already had it.` });
      setAssignDialog(null);
      setDue('');
      setTarget('all');
      load();
    } catch (e) { fail(e, 'Could not assign the course.'); }
  };

  const q = filters.q.trim().toLowerCase();
  const shown = all.filter((a) =>
    (filters.status === 'all' || a.status === filters.status) &&
    (filters.course === 'all' || a.course_title === filters.course) &&
    (filters.department === 'all' || a.department === filters.department) &&
    (!filters.overdue || a.overdue) &&
    (!q || `${a.employee_name} ${a.course_title}`.toLowerCase().includes(q)));
  const counts = {
    total: all.length,
    done: all.filter((a) => a.status === 'Completed').length,
    progress: all.filter((a) => a.status === 'In Progress').length,
    overdue: all.filter((a) => a.overdue).length,
  };
  const mineShown = mine.filter((a) => myStatus === 'all' || (myStatus === 'overdue' ? a.overdue : a.status === myStatus));
  const cq = catalogueQuery.trim().toLowerCase();
  const coursesShown = courses.filter((c) => !cq || `${c.title} ${c.description || ''} ${(c.skills || []).join(' ')}`.toLowerCase().includes(cq));
  const courseTitles = [...new Set(all.map((a) => a.course_title))].sort();
  const setF = (patch) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Training &amp; Development</Typography>
        {isStaff && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCourseDialog(true)}>New course</Button>}
      </Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="My training" />
        <Tab label="Recommended for me" />
        <Tab label="Course catalogue" />
        {isStaff && <Tab label="All assignments" />}
      </Tabs>

      {tab === 0 && (
        <Paper>
          <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {['all', 'Assigned', 'In Progress', 'Completed', 'overdue'].map((s) => (
              <Chip key={s} clickable label={s === 'all' ? `All (${mine.length})` : s === 'overdue' ? 'Overdue' : s}
                color={myStatus === s ? 'primary' : 'default'} onClick={() => setMyStatus(s)} />
            ))}
          </Box>
          <List>
            {mineShown.length === 0 && <ListItem><ListItemText primary={mine.length ? 'Nothing matches this filter.' : 'Nothing assigned to you yet.'} /></ListItem>}
            {mineShown.map((a) => (
              <ListItem key={a._id} divider secondaryAction={
                <Select size="small" value={a.status} SelectDisplayProps={{ 'aria-label': `Status of ${a.course_title}` }} onChange={(e) => setStatus(a, e.target.value)}>
                  {['Assigned', 'In Progress', 'Completed'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>}>
                <ListItemText
                  primary={<>{a.course_title} {a.mandatory && <Chip size="small" color="warning" label="Mandatory" sx={{ ml: 1 }} />}
                    {a.overdue && <Chip size="small" color="error" label="Overdue" sx={{ ml: 1 }} />}</>}
                  secondary={`${a.due_date ? `Due ${formatDate(a.due_date)}` : 'No due date'}${a.skills_gained ? ` · gained: ${a.skills_gained.join(', ')}` : ''}`} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {tab === 1 && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Skills in demand (open jobs and department peers) that you don't have: {recs.skill_gaps.join(', ') || 'none'}
          </Typography>
          <List>
            {recs.recommendations.length === 0 && <ListItem><ListItemText primary="No recommendations right now." /></ListItem>}
            {recs.recommendations.map((r) => (
              <ListItem key={r.course._id} divider>
                <ListItemText primary={r.course.title} secondary={r.reason} />
                {!isStaff && <Typography variant="caption">Ask your manager to assign this course</Typography>}
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {tab === 2 && (
        <Paper>
          <Box sx={{ p: 2 }}>
            <TextField size="small" fullWidth placeholder="Search courses by title, topic or skill" value={catalogueQuery}
              onChange={(e) => setCatalogueQuery(e.target.value)} inputProps={{ 'aria-label': 'Search courses' }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
          </Box>
          <List>
            {coursesShown.length === 0 && <ListItem><ListItemText primary={courses.length ? 'No course matches your search.' : 'No courses yet.'} /></ListItem>}
            {coursesShown.map((c) => (
              <ListItem key={c._id} divider secondaryAction={isStaff && <Button size="small" onClick={() => setAssignDialog(c)}>Assign</Button>}>
                <ListItemText
                  primary={<>{c.title} {c.mandatory && <Chip size="small" color="warning" label="Mandatory" sx={{ ml: 1 }} />}</>}
                  secondary={`${c.description || ''} ${c.skills?.length ? `· teaches: ${c.skills.join(', ')}` : ''}`} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      {tab === 3 && isStaff && (
        <Paper>
          <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={`${counts.total} assignments`} />
            <Chip color="success" label={`${counts.done} completed`} />
            <Chip color="info" label={`${counts.progress} in progress`} />
            <Chip color="error" variant={counts.overdue ? 'filled' : 'outlined'} label={`${counts.overdue} overdue`} />
          </Box>
          <Box sx={{ px: 2, pb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField size="small" placeholder="Search employee or course" value={filters.q} onChange={(e) => setF({ q: e.target.value })}
              inputProps={{ 'aria-label': 'Search assignments' }} sx={{ minWidth: 240, flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
            <Select size="small" value={filters.status} onChange={(e) => setF({ status: e.target.value })} SelectDisplayProps={{ 'aria-label': 'Filter by status' }}>
              <MenuItem value="all">All statuses</MenuItem>
              {['Assigned', 'In Progress', 'Completed'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
            <Select size="small" value={filters.course} onChange={(e) => setF({ course: e.target.value })} SelectDisplayProps={{ 'aria-label': 'Filter by course' }}>
              <MenuItem value="all">All courses</MenuItem>
              {courseTitles.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
            <Select size="small" value={filters.department} onChange={(e) => setF({ department: e.target.value })} SelectDisplayProps={{ 'aria-label': 'Filter by department' }}>
              <MenuItem value="all">All departments</MenuItem>
              {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
            </Select>
            <FormControlLabel control={<Switch checked={filters.overdue} onChange={(e) => setF({ overdue: e.target.checked })} />} label="Overdue only" />
          </Box>
          <List>
            {shown.length === 0 && <ListItem><ListItemText primary={all.length ? 'No assignments match these filters.' : 'No assignments yet.'} /></ListItem>}
            {shown.map((a) => (
              <ListItem key={a._id} divider>
                <ListItemText primary={`${a.employee_name} — ${a.course_title}`}
                  secondary={`${a.department ? `${a.department} · ` : ''}${a.due_date ? `Due ${formatDate(a.due_date)}` : 'No due date'}${a.overdue ? ' · OVERDUE' : ''}`} />
                <Chip size="small" label={a.status} color={STATUS_COLORS[a.status]} />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}

      <Dialog open={courseDialog} onClose={() => setCourseDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle>New course</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          <TextField label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <TextField label="Description" multiline minRows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <TextField label="Skills taught (comma separated)" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
          <TextField label="Duration (hours)" type="number" value={form.duration_hours} onChange={(e) => setForm({ ...form, duration_hours: e.target.value })} />
          <FormControlLabel control={<Switch checked={form.mandatory} onChange={(e) => setForm({ ...form, mandatory: e.target.checked })} />} label="Mandatory for everyone" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCourseDialog(false)}>Cancel</Button>
          <Button variant="contained" disabled={!form.title.trim()} onClick={createCourse}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!assignDialog} onClose={() => setAssignDialog(null)}>
        <DialogTitle>Assign "{assignDialog?.title}"</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'grid', gap: 2 }}>
          <TextField select label="Assign to" value={target} onChange={(e) => setTarget(e.target.value)} fullWidth>
            <MenuItem value="all">All active employees</MenuItem>
            {departments.map((d) => <MenuItem key={d} value={d}>{d} department</MenuItem>)}
          </TextField>
          <TextField label="Due date" type="date" InputLabelProps={{ shrink: true }} value={due} onChange={(e) => setDue(e.target.value)} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => assignToAll(assignDialog)}>Assign</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Training;
