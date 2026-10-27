import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Alert, Autocomplete, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, InputAdornment, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TableSortLabel, TextField, Tooltip, Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ShareIcon from '@mui/icons-material/Share';
import DescriptionIcon from '@mui/icons-material/Description';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import api from '../../services/api';
import JobDialog from '../../components/recruitment/JobDialog';
import ResumeUploadDialog from '../../components/recruitment/ResumeUploadDialog';
import ShareLinkDialog from '../../components/recruitment/ShareLinkDialog';
import { useCompanyName } from '../../utils/company';
import { formatDate } from '../../utils/format';

const STAGES = ['Applied', 'Screening', 'Interview', 'Offered', 'Hired', 'Rejected'];
const STAGE_COLORS = { Applied: 'default', Screening: 'info', Interview: 'primary', Offered: 'warning', Hired: 'success', Rejected: 'error' };
const SOURCES = ['LinkedIn', 'Naukri', 'Referral', 'Consultant', 'Careers page', 'Campus', 'Other'];
const JOB_COLORS = { Open: 'success', 'On hold': 'warning', Closed: 'default' };
const EMPTY_CANDIDATE = { name: '', email: '', phone: '', location: '', current_company: '', current_title: '', experience: '', skills: '', education: '', notice_period_days: '', current_ctc_lpa: '', expected_ctc_lpa: '', source: '', notes: '' };
const TEMPLATE = 'Name,Email,Phone,Location,Current Company,Current Title,Experience,Skills,Education,Notice Period,Current CTC,Expected CTC,Source,Notes\n'
  + 'Ananya Iyer,ananya.iyer@example.com,+91 98450 12345,Bengaluru,Infosys,Software Engineer,4,"Python, Django, PostgreSQL","B.E. Computer Science",30,14,18,LinkedIn,Referred by a colleague\n';

const splitSkills = (text) => (text || '').split(',').map((s) => s.trim()).filter(Boolean);
const skillMatch = (job, candidate) => {
  const required = splitSkills(job?.skills).map((s) => s.toLowerCase());
  if (!required.length) return null;
  const have = new Set(splitSkills(candidate.skills).map((s) => s.toLowerCase()));
  return Math.round((required.filter((s) => have.has(s)).length / required.length) * 100);
};
const lpa = (v) => (v === null || v === undefined || v === '' ? '' : `${v}`);

const Stat = ({ label, value, hint }) => (
  <Paper sx={{ p: 1.5, height: '100%' }}>
    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 700 }}>{label}</Typography>
    <Typography variant="h5">{value}</Typography>
    {hint && <Typography variant="caption" color="text.secondary">{hint}</Typography>}
  </Paper>
);

