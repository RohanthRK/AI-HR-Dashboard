import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, List, ListItem, ListItemText, Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import api from '../../services/api';
import AiBriefing from '../../components/ai/AiBriefing';
import { formatDateTime, formatMoney, formatMoneyShort } from '../../utils/format';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
const RISK_COLOR = { High: 'error', Medium: 'warning', Low: 'success' };
const TABS = ['Overview', 'Workforce', 'Hiring', 'Attendance & leave', 'Performance & learning', 'Pay & cost', 'Engagement & risk'];

const Empty = () => <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>No data yet</Box>;

const Card = ({ title, subtitle, children, height = 280 }) => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{title}</Typography>
    {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    <Box sx={{ height, mt: 1 }}>{children}</Box>
  </Paper>
);

const Kpi = ({ label, value, hint, tone }) => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.4 }}>{label}</Typography>
    <Typography variant="h4" sx={{ fontWeight: 900, color: tone ? `${tone}.main` : undefined, wordBreak: 'break-word' }}>{value ?? '-'}</Typography>
    {hint && <Typography variant="body2" color="text.secondary">{hint}</Typography>}
  </Paper>
);

const Insights = ({ items }) => (items?.length ? (
  <Paper sx={{ p: 2, mb: 3 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>What the numbers say</Typography>
    <List dense disablePadding>
      {items.map((t, i) => <ListItem key={i} disableGutters sx={{ py: 0.25 }}><ListItemText primary={`• ${t}`} /></ListItem>)}
    </List>
  </Paper>
) : null);

const HBar = ({ data, color = COLORS[0], format = (v) => v, unit }) => (data?.length ? (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
      <XAxis type="number" tickFormatter={format} allowDecimals={false} />
      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
      <Tooltip formatter={(v) => [`${format(v)}${unit || ''}`, '']} />
      <Bar dataKey="value" fill={color} radius={[0, 3, 3, 0]} />
    </BarChart>
  </ResponsiveContainer>
) : <Empty />);

const VBar = ({ data, color = COLORS[0], format = (v) => v }) => (data?.length ? (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ left: 0, right: 8 }}>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
      <YAxis tickFormatter={format} allowDecimals={false} />
      <Tooltip formatter={(v) => [format(v), '']} />
      <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
) : <Empty />);

const Donut = ({ data }) => (data?.some((d) => d.value > 0) ? (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie data={data} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="80%" paddingAngle={2}>
        {data.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)}
      </Pie>
      <Tooltip />
      <Legend verticalAlign="bottom" height={36} />
    </PieChart>
  </ResponsiveContainer>
) : <Empty />);

const Trend = ({ data, x, lines, format = (v) => v, refY }) => (data?.length ? (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ left: 0, right: 16 }}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey={x} tick={{ fontSize: 11 }} />
      <YAxis tickFormatter={format} domain={['auto', 'auto']} />
      <Tooltip formatter={(v) => format(v)} />
      {lines.length > 1 && <Legend />}
      {refY && <ReferenceLine y={refY} stroke="#9ca3af" strokeDasharray="4 4" />}
      {lines.map(([key, name], i) => <Line key={key} type="monotone" dataKey={key} name={name} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} connectNulls />)}
    </LineChart>
  </ResponsiveContainer>
) : <Empty />);

const pct = (v) => (v === null || v === undefined ? '-' : `${v}%`);

const Overview = ({ d }) => {
  const w = d.workforce, h = d.hiring, a = d.attendance, p = d.performance, pay = d.pay, e = d.engagement;
  const lead = [w.insights[0], w.insights[1], ...(a.insights.slice(0, 1)), ...(p.insights.slice(0, 1)), ...(pay.insights.slice(0, 1)), ...(e.insights.slice(0, 1)), ...(h.insights.slice(0, 1))].filter(Boolean);
  return (
    <>
      <Insights items={lead} />
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}><Kpi label="Active employees" value={w.active} hint={`${w.joined_this_month} joined this month`} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Attrition (12 months)" value={pct(w.attrition_pct)} hint={`${w.left_12m} left, ${w.joined_12m} joined`} tone={w.attrition_pct > 15 ? 'error' : undefined} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Attendance (4 weeks)" value={pct(a.rate_4w)} hint={a.avg_hours ? `${a.avg_hours} h average day` : ''} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Average rating" value={p.avg_rating ? `${p.avg_rating} / 5` : '-'} hint={`${p.rated_people} people rated`} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Open positions" value={h.open_jobs} hint={`${h.in_process} candidates in process`} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Monthly cost to company" value={pay.latest_month ? formatMoneyShort(pay.latest_month.employer) : '-'} hint={pay.latest_month?.month} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="High attrition risk" value={e.risk_counts.High} hint={`${e.risk_counts.Medium} at medium risk`} tone={e.risk_counts.High ? 'error' : undefined} /></Grid>
        <Grid item xs={6} md={3}><Kpi label="Training completion" value={pct(p.training_completion_pct)} hint={p.training_overdue ? `${p.training_overdue} overdue` : 'nothing overdue'} /></Grid>
      </Grid>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <Card title="Headcount, last 12 months" subtitle="Bars show people who joined and left each month">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={w.trend} margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="l" allowDecimals={false} domain={['auto', 'auto']} />
                <YAxis yAxisId="r" orientation="right" allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="r" dataKey="joined" name="Joined" fill={COLORS[1]} />
                <Bar yAxisId="r" dataKey="left" name="Left" fill={COLORS[3]} />
                <Line yAxisId="l" type="stepAfter" dataKey="headcount" name="Headcount" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}><Card title="People by department"><HBar data={w.by_department} /></Card></Grid>
      </Grid>
      <AiBriefing />
    </>
  );
};

