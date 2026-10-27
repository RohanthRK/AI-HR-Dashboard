import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Autocomplete,
  TextField,
  LinearProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import api from '../../services/api';

const chipSx = { fontWeight: 800, border: '2px solid #000', borderRadius: 0, color: '#000' };
const LEVEL_COLOR = { High: '#e03131', Medium: '#fcc419', Low: '#51cf66' };

const Section = ({ title, children, hint }) => (
  <Paper sx={{ p: 2.5, height: '100%' }}>
    <Typography variant="h6" sx={{ fontWeight: 800 }}>{title}</Typography>
    {hint && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{hint}</Typography>}
    {children}
  </Paper>
);

const Recommendations = ({ items }) => (
  <List dense>
    {(items || []).map((r) => (
      <ListItem key={r.title} disableGutters alignItems="flex-start">
        <ListItemText primary={r.title} secondary={r.description} primaryTypographyProps={{ fontWeight: 700 }} />
      </ListItem>
    ))}
  </List>
);

const TalentInsights = () => {
  const [tab, setTab] = useState(0);
  const [team, setTeam] = useState(null);
  const [skills, setSkills] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [people, setPeople] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, s, g, p] = await Promise.all([
        api.get('/api/ai/talent-insights/team/'),
        api.get('/api/ai/talent-insights/skills/'),
        api.get('/api/ai/talent-insights/growth/'),
        api.get('/api/ai/talent-insights/employees/'),
      ]);
      setTeam(t.data);
      setSkills(s.data);
      setGrowth(g.data);
      setPeople(Array.isArray(p.data) ? p.data : []);
    } catch (e) {
      setError(e.response?.data?.error || 'Could not load talent insights.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    api.get(`/api/ai/talent-insights/employee/${selected.id}/`).then((r) => setDetail(r.data)).catch(() => setDetail(null));
  }, [selected]);

  const nameOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h4" component="h1">Talent Insights</Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Skills, potential and growth opportunities, computed from reviews, skills, attendance and tenure.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Team analysis" />
          <Tab label="Skills trends" />
          <Tab label="Growth opportunities" />
          <Tab label="Individual" />
        </Tabs>
      </Box>

      {tab === 0 && team && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Section title="Collaboration score" hint="Department balance and breadth of skills across the company">
              <Typography variant="h2" sx={{ fontWeight: 900 }}>{team.collaborationScore}<Typography component="span" variant="h5">/100</Typography></Typography>
              <LinearProgress aria-label="Collaboration score" variant="determinate" value={team.collaborationScore} sx={{ height: 14, border: '2px solid #000', mt: 1 }} />
            </Section>
          </Grid>
          <Grid item xs={12} md={4}>
            <Section title="Strengths" hint="Most common skills">
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {team.strengths.map((s) => <Chip key={s} label={s} sx={{ ...chipSx, backgroundColor: '#51cf66' }} />)}
              </Box>
            </Section>
          </Grid>
          <Grid item xs={12} md={4}>
            <Section title="Development areas" hint="Emerging skills fewer than 20% of people have">
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {team.developmentAreas.map((s) => <Chip key={s} label={s} sx={{ ...chipSx, backgroundColor: '#fcc419' }} />)}
              </Box>
            </Section>
          </Grid>
          <Grid item xs={12}>
            <Section title="Recommendations"><Recommendations items={team.recommendations} /></Section>
          </Grid>
        </Grid>
      )}

      {tab === 1 && skills && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Section title="Skills in demand" hint="Industry demand growth (reference data) against how many of your people have the skill">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Skill</TableCell><TableCell>Trend</TableCell><TableCell align="right">Demand growth</TableCell><TableCell align="right">People with it</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {skills.trends.map((t) => (
                    <TableRow key={t.skill}>
                      <TableCell sx={{ fontWeight: 700 }}>{t.skill}</TableCell>
                      <TableCell>{t.trend}</TableCell>
                      <TableCell align="right">+{t.growth}%</TableCell>
                      <TableCell align="right" sx={{ color: t.teamCount === 0 ? 'error.main' : 'inherit', fontWeight: 700 }}>{t.teamCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Section>
          </Grid>
          <Grid item xs={12} md={5}>
            <Section title="Coverage">
              <Typography variant="caption" sx={{ fontWeight: 800 }}>STRONG AREAS</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2, mt: 0.5 }}>
                {skills.teamCoverage.strongAreas.map((s) => <Chip key={s} label={s} sx={{ ...chipSx, backgroundColor: '#51cf66' }} />)}
              </Box>
              <Typography variant="caption" sx={{ fontWeight: 800 }}>GAPS</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                {skills.teamCoverage.gapAreas.map((s) => <Chip key={s} label={s} sx={{ ...chipSx, backgroundColor: '#ff8787' }} />)}
              </Box>
            </Section>
          </Grid>
          <Grid item xs={12}><Section title="Recommendations"><Recommendations items={skills.recommendations} /></Section></Grid>
        </Grid>
      )}

      {tab === 2 && growth && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Section title="Leadership pipeline" hint="Strong performers with a broad skill set">
              <List dense>
                {growth.leadershipPipeline.map((p) => (
                  <ListItem key={p.employeeId} disableGutters>
                    <ListItemText primary={p.name} secondary={p.recommendation} primaryTypographyProps={{ fontWeight: 700 }} />
                  </ListItem>
                ))}
              </List>
            </Section>
          </Grid>
          <Grid item xs={12} md={6}>
            <Section title="Rising stars" hint="Recent joiners already performing at 4 or above">
              {growth.risingStars.length === 0 ? <Typography color="text.secondary">No one yet.</Typography> : (
                <List dense>
                  {growth.risingStars.map((p) => (
                    <ListItem key={p.id} disableGutters>
                      <ListItemText primary={p.name} secondary={`Performance ${p.performance}/5 after ${p.tenureYears} years`} primaryTypographyProps={{ fontWeight: 700 }} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Section>
          </Grid>
          <Grid item xs={12} md={6}>
            <Section title="Needs support" hint="Signals that someone may be struggling">
              {growth.needsSupport.length === 0 ? <Typography color="text.secondary">No one is flagged.</Typography> : (
                <List dense>
                  {growth.needsSupport.map((p) => (
                    <ListItem key={p.id} disableGutters>
                      <ListItemText primary={`${p.name} · ${p.level}`} secondary={(p.reasons || []).join('; ')} primaryTypographyProps={{ fontWeight: 700 }} />
                    </ListItem>
                  ))}
                </List>
              )}
            </Section>
          </Grid>
          <Grid item xs={12} md={6}>
            <Section title="Suggested development plans">
              <List dense>
                {growth.developmentPlans.map((p) => (
                  <ListItem key={p.employeeId} disableGutters>
                    <ListItemText
                      primary={`${p.name} · ${p.planType}`}
                      secondary={`Focus: ${p.focusAreas.join(', ')} · ${p.timeline}${p.mentor && p.mentor !== 'To be assigned' ? ` · mentor ${p.mentor}` : ''}`}
                      primaryTypographyProps={{ fontWeight: 700 }}
                    />
                  </ListItem>
                ))}
              </List>
            </Section>
          </Grid>
          <Grid item xs={12}>
            <Section title={`High potential (${growth.highPotentialEmployees.length})`}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {growth.highPotentialEmployees.map((p) => (
                  <Chip key={p.id} label={`${p.name} · ${p.performance}`} sx={{ ...chipSx, backgroundColor: '#fff3bf' }} />
                ))}
              </Box>
            </Section>
          </Grid>
        </Grid>
      )}

      {tab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Section title="Pick someone">
              <Autocomplete
                options={people}
                value={selected}
                onChange={(e, v) => setSelected(v)}
                getOptionLabel={(p) => `${p.name} - ${p.position}`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => <TextField {...params} label="Employee" margin="normal" />}
              />
            </Section>
          </Grid>
          <Grid item xs={12} md={7}>
            {!selected && <Alert severity="info">Choose an employee to see their performance, growth potential and suggested next steps.</Alert>}
            {selected && detail && (
              <Section title={selected.name}>
                <Typography color="text.secondary">{selected.position} · {selected.department}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', my: 1.5 }}>
                  <Chip label={`Performance ${detail.performance ?? 'n/a'}/5`} sx={{ ...chipSx, backgroundColor: '#fff3bf' }} />
                  <Chip label={`Growth potential: ${detail.growthPotential}`} sx={{ ...chipSx, backgroundColor: '#d3f9d8' }} />
                  {detail.attritionRisk && (
                    <Chip label={`Flight risk: ${detail.attritionRisk.level}`} sx={{ ...chipSx, backgroundColor: LEVEL_COLOR[detail.attritionRisk.level] }} />
                  )}
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 800 }}>SKILLS</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', my: 0.5 }}>
                  {(detail.skills || []).map((s) => <Chip key={s} size="small" label={s} sx={{ ...chipSx, backgroundColor: '#e7f5ff' }} />)}
                </Box>
                <Recommendations items={detail.recommendations} />
                {detail.attritionRisk && nameOf[selected.id] && (
                  <Typography variant="caption" color="text.secondary">{detail.attritionRisk.reasons.join(' · ')}</Typography>
                )}
              </Section>
            )}
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default TalentInsights;
