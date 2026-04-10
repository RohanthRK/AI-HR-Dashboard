import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

// PrivateRoute component to guard protected routes
const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, currentUser, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login but save the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role authorization if roles are specified
  if (allowedRoles && allowedRoles.length > 0) {
    if (!hasRole(allowedRoles)) {
      // User's role is not authorized, redirect to home/dashboard
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default PrivateRoute;