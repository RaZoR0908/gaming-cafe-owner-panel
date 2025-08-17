import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import cafeService from '../services/cafeService';
import { useDropzone } from 'react-dropzone';

// --- Material-UI Imports ---
import {
  Container, Box, Typography, TextField, Button, Grid, Card,
  CardContent, IconButton,  CircularProgress, Paper, Alert,
  Stepper, Step, StepLabel
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MyLocationIcon from '@mui/icons-material/MyLocation';

const steps = ['Basic Details', 'Rooms & Systems', 'Manage Photos'];

const EditCafePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Stepper state
  const [activeStep, setActiveStep] = useState(0);

  // State for basic cafe details
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    openingTime: '',
    closingTime: '',
    longitude: '',
    latitude: '',
  });

  // State for the dynamic rooms and systems
  const [rooms, setRooms] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [geocodeStatus, setGeocodeStatus] = useState('');
  const [showManualCoords, setShowManualCoords] = useState(false);

  // --- Cloudinary Configuration ---
  const CLOUDINARY_CLOUD_NAME = 'dhohkvrmx';
  const CLOUDINARY_UPLOAD_PRESET = 'mda5k95v';

  // Fetch the cafe's current data when the component loads
  useEffect(() => {
    const fetchCafe = async () => {
      try {
        const response = await cafeService.getCafeById(id);
        const cafe = response.data;
        setFormData({
          name: cafe.name,
          address: cafe.address,
          openingTime: cafe.openingTime,
          closingTime: cafe.closingTime,
          longitude: cafe.location.coordinates[0],
          latitude: cafe.location.coordinates[1],
        });
        setRooms(cafe.rooms || []);
        setPhotos(cafe.photos || []);
      } catch (err) {
        setError('Failed to fetch cafe details.');
      } finally {
        setLoading(false);
      }
    };
    fetchCafe();
  }, [id]);

  // --- Automatic Geocoding with Debounce ---
  useEffect(() => {
    // This check prevents the geocoder from running on the initial load
    if (loading) return;

    if (!formData.address) {
      setGeocodeStatus('');
      return;
    }

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
          setGeocodeStatus('❌ Could not find coordinates. Please enter them manually below.');
          setShowManualCoords(true);
        }
      } catch (err) {
        setGeocodeStatus('Error fetching coordinates. Please enter them manually below.');
        setShowManualCoords(true);
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.address, loading]);


  // --- Handlers for form data ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // --- Handler for Get Current Location ---
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

  // --- Handlers for dynamic rooms and systems ---
  const handleRoomChange = (index, event) => {
    const newRooms = [...rooms];
    newRooms[index][event.target.name] = event.target.value;
    setRooms(newRooms);
  };

  const handleSystemChange = (roomIndex, systemIndex, event) => {
    const newRooms = [...rooms];
    newRooms[roomIndex].systems[systemIndex][event.target.name] = event.target.value;
    setRooms(newRooms);
  };

  const addRoom = () => {
    setRooms([...rooms, { roomType: '', systems: [{ systemType: '', count: '', specs: '', pricePerHour: '' }] }]);
  };

  const removeRoom = (index) => {
    const newRooms = [...rooms];
    newRooms.splice(index, 1);
    setRooms(newRooms);
  };

  const addSystem = (roomIndex) => {
    const newRooms = [...rooms];
    newRooms[roomIndex].systems.push({ systemType: '', count: '', specs: '', pricePerHour: '' });
    setRooms(newRooms);
  };

  const removeSystem = (roomIndex, systemIndex) => {
    const newRooms = [...rooms];
    newRooms[roomIndex].systems.splice(systemIndex, 1);
    setRooms(newRooms);
  };
  
  // --- Handlers for Image Upload ---
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

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };


  // --- FORM SUBMISSION ---
  const handleSubmit = async () => {
    if (!formData.latitude || !formData.longitude) {
      setError('Please provide coordinates for the address before saving.');
      return;
    }
    setLoading(true);
    setError('');
    const updatedCafeData = {
      name: formData.name,
      address: formData.address,
      openingTime: formData.openingTime,
      closingTime: formData.closingTime,
      location: {
        type: 'Point',
        coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
      },
      rooms: rooms,
      photos: photos,
    };
    try {
      await cafeService.updateCafe(id, updatedCafeData);
      navigate('/dashboard');
    } catch (err) {
      setError('Failed to update cafe. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // --- Stepper Navigation ---
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={2}>
            <Grid item xs={12}><TextField fullWidth label="Cafe Name" name="name" value={formData.name} onChange={handleChange} required /></Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Full Address" name="address" value={formData.address} onChange={handleChange} required 
                helperText="Coordinates will be found automatically as you type."
              />
              <Box sx={{display: 'flex', alignItems: 'center', gap: 1, mt: 1}}>
                <Button variant="outlined" startIcon={<MyLocationIcon />} onClick={handleGetCurrentLocation}>
                  Get Current Location
                </Button>
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
          </Grid>
        );
      case 1:
        return (
          <>
            {rooms.map((room, roomIndex) => (
              <Card key={roomIndex} variant="outlined" sx={{ mb: 2, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <TextField label={`Room #${roomIndex + 1} Name`} name="roomType" value={room.roomType} onChange={(e) => handleRoomChange(roomIndex, e)} required sx={{ flexGrow: 1, mr: 1 }}/>
                  <Button variant="outlined" color="error" onClick={() => removeRoom(roomIndex)}>Remove Room</Button>
                </Box>
                {room.systems.map((system, systemIndex) => (
                  <Grid container spacing={1} key={systemIndex} sx={{ mb: 1, alignItems: 'center' }}>
                    <Grid item xs={12} sm={3}><TextField fullWidth size="small" label="System" name="systemType" value={system.systemType} onChange={(e) => handleSystemChange(roomIndex, systemIndex, e)} required /></Grid>
                    <Grid item xs={6} sm={2}><TextField fullWidth size="small" label="Count" name="count" type="number" value={system.count} onChange={(e) => handleSystemChange(roomIndex, systemIndex, e)} required /></Grid>
                    <Grid item xs={6} sm={3}><TextField fullWidth size="small" label="Specs" name="specs" value={system.specs} onChange={(e) => handleSystemChange(roomIndex, systemIndex, e)} /></Grid>
                    <Grid item xs={6} sm={2}><TextField fullWidth size="small" label="Price/Hour" name="pricePerHour" type="number" value={system.pricePerHour} onChange={(e) => handleSystemChange(roomIndex, systemIndex, e)} required /></Grid>
                    <Grid item xs={6} sm={2}><IconButton color="error" onClick={() => removeSystem(roomIndex, systemIndex)}><RemoveCircleOutlineIcon /></IconButton></Grid>
                  </Grid>
                ))}
                <Button startIcon={<AddCircleOutlineIcon />} onClick={() => addSystem(roomIndex)}>Add System</Button>
              </Card>
            ))}
            <Button variant="outlined" startIcon={<AddCircleOutlineIcon />} onClick={addRoom} sx={{ mb: 2 }}>Add Another Room</Button>
          </>
        );
      case 2:
        return (
          <>
            <Paper
              {...getRootProps()}
              variant="outlined"
              sx={{ p: 4, textAlign: 'center', cursor: 'pointer', backgroundColor: isDragActive ? '#e3f2fd' : '#fafafa', borderColor: isDragActive ? 'primary.main' : 'rgba(0, 0, 0, 0.23)' }}
            >
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
                    <IconButton
                      size="small"
                      onClick={() => removePhoto(index)}
                      sx={{ position: 'absolute', top: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
                    >
                      <RemoveCircleOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </>
        );
      default:
        return 'Unknown step';
    }
  };
  
  if (loading && !formData.name) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;

  return (
    <Box sx={{ backgroundColor: '#f0f2f5', minHeight: '100vh', pb: 4 }}>
      <nav style={{ backgroundColor: '#333', padding: '15px 30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="span" sx={{ fontWeight: 'bold' }}>Owner Panel</Typography>
        <Button component={Link} to="/dashboard" sx={{ color: 'white' }}>Back to Dashboard</Button>
      </nav>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <Typography variant="h4" component="h1" align="center" gutterBottom>Edit Your Cafe</Typography>
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <Box sx={{ mt: 2 }}>
              {getStepContent(activeStep)}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
              <Button disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
                Back
              </Button>
              {activeStep === steps.length - 1 ? (
                <Button variant="contained" onClick={handleSubmit} disabled={loading || uploading}>
                  {loading || uploading ? 'Saving Changes...' : 'Save Changes'}
                </Button>
              ) : (
                <Button variant="contained" onClick={handleNext}>
                  Next
                </Button>
              )}
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default EditCafePage;
