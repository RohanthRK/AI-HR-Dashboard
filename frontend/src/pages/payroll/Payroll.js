import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment,
  List, ListItem, ListItemText, MenuItem, Paper, Select, Step, StepLabel, Stepper, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tabs, TextField, Tooltip, Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import GetAppIcon from '@mui/icons-material/GetApp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import api from '../../services/api';
import authService from '../../services/authService';
import PayslipDialog, { downloadPayslipPdf } from '../../components/payroll/PayslipDialog';
import { formatDate, formatMoney, formatMoneyShort } from '../../utils/format';

const STATUS_COLOR = { Draft: 'default', Processed: 'info', Paid: 'success' };
const STATUS_LABEL = { Draft: 'Draft', Processed: 'Released', Paid: 'Paid' };
const STEP_OF = { 'Not generated': 0, Draft: 1, Released: 2, Paid: 3 };
const SEVERITY = { error: 'error', warning: 'warning', info: 'info' };

const saveBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
};

const monthLabel = (date) => date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
const shiftMonth = (label, by) => {
  const d = new Date(`1 ${label}`);
  d.setMonth(d.getMonth() + by);
  return monthLabel(d);
};

const Stat = ({ label, value, hint }) => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>{label}</Typography>
    <Typography variant="h5">{value}</Typography>
    {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
  </Paper>
);

const Line = ({ label, value, bold }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, fontWeight: bold ? 800 : 400 }}>
    <span>{label}</span><span>{value}</span>
  </Box>
);

