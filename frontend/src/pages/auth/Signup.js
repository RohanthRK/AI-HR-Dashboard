import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  InputAdornment,
  IconButton,
  Autocomplete,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Chip,
  Avatar,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  LinearProgress,
  Stack,
  Alert,
  Divider
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SearchIcon from '@mui/icons-material/Search';
import SecurityIcon from '@mui/icons-material/Security';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import WorkIcon from '@mui/icons-material/Work';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import KeyIcon from '@mui/icons-material/Key';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import GroupIcon from '@mui/icons-material/Group';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import CheckIcon from '@mui/icons-material/Check';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LinkIcon from '@mui/icons-material/Link';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import authService from '../../services/authService';
import employeeService from '../../services/employeeService';
import teamService from '../../services/teamService';
import { useSnackbar } from 'notistack';

// Standard Department Options
const DEFAULT_DEPARTMENTS = [
  'Engineering',
  'Human Resources',
  'Marketing',
  'Sales',
  'Finance',
  'Product Design',
  'Operations',
  'Customer Success',
  'Legal'
];

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Intern'];

// Generate strong random password
const generatePassword = (length = 12) => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%^&*';
  const all = upper + lower + numbers + symbols;

  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += numbers[Math.floor(Math.random() * numbers.length)];
  pwd += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
};

