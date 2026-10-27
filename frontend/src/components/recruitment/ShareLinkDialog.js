import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const CHANNELS = ['Direct', 'LinkedIn', 'Naukri', 'Referral', 'Campus', 'Consultant', 'Other'];

/**
 * The application form for one opening, as a link and QR code HR can send anywhere. The channel is added to the link, so
 * every candidate who applies through it is recorded with where they came from.
 */
const ShareLinkDialog = ({ open, job, company, onClose }) => {
  const [channel, setChannel] = useState('Direct');
  const [copied, setCopied] = useState(false);
  const link = useMemo(() => (job ? `${window.location.origin}/apply/${job._id}${channel === 'Direct' ? '' : `?src=${encodeURIComponent(channel)}`}` : ''), [job, channel]);
  const message = `${company ? `${company} is hiring: ` : 'We are hiring: '}${job?.title}${job?.location ? ` (${job.location})` : ''}. Apply here, upload your resume and the form fills itself: ${link}`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (e) { /* the link stays selectable */ }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Application form for “{job?.title}”</DialogTitle>
      <DialogContent>
        {job && (job.status || 'Open') !== 'Open' && <Alert severity="warning" sx={{ mb: 2 }}>This opening is {job.status}. The form only works while it is Open.</Alert>}
        <Typography sx={{ mb: 1.5 }}>Send this link to candidates. They upload their resume, the form fills itself, and they just check and submit. No login is needed and you get a notification for every application.</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>Where are you sharing it?</Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 2 }}>
          {CHANNELS.map((c) => <Chip key={c} clickable label={c} color={channel === c ? 'primary' : 'default'} onClick={() => setChannel(c)} />)}
        </Box>
        <TextField fullWidth label="Application link" value={link} InputProps={{ readOnly: true, endAdornment: (
          <InputAdornment position="end"><Tooltip title={copied ? 'Copied' : 'Copy link'}><IconButton aria-label="Copy link" onClick={copy}><ContentCopyIcon /></IconButton></Tooltip></InputAdornment>) }} onFocus={(e) => e.target.select()} />
        {copied && <Typography variant="caption" color="success.main" role="status">Link copied.</Typography>}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center', mt: 2, flexWrap: 'wrap' }}>
          <Box sx={{ p: 1.5, bgcolor: '#fff', border: '3px solid #000' }}><QRCodeSVG value={link} size={132} /></Box>
          <Box sx={{ display: 'grid', gap: 1 }}>
            <Button variant="outlined" startIcon={<WhatsAppIcon />} component="a" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(message)}`}>Share on WhatsApp</Button>
            <Button variant="outlined" startIcon={<EmailIcon />} component="a" href={`mailto:?subject=${encodeURIComponent(`Job opening: ${job?.title || ''}`)}&body=${encodeURIComponent(message)}`}>Share by email</Button>
            <Button variant="outlined" startIcon={<OpenInNewIcon />} component="a" target="_blank" rel="noopener noreferrer" href={link}>Preview the form</Button>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>Print or show the QR code at campus drives and walk-ins. Candidates who apply are added to this opening as “Applied”.</Typography>
      </DialogContent>
      <DialogActions><Button variant="contained" onClick={onClose}>Done</Button></DialogActions>
    </Dialog>
  );
};

export default ShareLinkDialog;
