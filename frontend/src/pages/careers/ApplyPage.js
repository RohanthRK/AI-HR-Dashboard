import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Container, FormControlLabel, Paper, TextField, Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const API = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/public`;
const EMPTY = { name: '', email: '', phone: '', location: '', current_company: '', current_title: '', experience: '', notice_period_days: '', current_ctc_lpa: '', expected_ctc_lpa: '', skills: '', education: '', notes: '', website: '' };
const FIELDS = ['name', 'email', 'phone', 'location', 'current_company', 'current_title', 'experience', 'notice_period_days', 'current_ctc_lpa', 'expected_ctc_lpa', 'skills', 'education'];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Public application form for one opening (no login). The candidate uploads a resume, the form fills itself, and they check
 * it and submit. Works on a phone; the link can carry ?src=LinkedIn so HR knows where the candidate came from.
 */
const ApplyPage = () => {
  const { jobId } = useParams();
  const [params] = useSearchParams();
  const [state, setState] = useState({ loading: true, job: null, company: '', error: null });
  const [form, setForm] = useState(EMPTY);
  const [resume, setResume] = useState(null);
  const [reading, setReading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    axios.get(`${API}/jobs/${jobId}/`)
      .then((res) => setState({ loading: false, job: res.data.job, company: res.data.company, error: null }))
      .catch((e) => setState({ loading: false, job: null, company: '', error: e.response?.status === 404 ? 'This position is not open any more.' : 'The job could not be loaded. Please try again later.' }));
  }, [jobId]);

  useEffect(() => { if (state.company || state.job) document.title = `Apply${state.job ? `: ${state.job.title}` : ''}${state.company ? ` · ${state.company}` : ''}`; }, [state]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const chooseResume = async (file) => {
    if (!file) return;
    setError(null);
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) { setError('Please upload a PDF, DOCX or TXT resume.'); return; }
    if (file.size > MAX_BYTES) { setError('The resume is larger than 5 MB.'); return; }
    setResume(file);
    setReading(true);
    setNotice(null);
    try {
      const data = new FormData();
      data.append('resume', file);
      const res = await axios.post(`${API}/resume-parse/`, data, { timeout: 90000 });
      setForm((f) => {
        const next = { ...f };
        FIELDS.forEach((k) => { if (res.data.fields[k] !== undefined && res.data.fields[k] !== '' && !String(f[k]).trim()) next[k] = String(res.data.fields[k]); });
        return next;
      });
      setNotice({ severity: 'success', text: 'We filled in your details from your resume. Please check them and correct anything that is wrong.' });
    } catch (e) {
      setNotice({ severity: 'info', text: e.response?.data?.error || 'We could not read your resume automatically. Please fill in the form below; your resume will still be sent.' });
    }
    setReading(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const data = new FormData();
      Object.entries(form).forEach(([k, v]) => data.append(k, v));
      data.append('job_id', jobId);
      data.append('via', 'form');
      if (params.get('src')) data.append('source', params.get('src'));
      if (resume) data.append('resume', resume);
      await axios.post(`${API}/apply/`, data);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Your application could not be sent. Please try again.');
    }
    setSending(false);
  };

  const { job } = state;
  const field = (key, label, extra = {}) => (
    <Grid item xs={12} sm={extra.sm || 6}>
      <TextField fullWidth size="small" label={label} value={form[key]} onChange={set(key)} {...extra.props} inputProps={{ ...(extra.props?.inputProps || {}) }} />
    </Grid>
  );

  if (state.loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}><CircularProgress /></Box>;
  if (!job) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>Application</Typography>
        <Alert severity="info" sx={{ mb: 3 }}>{state.error}</Alert>
        <Button variant="contained" component={RouterLink} to="/careers">See open positions</Button>
      </Container>
    );
  }
  if (done) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 72 }} />
        <Typography variant="h4" sx={{ fontWeight: 900, my: 1 }}>Thank you, {form.name.split(' ')[0]}!</Typography>
        <Typography sx={{ mb: 3 }}>Your application for <b>{job.title}</b>{state.company ? ` at ${state.company}` : ''} has been received. Our HR team will contact you at {form.email} if your profile matches.</Typography>
        <Button variant="outlined" component={RouterLink} to="/careers">See other openings</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 5 } }}>
      <Typography variant="overline" sx={{ fontWeight: 800 }}>{state.company}</Typography>
      <Typography variant="h3" component="h1" sx={{ fontWeight: 900, fontSize: { xs: '1.9rem', sm: '2.6rem' } }}>{job.title}</Typography>
      <Typography color="text.secondary" gutterBottom>{[job.department, job.location, job.employment_type].filter(Boolean).join(' · ')}</Typography>
      <Box sx={{ my: 1.5 }}>{(job.skills || '').split(',').map((s) => s.trim()).filter(Boolean).map((s) => <Chip key={s} size="small" label={s} sx={{ mr: 0.5, mb: 0.5 }} />)}</Box>
      {job.description && <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>{job.description}</Typography>}

      <Paper component="form" onSubmit={submit} sx={{ p: { xs: 2, sm: 4 }, border: '3px solid #000', borderRadius: 0, boxShadow: '6px 6px 0 #000' }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5 }}>Apply for this job</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>Upload your resume and the form fills itself. It takes about a minute.</Typography>

        <Paper variant="outlined" role="button" tabIndex={0} aria-label="Upload your resume" onClick={() => input.current?.click()}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') input.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); chooseResume(e.dataTransfer.files[0]); }}
          sx={{ p: 3, mb: 2, textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed', borderWidth: 3, bgcolor: dragging ? 'action.hover' : 'transparent' }}>
          {reading ? <CircularProgress size={32} /> : <CloudUploadIcon sx={{ fontSize: 40 }} />}
          <Typography sx={{ fontWeight: 800 }}>{reading ? 'Reading your resume…' : resume ? resume.name : 'Upload your resume'}</Typography>
          <Typography variant="body2" color="text.secondary">{resume && !reading ? 'Click to choose a different file' : 'PDF, DOCX or TXT, up to 5 MB. Drop it here or click.'}</Typography>
          <input ref={input} hidden type="file" accept=".pdf,.docx,.txt" aria-label="Resume file" onChange={(e) => { chooseResume(e.target.files[0]); e.target.value = ''; }} />
        </Paper>
        {notice && <Alert severity={notice.severity} icon={notice.severity === 'success' ? <AutoAwesomeIcon /> : undefined} sx={{ mb: 2 }}>{notice.text}</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Grid container spacing={2}>
          {field('name', 'Full name', { props: { required: true } })}
          {field('email', 'Email', { props: { required: true, type: 'email' } })}
          {field('phone', 'Mobile number', { props: { placeholder: '+91 98450 12345' } })}
          {field('location', 'Current city')}
          {field('current_company', 'Current company')}
          {field('current_title', 'Current designation')}
          {field('experience', 'Total experience (years)', { sm: 4, props: { type: 'number', inputProps: { min: 0, step: 0.5 } } })}
          {field('notice_period_days', 'Notice period (days)', { sm: 4, props: { type: 'number', inputProps: { min: 0 } } })}
          {field('current_ctc_lpa', 'Current CTC (₹ LPA)', { sm: 4, props: { type: 'number', inputProps: { min: 0, step: 0.5 } } })}
          {field('expected_ctc_lpa', 'Expected CTC (₹ LPA)', { sm: 4, props: { type: 'number', inputProps: { min: 0, step: 0.5 } } })}
          {field('education', 'Highest education', { sm: 8 })}
          {field('skills', 'Key skills (comma separated)', { sm: 12 })}
          <Grid item xs={12}><TextField fullWidth size="small" multiline minRows={3} label="Anything you would like us to know (optional)" value={form.notes} onChange={set('notes')} /></Grid>
        </Grid>
        {/* honeypot: hidden from people, filled in by bots */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true" />

        <FormControlLabel sx={{ mt: 2, alignItems: 'flex-start' }} control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />}
          label={<Typography variant="body2">I agree that {state.company || 'the company'} may store and use my details and resume to consider me for this and other suitable openings, as described under the Digital Personal Data Protection Act.</Typography>} />
        <Button type="submit" size="large" variant="contained" fullWidth disabled={sending || reading || !consent || !form.name.trim() || !form.email.trim()} sx={{ mt: 2, fontWeight: 900 }}>
          {sending ? 'Sending…' : 'Submit application'}
        </Button>
      </Paper>
    </Container>
  );
};

export default ApplyPage;
