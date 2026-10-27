import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Paper, Typography, TextField, MenuItem, Chip, Button, ToggleButton, ToggleButtonGroup, CircularProgress, Alert, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import attendanceService from '../../services/attendanceService';
import { formatTime, formatDateRange, formatDate } from '../../utils/format';
import { hm } from './MonthCalendar';
import ExpectedHoursDialog from './ExpectedHoursDialog';

const iso = (d) => d.toLocaleDateString('en-CA');
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const PRESETS = {
  today: { label: 'Today', range: (t) => [t, t] },
  yesterday: { label: 'Yesterday', range: (t) => [addDays(t, -1), addDays(t, -1)] },
  week: { label: 'This week', range: (t) => [addDays(t, -((t.getDay() + 6) % 7)), t] },
  last7: { label: 'Last 7 days', range: (t) => [addDays(t, -6), t] },
  month: { label: 'This month', range: (t) => [new Date(t.getFullYear(), t.getMonth(), 1), t] },
  lastMonth: { label: 'Last month', range: (t) => [new Date(t.getFullYear(), t.getMonth() - 1, 1), new Date(t.getFullYear(), t.getMonth(), 0)] },
  custom: { label: 'Pick dates' },
};

const STATUS_COLOR = {
  Present: '#8ce99a', 'On track': '#8ce99a', 'Working now': '#74c0fc', 'On leave': '#a5d8ff', Holiday: '#d0bfff',
  Absent: '#ffa8a8', 'Short on hours': '#ffe066', 'No clock-out': '#ffc078', 'Needs attention': '#ffe066', 'Not in yet': '#ffd8a8',
};
const ATTENTION = ['Needs attention', 'Absent', 'Short on hours', 'No clock-out'];

const FILTERS = {
  all: { label: 'Everyone', test: () => true },
  attention: { label: 'Needs attention', test: (r) => ATTENTION.includes(r.status) },
  absent: { label: 'Absent', test: (r) => r.absent_days > 0 },
  short: { label: 'Short on hours', test: (r) => r.short_days > 0 },
  late: { label: 'Late', test: (r) => r.late_days > 0 },
  leave: { label: 'On leave', test: (r) => r.leave_days > 0 },
};

const SORTS = {
  attention: { label: 'Needs attention first', cmp: (a, b) => (ATTENTION.includes(b.status) - ATTENTION.includes(a.status)) || (b.flags.length - a.flags.length) || a.name.localeCompare(b.name) },
  name: { label: 'Name', cmp: (a, b) => a.name.localeCompare(b.name) },
  lowest: { label: 'Lowest hours %', cmp: (a, b) => (a.hours_pct ?? 999) - (b.hours_pct ?? 999) || a.name.localeCompare(b.name) },
  absent: { label: 'Most absences', cmp: (a, b) => b.absent_days - a.absent_days || a.name.localeCompare(b.name) },
};

const Tile = ({ label, value, sub, color }) => (
  <Paper className="brutal-border" sx={{ p: 1.25, borderTop: `6px solid ${color}`, minWidth: 0 }}>
    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase' }} color="text.secondary" noWrap>{label}</Typography>
    <Typography sx={{ fontWeight: 900, fontSize: '1.4rem', lineHeight: 1.1 }}>{value}</Typography>
    {sub && <Typography variant="caption" color="text.secondary" noWrap>{sub}</Typography>}
  </Paper>
);

const HoursBar = ({ worked, expected, pct }) => {
  const width = expected ? Math.min(((worked || 0) / expected) * 100, 100) : 0;
  const color = pct == null ? '#adb5bd' : pct >= 95 ? '#2f9e44' : pct >= 75 ? '#f08c00' : '#e03131';
  return (
    <Box sx={{ minWidth: 150 }}>
      <Typography variant="body2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
        {hm(worked)} <Typography component="span" variant="caption" color="text.secondary">of {hm(expected)}{pct != null ? ` · ${pct}%` : ''}</Typography>
      </Typography>
      <Box sx={{ height: 6, bgcolor: 'action.hover', border: '1px solid rgba(0,0,0,0.4)', mt: 0.25 }}>
        <Box sx={{ width: `${width}%`, height: '100%', bgcolor: color }} />
      </Box>
    </Box>
  );
};

