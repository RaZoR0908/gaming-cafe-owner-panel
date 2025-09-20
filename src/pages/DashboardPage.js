import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import cafeService from '../services/cafeService';
import WalkInBookingModal from '../components/WalkInBookingModal';
import SystemManagementModal from '../components/SystemManagementModal';
import ExtendSessionModal from '../components/ExtendSessionModal';
import OTPVerificationModal from '../components/OTPVerificationModal';

// --- Material-UI Imports ---
import {
  AppBar, Toolbar, Typography, Button, Container, Box, Card, CardContent,
  Grid, CircularProgress, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, TextField, Alert, IconButton,
  Rating,  Avatar,  Stack, Tooltip, Modal, Switch, FormControlLabel
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
import TimerIcon from '@mui/icons-material/Timer';


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

// Helper function to convert time string to total minutes for proper sorting
const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [timePart, period] = timeStr.split(' ');
  const [hours, minutes] = timePart.split(':').map(Number);
  
  let hour24 = hours;
  if (period === 'PM' && hours !== 12) hour24 += 12;
  if (period === 'AM' && hours === 12) hour24 = 0;
  
  return hour24 * 60 + minutes;
};

// Helper function to format session start time display
const formatSessionStartTime = (sessionStartTime, status) => {
  if (!sessionStartTime) {
    return {
      date: 'Not Started',
      time: status === 'Booked' ? 'Pending' : 'N/A',
      color: 'text.secondary'
    };
  }
  
  const sessionDate = new Date(sessionStartTime);
  const now = new Date();
  const isToday = sessionDate.toDateString() === now.toDateString();
  
  return {
    date: isToday ? 'Today' : sessionDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    }),
    time: sessionDate.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    }),
    color: 'success.main'
  };
};

