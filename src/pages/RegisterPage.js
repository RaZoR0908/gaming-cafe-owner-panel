import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../services/authService';

// --- Material-UI Imports ---
import {
  Container, Box, Typography, TextField, Button, Card, CardContent,
  CircularProgress, Alert, Paper, Fade, IconButton, InputAdornment,
  Grid, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import {
  Visibility, VisibilityOff, PersonAdd, Login as LoginIcon,
  Email, Lock, Person, ArrowForward, Business, Dashboard, Add, Edit, Analytics,
  People, Schedule, AttachMoney, Star, Settings
} from '@mui/icons-material';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!formData.password) {
      setError('Password is required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      console.log('Attempting registration with data:', {
        fullName: formData.fullName,
        email: formData.email,
        role: 'cafeOwner'
      });

      const response = await authService.register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: 'cafeOwner'
      });

      console.log('Registration response:', response);

      if (response.data && response.data.token) {
        localStorage.setItem('user', JSON.stringify(response.data));
        navigate('/dashboard');
      } else {
        setError('Registration successful but no token received. Please try logging in.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      console.error('Error response:', err.response);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err.response) {
        // Server responded with error status
        if (err.response.status === 400) {
          errorMessage = err.response.data?.message || 'Invalid registration data. Please check your information.';
        } else if (err.response.status === 409) {
          errorMessage = 'An account with this email already exists. Please try logging in instead.';
        } else if (err.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = err.response.data?.message || `Registration failed (${err.response.status}). Please try again.`;
        }
      } else if (err.request) {
        // Request was made but no response received
        errorMessage = 'Unable to connect to server. Please check your internet connection and try again.';
      } else {
        // Something else happened
        errorMessage = err.message || 'An unexpected error occurred. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const features = [
    { icon: <Dashboard />, text: 'Dashboard & Analytics' },
    { icon: <Add />, text: 'Manage Cafe Profile' },
    { icon: <People />, text: 'Customer Bookings' },
    { icon: <Settings />, text: 'System Settings' }
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        flexDirection: 'column',
        py: 0
      }}
    >
      {/* Top Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white',
          py: 3,
          textAlign: 'center',
          mb: 0,
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden',
          flexShrink: 0,
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 60%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)
            `,
            zIndex: 1
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.02) 50%, transparent 70%),
              linear-gradient(-45deg, transparent 30%, rgba(255, 255, 255, 0.02) 50%, transparent 70%)
            `,
            zIndex: 2
          }
        }}
      >
        {/* Decorative Elements */}
        <Box
          sx={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(147, 51, 234, 0.2))',
            zIndex: 3,
            animation: 'float 6s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
              '50%': { transform: 'translateY(-10px) rotate(180deg)' }
            }
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2))',
            zIndex: 3,
            animation: 'float 8s ease-in-out infinite reverse',
            '@keyframes float': {
              '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
              '50%': { transform: 'translateY(-15px) rotate(-180deg)' }
            }
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '15px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80px',
            height: '4px',
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
            borderRadius: '2px',
            zIndex: 3
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 4 }}>
        <Typography 
          variant="h4" 
          component="h1" 
          sx={{ 
            fontWeight: 800,
            fontSize: { xs: '1.4rem', md: '1.8rem' },
            letterSpacing: '0.5px',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 15px rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            mb: 1,
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '-4px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '50px',
              height: '3px',
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              borderRadius: '2px',
              opacity: 0.8
            }
          }}
        >
          Gaming Cafe Management
        </Typography>
        <Typography 
          variant="subtitle1" 
          sx={{ 
            mt: 1,
            fontSize: '0.9rem',
            fontWeight: 500,
            color: '#e2e8f0',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
            letterSpacing: '0.3px'
          }}
        >
          Professional Management System
        </Typography>
        </Box>
      </Box>

      <Container maxWidth="xl" sx={{ flex: 1, display: 'flex', alignItems: 'center', py: 1 }}>
        <Box
            sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            width: '100%',
            minHeight: '60vh',
            borderRadius: '16px',
              overflow: 'hidden',
            boxShadow: '0 12px 25px rgba(0, 0, 0, 0.2), 0 6px 12px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}
        >
          {/* Left Side - Information */}
            <Box
              sx={{
              flex: 1,
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
                color: 'white',
              p: { xs: 2, md: 3 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              minHeight: { xs: '250px', md: 'auto' },
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.2) 0%, rgba(147, 51, 234, 0.2) 100%)',
                zIndex: 1
              }
            }}
          >
            <Fade in={true} timeout={800}>
              <Box sx={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
                <Business sx={{ 
                  fontSize: 60, 
                  mb: 2, 
                  color: '#ffffff',
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))',
                  textShadow: '0 0 15px rgba(255, 255, 255, 0.3)'
                }} />
                <Typography 
                  variant="h4" 
                  sx={{ 
                    fontWeight: 800,
                    mb: 2,
                    fontSize: { xs: '1.5rem', md: '1.8rem' },
                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(255, 255, 255, 0.4)',
                    letterSpacing: '0.5px',
                    color: '#ffffff'
                  }}
                >
                  Join Our Platform
                </Typography>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    mb: 2, 
                    fontWeight: 500,
                    fontSize: { xs: '1rem', md: '1.1rem' },
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7), 0 0 8px rgba(255, 255, 255, 0.2)',
                    lineHeight: 1.5,
                    color: '#e2e8f0',
                    letterSpacing: '0.3px',
                    textTransform: 'capitalize'
                  }}
                >
                  Create your cafe owner account and start managing your business
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                  {features.map((feature, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        p: 1.5,
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        borderRadius: 2,
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.25)',
                          transform: 'translateX(5px)',
                          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.4)'
                        }
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 36,
                          height: 36,
                          backgroundColor: 'rgba(255, 255, 255, 0.25)',
                          borderRadius: '50%',
                          mr: 2,
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
                          border: '1px solid rgba(255, 255, 255, 0.3)'
                        }}
                      >
                        {React.cloneElement(feature.icon, { 
                          sx: { 
                            color: '#ffffff', 
                            fontSize: 18,
                            filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))'
                          } 
                        })}
                      </Box>
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          color: '#ffffff', 
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.6), 0 0 6px rgba(255, 255, 255, 0.2)',
                          letterSpacing: '0.3px'
                        }}
                      >
                        {feature.text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Fade>
          </Box>

          {/* Right Side - Registration Form */}
      <Box
        sx={{
              flex: 1,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              p: { xs: 2, md: 3 },
          display: 'flex',
          flexDirection: 'column',
              justifyContent: 'center',
              minHeight: { xs: '350px', md: 'auto' },
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(45deg, rgba(59, 130, 246, 0.02) 0%, rgba(147, 51, 234, 0.02) 100%)',
                zIndex: 1
              }
            }}
          >
              <Fade in={true} timeout={1000}>
                <Box sx={{ position: 'relative', zIndex: 2 }}>
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                sx={{
                  display: 'inline-flex',
          alignItems: 'center',
                  justifyContent: 'center',
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        border: '2px solid rgba(59, 130, 246, 0.2)',
                        mb: 2,
                        boxShadow: '0 6px 20px rgba(59, 130, 246, 0.3)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'scale(1.05)',
                          boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)'
                        }
                      }}
                    >
                      <PersonAdd sx={{ fontSize: 30, color: 'white' }} />
              </Box>
              <Typography 
                variant="h4" 
                      component="h2" 
                sx={{ 
                  fontWeight: 700, 
                        mb: 1, 
                        color: '#1e293b',
                        fontSize: { xs: '1.5rem', md: '1.8rem' },
                        letterSpacing: '0.3px'
                }}
              >
                      Create Account
              </Typography>
              <Typography 
                variant="body1" 
                sx={{ 
                        color: '#64748b',
                        fontSize: { xs: '1rem', md: '1.1rem' },
                        fontWeight: 600,
                        lineHeight: 1.6,
                        letterSpacing: '0.3px',
                        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
                        textTransform: 'capitalize'
                      }}
                    >
                      Join our platform and start managing your cafe
            </Typography>
            </Box>

            <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                          mb: 4,
                          borderRadius: '12px',
                          fontSize: '1rem',
                          fontWeight: 500,
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
                          '& .MuiAlert-message': {
                            fontSize: '1rem',
                            fontWeight: 500
                          }
                    }}
                  >
                    {error}
                  </Alert>
                )}

                    <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                    id="fullName"
                label="Full Name"
                    name="fullName"
                    type="text"
                autoComplete="name"
                autoFocus
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                              <Person sx={{ color: '#6b7280', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            fontSize: '0.9rem',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            border: '1px solid #e5e7eb',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#d1d5db',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#9ca3af',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: '#6b7280',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#374151',
                            fontWeight: 600,
                          },
                          '& .MuiInputBase-input': {
                            padding: '12px 10px',
                            fontSize: '0.9rem',
                          },
                    }}
                  />
                </Box>

                    <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                id="email"
                label="Email Address"
                name="email"
                    type="email"
                autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                              <Email sx={{ color: '#6b7280', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            fontSize: '0.9rem',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            border: '1px solid #e5e7eb',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#d1d5db',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#9ca3af',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: '#6b7280',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#374151',
                            fontWeight: 600,
                          },
                          '& .MuiInputBase-input': {
                            padding: '12px 10px',
                            fontSize: '0.9rem',
                          },
                    }}
                  />
                </Box>

                    <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                name="password"
                label="Password"
                    type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                              <Lock sx={{ color: '#6b7280', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleTogglePasswordVisibility}
                            edge="end"
                            size="small"
                                sx={{ 
                                  color: '#6b7280',
                                  '&:hover': {
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    color: '#3b82f6'
                                  }
                                }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            fontSize: '0.9rem',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            border: '1px solid #e5e7eb',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#d1d5db',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#9ca3af',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: '#6b7280',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#374151',
                            fontWeight: 600,
                          },
                          '& .MuiInputBase-input': {
                            padding: '12px 10px',
                            fontSize: '0.9rem',
                          },
                    }}
                  />
                </Box>

                    <Box sx={{ mb: 2 }}>
                  <TextField
                    fullWidth
                    name="confirmPassword"
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                              <Lock sx={{ color: '#6b7280', fontSize: 18 }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle confirm password visibility"
                            onClick={handleToggleConfirmPasswordVisibility}
                            edge="end"
                            size="small"
                                sx={{ 
                                  color: '#6b7280',
                                  '&:hover': {
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    color: '#3b82f6'
                                  }
                                }}
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                            borderRadius: '8px',
                            backgroundColor: '#ffffff',
                            fontSize: '0.9rem',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                            border: '1px solid #e5e7eb',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#d1d5db',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#9ca3af',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: '#6b7280',
                            fontSize: '0.9rem',
                            fontWeight: 500,
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: '#374151',
                            fontWeight: 600,
                          },
                          '& .MuiInputBase-input': {
                            padding: '12px 10px',
                            fontSize: '0.9rem',
                          },
                    }}
                  />
                </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                      endIcon={loading ? <CircularProgress size={18} color="inherit" /> : <ArrowForward />}
                  sx={{
                        py: 1.2,
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        borderRadius: '8px',
                    textTransform: 'none',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        color: 'white',
                        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                        border: 'none',
                        transition: 'all 0.3s ease',
                    '&:hover': {
                          background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                          boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)',
                      transform: 'translateY(-1px)',
                    },
                        '&:active': {
                          transform: 'translateY(0)',
                        },
                    '&:disabled': {
                          background: 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)',
                          color: 'rgba(255, 255, 255, 0.8)',
                      boxShadow: 'none',
                      transform: 'none',
                    }
                  }}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

                    <Box sx={{ textAlign: 'center', mt: 3, mb: 2 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#6b7280',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          lineHeight: 1.5,
                          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                        }}
                      >
                Already have an account?{' '}
                    <Link 
                      to="/" 
                      style={{ 
                            color: '#3b82f6',
                        textDecoration: 'none',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            transition: 'all 0.3s ease',
                            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif'
                      }}
                      onMouseEnter={(e) => {
                            e.target.style.color = '#2563eb';
                        e.target.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                            e.target.style.color = '#3b82f6';
                        e.target.style.textDecoration = 'none';
                      }}
                    >
                      Sign in here
                </Link>
              </Typography>
            </Box>
              </Box>
                </Box>
        </Fade>
          </Box>
      </Box>
    </Container>
    </Box>
  );
};

export default RegisterPage;