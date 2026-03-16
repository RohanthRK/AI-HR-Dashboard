import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

// Material UI components
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Collapse,
  Typography,
  useTheme,
  alpha,
  Button,
  Avatar,
  Tooltip,
  useMediaQuery,
  Paper
} from '@mui/material';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import GradingIcon from '@mui/icons-material/Grading';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BarChartIcon from '@mui/icons-material/BarChart';
import TimelineIcon from '@mui/icons-material/Timeline';
import SettingsIcon from '@mui/icons-material/Settings';
import ChatIcon from '@mui/icons-material/Chat';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import WorkIcon from '@mui/icons-material/Work';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PsychologyIcon from '@mui/icons-material/Psychology';
import SchoolIcon from '@mui/icons-material/School';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GroupsIcon from '@mui/icons-material/Groups';
import BusinessIcon from '@mui/icons-material/Business';
import RateReviewIcon from '@mui/icons-material/RateReview';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import LogoutIcon from '@mui/icons-material/Logout';

const drawerWidth = 240;

// Animation variants
const sidebarVariants = {
  open: {
    width: drawerWidth,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  },
  closed: {
    width: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      staggerChildren: 0.05,
      staggerDirection: -1
    }
  }
};

const itemVariants = {
  open: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  },
  closed: {
    opacity: 0,
    x: -20,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30
    }
  }
};

