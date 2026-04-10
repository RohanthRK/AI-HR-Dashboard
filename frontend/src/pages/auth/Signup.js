import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Button, TextField,
    Grid, FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Alert, Snackbar, InputAdornment,
    IconButton, Autocomplete, useTheme
} from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import authService from '../../services/authService';
import employeeService from '../../services/employeeService';
import { useSnackbar } from 'notistack';

const Signup = () => {
    const theme = useTheme();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role_id: '',
        employee_id: ''
    });
    const [roles, setRoles] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetchingEmployees, setFetchingEmployees] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    useEffect(() => {
        fetchRoles();
        fetchEmployees();
    }, []);

    const fetchRoles = async () => {
        try {
            const data = await authService.getRoles();
            setRoles(data.roles || []);
        } catch (error) {
            console.error('Error fetching roles:', error);
            enqueueSnackbar('Failed to load roles', { variant: 'error' });
        }
    };

    const fetchEmployees = async () => {
        setFetchingEmployees(true);
        try {
            const data = await employeeService.getAllEmployees();
            setEmployees(data || []);
        } catch (error) {
            console.error('Error fetching employees:', error);
            enqueueSnackbar('Failed to load employee list', { variant: 'error' });
        } finally {
            setFetchingEmployees(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await authService.register(formData);
            enqueueSnackbar('User created and linked successfully!', { variant: 'success' });
            setFormData({ username: '', email: '', password: '', role_id: '', employee_id: '' });
        } catch (error) {
            console.error('Signup error:', error);
            const message = error.response?.data?.message || 'Error creating user';
            enqueueSnackbar(message, { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 4, bgcolor: 'background.default', minHeight: '100vh' }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <PersonAddIcon sx={{ fontSize: 40, color: '#000' }} />
                <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1 }}>
                    USER CREDENTIAL MANAGEMENT
                </Typography>
            </Box>

            <Paper sx={{ p: 0, border: theme.palette.mode === 'dark' ? '3px solid #fff' : '3px solid #000', bgcolor: 'background.paper', borderRadius: 0, boxShadow: theme.palette.mode === 'dark' ? '8px 8px 0px #FFD700' : '8px 8px 0px #000', overflow: 'hidden' }}>
                <Box sx={{ bgcolor: 'action.hover', p: 2, borderBottom: theme.palette.mode === 'dark' ? '3px solid #fff' : '3px solid #000', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ bgcolor: 'background.paper', borderRadius: '50%', p: 0.5, border: theme.palette.mode === 'dark' ? '2px solid #fff' : '2px solid #000', display: 'flex' }}>
                        <IconButton size="small" disabled color="primary">
                            <PersonAddIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                        Admin Portal: Create login credentials for new employees. Ensure the email matches the employee's official record.
                    </Typography>
                </Box>

                <Box component="form" onSubmit={handleSignup} sx={{ p: 6 }}>
                    <Grid container spacing={4}>
                        <Grid item xs={12}>
                            <Autocomplete
                                options={employees}
                                getOptionLabel={(option) => `${option.first_name} ${option.last_name} (${option.employee_id || option.email})`}
                                onChange={(event, newValue) => {
                                    setFormData({
                                        ...formData,
                                        email: newValue ? newValue.email : '',
                                        employee_id: newValue ? (newValue.employee_id || newValue._id) : ''
                                    });
                                }}
                                loading={fetchingEmployees}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="1. Select Existing Employee *"
                                        variant="outlined"
                                        required
                                        helperText="Start typing to search the directory..."
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <React.Fragment>
                                                    {fetchingEmployees ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </React.Fragment>
                                            ),
                                        }}
                                        sx={{ 
                                            '& .MuiOutlinedInput-root': {
                                                borderWidth: '2px',
                                                borderColor: '#000',
                                                borderRadius: 0,
                                                '& fieldset': { borderColor: '#000' },
                                                '&:hover fieldset': { borderColor: '#000' },
                                                '&.Mui-focused fieldset': { borderColor: '#000' }
                                            }
                                        }}
                                    />
                                )}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Username *"
                                name="username"
                                value={formData.username}
                                onChange={handleInputChange}
                                required
                                placeholder="e.g. john.doe"
                                sx={{ borderRadius: 0, '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: 'background.paper' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Official Email *"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                                disabled={!!formData.employee_id}
                                helperText={formData.employee_id ? "Linked to employee record" : ""}
                                sx={{ borderRadius: 0, '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: 'background.paper' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Initial Password *"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={handleInputChange}
                                required
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ borderRadius: 0, '& .MuiOutlinedInput-root': { borderRadius: 0, bgcolor: 'background.paper' } }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Assign Role</InputLabel>
                                <Select
                                    name="role_id"
                                    value={formData.role_id}
                                    label="Assign Role"
                                    onChange={handleInputChange}
                                    sx={{ borderRadius: 0 }}
                                >
                                    {roles.map((role) => (
                                        <MenuItem key={role._id} value={role._id}>
                                            {role.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <Button
                                fullWidth
                                type="submit"
                                variant="contained"
                                disabled={loading}
                                sx={{
                                    py: 2,
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold',
                                    bgcolor: '#fcc419',
                                    color: '#000',
                                    border: '3px solid #000',
                                    borderRadius: 0,
                                    boxShadow: '4px 4px 0px #000',
                                    '&:hover': {
                                        bgcolor: '#fab005',
                                        boxShadow: '2px 2px 0px #000',
                                        transform: 'translate(2px, 2px)'
                                    },
                                    transition: 'all 0.1s'
                                }}
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : 'CREATE & LINK CREDENTIALS'}
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>

            <Box sx={{ mt: 6, p: 3, bgcolor: 'action.hover', border: theme.palette.mode === 'dark' ? '2px dashed #fff' : '2px dashed #000' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>SECURITY GUIDELINES</Typography>
                <Typography variant="body2" component="div">
                    <ul>
                        <li>Credentials created here grant immediate access to the portal.</li>
                        <li>Temporary passwords should be changed by the employee upon first login.</li>
                        <li>Only <strong>Admin</strong> users can see this page.</li>
                    </ul>
                </Typography>
            </Box>
        </Box>
    );
};

export default Signup;
