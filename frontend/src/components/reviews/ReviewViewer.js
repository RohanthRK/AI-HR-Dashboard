import React from 'react';
import { Box, Chip, Divider, LinearProgress, List, ListItem, ListItemText, Typography } from '@mui/material';

const LABELS = { overall: 'Overall' };
const label = (key) => LABELS[key] || key.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

const Bullets = ({ title, items }) => (Array.isArray(items) && items.length ? (
  <Box sx={{ mb: 2 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>{title}</Typography>
    <List dense disablePadding>
      {items.map((t, i) => <ListItem key={i} disableGutters sx={{ py: 0.25 }}><ListItemText primary={`• ${typeof t === 'string' ? t : JSON.stringify(t)}`} /></ListItem>)}
    </List>
  </Box>
) : null);

/** Read-only view of a generated individual or team review (the shape the AI review endpoints return). */
const ReviewViewer = ({ review, comment }) => {
  if (!review) return null;
  const ratings = review.ratings || {};
  const entries = Object.entries(ratings).filter(([, v]) => typeof v === 'number');
  const max = entries.some(([, v]) => v > 5) ? 100 : 5;
  const pct = (v) => Math.min(100, Math.round((v / max) * 100));
  return (
    <Box>
      {comment && (
        <Box sx={{ p: 2, mb: 2, border: '2px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>NOTE FROM YOUR MANAGER</Typography>
          <Typography>{comment}</Typography>
        </Box>
      )}
      {review.summary && <Typography sx={{ mb: 2 }}>{review.summary}</Typography>}
      {entries.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 1 }}>Ratings</Typography>
          {entries.map(([key, value]) => (
            <Box key={key} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: key === 'overall' ? 800 : 400 }}>{label(key)}</Typography>
                <Typography variant="body2">{max === 100 ? `${Math.round(value)}/100` : `${Number(value).toFixed(1)}/5`}</Typography>
              </Box>
              <LinearProgress aria-label={`${label(key)} rating`} variant="determinate" value={pct(value)} sx={{ height: 8 }} />
            </Box>
          ))}
        </Box>
      )}
      <Bullets title="Strengths" items={review.strengths} />
      <Bullets title="Areas for improvement" items={review.areas_for_improvement} />
      <Bullets title="Key achievements" items={review.key_achievements || review.achievements} />
      <Bullets title="Goals" items={review.goals} />
      {review.career_growth && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase' }}>Career growth</Typography>
          {review.career_growth.recommendation && <Typography>{review.career_growth.recommendation}</Typography>}
          <Bullets title="Suggested training" items={review.career_growth.suggested_training} />
        </Box>
      )}
      {Array.isArray(review.members) && review.members.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, textTransform: 'uppercase', mb: 0.5 }}>Team members ({review.members.length})</Typography>
          {review.members.map((m, i) => <Chip key={i} size="small" sx={{ mr: 0.5, mb: 0.5 }} label={`${m.name}${m.position ? ` · ${m.position}` : ''}`} />)}
        </>
      )}
    </Box>
  );
};

export default ReviewViewer;
