import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Tabs,
  Tab,
  TextField,
  Button,
  FormControl,
  FormControlLabel,
  Switch,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert
} from '@mui/material';

const Settings = () => {
  const [tabValue, setTabValue] = useState(0);
  const [saved, setSaved] = useState(false);
  
  // Mock settings
  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'Acme Corporation',
    timezone: 'UTC-5 (Eastern Time)',
    dateFormat: 'MM/DD/YYYY',
    fiscalYearStart: '01/01',
    workWeekStart: 'Monday',
    defaultLanguage: 'English'
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    leaveApprovals: true,
    newEmployees: true,
    performanceReviews: true,
    systemUpdates: false,
    dailyReports: false
  });
  
  const [integrationSettings, setIntegrationSettings] = useState({
    googleCalendar: true,
    slack: false,
    microsoftTeams: false,
    zoom: true,
    dropbox: false
  });
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    passwordExpiry: '90 days',
    sessionTimeout: '30 minutes',
    ipRestriction: false
  });

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleGeneralSettingChange = (e) => {
    const { name, value } = e.target;
    setGeneralSettings({
      ...generalSettings,
      [name]: value
    });
    setSaved(false);
  };

  const handleNotificationToggle = (setting) => {
    setNotificationSettings({
      ...notificationSettings,
      [setting]: !notificationSettings[setting]
    });
    setSaved(false);
  };

  const handleIntegrationToggle = (setting) => {
    setIntegrationSettings({
      ...integrationSettings,
      [setting]: !integrationSettings[setting]
    });
    setSaved(false);
  };

  const handleSecuritySettingChange = (e) => {
    const { name, value } = e.target;
    setSecuritySettings({
      ...securitySettings,
      [name]: value
    });
    setSaved(false);
  };

  const handleSecurityToggle = (setting) => {
    setSecuritySettings({
      ...securitySettings,
      [setting]: !securitySettings[setting]
    });
    setSaved(false);
  };

  const handleSaveSettings = () => {
    // In a real app, API call to save settings would go here
    console.log({
      generalSettings,
      notificationSettings,
      integrationSettings,
      securitySettings
    });
    
    // Show success alert
    setSaved(true);
    
    // Hide alert after 3 seconds
    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        System Settings
      </Typography>
      
      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="General" />
          <Tab label="Notifications" />
          <Tab label="Integrations" />
          <Tab label="Security" />
        </Tabs>
        
        <Box sx={{ p: 3 }}>
          {/* General Settings */}
          {tabValue === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  name="companyName"
                  value={generalSettings.companyName}
                  onChange={handleGeneralSettingChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Timezone"
                  name="timezone"
                  value={generalSettings.timezone}
                  onChange={handleGeneralSettingChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Date Format"
                  name="dateFormat"
                  value={generalSettings.dateFormat}
                  onChange={handleGeneralSettingChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Fiscal Year Start"
                  name="fiscalYearStart"
                  value={generalSettings.fiscalYearStart}
                  onChange={handleGeneralSettingChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Work Week Start"
                  name="workWeekStart"
                  value={generalSettings.workWeekStart}
                  onChange={handleGeneralSettingChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Default Language"
                  name="defaultLanguage"
                  value={generalSettings.defaultLanguage}
                  onChange={handleGeneralSettingChange}
                  margin="normal"
                />
              </Grid>
            </Grid>
          )}
          
          {/* Notification Settings */}
          {tabValue === 1 && (
            <List>
              <ListItem>
                <ListItemText 
                  primary="Email Notifications"
                  secondary="Receive notifications via email" 
                />
                <Switch
                  edge="end"
                  checked={notificationSettings.emailNotifications}
                  onChange={() => handleNotificationToggle('emailNotifications')}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="Leave Approvals"
                  secondary="Get notified when leave requests need approval" 
                />
                <Switch
                  edge="end"
                  checked={notificationSettings.leaveApprovals}
                  onChange={() => handleNotificationToggle('leaveApprovals')}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="New Employees"
                  secondary="Get notified when new employees are added" 
                />
                <Switch
                  edge="end"
                  checked={notificationSettings.newEmployees}
                  onChange={() => handleNotificationToggle('newEmployees')}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="Performance Reviews"
                  secondary="Get notified about performance review cycles" 
                />
                <Switch
                  edge="end"
                  checked={notificationSettings.performanceReviews}
                  onChange={() => handleNotificationToggle('performanceReviews')}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="System Updates"
                  secondary="Get notified about system updates and maintenance" 
                />
                <Switch
                  edge="end"
                  checked={notificationSettings.systemUpdates}
                  onChange={() => handleNotificationToggle('systemUpdates')}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="Daily Reports"
                  secondary="Receive daily summary reports" 
                />
                <Switch
                  edge="end"
                  checked={notificationSettings.dailyReports}
                  onChange={() => handleNotificationToggle('dailyReports')}
                />
              </ListItem>
            </List>
          )}
          
          {/* Integration Settings */}
          {tabValue === 2 && (
            <List>
              <ListItem>
                <ListItemText 
                  primary="Google Calendar"
                  secondary="Sync employee leaves and events with Google Calendar" 
                />
                <Switch
                  edge="end"
                  checked={integrationSettings.googleCalendar}
                  onChange={() => handleIntegrationToggle('googleCalendar')}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="Slack"
                  secondary="Send notifications and updates to Slack channels" 
                />
                <Switch
                  edge="end"
                  checked={integrationSettings.slack}
                  onChange={() => handleIntegrationToggle('slack')}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="Microsoft Teams"
                  secondary="Integrate with Microsoft Teams for communication" 
                />
                <Switch
                  edge="end"
                  checked={integrationSettings.microsoftTeams}
                  onChange={() => handleIntegrationToggle('microsoftTeams')}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="Zoom"
                  secondary="Schedule and manage meetings via Zoom" 
                />
                <Switch
                  edge="end"
                  checked={integrationSettings.zoom}
                  onChange={() => handleIntegrationToggle('zoom')}
                />
              </ListItem>
              <Divider />
              <ListItem>
                <ListItemText 
                  primary="Dropbox"
                  secondary="Store and share documents via Dropbox" 
                />
                <Switch
                  edge="end"
                  checked={integrationSettings.dropbox}
                  onChange={() => handleIntegrationToggle('dropbox')}
                />
              </ListItem>
            </List>
          )}
          
          {/* Security Settings */}
          {tabValue === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.twoFactorAuth}
                      onChange={() => handleSecurityToggle('twoFactorAuth')}
                    />
                  }
                  label="Enable Two-Factor Authentication"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Password Expiry"
                  name="passwordExpiry"
                  value={securitySettings.passwordExpiry}
                  onChange={handleSecuritySettingChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Session Timeout"
                  name="sessionTimeout"
                  value={securitySettings.sessionTimeout}
                  onChange={handleSecuritySettingChange}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={securitySettings.ipRestriction}
                      onChange={() => handleSecurityToggle('ipRestriction')}
                    />
                  }
                  label="Enable IP Restriction"
                />
              </Grid>
            </Grid>
          )}
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" color="primary" onClick={handleSaveSettings}>
              Save Settings
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default Settings; 