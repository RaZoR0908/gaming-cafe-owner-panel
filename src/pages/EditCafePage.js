import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import cafeService from '../services/cafeService';

// --- Material-UI Imports ---
import {
  Container, Box, Typography, TextField, Button, Grid, Card,
  CardContent, IconButton, Divider, CircularProgress
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

const EditCafePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      } catch (err) {
        setError('Failed to fetch cafe details.');
      } finally {
        setLoading(false);
      }
    };
    fetchCafe();
  }, [id]);

  // --- Handlers (logic remains the same) ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
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

  // --- FORM SUBMISSION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const updatedCafeData = {
      ...formData,
      location: {
        type: 'Point',
        coordinates: [parseFloat(formData.longitude), parseFloat(formData.latitude)],
      },
      rooms: rooms,
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
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ backgroundColor: '#f0f2f5', minHeight: '100vh', pb: 4 }}>
      <nav style={{ backgroundColor: '#333', padding: '15px 30px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="span" sx={{ fontWeight: 'bold' }}>Owner Panel</Typography>
        <Button component={Link} to="/dashboard" sx={{ color: 'white' }}>Back to Dashboard</Button>
      </nav>
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Card>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <Typography variant="h4" component="h1" align="center" gutterBottom>
              Edit Your Cafe
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              {error && <Typography color="error" align="center" sx={{ mb: 2 }}>{error}</Typography>}
              
              <Typography variant="h6" gutterBottom>Basic Details</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}><TextField fullWidth label="Cafe Name" name="name" value={formData.name} onChange={handleChange} required /></Grid>
                <Grid item xs={12}><TextField fullWidth label="Full Address" name="address" value={formData.address} onChange={handleChange} required /></Grid>
                <Grid item xs={6} sm={3}><TextField fullWidth label="Opening Time" name="openingTime" type="time" value={formData.openingTime} onChange={handleChange} InputLabelProps={{ shrink: true }} required /></Grid>
                <Grid item xs={6} sm={3}><TextField fullWidth label="Closing Time" name="closingTime" type="time" value={formData.closingTime} onChange={handleChange} InputLabelProps={{ shrink: true }} required /></Grid>
                <Grid item xs={6} sm={3}><TextField fullWidth label="Longitude (Temp)" name="longitude" type="number" value={formData.longitude} onChange={handleChange} required /></Grid>
                <Grid item xs={6} sm={3}><TextField fullWidth label="Latitude (Temp)" name="latitude" type="number" value={formData.latitude} onChange={handleChange} required /></Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              <Typography variant="h6" gutterBottom>Rooms & Systems</Typography>
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

              <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 2 }}>
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default EditCafePage;
