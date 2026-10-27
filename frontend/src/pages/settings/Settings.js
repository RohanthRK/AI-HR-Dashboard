import React, { useState, useEffect } from 'react';

import api from '../../services/api';

import authService from '../../services/authService';
import { setCompanyGeneral } from '../../utils/company';
import { formatDate } from '../../utils/format';

import IntegrationsPanel from '../../components/settings/IntegrationsPanel';

import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
  Autocomplete,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';

const TIME_ZONES = (typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['UTC', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'Asia/Kolkata']).concat('UTC').filter((z, i, all) => all.indexOf(z) === i);

const Settings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [saved, setSaved] = useState(false);
  
  const [error, setError] = useState(null);
  const isAdmin = authService.isAdmin();

  const [generalSettings, setGeneralSettings] = useState({
    companyName: '', timezone: 'Asia/Kolkata', workHoursPerDay: 8, lateAfter: '09:30', holidays: []
  });
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const todayIso = () => new Date().toISOString().slice(0, 10);
  const addHoliday = () => {
    const holidays = [...(generalSettings.holidays || []).filter((h) => h.date !== newHoliday.date), { date: newHoliday.date, name: newHoliday.name.trim() }]
      .sort((a, b) => a.date.localeCompare(b.date));
    setGeneralSettings({ ...generalSettings, holidays });
    setNewHoliday({ date: '', name: '' });
    setSaved(false);
  };
  const removeHoliday = (date) => {
    setGeneralSettings({ ...generalSettings, holidays: (generalSettings.holidays || []).filter((h) => h.date !== date) });
    setSaved(false);
  };
  const [payrollSettings, setPayrollSettings] = useState({ basicPct: 40, hraPct: 50, pfPct: 12, pfWageCeiling: 15000, esiThreshold: 21000, ptAmount: 200, ptThreshold: 25000, tdsEnabled: true, payOvertime: false, overtimeMultiplier: 1.5 });
  const [integrations, setIntegrations] = useState({ emailConfigured: false, webhookConfigured: false });
  const [knowledge, setKnowledge] = useState({ faq: [], requiredDocuments: [], employeeTasks: [], hrTasks: [] });
  const [notificationSettings, setNotificationSettings] = useState({
    leaveApprovals: true, expenseUpdates: true, ticketUpdates: true, emailDelivery: false, webhookDelivery: false
  });

  useEffect(() => {
    api.get('/api/settings/')
      .then((res) => {
        setGeneralSettings(res.data.general);
        setNotificationSettings(res.data.notifications);
        setPayrollSettings(res.data.payroll);
        setKnowledge(res.data.knowledge);
        setIntegrations(res.data.integrations || {});
      })
      .catch(() => setError('Could not load settings.'));
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleGeneralSettingChange = (e) => {
    const { name, value } = e.target;
    setGeneralSettings({
      ...generalSettings,
      [name]: value
    });
    setSaved(false);
  };

  const handleNotificationToggle = (setting) => {
    setNotificationSettings({
      ...notificationSettings,
      [setting]: !notificationSettings[setting]
    });
    setSaved(false);
  };

  const handleSaveSettings = async () => {
    try {
      await api.put('/api/settings/', { general: generalSettings, notifications: notificationSettings, payroll: payrollSettings, knowledge });
      setCompanyGeneral(generalSettings);       // the header, clock times and holiday views pick the change up immediately
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save settings.');
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        System Settings
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {!isAdmin && <Alert severity="info" sx={{ mb: 3 }}>Only administrators can change settings.</Alert>}
      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="General" />
          <Tab label="Notifications" />
          <Tab label="Payroll" />
          <Tab label="Knowledge base" />
          {isAdmin && <Tab label="Integrations" />}
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {/* General Settings */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  name="companyName"
                  value={generalSettings.companyName}
                  onChange={handleGeneralSettingChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  disableClearable
                  disabled={!isAdmin}
                  options={TIME_ZONES}
                  value={TIME_ZONES.includes(generalSettings.timezone) ? generalSettings.timezone : 'Asia/Kolkata'}
                  onChange={(e, value) => { setGeneralSettings({ ...generalSettings, timezone: value }); setSaved(false); }}
                  renderInput={(params) => <TextField {...params} label="Timezone" margin="normal" helperText="Clock times are shown in this timezone to everyone" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth type="number" label="Working hours per day" disabled={!isAdmin} margin="normal"
                  value={generalSettings.workHoursPerDay ?? 8}
                  onChange={(e) => { setGeneralSettings({ ...generalSettings, workHoursPerDay: e.target.value === '' ? '' : Number(e.target.value) }); setSaved(false); }}
                  inputProps={{ min: 1, max: 16, step: 0.5 }}
                  helperText="Attendance marks a day short when someone works more than 15 minutes under this. You can set different hours for a person in Attendance."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth type="time" label="Late after" disabled={!isAdmin} margin="normal" InputLabelProps={{ shrink: true }}
                  value={generalSettings.lateAfter || '09:30'}
                  onChange={(e) => { if (e.target.value) { setGeneralSettings({ ...generalSettings, lateAfter: e.target.value }); setSaved(false); } }}
                  helperText="A first clock-in after this time counts as late"
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 2 }}>Company holidays</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Holidays are not counted as leave days and appear on the attendance calendar and the dashboard.
                </Typography>
                {isAdmin && (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    <TextField type="date" size="small" label="Date" value={newHoliday.date} InputLabelProps={{ shrink: true }}
                      onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })} />
                    <TextField size="small" label="Name" value={newHoliday.name} sx={{ minWidth: 240 }}
                      onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })} />
                    <Button variant="outlined" disabled={!newHoliday.date || !newHoliday.name.trim()} onClick={addHoliday}>Add holiday</Button>
                  </Box>
                )}
                <Box sx={{ maxHeight: 320, overflow: 'auto', border: '2px solid', borderColor: 'divider' }}>
                  <Table size="small" stickyHeader>
                    <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Holiday</TableCell>{isAdmin && <TableCell align="right" />}</TableRow></TableHead>
                    <TableBody>
                      {(generalSettings.holidays || []).filter((h) => h.date >= todayIso()).map((h) => (
                        <TableRow key={h.date}>
                          <TableCell>{formatDate(h.date)}</TableCell>
                          <TableCell>{h.name}</TableCell>
                          {isAdmin && <TableCell align="right"><Button size="small" color="error" onClick={() => removeHoliday(h.date)}>Remove</Button></TableCell>}
                        </TableRow>
                      ))}
                      {!(generalSettings.holidays || []).some((h) => h.date >= todayIso()) && (
                        <TableRow><TableCell colSpan={3} align="center">No upcoming holidays.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Grid>
            </Grid>
          )}
          
          {/* Notification Settings */}
          {tabValue === 1 && (
            <List>
              {[
                ['leaveApprovals', 'Leave notifications', 'Notify managers of new requests and employees of decisions'],
                ['expenseUpdates', 'Expense notifications', 'Notify employees when a claim is approved or rejected'],
                ['ticketUpdates', 'Helpdesk notifications', 'Notify employees when their ticket status changes'],
              ].map(([key, title, description], index) => (
                <React.Fragment key={key}>
                  {index > 0 && <Divider />}
                  <ListItem>
                    <ListItemText primary={title} secondary={description} />
                    <Switch
                      edge="end"
                      checked={!!notificationSettings[key]}
                      onChange={() => handleNotificationToggle(key)}
                    />
                  </ListItem>
                </React.Fragment>
              ))}
              {[
                ['emailDelivery', 'Also send by e-mail', integrations.emailConfigured, 'Set EMAIL_HOST and EMAIL_FROM on the server to enable'],
                ['webhookDelivery', 'Also post to Slack / Teams', integrations.webhookConfigured, 'Set NOTIFY_WEBHOOK_URL on the server to enable'],
              ].map(([key, title, available, hint]) => (
                <React.Fragment key={key}>
                  <Divider />
                  <ListItem>
                    <ListItemText primary={title} secondary={available ? 'Sends each notification to the recipient\'s channel' : hint} />
                    <Switch edge="end" disabled={!available} checked={!!notificationSettings[key]} onChange={() => handleNotificationToggle(key)} />
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          )}

          {tabValue === 2 && (
            <Grid container spacing={3}>
              {[
                ['basicPct', 'Basic salary (% of monthly CTC)', 0, 100, 0.5], ['hraPct', 'House rent allowance (% of basic)', 0, 100, 0.5],
                ['pfPct', 'Provident fund (% of PF wage, employee and employer each)', 0, 100, 0.5], ['pfWageCeiling', 'PF wage ceiling (₹ per month)', 0, 1000000, 500],
                ['esiThreshold', 'ESI applies up to a monthly gross of (₹)', 0, 1000000, 500], ['ptAmount', 'Professional tax (₹ per month)', 0, 10000, 50],
                ['ptThreshold', 'Professional tax applies from a monthly gross of (₹)', 0, 1000000, 500],
              ].map(([key, label, min, max, step]) => (
                <Grid item xs={12} md={6} key={key}>
                  <TextField
                    fullWidth type="number" label={label} value={payrollSettings[key]}
                    inputProps={{ min, max, step }}
                    onChange={(e) => { setPayrollSettings({ ...payrollSettings, [key]: Number(e.target.value) }); setSaved(false); }}
                  />
                </Grid>
              ))}
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={<Switch checked={!!payrollSettings.tdsEnabled}
                    onChange={() => { setPayrollSettings({ ...payrollSettings, tdsEnabled: !payrollSettings.tdsEnabled }); setSaved(false); }} />}
                  label="Deduct income tax (TDS, new tax regime) every month" />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={<Switch checked={!!payrollSettings.payOvertime}
                    onChange={() => { setPayrollSettings({ ...payrollSettings, payOvertime: !payrollSettings.payOvertime }); setSaved(false); }} />}
                  label="Pay overtime (hours beyond 8 per attendance day)" />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField fullWidth type="number" label="Overtime multiplier" value={payrollSettings.overtimeMultiplier}
                  inputProps={{ min: 1, max: 5, step: 0.25 }}
                  onChange={(e) => { setPayrollSettings({ ...payrollSettings, overtimeMultiplier: Number(e.target.value) }); setSaved(false); }} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">
                  The rest of the monthly CTC is paid as special allowance. Employer PF and ESI are part of the CTC. These rates apply to payslips generated or recalculated from now on.
                </Typography>
              </Grid>
            </Grid>
          )}

          {tabValue === 3 && (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Company FAQ (used by the HR assistant)</Typography>
              {knowledge.faq.map((item, i) => (
                <Box key={i} sx={{ display: 'flex', gap: 1 }}>
                  <TextField size="small" fullWidth label="Question" value={item.q}
                    onChange={(e) => { setKnowledge({ ...knowledge, faq: knowledge.faq.map((f, j) => (j === i ? { ...f, q: e.target.value } : f)) }); setSaved(false); }} />
                  <TextField size="small" fullWidth label="Answer" value={item.a}
                    onChange={(e) => { setKnowledge({ ...knowledge, faq: knowledge.faq.map((f, j) => (j === i ? { ...f, a: e.target.value } : f)) }); setSaved(false); }} />
                  <Button color="error" onClick={() => { setKnowledge({ ...knowledge, faq: knowledge.faq.filter((_, j) => j !== i) }); setSaved(false); }}>Remove</Button>
                </Box>
              ))}
              <Box><Button onClick={() => setKnowledge({ ...knowledge, faq: [...knowledge.faq, { q: '', a: '' }] })}>Add FAQ entry</Button></Box>
              <Divider />
              <Typography variant="subtitle1" fontWeight={600}>Required employee documents</Typography>
              <TextField size="small" fullWidth label="Comma separated, e.g. ID proof, Employment contract"
                value={knowledge.requiredDocuments.join(', ')}
                onChange={(e) => { setKnowledge({ ...knowledge, requiredDocuments: e.target.value.split(',').map((d) => d.trimStart()) }); setSaved(false); }} />
              <Typography variant="body2" color="text.secondary">
                Employees missing a document whose name or category contains one of these appear in Compliance and in their onboarding checklist.
              </Typography>
              <Divider />
              <Typography variant="subtitle1" fontWeight={600}>Onboarding checklist template</Typography>
              {[['employeeTasks', 'Employee tasks (comma separated)'], ['hrTasks', 'HR tasks (comma separated)']].map(([key, label]) => (
                <TextField key={key} size="small" fullWidth label={label} value={(knowledge[key] || []).join(', ')}
                  onChange={(e) => { setKnowledge({ ...knowledge, [key]: e.target.value.split(',').map((d) => d.trimStart()) }); setSaved(false); }} />
              ))}
            </Box>
          )}

          {tabValue === 4 && isAdmin && <IntegrationsPanel />}

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" color="primary" onClick={handleSaveSettings} disabled={!isAdmin}>
              Save Settings
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings; 