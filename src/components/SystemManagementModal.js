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
  maxHeight: '85vh', // Reduced from 90vh
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 2, // Reduced padding from 3 to 2
  borderRadius: 2,
  overflow: 'auto',
  zIndex: 9999, // Add explicit z-index
};

// Helper function to calculate remaining time
const calculateRemainingTime = (sessionEndTime, sessionStartTime, duration, _timerTick) => {
  const now = new Date();
  
  // Primary: Use sessionStartTime + duration (most reliable)
  // Note: duration already includes any extensions, so don't add extendedTime separately
  if (sessionStartTime && duration) {
    const startTime = new Date(sessionStartTime);
    const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));
    const remainingMs = endTime.getTime() - now.getTime();
    const totalSessionMs = duration * 60 * 60 * 1000;
    
    // If session has expired, return expired status
    if (remainingMs <= 0) {
      return { 
        expired: true, 
        text: 'Expired', 
        percentage: 0, 
        endTime,
        remainingMinutes: 0
      };
    }
    
    // Format end time as "11:00 AM" instead of remaining time
    const endTimeFormatted = endTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const percentage = Math.max(0, Math.min(100, (remainingMs / totalSessionMs) * 100));
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    
    return {
      expired: false,
      text: endTimeFormatted, // Show end time instead of remaining time
      percentage,
      endTime,
      remainingMinutes
    };
  }
  
  // Fallback: Use sessionEndTime if available
  if (sessionEndTime) {
    const endTime = new Date(sessionEndTime);
    const remainingMs = endTime.getTime() - now.getTime();
    const totalSessionMs = duration * 60 * 60 * 1000; // Total duration in milliseconds
    
    // If session has expired, return expired status
    if (remainingMs <= 0) {
      return { 
        expired: true, 
        text: 'Expired', 
        percentage: 0, 
        endTime,
        remainingMinutes: 0
      };
    }
    
    // Format end time as "11:00 AM" instead of remaining time
    const endTimeFormatted = endTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
    
    const percentage = Math.max(0, Math.min(100, (remainingMs / totalSessionMs) * 100));
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    
    return {
      expired: false,
      text: endTimeFormatted, // Show end time instead of remaining time
      percentage,
      endTime,
      remainingMinutes
    };
  }
  
  return null; // No timing data available
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
  console.log('🔍 SystemManagementModal render - open:', open);
  console.log('🔍 SystemManagementModal render - mode:', mode);
  console.log('🔍 SystemManagementModal render - booking:', booking);
  console.log('🔍 SystemManagementModal render - myCafe:', myCafe);
  
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
      // Fetch current cafe status
      const cafe = await cafeService.getMyCafe();
      
      // Also fetch current bookings to get session timing details
      const bookings = await cafeService.getOwnerBookings(cafe._id);
      
      // Map active bookings to systems for timer display
      cafe.rooms.forEach(room => {
        room.systems.forEach(system => {
          if (system.status === 'Active' && system.activeBooking) {
            const activeBooking = bookings.find(b => b._id === system.activeBooking);
            if (activeBooking) {
              // Use the actual stored session timing data from the booking
              system.sessionStartTime = activeBooking.sessionStartTime;
              system.sessionEndTime = activeBooking.sessionEndTime;
              system.sessionDuration = activeBooking.duration;
              
              // Timer data is now properly mapped from backend-stored values
            }
          }
        });
      });
      
      setSystemStatus(cafe);
    } catch (err) {
      console.error('Failed to fetch system status:', err);
      setError('Failed to fetch system status');
    } finally {
      setRefreshing(false);
    }
  }, [myCafe?._id]);

  // Manual refresh with auto-complete for expired sessions
  const handleManualRefresh = useCallback(async () => {
    if (!myCafe?._id) return;
    
    setRefreshing(true);
    setError('');
    setSuccess('');
    
    try {
      // Auto-complete expired sessions first
      const response = await cafeService.autoCompleteExpiredSessions();
      
      if (response && response.data) {
        const { completedBookings, systemUpdatesCount } = response.data;
        if (completedBookings && completedBookings.length > 0) {
          setSuccess(`Auto-completed ${completedBookings.length} expired sessions and freed ${systemUpdatesCount} systems`);
        } else {
          setSuccess('No expired sessions found - all systems are up to date');
        }
      }
      
      // Then fetch updated system status
      await fetchSystemStatus();
    } catch (err) {
      console.error('Failed to refresh system status:', err);
      setError('Failed to refresh system status');
    } finally {
      setRefreshing(false);
    }
  }, [myCafe?._id, fetchSystemStatus]);

  // State to force timer re-renders
  const [timerTick, setTimerTick] = useState(0);

  // Initialize on open
  useEffect(() => {
    if (open) {
      setSelectedSystems({});
      setError('');
      setSuccess('');
      fetchSystemStatus();
      
      // Set up lightweight periodic refresh every 60 seconds instead of continuous refresh
      const refreshInterval = setInterval(fetchSystemStatus, 60000);
      
      // Set up timer update every second for live countdown (only for active systems)
      const timerInterval = setInterval(() => {
        // Increment timer tick to force re-calculation of timers
        setTimerTick(prev => prev + 1);
      }, 1000);
      
      return () => {
        clearInterval(refreshInterval);
        clearInterval(timerInterval);
      };
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

  // Validate if correct number of systems are selected
  const isValidSelection = useCallback(() => {
    if (!booking || mode !== 'assignment') return false;
    
    if (booking.systemsBooked && booking.systemsBooked.length > 0) {
      // New format: validate each system type separately
      for (const bookedSystem of booking.systemsBooked) {
        const selectedCount = Object.values(selectedSystems[bookedSystem.roomType] || {})
          .filter(Boolean).length;
        
        if (selectedCount !== bookedSystem.numberOfSystems) {
          return false;
        }
      }
      return true;
    } else {
      // Old format: validate for specific room and system type
      const roomName = booking.roomType;
      const systemType = booking.systemType;
      const requiredCount = booking.numberOfSystems || 1;
      
      // Count selected systems in the specific room
      const selectedCount = Object.values(selectedSystems[roomName] || {})
        .filter(Boolean).length;
      
      return selectedCount === requiredCount;
    }
  }, [selectedSystems, booking, mode]);

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
      
      // Validate that we have the right number of systems for each room/system type
      let validationError = null;
      
      if (booking.systemsBooked) {
        // New format: validate each system type separately
        for (const bookedSystem of booking.systemsBooked) {
          const assignment = systemAssignments.find(a => a.roomType === bookedSystem.roomType);
          if (!assignment) {
            validationError = `Please select systems for ${bookedSystem.roomType}`;
            break;
          }
          
          // Count selected systems of this type in this room
          const selectedCount = assignment.systemIds.length;
          const requiredCount = bookedSystem.numberOfSystems;
          
          if (selectedCount !== requiredCount) {
            validationError = `Please select exactly ${requiredCount} ${bookedSystem.systemType}(s) in ${bookedSystem.roomType}`;
            break;
          }
        }
      } else {
        // Old format: total count validation
        const totalSelected = systemAssignments.reduce((total, assignment) => 
          total + assignment.systemIds.length, 0);
        
        const totalRequired = booking.numberOfSystems || 1;
        
        if (totalSelected !== totalRequired) {
          validationError = `Please select exactly ${totalRequired} system(s)`;
        }
      }
      
      if (validationError) {
        setError(validationError);
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
      const response = await cafeService.endSession(bookingId);
      setSuccess('Session ended successfully!');
      
      // Update local state immediately using the response
      if (response && response.data && response.data.updatedSystems) {
        setSystemStatus(prevCafe => {
          if (!prevCafe) return prevCafe;
          
          const updatedCafe = { ...prevCafe };
          
          // Update each system that was freed
          response.data.updatedSystems.forEach(updatedSystem => {
            updatedCafe.rooms.forEach(room => {
              if (room.name === updatedSystem.roomType) {
                room.systems.forEach(system => {
                  if (system.systemId === updatedSystem.systemId) {
                    system.status = updatedSystem.status;
                    system.activeBooking = null;
                    system.sessionStartTime = null;
                    system.sessionEndTime = null;
                    system.sessionDuration = null;
                  }
                });
              }
            });
          });
          
          return updatedCafe;
        });
      } else if (response && response.data && response.data.cafe) {
        // If no updatedSystems but cafe object is returned, use the full cafe object
        setSystemStatus(response.data.cafe);
      } else {
        // Fallback: refresh system status if response doesn't contain updated systems
        await fetchSystemStatus();
      }
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
      const response = await cafeService.updateSystemMaintenanceStatus(myCafe._id, roomName, systemId, newStatus);
      setSuccess(`System ${systemId} set to ${newStatus}`);
      
      // Update local state immediately using the response
      if (response && response.data) {
        setSystemStatus(response.data);
      } else {
        // Fallback: refresh system status if response doesn't contain updated cafe
        await fetchSystemStatus();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update system status');
    } finally {
      setLoading(false);
    }
  };

  const cafe = systemStatus || myCafe;
  
  console.log('🔍 Modal cafe check - cafe:', cafe);
  console.log('🔍 Modal cafe check - systemStatus:', systemStatus);
  console.log('🔍 Modal cafe check - myCafe:', myCafe);
  
  if (!cafe) {
    console.log('❌ Modal returning null - no cafe data');
    return null;
  }

  return (
    <>
      {/* Custom Modal Implementation */}
      {open && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 9998,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }} onClick={onClose}>
          <div onClick={(e) => e.stopPropagation()}>
            <Box sx={modalStyle}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}> {/* Reduced margin from 2 to 1.5 */}
          <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            {mode === 'assignment' ? 'Assign Systems & Start Session' : 'System Management'}
          </Typography>
          <Button 
            variant="outlined" 
            onClick={handleManualRefresh} 
            disabled={refreshing}
            startIcon={refreshing ? <CircularProgress size={20} /> : null}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>

        {mode === 'management' && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>System Management:</strong> End active sessions manually or use Refresh to sync expired sessions. 
            Available systems show "-" instead of expired timers. Auto-refresh occurs every 60 seconds.
          </Alert>
        )}

        {mode === 'assignment' && booking && (
          <Paper sx={{ p: 1.5, mb: 2, bgcolor: 'info.50' }}> {/* Reduced padding and margin */}
            <Typography variant="h6" gutterBottom sx={{ mb: 1 }}> {/* Reduced margin */}
              Booking Details
            </Typography>
            <Grid container spacing={1}> {/* Reduced spacing */}
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  <strong>Customer:</strong> {booking.walkInCustomerName || 'Walk-in Customer'}
                </Typography>
                <Typography variant="body2">
                  <strong>Duration:</strong> {formatDuration(booking.duration)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Systems Required:</strong>
                </Typography>
                {booking.systemsBooked?.map((system, index) => (
                  <Paper key={index} sx={{ p: 0.5, mb: 0.5, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.main' }}>
                    <Typography variant="body2" fontWeight="bold">
                      {system.roomType}: {system.numberOfSystems}x {system.systemType}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Please select exactly {system.numberOfSystems} {system.systemType} system(s) from {system.roomType}
                    </Typography>
                  </Paper>
                ))}
                {(!booking.systemsBooked || booking.systemsBooked.length === 0) && booking.roomType && (
                  <Paper sx={{ p: 0.5, bgcolor: 'warning.50', border: '1px solid', borderColor: 'warning.main' }}>
                    <Typography variant="body2" fontWeight="bold">
                      {booking.roomType}: {booking.numberOfSystems || 1}x {booking.systemType}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Please select exactly {booking.numberOfSystems || 1} {booking.systemType} system(s) from {booking.roomType}
                    </Typography>
                  </Paper>
                )}
              </Grid>
            </Grid>
          </Paper>
        )}

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {/* Systems Grid */}
        <Grid container spacing={2}> {/* Reduced spacing from 3 to 2 */}
          {cafe.rooms?.filter((room) => {
            // In assignment mode, only show rooms that were selected in the booking
            if (mode === 'assignment' && booking) {
              if (booking.systemsBooked && booking.systemsBooked.length > 0) {
                // New format: check systemsBooked array
                return booking.systemsBooked.some(system => system.roomType === room.name);
              } else if (booking.roomType) {
                // Old format: check roomType field
                return booking.roomType === room.name;
              }
            }
            // In management mode, show all rooms
            return true;
          }).map((room) => (
            <Grid item xs={12} lg={6} key={room.name}>
              <Card sx={{ '& .MuiCardContent-root': { py: 1.5, px: 1.5 } }}> {/* Reduced card padding */}
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold', mb: 1 }}>
                    {room.name}
                  </Typography>
                  
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1, px: 1 } }}>
                      <TableHead>
                        <TableRow>
                          {mode === 'assignment' && (
                            <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Select</TableCell>
                          )}
                          <TableCell sx={{ fontWeight: 'bold', py: 1 }}>System</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Type</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', py: 1 }}>End Time</TableCell>
                          {mode === 'management' && (
                            <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Actions</TableCell>
                          )}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {room.systems?.filter((system) => {
                          // In assignment mode, only show systems that were selected in the booking
                          if (mode === 'assignment' && booking) {
                            if (booking.systemsBooked && booking.systemsBooked.length > 0) {
                              // New format: check systemsBooked array
                              return booking.systemsBooked.some(bookedSystem => 
                                bookedSystem.roomType === room.name && bookedSystem.systemType === system.type
                              );
                            } else if (booking.roomType && booking.systemType) {
                              // Old format: check roomType and systemType fields
                              return booking.roomType === room.name && booking.systemType === system.type;
                            }
                          }
                          // In management mode, show all systems
                          return true;
                        }).map((system) => {
                          // Calculate remaining time for active systems (recalculates every second due to timerTick state updates)
                          let remainingTime = null;
                          if (system.status === 'Active') {
                            const sessionDuration = system.sessionDuration || 2;
                            // timerTick forces this calculation to run every second
                            remainingTime = calculateRemainingTime(system.sessionEndTime, system.sessionStartTime, sessionDuration, timerTick);
                          }
                          
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
                                {(() => {
                                  // Only show timer for Active systems
                                  if (system.status === 'Active' && remainingTime) {
                                    // Check if session has expired
                                    if (remainingTime.expired) {
                                      // Session has expired, show expired status
                                      return (
                                        <Box>
                                          <Typography 
                                            variant="caption" 
                                            color="error.main"
                                            fontWeight="bold"
                                          >
                                            <TimerIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                            Expired
                                          </Typography>
                                          <Typography variant="caption" color="error.main" display="block" sx={{ mt: 0.5 }}>
                                            Session ended
                                          </Typography>
                                          <LinearProgress
                                            variant="determinate"
                                            value={0}
                                            sx={{ mt: 0.5, height: 3 }}
                                            color="error"
                                          />
                                        </Box>
                                      );
                                    } else {
                                      // Show active session with remaining time
                                      return (
                                        <Box>
                                          <Typography 
                                            variant="caption" 
                                            color="text.primary"
                                            title={`Session ends at ${remainingTime.text}`}
                                          >
                                            <TimerIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                            {remainingTime.text}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                            {remainingTime.remainingMinutes}m remaining
                                          </Typography>
                                          <LinearProgress
                                            variant="determinate"
                                            value={remainingTime.percentage}
                                            sx={{ mt: 0.5, height: 3 }}
                                            color={remainingTime.percentage < 25 ? 'error' : 'primary'}
                                          />
                                        </Box>
                                      );
                                    }
                                  } else if (system.status === 'Available') {
                                    // For Available systems, show dash instead of expired timer
                                    return (
                                      <Typography variant="caption" color="text.secondary">
                                        -
                                      </Typography>
                                    );
                                  } else {
                                    // For Under Maintenance or other statuses, show dash
                                    return (
                                      <Typography variant="caption" color="text.secondary">
                                        -
                                      </Typography>
                                    );
                                  }
                                })()}
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
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}> {/* Reduced margin from 3 to 2 */}
          <Button onClick={onClose} size="large">
            {mode === 'assignment' ? 'Cancel' : 'Close'}
          </Button>
          
          {mode === 'assignment' && (
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={handleStartSession}
              disabled={loading || !isValidSelection()}
            >
              {loading ? 'Starting...' : 'Start Session'}
            </Button>
          )}
        </Box>
      </Box>
          </div>
        </div>
      )}
    </>
  );
};

export default SystemManagementModal;