const Workforce = ({ w }) => (
  <>
    <Insights items={w.insights} />
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} md={3}><Kpi label="Active employees" value={w.active} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Average tenure" value={w.avg_tenure_years != null ? `${w.avg_tenure_years} yrs` : '-'} hint={w.avg_tenure_at_exit != null ? `${w.avg_tenure_at_exit} yrs at exit` : ''} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Average age" value={w.avg_age != null ? `${w.avg_age} yrs` : '-'} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Average team size" value={w.avg_span ?? '-'} hint="people per manager" /></Grid>
    </Grid>
    <Grid container spacing={2}>
      <Grid item xs={12} md={8}>
        <Card title="Joiners and leavers by month" subtitle="Headcount follows the line">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={w.trend} margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="l" allowDecimals={false} domain={['auto', 'auto']} />
              <YAxis yAxisId="r" orientation="right" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="r" dataKey="joined" name="Joined" fill={COLORS[1]} />
              <Bar yAxisId="r" dataKey="left" name="Left" fill={COLORS[3]} />
              <Line yAxisId="l" type="stepAfter" dataKey="headcount" name="Headcount" stroke={COLORS[0]} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}><Card title="Gender"><Donut data={w.by_gender} /></Card></Grid>
      <Grid item xs={12} md={6}><Card title="People by department"><HBar data={w.by_department} /></Card></Grid>
      <Grid item xs={12} md={6}><Card title="Attrition by department (12 months)" subtitle="Leavers as a share of people in the department"><HBar data={w.attrition_by_department} color={COLORS[3]} format={(v) => `${v}%`} /></Card></Grid>
      <Grid item xs={12} md={4}><Card title="Time with the company"><VBar data={w.tenure_bands} color={COLORS[4]} /></Card></Grid>
      <Grid item xs={12} md={4}><Card title="Age"><VBar data={w.age_bands} color={COLORS[5]} /></Card></Grid>
      <Grid item xs={12} md={4}><Card title="Employment type"><Donut data={w.by_type} /></Card></Grid>
      <Grid item xs={12} md={6}><Card title="Locations"><HBar data={w.by_location} color={COLORS[6]} /></Card></Grid>
    </Grid>
  </>
);

