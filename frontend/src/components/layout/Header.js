import { useCompanyName } from '../../utils/company';
import React, { useState, useEffect, useRef } from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../contexts/AuthContext';

import NotificationMenu from '../notifications/NotificationMenu';

import { useColorMode } from '../../contexts/ThemeContext';

import { motion, AnimatePresence } from 'framer-motion';


// Material UI components
import {
  AppBar,
  Avatar,
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
  ListItemButton,
  Chip,
  useTheme,
  alpha,
  InputBase,
  Button,
} from '@mui/material';

// Icons
import MenuIcon from '@mui/icons-material/Menu';


import LogoutIcon from '@mui/icons-material/Logout';
import LockResetIcon from '@mui/icons-material/LockReset';
import ChangePasswordDialog from '../auth/ChangePasswordDialog';

import SettingsIcon from '@mui/icons-material/Settings';

import PersonIcon from '@mui/icons-material/Person';



import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import SearchIcon from '@mui/icons-material/Search';

import DarkModeIcon from '@mui/icons-material/DarkMode';

import LightModeIcon from '@mui/icons-material/LightMode';

import HelpOutlineIcon from '@mui/icons-material/HelpOutline';


const Header = ({ sidebarOpen, toggleSidebar }) => {
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchInputRef = useRef(null);

  const { currentUser, logout } = useAuth();
  const { mode, toggleColorMode } = useColorMode();
  const companyName = useCompanyName();
  const navigate = useNavigate();
  const theme = useTheme();

  const userMenuOpen = Boolean(userMenuAnchor);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.altKey || e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // User profile menu handlers
  const handleUserMenuOpen = (event) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfile = () => {
    handleUserMenuClose();
    navigate(`/employees/${currentUser?.employee_id || currentUser?.id}`);
  };

  const handleSettings = () => {
    handleUserMenuClose();
    navigate('/settings');
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
          {(companyName || 'HR Dashboard').toUpperCase()}
        </Typography>

        {/* Universal Command Center (Search bar) */}
        <Box
          sx={{
            position: 'relative',
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            border: '3px solid #000000',
            boxShadow: '4px 4px 0px #000000',
            marginRight: theme.spacing(2),
            marginLeft: 0,
            width: '100%',
            maxWidth: 500,
            transition: 'all 0.1s ease',
            '&:focus-within': {
              boxShadow: '2px 2px 0px #000000',
              transform: 'translate(2px, 2px)'
            }
          }}
        >
          <Box sx={{ padding: theme.spacing(0, 2), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SearchIcon sx={{ color: '#000000' }} />
          </Box>
          <InputBase
            inputRef={searchInputRef}
            placeholder="Search employees or actions (Ex: Apply Leave)"
            sx={{
              color: '#000000',
              fontWeight: 600,
              width: '100%',
              '& .MuiInputBase-input': {
                padding: theme.spacing(1, 1, 1, 0),
              },
              '& .MuiInputBase-input::placeholder': { color: '#555555', opacity: 1 }
            }}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyPress={handleSearch}
          />
          <Box sx={{ pr: 1.5 }}>
            <Chip
              label="Alt + K"
              size="small"
              sx={{
                bgcolor: '#000000',
                color: '#FFFFFF',
                fontWeight: 800,
                borderRadius: 0,
                height: 24,
                fontSize: '0.7rem'
              }}
            />
          </Box>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        {/* Shown to administrators only */}
        {currentUser?.role === 'Admin' && (
          <Chip
            icon={<AdminPanelSettingsIcon />}
            label="ADMIN"
            variant="outlined"
            size="small"
            sx={{
              mr: 2,
              color: mode === 'light' ? '#9a3412' : '#fdba74',
              borderColor: mode === 'light' ? '#9a3412' : '#fdba74',
              '& .MuiChip-icon': { color: 'inherit' },
              display: { xs: 'none', md: 'flex' },
              borderWidth: 1,
              borderRadius: '16px',
              '& .MuiChip-label': {
                fontWeight: 500
              }
            }}
          />
        )}

        {/* Theme Toggle */}
        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Tooltip title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
            <IconButton color="inherit" onClick={toggleColorMode} sx={{ mr: 1 }}>
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
        </motion.div>

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
          <NotificationMenu />

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
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: theme.palette.primary.main,
                    border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`
                  }}
                >
                  {(currentUser?.first_name || currentUser?.name || currentUser?.username || "U").charAt(0).toUpperCase()}
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
                {(currentUser?.first_name || currentUser?.name || currentUser?.username || "U").charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', mb: 0.5 }}>
                {currentUser?.first_name && currentUser?.last_name 
                  ? `${currentUser.first_name} ${currentUser.last_name}` 
                  : (currentUser?.name || currentUser?.username || 'User')}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                {currentUser?.email}
              </Typography>

              <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center' }}>
                <Chip
                  label={currentUser?.role || "Employee"}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 800, borderRadius: 0, border: '2px solid #000', mb: 1 }}
                />
                
                {currentUser?.department && (
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                    Dept: {currentUser.department}
                  </Typography>
                )}
                
                {currentUser?.team && (
                  <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                    Team: {currentUser.team}
                  </Typography>
                )}
              </Box>
            </Box>
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={handleProfile}>
              <PersonIcon sx={{ mr: 1.5 }} fontSize="small" />
              <Typography variant="body2">My Profile</Typography>
            </MenuItem>
            <MenuItem onClick={() => { handleUserMenuClose(); setPasswordOpen(true); }}>
              <LockResetIcon sx={{ mr: 1.5 }} fontSize="small" />
              <Typography variant="body2">Change password</Typography>
            </MenuItem>
            {currentUser?.role === 'Admin' && (
              <MenuItem onClick={handleSettings}>
                <SettingsIcon sx={{ mr: 1.5 }} fontSize="small" />
                <Typography variant="body2">Settings</Typography>
              </MenuItem>
            )}
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={handleLogout} sx={{ color: theme.palette.error.main }}>
              <LogoutIcon sx={{ mr: 1.5 }} fontSize="small" />
              <Typography variant="body2">Logout</Typography>
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </AppBar>
  );
};

export default Header;