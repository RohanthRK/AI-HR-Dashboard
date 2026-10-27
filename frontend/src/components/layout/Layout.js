import React, { useState } from 'react';
import { Alert, Box, Button, CssBaseline, Snackbar, useTheme, useMediaQuery } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';
import HRChatbot from '../chat/HRChatbot';
import api, { OFFLINE_EVENT, ONLINE_EVENT } from '../../services/api';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { setCompanyGeneral, useCompanyName } from '../../utils/company';

// Browser-tab titles, longest matching prefix wins
const PAGE_TITLES = {
  '/': 'Dashboard', '/employees': 'Employee Directory', '/teams': 'Teams', '/performance': 'Performance',
  '/attendance': 'Attendance', '/leaves': 'Leave', '/leaves/request': 'Request leave', '/leaves/pending': 'Pending leave',
  '/payroll': 'Payroll', '/notifications': 'Notifications', '/analytics': 'Analytics', '/training': 'Training',
  '/surveys': 'Surveys', '/compliance': 'Compliance', '/recognition': 'Recognition', '/onboarding': 'Onboarding',
  '/offboarding': 'Exit management', '/recruitment': 'Recruitment', '/settings': 'Settings', '/signup': 'User management',
  '/expenses': 'Expenses', '/assets': 'Assets', '/helpdesk': 'Helpdesk', '/reviews': 'Reviews',
  '/ai-tools/resume-screening': 'Resume screening', '/ai-tools/job-matching': 'Job matching',
  '/ai-tools/skills-assessment': 'Skills assessment', '/ai-tools/performance-review': 'Performance review',
  '/ai-tools/talent-insights': 'Talent insights',
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { pathname } = useLocation();
  const companyName = useCompanyName();
  const navigate = useNavigate();
  const { incoming, dismissIncoming, markAsRead } = useNotifications();
  const toast = incoming[0];

  React.useEffect(() => {
    const key = Object.keys(PAGE_TITLES).filter((k) => pathname === k || (k !== '/' && pathname.startsWith(k + '/'))).sort((a, b) => b.length - a.length)[0];
    document.title = [key ? PAGE_TITLES[key] : null, companyName || 'HR Dashboard'].filter(Boolean).join(' · ');
  }, [pathname, companyName]);
  
  // Tell the user when the server cannot be reached, instead of leaving pages that look empty
  const [offline, setOffline] = useState(false);
  React.useEffect(() => {
    const down = () => setOffline(true);
    const up = () => setOffline(false);
    window.addEventListener(OFFLINE_EVENT, down);
    window.addEventListener(ONLINE_EVENT, up);
    return () => {
      window.removeEventListener(OFFLINE_EVENT, down);
      window.removeEventListener(ONLINE_EVENT, up);
    };
  }, []);

  // Show times in the company's timezone
  React.useEffect(() => {
    api.get('/api/settings/').then((res) => setCompanyGeneral(res.data?.general)).catch(() => {});
  }, []);

  // Auto-collapse sidebar on mobile
  React.useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile]);
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh',
      bgcolor: 'background.default'
    }}>
      <CssBaseline />
      
      {/* Top navigation bar */}
      <Header sidebarOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Sidebar */}
      <AnimatePresence>
        <Sidebar open={sidebarOpen} />
      </AnimatePresence>
      
      {/* Main content */}
      <Box sx={{ flexGrow: 1, minWidth: 0, overflowX: 'hidden', position: 'relative', zIndex: 1 }}>
        <Box
          component="main"
          sx={{
            p: { xs: 2, sm: 3 },
            pt: { xs: 2, sm: 3 },
            pb: { xs: 6, sm: 6 }, // Extra padding at bottom for scrolling
            mt: 8, // Below app bar
            minHeight: 'calc(100vh - 64px)',
            borderTopLeftRadius: sidebarOpen && !isMobile ? 40 : 0,
            overflow: 'auto',
            transition: 'border-radius 0.3s ease',
            // pages wrapped in a <Container> should line up with the others
            '& > .MuiContainer-root': { px: 0, py: 0, maxWidth: 'none' },
          }}
        >
          {offline && (
            <Alert
              severity="error"
              role="alert"
              sx={{ mb: 2, border: '3px solid #000', borderRadius: 0, fontWeight: 700 }}
              action={<Button color="inherit" size="small" onClick={() => window.location.reload()}>Retry</Button>}
            >
              Cannot reach the server. What you see may be out of date. Check your connection and try again.
            </Alert>
          )}
          {children}
        </Box>
      </Box>

      {/* A notification arrived while you were working */}
      <Snackbar open={Boolean(toast)} autoHideDuration={7000} onClose={(e, reason) => { if (reason !== 'clickaway') dismissIncoming(); }} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        {toast ? (
          <Alert severity="info" variant="filled" sx={{ cursor: toast.link ? 'pointer' : 'default', border: '3px solid #000', borderRadius: 0, fontWeight: 700, alignItems: 'center' }}
            onClose={dismissIncoming}
            onClick={() => { markAsRead(toast._id); dismissIncoming(); if (toast.link) navigate(toast.link); }}>
            <b>{toast.title}</b>{incoming.length > 1 ? ` (+${incoming.length - 1} more)` : ''}<br />{toast.message}
          </Alert>
        ) : <span />}
      </Snackbar>

      {/* Floating HR assistant (every authenticated page) */}
      <HRChatbot />
    </Box>
  );
};

export default Layout; 