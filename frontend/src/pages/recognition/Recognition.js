import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert, Autocomplete, Avatar, Box, Button, Chip, InputAdornment, List, ListItem, ListItemAvatar, ListItemText,
  MenuItem, Paper, Select, Tab, Tabs, TextField, Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SearchIcon from '@mui/icons-material/Search';
import api from '../../services/api';
import { formatDateTime, timeAgo } from '../../utils/format';

const Recognition = () => {
  const [feed, setFeed] = useState([]);
  const [badges, setBadges] = useState({});
  const [board, setBoard] = useState([]);
  const [period, setPeriod] = useState('month');
  const [me, setMe] = useState(null);
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState({ to: null, badge: 'kudos', message: '' });
  const [message, setMessage] = useState(null);
  const [sending, setSending] = useState(false);
  const [scope, setScope] = useState('all');
  const [badgeFilter, setBadgeFilter] = useState('all');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const [f, b, m, e] = await Promise.all([
        api.get('/api/recognition/', { params: { limit: 300 } }),
        api.get('/api/recognition/leaderboard/', { params: { period } }),
        api.get('/api/recognition/me/').catch(() => ({ data: null })),
        api.get('/api/employees/', { params: { limit: 500 } }),
      ]);
      setFeed(f.data.recognitions);
      setBadges(f.data.badges);
      setBoard(b.data.leaderboard);
      setMe(m.data);
      setPeople(e.data.results || []);
    } catch (err) {
      setMessage({ severity: 'error', text: 'Could not load recognition data.' });
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const give = async () => {
    setSending(true);
    try {
      await api.post('/api/recognition/', { to: form.to?._id, badge: form.badge, message: form.message });
      setForm({ to: null, badge: 'kudos', message: '' });
      setMessage({ severity: 'success', text: 'Recognition sent!' });
      setScope('all'); setBadgeFilter('all'); setQuery('');
      load();
    } catch (err) {
      setMessage({ severity: 'error', text: err.response?.data?.error || 'Could not send the recognition.' });
    }
    setSending(false);
  };

  const myName = me?.name;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feed.filter((r) =>
      (badgeFilter === 'all' || r.badge === badgeFilter) &&
      (scope === 'all' || (scope === 'received' ? r.to_name === myName : r.from_name === myName)) &&
      (!q || `${r.from_name} ${r.to_name} ${r.message} ${r.to_department || ''}`.toLowerCase().includes(q)));
  }, [feed, query, badgeFilter, scope, myName]);

  const personLabel = (p) => `${`${p.first_name || ''} ${p.last_name || ''}`.trim()} (${p.employee_id})${p.department ? ` · ${p.department}` : ''}`;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>Recognition</Typography>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, mb: 3, display: 'grid', gap: 2 }}>
            <Typography variant="h6">Recognise a colleague</Typography>
            <Autocomplete size="small" options={people} value={form.to} onChange={(e, v) => setForm({ ...form, to: v })}
              getOptionLabel={personLabel} isOptionEqualToValue={(a, b) => a._id === b._id}
              renderInput={(params) => <TextField {...params} label="Colleague" placeholder="Type a name to search" />} />
            <TextField select size="small" label="Badge" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })}>
              {Object.entries(badges).map(([id, b]) => <MenuItem key={id} value={id}>{`${b.label} (+${b.points})`}</MenuItem>)}
            </TextField>
            <TextField size="small" label="Why?" multiline minRows={2} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <Button variant="contained" disabled={!form.to || form.message.trim().length < 3 || sending} onClick={give}>Send recognition</Button>
          </Paper>

          <Paper>
            <Box sx={{ p: 2, pb: 1 }}>
              <Typography variant="h6">Recent recognition <Typography component="span" variant="body2" color="text.secondary">· newest first, {shown.length} shown</Typography></Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mt: 1.5, alignItems: 'center' }}>
                <TextField size="small" placeholder="Search name, message or department" value={query} onChange={(e) => setQuery(e.target.value)}
                  inputProps={{ 'aria-label': 'Search recognition' }} sx={{ flex: 1, minWidth: 220 }}
                  InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
                <Select size="small" value={badgeFilter} onChange={(e) => setBadgeFilter(e.target.value)} SelectDisplayProps={{ 'aria-label': 'Filter by badge' }}>
                  <MenuItem value="all">All badges</MenuItem>
                  {Object.entries(badges).map(([id, b]) => <MenuItem key={id} value={id}>{b.label}</MenuItem>)}
                </Select>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                {[['all', 'Everyone'], ['received', 'Received by me'], ['given', 'Given by me']].map(([id, label]) => (
                  <Chip key={id} clickable label={label} color={scope === id ? 'primary' : 'default'} onClick={() => setScope(id)} />
                ))}
              </Box>
            </Box>
            <List>
              {shown.length === 0 && <ListItem><ListItemText primary={feed.length ? 'Nothing matches these filters.' : 'No recognition yet — be the first!'} /></ListItem>}
              {shown.map((r) => (
                <ListItem key={r._id} divider alignItems="flex-start">
                  <ListItemAvatar><Avatar><EmojiEventsIcon /></Avatar></ListItemAvatar>
                  <ListItemText
                    primary={<>{r.from_name} → <b>{r.to_name}</b> <Chip size="small" sx={{ ml: 1 }} label={`${badges[r.badge]?.label || r.badge} +${r.points}`} /></>}
                    secondary={<>
                      <Typography component="span" variant="body2" sx={{ display: 'block' }}>{r.message}</Typography>
                      <Typography component="span" variant="caption" color="text.secondary" title={formatDateTime(r.created_at)}>
                        {timeAgo(r.created_at)}{r.to_department ? ` · ${r.to_department}` : ''}
                      </Typography>
                    </>}
                    secondaryTypographyProps={{ component: 'div' }} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={5}>
          {me && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6">My progress</Typography>
              <Typography variant="h3">{me.points} <Typography component="span" color="text.secondary">points</Typography></Typography>
              <Typography variant="body2" color="text.secondary">{me.received.length} recognition(s) received · {me.given} given</Typography>
              <Box sx={{ mt: 1 }}>
                {me.achievements.length === 0 && <Typography variant="body2" color="text.secondary">Complete trainings, goals and attendance to earn badges.</Typography>}
                {me.achievements.map((a) => <Chip key={a.id} color="success" sx={{ mr: 0.5, mt: 0.5 }} label={`${a.label} · ${a.detail}`} />)}
              </Box>
            </Paper>
          )}
          <Paper>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2 }}>
              <Typography variant="h6">Leaderboard</Typography>
              <Tabs value={period} onChange={(e, v) => setPeriod(v)}>
                <Tab value="month" label="30 days" />
                <Tab value="all" label="All time" />
              </Tabs>
            </Box>
            <List dense>
              {board.length === 0 && <ListItem><ListItemText primary="Nobody on the board yet." /></ListItem>}
              {board.map((row) => (
                <ListItem key={row.employee_id} divider>
                  <ListItemText primary={`${row.rank}. ${row.name}`} secondary={`${row.recognitions} recognition(s) from ${row.colleagues} colleague(s)`} />
                  <Chip label={`${row.points} pts`} />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Recognition;