// Helper function to check if session start time differs from booking time
const checkTimeDifference = (booking) => {
  if (!booking.sessionStartTime) return null;
  
  const sessionStart = new Date(booking.sessionStartTime);
  const bookingDate = new Date(booking.bookingDate);
  
  // Extract the time from startTime string (e.g., "11:43 AM")
  const startTimeStr = booking.startTime;
  const [timePart, period] = startTimeStr.split(' ');
  const [hours, minutes] = timePart.split(':');
  
  let bookingHour = parseInt(hours);
  if (period === 'PM' && bookingHour !== 12) {
    bookingHour += 12;
  } else if (period === 'AM' && bookingHour === 12) {
    bookingHour = 0;
  }
  
  // Create the expected booking time
  const expectedBookingTime = new Date(bookingDate);
  expectedBookingTime.setHours(bookingHour, parseInt(minutes), 0, 0);
  
  // Compare with a tolerance of 5 minutes (300,000 ms)
  const timeDiff = Math.abs(sessionStart.getTime() - expectedBookingTime.getTime());
  const hasDifference = timeDiff > 300000; // 5 minutes tolerance
  
  // Debug logging
  console.log(`Time comparison for booking:`, {
    sessionStart: sessionStart.toLocaleString(),
    expectedBooking: expectedBookingTime.toLocaleString(),
    timeDiffMs: timeDiff,
    timeDiffMinutes: Math.round(timeDiff / 60000),
    hasDifference,
    tolerance: '5 minutes (300,000 ms)'
  });
  
  if (hasDifference) {
    const diffMinutes = Math.round((sessionStart.getTime() - expectedBookingTime.getTime()) / 60000);
    return {
      hasDifference: true,
      message: diffMinutes > 0 ? `Started ${diffMinutes}m late` : `Started ${Math.abs(diffMinutes)}m early`,
      timeDiff: diffMinutes
    };
  }
  
  return { hasDifference: false, message: null, timeDiff: 0 };
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

  // Simple view state - just switch between main sections
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'bookings', 'reviews', 'cafe'

  // --- State for filtering and sorting ---
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);


  // --- State for modals ---
  const [isWalkInModalOpen, setWalkInModalOpen] = useState(false);
  const [isSystemManagementModalOpen, setSystemManagementModalOpen] = useState(false);
  const [systemManagementMode, setSystemManagementMode] = useState('management'); // 'management' or 'assignment'
  const [selectedBookingForAssignment, setSelectedBookingForAssignment] = useState(null);
  const [isExtendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedBookingForExtend, setSelectedBookingForExtend] = useState(null);
  const [isTipsModalOpen, setTipsModalOpen] = useState(false);
  const [isOTPModalOpen, setOTPModalOpen] = useState(false);
  const [selectedBookingForOTP, setSelectedBookingForOTP] = useState(null);

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

  const handleRefreshStatus = useCallback(async () => {
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
  }, [fetchCafeData]);

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
  }, [user, loading, handleRefreshStatus]);



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
      
      const timeA = timeToMinutes(a.startTime || '00:00 AM');
      const timeB = timeToMinutes(b.startTime || '00:00 AM');
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      
      // If same date and time, sort by creation time (earliest first)
      const createdA = new Date(a.createdAt || 0).getTime();
      const createdB = new Date(b.createdAt || 0).getTime();
      return createdA - createdB;
    });

    return bookings;
  }, [allBookings, filterDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const validBookings = allBookings.filter(b => b && b.bookingDate && b.status); // Filter out invalid bookings
    
    // Remove duplicate bookings by ID, keeping the most recent one (by updatedAt or createdAt)
    const uniqueBookings = validBookings.reduce((acc, current) => {
      const existingIndex = acc.findIndex(b => b._id === current._id);
      if (existingIndex >= 0) {
        // If duplicate found, keep the one with more recent updatedAt or createdAt
        const existing = acc[existingIndex];
        const currentDate = new Date(current.updatedAt || current.createdAt || 0);
        const existingDate = new Date(existing.updatedAt || existing.createdAt || 0);
        
        if (currentDate > existingDate) {
          acc[existingIndex] = current; // Replace with more recent
        }
        // Otherwise keep the existing one
      } else {
        acc.push(current); // Add new booking
      }
      return acc;
    }, []);
    
    // Active bookings: ONLY show bookings that are currently in 'Active' state (sessions in progress)
    const activeBookings = uniqueBookings.filter(b => 
      b.status === 'Active' && !b.permanentlyCancelled
    );
    
    // All non-cancelled bookings (for reference) - using your actual implemented statuses
    const nonCancelledBookings = uniqueBookings.filter(b => 
      !['Cancelled', 'Completed'].includes(b.status) && !b.permanentlyCancelled
    );
    

    
    // Use deduplicated bookings for all calculations
    const todayBookings = uniqueBookings.filter(b => b.bookingDate.startsWith(today));
    
    // Total revenue: only count completed bookings
    const completedBookings = uniqueBookings.filter(b => b.status === 'Completed');
    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    // Daily revenue: only count today's completed bookings
    const todayCompletedBookings = completedBookings.filter(b => b.bookingDate.startsWith(today));
    const dailyRevenue = todayCompletedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    
    const averageRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 0;
    
    return {
      todayBookings: todayBookings.length,
      confirmedBookings: activeBookings.length,
      totalRevenue,
      dailyRevenue,
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
    if (!myCafe) return;
    
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
      
    } catch (err) {
      setError('Failed to update booking status.');
    }
  };

  const handleCancelBooking = async (bookingId, customerName) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel the booking for ${customerName}?\n\nThis will process a refund if the booking was paid for. This action cannot be undone.`
    );
    
    if (confirmed) {
      try {
        setLoading(true);
        const response = await cafeService.cancelBooking(bookingId);
        
        // Update the booking in the local state
        setAllBookings(prevBookings => 
          prevBookings.map(booking => 
            booking._id === bookingId 
              ? { ...booking, status: 'Cancelled' }
              : booking
          )
        );
        
        // Show success message with refund info
        let successMessage = `Booking for ${customerName} has been cancelled successfully.`;
        if (response.data?.refund) {
          const refund = response.data.refund;
          successMessage += `\n\nRefund Details:\n- Method: ${refund.method}\n- Amount: ₹${refund.amount}\n- Status: ${refund.status}\n- Message: ${refund.message}`;
        }
        
        setSuccess(successMessage);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to cancel booking');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleToggleCafeStatus = async () => {
    if (!myCafe) return;
    
    try {
      const result = await cafeService.toggleCafeStatus(myCafe._id);
      setMyCafe(prev => ({ ...prev, isOpen: result.cafe.isOpen }));
      setSuccess(result.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update cafe status');
    }
  };

  const handleExtendBooking = (booking) => {
    setSelectedBookingForExtend(booking);
    setExtendModalOpen(true);
  };

  const handleExtendSubmit = async (bookingId, selectedSystemIds, extensionHours) => {
    try {
      const updatedBooking = await cafeService.extendBooking(bookingId, extensionHours);

      setAllBookings(allBookings.map(b =>
        b._id === bookingId ? updatedBooking : b
      ));
      
      // Refresh cafe data to update system timers in SystemManagementModal
      fetchCafeData();
      
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
    console.log('🎯 START button clicked for booking:', booking);
    
    // Check if this is a mobile booking (has OTP)
    if (booking.otp) {
      setSelectedBookingForOTP(booking);
      setOTPModalOpen(true);
    } else {
      setSelectedBookingForAssignment(booking);
      setSystemManagementMode('assignment');
      setSystemManagementModalOpen(true);
    }
  };

  // Handle OTP verification
  const handleOTPVerified = async (otp) => {
    if (!selectedBookingForOTP) return;

    try {
      // Verify OTP first (without starting session)
      const response = await cafeService.verifyOTP(selectedBookingForOTP._id, otp);
      
      if (response.success) {
        // OTP is valid, close OTP modal and open system selection modal
        setOTPModalOpen(false);
        setSelectedBookingForOTP(null);
        
        // Set the booking for system assignment
        setSelectedBookingForAssignment(selectedBookingForOTP);
        setSystemManagementMode('assignment');
        setSystemManagementModalOpen(true);
        
        setSuccess('OTP verified! Please select systems to assign.');
      }
    } catch (err) {
      throw err; // Let the modal handle the error
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!myCafe) {
    return (
      <Box sx={{ flexGrow: 1, backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
        {/* Header */}
        <AppBar position="static" sx={{ backgroundColor: '#1976d2' }}>
          <Toolbar>
            <DashboardIcon sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
              Welcome to Gaming Cafe Dashboard
            </Typography>
            <Button color="inherit" onClick={handleLogout}>Logout</Button>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            textAlign: 'center',
            bgcolor: 'white',
            p: 4,
            borderRadius: 3,
            boxShadow: 3
          }}>
            <BusinessIcon sx={{ fontSize: 60, color: '#1976d2', mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
              Welcome to Your Dashboard!
            </Typography>
            <Typography variant="h6" sx={{ mb: 1, color: 'text.secondary' }}>
              {user ? `Hello, ${user.name}!` : 'Hello, Cafe Owner!'}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary', maxWidth: 500 }}>
              It looks like you haven't created your gaming cafe yet. Let's get started by setting up your cafe profile.
            </Typography>
            
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              <Button 
                variant="contained" 
                size="large"
                component={Link}
                to="/create-cafe"
                startIcon={<AddIcon />}
                sx={{ 
                  px: 3, 
                  py: 1,
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                Create Your Cafe
              </Button>
              <Button 
                variant="outlined" 
                size="large"
                onClick={() => window.location.reload()}
                startIcon={<RefreshIcon />}
                sx={{ px: 3, py: 1 }}
              >
                Refresh
              </Button>
            </Stack>

            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2, maxWidth: 500 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                What you'll be able to do:
              </Typography>
              <Stack spacing={0.5} sx={{ textAlign: 'left' }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  <PlayArrowIcon sx={{ fontSize: 14, mr: 1, color: 'success.main' }} />
                  Manage gaming systems and room bookings
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  <PlayArrowIcon sx={{ fontSize: 14, mr: 1, color: 'success.main' }} />
                  Handle walk-in customers and reservations
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  <PlayArrowIcon sx={{ fontSize: 14, mr: 1, color: 'success.main' }} />
                  Track revenue and customer reviews
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  <PlayArrowIcon sx={{ fontSize: 14, mr: 1, color: 'success.main' }} />
                  Monitor system status and maintenance
                </Typography>
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      flexGrow: 1, 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      position: 'relative'
    }}>

      {/* Clean Light Header */}
      <AppBar 
        position="static" 
        sx={{ 
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          borderBottom: '1px solid #e2e8f0',
          color: '#1e293b',
          position: 'relative'
        }}
      >
        <Toolbar sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 48,
                height: 48,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)'
              }}
            >
              <DashboardIcon sx={{ fontSize: 24, color: '#ffffff' }} />
            </Box>
            <Box>
              <Typography 
                variant="h5" 
                component="div" 
                sx={{ 
                  fontWeight: 700, 
                  lineHeight: 1.2,
                  color: '#1e293b',
                  fontSize: { xs: '1.3rem', md: '1.5rem' }
                }}
              >
                {myCafe?.name || 'Cafe Dashboard'}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: '#64748b', 
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Welcome back, {user ? user.name : 'Owner'}!
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button 
              color="inherit" 
              onClick={handleRefreshStatus} 
              disabled={refreshing}
              startIcon={<RefreshIcon />}
              sx={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: 1,
                px: 2,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                color: '#64748b',
                '&:hover': {
                  backgroundColor: '#e2e8f0',
                  transform: 'translateY(-1px)',
                },
                '&:disabled': {
                  opacity: 0.5
                }
              }}
            >
              Refresh Status
            </Button>
            <Button 
              color="inherit" 
              onClick={() => setTipsModalOpen(true)}
              sx={{
                backgroundColor: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: 1,
                px: 2,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                color: '#64748b',
                '&:hover': {
                  backgroundColor: '#e2e8f0',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              💡 Tips & Help
            </Button>
            <Button 
              color="inherit" 
              onClick={handleLogout}
              sx={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 1,
                px: 2,
                py: 1,
                textTransform: 'none',
                fontWeight: 600,
                color: '#dc2626',
                '&:hover': {
                  backgroundColor: '#fee2e2',
                  transform: 'translateY(-1px)',
                }
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* Alerts Section */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 1.5, 
              borderRadius: 1,
              py: 1,
              '& .MuiAlert-message': {
                fontSize: '0.8rem'
              }
            }}
          >
            {error}
          </Alert>
        )}
        {success && (
          <Alert 
            severity="success" 
            sx={{ 
              mb: 1.5, 
              borderRadius: 1,
              py: 1,
              '& .MuiAlert-message': {
                fontSize: '0.8rem'
              }
            }}
          >
            {success}
          </Alert>
        )}
        
        {/* Status Refresh Info */}
        {lastStatusRefresh && (
          <Alert 
            severity="info" 
            sx={{ 
              mb: 1.5, 
              borderRadius: 1,
              py: 1,
              '& .MuiAlert-message': {
                fontSize: '0.8rem'
              }
            }}
          >
            Last status refresh: {lastStatusRefresh.toLocaleString()}
          </Alert>
        )}
        
        {/* Professional Navigation Cards */}
        <Paper
          elevation={8}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            mb: 4
          }}
        >
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
              Quick Navigation
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', gap: 2 }}>
              <Button 
                variant={currentView === 'dashboard' ? 'contained' : 'outlined'}
                onClick={() => setCurrentView('dashboard')}
                startIcon={<DashboardIcon />}
                size="large"
                sx={{ 
                  py: 1.5, 
                  px: 3,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 140,
                  background: currentView === 'dashboard' ? 
                    'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' : 'transparent',
                  '&:hover': {
                    background: currentView === 'dashboard' ? 
                      'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)' : 
                      'rgba(25, 118, 210, 0.04)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                Overview
              </Button>
              <Button 
                variant={currentView === 'bookings' ? 'contained' : 'outlined'}
                onClick={() => setCurrentView('bookings')}
                startIcon={<BookingsIcon />}
                size="large"
                sx={{ 
                  py: 1.5, 
                  px: 3,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 140,
                  background: currentView === 'bookings' ? 
                    'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' : 'transparent',
                  '&:hover': {
                    background: currentView === 'bookings' ? 
                      'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)' : 
                      'rgba(25, 118, 210, 0.04)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                Bookings
              </Button>
              <Button 
                variant="outlined"
                onClick={handleOpenSystemManagement}
                startIcon={<ComputerIcon />}
                size="large"
                sx={{ 
                  py: 1.5, 
                  px: 3,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 180,
                  borderColor: '#9c27b0',
                  color: '#9c27b0',
                  '&:hover': {
                    backgroundColor: 'rgba(156, 39, 176, 0.04)',
                    borderColor: '#7b1fa2',
                    color: '#7b1fa2',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                System Management
              </Button>
              <Button 
                variant={currentView === 'reviews' ? 'contained' : 'outlined'}
                onClick={() => setCurrentView('reviews')}
                startIcon={<ReviewsIcon />}
                size="large"
                sx={{ 
                  py: 1.5, 
                  px: 3,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 140,
                  background: currentView === 'reviews' ? 
                    'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' : 'transparent',
                  '&:hover': {
                    background: currentView === 'reviews' ? 
                      'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)' : 
                      'rgba(25, 118, 210, 0.04)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                Reviews
              </Button>
              <Button 
                variant={currentView === 'cafe' ? 'contained' : 'outlined'}
                onClick={() => setCurrentView('cafe')}
                startIcon={<BusinessIcon />}
                size="large"
                sx={{ 
                  py: 1.5, 
                  px: 3,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 140,
                  background: currentView === 'cafe' ? 
                    'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)' : 'transparent',
                  '&:hover': {
                    background: currentView === 'cafe' ? 
                      'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)' : 
                      'rgba(25, 118, 210, 0.04)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                Cafe Settings
              </Button>
            </Stack>
          </Box>
        </Paper>

        {/* Professional Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {/* First Row - 2 cards */}
          <Grid item xs={12} sm={6} md={6}>
            <Paper
              elevation={8}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mb: 1 }}>
                      {stats.todayBookings}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Today's Bookings
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <AccessTimeIcon sx={{ fontSize: 28, color: '#1976d2' }} />
                  </Box>
                </Box>
              </CardContent>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <Paper
              elevation={8}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0', mb: 1 }}>
                      {stats.confirmedBookings}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Active Bookings
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 60,
                      height: 60,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(156, 39, 176, 0.1)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <BookingsIcon sx={{ fontSize: 28, color: '#9c27b0' }} />
                  </Box>
                </Box>
              </CardContent>
            </Paper>
          </Grid>
          
          {/* Second Row - 3 cards */}
          <Grid item xs={12} sm={4} md={4}>
            <Paper
              elevation={8}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#2e7d32', mb: 1 }}>
                      ₹{stats.totalRevenue.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Total Revenue
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(46, 125, 50, 0.1)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <TrendingUpIcon sx={{ fontSize: 24, color: '#2e7d32' }} />
                  </Box>
                </Box>
              </CardContent>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4} md={4}>
            <Paper
              elevation={8}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(135deg, #00796b 0%, #004d40 100%)'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#00796b', mb: 1 }}>
                      ₹{stats.dailyRevenue.toLocaleString()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Today's Revenue
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(0, 121, 107, 0.1)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <TrendingUpIcon sx={{ fontSize: 24, color: '#00796b' }} />
                  </Box>
                </Box>
              </CardContent>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4} md={4}>
            <Paper
              elevation={8}
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(135deg, #f57c00 0%, #e65100 100%)'
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#f57c00', mb: 1 }}>
                      {stats.averageRating}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                      Avg Rating ({stats.totalReviews})
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 50,
                      height: 50,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(245, 124, 0, 0.1)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <ReviewsIcon sx={{ fontSize: 24, color: '#f57c00' }} />
                  </Box>
                </Box>
              </CardContent>
            </Paper>
          </Grid>
        </Grid>

        {/* Dashboard Overview */}
        {currentView === 'dashboard' && (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            gap: 3,
            minHeight: '65vh'
          }}>
            {/* Quick Info Card - Left Side */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 66.666667%' } }}>
              <Paper
                elevation={2}
                sx={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  height: '100%'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        backdropFilter: 'blur(10px)',
                        mr: 2
                      }}
                    >
                      <BusinessIcon sx={{ fontSize: 24, color: '#1976d2' }} />
                    </Box>
                    <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 700 }}>
                      Cafe Information
                    </Typography>
                  </Box>
                  
                  <Typography variant="h4" sx={{ mb: 2, fontSize: '1.5rem', fontWeight: 700, color: 'text.primary' }}>
                    {myCafe?.name || 'Loading...'}
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
                      <strong>📍 Address:</strong> {myCafe?.address || 'Loading...'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.6 }}>
                      <strong>📞 Contact:</strong> {myCafe?.contactNumber || 'Not provided'}
                    </Typography>
                    {myCafe?.description && (
                      <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5, fontStyle: 'italic', lineHeight: 1.6 }}>
                        <strong>📝 Description:</strong> {myCafe.description}
                      </Typography>
                    )}
                  </Box>
                  
                  {/* Cafe Open/Close Toggle */}
                  <Paper
                    elevation={2}
                    sx={{ 
                      mt: 3, 
                      mb: 3, 
                      p: 3, 
                      bgcolor: myCafe?.isOpen ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)', 
                      borderRadius: 2,
                      border: `2px solid ${myCafe?.isOpen ? '#4caf50' : '#f44336'}`,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <FormControlLabel
                      control={
                        <Switch
                          checked={myCafe?.isOpen ?? true}
                          onChange={handleToggleCafeStatus}
                          disabled={!myCafe}
                          color="primary"
                          size="medium"
                        />
                      }
                      label={
                        <Typography 
                          variant="h6" 
                          sx={{ 
                            fontWeight: 700,
                            color: myCafe?.isOpen ? '#2e7d32' : '#d32f2f'
                          }}
                        >
                          Cafe Status: {myCafe?.isOpen ? 'OPEN' : 'CLOSED'}
                        </Typography>
                      }
                    />
                  </Paper>
                  
                  <Box sx={{ mt: 3 }}>
                    <Button 
                      variant="contained" 
                      component={Link} 
                      to={`/edit-cafe/${myCafe?._id}`}
                      startIcon={<EditIcon />}
                      size="large"
                      disabled={!myCafe}
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 4,
                        py: 1.5,
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        boxShadow: '0 4px 14px 0 rgba(25, 118, 210, 0.39)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                          boxShadow: '0 6px 20px 0 rgba(25, 118, 210, 0.5)',
                          transform: 'translateY(-1px)',
                        }
                      }}
                    >
                      Edit Details
                    </Button>
                  </Box>
                </CardContent>
              </Paper>
            </Box>
            
            {/* Quick Actions Card - Right Side */}
            <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 33.333333%' } }}>
              <Paper
                elevation={8}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                  height: '100%'
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 700, mb: 3 }}>
                    Quick Actions
                  </Typography>
                  <Stack spacing={2.5}>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={() => setCurrentView('bookings')}
                      startIcon={<BookingsIcon />}
                      fullWidth
                      size="large"
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        py: 1.5,
                        background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                        boxShadow: '0 4px 14px 0 rgba(25, 118, 210, 0.39)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                          boxShadow: '0 6px 20px 0 rgba(25, 118, 210, 0.5)',
                          transform: 'translateY(-1px)',
                        }
                      }}
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
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        py: 1.5,
                        background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
                        boxShadow: '0 4px 14px 0 rgba(156, 39, 176, 0.39)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #7b1fa2 0%, #6a1b9a 100%)',
                          boxShadow: '0 6px 20px 0 rgba(156, 39, 176, 0.5)',
                          transform: 'translateY(-1px)',
                        }
                      }}
                    >
                      Add Walk-in Booking
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={() => setCurrentView('reviews')}
                      startIcon={<ReviewsIcon />}
                      fullWidth
                      size="large"
                      sx={{
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 600,
                        py: 1.5,
                        borderColor: '#1976d2',
                        color: '#1976d2',
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.04)',
                          borderColor: '#1565c0',
                          color: '#1565c0',
                          transform: 'translateY(-1px)',
                        }
                      }}
                    >
                      View Customer Reviews
                    </Button>
                  </Stack>
                </CardContent>
              </Paper>
            </Box>
          </Box>
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

              {/* Time Column Explanation */}
              <Paper sx={{ p: 1.5, mb: 1, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.main' }}>
                <Typography variant="body2" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon sx={{ fontSize: 16 }} />
                  <strong>Date & Time:</strong> When the booking was made
                </Typography>
                <Typography variant="body2" color="info.main" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <TimerIcon sx={{ fontSize: 16 }} />
                  <strong>Session Start:</strong> When the actual gaming session began (may differ from booking time)
                </Typography>
              </Paper>

              {/* Optimized Responsive Table */}
              <TableContainer 
                component={Paper} 
                sx={{ 
                  maxHeight: 500, 
                  overflow: 'auto',
                  border: '2px solid #e0e0e0',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  '& .MuiTableHead-root': {
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                  },
                  '& .MuiTable-root': {
                    borderCollapse: 'separate',
                    borderSpacing: 0
                  },
                  '& .MuiTableCell-root': {
                    borderRight: '1px solid #e0e0e0',
                    borderBottom: '1px solid #e0e0e0',
                    padding: '8px 6px',
                    fontSize: '0.85rem',
                    lineHeight: 1.3,
                    '&:last-child': {
                      borderRight: 'none'
                    }
                  },
                  '& .MuiTableHead-root .MuiTableCell-root': {
                    borderBottom: '2px solid #1976d2',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    padding: '10px 6px'
                  }
                }}
              >
                <Table stickyHeader size="small" sx={{ 
                  tableLayout: 'fixed',
                  width: '100%'
                }}>
                  <TableHead>
                    <TableRow>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          textAlign: 'center',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11,
                          width: '4%'
                        }}
                      >
                        #
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11,
                          width: '10%'
                        }}
                      >
                        Customer
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11,
                          width: '9%'
                        }}
                        title="When the booking was made"
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, flexWrap: 'wrap' }}>
                          <AccessTimeIcon sx={{ fontSize: 12 }} />
                          <span>Date</span>
                        </Box>
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11,
                          width: '9%'
                        }}
                        title="When the actual gaming session started"
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, flexWrap: 'wrap' }}>
                          <TimerIcon sx={{ fontSize: 12 }} />
                          <span>Session</span>
                        </Box>
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11,
                          width: '11%'
                        }}
                      >
                        Room/System
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11,
                          width: '10%'
                        }}
                      >
                        Assigned
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11,
                          textAlign: 'center',
                          width: '7%'
                        }}
                      >
                        Duration
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11,
                          textAlign: 'center',
                          width: '7%'
                        }}
                      >
                        Extended
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11,
                          textAlign: 'center',
                          width: '8%'
                        }}
                      >
                        Ext. Fee
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11,
                          textAlign: 'right',
                          width: '9%'
                        }}
                      >
                        Price
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11,
                          textAlign: 'center',
                          width: '10%'
                        }}
                      >
                        Status
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          fontWeight: 'bold', 
                          bgcolor: 'primary.main', 
                          color: 'white',
                          position: 'sticky',
                          top: 0,
                          zIndex: 11,
                          textAlign: 'center',
                          width: '7%'
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
                      
                      // Owner can always cancel their own bookings (both walk-in and scheduled)

                      const minutesSinceUpdate = (now - new Date(booking.updatedAt)) / (1000 * 60);
                      
                      // Check if session has been active for more than 15 minutes (to hide cancel button)
                      const isSessionStarted = booking.status === 'Active' && booking.sessionStartTime;
                      const minutesSinceSessionStart = isSessionStarted ? 
                        (now - new Date(booking.sessionStartTime)) / (1000 * 60) : 0;
                      const canCancel = !isSessionStarted || minutesSinceSessionStart < 15;

                      return (
                        <TableRow key={booking._id} hover>
                          <TableCell sx={{ textAlign: 'center', fontWeight: 'bold', color: 'primary.main', verticalAlign: 'top' }}>
                            {index + 1}
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'top' }}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.2, fontSize: '0.85rem', lineHeight: 1.2 }}>
                                {booking.customer ? booking.customer.name : (booking.walkInCustomerName || 'Walk-in Customer')}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.2, fontSize: '0.75rem' }}>
                                {booking.customer ? 'Mobile' : 'Walk-in'}
                              </Typography>
                              {booking.phoneNumber && booking.phoneNumber !== 'Not provided' ? (
                                <Typography variant="caption" color="primary.main" display="block" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                                  📞 {booking.phoneNumber}
                                </Typography>
                              ) : (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                                  📞 No phone
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'top' }}>
                            <Box>
                              <Typography variant="body2" fontWeight="bold" sx={{ mb: 0.2, fontSize: '0.8rem', lineHeight: 1.2 }}>
                                {new Date(booking.bookingDate).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric'
                                })}
                              </Typography>
                              <Typography variant="caption" color="primary.main" fontWeight="medium" sx={{ fontSize: '0.75rem' }}>
                                {booking.startTime}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'top' }}>
                            <Box>
                              {(() => {
                                const sessionInfo = formatSessionStartTime(booking.sessionStartTime, booking.status);
                                const timeDiffInfo = checkTimeDifference(booking);
                                
                                return (
                                  <>
                                    <Typography variant="body2" fontWeight="bold" color={sessionInfo.color} sx={{ mb: 0.2, fontSize: '0.8rem', lineHeight: 1.2 }}>
                                      {sessionInfo.date}
                                    </Typography>
                                    <Typography variant="caption" color={sessionInfo.color} fontWeight="medium" sx={{ display: 'block', mb: 0.2, fontSize: '0.75rem' }}>
                                      {sessionInfo.time}
                                    </Typography>
                                    {timeDiffInfo?.hasDifference && (
                                      <Typography variant="caption" color="warning.main" display="block" sx={{ fontSize: '0.7rem' }}>
                                        {timeDiffInfo.message}
                                      </Typography>
                                    )}
                                  </>
                                );
                              })()}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'top' }}>
                            <Box>
                              {/* Handle both old and new booking formats */}
                              {booking.systemsBooked && booking.systemsBooked.length > 0 ? (
                                // New format with multiple systems
                                (() => {
                                  // Check if all systems are from the same room
                                  const uniqueRooms = [...new Set(booking.systemsBooked.map(s => s.roomType))];
                                  const isSingleRoom = uniqueRooms.length === 1;
                                  
                                  return (
                                    <Box>
                                      {/* Show room name only once if all systems are from same room */}
                                      {isSingleRoom && (
                                        <Typography variant="body2" fontWeight="bold" color="success.main" sx={{ mb: 0.2, fontSize: '0.8rem', lineHeight: 1.2 }}>
                                          {uniqueRooms[0]}
                                        </Typography>
                                      )}
                                      
                                      {/* Show systems */}
                                      {booking.systemsBooked.map((system, index) => (
                                        <Box key={index} sx={{ mb: index < booking.systemsBooked.length - 1 ? 0.2 : 0 }}>
                                          {/* Show room name only if multiple different rooms */}
                                          {!isSingleRoom && (
                                            <Typography variant="body2" fontWeight="bold" color="success.main" sx={{ mb: 0.1, fontSize: '0.8rem', lineHeight: 1.2 }}>
                                              {system.roomType}
                                            </Typography>
                                          )}
                                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                            {system.systemType} × {system.numberOfSystems}
                                          </Typography>
                                        </Box>
                                      ))}
                                    </Box>
                                  );
                                })()
                              ) : (
                                // Old format fallback
                                <Box>
                                  <Typography variant="body2" fontWeight="bold" color="success.main" sx={{ mb: 0.1, fontSize: '0.8rem', lineHeight: 1.2 }}>
                                    {booking.roomType || 'N/A'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                    {booking.systemType} × {booking.numberOfSystems || 1}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ verticalAlign: 'top' }}>
                            {/* Assigned Systems Column */}
                            {booking.assignedSystems && booking.assignedSystems.length > 0 ? (
                              <Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3, mb: 0.2 }}>
                                  {booking.assignedSystems.slice(0, 3).map((system, index) => (
                                    <Chip
                                      key={index}
                                      label={system.systemId}
                                      size="small"
                                      variant="outlined"
                                      color={booking.status === 'Active' ? 'success' : 'default'}
                                      sx={{ 
                                        fontSize: '0.7rem',
                                        fontFamily: 'monospace',
                                        height: '20px',
                                        '& .MuiChip-label': {
                                          padding: '0 6px'
                                        }
                                      }}
                                    />
                                  ))}
                                  {booking.assignedSystems.length > 3 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', alignSelf: 'center' }}>
                                      +{booking.assignedSystems.length - 3}
                                    </Typography>
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                  {booking.assignedSystems.length} system(s)
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                {booking.status === 'Booked' ? 'Pending' : '-'}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', verticalAlign: 'top' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.2, flexDirection: 'column' }}>
                              <AccessTimeIcon sx={{ fontSize: '12px' }} color="primary" />
                              <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'primary.main' }}>
                                {formatDuration(booking.duration)}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          {/* Extended Time Column */}
                          <TableCell sx={{ textAlign: 'center', verticalAlign: 'top' }}>
                            {booking.extendedTime > 0 ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.2, flexDirection: 'column' }}>
                                <TrendingUpIcon sx={{ fontSize: '12px' }} color="warning" />
                                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'warning.main' }}>
                                  +{formatDuration(booking.extendedTime)}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                -
                              </Typography>
                            )}
                          </TableCell>
                          
                          {/* Extension Fee Column */}
                          <TableCell sx={{ textAlign: 'center', verticalAlign: 'top' }}>
                            {booking.extendedTime > 0 ? (
                              <Box>
                                <Typography 
                                  variant="body2" 
                                  fontWeight="bold" 
                                  color="warning.main"
                                  sx={{ 
                                    fontFamily: 'monospace', 
                                    mb: 0.1,
                                    fontSize: '0.7rem',
                                    lineHeight: 1.2
                                  }}
                                >
                                  ₹{booking.extensionPaymentAmount?.toLocaleString() || '0'}
                                </Typography>
                                <Typography 
                                  variant="caption"
                                  sx={{ 
                                    fontSize: '0.65rem',
                                    fontWeight: 'bold',
                                    color: booking.extensionPaymentStatus === 'completed' ? 'success.main' : 
                                           booking.extensionPaymentStatus === 'pending' ? 'warning.main' : 
                                           booking.extensionPaymentStatus === 'failed' ? 'error.main' : 'text.secondary'
                                  }}
                                >
                                  {booking.extensionPaymentStatus === 'completed' ? 'Paid' : 
                                   booking.extensionPaymentStatus === 'pending' ? 'Pending' : 
                                   booking.extensionPaymentStatus === 'failed' ? 'Failed' : 'Not Set'}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                                -
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell sx={{ textAlign: 'right', verticalAlign: 'top' }}>
                            <Typography 
                              variant="h6" 
                              fontWeight="bold" 
                              color="success.main"
                              sx={{ fontFamily: 'monospace', fontSize: '1.1rem', lineHeight: 1.5 }}
                            >
                              ₹{booking.totalPrice?.toLocaleString() || '0'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', verticalAlign: 'top' }}>
                            <Chip 
                              label={booking.permanentlyCancelled ? 'Cancelled' : booking.status}
                              icon={
                                booking.permanentlyCancelled ? <DeleteIcon sx={{ fontSize: '10px' }} /> :
                                booking.status === 'Booked' ? <BookingsIcon sx={{ fontSize: '10px' }} /> :
                                booking.status === 'Confirmed' ? <BookingsIcon sx={{ fontSize: '10px' }} /> : 
                                booking.status === 'Active' ? <PlayArrowIcon sx={{ fontSize: '10px' }} /> :
                                booking.status === 'Completed' ? <StarIcon sx={{ fontSize: '10px' }} /> : 
                                booking.status === 'Cancelled' ? <DeleteIcon sx={{ fontSize: '10px' }} /> : null
                              }
                              color={
                                booking.permanentlyCancelled ? 'error' :
                                booking.status === 'Booked' ? 'info' :
                                booking.status === 'Confirmed' ? 'primary' : 
                                booking.status === 'Active' ? 'warning' :
                                booking.status === 'Completed' ? 'success' : 
                                booking.status === 'Cancelled' ? 'error' : 'default'
                              }
                              size="medium"
                              sx={{ 
                                fontWeight: 'bold',
                                fontSize: '0.75rem',
                                height: '24px',
                                minWidth: '80px',
                                '& .MuiChip-label': {
                                  padding: '0 6px'
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell align="center" sx={{ verticalAlign: 'top' }}>
                            <Stack direction="column" spacing={0.2} alignItems="center" sx={{ minHeight: '30px', justifyContent: 'flex-start', pt: 0.3 }}>
                              {booking.status === 'Booked' && (
                                <>
                                  <Button 
                                    size="small" 
                                    variant="contained" 
                                    color="primary"
                                    onClick={() => handleStartSession(booking)}
                                    sx={{ 
                                      mb: 0.2, 
                                      fontSize: '0.7rem', 
                                      py: 0.2, 
                                      px: 0.5, 
                                      minWidth: '45px',
                                      height: '22px'
                                    }}
                                  >
                                    Start
                                  </Button>
                                  {canCancel && (
                                    <Tooltip title={
                                      (() => {
                                        const today = new Date();
                                        const bookingDate = new Date(booking.bookingDate);
                                        const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
                                        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                        
                                        if (bookingDateOnly.getTime() === todayOnly.getTime()) {
                                          return "Cancel within 15 minutes of booking time";
                                        } else {
                                          return "Cancel until booking day arrives";
                                        }
                                      })()
                                    }>
                                      <span>
                                        <Button 
                                          size="small" 
                                          variant="outlined" 
                                          color="error" 
                                          onClick={() => handleCancelBooking(booking._id, booking.customer?.name || booking.walkInCustomerName || 'Walk-in Customer')}
                                          sx={{ 
                                            fontSize: '0.6rem', 
                                            py: 0.1, 
                                            px: 0.4, 
                                            minWidth: '40px',
                                            height: '20px'
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  )}
                                  {!canCancel && isSessionStarted && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.55rem' }}>
                                      Cancel unavailable
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
                                    sx={{ 
                                      mb: 0.2, 
                                      fontSize: '0.6rem', 
                                      py: 0.1, 
                                      px: 0.4, 
                                      minWidth: '40px',
                                      height: '20px'
                                    }}
                                  >
                                    Extend
                                  </Button>
                                  {canCancel && (
                                    <Tooltip title={
                                      (() => {
                                        const today = new Date();
                                        const bookingDate = new Date(booking.bookingDate);
                                        const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
                                        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                        
                                        if (bookingDateOnly.getTime() === todayOnly.getTime()) {
                                          return "Cancel within 15 minutes of booking time";
                                        } else {
                                          return "Cancel until booking day arrives";
                                        }
                                      })()
                                    }>
                                      <span>
                                        <Button 
                                          size="small" 
                                          variant="outlined" 
                                          color="error" 
                                          onClick={() => handleCancelBooking(booking._id, booking.customer?.name || booking.walkInCustomerName || 'Walk-in Customer')}
                                          sx={{ 
                                            fontSize: '0.6rem', 
                                            py: 0.1, 
                                            px: 0.4, 
                                            minWidth: '40px',
                                            height: '20px'
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  )}
                                  {!canCancel && isSessionStarted && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.55rem' }}>
                                      Cancel unavailable
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
                                    sx={{ 
                                      mb: 0.2, 
                                      fontSize: '0.6rem', 
                                      py: 0.1, 
                                      px: 0.4, 
                                      minWidth: '40px',
                                      height: '20px'
                                    }}
                                  >
                                    Extend
                                  </Button>
                                  {canCancel && (
                                    <Tooltip title={
                                      (() => {
                                        const today = new Date();
                                        const bookingDate = new Date(booking.bookingDate);
                                        const bookingDateOnly = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());
                                        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                        
                                        if (bookingDateOnly.getTime() === todayOnly.getTime()) {
                                          return "Cancel within 15 minutes of booking time";
                                        } else {
                                          return "Cancel until booking day arrives";
                                        }
                                      })()
                                    }>
                                      <span>
                                        <Button 
                                          size="small" 
                                          variant="outlined" 
                                          color="error" 
                                          onClick={() => handleCancelBooking(booking._id, booking.customer?.name || booking.walkInCustomerName || 'Walk-in Customer')}
                                          sx={{ 
                                            fontSize: '0.6rem', 
                                            py: 0.1, 
                                            px: 0.4, 
                                            minWidth: '40px',
                                            height: '20px'
                                          }}
                                        >
                                          Cancel
                                        </Button>
                                      </span>
                                    </Tooltip>
                                  )}
                                  {!canCancel && isSessionStarted && (
                                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.55rem' }}>
                                      Cancel unavailable
                                    </Typography>
                                  )}
                                </>
                              )}
                              
                              {booking.status === 'Cancelled' && (
                                 <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center', fontSize: '0.65rem' }}>
                                   Cancelled
                                 </Typography>
                               )}
                              
                              {booking.permanentlyCancelled && (
                                <Typography variant="caption" color="error" sx={{ fontStyle: 'italic', fontSize: '0.65rem' }}>
                                  No actions
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {displayedBookings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} sx={{ textAlign: 'center', py: 6 }}>
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
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ flex: '1 1 45%', minWidth: '400px' }}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                    <BusinessIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Cafe Details
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>{myCafe?.name || 'Loading...'}</Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      <strong>Address:</strong> {myCafe?.address || 'Loading...'}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      <strong>Contact:</strong> {myCafe?.contactNumber || 'Not provided'}
                    </Typography>
                    {myCafe?.description && (
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        <strong>Description:</strong> {myCafe.description}
                      </Typography>
                    )}
                  </Box>
                  <Stack spacing={2}>
                    <Button 
                      variant="contained" 
                      component={Link} 
                      to={`/edit-cafe/${myCafe?._id}`}
                      startIcon={<EditIcon />}
                      size="large"
                      fullWidth
                      disabled={!myCafe}
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
                      disabled={!myCafe}
                    >
                      Delete Cafe
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: '1 1 45%', minWidth: '400px' }}>
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
            </Box>
          </Box>
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

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        open={isOTPModalOpen}
        onClose={() => {
          setOTPModalOpen(false);
          setSelectedBookingForOTP(null);
        }}
        booking={selectedBookingForOTP}
        onOTPVerified={handleOTPVerified}
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
                Cancellation Policy
              </Typography>
              <Typography variant="body2">
                Once a booking is cancelled, it cannot be reconfirmed. Cancelled bookings remain cancelled.
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
