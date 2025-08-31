import React, { useState, useMemo } from 'react';
import {
  Modal, Box, Typography, Button, Grid, TextField, MenuItem, 
  FormControl, InputLabel, Select, IconButton, Chip, Tabs, Tab,
  Alert, Paper, Stack
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: '90%', md: 700 },
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

// Helper function to format phone number display
const formatPhoneDisplay = (phone) => {
  if (phone.length === 0) return '';
  if (phone.length <= 3) return phone;
  if (phone.length <= 6) return `${phone.slice(0, 3)}-${phone.slice(3)}`;
  return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`;
};

const WalkInBookingModal = ({ open, onClose, myCafe, onSubmit }) => {
  const [bookingType, setBookingType] = useState('single'); // 'single' or 'group'
  const [walkInCustomerName, setWalkInCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [duration, setDuration] = useState(1); // Default 1 hour
  const [systemsBooked, setSystemsBooked] = useState([
    { roomType: '', systemType: '', numberOfSystems: 1 }
  ]);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setBookingType('single');
      setWalkInCustomerName('');
      setPhoneNumber('');
      setDuration(1);
      setSystemsBooked([{ roomType: '', systemType: '', numberOfSystems: 1 }]);
      setError('');
    }
  }, [open]);

  // Get unique system types for a selected room
  const getSystemTypesForRoom = (roomName) => {
    const room = myCafe?.rooms.find(r => r.name === roomName);
    if (!room) return [];
    
    // Get unique system types (don't show counts)
    const uniqueTypes = [...new Set(room.systems.map(s => s.type))];
    return uniqueTypes.map(type => ({
      type,
      pricePerHour: room.systems.find(s => s.type === type)?.pricePerHour || 0
    }));
  };

  // Handle system booking changes
  const handleSystemChange = (index, field, value) => {
    const updated = [...systemsBooked];
    updated[index] = { ...updated[index], [field]: value };
    
    // Reset systemType when room changes
    if (field === 'roomType') {
      updated[index].systemType = '';
    }
    
    setSystemsBooked(updated);
  };

  // Add another system (for group bookings)
  const addAnotherSystem = () => {
    setSystemsBooked([...systemsBooked, { roomType: '', systemType: '', numberOfSystems: 1 }]);
  };

  // Remove a system
  const removeSystem = (index) => {
    if (systemsBooked.length > 1) {
      setSystemsBooked(systemsBooked.filter((_, i) => i !== index));
    }
  };

  // Handle duration change (30-minute intervals)
  const handleDurationChange = (amount) => {
    setDuration(prev => Math.max(0.5, prev + amount));
  };

  // Calculate total price
  const totalPrice = useMemo(() => {
    return systemsBooked.reduce((total, system) => {
      if (system.roomType && system.systemType) {
        const room = myCafe?.rooms.find(r => r.name === system.roomType);
        const systemInfo = room?.systems.find(s => s.type === system.systemType);
        if (systemInfo) {
          return total + (systemInfo.pricePerHour * system.numberOfSystems * duration);
        }
      }
      return total;
    }, 0);
  }, [systemsBooked, duration, myCafe]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validation - Customer name and phone number are required
    if (!walkInCustomerName.trim()) {
      setError('Customer name is required');
      return;
    }
    
    if (!phoneNumber.trim()) {
      setError('Phone number is required');
      return;
    }
    
    if (phoneNumber.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    for (const system of systemsBooked) {
      if (!system.roomType || !system.systemType) {
        setError('Please select room and system for all entries');
        return;
      }
      if (system.numberOfSystems < 1) {
        setError('Number of systems must be at least 1');
        return;
      }
    }

    if (duration < 0.5) {
      setError('Minimum duration is 30 minutes');
      return;
    }

    // Prepare booking data
    const bookingData = {
      bookingType,
      walkInCustomerName: walkInCustomerName.trim(), // Always include customer name
      phoneNumber: phoneNumber.trim(), // Include phone number
      systemsBooked,
      duration,
      cafeId: myCafe._id,
      bookingDate: new Date().toISOString().split('T')[0],
      startTime: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }),
    };

    onSubmit(bookingData);
  };

  if (!myCafe) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle} component="form" onSubmit={handleSubmit}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Walk-in Booking
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Booking Type Selection */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>Booking Type</Typography>
          <Tabs value={bookingType} onChange={(e, value) => setBookingType(value)} sx={{ mb: 2 }}>
            <Tab 
              value="single" 
              label="Single Person" 
              icon={<PersonIcon />} 
              iconPosition="start"
            />
            <Tab 
              value="group" 
              label="Group Booking" 
              icon={<GroupIcon />} 
              iconPosition="start"
            />
          </Tabs>
          
          <TextField 
            fullWidth 
            label={bookingType === 'group' ? "Group Representative Name" : "Customer Name"} 
            value={walkInCustomerName} 
            onChange={(e) => setWalkInCustomerName(e.target.value)}
            placeholder={bookingType === 'group' ? "Enter group representative's name" : "Enter customer's name"}
            required={bookingType === 'group'}
            sx={{ mt: 2 }}
          />
        </Paper>

        {/* Phone Number Input */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>Phone Number</Typography>
          <TextField
            fullWidth
            label="Enter Phone Number"
            value={formatPhoneDisplay(phoneNumber)}
            onChange={(e) => {
              const value = e.target.value;
              // Remove all non-digits and limit to 10 characters
              const digitsOnly = value.replace(/\D/g, '');
              if (digitsOnly.length <= 10) {
                setPhoneNumber(digitsOnly);
              }
            }}

            placeholder="Enter 10-digit phone number"
            type="tel"
            inputProps={{
              maxLength: 12, // Allow for dashes in display
              pattern: '[0-9-]{12}'
            }}
            helperText={
              phoneNumber.length === 0 
                ? 'Enter 10-digit phone number' 
                : phoneNumber.length === 10 
                  ? '✓ Valid phone number' 
                  : `${phoneNumber.length}/10 digits - ${10 - phoneNumber.length} more needed`
            }
            error={phoneNumber.length > 0 && phoneNumber.length !== 10}
            sx={{ mt: 2 }}
          />
          {phoneNumber.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Raw input: {phoneNumber}
            </Typography>
          )}
        </Paper>

        {/* Duration Selection */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" gutterBottom>
            <AccessTimeIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Duration
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 2,
            mt: 2
          }}>
            <IconButton 
              onClick={() => handleDurationChange(-0.5)} 
              disabled={duration <= 0.5}
              color="primary"
            >
              <RemoveCircleOutlineIcon />
            </IconButton>
            <Chip 
              label={formatDuration(duration)} 
              color="primary" 
              sx={{ minWidth: 100, fontSize: '1.1rem' }}
            />
            <IconButton onClick={() => handleDurationChange(0.5)} color="primary">
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ mt: 1 }}>
            30-minute intervals
          </Typography>
        </Paper>

        {/* Systems Selection */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>System Selection</Typography>
          
          {systemsBooked.map((system, index) => (
            <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  System {index + 1}
                </Typography>
                {systemsBooked.length > 1 && (
                  <IconButton 
                    onClick={() => removeSystem(index)} 
                    color="error" 
                    size="small"
                  >
                    <RemoveCircleOutlineIcon />
                  </IconButton>
                )}
              </Stack>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={bookingType === 'single' ? 6 : 4}>
                  <FormControl fullWidth required>
                    <InputLabel>Room</InputLabel>
                    <Select
                      value={system.roomType}
                      onChange={(e) => handleSystemChange(index, 'roomType', e.target.value)}
                      label="Room"
                    >
                      {myCafe.rooms.map(room => (
                        <MenuItem key={room.name} value={room.name}>
                          {room.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={bookingType === 'single' ? 6 : 4}>
                  <FormControl fullWidth required disabled={!system.roomType}>
                    <InputLabel>System</InputLabel>
                    <Select
                      value={system.systemType}
                      onChange={(e) => handleSystemChange(index, 'systemType', e.target.value)}
                      label="System"
                    >
                      {getSystemTypesForRoom(system.roomType).map(systemInfo => (
                        <MenuItem key={systemInfo.type} value={systemInfo.type}>
                          {systemInfo.type} - ₹{systemInfo.pricePerHour}/hr
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                {bookingType === 'group' && (
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Number of Systems"
                      type="number"
                      value={system.numberOfSystems}
                      onChange={(e) => handleSystemChange(index, 'numberOfSystems', parseInt(e.target.value) || 1)}
                      InputProps={{ inputProps: { min: 1, max: 10 } }}
                      required
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          ))}
          
          {bookingType === 'group' && (
            <Button
              variant="outlined"
              startIcon={<AddCircleOutlineIcon />}
              onClick={addAnotherSystem}
              fullWidth
              sx={{ mt: 2 }}
            >
              Add Another System
            </Button>
          )}
        </Paper>

        {/* Total Price Display */}
        {totalPrice > 0 && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'success.50', borderLeft: '4px solid', borderColor: 'success.main' }}>
            <Typography variant="h6" color="success.main" fontWeight="bold" textAlign="center">
              Total: ₹{totalPrice.toFixed(0)}
              <Typography component="span" variant="body2" sx={{ ml: 1, fontWeight: 'normal' }}>
                ({formatDuration(duration)})
              </Typography>
            </Typography>
          </Paper>
        )}
        
        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button onClick={onClose} size="large">
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            size="large"
            disabled={totalPrice === 0}
          >
            Create Booking
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default WalkInBookingModal;
