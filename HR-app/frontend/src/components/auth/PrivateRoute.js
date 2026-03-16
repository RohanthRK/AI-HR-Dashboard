import React from 'react';

// Authentication completely disabled - all routes are public
const PrivateRoute = ({ children }) => {
  // Simply render children without any authentication checks
  return children;
};

export default PrivateRoute; 