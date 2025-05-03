import React, { createContext, useContext } from 'react';

// Create context
const AuthContext = createContext();

// Custom hook for using auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  // DEVELOPMENT MODE: Default admin user (all authentication disabled)
  const defaultUser = {
    id: "000000000000000000000001",
    username: "admin",
    role: "Admin",
    firstName: "Admin",
    lastName: "User",
    email: "admin@example.com"
  };

  // Simplified context value - all authentication disabled
  const value = {
    currentUser: defaultUser,
    token: 'dev-token',
    loading: false,
    error: null,
    login: () => Promise.resolve(defaultUser),
    register: () => Promise.resolve({ message: 'Success' }),
    logout: () => {},
    hasRole: () => true,
    isAuthenticated: true,
    isHR: () => true,
    isAdmin: () => true,
    isManager: () => true
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 