const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * Everyone's attendance for a period (HR) or the team's (managers): hours worked against hours expected, absent / short / late
 * days and what needs a look. Search, filter, sort; click a person to open their month.
 */
const AttendanceOverview = ({ canEditHours = false, onOpenPerson }) => {
  const [preset, setPreset] = useState('month');
  const [custom, setCustom] = useState({ from: iso(new Date()), to: iso(new Date()) });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('attention');
  const [editing, setEditing] = useState(null);

  const range = useMemo(() => {
    if (preset === 'custom') return [custom.from, custom.to];
    const [a, b] = PRESETS[preset].range(new Date());
    return [iso(a), iso(b)];
  }, [preset, custom]);

  const load = useCallback(async () => {
    const [from, to] = range;
    if (!from || !to || to < from) { setError('The end date must not be before the start date.'); return; }
    setLoading(true);
    setError(null);
    try {
      setData(await attendanceService.getOverview(from, to));
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load attendance.');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const departments = useMemo(() => [...new Set((data?.rows || []).map((r) => r.department).filter(Boolean))].sort(), [data]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.rows || [])
      .filter((r) => (!q || `${r.name} ${r.employee_code} ${r.position} ${r.department} ${r.team}`.toLowerCase().includes(q)) && (!department || r.department === department) && FILTERS[filter].test(r))
      .sort(SORTS[sort].cmp);
  }, [data, query, department, filter, sort]);

  const single = !!data?.single_day;
  const t = data?.totals;

  const download = () => {
    const head = ['Employee ID', 'Name', 'Department', 'Days present', 'Working days', 'Hours worked', 'Hours expected', 'Hours %', 'Late days', 'Short days', 'Absent days', 'Leave days', 'No clock-out days', 'Status', 'Notes'];
    const lines = rows.map((r) => [r.employee_code, r.name, r.department, r.present_days, r.working_days, r.hours, r.expected_hours, r.hours_pct ?? '', r.late_days, r.short_days, r.absent_days, r.leave_days, r.missing_clock_out_days, r.status, r.flags.join('; ')]);
    const blob = new Blob([[head, ...lines].map((l) => l.map(csvCell).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `attendance-${data.from}-to-${data.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
        <ToggleButtonGroup size="small" exclusive value={preset} onChange={(e, v) => v && setPreset(v)} aria-label="Period" sx={{ flexWrap: 'wrap' }}>
          {Object.entries(PRESETS).map(([key, p]) => <ToggleButton key={key} value={key} sx={{ fontWeight: 800, textTransform: 'none', px: 1.25 }}>{p.label}</ToggleButton>)}
        </ToggleButtonGroup>
        {preset === 'custom' && (
          <>
            <TextField size="small" type="date" label="From" value={custom.from} onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })} InputLabelProps={{ shrink: true }} />
            <TextField size="small" type="date" label="To" value={custom.to} onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })} InputLabelProps={{ shrink: true }} />
          </>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ ml: 'auto' }}>
          {data ? (single ? formatDate(data.from) : formatDateRange(data.from, data.to)) : ''}{loading && <CircularProgress size={14} sx={{ ml: 1 }} />}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

      {t && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 1, mb: 1.5 }}>
          <Tile label="People" value={t.employees} sub={`${t.need_attention} need attention`} color="#000" />
          <Tile label="Hours worked" value={hm(t.hours)} sub={`of ${hm(t.expected_hours)}${t.hours_pct != null ? ` · ${t.hours_pct}%` : ''}`} color="#51cf66" />
          <Tile label="Absent" value={t.absent_days} sub="days with no record" color="#ff8787" />
          <Tile label="Short on hours" value={t.short_days} sub="days under target" color="#ffd43b" />
          <Tile label="Late" value={t.late_days} sub={`after ${data.late_after}`} color="#b197fc" />
          <Tile label="No clock-out" value={t.missing_clock_out_days} sub="forgotten" color="#ffa94d" />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 1 }}>
        <TextField
          size="small" placeholder="Search name, ID, team or role" value={query} onChange={(e) => setQuery(e.target.value)} sx={{ minWidth: 250 }}
          inputProps={{ 'aria-label': 'Search attendance' }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <TextField select size="small" label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All departments</MenuItem>
          {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)} sx={{ minWidth: 180 }}>
          {Object.entries(SORTS).map(([key, s]) => <MenuItem key={key} value={key}>{s.label}</MenuItem>)}
        </TextField>
        <Button size="small" startIcon={<DownloadIcon />} onClick={download} disabled={!rows.length} sx={{ ml: 'auto' }}>Download CSV</Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 1 }}>
        {Object.entries(FILTERS).map(([key, f]) => (
          <Chip
            key={key} label={f.label} size="small" clickable onClick={() => setFilter(key)} aria-pressed={filter === key}
            sx={{ fontWeight: 800, borderRadius: 0, border: '2px solid #000', bgcolor: filter === key ? '#FFD700' : 'transparent', color: filter === key ? '#000' : 'text.primary' }}
          />
        ))}
      </Box>

      <Paper className="brutal-border">
        <TableContainer sx={{ maxHeight: 'calc(100vh - 470px)', minHeight: 180 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                {single && <><TableCell>In</TableCell><TableCell>Out</TableCell></>}
                <TableCell>Hours worked</TableCell>
                {!single && <TableCell align="center">Present</TableCell>}
                {!single && <TableCell align="center">Late</TableCell>}
                {!single && <TableCell align="center">Short</TableCell>}
                {!single && <TableCell align="center">Absent</TableCell>}
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data && rows.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3 }}>Nobody matches.</TableCell></TableRow>}
              {rows.map((r) => (
                <TableRow key={r.employee_id} hover sx={{ cursor: onOpenPerson ? 'pointer' : 'default' }} onClick={() => onOpenPerson && onOpenPerson(r)}>
                  <TableCell>
                    <Typography sx={{ fontWeight: 800, lineHeight: 1.2 }}>{r.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{[r.position, r.department].filter(Boolean).join(' · ')}</Typography>
                  </TableCell>
                  {single && (
                    <>
                      <TableCell>{formatTime(r.day?.clock_in)}{r.day?.late && <Chip label="late" size="small" sx={{ ml: 0.5, height: 18, fontSize: '0.65rem', fontWeight: 800 }} />}</TableCell>
                      <TableCell>{formatTime(r.day?.clock_out)}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <HoursBar worked={r.hours} expected={r.expected_hours} pct={r.hours_pct} />
                    <Typography variant="caption" color="text.secondary">{hm(r.expected_per_day)} a day{r.custom_hours ? ' (set for them)' : ''}</Typography>
                    {canEditHours && (
                      <IconButton size="small" aria-label={`Set expected hours for ${r.name}`} onClick={(e) => { e.stopPropagation(); setEditing(r); }} sx={{ p: 0.25, ml: 0.5 }}><EditIcon sx={{ fontSize: 15 }} /></IconButton>
                    )}
                  </TableCell>
                  {!single && <TableCell align="center">{r.present_days}/{r.working_days}</TableCell>}
                  {!single && <TableCell align="center" sx={{ color: r.late_days >= 3 ? '#e03131' : 'inherit', fontWeight: r.late_days >= 3 ? 800 : 400 }}>{r.late_days}</TableCell>}
                  {!single && <TableCell align="center" sx={{ color: r.short_days ? '#e03131' : 'inherit', fontWeight: r.short_days ? 800 : 400 }}>{r.short_days}</TableCell>}
                  {!single && <TableCell align="center" sx={{ color: r.absent_days ? '#e03131' : 'inherit', fontWeight: r.absent_days ? 800 : 400 }}>{r.absent_days}</TableCell>}
                  <TableCell>
                    <Tooltip title={r.flags.join(' · ')} disableHoverListener={!r.flags.length}>
                      <Chip size="small" label={r.status} sx={{ fontWeight: 800, borderRadius: 0, border: '2px solid #000', bgcolor: STATUS_COLOR[r.status] || '#e9ecef', color: '#000' }} />
                    </Tooltip>
                    {!single && r.flags.length > 0 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{r.flags.join(' · ')}</Typography>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      {data && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        Showing {rows.length} of {data.rows.length}. Expected hours default to {data.default_hours} a day; a day is short when it is more than 15 minutes under. Click a person for their calendar.
      </Typography>}

      {editing && (
        <ExpectedHoursDialog
          employee={{ id: editing.employee_id, name: editing.name }}
          current={editing.custom_hours ? editing.expected_per_day : null}
          defaultHours={data.default_hours}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </Box>
  );
};

export default AttendanceOverview;