const RecruitmentPage = () => {
  const [jobs, setJobs] = useState([]);
  const [jobId, setJobId] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [jobDialog, setJobDialog] = useState(null);                  // {} for new, job object to edit
  const [candDialog, setCandDialog] = useState(null);                // candidate object (without _id: new)
  const [importOpen, setImportOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteJob, setDeleteJob] = useState(false);
  const [reading, setReading] = useState(false);
  const company = useCompanyName();
  const [filters, setFilters] = useState({ q: '', stage: 'all' });
  const [sort, setSort] = useState({ by: 'applied', dir: 'desc' });

  const selectedJob = useMemo(() => jobs.find((j) => j._id === jobId), [jobs, jobId]);
  const fail = (e, fallback) => setMessage({ severity: 'error', text: e.response?.data?.error || fallback });

  const loadJobs = useCallback(async (selectId) => {
    try {
      const res = await api.get('/api/recruitment/jobs/');
      const list = res.data.jobs || [];
      setJobs(list);
      setJobId((current) => selectId || (list.some((j) => j._id === current) ? current : (list[0] && list[0]._id) || ''));
    } catch (e) {
      fail(e, 'Could not load job openings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCandidates = useCallback(async () => {
    if (!jobId) { setCandidates([]); return; }
    try {
      const res = await api.get(`/api/recruitment/jobs/${jobId}/candidates/`);
      setCandidates(res.data.candidates || []);
      api.get(`/api/recruitment/jobs/${jobId}/predictions/`)
        .then((pred) => setPredictions(Object.fromEntries((pred.data.predictions || []).map((p) => [p.candidate_id, p]))))
        .catch(() => setPredictions({}));
    } catch (e) {
      fail(e, 'Could not load candidates.');
    }
  }, [jobId]);

  useEffect(() => { loadJobs(); }, [loadJobs]);
  useEffect(() => { loadCandidates(); }, [loadCandidates]);

  const moveCandidate = async (candidate, stage) => {
    try {
      await api.put(`/api/recruitment/candidates/${candidate._id}/stage/`, { stage });
      setCandidates((prev) => prev.map((c) => (c._id === candidate._id ? { ...c, stage } : c)));
      loadJobs();
    } catch (e) { fail(e, 'Could not move the candidate.'); }
  };

  const removeCandidate = async (candidate) => {
    if (!window.confirm(`Remove ${candidate.name} from this opening?`)) return;
    try {
      await api.delete(`/api/recruitment/candidates/${candidate._id}/`);
      setMessage({ severity: 'success', text: `${candidate.name} was removed.` });
      loadCandidates(); loadJobs();
    } catch (e) { fail(e, 'Could not remove the candidate.'); }
  };

  const removeJob = async () => {
    try {
      const res = await api.delete(`/api/recruitment/jobs/${jobId}/`, { params: { with_candidates: 1 } });
      setDeleteJob(false);
      setMessage({ severity: 'success', text: `“${selectedJob.title}” was deleted${res.data.deleted_candidates ? ` together with ${res.data.deleted_candidates} candidate(s) and their resumes` : ''}.` });
      setJobId('');
      loadJobs();
    } catch (e) { setDeleteJob(false); fail(e, 'Could not delete the opening.'); }
  };

  const downloadResume = async (c) => {
    try {
      const res = await api.get(`/api/recruitment/candidates/${c._id}/resume/`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = c.resume_name || `${c.name} - resume`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { fail(e, 'Could not open the resume.'); }
  };

  // one resume -> the form fills itself (new candidate), or the resume is attached (existing candidate)
  const fillFromResume = async (file) => {
    if (!file) return;
    setReading(true);
    try {
      if (candDialog._id) {
        const form = new FormData(); form.append('file', file);
        await api.post(`/api/recruitment/candidates/${candDialog._id}/resume/`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        setCandDialog({ ...candDialog, has_resume: true, resume_name: file.name });
        setMessage({ severity: 'success', text: 'Resume attached.' });
        loadCandidates();
      } else {
        const form = new FormData(); form.append('files', file);
        const res = await api.post(`/api/recruitment/jobs/${jobId}/resumes/`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 });
        const row = res.data.rows[0];
        if (row.error) throw new Error(row.error);
        const { file_name, resume_token, row: _r, read_with, duplicate, match_pct, matched_skills, missing_skills, name_guessed, needs_review, ...fields } = row;
        setCandDialog({ ...EMPTY_CANDIDATE, ...fields, resume_token, resume_name: file_name });
        setMessage({ severity: duplicate ? 'warning' : 'success', text: duplicate ? 'This person is already on the opening.' : `Details filled in from the resume (${read_with}). Please check them.` });
      }
    } catch (e) {
      setMessage({ severity: 'error', text: e.response?.data?.error || e.message || 'The resume could not be read.' });
    }
    setReading(false);
  };

  const saveCandidate = async () => {
    try {
      if (candDialog._id) await api.put(`/api/recruitment/candidates/${candDialog._id}/`, candDialog);
      else await api.post(`/api/recruitment/jobs/${jobId}/candidates/`, candDialog);
      setCandDialog(null);
      loadCandidates(); loadJobs();
    } catch (e) { fail(e, 'Could not save the candidate.'); }
  };

  const rows = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const list = candidates.filter((c) => (filters.stage === 'all' || c.stage === filters.stage) &&
      (!q || `${c.name} ${c.email} ${c.phone} ${c.skills} ${c.current_company} ${c.current_title} ${c.location}`.toLowerCase().includes(q)));
    const key = {
      name: (c) => c.name.toLowerCase(), exp: (c) => Number(c.experience) || 0, fit: (c) => predictions[c._id]?.score ?? -1,
      applied: (c) => c.appliedAt || '', stage: (c) => STAGES.indexOf(c.stage),
    }[sort.by];
    return [...list].sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0) * (sort.dir === 'asc' ? 1 : -1));
  }, [candidates, filters, sort, predictions]);

  const stageCount = (s) => candidates.filter((c) => c.stage === s).length;
  const toggleSort = (by) => setSort((s) => ({ by, dir: s.by === by && s.dir === 'desc' ? 'asc' : 'desc' }));
  const header = (by, label) => <TableSortLabel active={sort.by === by} direction={sort.dir} onClick={() => toggleSort(by)}>{label}</TableSortLabel>;

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h4" component="h1">Recruitment</Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setJobDialog({})}>New opening</Button>
          <Button variant="outlined" startIcon={<ShareIcon />} disabled={!jobId} onClick={() => setShareOpen(true)}>Share application form</Button>
          <Button variant="outlined" startIcon={<UploadFileIcon />} disabled={!jobId} onClick={() => setImportOpen(true)}>Import from a list</Button>
          <Button variant="outlined" startIcon={<AddIcon />} disabled={!jobId} onClick={() => setCandDialog({ ...EMPTY_CANDIDATE })}>Add manually</Button>
          <Button variant="contained" startIcon={<CloudUploadIcon />} disabled={!jobId} onClick={() => setResumeOpen(true)}>Upload resumes</Button>
        </Box>
      </Box>
      {message && <Alert severity={message.severity} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}

      {jobs.length === 0 ? (
        <Alert severity="info" action={<Button color="inherit" size="small" onClick={() => setJobDialog({})}>Create opening</Button>}>
          No job openings yet. Create one, then add or import candidates for it.
        </Alert>
      ) : (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 340, flex: 1 }}>
                <InputLabel id="job-select-label">Job opening</InputLabel>
                <Select labelId="job-select-label" label="Job opening" SelectDisplayProps={{ 'aria-label': 'Job opening' }} value={jobId} onChange={(e) => setJobId(e.target.value)}>
                  {jobs.map((j) => (
                    <MenuItem key={j._id} value={j._id}>{j.title}{j.department ? ` — ${j.department}` : ''} · {j.status || 'Open'} · {j.candidate_count || 0} candidate(s)</MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedJob && <Chip color={JOB_COLORS[selectedJob.status || 'Open']} label={selectedJob.status || 'Open'} />}
              {selectedJob && <Button size="small" startIcon={<EditIcon />} onClick={() => setJobDialog(selectedJob)}>Edit opening</Button>}
              {selectedJob && <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteJob(true)}>Delete opening</Button>}
            </Box>
            {selectedJob && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {[selectedJob.location, selectedJob.employment_type, selectedJob.experience && `${selectedJob.experience}+ yrs`, selectedJob.openings && `${selectedJob.openings} position(s)`,
                  (selectedJob.salary_min_lpa != null || selectedJob.salary_max_lpa != null) && `₹${lpa(selectedJob.salary_min_lpa)}–${lpa(selectedJob.salary_max_lpa)} LPA`].filter(Boolean).join(' · ')}
                {selectedJob.skills ? ` · Skills: ${selectedJob.skills}` : ''}
              </Typography>
            )}
          </Paper>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} md={3}><Stat label="Candidates" value={candidates.length} hint="for this opening" /></Grid>
            <Grid item xs={6} md={3}><Stat label="In process" value={candidates.filter((c) => !['Hired', 'Rejected'].includes(c.stage)).length} hint="applied to offered" /></Grid>
            <Grid item xs={6} md={3}><Stat label="Offers out" value={stageCount('Offered')} /></Grid>
            <Grid item xs={6} md={3}><Stat label="Hired" value={stageCount('Hired')} hint={selectedJob?.openings ? `of ${selectedJob.openings} position(s)` : ''} /></Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 2, display: 'grid', gap: 1.5 }}>
            <TextField size="small" placeholder="Search name, email, phone, skill, company or city" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })}
              inputProps={{ 'aria-label': 'Search candidates' }} InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }} />
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              <Chip clickable color={filters.stage === 'all' ? 'primary' : 'default'} label={`All (${candidates.length})`} onClick={() => setFilters({ ...filters, stage: 'all' })} />
              {STAGES.map((s) => <Chip key={s} clickable color={filters.stage === s ? 'primary' : 'default'} label={`${s} (${stageCount(s)})`} onClick={() => setFilters({ ...filters, stage: s })} />)}
            </Box>
          </Paper>

          <TableContainer component={Paper}>
            <Table size="small" sx={{ minWidth: 1400 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', minWidth: 150 }}>{header('name', 'Candidate')}</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Current role</TableCell>
                  <TableCell>{header('exp', 'Experience')}</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell sx={{ minWidth: 220 }}>Skills</TableCell>
                  <TableCell>Notice</TableCell>
                  <TableCell>CTC (LPA)<Typography variant="caption" display="block">current → expected</Typography></TableCell>
                  <TableCell>{header('fit', 'Fit')}</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>{header('applied', 'Added')}</TableCell>
                  <TableCell>{header('stage', 'Stage')}</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={13}>{candidates.length ? 'No candidates match these filters.' : 'No candidates yet. Upload their resumes and the details fill themselves, or share the application form with them.'}</TableCell></TableRow>
                )}
                {rows.map((c) => {
                  const match = skillMatch(selectedJob, c);
                  const fit = predictions[c._id];
                  return (
                    <TableRow key={c._id} hover>
                      <TableCell sx={{ position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper', minWidth: 150 }}><Tooltip title={c.summary || ''} placement="right"><b>{c.name}</b></Tooltip>{c.education && <Typography variant="caption" display="block" color="text.secondary">{c.education}</Typography>}</TableCell>
                      <TableCell>{c.email || '-'}<Typography variant="caption" display="block" color="text.secondary">{c.phone}</Typography></TableCell>
                      <TableCell>{c.current_title || '-'}<Typography variant="caption" display="block" color="text.secondary">{c.current_company}</Typography></TableCell>
                      <TableCell>{c.experience !== '' && c.experience != null ? `${c.experience} yrs` : '-'}</TableCell>
                      <TableCell>{c.location || '-'}</TableCell>
                      <TableCell>
                        {splitSkills(c.skills).slice(0, 8).map((s) => (
                          <Chip key={s} size="small" variant="outlined" label={s} sx={{ mr: 0.5, mb: 0.5 }}
                            color={splitSkills(selectedJob?.skills).some((r) => r.toLowerCase() === s.toLowerCase()) ? 'success' : 'default'} />
                        ))}
                        {match !== null && <Typography variant="caption" display="block" color="text.secondary">{match}% of required skills</Typography>}
                      </TableCell>
                      <TableCell>{c.notice_period_days != null && c.notice_period_days !== '' ? `${c.notice_period_days} days` : '-'}</TableCell>
                      <TableCell>{c.current_ctc_lpa != null || c.expected_ctc_lpa != null ? `${lpa(c.current_ctc_lpa) || '-'} → ${lpa(c.expected_ctc_lpa) || '-'}` : '-'}</TableCell>
                      <TableCell>
                        {fit ? (
                          <Tooltip title={fit.reasons.join(' · ')}>
                            <Chip size="small" label={`${fit.score} · ${fit.likelihood}`} color={fit.likelihood === 'High' ? 'success' : fit.likelihood === 'Medium' ? 'warning' : 'default'} />
                          </Tooltip>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{c.source || '-'}</TableCell>
                      <TableCell>{formatDate(c.appliedAt)}</TableCell>
                      <TableCell>
                        <Select size="small" value={c.stage} SelectDisplayProps={{ 'aria-label': `Stage for ${c.name}` }} onChange={(e) => moveCandidate(c, e.target.value)}
                          sx={{ fontSize: 13, minWidth: 120 }}>
                          {STAGES.map((s) => <MenuItem key={s} value={s}><Chip size="small" color={STAGE_COLORS[s]} label={s} /></MenuItem>)}
                        </Select>
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        {c.has_resume && <Tooltip title="Open resume"><IconButton size="small" aria-label={`Open resume of ${c.name}`} onClick={() => downloadResume(c)}><DescriptionIcon fontSize="small" /></IconButton></Tooltip>}
                        <Tooltip title="Edit"><IconButton size="small" aria-label={`Edit ${c.name}`} onClick={() => setCandDialog(c)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Remove"><IconButton size="small" aria-label={`Remove ${c.name}`} onClick={() => removeCandidate(c)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <JobDialog open={!!jobDialog} job={jobDialog?._id ? jobDialog : null} onClose={() => setJobDialog(null)}
        onSaved={(job) => { setMessage({ severity: 'success', text: `“${job.title}” saved.` }); loadJobs(job._id); }} />

      <Dialog open={!!candDialog} onClose={() => setCandDialog(null)} fullWidth maxWidth="md">
        <DialogTitle>{candDialog?._id ? 'Edit candidate' : 'Add candidate'}</DialogTitle>
        {candDialog && (
          <DialogContent sx={{ pt: '16px !important' }}>
            <Alert severity="info" icon={<AutoAwesomeIcon />} sx={{ mb: 2 }} action={
              <Button color="inherit" size="small" component="label" disabled={reading}>
                {reading ? 'Reading…' : candDialog._id ? (candDialog.has_resume ? 'Replace resume' : 'Attach resume') : 'Choose resume'}
                <input hidden type="file" accept=".pdf,.docx,.txt" aria-label="Resume file" onChange={(e) => { fillFromResume(e.target.files[0]); e.target.value = ''; }} />
              </Button>}>
              {candDialog._id
                ? (candDialog.has_resume ? `A resume is on file${candDialog.resume_name ? ` (${candDialog.resume_name})` : ''}.` : 'No resume on file yet.')
                : (candDialog.resume_token ? `Resume attached: ${candDialog.resume_name}. The details below came from it.` : 'Skip the typing: choose a resume and the details fill themselves.')}
            </Alert>
            <Grid container spacing={2}>
              {[['name', 'Full name', 6, true], ['email', 'Email', 6], ['phone', 'Mobile', 4], ['location', 'Current city', 4], ['current_company', 'Current company', 4], ['current_title', 'Current designation', 6],
                ['education', 'Education', 6], ['experience', 'Experience (years)', 3, false, 'number'], ['notice_period_days', 'Notice period (days)', 3, false, 'number'],
                ['current_ctc_lpa', 'Current CTC (LPA)', 3, false, 'number'], ['expected_ctc_lpa', 'Expected CTC (LPA)', 3, false, 'number']].map(([key, label, md, required, type]) => (
                <Grid item xs={12} sm={6} md={md} key={key}>
                  <TextField fullWidth size="small" required={!!required} type={type} label={label} value={candDialog[key] ?? ''} onChange={(e) => setCandDialog({ ...candDialog, [key]: e.target.value })} />
                </Grid>
              ))}
              <Grid item xs={12} md={6}>
                <Autocomplete freeSolo size="small" options={SOURCES} inputValue={candDialog.source || ''} onInputChange={(e, v) => setCandDialog({ ...candDialog, source: v })}
                  renderInput={(params) => <TextField {...params} label="Source" />} />
              </Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Skills (comma separated)" value={candDialog.skills ?? ''} onChange={(e) => setCandDialog({ ...candDialog, skills: e.target.value })} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" multiline minRows={2} label="Notes" value={candDialog.notes ?? ''} onChange={(e) => setCandDialog({ ...candDialog, notes: e.target.value })} /></Grid>
            </Grid>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setCandDialog(null)}>Cancel</Button>
          <Button variant="contained" disabled={!candDialog?.name?.trim()} onClick={saveCandidate}>{candDialog?._id ? 'Save changes' : 'Add'}</Button>
        </DialogActions>
      </Dialog>

      <ResumeUploadDialog open={resumeOpen} job={selectedJob} onClose={() => setResumeOpen(false)}
        onDone={(text) => { setMessage({ severity: 'success', text }); loadCandidates(); loadJobs(); }} />

      <ShareLinkDialog open={shareOpen} job={selectedJob} company={company} onClose={() => setShareOpen(false)} />

      <Dialog open={deleteJob} onClose={() => setDeleteJob(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete “{selectedJob?.title}”?</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>This removes the job posting and its application form link for good.</Typography>
          {(selectedJob?.candidate_count || 0) > 0 && (
            <Alert severity="warning">{selectedJob.candidate_count} candidate(s) are on this opening. They and their resumes are deleted too. If you only want to stop hiring, set the opening to Closed instead (Edit opening).</Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteJob(false)}>Keep it</Button>
          <Button color="error" variant="contained" onClick={removeJob}>Delete{(selectedJob?.candidate_count || 0) > 0 ? ' everything' : ''}</Button>
        </DialogActions>
      </Dialog>

      <ImportDialog open={importOpen} job={selectedJob} onClose={() => setImportOpen(false)}
        onDone={(text) => { setMessage({ severity: 'success', text }); loadCandidates(); loadJobs(); }} />
    </Box>
  );
};

const ImportDialog = ({ open, job, onClose, onDone }) => {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [review, setReview] = useState(null);
  const [picked, setPicked] = useState({});

  useEffect(() => { if (open) { setText(''); setReview(null); setError(null); setPicked({}); } }, [open]);

  const readFile = (file) => {
    if (!file) return;
    if (!/\.(csv|tsv|txt)$/i.test(file.name)) { setError('Upload a .csv, .tsv or .txt file, or paste the rows from Excel.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setText(String(reader.result || '')); setError(null); };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'candidates-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const read = async () => {
    setBusy(true); setError(null);
    try {
      const res = await api.post(`/api/recruitment/jobs/${job._id}/candidates/parse/`, { text });
      setReview(res.data);
      setPicked(Object.fromEntries(res.data.candidates.map((c) => [c.row, !c.duplicate])));
    } catch (e) { setError(e.response?.data?.error || 'Could not read the list.'); }
    setBusy(false);
  };

  const add = async () => {
    setBusy(true); setError(null);
    try {
      const chosen = review.candidates.filter((c) => picked[c.row]);
      const res = await api.post(`/api/recruitment/jobs/${job._id}/candidates/bulk/`, { candidates: chosen });
      onDone(`Added ${res.data.created} candidate(s) to “${job.title}”${res.data.skipped ? `; ${res.data.skipped} were already there` : ''}.`);
      onClose();
    } catch (e) { setError(e.response?.data?.error || 'Could not add the candidates.'); }
    setBusy(false);
  };

  const selectedCount = review ? review.candidates.filter((c) => picked[c.row]).length : 0;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>Import candidates into “{job?.title}”</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!review && (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Paste everyone's details in any format: rows copied from Excel, a CSV, a list from an email or a WhatsApp message, even resume summaries. The AI reads it and
              shows you the candidates to check before anything is added. This only creates them on the opening; there is no screening.
            </Alert>
            <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
              <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
                Upload .csv / .txt<input hidden type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" onChange={(e) => { readFile(e.target.files[0]); e.target.value = ''; }} />
              </Button>
              <Button onClick={downloadTemplate}>Download Excel/CSV template</Button>
            </Box>
            <TextField fullWidth multiline minRows={10} maxRows={18} autoFocus value={text} onChange={(e) => setText(e.target.value)}
              inputProps={{ 'aria-label': 'Candidate list' }}
              placeholder={'Example:\nAnanya Iyer, ananya@example.com, 98450 12345, Bengaluru, 4 yrs, Python/Django/PostgreSQL, notice 30 days, CTC 14 LPA, expecting 18\nRohit Verma - rohit.v@example.com - Pune - 6 years Java, Spring, AWS - serving notice, 60 days - 22 LPA'} />
          </>
        )}
        {review && (
          <>
            <Typography sx={{ mb: 1 }}>
              Found <b>{review.candidates.length}</b> candidate(s) (read with {review.read_with}). Untick anyone you do not want to add.
              {review.candidates.some((c) => c.duplicate) && ' People already in this opening are unticked.'}
            </Typography>
            {review.warnings?.map((w) => <Alert key={w} severity="warning" sx={{ mb: 1 }}>{w}</Alert>)}
            <TableContainer sx={{ maxHeight: '55vh' }}>
              <Table size="small" stickyHeader sx={{ minWidth: 1100 }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox"><Checkbox inputProps={{ 'aria-label': 'Select all' }} checked={selectedCount === review.candidates.length} indeterminate={selectedCount > 0 && selectedCount < review.candidates.length}
                      onChange={(e) => setPicked(Object.fromEntries(review.candidates.map((c) => [c.row, e.target.checked])))} /></TableCell>
                    <TableCell>Name</TableCell><TableCell>Email / phone</TableCell><TableCell>Current role</TableCell><TableCell>Exp</TableCell><TableCell>City</TableCell>
                    <TableCell>Skills</TableCell><TableCell>Notice</TableCell><TableCell>CTC → expected</TableCell><TableCell>Source</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {review.candidates.map((c) => (
                    <TableRow key={c.row} hover selected={!!picked[c.row]}>
                      <TableCell padding="checkbox"><Checkbox inputProps={{ 'aria-label': `Add ${c.name}` }} checked={!!picked[c.row]} onChange={(e) => setPicked({ ...picked, [c.row]: e.target.checked })} /></TableCell>
                      <TableCell><b>{c.name}</b>{c.duplicate && <Chip size="small" color="warning" label="already added" sx={{ ml: 1 }} />}</TableCell>
                      <TableCell>{c.email || '-'}<Typography variant="caption" display="block" color="text.secondary">{c.phone}</Typography></TableCell>
                      <TableCell>{c.current_title || '-'}<Typography variant="caption" display="block" color="text.secondary">{c.current_company}</Typography></TableCell>
                      <TableCell>{c.experience ? `${c.experience} yrs` : '-'}</TableCell>
                      <TableCell>{c.location || '-'}</TableCell>
                      <TableCell>{c.skills || '-'}</TableCell>
                      <TableCell>{c.notice_period_days != null ? `${c.notice_period_days} d` : '-'}</TableCell>
                      <TableCell>{c.current_ctc_lpa != null || c.expected_ctc_lpa != null ? `${lpa(c.current_ctc_lpa) || '-'} → ${lpa(c.expected_ctc_lpa) || '-'}` : '-'}</TableCell>
                      <TableCell>{c.source || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {review && <Button onClick={() => setReview(null)} disabled={busy}>Back</Button>}
        <Button onClick={onClose}>Cancel</Button>
        {!review && <Button variant="contained" disabled={busy || text.trim().length < 3} onClick={read} startIcon={busy ? <CircularProgress size={16} /> : null}>{busy ? 'Reading…' : 'Read the list'}</Button>}
        {review && <Button variant="contained" disabled={busy || selectedCount === 0} onClick={add}>Add {selectedCount} candidate(s)</Button>}
      </DialogActions>
    </Dialog>
  );
};

export default RecruitmentPage;
