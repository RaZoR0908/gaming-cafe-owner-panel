import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import cafeService from '../services/cafeService';

// --- Material-UI Imports ---
import {
  AppBar, Toolbar, Typography, Button, Container, Box, Card, CardContent,
  Grid, CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip
} from '@mui/material';

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [myCafe, setMyCafe] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const fetchCafeData = useCallback(async () => {
    setLoading(true);
    try {
      const cafe = await cafeService.getMyCafe();
      setMyCafe(cafe);
      if (cafe) {
        const cafeBookings = await cafeService.getOwnerBookings(cafe._id);
        setBookings(cafeBookings);
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

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete your cafe?')) {
      try {
        await cafeService.deleteCafe(myCafe._id);
        setMyCafe(null);
        setBookings([]);
      } catch (err) {
        setError('Failed to delete cafe.');
      }
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await cafeService.updateBookingStatus(bookingId, newStatus);
      setBookings(bookings.map(b => 
        b._id === bookingId ? { ...b, status: newStatus } : b
      ));
    } catch (err) {
      setError('Failed to update booking status.');
    }
  };

  const handleExtendBooking = async (bookingId) => {
    const hoursToAdd = prompt("How many hours to add? (e.g., 0.5 for 30 mins)", "1");
    if (hoursToAdd && !isNaN(hoursToAdd) && hoursToAdd > 0) {
      try {
        const updatedBooking = await cafeService.extendBooking(bookingId, parseFloat(hoursToAdd));
        setBookings(bookings.map(b =>
          b._id === bookingId ? updatedBooking : b
        ));
      } catch (err) {
        setError('Failed to extend booking.');
      }
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
        
        {error && <Typography color="error" align="center">{error}</Typography>}

        {myCafe ? (
          <Grid container spacing={3}>
            {/* Cafe Details Card (Left Column) */}
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

            {/* Bookings Card (Right Column) */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h5" component="div" gutterBottom>
                    Bookings Management
                  </Typography>
                  {bookings.length > 0 ? (
                    <TableContainer component={Paper}>
                      <Table sx={{ minWidth: 650 }} aria-label="bookings table">
                        <TableHead>
                          <TableRow>
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
                          {bookings.map((booking) => {
                            // --- NEW LOGIC TO CHECK BOOKING DATE ---
                            const today = new Date();
                            today.setHours(0, 0, 0, 0); // Set to start of today for accurate date comparison
                            const bookingDate = new Date(booking.bookingDate);
                            bookingDate.setHours(0, 0, 0, 0);
                            const isPastBooking = bookingDate < today;

                            return (
                              <TableRow key={booking._id}>
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
                                        <Button size="small" variant="contained" color="success" onClick={() => handleStatusUpdate(booking._id, 'Completed')}>Complete</Button>
                                        {/* Only show Cancel and Extend buttons for today's or future bookings */}
                                        {!isPastBooking && (
                                          <>
                                            <Button size="small" variant="contained" color="warning" onClick={() => handleStatusUpdate(booking._id, 'Cancelled')}>Cancel</Button>
                                            <Button size="small" variant="contained" color="info" onClick={() => handleExtendBooking(booking._id)}>Extend</Button>
                                          </>
                                        )}
                                      </>
                                    )}
                                    {(booking.status === 'Cancelled' || booking.status === 'Completed') && (
                                       <Button size="small" variant="outlined" onClick={() => handleStatusUpdate(booking._id, 'Confirmed')}>Re-confirm</Button>
                                    )}
                                  </Box>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Typography>You have no bookings yet.</Typography>
                  )}
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
    </Box>
  );
};

export default DashboardPage;
