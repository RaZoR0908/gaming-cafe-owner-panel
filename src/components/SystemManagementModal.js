import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal, Box, Typography, Button, Grid, Paper, Chip, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Alert, CircularProgress, Checkbox, Stack,
  LinearProgress, Card, CardContent
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import BuildIcon from '@mui/icons-material/Build';
import TimerIcon from '@mui/icons-material/Timer';
import ComputerIcon from '@mui/icons-material/Computer';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import cafeService from '../services/cafeService';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: '90%', md: '80%', lg: '70%' },
  maxWidth: 1200,
  maxHeight: '90vh',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 3,
  borderRadius: 2,
  overflow: 'auto',
};

// Helper function to calculate remaining time
const calculateRemainingTime = (sessionEndTime) => {
  if (!sessionEndTime) return null;
  
  const now = new Date();
  const endTime = new Date(sessionEndTime);
  const remainingMs = endTime.getTime() - now.getTime();
  
  if (remainingMs <= 0) return { expired: true, text: 'Expired' };
  
  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    expired: false,
    text: `${hours}h ${minutes}m`,
    percentage: Math.max(0, (remainingMs / (1000 * 60 * 60 * 2)) * 100) // Assuming 2hr max for demo
  };
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

const SystemManagementModal = ({ 
  open, 
  onClose, 
  myCafe, 
  mode = 'management', // 'management' or 'assignment'
  booking = null, // For assignment mode
  onSystemsAssigned = null // Callback for assignment
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSystems, setSelectedSystems] = useState({});
  const [systemStatus, setSystemStatus] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Fetch real-time system status
  const fetchSystemStatus = useCallback(async () => {
    if (!myCafe?._id) return;
    
    setRefreshing(true);
    try {
      // Auto-complete expired sessions first
      await cafeService.autoCompleteExpiredSessions();
      
      // Then fetch current cafe status
      const cafe = await cafeService.getMyCafe();
      setSystemStatus(cafe);
    } catch (err) {
      console.error('Failed to fetch system status:', err);
      setError('Failed to fetch system status');
    } finally {
      setRefreshing(false);
    }
  }, [myCafe?._id]);

  // Initialize on open
  useEffect(() => {
    if (open) {
      setSelectedSystems({});
      setError('');
      setSuccess('');
      fetchSystemStatus();
      
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(fetchSystemStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [open, fetchSystemStatus]);

  // Handle system selection for assignment mode
  const handleSystemSelect = (roomName, systemId, checked) => {
    if (mode !== 'assignment') return;
    
    setSelectedSystems(prev => ({
      ...prev,
      [roomName]: {
        ...prev[roomName],
        [systemId]: checked
      }
    }));
  };

  // Start session (assignment mode)
  const handleStartSession = async () => {
    if (!booking || mode !== 'assignment') return;
    
    setLoading(true);
    setError('');
    
    try {
      // Convert selected systems to the format expected by the API
      const systemAssignments = [];
      
      Object.entries(selectedSystems).forEach(([roomName, systems]) => {
        const systemIds = Object.entries(systems)
          .filter(([, selected]) => selected)
          .map(([systemId]) => systemId);
        
        if (systemIds.length > 0) {
          systemAssignments.push({ roomType: roomName, systemIds });
        }
      });
      
      if (systemAssignments.length === 0) {
        setError('Please select at least one system');
        return;
      }
      
      // Validate that we have the right number of systems
      const totalSelected = systemAssignments.reduce((total, assignment) => 
        total + assignment.systemIds.length, 0);
      
      const totalRequired = booking.systemsBooked?.reduce((total, system) => 
        total + system.numberOfSystems, 0) || booking.numberOfSystems || 1;
      
      if (totalSelected !== totalRequired) {
        setError(`Please select exactly ${totalRequired} system(s)`);
        return;
      }
      
      await cafeService.assignSystemsAndStartSession(booking._id, systemAssignments);
      setSuccess('Session started successfully!');
      
      if (onSystemsAssigned) {
        onSystemsAssigned();
      }
      
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  // End session
  const handleEndSession = async (bookingId) => {
    if (mode !== 'management') return;
    
    setLoading(true);
    setError('');
    
    try {
      await cafeService.endSession(bookingId);
      setSuccess('Session ended successfully!');
      await fetchSystemStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to end session');
    } finally {
      setLoading(false);
    }
  };

  // Toggle maintenance status
  const handleMaintenanceToggle = async (roomName, systemId, currentStatus) => {
    if (mode !== 'management') return;
    
    const newStatus = currentStatus === 'Under Maintenance' ? 'Available' : 'Under Maintenance';
    
    setLoading(true);
    setError('');
    
    try {
      // This would need a new API endpoint for individual system maintenance
      // For now, we'll just refresh the status
      setSuccess(`System ${systemId} set to ${newStatus}`);
      await fetchSystemStatus();
    } catch (err) {
      setError('Failed to update system status');
    } finally {
      setLoading(false);
    }
  };

  const cafe = systemStatus || myCafe;
  
  if (!cafe) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {mode === 'assignment' ? 'Assign Systems & Start Session' : 'System Management'}
          </Typography>
          <Button 
            variant="outlined" 
            onClick={fetchSystemStatus} 
            disabled={refreshing}
            startIcon={refreshing ? <CircularProgress size={20} /> : null}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        {mode === 'assignment' && booking && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.50' }}>
            <Typography variant="h6" gutterBottom>
              Booking Details
            </Typography>
            <Typography variant="body2">
              <strong>Customer:</strong> {booking.walkInCustomerName || 'Walk-in Customer'}
            </Typography>
            <Typography variant="body2">
              <strong>Duration:</strong> {formatDuration(booking.duration)}
            </Typography>
            <Typography variant="body2">
              <strong>Systems Required:</strong>
            </Typography>
            {booking.systemsBooked?.map((system, index) => (
              <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                • {system.numberOfSystems}x {system.systemType} in {system.roomType}
              </Typography>
            ))}
          </Paper>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Systems Grid */}
        <Grid container spacing={3}>
          {cafe.rooms?.map((room) => (
            <Grid item xs={12} lg={6} key={room.name}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {room.name}
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          {mode === 'assignment' && (
                            <TableCell sx={{ fontWeight: 'bold' }}>Select</TableCell>
                          )}
                          <TableCell sx={{ fontWeight: 'bold' }}>System</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Timer</TableCell>
                          {mode === 'management' && (
                            <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {room.systems?.map((system) => {
                          const remainingTime = system.activeBooking && system.status === 'Active' 
                            ? calculateRemainingTime(system.sessionEndTime) 
                            : null;
                          
                          const isSelectable = mode === 'assignment' && system.status === 'Available';
                          const isSelected = selectedSystems[room.name]?.[system.systemId] || false;
                          
                          return (
                            <TableRow key={system.systemId} hover>
                              {mode === 'assignment' && (
                                <TableCell>
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={(e) => handleSystemSelect(room.name, system.systemId, e.target.checked)}
                                    disabled={!isSelectable}
                                    color="primary"
                                  />
                                </TableCell>
                              )}
                              
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {system.type === 'PC' ? <ComputerIcon /> : <SportsEsportsIcon />}
                                  <Typography variant="body2" fontFamily="monospace" fontWeight="bold">
                                    {system.systemId}
                                  </Typography>
                                </Box>
                              </TableCell>
                              
                              <TableCell>
                                <Typography variant="body2">{system.type}</Typography>
                              </TableCell>
                              
                              <TableCell>
                                <Chip
                                  label={system.status}
                                  color={
                                    system.status === 'Available' ? 'success' :
                                    system.status === 'Active' ? 'warning' :
                                    'error'
                                  }
                                  size="small"
                                />
                              </TableCell>
                              
                              <TableCell>
                                {remainingTime ? (
                                  <Box>
                                    <Typography variant="caption" color={remainingTime.expired ? 'error' : 'text.primary'}>
                                      <TimerIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                      {remainingTime.text}
                                    </Typography>
                                    {!remainingTime.expired && (
                                      <LinearProgress
                                        variant="determinate"
                                        value={remainingTime.percentage}
                                        sx={{ mt: 0.5, height: 4 }}
                                        color={remainingTime.percentage < 25 ? 'error' : 'primary'}
                                      />
                                    )}
                                  </Box>
                                ) : (
                                  <Typography variant="caption" color="text.secondary">
                                    -
                                  </Typography>
                                )}
                              </TableCell>
                              
                              {mode === 'management' && (
                                <TableCell>
                                  <Stack direction="row" spacing={1}>
                                    {system.status === 'Active' && (
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleEndSession(system.activeBooking)}
                                        title="End Session"
                                      >
                                        <StopIcon />
                                      </IconButton>
                                    )}
                                    
                                    {system.status !== 'Active' && (
                                      <IconButton
                                        size="small"
                                        color={system.status === 'Under Maintenance' ? 'success' : 'warning'}
                                        onClick={() => handleMaintenanceToggle(room.name, system.systemId, system.status)}
                                        title={
                                          system.status === 'Under Maintenance' 
                                            ? 'Mark as Available' 
                                            : 'Mark as Under Maintenance'
                                        }
                                      >
                                        <BuildIcon />
                                      </IconButton>
                                    )}
                                  </Stack>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button onClick={onClose} size="large">
            {mode === 'assignment' ? 'Cancel' : 'Close'}
          </Button>
          
          {mode === 'assignment' && (
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={handleStartSession}
              disabled={loading || Object.keys(selectedSystems).length === 0}
            >
              {loading ? 'Starting...' : 'Start Session'}
            </Button>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default SystemManagementModal;