const Hiring = ({ h }) => (
  <>
    <Insights items={h.insights} />
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} md={3}><Kpi label="Open positions" value={h.open_jobs} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Candidates in process" value={h.in_process} hint={`${h.candidates} in total`} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Offers out" value={h.offers} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Hired" value={h.hired} hint={h.avg_days_to_hire != null ? `${h.avg_days_to_hire} days on average` : ''} /></Grid>
    </Grid>
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} md={7}><Card title="Hiring funnel" subtitle="Candidates now in each stage"><HBar data={h.funnel} color={COLORS[0]} /></Card></Grid>
      <Grid item xs={12} md={5}><Card title="Where candidates come from"><Donut data={h.by_source} /></Card></Grid>
    </Grid>
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead><TableRow><TableCell>Opening</TableCell><TableCell>Department</TableCell><TableCell>Status</TableCell><TableCell align="right">Positions</TableCell><TableCell align="right">Candidates</TableCell><TableCell align="right">In process</TableCell><TableCell align="right">Hired</TableCell></TableRow></TableHead>
        <TableBody>
          {h.jobs.length === 0 && <TableRow><TableCell colSpan={7}>No openings yet.</TableCell></TableRow>}
          {h.jobs.map((j, i) => (
            <TableRow key={i} hover><TableCell><b>{j.title}</b></TableCell><TableCell>{j.department || '-'}</TableCell><TableCell><Chip size="small" label={j.status} color={j.status === 'Open' ? 'success' : 'default'} /></TableCell>
              <TableCell align="right">{j.openings}</TableCell><TableCell align="right">{j.candidates}</TableCell><TableCell align="right">{j.in_process}</TableCell><TableCell align="right">{j.hired}</TableCell></TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </>
);

const Attendance = ({ a }) => (
  <>
    <Insights items={a.insights} />
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} md={3}><Kpi label="Attendance (4 weeks)" value={pct(a.rate_4w)} hint="of people expected at work" /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Average working day" value={a.avg_hours ? `${a.avg_hours} h` : '-'} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Leave taken this year" value={`${a.leave_days_fy} days`} hint={`${a.lop_days_fy} of them unpaid`} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Leave waiting for approval" value={a.pending_leaves} tone={a.pending_leaves > 5 ? 'warning' : undefined} /></Grid>
    </Grid>
    <Grid container spacing={2}>
      <Grid item xs={12} md={8}><Card title="Attendance rate by week" subtitle="People present ÷ people expected (leave and holidays excluded)"><Trend data={a.weekly} x="week" lines={[['rate', 'Attendance %']]} format={(v) => `${v}%`} refY={90} /></Card></Grid>
      <Grid item xs={12} md={4}><Card title="Where people worked (30 days)"><Donut data={a.modes} /></Card></Grid>
      <Grid item xs={12} md={6}><Card title="Leave taken this financial year" subtitle="Approved days by type"><HBar data={a.leave_by_type} color={COLORS[2]} /></Card></Grid>
      <Grid item xs={12} md={6}><Card title="Leave days per person, by department"><HBar data={a.leave_per_head_by_department} color={COLORS[5]} /></Card></Grid>
    </Grid>
  </>
);

const Performance = ({ p }) => (
  <>
    <Insights items={p.insights} />
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} md={3}><Kpi label="Average rating" value={p.avg_rating ? `${p.avg_rating} / 5` : '-'} hint={`${p.rated_people} people rated`} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Improvement plans open" value={p.open_pips} tone={p.open_pips ? 'warning' : undefined} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Training completion" value={pct(p.training_completion_pct)} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Overdue trainings" value={p.training_overdue} tone={p.training_overdue ? 'error' : undefined} /></Grid>
    </Grid>
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}><Card title="Rating spread" subtitle="People by rounded rating (1-5)"><VBar data={p.distribution} color={COLORS[0]} /></Card></Grid>
      <Grid item xs={12} md={4}><Card title="Average rating by department" subtitle="Departments with 3+ rated people"><HBar data={p.by_department} color={COLORS[4]} /></Card></Grid>
      <Grid item xs={12} md={4}><Card title="Goal (OKR) progress by department" subtitle="Average % complete"><HBar data={p.okr_by_department} color={COLORS[1]} format={(v) => `${v}%`} /></Card></Grid>
      <Grid item xs={12} md={6}><Card title="Training completion by course" subtitle="% of assigned people who finished"><HBar data={p.training_by_course} color={COLORS[2]} format={(v) => `${v}%`} /></Card></Grid>
      <Grid item xs={12} md={6}><Card title="Most common skills"><HBar data={p.top_skills} color={COLORS[5]} /></Card></Grid>
    </Grid>
  </>
);

const Pay = ({ pay }) => (
  <>
    <Insights items={pay.insights} />
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} md={3}><Kpi label="Annual CTC bill" value={formatMoneyShort(pay.annual_ctc)} hint={formatMoney(pay.annual_ctc)} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Median CTC" value={pay.median_ctc ? formatMoneyShort(pay.median_ctc) : '-'} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Last payroll" value={pay.latest_month ? formatMoneyShort(pay.latest_month.employer) : '-'} hint={pay.latest_month ? `${pay.latest_month.month} · ${pay.latest_month.people} payslips` : 'no payroll run yet'} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Salary revisions (12 months)" value={pay.revisions_12m} hint={pay.missing_salary ? `${pay.missing_salary} people have no salary set` : ''} tone={pay.missing_salary ? 'warning' : undefined} /></Grid>
    </Grid>
    <Grid container spacing={2}>
      <Grid item xs={12} md={8}>
        <Card title="Payroll cost by month" subtitle="Cost to company, net pay to employees and TDS">
          <Trend data={pay.trend} x="month" lines={[['employer', 'Cost to company'], ['net', 'Net pay'], ['tds', 'TDS']]} format={formatMoneyShort} />
        </Card>
      </Grid>
      <Grid item xs={12} md={4}><Card title="CTC bands" subtitle="People by annual CTC"><VBar data={pay.ctc_bands} color={COLORS[4]} /></Card></Grid>
      <Grid item xs={12} md={6}><Card title="Cost by department (last payroll)"><HBar data={pay.cost_by_department} color={COLORS[0]} format={formatMoneyShort} /></Card></Grid>
      <Grid item xs={12} md={6}><Card title="Average CTC by department" subtitle="Departments with 3+ people"><HBar data={pay.avg_ctc_by_department} color={COLORS[1]} format={formatMoneyShort} /></Card></Grid>
      {pay.gender_pay.length > 0 && <Grid item xs={12} md={6}><Card title="Average CTC by gender" subtitle={pay.gender_pay_ratio ? `Women earn ${pay.gender_pay_ratio}% of men on average` : ''}><HBar data={pay.gender_pay} color={COLORS[6]} format={formatMoneyShort} /></Card></Grid>}
    </Grid>
  </>
);

