import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './DashboardPage.css';
import cafeService from '../services/cafeService';

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [myCafe, setMyCafe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // We wrap fetchCafeData in useCallback to prevent it from being re-created on every render
  const fetchCafeData = useCallback(async () => {
    setLoading(true);
    try {
      const cafe = await cafeService.getMyCafe();
      setMyCafe(cafe);
    } catch (err) {
      setError('Failed to fetch cafe data.');
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

  // 1. Add a handler function for the delete button
  const handleDelete = async () => {
    // Show a confirmation dialog to prevent accidental deletion
    if (window.confirm('Are you sure you want to delete your cafe? This action cannot be undone.')) {
      try {
        await cafeService.deleteCafe(myCafe._id);
        // After successful deletion, update the state to show the "Create Cafe" button again
        setMyCafe(null); 
      } catch (err) {
        setError('Failed to delete cafe. Please try again.');
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">Owner Panel</div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </nav>
      <div className="dashboard-content">
        <h1>Welcome, {user ? user.name : 'Owner'}!</h1>
        
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {myCafe ? (
          <div>
            <h2>Your Cafe Details</h2>
            <p><strong>Name:</strong> {myCafe.name}</p>
            <p><strong>Address:</strong> {myCafe.address}</p>
            <p><strong>Opens:</strong> {myCafe.openingTime}</p>
            <p><strong>Closes:</strong> {myCafe.closingTime}</p>
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <Link to={`/edit-cafe/${myCafe._id}`}>
                <button className="button">Edit Cafe Details</button>
              </Link>
              {/* 2. Add the Delete button and link it to the handler */}
              <button onClick={handleDelete} className="logout-button">
                Delete Cafe
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p>You have not registered a cafe yet.</p>
            <Link to="/create-cafe">
              <button className="button">Create Your Cafe</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
