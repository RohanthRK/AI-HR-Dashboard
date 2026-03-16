import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

// Material UI components
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemButton,
  Chip,
  useTheme,
  alpha,
  InputBase,
  Button,
  ButtonGroup
} from '@mui/material';

// Icons
import MenuIcon from '@mui/icons-material/Menu';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SearchIcon from '@mui/icons-material/Search';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const Header = ({ sidebarOpen, toggleSidebar }) => {
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [notificationsAnchor, setNotificationsAnchor] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  
  const { currentUser, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const theme = useTheme();
  
  const userMenuOpen = Boolean(userMenuAnchor);
  const notificationsOpen = Boolean(notificationsAnchor);

  // User profile menu handlers
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  // Notifications menu handlers
  const handleNotificationsOpen = (event) => {
    setNotificationsAnchor(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationsAnchor(null);
  };

  // Logout handler
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Profile handler
  const handleProfile = () => {
    handleUserMenuClose();
    navigate(`/employees/${currentUser?.id}`);
  };

  // Settings handler
  const handleSettings = () => {
    handleUserMenuClose();
    navigate('/settings');
  };

  // Notification click handler
  const handleNotificationClick = (notification) => {
    markAsRead(notification._id);
    
    // Navigate based on notification type
    if (notification.type === 'leave_request' && notification.reference_id) {
      navigate(`/leaves/pending`);
    } else if (notification.type === 'leave_update' && notification.reference_id) {
      navigate(`/leaves`);
    } else if (notification.type === 'review') {
      navigate(`/reviews`);
    }
    
    handleNotificationsClose();
  };

  // Mark all as read handler
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  // Search handler
  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchValue.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchValue)}`);
      setSearchValue('');
    }
  };

  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: alpha(theme.palette.background.paper, 0.9),
        backdropFilter: 'blur(8px)',
        color: theme.palette.text.primary,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}
      elevation={0}
    >
      <Toolbar sx={{ height: 64 }}>
        {/* Menu toggle button with animation */}
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <IconButton
            color="inherit"
            aria-label="toggle sidebar"
            onClick={toggleSidebar}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
        </motion.div>
        
        {/* App title */}
        <Typography 
          variant="h6" 
          noWrap 
          component="div" 
          sx={{ 
            display: { xs: 'none', sm: 'flex' },
            fontWeight: 700,
            background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mr: 2
          }}
        >
          HR DASHBOARD
        </Typography>

        {/* Search bar */}
        <Box 
          sx={{ 
            position: 'relative',
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.common.black, 0.05),
            '&:hover': {
              backgroundColor: alpha(theme.palette.common.black, 0.07),
            },
            marginRight: theme.spacing(2),
            marginLeft: 0,
            width: '100%',
            maxWidth: 400,
            display: { xs: 'none', md: 'block' }
          }}
        >
          <Box sx={{ padding: theme.spacing(0, 2), height: '100%', position: 'absolute', pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SearchIcon sx={{ color: alpha(theme.palette.common.black, 0.3) }} />
          </Box>
          <InputBase
            placeholder="Search employees, teams, or documents…"
            sx={{
              color: 'inherit',
              padding: theme.spacing(1, 1, 1, 0),
              paddingLeft: `calc(1em + ${theme.spacing(4)})`,
              transition: theme.transitions.create('width'),
              width: '100%',
            }}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={handleSearch}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />
        
        {/* Development Mode Indicator */}
        <Chip
          icon={<AdminPanelSettingsIcon />}
          label="ADMIN MODE"
          color="warning"
          variant="outlined"
          size="small"
          sx={{ 
            mr: 2, 
            display: { xs: 'none', md: 'flex' },
            borderWidth: 1,
            borderRadius: '16px',
            '& .MuiChip-label': {
              fontWeight: 500
            }
          }}
        />
        
        {/* Help button */}
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Tooltip title="Help & Documentation">
            <IconButton color="inherit" sx={{ mr: 1 }}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </motion.div>
        
        {/* Notifications */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Tooltip title="Notifications">
              <IconButton 
                color="inherit" 
                onClick={handleNotificationsOpen}
                aria-controls={notificationsOpen ? 'notifications-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={notificationsOpen ? 'true' : undefined}
              >
                <Badge 
                  badgeContent={unreadCount} 
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.7rem',
                      height: 18,
                      minWidth: 18,
                      fontWeight: 'bold'
                    }
                  }}
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>
          </motion.div>
          
          {/* Notifications Menu */}
          <Menu
            id="notifications-menu"
            anchorEl={notificationsAnchor}
            open={notificationsOpen}
            onClose={handleNotificationsClose}
            PaperProps={{
              elevation: 2,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 4px 20px rgba(0,0,0,0.15))',
                mt: 1.5,
                maxHeight: 420,
                width: 350,
                borderRadius: 2,
                '& .MuiAvatar-root': {
                  width: 38,
                  height: 38,
                  ml: -0.5,
                  mr: 1,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Notifications</Typography>
              {unreadCount > 0 && (
                <Tooltip title="Mark all as read">
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <IconButton size="small" onClick={handleMarkAllAsRead} color="primary">
                      <CheckCircleIcon fontSize="small" />
                    </IconButton>
                  </motion.div>
                </Tooltip>
              )}
            </Box>
            <Divider />
            <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
              {notifications.length > 0 ? (
                <List sx={{ p: 0 }}>
                  <AnimatePresence>
                    {notifications.map((notification, index) => (
                      <motion.div
                        key={notification._id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <ListItem 
                          disablePadding 
                          sx={{ 
                            backgroundColor: notification.read ? 'transparent' : alpha(theme.palette.primary.main, 0.08)
                          }}
                        >
                          <ListItemButton 
                            onClick={() => handleNotificationClick(notification)}
                            sx={{
                              '&:hover': {
                                backgroundColor: alpha(theme.palette.primary.main, 0.12)
                              },
                              borderLeft: notification.read ? 'none' : `3px solid ${theme.palette.primary.main}`,
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: notification.read ? alpha(theme.palette.grey[500], 0.7) : theme.palette.primary.main }}>
                                {notification.type === 'leave_request' ? 'L' : 
                                 notification.type === 'leave_update' ? 'LU' : 
                                 notification.type === 'system' ? 'S' : 'N'}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText 
                              primary={notification.title} 
                              secondary={
                                <React.Fragment>
                                  <Typography
                                    variant="body2"
                                    color="text.primary"
                                    sx={{
                                      display: 'block',
                                      fontWeight: notification.read ? 'normal' : 'medium',
                                      mb: 0.5
                                    }}
                                  >
                                    {notification.message}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {notification.timestamp || '2 hours ago'}
                                  </Typography>
                                </React.Fragment>
                              }
                              primaryTypographyProps={{
                                fontWeight: notification.read ? 'medium' : 'bold',
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                        {index < notifications.length - 1 && <Divider component="li" />}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </List>
              ) : (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <NotificationsOffIcon color="disabled" sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                  <Typography color="text.secondary" variant="body1">No notifications yet</Typography>
                  <Typography color="text.disabled" variant="caption" sx={{ display: 'block', mt: 1 }}>
                    We'll notify you when something important happens
                  </Typography>
                </Box>
              )}
            </Box>
            <Divider />
            <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
              <Button 
                size="small" 
                onClick={() => {
                  handleNotificationsClose();
                  navigate('/dashboard/notifications');
                }}
                sx={{ borderRadius: 4, fontSize: '0.75rem' }}
              >
                View All Notifications
              </Button>
            </Box>
          </Menu>
          
          {/* User Profile */}
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <Tooltip title="Account settings">
              <IconButton
                onClick={handleUserMenuOpen}
                aria-controls={userMenuOpen ? 'user-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={userMenuOpen ? 'true' : undefined}
                color="inherit"
                sx={{ ml: 1 }}
              >
                <Avatar 
                  alt={currentUser?.name || "User"} 
                  src="/static/images/avatar/1.jpg"
                  sx={{ 
                    width: 36, 
                    height: 36,
                    bgcolor: theme.palette.primary.main,
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
                  }}
                >
                  {currentUser?.name ? currentUser.name.charAt(0) : "U"}
                </Avatar>
              </IconButton>
            </Tooltip>
          </motion.div>
          
          {/* User Menu */}
          <Menu
            id="user-menu"
            anchorEl={userMenuAnchor}
            open={userMenuOpen}
            onClose={handleUserMenuClose}
            PaperProps={{
              elevation: 2,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 4px 20px rgba(0,0,0,0.15))',
                mt: 1.5,
                minWidth: 220,
                borderRadius: 2,
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1.5,
                  my: 0.5,
                  mx: 1,
                  borderRadius: 1,
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08)
                  }
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <Box sx={{ px: 3, py: 2, textAlign: 'center' }}>
              <Avatar 
                alt={currentUser?.name || "User"} 
                src="/static/images/avatar/1.jpg"
                sx={{ 
                  width: 56, 
                  height: 56, 
                  mb: 1,
                  mx: 'auto',
                  bgcolor: theme.palette.primary.main,
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`
                }}
              >
                {currentUser?.name ? currentUser.name.charAt(0) : "U"}
              </Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {currentUser?.name || 'Administrator'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {currentUser?.email || 'admin@example.com'}
              </Typography>
              <Chip 
                label={currentUser?.role || "Admin"} 
                size="small" 
                color="primary" 
                sx={{ mt: 0.5, fontWeight: 500 }} 
                variant="outlined"
              />
            </Box>
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={handleProfile}>
              <PersonIcon sx={{ mr: 1.5 }} fontSize="small" />
              <Typography variant="body2">My Profile</Typography>
            </MenuItem>
            <MenuItem onClick={handleSettings}>
              <SettingsIcon sx={{ mr: 1.5 }} fontSize="small" />
              <Typography variant="body2">Settings</Typography> 
            </MenuItem>
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={handleLogout} sx={{ color: theme.palette.error.main }}>
              <LogoutIcon sx={{ mr: 1.5 }} fontSize="small" />
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 