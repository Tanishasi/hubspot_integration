import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Collapse,
  IconButton,
  Divider,
  Card,
  CardContent,
  Chip,
  ButtonGroup,
  Tabs,
  Tab
} from '@mui/material';
import { 
  DataObject, 
  Refresh, 
  Close, 
  DeleteOutline, 
  People, 
  Business, 
  MonetizationOn 
} from '@mui/icons-material';
import axios from 'axios';

const endpointMapping = {
  'HubSpot': 'hubspot'
};

export const DataForm = ({ integrationType, credentials }) => {
  const [loadedData, setLoadedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeDataType, setActiveDataType] = useState('contacts');
  const endpoint = endpointMapping[integrationType];

  const dataTypes = {
    'HubSpot': [
      { id: 'contacts', label: 'Contacts', icon: <People fontSize="small" /> },
      { id: 'companies', label: 'Companies', icon: <Business fontSize="small" /> },
      { id: 'deals', label: 'Deals', icon: <MonetizationOn fontSize="small" /> }
    ]
  };

  const handleLoad = async (dataType = activeDataType) => {
    try {
      setLoading(true);
      setError(null);
      setActiveDataType(dataType);

      const formData = new FormData();
      formData.append('credentials', JSON.stringify(credentials));

      // Use the specific endpoint for the data type
      const response = await axios.post(
        `http://localhost:8000/integrations/${endpoint}/load/${dataType}`,
        formData
      );

      setLoadedData(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || `Failed to load ${dataType}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setLoadedData(null);
    setError(null);
  };

  const handleTabChange = (event, newValue) => {
    if (newValue !== activeDataType) {
      setLoadedData(null);
      setActiveDataType(newValue);
    }
  };

  // Render contacts
  const renderContacts = (data) => {
    if (!data || data.length === 0) {
      return <Typography color="text.secondary">No contacts available</Typography>;
    }

    return (
      <Box sx={{ maxHeight: 500, overflowY: 'auto', width: '100%' }}>
        {data.map((item, index) => (
          <Card key={index} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {item.firstName || ''} {item.lastName || ''}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                <strong>Email:</strong> {item.email || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Phone:</strong> {item.phone || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Job Title:</strong> {item.jobTitle || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Company:</strong> {item.company || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Location:</strong>{' '}
                {[item.city, item.state, item.country].filter(Boolean).join(', ') || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Last Updated: {new Date(item.updatedAt).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  // Render companies
  const renderCompanies = (data) => {
    if (!data || data.length === 0) {
      return <Typography color="text.secondary">No companies available</Typography>;
    }

    return (
      <Box sx={{ maxHeight: 500, overflowY: 'auto', width: '100%' }}>
        {data.map((item, index) => (
          <Card key={index} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {item.name || 'Unnamed Company'}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                <strong>Domain:</strong> {item.domain || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Industry:</strong> {item.industry || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Phone:</strong> {item.phone || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Address:</strong> {item.address || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Location:</strong>{' '}
                {[item.city, item.state, item.country].filter(Boolean).join(', ') || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Last Updated: {new Date(item.updatedAt).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  // Render deals
  const renderDeals = (data) => {
    if (!data || data.length === 0) {
      return <Typography color="text.secondary">No deals available</Typography>;
    }

    return (
      <Box sx={{ maxHeight: 500, overflowY: 'auto', width: '100%' }}>
        {data.map((item, index) => (
          <Card key={index} variant="outlined" sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {item.dealName || 'Unnamed Deal'}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                <strong>Amount:</strong> {item.amount ? `$${item.amount}` : '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Stage:</strong> {item.dealStage || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Pipeline:</strong> {item.pipeline || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Close Date:</strong> {item.closeDate ? new Date(item.closeDate).toLocaleDateString() : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Last Updated: {new Date(item.updatedAt).toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  const renderDataItems = (data) => {
    switch (activeDataType) {
      case 'contacts':
        return renderContacts(data);
      case 'companies':
        return renderCompanies(data);
      case 'deals':
        return renderDeals(data);
      default:
        return <Typography>Select a data type to view</Typography>;
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, borderRadius: 2, width: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" component="h2" display="flex" alignItems="center">
          <DataObject sx={{ mr: 1 }} />
          {integrationType} Data
          {integrationType && <Chip size="small" label={integrationType} color="primary" sx={{ ml: 1 }} />}
        </Typography>

        <Box>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleLoad(activeDataType)}
            disabled={loading || !credentials}
            startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
            sx={{ mr: 1 }}
          >
            {loading ? 'Loading...' : `Load ${activeDataType.charAt(0).toUpperCase() + activeDataType.slice(1)}`}
          </Button>

          <Button
            variant="outlined"
            color="error"
            onClick={handleClear}
            disabled={!loadedData && !error}
            startIcon={<DeleteOutline />}
          >
            Clear
          </Button>
        </Box>
      </Box>

      {/* Data Type Tabs */}
      <Tabs 
        value={activeDataType} 
        onChange={handleTabChange} 
        indicatorColor="primary"
        textColor="primary"
        sx={{ mb: 2 }}
      >
        {integrationType && dataTypes[integrationType]?.map(type => (
          <Tab 
            key={type.id} 
            value={type.id} 
            label={type.label} 
            icon={type.icon} 
            iconPosition="start"
          />
        ))}
      </Tabs>

      <Divider sx={{ mb: 2 }} />

      <Collapse in={!!error}>
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <IconButton size="small" onClick={() => setError(null)}>
              <Close fontSize="small" />
            </IconButton>
          }
        >
          {error}
        </Alert>
      </Collapse>

      <Box
        sx={{
          bgcolor: 'background.default',
          p: 2,
          borderRadius: 1,
          minHeight: 200,
          display: 'flex',
          alignItems: loadedData ? 'flex-start' : 'center',
          justifyContent: loadedData ? 'flex-start' : 'center'
        }}
      >
        {loading ? (
          <Box textAlign="center">
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 1 }}>
              Loading {activeDataType}...
            </Typography>
          </Box>
        ) : loadedData ? (
          renderDataItems(loadedData)
        ) : (
          <Typography color="text.secondary">
            Click "Load {activeDataType.charAt(0).toUpperCase() + activeDataType.slice(1)}" to fetch information from {integrationType}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};
