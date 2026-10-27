import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Box, Button, Chip, IconButton, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Paper, Tab, Tabs, Tooltip, Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { useNotifications } from '../contexts/NotificationContext';
import { CATEGORIES, categoryIcon } from '../components/notifications/categoryIcon';
import { formatDateTime, timeAgo } from '../utils/format';

/** Everything that has been sent to the signed-in user, with unread / category filters. */
const NotificationsPage = () => {
  const { notifications, unreadCount, error, hasMore, loading, markAsRead, markAllAsRead, deleteNotification, clearRead, loadMore, fetchNotifications } = useNotifications();
  const [tab, setTab] = useState('all');
  const [category, setCategory] = useState('all');
  const navigate = useNavigate();

  const shown = notifications.filter((n) => (tab === 'all' || !n.read) && (category === 'all' || n.category === category));
  const present = new Set(notifications.map((n) => n.category));
  const readCount = notifications.filter((n) => n.read).length;

  const open = (n) => {
    if (!n.read) markAsRead(n._id);
    if (n.link) navigate(n.link);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
        <Typography variant="h4" component="h1">Notifications</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<DoneAllIcon />} disabled={!unreadCount} onClick={markAllAsRead}>Mark all as read</Button>
          <Button startIcon={<DeleteSweepIcon />} disabled={!readCount} onClick={clearRead}>Clear read</Button>
        </Box>
      </Box>
      {error && <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" size="small" onClick={fetchNotifications}>Retry</Button>}>{error}</Alert>}
      <Paper sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab value="all" label={`All (${notifications.length})`} />
          <Tab value="unread" label={`Unread (${unreadCount})`} />
        </Tabs>
        {present.size > 1 && (
          <Box sx={{ p: 1.5, display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            <Chip clickable label="Everything" color={category === 'all' ? 'primary' : 'default'} onClick={() => setCategory('all')} />
            {CATEGORIES.filter((c) => present.has(c)).map((c) => (
              <Chip key={c} clickable label={c} color={category === c ? 'primary' : 'default'} onClick={() => setCategory(c)} />
            ))}
          </Box>
        )}
      </Paper>
      <Paper>
        {shown.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <NotificationsOffIcon color="disabled" sx={{ fontSize: 56, mb: 1.5, opacity: 0.5 }} />
            <Typography variant="h6">{loading ? 'Loading…' : notifications.length ? 'Nothing matches this filter' : 'You are all caught up'}</Typography>
            <Typography color="text.secondary">{notifications.length ? 'Try another tab or category.' : 'Leave decisions, approvals, payslips, trainings and other updates will appear here.'}</Typography>
          </Box>
        ) : (
          <List disablePadding>
            {shown.map((n) => (
              <ListItem key={n._id} disablePadding divider sx={{ bgcolor: n.read ? 'transparent' : 'action.hover' }}
                secondaryAction={<Tooltip title="Remove"><IconButton edge="end" aria-label={`Remove notification: ${n.title}`} onClick={() => deleteNotification(n._id)}><CloseIcon /></IconButton></Tooltip>}>
                <ListItemButton onClick={() => open(n)} sx={{ pr: 8, borderLeft: '4px solid', borderLeftColor: n.read ? 'transparent' : 'primary.main' }}>
                  <ListItemAvatar><Avatar sx={{ bgcolor: n.read ? 'grey.500' : 'primary.main', color: n.read ? '#fff' : '#000' }}>{categoryIcon(n.category)}</Avatar></ListItemAvatar>
                  <ListItemText
                    primary={<>{n.title} {!n.read && <Chip size="small" label="New" color="primary" sx={{ ml: 1, height: 20 }} />}</>}
                    primaryTypographyProps={{ fontWeight: n.read ? 500 : 800 }}
                    secondary={<>
                      <Typography component="span" variant="body2" color="text.primary" sx={{ display: 'block' }}>{n.message}</Typography>
                      <Typography component="span" variant="caption" color="text.secondary" title={formatDateTime(n.created_at)}>{n.category} · {timeAgo(n.created_at)} · {formatDateTime(n.created_at)}</Typography>
                    </>}
                    secondaryTypographyProps={{ component: 'div' }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
        {hasMore && <Box sx={{ p: 2, textAlign: 'center' }}><Button onClick={loadMore}>Load older notifications</Button></Box>}
      </Paper>
    </Box>
  );
};

export default NotificationsPage;
