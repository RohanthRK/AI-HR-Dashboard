import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Auth
import Login from './pages/auth/Login';
import PrivateRoute from './components/auth/PrivateRoute';

// Layout
import Layout from './components/layout/Layout';
import HRChatbot from './components/chat/HRChatbot';

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
import MyReviews from './pages/reviews/MyReviews';
import Objectives from './pages/objectives/Objectives';
import Payroll from './pages/payroll/Payroll';
import Analytics from './pages/analytics/Analytics';
import AdvancedAnalytics from './pages/analytics/AdvancedAnalytics';
import Settings from './pages/settings/Settings';
import Performance from './pages/performance/Performance';

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

// Phase 2 Keka Features
import Expenses from './pages/expenses/Expenses';
import Assets from './pages/assets/Assets';
import Helpdesk from './pages/helpdesk/Helpdesk';
import Signup from './pages/auth/Signup';

// Context
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ColorModeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ColorModeProvider>
      <CssBaseline />
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Routes>
              {/* Login route */}
              <Route path="/login" element={<Login />} />

              {/* Protected routes */}
              <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
              <Route path="/employees" element={<PrivateRoute><Layout><Directory /></Layout></PrivateRoute>} />
              <Route path="/employees/:id" element={<PrivateRoute><Layout><EmployeeProfile /></Layout></PrivateRoute>} />
              <Route path="/attendance" element={<PrivateRoute><Layout><Attendance /></Layout></PrivateRoute>} />
              <Route path="/attendance/report/:employeeId/:year/:month" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><AttendanceReport /></Layout></PrivateRoute>} />
              <Route path="/leaves" element={<PrivateRoute><Layout><Leaves /></Layout></PrivateRoute>} />
              <Route path="/leaves/request" element={<PrivateRoute><Layout><LeaveRequest /></Layout></PrivateRoute>} />
              <Route path="/leaves/pending" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><PendingLeaves /></Layout></PrivateRoute>} />
              <Route path="/performance" element={<PrivateRoute><Layout><Performance /></Layout></PrivateRoute>} />
              <Route path="/reviews/employee/:employeeId" element={<PrivateRoute allowedRoles={['Admin', 'Manager', 'HR']}><Layout><EmployeePerformanceReview /></Layout></PrivateRoute>} />
              <Route path="/payroll" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><Payroll /></Layout></PrivateRoute>} />
              <Route path="/analytics" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><Analytics /></Layout></PrivateRoute>} />
              <Route path="/analytics/advanced" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><AdvancedAnalytics /></Layout></PrivateRoute>} />
              <Route path="/settings" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><Settings /></Layout></PrivateRoute>} />

              {/* Teams Routes */}
              <Route path="/teams" element={<PrivateRoute><Layout><TeamsList /></Layout></PrivateRoute>} />
              <Route path="/teams/:id" element={<PrivateRoute><Layout><TeamDetail /></Layout></PrivateRoute>} />
              <Route path="/teams/create" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><CreateTeam /></Layout></PrivateRoute>} />
              <Route path="/teams/:id/edit" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><EditTeam /></Layout></PrivateRoute>} />

              {/* AI HR Tools Routes */}
              <Route path="/ai-tools/resume-screening" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><ResumeScreening /></Layout></PrivateRoute>} />
              <Route path="/ai-tools/job-matching" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><JobMatching /></Layout></PrivateRoute>} />
              <Route path="/ai-tools/skills-assessment" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><SkillsAssessment /></Layout></PrivateRoute>} />
              <Route path="/ai-tools/performance-review" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><PerformanceReview /></Layout></PrivateRoute>} />
              <Route path="/ai-tools/talent-insights" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><TalentInsights /></Layout></PrivateRoute>} />

              {/* Phase 2 Keka Features */}
              <Route path="/expenses" element={<PrivateRoute><Layout><Expenses /></Layout></PrivateRoute>} />
              <Route path="/assets" element={<PrivateRoute><Layout><Assets /></Layout></PrivateRoute>} />
              <Route path="/helpdesk" element={<PrivateRoute><Layout><Helpdesk /></Layout></PrivateRoute>} />
              <Route path="/signup" element={<PrivateRoute allowedRoles={['Admin']}><Layout><Signup /></Layout></PrivateRoute>} />
              <Route path="/search" element={<Navigate to="/employees" replace />} />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ColorModeProvider>
  );
}

export default App;
