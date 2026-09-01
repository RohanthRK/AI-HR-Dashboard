import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Typography,
  Box,
  IconButton,
  Divider,
  useTheme,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Stack
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Work as WorkIcon,
  ContactMail as ContactIcon,
  Psychology as SkillsIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  LocationOn as LocationIcon
} from '@mui/icons-material';
import employeeService from '../../services/employeeService';
import authService from '../../services/authService';
import skillService from '../../services/skillService';

const ProfileEditModal = ({ open, onClose, employee, onSaveSuccess, isAdmin }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const [activeTab, setActiveTab] = useState(0);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    personal_email: '',
    phone: '',
    location: '',
    address: '',
    gender: 'Prefer not to say',
    date_of_birth: '',
    employee_id: '',
    department: '',
    position: '',
    employment_status: 'Active',
    hire_date: '',
    manager_id: '',
    role_id: '',
    about_me: '',
    love_about_job: '',
    interests_hobbies: '',
    skills: '',
    emergency_contact_name: '',
    emergency_contact_relationship: '',
    emergency_contact_phone: '',
    emergency_contact_email: ''
  });

  const [allEmployees, setAllEmployees] = useState([]);
  const [fetchingEmployees, setFetchingEmployees] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (employee) {
      const ec = employee.emergency_contact || {};

      let skillsString = '';
      if (Array.isArray(employee.skills)) {
        skillsString = employee.skills
          .map(s => (typeof s === 'string' ? s : s.name || s.skill || ''))
          .filter(Boolean)
          .join(', ');
      } else if (typeof employee.skills === 'string') {
        skillsString = employee.skills;
      }

      setFormData({
        first_name: employee.first_name || '',
        last_name: employee.last_name || '',
        email: employee.email || '',
        personal_email: ec.personal_email || employee.personal_email || '',
        phone: employee.phone || '',
        location: employee.location || employee.address || '',
        address: employee.address || employee.location || '',
        gender: employee.gender || 'Prefer not to say',
        date_of_birth: employee.date_of_birth ? String(employee.date_of_birth).split('T')[0] : '',
        employee_id: employee.employee_id || '',
        department: employee.department_name || employee.department || '',
        position: employee.position || '',
        employment_status: employee.employment_status || employee.status || 'Active',
        hire_date: employee.hire_date ? String(employee.hire_date).split('T')[0] : '',
        manager_id: employee.manager_id || '',
        role_id: employee.role_id || '',
        about_me: employee.about_me || employee.bio || '',
        love_about_job: employee.love_about_job || '',
        interests_hobbies: employee.interests_hobbies || '',
        skills: skillsString,
        emergency_contact_name: ec.name || employee.emergency_contact_name || '',
        emergency_contact_relationship: ec.relationship || employee.emergency_contact_relationship || '',
        emergency_contact_phone: ec.phone || employee.emergency_contact_phone || '',
        emergency_contact_email: ec.email || ec.personal_email || ''
      });

      fetchAllEmployees();
      fetchRoles();
    }
  }, [employee]);

  const fetchRoles = async () => {
    try {
      const data = await authService.getRoles();
      setAvailableRoles(data.roles || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchAllEmployees = async () => {
    setFetchingEmployees(true);
    try {
      const data = await employeeService.getAllEmployees();
      setAllEmployees((data || []).filter(emp => emp._id !== employee?._id));
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setFetchingEmployees(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [masterSkillsList, setMasterSkillsList] = useState([]);

  useEffect(() => {
    fetchMasterSkills();
  }, []);

  const fetchMasterSkills = async () => {
    try {
      const data = await skillService.getMasterSkills();
      setMasterSkillsList(data?.skills || []);
    } catch (e) {
      // Fallback
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      // Existing skill map to preserve existing proficiency
      const existingProfMap = {};
      if (Array.isArray(employee?.skills)) {
        employee.skills.forEach(s => {
          if (typeof s === 'object' && s) {
            const n = (s.name || s.skill || '').trim().toLowerCase();
            if (n) existingProfMap[n] = s.proficiency ?? 8;
          }
        });
      }

      const rawSkillNames = formData.skills
        ? formData.skills.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const skillsArray = rawSkillNames.map(name => {
        const prof = existingProfMap[name.toLowerCase()] ?? 8;
        return { name, proficiency: prof };
      });

      const payload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        personal_email: formData.personal_email.trim(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        address: formData.location.trim(),
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        department: formData.department,
        position: formData.position,
        employment_status: formData.employment_status,
        status: formData.employment_status,
        hire_date: formData.hire_date,
        about_me: formData.about_me,
        bio: formData.about_me,
        love_about_job: formData.love_about_job,
        interests_hobbies: formData.interests_hobbies,
        skills: skillsArray,
        emergency_contact: {
          name: formData.emergency_contact_name.trim(),
          relationship: formData.emergency_contact_relationship.trim(),
          phone: formData.emergency_contact_phone.trim(),
          personal_email: formData.personal_email.trim(),
          email: formData.emergency_contact_email.trim()
        },
        ...(isAdmin && {
          employee_id: formData.employee_id.trim(),
          manager_id: formData.manager_id,
          role_id: formData.role_id,
        })
      };

      await employeeService.partialUpdateEmployee(employee._id || employee.id, payload);
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const brutalBorder = isDarkMode ? '2px solid #FFF' : '2px solid #000';
  const inputSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 0,
      border: brutalBorder,
      bgcolor: 'background.paper',
      '& fieldset': { border: 'none' },
      '&:hover fieldset': { border: 'none' },
      '&.Mui-focused fieldset': { border: 'none' },
    },
    '& .MuiInputLabel-root': {
      fontWeight: 800,
      color: 'text.primary',
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 0,
          border: isDarkMode ? '3px solid #FFF' : '3px solid #000',
          boxShadow: isDarkMode ? '12px 12px 0px #FFD700' : '12px 12px 0px #000',
          bgcolor: 'background.paper',
          overflow: 'hidden'
        }
      }}
    >
      {/* Modal Header */}
      <DialogTitle
        sx={{
          bgcolor: '#FFD700',
          color: '#000',
          fontWeight: 900,
          borderBottom: '3px solid #000',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2,
          px: 3
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PersonIcon sx={{ fontSize: 32 }} />
          <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5 }}>
            Edit Employee Profile
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: '#000',
            border: '2px solid #000',
            borderRadius: 0,
            bgcolor: '#FFF',
            '&:hover': { bgcolor: '#f1f3f5' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: isDarkMode ? '2px solid #FFF' : '2px solid #000', bgcolor: isDarkMode ? '#1e293b' : '#f8f9fa' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="fullWidth"
          TabIndicatorProps={{ style: { backgroundColor: '#FFD700', height: 4 } }}
        >
          <Tab icon={<PersonIcon fontSize="small" />} iconPosition="start" label="Personal" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', py: 1.5 }} />
          <Tab icon={<WorkIcon fontSize="small" />} iconPosition="start" label="Work & Role" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', py: 1.5 }} />
          <Tab icon={<ContactIcon fontSize="small" />} iconPosition="start" label="Contact" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', py: 1.5 }} />
          <Tab icon={<SkillsIcon fontSize="small" />} iconPosition="start" label="Bio & Skills" sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.8rem', py: 1.5 }} />
        </Tabs>
      </Box>

      {/* Modal Body */}
      <DialogContent sx={{ p: { xs: 2.5, md: 4 }, minHeight: 380 }}>
        {error && (
          <Box sx={{ mb: 3, p: 2, bgcolor: '#ff8787', color: '#000', border: '2px solid #000', fontWeight: 800 }}>
            {error}
          </Box>
        )}

        {/* TAB 0: PERSONAL DETAILS */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="First Name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Last Name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" sx={inputSx}>
                <InputLabel>Gender</InputLabel>
                <Select
                  name="gender"
                  value={formData.gender}
                  label="Gender"
                  onChange={handleChange}
                >
                  <MenuItem value="Male">Male</MenuItem>
                  <MenuItem value="Female">Female</MenuItem>
                  <MenuItem value="Non-binary">Non-binary</MenuItem>
                  <MenuItem value="Prefer not to say">Prefer not to say</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Date of Birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Phone Number"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Personal Email"
                name="personal_email"
                value={formData.personal_email}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="Location / Residential Address"
                name="location"
                value={formData.location}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
          </Grid>
        )}

        {/* TAB 1: WORK & ORGANIZATION */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Official Work Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Employee ID Code"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                disabled={!isAdmin}
                helperText={!isAdmin ? "Employee ID can only be modified by Administrators" : ""}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Position / Job Title"
                name="position"
                value={formData.position}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small" sx={inputSx}>
                <InputLabel>Employment Status</InputLabel>
                <Select
                  name="employment_status"
                  value={formData.employment_status}
                  label="Employment Status"
                  onChange={handleChange}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Probation">Probation</MenuItem>
                  <MenuItem value="On Leave">On Leave</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                  <MenuItem value="Terminated">Terminated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Joining / Hire Date"
                name="hire_date"
                value={formData.hire_date}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={inputSx}
              />
            </Grid>

            {isAdmin && (
              <>
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    options={allEmployees}
                    getOptionLabel={(option) => `${option.first_name || ''} ${option.last_name || ''} (${option.employee_id || option.email || 'No ID'})`}
                    value={allEmployees.find(emp => String(emp._id || emp.id) === String(formData.manager_id)) || null}
                    onChange={(event, newValue) => {
                      setFormData(prev => ({ ...prev, manager_id: newValue ? (newValue._id || newValue.id) : '' }));
                    }}
                    loading={fetchingEmployees}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Reporting Manager (Admin)"
                        placeholder="Search manager"
                        sx={inputSx}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small" sx={inputSx}>
                    <InputLabel>Access Role (Admin)</InputLabel>
                    <Select
                      name="role_id"
                      value={formData.role_id}
                      label="Access Role (Admin)"
                      onChange={handleChange}
                    >
                      {availableRoles.map((role) => (
                        <MenuItem key={role._id} value={role._id}>
                          {role.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}
          </Grid>
        )}

        {/* TAB 2: CONTACT & EMERGENCY */}
        {activeTab === 2 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase', color: '#f59f00', mb: 1 }}>
                🚨 Emergency Contact Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Emergency Contact Name"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Relationship (e.g. Spouse, Parent, Sibling)"
                name="emergency_contact_relationship"
                value={formData.emergency_contact_relationship}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Emergency Phone Number"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Emergency Contact Email"
                name="emergency_contact_email"
                value={formData.emergency_contact_email}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
          </Grid>
        )}

        {/* TAB 3: BIO & SKILLS */}
        {activeTab === 3 && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="About Me / Bio"
                name="about_me"
                placeholder="Brief summary about professional background, goals, etc."
                value={formData.about_me}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="What I love about my job"
                name="love_about_job"
                placeholder="What motivates you at work?"
                value={formData.love_about_job}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Interests & Hobbies"
                name="interests_hobbies"
                placeholder="Photography, hiking, open source, etc."
                value={formData.interests_hobbies}
                onChange={handleChange}
                sx={inputSx}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Skills (Comma-separated)"
                name="skills"
                placeholder="React, Node.js, Python, Leadership, System Design"
                value={formData.skills}
                onChange={handleChange}
                helperText="Enter skills separated by commas"
                sx={inputSx}
              />
              {formData.skills && (
                <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: 'wrap', gap: 0.8 }}>
                  {formData.skills.split(',').map(s => s.trim()).filter(Boolean).map((skill, idx) => (
                    <Chip
                      key={idx}
                      label={skill}
                      size="small"
                      onDelete={() => {
                        const current = formData.skills.split(',').map(s => s.trim()).filter(Boolean);
                        const updated = current.filter((_, i) => i !== idx).join(', ');
                        setFormData(prev => ({ ...prev, skills: updated }));
                      }}
                      sx={{
                        fontWeight: 800,
                        borderRadius: 0,
                        bgcolor: '#FFD700',
                        color: '#000',
                        border: '1px solid #000'
                      }}
                    />
                  ))}
                </Stack>
              )}

              {/* Master Skills Pool / Quick Add Suggestions */}
              {masterSkillsList && masterSkillsList.length > 0 && (
                <Box sx={{ mt: 2.5, p: 2, bgcolor: isDarkMode ? '#1e293b' : '#f8f9fa', border: '1px dashed #000' }}>
                  <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', color: 'text.secondary', display: 'block', mb: 1 }}>
                    💡 Available Company Skills Pool (Click to add):
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
                    {masterSkillsList.map((ms, idx) => {
                      const name = typeof ms === 'string' ? ms : ms.name;
                      const currentSkillsList = (formData.skills || '').split(',').map(s => s.trim().toLowerCase());
                      const isAdded = currentSkillsList.includes(name.toLowerCase());
                      if (isAdded) return null;
                      return (
                        <Chip
                          key={idx}
                          label={`+ ${name}`}
                          size="small"
                          onClick={() => {
                            const trimmed = (formData.skills || '').trim();
                            const updated = trimmed ? `${trimmed}, ${name}` : name;
                            setFormData(prev => ({ ...prev, skills: updated }));
                          }}
                          sx={{
                            fontWeight: 700,
                            borderRadius: 0,
                            border: '1px solid #ced4da',
                            bgcolor: 'background.paper',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: '#FFD700', color: '#000' }
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>

      {/* Modal Actions */}
      <DialogActions sx={{ p: 3, borderTop: isDarkMode ? '2px solid #FFF' : '2px solid #000', bgcolor: isDarkMode ? '#0f172a' : '#f8f9fa' }}>
        <Button
          onClick={onClose}
          sx={{ fontWeight: 800, color: 'text.secondary', px: 3 }}
        >
          CANCEL
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          variant="contained"
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          sx={{
            fontWeight: 900,
            bgcolor: '#FFD700',
            color: '#000',
            border: isDarkMode ? '2px solid #FFF' : '2px solid #000',
            boxShadow: isDarkMode ? '3px 3px 0px #FFF' : '3px 3px 0px #000',
            px: 4,
            py: 1,
            '&:hover': { bgcolor: '#fab005' }
          }}
        >
          {loading ? 'SAVING...' : 'SAVE CHANGES'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileEditModal;
