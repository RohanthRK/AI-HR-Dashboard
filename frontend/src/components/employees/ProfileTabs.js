import { formatMoney } from '../../utils/format';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  MenuItem,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { Link as RouterLink } from 'react-router-dom';
import api from '../../services/api';

const border = '3px solid #000';

/** Leave balance cards from the real leave-balance endpoint. */
export const LeavesTab = ({ employee }) => {
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!employee?._id) return;
    api.get(`/api/leaves/balance/${employee._id}/`)
      .then((res) => setBalance(res.data))
      .catch((e) => setError(e.response?.status === 403 ? 'You can only see your own leave balance.' : 'Could not load the leave balance.'));
  }, [employee]);

  if (error) return <Alert severity="info" sx={{ my: 4 }}>{error}</Alert>;
  if (!balance) return <Box sx={{ py: 4 }}><CircularProgress /></Box>;

  const card = (label, entitlement, used, pending, color) => {
    const remaining = Math.max(entitlement - used - pending, 0);
    return (
      <Grid item xs={12} md={4} key={label}>
        <Paper sx={{ p: 4, border, borderRadius: 0, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, textTransform: 'uppercase' }}>{label}</Typography>
          <Box sx={{ position: 'relative', display: 'inline-flex', mb: 3 }}>
            <CircularProgress variant="determinate" value={(remaining / entitlement) * 100} size={120} thickness={10} sx={{ color }} />
            <Box sx={{ inset: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>{remaining}</Typography>
            </Box>
          </Box>
          <Typography sx={{ fontWeight: 800, color: 'text.secondary' }}>
            {remaining} / {entitlement} days left · {used} used · {pending} pending
          </Typography>
        </Paper>
      </Grid>
    );
  };

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>Leave year {balance.year}</Typography>
      <Grid container spacing={4}>
        {card('Earned leaves', balance.entitlements['Earned Leaves'], balance.used['Earned Leaves'] || 0,
          balance.pending['Earned Leaves'] || 0, '#fcc419')}
        {balance.entitlements['Sick Leaves'] != null && card('Sick leaves', balance.entitlements['Sick Leaves'], balance.used['Sick Leaves'] || 0,
          balance.pending['Sick Leaves'] || 0, '#74c0fc')}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, border, borderRadius: 0, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 2, textTransform: 'uppercase' }}>Unpaid leave</Typography>
            <Typography variant="h3" sx={{ fontWeight: 900 }}>{balance.used['LOP Leaves'] || 0}</Typography>
            <Typography sx={{ fontWeight: 800, color: 'text.secondary' }}>days taken · {balance.pending['LOP Leaves'] || 0} pending</Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

