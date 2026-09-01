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
  Chip,
  Slider,
  Stack,
  Paper,
  Tooltip,
  Autocomplete
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Psychology as SkillsIcon,
  Star as StarIcon,
  CheckCircle as CheckIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import skillService from '../../services/skillService';
import { useSnackbar } from 'notistack';

const DEFAULT_PROFICIENCY = 8;

const normaliseSkill = (raw) => {
  if (typeof raw === 'string') {
    return { name: raw.trim(), proficiency: DEFAULT_PROFICIENCY };
  }
  const name = (raw?.name || raw?.skill || '').trim();
  const proficiency = raw?.proficiency !== undefined && raw?.proficiency !== null
    ? Number(raw.proficiency)
    : DEFAULT_PROFICIENCY;
  return { name, proficiency };
};

const getProficiencyColor = (score) => {
  if (score <= 3) return '#ff6b6b';
  if (score <= 6) return '#ffa94d';
  if (score <= 8) return '#51cf66';
  return '#20c997';
};

const ManageSkillsModal = ({ open, onClose, employee, onSaveSuccess }) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const { enqueueSnackbar } = useSnackbar();

  const [skillsList, setSkillsList] = useState([]);
  const [masterSkills, setMasterSkills] = useState([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newProficiency, setNewProficiency] = useState(DEFAULT_PROFICIENCY);
  const [selectedMasterSkill, setSelectedMasterSkill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && employee) {
      // Initialize with employee skills
      const initialSkills = (employee.skills || []).map(normaliseSkill).filter(s => s.name);
      setSkillsList(initialSkills);
      setNewSkillName('');
      setNewProficiency(DEFAULT_PROFICIENCY);
      setSelectedMasterSkill(null);

      fetchMasterSkills();
    }
  }, [open, employee]);

  const fetchMasterSkills = async () => {
    setLoading(true);
    try {
      const data = await skillService.getMasterSkills();
      setMasterSkills(data?.skills || []);
    } catch (err) {
      console.error('Failed to load master skills:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    const nameToAdd = selectedMasterSkill
      ? (typeof selectedMasterSkill === 'string' ? selectedMasterSkill : selectedMasterSkill.name)
      : newSkillName.trim();

    if (!nameToAdd) {
      enqueueSnackbar('Please enter or select a skill name', { variant: 'warning' });
      return;
    }

    if (skillsList.some(s => s.name.toLowerCase() === nameToAdd.toLowerCase())) {
      enqueueSnackbar(`"${nameToAdd}" is already in your skills list!`, { variant: 'info' });
      return;
    }

    const updated = [...skillsList, { name: nameToAdd, proficiency: newProficiency || DEFAULT_PROFICIENCY }];
    setSkillsList(updated);
    setNewSkillName('');
    setSelectedMasterSkill(null);
    setNewProficiency(DEFAULT_PROFICIENCY);
  };

  const handleQuickAddMasterSkill = (masterSkill) => {
    const name = typeof masterSkill === 'string' ? masterSkill : masterSkill.name;
    if (skillsList.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      enqueueSnackbar(`"${name}" is already in your skills list!`, { variant: 'info' });
      return;
    }

    const prof = (typeof masterSkill === 'object' && masterSkill.proficiency) ? masterSkill.proficiency : DEFAULT_PROFICIENCY;
    const updated = [...skillsList, { name, proficiency: prof }];
    setSkillsList(updated);
    enqueueSnackbar(`Added "${name}" with proficiency ${prof}/10`, { variant: 'success' });
  };

  const handleProficiencyChange = (index, newProf) => {
    setSkillsList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], proficiency: newProf };
      return copy;
    });
  };

  const handleDeleteSkill = (index) => {
    setSkillsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const empId = employee._id || employee.employee_id || employee.id;
      await skillService.updateSkills(empId, skillsList);

      enqueueSnackbar('Skills successfully updated!', { variant: 'success' });
      if (onSaveSuccess) onSaveSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving skills:', err);
      enqueueSnackbar('Failed to update skills. Please try again.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const brutalBorder = isDarkMode ? '2px solid #FFF' : '2px solid #000';

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
      {/* Header */}
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
          <SkillsIcon sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: -0.5, lineHeight: 1.1 }}>
              Manage Skills & Expertise
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#333' }}>
              Employee: {employee?.first_name} {employee?.last_name} ({employee?.employee_id || 'ID N/A'})
            </Typography>
          </Box>
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

      <DialogContent sx={{ p: { xs: 2.5, md: 4 } }}>
        <Grid container spacing={3}>
          
          {/* SECTION 1: Add New Skill Form */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, border: brutalBorder, bgcolor: isDarkMode ? '#1e293b' : '#fafafa', borderRadius: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, textTransform: 'uppercase', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddIcon sx={{ color: '#FFD700' }} /> Add New Skill
              </Typography>

              <Grid container spacing={2.5} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Autocomplete
                    freeSolo
                    options={masterSkills.map(s => typeof s === 'string' ? s : s.name)}
                    value={selectedMasterSkill || newSkillName}
                    onChange={(event, newValue) => {
                      setSelectedMasterSkill(newValue);
                      setNewSkillName(newValue || '');
                    }}
                    onInputChange={(event, newInputValue) => {
                      setNewSkillName(newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="Skill Name"
                        placeholder="e.g. React, Python, Leadership..."
                        InputProps={{
                          ...params.InputProps,
                          sx: { borderRadius: 0, bgcolor: 'background.paper' }
                        }}
                      />
                    )}
                  />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <Box sx={{ px: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 900 }}>Proficiency Level:</Typography>
                      <Chip
                        label={`${newProficiency}/10`}
                        size="small"
                        sx={{
                          fontWeight: 900,
                          borderRadius: 0,
                          bgcolor: getProficiencyColor(newProficiency),
                          color: '#000',
                          height: 20
                        }}
                      />
                    </Box>
                    <Slider
                      value={newProficiency}
                      onChange={(e, val) => setNewProficiency(val)}
                      min={1}
                      max={10}
                      step={1}
                      sx={{ color: '#FFD700' }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleAddSkill}
                    startIcon={<AddIcon />}
                    sx={{
                      py: 1,
                      fontWeight: 900,
                      bgcolor: '#FFD700',
                      color: '#000',
                      border: '2px solid #000',
                      boxShadow: '2px 2px 0px #000',
                      borderRadius: 0,
                      '&:hover': { bgcolor: '#fab005' }
                    }}
                  >
                    ADD
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* SECTION 2: Master Skills Catalog Pool */}
          {masterSkills.length > 0 && (
            <Grid item xs={12}>
              <Box sx={{ p: 2.5, border: '1px dashed', borderColor: 'divider', bgcolor: isDarkMode ? 'rgba(255,215,0,0.04)' : '#fff9db' }}>
                <Typography variant="caption" sx={{ fontWeight: 900, textTransform: 'uppercase', color: '#f59f00', display: 'block', mb: 1.2 }}>
                  🏢 Available Company Skills Directory (Click to add with default score 8/10):
                </Typography>
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
                  {masterSkills.map((ms, idx) => {
                    const name = typeof ms === 'string' ? ms : ms.name;
                    const isAlreadyAdded = skillsList.some(s => s.name.toLowerCase() === name.toLowerCase());
                    return (
                      <Chip
                        key={idx}
                        label={isAlreadyAdded ? `✓ ${name}` : `+ ${name}`}
                        size="small"
                        onClick={() => !isAlreadyAdded && handleQuickAddMasterSkill(ms)}
                        disabled={isAlreadyAdded}
                        sx={{
                          fontWeight: 800,
                          borderRadius: 0,
                          border: isAlreadyAdded ? '1px solid #ced4da' : '1.5px solid #000',
                          bgcolor: isAlreadyAdded ? (isDarkMode ? '#334155' : '#e9ecef') : 'background.paper',
                          color: isAlreadyAdded ? 'text.secondary' : 'text.primary',
                          cursor: isAlreadyAdded ? 'default' : 'pointer',
                          boxShadow: isAlreadyAdded ? 'none' : '1px 1px 0px #000',
                          '&:hover': !isAlreadyAdded ? { bgcolor: '#FFD700', color: '#000' } : {}
                        }}
                      />
                    );
                  })}
                </Stack>
              </Box>
            </Grid>
          )}

          {/* SECTION 3: Current Skills List with Proficiency Adjusters */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                Current Skill Set ({skillsList.length})
              </Typography>
              <Button
                component={Link}
                to="/performance?tab=skills"
                target="_blank"
                size="small"
                endIcon={<OpenInNewIcon fontSize="small" />}
                sx={{ fontWeight: 800, fontSize: '0.75rem', textTransform: 'none' }}
              >
                Open Full Performance Skills Tab
              </Button>
            </Box>

            {skillsList.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', border: '2px dashed #ced4da' }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                  No skills configured yet. Add from the suggestions above or type your own!
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {skillsList.map((skill, idx) => {
                  const profColor = getProficiencyColor(skill.proficiency);
                  return (
                    <Grid item xs={12} sm={6} key={idx}>
                      <Paper
                        sx={{
                          p: 2,
                          border: brutalBorder,
                          boxShadow: '3px 3px 0px #000',
                          bgcolor: 'background.paper',
                          borderRadius: 0
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                            {skill.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={`${skill.proficiency}/10`}
                              size="small"
                              sx={{
                                fontWeight: 900,
                                borderRadius: 0,
                                bgcolor: profColor,
                                color: '#000',
                                height: 22
                              }}
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteSkill(idx)}
                              sx={{ color: '#fa5252' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>

                        <Box sx={{ px: 0.5 }}>
                          <Slider
                            value={skill.proficiency}
                            onChange={(e, val) => handleProficiencyChange(idx, val)}
                            min={1}
                            max={10}
                            step={1}
                            size="small"
                            sx={{
                              color: profColor,
                              py: 1
                            }}
                          />
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Grid>

        </Grid>
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
          disabled={saving}
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
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
          {saving ? 'SAVING...' : 'SAVE SKILLS'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManageSkillsModal;
