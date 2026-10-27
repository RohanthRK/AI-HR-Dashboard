import React, { useState, useCallback } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, List, ListItem, ListItemText, Paper, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import api from '../../services/api';

/** AI-written briefing of the live people analytics (generated on demand; the server caches it for 10 minutes). */
const AiBriefing = () => {
  const [state, setState] = useState({ loading: false, data: null, error: null });

  const load = useCallback(async (refresh = false) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get('/api/ai/insights-summary/', { params: refresh ? { refresh: 1 } : {} });
      setState({ loading: false, data: res.data, error: null });
    } catch (e) {
      setState({ loading: false, data: null, error: e.response?.data?.error || 'Could not generate the briefing.' });
    }
  }, []);

  const { loading, data, error } = state;
  const section = (title, items, color) => items?.length > 0 && (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" color={color} sx={{ fontWeight: 800, textTransform: 'uppercase' }}>{title}</Typography>
      <List dense disablePadding>
        {items.map((item, i) => <ListItem key={i} disableGutters><ListItemText primary={`• ${item}`} /></ListItem>)}
      </List>
    </Box>
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesomeIcon fontSize="small" /> AI briefing
        </Typography>
        <Button variant="contained" size="small" onClick={() => load(!!data)} disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon />}>
          {data ? 'Regenerate' : 'Generate briefing'}
        </Button>
      </Box>
      {error && <Alert severity="warning" sx={{ mt: 2 }}>{error}</Alert>}
      {!data && !error && !loading && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          A short written summary of headcount, engagement, attrition risk, attendance and payroll, with suggested actions.
        </Typography>
      )}
      {data && (
        <Box>
          <Typography sx={{ mt: 2, fontWeight: 700 }}>{data.headline}</Typography>
          {section('Highlights', data.highlights, 'success.main')}
          {section('Needs attention', data.risks, 'warning.main')}
          {section('Suggested actions', data.actions, 'primary.main')}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip size="small" label={`Written by ${data.source}`} />
            <Typography variant="caption" color="text.secondary">
              from live data · {new Date(data.generated_at).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default AiBriefing;
