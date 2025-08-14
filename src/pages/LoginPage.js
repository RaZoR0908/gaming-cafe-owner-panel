import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginPage.css';
import authService from '../services/authService';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(email, password);

      if (response.data.token) {
        // --- IMPORTANT SECURITY CHECK ---
        // 1. Check if the user's role is 'cafeOwner'.
        if (response.data.role === 'cafeOwner') {
          // 2. If they are an owner, proceed as normal.
          localStorage.setItem('user', JSON.stringify(response.data));
          navigate('/dashboard');
        } else {
          // 3. If they are a customer, block them and show an error.
          setError('Access denied. This panel is for cafe owners only.');
        }
      }
    } catch (err) {
      const errorMessage =
        (err.response && err.response.data && err.response.data.message) ||
        'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="form-wrapper">
        <h1 className="title">Cafe Owner Login</h1>
        <form onSubmit={handleSubmit}>
          {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="register-text">
          Don't have an account?{' '}
          <Link to="/register" className="register-link">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;