/** Performance summary from real review / OKR data. */
export const PerformanceTab = ({ employee }) => {
  const [insight, setInsight] = useState(null);
  const [error, setError] = useState(null);
  const [plan, setPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);

  const makePlan = async () => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await api.post('/api/ai/development-plan/', { employee_id: employee._id });
      setPlan(res.data);
    } catch (e) {
      setPlanError(e.response?.data?.error || 'Could not create the plan.');
    } finally {
      setPlanLoading(false);
    }
  };

  useEffect(() => {
    if (!employee?._id) return;
    api.get(`/api/ai/talent-insights/employee/${employee._id}/`)
      .then((res) => setInsight(res.data))
      .catch((e) => setError(e.response?.status === 403 ? 'Performance details are only visible to the employee and their managers.' : 'Could not load performance data.'));
  }, [employee]);

  if (error) return <Alert severity="info" sx={{ my: 4 }}>{error}</Alert>;
  if (!insight) return <Box sx={{ py: 4 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, bgcolor: '#fcc419', color: '#000', border, borderRadius: 0, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>OVERALL SCORE</Typography>
            <Typography variant="h1" sx={{ fontWeight: 900 }}>{insight.performance ?? '—'}</Typography>
            <Typography variant="body1" sx={{ fontWeight: 800, opacity: 0.8 }}>
              {insight.performance == null ? 'No reviews or objectives yet' : `out of 5 · growth potential ${insight.growthPotential}`}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, border, borderRadius: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 1 }}>Recommendations</Typography>
            <List dense>
              {insight.recommendations.map((r) => <ListItem key={r.title}><ListItemText primary={r.title} secondary={r.description} /></ListItem>)}
            </List>
            <Box sx={{ mt: 2 }}>
              <Button variant="outlined" onClick={makePlan} disabled={planLoading}>
                {planLoading ? 'Creating plan...' : 'AI development plan'}
              </Button>
              {planError && <Alert severity="warning" sx={{ mt: 1 }}>{planError}</Alert>}
              {plan && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Focus: {plan.focus_areas.join(' · ')}</Typography>
                  <List dense>
                    {plan.plan.map((step) => (
                      <ListItem key={step.when + step.action}>
                        <ListItemText primary={`${step.when}: ${step.action}`} secondary={step.outcome} />
                      </ListItem>
                    ))}
                  </List>
                  {plan.recommended_courses.length > 0 && (
                    <Typography variant="body2">Courses: {plan.recommended_courses.join(', ')}</Typography>
                  )}
                  {plan.mentoring_suggestion && <Typography variant="body2">Mentoring: {plan.mentoring_suggestion}</Typography>}
                  <Typography variant="caption" color="text.secondary">Written by {plan.source}</Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button component={RouterLink} to="/performance?tab=okr" variant="contained" sx={{ bgcolor: '#000', borderRadius: 0, fontWeight: 900 }}>OKRs</Button>
              <Button component={RouterLink} to="/performance?tab=reviews" variant="contained" sx={{ bgcolor: '#000', borderRadius: 0, fontWeight: 900 }}>Reviews</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

/** Employee documents: list, upload (with optional expiry date for compliance tracking), download, delete. */
export const DocumentsTab = ({ employee, canDelete }) => {
  const [docs, setDocs] = useState([]);
  const [message, setMessage] = useState(null);
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [expires, setExpires] = useState('');

  const load = useCallback(async () => {
    if (!employee?._id) return;
    try {
      const res = await api.get(`/api/employees/${employee._id}/documents/`);
      setDocs(res.data.documents || []);
    } catch (e) {
      setMessage({ severity: 'info', text: e.response?.status === 403 ? 'Documents are only visible to the employee and HR.' : 'Could not load documents.' });
    }
  }, [employee]);

  useEffect(() => { load(); }, [load]);

  const upload = async () => {
    const form = new FormData();
    form.append('file', file);
    form.append('name', name || file.name);
    if (expires) form.append('expires_on', expires);
    try {
      await api.post(`/api/employees/${employee._id}/documents/upload/`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFile(null); setName(''); setExpires('');
      load();
    } catch (e) {
      setMessage({ severity: 'error', text: e.response?.data?.message || 'Upload failed.' });
    }
  };

  const download = async (doc) => {
    const res = await api.get(`/api/employees/${employee._id}/documents/${doc._id}/`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.name || 'document';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const remove = async (doc) => {
    try {
      await api.delete(`/api/employees/${employee._id}/documents/${doc._id}/delete/`);
      load();
    } catch (e) {
      setMessage({ severity: 'error', text: 'Could not delete the document.' });
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Box sx={{ py: 4 }}>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper sx={{ p: 3, border, borderRadius: 0, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Button component="label" startIcon={<UploadFileIcon />} variant="outlined">
          {file ? file.name : 'Choose file'}
          <input hidden type="file" onChange={(e) => setFile(e.target.files[0] || null)} />
        </Button>
        <TextField size="small" label="Document name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextField size="small" label="Expires on" type="date" InputLabelProps={{ shrink: true }} value={expires} onChange={(e) => setExpires(e.target.value)} />
        <Button variant="contained" disabled={!file} onClick={upload}>Upload</Button>
      </Paper>
      <Paper sx={{ border, borderRadius: 0 }}>
        <List>
          {docs.length === 0 && <ListItem><ListItemText primary="No documents uploaded." /></ListItem>}
          {docs.map((d) => (
            <ListItem key={d._id} divider secondaryAction={
              <>
                <IconButton onClick={() => download(d)}><DownloadIcon /></IconButton>
                {canDelete && <IconButton onClick={() => remove(d)}><DeleteIcon /></IconButton>}
              </>}>
              <ListItemText primary={d.name} secondary={`${d.category || 'general'} · uploaded ${(d.upload_date || '').slice(0, 10)}`} />
              {d.expires_on && <Chip size="small" sx={{ mr: 6 }} color={d.expires_on < today ? 'error' : 'default'} label={`Expires ${d.expires_on}`} />}
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

/** Bank details (employee or staff) and recurring pay items - benefits are added, deductions subtracted on each payslip. */
export const PayTab = ({ employee, isStaff }) => {
  const [bank, setBank] = useState({ account_holder: '', bank_name: '', branch: '', account_number: '', ifsc: '', pan: '', uan: '' });
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState({ kind: 'benefit', name: '', amount: '' });
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    if (!employee?._id) return;
    try {
      const [b, i] = await Promise.all([
        api.get(`/api/payroll/bank/${employee._id}/`),
        api.get(`/api/payroll/items/${employee._id}/`),
      ]);
      setBank((prev) => ({ ...prev, ...b.data.bank_details, pan: b.data.pan || '', uan: b.data.uan || '' }));
      setItems(i.data.items);
    } catch (e) {
      setMessage({ severity: 'info', text: 'Pay details are only visible to the employee and HR.' });
    }
  }, [employee]);

  useEffect(() => { load(); }, [load]);

  const saveBank = async () => {
    try {
      await api.put(`/api/payroll/bank/${employee._id}/`, bank);
      setMessage({ severity: 'success', text: 'Bank and tax details saved.' });
    } catch (e) { setMessage({ severity: 'error', text: e.response?.data?.message || 'Could not save the details.' }); }
  };

  const addItem = async () => {
    try {
      await api.post(`/api/payroll/items/${employee._id}/`, { ...draft, amount: Number(draft.amount) });
      setDraft({ kind: 'benefit', name: '', amount: '' });
      load();
    } catch (e) { setMessage({ severity: 'error', text: e.response?.data?.message || 'Could not add the item.' }); }
  };

  const removeItem = async (item) => {
    try {
      await api.delete(`/api/payroll/items/${employee._id}/${item.id}/`);
      load();
    } catch (e) { setMessage({ severity: 'error', text: 'Could not remove the item.' }); }
  };

  return (
    <Box sx={{ py: 4 }}>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, border, borderRadius: 0, display: 'grid', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>Bank and tax details</Typography>
            {[['account_holder', 'Account holder name', ''], ['bank_name', 'Bank', 'HDFC Bank'], ['branch', 'Branch', ''], ['account_number', 'Account number', '9 to 18 digits'],
              ['ifsc', 'IFSC code', 'HDFC0001234'], ['pan', 'PAN', 'ABCDE1234F'], ['uan', 'UAN (provident fund)', '12 digits']].map(([key, label, hint]) => (
              <TextField key={key} size="small" label={label} placeholder={hint} value={bank[key] || ''}
                inputProps={key === 'ifsc' || key === 'pan' ? { style: { textTransform: 'uppercase' } } : undefined}
                onChange={(e) => setBank({ ...bank, [key]: e.target.value })} />
            ))}
            <Button variant="contained" onClick={saveBank}>Save</Button>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, border, borderRadius: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>Recurring benefits &amp; deductions</Typography>
            <List dense>
              {items.length === 0 && <ListItem><ListItemText primary="None." /></ListItem>}
              {items.map((i) => (
                <ListItem key={i.id} secondaryAction={isStaff && <IconButton onClick={() => removeItem(i)}><DeleteIcon /></IconButton>}>
                  <ListItemText primary={i.name} secondary={`${i.kind === 'benefit' ? '+' : '-'} ${formatMoney(i.amount)} per month`} />
                </ListItem>
              ))}
            </List>
            {isStaff && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <TextField select size="small" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })}>
                  <MenuItem value="benefit">Benefit</MenuItem>
                  <MenuItem value="deduction">Deduction</MenuItem>
                </TextField>
                <TextField size="small" label="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <TextField size="small" label="Amount" type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
                <Button variant="contained" disabled={!draft.name.trim() || !draft.amount} onClick={addItem}>Add</Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
