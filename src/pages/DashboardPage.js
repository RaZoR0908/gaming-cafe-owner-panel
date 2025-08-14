// Import necessary hooks from React and react-router-dom
import React, { useState, useEffect } from 'react';
// 1. Import Link from react-router-dom to handle navigation
import { useNavigate, Link } from 'react-router-dom';

// Import the CSS for this page and the service to fetch cafe data
import './DashboardPage.css';
import cafeService from '../services/cafeService';

const DashboardPage = () => {
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState(null);
  const [myCafe, setMyCafe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // --- DATA FETCHING ---
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);

    const fetchCafeData = async () => {
      try {
        const cafe = await cafeService.getMyCafe();
        setMyCafe(cafe);
      } catch (err) {
        setError('Failed to fetch cafe data.');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if a user is logged in
    if (userData) {
      fetchCafeData();
    } else {
      setLoading(false); // If no user, stop loading
    }
  }, []); // The empty dependency array [] means this effect runs only once.

  // --- EVENT HANDLERS ---
  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  // --- RENDER LOGIC ---
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-brand">Owner Panel</div>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </nav>

      {/* Main Dashboard Content */}
      <div className="dashboard-content">
        <h1>Welcome, {user ? user.name : 'Owner'}!</h1>
        
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {myCafe ? (
          // If the owner has a cafe, display its details.
          <div>
            <h2>Your Cafe Details</h2>
            <p><strong>Name:</strong> {myCafe.name}</p>
            <p><strong>Address:</strong> {myCafe.address}</p>
            <p><strong>Opens:</strong> {myCafe.openingTime}</p>
            <p><strong>Closes:</strong> {myCafe.closingTime}</p>
          </div>
        ) : (
          // If the owner does not have a cafe, show the create button.
          <div>
            <p>You have not registered a cafe yet.</p>
            {/* 2. Wrap the button in a Link component to navigate to the create page */}
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