const Sidebar = ({ open }) => {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [analyticsOpen, setAnalyticsOpen] = useState(location.pathname.startsWith('/analytics'));
  const [aiToolsOpen, setAiToolsOpen] = useState(location.pathname.startsWith('/ai-tools'));
  const [reviewsOpen, setReviewsOpen] = useState(location.pathname.startsWith('/reviews'));
  
  // Navigation items with access control
  const navigationItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
      roles: [],  // Accessible by all roles
      color: theme.palette.primary.main
    },
    {
      text: 'Employee Directory',
      icon: <PeopleIcon />,
      path: '/employees',
      roles: [],  // Accessible by all roles
      color: theme.palette.primary.dark
    },
    {
      text: 'Teams',
      icon: <GroupsIcon />,
      path: '/teams',
      roles: [],  // Accessible by all roles
      color: theme.palette.secondary.main
    },
    {
      text: 'Reviews',
      icon: <RateReviewIcon />,
      path: '/reviews',
      roles: [],  // Accessible by all roles
      color: theme.palette.info.main,
      subItems: [
        {
          text: 'Employee Performance Review',
          icon: <GradingIcon />,
          path: '/reviews',
          roles: [],  // Accessible by all roles
          color: theme.palette.info.main
        },
        {
          text: 'Team Performance Review',
          icon: <GradingIcon />,
          path: '/reviews/team-performance-review',
          roles: [],  // Accessible by all roles
          color: theme.palette.info.main
        }
      ]
    },
    {
      text: 'Attendance',
      icon: <AccessTimeIcon />,
      path: '/attendance',
      roles: [],  // Accessible by all roles
      color: theme.palette.success.main
    },
    {
      text: 'Leave Management',
      icon: <EventBusyIcon />,
      path: '/leaves',
      roles: [],  // Accessible by all roles
      color: theme.palette.warning.main
    },
    {
      text: 'Payroll',
      icon: <AttachMoneyIcon />,
      path: '/payroll',
      roles: [],  // Accessible by all roles
      color: theme.palette.error.main
    },
    {
      text: 'Analytics',
      icon: <BarChartIcon />,
      path: '/analytics',
      roles: ['Admin', 'Manager'],  // Restricted to Admin and Manager
      color: theme.palette.primary.dark,
      subItems: [
        {
          text: 'Overview',
          icon: <BarChartIcon />,
          path: '/analytics',
          roles: ['Admin', 'Manager'],
          color: theme.palette.primary.dark
        },
        {
          text: 'Advanced Analytics',
          icon: <TimelineIcon />,
          path: '/analytics/advanced',
          roles: ['Admin', 'Manager'],
          color: theme.palette.primary.dark
        }
      ]
    },
    {
      text: 'HR Tools',
      icon: <SmartToyIcon />,
      path: '/ai-tools',
      roles: ['Admin', 'HR'],  // Restricted to Admin and HR
      color: '#7209b7',
      subItems: [
        {
          text: 'Resume Screening',
          icon: <PersonSearchIcon />,
          path: '/ai-tools/resume-screening',
          roles: ['Admin', 'HR'],
          color: '#7209b7'
        },
        {
          text: 'Job Matching',
          icon: <WorkIcon />,
          path: '/ai-tools/job-matching',
          roles: ['Admin', 'HR'],
          color: '#7209b7'
        },
        {
          text: 'Performance Review',
          icon: <AssessmentIcon />,
          path: '/ai-tools/performance-review',
          roles: ['Admin', 'HR', 'Manager'],
          color: '#7209b7'
        },
        {
          text: 'Skills Assessment',
          icon: <SchoolIcon />,
          path: '/ai-tools/skills-assessment',
          roles: ['Admin', 'HR'],
          color: '#7209b7'
        },
        {
          text: 'Talent Insights',
          icon: <AutoAwesomeIcon />,
          path: '/ai-tools/talent-insights',
          roles: ['Admin', 'HR'],
          color: '#7209b7'
        }
      ]
    },
    {
      text: 'Recruitment',
      icon: <WorkIcon />,
      path: '/recruitment',
      roles: ['Admin', 'HR'],  // Restricted to Admin and HR
      color: theme.palette.secondary.dark
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      path: '/settings',
      roles: ['Admin'],  // Restricted to Admin
      color: theme.palette.grey[700]
    },
    {
      text: 'AI Assistant',
      icon: <ChatIcon />,
      path: '/chat',
      roles: [],  // Accessible by all roles
      color: theme.palette.secondary.main
    }
  ];

  // Filter items based on user role
  const filteredItems = navigationItems.filter(item => 
    !item.roles?.length || hasRole(item.roles)
  );

  // Handle navigation
  const handleNavigation = (path) => {
    navigate(path);
  };

  // Toggle analytics submenu
  const handleToggleAnalytics = () => {
    setAnalyticsOpen(!analyticsOpen);
  };

  // Toggle AI tools submenu
  const handleToggleAiTools = () => {
    setAiToolsOpen(!aiToolsOpen);
  };

  // Toggle Reviews submenu
  const handleToggleReviews = () => {
    setReviewsOpen(!reviewsOpen);
  };

  // Check if the current path matches the navigation item
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path;
  };

  // Check if an item with subitems is active
  const isParentActive = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: 'none',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
          bgcolor: 'background.paper',
          overflow: 'hidden',
        },
        '& .MuiListItemButton-root': {
          borderRadius: '0 20px 20px 0',
          mx: 1,
          my: 0.5,
        }
      }}
    >
      <Toolbar sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        py: 2
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: theme.palette.primary.main,
          borderRadius: '50%',
          width: 48,
          height: 48,
          mr: 1
        }}>
          <BusinessIcon sx={{ color: 'white', fontSize: 28 }} />
        </Box>
        <Typography 
          variant="h6" 
          noWrap 
          component="div" 
          sx={{ 
            fontWeight: 700,
            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          HR MANAGER
        </Typography>
      </Toolbar>
      
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          mb: 2
        }}
      >
        <Paper 
          elevation={0} 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            px: 2, 
            py: 1.5, 
            borderRadius: 2,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
            width: '88%'
          }}
        >
          <Avatar 
            sx={{ 
              width: 36, 
              height: 36, 
              bgcolor: theme.palette.primary.main,
              mr: 1.5
            }}
          >
            A
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              Admin User
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Administrator
            </Typography>
          </Box>
        </Paper>
      </Box>
      
      <Divider sx={{ mb: 1 }} />
      
      <Box sx={{ overflow: 'auto', px: 1, height: 'calc(100% - 180px)' }}>
        <List sx={{ pt: 0 }}>
          <AnimatePresence>
            {filteredItems.map((item) => (
              <React.Fragment key={item.text}>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ListItem disablePadding>
                    {item.subItems ? (
                      <Tooltip title={!open ? item.text : ''} placement="right">
                        <ListItemButton 
                          onClick={
                            item.text === 'Analytics' ? handleToggleAnalytics : 
                            item.text === 'HR Tools' ? handleToggleAiTools :
                            item.text === 'Reviews' ? handleToggleReviews : null
                          }
                          sx={{ 
                            py: 1.2,
                            pl: 2,
                            bgcolor: isParentActive(item.path) ? alpha(item.color || theme.palette.primary.main, 0.12) : 'transparent',
                            '&:hover': {
                              bgcolor: alpha(item.color || theme.palette.primary.main, 0.08)
                            },
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': isParentActive(item.path) ? {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 4,
                              height: '60%',
                              borderRadius: '0 4px 4px 0',
                              backgroundColor: item.color || theme.palette.primary.main
                            } : {}
                          }}
                        >
                          <ListItemIcon 
                            sx={{ 
                              minWidth: 40,
                              color: isParentActive(item.path) ? item.color || theme.palette.primary.main : 'inherit' 
                            }}
                          >
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: isParentActive(item.path) ? 600 : 400,
                                  color: isParentActive(item.path) ? theme.palette.text.primary : theme.palette.text.secondary 
                                }}
                              >
                                {item.text}
                              </Typography>
                            } 
                          />
                          {item.text === 'Analytics' ? (analyticsOpen ? <ExpandLess /> : <ExpandMore />) : 
                           item.text === 'HR Tools' ? (aiToolsOpen ? <ExpandLess /> : <ExpandMore />) :
                           item.text === 'Reviews' ? (reviewsOpen ? <ExpandLess /> : <ExpandMore />) : null}
                        </ListItemButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title={!open ? item.text : ''} placement="right">
                        <ListItemButton
                          onClick={() => handleNavigation(item.path)}
                          sx={{ 
                            py: 1.2,
                            pl: 2,
                            bgcolor: isActive(item.path) ? alpha(item.color || theme.palette.primary.main, 0.12) : 'transparent',
                            '&:hover': {
                              bgcolor: alpha(item.color || theme.palette.primary.main, 0.08)
                            },
                            position: 'relative',
                            overflow: 'hidden',
                            '&::before': isActive(item.path) ? {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 4,
                              height: '60%',
                              borderRadius: '0 4px 4px 0',
                              backgroundColor: item.color || theme.palette.primary.main
                            } : {}
                          }}
                        >
                          <ListItemIcon 
                            sx={{ 
                              minWidth: 40,
                              color: isActive(item.path) ? item.color || theme.palette.primary.main : 'inherit' 
                            }}
                          >
                            {item.icon}
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: isActive(item.path) ? 600 : 400,
                                  color: isActive(item.path) ? theme.palette.text.primary : theme.palette.text.secondary 
                                }}
                              >
                                {item.text}
                              </Typography>
                            } 
                          />
                        </ListItemButton>
                      </Tooltip>
                    )}
                  </ListItem>
                  
                  {/* Analytics submenu */}
                  {item.text === 'Analytics' && (
                    <Collapse in={analyticsOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.subItems.map(subItem => (
                          <ListItem key={subItem.text} disablePadding>
                            <ListItemButton 
                              onClick={() => handleNavigation(subItem.path)}
                              sx={{ 
                                py: 1,
                                pl: 6,
                                bgcolor: isActive(subItem.path) ? alpha(subItem.color || theme.palette.primary.main, 0.12) : 'transparent',
                                '&:hover': {
                                  bgcolor: alpha(subItem.color || theme.palette.primary.main, 0.08)
                                },
                                borderRadius: '0 20px 20px 0',
                                mx: 1,
                                my: 0.25
                              }}
                            >
                              <ListItemIcon 
                                sx={{ 
                                  minWidth: 36,
                                  color: isActive(subItem.path) ? subItem.color || theme.palette.primary.main : 'inherit',
                                  fontSize: '1.2rem' 
                                }}
                              >
                                {subItem.icon}
                              </ListItemIcon>
                              <ListItemText 
                                primary={
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: isActive(subItem.path) ? 600 : 400,
                                      fontSize: '0.875rem',
                                      color: isActive(subItem.path) ? theme.palette.text.primary : theme.palette.text.secondary
                                    }}
                                  >
                                    {subItem.text}
                                  </Typography>
                                } 
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </Collapse>
                  )}
                  
                  {/* AI Tools submenu */}
                  {item.text === 'HR Tools' && (
                    <Collapse in={aiToolsOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.subItems.map(subItem => (
                          <ListItem key={subItem.text} disablePadding>
                            <ListItemButton 
                              onClick={() => handleNavigation(subItem.path)}
                              sx={{ 
                                py: 1,
                                pl: 6,
                                bgcolor: isActive(subItem.path) ? alpha(subItem.color || theme.palette.primary.main, 0.12) : 'transparent',
                                '&:hover': {
                                  bgcolor: alpha(subItem.color || theme.palette.primary.main, 0.08)
                                },
                                borderRadius: '0 20px 20px 0',
                                mx: 1,
                                my: 0.25
                              }}
                            >
                              <ListItemIcon 
                                sx={{ 
                                  minWidth: 36,
                                  color: isActive(subItem.path) ? subItem.color || theme.palette.primary.main : 'inherit',
                                  fontSize: '1.2rem' 
                                }}
                              >
                                {subItem.icon}
                              </ListItemIcon>
                              <ListItemText 
                                primary={
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: isActive(subItem.path) ? 600 : 400,
                                      fontSize: '0.875rem',
                                      color: isActive(subItem.path) ? theme.palette.text.primary : theme.palette.text.secondary
                                    }}
                                  >
                                    {subItem.text}
                                  </Typography>
                                } 
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </Collapse>
                  )}
                  
                  {/* Reviews submenu */}
                  {item.text === 'Reviews' && (
                    <Collapse in={reviewsOpen} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {item.subItems.map(subItem => (
                          <ListItem key={subItem.text} disablePadding>
                            <ListItemButton 
                              onClick={() => handleNavigation(subItem.path)}
                              sx={{ 
                                py: 1,
                                pl: 6,
                                bgcolor: isActive(subItem.path) ? alpha(subItem.color || theme.palette.primary.main, 0.12) : 'transparent',
                                '&:hover': {
                                  bgcolor: alpha(subItem.color || theme.palette.primary.main, 0.08)
                                },
                                borderRadius: '0 20px 20px 0',
                                mx: 1,
                                my: 0.25
                              }}
                            >
                              <ListItemIcon 
                                sx={{ 
                                  minWidth: 36,
                                  color: isActive(subItem.path) ? subItem.color || theme.palette.primary.main : 'inherit',
                                  fontSize: '1.2rem' 
                                }}
                              >
                                {subItem.icon}
                              </ListItemIcon>
                              <ListItemText 
                                primary={
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontWeight: isActive(subItem.path) ? 600 : 400,
                                      fontSize: '0.875rem',
                                      color: isActive(subItem.path) ? theme.palette.text.primary : theme.palette.text.secondary
                                    }}
                                  >
                                    {subItem.text}
                                  </Typography>
                                } 
                              />
                            </ListItemButton>
                          </ListItem>
                        ))}
                      </List>
                    </Collapse>
                  )}
                </motion.div>
              </React.Fragment>
            ))}
          </AnimatePresence>
        </List>
      </Box>

      <Box sx={{ p: 2, mt: 'auto' }}>
        <Divider sx={{ mb: 2 }} />
        <Button
          variant="outlined"
          fullWidth
          startIcon={<SupportAgentIcon />}
          sx={{ 
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            py: 1
          }}
        >
          Help Center
        </Button>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 