import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import cafeService from '../services/cafeService';

// --- Material-UI Imports ---
import {
  AppBar, Toolbar, Typography, Button, Container, Box, Card, CardContent,
  Grid, CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Modal, TextField, MenuItem, Alert, IconButton,
  Rating,  Avatar,  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import StarIcon from '@mui/icons-material/Star';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import BookingsIcon from '@mui/icons-material/EventNote';
import ReviewsIcon from '@mui/icons-material/RateReview';
import DashboardIcon from '@mui/icons-material/Dashboard';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

// Simple modal style
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
  if (!isPM && hourPart === 12) hour24 = 0;
  return hour24;
};

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [myCafe, setMyCafe] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Simple view state - just switch between main sections
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'bookings', 'reviews', 'cafe'

  // --- State for filtering and sorting ---
  const [filterDate, setFilterDate] = useState('');

  // --- State for the re-confirmation step ---
  const [bookingToReconfirm, setBookingToReconfirm] = useState(null);

  // --- State for the walk-in modal ---
  const [isModalOpen, setModalOpen] = useState(false);
  const [walkInData, setWalkInData] = useState({
    walkInCustomerName: '',
    roomType: '',
    systemType: '',
    numberOfSystems: 1,
    duration: 1,
  });

  const navigate = useNavigate();

  // Function to fetch reviews
  const fetchReviews = useCallback(async () => {
    if (!myCafe) return;
    
    setReviewsLoading(true);
    try {
      const reviewData = await cafeService.getOwnerReviews();
      setReviews(reviewData);
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setError('Failed to fetch reviews.');
    } finally {
      setReviewsLoading(false);
    }
  }, [myCafe]);

  const fetchCafeData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
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
      if (showRefresh) setRefreshing(false);
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

  // Fetch reviews when cafe data is loaded
  useEffect(() => {
    if (myCafe) {
      fetchReviews();
    }
  }, [myCafe, fetchReviews]);

  // Memoized logic for filtering and sorting bookings
  const displayedBookings = useMemo(() => {
    let bookings = [...allBookings];

    if (filterDate) {
      bookings = bookings.filter(b => b.bookingDate.startsWith(filterDate));
    }

    bookings.sort((a, b) => {
      const dateA = new Date(a.bookingDate).getTime();
      const dateB = new Date(b.bookingDate).getTime();
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      return timeToHour(a.startTime) - timeToHour(b.startTime);
    });

    return bookings;
  }, [allBookings, filterDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBookings = allBookings.filter(b => b.bookingDate.startsWith(today));
    const confirmedBookings = allBookings.filter(b => b.status === 'Confirmed');
    const totalRevenue = allBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const averageRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 0;
    
    return {
      todayBookings: todayBookings.length,
      confirmedBookings: confirmedBookings.length,
      totalRevenue,
      averageRating,
      totalReviews: reviews.length
    };
  }, [allBookings, reviews]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleRefresh = () => {
    fetchCafeData(true);
    fetchReviews();
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete your cafe? This action cannot be undone.')) {
      try {
        await cafeService.deleteCafe(myCafe._id);
        setMyCafe(null);
        setAllBookings([]);
        setReviews([]);
        setSuccess('Cafe deleted successfully.');
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
      setSuccess(`Booking ${newStatus.toLowerCase()} successfully.`);
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
        setSuccess('Booking extended successfully.');
      } catch (err) {
        setError('Failed to extend booking.');
      }
    }
  };

  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => {
    setModalOpen(false);
    setWalkInData({ walkInCustomerName: '', roomType: '', systemType: '', numberOfSystems: 1, duration: 1 });
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
    <Box sx={{ flexGrow: 1, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Simple Header */}
      <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            {myCafe?.name || 'Cafe Dashboard'}
          </Typography>
          <IconButton color="inherit" onClick={handleRefresh} disabled={refreshing}>
            <RefreshIcon />
          </IconButton>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {user ? user.name : 'Owner'}!
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {myCafe ? (
          <>
            {/* Quick Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: '#e3f2fd', borderLeft: '4px solid #1976d2' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                          {stats.todayBookings}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Today's Bookings</Typography>
                      </Box>
                      <AccessTimeIcon sx={{ fontSize: 40, color: '#1976d2', opacity: 0.7 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: '#f3e5f5', borderLeft: '4px solid #9c27b0' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#9c27b0' }}>
                          {stats.confirmedBookings}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Active Bookings</Typography>
                      </Box>
                      <BookingsIcon sx={{ fontSize: 40, color: '#9c27b0', opacity: 0.7 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: '#e8f5e8', borderLeft: '4px solid #388e3c' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#388e3c' }}>
                          ₹{stats.totalRevenue.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">Total Revenue</Typography>
                      </Box>
                      <TrendingUpIcon sx={{ fontSize: 40, color: '#388e3c', opacity: 0.7 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ bgcolor: '#fff3e0', borderLeft: '4px solid #f57c00' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#f57c00' }}>
                            {stats.averageRating}
                          </Typography>
                          <StarIcon sx={{ color: '#f57c00' }} />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Avg Rating ({stats.totalReviews})
                        </Typography>
                      </Box>
                      <ReviewsIcon sx={{ fontSize: 40, color: '#f57c00', opacity: 0.7 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Simple Navigation Buttons */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <Button 
                variant={currentView === 'dashboard' ? 'contained' : 'outlined'}
                onClick={() => setCurrentView('dashboard')}
                startIcon={<DashboardIcon />}
                size="large"
              >
                Overview
              </Button>
              <Button 
                variant={currentView === 'bookings' ? 'contained' : 'outlined'}
                onClick={() => setCurrentView('bookings')}
                startIcon={<BookingsIcon />}
                size="large"
              >
                Bookings
              </Button>
              <Button 
                variant={currentView === 'reviews' ? 'contained' : 'outlined'}
                onClick={() => setCurrentView('reviews')}
                startIcon={<ReviewsIcon />}
                size="large"
              >
                Reviews
              </Button>
              <Button 
                variant={currentView === 'cafe' ? 'contained' : 'outlined'}
                onClick={() => setCurrentView('cafe')}
                startIcon={<BusinessIcon />}
                size="large"
              >
                Cafe Settings
              </Button>
            </Stack>

            {/* Dashboard Overview */}
            {currentView === 'dashboard' && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                        <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Quick Info
                      </Typography>
                      <Typography variant="h6" gutterBottom>{myCafe.name}</Typography>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        <strong>Address:</strong> {myCafe.address}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        <strong>Contact:</strong> {myCafe.contactNumber || 'Not provided'}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Button 
                          variant="contained" 
                          component={Link} 
                          to={`/edit-cafe/${myCafe._id}`}
                          startIcon={<EditIcon />}
                          sx={{ mr: 1 }}
                        >
                          Edit Details
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                        Quick Actions
                      </Typography>
                      <Stack spacing={2}>
                        <Button 
                          variant="contained" 
                          color="primary" 
                          onClick={() => setCurrentView('bookings')}
                          startIcon={<BookingsIcon />}
                          fullWidth
                          size="large"
                        >
                          Manage Bookings
                        </Button>
                        <Button 
                          variant="contained" 
                          color="secondary" 
                          onClick={handleOpenModal}
                          startIcon={<AddIcon />}
                          fullWidth
                          size="large"
                        >
                          Add Walk-in Booking
                        </Button>
                        <Button 
                          variant="outlined" 
                          onClick={() => setCurrentView('reviews')}
                          startIcon={<ReviewsIcon />}
                          fullWidth
                          size="large"
                        >
                          View Customer Reviews
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* Simple Bookings Management */}
            {currentView === 'bookings' && (
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                      <BookingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                      Bookings Management
                    </Typography>
                    <Button 
                      variant="contained" 
                      startIcon={<AddIcon />} 
                      onClick={handleOpenModal}
                      size="large"
                    >
                      Add Walk-in
                    </Button>
                  </Box>
                  
                  {/* Simple Filter */}
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
                    <FilterListIcon color="primary" />
                    <TextField
                      type="date"
                      label="Filter by Date"
                      size="small"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ minWidth: 200 }}
                    />
                    <Button variant="outlined" onClick={() => setFilterDate('')}>
                      Clear
                    </Button>
                  </Box>

                  {/* Simple Table */}
                  <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Customer</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Date & Time</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Room/System</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Duration</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Price</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5' }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', bgcolor: '#f5f5f5', textAlign: 'center' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {displayedBookings.map((booking, index) => {
                          const now = new Date();
                          const bookingStartHour = timeToHour(booking.startTime);
                          const bookingDateTime = new Date(booking.bookingDate);
                          bookingDateTime.setHours(bookingStartHour, 0, 0, 0);
                          
                          const hoursUntilBooking = (bookingDateTime - now) / (1000 * 60 * 60);
                          const isWalkIn = !booking.customer && booking.walkInCustomerName;
                          const isCancellable = isWalkIn || hoursUntilBooking > 1;

                          const minutesSinceUpdate = (now - new Date(booking.updatedAt)) / (1000 * 60);
                          const isReconfirmable = minutesSinceUpdate < 30;

                          return (
                            <TableRow key={booking._id} hover>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell sx={{ fontWeight: 'medium' }}>
                                {booking.customer ? booking.customer.name : (booking.walkInCustomerName || 'Walk-in')}
                              </TableCell>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2" fontWeight="medium">
                                    {new Date(booking.bookingDate).toLocaleDateString()}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {booking.startTime}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box>
                                  <Typography variant="body2">{booking.roomType || 'N/A'}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {booking.systemType} ({booking.numberOfSystems || 1})
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="medium">
                                  {formatDuration(booking.duration)}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight="bold" color="success.main">
                                  ₹{booking.totalPrice}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip 
                                  label={booking.status} 
                                  color={
                                    booking.status === 'Confirmed' ? 'primary' : 
                                    booking.status === 'Completed' ? 'success' : 
                                    booking.status === 'Cancelled' ? 'error' : 'default'
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="center">
                                <Stack direction="row" spacing={1} justifyContent="center">
                                  {booking.status === 'Confirmed' && (
                                    <>
                                      <Button 
                                        size="small" 
                                        variant="outlined" 
                                        color="warning" 
                                        onClick={() => handleStatusUpdate(booking._id, 'Cancelled')}
                                        disabled={!isCancellable}
                                        title={!isCancellable ? "Cannot cancel within 1 hour" : ""}
                                      >
                                        Cancel
                                      </Button>
                                      <Button 
                                        size="small" 
                                        variant="outlined" 
                                        color="info" 
                                        onClick={() => handleExtendBooking(booking._id)}
                                      >
                                        Extend
                                      </Button>
                                    </>
                                  )}
                                  {booking.status === 'Cancelled' && isReconfirmable && (
                                     <>
                                      {bookingToReconfirm === booking._id ? (
                                        <>
                                          <Button 
                                            size="small" 
                                            variant="contained" 
                                            color="success" 
                                            onClick={() => handleStatusUpdate(booking._id, 'Confirmed')}
                                          >
                                            Confirm
                                          </Button>
                                          <Button 
                                            size="small" 
                                            variant="outlined" 
                                            onClick={() => setBookingToReconfirm(null)}
                                          >
                                            Back
                                          </Button>
                                        </>
                                      ) : (
                                        <Button 
                                          size="small" 
                                          variant="outlined" 
                                          onClick={() => setBookingToReconfirm(booking._id)}
                                        >
                                          Re-confirm
                                        </Button>
                                      )}
                                     </>
                                  )}
                                </Stack>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {displayedBookings.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} sx={{ textAlign: 'center', py: 6 }}>
                              <BookingsIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                              <Typography variant="h6" color="text.secondary" gutterBottom>
                                {filterDate ? 'No bookings found for selected date' : 'No bookings yet'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {filterDate ? 'Try selecting a different date' : 'Your bookings will appear here'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            )}

            {/* Reviews Section */}
            {currentView === 'reviews' && (
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    <ReviewsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Customer Reviews
                  </Typography>
                  
                  {reviewsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : reviews.length > 0 ? (
                    <Grid container spacing={3}>
                      {reviews.map((review, index) => (
                        <Grid item xs={12} sm={6} lg={4} key={review._id || index}>
                          <Card sx={{ height: '100%', borderRadius: 2 }}>
                            <CardContent>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.main' }}>
                                  <PersonIcon />
                                </Avatar>
                                <Box>
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {review.customerName || review.customer?.name || 'Anonymous'}
                                  </Typography>
                                  <Rating value={review.rating} readOnly size="small" />
                                </Box>
                              </Box>
                              {review.comment && (
                                <Typography variant="body2" sx={{ 
                                  bgcolor: 'grey.50', 
                                  p: 2, 
                                  borderRadius: 1, 
                                  fontStyle: 'italic',
                                  mb: 2
                                }}>
                                  "{review.comment}"
                                </Typography>
                              )}
                              <Typography variant="caption" color="text.secondary">
                                {new Date(review.createdAt || review.reviewDate).toLocaleDateString()}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <ReviewsIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Reviews Yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Customer reviews will appear here once they rate your cafe
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cafe Settings */}
            {currentView === 'cafe' && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                        <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Cafe Details
                      </Typography>
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="h6" gutterBottom>{myCafe.name}</Typography>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          <strong>Address:</strong> {myCafe.address}
                        </Typography>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                          <strong>Contact:</strong> {myCafe.contactNumber || 'Not provided'}
                        </Typography>
                      </Box>
                      <Stack spacing={2}>
                        <Button 
                          variant="contained" 
                          component={Link} 
                          to={`/edit-cafe/${myCafe._id}`}
                          startIcon={<EditIcon />}
                          size="large"
                          fullWidth
                        >
                          Edit Cafe Details
                        </Button>
                        <Button 
                          variant="outlined" 
                          color="error" 
                          onClick={handleDelete}
                          startIcon={<DeleteIcon />}
                          size="large"
                          fullWidth
                        >
                          Delete Cafe
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                        Rooms & Systems
                      </Typography>
                      {myCafe.rooms?.map((room, index) => (
                        <Paper key={index} sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                          <Typography variant="h6" fontWeight="bold" gutterBottom color="primary">
                            {room.roomType}
                          </Typography>
                          {room.systems?.map((system, sIndex) => (
                            <Typography key={sIndex} variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              • {system.systemType}: <strong>{system.count} systems</strong> @ ₹{system.pricePerHour}/hr
                            </Typography>
                          ))}
                        </Paper>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}
          </>
        ) : (
          <Card sx={{ textAlign: 'center', py: 6 }}>
            <CardContent>
              <BusinessIcon sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
              <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
                No Cafe Registered
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                You haven't registered your cafe yet. Create your cafe profile to start managing bookings and receiving reviews.
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                component={Link} 
                to="/create-cafe"
                sx={{ minWidth: 200 }}
              >
                Create Your Cafe
              </Button>
            </CardContent>
          </Card>
        )}
      </Container>

      {/* Walk-in Booking Modal */}
      <Modal open={isModalOpen} onClose={handleCloseModal}>
        <Box sx={modalStyle} component="form" onSubmit={handleWalkInSubmit}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Add Walk-in Booking
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create an instant booking for walk-in customers
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="Customer Name (Optional)" 
                name="walkInCustomerName" 
                value={walkInData.walkInCustomerName} 
                onChange={handleWalkInChange}
                size="medium"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                select 
                fullWidth 
                label="Room" 
                name="roomType" 
                value={walkInData.roomType} 
                onChange={handleWalkInChange} 
                required
                size="medium"
              >
                {myCafe?.rooms.map(room => (
                  <MenuItem key={room.roomType} value={room.roomType}>
                    {room.roomType}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField 
                select 
                fullWidth 
                label="System" 
                name="systemType" 
                value={walkInData.systemType} 
                onChange={handleWalkInChange} 
                disabled={!walkInData.roomType} 
                required
                size="medium"
              >
                {myCafe?.rooms.find(r => r.roomType === walkInData.roomType)?.systems.map(sys => (
                  <MenuItem key={sys.systemType} value={sys.systemType}>
                    {sys.systemType} - ₹{sys.pricePerHour}/hr
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField 
                fullWidth 
                label="No. of Systems" 
                name="numberOfSystems" 
                type="number" 
                value={walkInData.numberOfSystems}
                onChange={handleWalkInChange} 
                required 
                InputProps={{ inputProps: { min: 1 } }}
                size="medium"
              />
            </Grid>
            <Grid item xs={6}>
              <Typography variant="subtitle2" gutterBottom>Duration</Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                border: '1px solid #ccc', 
                borderRadius: 1, 
                p: 1 
              }}>
                <IconButton onClick={() => handleDurationChange(-0.5)} disabled={walkInData.duration <= 0.5}>
                  <RemoveCircleOutlineIcon />
                </IconButton>
                <Typography variant="h6" sx={{ minWidth: 80, textAlign: 'center' }}>
                  {formatDuration(walkInData.duration)}
                </Typography>
                <IconButton onClick={() => handleDurationChange(0.5)}>
                  <AddCircleOutlineIcon />
                </IconButton>
              </Box>
            </Grid>
          </Grid>

          {/* Total Price Display */}
          {walkInData.roomType && walkInData.systemType && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
              <Typography variant="h6" color="success.main" fontWeight="bold" textAlign="center">
                Total: ₹{(() => {
                  const room = myCafe?.rooms.find(r => r.roomType === walkInData.roomType);
                  const system = room?.systems.find(s => s.systemType === walkInData.systemType);
                  const price = system ? system.pricePerHour * walkInData.numberOfSystems * walkInData.duration : 0;
                  return price.toFixed(0);
                })()}
              </Typography>
            </Box>
          )}
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button onClick={handleCloseModal} size="large">Cancel</Button>
            <Button type="submit" variant="contained" size="large">Add Booking</Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default DashboardPage;