import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, Paper, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DescriptionIcon from '@mui/icons-material/Description';
import CloseIcon from '@mui/icons-material/Close';
import api from '../../services/api';

const ACCEPT = '.pdf,.docx,.txt';
const MAX_FILES = 25;
const MAX_BYTES = 5 * 1024 * 1024;
const splitSkills = (text) => (text || '').split(',').map((s) => s.trim()).filter(Boolean);

/**
 * HR drops one or many resumes; the AI reads each and fills in the candidate's details. HR checks the table, fixes anything
 * wrong and adds everyone to the opening in one click. Nothing is saved until "Add" is pressed.
 */
const ResumeUploadDialog = ({ open, job, onClose, onDone }) => {
  const [files, setFiles] = useState([]);
  const [stage, setStage] = useState('pick');          // pick -> reading -> review
  const [rows, setRows] = useState([]);
  const [picked, setPicked] = useState({});
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(null);
  const input = useRef(null);

  useEffect(() => { if (open) { setFiles([]); setStage('pick'); setRows([]); setPicked({}); setError(null); setInfo(null); setBusy(false); } }, [open]);

  const addFiles = useCallback((list) => {
    const problems = [];
    const accepted = [];
    Array.from(list).forEach((f) => {
      if (!/\.(pdf|docx|txt)$/i.test(f.name)) problems.push(`${f.name}: only PDF, DOCX and TXT files.`);
      else if (f.size > MAX_BYTES) problems.push(`${f.name}: larger than 5 MB.`);
      else accepted.push(f);
    });
    setFiles((current) => {
      const names = new Set(current.map((f) => `${f.name}:${f.size}`));
      const merged = [...current, ...accepted.filter((f) => !names.has(`${f.name}:${f.size}`))];
      if (merged.length > MAX_FILES) problems.push(`Only the first ${MAX_FILES} resumes are used.`);
      return merged.slice(0, MAX_FILES);
    });
    setError(problems.length ? problems.join(' ') : null);
  }, []);

  const read = async () => {
    setStage('reading');
    setError(null);
    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));
      const res = await api.post(`/api/recruitment/jobs/${job._id}/resumes/`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 180000 });
      setRows(res.data.rows);
      setInfo(res.data);
      setPicked(Object.fromEntries(res.data.rows.filter((r) => !r.error).map((r) => [r.row, !r.duplicate])));
      setStage('review');
    } catch (e) {
      setError(e.response?.data?.error || 'The resumes could not be read. Please try again.');
      setStage('pick');
    }
  };

  const edit = (row, key, value) => setRows((current) => current.map((r) => (r.row === row ? { ...r, [key]: value } : r)));
  const readable = rows.filter((r) => !r.error);
  const chosen = readable.filter((r) => picked[r.row]);

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = chosen.map((r) => ({ ...r, resume_name: r.file_name }));
      const res = await api.post(`/api/recruitment/jobs/${job._id}/candidates/bulk/`, { candidates: payload });
      onDone(`Added ${res.data.created} candidate(s) to “${job.title}” with their resumes${res.data.skipped ? `; ${res.data.skipped} were already there` : ''}.`);
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'The candidates could not be added.');
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onClose={busy || stage === 'reading' ? undefined : onClose} fullWidth maxWidth={stage === 'review' ? 'xl' : 'md'}>
      <DialogTitle>Upload resumes for “{job?.title}”</DialogTitle>
      <DialogContent sx={{ pt: '8px !important' }}>
        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        {stage === 'pick' && (
          <>
            <Paper
              variant="outlined"
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
              onClick={() => input.current?.click()}
              sx={{ p: 5, textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed', borderWidth: 3, bgcolor: dragging ? 'action.hover' : 'transparent' }}
              role="button" tabIndex={0} aria-label="Choose resume files"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') input.current?.click(); }}
            >
              <CloudUploadIcon sx={{ fontSize: 56 }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>Drop resumes here, or click to choose</Typography>
              <Typography color="text.secondary">One resume or up to {MAX_FILES} at once. PDF, DOCX or TXT, 5 MB each.</Typography>
              <input ref={input} hidden type="file" multiple accept={ACCEPT} aria-label="Resume files" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            </Paper>
            {files.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{files.length} resume{files.length > 1 ? 's' : ''} ready</Typography>
                {files.map((f) => (
                  <Box key={`${f.name}:${f.size}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
                    <DescriptionIcon fontSize="small" />
                    <Typography variant="body2" sx={{ flex: 1 }}>{f.name} <Typography component="span" variant="caption" color="text.secondary">({Math.max(1, Math.round(f.size / 1024))} KB)</Typography></Typography>
                    <IconButton size="small" aria-label={`Remove ${f.name}`} onClick={() => setFiles((c) => c.filter((x) => x !== f))}><CloseIcon fontSize="small" /></IconButton>
                  </Box>
                ))}
              </Box>
            )}
            <Alert severity="info" sx={{ mt: 2 }}>The AI reads each resume and fills in the name, contact details, current role, experience, skills and education. You check the result before anyone is added.</Alert>
          </>
        )}

        {stage === 'reading' && (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2, fontWeight: 800 }}>Reading {files.length} resume{files.length > 1 ? 's' : ''}…</Typography>
            <Typography color="text.secondary">This takes a few seconds for each resume. Please keep this window open.</Typography>
            <LinearProgress sx={{ mt: 3, maxWidth: 360, mx: 'auto' }} />
          </Box>
        )}

        {stage === 'review' && (
          <>
            <Typography sx={{ mb: 1 }}>
              Read <b>{info?.read}</b> of {rows.length} resume(s){info?.read_with ? ` with ${info.read_with}` : ''}. Check the details, correct anything that is wrong, and untick anyone you do not want to add.
              {rows.some((r) => r.duplicate) && ' People already on this opening are unticked.'}
            </Typography>
            {rows.filter((r) => r.error).map((r) => <Alert key={r.row} severity="error" sx={{ mb: 1 }}>{r.error}</Alert>)}
            <TableContainer sx={{ maxHeight: '58vh' }}>
              <Table size="small" stickyHeader sx={{ minWidth: 1350 }}>
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox"><Checkbox inputProps={{ 'aria-label': 'Select all' }} checked={chosen.length === readable.length && readable.length > 0} indeterminate={chosen.length > 0 && chosen.length < readable.length}
                      onChange={(e) => setPicked(Object.fromEntries(readable.map((r) => [r.row, e.target.checked])))} /></TableCell>
                    <TableCell sx={{ minWidth: 170 }}>Name</TableCell><TableCell sx={{ minWidth: 200 }}>Email</TableCell><TableCell sx={{ minWidth: 140 }}>Mobile</TableCell>
                    <TableCell>Current role</TableCell><TableCell>Exp (yrs)</TableCell><TableCell>City</TableCell><TableCell sx={{ minWidth: 220 }}>Skills</TableCell><TableCell>Match</TableCell><TableCell>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {readable.map((r) => (
                    <TableRow key={r.row} hover selected={!!picked[r.row]}>
                      <TableCell padding="checkbox"><Checkbox inputProps={{ 'aria-label': `Add ${r.name}` }} checked={!!picked[r.row]} onChange={(e) => setPicked({ ...picked, [r.row]: e.target.checked })} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" fullWidth value={r.name || ''} inputProps={{ 'aria-label': `Name for ${r.file_name}` }} onChange={(e) => edit(r.row, 'name', e.target.value)} />
                        <Typography variant="caption" color="text.secondary" display="block">{r.file_name}</Typography></TableCell>
                      <TableCell><TextField size="small" variant="standard" fullWidth value={r.email || ''} error={!r.email} placeholder="missing" inputProps={{ 'aria-label': `Email for ${r.file_name}` }} onChange={(e) => edit(r.row, 'email', e.target.value)} /></TableCell>
                      <TableCell><TextField size="small" variant="standard" fullWidth value={r.phone || ''} placeholder="missing" inputProps={{ 'aria-label': `Mobile for ${r.file_name}` }} onChange={(e) => edit(r.row, 'phone', e.target.value)} /></TableCell>
                      <TableCell>{r.current_title || '-'}<Typography variant="caption" color="text.secondary" display="block">{r.current_company}</Typography></TableCell>
                      <TableCell><TextField size="small" variant="standard" type="number" sx={{ width: 64 }} value={r.experience ?? ''} inputProps={{ 'aria-label': `Experience for ${r.file_name}`, min: 0 }} onChange={(e) => edit(r.row, 'experience', e.target.value)} /></TableCell>
                      <TableCell>{r.location || '-'}</TableCell>
                      <TableCell>
                        {splitSkills(r.skills).slice(0, 10).map((s) => <Chip key={s} size="small" variant="outlined" label={s} color={(r.matched_skills || []).includes(s) ? 'success' : 'default'} sx={{ mr: 0.5, mb: 0.5 }} />)}
                        {!r.skills && '-'}
                      </TableCell>
                      <TableCell>{r.match_pct == null ? '-' : (
                        <Tooltip title={r.missing_skills?.length ? `Missing: ${r.missing_skills.join(', ')}` : 'Has every required skill'}>
                          <Chip size="small" label={`${r.match_pct}%`} color={r.match_pct >= 70 ? 'success' : r.match_pct >= 40 ? 'warning' : 'default'} />
                        </Tooltip>)}</TableCell>
                      <TableCell sx={{ minWidth: 280, maxWidth: 340 }}>
                        {r.duplicate && <Chip size="small" color="warning" label="already added" sx={{ mr: 0.5 }} />}
                        {r.name_guessed && <Chip size="small" color="warning" variant="outlined" label="check the name" sx={{ mr: 0.5 }} />}
                        {r.summary && (
                          <Tooltip title={r.summary}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.summary}</Typography>
                          </Tooltip>)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions>
        {stage === 'review' && <Button onClick={() => { setStage('pick'); setRows([]); }} disabled={busy}>Back</Button>}
        <Button onClick={onClose} disabled={busy || stage === 'reading'}>Cancel</Button>
        {stage === 'pick' && <Button variant="contained" disabled={!files.length} onClick={read}>Read {files.length || ''} resume{files.length === 1 ? '' : 's'}</Button>}
        {stage === 'review' && <Button variant="contained" disabled={busy || !chosen.length} onClick={add}>Add {chosen.length} candidate{chosen.length === 1 ? '' : 's'}</Button>}
      </DialogActions>
    </Dialog>
  );
};

export default ResumeUploadDialog;
