import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Auth
import Login from './pages/auth/Login';
import PrivateRoute from './components/auth/PrivateRoute';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Directory from './pages/employees/Directory';
import EmployeeProfile from './pages/employees/EmployeeProfile';
import Attendance from './pages/attendance/Attendance';
import AttendanceReport from './pages/attendance/AttendanceReport';
import Leaves from './pages/leaves/Leaves';
import LeaveRequest from './pages/leaves/LeaveRequest';
import PendingLeaves from './pages/leaves/PendingLeaves';
import Reviews from './pages/reviews/Reviews';
import TeamPerformanceReview from './pages/reviews/TeamPerformanceReview';
import EmployeePerformanceReview from './pages/reviews/EmployeePerformanceReview';
import Payroll from './pages/payroll/Payroll';
import Analytics from './pages/analytics/Analytics';
import AdvancedAnalytics from './pages/analytics/AdvancedAnalytics';
import Settings from './pages/settings/Settings';

// Teams Pages
import TeamsList from './pages/teams/TeamsList';
import TeamDetail from './pages/teams/TeamDetail';
import CreateTeam from './pages/teams/CreateTeam';
import EditTeam from './pages/teams/EditTeam';

// AI Tools
import ResumeScreening from './pages/ai-tools/ResumeScreening';
import JobMatching from './pages/ai-tools/JobMatching';
import SkillsAssessment from './pages/ai-tools/SkillsAssessment';
import PerformanceReview from './pages/ai-tools/PerformanceReview';
import TalentInsights from './pages/ai-tools/TalentInsights';

