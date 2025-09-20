import React, { useState } from 'react';
import {
  Modal, Box, Typography, Button, TextField, Alert, CircularProgress,
  Paper, Stack, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import cafeService from '../services/cafeService';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '95%', sm: '400px' },
  maxWidth: 500,
  background: '#ffffff',
  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
  p: 3,
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  outline: 'none',
};

const OTPVerificationModal = ({ 
  open, 
  onClose, 
  booking, 
  onOTPVerified 
}) => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOTPChange = (event) => {
    const value = event.target.value;
    // Only allow 6 digits
    if (/^\d{0,6}$/.test(value)) {
      setOtp(value);
      setError('');
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // For OTP verification, we need to get the system assignments
      // This will be handled by the parent component
      await onOTPVerified(otp);
      handleClose();
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOtp('');
    setError('');
    onClose();
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleVerifyOTP();
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={modalStyle}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2
        }}>
          <Typography variant="h5" component="h2" sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            fontWeight: 700,
            color: '#1e293b',
            fontSize: { xs: '1.4rem', md: '1.6rem' }
          }}>
            <VpnKeyIcon color="primary" />
            Verify OTP
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {booking && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.main' }}>
            <Typography variant="h6" gutterBottom sx={{ color: 'info.main' }}>
              Booking Details
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Customer:</strong> {booking.customer?.name || 'Mobile Customer'}
              </Typography>
              <Typography variant="body2">
                <strong>Date:</strong> {new Date(booking.bookingDate).toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                <strong>Time:</strong> {booking.startTime}
              </Typography>
              <Typography variant="body2">
                <strong>Duration:</strong> {booking.duration} hours
              </Typography>
              <Typography variant="body2">
                <strong>Room:</strong> {booking.roomType || booking.systemsBooked?.[0]?.roomType}
              </Typography>
              <Typography variant="body2">
                <strong>System:</strong> {booking.systemType || booking.systemsBooked?.[0]?.systemType} 
                (x{booking.numberOfSystems || booking.systemsBooked?.[0]?.numberOfSystems})
              </Typography>
            </Stack>
          </Paper>
        )}

        <Typography variant="body1" sx={{ mb: 2, color: 'text.secondary' }}>
          Please ask the customer for their 6-digit verification code and enter it below:
        </Typography>

        <TextField
          fullWidth
          label="Enter 6-digit OTP"
          value={otp}
          onChange={handleOTPChange}
          onKeyPress={handleKeyPress}
          placeholder="123456"
          inputProps={{
            maxLength: 6,
            style: { 
              textAlign: 'center', 
              fontSize: '24px', 
              letterSpacing: '4px',
              fontFamily: 'monospace'
            }
          }}
          sx={{ mb: 2 }}
          disabled={loading}
        />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button 
            onClick={handleClose} 
            disabled={loading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleVerifyOTP}
            disabled={loading || otp.length !== 6}
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : <VpnKeyIcon />}
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
};

export default OTPVerificationModal;
