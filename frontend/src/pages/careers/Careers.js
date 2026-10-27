import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';

const API = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/public`;

/** Public careers page: no login. Lists open jobs, accepts applications and has a small chat assistant. */
const Careers = () => {
  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState(null);
  const [company, setCompany] = useState('');
  const [chat, setChat] = useState([{ from: 'bot', text: 'Hi! Ask me about our open roles.' }]);
  const [question, setQuestion] = useState('');

  useEffect(() => {
    axios.get(`${API}/jobs/`).then((res) => { setJobs(res.data.jobs); setCompany(res.data.company || ''); }).catch(() => setError('Could not load open positions.'));
  }, []);

  const ask = async () => {
    const text = question.trim();
    if (!text) return;
    setChat((c) => [...c, { from: 'me', text }]);
    setQuestion('');
    try {
      const res = await axios.post(`${API}/chat/`, { message: text });
      setChat((c) => [...c, { from: 'bot', text: res.data.reply }]);
    } catch (e) {
      setChat((c) => [...c, { from: 'bot', text: e.response?.data?.error || 'Sorry, something went wrong.' }]);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Typography variant="h3" component="h1" gutterBottom>Careers{company ? ` at ${company}` : ''}</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          {jobs.length === 0 && !error && <Alert severity="info">No open positions right now.</Alert>}
          {jobs.map((job) => (
            <Card key={job._id} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h5">{job.title}</Typography>
                  <Button variant="contained" component={RouterLink} to={`/apply/${job._id}`}>Apply</Button>
                </Box>
                <Typography color="text.secondary">{[job.department, job.location].filter(Boolean).join(' · ')}</Typography>
                <Box sx={{ my: 1 }}>
                  {(job.skills || '').split(',').map((s) => s.trim()).filter(Boolean).map((s) => <Chip key={s} size="small" label={s} sx={{ mr: 0.5 }} />)}
                </Box>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{job.description}</Typography>
              </CardContent>
            </Card>
          ))}
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Ask about our roles</Typography>
            <Box sx={{ maxHeight: 320, overflow: 'auto', mb: 1 }}>
              {chat.map((m, i) => (
                <Typography key={i} variant="body2" sx={{ mb: 1, textAlign: m.from === 'me' ? 'right' : 'left', whiteSpace: 'pre-wrap' }}
                  color={m.from === 'me' ? 'primary' : 'text.primary'}>{m.text}</Typography>
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" fullWidth placeholder="Type your question" value={question}
                onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && ask()} />
              <Button variant="outlined" onClick={ask}>Send</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

    </Container>
  );
};

export default Careers;
