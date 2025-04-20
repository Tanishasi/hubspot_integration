import { useState } from 'react';
import {
    Box,
    Autocomplete,
    TextField,
    Button,
    Paper,
    Typography
} from '@mui/material';
import { DataForm } from './data-form';
import { HubSpotIntegration } from './integrations/hubspot';
import { NavigateNext, NavigateBefore } from '@mui/icons-material';

const integrationMapping = {
    'HubSpot': HubSpotIntegration,
};

export const IntegrationForm = () => {
    const [integrationParams, setIntegrationParams] = useState({});
    const [user, setUser] = useState('TestUser');
    const [org, setOrg] = useState('TestOrg');
    const [currType, setCurrType] = useState(null);
    const [activeStep, setActiveStep] = useState(0);
    const CurrIntegration = integrationMapping[currType];

    // Handle navigation between steps
    const handleNext = () => {
        setActiveStep((prevStep) => prevStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    // Check if the user can proceed to the next step
    const canProceedToConnection = activeStep === 0 && currType && user && org;
    const canProceedToData = activeStep === 1 && integrationParams?.credentials;

    // Reset integration process
    const handleReset = () => {
        setActiveStep(0);
        setIntegrationParams({});
        setCurrType(null);
    };

    // Get current step title
    const getStepTitle = () => {
        switch (activeStep) {
            case 0:
                return "Select Integration";
            case 1:
                return `Configure ${currType} Connection`;
            case 2:
                return `${currType} Data`;
            default:
                return "";
        }
    };

    // Render the current step content
    const renderStepContent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <Box display='flex' flexDirection='column' sx={{ width: '100%', maxWidth: 400, mx: 'auto', mt: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Integration Details
                        </Typography>
                        <TextField
                            label="User"
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            sx={{ mt: 2 }}
                            fullWidth
                        />
                        <TextField
                            label="Organization"
                            value={org}
                            onChange={(e) => setOrg(e.target.value)}
                            sx={{ mt: 2 }}
                            fullWidth
                        />
                        <Autocomplete
                            id="integration-type"
                            options={Object.keys(integrationMapping)}
                            sx={{ mt: 2 }}
                            fullWidth
                            renderInput={(params) => <TextField {...params} label="Integration Type" />}
                            onChange={(e, value) => setCurrType(value)}
                            value={currType}
                        />
                    </Box>
                );
            case 1:
                return (
                    <Box sx={{ width: '100%', mt: 3 }}>
                        {currType && (
                            <CurrIntegration 
                                user={user} 
                                org={org} 
                                integrationParams={integrationParams} 
                                setIntegrationParams={setIntegrationParams}
                                onConnectionComplete={handleNext} 
                            />
                        )}
                    </Box>
                );
            case 2:
                return (
                    <Box sx={{ width: '100%', mt: 3 }}>
                        {integrationParams?.credentials && (
                            <DataForm 
                                integrationType={integrationParams?.type} 
                                credentials={integrationParams?.credentials} 
                            />
                        )}
                    </Box>
                );
            default:
                return null;
        }
    };

    return (
        <Box sx={{ width: '100%', p: 3 }}>
            <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
                <Typography variant="h5" gutterBottom align="center">
                    {getStepTitle()}
                </Typography>

                {renderStepContent()}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
                    <Button
                        variant="outlined"
                        onClick={handleBack}
                        disabled={activeStep === 0}
                        startIcon={<NavigateBefore />}
                    >
                        Back
                    </Button>
                    
                    <Box>
                        {activeStep === 2 ? (
                            <Button 
                                variant="contained" 
                                color="primary" 
                                onClick={handleReset}
                            >
                                Start New Integration
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleNext}
                                disabled={(activeStep === 0 && !canProceedToConnection) || 
                                         (activeStep === 1 && !canProceedToData)}
                                endIcon={<NavigateNext />}
                            >
                                Next
                            </Button>
                        )}
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};