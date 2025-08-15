import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './DashboardPage.css';
import cafeService from '../services/cafeService';

const DashboardPage = () => {
  const [user, setUser] = useState(null);
  const [myCafe, setMyCafe] = useState(null);
  // 1. Add state to store the list of bookings
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  // 2. Update the fetch function to also get bookings
  const fetchCafeData = useCallback(async () => {
    setLoading(true);
    try {
      const cafe = await cafeService.getMyCafe();
      setMyCafe(cafe);
      // If a cafe is found, fetch its bookings
      if (cafe) {
        const cafeBookings = await cafeService.getOwnerBookings(cafe._id);
        setBookings(cafeBookings);
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

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete your cafe? This action cannot be undone.')) {
      try {
        await cafeService.deleteCafe(myCafe._id);
        setMyCafe(null);
        setBookings([]); // Clear bookings from state as well
      } catch (err) {
        setError('Failed to delete cafe. Please try again.');
      }
    }
  };

  // 3. Add the handler for updating booking status
  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await cafeService.updateBookingStatus(bookingId, newStatus);
      // Update the booking list in our state to show the change immediately
      setBookings(bookings.map(b => 
        b._id === bookingId ? { ...b, status: newStatus } : b
      ));
    } catch (err) {
      setError('Failed to update booking status.');
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
            <div className="cafe-details-card">
              <h2>Your Cafe Details</h2>
              <p><strong>Name:</strong> {myCafe.name}</p>
              <p><strong>Address:</strong> {myCafe.address}</p>
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <Link to={`/edit-cafe/${myCafe._id}`}><button className="button">Edit Details</button></Link>
                <button onClick={handleDelete} className="logout-button">Delete Cafe</button>
              </div>
            </div>

            {/* 4. Add the bookings section */}
            <div className="bookings-section">
              <h2>Bookings Management</h2>
              {bookings.length > 0 ? (
                <table className="bookings-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                      <th>System</th>
                      <th>Duration</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking._id}>
                        <td>{new Date(booking.bookingDate).toLocaleDateString()}</td>
                        <td>{booking.startTime}</td>
                        <td>{booking.systemType}</td>
                        <td>{booking.duration} hours</td>
                        <td>{booking.status}</td>
                        <td>
                          <div className="action-buttons">
                            {booking.status === 'Confirmed' && (
                              <>
                                <button onClick={() => handleStatusUpdate(booking._id, 'Completed')} className="button-complete">Complete</button>
                                <button onClick={() => handleStatusUpdate(booking._id, 'Cancelled')} className="button-cancel">Cancel</button>
                              </>
                            )}
                            {(booking.status === 'Cancelled' || booking.status === 'Completed') && (
                               <button onClick={() => handleStatusUpdate(booking._id, 'Confirmed')} className="button-reconfirm">Re-confirm</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>You have no bookings yet.</p>
              )}
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
