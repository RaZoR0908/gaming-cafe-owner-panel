import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // RESTORED: This is the real hook for navigation.
import { useDropzone } from 'react-dropzone';
import cafeService from '../services/cafeService'; // RESTORED: This will now use your actual service file.

// --- Material-UI Imports ---
import {
  Container, Box, Typography, TextField, Button, Grid, Card,
  CardContent, IconButton, CircularProgress, Paper, Alert,
  Stepper, Step, StepLabel, Select, MenuItem, FormControl, InputLabel, Divider
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import Business from '@mui/icons-material/Business';

const steps = ['Basic Details', 'Rooms & Systems', 'Manage Photos'];

// Enhanced TextField component with professional styling
const EnhancedTextField = ({ sx = {}, ...props }) => (
  <TextField
    {...props}
    sx={{
      '& .MuiOutlinedInput-root': {
        borderRadius: '12px',
        backgroundColor: '#ffffff',
        border: '2px solid #e2e8f0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        minHeight: '64px', // Increased minimum height for better text visibility
        '&.MuiInputBase-multiline': {
          minHeight: '60px', // Smaller initial height for multiline inputs
        },
        '&:hover': {
          borderColor: '#3b82f6',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          transform: 'translateY(-1px)',
        },
        '&.Mui-focused': {
          borderColor: '#3b82f6',
          boxShadow: '0 6px 20px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          transform: 'translateY(-2px)',
        },
        '&.Mui-error': {
          borderColor: '#ef4444',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
        }
      },
      '& .MuiInputLabel-root': {
        color: '#64748b',
        fontWeight: 600,
        fontSize: '0.9rem',
        '&.Mui-focused': {
          color: '#3b82f6',
          fontWeight: 700,
        },
        '&.Mui-error': {
          color: '#ef4444',
        }
      },
      '& .MuiInputBase-input': {
        color: '#1e293b',
        fontSize: '1rem', // Increased font size for better readability
        fontWeight: 500,
        padding: '20px 18px', // Increased vertical padding for better text visibility
        lineHeight: '1.6',
        '&::placeholder': {
          color: '#94a3b8',
          opacity: 1,
          fontWeight: 400,
        }
      },
      '& .MuiFormHelperText-root': {
        color: '#64748b',
        fontSize: '0.85rem', // Slightly larger helper text
        fontWeight: 500,
        marginTop: '8px',
        lineHeight: '1.4',
        '&.Mui-error': {
          color: '#ef4444',
        }
      },
      // Ensure multiline inputs have proper height
      '& .MuiInputBase-inputMultiline': {
        padding: '20px 18px',
        minHeight: '60px', // Smaller initial height for description field
        resize: 'vertical',
        lineHeight: '1.6',
        overflow: 'auto', // Allow scrolling if content exceeds height
      },
      ...sx
    }}
  />
);

// --- Reusable SystemCard Component ---
// This component now allows editing specs for each individual PC.
const SystemCard = ({ system, roomIndex, systemIndex, handleSystemSpecChange }) => {
  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 1.5, 
        mb: 1.5, 
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        transition: 'all 0.3s ease',
        '&:hover': {
          backgroundColor: '#ffffff',
          borderColor: '#3b82f6',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
          transform: 'translateY(-1px)',
        }
      }}
    >
      <Typography variant="subtitle1" gutterBottom component="div" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
        System ID: <Box component="span" sx={{ fontFamily: 'monospace', backgroundColor: '#e2e8f0', px: 1, borderRadius: 1, fontSize: '0.8rem' }}>{system.systemId}</Box>
      </Typography>
      {system.type === 'PC' && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <EnhancedTextField 
              fullWidth 
              label="RAM" 
              name="ram" 
              value={system.specs.ram} 
              onChange={(e) => handleSystemSpecChange(roomIndex, systemIndex, e)}
              placeholder="e.g., 16GB DDR4"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <EnhancedTextField 
              fullWidth 
              label="Processor" 
              name="processor" 
              value={system.specs.processor} 
              onChange={(e) => handleSystemSpecChange(roomIndex, systemIndex, e)}
              placeholder="e.g., Intel Core i7"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <EnhancedTextField 
              fullWidth 
              label="Graphics Card" 
              name="graphicsCard" 
              value={system.specs.graphicsCard} 
              onChange={(e) => handleSystemSpecChange(roomIndex, systemIndex, e)}
              placeholder="e.g., NVIDIA RTX 3080"
            />
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};


