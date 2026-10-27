import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Chip, CircularProgress, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Paper, Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import RefreshIcon from '@mui/icons-material/Refresh';
import CelebrationIcon from '@mui/icons-material/Celebration';
import CakeIcon from '@mui/icons-material/Cake';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WorkIcon from '@mui/icons-material/Work';
import PaymentsIcon from '@mui/icons-material/Payments';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import EventIcon from '@mui/icons-material/Event';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import api from '../services/api';
import attendanceService from '../services/attendanceService';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatDateTime, formatTime, timeAgo } from '../utils/format';

const COLORS = ['#fcc419', '#339af0', '#51cf66', '#ff6b6b', '#cc5de8', '#20c997', '#ff922b', '#845ef7'];
const TONE = { success: '#1f6f35', info: '#1971c2', error: '#c92a2a', warning: '#e67700' };
const SEVERITY_COLOR = { error: 'error', warning: 'warning', info: 'default' };
const ACTIVITY_ICON = { joined: <PersonAddIcon />, leave: <EventIcon />, recognition: <EmojiEventsIcon />, application: <WorkIcon />, payslip: <PaymentsIcon />, exit: <ExitToAppIcon /> };
const card = { border: '3px solid #000', borderRadius: 0, boxShadow: '4px 4px 0px #000', color: '#000' };

