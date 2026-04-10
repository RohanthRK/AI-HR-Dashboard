import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

// Material UI components
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  useTheme,
  Grid,
  alpha,
  InputAdornment
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

const Login = () => {
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }
    try {
      setError('');
      setLoading(true);
      await login(username, password);
      navigate(from, { replace: true });
    } catch (error) {
      setError(
        error.response?.data?.message ||
        'Failed to sign in. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme.palette.mode === 'dark';
  const brutalBorder = isDark ? '4px solid #fff' : '4px solid #000';
  const brutalShadow = isDark ? '8px 8px 0px #fcc419' : '8px 8px 0px #000';

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      bgcolor: 'background.default',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'auto'
    }}>
      <Grid container sx={{ flexGrow: 1 }}>
        {/* Left Side: Branding/Illustration */}
        <Grid item xs={12} md={6} sx={{ 
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: '#fcc419',
          color: '#000',
          p: 8,
          borderRight: '6px solid #000',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative Background Pattern */}
          <Box sx={{ 
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: 'radial-gradient(#000 2px, transparent 0)',
            backgroundSize: '40px 40px',
            opacity: 0.1,
            zIndex: 0
          }} />
          
          <Box sx={{ zIndex: 1, textAlign: 'center' }}>
            <RocketLaunchIcon sx={{ fontSize: 120, mb: 4, transform: 'rotate(-10deg)' }} />
            <Typography variant="h1" sx={{ fontWeight: 900, fontSize: '5rem', letterSpacing: -3, lineHeight: 0.9, mb: 2, textTransform: 'uppercase' }}>
              LEVEL UP<br/>YOUR WORK
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, bgcolor: '#000', color: '#fcc419', display: 'inline-block', px: 2, py: 1 }}>
              Unified HR Ecosystem
            </Typography>
          </Box>
          
          <Box sx={{ position: 'absolute', bottom: 40, left: 40, right: 40, display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 900 }}>© 2026 HR-APP CORE</Typography>
            <Typography sx={{ fontWeight: 900 }}>v4.0.2-BRUTAL</Typography>
          </Box>
        </Grid>

        {/* Right Side: Login Form */}
        <Grid item xs={12} md={6} sx={{ 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 4, md: 10 }
        }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              width: '100%',
              maxWidth: 450,
              bgcolor: 'background.paper',
              border: brutalBorder,
              boxShadow: brutalShadow,
              borderRadius: 0,
              position: 'relative'
            }}
          >
            <Box sx={{ position: 'absolute', top: -30, right: 20, bgcolor: '#000', color: '#fff', px: 2, py: 0.5, border: brutalBorder, fontWeight: 900, textTransform: 'uppercase' }}>
              Secure Access
            </Box>

            <Typography component="h1" variant="h3" sx={{ mb: 1, fontWeight: 900, textTransform: 'uppercase', letterSpacing: -1 }}>
              HR PORTAL
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary', fontWeight: 700 }}>
              Enter your credentials to manage your workplace.
            </Typography>

            {error && (
              <Alert severity="error" variant="filled" sx={{ width: '100%', mb: 3, borderRadius: 0, fontWeight: 800, border: '2px solid #000' }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonOutlineIcon sx={{ color: isDark ? '#fcc419' : '#000' }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 0, border: brutalBorder, fontWeight: 700, '& fieldset': { border: 'none' } }
                }}
                InputLabelProps={{ sx: { fontWeight: 900, color: isDark ? '#fff' : '#000' } }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: isDark ? '#fcc419' : '#000' }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 0, border: brutalBorder, fontWeight: 700, '& fieldset': { border: 'none' } }
                }}
                InputLabelProps={{ sx: { fontWeight: 900, color: isDark ? '#fff' : '#000' } }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{ 
                  mt: 4, 
                  mb: 2, 
                  py: 2, 
                  fontSize: '1.2rem', 
                  fontWeight: 900,
                  bgcolor: '#fcc419',
                  color: '#000',
                  borderRadius: 0,
                  border: brutalBorder,
                  boxShadow: isDark ? '4px 4px 0px #fff' : '4px 4px 0px #000',
                  '&:hover': {
                    bgcolor: '#eebd15',
                    boxShadow: '2px 2px 0px #000',
                    transform: 'translate(2px, 2px)'
                  },
                  transition: 'all 0.1s'
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'ENTER SYSTEM'}
              </Button>
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', opacity: 0.7 }}>
                  Forgot your credentials? Contact IT Support
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Login;
 