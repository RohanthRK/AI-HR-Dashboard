import React, { useState } from 'react';
import { Box, CssBaseline, useTheme, useMediaQuery } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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

  // Animation variants for main content
  const contentVariants = {
    wide: { 
      marginLeft: isMobile ? 0 : '240px',
      width: isMobile ? '100%' : 'calc(100% - 240px)',
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    narrow: { 
      marginLeft: 0,
      width: '100%',
      transition: { duration: 0.3, ease: 'easeInOut' }
    }
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
      <motion.div
        initial={false}
        animate={sidebarOpen && !isMobile ? 'wide' : 'narrow'}
        variants={contentVariants}
        style={{
          flexGrow: 1,
          overflowX: 'hidden',
          position: 'relative',
          zIndex: 1
        }}
      >
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
          }}
        >
          {children}
        </Box>
      </motion.div>
    </Box>
  );
};

export default Layout; 