const Panel = ({ title, action, children, sx }) => (
  <Paper elevation={0} sx={{ ...card, p: 2.5, height: '100%', bgcolor: 'background.paper', color: 'text.primary', ...sx }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>{title}</Typography>
      {action}
    </Box>
    {children}
  </Paper>
);

const Nothing = ({ children }) => <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{children}</Typography>;

const dayLabel = (days) => (days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`);

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [now, setNow] = useState(new Date());
  const [clock, setClock] = useState({ in: false, since: null, loading: true, busy: false });

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [res, status] = await Promise.all([api.get('/api/dashboard/'), attendanceService.getStatus().catch(() => null)]);
      setData(res.data);
      if (status) setClock((c) => ({ ...c, in: Boolean(status.is_clocked_in), since: status.last_check_in, loading: false }));
      else setClock((c) => ({ ...c, loading: false }));
      setError(null);
    } catch (e) {
      setError('The dashboard could not be loaded. Check your connection and try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load, currentUser]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => load(true), 2 * 60 * 1000); return () => clearInterval(t); }, [load]);

  const toggleClock = async () => {
    setClock((c) => ({ ...c, busy: true }));
    try {
      if (clock.in) await attendanceService.clockOut();
      else await attendanceService.clockIn();
      await load(true);
    } catch (e) {
      setError(e.response?.data?.message || e.response?.data?.error || 'Clocking in or out did not work.');
    }
    setClock((c) => ({ ...c, busy: false }));
  };

  if (loading && !data) {
    return <Box sx={{ py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}><CircularProgress size={56} sx={{ color: 'text.primary', mb: 2 }} /><Typography variant="h6" sx={{ fontWeight: 900 }}>Loading your dashboard…</Typography></Box>;
  }
  if (!data) {
    return <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => load()}>Try again</Button>}>{error}</Alert>;
  }

  const open = (link) => () => navigate(link || '/notifications');
  const urgent = data.attention.filter((a) => a.severity !== 'info').length;
  const firstName = currentUser?.first_name || currentUser?.username || '';
  const people = data.people;
  const bal = data.leave_balance;
  const earned = bal?.remaining?.['Earned Leaves'];
  const sick = bal?.remaining?.['Sick Leaves'];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Dashboard</Typography>
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => load()} sx={{ bgcolor: '#000', color: '#fff', fontWeight: 900, borderRadius: 0, boxShadow: '3px 3px 0px #fcc419', '&:hover': { bgcolor: '#222' } }}>Refresh</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 3, ...card }} onClose={() => setError(null)}>{error}</Alert>}

      <Paper elevation={0} sx={{ ...card, p: 3, mb: 3, bgcolor: '#fcc419', border: '4px solid #000', boxShadow: '6px 6px 0px #000' }}>
        <Typography variant="h4" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Welcome back, {firstName}!</Typography>
        <Typography sx={{ fontWeight: 800 }}>{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, mt: 0.5 }}>
          {data.attention.length === 0 ? 'You are all caught up. Nothing is waiting for you.'
            : urgent ? `${urgent} thing${urgent > 1 ? 's need' : ' needs'} your attention today.` : `${data.attention.length} update${data.attention.length > 1 ? 's' : ''} for you below.`}
        </Typography>
      </Paper>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ ...card, p: 3, height: '100%', bgcolor: '#e9ecef', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Time tracker</Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, my: 1, fontFamily: 'monospace', fontSize: { xs: '1.9rem', md: '2.2rem' }, whiteSpace: 'nowrap' }}>
                {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {clock.in ? `Clocked in${clock.since ? ` since ${formatTime(clock.since)}` : ''}` : 'Not clocked in'}
              </Typography>
            </Box>
            <Button variant="contained" disabled={clock.loading || clock.busy} onClick={toggleClock}
              sx={{ mt: 2, bgcolor: clock.in ? '#c92a2a' : '#000', color: '#fff', borderRadius: 0, boxShadow: '3px 3px 0px #000', fontWeight: 900, '&:hover': { bgcolor: clock.in ? '#a61e1e' : '#222' } }}>
              {clock.busy ? 'Please wait…' : clock.in ? 'Clock out' : 'Clock in'}
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ ...card, p: 3, height: '100%', bgcolor: '#eebefa' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>Upcoming holidays</Typography>
              <CelebrationIcon />
            </Box>
            {data.holidays.length === 0 && <Typography sx={{ fontWeight: 700 }}>No holidays are scheduled. HR can add them in Settings.</Typography>}
            {data.holidays.map((h, i) => (
              <Box key={h.date} sx={{ mb: 1 }}>
                <Typography variant={i === 0 ? 'h5' : 'body1'} sx={{ fontWeight: 900 }}>{h.name}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{new Date(`${h.date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</Typography>
              </Box>
            ))}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ ...card, p: 3, height: '100%', bgcolor: '#d3f9d8' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase', mb: 1 }}>My leave balance</Typography>
            {bal ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Box sx={{ width: 68, height: 68, borderRadius: '50%', border: '5px solid #1f6f35', bgcolor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{earned ?? '-'}</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800 }}>EARNED LEFT</Typography>
                  {sick != null && <Typography variant="caption" sx={{ display: 'block', fontWeight: 700 }}>{sick} sick days left</Typography>}
                </Box>
                <Box sx={{ ml: 'auto', display: 'flex', flexDirection: 'column', gap: 1, textAlign: 'right' }}>
                  <Typography variant="body2" onClick={open('/leaves/request')} sx={{ fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}>Request leave →</Typography>
                  <Typography variant="body2" onClick={open('/leaves')} sx={{ fontWeight: 800, textDecoration: 'underline', cursor: 'pointer' }}>All balances →</Typography>
                </Box>
              </Box>
            ) : <Typography sx={{ fontWeight: 700 }}>Your account is not linked to an employee profile, so there is no leave balance to show.</Typography>}
          </Paper>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Panel title="Needs your attention" action={data.attention.length ? <Chip size="small" label={data.attention.length} /> : null}>
            {data.attention.length === 0 && <Nothing>Nothing is waiting for you right now.</Nothing>}
            <List disablePadding>
              {data.attention.map((a) => (
                <ListItemButton key={a.id} onClick={open(a.link)} divider sx={{ px: 1 }}>
                  <Chip size="small" color={SEVERITY_COLOR[a.severity]} label={a.count} sx={{ mr: 2, minWidth: 36, fontWeight: 800 }} />
                  <ListItemText primary={a.label} secondary={a.hint || null} primaryTypographyProps={{ fontWeight: 700 }} />
                </ListItemButton>
              ))}
            </List>
          </Panel>
        </Grid>
        <Grid item xs={12} md={5}>
          <Grid container spacing={3}>
            {data.kpis.map((k) => (
              <Grid item xs={6} key={k.id}>
                <Paper elevation={0} onClick={open(k.link)} sx={{ ...card, p: 2.5, cursor: 'pointer', bgcolor: 'background.paper', color: 'text.primary', '&:hover': { transform: 'translate(-2px,-2px)', boxShadow: '6px 6px 0px #000' } }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>{k.label}</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900 }}>{k.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{k.hint}</Typography>
                </Paper>
              </Grid>
            ))}
            {data.attendance && (
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ ...card, p: 2.5, bgcolor: 'background.paper', color: 'text.primary' }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>{data.attendance.title}</Typography>
                  {data.attendance.weekend ? <Typography sx={{ fontWeight: 700 }}>It is a weekend, so nobody is expected in.</Typography> : (
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mt: 1 }}>
                      {data.attendance.rows.map((r) => (
                        <Box key={r.label}>
                          <Typography variant="h4" sx={{ fontWeight: 900, color: TONE[r.tone] }}>{r.value ?? '-'}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800 }}>{r.label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        </Grid>
      </Grid>

      {(data.department_distribution.length > 0 || data.hires_by_month.length > 0) && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {data.department_distribution.length > 0 && (
            <Grid item xs={12} md={5}>
              <Panel title={data.role === 'admin' ? 'People by department' : 'Your team by department'}>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.department_distribution} dataKey="value" nameKey="label" innerRadius="50%" outerRadius="80%" paddingAngle={2}>
                        {data.department_distribution.map((d, i) => <Cell key={d.label} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={48} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              </Panel>
            </Grid>
          )}
          {data.hires_by_month.length > 0 && (
            <Grid item xs={12} md={7}>
              <Panel title="Hires by month (last 12 months)">
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.hires_by_month}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={55} />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" name="Hires" fill="#fcc419" stroke="#000" strokeWidth={2} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Panel>
            </Grid>
          )}
        </Grid>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6} lg={3}>
          <Panel title="Out today" action={<EventBusyIcon fontSize="small" />}>
            {data.out_today.length === 0 && <Nothing>Nobody is on approved leave today.</Nothing>}
            {data.out_today.map((p) => <Typography key={p.name} variant="body2" sx={{ py: 0.4 }}><b>{p.name}</b> · {p.leave_type} until {formatDate(p.until)}</Typography>)}
          </Panel>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <Panel title="Birthdays" action={<CakeIcon fontSize="small" />}>
            {people.birthdays.length === 0 && <Nothing>No birthdays in the next 30 days.</Nothing>}
            {people.birthdays.map((p) => <Typography key={p.name + p.date} variant="body2" sx={{ py: 0.4 }}><b>{p.name}</b> · {new Date(`${p.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ({dayLabel(p.days_away)})</Typography>)}
          </Panel>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <Panel title="Work anniversaries" action={<WorkHistoryIcon fontSize="small" />}>
            {people.anniversaries.length === 0 && <Nothing>No work anniversaries in the next 30 days.</Nothing>}
            {people.anniversaries.map((p) => <Typography key={p.name + p.date} variant="body2" sx={{ py: 0.4 }}><b>{p.name}</b> · {p.years} year{p.years > 1 ? 's' : ''} ({dayLabel(p.days_away)})</Typography>)}
          </Panel>
        </Grid>
        <Grid item xs={12} md={6} lg={3}>
          <Panel title="New joiners" action={<PersonAddIcon fontSize="small" />}>
            {people.new_joiners.length === 0 && <Nothing>Nobody joined in the last 30 days.</Nothing>}
            {people.new_joiners.map((p) => <Typography key={p.id} variant="body2" sx={{ py: 0.4, cursor: 'pointer' }} onClick={open(`/employees/${p.id}`)}><b>{p.name}</b> · {p.position || p.department} · {formatDate(p.date)}</Typography>)}
          </Panel>
        </Grid>
      </Grid>

      <Panel title="Recent activity">
        {data.activity.length === 0 && <Nothing>Nothing has happened in the last three weeks.</Nothing>}
        <List disablePadding>
          {data.activity.map((a) => (
            <ListItem key={a.id} disablePadding divider>
              <ListItemButton onClick={open(a.link)}>
                <ListItemAvatar><Avatar sx={{ bgcolor: '#fcc419', color: '#000', border: '2px solid #000', borderRadius: 0 }}>{ACTIVITY_ICON[a.type]}</Avatar></ListItemAvatar>
                <ListItemText primary={<><b>{a.title}</b> <Typography component="span" variant="caption" color="text.secondary" title={formatDateTime(a.at)}>· {timeAgo(a.at)}</Typography></>} secondary={a.description} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Panel>
    </Box>
  );
};

export default Dashboard;
