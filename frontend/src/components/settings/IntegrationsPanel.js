import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, Divider, FormControlLabel, FormGroup, IconButton, List, ListItem, ListItemText,
  Paper, Switch, TextField, Typography
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../services/api';

/** Admin tools: outbound webhooks (signed events) and employee CSV export / import. */
const IntegrationsPanel = () => {
  const [hooks, setHooks] = useState([]);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ name: '', url: '', events: [] });
  const [secret, setSecret] = useState(null);
  const [message, setMessage] = useState(null);
  const [importResult, setImportResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/integrations/webhooks/');
      setHooks(res.data.webhooks);
      setEvents(res.data.events);
    } catch (e) {
      setMessage({ severity: 'error', text: 'Could not load integrations (Admin only).' });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fail = (e, fallback) => setMessage({ severity: 'error', text: e.response?.data?.error || fallback });

  const create = async () => {
    try {
      const res = await api.post('/api/integrations/webhooks/', form);
      setSecret(res.data.webhook.secret);
      setForm({ name: '', url: '', events: [] });
      load();
    } catch (e) { fail(e, 'Could not create the webhook.'); }
  };

  const toggleEvent = (event) => setForm({
    ...form, events: form.events.includes(event) ? form.events.filter((x) => x !== event) : [...form.events, event],
  });

  const test = async (hook) => {
    try {
      const res = await api.post(`/api/integrations/webhooks/${hook._id}/test/`);
      setMessage({ severity: res.data.success ? 'success' : 'warning', text: `Test delivery: ${res.data.last_delivery?.status}` });
      load();
    } catch (e) { fail(e, 'Test failed.'); }
  };

  const toggleActive = async (hook) => {
    try {
      await api.put(`/api/integrations/webhooks/${hook._id}/`, { active: !hook.active });
      load();
    } catch (e) { fail(e, 'Could not update the webhook.'); }
  };

  const remove = async (hook) => {
    try {
      await api.delete(`/api/integrations/webhooks/${hook._id}/`);
      load();
    } catch (e) { fail(e, 'Could not delete the webhook.'); }
  };

  const download = async () => {
    try {
      const res = await api.get('/api/integrations/employees/export/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'employees.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { fail(e, 'Export failed.'); }
  };

  const importCsv = async (file, dryRun) => {
    const data = new FormData();
    data.append('file', file);
    try {
      const res = await api.post(`/api/integrations/employees/import/${dryRun ? '?dry_run=true' : ''}`, data);
      setImportResult(res.data);
    } catch (e) {
      if (e.response?.data?.created !== undefined) setImportResult(e.response.data);
      else fail(e, 'Import failed.');
    }
  };

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      {message && <Alert severity={message.severity} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Box>
        <Typography variant="subtitle1" fontWeight={600}>Webhooks</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Each event is sent as JSON with an <code>X-HR-Signature: sha256=…</code> header (HMAC-SHA256 of the body with the secret).
        </Typography>
        {secret && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSecret(null)}>
            Signing secret (shown once): <code>{secret}</code>
          </Alert>
        )}
        <Paper variant="outlined">
          <List dense>
            {hooks.length === 0 && <ListItem><ListItemText primary="No webhooks yet." /></ListItem>}
            {hooks.map((h) => (
              <ListItem key={h._id} divider secondaryAction={<IconButton aria-label="delete webhook" onClick={() => remove(h)}><DeleteIcon /></IconButton>}>
                <ListItemText
                  primary={<>{h.name} <Chip size="small" sx={{ ml: 1 }} label={h.events.join(', ')} /></>}
                  secondary={`${h.url} · ${h.last_delivery ? `last: ${h.last_delivery.event} ${h.last_delivery.status}` : 'never delivered'}`} />
                <Switch checked={h.active} onChange={() => toggleActive(h)} />
                <Button size="small" onClick={() => test(h)} sx={{ mr: 5 }}>Test</Button>
              </ListItem>
            ))}
          </List>
        </Paper>
        <Box sx={{ display: 'grid', gap: 1, mt: 2 }}>
          <TextField size="small" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextField size="small" label="Endpoint URL (public https)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <FormGroup row>
            {events.map((ev) => (
              <FormControlLabel key={ev} label={ev} control={<Checkbox size="small" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} />} />
            ))}
          </FormGroup>
          <Box><Button variant="contained" disabled={!form.name.trim() || !form.url.trim() || form.events.length === 0} onClick={create}>Add webhook</Button></Box>
        </Box>
      </Box>

      <Divider />

      <Box>
        <Typography variant="subtitle1" fontWeight={600}>Employee data (CSV)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Export to move people to another system, or import from a Workday / BambooHR / spreadsheet export.
          Required columns: first_name, last_name, email, employee_id. Optional: phone, position, department, hire_date, salary.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" onClick={download}>Export employees</Button>
          <Button variant="outlined" component="label">Check a CSV (dry run)
            <input hidden type="file" accept=".csv,text/csv" onChange={(e) => e.target.files[0] && importCsv(e.target.files[0], true)} />
          </Button>
          <Button variant="contained" component="label">Import CSV
            <input hidden type="file" accept=".csv,text/csv" onChange={(e) => e.target.files[0] && importCsv(e.target.files[0], false)} />
          </Button>
        </Box>
        {importResult && (
          <Alert severity={importResult.errors?.length ? 'warning' : 'success'} sx={{ mt: 2 }} onClose={() => setImportResult(null)}>
            {importResult.dry_run ? 'Dry run: ' : ''}{importResult.created} employee(s) {importResult.dry_run ? 'would be ' : ''}created, {importResult.skipped?.length || 0} skipped, {importResult.errors?.length || 0} error(s).
            {(importResult.errors || []).slice(0, 5).map((er) => <div key={er.line}>Line {er.line}: {er.error}</div>)}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default IntegrationsPanel;
