import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Paper,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Collapse,
  IconButton,
  Divider,
  Tooltip
} from '@mui/material';
import { 
  Link as LinkIcon, 
  CheckCircle, 
  Error as ErrorIcon, 
  Close,
  HubOutlined,
  NavigateNext
} from '@mui/icons-material';
import axios from 'axios';

export const HubSpotIntegration = ({ user, org, integrationParams, setIntegrationParams, onConnectionComplete }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(0);

  // To connect hubspot with authO, a request is sent to backend. In response we get a URL for hubspot authorization.
  const handleConnectClick = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      
      const formData = new FormData();
      formData.append('user_id', user);
      formData.append('org_id', org);
      
      const response = await axios.post(
        `http://localhost:8000/integrations/hubspot/authorize`, 
        formData
      );
      
      const authURL = response?.data;
      
      // Open popup for authorization
      const newWindow = window.open(
        authURL, 
        'HubSpot Authorization', 
        'width=600, height=600'
      );
      
      setActiveStep(1);
      
      // Poll to check if window is closed
      const pollTimer = window.setInterval(() => {
        if (newWindow?.closed !== false) {
          window.clearInterval(pollTimer);
          handleWindowClosed();
        }
      }, 200);
      
    } catch (err) {
      setIsConnecting(false);
      setError(err?.response?.data?.detail || 'Failed to connect to HubSpot');
      setActiveStep(0);
    }
  };

  // When the hubspot is authorized, we fetch credentials from the backend.
  const handleWindowClosed = async () => {
    try {
      setActiveStep(2);
      
      const formData = new FormData();
      formData.append('user_id', user);
      formData.append('org_id', org);
      
      const response = await axios.post(
        `http://localhost:8000/integrations/hubspot/credentials`, 
        formData
      );
      
      const credentials = response.data;
      
      if (credentials) {
        setIsConnected(true);
        setIntegrationParams(prev => ({ 
          ...prev, 
          credentials: credentials, 
          type: 'HubSpot' 
        }));
        setActiveStep(3);
      } else {
        throw new Error('No credentials received');
      }
      
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to retrieve credentials');
      setActiveStep(0);
    } finally {
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    if (integrationParams?.credentials) {
      setIsConnected(true);
      setActiveStep(3);
    }
  }, [integrationParams?.credentials]);

  const connectionSteps = [
    'Initiate Connection',
    'Authorize in HubSpot',
    'Retrieve Credentials',
    'Connected'
  ];

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2, width: '100%' }}>
      <Box display="flex" alignItems="center" mb={2}>
        <HubOutlined sx={{ fontSize: 28, mr: 1, color: '#ff7a59' }} />
        <Typography variant="h6" component="h2">
          HubSpot Integration
        </Typography>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      <Collapse in={!!error}>
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          action={
            <IconButton size="small" onClick={() => setError(null)}>
              <Close fontSize="small" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      </Collapse>
      
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {connectionSteps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        sx={{ mt: 2, mb: 2 }}
      >
        {isConnected ? (
          <Box textAlign="center">
            <CheckCircle color="success" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Successfully Connected to HubSpot
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Your HubSpot account is now linked and ready to use
            </Typography>
            
            <Button
              variant="contained"
              color="primary"
              onClick={onConnectionComplete}
              endIcon={<NavigateNext />}
            >
              Proceed to Data
            </Button>
          </Box>
        ) : (
          <Box textAlign="center" sx={{ maxWidth: 500, mx: 'auto' }}>
            {isConnecting ? (
              <Box>
                <CircularProgress size={48} sx={{ mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {activeStep === 1 ? 'Waiting for Authorization' : 'Retrieving Credentials'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {activeStep === 1 
                    ? 'Please complete the authorization in the popup window' 
                    : 'Processing your connection...'}
                </Typography>
              </Box>
            ) : (
              <Box>
                <LinkIcon sx={{ fontSize: 48, mb: 2, color: 'primary.main' }} />
                <Typography variant="h6" gutterBottom>
                  Connect to HubSpot
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Link your HubSpot account to access and manage your contacts, deals, and more
                </Typography>
                <Tooltip title={!user || !org ? "User and organization information required" : ""}>
                  <span>
                    <Button
                      variant="contained"
                      size="large"
                      onClick={handleConnectClick}
                      disabled={isConnecting || !user || !org}
                      startIcon={<HubOutlined />}
                      sx={{ 
                        bgcolor: '#ff7a59', 
                        '&:hover': { bgcolor: '#ff5c35' },
                        px: 3
                      }}
                    >
                      Connect to HubSpot
                    </Button>
                  </span>
                </Tooltip>
              </Box>
            )}
          </Box>
        )}
      </Box>
      
      {isConnected && (
        <Box textAlign="center" mt={2}>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              setIsConnected(false);
              setActiveStep(0);
              setIntegrationParams(prev => ({ ...prev, credentials: null, type: null }));
            }}
          >
            Disconnect
          </Button>
        </Box>
      )}
    </Paper>
  );
};