// ---------------------------------------------------------------------------------------------- my payslips
const MyPay = () => {
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [missing, setMissing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/api/payroll/me/'), api.get('/api/payroll/summary/')])
      .then(([h, s]) => { setHistory(h.data.results || []); setSummary(s.data.summary || null); setMissing(s.data.missing || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const download = async (slip) => {
    try { await downloadPayslipPdf(slip); } catch (e) { setMessage({ severity: 'error', text: 'Could not download the payslip.' }); }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  const latest = history[0];
  return (
    <Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      {missing.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Your {missing.join(', ')} {missing.length === 1 ? 'is' : 'are'} missing. Add {missing.length === 1 ? 'it' : 'them'} under Employee Directory &gt; your profile &gt; Payroll so your salary can be paid and tax deducted correctly.
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Stat label={latest ? `Latest payslip · ${latest.period}` : 'Latest payslip'} value={latest ? formatMoney(latest.net_salary) : '-'}
            hint={latest ? `${STATUS_LABEL[latest.status] || latest.status} · ${formatDate(latest.date)}` : 'No payslip has been released yet'} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Stat label="This month (expected)" value={summary ? formatMoney(summary.net_salary) : '-'}
            hint={summary ? `${summary.paid_days} of ${summary.working_days} working days paid` : 'No salary recorded'} />
        </Grid>
        <Grid item xs={12} md={4}>
          <Stat label="Monthly CTC" value={summary ? formatMoney(summary.ctc_monthly) : '-'} hint={summary ? `Employer PF ${formatMoney(summary.employer_pf)} included` : ''} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>How your pay is made up (this month)</Typography>
            {summary ? (
              <>
                <Line label="Basic" value={formatMoney(summary.basic)} />
                <Line label="House rent allowance" value={formatMoney(summary.hra)} />
                <Line label="Special allowance" value={formatMoney(summary.special_allowance)} />
                {(summary.pay_items || []).filter((i) => i.kind === 'benefit').map((i) => <Line key={i.name} label={i.name} value={formatMoney(i.amount)} />)}
                <Line label="Gross earnings" value={formatMoney(summary.gross_salary)} bold />
                <Line label="Provident fund" value={`- ${formatMoney(summary.provident_fund)}`} />
                {summary.esi > 0 && <Line label="ESI" value={`- ${formatMoney(summary.esi)}`} />}
                {summary.professional_tax > 0 && <Line label="Professional tax" value={`- ${formatMoney(summary.professional_tax)}`} />}
                <Line label="Income tax (TDS)" value={`- ${formatMoney(summary.tax)}`} />
                {(summary.pay_items || []).filter((i) => i.kind === 'deduction').map((i) => <Line key={i.name} label={i.name} value={`- ${formatMoney(i.amount)}`} />)}
                <Line label="Net pay" value={formatMoney(summary.net_salary)} bold />
              </>
            ) : <Alert severity="warning">No salary has been recorded for you yet. Please contact HR.</Alert>}
          </Paper>
        </Grid>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Payslip history</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>Month</TableCell><TableCell align="right">Gross</TableCell><TableCell align="right">Deductions</TableCell><TableCell align="right">Net pay</TableCell><TableCell>Status</TableCell><TableCell align="right">Payslip</TableCell></TableRow></TableHead>
                <TableBody>
                  {history.length === 0 && <TableRow><TableCell colSpan={6} align="center">No payslips yet.</TableCell></TableRow>}
                  {history.map((s) => (
                    <TableRow key={s._id} hover>
                      <TableCell>{s.period}</TableCell>
                      <TableCell align="right">{formatMoney(s.gross_salary)}</TableCell>
                      <TableCell align="right">{formatMoney(s.total_deductions ?? s.gross_salary - s.net_salary)}</TableCell>
                      <TableCell align="right"><b>{formatMoney(s.net_salary)}</b></TableCell>
                      <TableCell><Chip size="small" color={STATUS_COLOR[s.status]} label={STATUS_LABEL[s.status] || s.status} /></TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="View"><IconButton size="small" aria-label={`View payslip for ${s.period}`} onClick={() => setOpenId(s._id)}><VisibilityIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Download PDF"><IconButton size="small" aria-label={`Download payslip for ${s.period}`} onClick={() => download(s)}><GetAppIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
      <PayslipDialog slipId={openId} onClose={() => setOpenId(null)} />
    </Box>
  );
};

// ---------------------------------------------------------------------------------------------- HR: pay run
const PayRun = ({ people }) => {
  const [period, setPeriod] = useState(monthLabel(new Date()));
  const [run, setRun] = useState(null);
  const [slips, setSlips] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [adjust, setAdjust] = useState(null);
  const [confirmRelease, setConfirmRelease] = useState(null);

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([api.get('/api/payroll/run/', { params: { period } }), api.get('/api/payroll/', { params: { period } })]);
      setRun(r.data);
      setSlips(s.data.results || []);
    } catch (e) { setMessage({ severity: 'error', text: 'Could not load this pay run.' }); }
  }, [period]);
  useEffect(() => { setRun(null); load(); }, [load]);

  const act = async (url, body, okText) => {
    setBusy(true);
    try {
      const res = await api.post(url, { period, ...body });
      setMessage({ severity: 'success', text: okText(res.data) });
      setConfirmRelease(null);
      await load();
    } catch (e) {
      if (e.response?.status === 409 && e.response.data?.needs_confirmation) setConfirmRelease(e.response.data.employees);
      else setMessage({ severity: 'error', text: e.response?.data?.message || e.response?.data?.error || 'That did not work.' });
    }
    setBusy(false);
  };

  const download = async (kind) => {
    try {
      const res = await api.get('/api/payroll/export/', { params: { period, kind }, responseType: 'blob' });
      saveBlob(res.data, `${kind}-${period.replace(' ', '-').toLowerCase()}.csv`);
    } catch (e) { setMessage({ severity: 'error', text: 'Could not download the file.' }); }
  };

  const departments = useMemo(() => [...new Set(slips.map((s) => s.department).filter(Boolean))].sort(), [slips]);
  const shown = slips.filter((s) => (dept === 'all' || s.department === dept) && (!q.trim() || `${s.employee_name} ${s.employee_code}`.toLowerCase().includes(q.trim().toLowerCase())));
  const status = run?.status || 'Not generated';
  const t = run?.totals;

  return (
    <Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <IconButton aria-label="Previous month" onClick={() => setPeriod(shiftMonth(period, -1))}><ChevronLeftIcon /></IconButton>
          <Typography variant="h5" sx={{ minWidth: 190, textAlign: 'center', fontWeight: 900 }}>{period}</Typography>
          <IconButton aria-label="Next month" onClick={() => setPeriod(shiftMonth(period, 1))}><ChevronRightIcon /></IconButton>
          <Chip label={status === 'Released' ? 'Released to employees' : status} color={status === 'Paid' ? 'success' : status === 'Not generated' ? 'default' : 'info'} />
          <Box sx={{ flex: 1 }} />
          {status !== 'Paid' && (
            <Button variant={status === 'Not generated' ? 'contained' : 'outlined'} disabled={busy} onClick={() => act('/api/payroll/generate/', {}, (d) => `${d.created} payslip(s) created, ${d.updated} recalculated, ${d.skipped} skipped.`)}>
              {status === 'Not generated' ? 'Generate payslips' : 'Recalculate'}
            </Button>
          )}
          {run?.counts?.Draft > 0 && <Button variant="contained" disabled={busy} onClick={() => act('/api/payroll/release/', {}, (d) => `${d.released} payslip(s) released. Employees were notified.`)}>Release payslips</Button>}
          {status === 'Released' && <Button variant="contained" color="success" disabled={busy} onClick={() => act('/api/payroll/mark-paid/', {}, (d) => `${d.updated} payslip(s) marked as paid. The month is now locked.`)}>Mark as paid</Button>}
        </Box>
        <Stepper activeStep={STEP_OF[status]} alternativeLabel>
          {['Generate', 'Review drafts', 'Release to employees', 'Paid and locked'].map((l) => <Step key={l}><StepLabel>{l}</StepLabel></Step>)}
        </Stepper>
      </Paper>

      {status === 'Not generated' && <Alert severity="info" sx={{ mb: 2 }}>No payslips for {period} yet. “Generate payslips” creates a draft for every active employee with a salary. Drafts are visible only to HR until you release them.</Alert>}

      {t && t.employees > 0 && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} md={3}><Stat label="Employees" value={t.employees} hint={t.lop_days ? `${t.lop_days} loss-of-pay day(s)` : ''} /></Grid>
          <Grid item xs={6} md={3}><Stat label="Gross earnings" value={formatMoneyShort(t.gross)} hint={formatMoney(t.gross)} /></Grid>
          <Grid item xs={6} md={3}><Stat label="Net pay (to banks)" value={formatMoneyShort(t.net)} hint={formatMoney(t.net)} /></Grid>
          <Grid item xs={6} md={3}><Stat label="Cost to company" value={formatMoneyShort(t.employer_cost)} hint="gross + employer PF and ESI" /></Grid>
          <Grid item xs={6} md={3}><Stat label="Provident fund" value={formatMoneyShort(t.provident_fund + t.employer_pf)} hint="employee + employer, to deposit" /></Grid>
          <Grid item xs={6} md={3}><Stat label="TDS" value={formatMoneyShort(t.tds)} hint="income tax to deposit" /></Grid>
          <Grid item xs={6} md={3}><Stat label="Professional tax" value={formatMoneyShort(t.professional_tax)} /></Grid>
          <Grid item xs={6} md={3}><Stat label="ESI" value={formatMoneyShort(t.esi)} hint="employee + employer" /></Grid>
        </Grid>
      )}

      {run?.checks?.length > 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>Before you release</Typography>
          {run.checks.map((c) => (
            <Alert key={c.title} severity={SEVERITY[c.severity]} sx={{ mb: 1 }}>
              <b>{c.title}</b> ({c.employees.length}). {c.detail}
              <Typography variant="body2" component="div" sx={{ mt: 0.5 }}>{c.employees.slice(0, 12).join(', ')}{c.employees.length > 12 ? ` and ${c.employees.length - 12} more` : ''}</Typography>
            </Alert>
          ))}
        </Paper>
      )}

      {slips.length > 0 && (
        <>
          <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField size="small" placeholder="Search name or employee ID" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1, minWidth: 220 }}
              inputProps={{ 'aria-label': 'Search payslips' }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
            {departments.length > 1 && (
              <Select size="small" value={dept} onChange={(e) => setDept(e.target.value)} SelectDisplayProps={{ 'aria-label': 'Filter by department' }}>
                <MenuItem value="all">All departments</MenuItem>
                {departments.map((d) => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </Select>
            )}
            <Button startIcon={<GetAppIcon />} onClick={() => download('bank')}>Bank transfer file</Button>
            <Button startIcon={<GetAppIcon />} onClick={() => download('register')}>Payroll register</Button>
            <Button startIcon={<GetAppIcon />} onClick={() => download('statutory')}>PF / ESI / TDS summary</Button>
          </Paper>
          <TableContainer component={Paper}>
            <Table size="small" sx={{ minWidth: 900 }}>
              <TableHead>
                <TableRow><TableCell>Employee</TableCell><TableCell>Department</TableCell><TableCell align="right">Days paid</TableCell><TableCell align="right">Gross</TableCell><TableCell align="right">PF</TableCell><TableCell align="right">TDS</TableCell><TableCell align="right">Other</TableCell><TableCell align="right">Net pay</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {shown.length === 0 && <TableRow><TableCell colSpan={10}>Nobody matches these filters.</TableCell></TableRow>}
                {shown.map((s) => (
                  <TableRow key={s._id} hover>
                    <TableCell><b>{s.employee_name}</b><Typography variant="caption" display="block" color="text.secondary">{s.employee_code} · {s.designation}</Typography></TableCell>
                    <TableCell>{s.department || '-'}</TableCell>
                    <TableCell align="right">{s.paid_days}/{s.working_days}{s.lop_days ? <Chip size="small" color="warning" label={`LOP ${s.lop_days}`} sx={{ ml: 0.5 }} /> : null}</TableCell>
                    <TableCell align="right">{formatMoney(s.gross_salary)}</TableCell>
                    <TableCell align="right">{formatMoney(s.provident_fund)}</TableCell>
                    <TableCell align="right">{formatMoney(s.tax)}</TableCell>
                    <TableCell align="right">{formatMoney((s.total_deductions || 0) - s.provident_fund - s.tax)}</TableCell>
                    <TableCell align="right"><b>{formatMoney(s.net_salary)}</b></TableCell>
                    <TableCell><Chip size="small" color={STATUS_COLOR[s.status]} label={STATUS_LABEL[s.status] || s.status} /></TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" onClick={() => setOpenId(s._id)}>View</Button>
                      {s.status !== 'Paid' && <Button size="small" onClick={() => setAdjust({ employee: people.find((p) => p._id === s.employee_id) || null, kind: 'earning', name: '', amount: '' })}>Adjust</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <PayslipDialog slipId={openId} onClose={() => setOpenId(null)} />

      <Dialog open={!!adjust} onClose={() => setAdjust(null)} fullWidth maxWidth="sm">
        <DialogTitle>One-off adjustment for {period}</DialogTitle>
        {adjust && (
          <DialogContent sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
            <Autocomplete options={people} value={adjust.employee} onChange={(e, v) => setAdjust({ ...adjust, employee: v })}
              getOptionLabel={(p) => `${p.first_name} ${p.last_name} (${p.employee_id})`} isOptionEqualToValue={(a, b) => a._id === b._id}
              renderInput={(params) => <TextField {...params} label="Employee" />} />
            <TextField select label="Type" value={adjust.kind} onChange={(e) => setAdjust({ ...adjust, kind: e.target.value })}>
              <MenuItem value="earning">Earning: bonus, arrears, incentive, reimbursement</MenuItem>
              <MenuItem value="deduction">Deduction: advance recovery, penalty</MenuItem>
            </TextField>
            <TextField label="Name on the payslip" placeholder="Diwali bonus" value={adjust.name} onChange={(e) => setAdjust({ ...adjust, name: e.target.value })} />
            <TextField label="Amount (₹)" type="number" inputProps={{ min: 0 }} value={adjust.amount} onChange={(e) => setAdjust({ ...adjust, amount: e.target.value })} />
            <Typography variant="body2" color="text.secondary">The payslip is recalculated immediately. Tax is not recalculated on one-off amounts.</Typography>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setAdjust(null)}>Cancel</Button>
          <Button variant="contained" disabled={!adjust?.employee || !adjust?.name?.trim() || !(Number(adjust?.amount) > 0)} onClick={async () => {
            try {
              await api.post('/api/payroll/adjustments/', { employee_id: adjust.employee._id, period, kind: adjust.kind, name: adjust.name, amount: Number(adjust.amount) });
              setAdjust(null); setMessage({ severity: 'success', text: 'Adjustment added and the payslip recalculated.' }); load();
            } catch (e) { setMessage({ severity: 'error', text: e.response?.data?.message || 'Could not add the adjustment.' }); }
          }}>Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!confirmRelease} onClose={() => setConfirmRelease(null)}>
        <DialogTitle>Some employees have no bank details</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>Their payslips can be released, but their salary cannot be transferred until the account number and IFSC code are added:</Typography>
          <Typography variant="body2">{(confirmRelease || []).join(', ')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRelease(null)}>Go back</Button>
          <Button variant="contained" onClick={() => act('/api/payroll/release/', { force: true }, (d) => `${d.released} payslip(s) released. Employees were notified.`)}>Release anyway</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ---------------------------------------------------------------------------------------------- HR: salary structure
const SalaryStructure = ({ people, reloadPeople }) => {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [revise, setRevise] = useState(null);
  const [message, setMessage] = useState(null);

  const open = async (p) => {
    setSelected(p);
    try { setDetail((await api.get(`/api/payroll/salary/${p._id}/`)).data); } catch (e) { setDetail(null); }
  };
  const shown = people.filter((p) => !q.trim() || `${p.first_name} ${p.last_name} ${p.employee_id} ${p.department}`.toLowerCase().includes(q.trim().toLowerCase()));
  const m = detail?.monthly;

  const save = async () => {
    try {
      const res = await api.post(`/api/payroll/salary/${selected._id}/`, { annual_ctc: Number(revise.ctc), effective_from: revise.date, reason: revise.reason });
      setDetail(res.data);
      setRevise(null);
      setMessage({ severity: 'success', text: 'CTC revised. It applies to the next payslips you generate.' });
      reloadPeople();
    } catch (e) { setMessage({ severity: 'error', text: e.response?.data?.message || 'Could not revise the CTC.' }); }
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={7}>
        {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
        <Paper sx={{ p: 2, mb: 2 }}>
          <TextField size="small" fullWidth placeholder="Search name, ID or department" value={q} onChange={(e) => setQ(e.target.value)} inputProps={{ 'aria-label': 'Search employees' }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
        </Paper>
        <TableContainer component={Paper} sx={{ maxHeight: '65vh' }}>
          <Table size="small" stickyHeader>
            <TableHead><TableRow><TableCell>Employee</TableCell><TableCell>Department</TableCell><TableCell align="right">Annual CTC</TableCell><TableCell>Details</TableCell></TableRow></TableHead>
            <TableBody>
              {shown.map((p) => (
                <TableRow key={p._id} hover selected={selected?._id === p._id} sx={{ cursor: 'pointer' }} onClick={() => open(p)}>
                  <TableCell><b>{p.first_name} {p.last_name}</b><Typography variant="caption" display="block" color="text.secondary">{p.employee_id} · {p.position}</Typography></TableCell>
                  <TableCell>{p.department || '-'}</TableCell>
                  <TableCell align="right">{p.salary ? formatMoney(p.salary) : <Chip size="small" color="error" label="Not set" />}</TableCell>
                  <TableCell>
                    {!(p.bank_details?.account_number) && <Chip size="small" color="warning" label="No bank" sx={{ mr: 0.5 }} />}
                    {!p.tax_id && <Chip size="small" variant="outlined" label="No PAN" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
      <Grid item xs={12} md={5}>
        {!selected && <Alert severity="info">Select an employee to see how their CTC breaks up each month and to revise it.</Alert>}
        {selected && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6">{selected.first_name} {selected.last_name}</Typography>
            <Typography color="text.secondary" gutterBottom>{selected.position}{selected.department ? ` · ${selected.department}` : ''}</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>{detail?.annual_ctc ? `${formatMoney(detail.annual_ctc)} a year` : 'No CTC set'}</Typography>
              <Button variant="contained" size="small" onClick={() => setRevise({ ctc: detail?.annual_ctc || '', date: new Date().toISOString().slice(0, 10), reason: '' })}>{detail?.annual_ctc ? 'Revise CTC' : 'Set CTC'}</Button>
            </Box>
            {m && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 2 }}>EVERY MONTH (FULL MONTH, NO LEAVE)</Typography>
                <Line label="Basic" value={formatMoney(m.basic)} />
                <Line label="House rent allowance" value={formatMoney(m.hra)} />
                <Line label="Special allowance" value={formatMoney(m.special_allowance)} />
                <Line label="Gross earnings" value={formatMoney(m.gross)} bold />
                <Line label="Provident fund" value={`- ${formatMoney(m.provident_fund)}`} />
                {m.esi > 0 && <Line label="ESI" value={`- ${formatMoney(m.esi)}`} />}
                {m.professional_tax > 0 && <Line label="Professional tax" value={`- ${formatMoney(m.professional_tax)}`} />}
                <Line label="Income tax (TDS)" value={`- ${formatMoney(m.tax)}`} />
                <Line label="Take-home" value={formatMoney(m.net_salary)} bold />
                <Typography variant="caption" color="text.secondary">Employer also pays {formatMoney(m.employer_pf)} provident fund{m.employer_esi ? ` and ${formatMoney(m.employer_esi)} ESI` : ''} (included in the CTC).</Typography>
              </>
            )}
            {detail?.history?.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 2 }}>REVISION HISTORY</Typography>
                <List dense disablePadding>
                  {detail.history.map((h, i) => (
                    <ListItem key={i} disableGutters>
                      <ListItemText primary={`${formatMoney(h.previous_ctc)} → ${formatMoney(h.annual_ctc)}`} secondary={`${formatDate(h.effective_from)}${h.reason ? ` · ${h.reason}` : ''}`} />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Paper>
        )}
      </Grid>
      <Dialog open={!!revise} onClose={() => setRevise(null)} fullWidth maxWidth="xs">
        <DialogTitle>{detail?.annual_ctc ? 'Revise annual CTC' : 'Set annual CTC'}</DialogTitle>
        {revise && (
          <DialogContent sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
            <TextField label="New annual CTC (₹)" type="number" inputProps={{ min: 0 }} value={revise.ctc} onChange={(e) => setRevise({ ...revise, ctc: e.target.value })}
              helperText={Number(revise.ctc) > 0 ? formatMoney(Number(revise.ctc)) : ''} />
            <TextField label="Effective from" type="date" InputLabelProps={{ shrink: true }} value={revise.date} onChange={(e) => setRevise({ ...revise, date: e.target.value })} />
            <TextField label="Reason" placeholder="Annual appraisal, promotion..." value={revise.reason} onChange={(e) => setRevise({ ...revise, reason: e.target.value })} />
          </DialogContent>
        )}
        <DialogActions><Button onClick={() => setRevise(null)}>Cancel</Button><Button variant="contained" disabled={!(Number(revise?.ctc) > 0)} onClick={save}>Save</Button></DialogActions>
      </Dialog>
    </Grid>
  );
};

// ---------------------------------------------------------------------------------------------- page
const Payroll = () => {
  const isAdmin = authService.isAdmin();
  const [tab, setTab] = useState(0);
  const [people, setPeople] = useState([]);

  const loadPeople = useCallback(() => {
    if (!isAdmin) return;
    api.get('/api/employees/', { params: { limit: 500, status: 'Active' } }).then((r) => setPeople(r.data.results || [])).catch(() => {});
  }, [isAdmin]);
  useEffect(() => { loadPeople(); }, [loadPeople]);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>Payroll</Typography>
      {isAdmin ? (
        <>
          <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Pay run" />
            <Tab label="Salary structure" />
            <Tab label="My payslips" />
          </Tabs>
          {tab === 0 && <PayRun people={people} />}
          {tab === 1 && <SalaryStructure people={people} reloadPeople={loadPeople} />}
          {tab === 2 && <MyPay />}
        </>
      ) : <MyPay />}
    </Box>
  );
};

export default Payroll;
