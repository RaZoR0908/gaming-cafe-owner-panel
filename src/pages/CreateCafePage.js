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

// --- Reusable SystemCard Component ---
// This component now allows editing specs for each individual PC.
const SystemCard = ({ system, roomIndex, systemIndex, handleSystemSpecChange }) => {
  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, backgroundColor: '#f9f9f9' }}>
      <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: 'bold' }}>
        System ID: <Box component="span" sx={{ fontFamily: 'monospace', backgroundColor: '#eee', px: 1, borderRadius: 1 }}>{system.systemId}</Box>
      </Typography>
      {system.type === 'PC' && (
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField 
              fullWidth 
              label="RAM" 
              name="ram" 
              value={system.specs.ram} 
              onChange={(e) => handleSystemSpecChange(roomIndex, systemIndex, e)}
              placeholder="e.g., 16GB DDR4"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField 
              fullWidth 
              label="Processor" 
              name="processor" 
              value={system.specs.processor} 
              onChange={(e) => handleSystemSpecChange(roomIndex, systemIndex, e)}
              placeholder="e.g., Intel Core i7"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField 
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

  const CLOUDINARY_CLOUD_NAME = 'dhohkvrmx';
  const CLOUDINARY_UPLOAD_PRESET = 'mda5k95v';

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
    setUploading(true);
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
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {'image/*': []} });
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
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Cafe Name" name="name" value={formData.name} onChange={handleChange} required /></Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Full Address" name="address" value={formData.address} onChange={handleChange} required helperText="Coordinates will be found automatically as you type." />
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mt: 1}}>
                <Button variant="outlined" startIcon={<MyLocationIcon />} onClick={handleGetCurrentLocation}>Get Current Location</Button>
                {geocodeStatus && <Typography variant="caption" sx={{ color: geocodeStatus.startsWith('✅') ? 'green' : 'orange' }}>{geocodeStatus}</Typography>}
              </Box>
            </Grid>
            {showManualCoords && (
              <>
                <Grid item xs={6}><TextField fullWidth label="Longitude" name="longitude" type="number" value={formData.longitude} onChange={handleChange} required /></Grid>
                <Grid item xs={6}><TextField fullWidth label="Latitude" name="latitude" type="number" value={formData.latitude} onChange={handleChange} required /></Grid>
              </>
            )}
            <Grid item xs={6}><TextField fullWidth label="Opening Time" name="openingTime" type="time" value={formData.openingTime} onChange={handleChange} InputLabelProps={{ shrink: true }} required /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Closing Time" name="closingTime" type="time" value={formData.closingTime} onChange={handleChange} InputLabelProps={{ shrink: true }} required /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Contact Number" name="contactNumber" value={formData.contactNumber} onChange={handleChange} placeholder="e.g., 9876543210" helperText="Phone number where customers can reach you (10 digits only)" inputProps={{ maxLength: 10, pattern: '[0-9]*' }} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Cafe Description" name="description" value={formData.description} onChange={handleChange} multiline rows={3} placeholder="Describe your gaming cafe, atmosphere, special features, etc." helperText="Tell customers what makes your cafe special (max 500 characters)" inputProps={{ maxLength: 500 }} /></Grid>
          </Grid>
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
                <Card key={roomIndex} variant="outlined" sx={{ mb: 3, p: 2, pb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <TextField label={`Room #${roomIndex + 1} Name`} name="name" value={room.name} onChange={(e) => handleRoomNameChange(roomIndex, e)} required sx={{ flexGrow: 1, mr: 1 }} />
                    <Button variant="outlined" color="error" onClick={() => handleRemoveRoom(roomIndex)}>Remove Room</Button>
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
                        <TextField fullWidth label="Price Per Hour (INR)" name="pricePerHour" type="number" value={systemAddForm.pricePerHour} onChange={handleSystemAddFormChange} required />
                      </Grid>
                      <Grid item xs={6} sm={4}>
                        <TextField fullWidth label="Count" name="count" type="number" value={systemAddForm.count} onChange={handleSystemAddFormChange} InputProps={{ inputProps: { min: 1 } }} required/>
                      </Grid>
                      <Grid item xs={12}>
                        <Button fullWidth variant="contained" color="success" startIcon={<AddCircleOutlineIcon />} onClick={() => handleAddSystems(roomIndex)}>Add Systems</Button>
                      </Grid>
                    </Grid>
                  </Box>
                </Card>
              );
            })}
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={handleAddRoom} sx={{ mb: 2 }}>Add Another Room</Button>
          </>
        );
      case 2:
        return (
          <>
            <Paper {...getRootProps()} variant="outlined" sx={{ p: 4, textAlign: 'center', cursor: 'pointer', backgroundColor: isDragActive ? '#e3f2fd' : '#fafafa', borderColor: isDragActive ? 'primary.main' : 'rgba(0, 0, 0, 0.23)' }}>
              <input {...getInputProps()} />
              <UploadFileIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
              <Typography>Drag 'n' drop some files here, or click to select files</Typography>
            </Paper>
            {uploading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}><CircularProgress /></Box>}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {photos.map((url, index) => (
                <Grid item key={index} xs={6} sm={4} md={3}>
                  <Box sx={{ position: 'relative' }}>
                    <img src={url} alt={`Cafe ${index + 1}`} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: '4px' }} />
                    <IconButton size="small" onClick={() => removePhoto(index)} sx={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.7)' }}><RemoveCircleOutlineIcon fontSize="small" /></IconButton>
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
      background: '#f8fafc',
      position: 'relative'
    }}>

      {/* Professional Navigation */}
      <Box
        sx={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          px: 4,
          py: 2,
          position: 'sticky',
          top: 0,
          zIndex: 1000,
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
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
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #dbeafe'
                }}
              >
                <Business sx={{ color: '#3b82f6', fontSize: 24 }} />
              </Box>
              <Typography 
                variant="h5" 
                component="span" 
                sx={{ 
                  fontWeight: 700, 
                  color: '#1e293b'
                }}
              >
                Create Your Cafe
              </Typography>
            </Box>
            <Button 
              component={Link}
              to="/dashboard" 
              sx={{ 
                color: '#64748b',
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: 1,
                px: 3,
                py: 1,
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#e2e8f0',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              Back to Dashboard
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4, position: 'relative', zIndex: 1 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: 'hidden',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
        >
          <CardContent sx={{ p: 6 }}>
            {/* Header Section */}
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Typography variant="h3" component="h1" sx={{ 
                fontWeight: 700, 
                mb: 2,
                color: '#1e293b'
              }}>
                Set Up Your Cafe
              </Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  maxWidth: 600, 
                  mx: 'auto',
                  color: '#64748b',
                  fontWeight: 400
                }}
              >
                Follow the steps below to create your cafe profile and start managing bookings
              </Typography>
            </Box>

            {/* Professional Stepper */}
            <Stepper 
              activeStep={activeStep} 
              sx={{ 
                mb: 6,
                '& .MuiStepLabel-root': {
                  '& .MuiStepLabel-label': {
                    fontSize: '1rem',
                    fontWeight: 600
                  }
                },
                '& .MuiStepIcon-root': {
                  fontSize: '2rem',
                  '&.Mui-completed': {
                    color: '#2e7d32'
                  },
                  '&.Mui-active': {
                    color: '#1976d2'
                  }
                }
              }}
            >
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel 
                    sx={{
                      '& .MuiStepLabel-label': {
                        color: activeStep === index ? '#1976d2' : 
                               activeStep > index ? '#2e7d32' : 'text.secondary'
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
              minHeight: 400,
              mb: 4,
              p: 3,
              backgroundColor: 'rgba(248, 250, 252, 0.5)',
              borderRadius: 3,
              border: '1px solid rgba(226, 232, 240, 0.5)'
            }}>
              {getStepContent(activeStep)}
            </Box>

            {/* Navigation Buttons */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              pt: 4,
              borderTop: '1px solid rgba(226, 232, 240, 0.5)'
            }}>
              <Button 
                disabled={activeStep === 0} 
                onClick={handleBack} 
                sx={{ 
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  color: 'text.secondary',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
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
                    px: 6,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
                    boxShadow: '0 4px 14px 0 rgba(46, 125, 50, 0.39)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1b5e20 0%, #0d3e0d 100%)',
                      boxShadow: '0 6px 20px 0 rgba(46, 125, 50, 0.5)',
                      transform: 'translateY(-1px)',
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
                    px: 6,
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '1rem',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                    boxShadow: '0 4px 14px 0 rgba(25, 118, 210, 0.39)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                      boxShadow: '0 6px 20px 0 rgba(25, 118, 210, 0.5)',
                      transform: 'translateY(-1px)',
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
