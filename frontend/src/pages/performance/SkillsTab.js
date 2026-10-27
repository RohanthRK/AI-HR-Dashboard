import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Slider,
  IconButton,
  Tooltip,
  useTheme,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PsychologyIcon from '@mui/icons-material/Psychology';
import skillService from '../../services/skillService';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from 'notistack';

/* ─── helpers ─── */
const normaliseSkill = (s) => {
  if (typeof s === 'string') return { name: s.trim(), proficiency: 8 };
  return { name: s.name || s.skill || '', proficiency: s.proficiency !== undefined && s.proficiency !== null ? Number(s.proficiency) : 8 };
};

const proficiencyColor = (level) => {
  if (level <= 3) return '#fa5252';
  if (level <= 6) return '#ffa94d';
  if (level <= 8) return '#51cf66';
  return '#20c997';
};

const proficiencyLabel = (level) => {
  if (level <= 3) return 'Beginner';
  if (level <= 6) return 'Intermediate';
  if (level <= 8) return 'Advanced';
  return 'Expert';
};

/* ─── reusable proficiency slider ─── */
const ProficiencySlider = ({ value, onChange }) => (
  <Box>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 800 }}>Proficiency Level</Typography>
      <Box
        sx={{
          px: 1.5,
          py: 0.25,
          bgcolor: proficiencyColor(value),
          color: '#fff',
          fontWeight: 900,
          fontSize: '0.8rem',
          border: '2px solid #000',
          transition: 'background-color 0.2s'
        }}
      >
        {value}/10 &mdash; {proficiencyLabel(value)}
      </Box>
    </Box>
    <Slider
      value={value}
      min={1}
      max={10}
      step={1}
      marks
      onChange={(_, val) => onChange(val)}
      sx={{
        color: proficiencyColor(value),
        '& .MuiSlider-thumb': {
          border: '2px solid #000',
          width: 20,
          height: 20,
          borderRadius: 0,
        },
        '& .MuiSlider-track': { border: 'none', height: 6 },
        '& .MuiSlider-rail': { height: 6, bgcolor: '#e0e0e0' },
        '& .MuiSlider-mark': { bgcolor: '#000', width: 3, height: 3, borderRadius: '50%' },
        '& .MuiSlider-markActive': { bgcolor: '#fff' },
      }}
    />
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="caption" color="text.secondary">1 — Beginner</Typography>
      <Typography variant="caption" color="text.secondary">10 — Expert</Typography>
    </Box>
  </Box>
);

