import React, { useState, useEffect, lazy, Suspense } from 'react';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import CssBaseline from '@mui/material/CssBaseline';

import Box from '@mui/material/Box';

import CircularProgress from '@mui/material/CircularProgress';


// Auth
import Login from './pages/auth/Login';

import PrivateRoute from './components/auth/PrivateRoute';


// Layout
import Layout from './components/layout/Layout';


// Pages
import { AuthProvider } from './contexts/AuthContext';

import { NotificationProvider } from './contexts/NotificationContext';

import { ColorModeProvider } from './contexts/ThemeContext';


const Dashboard = lazy(() => import('./pages/Dashboard'));
const Directory = lazy(() => import('./pages/employees/Directory'));
const EmployeeProfile = lazy(() => import('./pages/employees/EmployeeProfile'));
const Attendance = lazy(() => import('./pages/attendance/Attendance'));
const Leaves = lazy(() => import('./pages/leaves/Leaves'));
const LeaveRequest = lazy(() => import('./pages/leaves/LeaveRequest'));
const PendingLeaves = lazy(() => import('./pages/leaves/PendingLeaves'));
const EmployeePerformanceReview = lazy(() => import('./pages/reviews/EmployeePerformanceReview'));
const Payroll = lazy(() => import('./pages/payroll/Payroll'));
const Analytics = lazy(() => import('./pages/analytics/Analytics'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const Performance = lazy(() => import('./pages/performance/Performance'));

// Teams Pages
const TeamsList = lazy(() => import('./pages/teams/TeamsList'));
const TeamDetail = lazy(() => import('./pages/teams/TeamDetail'));
const CreateTeam = lazy(() => import('./pages/teams/CreateTeam'));
const EditTeam = lazy(() => import('./pages/teams/EditTeam'));

// AI Tools
const ResumeScreening = lazy(() => import('./pages/ai-tools/ResumeScreening'));
const JobMatching = lazy(() => import('./pages/ai-tools/JobMatching'));
const SkillsAssessment = lazy(() => import('./pages/ai-tools/SkillsAssessment'));
const PerformanceReview = lazy(() => import('./pages/ai-tools/PerformanceReview'));
const TalentInsights = lazy(() => import('./pages/ai-tools/TalentInsights'));

// Phase 2 Keka Features
const Expenses = lazy(() => import('./pages/expenses/Expenses'));
const Assets = lazy(() => import('./pages/assets/Assets'));
const Helpdesk = lazy(() => import('./pages/helpdesk/Helpdesk'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const RecruitmentPage = lazy(() => import('./pages/recruitment/RecruitmentPage'));
const Training = lazy(() => import('./pages/training/Training'));
const Surveys = lazy(() => import('./pages/surveys/Surveys'));
const Offboarding = lazy(() => import('./pages/offboarding/Offboarding'));
const Onboarding = lazy(() => import('./pages/onboarding/Onboarding'));
const Careers = lazy(() => import('./pages/careers/Careers'));
const ApplyPage = lazy(() => import('./pages/careers/ApplyPage'));
const Recognition = lazy(() => import('./pages/recognition/Recognition'));
const Compliance = lazy(() => import('./pages/compliance/Compliance'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));

// Context

function App() {
  return (
    <ColorModeProvider>
      <CssBaseline />
      <AuthProvider>
        <NotificationProvider>
          <Router>
            <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>}>
            <Routes>
              {/* Login route */}
              <Route path="/login" element={<Login />} />
              <Route path="/careers" element={<Careers />} />
              <Route path="/apply/:jobId" element={<ApplyPage />} />

              {/* Protected routes */}
              <Route path="/" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
              <Route path="/employees" element={<PrivateRoute><Layout><Directory /></Layout></PrivateRoute>} />
              <Route path="/employees/:id" element={<PrivateRoute><Layout><EmployeeProfile /></Layout></PrivateRoute>} />
              <Route path="/attendance" element={<PrivateRoute><Layout><Attendance /></Layout></PrivateRoute>} />
              <Route path="/leaves" element={<PrivateRoute><Layout><Leaves /></Layout></PrivateRoute>} />
              <Route path="/leaves/request" element={<PrivateRoute><Layout><LeaveRequest /></Layout></PrivateRoute>} />
              <Route path="/leaves/pending" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><PendingLeaves /></Layout></PrivateRoute>} />
              <Route path="/performance" element={<PrivateRoute><Layout><Performance /></Layout></PrivateRoute>} />
              <Route path="/reviews/employee/:employeeId" element={<PrivateRoute allowedRoles={['Admin', 'Manager', 'HR']}><Layout><EmployeePerformanceReview /></Layout></PrivateRoute>} />
              <Route path="/notifications" element={<PrivateRoute><Layout><NotificationsPage /></Layout></PrivateRoute>} />
              <Route path="/payroll" element={<PrivateRoute><Layout><Payroll /></Layout></PrivateRoute>} />
              <Route path="/analytics" element={<PrivateRoute allowedRoles={['Admin']}><Layout><Analytics /></Layout></PrivateRoute>} />
              <Route path="/analytics/advanced" element={<Navigate to="/analytics" replace />} />
              <Route path="/settings" element={<PrivateRoute allowedRoles={['Admin']}><Layout><Settings /></Layout></PrivateRoute>} />

              {/* Teams Routes */}
              <Route path="/teams" element={<PrivateRoute><Layout><TeamsList /></Layout></PrivateRoute>} />
              <Route path="/teams/:id" element={<PrivateRoute><Layout><TeamDetail /></Layout></PrivateRoute>} />
              <Route path="/teams/create" element={<PrivateRoute allowedRoles={['Admin']}><Layout><CreateTeam /></Layout></PrivateRoute>} />
              <Route path="/teams/:id/edit" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><EditTeam /></Layout></PrivateRoute>} />

              {/* AI HR Tools Routes */}
              <Route path="/ai-tools/resume-screening" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><ResumeScreening /></Layout></PrivateRoute>} />
              <Route path="/ai-tools/job-matching" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><JobMatching /></Layout></PrivateRoute>} />
              <Route path="/ai-tools/skills-assessment" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><SkillsAssessment /></Layout></PrivateRoute>} />
              <Route path="/ai-tools/performance-review" element={<PrivateRoute allowedRoles={['Admin', 'Manager']}><Layout><PerformanceReview /></Layout></PrivateRoute>} />
              <Route path="/ai-tools/talent-insights" element={<PrivateRoute allowedRoles={['Admin']}><Layout><TalentInsights /></Layout></PrivateRoute>} />

              {/* Phase 2 Keka Features */}
              <Route path="/expenses" element={<PrivateRoute><Layout><Expenses /></Layout></PrivateRoute>} />
              <Route path="/assets" element={<PrivateRoute><Layout><Assets /></Layout></PrivateRoute>} />
              <Route path="/helpdesk" element={<PrivateRoute><Layout><Helpdesk /></Layout></PrivateRoute>} />
              <Route path="/recruitment" element={<PrivateRoute allowedRoles={['Admin', 'Manager', 'HR']}><Layout><RecruitmentPage /></Layout></PrivateRoute>} />
              <Route path="/training" element={<PrivateRoute><Layout><Training /></Layout></PrivateRoute>} />
              <Route path="/surveys" element={<PrivateRoute><Layout><Surveys /></Layout></PrivateRoute>} />
              <Route path="/recognition" element={<PrivateRoute><Layout><Recognition /></Layout></PrivateRoute>} />
              <Route path="/onboarding" element={<PrivateRoute><Layout><Onboarding /></Layout></PrivateRoute>} />
              <Route path="/offboarding" element={<PrivateRoute><Layout><Offboarding /></Layout></PrivateRoute>} />
              <Route path="/compliance" element={<PrivateRoute allowedRoles={['Admin']}><Layout><Compliance /></Layout></PrivateRoute>} />
              <Route path="/help-center" element={<Navigate to="/helpdesk" replace />} />
              <Route path="/signup" element={<PrivateRoute allowedRoles={['Admin']}><Layout><Signup /></Layout></PrivateRoute>} />
              <Route path="/search" element={<Navigate to="/employees" replace />} />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </Router>
        </NotificationProvider>
      </AuthProvider>
    </ColorModeProvider>
  );
}

export default App;
