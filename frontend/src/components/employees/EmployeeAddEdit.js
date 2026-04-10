import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Box,
  Typography,
  Divider,
  Tabs,
  Tab,
  CircularProgress,
  IconButton,
  Avatar,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Close as CloseIcon, Upload as UploadIcon, PhotoCamera as PhotoCameraIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import * as Yup from 'yup';
import { Formik, Form, Field } from 'formik';
import { styled } from '@mui/material/styles';

// Styled components
const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 100,
  height: 100,
  margin: '0 auto 16px auto',
  cursor: 'pointer',
  border: `2px solid ${theme.palette.primary.main}`,
  '&:hover': {
    opacity: 0.8,
  },
}));

const UploadButton = styled('input')({
  display: 'none',
});

// Tab Panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`employee-tabpanel-${index}`}
      aria-labelledby={`employee-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const EmployeeAddEdit = ({ open, employee, onClose, onSave, departments, roles }) => {
  const [tabValue, setTabValue] = useState(0);
  const isEditMode = Boolean(employee);
  const [profilePreview, setProfilePreview] = useState(null);
  const [profileFile, setProfileFile] = useState(null);

  // Define form state with validation
  const [formData, setFormData] = useState({
    name: { value: '', error: false, helperText: '' },
    email: { value: '', error: false, helperText: '' },
    phone: { value: '', error: false, helperText: '' },
    address: { value: '', error: false, helperText: '' },
    joining_date: { value: null, error: false, helperText: '' },
    department: { value: '', error: false, helperText: '' },
    role: { value: '', error: false, helperText: '' },
    manager: { value: '', error: false, helperText: '' },
    status: { value: 'Active', error: false, helperText: '' },
    salary: { value: '', error: false, helperText: '' },
    bio: { value: '', error: false, helperText: '' },
    skills: { value: '', error: false, helperText: '' },
  });

  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initial form values
  const initialValues = {
    // Personal Information
    name: employee?.name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    date_of_birth: employee?.date_of_birth ? new Date(employee.date_of_birth) : null,
    gender: employee?.gender || '',
    address: employee?.address || '',
    
    // Employment Details
    employee_id: employee?.employee_id || '',
    department: employee?.department || '',
    role: employee?.role || '',
    date_joined: employee?.date_joined ? new Date(employee.date_joined) : new Date(),
    status: employee?.status || 'Active',
    manager: employee?.manager || '',
    salary: employee?.salary || '',
    
    // Account Settings
    username: employee?.username || '',
    password: isEditMode ? '' : '',  // only required for new employees
    confirm_password: '',
    is_admin: employee?.is_admin || false,
    skills: employee?.skills || '',
    bio: employee?.bio || '',
  };
  
  // Validation schema using Yup
  const validationSchema = Yup.object({
    // Personal Information
    name: Yup.string().required('Name is required'),
    email: Yup.string().email('Invalid email address').required('Email is required'),
    phone: Yup.string().required('Phone number is required'),
    date_of_birth: Yup.date().nullable().required('Date of birth is required'),
    gender: Yup.string().required('Gender is required'),
    address: Yup.string().required('Address is required'),
    
    // Employment Details
    employee_id: Yup.string().required('Employee ID is required'),
    department: Yup.string().required('Department is required'),
    role: Yup.string().required('Role is required'),
    date_joined: Yup.date().required('Date joined is required'),
    status: Yup.string().required('Status is required'),
    salary: Yup.number().positive('Salary must be positive').required('Salary is required'),
    
    // Account Settings
    username: Yup.string().required('Username is required'),
    password: isEditMode 
      ? Yup.string() // Optional on edit
      : Yup.string().min(8, 'Password must be at least 8 characters').required('Password is required'),
    confirm_password: Yup.string()
      .test('passwords-match', 'Passwords must match', function(value) {
        return !this.parent.password || this.parent.password === value;
      }),
    is_admin: Yup.boolean().required('Admin privileges are required'),
    skills: Yup.string().required('Skills are required'),
    bio: Yup.string().required('Bio is required'),
  });

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Handle form submission
  const handleSubmit = (values, { setSubmitting }) => {
    // Remove confirm_password as it's not needed in the API
    const { confirm_password, ...employeeData } = values;

    // If password is empty on edit mode, remove it
    if (isEditMode && !employeeData.password) {
      delete employeeData.password;
    }

    // Convert dates to ISO strings
    if (employeeData.date_of_birth) {
      employeeData.date_of_birth = employeeData.date_of_birth.toISOString().split('T')[0];
    }
    if (employeeData.date_joined) {
      employeeData.date_joined = employeeData.date_joined.toISOString().split('T')[0];
    }

    // The backend create_employee endpoint expects JSON
    // Profile picture uploads are handled separately if needed
    onSave(employeeData);
    setSubmitting(false);
  };

  // Get a11y props for tabs
  const a11yProps = (index) => {
    return {
      id: `employee-tab-${index}`,
      'aria-controls': `employee-tabpanel-${index}`,
    };
  };

  // Update form values when employee data changes
  useEffect(() => {
    if (employee) {
      const formValues = { ...employee };
      
      // Format date for the date input
      if (formValues.date_joined) {
        const date = new Date(formValues.date_joined);
        formValues.date_joined = date.toISOString().split('T')[0];
      }
      
      // Set form values
      Object.keys(formValues).forEach(key => {
        if (initialValues.hasOwnProperty(key)) {
          initialValues[key] = formValues[key] || '';
        }
      });
      
      // Set profile picture preview if available
      if (employee.profile_picture) {
        setProfilePreview(employee.profile_picture);
      }
    } else {
      // Reset form for new employee
      initialValues.name = '';
      initialValues.email = '';
      initialValues.phone = '';
      initialValues.date_of_birth = null;
      initialValues.gender = '';
      initialValues.address = '';
      initialValues.employee_id = '';
      initialValues.department = '';
      initialValues.role = '';
      initialValues.date_joined = new Date();
      initialValues.status = 'Active';
      initialValues.salary = '';
      initialValues.username = '';
      initialValues.password = '';
      initialValues.confirm_password = '';
      initialValues.is_admin = false;
      initialValues.skills = '';
      initialValues.bio = '';
      setProfilePreview(null);
      setProfileFile(null);
    }
  }, [employee]);
  
  // Handle profile picture change
  const handleProfilePictureChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setProfileFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setProfilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      aria-labelledby="employee-dialog-title"
    >
      <DialogTitle id="employee-dialog-title">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          {isEditMode ? 'Edit Employee' : 'Add New Employee'}
          <IconButton aria-label="close" onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
          <Form>
            <DialogContent dividers>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="employee form tabs">
                  <Tab label="Personal Information" {...a11yProps(0)} />
                  <Tab label="Employment Details" {...a11yProps(1)} />
                  <Tab label="Account Settings" {...a11yProps(2)} />
                </Tabs>
              </Box>

              {/* Personal Information Tab */}
              <TabPanel value={tabValue} index={0}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="name"
                      name="name"
                      label="Full Name"
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.name && Boolean(errors.name)}
                      helperText={touched.name && errors.name}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="email"
                      name="email"
                      label="Email Address"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.email && Boolean(errors.email)}
                      helperText={touched.email && errors.email}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="phone"
                      name="phone"
                      label="Phone Number"
                      value={values.phone}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.phone && Boolean(errors.phone)}
                      helperText={touched.phone && errors.phone}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Date of Birth"
                        value={values.date_of_birth}
                        onChange={(newValue) => {
                          setFieldValue('date_of_birth', newValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            name="date_of_birth"
                            error={touched.date_of_birth && Boolean(errors.date_of_birth)}
                            helperText={touched.date_of_birth && errors.date_of_birth}
                            margin="normal"
                          />
                        )}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl
                      fullWidth
                      margin="normal"
                      error={touched.gender && Boolean(errors.gender)}
                    >
                      <InputLabel id="gender-label">Gender</InputLabel>
                      <Select
                        labelId="gender-label"
                        id="gender"
                        name="gender"
                        value={values.gender}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Gender"
                      >
                        <MenuItem value="Male">Male</MenuItem>
                        <MenuItem value="Female">Female</MenuItem>
                        <MenuItem value="Other">Other</MenuItem>
                        <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                      </Select>
                      {touched.gender && errors.gender && (
                        <FormHelperText>{errors.gender}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      id="address"
                      name="address"
                      label="Address"
                      value={values.address}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.address && Boolean(errors.address)}
                      helperText={touched.address && errors.address}
                      variant="outlined"
                      margin="normal"
                      multiline
                      rows={3}
                    />
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Employment Details Tab */}
              <TabPanel value={tabValue} index={1}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="employee_id"
                      name="employee_id"
                      label="Employee ID"
                      value={values.employee_id}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.employee_id && Boolean(errors.employee_id)}
                      helperText={touched.employee_id && errors.employee_id}
                      variant="outlined"
                      margin="normal"
                      disabled={isEditMode} // Can't edit ID once created
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl
                      fullWidth
                      margin="normal"
                      error={touched.department && Boolean(errors.department)}
                    >
                      <InputLabel id="department-label">Department</InputLabel>
                      <Select
                        labelId="department-label"
                        id="department"
                        name="department"
                        value={values.department}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Department"
                      >
                        {departments.map((dept) => (
                          <MenuItem key={dept.id} value={dept.name}>
                            {dept.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.department && errors.department && (
                        <FormHelperText>{errors.department}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl
                      fullWidth
                      margin="normal"
                      error={touched.role && Boolean(errors.role)}
                    >
                      <InputLabel id="role-label">Role</InputLabel>
                      <Select
                        labelId="role-label"
                        id="role"
                        name="role"
                        value={values.role}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Role"
                      >
                        {roles.map((role) => (
                          <MenuItem key={role.id} value={role.name}>
                            {role.name}
                          </MenuItem>
                        ))}
                      </Select>
                      {touched.role && errors.role && (
                        <FormHelperText>{errors.role}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DatePicker
                        label="Date Joined"
                        value={values.date_joined}
                        onChange={(newValue) => {
                          setFieldValue('date_joined', newValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            fullWidth
                            name="date_joined"
                            error={touched.date_joined && Boolean(errors.date_joined)}
                            helperText={touched.date_joined && errors.date_joined}
                            margin="normal"
                          />
                        )}
                      />
                    </LocalizationProvider>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl
                      fullWidth
                      margin="normal"
                      error={touched.status && Boolean(errors.status)}
                    >
                      <InputLabel id="status-label">Status</InputLabel>
                      <Select
                        labelId="status-label"
                        id="status"
                        name="status"
                        value={values.status}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        label="Status"
                      >
                        <MenuItem value="Active">Active</MenuItem>
                        <MenuItem value="Inactive">Inactive</MenuItem>
                        <MenuItem value="On Leave">On Leave</MenuItem>
                      </Select>
                      {touched.status && errors.status && (
                        <FormHelperText>{errors.status}</FormHelperText>
                      )}
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="manager"
                      name="manager"
                      label="Manager"
                      value={values.manager}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.manager && Boolean(errors.manager)}
                      helperText={touched.manager && errors.manager}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="salary"
                      name="salary"
                      label="Salary"
                      type="number"
                      value={values.salary}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.salary && Boolean(errors.salary)}
                      helperText={touched.salary && errors.salary}
                      variant="outlined"
                      margin="normal"
                      InputProps={{
                        startAdornment: <Box component="span" sx={{ mr: 1 }}>$</Box>,
                      }}
                    />
                  </Grid>
                </Grid>
              </TabPanel>

              {/* Account Settings Tab */}
              <TabPanel value={tabValue} index={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="username"
                      name="username"
                      label="Username"
                      value={values.username}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.username && Boolean(errors.username)}
                      helperText={touched.username && errors.username}
                      variant="outlined"
                      margin="normal"
                      disabled={isEditMode} // Can't edit username once created
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      id="password"
                      name="password"
                      label={isEditMode ? "New Password (leave blank to keep current)" : "Password"}
                      type="password"
                      value={values.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.password && Boolean(errors.password)}
                      helperText={touched.password && errors.password}
                      variant="outlined"
                      margin="normal"
                    />
                  </Grid>
                  {values.password && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        id="confirm_password"
                        name="confirm_password"
                        label="Confirm Password"
                        type="password"
                        value={values.confirm_password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={touched.confirm_password && Boolean(errors.confirm_password)}
                        helperText={touched.confirm_password && errors.confirm_password}
                        variant="outlined"
                        margin="normal"
                      />
                    </Grid>
                  )}
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={values.is_admin}
                          onChange={(e) => setFieldValue('is_admin', e.target.checked)}
                          name="is_admin"
                          color="primary"
                        />
                      }
                      label="Admin Privileges"
                    />
                  </Grid>
                </Grid>
              </TabPanel>
            </DialogContent>

            <DialogActions>
              <Button onClick={onClose} color="secondary">
                Cancel
              </Button>
              <Button
                type="submit"
                color="primary"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isEditMode ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default EmployeeAddEdit; 