/* ─── main component ─── */
const SkillsTab = () => {
  const [employeeSkills, setEmployeeSkills] = useState([]);
  const [masterSkills, setMasterSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newSkill, setNewSkill] = useState(null);
  const [newSkillText, setNewSkillText] = useState('');
  const [addProficiency, setAddProficiency] = useState(8);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [editName, setEditName] = useState('');
  const [editProficiency, setEditProficiency] = useState(8);

  const { currentUser } = useAuth();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const masterResponse = await skillService.getMasterSkills();
      setMasterSkills(masterResponse.skills || []);

      const empId = currentUser?.employee_id || currentUser?.id;
      if (empId) {
        const empResponse = await skillService.getEmployeeSkills(empId);
        setEmployeeSkills((empResponse.skills || []).map(normaliseSkill));
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load skills data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentUser, enqueueSnackbar]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── persist helper ── */
  const persist = async (updatedSkills, successMsg) => {
    const empId = currentUser?.employee_id || currentUser?.id;
    await skillService.updateSkills(empId, updatedSkills);
    setEmployeeSkills(updatedSkills);
    enqueueSnackbar(successMsg, { variant: 'success' });
  };

  /* ── ADD ── */
  const handleOpenAdd = () => {
    setNewSkill(null);
    setNewSkillText('');
    setAddProficiency(8);
    setAddOpen(true);
  };

  const handleAddSkill = async () => {
    const skillName = newSkill
      ? (typeof newSkill === 'string' ? newSkill : newSkill.name || newSkill)
      : newSkillText.trim();

    if (!skillName) return;
    if (employeeSkills.some(s => s.name === skillName)) {
      enqueueSnackbar('Skill already added', { variant: 'info' });
      return;
    }

    try {
      await persist(
        [...employeeSkills, { name: skillName, proficiency: addProficiency }],
        'Skill added successfully'
      );
      setAddOpen(false);
    } catch {
      enqueueSnackbar('Failed to add skill', { variant: 'error' });
    }
  };

  /* ── EDIT ── */
  const handleOpenEdit = (idx) => {
    const skill = employeeSkills[idx];
    setEditIndex(idx);
    setEditName(skill.name);
    setEditProficiency(skill.proficiency);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;

    // Check duplicate (ignore self)
    const duplicate = employeeSkills.some((s, i) => i !== editIndex && s.name === editName.trim());
    if (duplicate) {
      enqueueSnackbar('Another skill with this name already exists', { variant: 'info' });
      return;
    }

    const updatedSkills = employeeSkills.map((s, i) =>
      i === editIndex ? { name: editName.trim(), proficiency: editProficiency } : s
    );

    try {
      await persist(updatedSkills, 'Skill updated successfully');
      setEditOpen(false);
    } catch {
      enqueueSnackbar('Failed to update skill', { variant: 'error' });
    }
  };

  /* ── DELETE ── */
  const handleDeleteSkill = async (skillName) => {
    try {
      await persist(
        employeeSkills.filter(s => s.name !== skillName),
        'Skill removed'
      );
    } catch {
      enqueueSnackbar('Failed to remove skill', { variant: 'error' });
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>My Skills &amp; Expertise</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{
            bgcolor: '#40c057',
            color: '#fff',
            fontWeight: 900,
            borderRadius: 0,
            border: '2px solid #000',
            boxShadow: '4px 4px 0px #000',
            '&:hover': { bgcolor: '#2f9e44', transform: 'translate(-2px, -2px)', boxShadow: '6px 6px 0px #000' }
          }}
        >
          ADD SKILL
        </Button>
      </Box>

      {/* My skills first */}
      <Paper sx={{ p: 4, border: '3px solid #000', borderRadius: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {employeeSkills.length === 0 ? (
            <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No skills added yet. Showcase your expertise!
            </Typography>
          ) : (
            employeeSkills.map((skill, idx) => (
              <Box
                key={skill.name}
                sx={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  border: '2px solid #000',
                  bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#fff',
                  boxShadow: '3px 3px 0px #000',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  '&:hover': {
                    transform: 'translate(-2px,-2px)',
                    boxShadow: '5px 5px 0px #000'
                  },
                  minWidth: 140
                }}
              >
                {/* Skill name row */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, pt: 1.5, pb: 0.5 }}>
                  <PsychologyIcon sx={{ fontSize: 18, color: proficiencyColor(skill.proficiency) }} />
                  <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', flexGrow: 1 }}>
                    {skill.name}
                  </Typography>
                </Box>

                {/* Proficiency badge */}
                <Box
                  sx={{
                    mx: 1.5,
                    mb: 1,
                    px: 1,
                    py: 0.25,
                    bgcolor: proficiencyColor(skill.proficiency),
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                    textAlign: 'center'
                  }}
                >
                  {skill.proficiency}/10 · {proficiencyLabel(skill.proficiency)}
                </Box>

                {/* Action buttons */}
                <Box
                  sx={{
                    display: 'flex',
                    borderTop: '2px solid #000',
                    '& > button': {
                      flex: 1,
                      borderRadius: 0,
                      py: 0.5
                    }
                  }}
                >
                  <Tooltip title="Edit skill">
                    <IconButton
                      size="small"
                      aria-label={`Edit ${skill.name}`}
                      onClick={() => handleOpenEdit(idx)}
                      sx={{
                        color: '#1971c2',
                        borderRight: '1px solid #000',
                        '&:hover': { bgcolor: '#e7f5ff' }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove skill">
                    <IconButton
                      size="small"
                      aria-label={`Delete ${skill.name}`}
                      onClick={() => handleDeleteSkill(skill.name)}
                      sx={{
                        color: '#fa5252',
                        '&:hover': { bgcolor: '#fff5f5' }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Paper>

      {/* Company skills pool: below the person's own skills */}
      {masterSkills && masterSkills.length > 0 && (
        <Box sx={{ mt: 4, p: 3, border: '2px dashed #000', bgcolor: theme.palette.mode === 'dark' ? '#1e293b' : '#fff9db' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase', color: '#f59f00', display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            Available Company Skills Pool (click to add with a default score of 8/10)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {masterSkills.map((ms, idx) => {
              const name = typeof ms === 'string' ? ms : ms.name;
              const isAlreadyAdded = employeeSkills.some(s => s.name.toLowerCase() === name.toLowerCase());
              return (
                <Button
                  key={idx}
                  size="small"
                  disabled={isAlreadyAdded}
                  onClick={async () => {
                    if (!isAlreadyAdded) {
                      const prof = (typeof ms === 'object' && ms.proficiency) ? ms.proficiency : 8;
                      const updated = [...employeeSkills, { name, proficiency: prof }];
                      await persist(updated, `Added "${name}" with proficiency ${prof}/10`);
                    }
                  }}
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.78rem',
                    textTransform: 'none',
                    borderRadius: 0,
                    border: isAlreadyAdded ? '1px solid #ced4da' : '2px solid #000',
                    bgcolor: isAlreadyAdded ? (theme.palette.mode === 'dark' ? '#334155' : '#e9ecef') : 'background.paper',
                    color: isAlreadyAdded ? 'text.secondary' : 'text.primary',
                    boxShadow: isAlreadyAdded ? 'none' : '2px 2px 0px #000',
                    '&:hover': !isAlreadyAdded ? { bgcolor: '#FFD700', color: '#000', transform: 'translate(-1px,-1px)' } : {}
                  }}
                >
                  {isAlreadyAdded ? `✓ ${name}` : `+ ${name}`}
                </Button>
              );
            })}
          </Box>
        </Box>
      )}

      {/* ── ADD SKILL DIALOG ── */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 0, border: '4px solid #000', boxShadow: '15px 15px 0px #000' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, borderBottom: '2px solid #000' }}>Add New Skill</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Autocomplete
              freeSolo
              options={masterSkills.map(s => typeof s === 'string' ? s : (s.name || ''))}
              PopperProps={{ style: { zIndex: 1700 }, placement: 'bottom-start' }}
              PaperComponent={({ children }) => (
                <Paper sx={{ borderRadius: 0, border: '3px solid #000', boxShadow: '10px 10px 0px #000', mt: 0.5 }}>
                  {children}
                </Paper>
              )}
              value={newSkill}
              onChange={(_, v) => setNewSkill(v)}
              onInputChange={(_, v) => setNewSkillText(v)}
              filterOptions={(options, { inputValue }) =>
                options.filter(o => o.toLowerCase().includes(inputValue.toLowerCase())).slice(0, 50)
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search or type skill"
                  placeholder="e.g. React, Python..."
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0, '& fieldset': { border: '2px solid #000' } } }}
                />
              )}
            />
            <ProficiencySlider value={addProficiency} onChange={setAddProficiency} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '2px solid #000' }}>
          <Button onClick={() => setAddOpen(false)} sx={{ fontWeight: 800, color: '#000' }}>Cancel</Button>
          <Button
            onClick={handleAddSkill}
            variant="contained"
            disabled={!newSkill && !newSkillText.trim()}
            sx={{ bgcolor: '#000', color: '#fff', fontWeight: 800, borderRadius: 0 }}
          >
            ADD TO PROFILE
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── EDIT SKILL DIALOG ── */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 0, border: '4px solid #1971c2', boxShadow: '15px 15px 0px #1971c2' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, borderBottom: '2px solid #000', bgcolor: '#e7f5ff' }}>
          Edit Skill
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Skill Name"
              fullWidth
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 0, '& fieldset': { border: '2px solid #000' } } }}
            />
            <ProficiencySlider value={editProficiency} onChange={setEditProficiency} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '2px solid #000' }}>
          <Button onClick={() => setEditOpen(false)} sx={{ fontWeight: 800, color: '#000' }}>Cancel</Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={!editName.trim()}
            sx={{ bgcolor: '#1971c2', color: '#fff', fontWeight: 800, borderRadius: 0 }}
          >
            SAVE CHANGES
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SkillsTab;
