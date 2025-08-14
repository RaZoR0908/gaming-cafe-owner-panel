import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './RegisterPage.css'; // Import the new CSS
import authService from '../services/authService'; // Import the auth service

const RegisterPage = () => {
  // Set up state for all three input fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // State for loading and error messages
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(''); // State for success message

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Call the registerOwner function from our service
      await authService.registerOwner(name, email, password);

      // If registration is successful, show a success message
      setSuccess('Registration successful! Redirecting to login...');

      // Wait 2 seconds and then redirect to the login page
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err) {
      // Handle errors from the backend
      const errorMessage =
        (err.response && err.response.data && err.response.data.message) ||
        'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="form-wrapper">
        <h1 className="title">Register as a Cafe Owner</h1>
        <form onSubmit={handleSubmit}>
          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
          {success && <p style={{ color: 'green', textAlign: 'center' }}>{success}</p>}
          <div className="input-group">
            <label htmlFor="name" className="label">Full Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="email" className="label">Email Address</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password" className="label">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              required
            />
          </div>
          <button type="submit" className="button" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="login-text">
          Already have an account?{' '}
          <Link to="/" className="login-link">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