const CreateCafePage = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '', address: '', openingTime: '10:00', closingTime: '22:00', longitude: '', latitude: '', contactNumber: '', description: '',
  });
  const [rooms, setRooms] = useState([{ name: '', systems: [] }]);
  const [systemAddForm, setSystemAddForm] = useState({ systemType: 'PC', count: 1, pricePerHour: '' });
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [geocodeStatus, setGeocodeStatus] = useState('');
  const [showManualCoords, setShowManualCoords] = useState(false);
  
  const navigate = useNavigate(); // RESTORED: Using the actual hook from react-router-dom.

  const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    if (!formData.address) { setGeocodeStatus(''); return; }
    setGeocodeStatus('Typing...');
    const delayDebounceFn = setTimeout(async () => {
      setGeocodeStatus('Searching for coordinates...');
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.address)}`);
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          setFormData((prev) => ({ ...prev, latitude: lat, longitude: lon }));
          setGeocodeStatus(`✅ Coordinates Found!`);
          setShowManualCoords(false);
        } else {
          setGeocodeStatus('❌ Could not find coordinates. Please enter them manually.');
          setShowManualCoords(true);
        }
      } catch (err) {
        setGeocodeStatus('Error fetching coordinates. Please enter them manually.');
        setShowManualCoords(true);
      }
    }, 1000);
    return () => clearTimeout(delayDebounceFn);
  }, [formData.address]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setGeocodeStatus('Getting your current location...');
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          if (data && data.display_name) {
            setFormData({
              ...formData,
              address: data.display_name,
              latitude: latitude.toString(),
              longitude: longitude.toString(),
            });
            setGeocodeStatus('✅ Location and address found!');
            setShowManualCoords(false);
          } else {
            setGeocodeStatus('Could not find address. Please enter coordinates manually.');
            setShowManualCoords(true);
          }
        } catch (err) {
          setGeocodeStatus('Error fetching address. Please enter coordinates manually.');
          setShowManualCoords(true);
        }
      }, (error) => {
        setGeocodeStatus('Could not get location. Please enable location services.');
      });
    } else {
      setGeocodeStatus('Geolocation is not supported by this browser.');
    }
  };

  const handleAddRoom = () => setRooms([...rooms, { name: '', systems: [] }]);
  const handleRemoveRoom = (index) => setRooms(rooms.filter((_, i) => i !== index));

  const handleRoomNameChange = (index, event) => {
    const updatedRooms = [...rooms];
    updatedRooms[index].name = event.target.value;
    setRooms(updatedRooms);
  };
  
  const handleAddSystems = (roomIndex) => {
    const { systemType, count, pricePerHour } = systemAddForm;
    if (!systemType || count < 1 || !pricePerHour) {
      setError("Please specify a system type, a valid count, and a price.");
      return;
    }
    const updatedRooms = [...rooms];
    const currentRoom = updatedRooms[roomIndex];
    const existingCount = currentRoom.systems.filter(s => s.type === systemType).length;
    const newSystems = [];
    for (let i = 0; i < count; i++) {
      const systemNumber = existingCount + i + 1;
      const systemId = `${systemType.toUpperCase().replace(/\s/g, '')}${systemNumber.toString().padStart(2, '0')}`;
      newSystems.push({
        systemId,
        type: systemType,
        status: 'Available',
        specs: { ram: '', processor: '', graphicsCard: '' }, 
        pricePerHour: pricePerHour,
      });
    }
    currentRoom.systems.push(...newSystems);
    setRooms(updatedRooms);
    setSystemAddForm({ systemType: 'PC', count: 1, pricePerHour: '' });
  };
  
  const handleSystemSpecChange = (roomIndex, systemIndex, event) => {
    const { name, value } = event.target;
    const updatedRooms = [...rooms];
    const systemToUpdate = updatedRooms[roomIndex].systems[systemIndex];
    systemToUpdate.specs[name] = value;
    setRooms(updatedRooms);
  };

  const handleSystemAddFormChange = (e) => {
      const { name, value } = e.target;
      setSystemAddForm(prev => ({ ...prev, [name]: value }));
  };

  const onDrop = async (acceptedFiles) => {
    // Check if adding these files would exceed the 4 photo limit
    if (photos.length + acceptedFiles.length > 4) {
      setError(`You can only upload a maximum of 4 photos. You currently have ${photos.length} photos.`);
      return;
    }

    // Check file size (5MB limit per file)
    const oversizedFiles = acceptedFiles.filter(file => file.size > 5 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError(`Some files are too large. Maximum file size is 5MB. Please resize and try again.`);
      return;
    }

    setUploading(true);
    setError('');
    const uploadedUrls = [];
    for (const file of acceptedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        uploadedUrls.push(data.secure_url);
      } catch (err) {
        console.error('Error uploading image:', err);
        setError('Image upload failed.');
      }
    }
    setPhotos([...photos, ...uploadedUrls]);
    setUploading(false);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxFiles: 4 - photos.length,
    maxSize: 5 * 1024 * 1024 // 5MB
  });
  const removePhoto = (index) => setPhotos(photos.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!formData.latitude || !formData.longitude) {
      setError('Please enter a valid address and wait for coordinates to be found.');
      return;
    }
    setError('');
    setLoading(true);
    const cafeData = {
      name: formData.name, address: formData.address,
      openingTime: formData.openingTime, closingTime: formData.closingTime,
      location: { type: 'Point', coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)] },
      rooms: rooms, images: photos, contactNumber: formData.contactNumber, description: formData.description,
    };
    try {
      await cafeService.createCafe(cafeData);
      // This will now work correctly in your project
      navigate('/dashboard');
    } catch (err) {
      setError((err.response?.data?.message) || 'Failed to create cafe.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Step 1: Cafe Name */}
            <Box sx={{ 
              p: 3, 
              pt: 6,
              backgroundColor: 'rgba(59, 130, 246, 0.05)', 
              borderRadius: '12px', 
              border: '1px solid rgba(59, 130, 246, 0.1)',
              position: 'relative',
              '&::before': {
                content: '"1"',
                position: 'absolute',
                top: -18,
                left: 20,
                backgroundColor: '#3b82f6',
                color: 'white',
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
              }
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#1e293b', fontWeight: 600 }}>
                Cafe Name
              </Typography>
              <EnhancedTextField 
                fullWidth 
                label="Enter your cafe name" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                required 
                helperText="Choose a unique name for your gaming cafe"
              />
            </Box>

            {/* Step 2: Address with Location */}
            <Box sx={{ 
              p: 3, 
              pt: 6,
              backgroundColor: 'rgba(16, 185, 129, 0.05)', 
              borderRadius: '12px', 
              border: '1px solid rgba(16, 185, 129, 0.1)',
              position: 'relative',
              '&::before': {
                content: '"2"',
                position: 'absolute',
                top: -18,
                left: 20,
                backgroundColor: '#10b981',
                color: 'white',
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
              }
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#1e293b', fontWeight: 600 }}>
                Cafe Location
              </Typography>
          <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <EnhancedTextField 
                    fullWidth 
                    label="Full Address" 
                    name="address" 
                    value={formData.address} 
                    onChange={handleChange} 
                    required 
                    helperText="Enter the complete address of your cafe" 
                    multiline
                    rows={1}
                    sx={{
                      '& .MuiInputBase-inputMultiline': {
                        minHeight: '60px', // Reduced height for more horizontal layout
                        fontSize: '1rem',
                        lineHeight: '1.4',
                        resize: 'vertical'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Button 
                      variant="outlined" 
                      startIcon={<MyLocationIcon />} 
                      onClick={handleGetCurrentLocation}
                      sx={{
                        borderRadius: '12px',
                        px: 2,
                        py: 1.5,
                        fontWeight: 600,
                        borderColor: '#10b981',
                        color: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.05)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          backgroundColor: '#10b981',
                          color: '#ffffff',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                        }
                      }}
                    >
                      Get Current Location
                    </Button>
                    {geocodeStatus && (
                      <Box sx={{ 
                        mt: 1,
                        px: 2,
                        py: 1,
                        backgroundColor: geocodeStatus.startsWith('✅') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        borderRadius: '8px',
                        border: `1px solid ${geocodeStatus.startsWith('✅') ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                      }}>
                        <Typography variant="body2" sx={{ 
                          color: geocodeStatus.startsWith('✅') ? '#16a34a' : '#d97706',
                          fontWeight: 600,
                          fontSize: '0.8rem',
                          textAlign: 'center'
                        }}>
                          {geocodeStatus}
                        </Typography>
                      </Box>
                    )}
              </Box>
                </Grid>
            </Grid>
            {showManualCoords && (
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  <Grid item xs={6}><EnhancedTextField fullWidth label="Longitude" name="longitude" type="number" value={formData.longitude} onChange={handleChange} required /></Grid>
                  <Grid item xs={6}><EnhancedTextField fullWidth label="Latitude" name="latitude" type="number" value={formData.latitude} onChange={handleChange} required /></Grid>
                </Grid>
              )}
            </Box>

            {/* Step 3: Operating Hours */}
            <Box sx={{ 
              p: 3, 
              pt: 6,
              backgroundColor: 'rgba(245, 158, 11, 0.05)', 
              borderRadius: '12px', 
              border: '1px solid rgba(245, 158, 11, 0.1)',
              position: 'relative',
              '&::before': {
                content: '"3"',
                position: 'absolute',
                top: -18,
                left: 20,
                backgroundColor: '#f59e0b',
                color: 'white',
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
              }
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#1e293b', fontWeight: 600 }}>
                Operating Hours
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}><EnhancedTextField fullWidth label="Opening Time" name="openingTime" type="time" value={formData.openingTime} onChange={handleChange} InputLabelProps={{ shrink: true }} required /></Grid>
                <Grid item xs={6}><EnhancedTextField fullWidth label="Closing Time" name="closingTime" type="time" value={formData.closingTime} onChange={handleChange} InputLabelProps={{ shrink: true }} required /></Grid>
              </Grid>
            </Box>

            {/* Step 4: Contact & Description */}
            <Box sx={{ 
              p: 3, 
              pt: 6,
              backgroundColor: 'rgba(139, 92, 246, 0.05)', 
              borderRadius: '12px', 
              border: '1px solid rgba(139, 92, 246, 0.1)',
              position: 'relative',
              '&::before': {
                content: '"4"',
                position: 'absolute',
                top: -18,
                left: 20,
                backgroundColor: '#8b5cf6',
                color: 'white',
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
              }
            }}>
              <Typography variant="h6" sx={{ mb: 2, color: '#1e293b', fontWeight: 600 }}>
                Contact & Description
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}><EnhancedTextField fullWidth label="Contact Number" name="contactNumber" value={formData.contactNumber} onChange={handleChange} helperText="Phone number where customers can reach you (10 digits only)" inputProps={{ maxLength: 10, pattern: '[0-9]*' }} /></Grid>
                <Grid item xs={12}><EnhancedTextField 
                  fullWidth 
                  label="Cafe Description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  multiline 
                  rows={2} 
                  placeholder="Describe your gaming cafe, atmosphere, special features, etc." 
                  helperText="Tell customers what makes your cafe special (max 500 characters)" 
                  inputProps={{ maxLength: 500 }}
                  sx={{
                    '& .MuiInputBase-inputMultiline': {
                      minHeight: '60px', // Small initial height for description
                      fontSize: '1rem',
                      lineHeight: '1.5',
                    }
                  }}
                /></Grid>
          </Grid>
            </Box>
          </Box>
        );
      case 1:
        return (
          <>
            {rooms.map((room, roomIndex) => {
              const systemsByType = room.systems.reduce((acc, system) => {
                acc[system.type] = acc[system.type] || [];
                acc[system.type].push(system);
                return acc;
              }, {});

              return (
                <Card 
                  key={roomIndex} 
                  variant="outlined" 
                  sx={{ 
                    mb: 2, 
                    p: 2, 
                    pb: 2.5,
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: '#3b82f6',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)',
                      transform: 'translateY(-1px)',
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <EnhancedTextField 
                      label={`Room #${roomIndex + 1} Name`} 
                      name="name" 
                      value={room.name} 
                      onChange={(e) => handleRoomNameChange(roomIndex, e)} 
                      required 
                      sx={{ flexGrow: 1, mr: 1 }} 
                    />
                    <Button 
                      variant="outlined" 
                      color="error" 
                      onClick={() => handleRemoveRoom(roomIndex)}
                      sx={{
                        px: 2,
                        py: 1,
                        fontSize: '0.8rem',
                        borderRadius: '8px',
                        textTransform: 'none',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                        }
                      }}
                    >
                      Remove Room
                    </Button>
                  </Box>
                  
                  {Object.keys(systemsByType).map(type => (
                    <Box key={type} sx={{ mb: 2 }}>
                      <Divider sx={{ my: 2 }}>
                        <Typography variant="overline">{type}s (Price: ₹{systemsByType[type][0].pricePerHour}/hr)</Typography>
                      </Divider>
                      {systemsByType[type].map((system) => (
                        <SystemCard 
                          key={system.systemId} 
                          system={system} 
                          roomIndex={roomIndex}
                          systemIndex={room.systems.findIndex(s => s.systemId === system.systemId)}
                          handleSystemSpecChange={handleSystemSpecChange}
                        />
                      ))}
                    </Box>
                  ))}

                  <Box sx={{ backgroundColor: '#eef5ff', p: 2, borderRadius: 2, mt: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>Add New Systems to this Room</Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <FormControl fullWidth>
                          <InputLabel>System Type</InputLabel>
                          <Select name="systemType" value={systemAddForm.systemType} label="System Type" onChange={handleSystemAddFormChange}>
                            <MenuItem value="PC">PC</MenuItem>
                            <MenuItem value="PS5">PlayStation 5</MenuItem>
                            <MenuItem value="PS4">PlayStation 4</MenuItem>
                            <MenuItem value="Xbox Series X">Xbox Series X</MenuItem>
                            <MenuItem value="Nintendo Switch">Nintendo Switch</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <EnhancedTextField fullWidth label="Price Per Hour (INR)" name="pricePerHour" type="number" value={systemAddForm.pricePerHour} onChange={handleSystemAddFormChange} required />
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <EnhancedTextField fullWidth label="Count" name="count" type="number" value={systemAddForm.count} onChange={handleSystemAddFormChange} InputProps={{ inputProps: { min: 1 } }} required/>
                      </Grid>
                      <Grid item xs={12}>
                        <Button fullWidth variant="contained" color="success" startIcon={<AddCircleOutlineIcon />} onClick={() => handleAddSystems(roomIndex)}>Add Systems</Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Card>
              );
            })}
            <Button 
              variant="contained" 
              startIcon={<AddCircleOutlineIcon />} 
              onClick={handleAddRoom} 
              sx={{ 
                mb: 2,
                px: 2.5,
                py: 1.2,
                borderRadius: '10px',
                textTransform: 'none',
                fontSize: '0.9rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                  boxShadow: '0 6px 20px 0 rgba(59, 130, 246, 0.5)',
                  transform: 'translateY(-2px)',
                }
              }}
            >
              Add Another Room
            </Button>
          </>
        );
      case 2:
        return (
          <>
            <Paper 
              {...getRootProps()} 
              variant="outlined" 
              sx={{ 
                p: 3, 
                textAlign: 'center', 
                cursor: 'pointer', 
                backgroundColor: isDragActive ? '#e3f2fd' : '#fafafa', 
                borderColor: isDragActive ? 'primary.main' : 'rgba(0, 0, 0, 0.23)',
                borderRadius: '12px',
                border: '2px dashed',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: '#f0f9ff',
                  borderColor: '#3b82f6',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)',
                }
              }}
            >
              <input {...getInputProps()} />
              <UploadFileIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                Upload Cafe Photos
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mb: 1 }}>
                Maximum 4 photos • 5MB per file • JPG, PNG formats only
              </Typography>
              <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                {photos.length}/4 photos uploaded
              </Typography>
            </Paper>
            {uploading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress /></Box>}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {photos.map((url, index) => (
                <Grid item key={index} xs={6} sm={4} md={3}>
                  <Box 
                    sx={{ 
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
                      }
                    }}
                  >
                    <img 
                      src={url} 
                      alt={`Cafe ${index + 1}`} 
                      style={{ 
                        width: '100%', 
                        height: 120, 
                        objectFit: 'cover', 
                        borderRadius: '8px' 
                      }} 
                    />
                    <IconButton 
                      size="small" 
                      onClick={() => removePhoto(index)} 
                      sx={{ 
                        position: 'absolute', 
                        top: 4, 
                        right: 4, 
                        backgroundColor: 'rgba(239, 68, 68, 0.8)', 
                        color: 'white',
                        width: 28,
                        height: 28,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(239, 68, 68, 1)',
                          transform: 'scale(1.1)',
                        }
                      }}
                    >
                      <RemoveCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </>
        );
      default: return 'Unknown step';
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      position: 'relative'
    }}>

      {/* Dashboard Theme Navigation Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          px: 3,
          py: 2,
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 25%, #06b6d4 50%, #10b981 75%, #f59e0b 100%)',
            zIndex: 1
          }
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 50,
                  height: 50,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                  border: '2px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.05)',
                    boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)',
                  }
                }}
              >
                <Business sx={{ 
                  color: '#ffffff', 
                  fontSize: 24,
                  filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))'
                }} />
              </Box>
              <Box>
                <Typography 
                  variant="h5" 
                  component="span" 
                  sx={{ 
                    fontWeight: 700,
                    color: '#ffffff',
                    fontSize: '1.3rem',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    letterSpacing: '0.5px'
                  }}
                >
                  Create Your Cafe
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  Set Up Your Gaming Cafe Profile
                </Typography>
              </Box>
            </Box>
            <Button 
              component={Link}
              to="/dashboard" 
              sx={{ 
                color: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                px: 2.5,
                py: 1,
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '0.9rem',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                }
              }}
            >
              ← Back to Dashboard
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 2, position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: '16px',
            overflow: 'hidden',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 25px rgba(0, 0, 0, 0.1), 0 6px 12px rgba(0, 0, 0, 0.05)',
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 16px 35px rgba(0, 0, 0, 0.15), 0 8px 16px rgba(0, 0, 0, 0.08)',
              transform: 'translateY(-2px)',
            }
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Header Section */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{ 
                  fontWeight: 800, 
                  mb: 2,
                  background: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 50%, #8b5cf6 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: { xs: '2rem', md: '2.2rem' },
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  letterSpacing: '-0.02em',
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: '-8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60px',
                    height: '4px',
                    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                    borderRadius: '2px',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                  }
                }}
              >
                Set Up Your Cafe
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <Typography 
                  sx={{ 
                    fontSize: '1.8rem',
                    color: '#64748b',
                    textShadow: '0 2px 8px rgba(100, 116, 139, 0.4)',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                  }}
                >
                  ✨
                </Typography>
                <Typography 
                  variant="body1" 
                  sx={{ 
                    maxWidth: 600, 
                    color: '#475569',
                    fontWeight: 600,
                    fontSize: '1.15rem',
                    lineHeight: 1.7,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #475569 0%, #64748b 50%, #94a3b8 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  Follow the steps below to create your cafe profile and start managing bookings
                </Typography>
                <Typography 
                  sx={{ 
                    fontSize: '1.8rem',
                    color: '#64748b',
                    textShadow: '0 2px 8px rgba(100, 116, 139, 0.4)',
                    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))'
                  }}
                >
                  ✨
                </Typography>
              </Box>
            </Box>

            {/* Compact Professional Stepper */}
            <Stepper 
              activeStep={activeStep} 
              sx={{ 
                mb: 4,
                '& .MuiStepLabel-root': {
                  '& .MuiStepLabel-label': {
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }
                },
                '& .MuiStepIcon-root': {
                  fontSize: '1.5rem',
                  transition: 'all 0.3s ease',
                  '&.Mui-completed': {
                    color: '#10b981',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    }
                  },
                  '&.Mui-active': {
                    color: '#3b82f6',
                    '&:hover': {
                      transform: 'scale(1.1)',
                    }
                  }
                }
              }}
            >
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel 
                    sx={{
                      '& .MuiStepLabel-label': {
                        color: activeStep === index ? '#3b82f6' : 
                               activeStep > index ? '#10b981' : '#64748b',
                        transition: 'color 0.3s ease'
                      }
                    }}
                  >
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Error Alert */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 4,
                  borderRadius: 2,
                  '& .MuiAlert-message': {
                    fontSize: '1rem'
                  }
                }}
              >
                {error}
              </Alert>
            )}

            {/* Step Content */}
            <Box sx={{ 
              minHeight: 300,
              mb: 3,
              p: 2.5,
              backgroundColor: 'rgba(248, 250, 252, 0.5)',
              borderRadius: '12px',
              border: '1px solid rgba(226, 232, 240, 0.5)',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: 'rgba(248, 250, 252, 0.8)',
                borderColor: 'rgba(59, 130, 246, 0.2)',
              }
            }}>
              {getStepContent(activeStep)}
            </Box>

            {/* Navigation Buttons */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              pt: 3,
              borderTop: '1px solid rgba(226, 232, 240, 0.5)'
            }}>
              <Button 
                disabled={activeStep === 0} 
                onClick={handleBack} 
                sx={{ 
                  px: 3,
                  py: 1.2,
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  color: 'text.secondary',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  },
                  '&:disabled': {
                    backgroundColor: 'transparent',
                    color: 'text.disabled'
                  }
                }}
              >
                Back
              </Button>
              
              {activeStep === steps.length - 1 ? (
                <Button 
                  variant="contained" 
                  onClick={handleSubmit} 
                  disabled={loading || uploading}
                  sx={{
                    px: 5,
                    py: 1.2,
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                      boxShadow: '0 6px 20px 0 rgba(16, 185, 129, 0.5)',
                      transform: 'translateY(-2px)',
                    },
                    '&:disabled': {
                      background: 'rgba(0, 0, 0, 0.12)',
                      color: 'rgba(0, 0, 0, 0.26)',
                      boxShadow: 'none',
                    }
                  }}
                >
                  {loading || uploading ? 'Creating Cafe...' : 'Create Cafe'}
                </Button>
              ) : (
                <Button 
                  variant="contained" 
                  onClick={handleNext}
                  sx={{
                    px: 5,
                    py: 1.2,
                    borderRadius: '10px',
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                      boxShadow: '0 6px 20px 0 rgba(59, 130, 246, 0.5)',
                      transform: 'translateY(-2px)',
                    }
                  }}
                >
                  Next
                </Button>
              )}
            </Box>
          </CardContent>
        </Paper>
      </Container>
    </Box>
  );
};

export default CreateCafePage;
