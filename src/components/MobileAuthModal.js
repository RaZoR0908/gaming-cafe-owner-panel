import React, { useState } from 'react';
import {
  Modal, Box, Typography, Button, TextField, Paper, Alert,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: '90%', md: 500 },
  maxHeight: '90vh',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  overflow: 'auto',
};

const MobileAuthModal = ({ open, onClose, booking, myCafe, onAuthenticated }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setOtp('');
      setError('');
      setLoading(false);
    }
  }, [open]);

  const handleOTPSubmit = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/bookings/start-mobile-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          cafeId: myCafe._id,
          bookingId: booking._id, // Use booking ID instead of booking code
          otp
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to authenticate');
      }

      // Authentication successful
      setError('');
      onAuthenticated(data.data.booking);
      onClose();
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setOtp('');
    setError('');
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={modalStyle}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneAndroidIcon color="primary" />
            <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Mobile Booking Authentication
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Booking Info */}
        {booking && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" gutterBottom>
              Booking Details:
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2">
                <strong>Customer:</strong> {booking.customer?.name || 'Mobile Customer'}
              </Typography>
              <Typography variant="body2">
                <strong>Phone:</strong> {booking.phoneNumber}
              </Typography>
              <Typography variant="body2">
                <strong>Duration:</strong> {booking.duration} hour(s)
              </Typography>
              <Typography variant="body2">
                <strong>Total:</strong> ₹{booking.totalPrice}
              </Typography>
            </Box>
          </Paper>
        )}

        {/* Authentication Step */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <CheckCircleIcon sx={{ mr: 1, fontSize: 20, color: 'primary.main' }} />
          <Typography variant="body2" fontWeight="medium" color="primary.main">
            Enter the 6-digit OTP from the customer's mobile app
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* OTP Input */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="body1" gutterBottom>
            The customer should show you the OTP displayed in their mobile app.
          </Typography>
          <TextField
            fullWidth
            label="OTP"
            value={otp}
            onChange={(e) => {
              // Only allow digits
              const value = e.target.value.replace(/\D/g, '');
              if (value.length <= 6) {
                setOtp(value);
              }
            }}
            onKeyPress={(e) => {
              // Prevent non-digit characters from being typed
              if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
              }
            }}
            placeholder="123456"
            inputProps={{
              maxLength: 6,
              style: { fontFamily: 'monospace', fontSize: '1.2rem' }
            }}
            sx={{ mt: 2 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            6-digit verification code (digits only)
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={handleReset}
            sx={{ mr: 1 }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            onClick={handleOTPSubmit}
            disabled={otp.length !== 6 || loading}
          >
            {loading ? 'Verifying...' : 'Authenticate & Continue'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default MobileAuthModal;
