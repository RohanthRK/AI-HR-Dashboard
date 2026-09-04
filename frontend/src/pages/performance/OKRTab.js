import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  LinearProgress, 
  Chip, 
  Button,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton as MuiIconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import objectiveService from '../../services/objectiveService';
import teamService from '../../services/teamService';
import employeeService from '../../services/employeeService';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import Autocomplete from '@mui/material/Autocomplete';

const OKRTab = () => {
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scope, setScope] = useState('individual');
  const { currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedOkr, setSelectedOkr] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [myProfile, setMyProfile] = useState(null);
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);

  const myTeamName = (myProfile?.team || currentUser?.team || '').toLowerCase();
  const myTeamId = String(myProfile?.team_id || currentUser?.team_id || '');
  const myDeptName = (myProfile?.department || currentUser?.department || '').toLowerCase();
  const myDeptId = String(myProfile?.department_id || currentUser?.department_id || '');
  const myEmpId = myProfile?.employee_id || myProfile?._id || currentUser?.employee_id || currentUser?.id;
  const myEmail = myProfile?.email || currentUser?.email || '';

  // Filter teams strictly for Manager
  const managerFilteredTeams = teams.filter(t => {
    const tName = (t.name || '').toLowerCase();
    const tId = String(t.id || t._id || '');
    const isManagerOfTeam = t.manager_id && (t.manager_id === myEmpId || t.manager_id === currentUser?.id || t.manager_id === myProfile?._id);
    const isMemberOfTeam = Array.isArray(t.employees) && t.employees.some(e => {
      if (typeof e === 'string') return e === myEmpId || e.toLowerCase() === myEmail.toLowerCase();
      return (myEmpId && (e.id === myEmpId || e.employee_id === myEmpId || e._id === myEmpId)) || 
             (myEmail && e.email && e.email.toLowerCase() === myEmail.toLowerCase());
    });
    const isNamedTeam = (myTeamName && tName === myTeamName) || (myTeamId && tId === myTeamId);
    return isManagerOfTeam || isMemberOfTeam || isNamedTeam;
  });

  const availableTeams = currentUser?.role === 'Manager'
    ? (managerFilteredTeams.length > 0 ? managerFilteredTeams : (myTeamName ? [{ id: myTeamId || 'my-team', name: myProfile?.team || currentUser?.team }] : []))
    : teams;

  const managerFilteredDepts = departments.filter(d => {
    const dName = (d.name || '').toLowerCase();
    const dId = String(d.id || d._id || '');
    return (myDeptId && dId === myDeptId) || (myDeptName && dName === myDeptName);
  });

  const availableDepartments = currentUser?.role === 'Manager'
    ? (managerFilteredDepts.length > 0 ? managerFilteredDepts : (myDeptName ? [{ id: myDeptId || 'my-dept', name: myProfile?.department || currentUser?.department }] : []))
    : departments;

  const [newOkr, setNewOkr] = useState({
    title: '',
    description: '',
    scope: scope,
    team_id: '',
    department_id: '',
    status: 'On Track',
    progress: 0,
    key_results: [{ title: '', progress: 0 }]
  });

  const fetchObjectives = useCallback(async () => {
    setLoading(true);
    try {
      const params = { scope };
      
      // For non-admins, pass team/dept filter if known
      const activeTeam = myTeamId || myTeamName;
      const activeDept = myDeptId || myDeptName;
      if (scope === 'team' && activeTeam) {
        params.team_id = activeTeam;
      }
      if (scope === 'department' && activeDept) {
        params.department_id = activeDept;
      }
      
      const response = await objectiveService.getAllObjectives(params);
      setObjectives(response.data || []);
      setError(null);
    } catch (err) {
      setError('Failed to load OKRs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [scope, currentUser, myTeamId, myTeamName, myDeptId, myDeptName]);

  useEffect(() => {
    fetchObjectives();
  }, [fetchObjectives]);

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const teamsData = await teamService.getAllTeams();
        setTeams(Array.isArray(teamsData) ? teamsData : (teamsData.teams || []));
        
        const deptsData = await teamService.getAllDepartments();
        const deptList = deptsData.results || deptsData || [];
        setDepartments(deptList);

        // Auto-resolve current employee profile if missing details
        try {
          const allEmps = await employeeService.getAllEmployees();
          const me = (allEmps || []).find(e => 
            (myEmail && e.email?.toLowerCase() === myEmail.toLowerCase()) || 
            (myEmpId && (e.employee_id === myEmpId || e._id === myEmpId || e.id === myEmpId))
          );
          if (me) setMyProfile(me);
        } catch (eErr) {
          console.warn('Could not auto-resolve profile:', eErr);
        }
      } catch (err) {
        console.error('Failed to fetch org data', err);
      }
    };
    if (currentUser) fetchOrgData();
  }, [currentUser, myEmail, myEmpId]);

  const handleScopeChange = (event, newScope) => {
    if (newScope !== null) {
      setScope(newScope);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'on track': return '#40c057';
      case 'at risk': return '#fab005';
      case 'behind': return '#fa5252';
      case 'completed': return '#228be6';
      default: return '#868e96';
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <ToggleButtonGroup
          value={scope}
          exclusive
          onChange={handleScopeChange}
          sx={{ 
            '& .MuiToggleButton-root': {
              fontWeight: 800,
              px: 3,
              border: '2px solid #000',
              borderRadius: 0,
              '&.Mui-selected': {
                bgcolor: '#000',
                color: '#fff',
                '&:hover': { bgcolor: '#222' }
              }
            }
          }}
        >
          <ToggleButton value="individual">MY OKRs</ToggleButton>
          <ToggleButton value="team">TEAM OKRs</ToggleButton>
          <ToggleButton value="department">DEPT OKRs</ToggleButton>
        </ToggleButtonGroup>

        {(currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || scope === 'individual') && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              const defaultTeamObj = availableTeams[0] || null;
              const defaultDeptObj = availableDepartments[0] || null;
              const defaultTeam = defaultTeamObj ? (defaultTeamObj.id || defaultTeamObj._id || defaultTeamObj.name) : (myTeamId || myTeamName || '');
              const defaultTeamName = defaultTeamObj ? defaultTeamObj.name : (myProfile?.team || currentUser?.team || '');
              const defaultDept = defaultDeptObj ? (defaultDeptObj.id || defaultDeptObj._id || defaultDeptObj.name) : (myDeptId || myDeptName || '');
              const defaultDeptName = defaultDeptObj ? defaultDeptObj.name : (myProfile?.department || currentUser?.department || '');
              setNewOkr({ 
                ...newOkr, 
                scope: scope,
                team_id: scope === 'team' ? defaultTeam : '',
                team_name: scope === 'team' ? defaultTeamName : '',
                department_id: scope === 'department' ? defaultDept : '',
                department_name: scope === 'department' ? defaultDeptName : ''
              });
              setOpenCreate(true);
            }}
            sx={{
              bgcolor: '#000',
              color: '#fff',
              fontWeight: 900,
              borderRadius: 0,
              border: '2px solid #000',
              boxShadow: '4px 4px 0px #fcc419',
              '&:hover': { bgcolor: '#222', transform: 'translate(-2px, -2px)', boxShadow: '6px 6px 0px #fcc419' }
            }}
          >
            NEW OKR
          </Button>
        )}
      </Box>

      {/* Create Dialog */}
      <Dialog 
        open={openCreate} 
        onClose={() => setOpenCreate(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 0, border: '4px solid #000', boxShadow: '15px 15px 0px #000' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, borderBottom: '2px solid #000' }}>Create New OKR</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="OKR Title"
              fullWidth
              required
              value={newOkr.title}
              onChange={(e) => setNewOkr({ ...newOkr, title: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={2}
              value={newOkr.description}
              onChange={(e) => setNewOkr({ ...newOkr, description: e.target.value })}
            />
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={newOkr.status}
                    label="Status"
                    onChange={(e) => setNewOkr({ ...newOkr, status: e.target.value })}
                  >
                    <MenuItem value="On Track">On Track</MenuItem>
                    <MenuItem value="At Risk">At Risk</MenuItem>
                    <MenuItem value="Behind">Behind</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>Scope</InputLabel>
                  <Select
                    value={newOkr.scope}
                    label="Scope"
                    onChange={(e) => {
                      const newScopeVal = e.target.value;
                      const defaultTeamObj = availableTeams[0] || null;
                      const defaultDeptObj = availableDepartments[0] || null;
                      const defaultTeam = defaultTeamObj ? (defaultTeamObj.id || defaultTeamObj._id || defaultTeamObj.name) : (myTeamId || myTeamName || '');
                      const defaultTeamName = defaultTeamObj ? defaultTeamObj.name : (myProfile?.team || currentUser?.team || '');
                      const defaultDept = defaultDeptObj ? (defaultDeptObj.id || defaultDeptObj._id || defaultDeptObj.name) : (myDeptId || myDeptName || '');
                      const defaultDeptName = defaultDeptObj ? defaultDeptObj.name : (myProfile?.department || currentUser?.department || '');
                      setNewOkr({ 
                        ...newOkr, 
                        scope: newScopeVal,
                        team_id: newScopeVal === 'team' ? (newOkr.team_id || defaultTeam) : '',
                        team_name: newScopeVal === 'team' ? (newOkr.team_name || defaultTeamName) : '',
                        department_id: newScopeVal === 'department' ? (newOkr.department_id || defaultDept) : '',
                        department_name: newScopeVal === 'department' ? (newOkr.department_name || defaultDeptName) : ''
                      });
                    }}
                  >
                    <MenuItem value="individual">Individual</MenuItem>
                    <MenuItem value="team">Team</MenuItem>
                    <MenuItem value="department">Department</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {newOkr.scope === 'team' && (
              <Autocomplete
                options={availableTeams}
                getOptionLabel={(option) => option.name || (typeof option === 'string' ? option : '')}
                value={availableTeams.find(t => t.id === newOkr.team_id || t._id === newOkr.team_id || t.name === newOkr.team_id) || availableTeams[0] || null}
                onChange={(event, newValue) => {
                  setNewOkr({ 
                    ...newOkr, 
                    team_id: newValue ? (newValue.id || newValue._id || newValue.name) : '',
                    team_name: newValue ? (newValue.name || '') : ''
                  });
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Select Team" 
                    helperText={currentUser?.role === 'Manager' ? "Your assigned team(s)" : "Search and select the team for this OKR"}
                  />
                )}
              />
            )}
            {newOkr.scope === 'department' && (
              <Autocomplete
                options={availableDepartments}
                getOptionLabel={(option) => option.name || (typeof option === 'string' ? option : '')}
                value={availableDepartments.find(d => d.id === newOkr.department_id || d._id === newOkr.department_id || d.name === newOkr.department_id) || availableDepartments[0] || null}
                onChange={(event, newValue) => {
                  setNewOkr({ 
                    ...newOkr, 
                    department_id: newValue ? (newValue.id || newValue._id || newValue.name) : '',
                    department_name: newValue ? (newValue.name || '') : ''
                  });
                }}
                renderInput={(params) => (
                  <TextField 
                    {...params} 
                    label="Select Department" 
                    helperText={currentUser?.role === 'Manager' ? "Your assigned department" : "Search and select the department for this OKR"}
                  />
                )}
              />
            )}

            <Typography variant="subtitle2" sx={{ fontWeight: 900, mt: 2 }}>Key Results</Typography>
            {newOkr.key_results.map((kr, idx) => (
              <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  placeholder="Key Result Title"
                  size="small"
                  fullWidth
                  value={kr.title}
                  onChange={(e) => {
                    const newKRs = [...newOkr.key_results];
                    newKRs[idx].title = e.target.value;
                    setNewOkr({ ...newOkr, key_results: newKRs });
                  }}
                />
                <TextField
                  placeholder="%"
                  size="small"
                  type="number"
                  sx={{ width: 80 }}
                  value={kr.progress}
                  onChange={(e) => {
                    const newKRs = [...newOkr.key_results];
                    newKRs[idx].progress = parseInt(e.target.value);
                    setNewOkr({ ...newOkr, key_results: newKRs });
                  }}
                />
                <MuiIconButton 
                  onClick={() => {
                    const newKRs = newOkr.key_results.filter((_, i) => i !== idx);
                    setNewOkr({ ...newOkr, key_results: newKRs });
                  }}
                  disabled={newOkr.key_results.length === 1}
                >
                  <DeleteIcon />
                </MuiIconButton>
              </Box>
            ))}
            <Button 
              startIcon={<AddIcon />} 
              size="small" 
              onClick={() => setNewOkr({ ...newOkr, key_results: [...newOkr.key_results, { title: '', progress: 0 }] })}
            >
              Add Key Result
            </Button>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '2px solid #000' }}>
          <Button onClick={() => setOpenCreate(false)} sx={{ fontWeight: 800, color: '#000' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              setSubmitting(true);
              try {
                await objectiveService.createObjective({
                  ...newOkr,
                  employee_id: currentUser?.employee_id
                });
                enqueueSnackbar('OKR created successfully', { variant: 'success' });
                setOpenCreate(false);
                fetchObjectives();
                setNewOkr({
                  title: '',
                  description: '',
                  scope: scope,
                  team_id: '',
                  department_id: '',
                  status: 'On Track',
                  progress: 0,
                  key_results: [{ title: '', progress: 0 }]
                });
              } catch (err) {
                enqueueSnackbar('Failed to create OKR', { variant: 'error' });
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting || !newOkr.title}
            sx={{ bgcolor: '#000', color: '#fff', fontWeight: 900, borderRadius: 0 }}
          >
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'CREATE OKR'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog 
        open={openEdit} 
        onClose={() => setOpenEdit(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 0, border: '4px solid #000', boxShadow: '15px 15px 0px #000' } }}
      >
        <DialogTitle sx={{ fontWeight: 900, borderBottom: '2px solid #000' }}>Update OKR</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedOkr && (
            <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="OKR Title"
                fullWidth
                required
                value={selectedOkr.title}
                onChange={(e) => setSelectedOkr({ ...selectedOkr, title: e.target.value })}
              />
              <TextField
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={selectedOkr.description}
                onChange={(e) => setSelectedOkr({ ...selectedOkr, description: e.target.value })}
              />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={selectedOkr.status}
                      label="Status"
                      onChange={(e) => setSelectedOkr({ ...selectedOkr, status: e.target.value })}
                    >
                      <MenuItem value="On Track">On Track</MenuItem>
                      <MenuItem value="At Risk">At Risk</MenuItem>
                      <MenuItem value="Behind">Behind</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="Progress (%)"
                    fullWidth
                    type="number"
                    value={selectedOkr.progress}
                    onChange={(e) => setSelectedOkr({ ...selectedOkr, progress: parseInt(e.target.value) })}
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle2" sx={{ fontWeight: 900, mt: 2 }}>Key Results</Typography>
              {selectedOkr.key_results?.map((kr, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    placeholder="Key Result Title"
                    size="small"
                    fullWidth
                    value={kr.title}
                    onChange={(e) => {
                      const newKRs = [...selectedOkr.key_results];
                      newKRs[idx].title = e.target.value;
                      setSelectedOkr({ ...selectedOkr, key_results: newKRs });
                    }}
                  />
                  <TextField
                    placeholder="%"
                    size="small"
                    type="number"
                    sx={{ width: 80 }}
                    value={kr.progress}
                    onChange={(e) => {
                      const newKRs = [...selectedOkr.key_results];
                      newKRs[idx].progress = parseInt(e.target.value);
                      setSelectedOkr({ ...selectedOkr, key_results: newKRs });
                    }}
                  />
                  <MuiIconButton 
                    onClick={() => {
                      const newKRs = selectedOkr.key_results.filter((_, i) => i !== idx);
                      setSelectedOkr({ ...selectedOkr, key_results: newKRs });
                    }}
                    disabled={selectedOkr.key_results.length === 1}
                  >
                    <DeleteIcon />
                  </MuiIconButton>
                </Box>
              ))}
              <Button 
                startIcon={<AddIcon />} 
                size="small" 
                onClick={() => setSelectedOkr({ ...selectedOkr, key_results: [...selectedOkr.key_results, { title: '', progress: 0 }] })}
              >
                Add Key Result
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '2px solid #000' }}>
          <Button onClick={() => setOpenEdit(false)} sx={{ fontWeight: 800, color: '#000' }}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={async () => {
              setSubmitting(true);
              try {
                const krs = selectedOkr.key_results || [];
                const autoProgress = krs.length > 0
                  ? Math.round(krs.reduce((acc, kr) => acc + (parseInt(kr.progress) || 0), 0) / krs.length)
                  : (parseInt(selectedOkr.progress) || 0);
                await objectiveService.updateObjective(selectedOkr._id, {
                  ...selectedOkr,
                  progress: autoProgress
                });
                enqueueSnackbar('OKR updated successfully', { variant: 'success' });
                setOpenEdit(false);
                fetchObjectives();
              } catch (err) {
                enqueueSnackbar('Failed to update OKR', { variant: 'error' });
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting || !selectedOkr?.title}
            sx={{ bgcolor: '#000', color: '#fff', fontWeight: 900, borderRadius: 0 }}
          >
            {submitting ? <CircularProgress size={24} color="inherit" /> : 'SAVE CHANGES'}
          </Button>
        </DialogActions>
      </Dialog>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="inherit" />
        </Box>
      ) : null}

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 4, borderRadius: 0, border: '2px solid #000', fontWeight: 900 }}
        >
          {error}
        </Alert>
      )}

      {!loading && !error && objectives.length === 0 && (
        <Box sx={{ 
          textAlign: 'center', 
          py: 12, 
          bgcolor: alpha('#000', 0.05), 
          border: '3px dashed #000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <TrackChangesIcon sx={{ fontSize: 80, color: alpha('#000', 0.1), mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 1 }}>NO OKRS FOUND</Typography>
          <Typography variant="body1" color="text.secondary">
            No objectives have been set for this selection yet.
          </Typography>
        </Box>
      )}

      {!loading && objectives.length > 0 && (
        <Grid container spacing={3}>
          {objectives.map((okr) => (
            <Grid item xs={12} key={okr._id}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  border: '3px solid #000',
                  borderRadius: 0,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '8px 8px 0px #000',
                    transform: 'translate(-4px, -4px)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>{okr.title}</Typography>
                    {(scope === 'individual' ||
                      currentUser?.role === 'Admin' || 
                      currentUser?.role === 'Manager' || 
                      okr.employee_id === currentUser?.employee_id || 
                      okr.employee_id === currentUser?.employee_code ||
                      okr.employee_id === currentUser?.id || 
                      okr.employee_id === currentUser?._id) && (
                      <MuiIconButton 
                        size="small" 
                        sx={{ ml: 1, border: '1px solid #000', borderRadius: 0, '&:hover': { bgcolor: '#fcc419' } }}
                        onClick={() => {
                          setSelectedOkr({
                            ...okr,
                            key_results: Array.isArray(okr.key_results) && okr.key_results.length > 0 
                              ? okr.key_results.map(kr => ({ ...kr, progress: kr.progress || 0 })) 
                              : [{ title: '', progress: 0 }]
                          });
                          setOpenEdit(true);
                        }}
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </MuiIconButton>
                    )}
                  </Box>
                  <Chip 
                    label={okr.status} 
                    sx={{ 
                      fontWeight: 900, 
                      borderRadius: 0, 
                      border: '2px solid #000',
                      bgcolor: getStatusColor(okr.status),
                      color: '#fff',
                      ml: 2
                    }} 
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>Progress</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>{okr.progress}%</Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={okr.progress} 
                    sx={{ 
                      height: 12, 
                      borderRadius: 0, 
                      border: '2px solid #000',
                      bgcolor: alpha('#000', 0.05),
                      '& .MuiLinearProgress-bar': {
                        bgcolor: okr.progress === 100 ? '#40c057' : '#fcc419'
                      }
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>Key Results:</Typography>
                  {okr.key_results?.map((kr, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <CheckCircleIcon sx={{ fontSize: 16, mr: 1, color: kr.progress === 100 ? '#40c057' : '#888' }} />
                      <Typography variant="body2" sx={{ flex: 1 }}>{kr.title}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>{kr.progress}%</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default OKRTab;
