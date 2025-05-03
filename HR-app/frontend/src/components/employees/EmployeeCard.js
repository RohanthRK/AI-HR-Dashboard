import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Avatar,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Email as EmailIcon, 
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Work as WorkIcon
} from '@mui/icons-material';
import { alpha, styled } from '@mui/material/styles';

// Styled components
const StyledCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: theme.shadows[10],
  },
}));

const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 80,
  height: 80,
  margin: '0 auto',
  border: `3px solid ${theme.palette.primary.light}`,
  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
}));

const StyledChip = styled(Chip)(({ theme, status }) => ({
  backgroundColor: 
    status === 'Active' ? alpha(theme.palette.success.main, 0.1) :
    status === 'Inactive' ? alpha(theme.palette.error.main, 0.1) :
    alpha(theme.palette.warning.main, 0.1),
  color: 
    status === 'Active' ? theme.palette.success.dark :
    status === 'Inactive' ? theme.palette.error.dark :
    theme.palette.warning.dark,
  fontWeight: 600,
  height: 24,
}));

const ContactItem = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(0.5),
}));

const EmployeeCard = ({ employee, onEdit, onDelete }) => {
  return (
    <StyledCard>
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Avatar and status */}
        <Box sx={{ mb: 2, position: 'relative', textAlign: 'center' }}>
          <StyledAvatar 
            src={employee.profile_picture}
            alt={employee.name}
          >
            {!employee.profile_picture && employee.name.charAt(0)}
          </StyledAvatar>
          
          <Box sx={{ position: 'absolute', right: 0, top: 0 }}>
            <StyledChip
              label={employee.status}
              size="small"
              status={employee.status}
            />
          </Box>
        </Box>
        
        {/* Name and role */}
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2" noWrap>
            {employee.name}
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}
          >
            <WorkIcon fontSize="small" />
            {employee.role}
          </Typography>
        </Box>
        
        <Divider sx={{ my: 1.5 }} />
        
        {/* Employee details */}
        <Box sx={{ mb: 1 }}>
          <ContactItem>
            <BadgeIcon fontSize="small" color="primary" />
            <Typography variant="body2" noWrap>
              ID: {employee.employee_id}
            </Typography>
          </ContactItem>
          
          <ContactItem>
            <EmailIcon fontSize="small" color="primary" />
            <Typography variant="body2" noWrap>
              {employee.email}
            </Typography>
          </ContactItem>
          
          <ContactItem>
            <PhoneIcon fontSize="small" color="primary" />
            <Typography variant="body2" noWrap>
              {employee.phone}
            </Typography>
          </ContactItem>
        </Box>
        
        <Box sx={{ mt: 'auto' }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Department:</strong> {employee.department}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <strong>Joined:</strong> {new Date(employee.joining_date).toLocaleDateString()}
          </Typography>
        </Box>
      </CardContent>
      
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => window.location.href = `/employees/${employee.id}`}
        >
          View Profile
        </Button>
        
        <Box>
          <Tooltip title="Edit">
            <IconButton 
              size="small" 
              color="primary"
              onClick={() => onEdit(employee)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete">
            <IconButton 
              size="small" 
              color="error"
              onClick={() => onDelete(employee)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </StyledCard>
  );
};

export default EmployeeCard; 