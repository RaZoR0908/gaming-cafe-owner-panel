import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import cafeService from '../services/cafeService';

// --- Material-UI Imports ---
import {
  AppBar, Toolbar, Typography, Button, Container, Box, Card, CardContent,
  Grid, CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Modal, TextField, MenuItem, Alert, IconButton,
  Rating, Divider, Avatar, Tabs, Tab, CardHeader, LinearProgress
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

// Style for the modal popup
const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: 600 },
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 3,
  maxHeight: '90vh',
  overflow: 'auto'
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

// Tab panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [myCafe, setMyCafe] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tabValue, setTabValue] = useState(0); // NEW: Tab state

  // --- State for filtering and sorting ---
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

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

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
        setReviews([]);
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
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <LinearProgress />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress size={60} />
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Enhanced Header */}
      <AppBar position="static" sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <Toolbar sx={{ py: 1 }}>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            {myCafe?.name || 'Owner Panel'}
          </Typography>
          <Typography variant="body2" sx={{ mr: 3, opacity: 0.9 }}>
            Welcome back, {user?.name}!
          </Typography>
          <Button 
            color="inherit" 
            variant="outlined"
            onClick={handleLogout}
            sx={{ borderColor: 'rgba(255,255,255,0.3)', '&:hover': { borderColor: 'white' } }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      {/* Main Content */}
      <Container maxWidth="xl" sx={{ flex: 1, py: 3, overflow: 'hidden' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {myCafe ? (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {stats.todayBookings}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Today's Bookings</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {stats.confirmedBookings}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Active Bookings</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                      ₹{stats.totalRevenue}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Total Revenue</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                  <CardContent sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                        {stats.averageRating}
                      </Typography>
                      <StarIcon />
                    </Box>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>Average Rating ({stats.totalReviews} reviews)</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tabbed Content */}
            <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
                  <Tab 
                    icon={<BusinessIcon />} 
                    label="Cafe Details" 
                    iconPosition="start"
                    sx={{ minHeight: 64 }}
                  />
                  <Tab 
                    icon={<BookingsIcon />} 
                    label="Bookings Management" 
                    iconPosition="start"
                    sx={{ minHeight: 64 }}
                  />
                  <Tab 
                    icon={<ReviewsIcon />} 
                    label="Customer Reviews" 
                    iconPosition="start"
                    sx={{ minHeight: 64 }}
                  />
                </Tabs>
              </Box>

              {/* Cafe Details Tab */}
              <TabPanel value={tabValue} index={0}>
                <Box sx={{ height: 'calc(100vh - 300px)', overflow: 'auto', p: 3 }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card sx={{ height: 'fit-content' }}>
                        <CardHeader 
                          title="Cafe Information" 
                          sx={{ pb: 1 }}
                        />
                        <CardContent>
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="h6" gutterBottom>{myCafe.name}</Typography>
                            <Typography variant="body1" color="text.secondary" gutterBottom>
                              <strong>Address:</strong> {myCafe.address}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" gutterBottom>
                              <strong>Contact:</strong> {myCafe.contactNumber || 'Not provided'}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <Button 
                              variant="contained" 
                              component={Link} 
                              to={`/edit-cafe/${myCafe._id}`}
                              sx={{ minWidth: 120 }}
                            >
                              Edit Details
                            </Button>
                            <Button 
                              variant="outlined" 
                              color="error" 
                              onClick={handleDelete}
                              sx={{ minWidth: 120 }}
                            >
                              Delete Cafe
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Card sx={{ height: 'fit-content' }}>
                        <CardHeader 
                          title="Rooms & Systems Overview" 
                          sx={{ pb: 1 }}
                        />
                        <CardContent>
                          {myCafe.rooms?.map((room, index) => (
                            <Box key={index} sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                {room.roomType}
                              </Typography>
                              {room.systems?.map((system, sIndex) => (
                                <Typography key={sIndex} variant="body2" color="text.secondary">
                                  • {system.systemType}: {system.count} systems @ ₹{system.pricePerHour}/hr
                                </Typography>
                              ))}
                            </Box>
                          ))}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              </TabPanel>

              {/* Bookings Management Tab */}
              <TabPanel value={tabValue} index={1}>
                <Box sx={{ height: 'calc(100vh - 300px)', overflow: 'auto', p: 3 }}>
                  <Box sx={{ mb: 3, display: 'flex', justifyContent: 'between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                      <FilterListIcon color="action" />
                      <TextField
                        type="date"
                        size="small"
                        label="Filter by Date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={{ minWidth: 160 }}
                      />
                      <Button onClick={() => setFilterDate('')} variant="outlined">
                        Clear Filter
                      </Button>
                    </Box>
                    <Button 
                      variant="contained" 
                      startIcon={<AddIcon />} 
                      onClick={handleOpenModal}
                      size="large"
                      sx={{ minWidth: 160 }}
                    >
                      Add Walk-in
                    </Button>
                  </Box>

                  <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 400px)' }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Room</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>System</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Duration</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Price</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
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
                            <TableRow key={booking._id} hover>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell>{new Date(booking.bookingDate).toLocaleDateString()}</TableCell>
                              <TableCell>{booking.startTime}</TableCell>
                              <TableCell>{booking.roomType || 'N/A'}</TableCell>
                              <TableCell>{booking.systemType}</TableCell>
                              <TableCell>{booking.duration} hr</TableCell>
                              <TableCell>₹{booking.totalPrice}</TableCell>
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
                                <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
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
                                      <Button 
                                        size="small" 
                                        variant="contained" 
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
                                </Box>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              </TabPanel>

              {/* Reviews Tab */}
              <TabPanel value={tabValue} index={2}>
                <Box sx={{ height: 'calc(100vh - 300px)', overflow: 'auto', p: 3 }}>
                  {reviewsLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : reviews.length > 0 ? (
                    <Grid container spacing={3}>
                      {reviews.map((review, index) => (
                        <Grid item xs={12} md={6} lg={4} key={review._id || index}>
                          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            <CardContent sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.main' }}>
                                  <PersonIcon />
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {review.customerName || review.customer?.name || 'Anonymous'}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Rating value={review.rating} readOnly size="small" />
                                    <Typography variant="body2" color="text.secondary">
                                      {review.rating}/5
                                    </Typography>
                                  </Box>
                                </Box>
                              </Box>
                              {review.comment && (
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                                  "{review.comment}"
                                </Typography>
                              )}
                              <Typography variant="caption" color="text.secondary">
                                {new Date(review.createdAt || review.reviewDate).toLocaleDateString('en-IN', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 8 }}>
                      <ReviewsIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No Reviews Yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Your customer reviews will appear here once customers start rating your cafe.
                      </Typography>
                    </Box>
                  )}
                </Box>
              </TabPanel>
            </Paper>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
            <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
              <CardContent sx={{ p: 4 }}>
                <BusinessIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                <Typography variant="h5" gutterBottom>No Cafe Registered</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  You haven't registered your cafe yet. Create your cafe profile to start managing bookings and reviews.
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
          </Box>
        )}
      </Container>

      {/* Enhanced Walk-in Booking Modal */}
      <Modal open={isModalOpen} onClose={handleCloseModal}>
        <Box sx={modalStyle} component="form" onSubmit={handleWalkInSubmit}>
          <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 'bold' }}>
            Add Walk-in Booking
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField 
                select 
                fullWidth 
                label="Select Room" 
                name="roomType" 
                value={walkInData.roomType} 
                onChange={handleWalkInChange} 
                required
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
                label="Select System Type" 
                name="systemType" 
                value={walkInData.systemType} 
                onChange={handleWalkInChange} 
                disabled={!walkInData.roomType} 
                required
              >
                {myCafe?.rooms.find(r => r.roomType === walkInData.roomType)?.systems.map(sys => (
                  <MenuItem key={sys.systemType} value={sys.systemType}>
                    {sys.systemType} - ₹{sys.pricePerHour}/hr
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="Number of Systems" 
                name="numberOfSystems" 
                type="number" 
                value={walkInData.numberOfSystems}
                onChange={handleWalkInChange} 
                required 
                InputProps={{ inputProps: { min: 1, max: 10 } }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" component="label" sx={{ color: 'text.primary', mb: 2, display: 'block' }}>
                Duration
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                border: '1px solid #e0e0e0', 
                borderRadius: 2, 
                p: 1,
                bgcolor: 'grey.50'
              }}>
                <IconButton 
                  onClick={() => handleDurationChange(-0.5)}
                  disabled={walkInData.duration <= 0.5}
                  color="primary"
                >
                  <RemoveCircleOutlineIcon />
                </IconButton>
                <Typography variant="h6" sx={{ minWidth: 80, textAlign: 'center', fontWeight: 'bold' }}>
                  {formatDuration(walkInData.duration)}
                </Typography>
                <IconButton 
                  onClick={() => handleDurationChange(0.5)}
                  color="primary"
                >
                  <AddCircleOutlineIcon />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" color="primary">
              Estimated Total: ₹{(() => {
                if (!walkInData.roomType || !walkInData.systemType) return '0';
                const room = myCafe?.rooms.find(r => r.roomType === walkInData.roomType);
                const system = room?.systems.find(s => s.systemType === walkInData.systemType);
                const price = system ? system.pricePerHour * walkInData.numberOfSystems * walkInData.duration : 0;
                return price.toFixed(0);
              })()}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button onClick={handleCloseModal} variant="outlined" size="large">
                Cancel
              </Button>
              <Button type="submit" variant="contained" size="large" sx={{ minWidth: 120 }}>
                Add Booking
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default DashboardPage;