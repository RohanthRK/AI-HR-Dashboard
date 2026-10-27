import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Avatar, Badge, Box, Button, Divider, IconButton, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Menu, Tooltip, Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import CloseIcon from '@mui/icons-material/Close';
import { useNotifications } from '../../contexts/NotificationContext';
import { categoryIcon } from './categoryIcon';
import { formatDateTime, timeAgo } from '../../utils/format';

const MENU_SIZE = 8;

/** The bell in the top bar: unread badge, the latest notifications, and a link to the full page. */
const NotificationMenu = () => {
  const { notifications, unreadCount, error, markAsRead, markAllAsRead, deleteNotification, fetchNotifications } = useNotifications();
  const [anchor, setAnchor] = useState(null);
  const navigate = useNavigate();
  const close = () => setAnchor(null);

  const openMenu = (event) => {
    setAnchor(event.currentTarget);
    fetchNotifications();                       // always show what is current when the menu opens
  };

  const go = (notification) => {
    if (!notification.read) markAsRead(notification._id);
    close();
    if (notification.link) navigate(notification.link);
  };

  const shown = notifications.slice(0, MENU_SIZE);
  return (
    <>
      <Tooltip title={unreadCount ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}>
        <IconButton color="inherit" onClick={openMenu} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-haspopup="true" aria-expanded={Boolean(anchor)}>
          <Badge badgeContent={unreadCount} max={99} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', height: 18, minWidth: 18, fontWeight: 'bold' } }}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={close}
        PaperProps={{ sx: { mt: 1.5, width: { xs: 'calc(100vw - 32px)', sm: 380 }, maxHeight: 520, borderRadius: 2 } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Notifications {unreadCount > 0 && `(${unreadCount} new)`}</Typography>
          {unreadCount > 0 && <Button size="small" startIcon={<DoneAllIcon />} onClick={markAllAsRead}>Mark all read</Button>}
        </Box>
        <Divider />
        {error && <Alert severity="warning" sx={{ m: 1 }} action={<Button color="inherit" size="small" onClick={fetchNotifications}>Retry</Button>}>{error}</Alert>}
        <Box sx={{ maxHeight: 380, overflow: 'auto' }}>
          {shown.length > 0 ? (
            <List disablePadding>
              {shown.map((n) => (
                <ListItem
                  key={n._id}
                  disablePadding
                  divider
                  secondaryAction={<Tooltip title="Remove"><IconButton edge="end" size="small" aria-label={`Remove notification: ${n.title}`} onClick={() => deleteNotification(n._id)}><CloseIcon fontSize="small" /></IconButton></Tooltip>}
                  sx={{ bgcolor: n.read ? 'transparent' : 'action.hover' }}
                >
                  <ListItemButton onClick={() => go(n)} sx={{ pr: 6, borderLeft: '3px solid', borderLeftColor: n.read ? 'transparent' : 'primary.main' }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: n.read ? 'grey.500' : 'primary.main', color: n.read ? '#fff' : '#000', width: 38, height: 38 }}>{categoryIcon(n.category)}</Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={n.title}
                      primaryTypographyProps={{ fontWeight: n.read ? 500 : 800, variant: 'body2' }}
                      secondary={<>
                        <Typography component="span" variant="body2" color="text.primary" sx={{ display: 'block' }}>{n.message}</Typography>
                        <Typography component="span" variant="caption" color="text.secondary" title={formatDateTime(n.created_at)}>{n.category} · {timeAgo(n.created_at)}</Typography>
                      </>}
                      secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <NotificationsOffIcon color="disabled" sx={{ fontSize: 48, mb: 1.5, opacity: 0.5 }} />
              <Typography color="text.secondary">You are all caught up</Typography>
              <Typography color="text.disabled" variant="caption" sx={{ display: 'block', mt: 0.5 }}>New notifications show up here as they happen.</Typography>
            </Box>
          )}
        </Box>
        <Divider />
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          <Button size="small" onClick={() => { close(); navigate('/notifications'); }}>See all notifications</Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationMenu;
