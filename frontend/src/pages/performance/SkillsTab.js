import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Chip, 
  Paper, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Autocomplete,
  useTheme,
  CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PsychologicalIcon from '@mui/icons-material/Psychology';
import skillService from '../../services/skillService';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from 'notistack';

const SkillsTab = () => {
  const [employeeSkills, setEmployeeSkills] = useState([]);
  const [masterSkills, setMasterSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newSkill, setNewSkill] = useState(null);
  const [newSkillText, setNewSkillText] = useState('');
  
  const { currentUser } = useAuth();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch master skills regardless of user type
      const masterResponse = await skillService.getMasterSkills();
      setMasterSkills(masterResponse.skills || []);

      // Fetch employee skills if ID is available
      const empId = currentUser?.employee_id || currentUser?.id;
      if (empId) {
        const empResponse = await skillService.getEmployeeSkills(empId);
        setEmployeeSkills(empResponse.skills || []);
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Failed to load skills data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentUser, enqueueSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddSkill = async () => {
    const skillName = newSkill ? (typeof newSkill === 'string' ? newSkill : newSkill.name) : newSkillText;
    
    if (!skillName) return;
    if (employeeSkills.includes(skillName)) {
      enqueueSnackbar('Skill already added', { variant: 'info' });
      return;
    }

    const updatedSkills = [...employeeSkills, skillName];
    try {
      await skillService.updateSkills(currentUser.employee_id, updatedSkills);
      setEmployeeSkills(updatedSkills);
      setOpenDialog(false);
      setNewSkill(null);
      setNewSkillText('');
      enqueueSnackbar('Skill added successfully', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar('Failed to update skills', { variant: 'error' });
    }
  };

  const handleDeleteSkill = async (skillToDelete) => {
    const updatedSkills = employeeSkills.filter(s => s !== skillToDelete);
    try {
      await skillService.updateSkills(currentUser.employee_id, updatedSkills);
      setEmployeeSkills(updatedSkills);
      enqueueSnackbar('Skill removed', { variant: 'info' });
    } catch (err) {
      enqueueSnackbar('Failed to remove skill', { variant: 'error' });
    }
  };

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 900 }}>My Skills & Expertise</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
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

      <Paper sx={{ p: 4, border: '3px solid #000', borderRadius: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {employeeSkills.length === 0 ? (
            <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
              No skills added yet. Showcase your expertise!
            </Typography>
          ) : (
            employeeSkills.map((skill) => (
              <Chip
                key={skill}
                label={skill}
                onDelete={() => handleDeleteSkill(skill)}
                icon={<PsychologicalIcon />}
                sx={{
                  height: '45px',
                  px: 2,
                  fontSize: '1rem',
                  fontWeight: 800,
                  borderRadius: 0,
                  border: '2px solid #000',
                  bgcolor: theme.palette.mode === 'dark' ? '#222' : '#fff',
                  '& .MuiChip-deleteIcon': {
                    color: '#fa5252',
                    transition: 'all 0.2s ease',
                    '&:hover': { color: '#e03131', transform: 'scale(1.2)' }
                  }
                }}
              />
            ))
          )}
        </Box>
      </Paper>

      {/* Add Skill Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: { borderRadius: 0, border: '4px solid #000', boxShadow: '15px 15px 0px #000' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>Add New Skill</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Autocomplete
              freeSolo
              options={masterSkills.map(s => typeof s === 'string' ? s : (s.name || ''))}
              PopperProps={{ 
                style: { zIndex: 1700 },
                placement: 'bottom-start'
              }}
              PaperComponent={({ children }) => (
                <Paper sx={{ 
                  borderRadius: 0, 
                  border: '3px solid #000', 
                  boxShadow: '10px 10px 0px #000',
                  mt: 0.5
                }}>
                  {children}
                </Paper>
              )}
              value={newSkill}
              onChange={(event, newValue) => {
                setNewSkill(newValue);
              }}
              onInputChange={(event, newInputValue) => {
                setNewSkillText(newInputValue);
              }}
              filterOptions={(options, params) => {
                const { inputValue } = params;
                const filtered = options.filter(option => 
                  option.toLowerCase().includes(inputValue.toLowerCase())
                );
                // Limit to 50 results for performance
                return filtered.slice(0, 50);
              }}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Search or type skill" 
                  placeholder="e.g. React, Python..."
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 0,
                      '& fieldset': { border: '2px solid #000' }
                    }
                  }}
                />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ fontWeight: 800, color: '#000' }}>Cancel</Button>
          <Button 
            onClick={handleAddSkill}
            variant="contained"
            sx={{ bgcolor: '#000', color: '#fff', fontWeight: 800, borderRadius: 0 }}
          >
            ADD TO PROFILE
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SkillsTab;
