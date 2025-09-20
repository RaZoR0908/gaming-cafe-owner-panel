import React, { useState, useCallback } from 'react';
import {
  Modal, Box, Typography, Button, Grid, Paper, Chip, 
  IconButton, Alert, Stack, Checkbox, FormControlLabel
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: '90%', md: 600 },
  maxHeight: '90vh',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  overflow: 'auto',
};

// Helper function to format duration
const formatDuration = (hours) => {
  const h = Math.floor(hours);
  const m = (hours - h) * 60;
  let result = '';
  if (h > 0) result += `${h} hr${h > 1 ? 's' : ''}`;
  if (m > 0) result += `${h > 0 ? ' ' : ''}${m} min`;
  return result || '0';
};

const ExtendSessionModal = ({ open, onClose, booking, onExtend }) => {
  const [selectedSystems, setSelectedSystems] = useState({});
  const [extensionHours, setExtensionHours] = useState(0.5);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens
  React.useEffect(() => {
    if (open && booking) {
      // Pre-select all systems for single bookings, none for group bookings
      const initialSelection = {};
      if (booking.assignedSystems) {
        booking.assignedSystems.forEach(system => {
          if (booking.assignedSystems.length === 1) {
            // Single system - auto-select
            initialSelection[system.systemId] = true;
          } else {
            // Multiple systems - let user choose
            initialSelection[system.systemId] = false;
          }
        });
      }
      setSelectedSystems(initialSelection);
      setExtensionHours(0.5);
      setError('');
    }
  }, [open, booking]);

  const handleSystemToggle = useCallback((systemId) => {
    setSelectedSystems(prev => ({
      ...prev,
      [systemId]: !prev[systemId]
    }));
  }, []);

  const handleSelectAll = () => {
    const newSelection = {};
    booking.assignedSystems?.forEach(system => {
      newSelection[system.systemId] = true;
    });
    setSelectedSystems(newSelection);
  };

  const handleDeselectAll = () => {
    const newSelection = {};
    booking.assignedSystems?.forEach(system => {
      newSelection[system.systemId] = false;
    });
    setSelectedSystems(newSelection);
  };

  const handleExtensionChange = (amount) => {
    setExtensionHours(prev => Math.max(0.5, prev + amount));
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    const selectedSystemIds = Object.keys(selectedSystems).filter(
      systemId => selectedSystems[systemId]
    );

    if (selectedSystemIds.length === 0) {
      setError('Please select at least one system to extend');
      setLoading(false);
      return;
    }

    try {
      await onExtend(booking._id, selectedSystemIds, extensionHours);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to extend session');
    } finally {
      setLoading(false);
    }
  };

  if (!booking || !booking.assignedSystems) return null;

  const selectedCount = Object.values(selectedSystems).filter(Boolean).length;
  const totalSystems = booking.assignedSystems.length;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Extend Session
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Booking Info */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.50' }}>
          <Typography variant="h6" gutterBottom>
            Booking Details
          </Typography>
          <Typography variant="body2">
            <strong>Customer:</strong> {booking.walkInCustomerName || booking.customer?.name || 'Walk-in Customer'}
          </Typography>
          <Typography variant="body2">
            <strong>Current Duration:</strong> {formatDuration(booking.duration)}
          </Typography>
        </Paper>

        {/* System Selection */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Select Systems to Extend ({selectedCount}/{totalSystems})
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={handleSelectAll}
                disabled={selectedCount === totalSystems}
              >
                Select All
              </Button>
              <Button 
                size="small" 
                variant="outlined" 
                onClick={handleDeselectAll}
                disabled={selectedCount === 0}
              >
                Deselect All
              </Button>
            </Stack>
          </Box>

          <Grid container spacing={2}>
            {booking.assignedSystems.map((system) => (
              <Grid item xs={12} sm={6} md={4} key={system.systemId}>
                <Paper 
                  sx={{ 
                    p: 2, 
                    border: selectedSystems[system.systemId] ? '2px solid' : '1px solid',
                    borderColor: selectedSystems[system.systemId] ? 'primary.main' : 'grey.300',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'grey.50' }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSystemToggle(system.systemId);
                  }}
                >
                  <FormControlLabel
                    sx={{ pointerEvents: 'none' }}
                    control={
                      <Checkbox
                        sx={{ pointerEvents: 'auto' }}
                        checked={selectedSystems[system.systemId] || false}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSystemToggle(system.systemId);
                        }}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight="bold" fontFamily="monospace">
                          {system.systemId}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {system.roomType}
                        </Typography>
                      </Box>
                    }
                  />
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* Extension Duration */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            <AccessTimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Extension Duration
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 2,
            mt: 2
          }}>
            <IconButton 
              onClick={() => handleExtensionChange(-0.5)} 
              disabled={extensionHours <= 0.5}
              color="primary"
            >
              <RemoveCircleOutlineIcon />
            </IconButton>
            <Chip 
              label={formatDuration(extensionHours)} 
              color="primary" 
              sx={{ minWidth: 100, fontSize: '1.1rem' }}
            />
            <IconButton onClick={() => handleExtensionChange(0.5)} color="primary">
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
            30-minute intervals
          </Typography>
        </Paper>

        {/* Summary */}
        {selectedCount > 0 && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.50', borderLeft: '4px solid', borderColor: 'success.main' }}>
            <Typography variant="h6" color="success.main" fontWeight="bold">
              Extension Summary
            </Typography>
            <Typography variant="body2">
              <strong>{selectedCount}</strong> system(s) will be extended by <strong>{formatDuration(extensionHours)}</strong>
            </Typography>
            <Typography variant="body2">
              New total duration: <strong>{formatDuration(booking.duration + extensionHours)}</strong>
            </Typography>
          </Paper>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button onClick={onClose} size="large">
            Cancel
          </Button>
          <Button 
            variant="contained" 
            size="large"
            onClick={handleSubmit}
            disabled={loading || selectedCount === 0}
          >
            {loading ? 'Extending...' : `Extend ${selectedCount} System(s)`}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ExtendSessionModal;
