import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import cafeService from '../services/cafeService';
import WalkInBookingModal from '../components/WalkInBookingModal';
import SystemManagementModal from '../components/SystemManagementModal';
import ExtendSessionModal from '../components/ExtendSessionModal';

// --- Material-UI Imports ---
import {
  AppBar, Toolbar, Typography, Button, Container, Box, Card, CardContent,
  Grid, CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, TextField, Alert, IconButton,
  Rating,  Avatar,  Stack, Tooltip, Modal
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
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
import ComputerIcon from '@mui/icons-material/Computer';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';


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
  const [lastStatusRefresh, setLastStatusRefresh] = useState(null);
  const [reconfirmCountdown, setReconfirmCountdown] = useState({});

  // Simple view state - just switch between main sections
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'bookings', 'reviews', 'cafe'

  // --- State for filtering and sorting ---
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // --- State for the re-confirmation step ---
  const [bookingToReconfirm, setBookingToReconfirm] = useState(null);

  // --- State for modals ---
  const [isWalkInModalOpen, setWalkInModalOpen] = useState(false);
  const [isSystemManagementModalOpen, setSystemManagementModalOpen] = useState(false);
  const [systemManagementMode, setSystemManagementMode] = useState('management'); // 'management' or 'assignment'
  const [selectedBookingForAssignment, setSelectedBookingForAssignment] = useState(null);
  const [isExtendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedBookingForExtend, setSelectedBookingForExtend] = useState(null);
  const [isTipsModalOpen, setTipsModalOpen] = useState(false);

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
        // Filter out any invalid booking objects
        const validBookings = (cafeBookings || []).filter(booking => 
          booking && 
          typeof booking === 'object' && 
          booking.bookingDate && 
          booking.status
        );
        setAllBookings(validBookings);
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

  // Automatically refresh status when dashboard loads
  useEffect(() => {
    if (user && !loading) {
      handleRefreshStatus();
    }
  }, [user, loading]);

  // Auto-cancel cancelled bookings after 10 minutes if not reconfirmed
  useEffect(() => {
    if (!allBookings.length) return;

    const autoCancelInterval = setInterval(() => {
      const now = new Date();
      const updatedBookings = [...allBookings];
      let hasChanges = false;

      updatedBookings.forEach(booking => {
        if (booking.status === 'Cancelled') {
          const minutesSinceCancel = (now - new Date(booking.updatedAt)) / (1000 * 60);
          
          // If more than 10 minutes have passed since cancellation, permanently cancel
          if (minutesSinceCancel >= 10) {
            // Update the booking to show it's permanently cancelled
            // We'll add a flag to indicate this
            if (!booking.permanentlyCancelled) {
              booking.permanentlyCancelled = true;
              hasChanges = true;
            }
          }
        }
      });

      if (hasChanges) {
        setAllBookings(updatedBookings);
      }
    }, 60000); // Check every minute

    return () => clearInterval(autoCancelInterval);
  }, [allBookings]);

  // Update countdown timer every second for cancelled bookings
  useEffect(() => {
    if (!allBookings.length) return;

    const countdownInterval = setInterval(() => {
      const now = new Date();
      const newCountdown = {};

      allBookings.forEach(booking => {
        if (booking.status === 'Cancelled') {
          const minutesSinceCancel = (now - new Date(booking.updatedAt)) / (1000 * 60);
          const remainingMinutes = Math.max(0, 10 - minutesSinceCancel);
          
          if (remainingMinutes > 0) {
            newCountdown[booking._id] = Math.ceil(remainingMinutes);
          }
        }
      });

      setReconfirmCountdown(newCountdown);
    }, 1000); // Update every second

    return () => clearInterval(countdownInterval);
  }, [allBookings]);

  // Fetch reviews when cafe data is loaded
  useEffect(() => {
    if (myCafe) {
      fetchReviews();
    }
  }, [myCafe, fetchReviews]);

  // Memoized logic for filtering and sorting bookings
  const displayedBookings = useMemo(() => {
    let bookings = [...allBookings].filter(b => b && b.bookingDate); // Filter out invalid bookings

    if (filterDate) {
      bookings = bookings.filter(b => b.bookingDate && b.bookingDate.startsWith(filterDate));
    }

    bookings.sort((a, b) => {
      const dateA = new Date(a.bookingDate).getTime();
      const dateB = new Date(b.bookingDate).getTime();
      if (dateA !== dateB) {
        return dateA - dateB;
      }
      return timeToHour(a.startTime || '00:00') - timeToHour(b.startTime || '00:00');
    });

    return bookings;
  }, [allBookings, filterDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const validBookings = allBookings.filter(b => b && b.bookingDate && b.status); // Filter out invalid bookings
    const todayBookings = validBookings.filter(b => b.bookingDate.startsWith(today));
    const activeBookings = validBookings.filter(b => ['Booked', 'Confirmed', 'Active'].includes(b.status));
    const totalRevenue = validBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const averageRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 0;
    
    return {
      todayBookings: todayBookings.length,
      confirmedBookings: activeBookings.length,
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

  const handleRefreshStatus = async () => {
    try {
      setRefreshing(true);
      // Call the auto-complete sessions API
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/bookings/auto-complete-sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('user'))?.token}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setSuccess(`Status refreshed: ${result.message}`);
        setLastStatusRefresh(new Date()); // Update last refresh time
        // Refresh the data to show updated statuses
        await fetchCafeData();
      } else {
        setError('Failed to refresh status');
      }
    } catch (err) {
      setError('Failed to refresh status');
    } finally {
      setRefreshing(false);
    }
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
    try {
      const updatedBooking = await cafeService.updateBookingStatus(bookingId, newStatus);
      
      // Validate the updated booking before adding to state
      if (updatedBooking && updatedBooking.bookingDate && updatedBooking.status) {
        setAllBookings(allBookings.map(b => 
          b._id === bookingId ? updatedBooking : b
        ));
        setSuccess(`Booking ${newStatus.toLowerCase()} successfully.`);
      } else {
        console.warn('Received invalid booking data:', updatedBooking);
        // Force refresh to get clean data
        await fetchCafeData();
      }
      
      setBookingToReconfirm(null);
    } catch (err) {
      setError('Failed to update booking status.');
    }
  };

  const handleCancelBooking = async (bookingId, customerName) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel the booking for ${customerName}?\n\nThis action cannot be undone.`
    );
    
    if (confirmed) {
      await handleStatusUpdate(bookingId, 'Cancelled');
    }
  };

  const handleExtendBooking = (booking) => {
    setSelectedBookingForExtend(booking);
    setExtendModalOpen(true);
  };

  const handleExtendSubmit = async (bookingId, selectedSystemIds, extensionHours) => {
    try {
      // For now, we'll extend the entire booking duration
      // In a more advanced implementation, you could extend individual systems
      const updatedBooking = await cafeService.extendBooking(bookingId, extensionHours);
      setAllBookings(allBookings.map(b =>
        b._id === bookingId ? updatedBooking : b
      ));
      setSuccess(`Extended ${selectedSystemIds.length} system(s) by ${extensionHours} hours.`);
      setExtendModalOpen(false);
      setSelectedBookingForExtend(null);
    } catch (err) {
      throw err; // Let the modal handle the error
    }
  };

  // Walk-in booking handlers
  const handleOpenWalkInModal = () => setWalkInModalOpen(true);
  const handleCloseWalkInModal = () => setWalkInModalOpen(false);

  const handleWalkInSubmit = async (bookingData) => {
    setError('');
    setSuccess('');
    try {
      const createdBooking = await cafeService.createWalkInBooking(bookingData);
      setSuccess('Walk-in booking created successfully!');
      handleCloseWalkInModal();
      
      // Open system assignment modal
      setSelectedBookingForAssignment(createdBooking);
      setSystemManagementMode('assignment');
      setSystemManagementModalOpen(true);
      
      fetchCafeData();
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to create walk-in booking.';
      setError(message);
      handleCloseWalkInModal();
    }
  };

  // System management handlers
  const handleOpenSystemManagement = () => {
    setSystemManagementMode('management');
    setSelectedBookingForAssignment(null);
    setSystemManagementModalOpen(true);
  };

  const handleCloseSystemManagement = () => {
    setSystemManagementModalOpen(false);
    setSelectedBookingForAssignment(null);
  };

  const handleSystemsAssigned = () => {
    fetchCafeData();
    setSuccess('Session started successfully!');
  };

  // Handle start session for booked bookings
  const handleStartSession = (booking) => {
    setSelectedBookingForAssignment(booking);
    setSystemManagementMode('assignment');
    setSystemManagementModalOpen(true);
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
          <Button color="inherit" onClick={handleRefreshStatus} disabled={refreshing}>
            <RefreshIcon /> Refresh Status
          </Button>
          <Button color="inherit" onClick={() => setTipsModalOpen(true)}>
            💡 Tips & Help
          </Button>
          <Button color="inherit" onClick={handleLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 3, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome, {user ? user.name : 'Owner'}!
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        {/* Status Refresh Info */}
        {lastStatusRefresh && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Last status refresh: {lastStatusRefresh.toLocaleString()}
          </Alert>
        )}
        
        {/* Simple Navigation Buttons */}
        <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
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
            variant="outlined"
            onClick={handleOpenSystemManagement}
            startIcon={<ComputerIcon />}
            size="large"
            color="secondary"
          >
            System Management
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
                      onClick={handleOpenWalkInModal}
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
                  onClick={handleOpenWalkInModal}
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
              <TableContainer 
                component={Paper} 
                sx={{ 
                  maxHeight: 500, 
                  overflow: 'auto',
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  '& .MuiTableHead-root': {
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  }
                }}
              >
                <Table stickyHeader size="small" sx={{ tableLayout: 'auto' }}>
                  <TableHead>
                    <TableRow>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          width: '5%',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11
                        }}
                      >
                        #
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          width: '15%',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11
                        }}
                      >
                        Customer
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          width: '12%',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11
                        }}
                      >
                        Date & Time
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          width: '15%',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11
                        }}
                      >
                        Room/System
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          width: '15%',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11
                        }}
                      >
                        Systems
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          width: '8%',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11
                        }}
                      >
                        Duration
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          width: '10%',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11
                        }}
                      >
                        Price
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          width: '10%',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11
                        }}
                      >
                        Status
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          textAlign: 'center',
                          width: '10%',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11
                        }}
                      >
                        Actions
                      </TableCell>
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
                      // Owner can always cancel their own bookings (both walk-in and scheduled)
                      const isCancellable = true; // Owner has full control over cancellations

                      const minutesSinceUpdate = (now - new Date(booking.updatedAt)) / (1000 * 60);
                      const isReconfirmable = minutesSinceUpdate < 10; // Back to 10 minutes as originally set
                      
                      // Check if session has been active for more than 15 minutes (to hide cancel button)
                      const isSessionStarted = booking.status === 'Active' && booking.sessionStartTime;
                      const minutesSinceSessionStart = isSessionStarted ? 
                        (now - new Date(booking.sessionStartTime)) / (1000 * 60) : 0;
                      const canCancel = !isSessionStarted || minutesSinceSessionStart < 15;

                      return (
                        <TableRow key={booking._id} hover>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', color: 'primary.main' }}>
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {booking.customer ? booking.customer.name : (booking.walkInCustomerName || 'Walk-in Customer')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {booking.customer ? 'Registered' : 'Walk-in'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="bold">
                                {new Date(booking.bookingDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric'
                                })}
                              </Typography>
                              <Typography variant="caption" color="primary.main" fontWeight="medium">
                                {booking.startTime}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box>
                              {/* Handle both old and new booking formats */}
                              {booking.systemsBooked && booking.systemsBooked.length > 0 ? (
                                // New format with multiple systems
                                booking.systemsBooked.map((system, index) => (
                                  <Box key={index} sx={{ mb: index < booking.systemsBooked.length - 1 ? 0.5 : 0 }}>
                                    <Typography variant="body2" fontWeight="bold" color="success.main">
                                      {system.roomType}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {system.systemType} × {system.numberOfSystems}
                                    </Typography>
                                  </Box>
                                ))
                              ) : (
                                // Old format fallback
                                <Box>
                                  <Typography variant="body2" fontWeight="bold" color="success.main">
                                    {booking.roomType || 'N/A'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {booking.systemType} × {booking.numberOfSystems || 1}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {/* Assigned Systems Column */}
                            {booking.assignedSystems && booking.assignedSystems.length > 0 ? (
                              <Box>
                                {booking.assignedSystems.map((system, index) => (
                                  <Chip
                                    key={index}
                                    label={system.systemId}
                                    size="small"
                                    variant="outlined"
                                    color={booking.status === 'Active' ? 'success' : 'default'}
                                    sx={{ 
                                      mr: 0.5, 
                                      mb: 0.5,
                                      fontSize: '0.75rem',
                                      fontFamily: 'monospace'
                                    }}
                                  />
                                ))}
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {booking.assignedSystems.length} system(s)
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                {booking.status === 'Booked' ? 'Pending Assignment' : '-'}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <AccessTimeIcon fontSize="small" color="primary" />
                              <Chip
                                label={formatDuration(booking.duration)}
                                size="small"
                                variant="outlined"
                                color="primary"
                                sx={{ fontWeight: 'bold' }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography 
                                variant="h6" 
                                fontWeight="bold" 
                                color="success.main"
                                sx={{ fontFamily: 'monospace' }}
                              >
                                ₹{booking.totalPrice?.toLocaleString() || '0'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={booking.permanentlyCancelled ? 'Permanently Cancelled' : booking.status}
                              icon={
                                booking.permanentlyCancelled ? <DeleteIcon fontSize="small" /> :
                                booking.status === 'Booked' ? <BookingsIcon fontSize="small" /> :
                                booking.status === 'Confirmed' ? <BookingsIcon fontSize="small" /> : 
                                booking.status === 'Active' ? <PlayArrowIcon fontSize="small" /> :
                                booking.status === 'Completed' ? <StarIcon fontSize="small" /> : 
                                booking.status === 'Cancelled' ? <DeleteIcon fontSize="small" /> : null
                              }
                              color={
                                booking.permanentlyCancelled ? 'error' :
                                booking.status === 'Booked' ? 'info' :
                                booking.status === 'Confirmed' ? 'primary' : 
                                booking.status === 'Active' ? 'warning' :
                                booking.status === 'Completed' ? 'success' : 
                                booking.status === 'Cancelled' ? 'error' : 'default'
                              }
                              size="small"
                              sx={{ 
                                fontWeight: 'bold',
                                '& .MuiChip-icon': {
                                  fontSize: '16px'
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="column" spacing={0.5} alignItems="center">
                              {booking.status === 'Booked' && (
                                <>
                                  <Button 
                                    size="small" 
                                    variant="contained" 
                                    color="primary"
                                    onClick={() => handleStartSession(booking)}
                                    sx={{ mb: 0.5 }}
                                  >
                                    Start
                                  </Button>
                                  {canCancel && (
                                    <Tooltip title="Cancel is only available within 15 minutes of session start">
                                      <span>
                                        <Button 
                                          size="small" 
                                          variant="outlined" 
                                          color="error" 
                                          onClick={() => handleCancelBooking(booking._id, booking.customer?.name || booking.walkInCustomerName || 'Walk-in Customer')}
                                        >
                                          Cancel
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  )}
                                  {!canCancel && isSessionStarted && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      Cancel unavailable (15+ min)
                                    </Typography>
                                  )}
                                </>
                              )}
                              
                              {booking.status === 'Confirmed' && (
                                <>
                                  <Button 
                                    size="small" 
                                    variant="outlined" 
                                    color="info" 
                                    onClick={() => handleExtendBooking(booking)}
                                    sx={{ mb: 0.5 }}
                                  >
                                    Extend
                                  </Button>
                                  {canCancel && (
                                    <Tooltip title="Cancel is only available within 15 minutes of session start">
                                      <span>
                                        <Button 
                                          size="small" 
                                          variant="outlined" 
                                          color="error" 
                                          onClick={() => handleCancelBooking(booking._id, booking.customer?.name || booking.walkInCustomerName || 'Walk-in Customer')}
                                        >
                                          Cancel
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  )}
                                  {!canCancel && isSessionStarted && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      Cancel unavailable (15+ min)
                                    </Typography>
                                  )}
                                </>
                              )}

                              {booking.status === 'Active' && (
                                <>
                                  <Button 
                                    size="small" 
                                    variant="outlined" 
                                    color="info" 
                                    onClick={() => handleExtendBooking(booking)}
                                    sx={{ mb: 0.5 }}
                                  >
                                    Extend
                                  </Button>
                                  {canCancel && (
                                    <Tooltip title="Cancel is only available within 15 minutes of session start">
                                      <span>
                                        <Button 
                                          size="small" 
                                          variant="outlined" 
                                          color="error" 
                                          onClick={() => handleCancelBooking(booking._id, booking.customer?.name || booking.walkInCustomerName || 'Walk-in Customer')}
                                        >
                                          Cancel
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  )}
                                  {!canCancel && isSessionStarted && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                      Cancel unavailable (15+ min)
                                    </Typography>
                                  )}
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
                                     <Box sx={{ textAlign: 'center' }}>
                                       <Tooltip title="You have 10 minutes to reconfirm this cancelled booking. After that, it will be permanently cancelled.">
                                         <span>
                                           <Button 
                                             size="small" 
                                             variant="outlined" 
                                             onClick={() => setBookingToReconfirm(booking._id)}
                                             fullWidth
                                           >
                                             Re-confirm
                                           </Button>
                                         </span>
                                       </Tooltip>
                                       <Typography 
                                         variant="caption" 
                                         color="warning.main" 
                                         sx={{ 
                                           display: 'block', 
                                           mt: 0.5,
                                           fontWeight: 'bold'
                                         }}
                                       >
                                         {reconfirmCountdown[booking._id] || 0}m left
                                       </Typography>
                                     </Box>
                                   )}
                                 </>
                               )}
                               
                               {booking.status === 'Cancelled' && !isReconfirmable && (
                                 <Typography variant="caption" color="error" sx={{ fontStyle: 'italic' }}>
                                   Re-confirm expired
                                 </Typography>
                               )}
                              
                              {booking.permanentlyCancelled && (
                                <Typography variant="caption" color="error" sx={{ fontStyle: 'italic' }}>
                                  No actions available
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {displayedBookings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ textAlign: 'center', py: 6 }}>
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
                  
                  {myCafe.rooms?.map((room, index) => {
                    // Group systems by type and count them
                    const systemCounts = {};
                    room.systems?.forEach(system => {
                      if (!systemCounts[system.type]) {
                        systemCounts[system.type] = {
                          count: 0,
                          pricePerHour: system.pricePerHour
                        };
                      }
                      systemCounts[system.type].count += 1;
                    });

                    return (
                      <Box key={index} sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="h6" fontWeight="bold" color="primary" sx={{ mb: 1 }}>
                          {room.name}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                          {Object.entries(systemCounts).map(([systemType, data]) => (
                            <Box key={systemType} sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 0.5,
                              bgcolor: 'white',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 1,
                              border: '1px solid',
                              borderColor: 'grey.300'
                            }}>
                              <Typography variant="body2" fontWeight="bold" color="text.primary">
                                {systemType}
                              </Typography>
                              <Typography variant="body2" color="primary.main" fontWeight="bold">
                                -{data.count}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                @₹{data.pricePerHour}/hr
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Container>

      {/* Walk-in Booking Modal */}
      <WalkInBookingModal
        open={isWalkInModalOpen}
        onClose={handleCloseWalkInModal}
        myCafe={myCafe}
        onSubmit={handleWalkInSubmit}
      />

      {/* System Management Modal */}
      <SystemManagementModal
        open={isSystemManagementModalOpen}
        onClose={handleCloseSystemManagement}
        myCafe={myCafe}
        mode={systemManagementMode}
        booking={selectedBookingForAssignment}
        onSystemsAssigned={handleSystemsAssigned}
      />

      {/* Extend Session Modal */}
      <ExtendSessionModal
        open={isExtendModalOpen}
        onClose={() => {
          setExtendModalOpen(false);
          setSelectedBookingForExtend(null);
        }}
        booking={selectedBookingForExtend}
        onExtend={handleExtendSubmit}
      />

      {/* Tips & Help Modal */}
      <Modal open={isTipsModalOpen} onClose={() => setTipsModalOpen(false)}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '95%', sm: '80%', md: '60%' },
          maxWidth: 600,
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          maxHeight: '90vh',
          overflow: 'auto'
        }}>
          <Typography variant="h4" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
            💡 Tips & Help
          </Typography>
          
          <Stack spacing={3}>
            <Alert severity="info">
              <Typography variant="h6" gutterBottom>
                Status Refresh
              </Typography>
              <Typography variant="body2">
                If you see bookings stuck in "Active" status, use the "Refresh Status" button above. 
                This happens when the server was offline during a session. The system now automatically checks for expired sessions every minute.
              </Typography>
            </Alert>
            
            <Alert severity="warning">
              <Typography variant="h6" gutterBottom>
                Cancel Policy
              </Typography>
              <Typography variant="body2">
                Bookings can only be cancelled within 15 minutes of session start. 
                After 15 minutes, the cancel option becomes unavailable to prevent disruption of ongoing sessions.
              </Typography>
            </Alert>
            
            <Alert severity="success">
              <Typography variant="h6" gutterBottom>
                Reconfirm Policy
              </Typography>
              <Typography variant="body2">
                Cancelled bookings can be reconfirmed within 10 minutes. After that, they become permanently cancelled.
              </Typography>
            </Alert>
            
            <Alert severity="info">
              <Typography variant="h6" gutterBottom>
                Auto-Completion
              </Typography>
              <Typography variant="body2">
                The system automatically completes expired sessions and updates booking statuses every minute.
              </Typography>
            </Alert>
          </Stack>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
            <Button variant="contained" onClick={() => setTipsModalOpen(false)}>
              Got it!
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};
export default DashboardPage;