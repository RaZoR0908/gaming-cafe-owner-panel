import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import cafeService from '../services/cafeService';

// --- Material-UI Imports ---
import {
  AppBar, Toolbar, Typography, Button, Container, Box, Card, CardContent,
  Grid, CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Modal, TextField, MenuItem, Alert, IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import FilterListIcon from '@mui/icons-material/FilterList';

// Style for the modal popup
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: 500 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
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

// Helper function to convert "02:00 PM" to a 24-hour number like 14
const timeToHour = (timeStr) => {
  if (!timeStr) return 0;
  const hourPart = parseInt(timeStr.split(':')[0]);
  const isPM = timeStr.includes('PM');
  let hour24 = hourPart;
  if (isPM && hourPart !== 12) hour24 += 12;
  if (!isPM && hourPart === 12) hour24 = 0; // Handle 12 AM
  return hour24;
};

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [myCafe, setMyCafe] = useState(null);
  const [allBookings, setAllBookings] = useState([]); // Holds all bookings
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // --- NEW: State for filtering and sorting ---
  const [filterDate, setFilterDate] = useState('');

  // --- State for the re-confirmation step ---
  const [bookingToReconfirm, setBookingToReconfirm] = useState(null);

  // --- State for the walk-in modal ---
  const [isModalOpen, setModalOpen] = useState(false);
  const [walkInData, setWalkInData] = useState({
    roomType: '',
    systemType: '',
    numberOfSystems: 1,
    duration: 1,
  });

  const navigate = useNavigate();

  const fetchCafeData = useCallback(async () => {
    try {
      const cafe = await cafeService.getMyCafe();
      setMyCafe(cafe);
      if (cafe) {
        const cafeBookings = await cafeService.getOwnerBookings(cafe._id);
        setAllBookings(cafeBookings);
      }
    } catch (err) {
      setError('Failed to fetch data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
    if (userData) {
      fetchCafeData();
    } else {
      setLoading(false);
    }
  }, [fetchCafeData]);

  // --- NEW: Memoized logic for filtering and sorting bookings ---
  const displayedBookings = useMemo(() => {
    let bookings = [...allBookings];

    // Filter by date if a date is selected
    if (filterDate) {
      bookings = bookings.filter(b => b.bookingDate.startsWith(filterDate));
    }

    // Sort the bookings sequentially
    bookings.sort((a, b) => {
      const dateA = new Date(a.bookingDate).getTime();
      const dateB = new Date(b.bookingDate).getTime();
      if (dateA !== dateB) {
        return dateA - dateB; // Sort by date first
      }
      // If dates are the same, sort by time
      return timeToHour(a.startTime) - timeToHour(b.startTime);
    });

    return bookings;
  }, [allBookings, filterDate]);


  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete your cafe?')) {
      try {
        await cafeService.deleteCafe(myCafe._id);
        setMyCafe(null);
        setAllBookings([]);
      } catch (err) {
        setError('Failed to delete cafe.');
      }
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    if (newStatus === 'Cancelled') {
      if (!window.confirm('Are you sure you want to cancel this booking?')) {
        return;
      }
    }
    try {
      const updatedBooking = await cafeService.updateBookingStatus(bookingId, newStatus);
      setAllBookings(allBookings.map(b => 
        b._id === bookingId ? updatedBooking : b
      ));
      setBookingToReconfirm(null);
    } catch (err) {
      setError('Failed to update booking status.');
    }
  };

  const handleExtendBooking = async (bookingId) => {
    const hoursToAdd = prompt("How many hours to add? (e.g., 0.5 for 30 mins)", "1");
    if (hoursToAdd && !isNaN(hoursToAdd) && hoursToAdd > 0) {
      try {
        const updatedBooking = await cafeService.extendBooking(bookingId, parseFloat(hoursToAdd));
        setAllBookings(allBookings.map(b =>
          b._id === bookingId ? updatedBooking : b
        ));
      } catch (err) {
        setError('Failed to extend booking.');
      }
    }
  };

  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => {
    setModalOpen(false);
    setWalkInData({ roomType: '', systemType: '', numberOfSystems: 1, duration: 1 });
  };

  const handleWalkInChange = (e) => {
    const { name, value } = e.target;
    setWalkInData(prev => ({ ...prev, [name]: value }));
  };

  const handleDurationChange = (amount) => {
    setWalkInData(prev => ({
      ...prev,
      duration: Math.max(0.5, prev.duration + amount)
    }));
  };

  const handleWalkInSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const today = new Date();
      const startTime = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

      const bookingData = {
        ...walkInData,
        cafeId: myCafe._id,
        bookingDate: today.toISOString().split('T')[0],
        startTime: startTime,
      };
      await cafeService.createWalkInBooking(bookingData);
      setSuccess('Walk-in booking added successfully!');
      handleCloseModal();
      fetchCafeData();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create walk-in booking.';
      setError(message);
      handleCloseModal();
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
    <Box sx={{ flexGrow: 1, backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ backgroundColor: '#333' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Owner Panel
          </Typography>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {user ? user.name : 'Owner'}!
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {myCafe ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h5" component="div" gutterBottom>
                    Your Cafe Details
                  </Typography>
                  <Typography variant="body1"><strong>Name:</strong> {myCafe.name}</Typography>
                  <Typography variant="body1"><strong>Address:</strong> {myCafe.address}</Typography>
                  <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                    <Button variant="contained" component={Link} to={`/edit-cafe/${myCafe._id}`}>Edit Details</Button>
                    <Button variant="outlined" color="error" onClick={handleDelete}>Delete Cafe</Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h5" component="div">
                      Bookings Management
                    </Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenModal}>
                      Add Walk-in
                    </Button>
                  </Box>
                  
                  {/* NEW: Date Filter */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                    <FilterListIcon />
                    <TextField
                      type="date"
                      size="small"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                    <Button onClick={() => setFilterDate('')}>Clear Filter</Button>
                  </Box>

                  <TableContainer component={Paper}>
                    <Table sx={{ minWidth: 650 }} aria-label="bookings table">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Time</TableCell>
                          <TableCell>System</TableCell>
                          <TableCell>Duration</TableCell>
                          <TableCell>Total Price</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayedBookings.map((booking, index) => {
                          const now = new Date();
                          const bookingStartHour = timeToHour(booking.startTime);
                          const bookingDateTime = new Date(booking.bookingDate);
                          bookingDateTime.setHours(bookingStartHour, 0, 0, 0);
                          
                          const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
                          const isCancellable = hoursUntilBooking > 1;

                          const minutesSinceUpdate = (now - new Date(booking.updatedAt)) / (1000 * 60);
                          const isReconfirmable = minutesSinceUpdate < 30;

                          return (
                            <TableRow key={booking._id}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{new Date(booking.bookingDate).toLocaleDateString()}</TableCell>
                              <TableCell>{booking.startTime}</TableCell>
                              <TableCell>{booking.systemType}</TableCell>
                              <TableCell>{booking.duration} hours</TableCell>
                              <TableCell>₹{booking.totalPrice}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={booking.status} 
                                  color={booking.status === 'Confirmed' ? 'primary' : booking.status === 'Completed' ? 'success' : 'default'} 
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                  {booking.status === 'Confirmed' && (
                                    <>
                                      <Button 
                                        size="small" 
                                        variant="contained" 
                                        color="warning" 
                                        onClick={() => handleStatusUpdate(booking._id, 'Cancelled')}
                                        disabled={!isCancellable}
                                        title={!isCancellable ? "Cannot cancel within 1 hour of start time" : ""}
                                      >
                                        Cancel
                                      </Button>
                                      <Button size="small" variant="contained" color="info" onClick={() => handleExtendBooking(booking._id)}>Extend</Button>
                                    </>
                                  )}
                                  {booking.status === 'Cancelled' && isReconfirmable && (
                                     <>
                                      {bookingToReconfirm === booking._id ? (
                                        <>
                                          <Button size="small" variant="contained" color="success" onClick={() => handleStatusUpdate(booking._id, 'Confirmed')}>Confirm</Button>
                                          <Button size="small" variant="outlined" onClick={() => setBookingToReconfirm(null)}>Back</Button>
                                        </>
                                      ) : (
                                        <Button size="small" variant="outlined" onClick={() => setBookingToReconfirm(booking._id)}>Re-confirm</Button>
                                      )}
                                     </>
                                  )}
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Card>
            <CardContent sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="h6">You have not registered a cafe yet.</Typography>
              <Button variant="contained" size="large" component={Link} to="/create-cafe" sx={{ mt: 2 }}>
                Create Your Cafe
              </Button>
            </CardContent>
          </Card>
        )}
      </Container>

      {/* --- Walk-in Booking Modal --- */}
      <Modal open={isModalOpen} onClose={handleCloseModal}>
        <Box sx={modalStyle} component="form" onSubmit={handleWalkInSubmit}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Add Walk-in Booking
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField select fullWidth label="Room" name="roomType" value={walkInData.roomType} onChange={handleWalkInChange} required>
                {myCafe?.rooms.map(room => (
                  <MenuItem key={room.roomType} value={room.roomType}>{room.roomType}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField select fullWidth label="System" name="systemType" value={walkInData.systemType} onChange={handleWalkInChange} disabled={!walkInData.roomType} required>
                {myCafe?.rooms.find(r => r.roomType === walkInData.roomType)?.systems.map(sys => (
                  <MenuItem key={sys.systemType} value={sys.systemType}>{sys.systemType}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="No. of Systems" name="numberOfSystems" type="number" defaultValue={1} onChange={handleWalkInChange} required InputProps={{ inputProps: { min: 1 } }}/>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" component="label" sx={{ color: 'text.secondary', mb: 1 }}>Duration</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #ccc', borderRadius: 1, p: 0.5 }}>
                <IconButton onClick={() => handleDurationChange(-0.5)}><RemoveCircleOutlineIcon /></IconButton>
                <Typography variant="h6">{formatDuration(walkInData.duration)}</Typography>
                <IconButton onClick={() => handleDurationChange(0.5)}><AddCircleOutlineIcon /></IconButton>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleCloseModal} sx={{ mr: 1 }}>Cancel</Button>
            <Button type="submit" variant="contained">Add Booking</Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default DashboardPage;
