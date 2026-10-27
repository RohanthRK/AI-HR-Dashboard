import React, { useState } from 'react';
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, IconButton, MenuItem, Paper,
  Select, TextField, Typography, Chip, OutlinedInput
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

const slug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';

const uniqueId = (base, taken) => {
  let id = slug(base);
  let n = 2;
  while (taken.has(id)) {
    id = `${slug(base)}-${n}`;
    n += 1;
  }
  return id;
};

/** Visual editor for the skill catalogue: categories with skills, and roles with required / recommended skills. */
const SkillCatalogEditor = ({ open, catalog, onClose, onSave }) => {
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setCategories(JSON.parse(JSON.stringify(catalog.categories || [])));
      setRoles(JSON.parse(JSON.stringify(catalog.roles || [])));
      setError(null);
    }
  }, [open, catalog]);

  const allSkills = categories.flatMap((c) => c.skills);
  const takenIds = () => new Set(allSkills.map((s) => s.id));

  const updateCategory = (ci, patch) => setCategories(categories.map((c, i) => (i === ci ? { ...c, ...patch } : c)));
  const addSkill = (ci) => updateCategory(ci, { skills: [...categories[ci].skills, { id: uniqueId('new-skill', takenIds()), name: '', description: '' }] });
  const updateSkill = (ci, si, patch) => updateCategory(ci, { skills: categories[ci].skills.map((s, i) => (i === si ? { ...s, ...patch } : s)) });
  const removeSkill = (ci, si) => {
    const removed = categories[ci].skills[si].id;
    updateCategory(ci, { skills: categories[ci].skills.filter((_, i) => i !== si) });
    setRoles(roles.map((r) => ({ ...r, requiredSkills: r.requiredSkills.filter((x) => x !== removed), recommendedSkills: r.recommendedSkills.filter((x) => x !== removed) })));
  };
  const addCategory = () => setCategories([...categories, { id: uniqueId('category', new Set(categories.map((c) => c.id))), name: '', skills: [] }]);
  const removeCategory = (ci) => {
    const gone = new Set(categories[ci].skills.map((s) => s.id));
    setCategories(categories.filter((_, i) => i !== ci));
    setRoles(roles.map((r) => ({ ...r, requiredSkills: r.requiredSkills.filter((x) => !gone.has(x)), recommendedSkills: r.recommendedSkills.filter((x) => !gone.has(x)) })));
  };

  const updateRole = (ri, patch) => setRoles(roles.map((r, i) => (i === ri ? { ...r, ...patch } : r)));
  const addRole = () => setRoles([...roles, { id: uniqueId('role', new Set(roles.map((r) => r.id))), title: '', description: '', requiredSkills: [], recommendedSkills: [] }]);

  const skillName = (id) => allSkills.find((s) => s.id === id)?.name || id;

  const save = async () => {
    if (categories.some((c) => !c.name.trim() || c.skills.some((s) => !s.name.trim()))) {
      setError('Every category and skill needs a name.');
      return;
    }
    if (roles.some((r) => !r.title.trim())) {
      setError('Every role needs a title.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ categories, roles });
    } catch (e) {
      setError(e.response?.data?.message || 'Could not save the catalogue.');
    } finally {
      setSaving(false);
    }
  };

  const skillPicker = (value, onChange, label) => (
    <Select multiple size="small" displayEmpty value={value} onChange={(e) => onChange(e.target.value)} fullWidth
      input={<OutlinedInput />} renderValue={(selected) => (selected.length ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((id) => <Chip key={id} size="small" label={skillName(id)} />)}</Box>
      ) : <Typography color="text.secondary">{label}</Typography>)}>
      {allSkills.filter((s) => s.name.trim()).map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
    </Select>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Skill catalogue</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Typography variant="h6" gutterBottom>Skills</Typography>
        {categories.map((cat, ci) => (
          <Paper key={cat.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField size="small" fullWidth label="Category" value={cat.name} onChange={(e) => updateCategory(ci, { name: e.target.value })} />
              <IconButton aria-label="remove category" onClick={() => removeCategory(ci)}><DeleteIcon /></IconButton>
            </Box>
            {cat.skills.map((skill, si) => (
              <Box key={skill.id} sx={{ display: 'flex', gap: 1, mb: 1, ml: 2 }}>
                <TextField size="small" label="Skill" value={skill.name} onChange={(e) => updateSkill(ci, si, { name: e.target.value })} />
                <TextField size="small" fullWidth label="Description" value={skill.description || ''} onChange={(e) => updateSkill(ci, si, { description: e.target.value })} />
                <IconButton aria-label="remove skill" onClick={() => removeSkill(ci, si)}><DeleteIcon /></IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<AddIcon />} onClick={() => addSkill(ci)} sx={{ ml: 2 }}>Add skill</Button>
          </Paper>
        ))}
        <Button startIcon={<AddIcon />} onClick={addCategory}>Add category</Button>

        <Divider sx={{ my: 3 }} />
        <Typography variant="h6" gutterBottom>Roles</Typography>
        {roles.map((role, ri) => (
          <Paper key={role.id} variant="outlined" sx={{ p: 2, mb: 2, display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField size="small" fullWidth label="Role title" value={role.title} onChange={(e) => updateRole(ri, { title: e.target.value })} />
              <IconButton aria-label="remove role" onClick={() => setRoles(roles.filter((_, i) => i !== ri))}><DeleteIcon /></IconButton>
            </Box>
            <TextField size="small" label="Description" value={role.description || ''} onChange={(e) => updateRole(ri, { description: e.target.value })} />
            {skillPicker(role.requiredSkills, (v) => updateRole(ri, { requiredSkills: v }), 'Required skills')}
            {skillPicker(role.recommendedSkills, (v) => updateRole(ri, { recommendedSkills: v }), 'Recommended skills')}
          </Paper>
        ))}
        <Button startIcon={<AddIcon />} onClick={addRole}>Add role</Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SkillCatalogEditor;