// Auto-generate employee ID
const generateEmployeeId = () => {
  return `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
};

// Password strength calculation
const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'None', color: '#ced4da', percent: 0 };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: 'Weak', color: '#ff6b6b', percent: 25 };
    case 2:
      return { score: 2, label: 'Fair', color: '#ffa94d', percent: 50 };
    case 3:
      return { score: 3, label: 'Good', color: '#ffd43b', percent: 75 };
    case 4:
      return { score: 4, label: 'Strong', color: '#51cf66', percent: 100 };
    default:
      return { score: 0, label: 'Very Weak', color: '#fa5252', percent: 10 };
  }
};

const Signup = () => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const { enqueueSnackbar } = useSnackbar();

  // Page View Mode: 'list' (Directory Table) | 'create' (Add New Employee & Account Page) | 'link' (Link Existing Employee Page)
  const [viewMode, setViewMode] = useState('list');

  // Form State - Mode 1 (New Employee & Account)
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    personal_email: '',
    phone: '',
    employee_id: generateEmployeeId(),
    department: 'Engineering',
    position: 'Software Engineer',
    employment_type: 'Full-time',
    hire_date: new Date().toISOString().split('T')[0],
    gender: 'Prefer not to say',
    location: '',
    username: '',
    password: generatePassword(12),
    role_id: '',
    active: true,
  });

  // Form State - Mode 2 (Link Existing Employee)
  const [linkForm, setLinkForm] = useState({
    selectedEmployee: null,
    username: '',
    email: '',
    password: generatePassword(12),
    role_id: '',
    active: true,
  });

  // Application Data States
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [departmentsList, setDepartmentsList] = useState(DEFAULT_DEPARTMENTS);

  // Loading States
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(false);

  // Form helper controls
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Dialog States
  const [successReceipt, setSuccessReceipt] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editFormData, setEditFormData] = useState({ email: '', role_id: '', active: true, employee_id: '' });
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Initial Data Fetching
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([fetchRoles(), fetchEmployees(), fetchUsers(), fetchDepartments()]);
  };

  const fetchRoles = async () => {
    try {
      const data = await authService.getRoles();
      const loadedRoles = data.roles || [];
      setRoles(loadedRoles);
      if (loadedRoles.length > 0) {
        const defaultRole = loadedRoles.find(r => r.name?.toLowerCase() === 'employee') || loadedRoles[0];
        setNewEmployeeForm(prev => ({ ...prev, role_id: prev.role_id || defaultRole._id }));
        setLinkForm(prev => ({ ...prev, role_id: prev.role_id || defaultRole._id }));
      }
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

  const fetchUsers = async () => {
    setFetchingUsers(true);
    try {
      const data = await authService.getUsers();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      enqueueSnackbar('Failed to load user list', { variant: 'error' });
    } finally {
      setFetchingUsers(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const data = await teamService.getAllDepartments();
      if (data?.departments && Array.isArray(data.departments)) {
        const names = data.departments.map(d => d.name || d.department).filter(Boolean);
        if (names.length > 0) {
          setDepartmentsList(Array.from(new Set([...DEFAULT_DEPARTMENTS, ...names])));
        }
      }
    } catch (error) {
      // Graceful fallback
    }
  };

  // Compute unlinked employees (employees without user credentials)
  const unlinkedEmployees = useMemo(() => {
    const userEmployeeIds = new Set(
      users.map(u => String(u.employee_id || '')).filter(Boolean)
    );
    const userEmails = new Set(
      users.map(u => String(u.email || '').toLowerCase()).filter(Boolean)
    );

    return employees.filter(emp => {
      const empId = String(emp.employee_id || emp._id || '');
      const empDbId = String(emp._id || '');
      const empEmail = String(emp.email || '').toLowerCase();
      return !userEmployeeIds.has(empId) && !userEmployeeIds.has(empDbId) && !userEmails.has(empEmail);
    });
  }, [employees, users]);

  // Handle Mode 1 (New Employee Form) Inputs
  const handleNewEmployeeChange = (field, value) => {
    setNewEmployeeForm(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-suggest username when first or last name changes
      if (field === 'first_name' || field === 'last_name') {
        const first = field === 'first_name' ? value : prev.first_name;
        const last = field === 'last_name' ? value : prev.last_name;
        if (first || last) {
          const sanitized = `${first?.toLowerCase() || ''}.${last?.toLowerCase() || ''}`
            .replace(/[^a-z0-9.]/g, '')
            .replace(/^\.|\.$/g, '');
          updated.username = sanitized;
        }
      }

      // Auto-suggest email when names change if email is empty or looks auto-generated
      if (field === 'first_name' || field === 'last_name') {
        const first = field === 'first_name' ? value : prev.first_name;
        const last = field === 'last_name' ? value : prev.last_name;
        if ((first || last) && (!prev.email || prev.email.includes('@company.com'))) {
          const sanitized = `${first?.toLowerCase() || ''}.${last?.toLowerCase() || ''}`
            .replace(/[^a-z0-9.]/g, '')
            .replace(/^\.|\.$/g, '');
          if (sanitized) {
            updated.email = `${sanitized}@company.com`;
          }
        }
      }

      return updated;
    });
  };

  // Submit Handler: Mode 1 (Create New Employee & Account)
  const handleCreateNewEmployeeAndAccount = async (e) => {
    e.preventDefault();

    if (!newEmployeeForm.first_name || !newEmployeeForm.last_name) {
      enqueueSnackbar('Please provide both first and last name.', { variant: 'warning' });
      return;
    }
    if (!newEmployeeForm.email) {
      enqueueSnackbar('Email is required.', { variant: 'warning' });
      return;
    }
    if (!newEmployeeForm.username) {
      enqueueSnackbar('Username is required.', { variant: 'warning' });
      return;
    }
    if (!newEmployeeForm.password || newEmployeeForm.password.length < 6) {
      enqueueSnackbar('Password must be at least 6 characters.', { variant: 'warning' });
      return;
    }
    if (!newEmployeeForm.role_id) {
      enqueueSnackbar('Please select a system access role.', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create Employee record
      const employeePayload = {
        first_name: newEmployeeForm.first_name.trim(),
        last_name: newEmployeeForm.last_name.trim(),
        email: newEmployeeForm.email.trim(),
        personal_email: newEmployeeForm.personal_email?.trim() || '',
        phone: newEmployeeForm.phone.trim(),
        employee_id: newEmployeeForm.employee_id.trim() || generateEmployeeId(),
        department: newEmployeeForm.department,
        position: newEmployeeForm.position,
        employment_type: newEmployeeForm.employment_type,
        hire_date: newEmployeeForm.hire_date,
        gender: newEmployeeForm.gender,
        location: newEmployeeForm.location,
        address: newEmployeeForm.location,
        employment_status: newEmployeeForm.active ? 'Active' : 'Inactive',
        status: newEmployeeForm.active ? 'Active' : 'Inactive',
      };

      const employeeResult = await employeeService.createEmployee(employeePayload);
      const createdEmployeeId = employeeResult?.id || employeeResult?._id || employeePayload.employee_id;

      // Step 2: Create System User Account & Link
      const userPayload = {
        username: newEmployeeForm.username.trim(),
        email: newEmployeeForm.email.trim(),
        password: newEmployeeForm.password,
        role_id: newEmployeeForm.role_id,
        employee_id: String(createdEmployeeId),
        active: newEmployeeForm.active,
      };

      await authService.register(userPayload);

      // Find role name
      const assignedRoleObj = roles.find(r => r._id === newEmployeeForm.role_id);

      // Trigger Success Receipt Dialog
      setSuccessReceipt({
        title: 'Employee & User Account Provisioned Successfully!',
        name: `${newEmployeeForm.first_name} ${newEmployeeForm.last_name}`,
        employee_id: employeePayload.employee_id,
        email: newEmployeeForm.email,
        username: newEmployeeForm.username,
        password: newEmployeeForm.password,
        role_name: assignedRoleObj?.name || 'Employee',
        department: newEmployeeForm.department,
        position: newEmployeeForm.position,
      });

      enqueueSnackbar('Employee created & credentials provisioned!', { variant: 'success' });

      // Reset form
      const defaultRole = roles.find(r => r.name?.toLowerCase() === 'employee') || roles[0];
      setNewEmployeeForm({
        first_name: '',
        last_name: '',
        email: '',
        personal_email: '',
        phone: '',
        employee_id: generateEmployeeId(),
        department: 'Engineering',
        position: 'Software Engineer',
        employment_type: 'Full-time',
        hire_date: new Date().toISOString().split('T')[0],
        gender: 'Prefer not to say',
        location: '',
        username: '',
        password: generatePassword(12),
        role_id: defaultRole ? defaultRole._id : '',
        active: true,
      });

      // Switch back to directory table
      setViewMode('list');
      fetchEmployees();
      fetchUsers();
    } catch (error) {
      console.error('Error creating employee and credentials:', error);
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to create employee and credentials.';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Submit Handler: Mode 2 (Link Existing Employee)
  const handleLinkExistingEmployee = async (e) => {
    e.preventDefault();

    if (!linkForm.selectedEmployee) {
      enqueueSnackbar('Please select an employee from the list.', { variant: 'warning' });
      return;
    }
    if (!linkForm.username || !linkForm.password || !linkForm.role_id) {
      enqueueSnackbar('Please fill in Username, Password, and Role.', { variant: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const emp = linkForm.selectedEmployee;
      const userPayload = {
        username: linkForm.username.trim(),
        email: linkForm.email.trim() || emp.email,
        password: linkForm.password,
        role_id: linkForm.role_id,
        employee_id: String(emp._id || emp.employee_id),
        active: linkForm.active,
      };

      await authService.register(userPayload);

      const assignedRoleObj = roles.find(r => r._id === linkForm.role_id);

      setSuccessReceipt({
        title: 'Credentials Linked Successfully!',
        name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.name,
        employee_id: emp.employee_id || emp._id,
        email: userPayload.email,
        username: linkForm.username,
        password: linkForm.password,
        role_name: assignedRoleObj?.name || 'Employee',
        department: emp.department || 'N/A',
        position: emp.position || 'N/A',
      });

      enqueueSnackbar('Credentials successfully linked to employee!', { variant: 'success' });

      setLinkForm({
        selectedEmployee: null,
        username: '',
        email: '',
        password: generatePassword(12),
        role_id: roles[0]?._id || '',
        active: true,
      });

      setViewMode('list');
      fetchUsers();
    } catch (error) {
      console.error('Error linking credentials:', error);
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to link credentials.';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Edit User Handler
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditFormData({
      email: user.email || '',
      role_id: user.role_id || '',
      active: user.active !== false,
      employee_id: user.employee_id || '',
    });
    setEditDialogOpen(true);
  };

  const handleSaveEditUser = async () => {
    try {
      await authService.updateUser(selectedUser.id, editFormData);
      enqueueSnackbar('User credentials updated successfully', { variant: 'success' });
      setEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      enqueueSnackbar('Failed to update user', { variant: 'error' });
    }
  };

  // Delete User Handler
  const handleDeleteUser = async (userId, username) => {
    if (username === 'admin') {
      enqueueSnackbar('Primary administrator account cannot be deleted.', { variant: 'error' });
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete credentials for "${username}"? They will lose access immediately.`)) {
      try {
        await authService.deleteUser(userId);
        enqueueSnackbar('User deleted successfully', { variant: 'success' });
        fetchUsers();
      } catch (error) {
        enqueueSnackbar('Failed to delete user', { variant: 'error' });
      }
    }
  };

  // Password Reset Handler
  const handleOpenResetPassword = (user) => {
    setSelectedUser(user);
    setNewResetPassword(generatePassword(12));
    setResetPasswordOpen(true);
  };

  const handleSaveResetPassword = async () => {
    if (!newResetPassword || newResetPassword.length < 6) {
      enqueueSnackbar('Password must be at least 6 characters', { variant: 'warning' });
      return;
    }
    try {
      await authService.adminResetPassword(selectedUser.id, newResetPassword);
      enqueueSnackbar(`Password for @${selectedUser.username} has been reset!`, { variant: 'success' });
      setResetPasswordOpen(false);
      setNewResetPassword('');
    } catch (error) {
      enqueueSnackbar('Failed to reset password', { variant: 'error' });
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    enqueueSnackbar(`Copied ${key} to clipboard!`, { variant: 'info' });
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Filtered Users List for Table
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (user.username && user.username.toLowerCase().includes(q)) ||
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.first_name && user.first_name.toLowerCase().includes(q)) ||
        (user.last_name && user.last_name.toLowerCase().includes(q)) ||
        (user.employee_code && user.employee_code.toLowerCase().includes(q)) ||
        (user.employee_id && user.employee_id.toLowerCase().includes(q)) ||
        (user.department && user.department.toLowerCase().includes(q)) ||
        (user.position && user.position.toLowerCase().includes(q)) ||
        (user.role_name && user.role_name.toLowerCase().includes(q));

      const matchRole =
        roleFilter === 'ALL' ||
        (user.role_name && user.role_name.toUpperCase() === roleFilter.toUpperCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && user.active !== false) ||
        (statusFilter === 'INACTIVE' && user.active === false);

      return matchSearch && matchRole && matchStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.active !== false).length;
    const admins = users.filter(u => (u.role_name || '').toLowerCase() === 'admin').length;
    const unlinked = unlinkedEmployees.length;

    return { total, active, admins, unlinked };
  }, [users, unlinkedEmployees]);

  // Password strength for Mode 1
  const pwdStrength = useMemo(() => getPasswordStrength(newEmployeeForm.password), [newEmployeeForm.password]);

  const brutalBorder = isDarkMode ? '2px solid #FFF' : '2px solid #000';
  const cardBorder = isDarkMode ? '3px solid #FFF' : '3px solid #000';

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: 'background.default', minHeight: '100vh' }}>
      
      {/* ========================================================================= */}
      {/* VIEW MODE: CREATE NEW EMPLOYEE & CREDENTIALS PAGE */}
      {/* ========================================================================= */}
      {viewMode === 'create' && (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          {/* Back Action Bar */}
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => setViewMode('list')}
              sx={{
                fontWeight: 900,
                border: brutalBorder,
                boxShadow: isDarkMode ? '3px 3px 0px #FFD700' : '3px 3px 0px #000',
                bgcolor: 'background.paper',
                color: 'text.primary',
                px: 2.5,
                py: 1
              }}
            >
              BACK TO USER DIRECTORY
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<LinkIcon />}
              onClick={() => setViewMode('link')}
              sx={{
                fontWeight: 800,
                border: brutalBorder,
                bgcolor: 'background.paper',
                color: 'text.primary'
              }}
            >
              LINK EXISTING EMPLOYEE INSTEAD
            </Button>
          </Box>

          {/* Dedicated Creation Container */}
          <Paper
            sx={{
              p: { xs: 3, md: 4.5 },
              border: cardBorder,
              boxShadow: isDarkMode ? '10px 10px 0px #FFD700' : '10px 10px 0px #000',
              bgcolor: 'background.paper',
              borderRadius: 0
            }}
          >
            <Box sx={{ mb: 4, pb: 2, borderBottom: '3px solid #000', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: '#FFD700', border: '2px solid #000', color: '#000' }}>
                <PersonIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5, textTransform: 'uppercase' }}>
                  Create New Employee & User Account
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5 }}>
                  Fill in employee details and assign initial login credentials in one clean step.
                </Typography>
              </Box>
            </Box>

            <Box component="form" onSubmit={handleCreateNewEmployeeAndAccount}>
              <Grid container spacing={4}>
                
                {/* SECTION 1: Personal & Contact Information */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, border: brutalBorder, bgcolor: isDarkMode ? '#1e293b' : '#fafafa', borderRadius: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                      <PersonIcon sx={{ color: '#FFD700' }} />
                      <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                        1. Personal Details
                      </Typography>
                    </Box>

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          required
                          label="First Name *"
                          placeholder="e.g. Sarah"
                          value={newEmployeeForm.first_name}
                          onChange={(e) => handleNewEmployeeChange('first_name', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          required
                          label="Last Name *"
                          placeholder="e.g. Connor"
                          value={newEmployeeForm.last_name}
                          onChange={(e) => handleNewEmployeeChange('last_name', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          required
                          type="email"
                          label="Work Email Address *"
                          placeholder="sarah.connor@company.com"
                          value={newEmployeeForm.email}
                          onChange={(e) => handleNewEmployeeChange('email', e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                              </InputAdornment>
                            )
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Employee ID Code *"
                          value={newEmployeeForm.employee_id}
                          onChange={(e) => handleNewEmployeeChange('employee_id', e.target.value)}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <Tooltip title="Generate New ID">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleNewEmployeeChange('employee_id', generateEmployeeId())}
                                  >
                                    <AutorenewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </InputAdornment>
                            ),
                            sx: { fontFamily: 'monospace', fontWeight: 800 }
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Phone Number"
                          placeholder="+1 (555) 019-2834"
                          value={newEmployeeForm.phone}
                          onChange={(e) => handleNewEmployeeChange('phone', e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                              </InputAdornment>
                            )
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Location / Office Address"
                          placeholder="Headquarters (Building A) or Remote"
                          value={newEmployeeForm.location}
                          onChange={(e) => handleNewEmployeeChange('location', e.target.value)}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* SECTION 2: Work & Organization Details */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, border: brutalBorder, bgcolor: isDarkMode ? '#1e293b' : '#fafafa', borderRadius: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                      <WorkIcon sx={{ color: '#FFD700' }} />
                      <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                        2. Organizational Details
                      </Typography>
                    </Box>

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Department</InputLabel>
                          <Select
                            value={newEmployeeForm.department}
                            label="Department"
                            onChange={(e) => handleNewEmployeeChange('department', e.target.value)}
                          >
                            {departmentsList.map(dept => (
                              <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Position / Designation"
                          placeholder="e.g. Senior Software Engineer"
                          value={newEmployeeForm.position}
                          onChange={(e) => handleNewEmployeeChange('position', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth>
                          <InputLabel>Employment Type</InputLabel>
                          <Select
                            value={newEmployeeForm.employment_type}
                            label="Employment Type"
                            onChange={(e) => handleNewEmployeeChange('employment_type', e.target.value)}
                          >
                            {EMPLOYMENT_TYPES.map(type => (
                              <MenuItem key={type} value={type}>{type}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          type="date"
                          label="Date of Joining"
                          value={newEmployeeForm.hire_date}
                          onChange={(e) => handleNewEmployeeChange('hire_date', e.target.value)}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* SECTION 3: System Login Credentials & Role */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 3, border: brutalBorder, bgcolor: isDarkMode ? '#1e293b' : '#fafafa', borderRadius: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                      <KeyIcon sx={{ color: '#FFD700' }} />
                      <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                        3. System Login Credentials & Role Provisioning
                      </Typography>
                    </Box>

                    <Grid container spacing={2.5}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          required
                          label="System Username *"
                          placeholder="sarah.connor"
                          value={newEmployeeForm.username}
                          onChange={(e) => handleNewEmployeeChange('username', e.target.value)}
                          helperText="Auto-suggested from first.last name"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <AccountCircleIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                              </InputAdornment>
                            ),
                            sx: { fontWeight: 700 }
                          }}
                        />
                      </Grid>

                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required>
                          <InputLabel>Assign System Role *</InputLabel>
                          <Select
                            value={newEmployeeForm.role_id}
                            label="Assign System Role *"
                            onChange={(e) => handleNewEmployeeChange('role_id', e.target.value)}
                          >
                            {roles.map((role) => (
                              <MenuItem key={role._id} value={role._id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                  <Typography sx={{ fontWeight: 800 }}>{role.name}</Typography>
                                  <Chip
                                    label={
                                      role.name === 'Admin' ? 'Full Access' :
                                      role.name === 'HR' ? 'HR Ops' :
                                      role.name === 'Manager' ? 'Team Lead' : 'Standard'
                                    }
                                    size="small"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      fontWeight: 900,
                                      borderRadius: 0,
                                      bgcolor: role.name === 'Admin' ? '#ff8787' : role.name === 'HR' ? '#da77f2' : role.name === 'Manager' ? '#74c0fc' : '#ced4da',
                                      color: '#000'
                                    }}
                                  />
                                </Box>
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          required
                          label="Temporary Password *"
                          type={showPassword ? 'text' : 'password'}
                          value={newEmployeeForm.password}
                          onChange={(e) => handleNewEmployeeChange('password', e.target.value)}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <Tooltip title="Generate Strong Password">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleNewEmployeeChange('password', generatePassword(12))}
                                    sx={{ mr: 0.5 }}
                                  >
                                    <AutorenewIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Copy Password">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCopy(newEmployeeForm.password, 'Password')}
                                    sx={{ mr: 0.5 }}
                                  >
                                    {copiedKey === 'Password' ? <CheckIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
                                  </IconButton>
                                </Tooltip>
                                <IconButton
                                  size="small"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                </IconButton>
                              </InputAdornment>
                            ),
                            sx: { fontFamily: 'monospace', fontWeight: 'bold' }
                          }}
                        />
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 800 }}>Password Strength:</Typography>
                            <Typography variant="caption" sx={{ fontWeight: 900, color: pwdStrength.color }}>
                              {pwdStrength.label.toUpperCase()}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={pwdStrength.percent}
                            sx={{
                              height: 6,
                              borderRadius: 0,
                              bgcolor: isDarkMode ? '#333' : '#e9ecef',
                              '& .MuiLinearProgress-bar': { bgcolor: pwdStrength.color }
                            }}
                          />
                        </Box>
                      </Grid>

                      <Grid item xs={12}>
                        <Box sx={{ p: 2, bgcolor: isDarkMode ? 'rgba(255,255,255,0.05)' : '#fff', border: brutalBorder, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={newEmployeeForm.active}
                                onChange={(e) => handleNewEmployeeChange('active', e.target.checked)}
                                color="success"
                              />
                            }
                            label={<Typography variant="body2" sx={{ fontWeight: 800 }}>Account Active & Permitted to Log In</Typography>}
                          />
                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Submit Action Buttons */}
                <Grid item xs={12}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
                    <Button
                      variant="outlined"
                      onClick={() => setViewMode('list')}
                      sx={{ fontWeight: 900, px: 4, py: 1.5, border: brutalBorder }}
                    >
                      CANCEL
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
                      sx={{
                        fontWeight: 900,
                        px: 5,
                        py: 1.5,
                        fontSize: '1rem',
                        bgcolor: '#FFD700',
                        color: '#000',
                        border: cardBorder,
                        boxShadow: isDarkMode ? '4px 4px 0px #FFF' : '4px 4px 0px #000',
                        '&:hover': { bgcolor: '#fab005' }
                      }}
                    >
                      {loading ? 'CREATING & PROVISIONING...' : '✨ CREATE EMPLOYEE & USER ACCOUNT'}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Box>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE: LINK EXISTING EMPLOYEE PAGE */}
      {/* ========================================================================= */}
      {viewMode === 'link' && (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => setViewMode('list')}
              sx={{
                fontWeight: 900,
                border: brutalBorder,
                boxShadow: isDarkMode ? '3px 3px 0px #FFD700' : '3px 3px 0px #000',
                bgcolor: 'background.paper',
                color: 'text.primary',
                px: 2.5,
                py: 1
              }}
            >
              BACK TO USER DIRECTORY
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setViewMode('create')}
              sx={{
                fontWeight: 800,
                border: brutalBorder,
                bgcolor: 'background.paper',
                color: 'text.primary'
              }}
            >
              CREATE NEW EMPLOYEE INSTEAD
            </Button>
          </Box>

          <Paper
            sx={{
              p: { xs: 3, md: 4.5 },
              border: cardBorder,
              boxShadow: isDarkMode ? '10px 10px 0px #FFD700' : '10px 10px 0px #000',
              bgcolor: 'background.paper',
              borderRadius: 0
            }}
          >
            <Box sx={{ mb: 4, pb: 2, borderBottom: '3px solid #000', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, bgcolor: '#FFD700', border: '2px solid #000', color: '#000' }}>
                <LinkIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: -0.5, textTransform: 'uppercase' }}>
                  Link Credentials to Existing Employee
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5 }}>
                  Select an employee from the company directory who doesn't have login credentials yet.
                </Typography>
              </Box>
            </Box>

            <Box component="form" onSubmit={handleLinkExistingEmployee}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Autocomplete
                    options={employees}
                    getOptionLabel={(option) => `${option.first_name || ''} ${option.last_name || ''} (${option.employee_id || option.email})`}
                    value={linkForm.selectedEmployee}
                    onChange={(event, newValue) => {
                      if (newValue) {
                        const autoUser = `${newValue.first_name?.toLowerCase() || ''}.${newValue.last_name?.toLowerCase() || ''}`.replace(/[^a-z0-9.]/g, '');
                        setLinkForm(prev => ({
                          ...prev,
                          selectedEmployee: newValue,
                          email: newValue.email || '',
                          username: prev.username || autoUser
                        }));
                      } else {
                        setLinkForm(prev => ({ ...prev, selectedEmployee: null, email: '', username: '' }));
                      }
                    }}
                    loading={fetchingEmployees}
                    renderOption={(props, option) => {
                      const isUnlinked = unlinkedEmployees.some(e => e._id === option._id || e.employee_id === option.employee_id);
                      return (
                        <li {...props} key={option._id || option.employee_id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', py: 0.8 }}>
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 800 }}>
                                {option.first_name} {option.last_name}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {option.employee_id} • {option.position || option.department || 'Staff'} • {option.email}
                              </Typography>
                            </Box>
                            {isUnlinked && (
                              <Chip label="Unlinked" size="small" sx={{ bgcolor: '#ffa94d', color: '#000', fontWeight: 900, borderRadius: 0 }} />
                            )}
                          </Box>
                        </li>
                      );
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Employee from Directory *"
                        required
                        helperText="Choose an employee to auto-fill their identity and assign credentials"
                      />
                    )}
                  />
                </Grid>

                {linkForm.selectedEmployee && (
                  <Grid item xs={12}>
                    <Paper sx={{ p: 2.5, bgcolor: isDarkMode ? 'rgba(255,215,0,0.08)' : '#fff9db', border: isDarkMode ? '2px solid #FFD700' : '2px solid #000', borderRadius: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', color: '#f59f00' }}>Selected Profile</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 900 }}>{linkForm.selectedEmployee.first_name} {linkForm.selectedEmployee.last_name}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Employee ID: <strong>{linkForm.selectedEmployee.employee_id}</strong> | Department: <strong>{linkForm.selectedEmployee.department || 'N/A'}</strong> | Position: <strong>{linkForm.selectedEmployee.position || 'N/A'}</strong>
                      </Typography>
                    </Paper>
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Login Username *"
                    value={linkForm.username}
                    onChange={(e) => setLinkForm({ ...linkForm, username: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    type="email"
                    label="Official Email *"
                    value={linkForm.email}
                    onChange={(e) => setLinkForm({ ...linkForm, email: e.target.value })}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    label="Initial Password *"
                    type={showPassword ? 'text' : 'password'}
                    value={linkForm.password}
                    onChange={(e) => setLinkForm({ ...linkForm, password: e.target.value })}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Tooltip title="Generate Password">
                            <IconButton size="small" onClick={() => setLinkForm(prev => ({ ...prev, password: generatePassword(12) }))}>
                              <AutorenewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ),
                      sx: { fontFamily: 'monospace', fontWeight: 800 }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Role</InputLabel>
                    <Select
                      value={linkForm.role_id}
                      label="Role"
                      onChange={(e) => setLinkForm({ ...linkForm, role_id: e.target.value })}
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
                  <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 2 }}>
                    <Button variant="outlined" onClick={() => setViewMode('list')} sx={{ fontWeight: 900, px: 4 }}>
                      CANCEL
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={loading || !linkForm.selectedEmployee}
                      sx={{
                        fontWeight: 900,
                        px: 5,
                        py: 1.5,
                        bgcolor: '#FFD700',
                        color: '#000',
                        border: cardBorder,
                        boxShadow: isDarkMode ? '4px 4px 0px #FFF' : '4px 4px 0px #000',
                        '&:hover': { bgcolor: '#fab005' }
                      }}
                    >
                      {loading ? 'LINKING...' : '🔗 LINK CREDENTIALS TO EMPLOYEE'}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Box>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE: MAIN USER DIRECTORY & CREDENTIALS MANAGEMENT (FULL WIDTH TABLE) */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <Box>
          {/* Header Action Bar */}
          <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: '#FFD700',
                  border: isDarkMode ? '3px solid #FFF' : '3px solid #000',
                  boxShadow: isDarkMode ? '4px 4px 0px #FFD700' : '4px 4px 0px #000',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SecurityIcon sx={{ fontSize: 36, color: '#000' }} />
              </Box>
              <Box>
                <Typography variant="h3" sx={{ fontWeight: 900, letterSpacing: -1, textTransform: 'uppercase', lineHeight: 1.1 }}>
                  User Credential Management
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, mt: 0.5 }}>
                  Provision employee credentials, manage system access roles, and monitor account statuses.
                </Typography>
              </Box>
            </Box>

            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant="outlined"
                onClick={loadAllData}
                startIcon={<RefreshIcon />}
                sx={{
                  fontWeight: 800,
                  bgcolor: 'background.paper',
                  color: 'text.primary',
                  border: brutalBorder,
                  boxShadow: isDarkMode ? '3px 3px 0px #FFD700' : '3px 3px 0px #000',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
              >
                REFRESH
              </Button>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setViewMode('create')}
                sx={{
                  fontWeight: 900,
                  bgcolor: '#FFD700',
                  color: '#000',
                  border: cardBorder,
                  boxShadow: isDarkMode ? '4px 4px 0px #FFF' : '4px 4px 0px #000',
                  px: 3,
                  py: 1.2,
                  '&:hover': { bgcolor: '#fab005' }
                }}
              >
                + ADD NEW EMPLOYEE & ACCOUNT
              </Button>
            </Stack>
          </Box>

          {/* Metrics & Analytics Overview Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ border: cardBorder, boxShadow: isDarkMode ? '4px 4px 0px #FFD700' : '4px 4px 0px #000', bgcolor: 'background.paper' }}>
                <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#339af0', border: '2px solid #000', color: '#000' }}>
                    <GroupIcon sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1 }}>{stats.total}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>Total Accounts</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ border: cardBorder, boxShadow: isDarkMode ? '4px 4px 0px #51cf66' : '4px 4px 0px #000', bgcolor: 'background.paper' }}>
                <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#51cf66', border: '2px solid #000', color: '#000' }}>
                    <CheckCircleIcon sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1, color: '#51cf66' }}>{stats.active}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
                      Active ({stats.total ? Math.round((stats.active / stats.total) * 100) : 0}%)
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ border: cardBorder, boxShadow: isDarkMode ? '4px 4px 0px #ff6b6b' : '4px 4px 0px #000', bgcolor: 'background.paper' }}>
                <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, bgcolor: '#ff8787', border: '2px solid #000', color: '#000' }}>
                    <AdminPanelSettingsIcon sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1 }}>{stats.admins}</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>Admin Privileges</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  border: cardBorder,
                  boxShadow: stats.unlinked > 0 ? (isDarkMode ? '4px 4px 0px #ffa94d' : '4px 4px 0px #000') : 'none',
                  bgcolor: stats.unlinked > 0 ? (isDarkMode ? 'rgba(255, 169, 77, 0.1)' : '#fff9db') : 'background.paper',
                  cursor: stats.unlinked > 0 ? 'pointer' : 'default',
                  transition: 'transform 0.1s ease',
                  '&:hover': stats.unlinked > 0 ? { transform: 'translate(-2px, -2px)' } : {}
                }}
                onClick={() => {
                  if (stats.unlinked > 0) setViewMode('link');
                }}
              >
                <CardContent sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ p: 1.5, bgcolor: stats.unlinked > 0 ? '#ffa94d' : '#dee2e6', border: '2px solid #000', color: '#000' }}>
                    <WarningAmberIcon sx={{ fontSize: 28 }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1, color: stats.unlinked > 0 ? '#e8590c' : 'text.primary' }}>
                      {stats.unlinked}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', color: 'text.secondary' }}>
                      {stats.unlinked > 0 ? 'Unlinked Employees (Click)' : 'All Employees Linked'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Full-Width Credentials Directory Table */}
          <Paper
            sx={{
              p: 0,
              border: cardBorder,
              boxShadow: isDarkMode ? '8px 8px 0px #FFD700' : '8px 8px 0px #000',
              bgcolor: 'background.paper',
              borderRadius: 0,
              overflow: 'hidden'
            }}
          >
            {/* Toolbar: Search, Role Filters, Status Filter */}
            <Box sx={{ p: 3, borderBottom: isDarkMode ? '3px solid #FFF' : '3px solid #000', bgcolor: isDarkMode ? '#1e293b' : '#f8f9fa' }}>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', lg: 'center' }, gap: 2.5 }}>
                
                {/* Search Bar */}
                <TextField
                  sx={{ width: { xs: '100%', lg: 400 }, bgcolor: 'background.paper' }}
                  size="small"
                  placeholder="Search by username, employee name, ID, email, or dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 0 }
                  }}
                />

                {/* Filters Row */}
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {/* Role Chips */}
                  {['ALL', 'Admin', 'HR', 'Manager', 'Employee'].map((r) => (
                    <Chip
                      key={r}
                      label={r}
                      onClick={() => setRoleFilter(r)}
                      size="small"
                      sx={{
                        fontWeight: 900,
                        borderRadius: 0,
                        border: isDarkMode ? '1.5px solid #FFF' : '1.5px solid #000',
                        bgcolor: roleFilter === r ? '#FFD700' : 'background.paper',
                        color: roleFilter === r ? '#000' : 'text.primary',
                        boxShadow: roleFilter === r ? '2px 2px 0px #000' : 'none',
                        cursor: 'pointer',
                        px: 0.5
                      }}
                    />
                  ))}

                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      sx={{ borderRadius: 0, bgcolor: 'background.paper' }}
                      autoWidth
                      MenuProps={{ PaperProps: { style: { maxHeight: 300 } } }}
                    >
                      <MenuItem value="ALL">All Statuses</MenuItem>
                      <MenuItem value="ACTIVE">Active Only</MenuItem>
                      <MenuItem value="INACTIVE">Inactive Only</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Box>
            </Box>

            {/* Table */}
            <TableContainer sx={{ maxHeight: 680 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 900, bgcolor: isDarkMode ? '#0f172a' : '#e9ecef', borderBottom: '2px solid #000', py: 2 }}>Employee / User</TableCell>
                    <TableCell sx={{ fontWeight: 900, bgcolor: isDarkMode ? '#0f172a' : '#e9ecef', borderBottom: '2px solid #000', py: 2 }}>Department & Title</TableCell>
                    <TableCell sx={{ fontWeight: 900, bgcolor: isDarkMode ? '#0f172a' : '#e9ecef', borderBottom: '2px solid #000', py: 2 }}>Email & Contact</TableCell>
                    <TableCell sx={{ fontWeight: 900, bgcolor: isDarkMode ? '#0f172a' : '#e9ecef', borderBottom: '2px solid #000', py: 2 }}>System Role</TableCell>
                    <TableCell sx={{ fontWeight: 900, bgcolor: isDarkMode ? '#0f172a' : '#e9ecef', borderBottom: '2px solid #000', py: 2 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 900, bgcolor: isDarkMode ? '#0f172a' : '#e9ecef', borderBottom: '2px solid #000', py: 2 }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fetchingUsers ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <CircularProgress size={36} sx={{ color: '#FFD700' }} />
                        <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 800 }}>Loading Credentials Directory...</Typography>
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                        <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>No Credentials Found</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                          No accounts match your current filter criteria.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((user) => {
                        const initials = user.first_name && user.last_name
                          ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
                          : (user.username || 'U')[0].toUpperCase();

                        const isRoleAdmin = (user.role_name || '').toLowerCase() === 'admin';
                        const isRoleHR = (user.role_name || '').toLowerCase() === 'hr';
                        const isRoleManager = (user.role_name || '').toLowerCase() === 'manager';

                        return (
                          <TableRow key={user.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                            
                            {/* Employee / User */}
                            <TableCell sx={{ py: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar
                                  sx={{
                                    width: 44,
                                    height: 44,
                                    fontWeight: 900,
                                    fontSize: '1rem',
                                    bgcolor: isRoleAdmin ? '#ff8787' : isRoleHR ? '#da77f2' : isRoleManager ? '#74c0fc' : '#FFD700',
                                    color: '#000',
                                    border: '2px solid #000'
                                  }}
                                >
                                  {initials}
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                                    {user.first_name ? `${user.first_name} ${user.last_name}` : user.username}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', fontFamily: 'monospace', fontWeight: 700 }}>
                                    @{user.username}
                                  </Typography>
                                  {user.employee_code && (
                                    <Chip
                                      label={user.employee_code}
                                      size="small"
                                      sx={{ height: 20, fontSize: '0.7rem', fontWeight: 900, borderRadius: 0, bgcolor: isDarkMode ? '#334155' : '#e9ecef', color: 'text.primary', mt: 0.3 }}
                                    />
                                  )}
                                </Box>
                              </Box>
                            </TableCell>

                            {/* Department & Title */}
                            <TableCell sx={{ py: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                {user.department || 'General'}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                {user.position || 'Staff Member'}
                              </Typography>
                            </TableCell>

                            {/* Email & Contact */}
                            <TableCell sx={{ py: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {user.email}
                              </Typography>
                              {user.phone && (
                                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                                  {user.phone}
                                </Typography>
                              )}
                            </TableCell>

                            {/* System Role */}
                            <TableCell sx={{ py: 2 }}>
                              <Box
                                sx={{
                                  px: 1.5,
                                  py: 0.6,
                                  bgcolor: isRoleAdmin ? '#ff8787' : isRoleHR ? '#da77f2' : isRoleManager ? '#74c0fc' : '#ced4da',
                                  display: 'inline-block',
                                  border: '2px solid #000',
                                  fontWeight: 900,
                                  fontSize: '0.75rem',
                                  color: '#000',
                                  boxShadow: '2px 2px 0px #000'
                                }}
                              >
                                {(user.role_name || 'Employee').toUpperCase()}
                              </Box>
                            </TableCell>

                            {/* Status */}
                            <TableCell sx={{ py: 2 }}>
                              <Chip
                                label={user.active !== false ? '● ACTIVE' : '○ INACTIVE'}
                                size="small"
                                sx={{
                                  fontWeight: 900,
                                  fontSize: '0.75rem',
                                  borderRadius: 0,
                                  bgcolor: user.active !== false ? 'rgba(81, 207, 102, 0.2)' : 'rgba(250, 82, 82, 0.2)',
                                  color: user.active !== false ? '#51cf66' : '#fa5252',
                                  border: `1.5px solid ${user.active !== false ? '#51cf66' : '#fa5252'}`
                                }}
                              />
                            </TableCell>

                            {/* Actions */}
                            <TableCell align="right" sx={{ py: 2 }}>
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <Tooltip title="Edit Account">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenEdit(user)}
                                    sx={{
                                      border: '2px solid #000',
                                      borderRadius: 0,
                                      bgcolor: isDarkMode ? '#1e293b' : '#f1f3f5',
                                      color: 'text.primary',
                                      boxShadow: '2px 2px 0px #000',
                                      '&:hover': { bgcolor: '#FFD700', color: '#000' }
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title="Reset Password">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenResetPassword(user)}
                                    sx={{
                                      border: '2px solid #000',
                                      borderRadius: 0,
                                      bgcolor: isDarkMode ? '#1e293b' : '#fff9db',
                                      color: isDarkMode ? '#FFD700' : '#f59f00',
                                      boxShadow: '2px 2px 0px #000',
                                      '&:hover': { bgcolor: '#FFD700', color: '#000' }
                                    }}
                                  >
                                    <LockResetIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>

                                <Tooltip title={user.username === 'admin' ? 'Primary admin cannot be deleted' : 'Delete Account'}>
                                  <span>
                                    <IconButton
                                      size="small"
                                      disabled={user.username === 'admin'}
                                      onClick={() => handleDeleteUser(user.id, user.username)}
                                      sx={{
                                        border: '2px solid #000',
                                        borderRadius: 0,
                                        bgcolor: isDarkMode ? '#1e293b' : '#fff5f5',
                                        color: '#fa5252',
                                        boxShadow: '2px 2px 0px #000',
                                        '&:hover': { bgcolor: '#fa5252', color: '#fff' }
                                      }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredUsers.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              sx={{ borderTop: isDarkMode ? '2px solid #FFF' : '2px solid #000' }}
            />
          </Paper>
        </Box>
      )}

      {/* ========================================================================= */}
      {/* SUCCESS RECEIPT / CREDENTIALS SHARING MODAL */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(successReceipt)}
        onClose={() => setSuccessReceipt(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 0,
            border: isDarkMode ? '3px solid #FFF' : '3px solid #000',
            boxShadow: isDarkMode ? '10px 10px 0px #FFD700' : '10px 10px 0px #000',
            bgcolor: 'background.paper'
          }
        }}
      >
        <DialogTitle
          sx={{
            bgcolor: '#FFD700',
            color: '#000',
            borderBottom: '3px solid #000',
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            py: 2
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 28 }} />
          {successReceipt?.title || 'Account Provisioned!'}
        </DialogTitle>

        <DialogContent sx={{ p: 3.5 }}>
          <Box sx={{ mb: 3, p: 2.5, bgcolor: isDarkMode ? 'rgba(255,215,0,0.05)' : '#f8f9fa', border: '2px dashed', borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'text.secondary', textTransform: 'uppercase', mb: 1.5 }}>
              Employee Profile Summary
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Full Name:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 900 }}>{successReceipt?.name}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Employee ID:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 900, fontFamily: 'monospace' }}>{successReceipt?.employee_id}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Department & Role:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>{successReceipt?.department} • {successReceipt?.position}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>System Role:</Typography>
                <Chip label={successReceipt?.role_name} size="small" sx={{ fontWeight: 900, borderRadius: 0, bgcolor: '#FFD700', color: '#000', border: '1px solid #000' }} />
              </Grid>
            </Grid>
          </Box>

          <Paper sx={{ p: 2.5, bgcolor: isDarkMode ? '#1e293b' : '#fff9db', border: '2px solid #000', borderRadius: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1.5, textTransform: 'uppercase' }}>
              🔑 System Login Details
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2"><strong>Username:</strong> <code>{successReceipt?.username}</code></Typography>
                <Button size="small" onClick={() => handleCopy(successReceipt?.username, 'Username')} startIcon={<ContentCopyIcon fontSize="small" />} sx={{ textTransform: 'none', py: 0.2 }}>
                  Copy
                </Button>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2"><strong>Password:</strong> <code>{successReceipt?.password}</code></Typography>
                <Button size="small" onClick={() => handleCopy(successReceipt?.password, 'Password')} startIcon={<ContentCopyIcon fontSize="small" />} sx={{ textTransform: 'none', py: 0.2 }}>
                  Copy
                </Button>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2"><strong>Official Email:</strong> {successReceipt?.email}</Typography>
              </Box>
            </Box>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: isDarkMode ? '2px solid #FFF' : '2px solid #000', bgcolor: isDarkMode ? '#0f172a' : '#f8f9fa' }}>
          <Button
            onClick={() => {
              const fullSummary = `AI-HR Credentials\nEmployee: ${successReceipt?.name} (${successReceipt?.employee_id})\nRole: ${successReceipt?.role_name}\nUsername: ${successReceipt?.username}\nPassword: ${successReceipt?.password}\nEmail: ${successReceipt?.email}`;
              handleCopy(fullSummary, 'All Credentials');
            }}
            startIcon={<ContentCopyIcon />}
            sx={{ fontWeight: 800 }}
          >
            Copy All Details
          </Button>
          <Button
            onClick={() => setSuccessReceipt(null)}
            variant="contained"
            sx={{
              fontWeight: 900,
              bgcolor: '#000',
              color: '#FFF',
              border: isDarkMode ? '2px solid #FFF' : '2px solid #000',
              '&:hover': { bgcolor: '#333' }
            }}
          >
            DONE
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* EDIT USER CREDENTIALS DIALOG */}
      {/* ========================================================================= */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 0,
            border: isDarkMode ? '3px solid #FFF' : '3px solid #000',
            boxShadow: isDarkMode ? '10px 10px 0px #FFD700' : '10px 10px 0px #000'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: isDarkMode ? '2px solid #FFF' : '2px solid #000', fontWeight: 900, textTransform: 'uppercase', py: 2 }}>
          Edit User Credentials (@{selectedUser?.username})
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Official Email Address"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Assigned Role</InputLabel>
                <Select
                  value={editFormData.role_id}
                  label="Assigned Role"
                  onChange={(e) => setEditFormData({ ...editFormData, role_id: e.target.value })}
                >
                  {roles.map((role) => (
                    <MenuItem key={role._id} value={role._id}>{role.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Account Status</InputLabel>
                <Select
                  value={editFormData.active}
                  label="Account Status"
                  onChange={(e) => setEditFormData({ ...editFormData, active: e.target.value })}
                >
                  <MenuItem value={true}>Active (Allowed to sign in)</MenuItem>
                  <MenuItem value={false}>Inactive (Access blocked)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: isDarkMode ? '2px solid #FFF' : '2px solid #000' }}>
          <Button onClick={() => setEditDialogOpen(false)} sx={{ fontWeight: 800 }}>CANCEL</Button>
          <Button
            onClick={handleSaveEditUser}
            variant="contained"
            sx={{
              fontWeight: 900,
              bgcolor: '#FFD700',
              color: '#000',
              border: isDarkMode ? '2px solid #FFF' : '2px solid #000',
              '&:hover': { bgcolor: '#fab005' }
            }}
          >
            SAVE CHANGES
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================================= */}
      {/* RESET PASSWORD DIALOG */}
      {/* ========================================================================= */}
      <Dialog
        open={resetPasswordOpen}
        onClose={() => setResetPasswordOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 0,
            border: isDarkMode ? '3px solid #FFF' : '3px solid #000',
            boxShadow: isDarkMode ? '10px 10px 0px #FFD700' : '10px 10px 0px #000'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: isDarkMode ? '2px solid #FFF' : '2px solid #000', fontWeight: 900, textTransform: 'uppercase', py: 2 }}>
          Reset Password for @{selectedUser?.username}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', fontWeight: 600 }}>
            Enter a new password or generate a secure temporary password below:
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="New Password *"
            type={showResetPassword ? 'text' : 'password'}
            value={newResetPassword}
            onChange={(e) => setNewResetPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Generate Strong Password">
                    <IconButton size="small" onClick={() => setNewResetPassword(generatePassword(12))}>
                      <AutorenewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Copy Password">
                    <IconButton size="small" onClick={() => handleCopy(newResetPassword, 'Reset Password')}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" onClick={() => setShowResetPassword(!showResetPassword)}>
                    {showResetPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
              sx: { fontFamily: 'monospace', fontWeight: 'bold' }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, borderTop: isDarkMode ? '2px solid #FFF' : '2px solid #000' }}>
          <Button onClick={() => setResetPasswordOpen(false)} sx={{ fontWeight: 800 }}>CANCEL</Button>
          <Button
            onClick={handleSaveResetPassword}
            variant="contained"
            sx={{
              fontWeight: 900,
              bgcolor: '#FFD700',
              color: '#000',
              border: isDarkMode ? '2px solid #FFF' : '2px solid #000',
              boxShadow: isDarkMode ? '3px 3px 0px #FFF' : '3px 3px 0px #000',
              '&:hover': { bgcolor: '#fab005' }
            }}
          >
            CONFIRM PASSWORD RESET
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default Signup;