const Engagement = ({ e }) => (
  <>
    <Insights items={e.insights} />
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={6} md={3}><Kpi label="High attrition risk" value={e.risk_counts.High} tone={e.risk_counts.High ? 'error' : undefined} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Medium risk" value={e.risk_counts.Medium} tone={e.risk_counts.Medium ? 'warning' : undefined} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Latest survey" value={e.survey_history.length ? `${e.survey_history[e.survey_history.length - 1].score10} / 10` : '-'} hint={e.survey_history.length ? `${e.survey_history[e.survey_history.length - 1].responses} responses` : 'no survey with enough answers'} /></Grid>
      <Grid item xs={6} md={3}><Kpi label="Open helpdesk tickets" value={e.open_tickets} /></Grid>
    </Grid>
    <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid item xs={12} md={4}><Card title="Attrition risk" subtitle={e.model?.type === 'trained' ? 'Trained on past exits' : 'Rule-based until enough exits are recorded'}><Donut data={[{ name: 'High', value: e.risk_counts.High }, { name: 'Medium', value: e.risk_counts.Medium }, { name: 'Low', value: e.risk_counts.Low }]} /></Card></Grid>
      <Grid item xs={12} md={8}>
        <Paper sx={{ p: 2, height: '100%' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>People most at risk of leaving</Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>Employee</TableCell><TableCell>Department</TableCell><TableCell>Risk</TableCell><TableCell>Why</TableCell></TableRow></TableHead>
            <TableBody>
              {e.at_risk.length === 0 && <TableRow><TableCell colSpan={4}>Nobody is at elevated risk right now.</TableCell></TableRow>}
              {e.at_risk.map((r) => (
                <TableRow key={r.name} hover><TableCell><b>{r.name}</b></TableCell><TableCell>{r.department}</TableCell><TableCell><Chip size="small" color={RISK_COLOR[r.level]} label={`${r.level} · ${r.score}`} /></TableCell><TableCell>{r.reasons.join('; ')}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Grid>
      <Grid item xs={12} md={6}><Card title="Why people leave"><HBar data={e.exit_reasons} color={COLORS[3]} /></Card></Grid>
      <Grid item xs={12} md={6}><Card title="Engagement survey score" subtitle="Out of 10"><Trend data={e.survey_history} x="title" lines={[['score10', 'Score']]} /></Card></Grid>
      <Grid item xs={12} md={4}><Card title="Helpdesk tickets by category"><Donut data={e.tickets_by_category} /></Card></Grid>
      <Grid item xs={12} md={4}><Card title="Recognition given per month"><Trend data={e.recognition_by_month} x="month" lines={[['value', 'Recognitions']]} /></Card></Grid>
      <Grid item xs={12} md={4}><Card title="Approved expenses by category" subtitle={`${formatMoney(e.expense_total)} in total`}><HBar data={e.expense_by_category} color={COLORS[2]} format={formatMoneyShort} /></Card></Grid>
    </Grid>
  </>
);

const Analytics = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData((await api.get('/api/ai/hr-analytics/')).data);
    } catch (e) {
      setError(e.response?.status === 403 ? 'Analytics are available to HR and administrators.' : 'Could not load the analytics.');
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
        <Box>
          <Typography variant="h4" component="h1">Analytics</Typography>
          {data && <Typography variant="body2" color="text.secondary">Live from your HR data · updated {formatDateTime(data.generated_at)}</Typography>}
        </Box>
        <Button startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />} disabled={loading} onClick={load}>Refresh</Button>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 3 }}>
        {TABS.map((t) => <Tab key={t} label={t} />)}
      </Tabs>
      {loading && !data && <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>}
      {data && (
        <>
          {tab === 0 && <Overview d={data} />}
          {tab === 1 && <Workforce w={data.workforce} />}
          {tab === 2 && <Hiring h={data.hiring} />}
          {tab === 3 && <Attendance a={data.attendance} />}
          {tab === 4 && <Performance p={data.performance} />}
          {tab === 5 && <Pay pay={data.pay} />}
          {tab === 6 && <Engagement e={data.engagement} />}
        </>
      )}
    </Box>
  );
};

export default Analytics;