// Context
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#3f51b5',
      light: '#757de8',
      dark: '#002984',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f50057',
      light: '#ff4081',
      dark: '#c51162',
      contrastText: '#ffffff',
    },
    tertiary: {
      main: '#00bcd4',
      light: '#80deea',
      dark: '#0097a7',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
      dark: '#388e3c',
    },
    info: {
      main: '#2196f3',
      light: '#64b5f6',
      dark: '#1976d2',
    },
    warning: {
      main: '#ff9800',
      light: '#ffb74d',
      dark: '#f57c00',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
      dark: '#d32f2f',
    },
    background: {
      default: '#f9fafb',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#5f6368',
    },
    divider: 'rgba(0, 0, 0, 0.08)',
  },
  typography: {
    fontFamily: [
      'Inter',
      'Roboto',
      '"Segoe UI"',
      '-apple-system',
      'BlinkMacSystemFont',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      letterSpacing: '-0.01562em',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      letterSpacing: '-0.00833em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      letterSpacing: '0em',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      letterSpacing: '0.00735em',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      letterSpacing: '0em',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      letterSpacing: '0.0075em',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0px 2px 1px -1px rgba(0,0,0,0.04), 0px 1px 1px 0px rgba(0,0,0,0.03), 0px 1px 3px 0px rgba(0,0,0,0.02)',
    '0px 3px 3px -2px rgba(0,0,0,0.05), 0px 2px 6px 0px rgba(0,0,0,0.04), 0px 1px 8px 0px rgba(0,0,0,0.03)',
    '0px 3px 4px -2px rgba(0,0,0,0.06), 0px 3px 8px 0px rgba(0,0,0,0.05), 0px 1px 14px 0px rgba(0,0,0,0.04)',
    '0px 2px 5px -1px rgba(0,0,0,0.08), 0px 4px 10px 0px rgba(0,0,0,0.07), 0px 1px 16px 0px rgba(0,0,0,0.06)',
    '0px 3px 6px -1px rgba(0,0,0,0.09), 0px 6px 12px 0px rgba(0,0,0,0.08), 0px 1px 18px 0px rgba(0,0,0,0.07)',
    '0px 3px 8px -1px rgba(0,0,0,0.1), 0px 8px 16px 0px rgba(0,0,0,0.09), 0px 1px 24px 0px rgba(0,0,0,0.08)',
    '0px 4px 10px -2px rgba(0,0,0,0.11), 0px 10px 20px 0px rgba(0,0,0,0.1), 0px 2px 32px 0px rgba(0,0,0,0.09)',
    '0px 5px 12px -3px rgba(0,0,0,0.12), 0px 12px 24px 0px rgba(0,0,0,0.11), 0px 2px 40px 0px rgba(0,0,0,0.1)',
    '0px 6px 14px -4px rgba(0,0,0,0.13), 0px 14px 28px 0px rgba(0,0,0,0.12), 0px 4px 48px 0px rgba(0,0,0,0.11)',
    '0px 7px 16px -4px rgba(0,0,0,0.14), 0px 16px 32px 0px rgba(0,0,0,0.13), 0px 4px 64px 0px rgba(0,0,0,0.12)',
    '0px 8px 18px -5px rgba(0,0,0,0.15), 0px 18px 36px 0px rgba(0,0,0,0.14), 0px 4px 80px 0px rgba(0,0,0,0.13)',
    '0px 9px 20px -5px rgba(0,0,0,0.16), 0px 20px 40px 0px rgba(0,0,0,0.15), 0px 4px 96px 0px rgba(0,0,0,0.14)',
    '0px 10px 22px -6px rgba(0,0,0,0.17), 0px 22px 44px 0px rgba(0,0,0,0.16), 0px 8px 112px 0px rgba(0,0,0,0.15)',
    '0px 11px 24px -6px rgba(0,0,0,0.18), 0px 24px 48px 0px rgba(0,0,0,0.17), 0px 8px 128px 0px rgba(0,0,0,0.16)',
    '0px 12px 26px -7px rgba(0,0,0,0.19), 0px 26px 52px 0px rgba(0,0,0,0.18), 0px 8px 144px 0px rgba(0,0,0,0.17)',
    '0px 13px 28px -7px rgba(0,0,0,0.2), 0px 28px 56px 0px rgba(0,0,0,0.19), 0px 8px 160px 0px rgba(0,0,0,0.18)',
    '0px 14px 30px -8px rgba(0,0,0,0.21), 0px 30px 60px 0px rgba(0,0,0,0.2), 0px 8px 176px 0px rgba(0,0,0,0.19)',
    '0px 15px 32px -8px rgba(0,0,0,0.22), 0px 32px 64px 0px rgba(0,0,0,0.21), 0px 8px 192px 0px rgba(0,0,0,0.2)',
    '0px 16px 34px -9px rgba(0,0,0,0.23), 0px 34px 68px 0px rgba(0,0,0,0.22), 0px 8px 208px 0px rgba(0,0,0,0.21)',
    '0px 17px 36px -9px rgba(0,0,0,0.24), 0px 36px 72px 0px rgba(0,0,0,0.23), 0px 8px 224px 0px rgba(0,0,0,0.22)',
    '0px 18px 38px -10px rgba(0,0,0,0.25), 0px 38px 76px 0px rgba(0,0,0,0.24), 0px 8px 240px 0px rgba(0,0,0,0.23)',
    '0px 19px 40px -10px rgba(0,0,0,0.26), 0px 40px 80px 0px rgba(0,0,0,0.25), 0px 8px 256px 0px rgba(0,0,0,0.24)',
    '0px 20px 42px -11px rgba(0,0,0,0.27), 0px 42px 84px 0px rgba(0,0,0,0.26), 0px 8px 272px 0px rgba(0,0,0,0.25)',
    '0px 21px 44px -11px rgba(0,0,0,0.28), 0px 44px 88px 0px rgba(0,0,0,0.27), 0px 8px 288px 0px rgba(0,0,0,0.26)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontSize: '0.95rem',
          boxShadow: 'none',
          padding: '8px 16px',
          fontWeight: 500,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
          },
        },
        contained: {
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 12px 20px rgba(0, 0, 0, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 16,
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 10px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              {/* Redirect login to dashboard - authentication disabled */}
              <Route path="/login" element={<Navigate to="/" replace />} />
              
              {/* Main routes - no authentication required */}
              <Route path="/" element={<Layout><Dashboard /></Layout>} />
              <Route path="/employees" element={<Layout><Directory /></Layout>} />
              <Route path="/employees/:id" element={<Layout><EmployeeProfile /></Layout>} />
              <Route path="/attendance" element={<Layout><Attendance /></Layout>} />
              <Route path="/attendance/report/:employeeId/:year/:month" element={<Layout><AttendanceReport /></Layout>} />
              <Route path="/leaves" element={<Layout><Leaves /></Layout>} />
              <Route path="/leaves/request" element={<Layout><LeaveRequest /></Layout>} />
              <Route path="/leaves/pending" element={<Layout><PendingLeaves /></Layout>} />
              <Route path="/reviews" element={<Layout><Reviews /></Layout>} />
              <Route path="/reviews/team-performance-review" element={<Layout><TeamPerformanceReview /></Layout>} />
              <Route path="/reviews/employee/:employeeId" element={<Layout><EmployeePerformanceReview /></Layout>} />
              <Route path="/payroll" element={<Layout><Payroll /></Layout>} />
              <Route path="/analytics" element={<Layout><Analytics /></Layout>} />
              <Route path="/analytics/advanced" element={<Layout><AdvancedAnalytics /></Layout>} />
              <Route path="/settings" element={<Layout><Settings /></Layout>} />
              
              {/* Teams Routes */}
              <Route path="/teams" element={<Layout><TeamsList /></Layout>} />
              <Route path="/teams/:id" element={<Layout><TeamDetail /></Layout>} />
              <Route path="/teams/create" element={<Layout><CreateTeam /></Layout>} />
              <Route path="/teams/:id/edit" element={<Layout><EditTeam /></Layout>} />
              
              {/* AI HR Tools Routes - no authentication required */}
              <Route path="/ai-tools/resume-screening" element={<Layout><ResumeScreening /></Layout>} />
              <Route path="/ai-tools/job-matching" element={<Layout><JobMatching /></Layout>} />
              <Route path="/ai-tools/skills-assessment" element={<Layout><SkillsAssessment /></Layout>} />
              <Route path="/ai-tools/performance-review" element={<Layout><PerformanceReview /></Layout>} />
              <Route path="/ai-tools/talent-insights" element={<Layout><TalentInsights /></Layout>} />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
