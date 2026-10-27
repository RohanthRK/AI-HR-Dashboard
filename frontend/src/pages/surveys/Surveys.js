import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel,
  IconButton, InputLabel, List, ListItem, ListItemText, MenuItem, Paper, Radio, RadioGroup, Rating, Select, Switch,
  TextField, Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../../services/api';
import authService from '../../services/authService';

const blankQuestion = () => ({ type: 'rating', text: '', options: '' });

const Surveys = () => {
  const isStaff = authService.isManager() || authService.isHR();
  const [surveys, setSurveys] = useState([]);
  const [message, setMessage] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ title: '', type: 'engagement', anonymous: true, questions: [blankQuestion()] });
  const [answering, setAnswering] = useState(null);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [templates, setTemplates] = useState([]);

  const fail = (e, fallback) => setMessage({ severity: 'error', text: e.response?.data?.error || fallback });

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/feedback/surveys/');
      setSurveys(res.data.surveys);
    } catch (e) { fail(e, 'Could not load surveys.'); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (isStaff) api.get('/api/feedback/templates/').then((res) => setTemplates(res.data.templates)).catch(() => {});
  }, [isStaff]);

  const applyTemplate = (id) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setDraft({ title: t.title, type: t.type, anonymous: t.anonymous,
      questions: t.questions.map((q) => ({ type: q.type, text: q.text, options: (q.options || []).join(', ') })) });
  };

  const createSurvey = async () => {
    const questions = draft.questions.map((q, i) => ({
      id: `q${i + 1}`, type: q.type, text: q.text,
      ...(q.type === 'choice' ? { options: q.options.split(',').map((o) => o.trim()).filter(Boolean) } : {}),
    }));
    try {
      await api.post('/api/feedback/surveys/', { ...draft, questions });
      setCreateOpen(false);
      setDraft({ title: '', type: 'engagement', anonymous: true, questions: [blankQuestion()] });
      load();
    } catch (e) { fail(e, 'Could not create the survey.'); }
  };

  const submit = async () => {
    try {
      await api.post(`/api/feedback/surveys/${answering._id}/respond/`, { answers });
      setAnswering(null);
      setAnswers({});
      setMessage({ severity: 'success', text: 'Thank you — your response was recorded.' });
      load();
    } catch (e) { fail(e, 'Could not submit your response.'); }
  };

  const toggle = async (survey) => {
    try {
      await api.put(`/api/feedback/surveys/${survey._id}/close/`, { status: survey.status === 'Open' ? 'Closed' : 'Open' });
      load();
    } catch (e) { fail(e, 'Could not update the survey.'); }
  };

  const showResults = async (survey) => {
    try {
      const res = await api.get(`/api/feedback/surveys/${survey._id}/results/`);
      setAiSummary(null);
      setResults(res.data.results);
    } catch (e) { fail(e, 'Could not load results.'); }
  };

  const summarise = async () => {
    setAiLoading(true);
    try {
      const res = await api.post(`/api/feedback/surveys/${results.survey_id}/summary/`);
      setAiSummary(res.data.summary);
    } catch (e) {
      fail(e, 'Could not generate the summary.');
    } finally {
      setAiLoading(false);
    }
  };

  const setQuestion = (i, patch) => setDraft({ ...draft, questions: draft.questions.map((q, j) => (j === i ? { ...q, ...patch } : q)) });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">Surveys</Typography>
        {isStaff && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New survey</Button>}
      </Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      <Paper>
        <List>
          {surveys.length === 0 && <ListItem><ListItemText primary="No surveys available." /></ListItem>}
          {surveys.map((s) => (
            <ListItem key={s._id} divider>
              <ListItemText
                primary={<>{s.title} <Chip size="small" label={s.type} sx={{ ml: 1 }} />
                  {s.anonymous && <Chip size="small" label="Anonymous" sx={{ ml: 1 }} />}
                  <Chip size="small" color={s.status === 'Open' ? 'success' : 'default'} label={s.status} sx={{ ml: 1 }} /></>}
                secondary={`${s.questions.length} question(s)${isStaff ? ` · ${s.response_count} response(s)` : ''}`} />
              <Box sx={{ display: 'flex', gap: 1 }}>
                {s.status === 'Open' && !s.responded && <Button variant="contained" size="small" onClick={() => { setAnswering(s); setAnswers({}); }}>Respond</Button>}
                {s.responded && <Chip size="small" color="success" label="Responded" />}
                {isStaff && <Button size="small" onClick={() => showResults(s)}>Results</Button>}
                {isStaff && <Button size="small" onClick={() => toggle(s)}>{s.status === 'Open' ? 'Close' : 'Reopen'}</Button>}
              </Box>
            </ListItem>
          ))}
        </List>
      </Paper>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>New survey</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          <TextField select label="Start from a template" value="" onChange={(e) => applyTemplate(e.target.value)}
            helperText="Fills in the title and questions; you can edit everything afterwards">
            {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.title}</MenuItem>)}
          </TextField>
          <TextField label="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} required />
          <FormControl>
            <InputLabel id="stype">Type</InputLabel>
            <Select labelId="stype" label="Type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              <MenuItem value="engagement">Engagement</MenuItem>
              <MenuItem value="pulse">Pulse</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel control={<Switch checked={draft.anonymous} onChange={(e) => setDraft({ ...draft, anonymous: e.target.checked })} />}
            label="Anonymous (results hidden until 3 people respond)" />
          {draft.questions.map((q, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Select size="small" value={q.type} onChange={(e) => setQuestion(i, { type: e.target.value })}>
                <MenuItem value="rating">Rating 1-5</MenuItem>
                <MenuItem value="text">Free text</MenuItem>
                <MenuItem value="choice">Choice</MenuItem>
              </Select>
              <TextField size="small" fullWidth label={`Question ${i + 1}`} value={q.text} onChange={(e) => setQuestion(i, { text: e.target.value })} />
              {q.type === 'choice' && <TextField size="small" label="Options (comma separated)" value={q.options} onChange={(e) => setQuestion(i, { options: e.target.value })} />}
              <IconButton disabled={draft.questions.length === 1} onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, j) => j !== i) })}><DeleteIcon /></IconButton>
            </Box>
          ))}
          <Button onClick={() => setDraft({ ...draft, questions: [...draft.questions, blankQuestion()] })}>Add question</Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!draft.title.trim() || draft.questions.some((q) => !q.text.trim())} onClick={createSurvey}>Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!answering} onClose={() => setAnswering(null)} fullWidth maxWidth="sm">
        <DialogTitle>{answering?.title}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '16px !important' }}>
          {answering?.anonymous && <Alert severity="info">Your answers are anonymous.</Alert>}
          {answering?.questions.map((q) => (
            <Box key={q.id}>
              <Typography gutterBottom>{q.text}</Typography>
              {q.type === 'rating' && <Rating value={answers[q.id] || 0} onChange={(e, v) => setAnswers({ ...answers, [q.id]: v })} />}
              {q.type === 'text' && <TextField fullWidth multiline minRows={2} value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />}
              {q.type === 'choice' && (
                <RadioGroup value={answers[q.id] || ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}>
                  {q.options.map((o) => <FormControlLabel key={o} value={o} control={<Radio />} label={o} />)}
                </RadioGroup>
              )}
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnswering(null)}>Cancel</Button>
          <Button variant="contained" disabled={Object.keys(answers).length === 0} onClick={submit}>Submit</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!results} onClose={() => setResults(null)} fullWidth maxWidth="md">
        <DialogTitle>{results?.title} — {results?.response_count} response(s)</DialogTitle>
        <DialogContent>
          {results?.hidden && <Alert severity="info">{results.message}</Alert>}
          {results && !results.hidden && (
            <>
              <Box sx={{ my: 2 }}>
                <Button variant="outlined" size="small" onClick={summarise} disabled={aiLoading}>
                  {aiLoading ? 'Summarising...' : 'Summarise with AI'}
                </Button>
                {aiSummary && (
                  <Alert severity="info" icon={false} sx={{ mt: 1 }}>
                    <Typography sx={{ fontWeight: 700 }}>{aiSummary.summary}</Typography>
                    {aiSummary.themes.map((t) => (
                      <Typography key={t.theme} variant="body2" sx={{ mt: 0.5 }}>
                        <b>{t.theme}</b> ({t.sentiment}): {t.evidence}
                      </Typography>
                    ))}
                    {aiSummary.recommended_actions.length > 0 && (
                      <Typography variant="body2" sx={{ mt: 1 }}><b>Suggested actions:</b> {aiSummary.recommended_actions.join(' · ')}</Typography>
                    )}
                    <Typography variant="caption" color="text.secondary">Written by {aiSummary.source}</Typography>
                  </Alert>
                )}
              </Box>
              {results.engagement_score != null && <Typography variant="h6">Average rating: {results.engagement_score} / 5</Typography>}
              {results.sentiment != null && <Typography color="text.secondary">Comment sentiment: {results.sentiment}/100</Typography>}
              {results.questions.map((q) => (
                <Box key={q.id} sx={{ mt: 2 }}>
                  <Typography fontWeight={600}>{q.text}</Typography>
                  {q.type === 'rating' && <Typography>Average {q.average ?? 'n/a'} · distribution {JSON.stringify(q.distribution)}</Typography>}
                  {q.type === 'choice' && Object.entries(q.counts).map(([k, v]) => <Typography key={k}>{k}: {v}</Typography>)}
                  {q.type === 'text' && q.answers.map((a, i) => <Typography key={i} variant="body2" sx={{ ml: 2 }}>• {a.text}</Typography>)}
                </Box>
              ))}
              {results.text_themes.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography fontWeight={600}>Recurring themes in comments</Typography>
                  {results.text_themes.map((t) => (
                    <Chip key={t.theme} sx={{ mr: 1, mt: 1 }} color={t.negative ? 'warning' : 'default'}
                      label={`${t.theme}: ${t.mentions} mention(s), ${t.negative} negative`} />
                  ))}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setResults(null)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
};

export default Surveys;
